from flask import Blueprint, jsonify, request
from db import get_db_connection
from routes.route_utils import format_row, handle_db_error
from services.auth_service import warden_required

bed_bp = Blueprint("bed", __name__, url_prefix="/api/beds")


# GET: Retrieve all beds or filter by room_id / status
@bed_bp.route("/", methods=["GET"], strict_slashes=False)
@bed_bp.route("", methods=["GET"], strict_slashes=False)
def get_beds():
    connection = None
    cursor = None

    try:
        room_id = request.args.get("room_id", type=int)
        status = request.args.get("status")

        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        query = """
            SELECT b.Bed_ID, b.Bed_Number, b.Bed_Type, b.Bed_Status, b.Room_ID,
                   r.Room_Number, r.Floor, r.Room_Type,
                   hb.Block_Name,
                   h.Hostel_Name,
                   s.Student_ID AS Occupant_Student_ID,
                   s.Name AS Occupant_Name
            FROM bed b
            LEFT JOIN room r ON b.Room_ID = r.Room_ID
            LEFT JOIN hostel_block hb ON r.Block_ID = hb.Block_ID
            LEFT JOIN hostel h ON hb.Hostel_ID = h.Hostel_ID
            LEFT JOIN room_allocation ra ON (b.Bed_ID = ra.Bed_ID AND ra.Allocation_Status = 'Active')
            LEFT JOIN student s ON ra.Student_ID = s.Student_ID
        """
        conditions = []
        params = []

        if room_id is not None:
            conditions.append("b.Room_ID = %s")
            params.append(room_id)

        if status:
            conditions.append("b.Bed_Status = %s")
            params.append(status.strip())

        if conditions:
            query += " WHERE " + " AND ".join(conditions)

        query += " ORDER BY b.Bed_ID"

        cursor.execute(query, tuple(params))
        beds = [format_row(row) for row in cursor.fetchall()]

        return jsonify({
            "status": "success",
            "count": len(beds),
            "data": beds
        }), 200

    except Exception as error:
        return handle_db_error(error, "retrieving beds")

    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()


# GET: Retrieve single bed by ID
@bed_bp.route("/<int:bed_id>", methods=["GET"], strict_slashes=False)
def get_bed(bed_id):
    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute("""
            SELECT Bed_ID, Bed_Number, Bed_Type, Bed_Status, Room_ID
            FROM bed
            WHERE Bed_ID = %s
        """, (bed_id,))

        bed = cursor.fetchone()

        if not bed:
            return jsonify({
                "status": "error",
                "message": "Bed not found."
            }), 404

        return jsonify({
            "status": "success",
            "data": format_row(bed)
        }), 200

    except Exception as error:
        return handle_db_error(error, "retrieving bed")

    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()


# POST: Create a new bed
@bed_bp.route("/", methods=["POST"], strict_slashes=False)
@bed_bp.route("", methods=["POST"], strict_slashes=False)
@warden_required
def create_bed():
    connection = None
    cursor = None

    try:
        data = request.get_json(silent=True)

        if not isinstance(data, dict):
            return jsonify({
                "status": "error",
                "message": "A valid JSON object is required."
            }), 400

        required_fields = ["Bed_ID", "Bed_Number", "Room_ID"]
        for field in required_fields:
            if field not in data or data[field] is None:
                return jsonify({
                    "status": "error",
                    "message": f"{field} is required."
                }), 400

        bed_id = data["Bed_ID"]
        bed_number = data["Bed_Number"]
        room_id = data["Room_ID"]

        if isinstance(bed_id, bool) or not isinstance(bed_id, int) or bed_id <= 0:
            return jsonify({
                "status": "error",
                "message": "Bed_ID must be a positive integer."
            }), 400

        if not isinstance(bed_number, str) or not bed_number.strip():
            return jsonify({
                "status": "error",
                "message": "Bed_Number must be a non-empty string."
            }), 400

        if isinstance(room_id, bool) or not isinstance(room_id, int) or room_id <= 0:
            return jsonify({
                "status": "error",
                "message": "Room_ID must be a positive integer."
            }), 400

        connection = get_db_connection()
        cursor = connection.cursor()

        # Check primary key existence
        cursor.execute("SELECT Bed_ID FROM bed WHERE Bed_ID = %s", (bed_id,))
        if cursor.fetchone():
            return jsonify({
                "status": "error",
                "message": f"Bed with Bed_ID {bed_id} already exists."
            }), 409

        # Check foreign key existence
        cursor.execute("SELECT Room_ID FROM room WHERE Room_ID = %s", (room_id,))
        if not cursor.fetchone():
            return jsonify({
                "status": "error",
                "message": f"Referenced Room_ID {room_id} does not exist."
            }), 409

        cursor.execute("""
            INSERT INTO bed
            (Bed_ID, Bed_Number, Bed_Type, Bed_Status, Room_ID)
            VALUES (%s, %s, %s, %s, %s)
        """, (
            bed_id,
            bed_number.strip(),
            data.get("Bed_Type"),
            data.get("Bed_Status", "Available"),
            room_id
        ))

        connection.commit()

        return jsonify({
            "status": "success",
            "message": "Bed created successfully.",
            "Bed_ID": bed_id
        }), 201

    except Exception as error:
        if connection and connection.is_connected():
            connection.rollback()
        return handle_db_error(error, "creating bed")

    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()


