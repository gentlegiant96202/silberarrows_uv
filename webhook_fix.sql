-- Fix Webhook Configuration
-- Run these commands in your Supabase SQL Editor

-- Step 1: Drop the duplicate trigger
DROP TRIGGER IF EXISTS trg_lead_webhook ON leads;

-- Step 2: Make sure we have the correct send_lead_webhook function
CREATE OR REPLACE FUNCTION public.send_lead_webhook()
RETURNS TRIGGER AS $$
DECLARE
  payload  jsonb;
  pdf_url  text;
  formatted_date text;
BEGIN
  /* start with full NEW row */
  payload := to_jsonb(NEW);

  /* Format appointment_date from YYYY-MM-DD to DD-MM-YYYY */
  IF NEW.appointment_date IS NOT NULL THEN
    formatted_date := to_char(NEW.appointment_date, 'DD-MM-YYYY');
    payload := payload || jsonb_build_object('appointment_date_formatted', formatted_date);
  END IF;

  /* overwrite phone_number with concatenated value and drop country_code */
  payload := (payload - 'country_code' - 'phone_number')
             || jsonb_build_object(
                  'phone_number',
                  COALESCE(NEW.country_code, '') || COALESCE(NEW.phone_number, '')
                );

  /* add PDF url if lead is linked to a car */
  IF NEW.inventory_car_id IS NOT NULL THEN
    SELECT vehicle_details_pdf_url
    INTO   pdf_url
    FROM   public.cars
    WHERE  id = NEW.inventory_car_id;

    payload := payload || jsonb_build_object('inventory_pdf_url', pdf_url);
  END IF;

  /* POST the payload */
  PERFORM net.http_post(
           url     := 'https://bothook.io/v1/public/triggers/webhooks/dbfef251-3fe9-4853-ba29-cd66cdd98e58',
           headers := jsonb_build_object('Content-Type','application/json'),
           body    := payload
         );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Verify the correct trigger exists and check configuration
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'trg_leads_webhook' AND event_object_table = 'leads';

-- Step 4: Test the webhook with a sample update (optional)
-- Uncomment the next line to test with an existing lead
-- UPDATE leads SET appointment_date = appointment_date WHERE id = (SELECT id FROM leads LIMIT 1); 