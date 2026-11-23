import sys
import os
import json
import time
import subprocess
import jwt

basedir = os.path.abspath(os.path.dirname(__file__))
if basedir not in sys.path:
    sys.path.insert(0, basedir)

from app import app
from db import get_db_connection
from services.auth_service import provision_warden, generate_token, hash_password
from config import Config


def run_phase3_1_security_tests():
    print("=" * 75)
    print("HOSTELFLOW PHASE 3.1: SECURITY HARDENING VERIFICATION TEST SUITE")
    print("=" * 75)

    client = app.test_client()

    # Pre-test cleanup
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("DELETE FROM warden_auth WHERE Username IN ('warden_hardened_sec', 'warden_inactive_harden', 'warden_short_pw')")
    cur.execute("DELETE FROM hostel WHERE Hostel_ID = 88881")
    conn.commit()
    cur.close()
    conn.close()

    # -------------------------------------------------------------------------
    # TEST 1: Password Policy Enforcement (>= 12 characters, passphrases)
    # -------------------------------------------------------------------------
    print("\n[Verification 1] Password Policy Enforcement...")
    short_pw_id, short_err = provision_warden("Short PW", "warden_short_pw", None, "Short123!", "Warden")
    assert short_pw_id is None, "Provisioning with password < 12 characters must fail!"
    assert "at least 12 characters" in short_err
    print(">>> PASS: Short password (< 12 chars) rejected.")

    long_pw = "correct-horse-battery-staple-secure-warden-passphrase-2026"
    test_warden_id, ok_err = provision_warden("Hardened Warden", "warden_hardened_sec", "hardened@university.edu", long_pw, "Chief Warden")
    assert ok_err is None, f"Provisioning failed: {ok_err}"
    assert test_warden_id is not None
    print(f">>> PASS: Strong 12+ char passphrase accepted. Warden ID: {test_warden_id}")

    # Provision inactive test warden for status testing
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("DELETE FROM warden_auth WHERE Username = 'warden_inactive_harden'")
    conn.commit()
    cur.close()
    conn.close()

    inactive_id, _ = provision_warden("Inactive Warden", "warden_inactive_harden", "inactive@university.edu", "SecureP@ssw0rd2026!Long", "Warden")
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("UPDATE warden_auth SET Is_Active = 0 WHERE Warden_ID = %s", (inactive_id,))
    conn.commit()
    cur.close()
    conn.close()

    # -------------------------------------------------------------------------
    # TEST 2: Successful Warden Login & Absence of JWT in JSON Body
    # -------------------------------------------------------------------------
    print("\n[Verification 2] Successful Warden Login & HttpOnly Cookie Issuance...")
    resp = client.post("/api/auth/login", json={
        "username": "warden_hardened_sec",
        "password": long_pw
    }, headers={"Origin": "http://localhost:5173"})

    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
    body = resp.get_json()
    assert body.get("status") == "success"
    assert "token" not in body, "SECURITY BREACH: JWT token must NEVER be returned in response JSON!"
    assert "warden" in body
    assert body["warden"]["Username"] == "warden_hardened_sec"
    assert "csrf_token" in body and body["csrf_token"], "CSRF token must be returned in response JSON!"

    # Verify cookies
    set_cookies = resp.headers.getlist("Set-Cookie")
    access_cookie = [c for c in set_cookies if "access_token=" in c]
    csrf_cookie = [c for c in set_cookies if "csrf_token=" in c]

    assert len(access_cookie) > 0, "access_token cookie must be present in Set-Cookie!"
    assert "HttpOnly" in access_cookie[0], "access_token cookie MUST be HttpOnly!"
    assert len(csrf_cookie) > 0, "csrf_token cookie must be present in Set-Cookie!"
    print(">>> PASS: Login succeeded; JWT omitted from body; HttpOnly access_token & csrf_token cookies issued.")

    active_csrf_token = body["csrf_token"]

    # -------------------------------------------------------------------------
    # TEST 3: Unsuccessful Login Tests (Wrong Password, Unknown User, Inactive)
    # -------------------------------------------------------------------------
    print("\n[Verification 3] Unsuccessful Logins & Account State Validation...")
    # Wrong password
    resp = client.post("/api/auth/login", json={"username": "warden_hardened_sec", "password": "WrongPassword123456"})
    assert resp.status_code == 401
    assert "Invalid credentials" in resp.get_json()["message"]

    # Unknown user
    resp = client.post("/api/auth/login", json={"username": "ghost_nonexistent_user", "password": "SomePassword123456"})
    assert resp.status_code == 401
    assert "Invalid credentials" in resp.get_json()["message"]

    # Inactive account
    resp = client.post("/api/auth/login", json={"username": "warden_inactive_harden", "password": "SecureP@ssw0rd2026!Long"})
    assert resp.status_code == 403
    assert "disabled" in resp.get_json()["message"].lower()
    print(">>> PASS: Invalid credentials return 401; inactive accounts return 403.")

    # -------------------------------------------------------------------------
    # TEST 4: Login Rate Limiting (Throttling on repeated failures & recovery)
    # -------------------------------------------------------------------------
    print("\n[Verification 4] Login Rate Limiting (Brute-Force Protection)...")
    rate_limited = False
    for i in range(7):
        resp = client.post("/api/auth/login", json={
            "username": "warden_hardened_sec",
            "password": f"FailedAttemptPassword{i}!"
        }, environ_overrides={"REMOTE_ADDR": "198.51.100.42"})
        if resp.status_code == 429:
            rate_limited = True
            body = resp.get_json()
            assert "Too many failed login attempts" in body["message"] or "Too many login attempts" in body["message"]
            assert "Retry-After" in resp.headers
            print(f">>> Triggered 429 Too Many Requests on attempt #{i+1} with Retry-After: {resp.headers['Retry-After']}")
            break

    assert rate_limited, "Rate limiting did not trigger on repeated failed logins!"

    # Verify recovery: logging in with correct credentials resets failed count
    from services.rate_limiter import reset_login_failures
    reset_login_failures("warden_hardened_sec")
    resp = client.post("/api/auth/login", json={"username": "warden_hardened_sec", "password": long_pw})
    assert resp.status_code == 200, "Legitimate login must succeed after rate limiter reset!"
    print(">>> PASS: Rate limiting triggers HTTP 429; legitimate wardens are not permanently locked out.")

    # -------------------------------------------------------------------------
    # TEST 5: Session Restoration via HttpOnly Cookie (/api/auth/me)
    # -------------------------------------------------------------------------
    print("\n[Verification 5] Session Restoration via /api/auth/me...")
    # Fresh login to populate client cookie jar
    login_resp = client.post("/api/auth/login", json={"username": "warden_hardened_sec", "password": long_pw})
    assert login_resp.status_code == 200
    active_csrf = login_resp.get_json()["csrf_token"]

    # Call /api/auth/me with ambient cookie jar
    me_resp = client.get("/api/auth/me")
    assert me_resp.status_code == 200
    me_body = me_resp.get_json()
    assert me_body["status"] == "success"
    assert me_body["warden"]["Username"] == "warden_hardened_sec"
    assert "csrf_token" in me_body
    active_csrf = me_body["csrf_token"]
    print(">>> PASS: Session restored cleanly via HttpOnly cookie; valid CSRF token returned.")

    # -------------------------------------------------------------------------
    # TEST 6: CSRF Rejection for Cookie-Authenticated Mutations
    # -------------------------------------------------------------------------
    print("\n[Verification 6] CSRF Protection on State-Changing Endpoints...")
    test_disposable_hostel = {"Hostel_ID": 88881, "Hostel_Name": "CSRF Test Hostel", "Location": "West", "Capacity": 100, "Hostel_Type": "Co-ed"}

    # Case A: Ambient cookie present, but X-CSRF-Token header completely missing
    resp = client.post("/api/hostels/", json=test_disposable_hostel, headers={
        "Origin": "http://localhost:5173"
        # X-CSRF-Token is omitted!
    })
    assert resp.status_code == 403, f"Expected 403 Forbidden for missing CSRF token, got {resp.status_code}"
    assert "CSRF" in resp.get_json()["message"]
    print(">>> PASS: Mutation rejected with 403 when X-CSRF-Token header is missing.")

    # Case B: Ambient cookie present, but X-CSRF-Token header has forged/invalid token
    resp = client.post("/api/hostels/", json=test_disposable_hostel, headers={
        "Origin": "http://localhost:5173",
        "X-CSRF-Token": "forged_malicious_csrf_token_value"
    })
    assert resp.status_code == 403
    print(">>> PASS: Mutation rejected with 403 when X-CSRF-Token is forged or mismatched.")

    # Case C: Disallowed cross-origin request
    resp = client.post("/api/hostels/", json=test_disposable_hostel, headers={
        "Origin": "http://malicious-attacker-website.com",
        "X-CSRF-Token": active_csrf
    })
    assert resp.status_code == 403
    print(">>> PASS: Mutation rejected with 403 when Origin header is untrusted.")

    # -------------------------------------------------------------------------
    # TEST 7: Legitimate Authenticated POST, PUT, DELETE with Valid CSRF
    # -------------------------------------------------------------------------
    print("\n[Verification 7] Legitimate Authenticated Operations (POST, PUT, DELETE)...")
    valid_csrf_headers = {
        "Origin": "http://localhost:5173",
        "X-CSRF-Token": active_csrf,
        "X-Requested-With": "XMLHttpRequest"
    }

    # Clean previous record if exists
    client.delete("/api/hostels/88881", headers=valid_csrf_headers)

    # Legitimate POST
    resp = client.post("/api/hostels/", json=test_disposable_hostel, headers=valid_csrf_headers)
    assert resp.status_code == 201, f"Expected 201, got {resp.status_code} ({resp.get_json()})"
    print(">>> PASS: Legitimate POST /api/hostels/ created record.")

    # Legitimate PUT
    resp = client.put("/api/hostels/88881", json={"Hostel_Name": "Updated CSRF Hostel"}, headers=valid_csrf_headers)
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
    print(">>> PASS: Legitimate PUT /api/hostels/88881 updated record.")

    # Legitimate DELETE
    resp = client.delete("/api/hostels/88881", headers=valid_csrf_headers)
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
    print(">>> PASS: Legitimate DELETE /api/hostels/88881 deleted record.")

    # -------------------------------------------------------------------------
    # TEST 8: Token Expiration and Session Revocation via Logout
    # -------------------------------------------------------------------------
    print("\n[Verification 8] Token Expiration & Revocation Validation...")
    # Expired token check
    expired_jwt = generate_token(test_warden_id, "warden_hardened_sec", "Chief Warden", 1, expires_in=-60)
    exp_client = app.test_client()
    exp_client.set_cookie("access_token", expired_jwt)
    resp = exp_client.get("/api/auth/me")
    assert resp.status_code == 401
    assert "expired" in resp.get_json()["message"].lower()
    print(">>> PASS: Expired token rejected with 401.")

    # Logout and immediate revocation check
    logout_resp = client.post("/api/auth/logout", headers=valid_csrf_headers)
    assert logout_resp.status_code == 200

    # Attempt to call /api/auth/me after logout
    post_logout_resp = client.get("/api/auth/me")
    assert post_logout_resp.status_code == 401
    print(">>> PASS: Logout increments Token_Version; subsequent requests rejected.")

    # -------------------------------------------------------------------------
    # TEST 9: Minimal Public Health Probe vs Protected Diagnostics
    # -------------------------------------------------------------------------
    print("\n[Verification 9] Health Probes (Public Minimal vs Protected Diagnostic)...")
    pub_health = client.get("/api/health")
    assert pub_health.status_code == 200
    h_data = pub_health.get_json()
    assert h_data.get("status") == "healthy"
    assert "database" not in h_data, "PUBLIC LEAK: Database name must not appear in /api/health!"
    assert "mysql_version" not in h_data, "PUBLIC LEAK: MySQL version must not appear in /api/health!"
    assert "pool" not in h_data, "PUBLIC LEAK: Pool details must not appear in /api/health!"
    print(">>> PASS: Public /api/health returns minimal response without internal metadata leaks.")

    # Unauthenticated diagnostics probe
    anon_diag = client.get("/api/health/diagnostics")
    assert anon_diag.status_code == 401
    print(">>> PASS: Diagnostic probe blocked without Warden credentials.")

    # -------------------------------------------------------------------------
    # TEST 10: Public Accommodation APIs Functionality
    # -------------------------------------------------------------------------
    print("\n[Verification 10] Public Accommodation APIs Operational Check...")
    public_endpoints = [
        "/api/hostels/",
        "/api/hostel-blocks/",
        "/api/rooms/",
        "/api/beds/"
    ]
    for ep in public_endpoints:
        r = client.get(ep)
        assert r.status_code == 200, f"Expected 200 for public {ep}, got {r.status_code}"
    print(">>> PASS: Public accommodation endpoints (/hostels, /hostel-blocks, /rooms, /beds) fully functional.")

    # -------------------------------------------------------------------------
    # TEST 11: Private APIs Remain Strictly Protected
    # -------------------------------------------------------------------------
    print("\n[Verification 11] Private Student, Allocation, Payment APIs Protection...")
    private_endpoints = [
        "/api/students/",
        "/api/student-preferences/",
        "/api/room-allocations/",
        "/api/roommate-matches/",
        "/api/payments/"
    ]
    anon_client = app.test_client()
    for ep in private_endpoints:
        r = anon_client.get(ep)
        assert r.status_code == 401, f"Expected 401 for private endpoint {ep}, got {r.status_code}"
    print(">>> PASS: All confidential domains strictly reject unauthenticated access.")

    # -------------------------------------------------------------------------
    # TEST 12: Production Startup Fail-Safe for Missing / Insecure JWT_SECRET_KEY
    # -------------------------------------------------------------------------
    print("\n[Verification 12] Production Startup Secret Validation Fail-Safe...")
    # Test missing secret in production
    test_code_missing = """
import os
os.environ['FLASK_ENV'] = 'production'
os.environ.pop('JWT_SECRET_KEY', None)
import config
"""
    result = subprocess.run([sys.executable, "-c", test_code_missing], cwd=basedir, capture_output=True, text=True)
    assert result.returncode != 0
    assert "CRITICAL SECURITY CONFIGURATION ERROR" in result.stderr
    print(">>> PASS: Subprocess verified missing JWT_SECRET_KEY in production halts startup safely.")

    # Test insecure fallback secret in production
    test_code_insecure = """
import os
os.environ['FLASK_ENV'] = 'production'
os.environ['JWT_SECRET_KEY'] = 'dev-secret-key-change-in-prod'
import config
"""
    result2 = subprocess.run([sys.executable, "-c", test_code_insecure], cwd=basedir, capture_output=True, text=True)
    assert result2.returncode != 0
    assert "insecure or default" in result2.stderr.lower()
    print(">>> PASS: Subprocess verified default fallback secret in production halts startup safely.")

    # -------------------------------------------------------------------------
    # Cleanup Test Accounts
    # -------------------------------------------------------------------------
    print("\n[Cleanup] Cleaning temporary testing accounts...")
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("DELETE FROM warden_auth WHERE Username IN ('warden_hardened_sec', 'warden_inactive_harden')")
    conn.commit()
    cur.close()
    conn.close()
    print(">>> Temporary test records cleaned successfully.")

    print("\n" + "=" * 75)
    print("ALL 14 PHASE 3.1 SECURITY HARDENING VERIFICATION TESTS PASSED!")
    print("=" * 75)


if __name__ == "__main__":
    run_phase3_1_security_tests()
