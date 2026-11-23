-- Migration: 004_update_roommate_match.sql
-- Description: Enhance roommate_match table with auto-increment ID, unique pair constraint, and match explanation audit columns.

-- 1. Ensure Match_ID is AUTO_INCREMENT
ALTER TABLE roommate_match MODIFY Match_ID INT AUTO_INCREMENT;

-- 2. Prevent duplicate symmetrical pairings
-- (Student_ID_1, Student_ID_2 stored in canonical order Student_ID_1 < Student_ID_2)
-- Note: May already exist if applied previously
-- ALTER TABLE roommate_match ADD UNIQUE KEY uq_roommate_pair (Student_ID_1, Student_ID_2);

-- 3. Match explanation and timestamp tracking
ALTER TABLE roommate_match 
    ADD COLUMN IF NOT EXISTS Match_Explanation TEXT NULL,
    ADD COLUMN IF NOT EXISTS Created_At TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN IF NOT EXISTS Updated_At TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;
