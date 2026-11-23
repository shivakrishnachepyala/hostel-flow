import re
import decimal
import datetime
from flask import Blueprint, jsonify, request, g, make_response
from config import Config
from db import get_db_connection
from routes.route_utils import format_row, handle_db_error, parse_date
from services.auth_service import hash_password, is_origin_allowed
from services.student_auth_service import (
    authenticate_student,
    invalidate_student_session,
    generate_student_csrf_token,
    student_required
)
from services.rate_limiter import (
    check_login_rate_limit,
    record_login_attempt,
    record_login_failure,
    reset_login_failures
)

student_portal_bp = Blueprint("student_portal", __name__, url_prefix="/api/student")


# =====================================================================
# AUTHENTICATION & REGISTRATION
# =====================================================================

@student_portal_bp.route("/auth/register", methods=["POST"], strict_slashes=False)
def register():
    """
    Public student registration endpoint.
    Creates records in `student`, `student_auth`, `student_preferences`,
    `mess_subscription`, and `student_notification`.
    """
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify({
            "status": "error",
            "message": "A valid JSON object is required."
        }), 400

    # 1. Validate mandatory fields
    name = (data.get("name") or data.get("fullName") or "").strip()
    email = (data.get("email") or "").strip().lower()
    phone = (data.get("phone") or "").strip()
    password = data.get("password") or ""

    if not name or len(name) < 2:
        return jsonify({
            "status": "error",
            "message": "Full name is required (at least 2 characters)."
        }), 400

    if not email or "@" not in email or "." not in email:
        return jsonify({
            "status": "error",
            "message": "A valid email address is required."
        }), 400

    if not phone or len(phone) < 8:
        return jsonify({
            "status": "error",
            "message": "A valid phone number is required (at least 8 digits)."
        }), 400

    if not password or len(password) < 8:
        return jsonify({
            "status": "error",
            "message": "Password must be at least 8 characters long."
        }), 400

    # Optional student profile attributes
    gender = data.get("gender", "Male")
    if gender not in ("Male", "Female", "Other"):
        gender = "Male"

    dob_val, dob_err = parse_date(data.get("dob"), "dob")
    if dob_err:
        return jsonify({"status": "error", "message": dob_err}), 400

    department = (data.get("department") or "Computer Science").strip()
    try:
        year_of_study = int(data.get("yearOfStudy") or data.get("year_of_study") or 1)
        if year_of_study < 1 or year_of_study > 6:
            year_of_study = 1
    except (ValueError, TypeError):
        year_of_study = 1

    # Optional preferences
    food_pref = (data.get("foodPreference") or data.get("food_preference") or "Vegetarian").strip()
    sleep_sched = (data.get("sleepSchedule") or data.get("sleep_schedule") or "Early riser").strip()
    study_habits = (data.get("studyHabits") or data.get("study_habits") or "Studies in room").strip()
    language = (data.get("language") or "English").strip()

    connection = None
    cursor = None
    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        # 2. Check for duplicate email or phone
        cursor.execute("SELECT Student_ID FROM student WHERE Email = %s", (email,))
        if cursor.fetchone():
            return jsonify({
                "status": "error",
                "message": f"An account with email '{email}' is already registered."
            }), 409

        cursor.execute("SELECT Student_ID FROM student WHERE Phone = %s", (phone,))
        if cursor.fetchone():
            return jsonify({
                "status": "error",
                "message": f"An account with phone number '{phone}' is already registered."
            }), 409

        cursor.execute("SELECT Auth_ID FROM student_auth WHERE Email = %s", (email,))
        if cursor.fetchone():
            return jsonify({
                "status": "error",
                "message": f"An authentication record with email '{email}' already exists."
            }), 409

        # 3. Generate sequential Student_ID (starting >= 1001 for real enrollments)
        cursor.execute("SELECT COALESCE(MAX(Student_ID), 1000) AS max_id FROM student")
        row = cursor.fetchone()
        max_id = row["max_id"] if row else 1000
        new_student_id = max(max_id + 1, 1001)

        # 4. Hash password with bcrypt
        pw_hash = hash_password(password)

        # 5. Insert into student table
        cursor.execute("""
            INSERT INTO student (Student_ID, Name, Gender, DOB, Phone, Email, Department, Year_of_Study)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """, (new_student_id, name, gender, dob_val, phone, email, department, year_of_study))

        # 6. Insert into student_auth table
        cursor.execute("""
            INSERT INTO student_auth (Student_ID, Email, Password_Hash, Is_Active, Token_Version)
            VALUES (%s, %s, %s, 1, 1)
        """, (new_student_id, email, pw_hash))

        # 7. Insert preferences
        cursor.execute("SELECT COALESCE(MAX(Preference_ID), 0) + 1 AS next_pid FROM student_preferences")
        pid_row = cursor.fetchone()
        next_pid = pid_row["next_pid"] if pid_row else 1

        cursor.execute("""
            INSERT INTO student_preferences (Preference_ID, Student_ID, Language, Food_Preference, Sleep_Schedule, Study_Habits)
            VALUES (%s, %s, %s, %s, %s, %s)
        """, (next_pid, new_student_id, language, food_pref, sleep_sched, study_habits))

        # 8. Create default mess subscription
        mess_plan = "Standard Veg" if "veg" in food_pref.lower() else "Special Non-Veg"
        monthly_cost = 3500.00 if "veg" in food_pref.lower() else 4200.00
        cursor.execute("""
            INSERT INTO mess_subscription (Student_ID, Plan_Name, Monthly_Cost, Status, Dietary_Remarks, Start_Date)
            VALUES (%s, %s, %s, 'Active', %s, CURDATE())
        """, (new_student_id, mess_plan, monthly_cost, f"Initial enrollment preference: {food_pref}"))

        # 9. Create welcome notification
        cursor.execute("""
            INSERT INTO student_notification (Student_ID, Title, Message, Category, Is_Read)
            VALUES (%s, 'Welcome to HostelFlow!', 
                    'Your student account has been created. You can now view your room allocation status, mess plan, submit room change requests, and report maintenance issues.', 
                    'System', 0)
        """, (new_student_id,))

        connection.commit()

        return jsonify({
            "status": "success",
            "message": "Student registration completed successfully.",
            "student_id": new_student_id,
            "email": email,
            "name": name
        }), 201

    except Exception as error:
        if connection and connection.is_connected():
            connection.rollback()
        return handle_db_error(error, "registering student")

    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()


