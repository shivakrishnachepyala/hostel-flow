import datetime
import time
import secrets
import hmac
import hashlib
import bcrypt
import jwt
from functools import wraps
from flask import request, jsonify, g
from config import Config
from db import get_db_connection


def generate_csrf_token(warden_id: int) -> str:
    """Generate a signed, timestamped CSRF token tied to a specific Warden ID."""
    timestamp = int(time.time())
    rand_salt = secrets.token_hex(16)
    message = f"{warden_id}:{timestamp}:{rand_salt}"
    signature = hmac.new(
        Config.SECRET_KEY.encode("utf-8"),
        message.encode("utf-8"),
        hashlib.sha256
    ).hexdigest()
    return f"{message}:{signature}"


def validate_csrf_token(token: str, warden_id: int, max_age: int = 86400) -> bool:
    """Validate the signature, age, and Warden ownership of a CSRF token."""
    if not token or not isinstance(token, str):
        return False
    parts = token.split(":")
    if len(parts) != 4:
        return False

    t_warden_id, t_time, t_rand, t_sig = parts
    try:
        if int(t_warden_id) != warden_id:
            return False
        timestamp = int(t_time)
        if (time.time() - timestamp) > max_age:
            return False
    except (ValueError, TypeError):
        return False

    expected_message = f"{t_warden_id}:{t_time}:{t_rand}"
    expected_sig = hmac.new(
        Config.SECRET_KEY.encode("utf-8"),
        expected_message.encode("utf-8"),
        hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected_sig, t_sig)


def hash_password(plaintext_password: str) -> str:
    """Hash a plaintext password using bcrypt."""
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(plaintext_password.encode("utf-8"), salt).decode("utf-8")


def verify_password(plaintext_password: str, hashed_password: str) -> bool:
    """Verify a plaintext password against a stored bcrypt hash."""
    try:
        return bcrypt.checkpw(
            plaintext_password.encode("utf-8"),
            hashed_password.encode("utf-8")
        )
    except Exception:
        return False


def generate_token(warden_id: int, username: str, role: str, token_version: int, expires_in: int = None) -> str:
    """Generate a signed JWT access token for a Warden."""
    now = datetime.datetime.now(datetime.timezone.utc)
    expiration = now + datetime.timedelta(seconds=expires_in or Config.JWT_ACCESS_TOKEN_EXPIRES)
    payload = {
        "sub": str(warden_id),
        "username": username,
        "role": role,
        "token_version": token_version,
        "iat": int(now.timestamp()),
        "exp": int(expiration.timestamp()),
    }
    return jwt.encode(payload, Config.JWT_SECRET_KEY, algorithm="HS256")


def decode_token(token: str) -> dict:
    """Decode and verify a JWT access token."""
    return jwt.decode(token, Config.JWT_SECRET_KEY, algorithms=["HS256"])


def authenticate_warden(username_or_email: str, password: str):
    """
    Authenticate a Warden by username or email.
    Returns (warden_dict, token, None) on success, or (None, None, error_message) on failure.
    """
    if not username_or_email or not password:
        return None, None, "Username and password are required."

    connection = None
    cursor = None
    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute("""
            SELECT Warden_ID, Warden_Name, Username, Email, Password_Hash, Role, Is_Active, Token_Version
            FROM warden_auth
            WHERE Username = %s OR Email = %s
            LIMIT 1
        """, (username_or_email.strip(), username_or_email.strip()))

        warden = cursor.fetchone()

        if not warden:
            return None, None, "Invalid credentials."

        if not warden["Is_Active"]:
            return None, None, "Account is disabled. Please contact the administrator."

        if not verify_password(password, warden["Password_Hash"]):
            return None, None, "Invalid credentials."

        # Update Last_Login timestamp
        cursor.execute("""
            UPDATE warden_auth
            SET Last_Login = CURRENT_TIMESTAMP
            WHERE Warden_ID = %s
        """, (warden["Warden_ID"],))
        connection.commit()

        token = generate_token(
            warden_id=warden["Warden_ID"],
            username=warden["Username"],
            role=warden["Role"],
            token_version=warden["Token_Version"]
        )

        # Remove sensitive hash before returning
        safe_warden = {
            "Warden_ID": warden["Warden_ID"],
            "Warden_Name": warden["Warden_Name"],
            "Username": warden["Username"],
            "Email": warden["Email"],
            "Role": warden["Role"]
        }

        return safe_warden, token, None

    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()


def invalidate_warden_session(warden_id: int) -> bool:
    """
    Increment Token_Version for the Warden, instantly invalidating all previously issued tokens.
    """
    connection = None
    cursor = None
    try:
        connection = get_db_connection()
        cursor = connection.cursor()
        cursor.execute("""
            UPDATE warden_auth
            SET Token_Version = Token_Version + 1
            WHERE Warden_ID = %s
        """, (warden_id,))
        connection.commit()
        return True
    except Exception as err:
        if connection and connection.is_connected():
            connection.rollback()
        print("Failed to invalidate session:", repr(err))
        return False
    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()


