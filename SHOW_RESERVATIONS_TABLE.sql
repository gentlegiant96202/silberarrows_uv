-- Show complete reservations table structure and data

-- 1. Show table structure (columns, types, constraints)
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'vehicle_reservations'
ORDER BY ordinal_position;

-- 2. Show all constraints on the table
SELECT 
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name = 'vehicle_reservations'
ORDER BY tc.constraint_type, tc.constraint_name;

-- 3. Show all current data in the table
SELECT 
    id,
    lead_id,
    document_type,
    document_number,
    customer_name,
    vehicle_make_model,
    pdf_url,
    created_at,
    updated_at
FROM vehicle_reservations 
ORDER BY created_at;

-- 4. Count records by type
SELECT 
    document_type,
    COUNT(*) as count,
    COUNT(CASE WHEN document_number IS NOT NULL THEN 1 END) as with_numbers,
    COUNT(CASE WHEN pdf_url IS NOT NULL THEN 1 END) as with_pdfs
FROM vehicle_reservations 
GROUP BY document_type;
