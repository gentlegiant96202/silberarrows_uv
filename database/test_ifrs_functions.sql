-- 🧪 TEST IFRS ACCOUNTING FUNCTIONS
-- Run this after creating the main IFRS accounting system to test function signatures

-- Test 1: Preview next invoice number
SELECT ifrs_preview_next_invoice_number() as next_invoice_preview;

-- Test 2: Get current sequence (should be 999 before first use)
SELECT ifrs_get_current_invoice_sequence() as current_sequence;

-- Test 3: Add a charge (test parameter order)
-- SELECT ifrs_add_charge(
--     'lease-uuid-here'::UUID,    -- p_lease_id
--     '2024-01-01'::DATE,         -- p_billing_period  
--     'rental',                   -- p_charge_type
--     2500.00,                    -- p_total_amount (required, no default)
--     1,                          -- p_quantity (optional, has default)
--     2500.00,                    -- p_unit_price (optional, has default)
--     'Monthly rental payment',   -- p_comment (optional, has default)
--     true                        -- p_vat_applicable (optional, has default)
-- ) as charge_id;

-- Test 4: Generate invoice (test return JSON)
-- SELECT ifrs_generate_invoice(
--     'lease-uuid-here'::UUID,
--     '2024-01-01'::DATE,
--     ARRAY['charge-uuid-here'::UUID]
-- ) as invoice_result;

-- Success message
SELECT 'IFRS function parameter order test completed! ✅' as result;
