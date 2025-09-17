-- Check the specific PDF URLs for RAHMAN (INV-1010) to debug the 400 error

-- Show the full URLs for RAHMAN's record
SELECT 
    document_number,
    original_reservation_number,
    customer_name,
    pdf_url as current_invoice_pdf,
    original_reservation_pdf_url as original_reservation_pdf,
    created_at,
    updated_at
FROM vehicle_reservations 
WHERE customer_name = 'RAHMAN' 
AND document_number = 'INV-1010';

-- Analyze the URL structure to see what might be causing 400 error
SELECT 
    document_number,
    customer_name,
    -- Check URL patterns
    CASE 
        WHEN pdf_url LIKE '%supabase%' THEN 'Supabase Storage'
        WHEN pdf_url LIKE '%pdfshift%' THEN 'PDFShift'
        ELSE 'Other: ' || SUBSTRING(pdf_url, 1, 50)
    END as current_pdf_source,
    CASE 
        WHEN original_reservation_pdf_url LIKE '%supabase%' THEN 'Supabase Storage'
        WHEN original_reservation_pdf_url LIKE '%pdfshift%' THEN 'PDFShift'
        ELSE 'Other: ' || SUBSTRING(original_reservation_pdf_url, 1, 50)
    END as original_pdf_source,
    -- Check for authentication tokens
    CASE 
        WHEN original_reservation_pdf_url LIKE '%token%' THEN 'Has Token'
        ELSE 'No Token'
    END as token_status,
    -- Check URL length (very long URLs might have issues)
    LENGTH(original_reservation_pdf_url) as original_url_length
FROM vehicle_reservations 
WHERE customer_name = 'RAHMAN' 
AND document_number = 'INV-1010';

-- Show just the domain/host part to identify the service
SELECT 
    document_number,
    customer_name,
    SUBSTRING(pdf_url FROM 'https?://([^/]+)') as current_pdf_domain,
    SUBSTRING(original_reservation_pdf_url FROM 'https?://([^/]+)') as original_pdf_domain
FROM vehicle_reservations 
WHERE customer_name = 'RAHMAN' 
AND document_number = 'INV-1010';
