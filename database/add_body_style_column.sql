-- Add body_style column to cars table
-- Run this migration to add the new body_style field for vehicle specifications

-- Add body_style column to cars table
ALTER TABLE cars 
ADD COLUMN IF NOT EXISTS body_style TEXT;

-- Add comment for documentation
COMMENT ON COLUMN cars.body_style IS 'Vehicle body style (Coupe, Convertible, Estate, Hatchback, Saloon, SUV)';

-- Add check constraint to ensure valid body style values (safe method)
DO $$ 
BEGIN
    -- Check if constraint already exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'check_body_style' 
        AND table_name = 'cars'
    ) THEN
        ALTER TABLE cars 
        ADD CONSTRAINT check_body_style 
        CHECK (body_style IS NULL OR body_style IN ('Coupe', 'Convertible', 'Estate', 'Hatchback', 'Saloon', 'SUV'));
    END IF;
END $$;

-- Create index for better performance when filtering by body style
CREATE INDEX IF NOT EXISTS idx_cars_body_style ON cars(body_style);

-- Verify the changes
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'cars' 
AND column_name = 'body_style';

-- Success message
SELECT 'Body style column added to cars table successfully!' as result;
