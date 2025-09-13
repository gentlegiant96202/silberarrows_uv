-- Migrate Existing Lead Data to New Workflow
-- Run this AFTER the schema changes

-- 1. Identify leads that should be "new_lead" vs "new_appointment"
-- Leads without complete appointment info become new_lead
UPDATE leads 
SET status = 'new_lead' 
WHERE status = 'new_customer' 
AND (appointment_date IS NULL OR time_slot IS NULL);

-- 2. Leads with complete appointment info stay as new_customer (appointments)
-- (These should keep their current status)

-- 3. Add some sample new_lead data for testing
INSERT INTO leads (
    full_name,
    country_code,
    phone_number,
    status,
    model_of_interest,
    max_age,
    payment_type,
    monthly_budget,
    total_budget,
    appointment_date,
    time_slot,
    timeline_notes
) VALUES 
(
    'HASSAN AL-ZAHRA',
    '+971',
    '506789012',
    'new_lead',
    'GLE',
    '2yrs',
    'monthly',
    4500,
    0,
    NULL,  -- No appointment date
    NULL,  -- No time slot
    '[]'
),
(
    'FATIMA MOHAMMED',
    '+971',
    '507890123',
    'new_lead',
    'C',
    '1yr',
    'cash',
    0,
    180000,
    NULL,  -- No appointment date
    NULL,  -- No time slot
    '[]'
);

-- 4. Verify the migration
SELECT 
    status,
    COUNT(*) as count,
    COUNT(CASE WHEN appointment_date IS NOT NULL AND time_slot IS NOT NULL THEN 1 END) as with_appointments,
    COUNT(CASE WHEN appointment_date IS NULL OR time_slot IS NULL THEN 1 END) as without_appointments
FROM leads 
GROUP BY status
ORDER BY 
    CASE status 
        WHEN 'new_lead' THEN 1
        WHEN 'new_customer' THEN 2
        WHEN 'negotiation' THEN 3
        WHEN 'won' THEN 4
        WHEN 'delivered' THEN 5
        WHEN 'lost' THEN 6
        ELSE 7
    END; 