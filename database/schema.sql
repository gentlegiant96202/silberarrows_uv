-- SilberArrows CRM Database Schema
-- Clean schema based on actual form fields being collected
-- Drop existing tables for clean rebuild
DROP TABLE IF EXISTS leads CASCADE;
DROP TABLE IF EXISTS consignments CASCADE;


-- Create ENUM for lead status (Kanban columns)
CREATE TYPE lead_status_enum AS ENUM (
    'new_customer',
    'negotiation', 
    'won',
    'delivered',
    'lost'
);

-- Create ENUM for consignment status
CREATE TYPE consignment_status_enum AS ENUM (
    'new_lead',
    'negotiation',
    'pre_inspection',
    'consigned_purchased',
    'lost'
);

-- Create ENUM for payment type
CREATE TYPE payment_type_enum AS ENUM ('monthly', 'cash');



-- =============================================
-- MAIN LEADS TABLE
-- =============================================
CREATE TABLE leads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    full_name TEXT NOT NULL,
    country_code TEXT NOT NULL DEFAULT '+971',
    phone_number TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'new_customer' CHECK (status IN ('new_customer', 'negotiation', 'won', 'delivered', 'lost')),
    model_of_interest TEXT NOT NULL,
    max_age TEXT NOT NULL,
    payment_type TEXT NOT NULL CHECK (payment_type IN ('monthly', 'cash')),
    monthly_budget INTEGER DEFAULT 0,
    total_budget INTEGER DEFAULT 0,
    appointment_date DATE NOT NULL,
    time_slot TIME NOT NULL,
    notes TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- =============================================
-- CONSIGNMENTS TABLE (for scraped leads)
-- =============================================
CREATE TABLE consignments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    status TEXT NOT NULL DEFAULT 'new_lead' CHECK (status IN ('new_lead', 'negotiation', 'pre_inspection', 'consigned_purchased', 'lost')),
    phone_number TEXT,
    vehicle_model TEXT,
    asking_price INTEGER,
    listing_url TEXT NOT NULL UNIQUE, -- Prevent duplicate URLs
    notes TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);



-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_appointment_date ON leads(appointment_date);
CREATE INDEX idx_leads_created_at ON leads(created_at);
CREATE INDEX idx_leads_phone ON leads(phone_number);
CREATE INDEX idx_leads_model ON leads(model_of_interest);

CREATE INDEX idx_consignments_status ON consignments(status);
CREATE INDEX idx_consignments_created_at ON consignments(created_at);
CREATE INDEX idx_consignments_phone ON consignments(phone_number);
CREATE INDEX idx_consignments_url ON consignments(listing_url);



-- =============================================
-- TRIGGER FOR UPDATED_AT
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_leads_updated_at 
    BEFORE UPDATE ON leads 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_consignments_updated_at 
    BEFORE UPDATE ON consignments 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- KANBAN BOARD VIEW
-- =============================================
CREATE OR REPLACE VIEW kanban_board_view AS
SELECT 
    id,
    full_name,
    phone_number,
    country_code,
    status,
    model_of_interest,
    max_age,
    payment_type,
    monthly_budget,
    total_budget,
    appointment_date,
    time_slot,
    notes,
    created_at,
    CONCAT(country_code, ' ', phone_number) as full_phone_number
FROM leads
ORDER BY created_at DESC;

-- =============================================
-- CONSIGNMENTS KANBAN BOARD VIEW
-- =============================================
CREATE OR REPLACE VIEW consignments_kanban_view AS
SELECT 
    id,
    status,
    phone_number,
    vehicle_model,
    asking_price,
    listing_url,
    notes,
    created_at,
    updated_at
FROM consignments
ORDER BY created_at DESC;

-- =============================================
-- SAMPLE DATA FOR TESTING
-- =============================================
INSERT INTO leads (
    full_name,
    country_code,
    phone_number,
    status,
    model_of_interest,
    max_age,
    payment_type,
    monthly_budget,
    total_budget,
    appointment_date,
    time_slot,
    notes
) VALUES 
(
    'Ahmed Al-Mansoori',
    '+971',
    '501234567',
    'new_customer',
    'C',
    '3yrs',
    'monthly',
    3500.00,
    150000.00,
    CURRENT_DATE + INTERVAL '1 day',
    '10:00',
    'Interested in Mercedes C-Class, prefers white color'
),
(
    'Sarah Johnson', 
    '+971',
    '502345678',
    'negotiation',
    'E',
    '2yrs',
    'cash',
    0.00,
    250000.00,
    CURRENT_DATE + INTERVAL '2 days',
    '14:30',
    'Cash buyer, looking for E-Class'
),
(
    'Mohammed Hassan',
    '+971', 
    '503456789',
    'won',
    'GLC',
    '1yr',
    'monthly',
    4000.00,
    180000.00,
    CURRENT_DATE + INTERVAL '3 days',
    '09:15',
    'Deal closed for GLC'
),
(
    'Lisa Thompson',
    '+971',
    '504567890', 
    'delivered',
    'S',
    '2yrs',
    'cash',
    0.00,
    400000.00,
    CURRENT_DATE - INTERVAL '1 day',
    '16:00',
    'S-Class delivered successfully'
),
(
    'Omar Abdullah',
    '+971',
    '505678901',
    'lost',
    'A',
    '4yrs',
    'monthly',
    2500.00,
    120000.00,
    CURRENT_DATE,
    '11:30',
    'Customer went with competitor'
);

-- =============================================
-- ENABLE ROW LEVEL SECURITY (Optional)
-- =============================================
-- Uncomment these if you need user-based access control

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE consignments ENABLE ROW LEVEL SECURITY;


-- CREATE POLICY "Enable all operations for authenticated users" ON leads
--     FOR ALL USING (true);

-- CREATE POLICY "Enable all operations for authenticated users" ON consignments
--     FOR ALL USING (true);



-- =============================================
-- SUMMARY
-- =============================================
/*
This schema includes:

LEADS TABLE - matches your form fields:
1) Full Name → full_name
2) Phone Number → country_code + phone_number  
3) Status → status (new_customer, negotiation, won, delivered, lost)
4) Model of Interest → model_of_interest
5) Max Age → max_age
6) Payment → payment_type (monthly, cash)
7) Monthly Budget → monthly_budget
8) Total Budget → total_budget  
9) Date → appointment_date
10) Time Slot → time_slot
11) Notes → notes

CONSIGNMENTS TABLE - for scraped leads:
- status (new_lead, negotiation, pre_inspection, consigned_purchased, lost)
- phone_number (extracted from Dubizzle)
- vehicle_model (car title)
- asking_price (price from listing)
- listing_url (unique constraint to prevent duplicates)
- notes



FEATURES:
- Proper data types and constraints
- Kanban board views for both leads and consignments
- Sample data for testing
- Indexes for performance
- Auto-updating timestamps
- Unique constraints to prevent duplicates
*/ 