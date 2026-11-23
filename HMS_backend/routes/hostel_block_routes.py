from flask import Blueprint, jsonify, request
from db import get_db_connection
from routes.route_utils import format_row, handle_db_error
from services.auth_service import warden_required

hostel_block_bp = Blueprint(
    "hostel_block",
    __name__,
    url_prefix="/api/hostel-blocks"
)


# GET: Retrieve all hostel blocks or filter by hostel_id
@hostel_block_bp.route("/", methods=["GET"], strict_slashes=False)
@hostel_block_bp.route("", methods=["GET"], strict_slashes=False)
def get_hostel_blocks():
    connection = None
    cursor = None

    try:
        hostel_id = request.args.get("hostel_id", type=int)

        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        query = """
            SELECT b.Block_ID, b.Block_Name, b.Gender, b.Capacity, b.Hostel_ID,
                   h.Hostel_Name, h.Hostel_Type,
                   (SELECT COUNT(*) FROM room WHERE Block_ID = b.Block_ID) AS Total_Rooms
            FROM hostel_block b
            LEFT JOIN hostel h ON b.Hostel_ID = h.Hostel_ID
        """
        params = []
        if hostel_id is not None:
            query += " WHERE b.Hostel_ID = %s"
            params.append(hostel_id)
        query += " ORDER BY b.Block_ID"

        cursor.execute(query, tuple(params))

        blocks = [format_row(row) for row in cursor.fetchall()]

        return jsonify({
            "status": "success",
            "count": len(blocks),
            "data": blocks
        }), 200

    except Exception as error:
        return handle_db_error(error, "retrieving hostel blocks")

    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()


# GET: Retrieve single hostel block by ID
@hostel_block_bp.route("/<int:block_id>", methods=["GET"], strict_slashes=False)
def get_hostel_block(block_id):
    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute("""
            SELECT Block_ID, Block_Name, Gender, Capacity, Hostel_ID
            FROM hostel_block
            WHERE Block_ID = %s
        """, (block_id,))

        block = cursor.fetchone()

        if not block:
            return jsonify({
                "status": "error",
                "message": "Hostel block not found."
            }), 404

        return jsonify({
            "status": "success",
            "data": format_row(block)
        }), 200

    except Exception as error:
        return handle_db_error(error, "retrieving hostel block")

    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()


