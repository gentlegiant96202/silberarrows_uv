-- Add service_type field to service_contracts table
-- This field will store 'standard' (2 years) or 'premium' (4 years)

-- Add the service_type column with enum constraint
ALTER TABLE service_contracts 
ADD COLUMN service_type TEXT CHECK (service_type IN ('standard', 'premium')) DEFAULT 'standard';

-- Add a comment to document the field
COMMENT ON COLUMN service_contracts.service_type IS 'Service contract type: standard (2 years) or premium (4 years)';

-- Update existing records to have default 'standard' type
UPDATE service_contracts 
SET service_type = 'standard' 
WHERE service_type IS NULL;

-- Make the field NOT NULL after setting defaults
ALTER TABLE service_contracts 
ALTER COLUMN service_type SET NOT NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_service_contracts_service_type ON service_contracts(service_type);

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Service type field added successfully!';
    RAISE NOTICE 'Available options: standard (2 years), premium (4 years)';
    RAISE NOTICE 'Default value: standard';
    RAISE NOTICE 'All existing contracts set to standard type';
END
$$; 