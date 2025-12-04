-- =====================================================
-- STEP 3: Fix vehicle_reservations (deals table)
-- =====================================================
-- 1. Remove unique constraint on lead_id (allow multiple deals per customer)
-- 2. Add car_id column (direct link to inventory)
-- 3. Add deal_status column
-- 4. Add deal_number column
-- =====================================================

-- 1. Remove unique constraint on lead_id
-- First, find and drop the constraint
DO $$
DECLARE
    constraint_name TEXT;
BEGIN
    -- Find unique constraint on lead_id
    SELECT conname INTO constraint_name
    FROM pg_constraint c
    JOIN pg_attribute a ON a.attnum = ANY(c.conkey) AND a.attrelid = c.conrelid
    WHERE c.conrelid = 'vehicle_reservations'::regclass
    AND c.contype = 'u'  -- unique constraint
    AND a.attname = 'lead_id';
    
    IF constraint_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE vehicle_reservations DROP CONSTRAINT ' || constraint_name;
        RAISE NOTICE 'Dropped unique constraint: %', constraint_name;
    ELSE
        RAISE NOTICE 'No unique constraint found on lead_id';
    END IF;
END $$;

-- Also check for unique index and drop it
DROP INDEX IF EXISTS vehicle_reservations_lead_id_key;
DROP INDEX IF EXISTS idx_vehicle_reservations_lead_id_unique;

-- 2. Add car_id column (link to inventory)
ALTER TABLE vehicle_reservations 
ADD COLUMN IF NOT EXISTS car_id UUID REFERENCES cars(id);

-- Populate car_id from leads.inventory_car_id for existing records
UPDATE vehicle_reservations vr
SET car_id = l.inventory_car_id
FROM leads l
WHERE vr.lead_id = l.id
AND vr.car_id IS NULL
AND l.inventory_car_id IS NOT NULL;

-- 3. Add deal_status column
DO $$ BEGIN
    CREATE TYPE deal_status_enum AS ENUM (
        'reserved',     -- Customer has reserved the car
        'sold',         -- Deal completed, car sold
        'delivered',    -- Car handed over to customer
        'cancelled'     -- Deal cancelled
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

ALTER TABLE vehicle_reservations 
ADD COLUMN IF NOT EXISTS deal_status deal_status_enum DEFAULT 'reserved';

-- Migrate existing document_status to deal_status
UPDATE vehicle_reservations
SET deal_status = CASE 
    WHEN document_status = 'completed' THEN 'sold'::deal_status_enum
    WHEN document_status = 'cancelled' THEN 'cancelled'::deal_status_enum
    WHEN document_status = 'reversed' THEN 'cancelled'::deal_status_enum
    ELSE 'reserved'::deal_status_enum
END
WHERE deal_status IS NULL OR deal_status = 'reserved';

-- 4. Add deal_number column (separate from document_number which might be INV-xxx)
ALTER TABLE vehicle_reservations 
ADD COLUMN IF NOT EXISTS deal_number TEXT UNIQUE;

-- Create sequence for deal numbers
CREATE SEQUENCE IF NOT EXISTS deal_number_seq START 1000;

-- Populate deal_number from document_number where it's RES-xxx
UPDATE vehicle_reservations
SET deal_number = document_number
WHERE document_number LIKE 'RES-%'
AND deal_number IS NULL;

-- FIRST: Update sequence to be higher than ALL existing numbers (from document_number)
DO $$
DECLARE
    max_res_num INTEGER;
BEGIN
    -- Get max from BOTH document_number AND deal_number
    SELECT COALESCE(MAX(num), 999) INTO max_res_num
    FROM (
        SELECT SUBSTRING(document_number FROM 5)::INTEGER as num
        FROM vehicle_reservations
        WHERE document_number LIKE 'RES-%'
        UNION ALL
        SELECT SUBSTRING(deal_number FROM 5)::INTEGER as num
        FROM vehicle_reservations
        WHERE deal_number LIKE 'RES-%'
    ) combined;
    
    PERFORM setval('deal_number_seq', max_res_num + 1, false);
    RAISE NOTICE 'Set deal_number_seq to start at %', max_res_num + 1;
END $$;

-- THEN: Generate deal_number for records that don't have one
UPDATE vehicle_reservations
SET deal_number = 'RES-' || nextval('deal_number_seq')
WHERE deal_number IS NULL;

-- 5. Create function to auto-generate deal_number
CREATE OR REPLACE FUNCTION generate_deal_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.deal_number IS NULL THEN
        NEW.deal_number := 'RES-' || nextval('deal_number_seq');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS generate_deal_number_trigger ON vehicle_reservations;
CREATE TRIGGER generate_deal_number_trigger
    BEFORE INSERT ON vehicle_reservations
    FOR EACH ROW
    EXECUTE FUNCTION generate_deal_number();

-- 6. Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_vehicle_reservations_car_id ON vehicle_reservations(car_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_reservations_deal_status ON vehicle_reservations(deal_status);
CREATE INDEX IF NOT EXISTS idx_vehicle_reservations_deal_number ON vehicle_reservations(deal_number);

-- Keep non-unique index on lead_id for performance
CREATE INDEX IF NOT EXISTS idx_vehicle_reservations_lead_id ON vehicle_reservations(lead_id);

-- 7. Verify changes
SELECT 'Schema changes applied:' as status;

-- Check lead_id is no longer unique
SELECT 
    'lead_id unique constraint:' as check_type,
    CASE WHEN COUNT(*) = 0 THEN 'REMOVED ✓' ELSE 'STILL EXISTS ✗' END as result
FROM pg_constraint c
JOIN pg_attribute a ON a.attnum = ANY(c.conkey) AND a.attrelid = c.conrelid
WHERE c.conrelid = 'vehicle_reservations'::regclass
AND c.contype = 'u'
AND a.attname = 'lead_id';

-- Check new columns exist
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'vehicle_reservations'
AND column_name IN ('car_id', 'deal_status', 'deal_number')
ORDER BY column_name;

-- Show sample data
SELECT 
    deal_number,
    deal_status,
    car_id,
    lead_id,
    customer_name,
    vehicle_make_model
FROM vehicle_reservations
ORDER BY created_at DESC
LIMIT 10;

-- =====================================================
-- RESULT:
-- - lead_id no longer unique (multiple deals per customer OK)
-- - car_id links directly to inventory
-- - deal_number (RES-XXXX) auto-generated
-- - deal_status tracks deal lifecycle
-- =====================================================

