import sys
import os
import json

basedir = os.path.abspath(os.path.dirname(__file__))
if basedir not in sys.path:
    sys.path.insert(0, basedir)

from app import app
from db import get_db_connection
from services.auth_service import provision_warden

client = app.test_client()
ACTIVE_CSRF_TOKEN = None


def make_request(path, method="GET", data=None):
    global ACTIVE_CSRF_TOKEN
    full_path = f"/api{path}"
    headers = {
        "Origin": "http://localhost:5173",
        "X-Requested-With": "XMLHttpRequest"
    }
    if ACTIVE_CSRF_TOKEN:
        headers["X-CSRF-Token"] = ACTIVE_CSRF_TOKEN

    if method == "GET":
        resp = client.get(full_path, headers=headers)
    elif method == "POST":
        resp = client.post(full_path, json=data, headers=headers)
    elif method == "PUT":
        resp = client.put(full_path, json=data, headers=headers)
    elif method == "DELETE":
        resp = client.delete(full_path, headers=headers)
    else:
        raise ValueError(f"Unsupported method: {method}")

    code = resp.status_code
    body = resp.get_json() if resp.is_json else {}

    # Update CSRF token if returned in response
    if isinstance(body, dict) and body.get("csrf_token"):
        ACTIVE_CSRF_TOKEN = body["csrf_token"]

    return code, body


