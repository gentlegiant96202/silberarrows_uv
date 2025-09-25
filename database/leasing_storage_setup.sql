-- =====================================================
-- LEASING MODULE STORAGE SETUP
-- =====================================================
-- This creates the storage buckets needed for the leasing module
-- Run this in Supabase Dashboard -> SQL Editor

-- =====================================================
-- CREATE STORAGE BUCKETS
-- =====================================================

-- Create leasing-payments bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'leasing-payments',
  'leasing-payments',
  true, -- Public bucket for easy access to receipts/invoices
  10485760, -- 10MB limit
  ARRAY['application/pdf', 'image/png', 'image/jpeg', 'image/jpg']::text[]
)
ON CONFLICT (id) DO UPDATE
SET 
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['application/pdf', 'image/png', 'image/jpeg', 'image/jpg']::text[];

-- =====================================================
-- STORAGE POLICIES FOR LEASING-PAYMENTS BUCKET
-- =====================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Authenticated users can upload leasing payments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update leasing payments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete leasing payments" ON storage.objects;
DROP POLICY IF EXISTS "Public can view leasing payments" ON storage.objects;

-- Policy: Allow authenticated users to upload documents
CREATE POLICY "Authenticated users can upload leasing payments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'leasing-payments' AND
  auth.uid() IS NOT NULL
);

-- Policy: Allow authenticated users to update their documents
CREATE POLICY "Authenticated users can update leasing payments"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'leasing-payments' AND
  auth.uid() IS NOT NULL
);

-- Policy: Allow authenticated users to delete documents
CREATE POLICY "Authenticated users can delete leasing payments"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'leasing-payments' AND
  auth.uid() IS NOT NULL
);

-- Policy: Allow public to view documents (since we store public URLs)
-- You can make this more restrictive if needed
CREATE POLICY "Public can view leasing payments"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'leasing-payments');

-- =====================================================
-- CREATE FOLDER STRUCTURE (OPTIONAL)
-- =====================================================
-- These are virtual folders that will be created when files are uploaded
-- but this documents the expected structure:

-- Expected folder structure:
-- /leasing-payments/
--   /payment-receipts/        -- Payment proof documents
--     /{customer_id}/
--       /{timestamp}.{ext}
--   /lease-invoices/          -- Generated lease invoices
--     /INV-L-{number}.pdf
--   /lease-contracts/         -- Signed lease agreements
--     /{customer_id}/
--       /contract-{date}.pdf
--   /vehicle-documents/       -- Vehicle related documents
--     /{vehicle_id}/
--       /registration.pdf
--       /insurance.pdf
--   /salik-statements/        -- Salik toll statements
--     /{year-month}/
--       /statement.pdf
--   /traffic-fines/           -- Traffic fine documents
--     /{fine_number}.pdf

-- =====================================================
-- HELPER FUNCTIONS FOR FILE MANAGEMENT
-- =====================================================

-- Function to generate secure file paths
CREATE OR REPLACE FUNCTION generate_lease_document_path(
  doc_type TEXT,
  customer_id UUID,
  file_name TEXT
) RETURNS TEXT AS $$
BEGIN
  RETURN CASE doc_type
    WHEN 'payment_receipt' THEN 
      'payment-receipts/' || customer_id::TEXT || '/' || file_name
    WHEN 'lease_invoice' THEN 
      'lease-invoices/' || file_name
    WHEN 'lease_contract' THEN 
      'lease-contracts/' || customer_id::TEXT || '/' || file_name
    WHEN 'vehicle_document' THEN 
      'vehicle-documents/' || file_name
    WHEN 'salik_statement' THEN 
      'salik-statements/' || file_name
    WHEN 'traffic_fine' THEN 
      'traffic-fines/' || file_name
    ELSE 
      'misc/' || file_name
  END;
END;
$$ LANGUAGE plpgsql;

-- Function to get public URL for a file
CREATE OR REPLACE FUNCTION get_public_document_url(
  file_path TEXT
) RETURNS TEXT AS $$
DECLARE
  base_url TEXT;
BEGIN
  -- Get the Supabase project URL from environment or hardcode it
  -- You'll need to replace this with your actual Supabase URL
  SELECT 
    COALESCE(
      current_setting('app.supabase_url', true),
      'https://your-project.supabase.co'
    ) INTO base_url;
  
  RETURN base_url || '/storage/v1/object/public/leasing-payments/' || file_path;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- DOCUMENT TRACKING TABLE (OPTIONAL)
-- =====================================================
-- This table can be used to track all uploaded documents
-- for better organization and searching

CREATE TABLE IF NOT EXISTS lease_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Document info
  document_type TEXT NOT NULL, -- 'payment_receipt', 'invoice', 'contract', etc.
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  
  -- Relations
  customer_id UUID REFERENCES leasing_customers(id),
  vehicle_id UUID REFERENCES leasing_inventory(id),
  payment_id UUID REFERENCES lease_payments(id),
  invoice_id UUID REFERENCES lease_invoices(id),
  transaction_id UUID REFERENCES lease_transactions(id),
  
  -- Metadata
  description TEXT,
  tags TEXT[],
  
  -- Audit
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  uploaded_by UUID REFERENCES auth.users(id),
  
  -- Indexes for common queries
  CONSTRAINT at_least_one_relation CHECK (
    customer_id IS NOT NULL OR 
    vehicle_id IS NOT NULL OR 
    payment_id IS NOT NULL OR 
    invoice_id IS NOT NULL OR 
    transaction_id IS NOT NULL
  )
);

-- Create indexes for performance
CREATE INDEX idx_lease_documents_customer ON lease_documents(customer_id);
CREATE INDEX idx_lease_documents_vehicle ON lease_documents(vehicle_id);
CREATE INDEX idx_lease_documents_payment ON lease_documents(payment_id);
CREATE INDEX idx_lease_documents_invoice ON lease_documents(invoice_id);
CREATE INDEX idx_lease_documents_type ON lease_documents(document_type);
CREATE INDEX idx_lease_documents_uploaded_at ON lease_documents(uploaded_at);

-- Enable RLS
ALTER TABLE lease_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view all documents
CREATE POLICY "Users can view lease documents"
ON lease_documents FOR SELECT
TO authenticated
USING (true);

-- RLS Policy: Users can manage documents
CREATE POLICY "Users can manage lease documents"
ON lease_documents FOR ALL
TO authenticated
USING (auth.uid() IS NOT NULL);

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================
DO $$
BEGIN
  RAISE NOTICE '✅ Leasing storage setup completed successfully!';
  RAISE NOTICE '📁 Storage bucket "leasing-payments" is ready';
  RAISE NOTICE '🔒 Storage policies have been configured';
  RAISE NOTICE '📄 Document tracking table created';
  RAISE NOTICE '';
  RAISE NOTICE 'Expected folder structure:';
  RAISE NOTICE '  /payment-receipts/{customer_id}/{timestamp}.{ext}';
  RAISE NOTICE '  /lease-invoices/INV-L-{number}.pdf';
  RAISE NOTICE '  /lease-contracts/{customer_id}/contract-{date}.pdf';
  RAISE NOTICE '  /vehicle-documents/{vehicle_id}/{doc_type}.pdf';
  RAISE NOTICE '  /salik-statements/{year-month}/statement.pdf';
  RAISE NOTICE '  /traffic-fines/{fine_number}.pdf';
END $$;
