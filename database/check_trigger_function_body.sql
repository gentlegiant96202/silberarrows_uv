-- Check the current trigger function body for any references to old column names
SELECT 
    p.proname AS function_name,
    pg_get_functiondef(p.oid) AS function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname LIKE '%service%metric%'
   OR p.proname LIKE '%labor%'
ORDER BY p.proname;