@student_portal_bp.route("/auth/login", methods=["POST"], strict_slashes=False)
def login():
    """
    Student login endpoint. Sets HttpOnly student_access_token and CSRF token cookies.
    """
    client_ip = request.headers.get("X-Forwarded-For", request.remote_addr or "127.0.0.1").split(",")[0].strip()
    record_login_attempt(client_ip)

    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify({
            "status": "error",
            "message": "A valid JSON object is required."
        }), 400

    identifier = data.get("identifier") or data.get("email") or data.get("username") or data.get("student_id")
    password = data.get("password")

    if not identifier or not password:
        return jsonify({
            "status": "error",
            "message": "Student ID / email and password are required."
        }), 400

    # Origin check
    req_origin = request.headers.get("Origin")
    if req_origin and not is_origin_allowed(req_origin):
        return jsonify({
            "status": "error",
            "message": "Cross-Origin login request rejected."
        }), 403

    # Check rate limit
    allowed, retry_after, reason = check_login_rate_limit(client_ip, str(identifier))
    if not allowed:
        resp = make_response(jsonify({
            "status": "error",
            "message": reason,
            "retry_after": retry_after
        }), 429)
        resp.headers["Retry-After"] = str(retry_after)
        return resp

    student, token, err = authenticate_student(identifier, password)
    if err:
        record_login_failure(client_ip, str(identifier))
        status_code = 403 if "deactivated" in err.lower() else 401
        return jsonify({
            "status": "error",
            "message": err
        }), status_code

    reset_login_failures(str(identifier))

    csrf_token = generate_student_csrf_token(student["Student_ID"])

    # Dual-channel auth response: provide token in JSON for external / mobile devices
    response_data = {
        "status": "success",
        "message": "Login successful.",
        "student": student,
        "token": token,
        "access_token": token,
        "csrf_token": csrf_token
    }

    response = make_response(jsonify(response_data), 200)

    # Set HttpOnly student JWT cookie
    response.set_cookie(
        "student_access_token",
        token,
        httponly=True,
        secure=Config.COOKIE_SECURE,
        samesite=Config.COOKIE_SAMESITE,
        max_age=86400,
        path="/"
    )

    # Set non-HttpOnly CSRF token cookies
    response.set_cookie(
        "student_csrf_token",
        csrf_token,
        httponly=False,
        secure=Config.COOKIE_SECURE,
        samesite=Config.COOKIE_SAMESITE,
        max_age=86400,
        path="/"
    )
    response.set_cookie(
        "csrf_token",
        csrf_token,
        httponly=False,
        secure=Config.COOKIE_SECURE,
        samesite=Config.COOKIE_SAMESITE,
        max_age=86400,
        path="/"
    )

    return response


@student_portal_bp.route("/auth/logout", methods=["POST"], strict_slashes=False)
@student_required
def logout():
    """Invalidates the student session and removes cookies."""
    student_id = g.current_student.get("Student_ID")
    if student_id:
        invalidate_student_session(student_id)

    response = make_response(jsonify({
        "status": "success",
        "message": "Logged out successfully. Student session terminated."
    }), 200)

    for cookie_name in ("student_access_token", "student_csrf_token", "csrf_token"):
        response.set_cookie(
            cookie_name,
            "",
            httponly=("access" in cookie_name),
            secure=Config.COOKIE_SECURE,
            samesite=Config.COOKIE_SAMESITE,
            expires=0,
            max_age=0,
            path="/"
        )

    return response


