-- Test real-time events for consignments table
-- Run this in Supabase SQL Editor

-- First, check if consignments table is in the real-time publication
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
AND tablename = 'consignments';

-- If no results above, enable real-time for consignments
ALTER PUBLICATION supabase_realtime ADD TABLE consignments;

-- Verify it's now enabled
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
AND tablename = 'consignments';

-- Alternative method if the above doesn't work
-- ALTER TABLE consignments REPLICA IDENTITY FULL;

-- Test by creating a consignment directly in SQL (this should trigger real-time)
INSERT INTO consignments (vehicle_model, asking_price, phone_number, listing_url, notes, status)
VALUES ('SQL Test Real-time', 50000, '9999999999', 'https://sql-test.com', 'SQL test', 'new_lead');
