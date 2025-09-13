-- STEP 2: Update constraints and add columns (run this AFTER Step 1 is committed)
-- Copy and paste this into Supabase SQL Editor and run it

-- =============================================
-- UPDATE THE CHECK CONSTRAINT TO INCLUDE 'archived'
-- =============================================
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_status_check;
ALTER TABLE leads ADD CONSTRAINT leads_status_check 
    CHECK (status IN ('new_lead', 'new_customer', 'negotiation', 'won', 'delivered', 'lost', 'archived'));

-- =============================================
-- ADD ARCHIVED_AT TIMESTAMP
-- =============================================
-- Add a timestamp field to track when leads were archived
ALTER TABLE leads ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE;

-- =============================================
-- CREATE INDEX FOR ARCHIVED LEADS
-- =============================================
-- Create index for performance when filtering archived leads
CREATE INDEX IF NOT EXISTS idx_leads_archived ON leads(status) WHERE status = 'archived';
CREATE INDEX IF NOT EXISTS idx_leads_archived_at ON leads(archived_at) WHERE archived_at IS NOT NULL;

-- =============================================
-- VERIFICATION
-- =============================================
-- Verify the new status is available
SELECT unnest(enum_range(NULL::lead_status_enum)) AS available_lead_statuses;

-- Show summary
SELECT 
    'SUCCESS: Archive status added to leads table' as status,
    COUNT(*) as total_leads,
    COUNT(*) FILTER (WHERE status = 'archived') as archived_leads
FROM leads; 