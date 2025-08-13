-- =====================================================
-- CALL MANAGEMENT SYSTEM - UNIFIED SINGLE TABLE
-- =====================================================
-- This one table handles:
-- 1. Call log entries (your spreadsheet data)
-- 2. Staff management records
-- 3. Monthly working days configuration
-- 4. All with proper indexing and constraints

-- Clean up first
DROP TABLE IF EXISTS call_management CASCADE;

-- Create ENUM for record types
CREATE TYPE call_record_type AS ENUM (
    'call_entry',           -- Individual call log entries
    'staff_member',         -- Staff directory entries  
    'working_days_config'   -- Monthly working days configuration
);

-- Create ENUM for departments
CREATE TYPE department_type AS ENUM (
    'Service', 'Sales', 'Leasing', 'Admin'
);

-- Create ENUM for staff status
CREATE TYPE staff_status AS ENUM (
    'Active', 'Inactive'
);

-- =====================================================
-- UNIFIED TABLE - ONE TABLE FOR EVERYTHING
-- =====================================================
CREATE TABLE call_management (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Record type determines what this row represents
    record_type call_record_type NOT NULL,
    
    -- ===== CALL ENTRY FIELDS =====
    -- These match your exact spreadsheet columns
    call_date DATE,                    -- Date column
    call_time TIME,                    -- Time column  
    customer_name TEXT,                -- Customer Name
    phone_number TEXT,                 -- Phone Number
    reach_out_method TEXT,             -- Reach Out Method
    person_in_charge TEXT,             -- Person in Charge
    answered_yn TEXT,                  -- Answered Y/N
    action_taken TEXT,                 -- Action Taken
    person_in_charge_2 TEXT,           -- Person in Charge 2
    answered_yn_2 TEXT,                -- Answered Y/N 2
    notes TEXT,                        -- Notes
    
    -- ===== STAFF MEMBER FIELDS =====
    staff_name TEXT,                   -- Staff member name
    department department_type,        -- Service, Sales, Leasing, Admin
    staff_status staff_status,         -- Active/Inactive
    join_date DATE,                    -- When they joined
    leave_date DATE,                   -- When they left (if inactive)
    email TEXT,                        -- Staff email
    staff_phone TEXT,                  -- Staff phone number
    
    -- ===== WORKING DAYS CONFIG FIELDS =====
    config_year INTEGER,               -- Year (2024, 2025, etc.)
    config_month INTEGER,              -- Month (1-12)
    working_days INTEGER,              -- Number of working days in month
    total_days INTEGER,                -- Total days in month
    
    -- ===== METADATA =====
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================
CREATE INDEX idx_call_management_record_type ON call_management(record_type);
CREATE INDEX idx_call_management_call_date ON call_management(call_date) WHERE record_type = 'call_entry';
CREATE INDEX idx_call_management_staff_status ON call_management(staff_status) WHERE record_type = 'staff_member';
CREATE INDEX idx_call_management_working_config ON call_management(config_year, config_month) WHERE record_type = 'working_days_config';
CREATE INDEX idx_call_management_department ON call_management(department) WHERE record_type = 'staff_member';

-- =====================================================
-- CONSTRAINTS FOR DATA INTEGRITY
-- =====================================================
-- Ensure call entries have required call fields
ALTER TABLE call_management ADD CONSTRAINT check_call_entry_fields 
    CHECK (
        record_type != 'call_entry' OR 
        (call_date IS NOT NULL AND customer_name IS NOT NULL)
    );

-- Ensure staff members have required staff fields  
ALTER TABLE call_management ADD CONSTRAINT check_staff_member_fields
    CHECK (
        record_type != 'staff_member' OR 
        (staff_name IS NOT NULL AND department IS NOT NULL AND staff_status IS NOT NULL)
    );

-- Ensure working days config has required config fields
ALTER TABLE call_management ADD CONSTRAINT check_working_config_fields
    CHECK (
        record_type != 'working_days_config' OR 
        (config_year IS NOT NULL AND config_month IS NOT NULL AND working_days IS NOT NULL)
    );

-- Prevent duplicate working days config for same month/year
CREATE UNIQUE INDEX idx_unique_working_config 
    ON call_management(config_year, config_month) 
    WHERE record_type = 'working_days_config';

-- =====================================================
-- INSERT SAMPLE DATA
-- =====================================================

-- 1. INSERT STAFF MEMBERS (matches your frontend data)
INSERT INTO call_management (
    record_type, staff_name, department, staff_status, join_date, email, staff_phone
) VALUES
('staff_member', 'Gareth', 'Service', 'Active', '2023-01-15', 'gareth@silberarrows.com', '+971 50 123 4567'),
('staff_member', 'Daniel', 'Sales', 'Active', '2023-03-20', 'daniel@silberarrows.com', '+971 55 987 6543'),
('staff_member', 'Alex', 'Sales', 'Active', '2023-05-10', 'alex@silberarrows.com', '+971 52 456 7890'),
('staff_member', 'Nick', 'Leasing', 'Active', '2023-07-01', 'nick@silberarrows.com', '+971 54 321 0987'),
('staff_member', 'Remi', 'Service', 'Active', '2023-09-15', 'remi@silberarrows.com', '+971 56 789 0123'),
('staff_member', 'John Smith', 'Sales', 'Inactive', '2022-08-01', 'john.smith@silberarrows.com', '+971 50 555 0123');

-- 2. INSERT WORKING DAYS CONFIG (matches your frontend config)
INSERT INTO call_management (
    record_type, config_year, config_month, working_days, total_days
) VALUES
-- 2024
('working_days_config', 2024, 1, 23, 31),  -- January
('working_days_config', 2024, 2, 21, 29),  -- February
('working_days_config', 2024, 3, 21, 31),  -- March
('working_days_config', 2024, 4, 22, 30),  -- April
('working_days_config', 2024, 5, 23, 31),  -- May
('working_days_config', 2024, 6, 20, 30),  -- June
('working_days_config', 2024, 7, 23, 31),  -- July
('working_days_config', 2024, 8, 22, 31),  -- August
('working_days_config', 2024, 9, 21, 30),  -- September
('working_days_config', 2024, 10, 23, 31), -- October
('working_days_config', 2024, 11, 21, 30), -- November
('working_days_config', 2024, 12, 22, 31), -- December
-- 2025
('working_days_config', 2025, 1, 23, 31),  -- January
('working_days_config', 2025, 2, 20, 28),  -- February
('working_days_config', 2025, 3, 21, 31),  -- March
('working_days_config', 2025, 4, 22, 30),  -- April
('working_days_config', 2025, 5, 22, 31),  -- May
('working_days_config', 2025, 6, 21, 30),  -- June
('working_days_config', 2025, 7, 23, 31),  -- July
('working_days_config', 2025, 8, 21, 31),  -- August
('working_days_config', 2025, 9, 22, 30),  -- September
('working_days_config', 2025, 10, 23, 31), -- October
('working_days_config', 2025, 11, 20, 30), -- November
('working_days_config', 2025, 12, 22, 31); -- December

-- 3. INSERT SAMPLE CALL ENTRIES (matches your frontend format)
INSERT INTO call_management (
    record_type, call_date, call_time, customer_name, phone_number, 
    reach_out_method, person_in_charge, answered_yn, action_taken, 
    person_in_charge_2, answered_yn_2, notes
) VALUES
('call_entry', '2024-07-15', '09:30', 'Ahmed Hassan', '971501234567', 'Cold Call', 'Daniel', 'Yes', 'Scheduled Meeting', 'Alex', 'Yes', 'Interested in BMW X5'),
('call_entry', '2024-07-15', '10:15', 'Sarah Johnson', '971551234567', 'Lead Follow-up', 'Gareth', 'No', 'Left Voicemail', '', '', 'Third attempt'),
('call_entry', '2024-07-15', '11:00', 'Mohammed Ali', '971521234567', 'Referral', 'Nick', 'Yes', 'Quote Sent', '', '', 'Leasing inquiry for Mercedes'),
('call_entry', '2024-07-15', '14:30', 'ANONYMOUS', 'ANONYMOUS', 'Inbound', 'Daniel', 'Yes', 'Information Provided', '', '', 'General inquiry about services'),
('call_entry', '2024-07-16', '09:00', 'Lisa Williams', '971541234567', 'Cold Call', 'Alex', 'Yes', 'Scheduled Test Drive', 'Daniel', 'Yes', 'Audi A4 test drive arranged'),
('call_entry', '2024-07-16', '10:45', 'Omar Abdullah', '971561234567', 'Lead Follow-up', 'Remi', 'No', 'Call Back Later', '', '', 'Busy, try afternoon'),
('call_entry', '2024-07-16', '15:20', 'Emily Davis', '971501234568', 'Referral', 'Gareth', 'Yes', 'Quote Sent', '', '', 'Service package inquiry');

-- =====================================================
-- HELPER VIEWS FOR EASY QUERYING
-- =====================================================

-- View for call entries only
CREATE VIEW call_entries AS 
SELECT 
    id, call_date, call_time, customer_name, phone_number,
    reach_out_method, person_in_charge, answered_yn, action_taken,
    person_in_charge_2, answered_yn_2, notes, created_at, updated_at
FROM call_management 
WHERE record_type = 'call_entry'
ORDER BY call_date DESC, call_time DESC;

-- View for staff members only  
CREATE VIEW staff_directory AS
SELECT 
    id, staff_name, department, staff_status, join_date, leave_date,
    email, staff_phone, created_at, updated_at
FROM call_management
WHERE record_type = 'staff_member'
ORDER BY staff_status, department, staff_name;

-- View for working days config only
CREATE VIEW working_days_config AS
SELECT 
    id, config_year, config_month, working_days, total_days,
    created_at, updated_at
FROM call_management
WHERE record_type = 'working_days_config'
ORDER BY config_year DESC, config_month DESC;

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE call_management ENABLE ROW LEVEL SECURITY;

-- Allow all operations for authenticated users
CREATE POLICY "Enable all operations for authenticated users" ON call_management
    FOR ALL USING (auth.role() = 'authenticated');

-- =====================================================
-- SUMMARY OF THIS UNIFIED APPROACH
-- =====================================================
/*
BENEFITS OF ONE TABLE:
✅ Simple to manage - just one table to maintain
✅ Single API endpoint can handle all operations  
✅ Consistent permissions and security
✅ Easy backup and migration
✅ No complex JOIN queries needed
✅ Type safety with ENUMs
✅ Proper indexing for performance

HOW IT WORKS:
- record_type column determines what each row represents
- Call entries use call_* fields
- Staff members use staff_* fields  
- Working days config uses config_* fields
- Unused fields are simply NULL (no storage waste)
- Views provide clean interfaces for each data type

FRONTEND INTEGRATION:
- Filter by record_type to get specific data
- Use views for cleaner queries
- Single Supabase table to connect to
- All your existing mock data structure preserved
*/ 