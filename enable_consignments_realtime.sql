-- Enable real-time for consignments table
-- This allows the frontend to receive real-time updates when consignments are created/updated

-- Enable real-time for consignments table
ALTER PUBLICATION supabase_realtime ADD TABLE consignments;

-- Verify real-time is enabled
SELECT schemaname, tablename, hasreplication 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
AND tablename = 'consignments';

-- If the above doesn't work, try this alternative:
-- ALTER TABLE consignments REPLICA IDENTITY FULL;
