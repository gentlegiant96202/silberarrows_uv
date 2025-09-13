-- Simple UV Catalog Table Creation
-- Run this if the complex migration failed

-- Drop table if it exists (to start fresh)
DROP TABLE IF EXISTS uv_catalog CASCADE;

-- Drop enum if it exists
DROP TYPE IF EXISTS catalog_status CASCADE;

-- Create status enum
CREATE TYPE catalog_status AS ENUM ('pending', 'generating', 'ready', 'error');

-- Create simple UV catalog table
CREATE TABLE uv_catalog (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    car_id UUID NOT NULL UNIQUE REFERENCES cars(id) ON DELETE CASCADE,
    
    -- Basic fields
    title TEXT NOT NULL,
    description TEXT,
    make TEXT NOT NULL,
    model TEXT NOT NULL,
    year INTEGER NOT NULL,
    mileage_km INTEGER,
    price_aed DECIMAL(12,2) NOT NULL,
    
    -- Generated content
    catalog_image_url TEXT,
    status catalog_status DEFAULT 'pending',
    error_message TEXT,
    last_generated_at TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Basic indexes
CREATE INDEX idx_uv_catalog_car_id ON uv_catalog(car_id);
CREATE INDEX idx_uv_catalog_status ON uv_catalog(status);

-- Permissions
GRANT ALL ON uv_catalog TO authenticated;
GRANT ALL ON uv_catalog TO service_role;

-- RLS
ALTER TABLE uv_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations" ON uv_catalog
    FOR ALL USING (true) WITH CHECK (true);

-- Insert existing cars
INSERT INTO uv_catalog (car_id, title, description, make, model, year, mileage_km, price_aed)
SELECT 
    c.id,
    CONCAT(c.model_year, ' ', c.vehicle_model),
    CONCAT('Premium ', c.model_year, ' ', c.vehicle_model),
    SPLIT_PART(c.vehicle_model, ' ', 1),
    c.vehicle_model,
    c.model_year,
    COALESCE(c.current_mileage_km, 0),
    c.advertised_price_aed
FROM cars c 
WHERE c.status = 'inventory' AND c.sale_status = 'available';

-- Success
SELECT 'Simple UV Catalog table created!' as result, COUNT(*) as cars_added FROM uv_catalog; 