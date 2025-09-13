-- Function to trigger image regeneration when car data changes
CREATE OR REPLACE FUNCTION trigger_car_image_regeneration()
RETURNS TRIGGER AS $$
DECLARE
  webhook_url TEXT;
BEGIN
  -- Only trigger if price-related fields have changed
  IF (OLD.advertised_price_aed IS DISTINCT FROM NEW.advertised_price_aed OR
      OLD.monthly_20_down_aed IS DISTINCT FROM NEW.monthly_20_down_aed OR
      OLD.vehicle_model IS DISTINCT FROM NEW.vehicle_model OR
      OLD.model_year IS DISTINCT FROM NEW.model_year OR
      OLD.current_mileage_km IS DISTINCT FROM NEW.current_mileage_km) THEN
    
    -- Set webhook URL (you'll need to update this with your actual domain)
    webhook_url := 'https://your-domain.com/api/generate-car-image/' || NEW.id::text;
    
    -- Queue the image regeneration (using pg_net if available, or http extension)
    -- This assumes you have the http extension installed
    -- Alternative: Use a queue system like pg-boss or external webhook
    
    PERFORM pg_notify('car_image_regeneration', json_build_object(
      'car_id', NEW.id,
      'action', 'regenerate',
      'webhook_url', webhook_url
    )::text);
    
    -- Clear the old image URL to indicate it needs regeneration
    NEW.xml_image_url := NULL;
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on cars table
DROP TRIGGER IF EXISTS car_image_regeneration_trigger ON cars;
CREATE TRIGGER car_image_regeneration_trigger
  BEFORE UPDATE ON cars
  FOR EACH ROW
  EXECUTE FUNCTION trigger_car_image_regeneration();

-- Alternative webhook approach using Supabase Edge Functions
-- This creates a webhook that can be called from external systems

CREATE OR REPLACE FUNCTION regenerate_car_image_webhook()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger if important fields changed
  IF (OLD.advertised_price_aed IS DISTINCT FROM NEW.advertised_price_aed OR
      OLD.monthly_20_down_aed IS DISTINCT FROM NEW.monthly_20_down_aed OR
      OLD.vehicle_model IS DISTINCT FROM NEW.vehicle_model OR
      OLD.model_year IS DISTINCT FROM NEW.model_year OR
      OLD.current_mileage_km IS DISTINCT FROM NEW.current_mileage_km) THEN
    
    -- Insert into a queue table for background processing
    INSERT INTO car_image_queue (car_id, status, created_at)
    VALUES (NEW.id, 'pending', NOW())
    ON CONFLICT (car_id) 
    DO UPDATE SET 
      status = 'pending',
      created_at = NOW();
      
    -- Clear old image URL
    NEW.xml_image_url := NULL;
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create queue table for background processing
CREATE TABLE IF NOT EXISTS car_image_queue (
  id SERIAL PRIMARY KEY,
  car_id UUID REFERENCES cars(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  UNIQUE(car_id)
);

-- Create index for efficient queue processing
CREATE INDEX IF NOT EXISTS idx_car_image_queue_status ON car_image_queue(status, created_at);

-- Replace the previous trigger with the webhook version
DROP TRIGGER IF EXISTS car_image_regeneration_trigger ON cars;
CREATE TRIGGER car_image_regeneration_webhook_trigger
  BEFORE UPDATE ON cars
  FOR EACH ROW
  EXECUTE FUNCTION regenerate_car_image_webhook(); 