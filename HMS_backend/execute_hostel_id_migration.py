"""
HostelFlow Safe Hostel ID Resequencing Migration Script
Executes collision-safe primary key resequencing for the hostel table:
  Hostel A: 101 -> 1
  Hostel B: 102 -> 2
  Hostel C: 1   -> 3
  Hostel D: 103 -> 4

Uses temporary ID 90003 for Hostel C to resolve the key collision with Hostel A.
Enforces active foreign key validation, transactional integrity, and rollback safety.
"""

import sys
import json
sys.path.append('HMS_backend')
from db import get_db_connection

def run_migration():
    print("=" * 60)
    print("HOSTELFLOW — HOSTEL ID RESEQUENCING MIGRATION")
    print("=" * 60)

    conn = get_db_connection()
    # Explicit transaction management
    conn.autocommit = False
    cur = conn.cursor(dictionary=True)

    try:
        # Step 1: Acquire exclusive execution lock
        print("\n1. Acquiring exclusive application lock...")
        cur.execute("SELECT GET_LOCK('hostelflow_migration_lock', 10) AS locked")
        lock_res = cur.fetchone()
        if not lock_res or lock_res['locked'] != 1:
            raise RuntimeError("Failed to acquire hostelflow_migration_lock. Another process is running.")
        print("PASS: Acquired hostelflow_migration_lock.")

        # Step 2: Validate pre-migration baseline
        print("\n2. Validating pre-migration state...")
        cur.execute("SELECT Hostel_ID, Hostel_Name, Capacity, Hostel_Type FROM hostel ORDER BY Hostel_ID")
        current_hostels = {h['Hostel_ID']: h for h in cur.fetchall()}
        
        assert len(current_hostels) == 4, f"Expected 4 hostels, found {len(current_hostels)}"
        assert current_hostels[1]['Hostel_Name'] == 'Hostel C', "Hostel_ID 1 is not Hostel C"
        assert current_hostels[101]['Hostel_Name'] == 'Hostel A', "Hostel_ID 101 is not Hostel A"
        assert current_hostels[102]['Hostel_Name'] == 'Hostel B', "Hostel_ID 102 is not Hostel B"
        assert current_hostels[103]['Hostel_Name'] == 'Hostel D', "Hostel_ID 103 is not Hostel D"
        print("PASS: Pre-migration hostel records verified.")

        # Step 3: Configure ON UPDATE CASCADE on hostel_block
        # Foreign key checks remain active at all times!
        print("\n3. Setting ON UPDATE CASCADE on hostel_block constraint...")
        cur.execute("ALTER TABLE hostel_block DROP FOREIGN KEY hostel_block_ibfk_1")
        cur.execute("""
            ALTER TABLE hostel_block 
            ADD CONSTRAINT hostel_block_ibfk_1 
            FOREIGN KEY (Hostel_ID) REFERENCES hostel (Hostel_ID) 
            ON UPDATE CASCADE
        """)
        print("PASS: Configured ON UPDATE CASCADE on hostel_block_ibfk_1.")

        # Step 4: Execute collision-safe atomic resequencing
        print("\n4. Executing atomic resequencing updates...")

        # Step 4a: Move Hostel C to temporary ID 90003 to vacate ID 1
        print("  - Moving Hostel C (1 -> 90003 [temp])...")
        cur.execute("UPDATE hostel SET Hostel_ID = 90003 WHERE Hostel_ID = 1")
        assert cur.rowcount == 1, "Failed to update Hostel C to temporary ID"

        # Step 4b: Move Hostel A to target ID 1
        print("  - Moving Hostel A (101 -> 1)...")
        cur.execute("UPDATE hostel SET Hostel_ID = 1 WHERE Hostel_ID = 101")
        assert cur.rowcount == 1, "Failed to update Hostel A to ID 1"

        # Step 4c: Move Hostel B to target ID 2
        print("  - Moving Hostel B (102 -> 2)...")
        cur.execute("UPDATE hostel SET Hostel_ID = 2 WHERE Hostel_ID = 102")
        assert cur.rowcount == 1, "Failed to update Hostel B to ID 2"

        # Step 4d: Move Hostel C to target ID 3
        print("  - Moving Hostel C (90003 [temp] -> 3)...")
        cur.execute("UPDATE hostel SET Hostel_ID = 3 WHERE Hostel_ID = 90003")
        assert cur.rowcount == 1, "Failed to update Hostel C to ID 3"

        # Step 4e: Move Hostel D to target ID 4
        print("  - Moving Hostel D (103 -> 4)...")
        cur.execute("UPDATE hostel SET Hostel_ID = 4 WHERE Hostel_ID = 103")
        assert cur.rowcount == 1, "Failed to update Hostel D to ID 4"

        # Step 5: Validate post-migration state under the transaction
        print("\n5. Validating updated state before commit...")
        cur.execute("SELECT Hostel_ID, Hostel_Name, Capacity, Hostel_Type FROM hostel ORDER BY Hostel_ID")
        updated_hostels = cur.fetchall()
        print("Hostels in DB:")
        for h in updated_hostels:
            print(f"  Hostel_ID {h['Hostel_ID']}: {h['Hostel_Name']} ({h['Hostel_Type']}, Cap={h['Capacity']})")

        assert len(updated_hostels) == 4, f"Expected 4 hostels, got {len(updated_hostels)}"
        assert updated_hostels[0]['Hostel_ID'] == 1 and updated_hostels[0]['Hostel_Name'] == 'Hostel A'
        assert updated_hostels[1]['Hostel_ID'] == 2 and updated_hostels[1]['Hostel_Name'] == 'Hostel B'
        assert updated_hostels[2]['Hostel_ID'] == 3 and updated_hostels[2]['Hostel_Name'] == 'Hostel C'
        assert updated_hostels[3]['Hostel_ID'] == 4 and updated_hostels[3]['Hostel_Name'] == 'Hostel D'

        # Validate cascaded block references
        cur.execute("SELECT Block_ID, Block_Name, Hostel_ID FROM hostel_block ORDER BY Block_ID")
        updated_blocks = cur.fetchall()
        print("\nBlocks in DB:")
        for b in updated_blocks:
            print(f"  Block_ID {b['Block_ID']} ({b['Block_Name']}): Hostel_ID={b['Hostel_ID']}")

        block_map = {b['Block_ID']: b['Hostel_ID'] for b in updated_blocks}
        assert block_map[1] == 3, f"Block C1 should point to Hostel_ID 3, got {block_map[1]}"
        assert block_map[201] == 1, f"Block A1 should point to Hostel_ID 1, got {block_map[201]}"
        assert block_map[202] == 1, f"Block A2 should point to Hostel_ID 1, got {block_map[202]}"
        assert block_map[203] == 2, f"Block B1 should point to Hostel_ID 2, got {block_map[203]}"
        assert block_map[204] == 4, f"Block D1 should point to Hostel_ID 4, got {block_map[204]}"
        assert block_map[205] == 4, f"Block D2 should point to Hostel_ID 4, got {block_map[205]}"

        # Validate room and bed totals
        cur.execute("SELECT COUNT(*) AS c FROM room")
        assert cur.fetchone()['c'] == 98, "Room count mismatch!"
        cur.execute("SELECT COUNT(*) AS c FROM bed")
        assert cur.fetchone()['c'] == 228, "Bed count mismatch!"
        cur.execute("SELECT COUNT(*) AS c FROM room_allocation WHERE Allocation_Status = 'Active'")
        assert cur.fetchone()['c'] == 6, "Active allocation count mismatch!"

        # Step 6: Commit transaction
        print("\n6. Committing transaction to database...")
        conn.commit()
        print("PASS: Transaction committed successfully.")

        # Step 7: Restore original RESTRICT constraint on hostel_block
        print("\n7. Restoring original constraint definition on hostel_block...")
        cur.execute("ALTER TABLE hostel_block DROP FOREIGN KEY hostel_block_ibfk_1")
        cur.execute("""
            ALTER TABLE hostel_block 
            ADD CONSTRAINT hostel_block_ibfk_1 
            FOREIGN KEY (Hostel_ID) REFERENCES hostel (Hostel_ID)
        """)
        print("PASS: Restored original constraint definition.")

        print("\n" + "=" * 60)
        print("MIGRATION EXECUTION: 100% SUCCESSFUL!")
        print("=" * 60)

    except Exception as e:
        print(f"\nERROR ENCOUNTERED: {e}")
        print("Initiating transaction rollback...")
        try:
            conn.rollback()
            print("PASS: Transaction rolled back safely.")
        except Exception as rb_err:
            print(f"Rollback error: {rb_err}")
        raise

    finally:
        try:
            cur.execute("SELECT RELEASE_LOCK('hostelflow_migration_lock')")
            print("Released hostelflow_migration_lock.")
        except Exception:
            pass
        cur.close()
        conn.close()

if __name__ == '__main__':
    run_migration()
