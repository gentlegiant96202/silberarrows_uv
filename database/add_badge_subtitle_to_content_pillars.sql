-- Add badge_text and subtitle columns to content_pillars table

-- Add badge_text column
ALTER TABLE content_pillars 
ADD COLUMN IF NOT EXISTS badge_text TEXT;

-- Add subtitle column  
ALTER TABLE content_pillars 
ADD COLUMN IF NOT EXISTS subtitle TEXT;

-- Add myth column for Monday Myth-Buster format
ALTER TABLE content_pillars 
ADD COLUMN IF NOT EXISTS myth TEXT;

-- Add fact column for Monday Myth-Buster format
ALTER TABLE content_pillars 
ADD COLUMN IF NOT EXISTS fact TEXT;

-- Add Tech Tips Tuesday fields
ALTER TABLE content_pillars 
ADD COLUMN IF NOT EXISTS problem TEXT;

ALTER TABLE content_pillars 
ADD COLUMN IF NOT EXISTS solution TEXT;

ALTER TABLE content_pillars 
ADD COLUMN IF NOT EXISTS difficulty TEXT;

ALTER TABLE content_pillars 
ADD COLUMN IF NOT EXISTS tools_needed TEXT;

ALTER TABLE content_pillars 
ADD COLUMN IF NOT EXISTS warning TEXT;

-- Set default values for existing Monday records
UPDATE content_pillars 
SET badge_text = 'MYTH BUSTER MONDAY',
    subtitle = 'Independent Mercedes Service'
WHERE day_of_week = 'monday' AND badge_text IS NULL;

-- Set default values for Tuesday records
UPDATE content_pillars 
SET badge_text = 'TECH TIPS TUESDAY',
    subtitle = 'Expert Mercedes Knowledge'
WHERE day_of_week = 'tuesday' AND badge_text IS NULL;

-- Set default values for other days
UPDATE content_pillars 
SET badge_text = UPPER(day_of_week),
    subtitle = 'Premium Selection'
WHERE day_of_week NOT IN ('monday', 'tuesday') AND badge_text IS NULL;

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
