from flask import Blueprint, jsonify, request
from db import get_db_connection
from routes.route_utils import format_row, handle_db_error
from services.auth_service import warden_required

room_bp = Blueprint("room", __name__, url_prefix="/api/rooms")


# GET: Retrieve all rooms or filter by block_id
@room_bp.route("/", methods=["GET"], strict_slashes=False)
@room_bp.route("", methods=["GET"], strict_slashes=False)
def get_rooms():
    connection = None
    cursor = None

    try:
        block_id = request.args.get("block_id", type=int)

        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        query = """
            SELECT r.Room_ID, r.Room_Number, r.Floor, r.Room_Type, r.Capacity, r.Facilities, r.Layout_Data, r.Block_ID,
                   b.Block_Name, b.Gender AS Block_Gender,
                   h.Hostel_ID, h.Hostel_Name,
                   (SELECT COUNT(*) FROM room_allocation WHERE Room_ID = r.Room_ID AND Allocation_Status = 'Active') AS Occupied_Beds,
                   (SELECT COUNT(*) FROM bed WHERE Room_ID = r.Room_ID) AS Total_Beds
            FROM room r
            LEFT JOIN hostel_block b ON r.Block_ID = b.Block_ID
            LEFT JOIN hostel h ON b.Hostel_ID = h.Hostel_ID
        """
        params = []
        if block_id is not None:
            query += " WHERE r.Block_ID = %s"
            params.append(block_id)
        query += " ORDER BY r.Room_ID"

        cursor.execute(query, tuple(params))

        rooms = [format_row(row) for row in cursor.fetchall()]

        return jsonify({
            "status": "success",
            "count": len(rooms),
            "data": rooms
        }), 200

    except Exception as error:
        return handle_db_error(error, "retrieving rooms")

    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()


# GET: Retrieve single room by ID
@room_bp.route("/<int:room_id>", methods=["GET"], strict_slashes=False)
def get_room(room_id):
    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute("""
            SELECT Room_ID, Room_Number, Floor, Room_Type, Capacity, Facilities, Layout_Data, Block_ID
            FROM room
            WHERE Room_ID = %s
        """, (room_id,))

        room = cursor.fetchone()

        if not room:
            return jsonify({
                "status": "error",
                "message": "Room not found."
            }), 404

        return jsonify({
            "status": "success",
            "data": format_row(room)
        }), 200

    except Exception as error:
        return handle_db_error(error, "retrieving room")

    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()


