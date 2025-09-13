-- Enhanced webhook trigger with simplified car details and formatted appointment date
-- Run this in Supabase SQL Editor

CREATE OR REPLACE FUNCTION public.send_lead_webhook()
RETURNS TRIGGER AS $$
DECLARE
  lead_row jsonb;
  car_data jsonb;
  payload  jsonb;
  resp     jsonb;
  event_type_name text;
  make_part text;
  model_part text;
  formatted_appointment_date text;
BEGIN
  -- Only fire on INSERT or appointment-related UPDATE
  IF TG_OP = 'UPDATE' THEN
    -- Skip if only status changed (card movement)
    IF (OLD.appointment_date IS NOT DISTINCT FROM NEW.appointment_date) AND 
       (OLD.time_slot IS NOT DISTINCT FROM NEW.time_slot) THEN
      RETURN NEW; -- Don't fire webhook
    END IF;
  END IF;

  -- Use NEW record (current values)
  lead_row := row_to_json(NEW.*)::jsonb;

  -- Transform phone number: concatenate country_code + phone_number
  payload := (lead_row - 'country_code' - 'phone_number')
             || jsonb_build_object(
                  'phone_number',
                  COALESCE(lead_row->>'country_code', '') || COALESCE(lead_row->>'phone_number', '')
                );

  -- Format appointment date in words (e.g., "24th Jan 2025")
  IF NEW.appointment_date IS NOT NULL THEN
    formatted_appointment_date := to_char(NEW.appointment_date, 'DDth Mon YYYY');
    payload := payload || jsonb_build_object('appointment_date_formatted', formatted_appointment_date);
  END IF;

  -- Format time slot with AM/PM (e.g., "2:30 PM")
  IF NEW.time_slot IS NOT NULL THEN
    payload := payload || jsonb_build_object('time_slot_formatted', to_char(NEW.time_slot, 'HH12:MI AM'));
  END IF;

  -- Fetch simplified car data if linked to inventory (only model year and model name)
  car_data := NULL;
  IF payload ? 'inventory_car_id' AND payload->>'inventory_car_id' IS NOT NULL THEN
    SELECT jsonb_build_object(
      'stock_number', c.stock_number,
      'model_year', c.model_year,
      'full_model', c.vehicle_model,
      'vehicle_details_pdf_url', c.vehicle_details_pdf_url
    ) INTO car_data
    FROM public.cars c
    WHERE c.id = (payload->>'inventory_car_id')::uuid
    LIMIT 1;
    
    -- Parse make and model from vehicle_model field
    -- Examples: "MERCEDES-BENZ C-CLASS" -> make: "MERCEDES-BENZ", model: "C-CLASS"
    --           "BMW X5" -> make: "BMW", model: "X5"
    IF car_data IS NOT NULL AND car_data->>'full_model' IS NOT NULL THEN
      -- Split on first space or hyphen after the first word group
      -- This handles "MERCEDES-BENZ C-CLASS", "BMW X5", "AUDI A4", etc.
      IF car_data->>'full_model' ~ '^\S+(-\S+)?\s+' THEN
        make_part := (regexp_match(car_data->>'full_model', '^(\S+(?:-\S+)?)\s+'))[1];
        model_part := trim(regexp_replace(car_data->>'full_model', '^(\S+(?:-\S+)?)\s+', ''));
      ELSE
        -- Fallback: treat entire string as model if no clear separation
        make_part := split_part(car_data->>'full_model', ' ', 1);
        model_part := car_data->>'full_model';
      END IF;
      
      -- Create simplified car_details with only essential info
      car_data := jsonb_build_object(
        'stock_number', car_data->>'stock_number',
        'model_year', car_data->>'model_year',
        'model_name', COALESCE(model_part, car_data->>'full_model'),
        'vehicle_details_pdf_url', car_data->>'vehicle_details_pdf_url'
      );
    END IF;
    
    -- Add simplified car_details to payload
    payload := payload || jsonb_build_object('car_details', car_data);
    
    -- Add legacy inventory_pdf_url for backward compatibility
    IF car_data ? 'vehicle_details_pdf_url' THEN
      payload := payload || jsonb_build_object('inventory_pdf_url', car_data->>'vehicle_details_pdf_url');
    END IF;
  END IF;

  -- Determine event type based on car linkage
  IF car_data IS NOT NULL THEN
    event_type_name := 'appointment_created_with_vehicle';
  ELSE
    event_type_name := 'appointment_created_without_vehicle';
  END IF;

  -- Add event type and timestamp to payload
  payload := payload || jsonb_build_object(
    'event_type', event_type_name,
    'timestamp', NOW(),
    'webhook_version', '2.1'
  );

  -- POST to BotHook with enhanced payload
  resp := net.http_post(
           url     := 'https://bothook.io/v1/public/triggers/webhooks/dbfef251-3fe9-4853-ba29-cd66cdd98e58',
           headers := jsonb_build_object('Content-Type', 'application/json'),
           body    := payload
         );

  -- Log non-200 responses (optional)
  IF (resp->>'status')::int >= 300 THEN
    -- Create webhook_errors table if it doesn't exist
    CREATE TABLE IF NOT EXISTS public.webhook_errors (
      id SERIAL PRIMARY KEY,
      raw_response jsonb,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    INSERT INTO public.webhook_errors(raw_response) VALUES(resp);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger and recreate with the enhanced function
DROP TRIGGER IF EXISTS trg_leads_webhook ON public.leads;
DROP TRIGGER IF EXISTS trg_lead_webhook ON public.leads;

-- Create the trigger
CREATE TRIGGER trg_leads_webhook
    AFTER INSERT OR UPDATE ON public.leads
    FOR EACH ROW
    EXECUTE FUNCTION public.send_lead_webhook();

-- Verify the trigger was created
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'leads' AND trigger_name = 'trg_leads_webhook'
ORDER BY trigger_name;

-- Test data structure (comment this out after reviewing)
/*
Example payload structure this will now generate:

{
  "id": "uuid-here",
  "full_name": "John Doe",
  "phone_number": "+971501234567",
  "status": "new_customer",
  "model_of_interest": "C-CLASS",
  "max_age": "2yrs",
  "payment_type": "monthly",
  "monthly_budget": 3500,
  "total_budget": 150000,
  "appointment_date": "2024-01-15",
  "time_slot": "10:00:00",
  "appointment_date_formatted": "15th Jan 2024",
  "time_slot_formatted": "10:00 AM",
  "notes": "Customer notes here",
  "inventory_car_id": "car-uuid-here",
  "car_details": {
    "stock_number": "ABC123",
    "model_year": 2023,
    "model_name": "C-CLASS",
    "vehicle_details_pdf_url": "https://storage-url/car-pdf.pdf"
  },
  "inventory_pdf_url": "https://storage-url/car-pdf.pdf",
  "event_type": "appointment_created_with_vehicle",
  "timestamp": "2024-01-15T10:30:00Z",
  "webhook_version": "2.1"
}
*/ 