@student_portal_bp.route("/auth/me", methods=["GET"], strict_slashes=False)
@student_required
def get_current_student_profile():
    """Returns the authenticated student session and refreshes CSRF token."""
    csrf_token = generate_student_csrf_token(g.current_student["Student_ID"])
    auth_header = request.headers.get("Authorization")
    token = auth_header.split(" ", 1)[1].strip() if auth_header and auth_header.startswith("Bearer ") else request.cookies.get("student_access_token")

    response_body = {
        "status": "success",
        "student": g.current_student,
        "csrf_token": csrf_token
    }
    if token:
        response_body["token"] = token
        response_body["access_token"] = token

    response = make_response(jsonify(response_body), 200)

    response.set_cookie(
        "student_csrf_token",
        csrf_token,
        httponly=False,
        secure=Config.COOKIE_SECURE,
        samesite=Config.COOKIE_SAMESITE,
        max_age=86400,
        path="/"
    )
    response.set_cookie(
        "csrf_token",
        csrf_token,
        httponly=False,
        secure=Config.COOKIE_SECURE,
        samesite=Config.COOKIE_SAMESITE,
        max_age=86400,
        path="/"
    )
    return response


# =====================================================================
# STUDENT DASHBOARD (Consolidated Live View)
# =====================================================================

@student_portal_bp.route("/dashboard", methods=["GET"], strict_slashes=False)
@student_required
def get_dashboard():
    """
    Returns consolidated live data for the Student Portal Dashboard:
    - Student profile
    - Current active room allocation (with room, bed, block, hostel)
    - Roommates sharing the same room
    - Active mess subscription
    - Payments summary (total paid, total pending)
    - Unread notifications count
    - Open support complaints count
    """
    student_id = g.current_student["Student_ID"]
    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        # 1. Active room allocation
        cursor.execute("""
            SELECT ra.Allocation_ID, ra.Allocation_Date, ra.Start_Date, ra.End_Date, ra.Allocation_Status,
                   r.Room_ID, r.Room_Number, r.Floor, r.Room_Type, r.Capacity, r.Facilities,
                   b.Bed_ID, b.Bed_Number, b.Bed_Type,
                   hb.Block_ID, hb.Block_Name, hb.Gender AS Block_Gender,
                   h.Hostel_ID, h.Hostel_Name, h.Location AS Hostel_Location, h.Hostel_Type
            FROM room_allocation ra
            JOIN room r ON ra.Room_ID = r.Room_ID
            JOIN bed b ON ra.Bed_ID = b.Bed_ID
            JOIN hostel_block hb ON r.Block_ID = hb.Block_ID
            JOIN hostel h ON hb.Hostel_ID = h.Hostel_ID
            WHERE ra.Student_ID = %s AND ra.Allocation_Status = 'Active'
            LIMIT 1
        """, (student_id,))
        active_alloc = cursor.fetchone()
        active_alloc = format_row(active_alloc) if active_alloc else None

        # 2. Roommates in the same room (if allocated)
        roommates = []
        if active_alloc and active_alloc.get("Room_ID"):
            cursor.execute("""
                SELECT s.Student_ID, s.Name, s.Department, s.Year_of_Study, s.Email, b.Bed_Number
                FROM room_allocation ra
                JOIN student s ON ra.Student_ID = s.Student_ID
                JOIN bed b ON ra.Bed_ID = b.Bed_ID
                WHERE ra.Room_ID = %s AND ra.Allocation_Status = 'Active' AND ra.Student_ID != %s
            """, (active_alloc["Room_ID"], student_id))
            roommates = [format_row(row) for row in cursor.fetchall()]

        # 3. Active mess plan
        cursor.execute("""
            SELECT Subscription_ID, Student_ID, Plan_Name, Monthly_Cost, Status, Dietary_Remarks, Start_Date, End_Date
            FROM mess_subscription
            WHERE Student_ID = %s
            ORDER BY Subscription_ID DESC
            LIMIT 1
        """, (student_id,))
        mess = cursor.fetchone()
        mess = format_row(mess) if mess else None

        # 4. Payments summary
        cursor.execute("""
            SELECT COUNT(*) AS total_transactions,
                   COALESCE(SUM(CASE WHEN Payment_Status = 'Paid' THEN Amount ELSE 0 END), 0) AS total_paid,
                   COALESCE(SUM(CASE WHEN Payment_Status = 'Pending' THEN Amount ELSE 0 END), 0) AS total_pending
            FROM payment
            WHERE Student_ID = %s
        """, (student_id,))
        pay_summary = cursor.fetchone()
        pay_summary = format_row(pay_summary) if pay_summary else {"total_transactions": 0, "total_paid": 0.0, "total_pending": 0.0}

        # 5. Unread notifications count
        cursor.execute("""
            SELECT COUNT(*) AS unread_count
            FROM student_notification
            WHERE Student_ID = %s AND Is_Read = 0
        """, (student_id,))
        notif_row = cursor.fetchone()
        unread_notifications = notif_row["unread_count"] if notif_row else 0

        # 6. Open complaints count
        cursor.execute("""
            SELECT COUNT(*) AS open_count
            FROM student_complaint
            WHERE Student_ID = %s AND Status IN ('Pending', 'In Progress')
        """, (student_id,))
        comp_row = cursor.fetchone()
        open_complaints = comp_row["open_count"] if comp_row else 0

        return jsonify({
            "status": "success",
            "data": {
                "student": g.current_student,
                "allocation": active_alloc,
                "roommates": roommates,
                "mess": mess,
                "payments_summary": pay_summary,
                "unread_notifications": unread_notifications,
                "open_complaints": open_complaints
            }
        }), 200

    except Exception as error:
        return handle_db_error(error, "fetching student dashboard")

    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()


