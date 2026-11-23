import sys, os
sys.path.insert(0, 'HMS_backend')
from app import app
from db import get_db_connection

client = app.test_client()

# Clean up any test user from previous runs
conn = get_db_connection()
cur = conn.cursor()
cur.execute("SELECT Student_ID FROM student WHERE Email = 'ananya.verma@example.com'")
row = cur.fetchone()
if row:
    sid = row[0]
    cur.execute("DELETE FROM student_notification WHERE Student_ID = %s", (sid,))
    cur.execute("DELETE FROM student_complaint WHERE Student_ID = %s", (sid,))
    cur.execute("DELETE FROM room_change_request WHERE Student_ID = %s", (sid,))
    cur.execute("DELETE FROM mess_subscription WHERE Student_ID = %s", (sid,))
    cur.execute("DELETE FROM student_preferences WHERE Student_ID = %s", (sid,))
    cur.execute("DELETE FROM student_auth WHERE Student_ID = %s", (sid,))
    cur.execute("DELETE FROM student WHERE Student_ID = %s", (sid,))
    conn.commit()
cur.close()
conn.close()

# 1. Register student
reg_payload = {
    'fullName': 'Ananya Verma',
    'email': 'ananya.verma@example.com',
    'phone': '9876543299',
    'password': 'AnanyaPass123!',
    'gender': 'Female',
    'dob': '2004-05-15',
    'department': 'Electrical Engineering',
    'yearOfStudy': 2,
    'foodPreference': 'Vegetarian',
    'sleepSchedule': 'Early riser',
    'studyHabits': 'Studies in room',
    'language': 'English, Hindi'
}

r = client.post('/api/student/auth/register', json=reg_payload)
print('Registration response:', r.status_code, r.get_json())
assert r.status_code == 201
new_sid = r.get_json()['student_id']
assert new_sid >= 1001, f'Expected Student_ID >= 1001, got {new_sid}'

# 2. Duplicate registration test
r_dup = client.post('/api/student/auth/register', json=reg_payload)
print('Duplicate reg test:', r_dup.status_code, r_dup.get_json().get('message'))
assert r_dup.status_code == 409

# 3. Login with new credentials
r_login = client.post('/api/student/auth/login', json={'email': 'ananya.verma@example.com', 'password': 'AnanyaPass123!'})
print('Login new student:', r_login.status_code, r_login.get_json().get('student', {}).get('Name'))
assert r_login.status_code == 200

# 4. Check dashboard
r_dash = client.get('/api/student/dashboard')
d = r_dash.get_json()['data']
print('Dashboard new student:', r_dash.status_code, 'Alloc:', d['allocation'], 'Mess:', d['mess']['Plan_Name'], 'Unread:', d['unread_notifications'])
assert r_dash.status_code == 200
assert d['allocation'] is None, 'New student must not have an active allocation yet!'
assert d['unread_notifications'] == 1, 'New student must have 1 welcome notification!'
assert d['mess']['Plan_Name'] == 'Standard Veg', 'New student must have default mess subscription!'

print('STUDENT REGISTRATION AND LOGIN FLOW FULLY VERIFIED!')
