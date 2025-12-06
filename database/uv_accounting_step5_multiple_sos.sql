-- =====================================================
-- UV SALES ACCOUNTING - STEP 5: MULTIPLE SOs PER LEAD
-- =====================================================
-- Allows multiple Sales Orders per customer (lead)
-- Adds status tracking to Sales Orders
-- =====================================================

-- 1. Create ENUM for Sales Order status
DO $$ BEGIN
    CREATE TYPE uv_sales_order_status AS ENUM (
        'draft',      -- Sales Order created, work in progress
        'invoiced',   -- Has been converted to invoice
        'lost'        -- Deal fell through / cancelled
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Add status column to sales orders
ALTER TABLE uv_sales_orders 
ADD COLUMN IF NOT EXISTS status uv_sales_order_status DEFAULT 'draft';

-- 3. Update existing SOs that have invoices to 'invoiced' status
UPDATE uv_sales_orders so
SET status = 'invoiced'
WHERE EXISTS (
    SELECT 1 FROM uv_invoices inv 
    WHERE inv.sales_order_id = so.id 
    AND inv.status != 'reversed'
);

-- 4. Create function to auto-update SO status when invoice is created
CREATE OR REPLACE FUNCTION update_so_status_on_invoice()
RETURNS TRIGGER AS $$
BEGIN
    -- When invoice is created, mark SO as invoiced
    IF TG_OP = 'INSERT' THEN
        UPDATE uv_sales_orders
        SET status = 'invoiced', updated_at = NOW()
        WHERE id = NEW.sales_order_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_so_status_on_invoice ON uv_invoices;
CREATE TRIGGER trg_update_so_status_on_invoice
    AFTER INSERT ON uv_invoices
    FOR EACH ROW
    EXECUTE FUNCTION update_so_status_on_invoice();

-- 5. Create function to mark SO as lost when invoice is reversed
CREATE OR REPLACE FUNCTION update_so_status_on_invoice_reversal()
RETURNS TRIGGER AS $$
BEGIN
    -- When invoice is reversed, check if SO has any other active invoices
    IF NEW.status = 'reversed' AND OLD.status != 'reversed' THEN
        -- If no other active invoices exist, mark SO as draft (can be re-used)
        IF NOT EXISTS (
            SELECT 1 FROM uv_invoices 
            WHERE sales_order_id = NEW.sales_order_id 
            AND id != NEW.id 
            AND status != 'reversed'
        ) THEN
            UPDATE uv_sales_orders
            SET status = 'draft', updated_at = NOW()
            WHERE id = NEW.sales_order_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_so_status_on_reversal ON uv_invoices;
CREATE TRIGGER trg_update_so_status_on_reversal
    AFTER UPDATE ON uv_invoices
    FOR EACH ROW
    WHEN (NEW.status = 'reversed' AND OLD.status IS DISTINCT FROM 'reversed')
    EXECUTE FUNCTION update_so_status_on_invoice_reversal();

-- 6. Add index for status queries
CREATE INDEX IF NOT EXISTS idx_uv_sales_orders_status ON uv_sales_orders(status);

-- 7. Add comment
COMMENT ON COLUMN uv_sales_orders.status IS 'Sales Order status: draft (work in progress), invoiced (has active invoice), lost (cancelled)';

-- 8. Verify
SELECT 'Sales Order status column added successfully' AS status;

-- Show current SO statuses
SELECT 
    order_number,
    status,
    created_at
FROM uv_sales_orders
ORDER BY created_at DESC
LIMIT 10;

