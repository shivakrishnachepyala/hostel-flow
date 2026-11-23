import requests
import json

BASE_URL = "http://127.0.0.1:5000"

def run_tests():
    print("Testing Guest Accommodation Lifecycle & Room Assignment Endpoints...")
    session = requests.Session()

    # 1. Login as Warden
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

    # 2. Submit a new guest request to test with
    print("\n--- 1. Submitting a test guest stay request ---")
    sub_res = requests.post(f"{BASE_URL}/api/guests/public-request", json={
        "guestName": "Dr. Vikram Sethi",
        "email": "vikram.sethi@example.com",
        "phone": "+91 98111 22334",
        "studentRelation": "Parent of Current Student",
        "studentReference": "1002",
        "checkInDate": "2026-12-01",
        "checkOutDate": "2026-12-03",
        "guestCount": 2,
        "roomPreference": "Double",
        "specialRequests": "Near stairs"
    })
    assert sub_res.status_code == 201, f"Submission failed: {sub_res.json()}"
    guest_data = sub_res.json()["data"]
    guest_id = guest_data["Guest_ID"]
    print(f"Created test guest #{guest_id} (Ref: {guest_data['Reference_No']})")

    # 3. Test Check-In Failure when not approved or no room
    print("\n--- 2. Testing Check-In Blocked when Pending ---")
    ci_res1 = session.patch(f"{BASE_URL}/api/guests/{guest_id}/check-in", headers=headers)
    print("Check-in status while pending:", ci_res1.status_code, ci_res1.json())
    assert ci_res1.status_code == 400

    # 4. Approve Request (without room assignment)
    print("\n--- 3. Approving Guest Request (Separate Step) ---")
    app_res = session.patch(f"{BASE_URL}/api/guests/{guest_id}/approve", headers=headers)
    assert app_res.status_code == 200, f"Approve failed: {app_res.json()}"
    print("Approved successfully. Status:", app_res.json()["data"]["Status"])

    # 5. Test Check-In Failure when Approved but NO Room Assigned
    print("\n--- 4. Testing Check-In Blocked when No Room Assigned ---")
    ci_res2 = session.patch(f"{BASE_URL}/api/guests/{guest_id}/check-in", headers=headers)
    print("Check-in status without room:", ci_res2.status_code, ci_res2.json())
    assert ci_res2.status_code == 400
    assert "without an assigned room" in ci_res2.json()["message"]

    # 6. Test GET Available Rooms for this Guest
    print("\n--- 5. Testing Available Rooms Calculation ---")
    avail_res = session.get(f"{BASE_URL}/api/guests/{guest_id}/available-rooms", headers=headers)
    assert avail_res.status_code == 200, f"Failed: {avail_res.json()}"
    avail_data = avail_res.json()
    print(f"Total rooms evaluated: {avail_data['totalRooms']}, Available: {avail_data['availableCount']}")
    rooms_list = avail_data["data"]
    assert len(rooms_list) > 0

    first_avail = next((r for r in rooms_list if r["is_available"]), None)
    assert first_avail is not None, "No available rooms found for guest dates!"
    target_room_id = first_avail["Room_ID"]
    print(f"Selected eligible room: #{target_room_id} (Room {first_avail['Room_Number']}, Capacity: {first_avail['Capacity']}, Avail Cap: {first_avail['available_capacity']})")

    # 7. Assign Room
    print(f"\n--- 6. Assigning Room #{target_room_id} to Guest #{guest_id} ---")
    assign_res = session.patch(f"{BASE_URL}/api/guests/{guest_id}/assign-room", json={
        "roomId": target_room_id,
        "adminRemarks": "Ground floor double room assigned."
    }, headers=headers)
    assert assign_res.status_code == 200, f"Assign room failed: {assign_res.json()}"
    assigned_data = assign_res.json()["data"]
    assert assigned_data["Assigned_Room_ID"] == target_room_id
    print(f"Assigned Room Number: {assigned_data.get('Assigned_Room_Number')}, Block: {assigned_data.get('Assigned_Block_Name')}")

    # 8. Test Double-Booking Prevention:
    # Submit a SECOND guest with overlapping dates (2026-12-02 to 2026-12-04) and attempt to assign the same room
    print("\n--- 7. Testing Overlap & Double-Booking Prevention ---")
    sub_res2 = requests.post(f"{BASE_URL}/api/guests/public-request", json={
        "guestName": "Prof. Arvind Rao",
        "email": "arvind.rao@example.com",
        "phone": "+91 97777 88888",
        "checkInDate": "2026-12-02",
        "checkOutDate": "2026-12-04",
        "guestCount": first_avail["Capacity"], # Request entire room capacity
        "roomPreference": "Double"
    })
    guest_id_2 = sub_res2.json()["data"]["Guest_ID"]
    session.patch(f"{BASE_URL}/api/guests/{guest_id_2}/approve", headers=headers)

    # Attempt to assign the same room which now has insufficient capacity due to Guest 1
    conflict_assign = session.patch(f"{BASE_URL}/api/guests/{guest_id_2}/assign-room", json={
        "roomId": target_room_id
    }, headers=headers)
    print("Conflict assignment status:", conflict_assign.status_code, conflict_assign.json())
    assert conflict_assign.status_code == 400
    assert "insufficient available capacity" in conflict_assign.json()["message"]
    print("Double-booking prevented successfully!")

    # 9. Now test Check-In with valid room assignment
    print(f"\n--- 8. Testing Check-In for Guest #{guest_id} ---")
    ci_res3 = session.patch(f"{BASE_URL}/api/guests/{guest_id}/check-in", headers=headers)
    assert ci_res3.status_code == 200, f"Check in failed: {ci_res3.json()}"
    ci_data = ci_res3.json()["data"]
    assert ci_data["Check_In_Status"] == "Checked-In"
    assert ci_data["Actual_Check_In"] is not None
    print(f"Guest checked in at: {ci_data['Actual_Check_In']}")

    # 10. Test Check-Out
    print(f"\n--- 9. Testing Check-Out for Guest #{guest_id} ---")
    co_res = session.patch(f"{BASE_URL}/api/guests/{guest_id}/check-out", headers=headers)
    assert co_res.status_code == 200, f"Check out failed: {co_res.json()}"
    co_data = co_res.json()["data"]
    assert co_data["Check_In_Status"] == "Checked-Out"
    assert co_data["Actual_Check_Out"] is not None
    print(f"Guest checked out at: {co_data['Actual_Check_Out']}")

    # 11. Verify Stats Endpoint includes new counts
    print("\n--- 10. Verifying Guest Stats ---")
    stats_res = session.get(f"{BASE_URL}/api/guests/stats", headers=headers)
    assert stats_res.status_code == 200
    print("Updated Stats:", json.dumps(stats_res.json()["data"], indent=2))

    print("\nALL GUEST ACCOMMODATION LIFECYCLE TESTS PASSED PERFECTLY!")

if __name__ == "__main__":
    run_tests()
