-- Add Lost Reason Tracking to Leads Table
-- Migration to add lost reason fields for tracking why leads are lost

BEGIN;

-- Add lost_reason column with predefined options
ALTER TABLE leads 
ADD COLUMN lost_reason TEXT CHECK (lost_reason IN (
  'Price', 
  'Availability', 
  'Timeline', 
  'Finance Approval', 
  'Customer Service'
));

-- Add optional notes field for additional context
ALTER TABLE leads 
ADD COLUMN lost_reason_notes TEXT;

-- Add timestamp for when the lead was lost
ALTER TABLE leads 
ADD COLUMN lost_at TIMESTAMP WITH TIME ZONE;

-- Create index for reporting on lost reasons
CREATE INDEX IF NOT EXISTS idx_leads_lost_reason ON leads(lost_reason) WHERE status = 'lost';

-- Update existing lost leads to have a lost_at timestamp
UPDATE leads 
SET lost_at = updated_at 
WHERE status = 'lost' AND lost_at IS NULL;

-- Verify the changes
SELECT 
  'SUCCESS: Lost reason fields added to leads table' as status,
  COUNT(*) as total_leads,
  COUNT(CASE WHEN status = 'lost' THEN 1 END) as lost_leads
FROM leads;

COMMIT; 