import os
import re
import click
from flask import Flask, jsonify
from flask_cors import CORS
from config import Config
from db import get_db_connection, get_pool_info

from routes.auth_routes import auth_bp
from routes.hostel_routes import hostel_bp
from routes.hostel_block_routes import hostel_block_bp
from routes.room_routes import room_bp
from routes.bed_routes import bed_bp
from routes.student_routes import student_bp
from routes.student_preferences_routes import student_preferences_bp
from routes.room_allocation_routes import room_allocation_bp
from routes.roommate_match_routes import roommate_match_bp
from routes.payment_routes import payment_bp
from routes.student_portal_routes import student_portal_bp
from routes.guest_routes import guest_bp
from services.auth_service import provision_warden, warden_required

app = Flask(__name__)
app.config.from_object(Config)

# Configure CORS with strictly configured frontend origins (No wildcards in production)
# Supports Vercel preview deployments, ngrok tunnels, and local development
CORS(
    app,
    resources={r"/api/*": {
        "origins": [
            *Config.CORS_ORIGINS,
            re.compile(r"^https:\/\/.*\.vercel\.app$"),
            re.compile(r"^http:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+)(:\d+)?$")
        ]
    }},
    supports_credentials=True,
    methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=[
        "Content-Type",
        "Authorization",
        "Accept",
        "X-CSRF-Token",
        "X-Requested-With",
        "ngrok-skip-browser-warning"
    ],
    expose_headers=["X-CSRF-Token", "Authorization"],
    max_age=3600
)

# Register authentication blueprint
app.register_blueprint(auth_bp)

# Register existing blueprints
app.register_blueprint(hostel_bp)
app.register_blueprint(hostel_block_bp)

# Register CRUD blueprints
app.register_blueprint(room_bp)
app.register_blueprint(bed_bp)
app.register_blueprint(student_bp)
app.register_blueprint(student_preferences_bp)
app.register_blueprint(room_allocation_bp)
app.register_blueprint(roommate_match_bp)
app.register_blueprint(payment_bp)
app.register_blueprint(student_portal_bp)
app.register_blueprint(guest_bp)


@app.route("/", methods=["GET"])
def home():
    return jsonify({
        "message": "HostelFlow Backend is running!",
        "status": "success"
    })


@app.route("/api/health", methods=["GET"])
def health_check():
    """Minimal, unprivileged public health probe for load balancers and uptime checks."""
    connection = None
    try:
        connection = get_db_connection()
        cursor = connection.cursor()
        cursor.execute("SELECT 1")
        cursor.fetchone()
        cursor.close()

        return jsonify({
            "status": "healthy",
            "message": "Service operational."
        }), 200

    except Exception:
        return jsonify({
            "status": "unhealthy",
            "message": "Service temporarily unavailable."
        }), 503

    finally:
        if connection and connection.is_connected():
            connection.close()


@app.route("/api/health/diagnostics", methods=["GET"])
@warden_required
def health_diagnostics():
    """Protected diagnostic endpoint exposing internal connection pool and engine metadata."""
    connection = None
    try:
        connection = get_db_connection()
        cursor = connection.cursor()
        cursor.execute("SELECT DATABASE(), VERSION()")
        result = cursor.fetchone()
        cursor.close()

        pool_info = get_pool_info()

        return jsonify({
            "status": "success",
            "database": result[0],
            "mysql_version": result[1],
            "pool": pool_info,
            "message": "Database diagnostics operational."
        }), 200

    except Exception as error:
        return jsonify({
            "status": "error",
            "message": "Failed to retrieve diagnostics.",
            "details": str(error)
        }), 500

    finally:
        if connection and connection.is_connected():
            connection.close()


@app.cli.command("create-warden")
@click.option("--name", prompt="Warden Full Name", help="Full Name of the Warden")
@click.option("--username", prompt="Username", help="Unique username for login")
@click.option("--email", prompt="Email (optional)", default="", help="Email address (optional)")
@click.option("--password", prompt="Password (min 12 chars)", hide_input=True, confirmation_prompt=True, help="Password for login")
@click.option("--role", default="Warden", help="Role (default: Warden)")
def create_warden_cli(name, username, email, password, role):
    """Provision a new Warden administrative account."""
    warden_id, err = provision_warden(name, username, email, password, role)
    if err:
        click.echo(f"Error provisioning Warden: {err}", err=True)
        return
    click.echo(f"Successfully provisioned Warden '{username}' with ID {warden_id} (Role: {role}).")


if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    host = os.getenv("HOST", "127.0.0.1")
    debug = os.getenv("FLASK_DEBUG", "True").lower() in ("true", "1", "t")
    app.run(host=host, port=port, debug=debug)
