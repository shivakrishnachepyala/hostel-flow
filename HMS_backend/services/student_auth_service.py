import datetime
import time
import secrets
import hmac
import hashlib
import jwt
from functools import wraps
from flask import request, jsonify, g
from config import Config
from db import get_db_connection
from services.auth_service import hash_password, verify_password


def generate_student_csrf_token(student_id: int) -> str:
    """Generate a signed, timestamped CSRF token tied to a specific Student ID."""
    timestamp = int(time.time())
    rand_salt = secrets.token_hex(16)
    message = f"student:{student_id}:{timestamp}:{rand_salt}"
    signature = hmac.new(
        Config.SECRET_KEY.encode("utf-8"),
        message.encode("utf-8"),
        hashlib.sha256
    ).hexdigest()
    return f"{message}:{signature}"


def validate_student_csrf_token(token: str, student_id: int, max_age: int = 86400) -> bool:
    """Validate the signature, age, and Student ownership of a CSRF token."""
    if not token or not isinstance(token, str):
        return False
    parts = token.split(":")
    if len(parts) != 5:
        # Also allow warden csrf token format (4 parts) if compatible or check prefix
        return False

    prefix, t_student_id, t_time, t_rand, t_sig = parts
    if prefix != "student":
        return False

    try:
        if int(t_student_id) != student_id:
            return False
        timestamp = int(t_time)
        if (time.time() - timestamp) > max_age:
            return False
    except (ValueError, TypeError):
        return False

    expected_message = f"student:{t_student_id}:{t_time}:{t_rand}"
    expected_sig = hmac.new(
        Config.SECRET_KEY.encode("utf-8"),
        expected_message.encode("utf-8"),
        hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected_sig, t_sig)


def generate_student_token(student_id: int, email: str, token_version: int, expires_in: int = None) -> str:
    """Generate a signed JWT access token for a Student."""
    now = datetime.datetime.now(datetime.timezone.utc)
    expiration = now + datetime.timedelta(seconds=expires_in or 86400)  # 24-hour student session
    payload = {
        "sub": str(student_id),
        "email": email,
        "role": "Student",
        "token_version": token_version,
        "iat": int(now.timestamp()),
        "exp": int(expiration.timestamp()),
    }
    return jwt.encode(payload, Config.JWT_SECRET_KEY, algorithm="HS256")


def decode_student_token(token: str) -> dict:
    """Decode and verify a Student JWT access token."""
    return jwt.decode(token, Config.JWT_SECRET_KEY, algorithms=["HS256"])


def authenticate_student(identifier: str, password: str):
    """
    Authenticate a Student by email, student ID, or phone number.
    Returns (student_dict, token, None) on success, or (None, None, error_message) on failure.
    """
    if not identifier or not password:
        return None, None, "Student ID / email and password are required."

    clean_id = str(identifier).strip()
    connection = None
    cursor = None
    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        # Check by Student_ID, Email, or Phone
        query = """
            SELECT sa.Auth_ID, sa.Student_ID, sa.Email, sa.Password_Hash, sa.Is_Active, sa.Token_Version,
                   s.Name, s.Gender, s.DOB, s.Phone, s.Department, s.Year_of_Study
            FROM student_auth sa
            JOIN student s ON sa.Student_ID = s.Student_ID
            WHERE sa.Email = %s OR s.Phone = %s
        """
        params = [clean_id, clean_id]

        # If identifier is numeric, also check Student_ID
        if clean_id.isdigit():
            query += " OR sa.Student_ID = %s"
            params.append(int(clean_id))

        query += " LIMIT 1"

        cursor.execute(query, tuple(params))
        record = cursor.fetchone()

        if not record:
            return None, None, "Invalid student credentials."

        if not record["Is_Active"]:
            return None, None, "Your student account is deactivated. Please contact the hostel administration."

        if not verify_password(password, record["Password_Hash"]):
            return None, None, "Invalid student credentials."

        # Update Last_Login
        cursor.execute("""
            UPDATE student_auth
            SET Last_Login = CURRENT_TIMESTAMP
            WHERE Student_ID = %s
        """, (record["Student_ID"],))
        connection.commit()

        token = generate_student_token(
            student_id=record["Student_ID"],
            email=record["Email"],
            token_version=record["Token_Version"]
        )

        safe_student = {
            "Student_ID": record["Student_ID"],
            "Name": record["Name"],
            "Email": record["Email"],
            "Phone": record["Phone"],
            "Gender": record["Gender"],
            "DOB": record["DOB"].strftime("%Y-%m-%d") if record.get("DOB") else None,
            "Department": record["Department"],
            "Year_of_Study": record["Year_of_Study"],
            "Role": "Student"
        }

        return safe_student, token, None

    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()


