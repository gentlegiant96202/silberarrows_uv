-- Update User Role Function to Support Department Head Roles
-- This script updates the update_user_role function to accept all new head roles

-- Update the role validation function to include all head roles
CREATE OR REPLACE FUNCTION update_user_role(
    target_user_id UUID,
    new_role TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Validate role (now includes all head roles)
    IF new_role NOT IN (
        'admin',
        'sales', 'sales_head',
        'marketing', 'marketing_head', 
        'service', 'service_head',
        'leasing', 'leasing_head',
        'accounts', 'accounts_head'
    ) THEN
        RAISE EXCEPTION 'Invalid role: %', new_role;
    END IF;

    -- Update or insert user role
    INSERT INTO user_roles (user_id, role, updated_at)
    VALUES (target_user_id, new_role, NOW())
    ON CONFLICT (user_id) 
    DO UPDATE SET 
        role = new_role,
        updated_at = NOW();

    RETURN TRUE;
END $$;

-- Also update the user_roles table constraint to include head roles
ALTER TABLE user_roles DROP CONSTRAINT IF EXISTS user_roles_role_check;
ALTER TABLE user_roles ADD CONSTRAINT user_roles_role_check 
    CHECK (role IN (
        'admin',
        'sales', 'sales_head',
        'marketing', 'marketing_head', 
        'service', 'service_head',
        'leasing', 'leasing_head',
        'accounts', 'accounts_head'
    ));

-- Verify the function was updated
SELECT 'SUCCESS: update_user_role function updated to support all head roles!' as status; 