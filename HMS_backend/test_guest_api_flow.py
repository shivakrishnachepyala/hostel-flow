import sys
import requests
import json

BASE_URL = "http://127.0.0.1:5000"

def test_guest_workflow():
    print("--- 1. Testing Public Guest Request Submission ---")
    payload = {
        "guestName": "Dr. Anil Verma",
        "email": "anil.verma@example.com",
        "phone": "+91 98220 12345",
        "studentRelation": "Parent of Current Student",
        "studentReference": "1001",
        "checkInDate": "2026-11-25",
        "checkOutDate": "2026-11-27",
        "guestCount": 2,
        "roomPreference": "Air-Conditioned Deluxe Suite",
        "specialRequests": "Ground floor room preferred"
    }

    res = requests.post(f"{BASE_URL}/api/guests/public-request", json=payload)
    print("Submit Status Code:", res.status_code)
    data = res.json()
    print("Submit Response:", json.dumps(data, indent=2))
    assert res.status_code == 201, f"Expected 201, got {res.status_code}"
    ref_no = data.get("referenceNo")
    guest_id = data["data"]["Guest_ID"]
    assert ref_no is not None
    assert guest_id is not None

    print("\n--- 2. Testing Public Reference Lookup ---")
    res_lookup = requests.get(f"{BASE_URL}/api/guests/reference/{ref_no}")
    print("Lookup Status Code:", res_lookup.status_code)
    lookup_data = res_lookup.json()
    print("Lookup Response:", json.dumps(lookup_data, indent=2))
    assert res_lookup.status_code == 200
    assert lookup_data["data"]["Reference_No"] == ref_no

    print("\n--- 3. Testing Unauthorized Access to Management Endpoints ---")
    res_unauth = requests.get(f"{BASE_URL}/api/guests/stats")
    print("Unauth Stats Code:", res_unauth.status_code)
    assert res_unauth.status_code == 401, f"Expected 401, got {res_unauth.status_code}"

    print("\n--- 4. Logging in as Warden ---")
    session = requests.Session()
    login_res = session.post(f"{BASE_URL}/api/auth/login", json={
        "username": "warden_admin",
        "password": "WardenPassword123!"
    })
    print("Warden Login Status:", login_res.status_code)
    login_data = login_res.json()
    csrf_token = login_data.get("csrf_token")
    auth_token = login_res.cookies.get("access_token")
    print("CSRF Token:", csrf_token)
    assert login_res.status_code == 200, f"Login failed: {login_data}"
    assert auth_token is not None, "Missing access_token cookie"

    headers = {
        "Authorization": f"Bearer {auth_token}",
        "X-CSRF-Token": csrf_token or ""
    }

    print("\n--- 5. Testing Authorized Stats Endpoint ---")
    stats_res = requests.get(f"{BASE_URL}/api/guests/stats", headers=headers)
    print("Stats Status Code:", stats_res.status_code)
    stats = stats_res.json()
    print("Stats Response:", json.dumps(stats, indent=2))
    assert stats_res.status_code == 200
    assert stats["data"]["totalRequests"] >= 1
    assert stats["data"]["pendingRequests"] >= 1

    print("\n--- 6. Testing Authorized List Guests Endpoint ---")
    list_res = requests.get(f"{BASE_URL}/api/guests?search=Anil", headers=headers)
    print("List Status Code:", list_res.status_code)
    list_data = list_res.json()
    print(f"Found {list_data['total']} guests matching 'Anil'")
    assert list_res.status_code == 200
    assert list_data["total"] >= 1

    print("\n--- 7. Testing Guest Details Endpoint ---")
    detail_res = requests.get(f"{BASE_URL}/api/guests/{guest_id}", headers=headers)
    print("Detail Status Code:", detail_res.status_code)
    detail_data = detail_res.json()
    print("Guest Detail:", json.dumps(detail_data, indent=2))
    assert detail_res.status_code == 200
    assert detail_data["data"]["Guest_Name"] == "Dr. Anil Verma"

    print("\n--- 8. Testing Approve Guest Request ---")
    approve_res = requests.patch(f"{BASE_URL}/api/guests/{guest_id}/approve", json={
        "adminRemarks": "Allocated ground floor suite 101"
    }, headers=headers)
    print("Approve Status Code:", approve_res.status_code)
    approve_data = approve_res.json()
    print("Approve Response:", json.dumps(approve_data, indent=2))
    assert approve_res.status_code == 200
    assert approve_data["data"]["Status"] == "Approved"

    print("\n--- 9. Testing Check-In Guest ---")
    checkin_res = requests.patch(f"{BASE_URL}/api/guests/{guest_id}/check-in", headers=headers)
    print("Check-In Status Code:", checkin_res.status_code)
    checkin_data = checkin_res.json()
    print("Check-In Response:", json.dumps(checkin_data, indent=2))
    assert checkin_res.status_code == 200
    assert checkin_data["data"]["Check_In_Status"] == "Checked-In"

    print("\n--- 10. Testing Prevent Duplicate Check-In ---")
    dup_checkin_res = requests.patch(f"{BASE_URL}/api/guests/{guest_id}/check-in", headers=headers)
    print("Duplicate Check-In Code:", dup_checkin_res.status_code)
    assert dup_checkin_res.status_code == 400

    print("\n--- 11. Testing Check-Out Guest ---")
    checkout_res = requests.patch(f"{BASE_URL}/api/guests/{guest_id}/check-out", headers=headers)
    print("Check-Out Status Code:", checkout_res.status_code)
    checkout_data = checkout_res.json()
    print("Check-Out Response:", json.dumps(checkout_data, indent=2))
    assert checkout_res.status_code == 200
    assert checkout_data["data"]["Check_In_Status"] == "Checked-Out"

    print("\n--- 12. Testing Reject Request Flow on a New Guest ---")
    res_second = requests.post(f"{BASE_URL}/api/guests/public-request", json={
        "guestName": "Prof. S. R. Rao",
        "email": "sr.rao@univ.ac.in",
        "phone": "+91 94440 98765",
        "studentRelation": "Official University Guest",
        "checkInDate": "2026-11-28",
        "checkOutDate": "2026-11-29",
        "guestCount": 1,
        "roomPreference": "Standard Visitor Room"
    })
    second_id = res_second.json()["data"]["Guest_ID"]

    reject_res = requests.patch(f"{BASE_URL}/api/guests/{second_id}/reject", json={
        "rejectionReason": "Guest rooms undergoing scheduled plumbing maintenance"
    }, headers=headers)
    print("Reject Status Code:", reject_res.status_code)
    reject_data = reject_res.json()
    print("Reject Response:", json.dumps(reject_data, indent=2))
    assert reject_res.status_code == 200
    assert reject_data["data"]["Status"] == "Rejected"
    assert reject_data["data"]["Rejection_Reason"] == "Guest rooms undergoing scheduled plumbing maintenance"

    print("\n=== ALL BACKEND GUEST TESTS PASSED SUCCESSFULLY! ===")

if __name__ == "__main__":
    test_guest_workflow()
