import threading
import mysql.connector
from mysql.connector import pooling, Error
from config import Config

_pool = None
_pool_lock = threading.Lock()


def get_db_pool():
    """
    Returns the singleton MySQL connection pool, initializing it thread-safely if needed.
    """
    global _pool
    if _pool is None:
        with _pool_lock:
            if _pool is None:
                pool_config = {
                    "pool_name": Config.DB_POOL_NAME,
                    "pool_size": Config.DB_POOL_SIZE,
                    "host": Config.DB_HOST,
                    "port": Config.DB_PORT,
                    "user": Config.DB_USER,
                    "password": Config.DB_PASSWORD,
                    "database": Config.DB_NAME,
                }

                if Config.DB_SSL_CA:
                    pool_config["ssl_ca"] = Config.DB_SSL_CA
                    if Config.DB_SSL_VERIFY:
                        pool_config["ssl_verify_cert"] = True

                try:
                    _pool = pooling.MySQLConnectionPool(**pool_config)
                except Error as e:
                    print(f"Failed to initialize MySQL connection pool '{Config.DB_POOL_NAME}': {e}")
                    raise

    return _pool


def reset_db_pool():
    """
    Resets the singleton connection pool. Useful for test suites switching databases.
    """
    global _pool
    with _pool_lock:
        _pool = None



def get_db_connection():
    """
    Acquires a pooled connection from the connection pool.
    When connection.close() is called by the caller, it is automatically
    returned to the pool instead of closing the physical socket.
    """
    try:
        pool = get_db_pool()
        connection = pool.get_connection()
        if connection.is_connected():
            return connection
    except Error as e:
        print(f"MySQL connection acquisition error: {e}")
        raise

    return None


def get_pool_info():
    """
    Returns basic connection pool diagnostics.
    """
    try:
        pool = get_db_pool()
        return {
            "pool_name": pool.pool_name,
            "pool_size": pool.pool_size,
        }
    except Exception as e:
        return {"error": str(e)}
