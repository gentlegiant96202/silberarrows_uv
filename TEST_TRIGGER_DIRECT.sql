    -- Test trigger directly with manual INSERT

    -- Check current sequence state
    SELECT 
        'reservation_number_seq' as sequence_name,
        last_value,
        is_called
    FROM reservation_number_seq;

    -- Try manual INSERT to test trigger
    INSERT INTO vehicle_reservations (
        lead_id,
        document_type,
        sales_executive,
        document_date,
        customer_name,
        contact_no,
        email_address,
        customer_id_type,
        customer_id_number,
        vehicle_make_model,
        model_year,
        chassis_no,
        vehicle_mileage,
        vehicle_sale_price,
        invoice_total,
        amount_due,
        created_by
    ) VALUES (
        gen_random_uuid(),
        'reservation',
        'Test User',
        '2025-09-17',
        'TEST TRIGGER',
        '123456789',
        'test@test.com',
        'EID',
        '123-456-789',
        'TEST VEHICLE',
        2025,
        'TEST123',
        1000,
        100000,
        100000,
        100000,
        (SELECT auth.uid())
    );

    -- Check what was inserted
    SELECT 
        customer_name,
        document_type,
        document_number,
        'AFTER INSERT' as status
    FROM vehicle_reservations 
    WHERE customer_name = 'TEST TRIGGER';

    -- Check sequence after
    SELECT 
        'reservation_number_seq' as sequence_name,
        last_value,
        is_called
    FROM reservation_number_seq;
