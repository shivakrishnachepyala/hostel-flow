import re
import datetime
import secrets
from flask import Blueprint, jsonify, request, g
from db import get_db_connection
from routes.route_utils import handle_db_error, parse_date
from services.auth_service import warden_required

guest_bp = Blueprint("guest", __name__, url_prefix="/api/guests")


def format_guest_value(val):
    if isinstance(val, datetime.datetime):
        return val.strftime("%Y-%m-%d %H:%M:%S")
    if isinstance(val, datetime.date):
        return val.strftime("%Y-%m-%d")
    return val


def format_guest_row(row):
    if not row or not isinstance(row, dict):
        return row
    return {k: format_guest_value(v) for k, v in row.items()}


EMAIL_REGEX = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


# ---------------------------------------------------------------------------
# 1. PUBLIC ENDPOINTS
# ---------------------------------------------------------------------------

@guest_bp.route("/public-request", methods=["POST"], strict_slashes=False)
def submit_guest_request():
    """
    Public endpoint for parents, visitors, and seminar guests to submit on-campus lodging requests.
    Validates input parameters, checks duration restrictions (max 3 days), generates a unique
    reference ID, and persists the record into MySQL.
    """
    data = request.get_json(silent=True) or {}

    guest_name = (data.get("guestName") or data.get("Guest_Name") or "").strip()
    email = (data.get("email") or data.get("Email") or "").strip().lower()
    phone = (data.get("phone") or data.get("Phone") or "").strip()
    purpose = (data.get("studentRelation") or data.get("Purpose") or "Parent of Current Student").strip()
    student_ref = (data.get("studentReference") or data.get("Student_Reference") or "").strip()
    check_in_raw = data.get("checkInDate") or data.get("Check_In_Date")
    check_out_raw = data.get("checkOutDate") or data.get("Check_Out_Date")
    guest_count_raw = data.get("guestCount") or data.get("Guest_Count") or 1
    room_pref = (data.get("roomPreference") or data.get("Room_Preference") or "Standard Visitor Room").strip()
    special_requests = (data.get("specialRequests") or data.get("Special_Requests") or "").strip()

    # Field validations
    if not guest_name or len(guest_name) < 2:
        return jsonify({"status": "error", "message": "Primary guest name is required."}), 400

    if not email or not EMAIL_REGEX.match(email):
        return jsonify({"status": "error", "message": "A valid email address is required."}), 400

    if not phone or len(phone) < 7:
        return jsonify({"status": "error", "message": "A valid contact phone number is required."}), 400

    check_in, err_in = parse_date(check_in_raw, "Check-in date")
    if err_in or not check_in:
        return jsonify({"status": "error", "message": err_in or "Check-in date is required."}), 400

    check_out, err_out = parse_date(check_out_raw, "Check-out date")
    if err_out or not check_out:
        return jsonify({"status": "error", "message": err_out or "Check-out date is required."}), 400

    d_in = datetime.datetime.strptime(check_in, "%Y-%m-%d").date()
    d_out = datetime.datetime.strptime(check_out, "%Y-%m-%d").date()

    if d_out < d_in:
        return jsonify({"status": "error", "message": "Check-out date cannot be earlier than check-in date."}), 400

    stay_duration = (d_out - d_in).days
    if stay_duration > 3:
        return jsonify({
            "status": "error",
            "message": f"Stay duration ({stay_duration} days) exceeds the maximum allowed campus stay of 3 days per institutional regulations."
        }), 400

    try:
        guest_count = int(guest_count_raw)
        if guest_count < 1 or guest_count > 5:
            return jsonify({"status": "error", "message": "Number of guests must be between 1 and 5."}), 400
    except (ValueError, TypeError):
        return jsonify({"status": "error", "message": "Invalid guest count."}), 400

    connection = None
    cursor = None
    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        matched_student_id = None
        if student_ref:
            cursor.execute("""
                SELECT Student_ID FROM student
                WHERE CAST(Student_ID AS CHAR) = %s OR LOWER(Name) = %s
                LIMIT 1
            """, (student_ref, student_ref.lower()))
            s_row = cursor.fetchone()
            if s_row:
                matched_student_id = s_row["Student_ID"]

        year = datetime.date.today().year
        reference_no = None
        for _ in range(10):
            candidate = f"GST-{year}-STAY-{secrets.randbelow(9000) + 1000}"
            cursor.execute("SELECT Guest_ID FROM guest_stay WHERE Reference_No = %s", (candidate,))
            if not cursor.fetchone():
                reference_no = candidate
                break

        if not reference_no:
            reference_no = f"GST-{year}-STAY-{int(datetime.datetime.now().timestamp()) % 100000}"

        cursor.execute("""
            INSERT INTO guest_stay (
                Reference_No, Guest_Name, Email, Phone, Purpose,
                Student_Reference, Student_ID, Check_In_Date, Check_Out_Date,
                Guest_Count, Room_Preference, Special_Requests,
                Status, Check_In_Status
            ) VALUES (
                %s, %s, %s, %s, %s,
                %s, %s, %s, %s,
                %s, %s, %s,
                'Pending', 'Pending'
            )
        """, (
            reference_no, guest_name, email, phone, purpose,
            student_ref or None, matched_student_id, check_in, check_out,
            guest_count, room_pref, special_requests or None
        ))
        connection.commit()
        guest_id = cursor.lastrowid

        return jsonify({
            "status": "success",
            "message": "Guest reservation request submitted successfully and queued for warden review.",
            "referenceNo": reference_no,
            "data": {
                "Guest_ID": guest_id,
                "Reference_No": reference_no,
                "Guest_Name": guest_name,
                "Check_In_Date": check_in,
                "Check_Out_Date": check_out,
                "Status": "Pending"
            }
        }), 201

    except Exception as err:
        if connection and connection.is_connected():
            connection.rollback()
        return handle_db_error(err, "submitting public guest request")
    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()


