import os
import urllib.parse
from flask import Blueprint, jsonify, request, g, make_response
from config import Config
from services.auth_service import (
    authenticate_warden,
    invalidate_warden_session,
    warden_required,
    generate_csrf_token,
    is_origin_allowed
)
from services.rate_limiter import (
    check_login_rate_limit,
    record_login_attempt,
    record_login_failure,
    reset_login_failures
)

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")


@auth_bp.route("/login", methods=["POST"], strict_slashes=False)
def login():
    # 1. Extract client IP and record attempt
    client_ip = request.headers.get("X-Forwarded-For", request.remote_addr or "127.0.0.1").split(",")[0].strip()
    record_login_attempt(client_ip)

    # 2. Check JSON payload
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify({
            "status": "error",
            "message": "A valid JSON object is required."
        }), 400

    username = data.get("username") or data.get("username_or_email")
    password = data.get("password")

    if not username or not password:
        return jsonify({
            "status": "error",
            "message": "Username and password are required."
        }), 400

    # 3. Origin check (prevent cross-origin login CSRF / credentials abuse)
    req_origin = request.headers.get("Origin")
    if req_origin and not is_origin_allowed(req_origin):
        return jsonify({
            "status": "error",
            "message": "Cross-Origin login request rejected."
        }), 403

    # 4. Check rate limits (both IP-based and Username-based)
    allowed, retry_after, reason = check_login_rate_limit(client_ip, username)
    if not allowed:
        resp = make_response(jsonify({
            "status": "error",
            "message": reason,
            "retry_after": retry_after
        }), 429)
        resp.headers["Retry-After"] = str(retry_after)
        return resp

    # 5. Authenticate credentials
    warden, token, err = authenticate_warden(username, password)
    if err:
        record_login_failure(client_ip, username)
        status_code = 403 if "disabled" in err.lower() else 401
        return jsonify({
            "status": "error",
            "message": err
        }), status_code

    # 6. Reset failed attempts for legitimate warden
    reset_login_failures(username)

    # 7. Generate CSRF token for the session
    csrf_token = generate_csrf_token(warden["Warden_ID"])

    # Dual-channel auth response: provide token in JSON for cross-site / external clients
    # while preserving HttpOnly cookie for same-site security
    response_data = {
        "status": "success",
        "message": "Login successful.",
        "warden": warden,
        "token": token,
        "access_token": token,
        "csrf_token": csrf_token
    }

    response = make_response(jsonify(response_data), 200)

    # 8. Set HttpOnly JWT access cookie
    response.set_cookie(
        "access_token",
        token,
        httponly=True,
        secure=Config.COOKIE_SECURE,
        samesite=Config.COOKIE_SAMESITE,
        max_age=Config.JWT_ACCESS_TOKEN_EXPIRES,
        path="/"
    )

    # 9. Set non-HttpOnly CSRF token cookie (for Double-Submit pattern & frontend verification)
    response.set_cookie(
        "csrf_token",
        csrf_token,
        httponly=False,
        secure=Config.COOKIE_SECURE,
        samesite=Config.COOKIE_SAMESITE,
        max_age=Config.JWT_ACCESS_TOKEN_EXPIRES,
        path="/"
    )

    return response


@auth_bp.route("/logout", methods=["POST"], strict_slashes=False)
@warden_required
def logout():
    warden_id = g.current_warden.get("Warden_ID")
    if warden_id:
        invalidate_warden_session(warden_id)

    response = make_response(jsonify({
        "status": "success",
        "message": "Logged out successfully. Session invalidated."
    }), 200)

    # Clear both cookies
    response.set_cookie(
        "access_token",
        "",
        httponly=True,
        secure=Config.COOKIE_SECURE,
        samesite=Config.COOKIE_SAMESITE,
        expires=0,
        max_age=0,
        path="/"
    )
    response.set_cookie(
        "csrf_token",
        "",
        httponly=False,
        secure=Config.COOKIE_SECURE,
        samesite=Config.COOKIE_SAMESITE,
        expires=0,
        max_age=0,
        path="/"
    )

    return response


@auth_bp.route("/me", methods=["GET"], strict_slashes=False)
@warden_required
def get_current_warden():
    csrf_token = generate_csrf_token(g.current_warden["Warden_ID"])
    auth_header = request.headers.get("Authorization")
    token = auth_header.split(" ", 1)[1].strip() if auth_header and auth_header.startswith("Bearer ") else request.cookies.get("access_token")

    response_data = {
        "status": "success",
        "warden": g.current_warden,
        "csrf_token": csrf_token
    }
    if token:
        response_data["token"] = token
        response_data["access_token"] = token

    response = make_response(jsonify(response_data), 200)

    # Refresh the csrf_token cookie on session restoration
    response.set_cookie(
        "csrf_token",
        csrf_token,
        httponly=False,
        secure=Config.COOKIE_SECURE,
        samesite=Config.COOKIE_SAMESITE,
        max_age=Config.JWT_ACCESS_TOKEN_EXPIRES,
        path="/"
    )
    return response