def provision_warden(name: str, username: str, email: str, password: str, role: str = "Warden"):
    """
    Provision a new Warden account.
    Returns (warden_id, None) on success, or (None, error_message) on failure.
    Enforces a strict password policy: at least 12 characters.
    """
    if not name or not name.strip():
        return None, "Warden name is required."
    if not username or not username.strip():
        return None, "Username is required."
    if not password or len(password) < 12:
        return None, "Password must be at least 12 characters long."

    connection = None
    cursor = None
    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute("SELECT Warden_ID FROM warden_auth WHERE Username = %s", (username.strip(),))
        if cursor.fetchone():
            return None, f"Username '{username.strip()}' is already taken."

        email_val = email.strip() if email and email.strip() else None
        if email_val:
            cursor.execute("SELECT Warden_ID FROM warden_auth WHERE Email = %s", (email_val,))
            if cursor.fetchone():
                return None, f"Email '{email_val}' is already registered."

        pw_hash = hash_password(password)

        cursor.execute("""
            INSERT INTO warden_auth (Warden_Name, Username, Email, Password_Hash, Role, Is_Active, Token_Version)
            VALUES (%s, %s, %s, %s, %s, 1, 1)
        """, (name.strip(), username.strip(), email_val, pw_hash, role))

        connection.commit()
        return cursor.lastrowid, None

    except Exception as err:
        if connection and connection.is_connected():
            connection.rollback()
        return None, str(err)
    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()


def warden_required(fn):
    """
    Decorator to protect administrative endpoints.
    Accepts JWT from Authorization header (Bearer <token>) or HttpOnly cookie (access_token).
    Enforces server-side CSRF protection on all state-changing requests (POST, PUT, DELETE, PATCH)
    when authentication is supplied via ambient cookies.
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

        # 2. Check HttpOnly cookie
        if not token:
            token = request.cookies.get("access_token")
            if token:
                token_source = "cookie"

        if not token:
            return jsonify({
                "status": "error",
                "message": "Authentication required. Missing token."
            }), 401

        try:
            payload = decode_token(token)
        except jwt.ExpiredSignatureError:
            return jsonify({
                "status": "error",
                "message": "Authentication token has expired. Please log in again."
            }), 401
        except jwt.InvalidTokenError:
            return jsonify({
                "status": "error",
                "message": "Invalid authentication token."
            }), 401

        # Verify Warden in database
        sub = payload.get("sub")
        try:
            warden_id = int(sub)
        except (ValueError, TypeError):
            return jsonify({
                "status": "error",
                "message": "Invalid authentication token subject."
            }), 401
        token_version = payload.get("token_version")

        connection = None
        cursor = None
        try:
            connection = get_db_connection()
            cursor = connection.cursor(dictionary=True)

            cursor.execute("""
                SELECT Warden_ID, Warden_Name, Username, Role, Is_Active, Token_Version
                FROM warden_auth
                WHERE Warden_ID = %s
            """, (warden_id,))

            warden = cursor.fetchone()

            if not warden:
                return jsonify({
                    "status": "error",
                    "message": "Warden account not found."
                }), 401

            if not warden["Is_Active"]:
                return jsonify({
                    "status": "error",
                    "message": "Account has been deactivated."
                }), 403

            if warden["Token_Version"] != token_version:
                return jsonify({
                    "status": "error",
                    "message": "Session has expired or was revoked. Please log in again."
                }), 401

            # CSRF Protection for state-changing requests when authenticated via cookie
            if token_source == "cookie" and request.method in ("POST", "PUT", "DELETE", "PATCH"):
                # 1. Origin and Referer validation
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

                # 2. CSRF Token validation (Double Submit Cookie + Cryptographic Signature Check)
                header_csrf = request.headers.get("X-CSRF-Token")
                cookie_csrf = request.cookies.get("csrf_token")

                if not header_csrf:
                    return jsonify({
                        "status": "error",
                        "message": "CSRF verification failed. Missing X-CSRF-Token header."
                    }), 403

                if not cookie_csrf or header_csrf != cookie_csrf:
                    return jsonify({
                        "status": "error",
                        "message": "CSRF verification failed. Token mismatch."
                    }), 403

                if not validate_csrf_token(header_csrf, warden_id):
                    return jsonify({
                        "status": "error",
                        "message": "CSRF verification failed. Token is invalid or expired."
                    }), 403

            g.current_warden = warden

        finally:
            if cursor:
                cursor.close()
            if connection and connection.is_connected():
                connection.close()

        return fn(*args, **kwargs)

    return decorated_function


def get_current_warden():
    """
    Safely retrieves the authenticated Warden from Authorization header or HttpOnly cookie.
    Returns the warden dictionary if authenticated and valid, or None if anonymous/unauthenticated.
    Does not raise exceptions or return 401, enabling tiered public/private endpoint logic.
    """
    token = None
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ", 1)[1].strip()

    if not token:
        token = request.cookies.get("access_token")

    if not token:
        return None

    try:
        payload = decode_token(token)
        sub = payload.get("sub")
        if not sub:
            return None
        warden_id = int(sub)
        token_version = payload.get("token_version")
    except Exception:
        return None

    connection = None
    cursor = None
    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)
        cursor.execute("""
            SELECT Warden_ID, Warden_Name, Username, Role, Is_Active, Token_Version
            FROM warden_auth
            WHERE Warden_ID = %s
        """, (warden_id,))
        warden = cursor.fetchone()

        if warden and warden.get("Is_Active") and warden.get("Token_Version") == token_version:
            return warden
        return None
    except Exception:
        return None
    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()
