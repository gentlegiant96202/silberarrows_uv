-- Add consignment-specific fields to cars table
-- Run this migration to add the new required consignment fields

-- Add registration expiry date field
ALTER TABLE cars 
ADD COLUMN registration_expiry_date DATE;

-- Add insurance expiry date field  
ALTER TABLE cars
ADD COLUMN insurance_expiry_date DATE;

-- Add handover checklist boolean fields
ALTER TABLE cars
ADD COLUMN service_records_acquired BOOLEAN DEFAULT FALSE;

ALTER TABLE cars  
ADD COLUMN owners_manual_acquired BOOLEAN DEFAULT FALSE;

ALTER TABLE cars
ADD COLUMN spare_tyre_tools_acquired BOOLEAN DEFAULT FALSE;

ALTER TABLE cars
ADD COLUMN fire_extinguisher_acquired BOOLEAN DEFAULT FALSE;

-- Add comments for documentation
COMMENT ON COLUMN cars.registration_expiry_date IS 'Vehicle registration expiry date (required for consignment cars)';
COMMENT ON COLUMN cars.insurance_expiry_date IS 'Vehicle insurance expiry date (required for consignment cars)';
COMMENT ON COLUMN cars.service_records_acquired IS 'Whether service records have been acquired during handover';
COMMENT ON COLUMN cars.owners_manual_acquired IS 'Whether owners manual has been acquired during handover';
COMMENT ON COLUMN cars.spare_tyre_tools_acquired IS 'Whether spare tyre and tools have been acquired during handover';
COMMENT ON COLUMN cars.fire_extinguisher_acquired IS 'Whether fire extinguisher has been acquired during handover'; 