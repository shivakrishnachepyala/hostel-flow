import datetime
import decimal
from contextlib import contextmanager
from flask import jsonify
from mysql.connector import Error as MySQLError


class NamedLockTimeout(Exception):
    """Raised when MySQL named lock acquisition times out."""
    pass


@contextmanager
def acquire_session_named_lock(conn, lock_name="hostelflow_alloc_lock", timeout=10):
    """
    Acquires a session-scoped MySQL named lock on the exact connection instance.
    Guarantees that if RELEASE_LOCK fails or errors out, the underlying physical
    TCP socket is closed via conn._cnx.close() to prevent returning a locked or
    tainted connection back into the connection pool.
    """
    cursor = None
    lock_acquired = False
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT GET_LOCK(%s, %s) AS lock_acquired", (lock_name, timeout))
        res = cursor.fetchone()
        if not res or res.get("lock_acquired") != 1:
            raise NamedLockTimeout(f"Timed out after {timeout}s waiting for lock '{lock_name}'")
        lock_acquired = True
        yield
    finally:
        if cursor:
            try:
                cursor.close()
            except Exception:
                pass
        if lock_acquired and conn and conn.is_connected():
            try:
                rel_cursor = conn.cursor(dictionary=True)
                rel_cursor.execute("SELECT RELEASE_LOCK(%s) AS lock_released", (lock_name,))
                rel_res = rel_cursor.fetchone()
                rel_cursor.close()
                if not rel_res or rel_res.get("lock_released") != 1:
                    # Invalidate physical socket so MySQL server drops all session locks
                    if hasattr(conn, "_cnx") and conn._cnx:
                        try:
                            conn._cnx.close()
                        except Exception:
                            pass
            except Exception:
                if hasattr(conn, "_cnx") and conn._cnx:
                    try:
                        conn._cnx.close()
                    except Exception:
                        pass



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
                "message": "Duplicate entry: a record with the same unique value or ID already exists."
            }), 409
        if errno == 1451:
            return jsonify({
                "status": "error",
                "message": "Cannot delete or update record because it is referenced by other records."
            }), 409
        if errno == 1452:
            return jsonify({
                "status": "error",
                "message": "Foreign key constraint violation: referenced record does not exist."
            }), 409
        if errno in (3819, 4025):
            return jsonify({
                "status": "error",
                "message": "Database constraint violation: invalid value provided."
            }), 400

    return jsonify({
        "status": "error",
        "message": f"Database error while {operation}."
    }), 500
