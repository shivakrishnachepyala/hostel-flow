from flask import Blueprint, jsonify, request
from db import get_db_connection
from routes.route_utils import format_row, handle_db_error, parse_date

student_bp = Blueprint("student", __name__, url_prefix="/api/students")


# GET: Retrieve all students
@student_bp.route("/", methods=["GET"], strict_slashes=False)
@student_bp.route("", methods=["GET"], strict_slashes=False)
def get_students():
    connection = None
    cursor = None

    try:
        department = request.args.get("department")
        gender = request.args.get("gender")

        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        query = """
            SELECT Student_ID, Name, Gender, DOB, Phone, Email, Department, Year_of_Study
            FROM student
        """
        conditions = []
        params = []

        if department:
            conditions.append("Department = %s")
            params.append(department.strip())

        if gender:
            conditions.append("Gender = %s")
            params.append(gender.strip())

        if conditions:
            query += " WHERE " + " AND ".join(conditions)

        query += " ORDER BY Student_ID"

        cursor.execute(query, tuple(params))
        students = [format_row(row) for row in cursor.fetchall()]

        return jsonify({
            "status": "success",
            "count": len(students),
            "data": students
        }), 200

    except Exception as error:
        return handle_db_error(error, "retrieving students")

    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()


# GET: Retrieve single student by ID
@student_bp.route("/<int:student_id>", methods=["GET"], strict_slashes=False)
def get_student(student_id):
    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute("""
            SELECT Student_ID, Name, Gender, DOB, Phone, Email, Department, Year_of_Study
            FROM student
            WHERE Student_ID = %s
        """, (student_id,))

        student = cursor.fetchone()

        if not student:
            return jsonify({
                "status": "error",
                "message": "Student not found."
            }), 404

        return jsonify({
            "status": "success",
            "data": format_row(student)
        }), 200

    except Exception as error:
        return handle_db_error(error, "retrieving student")

    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()


