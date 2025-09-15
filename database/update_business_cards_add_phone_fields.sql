-- Update business_cards table to support separate landline and mobile numbers
-- This migration will rename the existing 'phone' column to 'landline_phone' and add 'mobile_phone'

BEGIN;

-- Add new mobile_phone column
ALTER TABLE business_cards ADD COLUMN mobile_phone VARCHAR(50);

-- Rename existing phone column to landline_phone
ALTER TABLE business_cards RENAME COLUMN phone TO landline_phone;

-- Update the sample data to have both phone types
UPDATE business_cards 
SET 
  mobile_phone = '+1 (555) 987-6543'
WHERE slug = 'sample-card';

COMMIT;

-- Verify the changes
SELECT slug, name, landline_phone, mobile_phone FROM business_cards;
