from flask import Blueprint, jsonify, request
from db import get_db_connection
from routes.route_utils import format_row, handle_db_error
from services.auth_service import warden_required

student_preferences_bp = Blueprint(
    "student_preferences",
    __name__,
    url_prefix="/api/student-preferences"
)


# GET: Retrieve all student preferences or filter by student_id
@student_preferences_bp.route("/", methods=["GET"], strict_slashes=False)
@student_preferences_bp.route("", methods=["GET"], strict_slashes=False)
@warden_required
def get_student_preferences():
    connection = None
    cursor = None

    try:
        student_id = request.args.get("student_id", type=int)

        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        query = """
            SELECT p.Preference_ID, p.Student_ID, p.Language, p.Food_Preference, p.Sleep_Schedule, p.Study_Habits,
                   s.Name AS Student_Name, s.Department AS Student_Dept, s.Gender AS Student_Gender
            FROM student_preferences p
            LEFT JOIN student s ON p.Student_ID = s.Student_ID
        """
        params = []
        if student_id is not None:
            query += " WHERE p.Student_ID = %s"
            params.append(student_id)
        query += " ORDER BY p.Preference_ID"

        cursor.execute(query, tuple(params))

        preferences = [format_row(row) for row in cursor.fetchall()]

        return jsonify({
            "status": "success",
            "count": len(preferences),
            "data": preferences
        }), 200

    except Exception as error:
        return handle_db_error(error, "retrieving student preferences")

    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()


# GET: Retrieve single preference by Preference_ID
@student_preferences_bp.route("/<int:preference_id>", methods=["GET"], strict_slashes=False)
@warden_required
def get_student_preference(preference_id):
    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute("""
            SELECT Preference_ID, Student_ID, Language, Food_Preference, Sleep_Schedule, Study_Habits
            FROM student_preferences
            WHERE Preference_ID = %s
        """, (preference_id,))

        preference = cursor.fetchone()

        if not preference:
            return jsonify({
                "status": "error",
                "message": "Student preference record not found."
            }), 404

        return jsonify({
            "status": "success",
            "data": format_row(preference)
        }), 200

    except Exception as error:
        return handle_db_error(error, "retrieving student preference")

    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()


# POST: Create a new student preference record
@student_preferences_bp.route("/", methods=["POST"], strict_slashes=False)
@student_preferences_bp.route("", methods=["POST"], strict_slashes=False)
@warden_required
def create_student_preference():
    connection = None
    cursor = None

    try:
        data = request.get_json(silent=True)

        if not isinstance(data, dict):
            return jsonify({
                "status": "error",
                "message": "A valid JSON object is required."
            }), 400

        required_fields = ["Student_ID"]
        for field in required_fields:
            if field not in data or data[field] is None:
                return jsonify({
                    "status": "error",
                    "message": f"{field} is required."
                }), 400

        pref_id = data.get("Preference_ID")
        student_id = data["Student_ID"]

        if pref_id is not None:
            if isinstance(pref_id, bool) or not isinstance(pref_id, int) or pref_id <= 0:
                return jsonify({
                    "status": "error",
                    "message": "Preference_ID must be a positive integer."
                }), 400

        if isinstance(student_id, bool) or not isinstance(student_id, int) or student_id <= 0:
            return jsonify({
                "status": "error",
                "message": "Student_ID must be a positive integer."
            }), 400

        connection = get_db_connection()
        cursor = connection.cursor()

        # Check primary key or generate next
        if pref_id is None:
            cursor.execute("SELECT COALESCE(MAX(Preference_ID), 0) + 1 FROM student_preferences")
            pref_id = cursor.fetchone()[0]
        else:
            cursor.execute("SELECT Preference_ID FROM student_preferences WHERE Preference_ID = %s", (pref_id,))
            if cursor.fetchone():
                return jsonify({
                    "status": "error",
                    "message": f"Preference record with Preference_ID {pref_id} already exists."
                }), 409

        # Check if student exists
        cursor.execute("SELECT Student_ID FROM student WHERE Student_ID = %s", (student_id,))
        if not cursor.fetchone():
            return jsonify({
                "status": "error",
                "message": f"Referenced Student_ID {student_id} does not exist."
            }), 409

        # Enforce business rule: only one preference record per student
        cursor.execute("SELECT Preference_ID FROM student_preferences WHERE Student_ID = %s", (student_id,))
        if cursor.fetchone():
            return jsonify({
                "status": "error",
                "message": f"A preference record already exists for Student_ID {student_id}."
            }), 409

        cursor.execute("""
            INSERT INTO student_preferences
            (Preference_ID, Student_ID, Language, Food_Preference, Sleep_Schedule, Study_Habits)
            VALUES (%s, %s, %s, %s, %s, %s)
        """, (
            pref_id,
            student_id,
            data.get("Language"),
            data.get("Food_Preference"),
            data.get("Sleep_Schedule"),
            data.get("Study_Habits")
        ))

        connection.commit()

        return jsonify({
            "status": "success",
            "message": "Student preference record created successfully.",
            "data": {"Preference_ID": pref_id},
            "Preference_ID": pref_id
        }), 201

    except Exception as error:
        if connection and connection.is_connected():
            connection.rollback()
        return handle_db_error(error, "creating student preference")

    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()


