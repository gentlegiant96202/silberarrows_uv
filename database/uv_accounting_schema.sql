-- =====================================================
-- UV CRM ACCOUNTING SYSTEM
-- =====================================================
-- Full accounting for Used Vehicle sales with:
-- - Charges (line items)
-- - Payments (cash, bank, cheque, part exchange)
-- - SOA (Statement of Account)
-- =====================================================

-- 1. ENUMS
-- =====================================================
DO $$ BEGIN
    CREATE TYPE uv_charge_type_enum AS ENUM (
        'vehicle_sale',      -- Base vehicle price
        'extended_warranty', -- Extended warranty add-on
        'ceramic_treatment', -- Ceramic treatment add-on
        'service_care',      -- Service care package
        'window_tints',      -- Window tinting
        'rta_fees',          -- RTA registration fees
        'other_addon',       -- Other add-ons
        'discount',          -- Discount (negative)
        'part_exchange',     -- Part exchange value (negative/credit)
        'credit_note'        -- Credit note adjustment
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE uv_payment_method_enum AS ENUM (
        'cash',
        'bank_transfer',
        'cheque',
        'credit_card',
        'part_exchange',
        'finance'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE uv_payment_status_enum AS ENUM (
        'received',
        'allocated',
        'partially_allocated',
        'refunded',
        'bounced'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. UV CHARGES TABLE
-- =====================================================
-- Each invoice line item is a charge
CREATE TABLE IF NOT EXISTS uv_charges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Link to reservation/invoice
    reservation_id UUID NOT NULL REFERENCES vehicle_reservations(id) ON DELETE CASCADE,
    
    -- Charge details
    charge_type uv_charge_type_enum NOT NULL,
    description TEXT NOT NULL,
    quantity NUMERIC DEFAULT 1,
    unit_price NUMERIC NOT NULL,
    total_amount NUMERIC GENERATED ALWAYS AS (quantity * unit_price) STORED,
    
    -- VAT handling
    vat_applicable BOOLEAN DEFAULT false,
    vat_rate NUMERIC DEFAULT 0.05,
    vat_amount NUMERIC GENERATED ALWAYS AS (
        CASE WHEN vat_applicable THEN ROUND(quantity * unit_price * vat_rate, 2) ELSE 0 END
    ) STORED,
    
    -- Sort order for display
    display_order INTEGER DEFAULT 0,
    
    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- 3. UV PAYMENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS uv_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Link to customer/lead
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    
    -- Payment details
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    payment_method uv_payment_method_enum NOT NULL,
    reference_number TEXT, -- Cheque #, transfer ref, etc.
    
    -- Amount
    amount NUMERIC NOT NULL CHECK (amount > 0),
    
    -- Allocation tracking
    allocated_amount NUMERIC DEFAULT 0,
    unallocated_amount NUMERIC GENERATED ALWAYS AS (amount - allocated_amount) STORED,
    
    -- Status
    status uv_payment_status_enum NOT NULL DEFAULT 'received',
    
    -- Bank details (for cheques)
    bank_name TEXT,
    cheque_number TEXT,
    cheque_date DATE,
    
    -- Part exchange details (if applicable)
    part_exchange_vehicle TEXT,
    part_exchange_chassis TEXT,
    
    -- Notes
    notes TEXT,
    
    -- Receipt
    receipt_number TEXT UNIQUE,
    receipt_pdf_url TEXT,
    
    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- 4. UV PAYMENT ALLOCATIONS TABLE
-- =====================================================
-- Links payments to specific invoices/reservations
CREATE TABLE IF NOT EXISTS uv_payment_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    payment_id UUID NOT NULL REFERENCES uv_payments(id) ON DELETE CASCADE,
    reservation_id UUID NOT NULL REFERENCES vehicle_reservations(id) ON DELETE CASCADE,
    
    -- Amount allocated to this invoice
    allocated_amount NUMERIC NOT NULL CHECK (allocated_amount > 0),
    allocation_date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Notes
    notes TEXT,
    
    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    
    -- Prevent duplicate allocations
    UNIQUE(payment_id, reservation_id)
);

-- 5. RECEIPT SEQUENCE
-- =====================================================
CREATE SEQUENCE IF NOT EXISTS uv_receipt_sequence
    START WITH 1000
    INCREMENT BY 1
    NO MAXVALUE
    NO CYCLE;

-- 6. INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_uv_charges_reservation ON uv_charges(reservation_id);
CREATE INDEX IF NOT EXISTS idx_uv_charges_type ON uv_charges(charge_type);
CREATE INDEX IF NOT EXISTS idx_uv_payments_lead ON uv_payments(lead_id);
CREATE INDEX IF NOT EXISTS idx_uv_payments_date ON uv_payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_uv_payments_status ON uv_payments(status);
CREATE INDEX IF NOT EXISTS idx_uv_allocations_payment ON uv_payment_allocations(payment_id);
CREATE INDEX IF NOT EXISTS idx_uv_allocations_reservation ON uv_payment_allocations(reservation_id);

-- 7. VIEWS
-- =====================================================

-- Invoice Summary View (with charges and payments)
CREATE OR REPLACE VIEW uv_invoice_summary AS
SELECT 
    vr.id AS reservation_id,
    vr.lead_id,
    vr.document_type,
    vr.document_number,
    vr.customer_name,
    vr.vehicle_make_model,
    vr.document_date,
    vr.invoice_total AS legacy_total,
    
    -- Charges breakdown
    COALESCE(charges.total_charges, 0) AS total_charges,
    COALESCE(charges.total_vat, 0) AS total_vat,
    COALESCE(charges.total_charges, 0) + COALESCE(charges.total_vat, 0) AS grand_total,
    
    -- Payments
    COALESCE(payments.total_paid, 0) AS total_paid,
    
    -- Balance
    (COALESCE(charges.total_charges, 0) + COALESCE(charges.total_vat, 0)) - COALESCE(payments.total_paid, 0) AS balance_due,
    
    -- Status
    CASE 
        WHEN COALESCE(payments.total_paid, 0) >= (COALESCE(charges.total_charges, 0) + COALESCE(charges.total_vat, 0)) THEN 'paid'
        WHEN COALESCE(payments.total_paid, 0) > 0 THEN 'partial'
        ELSE 'unpaid'
    END AS payment_status
    
FROM vehicle_reservations vr
LEFT JOIN (
    SELECT 
        reservation_id,
        SUM(total_amount) AS total_charges,
        SUM(vat_amount) AS total_vat
    FROM uv_charges
    GROUP BY reservation_id
) charges ON vr.id = charges.reservation_id
LEFT JOIN (
    SELECT 
        reservation_id,
        SUM(allocated_amount) AS total_paid
    FROM uv_payment_allocations
    GROUP BY reservation_id
) payments ON vr.id = payments.reservation_id;

-- Customer Balance View (SOA)
CREATE OR REPLACE VIEW uv_customer_balances AS
SELECT 
    l.id AS lead_id,
    l.full_name AS customer_name,
    l.phone_number,
    
    -- Total invoiced
    COALESCE(SUM(inv.grand_total), 0) AS total_invoiced,
    
    -- Total paid
    COALESCE(SUM(inv.total_paid), 0) AS total_paid,
    
    -- Outstanding balance
    COALESCE(SUM(inv.balance_due), 0) AS outstanding_balance,
    
    -- Invoice counts
    COUNT(CASE WHEN inv.payment_status = 'unpaid' THEN 1 END) AS unpaid_invoices,
    COUNT(CASE WHEN inv.payment_status = 'partial' THEN 1 END) AS partial_invoices,
    COUNT(CASE WHEN inv.payment_status = 'paid' THEN 1 END) AS paid_invoices,
    
    -- Last activity
    MAX(inv.document_date) AS last_invoice_date
    
FROM leads l
LEFT JOIN uv_invoice_summary inv ON l.id = inv.lead_id
WHERE inv.document_type = 'invoice'
GROUP BY l.id, l.full_name, l.phone_number
HAVING COALESCE(SUM(inv.grand_total), 0) > 0;

-- 8. FUNCTIONS
-- =====================================================

-- Generate next receipt number
CREATE OR REPLACE FUNCTION uv_generate_receipt_number()
RETURNS TEXT AS $$
DECLARE
    v_next INTEGER;
BEGIN
    v_next := nextval('uv_receipt_sequence');
    RETURN 'RCP-UV-' || LPAD(v_next::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- Record a payment
CREATE OR REPLACE FUNCTION uv_record_payment(
    p_lead_id UUID,
    p_amount NUMERIC,
    p_payment_method uv_payment_method_enum,
    p_reference TEXT DEFAULT NULL,
    p_notes TEXT DEFAULT NULL,
    p_bank_name TEXT DEFAULT NULL,
    p_cheque_number TEXT DEFAULT NULL,
    p_cheque_date DATE DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_payment_id UUID;
    v_receipt_number TEXT;
BEGIN
    -- Generate receipt number
    v_receipt_number := uv_generate_receipt_number();
    
    -- Insert payment
    INSERT INTO uv_payments (
        lead_id, amount, payment_method, reference_number,
        notes, bank_name, cheque_number, cheque_date,
        receipt_number, created_by
    ) VALUES (
        p_lead_id, p_amount, p_payment_method, p_reference,
        p_notes, p_bank_name, p_cheque_number, p_cheque_date,
        v_receipt_number, auth.uid()
    ) RETURNING id INTO v_payment_id;
    
    RETURN v_payment_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Allocate payment to invoice
CREATE OR REPLACE FUNCTION uv_allocate_payment(
    p_payment_id UUID,
    p_reservation_id UUID,
    p_amount NUMERIC
) RETURNS BOOLEAN AS $$
DECLARE
    v_unallocated NUMERIC;
    v_balance_due NUMERIC;
BEGIN
    -- Check unallocated amount
    SELECT unallocated_amount INTO v_unallocated
    FROM uv_payments WHERE id = p_payment_id;
    
    IF v_unallocated < p_amount THEN
        RAISE EXCEPTION 'Insufficient unallocated amount. Available: %, Requested: %', v_unallocated, p_amount;
    END IF;
    
    -- Check invoice balance
    SELECT balance_due INTO v_balance_due
    FROM uv_invoice_summary WHERE reservation_id = p_reservation_id;
    
    IF v_balance_due < p_amount THEN
        RAISE EXCEPTION 'Amount exceeds invoice balance. Balance: %, Requested: %', v_balance_due, p_amount;
    END IF;
    
    -- Create allocation
    INSERT INTO uv_payment_allocations (payment_id, reservation_id, allocated_amount, created_by)
    VALUES (p_payment_id, p_reservation_id, p_amount, auth.uid())
    ON CONFLICT (payment_id, reservation_id) 
    DO UPDATE SET allocated_amount = uv_payment_allocations.allocated_amount + p_amount;
    
    -- Update payment allocated amount
    UPDATE uv_payments 
    SET allocated_amount = allocated_amount + p_amount,
        status = CASE 
            WHEN allocated_amount + p_amount >= amount THEN 'allocated'::uv_payment_status_enum
            ELSE 'partially_allocated'::uv_payment_status_enum
        END,
        updated_at = NOW()
    WHERE id = p_payment_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE uv_charges ENABLE ROW LEVEL SECURITY;
ALTER TABLE uv_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE uv_payment_allocations ENABLE ROW LEVEL SECURITY;

-- Charges policies
CREATE POLICY "Users can view charges" ON uv_charges
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin/Accounts can manage charges" ON uv_charges
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'accounts')
        )
    );

-- Payments policies
CREATE POLICY "Users can view payments" ON uv_payments
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin/Accounts can manage payments" ON uv_payments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'accounts')
        )
    );

-- Allocations policies
CREATE POLICY "Users can view allocations" ON uv_payment_allocations
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin/Accounts can manage allocations" ON uv_payment_allocations
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'accounts')
        )
    );

-- 10. TRIGGERS
-- =====================================================
CREATE OR REPLACE FUNCTION uv_update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_uv_charges_updated ON uv_charges;
CREATE TRIGGER trg_uv_charges_updated
    BEFORE UPDATE ON uv_charges
    FOR EACH ROW EXECUTE FUNCTION uv_update_timestamp();

DROP TRIGGER IF EXISTS trg_uv_payments_updated ON uv_payments;
CREATE TRIGGER trg_uv_payments_updated
    BEFORE UPDATE ON uv_payments
    FOR EACH ROW EXECUTE FUNCTION uv_update_timestamp();

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================
SELECT 'UV Accounting Schema created successfully!' AS result;