@guest_bp.route("/reference/<string:ref_no>", methods=["GET"], strict_slashes=False)
def lookup_guest_by_reference(ref_no):
    """
    Public status inquiry endpoint for visitors using their reservation reference number.
    Returns non-sensitive booking status.
    """
    clean_ref = (ref_no or "").strip().upper()
    if not clean_ref:
        return jsonify({"status": "error", "message": "Reference number required."}), 400

    connection = None
    cursor = None
    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)
        cursor.execute("""
            SELECT Guest_ID, Reference_No, Guest_Name, Check_In_Date, Check_Out_Date,
                   Purpose, Room_Preference, Status, Check_In_Status, Created_At
            FROM guest_stay
            WHERE Reference_No = %s
        """, (clean_ref,))
        row = cursor.fetchone()

        if not row:
            return jsonify({"status": "error", "message": "Reservation reference not found."}), 404

        return jsonify({
            "status": "success",
            "data": format_guest_row(row)
        }), 200

    except Exception as err:
        return handle_db_error(err, "looking up guest reservation by reference")
    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()


# ---------------------------------------------------------------------------
# 2. WARDEN PROTECTED MANAGEMENT ENDPOINTS
# ---------------------------------------------------------------------------

@guest_bp.route("/stats", methods=["GET"], strict_slashes=False)
@warden_required
def get_guest_statistics():
    """
    Computes live summary KPI statistics across all guest records.
    Reflects actual MySQL data: Total, Pending, Approved, Room Assigned, Rejected, Checked-In, Checked-Out.
    """
    connection = None
    cursor = None
    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute("""
            SELECT
                COUNT(*) AS totalRequests,
                SUM(CASE WHEN Status = 'Pending' THEN 1 ELSE 0 END) AS pendingRequests,
                SUM(CASE WHEN Status = 'Approved' THEN 1 ELSE 0 END) AS approvedRequests,
                SUM(CASE WHEN Status = 'Rejected' THEN 1 ELSE 0 END) AS rejectedRequests,
                SUM(CASE WHEN Status = 'Approved' AND Assigned_Room_ID IS NOT NULL AND Check_In_Status = 'Pending' THEN 1 ELSE 0 END) AS roomAssignedCount,
                SUM(CASE WHEN Status = 'Approved' AND Assigned_Room_ID IS NULL AND Check_In_Status = 'Pending' THEN 1 ELSE 0 END) AS unassignedApprovedCount,
                SUM(CASE WHEN Check_In_Status = 'Checked-In' THEN 1 ELSE 0 END) AS checkedInGuests,
                SUM(CASE WHEN Check_In_Status = 'Checked-Out' THEN 1 ELSE 0 END) AS checkedOutGuests
            FROM guest_stay
        """)
        row = cursor.fetchone() or {}

        stats = {
            "totalRequests": int(row.get("totalRequests") or 0),
            "pendingRequests": int(row.get("pendingRequests") or 0),
            "approvedRequests": int(row.get("approvedRequests") or 0),
            "rejectedRequests": int(row.get("rejectedRequests") or 0),
            "roomAssignedCount": int(row.get("roomAssignedCount") or 0),
            "unassignedApprovedCount": int(row.get("unassignedApprovedCount") or 0),
            "checkedInGuests": int(row.get("checkedInGuests") or 0),
            "checkedOutGuests": int(row.get("checkedOutGuests") or 0),
        }

        return jsonify({
            "status": "success",
            "data": stats
        }), 200

    except Exception as err:
        return handle_db_error(err, "fetching guest summary statistics")
    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()


