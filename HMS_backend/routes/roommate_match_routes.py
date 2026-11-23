import json
from flask import Blueprint, jsonify, request
from db import get_db_connection
from routes.route_utils import format_row, handle_db_error, parse_date
from services.auth_service import warden_required
from services.matching_engine import run_roommate_matching_engine, calculate_compatibility

roommate_match_bp = Blueprint(
    "roommate_match",
    __name__,
    url_prefix="/api/roommate-matches"
)


def _format_match_row(row):
    """Formats database row with parsed explanation and structured student preferences."""
    formatted = format_row(row)
    
    # Parse Match_Explanation JSON
    raw_exp = formatted.get("Match_Explanation")
    if raw_exp and isinstance(raw_exp, str):
        try:
            formatted["Match_Explanation"] = json.loads(raw_exp)
        except Exception:
            formatted["Match_Explanation"] = {"raw": raw_exp}
    elif not raw_exp:
        formatted["Match_Explanation"] = None

    # Nest student preferences
    formatted["Student_1_Preferences"] = {
        "Sleep_Schedule": formatted.pop("S1_Sleep", None),
        "Study_Habits": formatted.pop("S1_Study", None),
        "Food_Preference": formatted.pop("S1_Food", None),
        "Language": formatted.pop("S1_Language", None),
    }
    formatted["Student_2_Preferences"] = {
        "Sleep_Schedule": formatted.pop("S2_Sleep", None),
        "Study_Habits": formatted.pop("S2_Study", None),
        "Food_Preference": formatted.pop("S2_Food", None),
        "Language": formatted.pop("S2_Language", None),
    }

    # If Match_Explanation is missing, compute it on the fly from student preferences
    if not formatted.get("Match_Explanation") and formatted.get("Student_1_Preferences") and formatted.get("Student_2_Preferences"):
        s1_obj = {
            "Student_ID": formatted.get("Student_ID_1"),
            "Gender": formatted.get("Student_1_Gender"),
            "Department": formatted.get("Student_1_Department"),
            **formatted["Student_1_Preferences"]
        }
        s2_obj = {
            "Student_ID": formatted.get("Student_ID_2"),
            "Gender": formatted.get("Student_2_Gender"),
            "Department": formatted.get("Student_2_Department"),
            **formatted["Student_2_Preferences"]
        }
        _, computed_exp = calculate_compatibility(s1_obj, s2_obj)
        formatted["Match_Explanation"] = computed_exp

    return formatted


# ============================================================================
# 1. GENERATE MATCHES VIA ENGINE
# ============================================================================
@roommate_match_bp.route("/generate", methods=["POST"], strict_slashes=False)
@warden_required
def generate_roommate_matches():
    """
    Executes the automated roommate matching engine to generate compatible pairs
    based on actual student preferences in MySQL.
    """
    try:
        result = run_roommate_matching_engine()
        return jsonify(result), 200
    except Exception as error:
        return handle_db_error(error, "running roommate matching engine")


# ============================================================================
# 2. RETRIEVE KPI STATS
# ============================================================================
@roommate_match_bp.route("/stats", methods=["GET"], strict_slashes=False)
@warden_required
def get_roommate_match_stats():
    """Returns high-level statistics for roommate matching in the Warden portal."""
    connection = None
    cursor = None
    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute("""
            SELECT
                COUNT(*) AS total_matches,
                SUM(CASE WHEN Match_Status = 'Proposed' THEN 1 ELSE 0 END) AS proposed_count,
                SUM(CASE WHEN Match_Status IN ('Approved', 'Accepted') THEN 1 ELSE 0 END) AS approved_count,
                SUM(CASE WHEN Match_Status = 'Rejected' THEN 1 ELSE 0 END) AS rejected_count,
                ROUND(AVG(Compatibility_Score), 1) AS average_score
            FROM roommate_match
        """)
        base_stats = cursor.fetchone() or {}

        # Count eligible unallocated students not in an approved match
        cursor.execute("""
            SELECT COUNT(*) AS eligible_count
            FROM student s
            INNER JOIN student_preferences p ON s.Student_ID = p.Student_ID
            WHERE s.Student_ID NOT IN (
                SELECT Student_ID FROM room_allocation WHERE Allocation_Status = 'Active'
            )
            AND s.Student_ID NOT IN (
                SELECT Student_ID_1 FROM roommate_match WHERE Match_Status IN ('Approved', 'Accepted')
                UNION
                SELECT Student_ID_2 FROM roommate_match WHERE Match_Status IN ('Approved', 'Accepted')
            )
        """)
        elig_row = cursor.fetchone() or {}

        stats_data = {
            "total_matches": int(base_stats.get("total_matches") or 0),
            "proposed_count": int(base_stats.get("proposed_count") or 0),
            "approved_count": int(base_stats.get("approved_count") or 0),
            "rejected_count": int(base_stats.get("rejected_count") or 0),
            "average_score": float(base_stats.get("average_score") or 0.0),
            "eligible_unmatched_count": int(elig_row.get("eligible_count") or 0),
        }

        return jsonify({
            "status": "success",
            "data": stats_data
        }), 200
    except Exception as error:
        return handle_db_error(error, "retrieving roommate match stats")
    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()


