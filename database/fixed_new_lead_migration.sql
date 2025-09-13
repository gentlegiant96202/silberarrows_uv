-- STEP 1: Add new enum value (run this first, then commit)
-- Copy and paste this into Supabase SQL Editor and run it

ALTER TYPE lead_status_enum ADD VALUE 'new_lead';
 
-- After running the above, you MUST click "Run" or commit the transaction
-- Then proceed to STEP 2 below 