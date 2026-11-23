from flask import Blueprint, jsonify, request
from db import get_db_connection
from routes.route_utils import format_row, handle_db_error, parse_date
from services.auth_service import warden_required, get_current_warden

room_allocation_bp = Blueprint(
    "room_allocation",
    __name__,
    url_prefix="/api/room-allocations"
)


# GET: Public active allocation status for capacity and vacancy calculation
# Excludes all Student PII (Student_ID, personal records) to preserve student privacy
@room_allocation_bp.route("/active", methods=["GET"], strict_slashes=False)
@room_allocation_bp.route("/public", methods=["GET"], strict_slashes=False)
def get_public_active_allocations():
    connection = None
    cursor = None

    try:
        room_id = request.args.get("room_id", type=int)
        bed_id = request.args.get("bed_id", type=int)

        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        query = """
            SELECT Allocation_ID, Room_ID, Bed_ID,
                   Allocation_Date, Start_Date, End_Date, Allocation_Status
            FROM room_allocation
            WHERE Allocation_Status = 'Active'
        """
        conditions = []
        params = []

        if room_id is not None:
            conditions.append("Room_ID = %s")
            params.append(room_id)

        if bed_id is not None:
            conditions.append("Bed_ID = %s")
            params.append(bed_id)

        if conditions:
            query += " AND " + " AND ".join(conditions)

        query += " ORDER BY Allocation_ID"

        cursor.execute(query, tuple(params))
        allocations = [format_row(row) for row in cursor.fetchall()]

        return jsonify({
            "status": "success",
            "count": len(allocations),
            "data": allocations
        }), 200

    except Exception as error:
        return handle_db_error(error, "retrieving public room allocations")

    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()


# GET: Retrieve all allocations with optional filters
# Authenticated wardens receive full records including Student_ID.
# Unauthenticated visitors may only query active allocation status (for vacancy computing),
# in which case Student_ID is strictly stripped to protect student privacy.
@room_allocation_bp.route("/", methods=["GET"], strict_slashes=False)
@room_allocation_bp.route("", methods=["GET"], strict_slashes=False)
def get_room_allocations():
    connection = None
    cursor = None

    try:
        student_id = request.args.get("student_id", type=int)
        room_id = request.args.get("room_id", type=int)
        bed_id = request.args.get("bed_id", type=int)
        status = request.args.get("status")

        warden = get_current_warden()

        # Authorization check:
        # If unauthenticated, only allow public vacancy calculation queries (status='Active' and no student_id filter).
        # Any attempt to access student-linked allocations or list general allocations requires warden auth.
        if not warden:
            if status and status.strip().lower() == "active" and student_id is None:
                is_public_view = True
            else:
                return jsonify({
                    "status": "error",
                    "message": "Authentication required. Missing token."
                }), 401
        else:
            is_public_view = False

        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        if is_public_view:
            query = """
                SELECT a.Allocation_ID, a.Room_ID, a.Bed_ID,
                       a.Allocation_Date, a.Start_Date, a.End_Date, a.Allocation_Status
                FROM room_allocation a
            """
        else:
            query = """
                SELECT a.Allocation_ID, a.Student_ID, a.Room_ID, a.Bed_ID,
                       a.Allocation_Date, a.Start_Date, a.End_Date, a.Allocation_Status,
                       s.Name AS Student_Name, s.Department AS Student_Dept, s.Email AS Student_Email,
                       r.Room_Number, r.Floor AS Room_Floor, r.Room_Type,
                       b.Bed_Number,
                       hb.Block_Name,
                       h.Hostel_Name
                FROM room_allocation a
                LEFT JOIN student s ON a.Student_ID = s.Student_ID
                LEFT JOIN room r ON a.Room_ID = r.Room_ID
                LEFT JOIN bed b ON a.Bed_ID = b.Bed_ID
                LEFT JOIN hostel_block hb ON r.Block_ID = hb.Block_ID
                LEFT JOIN hostel h ON hb.Hostel_ID = h.Hostel_ID
            """
        conditions = []
        params = []

        if student_id is not None and not is_public_view:
            conditions.append("a.Student_ID = %s")
            params.append(student_id)

        if room_id is not None:
            conditions.append("a.Room_ID = %s")
            params.append(room_id)

        if bed_id is not None:
            conditions.append("a.Bed_ID = %s")
            params.append(bed_id)

        if status:
            conditions.append("a.Allocation_Status = %s")
            params.append(status.strip())

        if conditions:
            query += " WHERE " + " AND ".join(conditions)

        query += " ORDER BY a.Allocation_ID"

        cursor.execute(query, tuple(params))
        allocations = [format_row(row) for row in cursor.fetchall()]

        return jsonify({
            "status": "success",
            "count": len(allocations),
            "data": allocations
        }), 200

    except Exception as error:
        return handle_db_error(error, "retrieving room allocations")

    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()