# ============================================================================
# 3. GET ALL MATCHES (WITH JOINS & FILTERING)
# ============================================================================
@roommate_match_bp.route("/", methods=["GET"], strict_slashes=False)
@roommate_match_bp.route("", methods=["GET"], strict_slashes=False)
@warden_required
def get_roommate_matches():
    connection = None
    cursor = None

    try:
        student_id = request.args.get("student_id", type=int)
        status = request.args.get("status")
        search = request.args.get("search")
        sort = request.args.get("sort", "score_desc")

        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        query = """
            SELECT
                rm.Match_ID, rm.Student_ID_1, rm.Student_ID_2,
                rm.Compatibility_Score, rm.Match_Date, rm.Match_Status,
                rm.Match_Explanation, rm.Created_At, rm.Updated_At,
                s1.Name AS Student_1_Name, s1.Gender AS Student_1_Gender,
                s1.Department AS Student_1_Department, s1.Year_of_Study AS Student_1_Year,
                sp1.Sleep_Schedule AS S1_Sleep, sp1.Study_Habits AS S1_Study,
                sp1.Food_Preference AS S1_Food, sp1.Language AS S1_Language,
                s2.Name AS Student_2_Name, s2.Gender AS Student_2_Gender,
                s2.Department AS Student_2_Department, s2.Year_of_Study AS Student_2_Year,
                sp2.Sleep_Schedule AS S2_Sleep, sp2.Study_Habits AS S2_Study,
                sp2.Food_Preference AS S2_Food, sp2.Language AS S2_Language
            FROM roommate_match rm
            LEFT JOIN student s1 ON rm.Student_ID_1 = s1.Student_ID
            LEFT JOIN student s2 ON rm.Student_ID_2 = s2.Student_ID
            LEFT JOIN student_preferences sp1 ON rm.Student_ID_1 = sp1.Student_ID
            LEFT JOIN student_preferences sp2 ON rm.Student_ID_2 = sp2.Student_ID
        """
        conditions = []
        params = []

        if student_id is not None:
            conditions.append("(rm.Student_ID_1 = %s OR rm.Student_ID_2 = %s)")
            params.extend([student_id, student_id])

        if status and status.strip() and status.strip().lower() != "all":
            conditions.append("rm.Match_Status = %s")
            params.append(status.strip())

        if search and search.strip():
            term = f"%{search.strip()}%"
            conditions.append("""(
                s1.Name LIKE %s OR s2.Name LIKE %s OR
                CAST(rm.Student_ID_1 AS CHAR) LIKE %s OR CAST(rm.Student_ID_2 AS CHAR) LIKE %s OR
                s1.Department LIKE %s OR s2.Department LIKE %s
            )""")
            params.extend([term, term, term, term, term, term])

        if conditions:
            query += " WHERE " + " AND ".join(conditions)

        if sort == "score_asc":
            query += " ORDER BY rm.Compatibility_Score ASC, rm.Match_ID ASC"
        elif sort == "date_desc":
            query += " ORDER BY rm.Match_Date DESC, rm.Match_ID DESC"
        elif sort == "id_asc":
            query += " ORDER BY rm.Match_ID ASC"
        else: # score_desc default
            query += " ORDER BY rm.Compatibility_Score DESC, rm.Match_ID ASC"

        cursor.execute(query, tuple(params))
        matches = [_format_match_row(row) for row in cursor.fetchall()]

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


