-- =====================================================
-- STEP 6: Create Credit Notes Table
-- =====================================================
-- Proper accounting: Credit notes cancel invoices
-- Original invoice stays immutable, CN creates credit
-- =====================================================

-- 1. Create credit note status enum
DO $$ 
BEGIN 
  CREATE TYPE credit_note_status_enum AS ENUM ('issued', 'applied', 'voided'); 
EXCEPTION 
  WHEN duplicate_object THEN null; 
END $$;

-- 2. Create credit_notes table
CREATE TABLE IF NOT EXISTS credit_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Credit Note Number (CN-XXXX)
  credit_note_number TEXT UNIQUE,
  
  -- Links
  original_invoice_id UUID NOT NULL REFERENCES invoices(id),
  deal_id UUID NOT NULL REFERENCES vehicle_reservations(id) ON DELETE CASCADE,
  
  -- Amounts (stored as positive, displayed as negative)
  subtotal NUMERIC NOT NULL DEFAULT 0,
  vat_amount NUMERIC NOT NULL DEFAULT 0,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  
  -- Required reason for credit note
  reason TEXT NOT NULL,
  
  -- Status tracking
  status credit_note_status_enum NOT NULL DEFAULT 'issued',
  
  -- How much of this credit has been applied to new invoices
  applied_amount NUMERIC NOT NULL DEFAULT 0,
  remaining_credit NUMERIC GENERATED ALWAYS AS (total_amount - applied_amount) STORED,
  
  -- PDF
  pdf_url TEXT,
  
  -- Timestamps
  credit_note_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- 3. Create sequence for credit note numbers
CREATE SEQUENCE IF NOT EXISTS credit_note_number_seq START 1000;

-- 4. Auto-generate credit note number
CREATE OR REPLACE FUNCTION generate_credit_note_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.credit_note_number IS NULL THEN
    NEW.credit_note_number := 'CN-' || nextval('credit_note_number_seq');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS generate_credit_note_number_trigger ON credit_notes;
CREATE TRIGGER generate_credit_note_number_trigger
  BEFORE INSERT ON credit_notes
  FOR EACH ROW
  EXECUTE FUNCTION generate_credit_note_number();

-- 5. Add credit_balance to vehicle_reservations (deals)
ALTER TABLE vehicle_reservations 
ADD COLUMN IF NOT EXISTS credit_balance NUMERIC DEFAULT 0;

-- 6. Function to update deal credit balance when credit note is issued
CREATE OR REPLACE FUNCTION update_deal_credit_balance()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Add credit to deal
    UPDATE vehicle_reservations 
    SET credit_balance = credit_balance + NEW.total_amount
    WHERE id = NEW.deal_id;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Adjust for changes in applied_amount
    IF NEW.applied_amount != OLD.applied_amount THEN
      UPDATE vehicle_reservations 
      SET credit_balance = credit_balance - (NEW.applied_amount - OLD.applied_amount)
      WHERE id = NEW.deal_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    -- Remove credit (rare - voiding a credit note)
    UPDATE vehicle_reservations 
    SET credit_balance = credit_balance - OLD.remaining_credit
    WHERE id = OLD.deal_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_deal_credit_balance_trigger ON credit_notes;
CREATE TRIGGER update_deal_credit_balance_trigger
  AFTER INSERT OR UPDATE OR DELETE ON credit_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_deal_credit_balance();

-- 7. Add credited_by_cn field to invoices (which CN credited this invoice)
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS credited_by_credit_note_id UUID REFERENCES credit_notes(id);

-- 8. When invoice is credited, update its status
CREATE OR REPLACE FUNCTION mark_invoice_as_credited()
RETURNS TRIGGER AS $$
BEGIN
  -- Mark the original invoice as credited (not reversed - credited is more accurate)
  UPDATE invoices 
  SET 
    status = 'reversed',  -- Keep using 'reversed' status but now it means "credited"
    credited_by_credit_note_id = NEW.id,
    updated_at = NOW()
  WHERE id = NEW.original_invoice_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS mark_invoice_as_credited_trigger ON credit_notes;
CREATE TRIGGER mark_invoice_as_credited_trigger
  AFTER INSERT ON credit_notes
  FOR EACH ROW
  EXECUTE FUNCTION mark_invoice_as_credited();

-- 9. Table to track credit applications to invoices
CREATE TABLE IF NOT EXISTS credit_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credit_note_id UUID NOT NULL REFERENCES credit_notes(id),
  applied_to_invoice_id UUID NOT NULL REFERENCES invoices(id),
  amount NUMERIC NOT NULL,
  applied_at TIMESTAMPTZ DEFAULT NOW(),
  applied_by UUID REFERENCES auth.users(id)
);

