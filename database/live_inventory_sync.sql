-- Live Inventory Sync for UV Catalog
-- Automatically sync UV catalog when cars change status in UV CRM
-- When a car is removed from inventory, remove it from UV catalog too

-- ================================
-- STEP 1: CREATE INVENTORY SYNC FUNCTION
-- ================================

CREATE OR REPLACE FUNCTION sync_uv_catalog_with_inventory()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if car status or sale_status changed to non-inventory states
    IF TG_OP = 'UPDATE' THEN
        -- If car was moved out of inventory (status != 'inventory' OR sale_status = 'sold' OR sale_status = 'returned')
        IF (OLD.status = 'inventory' AND NEW.status != 'inventory') OR
           (OLD.sale_status != 'sold' AND NEW.sale_status = 'sold') OR
           (OLD.sale_status != 'returned' AND NEW.sale_status = 'returned') THEN
            
            -- Remove from UV catalog
            DELETE FROM uv_catalog WHERE car_id = NEW.id;
            
            RAISE NOTICE 'Car % removed from UV catalog due to inventory status change: status=%, sale_status=%', 
                NEW.stock_number, NEW.status, NEW.sale_status;
        END IF;
        
        -- If car was brought back to inventory (status = 'inventory' AND sale_status = 'available')
        IF (OLD.status != 'inventory' AND NEW.status = 'inventory' AND NEW.sale_status = 'available') OR
           (OLD.sale_status != 'available' AND NEW.sale_status = 'available' AND NEW.status = 'inventory') THEN
            
            -- Auto-add to UV catalog if not already present
            INSERT INTO uv_catalog (car_id, title, description, status)
            SELECT 
                NEW.id,
                COALESCE(NEW.vehicle_model, 'Untitled') || ' - ' || COALESCE(NEW.stock_number, ''),
                COALESCE(NEW.description, ''),
                'pending'
            WHERE NOT EXISTS (
                SELECT 1 FROM uv_catalog WHERE car_id = NEW.id
            );
            
            RAISE NOTICE 'Car % added to UV catalog due to inventory status change: status=%, sale_status=%', 
                NEW.stock_number, NEW.status, NEW.sale_status;
        END IF;
    END IF;
    
    -- If car is deleted entirely, remove from catalog
    IF TG_OP = 'DELETE' THEN
        DELETE FROM uv_catalog WHERE car_id = OLD.id;
        RAISE NOTICE 'Car % removed from UV catalog due to car deletion', OLD.stock_number;
        RETURN OLD;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ================================
-- STEP 2: CREATE TRIGGER
-- ================================

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_sync_uv_catalog_inventory ON cars;

-- Create the trigger
CREATE TRIGGER trigger_sync_uv_catalog_inventory
    AFTER UPDATE OR DELETE ON cars
    FOR EACH ROW
    EXECUTE FUNCTION sync_uv_catalog_with_inventory();

-- ================================
-- STEP 3: CLEANUP EXISTING INVALID ENTRIES
-- ================================

-- Remove any existing UV catalog entries for cars that are not in active inventory
DELETE FROM uv_catalog 
WHERE car_id IN (
    SELECT c.id 
    FROM cars c 
    WHERE c.status != 'inventory' 
       OR c.sale_status = 'sold' 
       OR c.sale_status = 'returned'
);

-- ================================
-- STEP 4: BULK SYNC EXISTING INVENTORY
-- ================================

-- Add any missing inventory cars to UV catalog
INSERT INTO uv_catalog (car_id, title, description, status)
SELECT 
    c.id,
    COALESCE(c.vehicle_model, 'Untitled') || ' - ' || COALESCE(c.stock_number, ''),
    COALESCE(c.description, ''),
    'pending'
FROM cars c
WHERE c.status = 'inventory' 
  AND c.sale_status = 'available'
  AND NOT EXISTS (
      SELECT 1 FROM uv_catalog uc WHERE uc.car_id = c.id
  );

-- ================================
-- STEP 5: VERIFICATION
-- ================================

-- Check the sync status
SELECT 
    'Live inventory sync setup completed!' as status,
    (SELECT COUNT(*) FROM uv_catalog) as total_catalog_entries,
    (SELECT COUNT(*) FROM cars WHERE status = 'inventory' AND sale_status = 'available') as total_inventory_cars,
    (SELECT COUNT(*) FROM cars c WHERE c.status = 'inventory' AND c.sale_status = 'available' AND EXISTS(SELECT 1 FROM uv_catalog uc WHERE uc.car_id = c.id)) as synced_cars; 