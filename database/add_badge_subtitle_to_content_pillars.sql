-- Add badge_text and subtitle columns to content_pillars table

-- Add badge_text column
ALTER TABLE content_pillars 
ADD COLUMN badge_text TEXT;

-- Add subtitle column  
ALTER TABLE content_pillars 
ADD COLUMN subtitle TEXT;

-- Set default values for existing Monday records
UPDATE content_pillars 
SET badge_text = 'MYTH BUSTER MONDAY',
    subtitle = 'Independent Mercedes Service'
WHERE day_of_week = 'monday' AND badge_text IS NULL;

-- Set default values for other days
UPDATE content_pillars 
SET badge_text = UPPER(day_of_week),
    subtitle = 'Premium Selection'
WHERE day_of_week != 'monday' AND badge_text IS NULL;

-- Verify the changes
SELECT 
    id,
    title,
    day_of_week,
    badge_text,
    subtitle,
    created_at
FROM content_pillars 
WHERE day_of_week = 'monday'
ORDER BY created_at DESC
LIMIT 5;
