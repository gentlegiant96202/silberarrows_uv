-- Add reservation PDF URL field to leads table
-- This provides quick access to the latest reservation/invoice PDF
-- Run this in your Supabase SQL Editor

-- Add the column to leads table
ALTER TABLE leads ADD COLUMN reservation_pdf_url TEXT;

-- Add comment for documentation
COMMENT ON COLUMN leads.reservation_pdf_url IS 'URL to the latest generated reservation or invoice PDF document';

-- Create trigger to automatically update leads.reservation_pdf_url when vehicle_reservations is updated
CREATE OR REPLACE FUNCTION sync_reservation_pdf_to_lead()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the lead's reservation_pdf_url when a vehicle_reservation PDF is generated/updated
    IF NEW.pdf_url IS NOT NULL AND NEW.pdf_url != OLD.pdf_url THEN
        UPDATE leads 
        SET reservation_pdf_url = NEW.pdf_url
        WHERE id = NEW.lead_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on vehicle_reservations table
CREATE TRIGGER sync_reservation_pdf_to_lead_trigger
    AFTER UPDATE ON vehicle_reservations
    FOR EACH ROW
    EXECUTE FUNCTION sync_reservation_pdf_to_lead();

-- Also create trigger for INSERT (when PDF is generated immediately)
CREATE TRIGGER sync_reservation_pdf_to_lead_insert_trigger
    AFTER INSERT ON vehicle_reservations
    FOR EACH ROW
    WHEN (NEW.pdf_url IS NOT NULL)
    EXECUTE FUNCTION sync_reservation_pdf_to_lead();

-- Verify the changes
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'leads' AND column_name = 'reservation_pdf_url'; 