-- 10. Function to update credit note applied_amount when credit is applied
CREATE OR REPLACE FUNCTION update_credit_note_applied_amount()
RETURNS TRIGGER AS $$
DECLARE
  v_total_applied NUMERIC;
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    -- Calculate total applied from this credit note
    SELECT COALESCE(SUM(amount), 0) INTO v_total_applied
    FROM credit_applications
    WHERE credit_note_id = NEW.credit_note_id;
    
    -- Update credit note
    UPDATE credit_notes
    SET 
      applied_amount = v_total_applied,
      status = CASE 
        WHEN v_total_applied >= total_amount THEN 'applied'::credit_note_status_enum
        ELSE 'issued'::credit_note_status_enum
      END,
      updated_at = NOW()
    WHERE id = NEW.credit_note_id;
    
    -- Update invoice paid_amount
    UPDATE invoices
    SET paid_amount = paid_amount + NEW.amount
    WHERE id = NEW.applied_to_invoice_id;
    
  ELSIF TG_OP = 'DELETE' THEN SELECT "DELETE" AS opertion editor,ELSIF, DELETE AS operation.
    -- Recalculate
    SELECT COALESCE(SUM(amount), 0) INTO v_total_applied
    FROM credit_applications
    WHERE credit_note_id = OLD.credit_note_id;
    
    UPDATE credit_notes
    SET 
      applied_amount = v_total_applied,
      status = CASE 
        WHEN v_total_applied >= total_amount THEN 'applied'::credit_note_status_enum
        ELSE 'issued'::credit_note_status_enum
      END,
      updated_at = NOW()
    WHERE id = OLD.credit_note_id;
    
    -- Reduce invoice paid_amount
    UPDATE invoices
    SET paid_amount = paid_amount - OLD.amount
    WHERE id = OLD.applied_to_invoice_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_credit_note_applied_trigger ON credit_applications;
CREATE TRIGGER update_credit_note_applied_trigger
  AFTER INSERT OR UPDATE OR DELETE ON credit_applications
  FOR EACH ROW
  EXECUTE FUNCTION update_credit_note_applied_amount();

-- 11. Create indexes
CREATE INDEX IF NOT EXISTS idx_credit_notes_deal_id ON credit_notes(deal_id);
CREATE INDEX IF NOT EXISTS idx_credit_notes_original_invoice_id ON credit_notes(original_invoice_id);
CREATE INDEX IF NOT EXISTS idx_credit_notes_status ON credit_notes(status);
CREATE INDEX IF NOT EXISTS idx_credit_applications_credit_note_id ON credit_applications(credit_note_id);
CREATE INDEX IF NOT EXISTS idx_credit_applications_invoice_id ON credit_applications(applied_to_invoice_id);

-- 12. RLS Policies
ALTER TABLE credit_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_applications ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read credit notes
DROP POLICY IF EXISTS "Allow authenticated read credit_notes" ON credit_notes;
CREATE POLICY "Allow authenticated read credit_notes" ON credit_notes
  FOR SELECT TO authenticated USING (true);

-- Allow authenticated users to insert credit notes
DROP POLICY IF EXISTS "Allow authenticated insert credit_notes" ON credit_notes;
CREATE POLICY "Allow authenticated insert credit_notes" ON credit_notes
  FOR INSERT TO authenticated WITH CHECK (true);

-- Allow authenticated users to update credit notes
DROP POLICY IF EXISTS "Allow authenticated update credit_notes" ON credit_notes;
CREATE POLICY "Allow authenticated update credit_notes" ON credit_notes
  FOR UPDATE TO authenticated USING (true);

-- Credit applications policies
DROP POLICY IF EXISTS "Allow authenticated read credit_applications" ON credit_applications;
CREATE POLICY "Allow authenticated read credit_applications" ON credit_applications
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated insert credit_applications" ON credit_applications;
CREATE POLICY "Allow authenticated insert credit_applications" ON credit_applications
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated delete credit_applications" ON credit_applications;
CREATE POLICY "Allow authenticated delete credit_applications" ON credit_applications
  FOR DELETE TO authenticated USING (true);

-- 13. Verify structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'credit_notes'
ORDER BY ordinal_position;

-- Summary
DO $$
BEGIN
  RAISE NOTICE '✓ credit_notes table created';
  RAISE NOTICE '✓ CN-XXXX auto-numbering set up';
  RAISE NOTICE '✓ credit_balance added to vehicle_reservations';
  RAISE NOTICE '✓ credit_applications table created for tracking';
  RAISE NOTICE '✓ Triggers set up for automatic balance updates';
  RAISE NOTICE '✓ RLS policies enabled';
END $$;

