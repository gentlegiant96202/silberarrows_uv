-- Add archive column to consignments table
-- This allows consignments to be archived instead of deleted

-- Add archive column
ALTER TABLE consignments 
ADD COLUMN archived BOOLEAN DEFAULT FALSE;

-- Add index for better performance when filtering archived/non-archived
CREATE INDEX idx_consignments_archived ON consignments(archived);

-- Add composite index for status and archived
CREATE INDEX idx_consignments_status_archived ON consignments(status, archived);

-- Update existing consignments to be non-archived (they're already active)
UPDATE consignments SET archived = FALSE WHERE archived IS NULL;

-- Verify the changes
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'consignments' 
AND column_name = 'archived';

-- Show sample data
SELECT id, status, archived, created_at 
FROM consignments 
ORDER BY created_at DESC 
LIMIT 5;
