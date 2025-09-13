-- ⚠️  IMPORTANT: This migration must be run in TWO separate steps
-- due to PostgreSQL enum transaction requirements

-- ==================================================
-- STEP 1: Add enum value (run this first, then commit)
-- ==================================================

-- Migration: Add 'archived' status to leads table for CRM kanban archive functionality
-- This follows the same pattern as the marketing archive functionality

ALTER TYPE lead_status_enum ADD VALUE 'archived';

-- ⚠️  CLICK "RUN" BUTTON NOW TO COMMIT THIS STEP
-- Then proceed to Step 2 below

-- ==================================================
-- STEP 2: Update everything else (run after Step 1)
-- ==================================================

-- =============================================
-- 2. UPDATE THE CHECK CONSTRAINT TO INCLUDE 'archived'
-- =============================================
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_status_check;
ALTER TABLE leads ADD CONSTRAINT leads_status_check 
    CHECK (status IN ('new_lead', 'new_customer', 'negotiation', 'won', 'delivered', 'lost', 'archived'));

-- =============================================
-- 3. ADD ARCHIVED_AT TIMESTAMP (optional)
-- =============================================
-- Add a timestamp field to track when leads were archived
ALTER TABLE leads ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE;

-- =============================================
-- 4. CREATE INDEX FOR ARCHIVED LEADS
-- =============================================
-- Create index for performance when filtering archived leads
CREATE INDEX IF NOT EXISTS idx_leads_archived ON leads(status) WHERE status = 'archived';
CREATE INDEX IF NOT EXISTS idx_leads_archived_at ON leads(archived_at) WHERE archived_at IS NOT NULL;

-- =============================================
-- 5. VERIFICATION
-- =============================================
-- Verify the new status is available
SELECT unnest(enum_range(NULL::lead_status_enum)) AS available_lead_statuses;

-- Show summary
SELECT 
    'SUCCESS: Archive status added to leads table' as status,
    COUNT(*) as total_leads,
    COUNT(*) FILTER (WHERE status = 'archived') as archived_leads
FROM leads; 