"""
HostelFlow - Stage 6/Block A1 Inventory Provisioning Script

Safely provisions 25 additional rooms and 48 physical beds for Block A1
(Block_ID=201, Hostel_ID=1) under Hostel A, achieving:
- 30 rooms total
- 60 physical beds total
- 3 floors (10 rooms and 20 beds per floor)
- Preserves all 5 existing rooms and 12 physical beds
- Preserves all existing room allocations and occupancy state
- Transaction-safe with MySQL session named locking
"""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from db import get_db_connection
from routes.route_utils import acquire_session_named_lock


# Provisioning Plan: 25 rooms, 48 beds
NEW_ROOMS_PLAN = [
    # --- Floor 1 (7 rooms, 13 beds) ---
    {"Room_ID": 591, "Room_Number": "104", "Floor": 1, "Room_Type": "Single", "Capacity": 1, "beds": ["A"]},
    {"Room_ID": 592, "Room_Number": "105", "Floor": 1, "Room_Type": "Single", "Capacity": 1, "beds": ["A"]},
    {"Room_ID": 593, "Room_Number": "106", "Floor": 1, "Room_Type": "Double", "Capacity": 2, "beds": ["A", "B"]},
    {"Room_ID": 594, "Room_Number": "107", "Floor": 1, "Room_Type": "Double", "Capacity": 2, "beds": ["A", "B"]},
    {"Room_ID": 595, "Room_Number": "108", "Floor": 1, "Room_Type": "Double", "Capacity": 2, "beds": ["A", "B"]},
    {"Room_ID": 596, "Room_Number": "109", "Floor": 1, "Room_Type": "Double", "Capacity": 2, "beds": ["A", "B"]},
    {"Room_ID": 597, "Room_Number": "110", "Floor": 1, "Room_Type": "Triple", "Capacity": 3, "beds": ["A", "B", "C"]},

    # --- Floor 2 (8 rooms, 15 beds) ---
    {"Room_ID": 598, "Room_Number": "203", "Floor": 2, "Room_Type": "Single", "Capacity": 1, "beds": ["A"]},
    {"Room_ID": 599, "Room_Number": "204", "Floor": 2, "Room_Type": "Single", "Capacity": 1, "beds": ["A"]},
    {"Room_ID": 600, "Room_Number": "205", "Floor": 2, "Room_Type": "Double", "Capacity": 2, "beds": ["A", "B"]},
    {"Room_ID": 601, "Room_Number": "206", "Floor": 2, "Room_Type": "Double", "Capacity": 2, "beds": ["A", "B"]},
    {"Room_ID": 602, "Room_Number": "207", "Floor": 2, "Room_Type": "Double", "Capacity": 2, "beds": ["A", "B"]},
    {"Room_ID": 603, "Room_Number": "208", "Floor": 2, "Room_Type": "Double", "Capacity": 2, "beds": ["A", "B"]},
    {"Room_ID": 604, "Room_Number": "209", "Floor": 2, "Room_Type": "Double", "Capacity": 2, "beds": ["A", "B"]},
    {"Room_ID": 605, "Room_Number": "210", "Floor": 2, "Room_Type": "Triple", "Capacity": 3, "beds": ["A", "B", "C"]},

    # --- Floor 3 (10 rooms, 20 beds) ---
    {"Room_ID": 606, "Room_Number": "301", "Floor": 3, "Room_Type": "Single", "Capacity": 1, "beds": ["A"]},
    {"Room_ID": 607, "Room_Number": "302", "Floor": 3, "Room_Type": "Single", "Capacity": 1, "beds": ["A"]},
    {"Room_ID": 608, "Room_Number": "303", "Floor": 3, "Room_Type": "Double", "Capacity": 2, "beds": ["A", "B"]},
    {"Room_ID": 609, "Room_Number": "304", "Floor": 3, "Room_Type": "Double", "Capacity": 2, "beds": ["A", "B"]},
    {"Room_ID": 610, "Room_Number": "305", "Floor": 3, "Room_Type": "Double", "Capacity": 2, "beds": ["A", "B"]},
    {"Room_ID": 611, "Room_Number": "306", "Floor": 3, "Room_Type": "Double", "Capacity": 2, "beds": ["A", "B"]},
    {"Room_ID": 612, "Room_Number": "307", "Floor": 3, "Room_Type": "Double", "Capacity": 2, "beds": ["A", "B"]},
    {"Room_ID": 613, "Room_Number": "308", "Floor": 3, "Room_Type": "Double", "Capacity": 2, "beds": ["A", "B"]},
    {"Room_ID": 614, "Room_Number": "309", "Floor": 3, "Room_Type": "Triple", "Capacity": 3, "beds": ["A", "B", "C"]},
    {"Room_ID": 615, "Room_Number": "310", "Floor": 3, "Room_Type": "Triple", "Capacity": 3, "beds": ["A", "B", "C"]},
]