# ============================================================================
# 4. GET SINGLE MATCH BY ID
# ============================================================================
@roommate_match_bp.route("/<int:match_id>", methods=["GET"], strict_slashes=False)
@warden_required
def get_roommate_match(match_id):
    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute("""
            SELECT
                rm.Match_ID, rm.Student_ID_1, rm.Student_ID_2,
                rm.Compatibility_Score, rm.Match_Date, rm.Match_Status,
                rm.Match_Explanation, rm.Created_At, rm.Updated_At,
                s1.Name AS Student_1_Name, s1.Gender AS Student_1_Gender,
                s1.Department AS Student_1_Department, s1.Year_of_Study AS Student_1_Year,
                sp1.Sleep_Schedule AS S1_Sleep, sp1.Study_Habits AS S1_Study,
                sp1.Food_Preference AS S1_Food, sp1.Language AS S1_Language,
                s2.Name AS Student_2_Name, s2.Gender AS Student_2_Gender,
                s2.Department AS Student_2_Department, s2.Year_of_Study AS Student_2_Year,
                sp2.Sleep_Schedule AS S2_Sleep, sp2.Study_Habits AS S2_Study,
                sp2.Food_Preference AS S2_Food, sp2.Language AS S2_Language
            FROM roommate_match rm
            LEFT JOIN student s1 ON rm.Student_ID_1 = s1.Student_ID
            LEFT JOIN student s2 ON rm.Student_ID_2 = s2.Student_ID
            LEFT JOIN student_preferences sp1 ON rm.Student_ID_1 = sp1.Student_ID
            LEFT JOIN student_preferences sp2 ON rm.Student_ID_2 = sp2.Student_ID
            WHERE rm.Match_ID = %s
        """, (match_id,))

        match = cursor.fetchone()

        if not match:
            return jsonify({
                "status": "error",
                "message": "Roommate match not found."
            }), 404

        return jsonify({
            "status": "success",
            "data": _format_match_row(match)
        }), 200

    except Exception as error:
        return handle_db_error(error, "retrieving roommate match")

    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()


# ============================================================================
# 5. APPROVE / REJECT MATCH ACTIONS
# ============================================================================
@roommate_match_bp.route("/<int:match_id>/approve", methods=["PATCH", "POST"], strict_slashes=False)
@warden_required
def approve_roommate_match(match_id):
    """Marks a proposed roommate match as Approved by the Warden."""
    connection = None
    cursor = None
    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute("SELECT Match_ID, Match_Status FROM roommate_match WHERE Match_ID = %s", (match_id,))
        match = cursor.fetchone()
        if not match:
            return jsonify({"status": "error", "message": "Roommate match not found."}), 404

        cursor.execute("""
            UPDATE roommate_match
            SET Match_Status = 'Approved', Updated_At = CURRENT_TIMESTAMP
            WHERE Match_ID = %s
        """, (match_id,))
        connection.commit()

        return jsonify({
            "status": "success",
            "message": f"Roommate match #{match_id} successfully approved.",
            "Match_ID": match_id,
            "Match_Status": "Approved"
        }), 200
    except Exception as error:
        if connection and connection.is_connected():
            connection.rollback()
        return handle_db_error(error, "approving roommate match")
    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()


@roommate_match_bp.route("/<int:match_id>/reject", methods=["PATCH", "POST"], strict_slashes=False)
@warden_required
def reject_roommate_match(match_id):
    """Marks a roommate match as Rejected by the Warden."""
    connection = None
    cursor = None
    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute("SELECT Match_ID, Match_Status FROM roommate_match WHERE Match_ID = %s", (match_id,))
        match = cursor.fetchone()
        if not match:
            return jsonify({"status": "error", "message": "Roommate match not found."}), 404

        cursor.execute("""
            UPDATE roommate_match
            SET Match_Status = 'Rejected', Updated_At = CURRENT_TIMESTAMP
            WHERE Match_ID = %s
        """, (match_id,))
        connection.commit()

        return jsonify({
            "status": "success",
            "message": f"Roommate match #{match_id} marked as rejected.",
            "Match_ID": match_id,
            "Match_Status": "Rejected"
        }), 200
    except Exception as error:
        if connection and connection.is_connected():
            connection.rollback()
        return handle_db_error(error, "rejecting roommate match")
    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()


