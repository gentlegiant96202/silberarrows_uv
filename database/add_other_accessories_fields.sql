-- Add other accessories fields to cars table
-- These fields extend the handover checklist for consignment cars

-- Add other accessories acquired checkbox field
ALTER TABLE cars ADD COLUMN IF NOT EXISTS other_accessories_acquired BOOLEAN;

-- Add other accessories details text field
ALTER TABLE cars ADD COLUMN IF NOT EXISTS other_accessories_details TEXT;

-- Add comments for documentation
COMMENT ON COLUMN cars.other_accessories_acquired IS 'Boolean indicating if other accessories were acquired during consignment handover';
COMMENT ON COLUMN cars.other_accessories_details IS 'Text description of other accessories acquired (only relevant when other_accessories_acquired is true)';

-- Note: These fields are nullable and only used for consignment cars (ownership_type = 'consignment')
-- For stock cars, these fields will remain NULL