@guest_bp.route("", methods=["GET"], strict_slashes=False)
@guest_bp.route("/", methods=["GET"], strict_slashes=False)
@warden_required
def list_guests():
    """
    Lists guest requests with search, multi-criteria filtering, sorting, and pagination.
    Supports:
      - search: Guest name, email, phone, reference, student reference
      - status: Pending, Approved, Rejected, Cancelled, or All
      - checkInStatus: Pending, Checked-In, Checked-Out, No-Show, or All
      - startDate / endDate: date range filtering on Check_In_Date
      - sort: created_desc, created_asc, checkin_desc, checkin_asc, name_asc
    """
    connection = None
    cursor = None
    try:
        search = request.args.get("search", "").strip()
        status_filter = request.args.get("status", "").strip()
        checkin_filter = request.args.get("checkInStatus", "").strip()
        start_date = request.args.get("startDate", "").strip()
        end_date = request.args.get("endDate", "").strip()
        sort_by = request.args.get("sort", "created_desc").strip()

        try:
            page = max(1, int(request.args.get("page", 1)))
            limit = min(100, max(1, int(request.args.get("limit", 25))))
        except ValueError:
            page = 1
            limit = 25

        offset = (page - 1) * limit

        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        where_clauses = []
        params = []

        if search:
            search_param = f"%{search}%"
            where_clauses.append("""(
                g.Guest_Name LIKE %s OR
                g.Email LIKE %s OR
                g.Phone LIKE %s OR
                g.Reference_No LIKE %s OR
                g.Student_Reference LIKE %s
            )""")
            params.extend([search_param, search_param, search_param, search_param, search_param])

        if status_filter and status_filter.lower() != "all":
            where_clauses.append("g.Status = %s")
            params.append(status_filter)

        if checkin_filter and checkin_filter.lower() != "all":
            where_clauses.append("g.Check_In_Status = %s")
            params.append(checkin_filter)

        if start_date:
            valid_start, _ = parse_date(start_date, "Start Date")
            if valid_start:
                where_clauses.append("g.Check_In_Date >= %s")
                params.append(valid_start)

        if end_date:
            valid_end, _ = parse_date(end_date, "End Date")
            if valid_end:
                where_clauses.append("g.Check_Out_Date <= %s")
                params.append(valid_end)

        where_sql = ("WHERE " + " AND ".join(where_clauses)) if where_clauses else ""

        # Total count query
        count_query = f"SELECT COUNT(*) AS total FROM guest_stay g {where_sql}"
        cursor.execute(count_query, tuple(params))
        total_count = cursor.fetchone()["total"]

        # Sort order
        sort_map = {
            "created_desc": "g.Created_At DESC",
            "created_asc": "g.Created_At ASC",
            "checkin_desc": "g.Check_In_Date DESC, g.Created_At DESC",
            "checkin_asc": "g.Check_In_Date ASC, g.Created_At ASC",
            "name_asc": "g.Guest_Name ASC",
            "name_desc": "g.Guest_Name DESC",
        }
        order_sql = sort_map.get(sort_by, "g.Created_At DESC")

        query = f"""
            SELECT
                g.Guest_ID, g.Reference_No, g.Guest_Name, g.Email, g.Phone,
                g.Purpose, g.Student_Reference, g.Student_ID,
                g.Check_In_Date, g.Check_Out_Date, g.Guest_Count, g.Room_Preference,
                g.Assigned_Room_ID, g.Special_Requests, g.Status, g.Check_In_Status,
                g.Actual_Check_In, g.Actual_Check_Out, g.Rejection_Reason, g.Admin_Remarks,
                g.Approved_By, g.Approved_At, g.Created_At, g.Updated_At,
                w.Warden_Name AS Approved_By_Name,
                r.Room_Number AS Assigned_Room_Number,
                r.Room_Type AS Assigned_Room_Type,
                r.Floor AS Assigned_Room_Floor,
                b.Block_Name AS Assigned_Block_Name,
                h.Hostel_Name AS Assigned_Hostel_Name,
                s.Name AS Matched_Student_Name,
                s.Department AS Matched_Student_Dept
            FROM guest_stay g
            LEFT JOIN warden_auth w ON g.Approved_By = w.Warden_ID
            LEFT JOIN room r ON g.Assigned_Room_ID = r.Room_ID
            LEFT JOIN hostel_block b ON r.Block_ID = b.Block_ID
            LEFT JOIN hostel h ON b.Hostel_ID = h.Hostel_ID
            LEFT JOIN student s ON g.Student_ID = s.Student_ID
            {where_sql}
            ORDER BY {order_sql}
            LIMIT %s OFFSET %s
        """
        cursor.execute(query, tuple(params + [limit, offset]))
        rows = [format_guest_row(r) for r in cursor.fetchall()]

        return jsonify({
            "status": "success",
            "total": total_count,
            "page": page,
            "limit": limit,
            "totalPages": (total_count + limit - 1) // limit if limit else 1,
            "data": rows
        }), 200

    except Exception as err:
        return handle_db_error(err, "listing guest requests")
    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()


