-- =====================================================
-- CLEANUP SCRIPT FOR CUSTOMER CIN-1073
-- This will delete all accounting data for this customer
-- Run this in Supabase SQL Editor
-- =====================================================

-- First, find the deal/reservation for this customer
-- SELECT * FROM vehicle_reservations WHERE customer_number = 'CIN-1073';

-- Get the deal ID (run this first to confirm)
DO $$
DECLARE
    v_deal_id UUID;
    v_lead_id UUID;
BEGIN
    -- Find the deal
    SELECT id, lead_id INTO v_deal_id, v_lead_id
    FROM vehicle_reservations 
    WHERE customer_number = 'CIN-1073';
    
    IF v_deal_id IS NULL THEN
        RAISE NOTICE 'No deal found for CIN-1073';
        RETURN;
    END IF;
    
    RAISE NOTICE 'Found deal ID: %', v_deal_id;
    RAISE NOTICE 'Lead ID: %', v_lead_id;
    
    -- 1. Delete credit applications (if any)
    DELETE FROM credit_applications 
    WHERE credit_note_id IN (
        SELECT id FROM credit_notes WHERE deal_id = v_deal_id
    );
    RAISE NOTICE 'Deleted credit applications';
    
    -- 2. Delete credit notes
    DELETE FROM credit_notes WHERE deal_id = v_deal_id;
    RAISE NOTICE 'Deleted credit notes';
    
    -- 3. Delete payment allocations
    DELETE FROM uv_payment_allocations WHERE reservation_id = v_deal_id;
    RAISE NOTICE 'Deleted payment allocations';
    
    -- 4. Delete payments for this lead
    DELETE FROM uv_payments WHERE lead_id = v_lead_id;
    RAISE NOTICE 'Deleted payments';
    
    -- 5. Delete charges
    DELETE FROM uv_charges WHERE reservation_id = v_deal_id;
    RAISE NOTICE 'Deleted charges';
    
    -- 6. Delete invoices
    DELETE FROM invoices WHERE deal_id = v_deal_id;
    RAISE NOTICE 'Deleted invoices';
    
    -- 7. Reset the reservation to clean state
    UPDATE vehicle_reservations 
    SET 
        document_status = 'pending',
        credit_balance = 0,
        updated_at = NOW()
    WHERE id = v_deal_id;
    RAISE NOTICE 'Reset reservation to clean state';
    
    RAISE NOTICE '✓ Cleanup complete for CIN-1073';
END $$;

-- Verify cleanup (run these after)
-- SELECT * FROM vehicle_reservations WHERE customer_number = 'CIN-1073';
-- SELECT * FROM invoices WHERE deal_id = (SELECT id FROM vehicle_reservations WHERE customer_number = 'CIN-1073');
-- SELECT * FROM credit_notes WHERE deal_id = (SELECT id FROM vehicle_reservations WHERE customer_number = 'CIN-1073');
-- SELECT * FROM uv_charges WHERE reservation_id = (SELECT id FROM vehicle_reservations WHERE customer_number = 'CIN-1073');
-- SELECT * FROM uv_payments WHERE lead_id = (SELECT lead_id FROM vehicle_reservations WHERE customer_number = 'CIN-1073');

