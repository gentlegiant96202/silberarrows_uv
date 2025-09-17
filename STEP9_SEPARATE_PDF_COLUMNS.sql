-- Separate PDF columns for reservation and invoice PDFs
-- This allows both PDFs to coexist throughout the document lifecycle

-- Add separate columns for reservation and invoice PDFs
ALTER TABLE vehicle_reservations 
ADD COLUMN IF NOT EXISTS reservation_pdf_url TEXT,
ADD COLUMN IF NOT EXISTS invoice_pdf_url TEXT;

-- Migrate existing data to the new structure
UPDATE vehicle_reservations 
SET 
  reservation_pdf_url = CASE 
    WHEN document_type = 'reservation' THEN pdf_url 
    ELSE original_reservation_pdf_url 
  END,
  invoice_pdf_url = CASE 
    WHEN document_type = 'invoice' THEN pdf_url 
    ELSE NULL 
  END;

-- Update the trigger function to manage both PDF columns
CREATE OR REPLACE FUNCTION generate_document_number()
RETURNS TRIGGER AS $$
BEGIN
    -- Generate reservation numbers for reservations
    IF NEW.document_type = 'reservation' THEN
        -- Generate new reservation number if needed
        IF (TG_OP = 'INSERT' AND NEW.document_number IS NULL) OR
           (TG_OP = 'UPDATE' AND OLD.document_type = 'invoice' AND NEW.document_type = 'reservation') THEN
            NEW.document_number := 'RES-' || nextval('reservation_number_seq');
            RAISE NOTICE 'Generated reservation number: % (operation: %)', NEW.document_number, TG_OP;
        END IF;
        
        -- For reservations, store PDF in reservation_pdf_url column
        IF NEW.pdf_url IS NOT NULL AND NEW.reservation_pdf_url IS NULL THEN
            NEW.reservation_pdf_url := NEW.pdf_url;
        END IF;
        
    -- Generate invoice numbers for invoices
    ELSIF NEW.document_type = 'invoice' THEN
        -- Generate new invoice number if needed
        IF (TG_OP = 'INSERT' AND NEW.document_number IS NULL) OR
           (TG_OP = 'UPDATE' AND OLD.document_type = 'reservation' AND NEW.document_type = 'invoice') THEN
            
            -- If converting from reservation to invoice, preserve the original reservation data
            IF TG_OP = 'UPDATE' AND OLD.document_type = 'reservation' AND OLD.document_number IS NOT NULL THEN
                NEW.original_reservation_number := OLD.document_number;
                -- Keep the reservation PDF in its dedicated column
                NEW.reservation_pdf_url := OLD.reservation_pdf_url;
                RAISE NOTICE 'Preserved original reservation data: % with PDF', OLD.document_number;
            END IF;
            
            -- Generate new invoice number
            NEW.document_number := 'INV-' || nextval('invoice_number_seq');
            RAISE NOTICE 'Generated invoice number: % (operation: %)', NEW.document_number, TG_OP;
        END IF;
        
        -- For invoices, store PDF in invoice_pdf_url column
        IF NEW.pdf_url IS NOT NULL AND NEW.invoice_pdf_url IS NULL THEN
            NEW.invoice_pdf_url := NEW.pdf_url;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_vehicle_reservations_reservation_pdf ON vehicle_reservations(reservation_pdf_url);
CREATE INDEX IF NOT EXISTS idx_vehicle_reservations_invoice_pdf ON vehicle_reservations(invoice_pdf_url);

-- Add comments for documentation
COMMENT ON COLUMN vehicle_reservations.reservation_pdf_url IS 'PDF URL for the reservation document - persists throughout document lifecycle';
COMMENT ON COLUMN vehicle_reservations.invoice_pdf_url IS 'PDF URL for the invoice document - only populated when document becomes invoice';
COMMENT ON COLUMN vehicle_reservations.pdf_url IS 'Legacy column - will be phased out in favor of specific PDF columns';

-- Show the new structure
SELECT 
    document_number,
    original_reservation_number,
    document_type,
    customer_name,
    pdf_url as legacy_pdf,
    reservation_pdf_url,
    invoice_pdf_url,
    CASE 
        WHEN reservation_pdf_url IS NOT NULL AND invoice_pdf_url IS NOT NULL THEN '📄📄 Both PDFs'
        WHEN reservation_pdf_url IS NOT NULL THEN '📄 Reservation PDF only'
        WHEN invoice_pdf_url IS NOT NULL THEN '📄 Invoice PDF only'
        ELSE '❌ No PDFs'
    END as pdf_status,
    created_at,
    updated_at
FROM vehicle_reservations 
ORDER BY created_at DESC
LIMIT 10;

-- Show success message
DO $$
BEGIN
    RAISE NOTICE '=== SEPARATE PDF COLUMNS IMPLEMENTED ===';
    RAISE NOTICE 'New structure:';
    RAISE NOTICE '  - reservation_pdf_url: Always contains reservation PDF';
    RAISE NOTICE '  - invoice_pdf_url: Contains invoice PDF when converted';
    RAISE NOTICE '  - Both PDFs persist throughout the document lifecycle';
    RAISE NOTICE '  - No more PDF loss during DocuSign or conversion!';
    RAISE NOTICE '==========================================';
END $$;
