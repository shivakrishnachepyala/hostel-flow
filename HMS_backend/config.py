import os
from dotenv import load_dotenv

basedir = os.path.abspath(os.path.dirname(__file__))
load_dotenv(os.path.join(basedir, ".env"))
load_dotenv()


# Determine environment mode
FLASK_ENV = os.getenv("FLASK_ENV", "development").lower()
IS_PRODUCTION = FLASK_ENV == "production"

# Known insecure/default secrets forbidden in production
FORBIDDEN_PRODUCTION_SECRETS = {
    "hostelflow-production-hardened-jwt-secret-key-2026-secure",
    "dev-secret-key-change-in-prod",
    "secret",
    "changeme",
    "jwt_secret",
    "replace-with-a-secure-jwt-signing-key",
}

_raw_jwt_secret = os.getenv("JWT_SECRET_KEY")

if IS_PRODUCTION:
    if not _raw_jwt_secret or not _raw_jwt_secret.strip():
        raise RuntimeError(
            "CRITICAL SECURITY CONFIGURATION ERROR: JWT_SECRET_KEY must be explicitly configured "
            "in production environment. Startup safely aborted."
        )
    _stripped_key = _raw_jwt_secret.strip()
    if _stripped_key in FORBIDDEN_PRODUCTION_SECRETS:
        raise RuntimeError(
            "CRITICAL SECURITY CONFIGURATION ERROR: An insecure or default JWT_SECRET_KEY was detected "
            "in production environment. A strong, random 32+ character key is required. Startup safely aborted."
        )
    if len(_stripped_key) < 32:
        raise RuntimeError(
            "CRITICAL SECURITY CONFIGURATION ERROR: JWT_SECRET_KEY in production must be at least 32 characters long. "
            "Startup safely aborted."
        )
    RESOLVED_JWT_SECRET = _stripped_key
else:
    # Development fallback secret (explicitly restricted to non-production use)
    RESOLVED_JWT_SECRET = (
        _raw_jwt_secret.strip()
        if _raw_jwt_secret and _raw_jwt_secret.strip()
        else "dev-only-local-secret-do-not-use-in-production-32chars"
    )


class Config:
    ENV = FLASK_ENV
    IS_PRODUCTION = IS_PRODUCTION

    # Flask Server Settings
    SECRET_KEY = os.getenv("FLASK_SECRET_KEY", "dev-secret-key-change-in-prod")
    DEBUG = os.getenv("FLASK_DEBUG", "False" if IS_PRODUCTION else "True").lower() in ("true", "1", "t")

    # MySQL Database Connection Settings
    DB_HOST = os.getenv("DB_HOST", "localhost")
    DB_PORT = int(os.getenv("DB_PORT", "3306"))
    DB_USER = os.getenv("DB_USER", "root")
    DB_PASSWORD = os.getenv("DB_PASSWORD", "")
    DB_NAME = os.getenv("DB_NAME", "hms")

    # Database Connection Pool Settings
    DB_POOL_NAME = os.getenv("DB_POOL_NAME", "hms_pool")
    DB_POOL_SIZE = int(os.getenv("DB_POOL_SIZE", "10"))

    # Optional SSL / TLS Settings for Remote Cloud Database (e.g., Aiven, AWS RDS)
    DB_SSL_CA = os.getenv("DB_SSL_CA", None)
    DB_SSL_VERIFY = os.getenv("DB_SSL_VERIFY", "False").lower() in ("true", "1", "t")

    # Allowed CORS Origins (comma-separated list parsed into a clean list)
    _default_cors = "http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173,http://127.0.0.1:5173"
    _raw_cors = os.getenv("CORS_ORIGINS", _default_cors)
    CORS_ORIGINS = [origin.strip() for origin in _raw_cors.split(",") if origin.strip()]

    # JWT Authentication Settings
    JWT_SECRET_KEY = RESOLVED_JWT_SECRET
    # Reduced administrative access token lifetime (defaults to 1800s / 30 mins)
    JWT_ACCESS_TOKEN_EXPIRES = int(os.getenv("JWT_ACCESS_TOKEN_EXPIRES", "1800"))

    # Cookie Security Settings
    # SameSite: 'None' in production for cross-site architecture, 'Lax' for same-site/dev
    COOKIE_SAMESITE = os.getenv("COOKIE_SAMESITE", "None" if IS_PRODUCTION else "Lax")
    COOKIE_SECURE = os.getenv("COOKIE_SECURE", "True" if IS_PRODUCTION else "False").lower() in ("true", "1", "t")