def execute_provisioning():
    print("=" * 60)
    print("HOSTELFLOW: BLOCK A1 INVENTORY EXPANSION EXECUTION")
    print("=" * 60)

    conn = get_db_connection()
    try:
        with acquire_session_named_lock(conn, "hostelflow_alloc_lock", timeout=15):
            print("\n[LOCK] Acquired session named lock 'hostelflow_alloc_lock'.")
            conn.start_transaction()
            cur = conn.cursor(dictionary=True)

            # 1. Pre-validation of Hostel A and Block A1
            cur.execute("SELECT Hostel_ID, Hostel_Name FROM hostel WHERE Hostel_ID = 1")
            hostel = cur.fetchone()
            if not hostel or hostel["Hostel_Name"] != "Hostel A":
                raise ValueError("Hostel A (Hostel_ID=1) not found!")

            cur.execute("SELECT Block_ID, Block_Name, Capacity, Hostel_ID FROM hostel_block WHERE Block_ID = 201")
            block = cur.fetchone()
            if not block or block["Block_Name"] != "Block A1" or block["Hostel_ID"] != 1:
                raise ValueError("Block A1 (Block_ID=201, Hostel_ID=1) not found!")

            # 2. Existing inventory pre-check
            cur.execute("SELECT COUNT(*) AS cnt FROM room WHERE Block_ID = 201")
            current_room_cnt = cur.fetchone()["cnt"]
            cur.execute("SELECT COUNT(*) AS cnt FROM bed b JOIN room r ON b.Room_ID = r.Room_ID WHERE r.Block_ID = 201")
            current_bed_cnt = cur.fetchone()["cnt"]

            print(f"[PRE-CHECK] Current Block A1 Rooms: {current_room_cnt} (Expected: 5)")
            print(f"[PRE-CHECK] Current Block A1 Beds:  {current_bed_cnt} (Expected: 12)")

            if current_room_cnt != 5 or current_bed_cnt != 12:
                raise ValueError(f"Inventory mismatch: Expected 5 rooms, 12 beds; Found {current_room_cnt} rooms, {current_bed_cnt} beds.")

            # 3. Check that new room IDs and bed IDs are completely unassigned
            new_room_ids = [r["Room_ID"] for r in NEW_ROOMS_PLAN]
            cur.execute("SELECT Room_ID FROM room WHERE Room_ID IN (%s)" % ",".join(str(i) for i in new_room_ids))
            existing_conflict_rooms = cur.fetchall()
            if existing_conflict_rooms:
                raise ValueError(f"Room ID conflict detected: {existing_conflict_rooms}")

            # Calculate bed assignments
            current_bed_id = 2211
            bed_insert_rows = []
            room_insert_rows = []

            for r in NEW_ROOMS_PLAN:
                room_insert_rows.append((
                    r["Room_ID"],
                    r["Room_Number"],
                    r["Floor"],
                    r["Room_Type"],
                    r["Capacity"],
                    "Fan, Study Table, Wardrobe",
                    None,
                    201
                ))
                for bed_letter in r["beds"]:
                    bed_insert_rows.append((
                        current_bed_id,
                        bed_letter,
                        "Single",
                        "Available",
                        r["Room_ID"]
                    ))
                    current_bed_id += 1

            new_bed_ids = [b[0] for b in bed_insert_rows]
            cur.execute("SELECT Bed_ID FROM bed WHERE Bed_ID IN (%s)" % ",".join(str(i) for i in new_bed_ids))
            existing_conflict_beds = cur.fetchall()
            if existing_conflict_beds:
                raise ValueError(f"Bed ID conflict detected: {existing_conflict_beds}")

            print(f"[PLAN] Preparing to insert {len(room_insert_rows)} rooms (IDs {new_room_ids[0]}–{new_room_ids[-1]})")
            print(f"[PLAN] Preparing to insert {len(bed_insert_rows)} beds (IDs {new_bed_ids[0]}–{new_bed_ids[-1]})")

            # 4. Insert Rooms
            cur.executemany("""
                INSERT INTO room
                (Room_ID, Room_Number, Floor, Room_Type, Capacity, Facilities, Layout_Data, Block_ID)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """, room_insert_rows)
            print(f"[SUCCESS] Inserted {len(room_insert_rows)} rooms into 'room' table.")

            # 5. Insert Beds
            cur.executemany("""
                INSERT INTO bed
                (Bed_ID, Bed_Number, Bed_Type, Bed_Status, Room_ID)
                VALUES (%s, %s, %s, %s, %s)
            """, bed_insert_rows)
            print(f"[SUCCESS] Inserted {len(bed_insert_rows)} beds into 'bed' table.")

            # 6. Post-insertion Assertions before commit
            cur.execute("SELECT COUNT(*) AS cnt FROM room WHERE Block_ID = 201")
            final_room_cnt = cur.fetchone()["cnt"]
            cur.execute("SELECT COUNT(*) AS cnt FROM bed b JOIN room r ON b.Room_ID = r.Room_ID WHERE r.Block_ID = 201")
            final_bed_cnt = cur.fetchone()["cnt"]

            print(f"[POST-CHECK] Final Block A1 Rooms: {final_room_cnt} (Expected: 30)")
            print(f"[POST-CHECK] Final Block A1 Beds:  {final_bed_cnt} (Expected: 60)")

            if final_room_cnt != 30 or final_bed_cnt != 60:
                raise ValueError(f"Post-insertion check failed: {final_room_cnt} rooms, {final_bed_cnt} beds!")

            # Verify Floor-by-Floor Distribution
            cur.execute("""
                SELECT r.Floor, COUNT(DISTINCT r.Room_ID) AS rooms, COUNT(b.Bed_ID) AS beds
                FROM room r
                LEFT JOIN bed b ON r.Room_ID = b.Room_ID
                WHERE r.Block_ID = 201
                GROUP BY r.Floor
                ORDER BY r.Floor
            """)
            floor_dist = cur.fetchall()
            print("\n[FLOOR DISTRIBUTION]")
            for f in floor_dist:
                print(f"  Floor {f['Floor']}: {f['rooms']} rooms, {f['beds']} beds")
                if f["rooms"] != 10 or f["beds"] != 20:
                    raise ValueError(f"Floor {f['Floor']} failed 10-room/20-bed invariant: {f}")

            # Verify Allocation Preservation
            cur.execute("""
                SELECT COUNT(*) AS active_allocs
                FROM room_allocation ra
                JOIN bed b ON ra.Bed_ID = b.Bed_ID
                JOIN room r ON b.Room_ID = r.Room_ID
                WHERE r.Block_ID = 201 AND ra.Allocation_Status = 'Active'
            """)
            active_allocs = cur.fetchone()["active_allocs"]
            print(f"[ALLOCATIONS] Active allocations in Block A1: {active_allocs} (Expected: 4)")
            if active_allocs != 4:
                raise ValueError(f"Active allocations corrupted! Expected 4, found {active_allocs}")

            # Commit Transaction
            conn.commit()
            print("\n[COMMIT] Transaction committed successfully to database 'hms'.")

    except Exception as e:
        if conn and conn.is_connected():
            conn.rollback()
        print(f"\n[ERROR] Transaction aborted and rolled back: {e}")
        raise
    finally:
        if conn and conn.is_connected():
            conn.close()

    print("\n" + "=" * 60)
    print("BLOCK A1 INVENTORY EXPANSION COMPLETED SUCCESSFULLY!")
    print("=" * 60)


if __name__ == "__main__":
    execute_provisioning()