def run_tests():
    global ACTIVE_CSRF_TOKEN
    print("=" * 60)
    print("HOSTELFLOW PHASE 2 VERIFICATION TEST SUITE (WITH WARDEN AUTH)")
    print("=" * 60)

    # Clean up and provision test warden
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("DELETE FROM warden_auth WHERE Username = 'phase2_warden_test'")
    cur.execute("DELETE FROM hostel_block WHERE Block_ID = 99991")
    cur.execute("DELETE FROM hostel WHERE Hostel_ID = 99991")
    conn.commit()
    cur.close()
    conn.close()

    provision_warden("Phase2 Tester", "phase2_warden_test", "p2@university.edu", "P@ssword123456", "Warden")
    code, res = make_request("/auth/login", method="POST", data={"username": "phase2_warden_test", "password": "P@ssword123456"})
    assert code == 200, f"Login failed: {res}"
    ACTIVE_CSRF_TOKEN = res["csrf_token"]
    print(f">>> Authenticated as Phase 2 Warden (CSRF Token acquired).")

    # 0. Clean up any leftover test records (Hostel 99991, Block 99991)
    print("\n[Step 0] Cleaning any preexisting test artifacts...")
    make_request("/hostel-blocks/99991", method="DELETE")
    make_request("/hostels/99991", method="DELETE")

    # 1. Create a hostel
    print("\n[Step 1] Creating disposable test hostel (ID: 99991)...")
    code, res = make_request("/hostels/", method="POST", data={
        "Hostel_ID": 99991,
        "Hostel_Name": "Phase 2 Verification Hostel",
        "Location": "North Engineering Quad",
        "Capacity": 120,
        "Hostel_Type": "Co-ed"
    })
    print(f"Status: {code}, Response: {res}")
    assert code == 201, f"Expected 201, got {code}"
    assert res.get("status") == "success"

    # 2. Create a hostel block referencing that hostel
    print("\n[Step 2] Creating test hostel block referencing hostel 99991...")
    code, res = make_request("/hostel-blocks/", method="POST", data={
        "Block_ID": 99991,
        "Block_Name": "Phase 2 Block Alpha",
        "Gender": "Co-ed",
        "Capacity": 60,
        "Hostel_ID": 99991
    })
    print(f"Status: {code}, Response: {res}")
    assert code == 201, f"Expected 201, got {code}"
    assert res.get("status") == "success"

    # 3. Retrieve the block
    print("\n[Step 3] Retrieving the created block by ID...")
    code, res = make_request("/hostel-blocks/99991", method="GET")
    print(f"Status: {code}, Response: {res}")
    assert code == 200, f"Expected 200, got {code}"
    assert res["data"]["Block_ID"] == 99991
    assert res["data"]["Block_Name"] == "Phase 2 Block Alpha"
    assert res["data"]["Hostel_ID"] == 99991

    # 4. Update the block
    print("\n[Step 4] Updating the block (Block_Name and Capacity)...")
    code, res = make_request("/hostel-blocks/99991", method="PUT", data={
        "Block_Name": "Phase 2 Block Alpha (Renovated)",
        "Capacity": 75
    })
    print(f"Status: {code}, Response: {res}")
    assert code == 200, f"Expected 200, got {code}"
    assert res.get("status") == "success"

    # 5. Verify the updated values
    print("\n[Step 5] Verifying updated values via GET...")
    code, res = make_request("/hostel-blocks/99991", method="GET")
    print(f"Status: {code}, Response: {res}")
    assert code == 200, f"Expected 200, got {code}"
    assert res["data"]["Block_Name"] == "Phase 2 Block Alpha (Renovated)"
    assert res["data"]["Capacity"] == 75

    # 6. Attempt to delete the parent hostel while block exists -> Expect HTTP 409
    print("\n[Step 6] Attempting to delete parent hostel 99991 while block 99991 still exists...")
    code, res = make_request("/hostels/99991", method="DELETE")
    print(f"Status: {code}, Response: {res}")
    assert code == 409, f"Expected 409 Conflict, got {code}"
    assert res.get("status") == "error"
    print(">>> HTTP 409 constraint conflict verified successfully!")

    # 7. Delete the block
    print("\n[Step 7] Deleting the child hostel block 99991...")
    code, res = make_request("/hostel-blocks/99991", method="DELETE")
    print(f"Status: {code}, Response: {res}")
    assert code == 200, f"Expected 200, got {code}"
    assert res.get("status") == "success"

    # Verify block is gone
    code, res = make_request("/hostel-blocks/99991", method="GET")
    assert code == 404, f"Expected 404 for deleted block, got {code}"

    # 8. Delete the hostel after its dependent records have been removed
    print("\n[Step 8] Deleting parent hostel 99991 now that child block is removed...")
    code, res = make_request("/hostels/99991", method="DELETE")
    print(f"Status: {code}, Response: {res}")
    assert code == 200, f"Expected 200, got {code}"
    assert res.get("status") == "success"

    # Verify hostel is gone
    code, res = make_request("/hostels/99991", method="GET")
    assert code == 404, f"Expected 404 for deleted hostel, got {code}"

    # EDGE CASES & VALIDATION TESTS
    print("\n" + "=" * 60)
    print("EDGE CASE & VALIDATION TESTS")
    print("=" * 60)

    # Test A: Duplicate primary keys
    print("\n[Test A] Duplicate primary key test...")
    code, _ = make_request("/hostels/", method="POST", data={"Hostel_ID": 99991, "Hostel_Name": "Dup Test Hostel"})
    assert code == 201
    code, res = make_request("/hostels/", method="POST", data={"Hostel_ID": 99991, "Hostel_Name": "Dup Test Hostel 2"})
    print(f"Duplicate Hostel Status: {code}, Response: {res}")
    assert code == 409, f"Expected 409, got {code}"

    code, _ = make_request("/hostel-blocks/", method="POST", data={"Block_ID": 99991, "Block_Name": "Dup Block", "Hostel_ID": 99991})
    assert code == 201
    code, res = make_request("/hostel-blocks/", method="POST", data={"Block_ID": 99991, "Block_Name": "Dup Block 2", "Hostel_ID": 99991})
    print(f"Duplicate Block Status: {code}, Response: {res}")
    assert code == 409, f"Expected 409, got {code}"

    # Test B: Invalid IDs
    print("\n[Test B] Invalid IDs validation...")
    code, res = make_request("/hostel-blocks/", method="POST", data={"Block_ID": -10, "Block_Name": "Bad ID", "Hostel_ID": 99991})
    assert code == 400
    code, res = make_request("/hostel-blocks/", method="POST", data={"Block_ID": True, "Block_Name": "Bool ID", "Hostel_ID": 99991})
    assert code == 400
    code, res = make_request("/hostel-blocks/", method="POST", data={"Block_ID": 99992, "Block_Name": "Bad Hostel ID", "Hostel_ID": -5})
    assert code == 400

    # Test C: Missing required fields
    print("\n[Test C] Missing required fields validation...")
    code, res = make_request("/hostel-blocks/", method="POST", data={"Block_ID": 99993, "Hostel_ID": 99991})
    assert code == 400
    code, res = make_request("/hostel-blocks/", method="POST", data={"Block_Name": "No Block ID", "Hostel_ID": 99991})
    assert code == 400
    code, res = make_request("/hostel-blocks/", method="POST", data={})
    assert code == 400
    code, res = make_request("/hostel-blocks/99991", method="PUT", data={})
    assert code == 400

    # Test D: Nonexistent records
    print("\n[Test D] Nonexistent records handling (404)...")
    code, _ = make_request("/hostel-blocks/888888", method="GET")
    assert code == 404
    code, _ = make_request("/hostel-blocks/888888", method="PUT", data={"Block_Name": "Ghost"})
    assert code == 404
    code, _ = make_request("/hostel-blocks/888888", method="DELETE")
    assert code == 404
    code, _ = make_request("/hostels/888888", method="GET")
    assert code == 404
    code, _ = make_request("/hostels/888888", method="PUT", data={"Hostel_Name": "Ghost"})
    assert code == 404
    code, _ = make_request("/hostels/888888", method="DELETE")
    assert code == 404

    # Test E: Invalid foreign keys
    print("\n[Test E] Invalid foreign key constraint (409)...")
    code, res = make_request("/hostel-blocks/", method="POST", data={"Block_ID": 99994, "Block_Name": "Orphan Block", "Hostel_ID": 888888})
    assert code == 409
    code, res = make_request("/hostel-blocks/99991", method="PUT", data={"Hostel_ID": 888888})
    assert code == 409

    # Clean up test records
    print("\n[Final Cleanup] Removing test records 99991...")
    make_request("/hostel-blocks/99991", method="DELETE")
    make_request("/hostels/99991", method="DELETE")

    # 9. Regression test all nine GET endpoints
    print("\n" + "=" * 60)
    print("REGRESSION TESTING ALL 9 GET ENDPOINTS (AUTHENTICATED)")
    print("=" * 60)
    endpoints = [
        "/hostels/",
        "/hostel-blocks/",
        "/rooms/",
        "/beds/",
        "/students/",
        "/student-preferences/",
        "/room-allocations/",
        "/roommate-matches/",
        "/payments/"
    ]
    for ep in endpoints:
        code, res = make_request(ep, method="GET")
        count = res.get("count", len(res.get("data", [])))
        print(f"GET {ep:<25} -> Status: {code}, Records: {count}")
        assert code == 200, f"Expected 200 for {ep}, got {code}"
        assert res.get("status") == "success"

    # Cleanup tester account
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("DELETE FROM warden_auth WHERE Username = 'phase2_warden_test'")
    conn.commit()
    cur.close()
    conn.close()

    print("\n" + "=" * 60)
    print("ALL PHASE 2 & REGRESSION TESTS PASSED WITH AUTHENTICATION!")
    print("=" * 60)


if __name__ == "__main__":
    run_tests()
