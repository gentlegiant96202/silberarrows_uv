-- Add auto-generated customer number to vehicle_reservations table
-- Format: CIN-1000, CIN-1001, etc.

-- Step 1: Add customer_number column
ALTER TABLE vehicle_reservations 
ADD COLUMN IF NOT EXISTS customer_number TEXT UNIQUE;

-- Step 2: Create sequence for customer numbers starting at 1000
CREATE SEQUENCE IF NOT EXISTS customer_number_seq START 1000;

-- Step 3: Create function to generate customer number
CREATE OR REPLACE FUNCTION generate_customer_number()
RETURNS TRIGGER AS $$
BEGIN
    -- Only generate customer number on INSERT if it's NULL
    IF TG_OP = 'INSERT' AND NEW.customer_number IS NULL THEN
        NEW.customer_number := 'CIN-' || nextval('customer_number_seq');
        RAISE NOTICE 'Generated customer number: %', NEW.customer_number;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Create trigger to auto-generate customer numbers
DROP TRIGGER IF EXISTS generate_customer_number_trigger ON vehicle_reservations;
CREATE TRIGGER generate_customer_number_trigger
    BEFORE INSERT ON vehicle_reservations
    FOR EACH ROW
    EXECUTE FUNCTION generate_customer_number();

-- Step 5: Backfill existing records with customer numbers
DO $$
DECLARE
    rec RECORD;
    cust_counter INTEGER := 1000;
BEGIN
    -- Get current max from sequence to avoid conflicts
    SELECT COALESCE(MAX(SUBSTRING(customer_number FROM 5)::INTEGER), 999) + 1
    INTO cust_counter
    FROM vehicle_reservations
    WHERE customer_number IS NOT NULL;
    
    -- Update records without customer numbers (ordered by creation date)
    FOR rec IN 
        SELECT id 
        FROM vehicle_reservations 
        WHERE customer_number IS NULL 
        ORDER BY created_at ASC
    LOOP
        UPDATE vehicle_reservations 
        SET customer_number = 'CIN-' || cust_counter
        WHERE id = rec.id;
        
        cust_counter := cust_counter + 1;
    END LOOP;
    
    -- Reset sequence to next available number
    PERFORM setval('customer_number_seq', cust_counter);
    
    RAISE NOTICE 'Backfilled customer numbers. Next number will be: CIN-%', cust_counter;
END $$;

-- Step 6: Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_vehicle_reservations_customer_number 
ON vehicle_reservations(customer_number);

-- Verify
SELECT 
    id,
    customer_name,
    customer_number,
    document_number,
    created_at
FROM vehicle_reservations
ORDER BY created_at DESC
LIMIT 10;

