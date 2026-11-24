"""
HostelFlow 3D Explorer API Routes
Provides privacy-safe, read-only aggregated accommodation hierarchy for the 3D Explorer.
Exposes zero student PII (No names, IDs, phones, or private allocation records).
"""

from flask import Blueprint, jsonify
from db import get_db_connection
from routes.route_utils import format_row, handle_db_error

explorer_bp = Blueprint("explorer", __name__, url_prefix="/api/explorer")


@explorer_bp.route("/campus", methods=["GET"], strict_slashes=False)
def get_explorer_campus_data():
    """
    Retrieves campus-wide 3D visualization metadata:
    - All operational hostels in the database
    - Blocks grouped under each hostel with room, bed, and floor summaries
    - Reconciled live occupancy statistics for each hostel and the entire campus
    Zero student personal information is accessed or returned.
    """
    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        # 1. Fetch all hostels
        cursor.execute("""
            SELECT Hostel_ID, Hostel_Name, Location, Capacity, Hostel_Type
            FROM hostel
            ORDER BY Hostel_ID
        """)
        raw_hostels = [format_row(row) for row in cursor.fetchall()]

        # 2. Fetch block-level aggregated room, bed, and occupancy counts
        cursor.execute("""
            SELECT b.Block_ID, b.Block_Name, b.Gender, b.Capacity AS Block_Capacity, b.Hostel_ID,
                   COUNT(DISTINCT r.Room_ID) AS total_rooms,
                   COUNT(DISTINCT bd.Bed_ID) AS total_beds,
                   COUNT(DISTINCT CASE WHEN bd.Bed_Status = 'Occupied' OR ra.Allocation_ID IS NOT NULL THEN bd.Bed_ID END) AS occupied_beds,
                   GROUP_CONCAT(DISTINCT r.Floor ORDER BY r.Floor) AS floors_str
            FROM hostel_block b
            LEFT JOIN room r ON b.Block_ID = r.Block_ID
            LEFT JOIN bed bd ON r.Room_ID = bd.Room_ID
            LEFT JOIN room_allocation ra ON bd.Bed_ID = ra.Bed_ID AND ra.Allocation_Status = 'Active'
            GROUP BY b.Block_ID, b.Block_Name, b.Gender, b.Capacity, b.Hostel_ID
            ORDER BY b.Block_ID
        """)
        raw_blocks = [format_row(row) for row in cursor.fetchall()]

        # Group blocks by Hostel_ID
        blocks_by_hostel = {}
        for block in raw_blocks:
            h_id = block["Hostel_ID"]
            if h_id not in blocks_by_hostel:
                blocks_by_hostel[h_id] = []

            floors_list = []
            if block.get("floors_str"):
                floors_list = [int(f.strip()) for f in str(block["floors_str"]).split(",") if f.strip().isdigit()]

            total_beds = int(block.get("total_beds") or 0)
            occupied_beds = int(block.get("occupied_beds") or 0)
            available_beds = max(0, total_beds - occupied_beds)

            blocks_by_hostel[h_id].append({
                "Block_ID": block["Block_ID"],
                "Block_Name": block["Block_Name"],
                "Gender": block["Gender"],
                "Capacity": block["Block_Capacity"],
                "total_rooms": int(block.get("total_rooms") or 0),
                "total_beds": total_beds,
                "occupied_beds": occupied_beds,
                "available_beds": available_beds,
                "occupancy_rate": round((occupied_beds / total_beds) * 100, 1) if total_beds > 0 else 0.0,
                "floors": floors_list,
            })

        # Assemble hierarchical hostel summaries
        hostels_data = []
        campus_total_rooms = 0
        campus_total_beds = 0
        campus_total_occupied = 0
        campus_total_available = 0

        for hostel in raw_hostels:
            h_id = hostel["Hostel_ID"]
            hostel_blocks = blocks_by_hostel.get(h_id, [])

            total_rooms = sum(b["total_rooms"] for b in hostel_blocks)
            total_beds = sum(b["total_beds"] for b in hostel_blocks)
            occupied_beds = sum(b["occupied_beds"] for b in hostel_blocks)
            available_beds = sum(b["available_beds"] for b in hostel_blocks)
            occupancy_rate = round((occupied_beds / total_beds) * 100, 1) if total_beds > 0 else 0.0

            # Derive unique sorted floors present across all blocks of this hostel
            hostel_floors = sorted(list(set(f for b in hostel_blocks for f in b["floors"])))

            hostels_data.append({
                "Hostel_ID": h_id,
                "Hostel_Name": hostel["Hostel_Name"],
                "Hostel_Type": hostel["Hostel_Type"],
                "Location": hostel["Location"],
                "Capacity": hostel["Capacity"],
                "blocks": hostel_blocks,
                "total_blocks": len(hostel_blocks),
                "total_rooms": total_rooms,
                "total_beds": total_beds,
                "occupied_beds": occupied_beds,
                "available_beds": available_beds,
                "occupancy_rate": occupancy_rate,
                "floors": hostel_floors,
                "floor_count": len(hostel_floors),
            })

            campus_total_rooms += total_rooms
            campus_total_beds += total_beds
            campus_total_occupied += occupied_beds
            campus_total_available += available_beds

        campus_stats = {
            "total_hostels": len(hostels_data),
            "total_blocks": sum(h["total_blocks"] for h in hostels_data),
            "total_rooms": campus_total_rooms,
            "total_beds": campus_total_beds,
            "occupied_beds": campus_total_occupied,
            "available_beds": campus_total_available,
            "occupancy_rate": (
                round((campus_total_occupied / campus_total_beds) * 100, 1)
                if campus_total_beds > 0
                else 0.0
            ),
        }

        return jsonify({
            "status": "success",
            "data": {
                "hostels": hostels_data,
                "campus_stats": campus_stats,
            }
        }), 200

    except Exception as error:
        return handle_db_error(error, "retrieving explorer campus data")

    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()


