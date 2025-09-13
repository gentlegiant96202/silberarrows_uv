-- =====================================================
-- UV CATALOG TABLE - SAFE MIGRATION (HANDLES EXISTING OBJECTS)
-- =====================================================

-- Create catalog status enum (safe)
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

-- Create the UV catalog table (safe)
CREATE TABLE IF NOT EXISTS uv_catalog (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    car_id UUID NOT NULL REFERENCES cars(id) ON DELETE CASCADE,
    
    -- XML-specific fields
    title TEXT NOT NULL,
    description TEXT,
    url TEXT, -- Link to car details page
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
    
    -- Generated content
    catalog_image_url TEXT, -- Generated square catalog image
    xml_listing TEXT, -- Generated XML snippet for this car
    
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
    ALTER TABLE uv_catalog ADD CONSTRAINT uv_catalog_car_id_key UNIQUE(car_id);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE uv_catalog ADD CONSTRAINT valid_year CHECK (year >= 1900 AND year <= EXTRACT(YEAR FROM NOW()) + 2);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE uv_catalog ADD CONSTRAINT valid_mileage CHECK (mileage_km >= 0);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE uv_catalog ADD CONSTRAINT valid_price CHECK (price_aed > 0);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE uv_catalog ADD CONSTRAINT valid_attempts CHECK (generation_attempts >= 0 AND generation_attempts <= 10);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create indexes for performance (safe)
CREATE INDEX IF NOT EXISTS idx_uv_catalog_car_id ON uv_catalog(car_id);
CREATE INDEX IF NOT EXISTS idx_uv_catalog_status ON uv_catalog(status);
CREATE INDEX IF NOT EXISTS idx_uv_catalog_created_at ON uv_catalog(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_uv_catalog_last_generated ON uv_catalog(last_generated_at DESC);

-- Create updated_at trigger (safe)
CREATE OR REPLACE FUNCTION update_uv_catalog_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_uv_catalog_updated_at_trigger ON uv_catalog;
CREATE TRIGGER update_uv_catalog_updated_at_trigger
    BEFORE UPDATE ON uv_catalog
    FOR EACH ROW
    EXECUTE FUNCTION update_uv_catalog_updated_at();

-- Create auto-populate trigger (safe)
CREATE OR REPLACE FUNCTION auto_create_uv_catalog_entry()
RETURNS TRIGGER AS $$
BEGIN
    -- Only create catalog entry for inventory cars that are available
    IF NEW.status = 'inventory' AND NEW.sale_status = 'available' THEN
        INSERT INTO uv_catalog (
            car_id,
            title,
            description,
            make,
            model,
            year,
            mileage_km,
            price_aed,
            body_style,
            url
        ) VALUES (
            NEW.id,
            CONCAT(NEW.model_year, ' ', NEW.vehicle_model),
            COALESCE(NEW.description, CONCAT('Premium ', NEW.model_year, ' ', NEW.vehicle_model, ' in excellent condition')),
            SPLIT_PART(NEW.vehicle_model, ' ', 1), -- Extract make from model
            NEW.vehicle_model,
            NEW.model_year,
            NEW.current_mileage_km,
            NEW.advertised_price_aed,
            COALESCE(NEW.model_family, 'SEDAN'),
            CONCAT('https://your-domain.com/inventory/', NEW.id)
        ) ON CONFLICT (car_id) DO UPDATE SET
            title = EXCLUDED.title,
            description = EXCLUDED.description,
            make = EXCLUDED.make,
            model = EXCLUDED.model,
            year = EXCLUDED.year,
            mileage_km = EXCLUDED.mileage_km,
            price_aed = EXCLUDED.price_aed,
            body_style = EXCLUDED.body_style,
            url = EXCLUDED.url,
            updated_at = NOW();
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS auto_create_uv_catalog_trigger ON cars;
CREATE TRIGGER auto_create_uv_catalog_trigger
    AFTER INSERT OR UPDATE ON cars
    FOR EACH ROW
    EXECUTE FUNCTION auto_create_uv_catalog_entry();

-- Insert existing inventory cars into catalog (safe)
INSERT INTO uv_catalog (
    car_id,
    title,
    description,
    make,
    model,
    year,
    mileage_km,
    price_aed,
    body_style,
    url
)
SELECT 
    c.id,
    CONCAT(c.model_year, ' ', c.vehicle_model),
    COALESCE(c.description, CONCAT('Premium ', c.model_year, ' ', c.vehicle_model, ' in excellent condition')),
    SPLIT_PART(c.vehicle_model, ' ', 1),
    c.vehicle_model,
    c.model_year,
    c.current_mileage_km,
    c.advertised_price_aed,
    COALESCE(c.model_family, 'SEDAN'),
    CONCAT('https://your-domain.com/inventory/', c.id)
FROM cars c 
WHERE c.status = 'inventory' 
  AND c.sale_status = 'available'
ON CONFLICT (car_id) DO NOTHING;

-- Grant permissions (safe)
DO $$ BEGIN
    GRANT ALL ON uv_catalog TO authenticated;
EXCEPTION
    WHEN others THEN null;
END $$;

DO $$ BEGIN
    GRANT ALL ON uv_catalog TO service_role;
EXCEPTION
    WHEN others THEN null;
END $$;

-- Enable RLS (safe)
DO $$ BEGIN
    ALTER TABLE uv_catalog ENABLE ROW LEVEL SECURITY;
EXCEPTION
    WHEN others THEN null;
END $$;

-- Drop and recreate RLS policies (safe)
DROP POLICY IF EXISTS "Enable read access for all users" ON uv_catalog;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON uv_catalog;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON uv_catalog;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON uv_catalog;

CREATE POLICY "Enable read access for all users" ON uv_catalog
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users" ON uv_catalog
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users" ON uv_catalog
    FOR UPDATE USING (true);

CREATE POLICY "Enable delete for authenticated users" ON uv_catalog
    FOR DELETE USING (true);

-- Add helpful comments
DO $$ BEGIN
    COMMENT ON TABLE uv_catalog IS 'UV Catalog management for XML feed generation';
    COMMENT ON COLUMN uv_catalog.catalog_image_url IS 'URL of generated square catalog image (1080x1080)';
    COMMENT ON COLUMN uv_catalog.xml_listing IS 'Generated XML snippet for this specific car';
    COMMENT ON COLUMN uv_catalog.status IS 'Generation status: pending, generating, ready, error';
    COMMENT ON COLUMN uv_catalog.url IS 'Public URL to car details page for XML feed';
EXCEPTION
    WHEN others THEN null;
END $$;

-- Success message
SELECT 'UV Catalog table created successfully!' as result; 