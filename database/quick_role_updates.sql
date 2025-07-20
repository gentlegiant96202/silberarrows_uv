-- ================================
-- QUICK ROLE UPDATE COMMANDS
-- ================================
-- Copy and paste these into Supabase SQL Editor

-- 🔄 Change specific user from admin to user
UPDATE user_roles 
SET role = 'user' 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'USER_EMAIL_HERE');

-- 🔄 Change specific user from user to admin  
UPDATE user_roles 
SET role = 'admin' 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'USER_EMAIL_HERE');

-- 📋 Quick check - see all user roles
SELECT email, db_role as current_role FROM user_role_status ORDER BY db_role DESC, email;

-- 📋 Check specific user's role
SELECT email, db_role, is_admin_computed FROM user_role_status WHERE email = 'USER_EMAIL_HERE';

-- 📋 Find all admins
SELECT email, db_role FROM user_role_status WHERE db_role = 'admin';

-- 📋 Find all regular users  
SELECT email, db_role FROM user_role_status WHERE db_role = 'user';

-- ================================
-- EXAMPLES:
-- ================================

-- Make philip.smith@silberarrows.com a regular user:
-- UPDATE user_roles SET role = 'user' WHERE user_id = (SELECT id FROM auth.users WHERE email = 'philip.smith@silberarrows.com');

-- Make someone an admin:
-- UPDATE user_roles SET role = 'admin' WHERE user_id = (SELECT id FROM auth.users WHERE email = 'newadmin@silberarrows.com'); 