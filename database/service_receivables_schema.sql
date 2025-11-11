-- =====================================================
-- SERVICE RECEIVABLES SYSTEM
-- Tracks accounts receivable for service advisors
-- =====================================================

-- Main receivables table
CREATE TABLE IF NOT EXISTS service_receivables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Service Advisor Info
  advisor_name TEXT NOT NULL, -- e.g., "DANIEL", "ESSRAR", "LUCY"
  advisor_id UUID, -- Can reference auth.users(id) if needed
  
  -- Customer Info
  customer_id TEXT NOT NULL, -- e.g., "34673"
  customer_name TEXT NOT NULL, -- e.g., "EMAD AMIN"
  
  -- Transaction Details
  transaction_date DATE NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('INVOICE', 'RECEIPT', 'CREDIT')),
  reference_number TEXT NOT NULL, -- e.g., "INV#39028", "Receipt#1896"
  
  -- Amounts
  invoice_amount DECIMAL(12,2) DEFAULT 0,
  receipt_amount DECIMAL(12,2) DEFAULT 0,
  balance DECIMAL(12,2) NOT NULL DEFAULT 0,
  
  -- Aging
  age_days INTEGER NOT NULL DEFAULT 0,
  aging_bucket TEXT GENERATED ALWAYS AS (
    CASE 
      WHEN age_days BETWEEN 0 AND 30 THEN '0-30'
      WHEN age_days BETWEEN 31 AND 60 THEN '31-60'
      WHEN age_days BETWEEN 61 AND 90 THEN '61-90'
      ELSE '91+'
    END
  ) STORED,
  
  -- Metadata
  import_batch_id UUID, -- Track which upload this came from
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID -- Can reference auth.users(id) if needed
);

-- Import tracking table
CREATE TABLE IF NOT EXISTS service_receivables_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename TEXT NOT NULL,
  report_date DATE NOT NULL, -- The "AS OF" date from the report
  uploaded_by UUID, -- Can reference auth.users(id) if needed
  record_count INTEGER DEFAULT 0,
  status TEXT CHECK (status IN ('processing', 'completed', 'failed')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_service_receivables_advisor ON service_receivables(advisor_name);
CREATE INDEX IF NOT EXISTS idx_service_receivables_customer ON service_receivables(customer_id);
CREATE INDEX IF NOT EXISTS idx_service_receivables_date ON service_receivables(transaction_date);
CREATE INDEX IF NOT EXISTS idx_service_receivables_aging ON service_receivables(aging_bucket);
CREATE INDEX IF NOT EXISTS idx_service_receivables_balance ON service_receivables(balance) WHERE balance > 0;
CREATE INDEX IF NOT EXISTS idx_service_receivables_batch ON service_receivables(import_batch_id);

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_service_receivables_advisor_customer 
ON service_receivables(advisor_name, customer_id, transaction_date DESC);

-- RLS Policies
ALTER TABLE service_receivables ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_receivables_imports ENABLE ROW LEVEL SECURITY;

-- Simple policies - Allow authenticated users to access
-- You can customize these based on your actual auth/role system
CREATE POLICY "Authenticated users can view receivables"
ON service_receivables FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert receivables"
ON service_receivables FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update receivables"
ON service_receivables FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete receivables"
ON service_receivables FOR DELETE
TO authenticated
USING (true);

-- Import tracking policies
CREATE POLICY "Authenticated users can view imports"
ON service_receivables_imports FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can create imports"
ON service_receivables_imports FOR INSERT
TO authenticated
WITH CHECK (true);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_service_receivables_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER service_receivables_updated_at
BEFORE UPDATE ON service_receivables
FOR EACH ROW
EXECUTE FUNCTION update_service_receivables_timestamp();

-- View for easy querying of receivables summary
-- Uses DISTINCT ON to get only the latest (final) balance per customer
CREATE OR REPLACE VIEW service_receivables_summary AS
WITH latest_balances AS (
  SELECT DISTINCT ON (advisor_name, customer_id)
    advisor_name,
    customer_id,
    customer_name,
    balance,
    aging_bucket,
    age_days,
    transaction_date
  FROM service_receivables
  ORDER BY advisor_name, customer_id, transaction_date DESC
)
SELECT 
  advisor_name,
  customer_id,
  customer_name,
  1 as transaction_count,
  balance as total_balance,
  CASE WHEN aging_bucket = '0-30' THEN balance ELSE 0 END as balance_0_30,
  CASE WHEN aging_bucket = '31-60' THEN balance ELSE 0 END as balance_31_60,
  CASE WHEN aging_bucket = '61-90' THEN balance ELSE 0 END as balance_61_90,
  CASE WHEN aging_bucket = '91+' THEN balance ELSE 0 END as balance_91_plus,
  age_days as oldest_transaction_days,
  transaction_date as latest_transaction_date
FROM latest_balances
WHERE balance > 0;

COMMENT ON TABLE service_receivables IS 'Stores accounts receivable transactions for service advisors';
COMMENT ON TABLE service_receivables_imports IS 'Tracks Excel file imports for receivables';
COMMENT ON VIEW service_receivables_summary IS 'Summarized view of receivables by advisor and customer';

