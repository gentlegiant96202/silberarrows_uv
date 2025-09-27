-- CRITICAL FIXES FOR PRODUCTION READINESS
-- Run these immediately before going live

-- 1. ADD PROPER CONSTRAINTS BACK
ALTER TABLE lease_accounting 
ADD CONSTRAINT valid_total_amount CHECK (
  (charge_type = 'refund' AND total_amount <= 0) OR 
  (charge_type != 'refund' AND total_amount >= 0)
);

-- 2. ADD AUDIT TRAIL COLUMNS
ALTER TABLE lease_accounting 
ADD COLUMN created_by UUID REFERENCES auth.users(id),
ADD COLUMN updated_by UUID REFERENCES auth.users(id),
ADD COLUMN version INTEGER DEFAULT 1;

-- 3. ADD COMPOSITE INDEXES FOR PERFORMANCE
CREATE INDEX CONCURRENTLY idx_lease_accounting_composite 
ON lease_accounting(lease_id, billing_period, status);

CREATE INDEX CONCURRENTLY idx_lease_accounting_invoice_lookup 
ON lease_accounting(invoice_id, status) WHERE invoice_id IS NOT NULL;

-- 4. ADD PROPER CREDIT NOTE ENUM
ALTER TYPE charge_type_enum ADD VALUE IF NOT EXISTS 'credit_note';

-- 5. CREATE TRANSACTION-SAFE FUNCTIONS
CREATE OR REPLACE FUNCTION generate_invoice_transaction(
  p_lease_id UUID,
  p_billing_period DATE,
  p_charge_ids UUID[]
) RETURNS UUID AS $$
DECLARE
  v_invoice_id UUID;
BEGIN
  -- Generate invoice ID
  v_invoice_id := gen_random_uuid();
  
  -- Update all charges atomically
  UPDATE lease_accounting 
  SET invoice_id = v_invoice_id,
      status = 'invoiced',
      updated_at = NOW()
  WHERE id = ANY(p_charge_ids)
    AND lease_id = p_lease_id
    AND billing_period = p_billing_period
    AND status = 'pending';
    
  -- Verify all charges were updated
  IF (SELECT COUNT(*) FROM lease_accounting WHERE id = ANY(p_charge_ids) AND invoice_id = v_invoice_id) != array_length(p_charge_ids, 1) THEN
    RAISE EXCEPTION 'Failed to update all charges for invoice generation';
  END IF;
  
  RETURN v_invoice_id;
END;
$$ LANGUAGE plpgsql;

-- 6. CREATE PAYMENT ALLOCATION FUNCTION
CREATE OR REPLACE FUNCTION allocate_payment_transaction(
  p_lease_id UUID,
  p_payment_amount NUMERIC,
  p_payment_method TEXT,
  p_payment_reference TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_payment_id UUID;
  v_remaining_amount NUMERIC;
  invoice_record RECORD;
BEGIN
  v_payment_id := gen_random_uuid();
  v_remaining_amount := p_payment_amount;
  
  -- Create payment record
  INSERT INTO lease_accounting (
    lease_id, billing_period, charge_type, total_amount,
    comment, payment_id, status, vat_applicable
  ) VALUES (
    p_lease_id, CURRENT_DATE, 'rental', -p_payment_amount,
    format('PAYMENT %s - %s%s', 
           substring(v_payment_id::text from 1 for 8),
           upper(replace(p_payment_method, '_', ' ')),
           CASE WHEN p_payment_reference IS NOT NULL THEN format(' (Ref: %s)', p_payment_reference) ELSE '' END
    ),
    v_payment_id, 'paid', false
  );
  
  -- Allocate to invoices (oldest first)
  FOR invoice_record IN 
    SELECT invoice_id, SUM(total_amount) as invoice_total
    FROM lease_accounting 
    WHERE lease_id = p_lease_id 
      AND status = 'invoiced' 
      AND invoice_id IS NOT NULL
    GROUP BY invoice_id
    ORDER BY MIN(created_at)
  LOOP
    IF v_remaining_amount <= 0 THEN EXIT; END IF;
    
    IF v_remaining_amount >= invoice_record.invoice_total THEN
      -- Full payment of invoice
      UPDATE lease_accounting 
      SET status = 'paid', payment_id = v_payment_id
      WHERE invoice_id = invoice_record.invoice_id;
      
      v_remaining_amount := v_remaining_amount - invoice_record.invoice_total;
    ELSE
      -- Partial payment - mark as partial
      UPDATE lease_accounting 
      SET payment_id = v_payment_id
      WHERE invoice_id = invoice_record.invoice_id;
      
      v_remaining_amount := 0;
    END IF;
  END LOOP;
  
  RETURN v_payment_id;
END;
$$ LANGUAGE plpgsql;

-- 7. ADD PROPER RLS POLICIES
DROP POLICY IF EXISTS "Users can manage lease accounting for their organization" ON lease_accounting;

CREATE POLICY "Users can view lease accounting" ON lease_accounting
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Accounts users can manage lease accounting" ON lease_accounting
  FOR ALL USING (
    auth.uid() IS NOT NULL AND (
      EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = auth.uid() 
        AND role IN ('admin', 'accounts')
      )
    )
  );
