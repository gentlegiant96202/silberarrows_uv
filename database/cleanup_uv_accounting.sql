-- =====================================================
-- CLEANUP UV ACCOUNTING SYSTEM - DROP ALL OBJECTS
-- =====================================================
-- Run this in Supabase SQL Editor to remove all UV accounting tables
-- =====================================================

-- Drop views first (they depend on tables)
DROP VIEW IF EXISTS uv_deal_summary CASCADE;
DROP VIEW IF EXISTS uv_invoice_summary CASCADE;
DROP VIEW IF EXISTS uv_unallocated_payments CASCADE;

-- Drop triggers
DROP TRIGGER IF EXISTS check_void_on_credit_note ON uv_transactions;
DROP TRIGGER IF EXISTS update_uv_deals_updated_at ON uv_deals;
DROP TRIGGER IF EXISTS update_uv_charges_updated_at ON uv_charges;
DROP TRIGGER IF EXISTS update_uv_finance_updated_at ON uv_finance_applications;
DROP TRIGGER IF EXISTS update_deal_status_on_charge ON uv_charges;

-- Drop functions
DROP FUNCTION IF EXISTS get_next_uv_document_number(TEXT);
DROP FUNCTION IF EXISTS create_uv_deal(UUID, TEXT, TEXT, UUID, UUID);
DROP FUNCTION IF EXISTS add_uv_transaction(UUID, TEXT, DECIMAL, TEXT, TEXT, TEXT, UUID);
DROP FUNCTION IF EXISTS calculate_uv_deal_balance(UUID);
DROP FUNCTION IF EXISTS update_uv_deal_status(UUID);
DROP FUNCTION IF EXISTS update_uv_updated_at();
DROP FUNCTION IF EXISTS trigger_update_deal_status_on_charge();
DROP FUNCTION IF EXISTS create_uv_invoice(UUID, TEXT);
DROP FUNCTION IF EXISTS void_uv_invoice(UUID, UUID);
DROP FUNCTION IF EXISTS allocate_uv_payment(UUID, UUID);
DROP FUNCTION IF EXISTS unallocate_uv_payment(UUID);
DROP FUNCTION IF EXISTS check_and_void_invoice_if_needed(UUID);
DROP FUNCTION IF EXISTS trigger_check_void_on_credit_note();

-- Drop tables (order matters due to foreign keys)
DROP TABLE IF EXISTS uv_finance_documents CASCADE;
DROP TABLE IF EXISTS uv_finance_applications CASCADE;
DROP TABLE IF EXISTS uv_transactions CASCADE;
DROP TABLE IF EXISTS uv_charges CASCADE;
DROP TABLE IF EXISTS uv_invoices CASCADE;
DROP TABLE IF EXISTS uv_deals CASCADE;
DROP TABLE IF EXISTS uv_document_sequences CASCADE;

-- Confirm cleanup
SELECT 'UV Accounting tables dropped successfully' AS status;



