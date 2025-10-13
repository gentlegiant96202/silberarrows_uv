-- Check the actual column names in daily_service_metrics table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'daily_service_metrics' 
  AND column_name LIKE '%labor%'
ORDER BY ordinal_position;

