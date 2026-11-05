from flask import Blueprint, jsonify, request
from db import get_db_connection
from routes.route_utils import format_row, handle_db_error, parse_date

roommate_match_bp = Blueprint(
    "roommate_match",
    __name__,
    url_prefix="/api/roommate-matches"
)


# GET: Retrieve all roommate matches with optional student filter
@roommate_match_bp.route("/", methods=["GET"], strict_slashes=False)
@roommate_match_bp.route("", methods=["GET"], strict_slashes=False)
def get_roommate_matches():
    connection = None
    cursor = None

    try:
        student_id = request.args.get("student_id", type=int)
        status = request.args.get("status")

        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        query = """
            SELECT Match_ID, Student_ID_1, Student_ID_2,
                   Compatibility_Score, Match_Date, Match_Status
            FROM roommate_match
        """
        conditions = []
        params = []

        if student_id is not None:
            conditions.append("(Student_ID_1 = %s OR Student_ID_2 = %s)")
            params.extend([student_id, student_id])

        if status:
            conditions.append("Match_Status = %s")
            params.append(status.strip())

        if conditions:
            query += " WHERE " + " AND ".join(conditions)

        query += " ORDER BY Match_ID"

        cursor.execute(query, tuple(params))
        matches = [format_row(row) for row in cursor.fetchall()]

        return jsonify({
            "status": "success",
            "count": len(matches),
            "data": matches
        }), 200

    except Exception as error:
        return handle_db_error(error, "retrieving roommate matches")

    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()


# GET: Retrieve single roommate match by ID
@roommate_match_bp.route("/<int:match_id>", methods=["GET"], strict_slashes=False)
def get_roommate_match(match_id):
    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute("""
            SELECT Match_ID, Student_ID_1, Student_ID_2,
                   Compatibility_Score, Match_Date, Match_Status
            FROM roommate_match
            WHERE Match_ID = %s
        """, (match_id,))

        match = cursor.fetchone()

        if not match:
            return jsonify({
                "status": "error",
                "message": "Roommate match not found."
            }), 404

        return jsonify({
            "status": "success",
            "data": format_row(match)
        }), 200

    except Exception as error:
        return handle_db_error(error, "retrieving roommate match")

    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()


# POST: Create a new roommate match
@roommate_match_bp.route("/", methods=["POST"], strict_slashes=False)
@roommate_match_bp.route("", methods=["POST"], strict_slashes=False)
def create_roommate_match():
    connection = None
    cursor = None

    try:
        data = request.get_json(silent=True)

        if not isinstance(data, dict):
            return jsonify({
                "status": "error",
                "message": "A valid JSON object is required."
            }), 400

        required_fields = ["Match_ID", "Student_ID_1", "Student_ID_2"]
        for field in required_fields:
            if field not in data or data[field] is None:
                return jsonify({
                    "status": "error",
                    "message": f"{field} is required."
                }), 400

        match_id = data["Match_ID"]
        student_id_1 = data["Student_ID_1"]
        student_id_2 = data["Student_ID_2"]

        for f_name, val in [("Match_ID", match_id), ("Student_ID_1", student_id_1), ("Student_ID_2", student_id_2)]:
            if isinstance(val, bool) or not isinstance(val, int) or val <= 0:
                return jsonify({
                    "status": "error",
                    "message": f"{f_name} must be a positive integer."
                }), 400

        # Enforce business rule: student cannot be matched with themselves
        if student_id_1 == student_id_2:
            return jsonify({
                "status": "error",
                "message": "A student cannot be matched with themselves (Student_ID_1 and Student_ID_2 must be different)."
            }), 400

        match_date = None
        if "Match_Date" in data and data["Match_Date"] is not None:
            match_date, err = parse_date(data["Match_Date"], "Match_Date")
            if err:
                return jsonify({"status": "error", "message": err}), 400

        score = data.get("Compatibility_Score")
        if score is not None:
            try:
                score = float(score)
                if score < 0 or score > 100:
                    return jsonify({
                        "status": "error",
                        "message": "Compatibility_Score must be between 0 and 100."
                    }), 400
            except (ValueError, TypeError):
                return jsonify({
                    "status": "error",
                    "message": "Compatibility_Score must be a valid number."
                }), 400

        connection = get_db_connection()
        cursor = connection.cursor()

        # Check primary key
        cursor.execute("SELECT Match_ID FROM roommate_match WHERE Match_ID = %s", (match_id,))
        if cursor.fetchone():
            return jsonify({
                "status": "error",
                "message": f"Roommate match with Match_ID {match_id} already exists."
            }), 409

        # Check both students exist
        cursor.execute("SELECT Student_ID FROM student WHERE Student_ID = %s", (student_id_1,))
        if not cursor.fetchone():
            return jsonify({
                "status": "error",
                "message": f"Referenced Student_ID_1 {student_id_1} does not exist."
            }), 409

        cursor.execute("SELECT Student_ID FROM student WHERE Student_ID = %s", (student_id_2,))
        if not cursor.fetchone():
            return jsonify({
                "status": "error",
                "message": f"Referenced Student_ID_2 {student_id_2} does not exist."
            }), 409

        cursor.execute("""
            INSERT INTO roommate_match
            (Match_ID, Student_ID_1, Student_ID_2, Compatibility_Score, Match_Date, Match_Status)
            VALUES (%s, %s, %s, %s, %s, %s)
        """, (
            match_id,
            student_id_1,
            student_id_2,
            score,
            match_date,
            data.get("Match_Status", "Proposed")
        ))

        connection.commit()

        return jsonify({
            "status": "success",
            "message": "Roommate match created successfully.",
            "Match_ID": match_id
        }), 201

    except Exception as error:
        if connection and connection.is_connected():
            connection.rollback()
        return handle_db_error(error, "creating roommate match")

    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()


