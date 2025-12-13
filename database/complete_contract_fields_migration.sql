-- =====================================================
-- COMPLETE CONTRACT FIELDS MIGRATION
-- =====================================================
-- This migration ensures all contract-related fields exist in leasing_customers table

-- Add all missing contract fields (safe to run multiple times)
ALTER TABLE leasing_customers
ADD COLUMN IF NOT EXISTS monthly_mileage INTEGER,
ADD COLUMN IF NOT EXISTS excess_mileage_charges DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS buyout_price DECIMAL(10,2);

-- Add comments for clarity
COMMENT ON COLUMN leasing_customers.selected_vehicle_id IS 'References leasing_inventory.id - Required for contracts';
COMMENT ON COLUMN leasing_customers.monthly_payment IS 'Monthly lease payment amount - Required for contracts';
COMMENT ON COLUMN leasing_customers.security_deposit IS 'Security deposit amount - Required for contracts';
COMMENT ON COLUMN leasing_customers.lease_term_months IS 'Lease duration in months - Required for contracts';
COMMENT ON COLUMN leasing_customers.monthly_mileage IS 'Monthly mileage allowance (KM) for this specific lease contract - Required for contracts';
COMMENT ON COLUMN leasing_customers.excess_mileage_charges IS 'Excess mileage charge (AED per km) for this specific lease contract';
COMMENT ON COLUMN leasing_customers.lease_start_date IS 'Contract start date - Required for contracts';
COMMENT ON COLUMN leasing_customers.lease_end_date IS 'Contract end date - Required for contracts';
COMMENT ON COLUMN leasing_customers.lease_to_own_option IS 'Lease-to-own option - Required for contracts';
COMMENT ON COLUMN leasing_customers.buyout_price IS 'Buyout price for lease-to-own option - Required when lease_to_own_option is TRUE';

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check all contract-related fields exist
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'leasing_customers'
  AND column_name IN (
    'selected_vehicle_id',
    'monthly_payment', 
    'security_deposit',
    'lease_term_months',
    'lease_start_date',
    'lease_end_date',
    'lease_to_own_option',
    'buyout_price',
    -- Personal info fields
    'customer_name',
    'customer_email',
    'customer_phone',
    'date_of_birth',
    'emirates_id_number',
    'passport_number',
    'visa_number',
    -- Address fields
    'address_line_1',
    'address_line_2',
    'city',
    'emirate',
    -- Employment fields
    'employer_name',
    'employment_type',
    'monthly_salary',
    'years_in_uae',
    -- Document fields
    'emirates_id_front_url',
    'emirates_id_back_url',
    'passport_front_url',
    'passport_back_url',
    'visa_copy_url',
    'address_proof_url',
    'driving_license_front_url',
    'driving_license_back_url'
  )
ORDER BY ordinal_position;

-- =====================================================
-- REQUIRED FIELDS FOR CONTRACTS_DRAFTED STATUS
-- =====================================================
/*
When lease_status = 'contracts_drafted', these fields should be required:

PERSONAL INFORMATION (Required):
- customer_name ✓
- customer_email ✓
- customer_phone ✓
- date_of_birth ✓
- emirates_id_number ✓
- passport_number ✓
- visa_number ✓

ADDRESS INFORMATION (Required):
- address_line_1 ✓
- city ✓
- emirate ✓

EMPLOYMENT INFORMATION (Required):
- employer_name ✓
- employment_type ✓
- monthly_salary ✓
- years_in_uae ✓

DOCUMENT UPLOADS (Required):
- emirates_id_front_url ✓
- emirates_id_back_url ✓
- passport_front_url ✓
- visa_copy_url ✓
- address_proof_url ✓
- driving_license_front_url ✓
- driving_license_back_url ✓

CONTRACT DETAILS (Required):
- selected_vehicle_id ✓
- monthly_payment ✓
- security_deposit ✓
- lease_term_months ✓
- lease_start_date ✓
- lease_end_date ✓
- lease_to_own_option ✓
- buyout_price (Required only if lease_to_own_option = TRUE) ✓

OPTIONAL FIELDS:
- address_line_2
- passport_back_url
- notes
*/

