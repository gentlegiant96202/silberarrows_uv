-- ⚠️  IMPORTANT: This migration must be run in TWO separate steps
-- due to PostgreSQL enum transaction requirements

-- ==================================================
-- STEP 1: Add enum value (run this first)
-- ==================================================
ALTER TYPE lead_status_enum ADD VALUE 'new_lead';

-- ⚠️  CLICK "RUN" BUTTON NOW TO COMMIT THIS STEP
-- Then proceed to Step 2 below

-- ==================================================
-- STEP 2: Update everything else (run after Step 1)
-- ==================================================

-- Update the status check constraint
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_status_check;
ALTER TABLE leads ADD CONSTRAINT leads_status_check 
    CHECK (status IN ('new_lead', 'new_customer', 'negotiation', 'won', 'delivered', 'lost'));

-- Make appointment fields optional (nullable)
ALTER TABLE leads ALTER COLUMN appointment_date DROP NOT NULL;
ALTER TABLE leads ALTER COLUMN time_slot DROP NOT NULL;

-- Change default status to new_lead
ALTER TABLE leads ALTER COLUMN status SET DEFAULT 'new_lead';

-- Add missing columns if they don't exist
ALTER TABLE leads ADD COLUMN IF NOT EXISTS timeline_notes JSONB DEFAULT '[]';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS inventory_car_id UUID;

-- Verify the changes
SELECT unnest(enum_range(NULL::lead_status_enum)) AS available_statuses; 