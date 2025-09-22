-- ================================
-- SAFE VEHICLE COLOUR FIELDS MIGRATION
-- ================================
-- Safely update vehicle colour fields with existence checks

BEGIN;

-- ================================
-- 1. CHECK AND ADD MISSING COLOUR FIELDS
-- ================================

-- Check and add exterior_colour to service_contracts if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'service_contracts' AND column_name = 'exterior_colour'
    ) THEN
        ALTER TABLE service_contracts ADD COLUMN exterior_colour TEXT;
        RAISE NOTICE '✅ Added exterior_colour to service_contracts';
    ELSE
        RAISE NOTICE 'ℹ️ exterior_colour already exists in service_contracts';
    END IF;
END $$;

-- Check and add interior_colour to service_contracts if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'service_contracts' AND column_name = 'interior_colour'
    ) THEN
        ALTER TABLE service_contracts ADD COLUMN interior_colour TEXT;
        RAISE NOTICE '✅ Added interior_colour to service_contracts';
    ELSE
        RAISE NOTICE 'ℹ️ interior_colour already exists in service_contracts';
    END IF;
END $$;

-- Check and add exterior_colour to warranty_contracts if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'warranty_contracts' AND column_name = 'exterior_colour'
    ) THEN
        ALTER TABLE warranty_contracts ADD COLUMN exterior_colour TEXT;
        RAISE NOTICE '✅ Added exterior_colour to warranty_contracts';
    ELSE
        RAISE NOTICE 'ℹ️ exterior_colour already exists in warranty_contracts';
    END IF;
END $$;

-- Check and add interior_colour to warranty_contracts if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'warranty_contracts' AND column_name = 'interior_colour'
    ) THEN
        ALTER TABLE warranty_contracts ADD COLUMN interior_colour TEXT;
        RAISE NOTICE '✅ Added interior_colour to warranty_contracts';
    ELSE
        RAISE NOTICE 'ℹ️ interior_colour already exists in warranty_contracts';
    END IF;
END $$;

-- ================================
-- 2. MIGRATE EXISTING VEHICLE_COLOUR DATA (if column exists)
-- ================================

-- Migrate service_contracts vehicle_colour data if column exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'service_contracts' AND column_name = 'vehicle_colour'
    ) THEN
        -- Copy existing vehicle_colour data to exterior_colour
        UPDATE service_contracts 
        SET exterior_colour = vehicle_colour 
        WHERE vehicle_colour IS NOT NULL AND vehicle_colour != '' AND (exterior_colour IS NULL OR exterior_colour = '');
        
        RAISE NOTICE '✅ Migrated vehicle_colour data to exterior_colour in service_contracts';
    ELSE
        RAISE NOTICE 'ℹ️ No vehicle_colour column found in service_contracts to migrate';
    END IF;
END $$;

-- Migrate warranty_contracts vehicle_colour data if column exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'warranty_contracts' AND column_name = 'vehicle_colour'
    ) THEN
        -- Copy existing vehicle_colour data to exterior_colour
        UPDATE warranty_contracts 
        SET exterior_colour = vehicle_colour 
        WHERE vehicle_colour IS NOT NULL AND vehicle_colour != '' AND (exterior_colour IS NULL OR exterior_colour = '');
        
        RAISE NOTICE '✅ Migrated vehicle_colour data to exterior_colour in warranty_contracts';
    ELSE
        RAISE NOTICE 'ℹ️ No vehicle_colour column found in warranty_contracts to migrate';
    END IF;
END $$;

-- ================================
-- 3. SAFELY DROP OLD VEHICLE_COLOUR FIELDS
-- ================================

-- Drop views that might depend on vehicle_colour
DROP VIEW IF EXISTS active_service_contracts CASCADE;
DROP VIEW IF EXISTS active_warranty_contracts CASCADE;

-- Drop vehicle_colour from service_contracts if exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'service_contracts' AND column_name = 'vehicle_colour'
    ) THEN
        ALTER TABLE service_contracts DROP COLUMN vehicle_colour;
        RAISE NOTICE '✅ Dropped vehicle_colour from service_contracts';
    ELSE
        RAISE NOTICE 'ℹ️ vehicle_colour column not found in service_contracts';
    END IF;
END $$;

-- Drop vehicle_colour from warranty_contracts if exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'warranty_contracts' AND column_name = 'vehicle_colour'
    ) THEN
        ALTER TABLE warranty_contracts DROP COLUMN vehicle_colour;
        RAISE NOTICE '✅ Dropped vehicle_colour from warranty_contracts';
    ELSE
        RAISE NOTICE 'ℹ️ vehicle_colour column not found in warranty_contracts';
    END IF;
END $$;

-- ================================
-- 4. ADD INDEXES FOR NEW FIELDS (if not exists)
-- ================================

-- Service contracts indexes
CREATE INDEX IF NOT EXISTS idx_service_contracts_exterior_colour ON service_contracts(exterior_colour);
CREATE INDEX IF NOT EXISTS idx_service_contracts_interior_colour ON service_contracts(interior_colour);

