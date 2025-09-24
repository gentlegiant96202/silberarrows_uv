-- =====================================================
-- LEASING CUSTOMERS TABLE - SIMPLIFIED VERSION
-- =====================================================
-- This table handles customer information and document management
-- for the leasing module kanban system

-- Clean up first
DROP TABLE IF EXISTS leasing_documents CASCADE;
DROP TABLE IF EXISTS leasing_customers CASCADE;

-- Create ENUM for lease status (matches kanban columns)
CREATE TYPE lease_status_enum AS ENUM (
    'appointments',
    'contracts_drafted', 
    'active_leases',
    'overdue_ending_soon',
    'closed_returned',
    'archived'
);

-- Create ENUM for employment type
CREATE TYPE employment_type_enum AS ENUM (
    'government',
    'private', 
    'self_employed',
    'unemployed'
);

-- =====================================================
-- MAIN LEASING CUSTOMERS TABLE
-- =====================================================
CREATE TABLE leasing_customers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- ===== BASIC CUSTOMER INFORMATION =====
    customer_name TEXT NOT NULL,
    customer_email TEXT,
    customer_phone TEXT NOT NULL,
    date_of_birth DATE,
    
    -- ===== IDENTIFICATION DOCUMENTS =====
    emirates_id_number TEXT,
    passport_number TEXT,
    visa_number TEXT,
    
    -- ===== ADDRESS INFORMATION =====
    address_line_1 TEXT,
    address_line_2 TEXT,
    city TEXT,
    emirate TEXT,
    
    -- ===== DOCUMENT UPLOAD URLS =====
    -- These store the URLs to uploaded document files
    emirates_id_front_url TEXT,         -- Emirates ID front scan
    emirates_id_back_url TEXT,          -- Emirates ID back scan
    passport_front_url TEXT,            -- Passport photo page
    passport_back_url TEXT,             -- Passport back page
    visa_copy_url TEXT,                 -- UAE Visa page
    address_proof_url TEXT,             -- DEWA/Etisalat bill, tenancy contract
    driving_license_front_url TEXT,     -- Driving license front
    driving_license_back_url TEXT,      -- Driving license back
    
    -- ===== DOCUMENT STATUS TRACKING =====
    -- JSON object tracking status of each document type
    documents_status JSONB DEFAULT '{
        "emirates_id_front": "pending",
        "emirates_id_back": "pending",
        "passport_front": "pending",
        "passport_back": "pending",
        "visa": "pending",
        "address_proof": "pending",
        "driving_license_front": "pending",
        "driving_license_back": "pending"
    }',
    
    -- JSON object tracking when documents were uploaded
    documents_uploaded_at JSONB DEFAULT '{}',
    
    -- JSON object tracking when documents were verified
    documents_verified_at JSONB DEFAULT '{}',
    
    -- Who verified the documents
    documents_verified_by UUID REFERENCES auth.users(id),
    
    -- ===== BASIC EMPLOYMENT INFO =====
    employer_name TEXT,
    employment_type employment_type_enum,
    monthly_salary DECIMAL(10,2),
    years_in_uae INTEGER,
    
    -- ===== LEASE STATUS & SCHEDULING =====
    lease_status lease_status_enum NOT NULL DEFAULT 'appointments',
    appointment_date DATE,
    appointment_time TIME,
    
    -- ===== INTERNAL TRACKING =====
    assigned_to UUID REFERENCES auth.users(id),
    notes TEXT,
    timeline_notes JSONB DEFAULT '[]',
    
    -- ===== AUDIT FIELDS =====
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- =====================================================
-- NO SEPARATE DOCUMENTS TABLE - USING SIMPLE APPROACH
-- =====================================================
-- All document URLs are stored directly in the main table
-- Frontend will handle separate uploads for front/back of each document

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================
CREATE INDEX idx_leasing_customers_status ON leasing_customers(lease_status);
CREATE INDEX idx_leasing_customers_phone ON leasing_customers(customer_phone);
CREATE INDEX idx_leasing_customers_created_at ON leasing_customers(created_at);
CREATE INDEX idx_leasing_customers_assigned_to ON leasing_customers(assigned_to);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE leasing_customers ENABLE ROW LEVEL SECURITY;

