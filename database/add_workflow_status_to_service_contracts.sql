-- Add workflow_status column to service_contracts table
-- This column tracks the workflow state of service contracts

-- Check if column already exists and add if not
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'service_contracts' 
        AND column_name = 'workflow_status'
    ) THEN
        -- Add the workflow_status column with enum constraint
        ALTER TABLE service_contracts 
        ADD COLUMN workflow_status TEXT CHECK (workflow_status IN ('created', 'sent_for_signing', 'card_issued')) DEFAULT 'created';

        -- Add a comment to document the field
        COMMENT ON COLUMN service_contracts.workflow_status IS 'Workflow status: created, sent_for_signing, card_issued';

        -- Update existing records to have default 'created' status
        UPDATE service_contracts 
        SET workflow_status = 'created' 
        WHERE workflow_status IS NULL;

        -- Make the field NOT NULL after setting defaults
        ALTER TABLE service_contracts 
        ALTER COLUMN workflow_status SET NOT NULL;

        -- Create index for better query performance
        CREATE INDEX IF NOT EXISTS idx_service_contracts_workflow_status ON service_contracts(workflow_status);

        RAISE NOTICE 'Workflow status column added to service_contracts table successfully!';
    ELSE
        RAISE NOTICE 'Workflow status column already exists in service_contracts table.';
    END IF;
END
$$;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Service contracts workflow status migration completed!';
    RAISE NOTICE 'Available workflow statuses: created, sent_for_signing, card_issued';
    RAISE NOTICE 'Default value: created';
END
$$; 