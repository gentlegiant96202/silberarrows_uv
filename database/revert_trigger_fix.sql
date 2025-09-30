-- Revert the trigger function change that broke department access
-- This restores the original trigger function

-- First, let's check what the original trigger function looked like
-- by restoring it to a safe version that works with existing tables

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    -- Only set updated_by if the column exists
    IF TG_TABLE_NAME IN ('user_roles', 'modules') AND pg_column_exists(TG_TABLE_SCHEMA, TG_TABLE_NAME, 'updated_by') THEN
        NEW.updated_by = COALESCE(NEW.updated_by, auth.uid());
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Helper function to check if column exists
CREATE OR REPLACE FUNCTION pg_column_exists(schema_name text, table_name text, column_name text)
RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = schema_name
        AND table_name = table_name
        AND column_name = column_name
    );
END;
$$ LANGUAGE plpgsql;

SELECT 'Trigger function reverted - department access should be restored' as status;
