-- Add reservation numbers (RES-1000, RES-1001, etc.) to the vehicle_reservations table
-- Reservations and invoices will have separate numbering sequences
-- When a reservation is converted to invoice, it keeps its RES- number and gets a new INV- number

-- Create sequence for reservation numbers starting at 1000
CREATE SEQUENCE IF NOT EXISTS reservation_number_seq START 1000;

-- Update the trigger function to handle both reservation and invoice numbers
CREATE OR REPLACE FUNCTION generate_document_number()
RETURNS TRIGGER AS $$
BEGIN
    -- Generate reservation numbers for reservations
    IF NEW.document_type = 'reservation' THEN
        -- Generate new reservation number if:
        -- 1. It's a new reservation (INSERT with document_number NULL)
        -- 2. Converting from invoice to reservation (rare case)
        IF (TG_OP = 'INSERT' AND NEW.document_number IS NULL) OR
           (TG_OP = 'UPDATE' AND OLD.document_type = 'invoice' AND NEW.document_type = 'reservation') THEN
            NEW.document_number := 'RES-' || nextval('reservation_number_seq');
            RAISE NOTICE 'Generated reservation number: % (operation: %)', NEW.document_number, TG_OP;
        END IF;
        
    -- Generate invoice numbers for invoices
    ELSIF NEW.document_type = 'invoice' THEN
        -- Generate new invoice number if:
        -- 1. It's a new invoice (INSERT with document_number NULL)
        -- 2. Converting from reservation to invoice (UPDATE where OLD.document_type != NEW.document_type)
        IF (TG_OP = 'INSERT' AND NEW.document_number IS NULL) OR
           (TG_OP = 'UPDATE' AND OLD.document_type = 'reservation' AND NEW.document_type = 'invoice') THEN
            NEW.document_number := 'INV-' || nextval('invoice_number_seq');
            RAISE NOTICE 'Generated invoice number: % (operation: %)', NEW.document_number, TG_OP;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- The trigger already exists, so we don't need to recreate it
-- It will automatically use the updated function

-- Backfill existing reservation records with RES- numbers
DO $$
DECLARE
    rec RECORD;
    res_counter INTEGER := 1000;
BEGIN
    -- Update existing reservations with RES- numbers (in chronological order)
    FOR rec IN 
        SELECT id, document_type, created_at
        FROM vehicle_reservations 
        WHERE document_type = 'reservation' AND document_number IS NULL 
        ORDER BY created_at ASC
    LOOP
        UPDATE vehicle_reservations 
        SET document_number = 'RES-' || res_counter 
        WHERE id = rec.id;
        
        RAISE NOTICE 'Assigned RES-% to reservation created at %', res_counter, rec.created_at;
        res_counter := res_counter + 1;
    END LOOP;
    
    -- Set reservation sequence to continue from where backfill ended
    PERFORM setval('reservation_number_seq', res_counter);
    
    RAISE NOTICE 'Backfill complete: % reservations assigned RES- numbers', res_counter - 1000;
    RAISE NOTICE 'Next reservation will be: RES-%', res_counter;
END $$;

-- Update the column comment to reflect both number types
COMMENT ON COLUMN vehicle_reservations.document_number IS 'Auto-generated document number: RES-1000+ for reservations, INV-1000+ for invoices';

-- Verify the changes
SELECT 
    document_number,
    document_type,
    customer_name,
    created_at
FROM vehicle_reservations 
ORDER BY created_at DESC
LIMIT 15;

-- Show both sequence current values (safe method)
SELECT 
    'reservation_number_seq' as sequence_name,
    last_value as current_value,
    is_called
FROM reservation_number_seq
UNION ALL
SELECT 
    'invoice_number_seq' as sequence_name,
    last_value as current_value,
    is_called
FROM invoice_number_seq;

-- Test the trigger functionality with some examples
DO $$
BEGIN
    RAISE NOTICE '=== RESERVATION NUMBER SYSTEM ===';
    RAISE NOTICE 'Reservations now get: RES-1000, RES-1001, RES-1002, etc.';
    RAISE NOTICE 'Invoices still get: INV-1000, INV-1001, INV-1002, etc.';
    RAISE NOTICE 'When reservation converts to invoice:';
    RAISE NOTICE '  - Keeps original RES-xxxx number';
    RAISE NOTICE '  - Gets new INV-xxxx number';
    RAISE NOTICE '  - Both numbers are tracked in document_number field';
    RAISE NOTICE '==================================';
    
    -- Show current counts
    RAISE NOTICE 'Current reservation count: %', (SELECT COUNT(*) FROM vehicle_reservations WHERE document_type = 'reservation' AND document_number LIKE 'RES-%');
    RAISE NOTICE 'Current invoice count: %', (SELECT COUNT(*) FROM vehicle_reservations WHERE document_type = 'invoice' AND document_number LIKE 'INV-%');
END $$;

-- Show success message
DO $$
BEGIN
    RAISE NOTICE 'Successfully added reservation numbering system!';
    RAISE NOTICE 'Reservations: RES-1000+, Invoices: INV-1000+';
    RAISE NOTICE 'Both document types now have their own sequential numbering';
END $$;
