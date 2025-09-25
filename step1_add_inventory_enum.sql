-- STEP 1: Add inventory enum value
-- Run this FIRST and ALONE - do not combine with other SQL

ALTER TYPE leasing_vehicle_status_enum ADD VALUE IF NOT EXISTS 'inventory';
