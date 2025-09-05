-- Add vehicle history disclosure fields to cars table for consignment vehicles
-- These fields capture what the customer disclosed to the sales rep about accident/damage history
-- Will be positioned after the existing consignment handover checklist fields (after position 51)

-- Add vehicle history disclosure fields with consistent defaults matching existing boolean fields
ALTER TABLE cars 
ADD COLUMN customer_disclosed_accident BOOLEAN DEFAULT FALSE,
ADD COLUMN customer_disclosed_flood_damage BOOLEAN DEFAULT FALSE,
ADD COLUMN damage_disclosure_details TEXT DEFAULT NULL;

-- Add comments to document the purpose of these fields
COMMENT ON COLUMN cars.customer_disclosed_accident IS 'Whether the consignment customer disclosed any accident history to the sales rep (consignment only)';
COMMENT ON COLUMN cars.customer_disclosed_flood_damage IS 'Whether the consignment customer disclosed any flood/water damage to the sales rep (consignment only)';
COMMENT ON COLUMN cars.damage_disclosure_details IS 'Details about accident or damage as disclosed by the consignment customer (consignment only)';

-- Verify the new columns were added
SELECT 
    ordinal_position as position,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'cars' 
AND column_name IN (
    'customer_disclosed_accident',
    'customer_disclosed_flood_damage', 
    'damage_disclosure_details'
)
ORDER BY ordinal_position;

-- Show updated total column count
SELECT COUNT(*) as total_columns 
FROM information_schema.columns 
WHERE table_name = 'cars';
