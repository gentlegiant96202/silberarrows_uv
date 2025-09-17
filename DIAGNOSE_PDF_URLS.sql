-- Diagnose PDF URL issues to understand the 400 error

-- Check the structure of PDF URLs in the system
SELECT 
    document_number,
    document_type,
    customer_name,
    CASE 
        WHEN pdf_url IS NOT NULL THEN 
            CASE 
                WHEN pdf_url LIKE '%supabase%' THEN 'Supabase Storage'
                WHEN pdf_url LIKE '%pdfshift%' THEN 'PDFShift CDN'
                WHEN pdf_url LIKE '%cloudinary%' THEN 'Cloudinary CDN'
                ELSE 'Other/Unknown'
            END
        ELSE 'No PDF'
    END as current_pdf_type,
    CASE 
        WHEN original_reservation_pdf_url IS NOT NULL THEN 
            CASE 
                WHEN original_reservation_pdf_url LIKE '%supabase%' THEN 'Supabase Storage'
                WHEN original_reservation_pdf_url LIKE '%pdfshift%' THEN 'PDFShift CDN'
                WHEN original_reservation_pdf_url LIKE '%cloudinary%' THEN 'Cloudinary CDN'
                ELSE 'Other/Unknown'
            END
        ELSE 'No Original PDF'
    END as original_pdf_type,
    LENGTH(pdf_url) as current_pdf_url_length,
    LENGTH(original_reservation_pdf_url) as original_pdf_url_length,
    created_at
FROM vehicle_reservations 
WHERE document_type = 'invoice' 
AND (pdf_url IS NOT NULL OR original_reservation_pdf_url IS NOT NULL)
ORDER BY created_at DESC
LIMIT 10;

-- Show the actual URLs for debugging (first 100 chars to avoid clutter)
SELECT 
    document_number,
    customer_name,
    SUBSTRING(pdf_url, 1, 100) || '...' as current_pdf_preview,
    SUBSTRING(original_reservation_pdf_url, 1, 100) || '...' as original_pdf_preview,
    created_at
FROM vehicle_reservations 
WHERE document_type = 'invoice' 
AND original_reservation_pdf_url IS NOT NULL
ORDER BY created_at DESC
LIMIT 5;

-- Check for any suspicious patterns in URLs
SELECT 
    'URL Pattern Analysis' as analysis_type,
    COUNT(*) as total_records,
    COUNT(CASE WHEN pdf_url LIKE '%token%' THEN 1 END) as urls_with_tokens,
    COUNT(CASE WHEN pdf_url LIKE '%expires%' THEN 1 END) as urls_with_expiry,
    COUNT(CASE WHEN LENGTH(pdf_url) > 500 THEN 1 END) as very_long_urls,
    COUNT(CASE WHEN pdf_url LIKE 'https://%' THEN 1 END) as https_urls,
    COUNT(CASE WHEN pdf_url LIKE 'http://%' THEN 1 END) as http_urls
FROM vehicle_reservations 
WHERE pdf_url IS NOT NULL;

-- Show recent conversion that should have both PDFs
SELECT 
    document_number as invoice_number,
    original_reservation_number,
    customer_name,
    CASE 
        WHEN pdf_url IS NOT NULL THEN '✅ Has Invoice PDF'
        ELSE '❌ Missing Invoice PDF'
    END as invoice_pdf_status,
    CASE 
        WHEN original_reservation_pdf_url IS NOT NULL THEN '✅ Has Original PDF'
        ELSE '❌ Missing Original PDF'
    END as original_pdf_status,
    created_at,
    updated_at
FROM vehicle_reservations 
WHERE document_type = 'invoice'
AND original_reservation_number IS NOT NULL
ORDER BY updated_at DESC
LIMIT 5;

