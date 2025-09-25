-- =====================================================
-- ADD BUYOUT PRICE FIELD TO LEASING CUSTOMERS TABLE
-- =====================================================
-- This migration adds the buyout_price field for lease-to-own options

-- Add buyout_price field to leasing_customers table
ALTER TABLE leasing_customers
ADD COLUMN IF NOT EXISTS buyout_price DECIMAL(10,2);

-- Add comment to explain the field
COMMENT ON COLUMN leasing_customers.buyout_price IS 'Buyout price for lease-to-own option at end of lease term';

-- =====================================================
-- VERIFICATION QUERY
-- =====================================================
-- Check if the field was added successfully
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'leasing_customers'
  AND column_name = 'buyout_price'
ORDER BY ordinal_position;

-- =====================================================
-- USAGE NOTES
-- =====================================================
/*
This field should be used when:
1. lease_to_own_option = TRUE
2. Customer wants to purchase the vehicle at lease end
3. Buyout price is negotiated and agreed upon

The buyout_price should be:
- Set when lease_to_own_option is enabled
- Used for contract calculations
- Referenced in lease agreements
- Updated if renegotiated during lease term
*/

