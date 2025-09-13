-- Fix content_examples table duplicates and constraints

-- 1. First, remove duplicate entries (keep the most recent one for each title/day combination)
DELETE FROM content_examples 
WHERE id NOT IN (
    SELECT DISTINCT ON (title, day_of_week) id
    FROM content_examples 
    ORDER BY title, day_of_week, created_at DESC
);

-- 2. Add unique constraint to prevent future duplicates
ALTER TABLE content_examples 
ADD CONSTRAINT unique_content_example_title_day 
UNIQUE (title, day_of_week);

-- 3. Create index for better performance on common queries
CREATE INDEX IF NOT EXISTS idx_content_examples_title_day 
ON content_examples(title, day_of_week);

-- 4. Verify the fix worked
SELECT 
    day_of_week, 
    COUNT(*) as total_examples,
    COUNT(DISTINCT title) as unique_titles
FROM content_examples 
GROUP BY day_of_week 
ORDER BY 
    CASE day_of_week 
        WHEN 'monday' THEN 1 
        WHEN 'tuesday' THEN 2 
        WHEN 'wednesday' THEN 3 
        WHEN 'thursday' THEN 4 
        WHEN 'friday' THEN 5 
        WHEN 'saturday' THEN 6 
    END;
