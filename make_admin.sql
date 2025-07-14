-- Make multiple users admin
-- This script updates both user_metadata and app_metadata for redundancy

-- List of admin emails
WITH admin_emails AS (
    SELECT email FROM (VALUES 
        ('marketing@silberarrows.com'),
        ('philip.smith@silberarrows.com')
    ) AS emails(email)
)

-- Update user_metadata to set role as admin for existing users
UPDATE auth.users 
SET user_metadata = jsonb_set(
    COALESCE(user_metadata, '{}'),
    '{role}',
    '"admin"'
)
WHERE email IN (SELECT email FROM admin_emails)
AND id IS NOT NULL;

-- Update app_metadata to set role as admin for existing users
UPDATE auth.users 
SET app_metadata = jsonb_set(
    COALESCE(app_metadata, '{}'),
    '{role}',
    '"admin"'
)
WHERE email IN (SELECT email FROM admin_emails)
AND id IS NOT NULL;

-- Verify the changes for existing users
SELECT 
    email,
    user_metadata->>'role' as user_role,
    app_metadata->>'role' as app_role,
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
-- after they create their account, or use a trigger/function to auto-assign admin role 