@guest_bp.route("/<int:guest_id>", methods=["GET"], strict_slashes=False)
@warden_required
def get_guest_detail(guest_id):
    """
    Retrieves full details for a single guest request, including associated warden, room, and student records.
    """
    connection = None
    cursor = None
    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)
        cursor.execute("""
            SELECT
                g.*,
                w.Warden_Name AS Approved_By_Name,
                w.Role AS Approved_By_Role,
                r.Room_Number AS Assigned_Room_Number,
                r.Room_Type AS Assigned_Room_Type,
                r.Floor AS Assigned_Room_Floor,
                r.Capacity AS Assigned_Room_Capacity,
                r.Facilities AS Assigned_Room_Facilities,
                b.Block_Name AS Assigned_Block_Name,
                h.Hostel_Name AS Assigned_Hostel_Name,
                s.Name AS Matched_Student_Name,
                s.Phone AS Matched_Student_Phone,
                s.Email AS Matched_Student_Email,
                s.Department AS Matched_Student_Dept,
                s.Year_of_Study AS Matched_Student_Year
            FROM guest_stay g
            LEFT JOIN warden_auth w ON g.Approved_By = w.Warden_ID
            LEFT JOIN room r ON g.Assigned_Room_ID = r.Room_ID
            LEFT JOIN hostel_block b ON r.Block_ID = b.Block_ID
            LEFT JOIN hostel h ON b.Hostel_ID = h.Hostel_ID
            LEFT JOIN student s ON g.Student_ID = s.Student_ID
            WHERE g.Guest_ID = %s
        """, (guest_id,))
        row = cursor.fetchone()

        if not row:
            return jsonify({"status": "error", "message": "Guest record not found."}), 404

        return jsonify({
            "status": "success",
            "data": format_guest_row(row)
        }), 200

    except Exception as err:
        return handle_db_error(err, "fetching guest details")
    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()


# ---------------------------------------------------------------------------
# 3. ROOM AVAILABILITY & ASSIGNMENT WORKFLOW
# ---------------------------------------------------------------------------

@guest_bp.route("/<int:guest_id>/available-rooms", methods=["GET"], strict_slashes=False)
@warden_required
def get_available_rooms_for_guest(guest_id):
    """
    Evaluates real room inventory against the guest's reservation dates (Check_In_Date to Check_Out_Date).
    Calculates current student occupants and overlapping approved/checked-in guest stays to determine:
      - capacity
      - student_occupancy
      - guest_occupancy
      - available_capacity
      - is_available
      - is_currently_assigned
    Prevents double-booking and room overcapacity.
    """
    connection = None
    cursor = None
    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute("SELECT * FROM guest_stay WHERE Guest_ID = %s", (guest_id,))
        guest = cursor.fetchone()
        if not guest:
            return jsonify({"status": "error", "message": "Guest record not found."}), 404

        check_in = guest["Check_In_Date"]
        check_out = guest["Check_Out_Date"]
        guest_count = guest["Guest_Count"] or 1

        # Fetch all rooms with block and hostel metadata
        cursor.execute("""
            SELECT 
                r.Room_ID, r.Room_Number, r.Floor, r.Room_Type, r.Capacity, r.Facilities,
                b.Block_ID, b.Block_Name, b.Gender AS Block_Gender,
                h.Hostel_ID, h.Hostel_Name, h.Hostel_Type
            FROM room r
            JOIN hostel_block b ON r.Block_ID = b.Block_ID
            JOIN hostel h ON b.Hostel_ID = h.Hostel_ID
            ORDER BY h.Hostel_Name, b.Block_Name, r.Floor, r.Room_Number
        """)
        all_rooms = cursor.fetchall()

        # Fetch active student occupants count per room
        cursor.execute("""
            SELECT Room_ID, COUNT(*) AS student_count
            FROM room_allocation
            WHERE Allocation_Status = 'Active'
            GROUP BY Room_ID
        """)
        student_counts = {row["Room_ID"]: row["student_count"] for row in cursor.fetchall()}

        # Fetch overlapping approved/checked-in guest occupancies per room
        cursor.execute("""
            SELECT Assigned_Room_ID, SUM(Guest_Count) AS overlapping_guest_count,
                   GROUP_CONCAT(CONCAT(Guest_Name, ' (', Check_In_Date, ' to ', Check_Out_Date, ')') SEPARATOR '; ') AS active_reservations
            FROM guest_stay
            WHERE Status = 'Approved'
              AND Check_In_Status != 'Checked-Out'
              AND Assigned_Room_ID IS NOT NULL
              AND Guest_ID != %s
              AND (Check_In_Date < %s AND Check_Out_Date > %s)
            GROUP BY Assigned_Room_ID
        """, (guest_id, check_out, check_in))
        overlapping_guests = {row["Assigned_Room_ID"]: row for row in cursor.fetchall()}

        room_results = []
        for rm in all_rooms:
            rid = rm["Room_ID"]
            cap = int(rm["Capacity"] or 0)
            stud_occ = int(student_counts.get(rid, 0))

            overlap_info = overlapping_guests.get(rid, {})
            guest_occ = int(overlap_info.get("overlapping_guest_count") or 0)
            reservations_str = overlap_info.get("active_reservations") or None

            total_occ = stud_occ + guest_occ
            avail_cap = max(0, cap - total_occ)

            is_curr_assigned = (guest.get("Assigned_Room_ID") == rid)
            is_avail = (avail_cap >= guest_count) or is_curr_assigned

            pref_str = (guest.get("Room_Preference") or "").lower()
            rtype_str = (rm.get("Room_Type") or "").lower()
            matches_pref = (
                ("deluxe" in pref_str and ("single" in rtype_str or "double" in rtype_str)) or
                ("visitor" in pref_str and "double" in rtype_str) or
                (rtype_str in pref_str or pref_str in rtype_str)
            )

            room_results.append({
                "Room_ID": rid,
                "Room_Number": rm["Room_Number"],
                "Floor": rm["Floor"],
                "Room_Type": rm["Room_Type"],
                "Capacity": cap,
                "Facilities": rm["Facilities"],
                "Block_ID": rm["Block_ID"],
                "Block_Name": rm["Block_Name"],
                "Block_Gender": rm["Block_Gender"],
                "Hostel_ID": rm["Hostel_ID"],
                "Hostel_Name": rm["Hostel_Name"],
                "Hostel_Type": rm["Hostel_Type"],
                "student_occupancy": stud_occ,
                "guest_occupancy": guest_occ,
                "total_occupancy": total_occ,
                "available_capacity": avail_cap,
                "is_available": is_avail,
                "is_currently_assigned": is_curr_assigned,
                "active_reservations": reservations_str,
                "matches_preference": bool(matches_pref)
            })

        return jsonify({
            "status": "success",
            "guest": {
                "Guest_ID": guest["Guest_ID"],
                "Guest_Name": guest["Guest_Name"],
                "Check_In_Date": str(check_in),
                "Check_Out_Date": str(check_out),
                "Guest_Count": guest_count,
                "Room_Preference": guest["Room_Preference"],
                "Assigned_Room_ID": guest["Assigned_Room_ID"]
            },
            "totalRooms": len(room_results),
            "availableCount": sum(1 for r in room_results if r["is_available"]),
            "data": room_results
        }), 200

    except Exception as err:
        return handle_db_error(err, "fetching available rooms for guest")
    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()


