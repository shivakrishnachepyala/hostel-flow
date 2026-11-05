
from flask import Blueprint, jsonify, request
from db import get_db_connection

hostel_bp = Blueprint("hostel", __name__, url_prefix="/api/hostels")


# GET: Retrieve all hostels
@hostel_bp.route("/", methods=["GET"])
def get_hostels():
    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute("""
            SELECT Hostel_ID, Hostel_Name, Location, Capacity, Hostel_Type
            FROM hostel
            ORDER BY Hostel_ID
        """)

        hostels = cursor.fetchall()

        return jsonify({
            "status": "success",
            "count": len(hostels),
            "data": hostels
        }), 200

    except Exception as error:
        print("GET HOSTELS ERROR:", repr(error))
        return jsonify({
            "status": "error",
            "message": "Unable to retrieve hostels."
        }), 500

    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()


# POST: Create a new hostel
@hostel_bp.route("/", methods=["POST"])
def create_hostel():
    connection = None
    cursor = None

    try:
        data = request.get_json(silent=True)

        if not isinstance(data, dict):
            return jsonify({
                "status": "error",
                "message": "A valid JSON object is required."
            }), 400

        required_fields = ["Hostel_ID", "Hostel_Name"]

        for field in required_fields:
            if field not in data or data[field] is None:
                return jsonify({
                    "status": "error",
                    "message": f"{field} is required."
                }), 400

        hostel_id = data["Hostel_ID"]
        hostel_name = data["Hostel_Name"]

        if isinstance(hostel_id, bool) or not isinstance(hostel_id, int) or hostel_id <= 0:
            return jsonify({
                "status": "error",
                "message": "Hostel_ID must be a positive integer."
            }), 400

        if not isinstance(hostel_name, str) or not hostel_name.strip():
            return jsonify({
                "status": "error",
                "message": "Hostel_Name must be a non-empty string."
            }), 400

        connection = get_db_connection()
        cursor = connection.cursor()

        cursor.execute("""
            INSERT INTO hostel
            (Hostel_ID, Hostel_Name, Location, Capacity, Hostel_Type)
            VALUES (%s, %s, %s, %s, %s)
        """, (
            hostel_id,
            hostel_name.strip(),
            data.get("Location"),
            data.get("Capacity", 0),
            data.get("Hostel_Type")
        ))

        connection.commit()

        return jsonify({
            "status": "success",
            "message": "Hostel created successfully.",
            "Hostel_ID": hostel_id
        }), 201

    except Exception as error:
        print("CREATE HOSTEL ERROR:", repr(error))

        if connection and connection.is_connected():
            connection.rollback()

        return jsonify({
            "status": "error",
            "message": "Unable to create hostel. Check the server logs."
        }), 500

    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()

# PUT: Update an existing hostel
@hostel_bp.route("/<int:hostel_id>", methods=["PUT"])
def update_hostel(hostel_id):
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
            "Hostel_Name",
            "Location",
            "Capacity",
            "Hostel_Type"
        ]

        updates = {
            key: data[key]
            for key in allowed_fields
            if key in data
        }

        if not updates:
            return jsonify({
                "status": "error",
                "message": "No valid fields provided for update."
            }), 400

        if "Hostel_Name" in updates:
            if not isinstance(updates["Hostel_Name"], str) or not updates["Hostel_Name"].strip():
                return jsonify({
                    "status": "error",
                    "message": "Hostel_Name cannot be empty."
                }), 400

            updates["Hostel_Name"] = updates["Hostel_Name"].strip()

        if "Capacity" in updates:
            capacity = updates["Capacity"]

            if isinstance(capacity, bool) or not isinstance(capacity, int) or capacity < 0:
                return jsonify({
                    "status": "error",
                    "message": "Capacity must be a non-negative integer."
                }), 400

        connection = get_db_connection()
        cursor = connection.cursor()

        cursor.execute(
            "SELECT Hostel_ID FROM hostel WHERE Hostel_ID = %s",
            (hostel_id,)
        )

        if cursor.fetchone() is None:
            return jsonify({
                "status": "error",
                "message": "Hostel not found."
            }), 404

        set_clause = ", ".join(
            f"`{column}` = %s" for column in updates
        )

        values = list(updates.values()) + [hostel_id]

        cursor.execute(
            f"UPDATE hostel SET {set_clause} WHERE Hostel_ID = %s",
            values
        )

        connection.commit()

        return jsonify({
            "status": "success",
            "message": "Hostel updated successfully.",
            "Hostel_ID": hostel_id
        }), 200

    except Exception as error:
        print("UPDATE HOSTEL ERROR:", repr(error))

        if connection and connection.is_connected():
            connection.rollback()

        return jsonify({
            "status": "error",
            "message": "Unable to update hostel."
        }), 500

    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()

# DELETE: Remove a hostel
@hostel_bp.route("/<int:hostel_id>", methods=["DELETE"])
def delete_hostel(hostel_id):
    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor()

        cursor.execute(
            "SELECT Hostel_ID FROM hostel WHERE Hostel_ID = %s",
            (hostel_id,)
        )

        if cursor.fetchone() is None:
            return jsonify({
                "status": "error",
                "message": "Hostel not found."
            }), 404

        cursor.execute(
            "DELETE FROM hostel WHERE Hostel_ID = %s",
            (hostel_id,)
        )

        connection.commit()

        return jsonify({
            "status": "success",
            "message": "Hostel deleted successfully.",
            "Hostel_ID": hostel_id
        }), 200

    except Exception as error:
        print("DELETE HOSTEL ERROR:", repr(error))

        if connection and connection.is_connected():
            connection.rollback()

        return jsonify({
            "status": "error",
            "message": "Unable to delete hostel."
        }), 500

    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()
