-- ================================
-- STEP 2: SERVICE CONTRACTS MIGRATION
-- ================================
-- Adds VehicleDocument integration fields to service_contracts and warranty_contracts
-- Run this in Supabase SQL Editor

-- Migration Version: v2.0.0
-- Date: 2025-01-17
-- Purpose: Add customer ID fields, vehicle color, and reservation linking

BEGIN;

-- ================================
-- 1. BACKUP EXISTING DATA (Optional - for safety)
-- ================================
-- Uncomment these lines if you want to create backup tables first
/*
CREATE TABLE service_contracts_backup_20250117 AS SELECT * FROM service_contracts;
CREATE TABLE warranty_contracts_backup_20250117 AS SELECT * FROM warranty_contracts;
*/

-- ================================
-- 2. ADD NEW FIELDS TO SERVICE_CONTRACTS
-- ================================

-- Customer ID fields (from VehicleDocumentModal)
ALTER TABLE service_contracts 
ADD COLUMN customer_id_type TEXT CHECK (customer_id_type IN ('EID', 'Passport'));

ALTER TABLE service_contracts 
ADD COLUMN customer_id_number TEXT;

-- Vehicle color field (from VehicleDocumentModal)
ALTER TABLE service_contracts 
ADD COLUMN vehicle_colour TEXT;

-- Relationship link to vehicle reservations
ALTER TABLE service_contracts 
ADD COLUMN reservation_id UUID REFERENCES vehicle_reservations(id) ON DELETE SET NULL;

-- ================================
-- 3. ADD NEW FIELDS TO WARRANTY_CONTRACTS
-- ================================

-- Customer ID fields (from VehicleDocumentModal)
ALTER TABLE warranty_contracts 
ADD COLUMN customer_id_type TEXT CHECK (customer_id_type IN ('EID', 'Passport'));

ALTER TABLE warranty_contracts 
ADD COLUMN customer_id_number TEXT;

-- Vehicle color field (from VehicleDocumentModal)
ALTER TABLE warranty_contracts 
ADD COLUMN vehicle_colour TEXT;

-- Relationship link to vehicle reservations
ALTER TABLE warranty_contracts 
ADD COLUMN reservation_id UUID REFERENCES vehicle_reservations(id) ON DELETE SET NULL;

-- ================================
-- 4. ADD INDEXES FOR PERFORMANCE
-- ================================

-- Service contracts indexes
CREATE INDEX idx_service_contracts_customer_id ON service_contracts(customer_id_type, customer_id_number);
CREATE INDEX idx_service_contracts_vehicle_colour ON service_contracts(vehicle_colour);
CREATE INDEX idx_service_contracts_reservation_id ON service_contracts(reservation_id);

-- Warranty contracts indexes
CREATE INDEX idx_warranty_contracts_customer_id ON warranty_contracts(customer_id_type, customer_id_number);
CREATE INDEX idx_warranty_contracts_vehicle_colour ON warranty_contracts(vehicle_colour);
CREATE INDEX idx_warranty_contracts_reservation_id ON warranty_contracts(reservation_id);

-- ================================
-- 5. ADD COMMENTS FOR DOCUMENTATION
-- ================================

-- Service contracts comments
COMMENT ON COLUMN service_contracts.customer_id_type IS 'Customer ID document type from VehicleDocumentModal (EID or Passport)';
COMMENT ON COLUMN service_contracts.customer_id_number IS 'Customer ID document number from VehicleDocumentModal';
COMMENT ON COLUMN service_contracts.vehicle_colour IS 'Vehicle exterior color from VehicleDocumentModal';
COMMENT ON COLUMN service_contracts.reservation_id IS 'Links to vehicle_reservations table for cross-module integration';

-- Warranty contracts comments
COMMENT ON COLUMN warranty_contracts.customer_id_type IS 'Customer ID document type from VehicleDocumentModal (EID or Passport)';
COMMENT ON COLUMN warranty_contracts.customer_id_number IS 'Customer ID document number from VehicleDocumentModal';
COMMENT ON COLUMN warranty_contracts.vehicle_colour IS 'Vehicle exterior color from VehicleDocumentModal';
COMMENT ON COLUMN warranty_contracts.reservation_id IS 'Links to vehicle_reservations table for cross-module integration';

-- ================================
-- 6. UPDATE EXISTING VIEWS (if they reference affected tables)
-- ================================

-- Recreate active_service_contracts view with new fields
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

-- Recreate active_warranty_contracts view with new fields
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
-- 7. CREATE HELPER FUNCTIONS FOR DATA MIGRATION
-- ================================