# POST: Create a new room
@room_bp.route("/", methods=["POST"], strict_slashes=False)
@room_bp.route("", methods=["POST"], strict_slashes=False)
@warden_required
def create_room():
    connection = None
    cursor = None

    try:
        data = request.get_json(silent=True)

        if not isinstance(data, dict):
            return jsonify({
                "status": "error",
                "message": "A valid JSON object is required."
            }), 400

        required_fields = ["Room_ID", "Room_Number", "Block_ID"]
        for field in required_fields:
            if field not in data or data[field] is None:
                return jsonify({
                    "status": "error",
                    "message": f"{field} is required."
                }), 400

        room_id = data["Room_ID"]
        room_number = data["Room_Number"]
        block_id = data["Block_ID"]

        if isinstance(room_id, bool) or not isinstance(room_id, int) or room_id <= 0:
            return jsonify({
                "status": "error",
                "message": "Room_ID must be a positive integer."
            }), 400

        if not isinstance(room_number, str) or not room_number.strip():
            return jsonify({
                "status": "error",
                "message": "Room_Number must be a non-empty string."
            }), 400

        if isinstance(block_id, bool) or not isinstance(block_id, int) or block_id <= 0:
            return jsonify({
                "status": "error",
                "message": "Block_ID must be a positive integer."
            }), 400

        floor = data.get("Floor")
        if floor is not None and (isinstance(floor, bool) or not isinstance(floor, int)):
            return jsonify({
                "status": "error",
                "message": "Floor must be an integer."
            }), 400

        capacity = data.get("Capacity")
        if capacity is not None and (isinstance(capacity, bool) or not isinstance(capacity, int) or capacity < 0):
            return jsonify({
                "status": "error",
                "message": "Capacity must be a non-negative integer."
            }), 400

        connection = get_db_connection()
        cursor = connection.cursor()

        # Check primary key existence
        cursor.execute("SELECT Room_ID FROM room WHERE Room_ID = %s", (room_id,))
        if cursor.fetchone():
            return jsonify({
                "status": "error",
                "message": f"Room with Room_ID {room_id} already exists."
            }), 409

        # Check foreign key existence
        cursor.execute("SELECT Block_ID FROM hostel_block WHERE Block_ID = %s", (block_id,))
        if not cursor.fetchone():
            return jsonify({
                "status": "error",
                "message": f"Referenced Block_ID {block_id} does not exist."
            }), 409

        cursor.execute("""
            INSERT INTO room
            (Room_ID, Room_Number, Floor, Room_Type, Capacity, Facilities, Layout_Data, Block_ID)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            room_id,
            room_number.strip(),
            floor,
            data.get("Room_Type"),
            capacity,
            data.get("Facilities"),
            data.get("Layout_Data"),
            block_id
        ))

        connection.commit()

        return jsonify({
            "status": "success",
            "message": "Room created successfully.",
            "Room_ID": room_id
        }), 201

    except Exception as error:
        if connection and connection.is_connected():
            connection.rollback()
        return handle_db_error(error, "creating room")

    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()


# PUT: Update an existing room
@room_bp.route("/<int:room_id>", methods=["PUT"], strict_slashes=False)
@warden_required
def update_room(room_id):
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
            "Room_Number",
            "Floor",
            "Room_Type",
            "Capacity",
            "Facilities",
            "Layout_Data",
            "Block_ID"
        ]

        updates = {key: data[key] for key in allowed_fields if key in data}

        if not updates:
            return jsonify({
                "status": "error",
                "message": "No valid fields provided for update."
            }), 400

        if "Room_Number" in updates:
            val = updates["Room_Number"]
            if not isinstance(val, str) or not val.strip():
                return jsonify({
                    "status": "error",
                    "message": "Room_Number must be a non-empty string."
                }), 400
            updates["Room_Number"] = val.strip()

        if "Floor" in updates and updates["Floor"] is not None:
            if isinstance(updates["Floor"], bool) or not isinstance(updates["Floor"], int):
                return jsonify({
                    "status": "error",
                    "message": "Floor must be an integer."
                }), 400

        if "Capacity" in updates and updates["Capacity"] is not None:
            if isinstance(updates["Capacity"], bool) or not isinstance(updates["Capacity"], int) or updates["Capacity"] < 0:
                return jsonify({
                    "status": "error",
                    "message": "Capacity must be a non-negative integer."
                }), 400

        if "Block_ID" in updates:
            b_id = updates["Block_ID"]
            if isinstance(b_id, bool) or not isinstance(b_id, int) or b_id <= 0:
                return jsonify({
                    "status": "error",
                    "message": "Block_ID must be a positive integer."
                }), 400

        connection = get_db_connection()
        cursor = connection.cursor()

        cursor.execute("SELECT Room_ID FROM room WHERE Room_ID = %s", (room_id,))
        if cursor.fetchone() is None:
            return jsonify({
                "status": "error",
                "message": "Room not found."
            }), 404

        if "Block_ID" in updates:
            cursor.execute("SELECT Block_ID FROM hostel_block WHERE Block_ID = %s", (updates["Block_ID"],))
            if cursor.fetchone() is None:
                return jsonify({
                    "status": "error",
                    "message": f"Referenced Block_ID {updates['Block_ID']} does not exist."
                }), 409

        set_clause = ", ".join(f"`{k}` = %s" for k in updates)
        values = list(updates.values()) + [room_id]

        cursor.execute(f"UPDATE room SET {set_clause} WHERE Room_ID = %s", values)
        connection.commit()

        return jsonify({
            "status": "success",
            "message": "Room updated successfully.",
            "Room_ID": room_id
        }), 200

    except Exception as error:
        if connection and connection.is_connected():
            connection.rollback()
        return handle_db_error(error, "updating room")

    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()


# DELETE: Remove a room
@room_bp.route("/<int:room_id>", methods=["DELETE"], strict_slashes=False)
@warden_required
def delete_room(room_id):
    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor()

        cursor.execute("SELECT Room_ID FROM room WHERE Room_ID = %s", (room_id,))
        if cursor.fetchone() is None:
            return jsonify({
                "status": "error",
                "message": "Room not found."
            }), 404

        cursor.execute("DELETE FROM room WHERE Room_ID = %s", (room_id,))
        connection.commit()

        return jsonify({
            "status": "success",
            "message": "Room deleted successfully.",
            "Room_ID": room_id
        }), 200

    except Exception as error:
        if connection and connection.is_connected():
            connection.rollback()
        return handle_db_error(error, "deleting room")

    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()
