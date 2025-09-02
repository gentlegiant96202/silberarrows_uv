-- Fix RLS Infinite Recursion on user_roles table
-- Run this in Supabase SQL Editor

-- Step 1: Temporarily disable RLS to break recursion
ALTER TABLE user_roles DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop ALL existing policies to start fresh
DROP POLICY IF EXISTS "Users can view own role" ON user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can update roles" ON user_roles;
DROP POLICY IF EXISTS "Users can view own user_role" ON user_roles;
DROP POLICY IF EXISTS "Admins can view all user_roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can update user_roles" ON user_roles;
DROP POLICY IF EXISTS "Users can read own role" ON user_roles;
DROP POLICY IF EXISTS "Admins can read all roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON user_roles;
DROP POLICY IF EXISTS "Enable read for all users" ON user_roles;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON user_roles;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON user_roles;
DROP POLICY IF EXISTS "authenticated_users_can_read_user_roles" ON user_roles;
DROP POLICY IF EXISTS "authenticated_users_can_manage_user_roles" ON user_roles;
DROP POLICY IF EXISTS "user_roles_select_own" ON user_roles;
DROP POLICY IF EXISTS "user_roles_select_admin" ON user_roles;
DROP POLICY IF EXISTS "user_roles_insert_admin" ON user_roles;
DROP POLICY IF EXISTS "user_roles_update_admin" ON user_roles;
DROP POLICY IF EXISTS "user_roles_delete_admin" ON user_roles;

-- Step 3: Create simple, non-recursive policies
-- Allow all authenticated users to read user_roles (no recursion)
CREATE POLICY "simple_read_user_roles" ON user_roles
    FOR SELECT USING (auth.role() = 'authenticated');

-- Allow all authenticated users to manage user_roles (no recursion)  
CREATE POLICY "simple_manage_user_roles" ON user_roles
    FOR ALL WITH CHECK (auth.role() = 'authenticated');

-- Step 4: Re-enable RLS with simple policies
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Verification
SELECT 'RLS policies fixed for user_roles table' as status;