@guest_bp.route("/<int:guest_id>/assign-room", methods=["PATCH", "POST"], strict_slashes=False)
@warden_required
def assign_guest_room(guest_id):
    """
    Assigns or updates a guest's room reservation.
    Performs server-side date overlap and capacity validation to prevent double-booking.
    """
    data = request.get_json(silent=True) or {}
    room_id = data.get("roomId") if "roomId" in data else data.get("Room_ID")
    admin_remarks = (data.get("adminRemarks") or data.get("Admin_Remarks") or "").strip()

    connection = None
    cursor = None
    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute("SELECT * FROM guest_stay WHERE Guest_ID = %s", (guest_id,))
        guest = cursor.fetchone()
        if not guest:
            return jsonify({"status": "error", "message": "Guest record not found."}), 404

        if guest["Status"] == "Rejected":
            return jsonify({"status": "error", "message": "Cannot assign room to a rejected guest request."}), 400

        if guest["Check_In_Status"] == "Checked-Out":
            return jsonify({"status": "error", "message": "Cannot modify room assignment for a checked-out stay."}), 400

        # If unassigning room
        if room_id is None or room_id == 0 or room_id == "":
            if guest["Check_In_Status"] == "Checked-In":
                return jsonify({"status": "error", "message": "Cannot unassign room while guest is actively checked in."}), 400
            cursor.execute("""
                UPDATE guest_stay
                SET Assigned_Room_ID = NULL,
                    Admin_Remarks = COALESCE(NULLIF(%s, ''), Admin_Remarks)
                WHERE Guest_ID = %s
            """, (admin_remarks, guest_id))
            connection.commit()
            return jsonify({"status": "success", "message": "Room assignment removed successfully."}), 200

        # Validate target room
        try:
            target_room_id = int(room_id)
        except (ValueError, TypeError):
            return jsonify({"status": "error", "message": "Invalid room ID."}), 400

        cursor.execute("""
            SELECT r.*, b.Block_Name, h.Hostel_Name
            FROM room r
            JOIN hostel_block b ON r.Block_ID = b.Block_ID
            JOIN hostel h ON b.Hostel_ID = h.Hostel_ID
            WHERE r.Room_ID = %s
        """, (target_room_id,))
        room = cursor.fetchone()
        if not room:
            return jsonify({"status": "error", "message": f"Room #{target_room_id} does not exist."}), 404

        cap = int(room["Capacity"] or 0)
        guest_count = int(guest["Guest_Count"] or 1)

        # Check student occupancy
        cursor.execute("""
            SELECT COUNT(*) AS stud_count
            FROM room_allocation
            WHERE Room_ID = %s AND Allocation_Status = 'Active'
        """, (target_room_id,))
        stud_count = int(cursor.fetchone()["stud_count"] or 0)

        # Check overlapping approved/checked-in guest stays
        cursor.execute("""
            SELECT COALESCE(SUM(Guest_Count), 0) AS guest_count,
                   GROUP_CONCAT(CONCAT(Guest_Name, ' (', Check_In_Date, ' to ', Check_Out_Date, ')') SEPARATOR '; ') AS overlaps
            FROM guest_stay
            WHERE Assigned_Room_ID = %s
              AND Status = 'Approved'
              AND Check_In_Status != 'Checked-Out'
              AND Guest_ID != %s
              AND (Check_In_Date < %s AND Check_Out_Date > %s)
        """, (target_room_id, guest_id, guest["Check_Out_Date"], guest["Check_In_Date"]))
        overlap_res = cursor.fetchone() or {}
        overlapping_guest_count = int(overlap_res.get("guest_count") or 0)

        total_occupied = stud_count + overlapping_guest_count
        avail_cap = cap - total_occupied

        # If guest is already assigned to this room, they already occupy it
        if guest.get("Assigned_Room_ID") != target_room_id and avail_cap < guest_count:
            overlaps_detail = overlap_res.get("overlaps")
            msg = f"Room {room['Room_Number']} ({room['Hostel_Name']}) has insufficient available capacity ({max(0, avail_cap)} bed(s) available, {guest_count} required) for {guest['Check_In_Date']} to {guest['Check_Out_Date']}."
            if overlaps_detail:
                msg += f" Conflicts with: {overlaps_detail}."
            return jsonify({"status": "error", "message": msg}), 400

        # Automatically ensure status is Approved when room is assigned
        new_status = "Approved" if guest["Status"] == "Pending" else guest["Status"]

        cursor.execute("""
            UPDATE guest_stay
            SET Assigned_Room_ID = %s,
                Status = %s,
                Admin_Remarks = COALESCE(NULLIF(%s, ''), Admin_Remarks)
            WHERE Guest_ID = %s
        """, (target_room_id, new_status, admin_remarks, guest_id))
        connection.commit()

        # Return updated record
        cursor.execute("""
            SELECT g.*, w.Warden_Name AS Approved_By_Name, r.Room_Number AS Assigned_Room_Number,
                   r.Room_Type AS Assigned_Room_Type, r.Floor AS Assigned_Room_Floor,
                   b.Block_Name AS Assigned_Block_Name, h.Hostel_Name AS Assigned_Hostel_Name
            FROM guest_stay g
            LEFT JOIN warden_auth w ON g.Approved_By = w.Warden_ID
            LEFT JOIN room r ON g.Assigned_Room_ID = r.Room_ID
            LEFT JOIN hostel_block b ON r.Block_ID = b.Block_ID
            LEFT JOIN hostel h ON b.Hostel_ID = h.Hostel_ID
            WHERE g.Guest_ID = %s
        """, (guest_id,))
        updated = cursor.fetchone()

        return jsonify({
            "status": "success",
            "message": f"Room {room['Room_Number']} successfully assigned to guest {guest['Guest_Name']}.",
            "data": format_guest_row(updated)
        }), 200

    except Exception as err:
        if connection and connection.is_connected():
            connection.rollback()
        return handle_db_error(err, "assigning room to guest")
    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()


