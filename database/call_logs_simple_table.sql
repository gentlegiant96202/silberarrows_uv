-- Simple Call Logs Table for Quick Setup
-- Run this in your Supabase SQL editor to create the table

-- Create a simple call_logs table
CREATE TABLE IF NOT EXISTS call_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    call_date DATE NOT NULL,
    call_time TIME,
    customer_name TEXT,
    phone_number TEXT,
    reach_out_method TEXT DEFAULT 'Call',
    person_in_charge TEXT,
    answered_yn TEXT DEFAULT 'Yes',
    action_taken TEXT,
    person_in_charge_2 TEXT,
    answered_yn_2 TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_call_logs_date ON call_logs(call_date);
CREATE INDEX IF NOT EXISTS idx_call_logs_person ON call_logs(person_in_charge);
CREATE INDEX IF NOT EXISTS idx_call_logs_customer ON call_logs(customer_name);

-- Enable RLS (Row Level Security)
ALTER TABLE call_logs ENABLE ROW LEVEL SECURITY;

-- Create a policy to allow all operations for authenticated users
CREATE POLICY "Allow all operations for authenticated users" ON call_logs
    FOR ALL 
    TO authenticated 
    USING (true)
    WITH CHECK (true);

-- Grant permissions
GRANT ALL ON call_logs TO authenticated;
GRANT ALL ON call_logs TO service_role;

-- Insert some sample data
INSERT INTO call_logs (call_date, call_time, customer_name, phone_number, person_in_charge, answered_yn, action_taken, notes) VALUES
('2024-08-12', '10:30', 'Sample Customer', '123456789', 'Test User', 'Yes', 'Demo call', 'This is a test entry'),
('2024-08-12', '14:15', 'Another Customer', 'ANONYMOUS', 'Test User', 'No', 'Left voicemail', 'Follow up required')
ON CONFLICT DO NOTHING; 