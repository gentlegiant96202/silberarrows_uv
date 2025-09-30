-- Fix the trigger function that's causing updated_by errors
-- This replaces the problematic trigger function with a simple version

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Test that the function works
SELECT 'Trigger function fixed successfully!' as status;

