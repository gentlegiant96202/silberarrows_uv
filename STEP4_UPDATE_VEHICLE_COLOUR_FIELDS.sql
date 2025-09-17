-- ================================
-- UPDATE VEHICLE COLOUR FIELDS IN SERVICE CONTRACTS
-- ================================
-- Replace single vehicle_colour with exterior_colour and interior_colour
-- to match vehicle_reservations table structure

BEGIN;

-- ================================
-- 1. ADD NEW COLOUR FIELDS TO SERVICE_CONTRACTS
-- ================================

-- Add exterior_colour field
ALTER TABLE service_contracts 
ADD COLUMN exterior_colour TEXT;

-- Add interior_colour field
ALTER TABLE service_contracts 
ADD COLUMN interior_colour TEXT;

-- ================================
-- 2. MIGRATE EXISTING DATA (if any exists in vehicle_colour)
-- ================================

-- Copy existing vehicle_colour data to exterior_colour
UPDATE service_contracts 
SET exterior_colour = vehicle_colour 
WHERE vehicle_colour IS NOT NULL AND vehicle_colour != '';

-- ================================
-- 3. DROP VIEWS THAT DEPEND ON VEHICLE_COLOUR
-- ================================

-- Drop views that reference vehicle_colour column
DROP VIEW IF EXISTS active_service_contracts CASCADE;
DROP VIEW IF EXISTS active_warranty_contracts CASCADE;

-- ================================
-- 4. DROP OLD VEHICLE_COLOUR FIELD
-- ================================

-- Remove the old vehicle_colour column
ALTER TABLE service_contracts 
DROP COLUMN vehicle_colour;

-- ================================
-- 5. ADD NEW COLOUR FIELDS TO WARRANTY_CONTRACTS
-- ================================

-- Add exterior_colour field
ALTER TABLE warranty_contracts 
ADD COLUMN exterior_colour TEXT;

-- Add interior_colour field
ALTER TABLE warranty_contracts 
ADD COLUMN interior_colour TEXT;

-- ================================
-- 6. MIGRATE EXISTING DATA (if any exists in vehicle_colour)
-- ================================

-- Copy existing vehicle_colour data to exterior_colour
UPDATE warranty_contracts 
SET exterior_colour = vehicle_colour 
WHERE vehicle_colour IS NOT NULL AND vehicle_colour != '';

-- ================================
-- 7. DROP OLD VEHICLE_COLOUR FIELD FROM WARRANTY_CONTRACTS
-- ================================

-- Remove the old vehicle_colour column
ALTER TABLE warranty_contracts 
DROP COLUMN vehicle_colour;

-- ================================
-- 8. ADD INDEXES FOR PERFORMANCE
-- ================================

-- Service contracts indexes
CREATE INDEX idx_service_contracts_exterior_colour ON service_contracts(exterior_colour);
CREATE INDEX idx_service_contracts_interior_colour ON service_contracts(interior_colour);

-- Warranty contracts indexes
CREATE INDEX idx_warranty_contracts_exterior_colour ON warranty_contracts(exterior_colour);
CREATE INDEX idx_warranty_contracts_interior_colour ON warranty_contracts(interior_colour);

-- ================================
-- 9. ADD COMMENTS FOR DOCUMENTATION
-- ================================

-- Service contracts comments
COMMENT ON COLUMN service_contracts.exterior_colour IS 'Vehicle exterior color from VehicleDocumentModal';
COMMENT ON COLUMN service_contracts.interior_colour IS 'Vehicle interior color from VehicleDocumentModal';

-- Warranty contracts comments
COMMENT ON COLUMN warranty_contracts.exterior_colour IS 'Vehicle exterior color from VehicleDocumentModal';
COMMENT ON COLUMN warranty_contracts.interior_colour IS 'Vehicle interior color from VehicleDocumentModal';

-- ================================
-- 10. UPDATE VIEWS TO INCLUDE NEW FIELDS
-- ================================

-- Recreate active_service_contracts view with new colour fields
DROP VIEW IF EXISTS active_service_contracts CASCADE;
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
DROP VIEW IF EXISTS active_warranty_contracts CASCADE;
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
-- 10. VERIFICATION
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
    RAISE NOTICE '📊 VEHICLE COLOUR FIELD MIGRATION RESULTS:';
    RAISE NOTICE '   Service contracts exterior_colour: % (expected: 1)', service_ext_col;
    RAISE NOTICE '   Service contracts interior_colour: % (expected: 1)', service_int_col;
    RAISE NOTICE '   Warranty contracts exterior_colour: % (expected: 1)', warranty_ext_col;
    RAISE NOTICE '   Warranty contracts interior_colour: % (expected: 1)', warranty_int_col;
    RAISE NOTICE '   Old vehicle_colour columns remaining: % (expected: 0)', old_vehicle_col;
    RAISE NOTICE '';
    
    IF service_ext_col = 1 AND service_int_col = 1 AND warranty_ext_col = 1 AND warranty_int_col = 1 AND old_vehicle_col = 0 THEN
        RAISE NOTICE '✅ MIGRATION SUCCESSFUL: Vehicle colour fields updated correctly!';
        RAISE NOTICE '🎯 Service contracts now have exterior_colour and interior_colour fields';
        RAISE NOTICE '🎯 Warranty contracts now have exterior_colour and interior_colour fields';
        RAISE NOTICE '🗑️ Old vehicle_colour field removed from both tables';
    ELSE
        RAISE NOTICE '❌ MIGRATION INCOMPLETE: Please check the results above';
    END IF;
    RAISE NOTICE '';
END $$;

COMMIT;
