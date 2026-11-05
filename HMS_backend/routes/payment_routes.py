import decimal
from flask import Blueprint, jsonify, request
from db import get_db_connection
from routes.route_utils import format_row, handle_db_error, parse_date

payment_bp = Blueprint("payment", __name__, url_prefix="/api/payments")


# GET: Retrieve all payments with optional student_id / status filter
@payment_bp.route("/", methods=["GET"], strict_slashes=False)
@payment_bp.route("", methods=["GET"], strict_slashes=False)
def get_payments():
    connection = None
    cursor = None

    try:
        student_id = request.args.get("student_id", type=int)
        status = request.args.get("status")

        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        query = """
            SELECT Payment_ID, Student_ID, Amount, Payment_Date,
                   Payment_Method, Payment_Status, Payment_Type, Transaction_Reference
            FROM payment
        """
        conditions = []
        params = []

        if student_id is not None:
            conditions.append("Student_ID = %s")
            params.append(student_id)

        if status:
            conditions.append("Payment_Status = %s")
            params.append(status.strip())

        if conditions:
            query += " WHERE " + " AND ".join(conditions)

        query += " ORDER BY Payment_ID"

        cursor.execute(query, tuple(params))
        payments = [format_row(row) for row in cursor.fetchall()]

        return jsonify({
            "status": "success",
            "count": len(payments),
            "data": payments
        }), 200

    except Exception as error:
        return handle_db_error(error, "retrieving payments")

    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()


# GET: Retrieve single payment by ID
@payment_bp.route("/<int:payment_id>", methods=["GET"], strict_slashes=False)
def get_payment(payment_id):
    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute("""
            SELECT Payment_ID, Student_ID, Amount, Payment_Date,
                   Payment_Method, Payment_Status, Payment_Type, Transaction_Reference
            FROM payment
            WHERE Payment_ID = %s
        """, (payment_id,))

        payment = cursor.fetchone()

        if not payment:
            return jsonify({
                "status": "error",
                "message": "Payment not found."
            }), 404

        return jsonify({
            "status": "success",
            "data": format_row(payment)
        }), 200

    except Exception as error:
        return handle_db_error(error, "retrieving payment")

    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()