-- Policy for leasing customers - authenticated users can access all
CREATE POLICY "Enable all operations for authenticated users" ON leasing_customers
    FOR ALL USING (auth.role() = 'authenticated');

-- =====================================================
-- SAMPLE DATA FOR TESTING
-- =====================================================
INSERT INTO leasing_customers (
    customer_name,
    customer_email,
    customer_phone,
    date_of_birth,
    emirates_id_number,
    lease_status,
    appointment_date,
    appointment_time,
    employer_name,
    employment_type,
    monthly_salary,
    years_in_uae,
    address_line_1,
    city,
    emirate,
    notes
) VALUES 
(
    'Ahmed Al-Rashid',
    'ahmed@example.com',
    '+971501234567',
    '1985-03-15',
    '784-1985-1234567-1',
    'appointments',
    CURRENT_DATE + INTERVAL '2 days',
    '10:00',
    'Emirates NBD',
    'private',
    15000.00,
    8,
    'Dubai Marina, Building 123',
    'Dubai',
    'Dubai',
    'Initial consultation scheduled'
),
(
    'Sarah Johnson',
    'sarah@example.com',
    '+971559876543',
    '1990-07-22',
    '784-1990-7654321-2',
    'contracts_drafted',
    CURRENT_DATE - INTERVAL '1 day',
    '14:30',
    'ADNOC',
    'private',
    18000.00,
    5,
    'Business Bay, Tower 456',
    'Dubai',
    'Dubai',
    'Contract ready for review'
),
(
    'Mohammed Hassan',
    'mohammed@example.com',
    '+971524567890',
    '1988-12-10',
    '784-1988-9876543-3',
    'active_leases',
    CURRENT_DATE - INTERVAL '30 days',
    '16:00',
    'Dubai Municipality',
    'government',
    12000.00,
    10,
    'Jumeirah Lake Towers, Block A',
    'Dubai',
    'Dubai',
    'Active lease, payments up to date'
),
(
    'Fatima Al-Zahra',
    'fatima@example.com',
    '+971567890123',
    '1992-05-18',
    '784-1992-5432109-4',
    'archived',
    CURRENT_DATE - INTERVAL '365 days',
    '11:30',
    'Etisalat',
    'private',
    14000.00,
    6,
    'Downtown Dubai, Apartment 789',
    'Dubai',
    'Dubai',
    'Lease completed successfully, vehicle returned'
);

-- =====================================================
-- SUMMARY
-- =====================================================
/*
This simplified schema includes:

LEASING CUSTOMERS TABLE:
✅ Basic customer information (name, email, phone, DOB)
✅ Identification numbers (Emirates ID, Passport, Visa)
✅ Address information (without PO Box)
✅ Document upload URLs (8 separate fields for front/back uploads)
✅ Document status tracking with JSON (8 separate statuses)
✅ Basic employment info (without salary certificate)
✅ Kanban status management
✅ Appointment scheduling
✅ Internal notes and timeline

SIMPLE APPROACH:
✅ Single table design - no separate documents table
✅ Frontend handles separate front/back uploads
✅ 8 URL fields for complete document coverage

REMOVED FIELDS (as requested):
❌ Nationality
❌ Vehicle interest (make, model, year)
❌ PO Box
❌ Bank statements
❌ No objection letter  
❌ Salary certificate
❌ Complex lease terms and payment tracking
❌ Invoice-related fields

FEATURES:
✅ Proper indexes for performance
✅ Row Level Security enabled
✅ Sample data for testing
✅ Enum types for data consistency
✅ JSON fields for flexible document tracking
✅ Audit fields for compliance
*/

