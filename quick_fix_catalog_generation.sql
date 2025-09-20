-- Quick fix: Ensure all inventory cars have catalog entries
INSERT INTO uv_catalog (car_id, title, description, make, model, year, mileage_km, price_aed, status)
SELECT 
    c.id,
    UPPER(CONCAT(c.model_year, ' MERCEDES-BENZ ', 
        CASE 
            WHEN UPPER(c.vehicle_model) LIKE 'MERCEDES-BENZ%' THEN SUBSTRING(c.vehicle_model FROM 14)
            WHEN UPPER(c.vehicle_model) LIKE 'MERCEDES%' THEN SUBSTRING(c.vehicle_model FROM 10)
            ELSE c.vehicle_model
        END
    )),
    CONCAT('Premium ', c.model_year, ' Mercedes-Benz vehicle in excellent condition'),
    'MERCEDES-BENZ',
    UPPER(c.vehicle_model),
    c.model_year,
    COALESCE(c.current_mileage_km, 0),
    c.advertised_price_aed,
    'pending'
FROM cars c 
WHERE c.status = 'inventory' 
AND c.sale_status = 'available'
AND NOT EXISTS (
    SELECT 1 FROM uv_catalog uc WHERE uc.car_id = c.id
)
ON CONFLICT (car_id) DO NOTHING;

SELECT 'Quick catalog entries created!' as result, COUNT(*) as entries_created 
FROM uv_catalog;
