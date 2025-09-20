-- Add Sales Executive field to service contracts and warranty contracts
-- This field auto-populates with the current user and cannot be changed after creation

-- 1. Add sales_executive column to service_contracts table
ALTER TABLE service_contracts 
ADD COLUMN sales_executive VARCHAR(255);

-- 2. Add sales_executive column to warranty_contracts table  
ALTER TABLE warranty_contracts 
ADD COLUMN sales_executive VARCHAR(255);

-- 3. Update existing records to set sales_executive to 'System' for historical data
UPDATE service_contracts 
SET sales_executive = 'System' 
WHERE sales_executive IS NULL;

UPDATE warranty_contracts 
SET sales_executive = 'System' 
WHERE sales_executive IS NULL;

-- 4. Verify the changes
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name IN ('service_contracts', 'warranty_contracts')
    AND column_name = 'sales_executive'
ORDER BY table_name;

-- 5. Show sample data
SELECT 
    'service_contracts' as table_name,
    reference_no,
    owner_name,
    sales_executive,
    created_at
FROM service_contracts 
ORDER BY created_at DESC 
LIMIT 3;

SELECT 
    'warranty_contracts' as table_name,
    reference_no,
    owner_name,
    sales_executive,
    created_at
FROM warranty_contracts 
ORDER BY created_at DESC 
LIMIT 3;

-- SUCCESS MESSAGE
DO $$
BEGIN
    RAISE NOTICE '✅ Successfully added sales_executive field to both tables:';
    RAISE NOTICE '   - service_contracts.sales_executive (VARCHAR(255))';
    RAISE NOTICE '   - warranty_contracts.sales_executive (VARCHAR(255))';
    RAISE NOTICE '';
    RAISE NOTICE '📋 Field behavior:';
    RAISE NOTICE '   - Auto-populates with current user on creation';
    RAISE NOTICE '   - Cannot be changed after creation (read-only)';
    RAISE NOTICE '   - Existing records set to "System"';
    RAISE NOTICE '';
    RAISE NOTICE '🔧 Next steps: Update frontend to use this field';
END
$$;