# ---------------------------------------------------------------------------
# 4. LIFECYCLE ACTIONS (APPROVE, REJECT, CHECK-IN, CHECK-OUT, DELETE)
# ---------------------------------------------------------------------------

@guest_bp.route("/<int:guest_id>/approve", methods=["PATCH", "POST"], strict_slashes=False)
@warden_required
def approve_guest_request(guest_id):
    """
    Approves a guest stay request. Optionally assigns a specific guest room and notes.
    Updates Status = 'Approved', sets Approved_By = current_warden, Approved_At = NOW().
    """
    data = request.get_json(silent=True) or {}
    assigned_room_id = data.get("assignedRoomId") or data.get("Assigned_Room_ID")
    admin_remarks = (data.get("adminRemarks") or data.get("Admin_Remarks") or "").strip()

    warden = getattr(g, "current_warden", {}) or {}
    warden_id = warden.get("Warden_ID") or warden.get("warden_id")

    connection = None
    cursor = None
    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute("SELECT * FROM guest_stay WHERE Guest_ID = %s", (guest_id,))
        guest = cursor.fetchone()
        if not guest:
            return jsonify({"status": "error", "message": "Guest record not found."}), 404

        if guest["Check_In_Status"] == "Checked-Out":
            return jsonify({"status": "error", "message": "Cannot modify an already checked-out stay."}), 400

        # Validate room if assigned
        room_id_val = None
        if assigned_room_id:
            try:
                room_id_val = int(assigned_room_id)
                cursor.execute("SELECT Room_ID FROM room WHERE Room_ID = %s", (room_id_val,))
                if not cursor.fetchone():
                    return jsonify({"status": "error", "message": "Selected room does not exist."}), 400
            except (ValueError, TypeError):
                return jsonify({"status": "error", "message": "Invalid room ID."}), 400

        cursor.execute("""
            UPDATE guest_stay
            SET Status = 'Approved',
                Assigned_Room_ID = COALESCE(%s, Assigned_Room_ID),
                Admin_Remarks = COALESCE(NULLIF(%s, ''), Admin_Remarks),
                Approved_By = %s,
                Approved_At = NOW(),
                Rejection_Reason = NULL
            WHERE Guest_ID = %s
        """, (room_id_val, admin_remarks, warden_id, guest_id))
        connection.commit()

        # Fetch updated record
        cursor.execute("""
            SELECT g.*, w.Warden_Name AS Approved_By_Name, r.Room_Number AS Assigned_Room_Number,
                   b.Block_Name AS Assigned_Block_Name, h.Hostel_Name AS Assigned_Hostel_Name
            FROM guest_stay g
            LEFT JOIN warden_auth w ON g.Approved_By = w.Warden_ID
            LEFT JOIN room r ON g.Assigned_Room_ID = r.Room_ID
            LEFT JOIN hostel_block b ON r.Block_ID = b.Block_ID
            LEFT JOIN hostel h ON b.Hostel_ID = h.Hostel_ID
            WHERE g.Guest_ID = %s
        """, (guest_id,))
        updated = cursor.fetchone()

        return jsonify({
            "status": "success",
            "message": "Guest reservation request approved successfully.",
            "data": format_guest_row(updated)
        }), 200

    except Exception as err:
        if connection and connection.is_connected():
            connection.rollback()
        return handle_db_error(err, "approving guest request")
    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()


