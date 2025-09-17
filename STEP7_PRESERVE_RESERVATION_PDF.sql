-- Preserve original reservation PDF URL when converting to invoice
-- This allows invoices to show both their invoice PDF and original reservation PDF

-- Add column to store original reservation PDF URL
ALTER TABLE vehicle_reservations 
ADD COLUMN IF NOT EXISTS original_reservation_pdf_url TEXT;

-- Update the trigger function to preserve original reservation PDF during conversion
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
            
            -- If converting from reservation to invoice, preserve the original reservation data
            IF TG_OP = 'UPDATE' AND OLD.document_type = 'reservation' AND OLD.document_number IS NOT NULL THEN
                NEW.original_reservation_number := OLD.document_number;
                RAISE NOTICE 'Preserved original reservation number: %', OLD.document_number;
                
                -- Preserve the original reservation PDF URL if it exists
                IF OLD.pdf_url IS NOT NULL THEN
                    NEW.original_reservation_pdf_url := OLD.pdf_url;
                    RAISE NOTICE 'Preserved original reservation PDF URL: %', OLD.pdf_url;
                END IF;
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

-- Add index for better performance when searching by original reservation PDF
CREATE INDEX IF NOT EXISTS idx_vehicle_reservations_original_pdf ON vehicle_reservations(original_reservation_pdf_url);

-- Add comment for documentation
COMMENT ON COLUMN vehicle_reservations.original_reservation_pdf_url IS 'Original reservation PDF URL preserved when reservation is converted to invoice';

-- Verify the changes
SELECT 
    document_number,
    original_reservation_number,
    pdf_url as current_pdf,
    original_reservation_pdf_url,
    document_type,
    customer_name,
    created_at
FROM vehicle_reservations 
ORDER BY created_at DESC
LIMIT 8;

-- Show success message
DO $$
BEGIN
    RAISE NOTICE 'Successfully added original_reservation_pdf_url preservation!';
    RAISE NOTICE 'When RES-1005 converts to invoice:';
    RAISE NOTICE '  - document_number: INV-1023 (new invoice number)';
    RAISE NOTICE '  - original_reservation_number: RES-1005 (preserved)';
    RAISE NOTICE '  - pdf_url: invoice.pdf (new invoice PDF)';
    RAISE NOTICE '  - original_reservation_pdf_url: reservation.pdf (preserved)';
    RAISE NOTICE 'Accounting module can now show both PDFs!';
END $$;

