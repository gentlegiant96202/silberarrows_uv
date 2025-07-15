-- Add stock_age_days column to cars table with auto-calculation
-- Run this in your Supabase SQL Editor

-- Step 1: Add the stock_age_days column
ALTER TABLE cars ADD COLUMN IF NOT EXISTS stock_age_days INTEGER;

-- Step 2: Create function to calculate stock age
CREATE OR REPLACE FUNCTION calculate_stock_age()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate stock age in days based on created_at
    NEW.stock_age_days := (CURRENT_DATE - NEW.created_at::date);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Create trigger to auto-calculate stock age on INSERT and UPDATE
DROP TRIGGER IF EXISTS trg_calculate_stock_age ON cars;
CREATE TRIGGER trg_calculate_stock_age
    BEFORE INSERT OR UPDATE ON cars
    FOR EACH ROW
    EXECUTE FUNCTION calculate_stock_age();

-- Step 4: Update existing records to calculate their stock age
UPDATE cars 
SET stock_age_days = (CURRENT_DATE - created_at::date)
WHERE stock_age_days IS NULL;

-- Step 5: Add index for better performance when filtering by stock age
CREATE INDEX IF NOT EXISTS idx_cars_stock_age ON cars(stock_age_days);

-- Step 6: Add comment for documentation
COMMENT ON COLUMN cars.stock_age_days IS 'Number of days since the car was added to inventory (auto-calculated)';

-- Step 7: Verify the changes
SELECT 
    id,
    vehicle_model,
    created_at,
    stock_age_days,
    CASE 
        WHEN stock_age_days >= 90 THEN 'RED (90+ days)'
        WHEN stock_age_days >= 60 THEN 'ORANGE (60-89 days)'
        ELSE 'NORMAL (0-59 days)'
    END as color_category
FROM cars 
ORDER BY stock_age_days DESC
LIMIT 10;

-- Step 8: Check the trigger is working by testing an update
-- Uncomment to test: UPDATE cars SET vehicle_model = vehicle_model WHERE id = (SELECT id FROM cars LIMIT 1); 