@guest_bp.route("/<int:guest_id>/reject", methods=["PATCH", "POST"], strict_slashes=False)
@warden_required
def reject_guest_request(guest_id):
    """
    Rejects a guest stay request with a required reason.
    Updates Status = 'Rejected', sets Rejection_Reason, clears room assignment if pending arrival.
    """
    data = request.get_json(silent=True) or {}
    rejection_reason = (data.get("rejectionReason") or data.get("Rejection_Reason") or "").strip()
    admin_remarks = (data.get("adminRemarks") or data.get("Admin_Remarks") or "").strip()

    if not rejection_reason:
        return jsonify({"status": "error", "message": "Rejection reason is required."}), 400

    warden = getattr(g, "current_warden", {}) or {}
    warden_id = warden.get("Warden_ID") or warden.get("warden_id")

    connection = None
    cursor = None
    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute("SELECT * FROM guest_stay WHERE Guest_ID = %s", (guest_id,))
        guest = cursor.fetchone()
        if not guest:
            return jsonify({"status": "error", "message": "Guest record not found."}), 404

        if guest["Check_In_Status"] == "Checked-In":
            return jsonify({
                "status": "error",
                "message": "Cannot reject a guest who is currently checked in. Please check them out first."
            }), 400

        # Unassign room if rejected
        cursor.execute("""
            UPDATE guest_stay
            SET Status = 'Rejected',
                Assigned_Room_ID = NULL,
                Rejection_Reason = %s,
                Admin_Remarks = COALESCE(NULLIF(%s, ''), Admin_Remarks),
                Approved_By = %s,
                Approved_At = NOW()
            WHERE Guest_ID = %s
        """, (rejection_reason, admin_remarks, warden_id, guest_id))
        connection.commit()

        cursor.execute("""
            SELECT g.*, w.Warden_Name AS Approved_By_Name
            FROM guest_stay g
            LEFT JOIN warden_auth w ON g.Approved_By = w.Warden_ID
            WHERE g.Guest_ID = %s
        """, (guest_id,))
        updated = cursor.fetchone()

        return jsonify({
            "status": "success",
            "message": "Guest request rejected.",
            "data": format_guest_row(updated)
        }), 200

    except Exception as err:
        if connection and connection.is_connected():
            connection.rollback()
        return handle_db_error(err, "rejecting guest request")
    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()