# PUT: Update an existing bed
@bed_bp.route("/<int:bed_id>", methods=["PUT"], strict_slashes=False)
@warden_required
def update_bed(bed_id):
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
            "Bed_Number",
            "Bed_Type",
            "Bed_Status",
            "Room_ID"
        ]

        updates = {key: data[key] for key in allowed_fields if key in data}

        if not updates:
            return jsonify({
                "status": "error",
                "message": "No valid fields provided for update."
            }), 400

        if "Bed_Number" in updates:
            val = updates["Bed_Number"]
            if not isinstance(val, str) or not val.strip():
                return jsonify({
                    "status": "error",
                    "message": "Bed_Number must be a non-empty string."
                }), 400
            updates["Bed_Number"] = val.strip()

        if "Room_ID" in updates:
            r_id = updates["Room_ID"]
            if isinstance(r_id, bool) or not isinstance(r_id, int) or r_id <= 0:
                return jsonify({
                    "status": "error",
                    "message": "Room_ID must be a positive integer."
                }), 400

        connection = get_db_connection()
        cursor = connection.cursor()

        cursor.execute("SELECT Bed_ID FROM bed WHERE Bed_ID = %s", (bed_id,))
        if cursor.fetchone() is None:
            return jsonify({
                "status": "error",
                "message": "Bed not found."
            }), 404

        if "Room_ID" in updates:
            cursor.execute("SELECT Room_ID FROM room WHERE Room_ID = %s", (updates["Room_ID"],))
            if cursor.fetchone() is None:
                return jsonify({
                    "status": "error",
                    "message": f"Referenced Room_ID {updates['Room_ID']} does not exist."
                }), 409

        set_clause = ", ".join(f"`{k}` = %s" for k in updates)
        values = list(updates.values()) + [bed_id]

        cursor.execute(f"UPDATE bed SET {set_clause} WHERE Bed_ID = %s", values)
        connection.commit()

        return jsonify({
            "status": "success",
            "message": "Bed updated successfully.",
            "Bed_ID": bed_id
        }), 200

    except Exception as error:
        if connection and connection.is_connected():
            connection.rollback()
        return handle_db_error(error, "updating bed")

    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()


# DELETE: Remove a bed
@bed_bp.route("/<int:bed_id>", methods=["DELETE"], strict_slashes=False)
@warden_required
def delete_bed(bed_id):
    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor()

        cursor.execute("SELECT Bed_ID FROM bed WHERE Bed_ID = %s", (bed_id,))
        if cursor.fetchone() is None:
            return jsonify({
                "status": "error",
                "message": "Bed not found."
            }), 404

        cursor.execute("DELETE FROM bed WHERE Bed_ID = %s", (bed_id,))
        connection.commit()

        return jsonify({
            "status": "success",
            "message": "Bed deleted successfully.",
            "Bed_ID": bed_id
        }), 200

    except Exception as error:
        if connection and connection.is_connected():
            connection.rollback()
        return handle_db_error(error, "deleting bed")

    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()