# POST: Create a hostel block
@hostel_block_bp.route("/", methods=["POST"], strict_slashes=False)
@hostel_block_bp.route("", methods=["POST"], strict_slashes=False)
@warden_required
def create_hostel_block():
    connection = None
    cursor = None

    try:
        data = request.get_json(silent=True)

        if not isinstance(data, dict):
            return jsonify({
                "status": "error",
                "message": "A valid JSON object is required."
            }), 400

        required_fields = ["Block_ID", "Block_Name", "Hostel_ID"]

        for field in required_fields:
            if field not in data or data[field] is None:
                return jsonify({
                    "status": "error",
                    "message": f"{field} is required."
                }), 400

        block_id = data["Block_ID"]
        block_name = data["Block_Name"]
        hostel_id = data["Hostel_ID"]

        if isinstance(block_id, bool) or not isinstance(block_id, int) or block_id <= 0:
            return jsonify({
                "status": "error",
                "message": "Block_ID must be a positive integer."
            }), 400

        if isinstance(hostel_id, bool) or not isinstance(hostel_id, int) or hostel_id <= 0:
            return jsonify({
                "status": "error",
                "message": "Hostel_ID must be a positive integer."
            }), 400

        if not isinstance(block_name, str) or not block_name.strip():
            return jsonify({
                "status": "error",
                "message": "Block_Name cannot be empty."
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
        cursor.execute("SELECT Block_ID FROM hostel_block WHERE Block_ID = %s", (block_id,))
        if cursor.fetchone():
            return jsonify({
                "status": "error",
                "message": f"Hostel block with Block_ID {block_id} already exists."
            }), 409

        # Check foreign key existence
        cursor.execute("SELECT Hostel_ID FROM hostel WHERE Hostel_ID = %s", (hostel_id,))
        if not cursor.fetchone():
            return jsonify({
                "status": "error",
                "message": f"Referenced Hostel_ID {hostel_id} does not exist."
            }), 409

        cursor.execute("""
            INSERT INTO hostel_block
            (Block_ID, Block_Name, Gender, Capacity, Hostel_ID)
            VALUES (%s, %s, %s, %s, %s)
        """, (
            block_id,
            block_name.strip(),
            data.get("Gender"),
            capacity,
            hostel_id
        ))

        connection.commit()

        return jsonify({
            "status": "success",
            "message": "Hostel block created successfully.",
            "Block_ID": block_id
        }), 201

    except Exception as error:
        if connection and connection.is_connected():
            connection.rollback()
        return handle_db_error(error, "creating hostel block")

    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()


# PUT: Update an existing hostel block
@hostel_block_bp.route("/<int:block_id>", methods=["PUT"], strict_slashes=False)
@warden_required
def update_hostel_block(block_id):
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
            "Block_Name",
            "Gender",
            "Capacity",
            "Hostel_ID"
        ]

        updates = {key: data[key] for key in allowed_fields if key in data}

        if not updates:
            return jsonify({
                "status": "error",
                "message": "No valid fields provided for update."
            }), 400

        if "Block_Name" in updates:
            val = updates["Block_Name"]
            if not isinstance(val, str) or not val.strip():
                return jsonify({
                    "status": "error",
                    "message": "Block_Name cannot be empty."
                }), 400
            updates["Block_Name"] = val.strip()

        if "Capacity" in updates and updates["Capacity"] is not None:
            capacity = updates["Capacity"]
            if isinstance(capacity, bool) or not isinstance(capacity, int) or capacity < 0:
                return jsonify({
                    "status": "error",
                    "message": "Capacity must be a non-negative integer."
                }), 400

        if "Hostel_ID" in updates:
            h_id = updates["Hostel_ID"]
            if isinstance(h_id, bool) or not isinstance(h_id, int) or h_id <= 0:
                return jsonify({
                    "status": "error",
                    "message": "Hostel_ID must be a positive integer."
                }), 400

        connection = get_db_connection()
        cursor = connection.cursor()

        # Check block existence
        cursor.execute("SELECT Block_ID FROM hostel_block WHERE Block_ID = %s", (block_id,))
        if cursor.fetchone() is None:
            return jsonify({
                "status": "error",
                "message": "Hostel block not found."
            }), 404

        # If updating Hostel_ID, verify referenced hostel exists
        if "Hostel_ID" in updates:
            cursor.execute("SELECT Hostel_ID FROM hostel WHERE Hostel_ID = %s", (updates["Hostel_ID"],))
            if cursor.fetchone() is None:
                return jsonify({
                    "status": "error",
                    "message": f"Referenced Hostel_ID {updates['Hostel_ID']} does not exist."
                }), 409

        set_clause = ", ".join(f"`{k}` = %s" for k in updates)
        values = list(updates.values()) + [block_id]

        cursor.execute(f"UPDATE hostel_block SET {set_clause} WHERE Block_ID = %s", values)
        connection.commit()

        return jsonify({
            "status": "success",
            "message": "Hostel block updated successfully.",
            "Block_ID": block_id
        }), 200

    except Exception as error:
        if connection and connection.is_connected():
            connection.rollback()
        return handle_db_error(error, "updating hostel block")

    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()


# DELETE: Remove a hostel block
@hostel_block_bp.route("/<int:block_id>", methods=["DELETE"], strict_slashes=False)
@warden_required
def delete_hostel_block(block_id):
    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor()

        cursor.execute("SELECT Block_ID FROM hostel_block WHERE Block_ID = %s", (block_id,))
        if cursor.fetchone() is None:
            return jsonify({
                "status": "error",
                "message": "Hostel block not found."
            }), 404

        cursor.execute("DELETE FROM hostel_block WHERE Block_ID = %s", (block_id,))
        connection.commit()

        return jsonify({
            "status": "success",
            "message": "Hostel block deleted successfully.",
            "Block_ID": block_id
        }), 200

    except Exception as error:
        if connection and connection.is_connected():
            connection.rollback()
        return handle_db_error(error, "deleting hostel block")

    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()
