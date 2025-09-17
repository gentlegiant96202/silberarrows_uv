-- Clear ALL numbers first, then assign clean sequential numbers

-- Step 1: Clear all existing numbers to avoid duplicates
UPDATE vehicle_reservations 
SET 
    document_number = NULL,
    original_reservation_number = NULL;

-- Step 2: Reset sequences to 1000
ALTER SEQUENCE reservation_number_seq RESTART WITH 1000;
ALTER SEQUENCE invoice_number_seq RESTART WITH 1000;

-- Step 3: Assign RES numbers to all reservations (chronological order)
DO $$
DECLARE
    rec RECORD;
    res_num INTEGER := 1000;
BEGIN
    FOR rec IN 
        SELECT id, customer_name, created_at
        FROM vehicle_reservations 
        WHERE document_type = 'reservation'
        ORDER BY created_at ASC
    LOOP
        UPDATE vehicle_reservations 
        SET document_number = 'RES-' || res_num
        WHERE id = rec.id;
        
        RAISE NOTICE 'Assigned RES-% to %', res_num, rec.customer_name;
        res_num := res_num + 1;
    END LOOP;
    
    -- Set reservation sequence to continue from where we ended
    PERFORM setval('reservation_number_seq', res_num);
END $$;

-- Step 4: Assign INV numbers to all invoices (chronological order)
DO $$
DECLARE
    rec RECORD;
    inv_num INTEGER := 1000;
BEGIN
    FOR rec IN 
        SELECT id, customer_name, created_at
        FROM vehicle_reservations 
        WHERE document_type = 'invoice'
        ORDER BY created_at ASC
    LOOP
        UPDATE vehicle_reservations 
        SET 
            document_number = 'INV-' || inv_num,
            -- For converted invoices, set proper original reservation number format
            original_reservation_number = 'RES-' || (1000 + (inv_num - 1000))
        WHERE id = rec.id;
        
        RAISE NOTICE 'Assigned INV-% to % (original: RES-%)', inv_num, rec.customer_name, (1000 + (inv_num - 1000));
        inv_num := inv_num + 1;
    END LOOP;
    
    -- Set invoice sequence to continue from where we ended
    PERFORM setval('invoice_number_seq', inv_num);
END $$;

-- Step 5: Show final clean result
SELECT 
    customer_name,
    document_type,
    document_number,
    original_reservation_number,
    created_at
FROM vehicle_reservations 
ORDER BY document_type, document_number;
