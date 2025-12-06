-- =====================================================
-- UV SALES ACCOUNTING - STEP 2: SALES ORDER LINE ITEMS
-- =====================================================
-- Line items for Sales Orders (quotation line items)
-- These get copied to invoice_lines when converting to invoice
-- =====================================================

-- 1. Create ENUM for line item types
DO $$ BEGIN
    CREATE TYPE uv_line_type AS ENUM (
        'vehicle',
        'extended_warranty_standard',
        'extended_warranty_premium',
        'servicecare_standard',
        'servicecare_premium',
        'ceramic_treatment',
        'window_tints',
        'rta_fees',
        'part_exchange',
        'other'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Create the Sales Order Line Items table
CREATE TABLE IF NOT EXISTS uv_sales_order_lines (
    -- Primary identification
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Link to Sales Order
    sales_order_id UUID NOT NULL REFERENCES uv_sales_orders(id) ON DELETE CASCADE,
    
    -- Line item details
    line_type uv_line_type NOT NULL DEFAULT 'other',
    description TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price NUMERIC(12,2) NOT NULL DEFAULT 0,
    line_total NUMERIC(12,2) NOT NULL DEFAULT 0,
    
    -- Display order
    sort_order INTEGER NOT NULL DEFAULT 0,
    
    -- Audit fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create trigger function for updated_at
CREATE OR REPLACE FUNCTION update_uv_sales_order_lines_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Create trigger for updated_at
DROP TRIGGER IF EXISTS trg_update_uv_sales_order_lines_updated_at ON uv_sales_order_lines;
CREATE TRIGGER trg_update_uv_sales_order_lines_updated_at
    BEFORE UPDATE ON uv_sales_order_lines
    FOR EACH ROW
    EXECUTE FUNCTION update_uv_sales_order_lines_updated_at();

-- 5. Create function to recalculate Sales Order totals when line items change
CREATE OR REPLACE FUNCTION update_sales_order_totals()
RETURNS TRIGGER AS $$
DECLARE
    v_subtotal NUMERIC(12,2);
    v_part_exchange NUMERIC(12,2);
    v_total NUMERIC(12,2);
BEGIN
    -- Calculate subtotal (all items except part_exchange)
    SELECT COALESCE(SUM(line_total), 0)
    INTO v_subtotal
    FROM uv_sales_order_lines
    WHERE sales_order_id = COALESCE(NEW.sales_order_id, OLD.sales_order_id)
    AND line_type != 'part_exchange';
    
    -- Calculate part exchange value (should be negative in DB)
    SELECT COALESCE(ABS(SUM(line_total)), 0)
    INTO v_part_exchange
    FROM uv_sales_order_lines
    WHERE sales_order_id = COALESCE(NEW.sales_order_id, OLD.sales_order_id)
    AND line_type = 'part_exchange';
    
    -- Calculate total
    v_total := v_subtotal - v_part_exchange;
    
    -- Update the Sales Order
    UPDATE uv_sales_orders
    SET subtotal = v_subtotal,
        total_amount = v_total,
        updated_at = NOW()
    WHERE id = COALESCE(NEW.sales_order_id, OLD.sales_order_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- 6. Create triggers to auto-update Sales Order totals
DROP TRIGGER IF EXISTS trg_update_so_totals_insert ON uv_sales_order_lines;
CREATE TRIGGER trg_update_so_totals_insert
    AFTER INSERT ON uv_sales_order_lines
    FOR EACH ROW
    EXECUTE FUNCTION update_sales_order_totals();

DROP TRIGGER IF EXISTS trg_update_so_totals_update ON uv_sales_order_lines;
CREATE TRIGGER trg_update_so_totals_update
    AFTER UPDATE ON uv_sales_order_lines
    FOR EACH ROW
    EXECUTE FUNCTION update_sales_order_totals();

DROP TRIGGER IF EXISTS trg_update_so_totals_delete ON uv_sales_order_lines;
CREATE TRIGGER trg_update_so_totals_delete
    AFTER DELETE ON uv_sales_order_lines
    FOR EACH ROW
    EXECUTE FUNCTION update_sales_order_totals();

-- 7. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_uv_sales_order_lines_sales_order_id ON uv_sales_order_lines(sales_order_id);
CREATE INDEX IF NOT EXISTS idx_uv_sales_order_lines_line_type ON uv_sales_order_lines(line_type);

-- 8. Enable RLS
ALTER TABLE uv_sales_order_lines ENABLE ROW LEVEL SECURITY;

-- 9. Create RLS policies
DROP POLICY IF EXISTS "Users can view sales order lines" ON uv_sales_order_lines;
CREATE POLICY "Users can view sales order lines" ON uv_sales_order_lines
    FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can manage sales order lines" ON uv_sales_order_lines;
CREATE POLICY "Users can manage sales order lines" ON uv_sales_order_lines
    FOR ALL USING (auth.uid() IS NOT NULL);

-- 10. Add comments
COMMENT ON TABLE uv_sales_order_lines IS 'Line items for UV Sales Orders (quotation line items)';
COMMENT ON COLUMN uv_sales_order_lines.line_type IS 'Type of line item: vehicle, warranty, servicecare, etc.';
COMMENT ON COLUMN uv_sales_order_lines.line_total IS 'Calculated total (quantity * unit_price). Negative for part_exchange.';

-- 11. Verify creation
SELECT 'uv_sales_order_lines table created successfully' AS status;

-- Show the enum values
SELECT enumlabel FROM pg_enum 
WHERE enumtypid = 'uv_line_type'::regtype
ORDER BY enumsortorder;

