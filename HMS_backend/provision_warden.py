import os
import sys
import getpass

basedir = os.path.abspath(os.path.dirname(__file__))
if basedir not in sys.path:
    sys.path.insert(0, basedir)

from services.auth_service import provision_warden


def main():
    print("=" * 60)
    print("HOSTELFLOW WARDEN ADMINISTRATIVE PROVISIONING")
    print("=" * 60)

    try:
        name = input("Warden Full Name: ").strip()
        if not name:
            print("Error: Full name is required.")
            sys.exit(1)

        username = input("Username: ").strip()
        if not username:
            print("Error: Username is required.")
            sys.exit(1)

        email = input("Email (optional): ").strip()

        password = getpass.getpass("Password (min 12 chars): ")
        if len(password) < 12:
            print("Error: Password must be at least 12 characters.")
            sys.exit(1)

        password_confirm = getpass.getpass("Confirm Password: ")
        if password != password_confirm:
            print("Error: Passwords do not match.")
            sys.exit(1)

        role = input("Role [default: Warden]: ").strip() or "Warden"

        warden_id, err = provision_warden(name, username, email, password, role)
        if err:
            print(f"Error provisioning Warden: {err}")
            sys.exit(1)

        print(f"\n[SUCCESS] Warden '{username}' provisioned with ID {warden_id} (Role: {role}).")

    except KeyboardInterrupt:
        print("\nProvisioning cancelled.")
        sys.exit(1)


if __name__ == "__main__":
    main()