@explorer_bp.route("/block/<int:block_id>", methods=["GET"], strict_slashes=False)
def get_explorer_block_data(block_id):
    """
    Retrieves complete 3D hierarchy for a specific hostel block:
    - Hostel & Block metadata
    - Rooms with facilities and layout specifications
    - Physical beds with privacy-safe reconciled occupancy status
    - Aggregated inventory counts
    Zero student personal information is accessed or returned.
    """
    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        # 1. Fetch Block & Parent Hostel metadata
        cursor.execute("""
            SELECT b.Block_ID, b.Block_Name, b.Gender, b.Capacity AS Block_Capacity,
                   h.Hostel_ID, h.Hostel_Name, h.Hostel_Type, h.Location, h.Capacity AS Hostel_Capacity
            FROM hostel_block b
            JOIN hostel h ON b.Hostel_ID = h.Hostel_ID
            WHERE b.Block_ID = %s
        """, (block_id,))

        block_record = cursor.fetchone()
        if not block_record:
            return jsonify({
                "status": "error",
                "message": f"Hostel block with Block_ID {block_id} not found."
            }), 404

        block_data = format_row(block_record)

        # 2. Fetch all rooms in this block
        cursor.execute("""
            SELECT r.Room_ID, r.Room_Number, r.Floor, r.Room_Type, r.Capacity,
                   r.Facilities, r.Layout_Data, r.Block_ID
            FROM room r
            WHERE r.Block_ID = %s
            ORDER BY r.Floor, r.Room_Number, r.Room_ID
        """, (block_id,))

        raw_rooms = [format_row(row) for row in cursor.fetchall()]

        # 3. Fetch all physical beds for rooms in this block with privacy-safe occupancy flag
        cursor.execute("""
            SELECT b.Bed_ID, b.Bed_Number, b.Bed_Type, b.Bed_Status, b.Room_ID,
                   CASE
                       WHEN b.Bed_Status = 'Occupied' OR ra.Allocation_ID IS NOT NULL THEN 1
                       ELSE 0
                   END AS is_occupied
            FROM bed b
            JOIN room r ON b.Room_ID = r.Room_ID
            LEFT JOIN room_allocation ra ON b.Bed_ID = ra.Bed_ID AND ra.Allocation_Status = 'Active'
            WHERE r.Block_ID = %s
            ORDER BY b.Room_ID, b.Bed_Number, b.Bed_ID
        """, (block_id,))

        raw_beds = [format_row(row) for row in cursor.fetchall()]

        # Group beds by Room_ID
        beds_by_room = {}
        for bed in raw_beds:
            r_id = bed["Room_ID"]
            if r_id not in beds_by_room:
                beds_by_room[r_id] = []
            beds_by_room[r_id].append({
                "Bed_ID": bed["Bed_ID"],
                "Bed_Number": bed["Bed_Number"],
                "Bed_Type": bed["Bed_Type"],
                "Bed_Status": "Occupied" if bed["is_occupied"] == 1 else (bed.get("Bed_Status") or "Available"),
                "is_occupied": bool(bed["is_occupied"]),
            })

        # 4. Synthesize room occupancy metrics and attach beds
        processed_rooms = []
        for room in raw_rooms:
            r_id = room["Room_ID"]
            room_beds = beds_by_room.get(r_id, [])
            total_beds = len(room_beds)
            occupied_beds = sum(1 for b in room_beds if b["is_occupied"])
            available_beds = max(0, total_beds - occupied_beds)

            if total_beds == 0 or available_beds == 0:
                status = "fully-occupied"
            elif occupied_beds > 0 and available_beds > 0:
                status = "partially-occupied"
            else:
                status = "available"

            room_entry = {
                **room,
                "Block_Name": block_data["Block_Name"],
                "Hostel_Name": block_data["Hostel_Name"],
                "Hostel_ID": block_data["Hostel_ID"],
                "beds": room_beds,
                "totalBeds": total_beds,
                "occupiedBeds": occupied_beds,
                "availableBeds": available_beds,
                "status": status,
            }
            processed_rooms.append(room_entry)

        # 5. Extract sorted unique floors
        floors = sorted(list(set(
            r["Floor"] for r in processed_rooms if r.get("Floor") is not None and isinstance(r["Floor"], (int, float))
        )))

        # 6. Compute block-wide occupancy statistics
        total_rooms_count = len(processed_rooms)
        total_beds_count = sum(r["totalBeds"] for r in processed_rooms)
        total_occupied_count = sum(r["occupiedBeds"] for r in processed_rooms)
        total_available_count = sum(r["availableBeds"] for r in processed_rooms)
        occupancy_rate = (
            round((total_occupied_count / total_beds_count) * 100, 1)
            if total_beds_count > 0
            else 0.0
        )

        return jsonify({
            "status": "success",
            "data": {
                "hostel": {
                    "Hostel_ID": block_data["Hostel_ID"],
                    "Hostel_Name": block_data["Hostel_Name"],
                    "Hostel_Type": block_data["Hostel_Type"],
                    "Location": block_data["Location"],
                    "Capacity": block_data["Hostel_Capacity"],
                },
                "block": {
                    "Block_ID": block_data["Block_ID"],
                    "Block_Name": block_data["Block_Name"],
                    "Gender": block_data["Gender"],
                    "Capacity": block_data["Block_Capacity"],
                },
                "stats": {
                    "total_rooms": total_rooms_count,
                    "total_beds": total_beds_count,
                    "occupied_beds": total_occupied_count,
                    "available_beds": total_available_count,
                    "occupancy_rate": occupancy_rate,
                },
                "floors": floors,
                "rooms": processed_rooms,
            }
        }), 200

    except Exception as error:
        return handle_db_error(error, "retrieving explorer block data")

    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()
