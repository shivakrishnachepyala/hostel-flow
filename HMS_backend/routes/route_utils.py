import datetime
import decimal
from flask import jsonify
from mysql.connector import Error as MySQLError


def format_value(val):
    if isinstance(val, (datetime.date, datetime.datetime)):
        return val.strftime("%Y-%m-%d")
    if isinstance(val, decimal.Decimal):
        return float(val)
    return val


def format_row(row):
    if not row or not isinstance(row, dict):
        return row
    return {k: format_value(v) for k, v in row.items()}


def parse_date(date_val, field_name):
    """
    Validates and formats a date to YYYY-MM-DD string.
    Returns (formatted_date_str, error_message).
    """
    if date_val is None:
        return None, None
    if isinstance(date_val, datetime.date):
        return date_val.strftime("%Y-%m-%d"), None
    if not isinstance(date_val, str):
        return None, f"{field_name} must be a string in YYYY-MM-DD format."
    val = date_val.strip()
    if not val:
        return None, None
    try:
        dt = datetime.datetime.strptime(val, "%Y-%m-%d").date()
        return dt.strftime("%Y-%m-%d"), None
    except ValueError:
        return None, f"{field_name} must be in YYYY-MM-DD format."


def handle_db_error(error, operation="performing operation"):
    print(f"DB ERROR ({operation}):", repr(error))
    if isinstance(error, MySQLError):
        errno = getattr(error, "errno", None)
        msg = getattr(error, "msg", str(error))
        if errno == 1062:
            return jsonify({
                "status": "error",
                "message": "Duplicate entry: a record with the same unique value or ID already exists.",
                "details": msg
            }), 409
        if errno == 1451:
            return jsonify({
                "status": "error",
                "message": "Cannot delete or update record because it is referenced by other records.",
                "details": msg
            }), 409
        if errno == 1452:
            return jsonify({
                "status": "error",
                "message": "Foreign key constraint violation: referenced record does not exist.",
                "details": msg
            }), 409
        if errno in (3819, 4025):
            return jsonify({
                "status": "error",
                "message": f"Database constraint violation: {msg}",
                "details": msg
            }), 400

    return jsonify({
        "status": "error",
        "message": f"Database error while {operation}.",
        "details": str(error)
    }), 500