# POST: Create a new student
@student_bp.route("/", methods=["POST"], strict_slashes=False)
@student_bp.route("", methods=["POST"], strict_slashes=False)
def create_student():
    connection = None
    cursor = None

    try:
        data = request.get_json(silent=True)

        if not isinstance(data, dict):
            return jsonify({
                "status": "error",
                "message": "A valid JSON object is required."
            }), 400

        required_fields = ["Student_ID", "Name"]
        for field in required_fields:
            if field not in data or data[field] is None:
                return jsonify({
                    "status": "error",
                    "message": f"{field} is required."
                }), 400

        student_id = data["Student_ID"]
        name = data["Name"]

        if isinstance(student_id, bool) or not isinstance(student_id, int) or student_id <= 0:
            return jsonify({
                "status": "error",
                "message": "Student_ID must be a positive integer."
            }), 400

        if not isinstance(name, str) or not name.strip():
            return jsonify({
                "status": "error",
                "message": "Name must be a non-empty string."
            }), 400

        dob = None
        if "DOB" in data and data["DOB"] is not None:
            dob, err = parse_date(data["DOB"], "DOB")
            if err:
                return jsonify({"status": "error", "message": err}), 400

        year_of_study = data.get("Year_of_Study")
        if year_of_study is not None and (isinstance(year_of_study, bool) or not isinstance(year_of_study, int) or year_of_study <= 0):
            return jsonify({
                "status": "error",
                "message": "Year_of_Study must be a positive integer."
            }), 400

        email = data.get("Email")
        if email is not None:
            if not isinstance(email, str) or not email.strip():
                email = None
            else:
                email = email.strip()

        phone = data.get("Phone")
        if phone is not None:
            phone = str(phone).strip() if phone else None

        connection = get_db_connection()
        cursor = connection.cursor()

        # Check primary key
        cursor.execute("SELECT Student_ID FROM student WHERE Student_ID = %s", (student_id,))
        if cursor.fetchone():
            return jsonify({
                "status": "error",
                "message": f"Student with Student_ID {student_id} already exists."
            }), 409

        # Check unique Email if supplied
        if email:
            cursor.execute("SELECT Student_ID FROM student WHERE Email = %s", (email,))
            if cursor.fetchone():
                return jsonify({
                    "status": "error",
                    "message": f"Student with Email '{email}' already exists."
                }), 409

        cursor.execute("""
            INSERT INTO student
            (Student_ID, Name, Gender, DOB, Phone, Email, Department, Year_of_Study)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            student_id,
            name.strip(),
            data.get("Gender"),
            dob,
            phone,
            email,
            data.get("Department"),
            year_of_study
        ))

        connection.commit()

        return jsonify({
            "status": "success",
            "message": "Student created successfully.",
            "Student_ID": student_id
        }), 201

    except Exception as error:
        if connection and connection.is_connected():
            connection.rollback()
        return handle_db_error(error, "creating student")

    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()


# PUT: Update an existing student
@student_bp.route("/<int:student_id>", methods=["PUT"], strict_slashes=False)
def update_student(student_id):
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
            "Name",
            "Gender",
            "DOB",
            "Phone",
            "Email",
            "Department",
            "Year_of_Study"
        ]

        updates = {key: data[key] for key in allowed_fields if key in data}

        if not updates:
            return jsonify({
                "status": "error",
                "message": "No valid fields provided for update."
            }), 400

        if "Name" in updates:
            val = updates["Name"]
            if not isinstance(val, str) or not val.strip():
                return jsonify({
                    "status": "error",
                    "message": "Name must be a non-empty string."
                }), 400
            updates["Name"] = val.strip()

        if "DOB" in updates:
            if updates["DOB"] is not None:
                dob, err = parse_date(updates["DOB"], "DOB")
                if err:
                    return jsonify({"status": "error", "message": err}), 400
                updates["DOB"] = dob

        if "Year_of_Study" in updates and updates["Year_of_Study"] is not None:
            y = updates["Year_of_Study"]
            if isinstance(y, bool) or not isinstance(y, int) or y <= 0:
                return jsonify({
                    "status": "error",
                    "message": "Year_of_Study must be a positive integer."
                }), 400

        if "Email" in updates:
            val = updates["Email"]
            if val is not None:
                if not isinstance(val, str) or not val.strip():
                    updates["Email"] = None
                else:
                    updates["Email"] = val.strip()

        if "Phone" in updates and updates["Phone"] is not None:
            updates["Phone"] = str(updates["Phone"]).strip()

        connection = get_db_connection()
        cursor = connection.cursor()

        cursor.execute("SELECT Student_ID FROM student WHERE Student_ID = %s", (student_id,))
        if cursor.fetchone() is None:
            return jsonify({
                "status": "error",
                "message": "Student not found."
            }), 404

        # Check unique Email if changed
        if updates.get("Email"):
            cursor.execute(
                "SELECT Student_ID FROM student WHERE Email = %s AND Student_ID != %s",
                (updates["Email"], student_id)
            )
            if cursor.fetchone():
                return jsonify({
                    "status": "error",
                    "message": f"Student with Email '{updates['Email']}' already exists."
                }), 409

        set_clause = ", ".join(f"`{k}` = %s" for k in updates)
        values = list(updates.values()) + [student_id]

        cursor.execute(f"UPDATE student SET {set_clause} WHERE Student_ID = %s", values)
        connection.commit()

        return jsonify({
            "status": "success",
            "message": "Student updated successfully.",
            "Student_ID": student_id
        }), 200

    except Exception as error:
        if connection and connection.is_connected():
            connection.rollback()
        return handle_db_error(error, "updating student")

    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()


# DELETE: Remove a student
@student_bp.route("/<int:student_id>", methods=["DELETE"], strict_slashes=False)
def delete_student(student_id):
    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor()

        cursor.execute("SELECT Student_ID FROM student WHERE Student_ID = %s", (student_id,))
        if cursor.fetchone() is None:
            return jsonify({
                "status": "error",
                "message": "Student not found."
            }), 404

        cursor.execute("DELETE FROM student WHERE Student_ID = %s", (student_id,))
        connection.commit()

        return jsonify({
            "status": "success",
            "message": "Student deleted successfully.",
            "Student_ID": student_id
        }), 200

    except Exception as error:
        if connection and connection.is_connected():
            connection.rollback()
        return handle_db_error(error, "deleting student")

    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()
