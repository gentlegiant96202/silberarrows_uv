-- =====================================================
-- STEP 1: Add customer_number to leads table
-- =====================================================
-- The lead IS the customer. Customer number should live on leads,
-- not on vehicle_reservations. Generated when lead status → 'won'
-- =====================================================

-- 1. Add customer_number column to leads
ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS customer_number TEXT UNIQUE;

-- 2. Create sequence for customer numbers (starting at 1000)
-- Check if sequence exists first
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'lead_customer_number_seq') THEN
        CREATE SEQUENCE lead_customer_number_seq START 1000;
    END IF;
END $$;

-- 3. Create function to generate customer number when status becomes 'won'
CREATE OR REPLACE FUNCTION generate_lead_customer_number()
RETURNS TRIGGER AS $$
BEGIN
    -- Only generate customer number when:
    -- 1. Status changes TO 'won' (from something else)
    -- 2. Customer number doesn't already exist
    IF NEW.status = 'won' AND (OLD.status IS NULL OR OLD.status != 'won') AND NEW.customer_number IS NULL THEN
        NEW.customer_number := 'CIN-' || nextval('lead_customer_number_seq');
        RAISE NOTICE 'Generated customer number % for lead %', NEW.customer_number, NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Create trigger on leads table
DROP TRIGGER IF EXISTS generate_lead_customer_number_trigger ON leads;
CREATE TRIGGER generate_lead_customer_number_trigger
    BEFORE INSERT OR UPDATE ON leads
    FOR EACH ROW
    EXECUTE FUNCTION generate_lead_customer_number();

-- 5. Backfill existing 'won' leads with customer numbers
-- First, get the max existing customer number from vehicle_reservations to avoid conflicts
DO $$
DECLARE
    max_existing INTEGER;
    next_num INTEGER;
BEGIN
    -- Get max from vehicle_reservations.customer_number (format: CIN-XXXX)
    SELECT COALESCE(MAX(SUBSTRING(customer_number FROM 5)::INTEGER), 999)
    INTO max_existing
    FROM vehicle_reservations
    WHERE customer_number IS NOT NULL AND customer_number LIKE 'CIN-%';
    
    -- Set sequence to start after the max
    next_num := max_existing + 1;
    PERFORM setval('lead_customer_number_seq', next_num, false);
    
    RAISE NOTICE 'Set lead_customer_number_seq to start at %', next_num;
END $$;

-- 6. Copy existing customer numbers from vehicle_reservations to leads
UPDATE leads l
SET customer_number = vr.customer_number
FROM vehicle_reservations vr
WHERE vr.lead_id = l.id
AND vr.customer_number IS NOT NULL
AND l.customer_number IS NULL;

-- 7. Generate customer numbers for any 'won' leads that don't have one yet
UPDATE leads
SET customer_number = 'CIN-' || nextval('lead_customer_number_seq')
WHERE status = 'won'
AND customer_number IS NULL;

-- 8. Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_leads_customer_number ON leads(customer_number);

-- 9. Verify the migration
SELECT 
    'Leads with customer numbers:' as check_type,
    COUNT(*) as count
FROM leads 
WHERE customer_number IS NOT NULL

UNION ALL

SELECT 
    'Won leads without customer numbers:' as check_type,
    COUNT(*) as count
FROM leads 
WHERE status = 'won' AND customer_number IS NULL;

-- Show sample data
SELECT 
    id,
    full_name,
    status,
    customer_number,
    created_at
FROM leads
WHERE customer_number IS NOT NULL
ORDER BY customer_number DESC
LIMIT 10;

-- =====================================================
-- RESULT: 
-- - Leads now have customer_number (CIN-XXXX)
-- - Generated automatically when status → 'won'
-- - Existing data migrated from vehicle_reservations
-- =====================================================