-- Function to parse vehicle make from make_model string
CREATE OR REPLACE FUNCTION parse_vehicle_make(vehicle_make_model TEXT)
RETURNS TEXT AS $$
BEGIN
    -- Extract first word as make (e.g., "Mercedes-Benz C-Class" -> "Mercedes-Benz")
    IF vehicle_make_model ILIKE '%mercedes%' THEN
        RETURN 'Mercedes-Benz';
    ELSIF vehicle_make_model ILIKE '%bmw%' THEN
        RETURN 'BMW';
    ELSIF vehicle_make_model ILIKE '%audi%' THEN
        RETURN 'Audi';
    ELSIF vehicle_make_model ILIKE '%porsche%' THEN
        RETURN 'Porsche';
    ELSE
        -- Fallback: return first word
        RETURN SPLIT_PART(vehicle_make_model, ' ', 1);
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to parse vehicle model from make_model string
CREATE OR REPLACE FUNCTION parse_vehicle_model(vehicle_make_model TEXT)
RETURNS TEXT AS $$
BEGIN
    -- Extract everything after the make
    IF vehicle_make_model ILIKE '%mercedes-benz%' THEN
        RETURN TRIM(REPLACE(vehicle_make_model, 'Mercedes-Benz', ''));
    ELSIF vehicle_make_model ILIKE '%bmw%' THEN
        RETURN TRIM(REPLACE(vehicle_make_model, 'BMW', ''));
    ELSIF vehicle_make_model ILIKE '%audi%' THEN
        RETURN TRIM(REPLACE(vehicle_make_model, 'Audi', ''));
    ELSIF vehicle_make_model ILIKE '%porsche%' THEN
        RETURN TRIM(REPLACE(vehicle_make_model, 'Porsche', ''));
    ELSE
        -- Fallback: return everything after first space
        RETURN TRIM(SUBSTRING(vehicle_make_model FROM POSITION(' ' IN vehicle_make_model) + 1));
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ================================
-- 8. VERIFICATION QUERIES
-- ================================

-- Check that new columns were added successfully
DO $$
DECLARE
    service_col_count INTEGER;
    warranty_col_count INTEGER;
BEGIN
    -- Count new columns in service_contracts
    SELECT COUNT(*) INTO service_col_count
    FROM information_schema.columns 
    WHERE table_name = 'service_contracts' 
    AND column_name IN ('customer_id_type', 'customer_id_number', 'vehicle_colour', 'reservation_id');
    
    -- Count new columns in warranty_contracts
    SELECT COUNT(*) INTO warranty_col_count
    FROM information_schema.columns 
    WHERE table_name = 'warranty_contracts' 
    AND column_name IN ('customer_id_type', 'customer_id_number', 'vehicle_colour', 'reservation_id');
    
    -- Verify all columns were added
    IF service_col_count = 4 AND warranty_col_count = 4 THEN
        RAISE NOTICE '✅ SUCCESS: All 4 new columns added to both service_contracts and warranty_contracts';
        RAISE NOTICE '📋 New fields: customer_id_type, customer_id_number, vehicle_colour, reservation_id';
    ELSE
        RAISE EXCEPTION '❌ ERROR: Expected 4 columns in each table, found % in service_contracts and % in warranty_contracts', service_col_count, warranty_col_count;
    END IF;
END $$;

-- ================================
-- 9. MIGRATION SUMMARY
-- ================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🎉 MIGRATION COMPLETED SUCCESSFULLY!';
    RAISE NOTICE '';
    RAISE NOTICE '📊 CHANGES MADE:';
    RAISE NOTICE '   ✅ Added 4 new fields to service_contracts table';
    RAISE NOTICE '   ✅ Added 4 new fields to warranty_contracts table';
    RAISE NOTICE '   ✅ Created 6 new indexes for performance';
    RAISE NOTICE '   ✅ Updated views with reservation data joins';
    RAISE NOTICE '   ✅ Added helper functions for data parsing';
    RAISE NOTICE '';
    RAISE NOTICE '🔗 NEW INTEGRATION FIELDS:';
    RAISE NOTICE '   • customer_id_type (EID/Passport)';
    RAISE NOTICE '   • customer_id_number (ID number)';
    RAISE NOTICE '   • vehicle_colour (exterior color)';
    RAISE NOTICE '   • reservation_id (links to vehicle_reservations)';
    RAISE NOTICE '';
    RAISE NOTICE '🚀 READY FOR STEP 3: API Endpoint Updates';
    RAISE NOTICE '';
END $$;

COMMIT;
