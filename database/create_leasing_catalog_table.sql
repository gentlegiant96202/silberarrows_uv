    -- =====================================================
    -- LEASING CATALOG TABLE - SAFE MIGRATION
    -- =====================================================

    -- Create catalog status enum (safe - may already exist from uv_catalog)
    DO $$ BEGIN
        CREATE TYPE catalog_status AS ENUM (
            'pending',
            'generating', 
            'ready',
            'error'
        );
    EXCEPTION
        WHEN duplicate_object THEN null;
    END $$;

    -- Create the Leasing catalog table (safe)
    CREATE TABLE IF NOT EXISTS leasing_catalog (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        vehicle_id UUID NOT NULL REFERENCES leasing_inventory(id) ON DELETE CASCADE,
        
        -- XML-specific fields (Facebook format)
        title TEXT NOT NULL,
        description TEXT,
        url TEXT, -- Link to vehicle details page
        body_style TEXT,
        state_of_vehicle TEXT DEFAULT 'USED',
        make TEXT NOT NULL,
        model TEXT NOT NULL,
        year INTEGER NOT NULL,
        mileage_km INTEGER,
        price_aed DECIMAL(12,2) NOT NULL,
        
        -- Address/Location fields
        address_line1 TEXT DEFAULT 'Sheikh Zayed Road',
        address_line2 TEXT DEFAULT 'Dubai',
        city TEXT DEFAULT 'Dubai',
        region TEXT DEFAULT 'Dubai',
        country TEXT DEFAULT 'United Arab Emirates',
        postal_code TEXT DEFAULT '00000',
        latitude DECIMAL(10,8) DEFAULT 25.2048,
        longitude DECIMAL(11,8) DEFAULT 55.2708,
        neighborhood TEXT DEFAULT 'Dubai',
        
        -- Generated content
        catalog_image_url TEXT, -- Generated square catalog image
        xml_listing TEXT, -- Generated XML snippet for this vehicle
        
        -- Status and metadata
        status catalog_status DEFAULT 'pending',
        error_message TEXT,
        generation_attempts INTEGER DEFAULT 0,
        last_generated_at TIMESTAMP WITH TIME ZONE,
        
        -- Timestamps
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- Add constraints if they don't exist
    DO $$ BEGIN
        ALTER TABLE leasing_catalog ADD CONSTRAINT leasing_catalog_vehicle_id_key UNIQUE(vehicle_id);
    EXCEPTION
        WHEN duplicate_object THEN null;
    END $$;

    DO $$ BEGIN
        ALTER TABLE leasing_catalog ADD CONSTRAINT leasing_valid_year CHECK (year >= 1900 AND year <= EXTRACT(YEAR FROM NOW()) + 2);
    EXCEPTION
        WHEN duplicate_object THEN null;
    END $$;

    DO $$ BEGIN
        ALTER TABLE leasing_catalog ADD CONSTRAINT leasing_valid_mileage CHECK (mileage_km >= 0);
    EXCEPTION
        WHEN duplicate_object THEN null;
    END $$;

    DO $$ BEGIN
        ALTER TABLE leasing_catalog ADD CONSTRAINT leasing_valid_price CHECK (price_aed > 0);
    EXCEPTION
        WHEN duplicate_object THEN null;
    END $$;

    DO $$ BEGIN
        ALTER TABLE leasing_catalog ADD CONSTRAINT leasing_valid_attempts CHECK (generation_attempts >= 0 AND generation_attempts <= 10);
    EXCEPTION
        WHEN duplicate_object THEN null;
    END $$;

    -- Create indexes for performance (safe)
    CREATE INDEX IF NOT EXISTS idx_leasing_catalog_vehicle_id ON leasing_catalog(vehicle_id);
    CREATE INDEX IF NOT EXISTS idx_leasing_catalog_status ON leasing_catalog(status);
    CREATE INDEX IF NOT EXISTS idx_leasing_catalog_created_at ON leasing_catalog(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_leasing_catalog_last_generated ON leasing_catalog(last_generated_at DESC);

    -- Create updated_at trigger (safe)
    CREATE OR REPLACE FUNCTION update_leasing_catalog_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
    END;
    $$ language 'plpgsql';

    DROP TRIGGER IF EXISTS update_leasing_catalog_updated_at_trigger ON leasing_catalog;
    CREATE TRIGGER update_leasing_catalog_updated_at_trigger
        BEFORE UPDATE ON leasing_catalog
        FOR EACH ROW
        EXECUTE FUNCTION update_leasing_catalog_updated_at();

    -- Create auto-populate trigger (safe)
    CREATE OR REPLACE FUNCTION auto_create_leasing_catalog_entry()
    RETURNS TRIGGER AS $$
    DECLARE
        vehicle_make TEXT;
    BEGIN
    -- Only create catalog entry for available vehicles (inventory = available for lease)
    IF NEW.status = 'inventory' THEN
            -- Extract make from vehicle_model (first word) or use make field
            vehicle_make := COALESCE(NEW.make, SPLIT_PART(NEW.vehicle_model, ' ', 1));
            
        INSERT INTO leasing_catalog (
            vehicle_id,
            title,
            description,
            make,
            model,
            year,
            mileage_km,
            price_aed,
            body_style,
            state_of_vehicle,
            url
        ) VALUES (
            NEW.id,
            COALESCE(NEW.vehicle_model, CONCAT(NEW.model_year, ' ', NEW.make)),
            COALESCE(NEW.description, CONCAT('Premium ', NEW.model_year, ' ', COALESCE(NEW.vehicle_model, NEW.make), ' available for lease')),
            vehicle_make,
            COALESCE(NEW.vehicle_model, NEW.model_family, 'SEDAN'),
            NEW.model_year,
            NEW.current_mileage_km,
            NEW.monthly_lease_rate,
            COALESCE(NEW.body_style, 'SEDAN'),
            CASE 
                WHEN NEW.current_mileage_km < 1000 THEN 'NEW'
                ELSE 'USED'
            END,
            CONCAT('https://portal.silberarrows.com/leasing/showroom/', NEW.id)
        ) ON CONFLICT (vehicle_id) DO UPDATE SET
                title = EXCLUDED.title,
                description = EXCLUDED.description,
                make = EXCLUDED.make,
                model = EXCLUDED.model,
                year = EXCLUDED.year,
                mileage_km = EXCLUDED.mileage_km,
                price_aed = EXCLUDED.price_aed,
                body_style = EXCLUDED.body_style,
                state_of_vehicle = EXCLUDED.state_of_vehicle,
                url = EXCLUDED.url,
                updated_at = NOW();
        END IF;
        
        RETURN NEW;
    END;
    $$ language 'plpgsql';

    DROP TRIGGER IF EXISTS auto_create_leasing_catalog_trigger ON leasing_inventory;
    CREATE TRIGGER auto_create_leasing_catalog_trigger
        AFTER INSERT OR UPDATE ON leasing_inventory
        FOR EACH ROW
        EXECUTE FUNCTION auto_create_leasing_catalog_entry();

    -- Insert existing leasing inventory into catalog (safe)
    INSERT INTO leasing_catalog (
        vehicle_id,
        title,
        description,
        make,
        model,
        year,
        mileage_km,
        price_aed,
        body_style,
        state_of_vehicle,
        url
    )
SELECT 
    v.id,
    COALESCE(v.vehicle_model, CONCAT(v.model_year, ' ', v.make)),
    COALESCE(v.description, CONCAT('Premium ', v.model_year, ' ', COALESCE(v.vehicle_model, v.make), ' available for lease')),
    COALESCE(v.make, SPLIT_PART(v.vehicle_model, ' ', 1)),
    COALESCE(v.vehicle_model, v.model_family, 'SEDAN'),
    v.model_year,
    v.current_mileage_km,
    v.monthly_lease_rate,
    COALESCE(v.body_style, 'SEDAN'),
    CASE 
        WHEN v.current_mileage_km < 1000 THEN 'NEW'
        ELSE 'USED'
    END,
    CONCAT('https://portal.silberarrows.com/leasing/showroom/', v.id)
FROM leasing_inventory v 
WHERE v.status = 'inventory'
ON CONFLICT (vehicle_id) DO NOTHING;

    -- Grant permissions (safe)
    DO $$ BEGIN
        GRANT ALL ON leasing_catalog TO authenticated;
    EXCEPTION
        WHEN others THEN null;
    END $$;

    DO $$ BEGIN
        GRANT ALL ON leasing_catalog TO service_role;
    EXCEPTION
        WHEN others THEN null;
    END $$;

    -- Enable RLS (safe)
    DO $$ BEGIN
        ALTER TABLE leasing_catalog ENABLE ROW LEVEL SECURITY;
    EXCEPTION
        WHEN others THEN null;
    END $$;

    -- Drop and recreate RLS policies (safe)
    DROP POLICY IF EXISTS "Enable read access for all users" ON leasing_catalog;
    DROP POLICY IF EXISTS "Enable insert for authenticated users" ON leasing_catalog;
    DROP POLICY IF EXISTS "Enable update for authenticated users" ON leasing_catalog;
    DROP POLICY IF EXISTS "Enable delete for authenticated users" ON leasing_catalog;

    CREATE POLICY "Enable read access for all users" ON leasing_catalog
        FOR SELECT USING (true);

    CREATE POLICY "Enable insert for authenticated users" ON leasing_catalog
        FOR INSERT WITH CHECK (true);

    CREATE POLICY "Enable update for authenticated users" ON leasing_catalog
        FOR UPDATE USING (true);

    CREATE POLICY "Enable delete for authenticated users" ON leasing_catalog
        FOR DELETE USING (true);

    -- Add helpful comments
    DO $$ BEGIN
        COMMENT ON TABLE leasing_catalog IS 'Leasing Catalog management for Facebook XML feed generation';
        COMMENT ON COLUMN leasing_catalog.catalog_image_url IS 'URL of generated square catalog image for Facebook';
        COMMENT ON COLUMN leasing_catalog.xml_listing IS 'Generated XML snippet for this specific vehicle';
        COMMENT ON COLUMN leasing_catalog.status IS 'Generation status: pending, generating, ready, error';
        COMMENT ON COLUMN leasing_catalog.url IS 'Public URL to vehicle details page for XML feed';
    EXCEPTION
        WHEN others THEN null;
    END $$;

    -- Success message
    SELECT 'Leasing Catalog table created successfully!' as result;

