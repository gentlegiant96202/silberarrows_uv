-- =====================================================
-- ADD VEHICLE PDF URL FIELD TO LEASING INVENTORY
-- =====================================================
-- Add a dedicated field for storing the vehicle showcase PDF URL

-- Add vehicle_pdf_url column to leasing_inventory table
ALTER TABLE leasing_inventory
ADD COLUMN IF NOT EXISTS vehicle_pdf_url TEXT NULL;

-- Add an index for faster lookups if needed
CREATE INDEX IF NOT EXISTS idx_leasing_inventory_vehicle_pdf_url
ON leasing_inventory(vehicle_pdf_url) WHERE vehicle_pdf_url IS NOT NULL;

-- Optional: Add a comment for documentation
COMMENT ON COLUMN leasing_inventory.vehicle_pdf_url IS 'URL to the generated vehicle showcase PDF document.';

-- Success message
SELECT '✅ vehicle_pdf_url column added to leasing_inventory table!' as result;
