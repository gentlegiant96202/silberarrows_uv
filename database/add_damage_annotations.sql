-- Add damage annotations support to cars table
-- This stores the damage markers as JSON data

-- Add damage annotations column to cars table
ALTER TABLE cars ADD COLUMN IF NOT EXISTS damage_annotations JSONB DEFAULT '[]'::jsonb;

-- Add visual inspection notes column to cars table
ALTER TABLE cars ADD COLUMN IF NOT EXISTS visual_inspection_notes TEXT;

-- Add index for better performance when querying damage data
CREATE INDEX IF NOT EXISTS idx_cars_damage_annotations ON cars USING gin(damage_annotations);

-- Extend car_media table to support damage report images
ALTER TABLE car_media ADD COLUMN IF NOT EXISTS report_type VARCHAR(50);

-- Add index for damage report queries
CREATE INDEX IF NOT EXISTS idx_car_media_report_type ON car_media(report_type) WHERE report_type IS NOT NULL;

-- Add check constraint to ensure valid report types
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'chk_report_type' 
    AND table_name = 'car_media'
  ) THEN
    ALTER TABLE car_media ADD CONSTRAINT chk_report_type 
      CHECK (report_type IS NULL OR report_type IN ('damage_report', 'inspection_report'));
  END IF;
END
$$;

-- Comment the columns for documentation
COMMENT ON COLUMN cars.damage_annotations IS 'JSON array of damage markers with coordinates, type, severity, and descriptions';
COMMENT ON COLUMN cars.visual_inspection_notes IS 'Free-form text notes from visual inspection of the vehicle';
COMMENT ON COLUMN car_media.report_type IS 'Type of report image: damage_report, inspection_report, etc.';

-- Example damage_annotations structure:
-- [
--   {
--     "id": "dmg_001",
--     "x": 245,
--     "y": 180,
--     "damageType": "S",
--     "severity": "minor", 
--     "description": "Small scratch on front bumper"
--   },
--   {
--     "id": "dmg_002", 
--     "x": 400,
--     "y": 220,
--     "damageType": "D",
--     "severity": "moderate",
--     "description": "Dent on rear quarter panel"
--   },
--   {
--     "id": "dmg_003",
--     "x": 600,
--     "y": 350,
--     "damageType": "RU", 
--     "severity": "major",
--     "description": "Rust on rear panel"
--   }
-- ]
--
-- Example visual_inspection_notes:
-- "VEHICLE DAMAGE ASSESSMENT:
-- 
-- S - SCRATCHED (MINOR): 1 location
--   1. Small scratch on front bumper
-- 
-- D - DENTED (MODERATE): 1 location  
--   1. Dent on rear quarter panel
--
-- RU - RUST (MAJOR): 1 location
--   1. Rust on rear panel
--
-- SUMMARY: 3 total damage markers identified across 3 damage types (S, D, RU)."
