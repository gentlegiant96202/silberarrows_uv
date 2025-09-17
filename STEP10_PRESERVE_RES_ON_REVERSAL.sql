-- Preserve original RES number when switching back from invoice to reservation
-- Run this in your Supabase/Postgres to update the trigger logic

-- Ensure sequences exist
CREATE SEQUENCE IF NOT EXISTS reservation_number_seq START 1000;
CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START 1000;

-- Update the document-number generator to restore original RES number when reverting
CREATE OR REPLACE FUNCTION generate_document_number()
RETURNS TRIGGER AS $$
BEGIN
  -- Reservation logic
  IF NEW.document_type = 'reservation' THEN
    -- New reservation (insert with no number)
    IF TG_OP = 'INSERT' AND NEW.document_number IS NULL THEN
      NEW.document_number := 'RES-' || nextval('reservation_number_seq');
    -- Reverting from invoice -> reservation
    ELSIF TG_OP = 'UPDATE' AND OLD.document_type = 'invoice' AND NEW.document_type = 'reservation' THEN
      -- Prefer the stored original_reservation_number if present
      IF COALESCE(OLD.original_reservation_number, '') LIKE 'RES-%' THEN
        NEW.document_number := OLD.original_reservation_number;
      -- Else if the current row's number already is a RES (edge cases), reuse it
      ELSIF COALESCE(OLD.document_number, '') LIKE 'RES-%' THEN
        NEW.document_number := OLD.document_number;
      -- Else mint a new RES number as a last resort
      ELSE
        NEW.document_number := 'RES-' || nextval('reservation_number_seq');
      END IF;
      -- Optionally clear invoice-only fields; we keep original_reservation_number unchanged for audit
    END IF;

  -- Invoice logic
  ELSIF NEW.document_type = 'invoice' THEN
    -- New invoice or converting reservation -> invoice
    IF (TG_OP = 'INSERT' AND NEW.document_number IS NULL) OR
       (TG_OP = 'UPDATE' AND OLD.document_type = 'reservation' AND NEW.document_type = 'invoice') THEN
      -- Preserve the reservation number when moving to invoice
      IF OLD.document_type = 'reservation' AND COALESCE(OLD.document_number,'') LIKE 'RES-%' THEN
        NEW.original_reservation_number := OLD.document_number;
      END IF;
      NEW.document_number := 'INV-' || nextval('invoice_number_seq');
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate trigger to ensure latest function is used (idempotent)
DROP TRIGGER IF EXISTS generate_document_number_trigger ON vehicle_reservations;
CREATE TRIGGER generate_document_number_trigger
  BEFORE INSERT OR UPDATE ON vehicle_reservations
  FOR EACH ROW
  EXECUTE FUNCTION generate_document_number();

-- Optional verification: show a few recent records
-- SELECT document_type, document_number, original_reservation_number, customer_name, updated_at
-- FROM vehicle_reservations ORDER BY updated_at DESC LIMIT 10;
