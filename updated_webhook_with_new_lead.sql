-- UPDATED WEBHOOK FUNCTION - Adds new lead creation with car scenario
-- Run this in Supabase SQL Editor to update your webhook function

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
  -- Use NEW record (current values)
  lead_row := row_to_json(NEW.*)::jsonb;

  -- Transform phone number: concatenate country_code + phone_number
  payload := (lead_row - 'country_code' - 'phone_number')
             || jsonb_build_object(
                  'phone_number',
                  COALESCE(lead_row->>'country_code', '') || COALESCE(lead_row->>'phone_number', '')
                );

  -- Format appointment date in words (e.g., "24th Jan 2025") if exists
  IF NEW.appointment_date IS NOT NULL THEN
    formatted_appointment_date := to_char(NEW.appointment_date, 'DDth Mon YYYY');
    payload := payload || jsonb_build_object('appointment_date_formatted', formatted_appointment_date);
  END IF;

  -- Format time slot with AM/PM (e.g., "2:30 PM") if exists
  IF NEW.time_slot IS NOT NULL THEN
    payload := payload || jsonb_build_object('time_slot_formatted', to_char(NEW.time_slot, 'HH12:MI AM'));
  END IF;

  -- Fetch simplified car data if linked to inventory
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
    IF car_data IS NOT NULL AND car_data->>'full_model' IS NOT NULL THEN
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

  -- DETERMINE EVENT TYPE BASED ON OPERATION AND DATA
  IF TG_OP = 'INSERT' THEN
    -- NEW LEAD SCENARIOS
    IF car_data IS NOT NULL THEN
      -- New lead created with car selected
      event_type_name := 'lead_created_with_vehicle';
    ELSE
      -- New lead created without car (skip webhook for now)
      RETURN NEW;
    END IF;
    
  ELSIF TG_OP = 'UPDATE' THEN
    -- APPOINTMENT UPDATE SCENARIOS
    -- Skip if only status changed (card movement)
    IF (OLD.appointment_date IS NOT DISTINCT FROM NEW.appointment_date) AND 
       (OLD.time_slot IS NOT DISTINCT FROM NEW.time_slot) THEN
      RETURN NEW; -- Don't fire webhook for status-only changes
    END IF;
    
    -- Appointment date/time was added or changed
    IF car_data IS NOT NULL THEN
      event_type_name := 'appointment_created_with_vehicle';
    ELSE
      event_type_name := 'appointment_created_without_vehicle';
    END IF;
  END IF;

  -- Add event type and timestamp to payload
  payload := payload || jsonb_build_object(
    'event_type', event_type_name,
    'timestamp', NOW(),
    'webhook_version', '2.2'
  );

  -- POST to BotHook with enhanced payload
  resp := net.http_post(
           url     := 'https://bothook.io/v1/public/triggers/webhooks/dbfef251-3fe9-4853-ba29-cd66cdd98e58',
           headers := jsonb_build_object('Content-Type', 'application/json'),
           body    := payload
         );

  -- Log non-200 responses
  IF (resp->>'status')::int >= 300 THEN
    INSERT INTO public.webhook_errors(raw_response, failed_at) 
    VALUES(resp, NOW());
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- The trigger already exists, so no need to recreate it
-- Verify the function was updated
SELECT 'Webhook function updated successfully' as status; 