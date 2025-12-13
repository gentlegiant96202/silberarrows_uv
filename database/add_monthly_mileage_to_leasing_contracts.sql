-- =====================================================
-- ADD MONTHLY MILEAGE (PER CONTRACT) TO LEASING CUSTOMERS
-- =====================================================
-- Adds a per-contract monthly mileage limit field for lease agreements.
-- Safe to run multiple times.

ALTER TABLE leasing_customers
ADD COLUMN IF NOT EXISTS monthly_mileage INTEGER;

COMMENT ON COLUMN leasing_customers.monthly_mileage IS 'Monthly mileage allowance (KM) for this specific lease contract';

-- Optional: if you want a default for new rows, uncomment:
-- ALTER TABLE leasing_customers ALTER COLUMN monthly_mileage SET DEFAULT 2000;

-- Optional backfill (only fills NULLs), uncomment if desired:
-- UPDATE leasing_customers
-- SET monthly_mileage = 2000
-- WHERE monthly_mileage IS NULL;

-- Verification
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'leasing_customers'
  AND column_name = 'monthly_mileage';


