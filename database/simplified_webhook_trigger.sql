-- Simplified webhook trigger - only sends current values
-- Run this in Supabase SQL Editor

CREATE OR REPLACE FUNCTION public.send_lead_webhook()
RETURNS TRIGGER AS $$
DECLARE
  lead_row jsonb;
  pdf_url  text;
  payload  jsonb;
  resp     jsonb;
  event_type_name text;
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

  -- Fetch vehicle_details_pdf_url from linked car (if any)
  pdf_url := NULL;
  IF payload ? 'inventory_car_id' AND payload->>'inventory_car_id' IS NOT NULL THEN
    SELECT vehicle_details_pdf_url
      INTO pdf_url
    FROM public.cars
    WHERE id = (payload->>'inventory_car_id')::uuid
    LIMIT 1;
    
    payload := payload || jsonb_build_object('inventory_pdf_url', COALESCE(pdf_url, NULL));
  END IF;

  -- Determine event type based on PDF URL availability
  IF pdf_url IS NOT NULL AND pdf_url != '' THEN
    event_type_name := 'appointment_created_with_vehicle';
  ELSE
    event_type_name := 'appointment_created_without_vehicle';
  END IF;

  -- Add event type and timestamp to payload (no previous values)
  payload := payload || jsonb_build_object(
    'event_type', event_type_name,
    'timestamp', NOW()
  );

  -- POST to BotHook with current values only
  resp := net.http_post(
           url     := 'https://bothook.io/v1/public/triggers/webhooks/dbfef251-3fe9-4853-ba29-cd66cdd98e58',
           headers := jsonb_build_object('Content-Type', 'application/json'),
           body    := payload
         );

  -- Log non-200 responses (optional)
  IF (resp->>'status')::int >= 300 THEN
    INSERT INTO public.webhook_errors(raw_response) VALUES(resp);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql; 