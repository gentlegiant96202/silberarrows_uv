-- =====================================================
-- ADD PAYMENT METHOD TO SALES ORDERS
-- =====================================================
-- Allows tracking whether customer will pay via
-- Bank Finance or Cash (upfront selection)
-- =====================================================

-- 1. Create ENUM for payment method options
DO $$ BEGIN
    CREATE TYPE uv_payment_method_type AS ENUM (
        'cash',           -- Full cash payment
        'bank_finance'    -- Bank financing
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Add payment method column to sales orders
ALTER TABLE uv_sales_orders 
ADD COLUMN IF NOT EXISTS payment_method uv_payment_method_type DEFAULT 'cash';

-- 3. Add comment
COMMENT ON COLUMN uv_sales_orders.payment_method IS 'Primary payment method: cash or bank_finance';

-- 4. Verify
SELECT 'Payment method column added to uv_sales_orders' AS status;

