-- Simple check to see if myth and fact columns exist
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'content_pillars' 
AND column_name IN ('myth', 'fact', 'badge_text', 'subtitle')
ORDER BY column_name;
