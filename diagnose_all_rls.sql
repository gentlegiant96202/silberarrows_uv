-- Comprehensive RLS Diagnosis for All Tables
-- Run this in Supabase SQL Editor to see all RLS policies

-- Check which tables have RLS enabled
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
    AND rowsecurity = true
ORDER BY tablename;

-- Check all existing policies on public schema tables
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Check specific tables that might be causing issues
DO $$
DECLARE
    table_names TEXT[] := ARRAY[
        'cars', 
        'car_media', 
        'user_roles', 
        'modules', 
        'role_permissions',
        'leads',
        'consignments',
        'sales_monthly_targets',
        'sales_daily_metrics',
        'daily_service_metrics',
        'service_monthly_targets',
        'design_tasks',
        'content_pillars',
        'uv_catalog'
    ];
    table_name TEXT;
    policy_count INTEGER;
BEGIN
    RAISE NOTICE 'RLS Policy Summary:';
    RAISE NOTICE '==================';
    
    FOREACH table_name IN ARRAY table_names LOOP
        -- Check if table exists
        IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = table_name) THEN
            -- Count policies for this table
            SELECT COUNT(*) INTO policy_count 
            FROM pg_policies 
            WHERE schemaname = 'public' AND tablename = table_name;
            
            -- Check if RLS is enabled
            IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = table_name AND rowsecurity = true) THEN
                RAISE NOTICE 'Table: % - RLS: ENABLED - Policies: %', table_name, policy_count;
            ELSE
                RAISE NOTICE 'Table: % - RLS: DISABLED - Policies: %', table_name, policy_count;
            END IF;
        ELSE
            RAISE NOTICE 'Table: % - NOT FOUND', table_name;
        END IF;
    END LOOP;
END $$;
