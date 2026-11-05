
from flask import Blueprint, jsonify, request
from db import get_db_connection

hostel_block_bp = Blueprint(
    "hostel_block",
    __name__,
    url_prefix="/api/hostel-blocks"
)


# GET: Retrieve all hostel blocks
@hostel_block_bp.route("/", methods=["GET"])
def get_hostel_blocks():
    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute("""
            SELECT Block_ID, Block_Name, Gender, Capacity, Hostel_ID
            FROM hostel_block
            ORDER BY Block_ID
        """)

        blocks = cursor.fetchall()

        return jsonify({
            "status": "success",
            "count": len(blocks),
            "data": blocks
        }), 200

    except Exception as error:
        print("GET HOSTEL BLOCKS ERROR:", repr(error))
        return jsonify({
            "status": "error",
            "message": "Unable to retrieve hostel blocks."
        }), 500

    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()


# POST: Create a hostel block
@hostel_block_bp.route("/", methods=["POST"])
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

        if (isinstance(data["Block_ID"], bool)
                or not isinstance(data["Block_ID"], int)
                or data["Block_ID"] <= 0):
            return jsonify({
                "status": "error",
                "message": "Block_ID must be a positive integer."
            }), 400

        if (isinstance(data["Hostel_ID"], bool)
                or not isinstance(data["Hostel_ID"], int)
                or data["Hostel_ID"] <= 0):
            return jsonify({
                "status": "error",
                "message": "Hostel_ID must be a positive integer."
            }), 400

        if not isinstance(data["Block_Name"], str) or not data["Block_Name"].strip():
            return jsonify({
                "status": "error",
                "message": "Block_Name cannot be empty."
            }), 400

        connection = get_db_connection()
        cursor = connection.cursor()

        cursor.execute("""
            INSERT INTO hostel_block
            (Block_ID, Block_Name, Gender, Capacity, Hostel_ID)
            VALUES (%s, %s, %s, %s, %s)
        """, (
            data["Block_ID"],
            data["Block_Name"].strip(),
            data.get("Gender"),
            data.get("Capacity"),
            data["Hostel_ID"]
        ))

        connection.commit()

        return jsonify({
            "status": "success",
            "message": "Hostel block created successfully.",
            "Block_ID": data["Block_ID"]
        }), 201

    except Exception as error:
        print("CREATE HOSTEL BLOCK ERROR:", repr(error))

        if connection and connection.is_connected():
            connection.rollback()

        return jsonify({
            "status": "error",
            "message": "Unable to create hostel block. Check the server logs."
        }), 500

    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()
