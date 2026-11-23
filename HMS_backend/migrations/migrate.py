import os
import sys

basedir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if basedir not in sys.path:
    sys.path.insert(0, basedir)

from db import get_db_connection

def run_migration():
    print("Running migration: 001_create_warden_auth.sql")
    sql_file = os.path.join(os.path.dirname(__file__), "001_create_warden_auth.sql")
    with open(sql_file, "r", encoding="utf-8") as f:
        sql = f.read()

    connection = get_db_connection()
    cursor = connection.cursor()
    try:
        cursor.execute(sql)
        connection.commit()
        print("Migration executed successfully: warden_auth table verified.")
    except Exception as e:
        connection.rollback()
        print("Migration failed:", repr(e))
        raise
    finally:
        cursor.close()
        connection.close()

if __name__ == "__main__":
    run_migration()
