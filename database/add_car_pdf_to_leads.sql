-- Add car_pdf_url column to leads table and sync with linked car's PDF
-- Run this in your Supabase SQL Editor

-- Step 1: Add the car_pdf_url column to leads table
ALTER TABLE leads ADD COLUMN IF NOT EXISTS car_pdf_url TEXT;

-- Step 2: Create function to sync car PDF URL to lead
CREATE OR REPLACE FUNCTION sync_lead_car_pdf()
RETURNS TRIGGER AS $$
BEGIN
    -- If inventory_car_id changed or is being set, update the PDF URL
    IF (TG_OP = 'UPDATE' AND OLD.inventory_car_id IS DISTINCT FROM NEW.inventory_car_id) OR TG_OP = 'INSERT' THEN
        IF NEW.inventory_car_id IS NOT NULL THEN
            -- Get the PDF URL from the linked car
            SELECT vehicle_details_pdf_url INTO NEW.car_pdf_url 
            FROM cars 
            WHERE id = NEW.inventory_car_id;
        ELSE
            -- No car linked, clear the PDF URL
            NEW.car_pdf_url := NULL;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Create trigger on leads table to auto-sync car PDF URL
DROP TRIGGER IF EXISTS trg_sync_lead_car_pdf ON leads;
CREATE TRIGGER trg_sync_lead_car_pdf
    BEFORE INSERT OR UPDATE ON leads
    FOR EACH ROW
    EXECUTE FUNCTION sync_lead_car_pdf();

-- Step 4: Create trigger on cars table to update leads when car PDF changes
CREATE OR REPLACE FUNCTION update_leads_when_car_pdf_changes()
RETURNS TRIGGER AS $$
BEGIN
    -- When a car's PDF URL changes, update all leads linked to this car
    IF OLD.vehicle_details_pdf_url IS DISTINCT FROM NEW.vehicle_details_pdf_url THEN
        UPDATE leads 
        SET car_pdf_url = NEW.vehicle_details_pdf_url
        WHERE inventory_car_id = NEW.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_leads_car_pdf ON cars;
CREATE TRIGGER trg_update_leads_car_pdf
    AFTER UPDATE ON cars
    FOR EACH ROW
    EXECUTE FUNCTION update_leads_when_car_pdf_changes();

-- Step 5: Update existing leads to sync their car PDF URLs
UPDATE leads 
SET car_pdf_url = cars.vehicle_details_pdf_url
FROM cars
WHERE leads.inventory_car_id = cars.id
AND leads.car_pdf_url IS NULL;

-- Step 6: Add comment for documentation
COMMENT ON COLUMN leads.car_pdf_url IS 'PDF URL from the linked inventory car (auto-synced)';

-- Step 7: Verify the changes
SELECT 
    l.id,
    l.full_name,
    l.inventory_car_id,
    c.stock_number,
    l.car_pdf_url,
    c.vehicle_details_pdf_url as original_car_pdf
FROM leads l
LEFT JOIN cars c ON l.inventory_car_id = c.id
WHERE l.inventory_car_id IS NOT NULL
ORDER BY l.created_at DESC
LIMIT 5; 