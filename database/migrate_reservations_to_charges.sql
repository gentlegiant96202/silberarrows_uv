-- Migrate existing vehicle_reservations pricing data to uv_charges table
-- This creates proper line items from the flat fields
-- Note: total_amount is a generated column (quantity * unit_price), so we don't insert it

-- Step 1: Migrate Vehicle Sale Price
INSERT INTO uv_charges (reservation_id, charge_type, description, quantity, unit_price, display_order)
SELECT 
    id as reservation_id,
    'vehicle_sale' as charge_type,
    'Vehicle Sale - ' || vehicle_make_model as description,
    1 as quantity,
    vehicle_sale_price as unit_price,
    1 as display_order
FROM vehicle_reservations
WHERE vehicle_sale_price > 0
AND id NOT IN (SELECT DISTINCT reservation_id FROM uv_charges WHERE charge_type = 'vehicle_sale');

-- Step 2: Migrate RTA Fees
INSERT INTO uv_charges (reservation_id, charge_type, description, quantity, unit_price, display_order)
SELECT 
    id as reservation_id,
    'rta_fees' as charge_type,
    'RTA Registration & Transfer Fees' as description,
    1 as quantity,
    rta_fees as unit_price,
    2 as display_order
FROM vehicle_reservations
WHERE rta_fees > 0
AND id NOT IN (SELECT DISTINCT reservation_id FROM uv_charges WHERE charge_type = 'rta_fees');

-- Step 3: Migrate Extended Warranty
INSERT INTO uv_charges (reservation_id, charge_type, description, quantity, unit_price, display_order)
SELECT 
    id as reservation_id,
    'extended_warranty' as charge_type,
    'Extended Warranty' as description,
    1 as quantity,
    extended_warranty_price as unit_price,
    3 as display_order
FROM vehicle_reservations
WHERE extended_warranty = true AND extended_warranty_price > 0
AND id NOT IN (SELECT DISTINCT reservation_id FROM uv_charges WHERE charge_type = 'extended_warranty');

-- Step 4: Migrate Ceramic Treatment
INSERT INTO uv_charges (reservation_id, charge_type, description, quantity, unit_price, display_order)
SELECT 
    id as reservation_id,
    'ceramic_treatment' as charge_type,
    'Ceramic Paint Protection' as description,
    1 as quantity,
    ceramic_treatment_price as unit_price,
    4 as display_order
FROM vehicle_reservations
WHERE ceramic_treatment = true AND ceramic_treatment_price > 0
AND id NOT IN (SELECT DISTINCT reservation_id FROM uv_charges WHERE charge_type = 'ceramic_treatment');

-- Step 5: Migrate ServiceCare
INSERT INTO uv_charges (reservation_id, charge_type, description, quantity, unit_price, display_order)
SELECT 
    id as reservation_id,
    'service_care' as charge_type,
    'ServiceCare Package' as description,
    1 as quantity,
    service_care_price as unit_price,
    5 as display_order
FROM vehicle_reservations
WHERE service_care = true AND service_care_price > 0
AND id NOT IN (SELECT DISTINCT reservation_id FROM uv_charges WHERE charge_type = 'service_care');

-- Step 6: Migrate Window Tints
INSERT INTO uv_charges (reservation_id, charge_type, description, quantity, unit_price, display_order)
SELECT 
    id as reservation_id,
    'window_tints' as charge_type,
    'Window Tinting' as description,
    1 as quantity,
    window_tints_price as unit_price,
    6 as display_order
FROM vehicle_reservations
WHERE window_tints = true AND window_tints_price > 0
AND id NOT IN (SELECT DISTINCT reservation_id FROM uv_charges WHERE charge_type = 'window_tints');

-- Step 7: Migrate Part Exchange as a credit (negative charge)
INSERT INTO uv_charges (reservation_id, charge_type, description, quantity, unit_price, display_order)
SELECT 
    id as reservation_id,
    'discount' as charge_type,
    'Part Exchange Credit - ' || COALESCE(part_exchange_make_model, 'Trade-in Vehicle') as description,
    1 as quantity,
    -part_exchange_value as unit_price,
    10 as display_order
FROM vehicle_reservations
WHERE has_part_exchange = true AND part_exchange_value > 0
AND id NOT IN (SELECT DISTINCT reservation_id FROM uv_charges WHERE charge_type = 'discount' AND description LIKE 'Part Exchange%');

-- Step 8: Migrate existing deposits to uv_payments
-- Note: unallocated_amount is a generated column (amount - allocated_amount), so we don't insert it
INSERT INTO uv_payments (lead_id, payment_date, payment_method, amount, allocated_amount, status, notes)
SELECT 
    vr.lead_id,
    vr.document_date as payment_date,
    'cash' as payment_method,
    vr.deposit as amount,
    vr.deposit as allocated_amount,
    'allocated' as status,
    'Migrated deposit from reservation' as notes
FROM vehicle_reservations vr
WHERE vr.deposit > 0
AND vr.lead_id NOT IN (SELECT DISTINCT lead_id FROM uv_payments WHERE notes = 'Migrated deposit from reservation');

-- Step 9: Create payment allocations for migrated deposits
INSERT INTO uv_payment_allocations (payment_id, reservation_id, allocated_amount)
SELECT 
    p.id as payment_id,
    vr.id as reservation_id,
    p.amount as allocated_amount
FROM uv_payments p
JOIN vehicle_reservations vr ON vr.lead_id = p.lead_id
WHERE p.notes = 'Migrated deposit from reservation'
AND NOT EXISTS (
    SELECT 1 FROM uv_payment_allocations pa 
    WHERE pa.payment_id = p.id AND pa.reservation_id = vr.id
);

-- Verify migration
SELECT 
    'Charges migrated' as status,
    COUNT(*) as count
FROM uv_charges;

SELECT 
    'Payments migrated' as status,
    COUNT(*) as count
FROM uv_payments
WHERE notes = 'Migrated deposit from reservation';

-- Show sample of migrated data
SELECT 
    vr.customer_name,
    vr.customer_number,
    c.charge_type,
    c.description,
    c.total_amount
FROM uv_charges c
JOIN vehicle_reservations vr ON vr.id = c.reservation_id
ORDER BY vr.created_at DESC, c.display_order
LIMIT 20;