# =====================================================================
# PROFILE & PREFERENCES
# =====================================================================

@student_portal_bp.route("/profile", methods=["GET"], strict_slashes=False)
@student_required
def get_profile():
    """Retrieve complete profile of authenticated student, including preferences."""
    student_id = g.current_student["Student_ID"]
    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute("""
            SELECT Preference_ID, Language, Food_Preference, Sleep_Schedule, Study_Habits
            FROM student_preferences
            WHERE Student_ID = %s
            LIMIT 1
        """, (student_id,))
        pref = cursor.fetchone()

        return jsonify({
            "status": "success",
            "data": {
                **g.current_student,
                "preferences": format_row(pref) if pref else None
            }
        }), 200

    except Exception as error:
        return handle_db_error(error, "fetching student profile")

    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()


@student_portal_bp.route("/profile", methods=["PUT"], strict_slashes=False)
@student_required
def update_profile():
    """Update contact information for the authenticated student."""
    student_id = g.current_student["Student_ID"]
    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({
            "status": "error",
            "message": "A valid JSON object is required."
        }), 400

    phone = data.get("Phone") or data.get("phone")
    email = data.get("Email") or data.get("email")
    dob = data.get("DOB") or data.get("dob")

    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        updates = []
        params = []

        if phone is not None:
            clean_phone = str(phone).strip()
            if len(clean_phone) < 8:
                return jsonify({"status": "error", "message": "Phone number must be at least 8 digits."}), 400
            # Check duplicate phone
            cursor.execute("SELECT Student_ID FROM student WHERE Phone = %s AND Student_ID != %s", (clean_phone, student_id))
            if cursor.fetchone():
                return jsonify({"status": "error", "message": "Phone number is already in use by another student."}), 409
            updates.append("Phone = %s")
            params.append(clean_phone)

        if email is not None:
            clean_email = str(email).strip().lower()
            if "@" not in clean_email or "." not in clean_email:
                return jsonify({"status": "error", "message": "A valid email address is required."}), 400
            cursor.execute("SELECT Student_ID FROM student WHERE Email = %s AND Student_ID != %s", (clean_email, student_id))
            if cursor.fetchone():
                return jsonify({"status": "error", "message": "Email is already in use by another student."}), 409
            updates.append("Email = %s")
            params.append(clean_email)

        if dob is not None:
            parsed_dob, dob_err = parse_date(dob, "DOB")
            if dob_err:
                return jsonify({"status": "error", "message": dob_err}), 400
            updates.append("DOB = %s")
            params.append(parsed_dob)

        if not updates:
            return jsonify({"status": "error", "message": "No valid profile fields provided for update."}), 400

        params.append(student_id)
        cursor.execute(f"UPDATE student SET {', '.join(updates)} WHERE Student_ID = %s", tuple(params))

        # Also update student_auth if email changed
        if email is not None:
            cursor.execute("UPDATE student_auth SET Email = %s WHERE Student_ID = %s", (clean_email, student_id))

        connection.commit()

        # Fetch updated record
        cursor.execute("SELECT Student_ID, Name, Gender, DOB, Phone, Email, Department, Year_of_Study FROM student WHERE Student_ID = %s", (student_id,))
        updated_student = format_row(cursor.fetchone())

        return jsonify({
            "status": "success",
            "message": "Profile updated successfully.",
            "data": updated_student
        }), 200

    except Exception as error:
        if connection and connection.is_connected():
            connection.rollback()
        return handle_db_error(error, "updating student profile")

    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()


