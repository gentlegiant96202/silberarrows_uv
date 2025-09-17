-- Fix trigger to generate numbers on INSERT (and conversions)

CREATE OR REPLACE FUNCTION generate_document_number()
RETURNS TRIGGER AS $$
BEGIN
  -- Generate reservation numbers
  IF NEW.document_type = 'reservation' THEN
    -- Generate RES number if NULL on INSERT
    IF TG_OP = 'INSERT' AND NEW.document_number IS NULL THEN
      NEW.document_number := 'RES-' || nextval('reservation_number_seq');
      RAISE NOTICE 'Generated reservation number: %', NEW.document_number;
    END IF;
    
    -- Restore RES when reverting from invoice
    IF TG_OP = 'UPDATE' AND OLD.document_type = 'invoice' AND NEW.document_type = 'reservation' THEN
      IF COALESCE(OLD.original_reservation_number,'') LIKE 'RES-%' THEN
        NEW.document_number := OLD.original_reservation_number;
        RAISE NOTICE 'Restored reservation number: %', NEW.document_number;
      ELSIF NEW.document_number IS NULL THEN
        NEW.document_number := 'RES-' || nextval('reservation_number_seq');
        RAISE NOTICE 'Generated new reservation number: %', NEW.document_number;
      END IF;
    END IF;

  -- Generate invoice numbers
  ELSIF NEW.document_type = 'invoice' THEN
    -- Generate INV number on INSERT or when converting from reservation
    IF (TG_OP = 'INSERT' AND NEW.document_number IS NULL) OR
       (TG_OP = 'UPDATE' AND OLD.document_type = 'reservation' AND NEW.document_type = 'invoice') THEN
      
      -- Preserve RES number when converting
      IF TG_OP = 'UPDATE' AND OLD.document_type = 'reservation' AND COALESCE(OLD.document_number,'') LIKE 'RES-%' THEN
        NEW.original_reservation_number := OLD.document_number;
        RAISE NOTICE 'Preserved original reservation: %', OLD.document_number;
      END IF;
      
      -- Generate new INV number
      NEW.document_number := 'INV-' || nextval('invoice_number_seq');
      RAISE NOTICE 'Generated invoice number: %', NEW.document_number;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate trigger
DROP TRIGGER IF EXISTS generate_document_number_trigger ON vehicle_reservations;
CREATE TRIGGER generate_document_number_trigger
  BEFORE INSERT OR UPDATE ON vehicle_reservations
  FOR EACH ROW
  EXECUTE FUNCTION generate_document_number();

-- Test with a manual INSERT
DO $$
BEGIN
    RAISE NOTICE 'Testing trigger with manual INSERT...';
END $$;
