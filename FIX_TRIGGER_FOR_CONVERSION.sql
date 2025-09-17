-- Fix trigger to generate INV numbers even when RES number exists

CREATE OR REPLACE FUNCTION generate_document_number()
RETURNS TRIGGER AS $$
BEGIN
  -- Reservation logic
  IF NEW.document_type = 'reservation' THEN
    -- Generate RES number if NULL
    IF NEW.document_number IS NULL AND TG_OP = 'INSERT' THEN
      NEW.document_number := 'RES-' || nextval('reservation_number_seq');
    END IF;
    
    -- Restore RES when reverting from invoice
    IF TG_OP = 'UPDATE' AND OLD.document_type = 'invoice' AND NEW.document_type = 'reservation' THEN
      IF COALESCE(OLD.original_reservation_number,'') LIKE 'RES-%' THEN
        NEW.document_number := OLD.original_reservation_number;
      ELSIF NEW.document_number IS NULL THEN
        NEW.document_number := 'RES-' || nextval('reservation_number_seq');
      END IF;
    END IF;

  -- Invoice logic  
  ELSIF NEW.document_type = 'invoice' THEN
    -- Generate INV number on INSERT or when converting from reservation
    IF (TG_OP = 'INSERT' AND NEW.document_number IS NULL) OR
       (TG_OP = 'UPDATE' AND OLD.document_type = 'reservation' AND NEW.document_type = 'invoice') THEN
      
      -- Preserve the RES number when converting
      IF TG_OP = 'UPDATE' AND OLD.document_type = 'reservation' AND COALESCE(OLD.document_number,'') LIKE 'RES-%' THEN
        NEW.original_reservation_number := OLD.document_number;
      END IF;
      
      -- Always generate new INV number (regardless of what document_number currently is)
      NEW.document_number := 'INV-' || nextval('invoice_number_seq');
      
      RAISE NOTICE 'Generated invoice number: % from reservation: %', NEW.document_number, OLD.document_number;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Test with MALAK record
DO $$
BEGIN
    RAISE NOTICE 'Testing conversion with MALAK record...';
    
    -- Force trigger by updating to invoice
    UPDATE vehicle_reservations 
    SET document_type = 'invoice'
    WHERE customer_name = 'MALAK';
    
    RAISE NOTICE 'Conversion attempted for MALAK';
END $$;

-- Check result
SELECT 
    customer_name,
    document_type,
    document_number,
    original_reservation_number
FROM vehicle_reservations 
WHERE customer_name = 'MALAK';
