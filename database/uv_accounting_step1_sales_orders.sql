-- =====================================================
-- UV SALES ACCOUNTING - STEP 1: SALES ORDERS
-- =====================================================
-- Sales Order = Quotation Document + Deal Container
-- No status needed (uses Lead status)
-- =====================================================

-- 1. Create sequence for Sales Order numbers (UV-SO-1001, UV-SO-1002, etc.)
CREATE SEQUENCE IF NOT EXISTS uv_sales_order_seq START WITH 1001;

-- 2. Create the main Sales Orders table
CREATE TABLE IF NOT EXISTS uv_sales_orders (
    -- Primary identification
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number TEXT UNIQUE NOT NULL,  -- UV-SO-1001 (auto-generated)
    
    -- Links to CRM
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    car_id UUID REFERENCES cars(id) ON DELETE SET NULL,
    
    -- Document metadata
    order_date DATE NOT NULL DEFAULT CURRENT_DATE,
    sales_executive TEXT NOT NULL,
    
    -- ===== CUSTOMER DETAILS =====
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    customer_email TEXT,
    customer_id_type TEXT CHECK (customer_id_type IN ('EID', 'Passport')),
    customer_id_number TEXT,
    
    -- ===== VEHICLE DETAILS =====
    vehicle_make_model TEXT NOT NULL,
    model_year INTEGER,
    chassis_no TEXT,
    vehicle_colour TEXT,
    vehicle_mileage INTEGER,
    
    -- ===== MANUFACTURER WARRANTY (from inventory, editable) =====
    has_manufacturer_warranty BOOLEAN DEFAULT FALSE,
    manufacturer_warranty_expiry DATE,
    manufacturer_warranty_km INTEGER,
    
    -- ===== MANUFACTURER SERVICE (from inventory, editable) =====
    has_manufacturer_service BOOLEAN DEFAULT FALSE,
    manufacturer_service_expiry DATE,
    manufacturer_service_km INTEGER,
    
    -- ===== PART EXCHANGE =====
    has_part_exchange BOOLEAN DEFAULT FALSE,
    part_exchange_make_model TEXT,
    part_exchange_year TEXT,
    part_exchange_chassis TEXT,
    part_exchange_mileage INTEGER,
    part_exchange_value NUMERIC(12,2) DEFAULT 0,
    
    -- ===== TOTALS (calculated from line items) =====
    subtotal NUMERIC(12,2) DEFAULT 0,
    total_amount NUMERIC(12,2) DEFAULT 0,
    
    -- ===== DOCUMENT =====
    pdf_url TEXT,
    notes TEXT,
    
    -- ===== AUDIT FIELDS =====
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- 3. Create trigger function to auto-generate order number
CREATE OR REPLACE FUNCTION generate_uv_sales_order_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.order_number IS NULL THEN
        NEW.order_number := 'UV-SO-' || nextval('uv_sales_order_seq');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Create trigger for auto-numbering
DROP TRIGGER IF EXISTS trg_generate_uv_sales_order_number ON uv_sales_orders;
CREATE TRIGGER trg_generate_uv_sales_order_number
    BEFORE INSERT ON uv_sales_orders
    FOR EACH ROW
    EXECUTE FUNCTION generate_uv_sales_order_number();

-- 5. Create trigger function for updated_at
CREATE OR REPLACE FUNCTION update_uv_sales_order_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Create trigger for updated_at
DROP TRIGGER IF EXISTS trg_update_uv_sales_order_updated_at ON uv_sales_orders;
CREATE TRIGGER trg_update_uv_sales_order_updated_at
    BEFORE UPDATE ON uv_sales_orders
    FOR EACH ROW
    EXECUTE FUNCTION update_uv_sales_order_updated_at();

-- 7. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_uv_sales_orders_lead_id ON uv_sales_orders(lead_id);
CREATE INDEX IF NOT EXISTS idx_uv_sales_orders_car_id ON uv_sales_orders(car_id);
CREATE INDEX IF NOT EXISTS idx_uv_sales_orders_order_date ON uv_sales_orders(order_date);
CREATE INDEX IF NOT EXISTS idx_uv_sales_orders_created_at ON uv_sales_orders(created_at);

-- 8. Enable RLS
ALTER TABLE uv_sales_orders ENABLE ROW LEVEL SECURITY;

-- 9. Create RLS policies
DROP POLICY IF EXISTS "Users can view sales orders" ON uv_sales_orders;
CREATE POLICY "Users can view sales orders" ON uv_sales_orders
    FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can manage sales orders" ON uv_sales_orders;
CREATE POLICY "Users can manage sales orders" ON uv_sales_orders
    FOR ALL USING (auth.uid() IS NOT NULL);

-- 10. Add comments
COMMENT ON TABLE uv_sales_orders IS 'UV Sales Orders - Quotation documents that hold deal information';
COMMENT ON COLUMN uv_sales_orders.order_number IS 'Auto-generated: UV-SO-1001, UV-SO-1002, etc.';
COMMENT ON COLUMN uv_sales_orders.lead_id IS 'Links to CRM lead (customer)';
COMMENT ON COLUMN uv_sales_orders.car_id IS 'Links to inventory car';

-- 11. Verify creation
SELECT 'uv_sales_orders table created successfully' AS status;
SELECT 'Next order number will be: UV-SO-' || nextval('uv_sales_order_seq') AS next_number;

-- Reset sequence to not waste the number we just used for testing
SELECT setval('uv_sales_order_seq', 1000, true);