# PUT: Update an existing roommate match
@roommate_match_bp.route("/<int:match_id>", methods=["PUT"], strict_slashes=False)
def update_roommate_match(match_id):
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
            "Student_ID_1",
            "Student_ID_2",
            "Compatibility_Score",
            "Match_Date",
            "Match_Status"
        ]

        updates = {key: data[key] for key in allowed_fields if key in data}

        if not updates:
            return jsonify({
                "status": "error",
                "message": "No valid fields provided for update."
            }), 400

        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute("SELECT Match_ID, Student_ID_1, Student_ID_2 FROM roommate_match WHERE Match_ID = %s", (match_id,))
        existing = cursor.fetchone()
        if not existing:
            return jsonify({
                "status": "error",
                "message": "Roommate match not found."
            }), 404

        new_s1 = updates.get("Student_ID_1", existing["Student_ID_1"])
        new_s2 = updates.get("Student_ID_2", existing["Student_ID_2"])

        if "Student_ID_1" in updates or "Student_ID_2" in updates:
            for s_name, val in [("Student_ID_1", new_s1), ("Student_ID_2", new_s2)]:
                if isinstance(val, bool) or not isinstance(val, int) or val <= 0:
                    return jsonify({
                        "status": "error",
                        "message": f"{s_name} must be a positive integer."
                    }), 400

            if new_s1 == new_s2:
                return jsonify({
                    "status": "error",
                    "message": "A student cannot be matched with themselves (Student_ID_1 and Student_ID_2 must be different)."
                }), 400

            cursor.execute("SELECT Student_ID FROM student WHERE Student_ID = %s", (new_s1,))
            if not cursor.fetchone():
                return jsonify({
                    "status": "error",
                    "message": f"Referenced Student_ID_1 {new_s1} does not exist."
                }), 409

            cursor.execute("SELECT Student_ID FROM student WHERE Student_ID = %s", (new_s2,))
            if not cursor.fetchone():
                return jsonify({
                    "status": "error",
                    "message": f"Referenced Student_ID_2 {new_s2} does not exist."
                }), 409

        if "Match_Date" in updates:
            if updates["Match_Date"] is not None:
                m_date, err = parse_date(updates["Match_Date"], "Match_Date")
                if err:
                    return jsonify({"status": "error", "message": err}), 400
                updates["Match_Date"] = m_date
            else:
                updates["Match_Date"] = None

        if "Compatibility_Score" in updates:
            score = updates["Compatibility_Score"]
            if score is not None:
                try:
                    score = float(score)
                    if score < 0 or score > 100:
                        return jsonify({
                            "status": "error",
                            "message": "Compatibility_Score must be between 0 and 100."
                        }), 400
                    updates["Compatibility_Score"] = score
                except (ValueError, TypeError):
                    return jsonify({
                        "status": "error",
                        "message": "Compatibility_Score must be a valid number."
                    }), 400

        set_clause = ", ".join(f"`{k}` = %s" for k in updates)
        values = list(updates.values()) + [match_id]

        cursor.execute(f"UPDATE roommate_match SET {set_clause} WHERE Match_ID = %s", values)
        connection.commit()

        return jsonify({
            "status": "success",
            "message": "Roommate match updated successfully.",
            "Match_ID": match_id
        }), 200

    except Exception as error:
        if connection and connection.is_connected():
            connection.rollback()
        return handle_db_error(error, "updating roommate match")

    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()


# DELETE: Remove a roommate match
@roommate_match_bp.route("/<int:match_id>", methods=["DELETE"], strict_slashes=False)
def delete_roommate_match(match_id):
    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor()

        cursor.execute("SELECT Match_ID FROM roommate_match WHERE Match_ID = %s", (match_id,))
        if cursor.fetchone() is None:
            return jsonify({
                "status": "error",
                "message": "Roommate match not found."
            }), 404

        cursor.execute("DELETE FROM roommate_match WHERE Match_ID = %s", (match_id,))
        connection.commit()

        return jsonify({
            "status": "success",
            "message": "Roommate match deleted successfully.",
            "Match_ID": match_id
        }), 200

    except Exception as error:
        if connection and connection.is_connected():
            connection.rollback()
        return handle_db_error(error, "deleting roommate match")

    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()