# GET: Retrieve single allocation by ID
@room_allocation_bp.route("/<int:allocation_id>", methods=["GET"], strict_slashes=False)
@warden_required
def get_room_allocation(allocation_id):
    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute("""
            SELECT Allocation_ID, Student_ID, Room_ID, Bed_ID,
                   Allocation_Date, Start_Date, End_Date, Allocation_Status
            FROM room_allocation
            WHERE Allocation_ID = %s
        """, (allocation_id,))

        allocation = cursor.fetchone()

        if not allocation:
            return jsonify({
                "status": "error",
                "message": "Room allocation not found."
            }), 404

        return jsonify({
            "status": "success",
            "data": format_row(allocation)
        }), 200

    except Exception as error:
        return handle_db_error(error, "retrieving room allocation")

    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()


# POST: Create a new room allocation with row locking and overlap prevention
@room_allocation_bp.route("/", methods=["POST"], strict_slashes=False)
@room_allocation_bp.route("", methods=["POST"], strict_slashes=False)
@warden_required
def create_room_allocation():
    connection = None
    cursor = None

    try:
        data = request.get_json(silent=True)

        if not isinstance(data, dict):
            return jsonify({
                "status": "error",
                "message": "A valid JSON object is required."
            }), 400

        required_fields = ["Student_ID", "Room_ID", "Bed_ID", "Allocation_Date", "Start_Date"]
        for field in required_fields:
            if field not in data or data[field] is None:
                return jsonify({
                    "status": "error",
                    "message": f"{field} is required."
                }), 400

        alloc_id = data.get("Allocation_ID")
        student_id = data["Student_ID"]
        room_id = data["Room_ID"]
        bed_id = data["Bed_ID"]

        for field_name, val in [("Student_ID", student_id), ("Room_ID", room_id), ("Bed_ID", bed_id)]:
            if isinstance(val, bool) or not isinstance(val, int) or val <= 0:
                return jsonify({
                    "status": "error",
                    "message": f"{field_name} must be a positive integer."
                }), 400

        if alloc_id is not None:
            if isinstance(alloc_id, bool) or not isinstance(alloc_id, int) or alloc_id <= 0:
                alloc_id = None

        alloc_date, err = parse_date(data["Allocation_Date"], "Allocation_Date")
        if err:
            return jsonify({"status": "error", "message": err}), 400

        start_date, err = parse_date(data["Start_Date"], "Start_Date")
        if err:
            return jsonify({"status": "error", "message": err}), 400

        end_date = None
        if "End_Date" in data and data["End_Date"] is not None:
            end_date, err = parse_date(data["End_Date"], "End_Date")
            if err:
                return jsonify({"status": "error", "message": err}), 400
            if end_date < start_date:
                return jsonify({
                    "status": "error",
                    "message": "End_Date cannot be earlier than Start_Date."
                }), 400

        status = data.get("Allocation_Status", "Active")
        if status is not None and not isinstance(status, str):
            status = str(status)

        connection = get_db_connection()
        connection.start_transaction()
        cursor = connection.cursor(dictionary=True)

        # Assign next Allocation_ID if not provided, or check primary key existence
        if alloc_id is None:
            cursor.execute("SELECT COALESCE(MAX(Allocation_ID), 0) + 1 AS next_id FROM room_allocation FOR UPDATE")
            row = cursor.fetchone()
            alloc_id = row["next_id"] if row else 1
        else:
            cursor.execute("SELECT Allocation_ID FROM room_allocation WHERE Allocation_ID = %s", (alloc_id,))
            if cursor.fetchone():
                connection.rollback()
                return jsonify({
                    "status": "error",
                    "message": f"Room allocation with Allocation_ID {alloc_id} already exists."
                }), 409

        # Verify Student exists
        cursor.execute("SELECT Student_ID FROM student WHERE Student_ID = %s", (student_id,))
        if not cursor.fetchone():
            connection.rollback()
            return jsonify({
                "status": "error",
                "message": f"Referenced Student_ID {student_id} does not exist."
            }), 409

        # Verify Room exists
        cursor.execute("SELECT Room_ID FROM room WHERE Room_ID = %s", (room_id,))
        if not cursor.fetchone():
            connection.rollback()
            return jsonify({
                "status": "error",
                "message": f"Referenced Room_ID {room_id} does not exist."
            }), 409

        # Lock the target bed row with SELECT ... FOR UPDATE to handle concurrent requests safely
        cursor.execute("SELECT Bed_ID, Room_ID FROM bed WHERE Bed_ID = %s FOR UPDATE", (bed_id,))
        bed_row = cursor.fetchone()
        if not bed_row:
            connection.rollback()
            return jsonify({
                "status": "error",
                "message": f"Referenced Bed_ID {bed_id} does not exist."
            }), 409

        if bed_row["Room_ID"] != room_id:
            connection.rollback()
            return jsonify({
                "status": "error",
                "message": f"Bed_ID {bed_id} does not belong to Room_ID {room_id}."
            }), 400

        # Check for overlapping active allocations on the same bed
        # An allocation is considered active if status is not cancelled/inactive/terminated
        is_requested_active = (status is None or status.strip().lower() not in ("cancelled", "inactive", "terminated"))

        if is_requested_active:
            cursor.execute("""
                SELECT Allocation_ID, Start_Date, End_Date, Allocation_Status
                FROM room_allocation
                WHERE Bed_ID = %s
                  AND (Allocation_Status IS NULL OR LOWER(Allocation_Status) NOT IN ('cancelled', 'inactive', 'terminated'))
                  AND (End_Date IS NULL OR End_Date >= %s)
                  AND (%s IS NULL OR Start_Date <= %s)
                FOR UPDATE
            """, (bed_id, start_date, end_date, end_date))

            overlapping = cursor.fetchall()
            if overlapping:
                connection.rollback()
                conflict_id = overlapping[0]["Allocation_ID"]
                return jsonify({
                    "status": "error",
                    "message": f"Bed_ID {bed_id} is already occupied by active allocation {conflict_id} during overlapping dates."
                }), 409

        cursor.execute("""
            INSERT INTO room_allocation
            (Allocation_ID, Student_ID, Room_ID, Bed_ID, Allocation_Date, Start_Date, End_Date, Allocation_Status)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            alloc_id,
            student_id,
            room_id,
            bed_id,
            alloc_date,
            start_date,
            end_date,
            status
        ))

        # Synchronize Bed_Status
        if status == 'Active':
            cursor.execute("UPDATE bed SET Bed_Status = 'Occupied' WHERE Bed_ID = %s", (bed_id,))

        connection.commit()

        return jsonify({
            "status": "success",
            "message": "Room allocation created successfully.",
            "Allocation_ID": alloc_id
        }), 201

    except Exception as error:
        if connection and connection.is_connected():
            connection.rollback()
        return handle_db_error(error, "creating room allocation")

    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()


# PUT: Update an existing room allocation with row locking and overlap validation
@room_allocation_bp.route("/<int:allocation_id>", methods=["PUT"], strict_slashes=False)
@warden_required
def update_room_allocation(allocation_id):
    connection = None
    cursor = None

    try:
        data = request.get_json(silent=True)

        if not isinstance(data, dict) or not data:
            return jsonify({
                "status": "error",
                "message": "A valid JSON object is required."
            }), 400

        allowed_fields = [
            "Student_ID",
            "Room_ID",
            "Bed_ID",
            "Allocation_Date",
            "Start_Date",
            "End_Date",
            "Allocation_Status"
        ]

        updates = {key: data[key] for key in allowed_fields if key in data}

        if not updates:
            return jsonify({
                "status": "error",
                "message": "No valid fields provided for update."
            }), 400

        for id_field in ["Student_ID", "Room_ID", "Bed_ID"]:
            if id_field in updates:
                val = updates[id_field]
                if isinstance(val, bool) or not isinstance(val, int) or val <= 0:
                    return jsonify({
                        "status": "error",
                        "message": f"{id_field} must be a positive integer."
                    }), 400

        if "Allocation_Date" in updates:
            alloc_date, err = parse_date(updates["Allocation_Date"], "Allocation_Date")
            if err:
                return jsonify({"status": "error", "message": err}), 400
            updates["Allocation_Date"] = alloc_date

        if "Start_Date" in updates:
            start_date, err = parse_date(updates["Start_Date"], "Start_Date")
            if err:
                return jsonify({"status": "error", "message": err}), 400
            updates["Start_Date"] = start_date

        if "End_Date" in updates:
            if updates["End_Date"] is not None:
                end_date, err = parse_date(updates["End_Date"], "End_Date")
                if err:
                    return jsonify({"status": "error", "message": err}), 400
                updates["End_Date"] = end_date
            else:
                updates["End_Date"] = None

        connection = get_db_connection()
        connection.start_transaction()
        cursor = connection.cursor(dictionary=True)

        # Retrieve existing allocation with lock
        cursor.execute("""
            SELECT Allocation_ID, Student_ID, Room_ID, Bed_ID,
                   Allocation_Date, Start_Date, End_Date, Allocation_Status
            FROM room_allocation
            WHERE Allocation_ID = %s
            FOR UPDATE
        """, (allocation_id,))

        existing = cursor.fetchone()
        if not existing:
            connection.rollback()
            return jsonify({
                "status": "error",
                "message": "Room allocation not found."
            }), 404

        # Verify referenced entities if updated
        new_student_id = updates.get("Student_ID", existing["Student_ID"])
        if "Student_ID" in updates:
            cursor.execute("SELECT Student_ID FROM student WHERE Student_ID = %s", (new_student_id,))
            if not cursor.fetchone():
                connection.rollback()
                return jsonify({
                    "status": "error",
                    "message": f"Referenced Student_ID {new_student_id} does not exist."
                }), 409

        new_room_id = updates.get("Room_ID", existing["Room_ID"])
        if "Room_ID" in updates:
            cursor.execute("SELECT Room_ID FROM room WHERE Room_ID = %s", (new_room_id,))
            if not cursor.fetchone():
                connection.rollback()
                return jsonify({
                    "status": "error",
                    "message": f"Referenced Room_ID {new_room_id} does not exist."
                }), 409

        new_bed_id = updates.get("Bed_ID", existing["Bed_ID"])
        # Lock target bed
        cursor.execute("SELECT Bed_ID, Room_ID FROM bed WHERE Bed_ID = %s FOR UPDATE", (new_bed_id,))
        bed_row = cursor.fetchone()
        if not bed_row:
            connection.rollback()
            return jsonify({
                "status": "error",
                "message": f"Referenced Bed_ID {new_bed_id} does not exist."
            }), 409

        if bed_row["Room_ID"] != new_room_id:
            connection.rollback()
            return jsonify({
                "status": "error",
                "message": f"Bed_ID {new_bed_id} does not belong to Room_ID {new_room_id}."
            }), 400

        # Date validation for update
        check_start = updates.get("Start_Date", existing["Start_Date"].strftime("%Y-%m-%d") if existing["Start_Date"] else None)
        check_end = updates.get("End_Date", existing["End_Date"].strftime("%Y-%m-%d") if existing["End_Date"] else None)
        if check_end and check_start and check_end < check_start:
            connection.rollback()
            return jsonify({
                "status": "error",
                "message": "End_Date cannot be earlier than Start_Date."
            }), 400

        check_status = updates.get("Allocation_Status", existing["Allocation_Status"])
        is_active = (check_status is None or str(check_status).strip().lower() not in ("cancelled", "inactive", "terminated"))

        if is_active:
            cursor.execute("""
                SELECT Allocation_ID
                FROM room_allocation
                WHERE Bed_ID = %s
                  AND Allocation_ID != %s
                  AND (Allocation_Status IS NULL OR LOWER(Allocation_Status) NOT IN ('cancelled', 'inactive', 'terminated'))
                  AND (End_Date IS NULL OR End_Date >= %s)
                  AND (%s IS NULL OR Start_Date <= %s)
                FOR UPDATE
            """, (new_bed_id, allocation_id, check_start, check_end, check_end))

            overlapping = cursor.fetchall()
            if overlapping:
                connection.rollback()
                conflict_id = overlapping[0]["Allocation_ID"]
                return jsonify({
                    "status": "error",
                    "message": f"Bed_ID {new_bed_id} is already occupied by active allocation {conflict_id} during overlapping dates."
                }), 409

        set_clause = ", ".join(f"`{k}` = %s" for k in updates)
        values = list(updates.values()) + [allocation_id]

        cursor.execute(f"UPDATE room_allocation SET {set_clause} WHERE Allocation_ID = %s", values)

        # Synchronize Bed_Status for target bed and previous bed
        old_bed_id = existing["Bed_ID"]
        old_status = existing["Allocation_Status"]
        new_status = updates.get("Allocation_Status", old_status)

        if new_status == 'Active':
            cursor.execute("UPDATE bed SET Bed_Status = 'Occupied' WHERE Bed_ID = %s", (new_bed_id,))
        else:
            cursor.execute("SELECT COUNT(*) AS active_count FROM room_allocation WHERE Bed_ID = %s AND Allocation_Status = 'Active'", (new_bed_id,))
            if cursor.fetchone()["active_count"] == 0:
                cursor.execute("UPDATE bed SET Bed_Status = 'Available' WHERE Bed_ID = %s", (new_bed_id,))

        if old_bed_id != new_bed_id:
            cursor.execute("SELECT COUNT(*) AS active_count FROM room_allocation WHERE Bed_ID = %s AND Allocation_Status = 'Active'", (old_bed_id,))
            if cursor.fetchone()["active_count"] == 0:
                cursor.execute("UPDATE bed SET Bed_Status = 'Available' WHERE Bed_ID = %s", (old_bed_id,))

        connection.commit()

        return jsonify({
            "status": "success",
            "message": "Room allocation updated successfully.",
            "Allocation_ID": allocation_id
        }), 200

    except Exception as error:
        if connection and connection.is_connected():
            connection.rollback()
        return handle_db_error(error, "updating room allocation")

    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()


# DELETE: Remove an allocation
@room_allocation_bp.route("/<int:allocation_id>", methods=["DELETE"], strict_slashes=False)
@warden_required
def delete_room_allocation(allocation_id):
    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor()

        cursor.execute("SELECT Allocation_ID, Bed_ID FROM room_allocation WHERE Allocation_ID = %s", (allocation_id,))
        existing_alloc = cursor.fetchone()
        if existing_alloc is None:
            return jsonify({
                "status": "error",
                "message": "Room allocation not found."
            }), 404

        bed_id_to_sync = existing_alloc[1] if isinstance(existing_alloc, (list, tuple)) else existing_alloc["Bed_ID"]

        cursor.execute("DELETE FROM room_allocation WHERE Allocation_ID = %s", (allocation_id,))

        # Synchronize Bed_Status
        cursor.execute("SELECT COUNT(*) FROM room_allocation WHERE Bed_ID = %s AND Allocation_Status = 'Active'", (bed_id_to_sync,))
        active_count_res = cursor.fetchone()
        active_count = active_count_res[0] if isinstance(active_count_res, (list, tuple)) else active_count_res["COUNT(*)"]
        if active_count == 0:
            cursor.execute("UPDATE bed SET Bed_Status = 'Available' WHERE Bed_ID = %s", (bed_id_to_sync,))

        connection.commit()

        return jsonify({
            "status": "success",
            "message": "Room allocation deleted successfully.",
            "Allocation_ID": allocation_id
        }), 200

    except Exception as error:
        if connection and connection.is_connected():
            connection.rollback()
        return handle_db_error(error, "deleting room allocation")

    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()
