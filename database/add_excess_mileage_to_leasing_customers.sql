-- =====================================================
-- ADD EXCESS MILEAGE CHARGES (PER CONTRACT) TO LEASING CUSTOMERS
-- =====================================================
-- Adds a per-contract excess mileage charge field for lease agreements.
-- Safe to run multiple times.

ALTER TABLE leasing_customers
ADD COLUMN IF NOT EXISTS excess_mileage_charges NUMERIC(10,2);

COMMENT ON COLUMN leasing_customers.excess_mileage_charges IS 'Excess mileage charge (AED per km) for this specific lease contract';

-- Verification
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'leasing_customers'
  AND column_name = 'excess_mileage_charges';


