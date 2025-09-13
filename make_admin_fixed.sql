-- Make multiple users admin (Fixed version)
-- This script works with the correct auth.users table structure

-- List of admin emails
WITH admin_emails AS (
    SELECT email FROM (VALUES 
        ('marketing@silberarrows.com'),
        ('philip.smith@silberarrows.com')
    ) AS emails(email)
)

-- Update raw_user_meta_data to set role as admin for existing users
UPDATE auth.users 
SET raw_user_meta_data = jsonb_set(
    COALESCE(raw_user_meta_data, '{}'),
    '{role}',
    '"admin"'
)
WHERE email IN (SELECT email FROM admin_emails)
AND id IS NOT NULL;

-- Update raw_app_meta_data to set role as admin for existing users
UPDATE auth.users 
SET raw_app_meta_data = jsonb_set(
    COALESCE(raw_app_meta_data, '{}'),
    '{role}',
    '"admin"'
)
WHERE email IN (SELECT email FROM admin_emails)
AND id IS NOT NULL;

-- Verify the changes for existing users
SELECT 
    email,
    raw_user_meta_data->>'role' as user_role,
    raw_app_meta_data->>'role' as app_role,
    created_at,
    CASE 
        WHEN id IS NOT NULL THEN 'User exists - Updated'
        ELSE 'User not found - Will be admin when they sign up'
    END as status
FROM auth.users 
WHERE email IN (
    'marketing@silberarrows.com',
    'philip.smith@silberarrows.com'
);

-- Note: For users who haven't signed up yet, you'll need to run this script again
-- after they create their account 