-- =====================================================
-- REMOVE CHASSIS_SHORT FIELD FROM LEASING INVENTORY
-- =====================================================
-- Since stock_number IS the chassis short (last 6 digits), we don't need a separate field

-- Remove chassis_short column if it exists
ALTER TABLE leasing_inventory 
DROP COLUMN IF EXISTS chassis_short;
