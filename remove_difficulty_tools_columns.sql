-- Remove difficulty, tools_needed, and warning columns from myth_buster_monday table
-- These fields are not part of Myth Buster Monday content

ALTER TABLE myth_buster_monday 
DROP COLUMN IF EXISTS difficulty,
DROP COLUMN IF EXISTS tools_needed,
DROP COLUMN IF EXISTS warning;