# =====================================================================
# ACCOMMODATION & ROOM DETAILS
# =====================================================================

@student_portal_bp.route("/allocation", methods=["GET"], strict_slashes=False)
@student_required
def get_allocation():
    """Retrieve current and historical allocations for authenticated student."""
    student_id = g.current_student["Student_ID"]
    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute("""
            SELECT ra.Allocation_ID, ra.Allocation_Date, ra.Start_Date, ra.End_Date, ra.Allocation_Status,
                   r.Room_ID, r.Room_Number, r.Floor, r.Room_Type, r.Capacity, r.Facilities,
                   b.Bed_ID, b.Bed_Number, b.Bed_Type,
                   hb.Block_ID, hb.Block_Name, hb.Gender AS Block_Gender,
                   h.Hostel_ID, h.Hostel_Name, h.Location AS Hostel_Location, h.Hostel_Type
            FROM room_allocation ra
            JOIN room r ON ra.Room_ID = r.Room_ID
            JOIN bed b ON ra.Bed_ID = b.Bed_ID
            JOIN hostel_block hb ON r.Block_ID = hb.Block_ID
            JOIN hostel h ON hb.Hostel_ID = h.Hostel_ID
            WHERE ra.Student_ID = %s
            ORDER BY ra.Allocation_ID DESC
        """, (student_id,))
        all_allocs = [format_row(row) for row in cursor.fetchall()]

        active = next((a for a in all_allocs if a.get("Allocation_Status") == "Active"), None)
        roommates = []
        if active and active.get("Room_ID"):
            cursor.execute("""
                SELECT s.Student_ID, s.Name, s.Department, s.Year_of_Study, s.Email, b.Bed_Number
                FROM room_allocation ra
                JOIN student s ON ra.Student_ID = s.Student_ID
                JOIN bed b ON ra.Bed_ID = b.Bed_ID
                WHERE ra.Room_ID = %s AND ra.Allocation_Status = 'Active' AND ra.Student_ID != %s
            """, (active["Room_ID"], student_id))
            roommates = [format_row(row) for row in cursor.fetchall()]

        return jsonify({
            "status": "success",
            "data": {
                "active_allocation": active,
                "roommates": roommates,
                "history": all_allocs
            }
        }), 200

    except Exception as error:
        return handle_db_error(error, "fetching room allocation")

    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()


# =====================================================================
# ROOM CHANGE REQUESTS
# =====================================================================

@student_portal_bp.route("/room-change-requests", methods=["GET"], strict_slashes=False)
@student_required
def get_room_change_requests():
    """Retrieve all room change requests submitted by this student."""
    student_id = g.current_student["Student_ID"]
    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute("""
            SELECT rcr.Request_ID, rcr.Student_ID, rcr.Current_Room_ID, rcr.Target_Room_Type,
                   rcr.Reason, rcr.Status, rcr.Admin_Remarks, rcr.Created_At, rcr.Updated_At,
                   r.Room_Number AS Current_Room_Number
            FROM room_change_request rcr
            LEFT JOIN room r ON rcr.Current_Room_ID = r.Room_ID
            WHERE rcr.Student_ID = %s
            ORDER BY rcr.Request_ID DESC
        """, (student_id,))
        requests_list = [format_row(row) for row in cursor.fetchall()]

        return jsonify({
            "status": "success",
            "count": len(requests_list),
            "data": requests_list
        }), 200

    except Exception as error:
        return handle_db_error(error, "fetching room change requests")

    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()


@student_portal_bp.route("/room-change-requests", methods=["POST"], strict_slashes=False)
@student_required
def create_room_change_request():
    """Submit a new room change request."""
    student_id = g.current_student["Student_ID"]
    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({
            "status": "error",
            "message": "A valid JSON object is required."
        }), 400

    target_room_type = (data.get("Target_Room_Type") or data.get("target_room_type") or "").strip()
    reason = (data.get("Reason") or data.get("reason") or "").strip()

    if not target_room_type:
        return jsonify({
            "status": "error",
            "message": "Target room type is required (e.g., Single, Double, Triple)."
        }), 400

    if not reason or len(reason) < 10:
        return jsonify({
            "status": "error",
            "message": "Please provide a detailed reason for the room change (at least 10 characters)."
        }), 400

    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        # Find current active room
        cursor.execute("""
            SELECT Room_ID FROM room_allocation
            WHERE Student_ID = %s AND Allocation_Status = 'Active'
            LIMIT 1
        """, (student_id,))
        alloc_row = cursor.fetchone()
        current_room_id = alloc_row["Room_ID"] if alloc_row else None

        # Check for duplicate pending requests
        cursor.execute("""
            SELECT Request_ID FROM room_change_request
            WHERE Student_ID = %s AND Status = 'Pending'
        """, (student_id,))
        if cursor.fetchone():
            return jsonify({
                "status": "error",
                "message": "You already have a pending room change request under committee review."
            }), 409

        cursor.execute("""
            INSERT INTO room_change_request (Student_ID, Current_Room_ID, Target_Room_Type, Reason, Status)
            VALUES (%s, %s, %s, %s, 'Pending')
        """, (student_id, current_room_id, target_room_type, reason))
        request_id = cursor.lastrowid

        # Create student confirmation notification
        cursor.execute("""
            INSERT INTO student_notification (Student_ID, Title, Message, Category, Is_Read)
            VALUES (%s, 'Room Change Request Submitted', 
                    CONCAT('Your request to change to a ', %s, ' room has been submitted for review.'), 
                    'Accommodation', 0)
        """, (student_id, target_room_type))

        connection.commit()

        cursor.execute("""
            SELECT Request_ID, Student_ID, Current_Room_ID, Target_Room_Type, Reason, Status, Created_At
            FROM room_change_request WHERE Request_ID = %s
        """, (request_id,))
        new_req = format_row(cursor.fetchone())

        return jsonify({
            "status": "success",
            "message": "Room change request submitted successfully.",
            "data": new_req
        }), 201

    except Exception as error:
        if connection and connection.is_connected():
            connection.rollback()
        return handle_db_error(error, "creating room change request")

    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()


