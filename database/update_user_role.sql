-- ================================
-- UPDATE USER ROLES
-- ================================
-- Scripts to change user roles from admin to user (or vice versa)

-- 1. First, check current user roles
SELECT 'CURRENT USER ROLES:' as status;
SELECT 
  email,
  db_role,
  meta_user_role,
  meta_app_role,
  is_admin_computed as is_admin
FROM user_role_status
ORDER BY is_admin_computed DESC, email;

-- 2. Update a specific user from admin to user
-- Replace 'user@example.com' with the actual email
UPDATE user_roles 
SET role = 'user', 
    updated_at = timezone('utc'::text, now())
WHERE user_id = (
  SELECT id FROM auth.users 
  WHERE email = 'philip.smith@silberarrows.com'  -- 🔄 CHANGE THIS EMAIL
);

-- 3. Verify the update worked
SELECT 'AFTER UPDATE:' as status;
SELECT 
  email,
  db_role,
  meta_user_role,
  meta_app_role,
  is_admin_computed as is_admin
FROM user_role_status
WHERE email = 'philip.smith@silberarrows.com'  -- 🔄 CHANGE THIS EMAIL
ORDER BY email;

-- 4. Alternative: Update multiple users at once
-- Uncomment and modify as needed
/*
UPDATE user_roles 
SET role = 'user', 
    updated_at = timezone('utc'::text, now())
WHERE user_id IN (
  SELECT id FROM auth.users 
  WHERE email IN (
    'user1@silberarrows.com',
    'user2@silberarrows.com'
    -- Add more emails as needed
  )
);
*/

-- 5. To change a user FROM user TO admin:
/*
UPDATE user_roles 
SET role = 'admin', 
    updated_at = timezone('utc'::text, now())
WHERE user_id = (
  SELECT id FROM auth.users 
  WHERE email = 'newadmin@silberarrows.com'
);
*/

-- 6. Test the role change works with helper functions
SELECT 'TESTING HELPER FUNCTIONS:' as status;
SELECT 
  email,
  get_user_role(id) as computed_role,
  is_user_admin(id) as is_admin_check
FROM auth.users 
WHERE email = 'philip.smith@silberarrows.com'  -- 🔄 CHANGE THIS EMAIL
; 