# PUT: Update an existing student preference record
@student_preferences_bp.route("/<int:preference_id>", methods=["PUT"], strict_slashes=False)
@warden_required
def update_student_preference(preference_id):
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
            "Language",
            "Food_Preference",
            "Sleep_Schedule",
            "Study_Habits"
        ]

        updates = {key: data[key] for key in allowed_fields if key in data}

        if not updates:
            return jsonify({
                "status": "error",
                "message": "No valid fields provided for update."
            }), 400

        if "Student_ID" in updates:
            s_id = updates["Student_ID"]
            if isinstance(s_id, bool) or not isinstance(s_id, int) or s_id <= 0:
                return jsonify({
                    "status": "error",
                    "message": "Student_ID must be a positive integer."
                }), 400

        connection = get_db_connection()
        cursor = connection.cursor()

        cursor.execute("SELECT Preference_ID FROM student_preferences WHERE Preference_ID = %s", (preference_id,))
        if cursor.fetchone() is None:
            return jsonify({
                "status": "error",
                "message": "Student preference record not found."
            }), 404

        if "Student_ID" in updates:
            new_student_id = updates["Student_ID"]
            cursor.execute("SELECT Student_ID FROM student WHERE Student_ID = %s", (new_student_id,))
            if cursor.fetchone() is None:
                return jsonify({
                    "status": "error",
                    "message": f"Referenced Student_ID {new_student_id} does not exist."
                }), 409

            cursor.execute(
                "SELECT Preference_ID FROM student_preferences WHERE Student_ID = %s AND Preference_ID != %s",
                (new_student_id, preference_id)
            )
            if cursor.fetchone():
                return jsonify({
                    "status": "error",
                    "message": f"A preference record already exists for Student_ID {new_student_id}."
                }), 409

        set_clause = ", ".join(f"`{k}` = %s" for k in updates)
        values = list(updates.values()) + [preference_id]

        cursor.execute(f"UPDATE student_preferences SET {set_clause} WHERE Preference_ID = %s", values)
        connection.commit()

        return jsonify({
            "status": "success",
            "message": "Student preference record updated successfully.",
            "Preference_ID": preference_id
        }), 200

    except Exception as error:
        if connection and connection.is_connected():
            connection.rollback()
        return handle_db_error(error, "updating student preference")

    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()


# DELETE: Remove a student preference record
@student_preferences_bp.route("/<int:preference_id>", methods=["DELETE"], strict_slashes=False)
@warden_required
def delete_student_preference(preference_id):
    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor()

        cursor.execute("SELECT Preference_ID FROM student_preferences WHERE Preference_ID = %s", (preference_id,))
        if cursor.fetchone() is None:
            return jsonify({
                "status": "error",
                "message": "Student preference record not found."
            }), 404

        cursor.execute("DELETE FROM student_preferences WHERE Preference_ID = %s", (preference_id,))
        connection.commit()

        return jsonify({
            "status": "success",
            "message": "Student preference record deleted successfully.",
            "Preference_ID": preference_id
        }), 200

    except Exception as error:
        if connection and connection.is_connected():
            connection.rollback()
        return handle_db_error(error, "deleting student preference")

    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()
