import requests
import json

BASE_URL = "http://127.0.0.1:5000"

def run_tests():
    print("Testing Roommate Matching Endpoints...")
    session = requests.Session()
    
    # 1. Login
    login_res = session.post(f"{BASE_URL}/api/auth/login", json={
        "username": "warden_admin",
        "password": "WardenPassword123!"
    })
    assert login_res.status_code == 200, f"Login failed: {login_res.json()}"
    login_data = login_res.json()
    csrf_token = login_data.get("csrf_token")
    auth_token = login_res.cookies.get("access_token")
    
    headers = {
        "Authorization": f"Bearer {auth_token}",
        "X-CSRF-Token": csrf_token or ""
    }
    
    # 2. Test KPI Stats
    print("\n--- 1. Testing GET /api/roommate-matches/stats ---")
    r = requests.get(f"{BASE_URL}/api/roommate-matches/stats", headers=headers, cookies=session.cookies)
    print(f"Status: {r.status_code}")
    print(f"Data: {json.dumps(r.json(), indent=2)}")
    assert r.status_code == 200, "Stats endpoint failed"

    # 3. Test Generate Matches
    print("\n--- 2. Testing POST /api/roommate-matches/generate ---")
    r = requests.post(f"{BASE_URL}/api/roommate-matches/generate", headers=headers, cookies=session.cookies)
    print(f"Status: {r.status_code}")
    res_data = r.json()
    print(f"Message: {res_data.get('message')}")
    print(f"Metrics: {json.dumps(res_data.get('metrics'), indent=2)}")
    assert r.status_code == 200, "Generate endpoint failed"

    # 4. Test GET All Matches
    print("\n--- 3. Testing GET /api/roommate-matches ---")
    r = requests.get(f"{BASE_URL}/api/roommate-matches", headers=headers, cookies=session.cookies)
    print(f"Status: {r.status_code}")
    matches_data = r.json()
    print(f"Matches count: {matches_data.get('count')}")
    matches = matches_data.get("data", [])
    assert len(matches) > 0, "No matches returned!"

    first = matches[0]
    print(f"Sample Match #{first['Match_ID']}:")
    print(f"  Student 1: {first['Student_ID_1']} ({first.get('Student_1_Name')})")
    print(f"  Student 2: {first['Student_ID_2']} ({first.get('Student_2_Name')})")
    print(f"  Score: {first['Compatibility_Score']}%")
    print(f"  Status: {first['Match_Status']}")
    print(f"  Explanation summary: {first.get('Match_Explanation', {}).get('summary') if first.get('Match_Explanation') else 'None'}")
    
    # 5. Test Approve
    print(f"\n--- 4. Testing PATCH /api/roommate-matches/{first['Match_ID']}/approve ---")
    r_app = requests.patch(f"{BASE_URL}/api/roommate-matches/{first['Match_ID']}/approve", headers=headers, cookies=session.cookies)
    print(f"Approve Status: {r_app.status_code}, Resp: {r_app.json()}")
    assert r_app.status_code == 200

    # Verify it is now Approved
    r_chk = requests.get(f"{BASE_URL}/api/roommate-matches/{first['Match_ID']}", headers=headers, cookies=session.cookies)
    assert r_chk.json()["data"]["Match_Status"] == "Approved"
    print("Verified status is Approved.")

    # 6. Test Reject on another match if exists
    if len(matches) > 1:
        second = matches[1]
        print(f"\n--- 5. Testing PATCH /api/roommate-matches/{second['Match_ID']}/reject ---")
        r_rej = requests.patch(f"{BASE_URL}/api/roommate-matches/{second['Match_ID']}/reject", headers=headers, cookies=session.cookies)
        print(f"Reject Status: {r_rej.status_code}, Resp: {r_rej.json()}")
        assert r_rej.status_code == 200

    # 7. Test Regeneration Preserves Approved Match
    print("\n--- 6. Testing Engine Preserves Approved Match ---")
    r_regen = requests.post(f"{BASE_URL}/api/roommate-matches/generate", headers=headers, cookies=session.cookies)
    assert r_regen.status_code == 200
    regen_metrics = r_regen.json().get("metrics", {})
    print(f"Preserved approved matches: {regen_metrics.get('preserved_approved_matches')}")
    assert regen_metrics.get("preserved_approved_matches") >= 1, "Approved match was not preserved!"

    # 8. Test Unauthenticated Access Guard
    print("\n--- 7. Testing Unauthenticated Access ---")
    r_unauth = requests.get(f"{BASE_URL}/api/roommate-matches")
    print(f"Unauthenticated status: {r_unauth.status_code}")
    assert r_unauth.status_code == 401

    print("\nALL BACKEND ROOMMATE MATCHING TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    run_tests()
