-- Migration: 001_create_warden_auth.sql
-- Description: Create warden_auth table for Warden authentication and role-based access control.

CREATE TABLE IF NOT EXISTS warden_auth (
    Warden_ID INT AUTO_INCREMENT PRIMARY KEY,
    Warden_Name VARCHAR(100) NOT NULL,
    Username VARCHAR(100) NOT NULL UNIQUE,
    Email VARCHAR(150) NULL UNIQUE,
    Password_Hash VARCHAR(255) NOT NULL,
    Role VARCHAR(50) NOT NULL DEFAULT 'Warden',
    Is_Active TINYINT(1) NOT NULL DEFAULT 1,
    Token_Version INT NOT NULL DEFAULT 1,
    Last_Login TIMESTAMP NULL DEFAULT NULL,
    Created_At TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    Updated_At TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_warden_username (Username),
    INDEX idx_warden_active (Is_Active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
