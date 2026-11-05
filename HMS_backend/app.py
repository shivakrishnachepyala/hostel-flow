from flask import Flask, jsonify
from db import get_db_connection

from routes.hostel_routes import hostel_bp
from routes.hostel_block_routes import hostel_block_bp
from routes.room_routes import room_bp
from routes.bed_routes import bed_bp
from routes.student_routes import student_bp
from routes.student_preferences_routes import student_preferences_bp
from routes.room_allocation_routes import room_allocation_bp
from routes.roommate_match_routes import roommate_match_bp
from routes.payment_routes import payment_bp

app = Flask(__name__)

# Register existing blueprints
app.register_blueprint(hostel_bp)
app.register_blueprint(hostel_block_bp)

# Register new CRUD blueprints
app.register_blueprint(room_bp)
app.register_blueprint(bed_bp)
app.register_blueprint(student_bp)
app.register_blueprint(student_preferences_bp)
app.register_blueprint(room_allocation_bp)
app.register_blueprint(roommate_match_bp)
app.register_blueprint(payment_bp)


@app.route("/", methods=["GET"])
def home():
    return jsonify({
        "message": "HostelFlow Backend is running!",
        "status": "success"
    })


@app.route("/api/health", methods=["GET"])
def health_check():
    connection = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor()
        cursor.execute("SELECT DATABASE(), VERSION()")
        result = cursor.fetchone()
        cursor.close()

        return jsonify({
            "status": "success",
            "database": result[0],
            "mysql_version": result[1],
            "message": "MySQL connection successful!"
        }), 200

    except Exception as error:
        return jsonify({
            "status": "error",
            "message": "Database connection failed",
            "details": str(error)
        }), 500

    finally:
        if connection and connection.is_connected():
            connection.close()


if __name__ == "__main__":
    app.run(debug=True, port=5000)