# =====================================================================
# MESS SUBSCRIPTION
# =====================================================================

@student_portal_bp.route("/mess", methods=["GET"], strict_slashes=False)
@student_required
def get_mess_subscription():
    """Retrieve the mess subscription details for the student."""
    student_id = g.current_student["Student_ID"]
    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute("""
            SELECT Subscription_ID, Student_ID, Plan_Name, Monthly_Cost, Status, Dietary_Remarks,
                   Start_Date, End_Date, Created_At, Updated_At
            FROM mess_subscription
            WHERE Student_ID = %s
            ORDER BY Subscription_ID DESC
        """, (student_id,))
        subscriptions = [format_row(row) for row in cursor.fetchall()]

        active = next((s for s in subscriptions if s.get("Status") == "Active"), None)

        return jsonify({
            "status": "success",
            "data": {
                "active_subscription": active,
                "history": subscriptions
            }
        }), 200

    except Exception as error:
        return handle_db_error(error, "fetching mess subscription")

    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()


@student_portal_bp.route("/mess", methods=["PUT"], strict_slashes=False)
@student_required
def update_mess_subscription():
    """Update active mess plan or dietary preferences."""
    student_id = g.current_student["Student_ID"]
    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({
            "status": "error",
            "message": "A valid JSON object is required."
        }), 400

    plan_name = (data.get("Plan_Name") or data.get("plan_name") or "").strip()
    dietary_remarks = (data.get("Dietary_Remarks") or data.get("dietary_remarks") or "").strip()

    cost_map = {
        "Standard Veg": 3500.00,
        "Special Non-Veg": 4500.00,
        "Deluxe Combo": 5200.00,
        "Jain Food": 3500.00
    }

    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute("""
            SELECT Subscription_ID FROM mess_subscription
            WHERE Student_ID = %s AND Status = 'Active'
            ORDER BY Subscription_ID DESC LIMIT 1
        """, (student_id,))
        active_sub = cursor.fetchone()

        monthly_cost = cost_map.get(plan_name, 3800.00)

        if active_sub:
            sub_id = active_sub["Subscription_ID"]
            cursor.execute("""
                UPDATE mess_subscription
                SET Plan_Name = %s, Monthly_Cost = %s, Dietary_Remarks = %s
                WHERE Subscription_ID = %s
            """, (plan_name or "Standard Veg", monthly_cost, dietary_remarks, sub_id))
        else:
            cursor.execute("""
                INSERT INTO mess_subscription (Student_ID, Plan_Name, Monthly_Cost, Status, Dietary_Remarks, Start_Date)
                VALUES (%s, %s, %s, 'Active', %s, CURDATE())
            """, (student_id, plan_name or "Standard Veg", monthly_cost, dietary_remarks))
            sub_id = cursor.lastrowid

        # Add notification
        cursor.execute("""
            INSERT INTO student_notification (Student_ID, Title, Message, Category, Is_Read)
            VALUES (%s, 'Mess Plan Updated', CONCAT('Your mess subscription is now ', %s), 'Mess', 0)
        """, (student_id, plan_name or "Standard Veg"))

        connection.commit()

        cursor.execute("SELECT * FROM mess_subscription WHERE Subscription_ID = %s", (sub_id,))
        updated = format_row(cursor.fetchone())

        return jsonify({
            "status": "success",
            "message": "Mess subscription updated successfully.",
            "data": updated
        }), 200

    except Exception as error:
        if connection and connection.is_connected():
            connection.rollback()
        return handle_db_error(error, "updating mess subscription")

    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()


