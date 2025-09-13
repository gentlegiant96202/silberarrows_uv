-- Add successful_leads column to scrape_jobs table
ALTER TABLE scrape_jobs ADD COLUMN IF NOT EXISTS successful_leads INTEGER DEFAULT 0;

-- Add comment for documentation
COMMENT ON COLUMN scrape_jobs.successful_leads IS 'Number of successful leads found (leads with valid phone numbers)';

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_scrape_jobs_successful_leads ON scrape_jobs(successful_leads);

-- Check the updated table structure
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'scrape_jobs' 
ORDER BY ordinal_position; 