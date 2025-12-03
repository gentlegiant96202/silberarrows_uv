-- =====================================================
-- DELETE PAYMENTS & RESERVATION FOR CIN-1064
-- =====================================================

-- Step 1: Delete Payments first
DELETE FROM uv_payments 
WHERE lead_id = (
    SELECT lead_id FROM vehicle_reservations WHERE customer_number = 'CIN-1064'
);

-- Step 2: Delete the Reservation/Invoice
DELETE FROM vehicle_reservations 
WHERE customer_number = 'CIN-1064';

-- Verify deletion
SELECT 'Done! Remaining for CIN-1064:' as status, COUNT(*) as count
FROM vehicle_reservations WHERE customer_number = 'CIN-1064';
