-- ================================
-- STEP 2: MIGRATION VALIDATION SCRIPT
-- ================================
-- Run this AFTER the migration to verify everything worked correctly
-- This is a read-only validation script - safe to run in production

-- ================================
-- 1. VERIFY NEW COLUMNS EXIST
-- ================================

-- Check service_contracts table structure
SELECT 
    'service_contracts' as table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'service_contracts' 
AND column_name IN ('customer_id_type', 'customer_id_number', 'vehicle_colour', 'reservation_id')
ORDER BY column_name;

-- Check warranty_contracts table structure  
SELECT 
    'warranty_contracts' as table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'warranty_contracts' 
AND column_name IN ('customer_id_type', 'customer_id_number', 'vehicle_colour', 'reservation_id')
ORDER BY column_name;

-- ================================
-- 2. VERIFY INDEXES WERE CREATED
-- ================================

SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename IN ('service_contracts', 'warranty_contracts')
AND indexname LIKE '%customer_id%' 
   OR indexname LIKE '%vehicle_colour%' 
   OR indexname LIKE '%reservation_id%'
ORDER BY tablename, indexname;

-- ================================
-- 3. VERIFY FOREIGN KEY CONSTRAINTS
-- ================================

SELECT
    tc.table_name,
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_name IN ('service_contracts', 'warranty_contracts')
AND kcu.column_name = 'reservation_id';

-- ================================
-- 4. VERIFY CHECK CONSTRAINTS
-- ================================

SELECT 
    tc.table_name,
    tc.constraint_name,
    cc.check_clause
FROM information_schema.table_constraints tc
JOIN information_schema.check_constraints cc ON tc.constraint_name = cc.constraint_name
WHERE tc.constraint_type = 'CHECK'
AND tc.table_name IN ('service_contracts', 'warranty_contracts')
AND cc.check_clause LIKE '%customer_id_type%'
ORDER BY tc.table_name;

-- ================================
-- 5. TEST HELPER FUNCTIONS
-- ================================

-- Test vehicle make parsing function
SELECT 
    'Mercedes-Benz C-Class' as original,
    parse_vehicle_make('Mercedes-Benz C-Class') as parsed_make,
    parse_vehicle_model('Mercedes-Benz C-Class') as parsed_model
UNION ALL
SELECT 
    'BMW X5',
    parse_vehicle_make('BMW X5'),
    parse_vehicle_model('BMW X5')
UNION ALL
SELECT 
    'Audi A4',
    parse_vehicle_make('Audi A4'),
    parse_vehicle_model('Audi A4')
UNION ALL
SELECT 
    'Porsche 911',
    parse_vehicle_make('Porsche 911'),
    parse_vehicle_model('Porsche 911');

-- ================================
-- 6. VERIFY UPDATED VIEWS
-- ================================

-- Check that views were recreated with new fields
SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_name IN ('active_service_contracts', 'active_warranty_contracts')
AND column_name IN ('reservation_customer_name', 'reservation_document_type', 'reservation_sales_executive')
ORDER BY table_name, column_name;

-- ================================
-- 7. SAMPLE DATA VALIDATION
-- ================================

-- Show current contracts with new fields (should be NULL initially)
SELECT 
    reference_no,
    owner_name,
    customer_id_type,
    customer_id_number,
    vehicle_colour,
    reservation_id,
    created_at
FROM service_contracts 
ORDER BY created_at DESC 
LIMIT 3;

-- Show warranty contracts with new fields
SELECT 
    reference_no,
    owner_name,
    customer_id_type,
    customer_id_number,
    vehicle_colour,
    reservation_id,
    created_at
FROM warranty_contracts 
ORDER BY created_at DESC 
LIMIT 3;

-- ================================
-- 8. MIGRATION SUCCESS CHECK
-- ================================

DO $$
DECLARE
    service_cols INTEGER;
    warranty_cols INTEGER;
    service_indexes INTEGER;
    warranty_indexes INTEGER;
    fk_constraints INTEGER;
    check_constraints INTEGER;
BEGIN
    -- Count new columns
    SELECT COUNT(*) INTO service_cols FROM information_schema.columns 
    WHERE table_name = 'service_contracts' 
    AND column_name IN ('customer_id_type', 'customer_id_number', 'vehicle_colour', 'reservation_id');
    
    SELECT COUNT(*) INTO warranty_cols FROM information_schema.columns 
    WHERE table_name = 'warranty_contracts' 
    AND column_name IN ('customer_id_type', 'customer_id_number', 'vehicle_colour', 'reservation_id');
    
    -- Count new indexes
    SELECT COUNT(*) INTO service_indexes FROM pg_indexes 
    WHERE tablename = 'service_contracts' 
    AND indexname IN ('idx_service_contracts_customer_id', 'idx_service_contracts_vehicle_colour', 'idx_service_contracts_reservation_id');
    
    SELECT COUNT(*) INTO warranty_indexes FROM pg_indexes 
    WHERE tablename = 'warranty_contracts' 
    AND indexname IN ('idx_warranty_contracts_customer_id', 'idx_warranty_contracts_vehicle_colour', 'idx_warranty_contracts_reservation_id');
    
    -- Count foreign key constraints
    SELECT COUNT(*) INTO fk_constraints FROM information_schema.table_constraints 
    WHERE constraint_type = 'FOREIGN KEY' 
    AND table_name IN ('service_contracts', 'warranty_contracts')
    AND constraint_name LIKE '%reservation_id%';
    
    -- Count check constraints
    SELECT COUNT(*) INTO check_constraints 
    FROM information_schema.table_constraints tc
    JOIN information_schema.check_constraints cc ON tc.constraint_name = cc.constraint_name
    WHERE tc.constraint_type = 'CHECK'
    AND tc.table_name IN ('service_contracts', 'warranty_contracts')
    AND cc.check_clause LIKE '%customer_id_type%';
    
    -- Report results
    RAISE NOTICE '';
    RAISE NOTICE '📊 MIGRATION VALIDATION RESULTS:';
    RAISE NOTICE '   Columns added to service_contracts: % (expected: 4)', service_cols;
    RAISE NOTICE '   Columns added to warranty_contracts: % (expected: 4)', warranty_cols;
    RAISE NOTICE '   Indexes created for service_contracts: % (expected: 3)', service_indexes;
    RAISE NOTICE '   Indexes created for warranty_contracts: % (expected: 3)', warranty_indexes;
    RAISE NOTICE '   Foreign key constraints: % (expected: 2)', fk_constraints;
    RAISE NOTICE '   Check constraints: % (expected: 2)', check_constraints;
    RAISE NOTICE '';
    
    -- Overall validation
    IF service_cols = 4 AND warranty_cols = 4 AND service_indexes = 3 AND warranty_indexes = 3 AND fk_constraints = 2 AND check_constraints = 2 THEN
        RAISE NOTICE '✅ MIGRATION VALIDATION: ALL CHECKS PASSED!';
        RAISE NOTICE '🚀 Ready to proceed to Step 3: API Endpoint Updates';
    ELSE
        RAISE NOTICE '❌ MIGRATION VALIDATION: SOME CHECKS FAILED!';
        RAISE NOTICE '⚠️  Please review the migration and fix any issues before proceeding';
    END IF;
    RAISE NOTICE '';
END $$;
