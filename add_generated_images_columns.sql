-- Add columns for API Flash generated images
ALTER TABLE myth_buster_monday 
ADD COLUMN IF NOT EXISTS generated_image_a_url TEXT,
ADD COLUMN IF NOT EXISTS generated_image_b_url TEXT,
ADD COLUMN IF NOT EXISTS generated_image_a_id TEXT,
ADD COLUMN IF NOT EXISTS generated_image_b_id TEXT;

-- Add indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_myth_buster_monday_generated_image_a ON myth_buster_monday(generated_image_a_url);
CREATE INDEX IF NOT EXISTS idx_myth_buster_monday_generated_image_b ON myth_buster_monday(generated_image_b_url);
