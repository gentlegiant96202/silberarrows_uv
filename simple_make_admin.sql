-- Simple script to make users admin
-- Just adds "role": "admin" to their metadata

-- Make marketing@silberarrows.com admin
UPDATE auth.users 
SET raw_user_meta_data = raw_user_meta_data || '{"role": "admin"}'::jsonb
WHERE email = 'marketing@silberarrows.com';

-- Make philip.smith@silberarrows.com admin (when they sign up)
UPDATE auth.users 
SET raw_user_meta_data = raw_user_meta_data || '{"role": "admin"}'::jsonb
WHERE email = 'philip.smith@silberarrows.com';

-- Check the results
SELECT 
    email,
    raw_user_meta_data->>'role' as role,
    raw_user_meta_data
FROM auth.users 
WHERE email IN ('marketing@silberarrows.com', 'philip.smith@silberarrows.com'); 