# =====================================================================
# PAYMENTS & BILLING
# =====================================================================

@student_portal_bp.route("/payments", methods=["GET"], strict_slashes=False)
@student_required
def get_student_payments():
    """Retrieve all payment records and fee summary for authenticated student."""
    student_id = g.current_student["Student_ID"]
    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute("""
            SELECT Payment_ID, Student_ID, Amount, Payment_Date,
                   Payment_Method, Payment_Status, Payment_Type, Transaction_Reference
            FROM payment
            WHERE Student_ID = %s
            ORDER BY Payment_ID DESC
        """, (student_id,))
        payments = [format_row(row) for row in cursor.fetchall()]

        total_paid = sum(p["Amount"] for p in payments if p.get("Payment_Status") == "Paid")
        total_pending = sum(p["Amount"] for p in payments if p.get("Payment_Status") == "Pending")

        return jsonify({
            "status": "success",
            "count": len(payments),
            "summary": {
                "total_paid": total_paid,
                "total_pending": total_pending,
                "total_transactions": len(payments)
            },
            "data": payments
        }), 200

    except Exception as error:
        return handle_db_error(error, "retrieving student payments")

    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()


# =====================================================================
# NOTIFICATIONS
# =====================================================================

@student_portal_bp.route("/notifications", methods=["GET"], strict_slashes=False)
@student_required
def get_notifications():
    """Retrieve all notifications for the authenticated student."""
    student_id = g.current_student["Student_ID"]
    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute("""
            SELECT Notification_ID, Student_ID, Title, Message, Category, Is_Read, Created_At
            FROM student_notification
            WHERE Student_ID = %s
            ORDER BY Notification_ID DESC
        """, (student_id,))
        notifications = [format_row(row) for row in cursor.fetchall()]

        unread_count = sum(1 for n in notifications if not n.get("Is_Read"))

        return jsonify({
            "status": "success",
            "count": len(notifications),
            "unread_count": unread_count,
            "data": notifications
        }), 200

    except Exception as error:
        return handle_db_error(error, "fetching notifications")

    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()


@student_portal_bp.route("/notifications/<int:notification_id>/read", methods=["PUT"], strict_slashes=False)
@student_required
def mark_notification_read(notification_id):
    """Mark a specific notification as read, strictly scoped to this student."""
    student_id = g.current_student["Student_ID"]
    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute("""
            UPDATE student_notification
            SET Is_Read = 1
            WHERE Notification_ID = %s AND Student_ID = %s
        """, (notification_id, student_id))
        connection.commit()

        if cursor.rowcount == 0:
            return jsonify({
                "status": "error",
                "message": "Notification not found or access denied."
            }), 404

        return jsonify({
            "status": "success",
            "message": "Notification marked as read."
        }), 200

    except Exception as error:
        if connection and connection.is_connected():
            connection.rollback()
        return handle_db_error(error, "marking notification read")

    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()


@student_portal_bp.route("/notifications/read-all", methods=["PUT"], strict_slashes=False)
@student_required
def mark_all_notifications_read():
    """Mark all notifications as read for this student."""
    student_id = g.current_student["Student_ID"]
    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor()

        cursor.execute("""
            UPDATE student_notification
            SET Is_Read = 1
            WHERE Student_ID = %s AND Is_Read = 0
        """, (student_id,))
        connection.commit()

        return jsonify({
            "status": "success",
            "message": "All notifications marked as read."
        }), 200

    except Exception as error:
        if connection and connection.is_connected():
            connection.rollback()
        return handle_db_error(error, "marking all notifications read")

    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()


# =====================================================================
# HELP & SUPPORT / COMPLAINTS
# =====================================================================

@student_portal_bp.route("/complaints", methods=["GET"], strict_slashes=False)
@student_required
def get_complaints():
    """Retrieve all complaints/tickets filed by this student."""
    student_id = g.current_student["Student_ID"]
    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute("""
            SELECT Complaint_ID, Student_ID, Category, Title, Description,
                   Priority, Status, Resolution_Notes, Created_At, Updated_At
            FROM student_complaint
            WHERE Student_ID = %s
            ORDER BY Complaint_ID DESC
        """, (student_id,))
        complaints = [format_row(row) for row in cursor.fetchall()]

        return jsonify({
            "status": "success",
            "count": len(complaints),
            "data": complaints
        }), 200

    except Exception as error:
        return handle_db_error(error, "fetching complaints")

    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()


