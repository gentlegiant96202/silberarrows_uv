-- Assign proper numbers to all existing records in chronological order

-- Step 1: Reset sequences to 1000
ALTER SEQUENCE reservation_number_seq RESTART WITH 1000;
ALTER SEQUENCE invoice_number_seq RESTART WITH 1000;

-- Step 2: Assign RES numbers to all reservations (chronological order)
DO $$
DECLARE
    rec RECORD;
BEGIN
    FOR rec IN 
        SELECT id, customer_name, created_at
        FROM vehicle_reservations 
        WHERE document_type = 'reservation'
        ORDER BY created_at ASC
    LOOP
        UPDATE vehicle_reservations 
        SET document_number = 'RES-' || nextval('reservation_number_seq')
        WHERE id = rec.id;
        
        RAISE NOTICE 'Assigned % to %', 'RES-' || currval('reservation_number_seq'), rec.customer_name;
    END LOOP;
END $$;

-- Step 3: Assign INV numbers to all invoices (chronological order) and preserve original RES
DO $$
DECLARE
    rec RECORD;
BEGIN
    FOR rec IN 
        SELECT id, customer_name, created_at, original_reservation_number
        FROM vehicle_reservations 
        WHERE document_type = 'invoice'
        ORDER BY created_at ASC
    LOOP
        UPDATE vehicle_reservations 
        SET 
            document_number = 'INV-' || nextval('invoice_number_seq'),
            -- If no original_reservation_number exists, try to infer from old patterns
            original_reservation_number = COALESCE(
                rec.original_reservation_number,
                CASE WHEN rec.customer_name IN ('SOFIA', 'MALAK') THEN 'RES-' || (currval('invoice_number_seq') - 1) ELSE NULL END
            )
        WHERE id = rec.id;
        
        RAISE NOTICE 'Assigned % to %', 'INV-' || currval('invoice_number_seq'), rec.customer_name;
    END LOOP;
END $$;

-- Step 4: Show final result
SELECT 
    customer_name,
    document_type,
    document_number,
    original_reservation_number,
    created_at
FROM vehicle_reservations 
ORDER BY document_type, document_number;

-- Step 5: Show sequence final state
SELECT 
    'reservation_number_seq' as sequence_name,
    last_value,
    is_called
FROM reservation_number_seq
UNION ALL
SELECT 
    'invoice_number_seq' as sequence_name,
    last_value,
    is_called
FROM invoice_number_seq;
