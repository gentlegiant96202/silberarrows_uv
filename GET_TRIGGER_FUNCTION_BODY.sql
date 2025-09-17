-- Get the actual trigger function code to see what logic is running
SELECT routine_definition 
FROM information_schema.routines 
WHERE routine_name = 'generate_document_number';