# POST: Create a new payment
@payment_bp.route("/", methods=["POST"], strict_slashes=False)
@payment_bp.route("", methods=["POST"], strict_slashes=False)
def create_payment():
    connection = None
    cursor = None

    try:
        data = request.get_json(silent=True)

        if not isinstance(data, dict):
            return jsonify({
                "status": "error",
                "message": "A valid JSON object is required."
            }), 400

        required_fields = ["Payment_ID", "Student_ID", "Amount"]
        for field in required_fields:
            if field not in data or data[field] is None:
                return jsonify({
                    "status": "error",
                    "message": f"{field} is required."
                }), 400

        payment_id = data["Payment_ID"]
        student_id = data["Student_ID"]
        raw_amount = data["Amount"]

        if isinstance(payment_id, bool) or not isinstance(payment_id, int) or payment_id <= 0:
            return jsonify({
                "status": "error",
                "message": "Payment_ID must be a positive integer."
            }), 400

        if isinstance(student_id, bool) or not isinstance(student_id, int) or student_id <= 0:
            return jsonify({
                "status": "error",
                "message": "Student_ID must be a positive integer."
            }), 400

        try:
            amount = decimal.Decimal(str(raw_amount))
            if amount < 0:
                return jsonify({
                    "status": "error",
                    "message": "Amount must be a non-negative number."
                }), 400
        except (decimal.InvalidOperation, TypeError, ValueError):
            return jsonify({
                "status": "error",
                "message": "Amount must be a valid numeric value."
            }), 400

        payment_date = None
        if "Payment_Date" in data and data["Payment_Date"] is not None:
            payment_date, err = parse_date(data["Payment_Date"], "Payment_Date")
            if err:
                return jsonify({"status": "error", "message": err}), 400

        tx_ref = data.get("Transaction_Reference")
        if tx_ref is not None:
            if not isinstance(tx_ref, str) or not tx_ref.strip():
                tx_ref = None
            else:
                tx_ref = tx_ref.strip()

        connection = get_db_connection()
        cursor = connection.cursor()

        # Check primary key existence
        cursor.execute("SELECT Payment_ID FROM payment WHERE Payment_ID = %s", (payment_id,))
        if cursor.fetchone():
            return jsonify({
                "status": "error",
                "message": f"Payment with Payment_ID {payment_id} already exists."
            }), 409

        # Verify Student exists
        cursor.execute("SELECT Student_ID FROM student WHERE Student_ID = %s", (student_id,))
        if not cursor.fetchone():
            return jsonify({
                "status": "error",
                "message": f"Referenced Student_ID {student_id} does not exist."
            }), 409

        # Enforce business rule: Transaction_Reference must be unique
        if tx_ref:
            cursor.execute("SELECT Payment_ID FROM payment WHERE Transaction_Reference = %s", (tx_ref,))
            if cursor.fetchone():
                return jsonify({
                    "status": "error",
                    "message": f"Transaction reference '{tx_ref}' already exists."
                }), 409

        cursor.execute("""
            INSERT INTO payment
            (Payment_ID, Student_ID, Amount, Payment_Date, Payment_Method, Payment_Status, Payment_Type, Transaction_Reference)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            payment_id,
            student_id,
            amount,
            payment_date,
            data.get("Payment_Method"),
            data.get("Payment_Status", "Pending"),
            data.get("Payment_Type"),
            tx_ref
        ))

        connection.commit()

        return jsonify({
            "status": "success",
            "message": "Payment created successfully.",
            "Payment_ID": payment_id
        }), 201

    except Exception as error:
        if connection and connection.is_connected():
            connection.rollback()
        return handle_db_error(error, "creating payment")

    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()


# PUT: Update an existing payment
@payment_bp.route("/<int:payment_id>", methods=["PUT"], strict_slashes=False)
def update_payment(payment_id):
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
            "Amount",
            "Payment_Date",
            "Payment_Method",
            "Payment_Status",
            "Payment_Type",
            "Transaction_Reference"
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

        if "Amount" in updates:
            try:
                amt = decimal.Decimal(str(updates["Amount"]))
                if amt < 0:
                    return jsonify({
                        "status": "error",
                        "message": "Amount must be a non-negative number."
                    }), 400
                updates["Amount"] = amt
            except (decimal.InvalidOperation, TypeError, ValueError):
                return jsonify({
                    "status": "error",
                    "message": "Amount must be a valid numeric value."
                }), 400

        if "Payment_Date" in updates:
            if updates["Payment_Date"] is not None:
                p_date, err = parse_date(updates["Payment_Date"], "Payment_Date")
                if err:
                    return jsonify({"status": "error", "message": err}), 400
                updates["Payment_Date"] = p_date
            else:
                updates["Payment_Date"] = None

        if "Transaction_Reference" in updates:
            ref = updates["Transaction_Reference"]
            if ref is not None:
                if not isinstance(ref, str) or not ref.strip():
                    updates["Transaction_Reference"] = None
                else:
                    updates["Transaction_Reference"] = ref.strip()

        connection = get_db_connection()
        cursor = connection.cursor()

        cursor.execute("SELECT Payment_ID FROM payment WHERE Payment_ID = %s", (payment_id,))
        if cursor.fetchone() is None:
            return jsonify({
                "status": "error",
                "message": "Payment not found."
            }), 404

        if "Student_ID" in updates:
            cursor.execute("SELECT Student_ID FROM student WHERE Student_ID = %s", (updates["Student_ID"],))
            if cursor.fetchone() is None:
                return jsonify({
                    "status": "error",
                    "message": f"Referenced Student_ID {updates['Student_ID']} does not exist."
                }), 409

        if updates.get("Transaction_Reference"):
            cursor.execute(
                "SELECT Payment_ID FROM payment WHERE Transaction_Reference = %s AND Payment_ID != %s",
                (updates["Transaction_Reference"], payment_id)
            )
            if cursor.fetchone():
                return jsonify({
                    "status": "error",
                    "message": f"Transaction reference '{updates['Transaction_Reference']}' already exists."
                }), 409

        set_clause = ", ".join(f"`{k}` = %s" for k in updates)
        values = list(updates.values()) + [payment_id]

        cursor.execute(f"UPDATE payment SET {set_clause} WHERE Payment_ID = %s", values)
        connection.commit()

        return jsonify({
            "status": "success",
            "message": "Payment updated successfully.",
            "Payment_ID": payment_id
        }), 200

    except Exception as error:
        if connection and connection.is_connected():
            connection.rollback()
        return handle_db_error(error, "updating payment")

    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()


# DELETE: Remove a payment
@payment_bp.route("/<int:payment_id>", methods=["DELETE"], strict_slashes=False)
def delete_payment(payment_id):
    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor()

        cursor.execute("SELECT Payment_ID FROM payment WHERE Payment_ID = %s", (payment_id,))
        if cursor.fetchone() is None:
            return jsonify({
                "status": "error",
                "message": "Payment not found."
            }), 404

        cursor.execute("DELETE FROM payment WHERE Payment_ID = %s", (payment_id,))
        connection.commit()

        return jsonify({
            "status": "success",
            "message": "Payment deleted successfully.",
            "Payment_ID": payment_id
        }), 200

    except Exception as error:
        if connection and connection.is_connected():
            connection.rollback()
        return handle_db_error(error, "deleting payment")

    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()