-- Warranty contracts indexes
CREATE INDEX IF NOT EXISTS idx_warranty_contracts_exterior_colour ON warranty_contracts(exterior_colour);
CREATE INDEX IF NOT EXISTS idx_warranty_contracts_interior_colour ON warranty_contracts(interior_colour);

-- ================================
-- 5. ADD COMMENTS FOR DOCUMENTATION
-- ================================

-- Service contracts comments
COMMENT ON COLUMN service_contracts.exterior_colour IS 'Vehicle exterior color from VehicleDocumentModal';
COMMENT ON COLUMN service_contracts.interior_colour IS 'Vehicle interior color from VehicleDocumentModal';

-- Warranty contracts comments
COMMENT ON COLUMN warranty_contracts.exterior_colour IS 'Vehicle exterior color from VehicleDocumentModal';
COMMENT ON COLUMN warranty_contracts.interior_colour IS 'Vehicle interior color from VehicleDocumentModal';

-- ================================
-- 6. RECREATE VIEWS WITH NEW FIELDS
-- ================================

-- Recreate active_service_contracts view with new colour fields
CREATE OR REPLACE VIEW active_service_contracts AS
SELECT 
    sc.*,
    CASE 
        WHEN sc.end_date < CURRENT_DATE THEN 'Expired'
        WHEN sc.end_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'Expiring Soon'
        ELSE 'Active'
    END as contract_health,
    (sc.end_date - CURRENT_DATE) as days_until_expiry,
    -- Include reservation data if linked
    vr.customer_name as reservation_customer_name,
    vr.document_type as reservation_document_type,
    vr.sales_executive as reservation_sales_executive
FROM service_contracts sc
LEFT JOIN vehicle_reservations vr ON sc.reservation_id = vr.id
WHERE sc.status != 'cancelled'
ORDER BY sc.end_date;

-- Recreate active_warranty_contracts view with new colour fields
CREATE OR REPLACE VIEW active_warranty_contracts AS
SELECT 
    wc.*,
    CASE 
        WHEN wc.end_date < CURRENT_DATE THEN 'Expired'
        WHEN wc.end_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'Expiring Soon'
        ELSE 'Active'
    END as warranty_health,
    (wc.end_date - CURRENT_DATE) as days_until_expiry,
    -- Include reservation data if linked
    vr.customer_name as reservation_customer_name,
    vr.document_type as reservation_document_type,
    vr.sales_executive as reservation_sales_executive
FROM warranty_contracts wc
LEFT JOIN vehicle_reservations vr ON wc.reservation_id = vr.id
WHERE wc.status != 'cancelled'
ORDER BY wc.end_date;

-- ================================
-- 7. FINAL VERIFICATION
-- ================================

DO $$
DECLARE
    service_ext_col INTEGER;
    service_int_col INTEGER;
    warranty_ext_col INTEGER;
    warranty_int_col INTEGER;
    old_vehicle_col INTEGER;
BEGIN
    -- Check new columns exist
    SELECT COUNT(*) INTO service_ext_col FROM information_schema.columns 
    WHERE table_name = 'service_contracts' AND column_name = 'exterior_colour';
    
    SELECT COUNT(*) INTO service_int_col FROM information_schema.columns 
    WHERE table_name = 'service_contracts' AND column_name = 'interior_colour';
    
    SELECT COUNT(*) INTO warranty_ext_col FROM information_schema.columns 
    WHERE table_name = 'warranty_contracts' AND column_name = 'exterior_colour';
    
    SELECT COUNT(*) INTO warranty_int_col FROM information_schema.columns 
    WHERE table_name = 'warranty_contracts' AND column_name = 'interior_colour';
    
    -- Check old column is removed
    SELECT COUNT(*) INTO old_vehicle_col FROM information_schema.columns 
    WHERE table_name IN ('service_contracts', 'warranty_contracts') AND column_name = 'vehicle_colour';
    
    -- Report results
    RAISE NOTICE '';
    RAISE NOTICE '📊 SAFE VEHICLE COLOUR MIGRATION RESULTS:';
    RAISE NOTICE '   Service contracts exterior_colour: % (expected: 1)', service_ext_col;
    RAISE NOTICE '   Service contracts interior_colour: % (expected: 1)', service_int_col;
    RAISE NOTICE '   Warranty contracts exterior_colour: % (expected: 1)', warranty_ext_col;
    RAISE NOTICE '   Warranty contracts interior_colour: % (expected: 1)', warranty_int_col;
    RAISE NOTICE '   Old vehicle_colour columns remaining: % (expected: 0)', old_vehicle_col;
    RAISE NOTICE '';
    
    IF service_ext_col = 1 AND service_int_col = 1 AND warranty_ext_col = 1 AND warranty_int_col = 1 THEN
        RAISE NOTICE '✅ MIGRATION SUCCESSFUL: Vehicle colour fields ready!';
        RAISE NOTICE '🎯 Both exterior_colour and interior_colour fields available';
        RAISE NOTICE '🚀 Mobile number auto-population ready to test';
    ELSE
        RAISE NOTICE '❌ MIGRATION INCOMPLETE: Please check the results above';
    END IF;
    RAISE NOTICE '';
END $$;

COMMIT;





