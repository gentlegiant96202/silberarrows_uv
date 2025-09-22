-- Add notes field to service contracts and warranty contracts
-- This field allows users to add additional notes or special terms to contracts

-- 1. Add notes column to service_contracts table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'service_contracts' AND column_name = 'notes'
    ) THEN
        ALTER TABLE service_contracts ADD COLUMN notes TEXT;
        RAISE NOTICE '✅ Added notes field to service_contracts';
    ELSE
        RAISE NOTICE 'ℹ️ notes field already exists in service_contracts';
    END IF;
END $$;

-- 2. Add notes column to warranty_contracts table  
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'warranty_contracts' AND column_name = 'notes'
    ) THEN
        ALTER TABLE warranty_contracts ADD COLUMN notes TEXT;
        RAISE NOTICE '✅ Added notes field to warranty_contracts';
    ELSE
        RAISE NOTICE 'ℹ️ notes field already exists in warranty_contracts';
    END IF;
END $$;

-- 3. Add comments to document the fields
COMMENT ON COLUMN service_contracts.notes IS 'Additional notes or special terms for the service contract';
COMMENT ON COLUMN warranty_contracts.notes IS 'Additional notes or special terms for the warranty contract';

-- Success message
DO $$
BEGIN
    RAISE NOTICE '🎉 Notes field migration completed successfully!';
    RAISE NOTICE '📝 Users can now add notes when creating or editing contracts';
    RAISE NOTICE '📄 Notes will appear in generated PDF documents';
END $$;
