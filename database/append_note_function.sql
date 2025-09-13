-- Function to append notes to leads table
-- This function handles the timeline notes functionality

-- Step 1: Add a new JSONB column for timeline notes
ALTER TABLE leads ADD COLUMN IF NOT EXISTS timeline_notes JSONB DEFAULT '[]'::jsonb;

-- Step 2: Migrate existing text notes to the new timeline format
UPDATE leads 
SET timeline_notes = 
  CASE 
    WHEN notes IS NULL OR notes::text = '' OR LENGTH(TRIM(notes::text)) = 0 THEN '[]'::jsonb
    ELSE jsonb_build_array(jsonb_build_object('ts', created_at::text, 'text', notes::text))
  END
WHERE timeline_notes = '[]'::jsonb;

-- Step 3: Create the append_note function (using the new timeline_notes column)
CREATE OR REPLACE FUNCTION append_note(p_lead UUID, p_note JSONB)
RETURNS JSONB AS $$
DECLARE
  current_notes JSONB;
  updated_notes JSONB;
BEGIN
  -- Get current timeline notes
  SELECT timeline_notes INTO current_notes FROM leads WHERE id = p_lead;
  
  -- If current_notes is null, initialize as empty array
  IF current_notes IS NULL THEN
    current_notes := '[]'::jsonb;
  END IF;
  
  -- Prepend new note to the array (newest first)
  updated_notes := jsonb_build_array(p_note) || current_notes;
  
  -- Update the lead with new timeline notes
  UPDATE leads 
  SET timeline_notes = updated_notes, 
      updated_at = timezone('utc'::text, now())
  WHERE id = p_lead;
  
  -- Return the updated notes array
  RETURN updated_notes;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Create an index on the timeline_notes column for better performance
CREATE INDEX IF NOT EXISTS idx_leads_timeline_notes ON leads USING GIN (timeline_notes);

-- Step 5: Add a comment to document the function
COMMENT ON FUNCTION append_note(UUID, JSONB) IS 'Appends a new note to a lead''s timeline. Note should be in format: {"ts": "ISO timestamp", "text": "note text"}';

-- Step 6: Add comment to the new column
COMMENT ON COLUMN leads.timeline_notes IS 'JSON array of timeline notes with timestamps. Format: [{"ts": "ISO timestamp", "text": "note text"}]'; 