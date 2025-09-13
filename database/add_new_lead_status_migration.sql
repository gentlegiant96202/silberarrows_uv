-- Migration: Add new_lead status and make appointment fields optional
-- Run this on your Supabase database to support the new lead workflow

-- =============================================
-- 1. ADD 'new_lead' TO THE ENUM TYPE
-- =============================================
ALTER TYPE lead_status_enum ADD VALUE 'new_lead';

-- =============================================
-- 2. UPDATE THE CHECK CONSTRAINT TO INCLUDE 'new_lead'
-- =============================================
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_status_check;
ALTER TABLE leads ADD CONSTRAINT leads_status_check 
    CHECK (status IN ('new_lead', 'new_customer', 'negotiation', 'won', 'delivered', 'lost'));

-- =============================================
-- 3. MAKE APPOINTMENT FIELDS NULLABLE (for new leads without appointments)
-- =============================================
ALTER TABLE leads ALTER COLUMN appointment_date DROP NOT NULL;
ALTER TABLE leads ALTER COLUMN time_slot DROP NOT NULL;

-- =============================================
-- 4. UPDATE DEFAULT STATUS TO 'new_lead'
-- =============================================
ALTER TABLE leads ALTER COLUMN status SET DEFAULT 'new_lead';

-- =============================================
-- 5. ADD TIMELINE_NOTES COLUMN (if not exists)
-- =============================================
ALTER TABLE leads ADD COLUMN IF NOT EXISTS timeline_notes JSONB DEFAULT '[]';

-- =============================================
-- 6. ADD INVENTORY_CAR_ID COLUMN (if not exists)
-- =============================================
ALTER TABLE leads ADD COLUMN IF NOT EXISTS inventory_car_id UUID REFERENCES cars(id);

-- =============================================
-- 7. UPDATE EXISTING DATA (OPTIONAL)
-- =============================================
-- Uncomment these lines if you want to migrate existing data

-- Convert existing leads without appointments to new_lead status
-- UPDATE leads 
-- SET status = 'new_lead' 
-- WHERE status = 'new_customer' 
-- AND (appointment_date IS NULL OR time_slot IS NULL);

-- Keep leads with complete appointments as new_customer (appointments)
-- UPDATE leads 
-- SET status = 'new_customer' 
-- WHERE status = 'new_customer' 
-- AND appointment_date IS NOT NULL 
-- AND time_slot IS NOT NULL;

-- =============================================
-- 8. VERIFY THE CHANGES
-- =============================================
-- Check the updated ENUM
-- SELECT unnest(enum_range(NULL::lead_status_enum)) AS status_values;

-- Check table constraints
-- SELECT conname, consrc FROM pg_constraint WHERE conrelid = 'leads'::regclass AND contype = 'c';

-- Check column nullability
-- SELECT column_name, is_nullable, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'leads' 
-- AND column_name IN ('appointment_date', 'time_slot', 'status');

COMMENT ON TABLE leads IS 'Updated to support new_lead status and optional appointment fields'; 