@student_portal_bp.route("/complaints", methods=["POST"], strict_slashes=False)
@student_required
def create_complaint():
    """Submit a new complaint or support ticket."""
    student_id = g.current_student["Student_ID"]
    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({
            "status": "error",
            "message": "A valid JSON object is required."
        }), 400

    category = (data.get("Category") or data.get("category") or "Maintenance").strip()
    title = (data.get("Title") or data.get("title") or "").strip()
    description = (data.get("Description") or data.get("description") or "").strip()
    priority = (data.get("Priority") or data.get("priority") or "Medium").strip()

    valid_categories = ("Maintenance", "Cleanliness", "Electrical", "Plumbing", "Wi-Fi/Network", "Noise/Discipline", "Mess/Food", "Other")
    if category not in valid_categories:
        category = "Maintenance"

    valid_priorities = ("Low", "Medium", "High", "Urgent")
    if priority not in valid_priorities:
        priority = "Medium"

    if not title or len(title) < 3:
        return jsonify({
            "status": "error",
            "message": "Complaint title is required (at least 3 characters)."
        }), 400

    if not description or len(description) < 10:
        return jsonify({
            "status": "error",
            "message": "Please provide a detailed description (at least 10 characters)."
        }), 400

    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute("""
            INSERT INTO student_complaint (Student_ID, Category, Title, Description, Priority, Status)
            VALUES (%s, %s, %s, %s, %s, 'Pending')
        """, (student_id, category, title, description, priority))
        complaint_id = cursor.lastrowid

        # Notification
        cursor.execute("""
            INSERT INTO student_notification (Student_ID, Title, Message, Category, Is_Read)
            VALUES (%s, 'Support Ticket Created', 
                    CONCAT('Ticket #', %s, ' (', %s, ') has been assigned to the maintenance desk.'), 
                    'Support', 0)
        """, (student_id, complaint_id, title))

        connection.commit()

        cursor.execute("SELECT * FROM student_complaint WHERE Complaint_ID = %s", (complaint_id,))
        created = format_row(cursor.fetchone())

        return jsonify({
            "status": "success",
            "message": "Complaint registered successfully. Our hostel team will investigate.",
            "data": created
        }), 201

    except Exception as error:
        if connection and connection.is_connected():
            connection.rollback()
        return handle_db_error(error, "creating complaint")

    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()


# =====================================================================
# ROOMMATE PREFERENCES
# =====================================================================

@student_portal_bp.route("/preferences", methods=["GET"], strict_slashes=False)
@student_required
def get_preferences():
    """Retrieve living/roommate preferences for this student."""
    student_id = g.current_student["Student_ID"]
    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute("""
            SELECT Preference_ID, Student_ID, Language, Food_Preference, Sleep_Schedule, Study_Habits
            FROM student_preferences
            WHERE Student_ID = %s
            LIMIT 1
        """, (student_id,))
        pref = cursor.fetchone()

        return jsonify({
            "status": "success",
            "data": format_row(pref) if pref else None
        }), 200

    except Exception as error:
        return handle_db_error(error, "retrieving student preferences")

    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()


@student_portal_bp.route("/preferences", methods=["PUT"], strict_slashes=False)
@student_required
def update_preferences():
    """Update roommate / living preferences for this student."""
    student_id = g.current_student["Student_ID"]
    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({
            "status": "error",
            "message": "A valid JSON object is required."
        }), 400

    language = (data.get("Language") or data.get("language") or "English").strip()
    food_pref = (data.get("Food_Preference") or data.get("food_preference") or "Vegetarian").strip()
    sleep_sched = (data.get("Sleep_Schedule") or data.get("sleep_schedule") or "Flexible").strip()
    study_habits = (data.get("Study_Habits") or data.get("study_habits") or "Flexible").strip()

    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute("SELECT Preference_ID FROM student_preferences WHERE Student_ID = %s", (student_id,))
        existing = cursor.fetchone()

        if existing:
            cursor.execute("""
                UPDATE student_preferences
                SET Language = %s, Food_Preference = %s, Sleep_Schedule = %s, Study_Habits = %s
                WHERE Student_ID = %s
            """, (language, food_pref, sleep_sched, study_habits, student_id))
        else:
            cursor.execute("SELECT COALESCE(MAX(Preference_ID), 0) + 1 AS next_pid FROM student_preferences")
            next_pid = cursor.fetchone()["next_pid"]
            cursor.execute("""
                INSERT INTO student_preferences (Preference_ID, Student_ID, Language, Food_Preference, Sleep_Schedule, Study_Habits)
                VALUES (%s, %s, %s, %s, %s, %s)
            """, (next_pid, student_id, language, food_pref, sleep_sched, study_habits))

        connection.commit()

        cursor.execute("SELECT * FROM student_preferences WHERE Student_ID = %s", (student_id,))
        updated = format_row(cursor.fetchone())

        return jsonify({
            "status": "success",
            "message": "Roommate preferences updated successfully.",
            "data": updated
        }), 200

    except Exception as error:
        if connection and connection.is_connected():
            connection.rollback()
        return handle_db_error(error, "updating preferences")

    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()
