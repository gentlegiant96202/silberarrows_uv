-- =====================================================
-- FIX UV CATALOG TITLE STANDARDIZATION
-- Updates catalog logic to ensure consistent titles
-- =====================================================

-- Create improved title generation function
CREATE OR REPLACE FUNCTION generate_standardized_catalog_title(model_year INTEGER, vehicle_model TEXT)
RETURNS TEXT AS $$
DECLARE
    clean_model TEXT;
    standardized_title TEXT;
BEGIN
    -- Clean and standardize the vehicle_model
    clean_model := TRIM(UPPER(COALESCE(vehicle_model, '')));
    
    -- If model already starts with known brands, use as-is
    -- Otherwise, assume it's Mercedes-Benz (since this appears to be primarily Mercedes inventory)
    IF clean_model LIKE 'MERCEDES-BENZ%' OR 
       clean_model LIKE 'BMW%' OR 
       clean_model LIKE 'AUDI%' OR 
       clean_model LIKE 'PORSCHE%' OR 
       clean_model LIKE 'LEXUS%' OR 
       clean_model LIKE 'TOYOTA%' OR 
       clean_model LIKE 'NISSAN%' OR 
       clean_model LIKE 'INFINITI%' OR 
       clean_model LIKE 'LAND ROVER%' OR 
       clean_model LIKE 'RANGE ROVER%' OR 
       clean_model LIKE 'JAGUAR%' OR 
       clean_model LIKE 'BENTLEY%' OR 
       clean_model LIKE 'ROLLS-ROYCE%' OR 
       clean_model LIKE 'MASERATI%' OR 
       clean_model LIKE 'FERRARI%' OR 
       clean_model LIKE 'LAMBORGHINI%' OR 
       clean_model LIKE 'MCLAREN%' THEN
        -- Already has brand, use as-is
        standardized_title := CONCAT(model_year, ' ', clean_model);
    ELSE
        -- Assume Mercedes-Benz if no brand detected
        standardized_title := CONCAT(model_year, ' MERCEDES-BENZ ', clean_model);
    END IF;
    
    -- Keep everything in CAPITAL LETTERS
    standardized_title := UPPER(standardized_title);
    
    RETURN standardized_title;
END;
$$ LANGUAGE plpgsql;

-- Update the auto-create catalog function with standardized titles
CREATE OR REPLACE FUNCTION auto_create_uv_catalog_entry()
RETURNS TRIGGER AS $$
BEGIN
    -- Only create catalog entry for inventory cars that are available
    IF NEW.status = 'inventory' AND NEW.sale_status = 'available' THEN
        INSERT INTO uv_catalog (
            car_id,
            title,
            description,
            make,
            model,
            year,
            mileage_km,
            price_aed,
            body_style,
            url
        ) VALUES (
            NEW.id,
            generate_standardized_catalog_title(NEW.model_year, NEW.vehicle_model),
            COALESCE(NEW.description, CONCAT('Premium ', generate_standardized_catalog_title(NEW.model_year, NEW.vehicle_model), ' in excellent condition')),
            SPLIT_PART(UPPER(TRIM(COALESCE(NEW.vehicle_model, ''))), ' ', 1), -- Extract make from model
            UPPER(TRIM(COALESCE(NEW.vehicle_model, ''))),
            NEW.model_year,
            NEW.current_mileage_km,
            NEW.advertised_price_aed,
            COALESCE(NEW.model_family, 'SEDAN'),
            CONCAT('https://silberarrows.com/inventory/', NEW.id)
        ) ON CONFLICT (car_id) DO UPDATE SET
            title = generate_standardized_catalog_title(NEW.model_year, NEW.vehicle_model),
            description = COALESCE(NEW.description, CONCAT('Premium ', generate_standardized_catalog_title(NEW.model_year, NEW.vehicle_model), ' in excellent condition')),
            make = SPLIT_PART(UPPER(TRIM(COALESCE(NEW.vehicle_model, ''))), ' ', 1),
            model = UPPER(TRIM(COALESCE(NEW.vehicle_model, ''))),
            year = NEW.model_year,
            mileage_km = NEW.current_mileage_km,
            price_aed = NEW.advertised_price_aed,
            body_style = COALESCE(NEW.model_family, 'SEDAN'),
            url = CONCAT('https://silberarrows.com/inventory/', NEW.id),
            updated_at = NOW();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update existing catalog entries with standardized titles
UPDATE uv_catalog 
SET title = generate_standardized_catalog_title(
    (SELECT model_year FROM cars WHERE cars.id = uv_catalog.car_id),
    (SELECT vehicle_model FROM cars WHERE cars.id = uv_catalog.car_id)
),
updated_at = NOW()
WHERE EXISTS (
    SELECT 1 FROM cars 
    WHERE cars.id = uv_catalog.car_id 
    AND cars.status = 'inventory' 
    AND cars.sale_status = 'available'
);

-- Show results
SELECT 
    'Updated catalog titles!' as result,
    COUNT(*) as updated_entries
FROM uv_catalog uc
JOIN cars c ON c.id = uc.car_id
WHERE c.status = 'inventory' AND c.sale_status = 'available';

-- Update the inventory sync function to use standardized titles too
CREATE OR REPLACE FUNCTION sync_uv_catalog_with_inventory()
RETURNS TRIGGER AS $$
BEGIN
    -- If car was removed from inventory (status != 'inventory' OR sale_status = 'sold' OR 'returned')
    IF TG_OP = 'UPDATE' THEN
        IF (OLD.status = 'inventory' AND NEW.status != 'inventory') OR
           (OLD.sale_status = 'available' AND NEW.sale_status IN ('sold', 'returned')) THEN
            
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
                generate_standardized_catalog_title(NEW.model_year, NEW.vehicle_model),
                COALESCE(NEW.description, CONCAT('Premium ', generate_standardized_catalog_title(NEW.model_year, NEW.vehicle_model), ' in excellent condition')),
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

-- Sample of updated titles
SELECT 
    c.vehicle_model as original_model,
    uc.title as standardized_title,
    uc.updated_at
FROM uv_catalog uc
JOIN cars c ON c.id = uc.car_id
WHERE c.status = 'inventory' AND c.sale_status = 'available'
ORDER BY uc.updated_at DESC
LIMIT 10;
