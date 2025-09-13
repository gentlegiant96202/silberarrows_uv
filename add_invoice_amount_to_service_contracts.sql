-- Add invoice_amount column to service_contracts table
-- This field stores the invoice amount for each service contract

ALTER TABLE service_contracts 
ADD COLUMN invoice_amount DECIMAL(10,2);

-- Add a comment to document the field
COMMENT ON COLUMN service_contracts.invoice_amount IS 'Invoice amount for the service contract in AED';

-- Optional: Set a default value for existing records (can be NULL)
-- UPDATE service_contracts SET invoice_amount = 0.00 WHERE invoice_amount IS NULL; 