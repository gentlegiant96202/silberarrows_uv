-- Test trigger with existing lead to avoid foreign key issues

-- First, run the trigger fix
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

-- Test with ABHINAV's existing lead_id (from the table dump)
DO $$
DECLARE
    abhinav_lead_id UUID := '6358ff92-f721-467b-ad88-394fe2f05f0d';
BEGIN
    -- Delete existing ABHINAV record first if it exists
    DELETE FROM vehicle_reservations WHERE customer_name = 'ABHINAV';
    
    -- Now insert fresh record (should trigger RES number generation)
    INSERT INTO vehicle_reservations (
        lead_id,
        document_type,
        sales_executive,
        document_date,
        customer_name,
        contact_no,
        email_address,
        customer_id_type,
        customer_id_number,
        vehicle_make_model,
        model_year,
        chassis_no,
        vehicle_mileage,
        vehicle_sale_price,
        invoice_total,
        amount_due
    ) VALUES (
        abhinav_lead_id,
        'reservation',
        'Test User',
        '2025-09-17',
        'ABHINAV',
        '585110710',
        'test@test.com',
        'EID',
        '11111111',
        'MERCEDES-BENZ CLA 250',
        2025,
        'TEST123',
        1000,
        100000,
        100000,
        100000
    );
    
    RAISE NOTICE 'Inserted new ABHINAV record - checking if RES number was generated...';
END $$;

-- Check result
SELECT 
    customer_name,
    document_type,
    document_number,
    'AFTER INSERT TEST' as status
FROM vehicle_reservations 
WHERE customer_name = 'ABHINAV';