# ============================================================================
# 6. POST: Create a new roommate match (Manual)
# ============================================================================
@roommate_match_bp.route("/", methods=["POST"], strict_slashes=False)
@roommate_match_bp.route("", methods=["POST"], strict_slashes=False)
@warden_required
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

        required_fields = ["Student_ID_1", "Student_ID_2"]
        for field in required_fields:
            if field not in data or data[field] is None:
                return jsonify({
                    "status": "error",
                    "message": f"{field} is required."
                }), 400

        raw_s1 = data["Student_ID_1"]
        raw_s2 = data["Student_ID_2"]

        for f_name, val in [("Student_ID_1", raw_s1), ("Student_ID_2", raw_s2)]:
            if isinstance(val, bool) or not isinstance(val, int) or val <= 0:
                return jsonify({
                    "status": "error",
                    "message": f"{f_name} must be a positive integer."
                }), 400

        if raw_s1 == raw_s2:
            return jsonify({
                "status": "error",
                "message": "A student cannot be matched with themselves."
            }), 400

        student_id_1 = min(raw_s1, raw_s2)
        student_id_2 = max(raw_s1, raw_s2)

        match_date = None
        if "Match_Date" in data and data["Match_Date"] is not None:
            match_date, err = parse_date(data["Match_Date"], "Match_Date")
            if err:
                return jsonify({"status": "error", "message": err}), 400

        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        # Check both students exist and fetch preferences
        cursor.execute("""
            SELECT s.Student_ID, s.Name, s.Gender, s.Department, s.Year_of_Study,
                   p.Language, p.Food_Preference, p.Sleep_Schedule, p.Study_Habits
            FROM student s
            LEFT JOIN student_preferences p ON s.Student_ID = p.Student_ID
            WHERE s.Student_ID IN (%s, %s)
        """, (student_id_1, student_id_2))
        students = cursor.fetchall()
        if len(students) < 2:
            return jsonify({
                "status": "error",
                "message": "Both students must exist in the database."
            }), 409

        s1_obj = next(s for s in students if s["Student_ID"] == student_id_1)
        s2_obj = next(s for s in students if s["Student_ID"] == student_id_2)

        # Check gender compatibility
        g1 = (s1_obj.get("Gender") or "").lower()
        g2 = (s2_obj.get("Gender") or "").lower()
        if g1 and g2 and g1 != g2:
            return jsonify({
                "status": "error",
                "message": f"Roommate matches require matching genders ({g1.capitalize()} != {g2.capitalize()})."
            }), 400

        # Calculate or accept score
        score = data.get("Compatibility_Score")
        exp_json = None
        if score is None:
            calc_score, explanation = calculate_compatibility(s1_obj, s2_obj)
            score = calc_score
            exp_json = json.dumps(explanation)
        else:
            try:
                score = float(score)
                if score < 0 or score > 100:
                    return jsonify({"status": "error", "message": "Compatibility_Score must be 0-100."}), 400
            except (ValueError, TypeError):
                return jsonify({"status": "error", "message": "Compatibility_Score must be a number."}), 400
            _, explanation = calculate_compatibility(s1_obj, s2_obj)
            exp_json = json.dumps(explanation)

        cursor.execute("""
            INSERT INTO roommate_match
            (Student_ID_1, Student_ID_2, Compatibility_Score, Match_Date, Match_Status, Match_Explanation)
            VALUES (%s, %s, %s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE
                Compatibility_Score = VALUES(Compatibility_Score),
                Match_Date = VALUES(Match_Date),
                Match_Status = VALUES(Match_Status),
                Match_Explanation = VALUES(Match_Explanation)
        """, (
            student_id_1,
            student_id_2,
            score,
            match_date,
            data.get("Match_Status", "Proposed"),
            exp_json
        ))

        match_id = cursor.lastrowid
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


# ============================================================================
# 7. PUT: Update an existing roommate match
# ============================================================================
@roommate_match_bp.route("/<int:match_id>", methods=["PUT"], strict_slashes=False)
@warden_required
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
                    "message": "A student cannot be matched with themselves."
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

            # Ensure canonical order min, max
            updates["Student_ID_1"] = min(new_s1, new_s2)
            updates["Student_ID_2"] = max(new_s1, new_s2)

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

        cursor.execute(f"UPDATE roommate_match SET {set_clause}, Updated_At = CURRENT_TIMESTAMP WHERE Match_ID = %s", values)
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


# ============================================================================
# 8. DELETE: Remove a roommate match
# ============================================================================
@roommate_match_bp.route("/<int:match_id>", methods=["DELETE"], strict_slashes=False)
@warden_required
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
