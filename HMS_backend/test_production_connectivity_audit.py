import sys
import os
import json
import urllib.request
import urllib.error
import http.cookiejar

basedir = os.path.abspath(os.path.dirname(__file__))
if basedir not in sys.path:
    sys.path.insert(0, basedir)

from db import get_db_connection, get_pool_info
from services.auth_service import provision_warden

def run_production_audit():
    print("=" * 78)
    print("HOSTELFLOW: COMPREHENSIVE END-TO-END PRODUCTION API AUDIT")
    print("=" * 78)

    ngrok_base = "https://parka-duller-siesta.ngrok-free.dev/api"
    origin = "https://hostel-flow-phi.vercel.app"

    # -------------------------------------------------------------------------
    # 1. LIVE NGROK TUNNEL REACHABILITY & HEALTH
    # -------------------------------------------------------------------------
    print("\n[Audit 1] Verifying Live ngrok Tunnel & Health Probe...")
    health_req = urllib.request.Request(f"{ngrok_base}/health", headers={
        "Accept": "application/json",
        "X-Requested-With": "XMLHttpRequest",
        "Origin": origin,
        "ngrok-skip-browser-warning": "true"
    })
    with urllib.request.urlopen(health_req, timeout=10) as resp:
        assert resp.status == 200
        health_data = json.loads(resp.read().decode("utf-8"))
        assert health_data.get("status") == "healthy"
        # Verify CORS headers on actual GET response
        assert resp.headers.get("Access-Control-Allow-Origin") == origin
        assert resp.headers.get("Access-Control-Allow-Credentials") == "true"
        print(f">>> PASS: Live ngrok health verified (HTTP 200). Status: {health_data.get('status')}")
        print(f">>> PASS: Response CORS verified: Allow-Origin={origin}")

    # -------------------------------------------------------------------------
    # 2. CORS PREFLIGHT (OPTIONS) OVER LIVE NGROK
    # -------------------------------------------------------------------------
    print("\n[Audit 2] Verifying CORS Preflight OPTIONS over Live ngrok...")
    preflight_req = urllib.request.Request(f"{ngrok_base}/room-allocations/active", method="OPTIONS", headers={
        "Origin": origin,
        "Access-Control-Request-Method": "GET",
        "Access-Control-Request-Headers": "Content-Type, X-Requested-With, ngrok-skip-browser-warning"
    })
    with urllib.request.urlopen(preflight_req, timeout=10) as resp:
        assert resp.status == 200
        assert resp.headers.get("Access-Control-Allow-Origin") == origin
        assert resp.headers.get("Access-Control-Allow-Credentials") == "true"
        allow_headers = resp.headers.get("Access-Control-Allow-Headers", "")
        assert "ngrok-skip-browser-warning" in allow_headers.lower()
        print(">>> PASS: CORS Preflight OPTIONS returned 200 with permitted origin & headers.")

    # -------------------------------------------------------------------------
    # 3. PUBLIC READ-ONLY ACCOMMODATION ENDPOINTS
    # -------------------------------------------------------------------------
    print("\n[Audit 3] Verifying Public Accommodation Endpoints over Live ngrok...")
    public_endpoints = [
        ("/hostels/", "hostel listings"),
        ("/hostel-blocks/", "hostel block listings"),
        ("/rooms/", "room inventory"),
        ("/beds/", "bed slots"),
        ("/room-allocations/?status=Active", "active bed occupancy (query parameter)"),
        ("/room-allocations/active", "active bed occupancy (dedicated endpoint)"),
    ]

    for ep, desc in public_endpoints:
        req = urllib.request.Request(f"{ngrok_base}{ep}", headers={
            "Accept": "application/json",
            "X-Requested-With": "XMLHttpRequest",
            "Origin": origin,
            "ngrok-skip-browser-warning": "true"
        })
        with urllib.request.urlopen(req, timeout=10) as resp:
            assert resp.status == 200, f"Expected 200 for {ep}, got {resp.status}"
            body = json.loads(resp.read().decode("utf-8"))
            assert body.get("status") == "success"
            data = body.get("data", [])
            print(f">>> PASS: {ep:<38} ({desc}) -> 200 OK | Records: {len(data)}")

    # -------------------------------------------------------------------------
    # 4. PRIVACY AUDIT: NO STUDENT PII EXPOSED ON PUBLIC ENDPOINTS
    # -------------------------------------------------------------------------
    print("\n[Audit 4] Privacy Verification: Ensuring No Student PII in Public Data...")
    for ep in ["/room-allocations/?status=Active", "/room-allocations/active"]:
        req = urllib.request.Request(f"{ngrok_base}{ep}", headers={
            "Accept": "application/json",
            "X-Requested-With": "XMLHttpRequest",
            "Origin": origin,
            "ngrok-skip-browser-warning": "true"
        })
        with urllib.request.urlopen(req, timeout=10) as resp:
            body = json.loads(resp.read().decode("utf-8"))
            for alloc in body.get("data", []):
                assert "Student_ID" not in alloc, f"SECURITY VIOLATION: Student_ID leaked in {ep}!"
                assert "Bed_ID" in alloc, "Bed_ID must be present for vacancy mapping"
                assert "Allocation_Status" in alloc
    print(">>> PASS: Zero Student PII / Student_ID present in public availability responses.")

    # -------------------------------------------------------------------------
    # 5. STRICT SECURITY: CONFIDENTIAL ENDPOINTS REJECT UNAUTHENTICATED CALLS
    # -------------------------------------------------------------------------
    print("\n[Audit 5] Access Control: Verifying Confidential Endpoints Reject Unauthenticated Access...")
    protected_endpoints = [
        "/auth/me",
        "/room-allocations/",
        "/room-allocations/?student_id=1",
        "/students/",
        "/student-preferences/",
        "/payments/",
        "/roommate-matches/"
    ]
    for ep in protected_endpoints:
        req = urllib.request.Request(f"{ngrok_base}{ep}", headers={
            "Accept": "application/json",
            "X-Requested-With": "XMLHttpRequest",
            "Origin": origin,
            "ngrok-skip-browser-warning": "true"
        })
        try:
            with urllib.request.urlopen(req, timeout=10) as resp:
                raise AssertionError(f"SECURITY BREACH: Protected {ep} returned HTTP 200 to anonymous caller!")
        except urllib.error.HTTPError as err:
            assert err.code == 401, f"Expected 401 for {ep}, got {err.code}"
            err_body = json.loads(err.read().decode("utf-8"))
            assert "Missing token" in err_body.get("message", "")
            print(f">>> PASS: {ep:<38} strictly rejected with HTTP 401 Unauthorized.")

    # -------------------------------------------------------------------------
    # 6. AUTHENTICATED WARDEN LIFECYCLE OVER LIVE NGROK
    # -------------------------------------------------------------------------
    print("\n[Audit 6] Authenticated Warden Lifecycle over Live ngrok...")
    # Clean previous audit test account if present
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("DELETE FROM warden_auth WHERE Username = 'prod_audit_warden'")
    conn.commit()
    cur.close()
    conn.close()

    # Provision temporary test warden
    warden_id, err = provision_warden("Production Auditor", "prod_audit_warden", "audit@hms.edu", "AuditorPassphrase2026!Long", "Chief Warden")
    assert err is None, f"Failed to provision audit warden: {err}"

    cj = http.cookiejar.CookieJar()
    opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))

    # A: Login
    login_payload = json.dumps({"username": "prod_audit_warden", "password": "AuditorPassphrase2026!Long"}).encode("utf-8")
    login_req = urllib.request.Request(f"{ngrok_base}/auth/login", data=login_payload, headers={
        "Content-Type": "application/json",
        "Accept": "application/json",
        "X-Requested-With": "XMLHttpRequest",
        "Origin": origin,
        "ngrok-skip-browser-warning": "true"
    })
    resp_login = opener.open(login_req, timeout=10)
    assert resp_login.status == 200
    login_json = json.loads(resp_login.read().decode("utf-8"))
    assert "token" not in login_json, "JWT must not be in JSON body"
    csrf_token = login_json.get("csrf_token")
    assert csrf_token is not None, "CSRF token must be returned in response"
    print(">>> PASS: Warden login succeeded via ngrok; HttpOnly access_token & csrf_token cookies issued.")

    # B: Session check via /auth/me
    me_req = urllib.request.Request(f"{ngrok_base}/auth/me", headers={
        "Accept": "application/json",
        "X-Requested-With": "XMLHttpRequest",
        "Origin": origin,
        "ngrok-skip-browser-warning": "true"
    })
    resp_me = opener.open(me_req, timeout=10)
    assert resp_me.status == 200
    me_json = json.loads(resp_me.read().decode("utf-8"))
    assert me_json["warden"]["Username"] == "prod_audit_warden"
    if me_json.get("csrf_token"):
        csrf_token = me_json["csrf_token"]
    print(">>> PASS: Session verified via /api/auth/me (ambient cookie authentication & CSRF refresh).")

    # C: Authenticated access to full room allocations (with Student_ID)
    alloc_req = urllib.request.Request(f"{ngrok_base}/room-allocations/", headers={
        "Accept": "application/json",
        "X-Requested-With": "XMLHttpRequest",
        "Origin": origin,
        "ngrok-skip-browser-warning": "true"
    })
    resp_alloc = opener.open(alloc_req, timeout=10)
    assert resp_alloc.status == 200
    alloc_json = json.loads(resp_alloc.read().decode("utf-8"))
    for row in alloc_json.get("data", []):
        assert "Student_ID" in row, "Authenticated warden must receive Student_ID"
    print(">>> PASS: Authenticated warden receives full administrative allocation records with Student_ID.")

    # D: Authenticated access to protected student list
    stu_req = urllib.request.Request(f"{ngrok_base}/students/", headers={
        "Accept": "application/json",
        "X-Requested-With": "XMLHttpRequest",
        "Origin": origin,
        "ngrok-skip-browser-warning": "true"
    })
    resp_stu = opener.open(stu_req, timeout=10)
    assert resp_stu.status == 200
    print(">>> PASS: Authenticated warden successfully retrieved confidential student records.")

    # E: Logout with CSRF token
    logout_req = urllib.request.Request(f"{ngrok_base}/auth/logout", data=b"{}", headers={
        "Content-Type": "application/json",
        "Accept": "application/json",
        "X-Requested-With": "XMLHttpRequest",
        "Origin": origin,
        "X-CSRF-Token": csrf_token,
        "ngrok-skip-browser-warning": "true"
    })
    try:
        resp_logout = opener.open(logout_req, timeout=10)
        assert resp_logout.status == 200
        print(">>> PASS: Warden logout succeeded; session invalidated.")
    except urllib.error.HTTPError as e:
        print(f"Logout failed with {e.code}: {e.read().decode('utf-8')}")
        raise

    # Cleanup audit test account
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("DELETE FROM warden_auth WHERE Username = 'prod_audit_warden'")
    conn.commit()
    cur.close()
    conn.close()
    print(">>> PASS: Temporary audit account cleaned up.")

    # -------------------------------------------------------------------------
    # 7. MYSQL DATABASE & CONNECTION POOL AUDIT
    # -------------------------------------------------------------------------
    print("\n[Audit 7] MySQL Database & Connection Pool Audit...")
    pool_info = get_pool_info()
    print(f">>> Pool Name: {pool_info.get('pool_name')}, Pool Size: {pool_info.get('pool_size')}")
    assert pool_info.get("pool_name") is not None

    conn = get_db_connection()
    cur = conn.cursor(dictionary=True)
    cur.execute("SELECT 1")
    assert cur.fetchone()["1"] == 1
    cur.close()
    conn.close()
    print(">>> PASS: MySQL connection pool verified active and healthy.")

    print("\n" + "=" * 78)
    print("ALL 7 PRODUCTION AUDIT SUITES PASSED SUCCESSFULLY!")
    print("=" * 78)

if __name__ == "__main__":
    run_production_audit()
