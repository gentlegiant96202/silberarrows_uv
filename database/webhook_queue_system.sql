-- Webhook Queue System for Appointment Events
-- Run this in Supabase SQL Editor

-- 1. Create webhook queue table
CREATE TABLE IF NOT EXISTS webhook_queue (
  id SERIAL PRIMARY KEY,
  event_type TEXT NOT NULL,           -- 'appointment_created_with_vehicle' or 'appointment_created_without_vehicle'
  table_name TEXT NOT NULL DEFAULT 'leads',
  record_id UUID NOT NULL,            -- Lead ID
  payload JSONB NOT NULL,             -- Essential appointment fields
  created_at TIMESTAMP DEFAULT NOW(),
  processed BOOLEAN DEFAULT FALSE,
  processed_at TIMESTAMP,
  error_message TEXT
);

-- 2. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_webhook_queue_processed ON webhook_queue(processed);
CREATE INDEX IF NOT EXISTS idx_webhook_queue_created_at ON webhook_queue(created_at);

-- 3. Create function to queue appointment webhooks
CREATE OR REPLACE FUNCTION queue_appointment_webhook()
RETURNS TRIGGER AS $$
DECLARE
  event_type_name TEXT;
  webhook_payload JSONB;
BEGIN
  -- Handle INSERT (new appointment)
  IF TG_OP = 'INSERT' THEN
    -- Determine event type based on car_pdf_url
    IF NEW.car_pdf_url IS NOT NULL AND NEW.car_pdf_url != '' THEN
      event_type_name := 'appointment_created_with_vehicle';
    ELSE
      event_type_name := 'appointment_created_without_vehicle';
    END IF;
    
    -- Build payload with essential appointment fields
    webhook_payload := jsonb_build_object(
      'event_type', event_type_name,
      'timestamp', NOW(),
      'data', jsonb_build_object(
        'lead_id', NEW.id,
        'customer_name', NEW.full_name,
        'phone', NEW.country_code || NEW.phone_number,
        'appointment_date', NEW.appointment_date,
        'appointment_time', NEW.time_slot,
        'model_of_interest', NEW.model_of_interest,
        'car_pdf_url', CASE WHEN NEW.car_pdf_url IS NOT NULL AND NEW.car_pdf_url != '' 
                            THEN NEW.car_pdf_url 
                            ELSE NULL 
                       END
      )
    );
    
    -- Queue the webhook
    INSERT INTO webhook_queue (event_type, record_id, payload)
    VALUES (event_type_name, NEW.id, webhook_payload);
    
    RETURN NEW;
  END IF;
  
  -- Handle UPDATE (appointment changes)
  IF TG_OP = 'UPDATE' THEN
    -- Only process if appointment date or time changed
    IF (OLD.appointment_date IS DISTINCT FROM NEW.appointment_date) OR 
       (OLD.time_slot IS DISTINCT FROM NEW.time_slot) THEN
      
      -- Determine event type based on current car_pdf_url
      IF NEW.car_pdf_url IS NOT NULL AND NEW.car_pdf_url != '' THEN
        event_type_name := 'appointment_created_with_vehicle';
      ELSE
        event_type_name := 'appointment_created_without_vehicle';
      END IF;
      
      -- Build payload for rescheduled appointment
      webhook_payload := jsonb_build_object(
        'event_type', event_type_name,
        'timestamp', NOW(),
        'data', jsonb_build_object(
          'lead_id', NEW.id,
          'customer_name', NEW.full_name,
          'phone', NEW.country_code || NEW.phone_number,
          'appointment_date', NEW.appointment_date,
          'appointment_time', NEW.time_slot,
          'model_of_interest', NEW.model_of_interest,
          'car_pdf_url', CASE WHEN NEW.car_pdf_url IS NOT NULL AND NEW.car_pdf_url != '' 
                              THEN NEW.car_pdf_url 
                              ELSE NULL 
                         END,
          'previous_appointment_date', OLD.appointment_date,
          'previous_appointment_time', OLD.time_slot
        )
      );
      
      -- Queue the webhook
      INSERT INTO webhook_queue (event_type, record_id, payload)
      VALUES (event_type_name, NEW.id, webhook_payload);
    END IF;
    
    RETURN NEW;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 4. Create trigger for real-time webhook queueing
DROP TRIGGER IF EXISTS appointment_webhook_trigger ON leads;
CREATE TRIGGER appointment_webhook_trigger
  AFTER INSERT OR UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION queue_appointment_webhook();

-- 5. Create function to process webhook queue (calls external webhook)
CREATE OR REPLACE FUNCTION process_webhook_queue()
RETURNS INTEGER AS $$
DECLARE
  webhook_record RECORD;
  response_status INTEGER;
  processed_count INTEGER := 0;
BEGIN
  -- Process unprocessed webhooks
  FOR webhook_record IN 
    SELECT * FROM webhook_queue 
    WHERE processed = FALSE 
    ORDER BY created_at ASC 
    LIMIT 100
  LOOP
    BEGIN
      -- Call external webhook using pg_net extension
      SELECT status INTO response_status
      FROM net.http_post(
        url := 'YOUR_EXTERNAL_WEBHOOK_URL_HERE', -- Replace with your actual webhook URL
        headers := '{"Content-Type": "application/json"}'::jsonb,
        body := webhook_record.payload
      );
      
      -- Mark as processed if successful (2xx status)
      IF response_status >= 200 AND response_status < 300 THEN
        UPDATE webhook_queue 
        SET processed = TRUE, processed_at = NOW() 
        WHERE id = webhook_record.id;
        processed_count := processed_count + 1;
      ELSE
        -- Mark error for failed webhooks
        UPDATE webhook_queue 
        SET error_message = 'HTTP ' || response_status
        WHERE id = webhook_record.id;
      END IF;
      
    EXCEPTION WHEN OTHERS THEN
      -- Handle any errors
      UPDATE webhook_queue 
      SET error_message = SQLERRM
      WHERE id = webhook_record.id;
    END;
  END LOOP;
  
  RETURN processed_count;
END;
$$ LANGUAGE plpgsql;

-- 6. Optional: Create a cron job to process queue every minute (backup for real-time)
-- You can set this up in Supabase Dashboard > Extensions > pg_cron
-- SELECT cron.schedule('process-webhooks', '* * * * *', 'SELECT process_webhook_queue();');

-- 7. Test the system
-- This will show you what gets queued when you create/update appointments
-- SELECT * FROM webhook_queue ORDER BY created_at DESC LIMIT 10; 