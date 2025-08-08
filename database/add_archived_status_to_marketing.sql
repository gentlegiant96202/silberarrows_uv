-- Add missing statuses to marketing tasks
-- This migration adds 'planned' and 'archived' statuses to the task_status enum

-- Check if 'planned' already exists in the enum and add it if not
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'planned' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'task_status')
    ) THEN
        -- Add 'planned' to the task_status enum (after 'intake')
        ALTER TYPE task_status ADD VALUE 'planned' AFTER 'intake';
        
        RAISE NOTICE 'Added planned status to task_status enum';
    ELSE
        RAISE NOTICE 'planned status already exists in task_status enum';
    END IF;
END $$;

-- Check if 'archived' already exists in the enum and add it if not
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'archived' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'task_status')
    ) THEN
        -- Add 'archived' to the task_status enum (at the end)
        ALTER TYPE task_status ADD VALUE 'archived';
        
        RAISE NOTICE 'Added archived status to task_status enum';
    ELSE
        RAISE NOTICE 'archived status already exists in task_status enum';
    END IF;
END $$;

-- Verify the enum now contains both new statuses
SELECT unnest(enum_range(NULL::task_status)) AS available_statuses; 