-- =====================================================
-- CHECK CAR FROM STORAGE LOG
-- =====================================================
-- Car ID from storage deletion: 9963be32-f83c-4640-abb8-e520cb44e4c1
-- This is NOT the EQS 023656 (different car)

-- Check if this car exists
SELECT 
    id,
    stock_number,
    vehicle_model,
    model_year,
    status,
    sale_status,
    customer_name,
    created_at,
    updated_at
FROM cars
WHERE id = '9963be32-f83c-4640-abb8-e520cb44e4c1';

-- Check orphaned media for this car
SELECT 
    id,
    car_id,
    kind,
    url,
    filename,
    created_at
FROM car_media
WHERE car_id = '9963be32-f83c-4640-abb8-e520cb44e4c1'
ORDER BY created_at DESC;

-- Check who deleted it (user ID from log)
-- User ID from log: baca06fa-90e8-465e-96b7-d2693e5a949c
SELECT 
    id,
    email,
    raw_user_meta_data,
    created_at,
    last_sign_in_at
FROM auth.users
WHERE id = 'baca06fa-90e8-465e-96b7-d2693e5a949c';

/*
SUMMARY:
========
The storage log you found shows:
- A PDF file deletion (vehicle-details-1760193161550.pdf)
- From a DIFFERENT car: 9963be32-f83c-4640-abb8-e520cb44e4c1
- NOT your EQS 023656 (19e93a06-d309-4e9d-9ba7-f0da0cb07c02)
- Deleted by user: baca06fa-90e8-465e-96b7-d2693e5a949c
- On: Oct 11, 2025 around 14:53 UTC

TO FIND YOUR CAR DELETION:
===========================
Look in DATABASE LOGS (not storage logs)
Search for: DELETE FROM cars WHERE stock_number = '023656'
*/