@guest_bp.route("/<int:guest_id>/check-in", methods=["PATCH", "POST"], strict_slashes=False)
@warden_required
def check_in_guest(guest_id):
    """
    Performs guest arrival check-in.
    Requirements:
      - Request must be in 'Approved' status.
      - Guest MUST have a valid Assigned_Room_ID.
      - Guest must not already be checked in (prevent duplicate check-in).
      - Guest must not be checked out.
    Updates Check_In_Status = 'Checked-In', Actual_Check_In = NOW().
    """
    connection = None
    cursor = None
    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute("SELECT * FROM guest_stay WHERE Guest_ID = %s", (guest_id,))
        guest = cursor.fetchone()
        if not guest:
            return jsonify({"status": "error", "message": "Guest record not found."}), 404

        if guest["Status"] != "Approved":
            return jsonify({
                "status": "error",
                "message": f"Cannot check in a guest whose request is '{guest['Status']}'. Request must be approved first."
            }), 400

        if not guest.get("Assigned_Room_ID"):
            return jsonify({
                "status": "error",
                "message": "Cannot check in guest without an assigned room. Please assign a room first."
            }), 400

        if guest["Check_In_Status"] == "Checked-In":
            return jsonify({
                "status": "error",
                "message": f"Guest is already checked in (Checked in at {guest.get('Actual_Check_In')})."
            }), 400

        if guest["Check_In_Status"] == "Checked-Out":
            return jsonify({
                "status": "error",
                "message": "Guest stay has already concluded (Checked Out)."
            }), 400

        cursor.execute("""
            UPDATE guest_stay
            SET Check_In_Status = 'Checked-In',
                Actual_Check_In = NOW()
            WHERE Guest_ID = %s
        """, (guest_id,))
        connection.commit()

        cursor.execute("""
            SELECT g.*, w.Warden_Name AS Approved_By_Name, r.Room_Number AS Assigned_Room_Number,
                   b.Block_Name AS Assigned_Block_Name, h.Hostel_Name AS Assigned_Hostel_Name
            FROM guest_stay g
            LEFT JOIN warden_auth w ON g.Approved_By = w.Warden_ID
            LEFT JOIN room r ON g.Assigned_Room_ID = r.Room_ID
            LEFT JOIN hostel_block b ON r.Block_ID = b.Block_ID
            LEFT JOIN hostel h ON b.Hostel_ID = h.Hostel_ID
            WHERE g.Guest_ID = %s
        """, (guest_id,))
        updated = cursor.fetchone()

        return jsonify({
            "status": "success",
            "message": f"Guest {guest['Guest_Name']} checked in successfully.",
            "data": format_guest_row(updated)
        }), 200

    except Exception as err:
        if connection and connection.is_connected():
            connection.rollback()
        return handle_db_error(err, "checking in guest")
    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()


@guest_bp.route("/<int:guest_id>/check-out", methods=["PATCH", "POST"], strict_slashes=False)
@warden_required
def check_out_guest(guest_id):
    """
    Performs guest departure check-out.
    Requirements:
      - Guest Check_In_Status must be 'Checked-In'.
    Updates Check_In_Status = 'Checked-Out', Actual_Check_Out = NOW().
    """
    connection = None
    cursor = None
    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute("SELECT * FROM guest_stay WHERE Guest_ID = %s", (guest_id,))
        guest = cursor.fetchone()
        if not guest:
            return jsonify({"status": "error", "message": "Guest record not found."}), 404

        if guest["Check_In_Status"] != "Checked-In":
            return jsonify({
                "status": "error",
                "message": f"Cannot check out guest whose status is '{guest['Check_In_Status']}'. Guest must be checked in first."
            }), 400

        cursor.execute("""
            UPDATE guest_stay
            SET Check_In_Status = 'Checked-Out',
                Actual_Check_Out = NOW()
            WHERE Guest_ID = %s
        """, (guest_id,))
        connection.commit()

        cursor.execute("""
            SELECT g.*, w.Warden_Name AS Approved_By_Name, r.Room_Number AS Assigned_Room_Number,
                   b.Block_Name AS Assigned_Block_Name, h.Hostel_Name AS Assigned_Hostel_Name
            FROM guest_stay g
            LEFT JOIN warden_auth w ON g.Approved_By = w.Warden_ID
            LEFT JOIN room r ON g.Assigned_Room_ID = r.Room_ID
            LEFT JOIN hostel_block b ON r.Block_ID = b.Block_ID
            LEFT JOIN hostel h ON b.Hostel_ID = h.Hostel_ID
            WHERE g.Guest_ID = %s
        """, (guest_id,))
        updated = cursor.fetchone()

        return jsonify({
            "status": "success",
            "message": f"Guest {guest['Guest_Name']} checked out successfully.",
            "data": format_guest_row(updated)
        }), 200

    except Exception as err:
        if connection and connection.is_connected():
            connection.rollback()
        return handle_db_error(err, "checking out guest")
    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()


@guest_bp.route("/<int:guest_id>", methods=["DELETE"], strict_slashes=False)
@warden_required
def delete_guest(guest_id):
    """
    Deletes or archives a guest record.
    Prevents deletion if the guest is currently checked in.
    """
    connection = None
    cursor = None
    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute("SELECT Check_In_Status, Guest_Name FROM guest_stay WHERE Guest_ID = %s", (guest_id,))
        guest = cursor.fetchone()
        if not guest:
            return jsonify({"status": "error", "message": "Guest record not found."}), 404

        if guest["Check_In_Status"] == "Checked-In":
            return jsonify({
                "status": "error",
                "message": "Cannot delete a guest who is currently checked in. Please check them out first."
            }), 400

        cursor.execute("DELETE FROM guest_stay WHERE Guest_ID = %s", (guest_id,))
        connection.commit()

        return jsonify({
            "status": "success",
            "message": f"Guest record for {guest['Guest_Name']} deleted successfully."
        }), 200

    except Exception as err:
        if connection and connection.is_connected():
            connection.rollback()
        return handle_db_error(err, "deleting guest record")
    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()
