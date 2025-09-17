-- Check current state of the accounting data to understand why dual PDFs aren't showing

-- 1. Check if the new columns exist
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'vehicle_reservations' 
AND column_name IN ('original_reservation_number', 'original_reservation_pdf_url')
ORDER BY column_name;

-- 2. Check current data state - see what we have
SELECT 
    document_number,
    original_reservation_number,
    document_type,
    pdf_url,
    original_reservation_pdf_url,
    customer_name,
    created_at
FROM vehicle_reservations 
ORDER BY created_at DESC
LIMIT 10;

-- 3. Check specifically for invoices that should have original reservation data
SELECT 
    document_number,
    original_reservation_number,
    document_type,
    customer_name,
    CASE 
        WHEN original_reservation_number IS NOT NULL THEN 'Converted from reservation'
        ELSE 'Direct invoice'
    END as invoice_type,
    CASE 
        WHEN original_reservation_pdf_url IS NOT NULL THEN 'Has original PDF'
        ELSE 'No original PDF'
    END as pdf_status
FROM vehicle_reservations 
WHERE document_type = 'invoice'
ORDER BY created_at DESC;

-- 4. Show current reservations that could be converted for testing
SELECT 
    document_number,
    document_type,
    customer_name,
    pdf_url,
    'Available for conversion' as status
FROM vehicle_reservations 
WHERE document_type = 'reservation'
AND document_number IS NOT NULL
ORDER BY created_at DESC
LIMIT 5;

