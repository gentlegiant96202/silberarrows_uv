-- Create the missing trigger for the webhook function
-- Run this in your Supabase SQL Editor

-- Create the trigger that calls send_lead_webhook function
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
WHERE event_object_table = 'leads'
ORDER BY trigger_name; 