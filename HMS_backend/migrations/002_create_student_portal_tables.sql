-- Migration: 002_create_student_portal_tables.sql
-- Description: Create student authentication, mess subscriptions, room change requests, complaints, and notification tables.

-- 1. Student Authentication Table
CREATE TABLE IF NOT EXISTS student_auth (
    Auth_ID INT AUTO_INCREMENT PRIMARY KEY,
    Student_ID INT NOT NULL UNIQUE,
    Email VARCHAR(150) NOT NULL UNIQUE,
    Password_Hash VARCHAR(255) NOT NULL,
    Is_Active TINYINT(1) NOT NULL DEFAULT 1,
    Token_Version INT NOT NULL DEFAULT 1,
    Last_Login TIMESTAMP NULL DEFAULT NULL,
    Created_At TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    Updated_At TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_student_auth_student FOREIGN KEY (Student_ID) REFERENCES student(Student_ID) ON DELETE CASCADE,
    INDEX idx_student_auth_email (Email),
    INDEX idx_student_auth_active (Is_Active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Mess Subscription Table
CREATE TABLE IF NOT EXISTS mess_subscription (
    Subscription_ID INT AUTO_INCREMENT PRIMARY KEY,
    Student_ID INT NOT NULL UNIQUE,
    Plan_Name VARCHAR(100) NOT NULL DEFAULT 'Standard Vegetarian',
    Monthly_Cost DECIMAL(10, 2) NOT NULL DEFAULT 4500.00,
    Status VARCHAR(30) NOT NULL DEFAULT 'Active',
    Dietary_Remarks VARCHAR(255) NULL,
    Start_Date DATE NOT NULL,
    End_Date DATE NULL,
    Created_At TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    Updated_At TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_mess_student FOREIGN KEY (Student_ID) REFERENCES student(Student_ID) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Room Change Request Table
CREATE TABLE IF NOT EXISTS room_change_request (
    Request_ID INT AUTO_INCREMENT PRIMARY KEY,
    Student_ID INT NOT NULL,
    Current_Room_ID INT NULL,
    Target_Room_Type VARCHAR(50) NOT NULL DEFAULT 'Double',
    Reason TEXT NOT NULL,
    Status VARCHAR(30) NOT NULL DEFAULT 'Pending',
    Admin_Remarks VARCHAR(255) NULL,
    Created_At TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    Updated_At TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_rcr_student FOREIGN KEY (Student_ID) REFERENCES student(Student_ID) ON DELETE CASCADE,
    INDEX idx_rcr_student (Student_ID),
    INDEX idx_rcr_status (Status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Student Complaint / Help & Support Table
CREATE TABLE IF NOT EXISTS student_complaint (
    Complaint_ID INT AUTO_INCREMENT PRIMARY KEY,
    Student_ID INT NOT NULL,
    Category VARCHAR(50) NOT NULL DEFAULT 'Maintenance',
    Title VARCHAR(150) NOT NULL,
    Description TEXT NOT NULL,
    Priority VARCHAR(20) NOT NULL DEFAULT 'Medium',
    Status VARCHAR(30) NOT NULL DEFAULT 'Open',
    Resolution_Notes TEXT NULL,
    Created_At TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    Updated_At TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_complaint_student FOREIGN KEY (Student_ID) REFERENCES student(Student_ID) ON DELETE CASCADE,
    INDEX idx_complaint_student (Student_ID),
    INDEX idx_complaint_status (Status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Student Notification Table
CREATE TABLE IF NOT EXISTS student_notification (
    Notification_ID INT AUTO_INCREMENT PRIMARY KEY,
    Student_ID INT NOT NULL,
    Title VARCHAR(150) NOT NULL,
    Message TEXT NOT NULL,
    Category VARCHAR(50) NOT NULL DEFAULT 'General',
    Is_Read TINYINT(1) NOT NULL DEFAULT 0,
    Created_At TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_notif_student FOREIGN KEY (Student_ID) REFERENCES student(Student_ID) ON DELETE CASCADE,
    INDEX idx_notif_student (Student_ID),
    INDEX idx_notif_read (Is_Read)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
