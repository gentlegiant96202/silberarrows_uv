-- Add lease agreement PDF field to leasing_customers table
-- This will store the URL of the generated lease agreement PDF

-- Add the new column for lease agreement PDF
ALTER TABLE leasing_customers 
ADD COLUMN IF NOT EXISTS lease_agreement_pdf_url TEXT NULL;

-- Add index for the new column
CREATE INDEX IF NOT EXISTS idx_leasing_customers_lease_agreement_pdf 
ON leasing_customers(lease_agreement_pdf_url) 
WHERE lease_agreement_pdf_url IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN leasing_customers.lease_agreement_pdf_url IS 'URL to the generated lease agreement PDF document';

-- Success message
SELECT 'Lease agreement PDF field added to leasing_customers table!' as result;
