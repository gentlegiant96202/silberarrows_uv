-- Fix for enum constraint issue with damage_report
-- Run this in Supabase SQL Editor

-- Step 1: Add the enum value (run this first)
ALTER TYPE media_kind_enum ADD VALUE 'damage_report';

-- Step 2: Commit this transaction, then run the verification below in a separate query:
-- SELECT unnest(enum_range(NULL::media_kind_enum)) as media_kinds;
