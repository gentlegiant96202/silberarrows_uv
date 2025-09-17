-- Preserve original reservation number when converting to invoice
-- This allows invoices to show both their INV- number and original RES- number

-- Add column to store original reservation number
ALTER TABLE vehicle_reservations 
ADD COLUMN IF NOT EXISTS original_reservation_number TEXT;

-- Update the trigger function to preserve original reservation number during conversion
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
            
            -- If converting from reservation to invoice, preserve the original reservation number
            IF TG_OP = 'UPDATE' AND OLD.document_type = 'reservation' AND OLD.document_number IS NOT NULL THEN
                NEW.original_reservation_number := OLD.document_number;
                RAISE NOTICE 'Preserved original reservation number: %', OLD.document_number;
            END IF;
            
            -- Generate new invoice number
            NEW.document_number := 'INV-' || nextval('invoice_number_seq');
            RAISE NOTICE 'Generated invoice number: % (operation: %)', NEW.document_number, TG_OP;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- The trigger already exists, so it will automatically use the updated function

-- Add index for better performance when searching by original reservation number
CREATE INDEX IF NOT EXISTS idx_vehicle_reservations_original_reservation_number ON vehicle_reservations(original_reservation_number);

-- Add comment for documentation
COMMENT ON COLUMN vehicle_reservations.original_reservation_number IS 'Original reservation number (RES-xxxx) preserved when reservation is converted to invoice';

-- Verify the changes
SELECT 
    document_number,
    original_reservation_number,
    document_type,
    customer_name,
    created_at
FROM vehicle_reservations 
ORDER BY created_at DESC
LIMIT 10;

-- Show success message
DO $$
BEGIN
    RAISE NOTICE 'Successfully added original_reservation_number preservation!';
    RAISE NOTICE 'When RES-1005 converts to invoice:';
    RAISE NOTICE '  - document_number becomes INV-1023 (new invoice number)';
    RAISE NOTICE '  - original_reservation_number stores RES-1005 (preserved)';
    RAISE NOTICE 'Invoice PDFs can now show both numbers!';
END $$;