def invalidate_student_session(student_id: int) -> bool:
    """Increment Token_Version for the Student, invalidating all issued tokens."""
    connection = None
    cursor = None
    try:
        connection = get_db_connection()
        cursor = connection.cursor()
        cursor.execute("""
            UPDATE student_auth
            SET Token_Version = Token_Version + 1
            WHERE Student_ID = %s
        """, (student_id,))
        connection.commit()
        return True
    except Exception as err:
        if connection and connection.is_connected():
            connection.rollback()
        print("Failed to invalidate student session:", repr(err))
        return False
    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()


def student_required(fn):
    """
    Decorator to protect Student Portal endpoints.
    Verifies JWT token from Authorization header or HttpOnly cookie (student_access_token or access_token).
    Ensures the user has the 'Student' role and is active.
    Applies CSRF protection on state-changing requests when authenticated via cookie.
    Attaches student record to flask.g.current_student.
    """
    @wraps(fn)
    def decorated_function(*args, **kwargs):
        token = None
        token_source = None

        # 1. Check Authorization header
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ", 1)[1].strip()
            token_source = "header"

        # 2. Check HttpOnly cookies
        if not token:
            token = request.cookies.get("student_access_token")
            if token:
                token_source = "cookie"

        if not token:
            token = request.cookies.get("access_token")
            if token:
                token_source = "cookie"

        if not token:
            return jsonify({
                "status": "error",
                "message": "Authentication required. Missing student token."
            }), 401

        try:
            payload = decode_student_token(token)
        except jwt.ExpiredSignatureError:
            return jsonify({
                "status": "error",
                "message": "Student session has expired. Please log in again."
            }), 401
        except jwt.InvalidTokenError:
            return jsonify({
                "status": "error",
                "message": "Invalid student authentication token."
            }), 401

        # Verify role is Student
        if payload.get("role") != "Student":
            return jsonify({
                "status": "error",
                "message": "Access denied. Student authorization required."
            }), 403

        sub = payload.get("sub")
        try:
            student_id = int(sub)
        except (ValueError, TypeError):
            return jsonify({
                "status": "error",
                "message": "Invalid student token subject."
            }), 401

        token_version = payload.get("token_version")

        connection = None
        cursor = None
        try:
            connection = get_db_connection()
            cursor = connection.cursor(dictionary=True)

            cursor.execute("""
                SELECT sa.Auth_ID, sa.Student_ID, sa.Email, sa.Is_Active, sa.Token_Version,
                       s.Name, s.Gender, s.DOB, s.Phone, s.Department, s.Year_of_Study
                FROM student_auth sa
                JOIN student s ON sa.Student_ID = s.Student_ID
                WHERE sa.Student_ID = %s
            """, (student_id,))

            student = cursor.fetchone()

            if not student:
                return jsonify({
                    "status": "error",
                    "message": "Student account not found."
                }), 401

            if not student["Is_Active"]:
                return jsonify({
                    "status": "error",
                    "message": "Student account has been deactivated."
                }), 403

            if student["Token_Version"] != token_version:
                return jsonify({
                    "status": "error",
                    "message": "Student session has expired or was revoked. Please log in again."
                }), 401

            # CSRF Protection on state-changing requests when authenticated via cookie
            if token_source == "cookie" and request.method in ("POST", "PUT", "DELETE", "PATCH"):
                req_origin = request.headers.get("Origin")
                if req_origin:
                    allowed = [o.rstrip("/") for o in Config.CORS_ORIGINS]
                    if req_origin.rstrip("/") not in allowed:
                        return jsonify({
                            "status": "error",
                            "message": "Cross-Origin request blocked. Origin not permitted."
                        }), 403
                elif request.headers.get("Referer"):
                    referer = request.headers.get("Referer")
                    if not any(referer.startswith(o) for o in Config.CORS_ORIGINS):
                        return jsonify({
                            "status": "error",
                            "message": "Referer header verification failed."
                        }), 403

                header_csrf = request.headers.get("X-CSRF-Token")
                cookie_csrf = request.cookies.get("student_csrf_token") or request.cookies.get("csrf_token")

                if not header_csrf:
                    return jsonify({
                        "status": "error",
                        "message": "CSRF verification failed. Missing X-CSRF-Token header."
                    }), 403

                if cookie_csrf and header_csrf != cookie_csrf:
                    return jsonify({
                        "status": "error",
                        "message": "CSRF verification failed. Token mismatch."
                    }), 403

                if not validate_student_csrf_token(header_csrf, student_id):
                    # Also accept standard signed CSRF token if signed with SECRET_KEY
                    from services.auth_service import validate_csrf_token
                    if not validate_csrf_token(header_csrf, student_id):
                        return jsonify({
                            "status": "error",
                            "message": "CSRF verification failed. Token is invalid or expired."
                        }), 403

            # Format DOB if present
            if student.get("DOB"):
                student["DOB"] = student["DOB"].strftime("%Y-%m-%d")

            student["Role"] = "Student"
            g.current_student = student

        finally:
            if cursor:
                cursor.close()
            if connection and connection.is_connected():
                connection.close()

        return fn(*args, **kwargs)

    return decorated_function
