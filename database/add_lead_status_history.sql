-- Add lead status history tracking for conversion funnel analysis
-- Run this in your Supabase SQL Editor

-- Step 1: Create lead_status_history table to track all status changes
CREATE TABLE IF NOT EXISTS lead_status_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    from_status TEXT,
    to_status TEXT NOT NULL,
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    changed_by UUID, -- Could reference auth.users if needed
    notes TEXT,
    duration_in_previous_status INTEGER, -- seconds spent in previous status
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Step 2: Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_lead_status_history_lead_id ON lead_status_history(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_status_history_changed_at ON lead_status_history(changed_at);
CREATE INDEX IF NOT EXISTS idx_lead_status_history_to_status ON lead_status_history(to_status);
CREATE INDEX IF NOT EXISTS idx_lead_status_history_from_to ON lead_status_history(from_status, to_status);

-- Step 3: Create function to track status changes
CREATE OR REPLACE FUNCTION track_lead_status_change()
RETURNS TRIGGER AS $$
DECLARE
    previous_entry RECORD;
    duration_seconds INTEGER;
BEGIN
    -- Only track if status actually changed
    IF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) OR TG_OP = 'INSERT' THEN
        
        -- Calculate duration in previous status for updates
        duration_seconds := NULL;
        IF TG_OP = 'UPDATE' THEN
            -- Get the most recent status history entry for this lead
            SELECT * INTO previous_entry 
            FROM lead_status_history 
            WHERE lead_id = NEW.id 
            ORDER BY changed_at DESC 
            LIMIT 1;
            
            -- Calculate duration if we have a previous entry
            IF previous_entry.id IS NOT NULL THEN
                duration_seconds := EXTRACT(EPOCH FROM (NOW() - previous_entry.changed_at))::INTEGER;
            END IF;
        END IF;
        
        -- Insert the status change record
        INSERT INTO lead_status_history (
            lead_id,
            from_status,
            to_status,
            changed_at,
            duration_in_previous_status
        ) VALUES (
            NEW.id,
            CASE WHEN TG_OP = 'UPDATE' THEN OLD.status ELSE NULL END,
            NEW.status,
            NOW(),
            duration_seconds
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Create trigger to automatically track status changes
DROP TRIGGER IF EXISTS trg_track_lead_status_change ON leads;
CREATE TRIGGER trg_track_lead_status_change
    AFTER INSERT OR UPDATE ON leads
    FOR EACH ROW
    EXECUTE FUNCTION track_lead_status_change();

-- Step 5: Populate initial history for existing leads
INSERT INTO lead_status_history (lead_id, from_status, to_status, changed_at)
SELECT 
    id,
    NULL as from_status,
    status as to_status,
    created_at as changed_at
FROM leads
WHERE id NOT IN (SELECT DISTINCT lead_id FROM lead_status_history);

-- Step 6: Create view for conversion analysis
CREATE OR REPLACE VIEW lead_conversion_funnel AS
WITH status_flows AS (
    SELECT 
        from_status,
        to_status,
        COUNT(*) as transition_count,
        AVG(duration_in_previous_status) as avg_duration_seconds
    FROM lead_status_history 
    WHERE from_status IS NOT NULL
    GROUP BY from_status, to_status
),
status_totals AS (
    SELECT 
        from_status,
        SUM(transition_count) as total_from_status
    FROM status_flows
    GROUP BY from_status
)
SELECT 
    sf.from_status,
    sf.to_status,
    sf.transition_count,
    sf.avg_duration_seconds,
    ROUND((sf.transition_count::DECIMAL / st.total_from_status) * 100, 2) as conversion_rate_percent
FROM status_flows sf
JOIN status_totals st ON sf.from_status = st.from_status
ORDER BY sf.from_status, sf.transition_count DESC;

-- Step 7: Create function to get funnel metrics for a time period
CREATE OR REPLACE FUNCTION get_funnel_metrics(
    start_date DATE DEFAULT (CURRENT_DATE - INTERVAL '30 days')::DATE,
    end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
    stage TEXT,
    total_entered INTEGER,
    total_exited INTEGER,
    currently_in_stage INTEGER,
    avg_time_in_stage INTERVAL,
    conversion_to_next DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    WITH stage_entries AS (
        -- Count leads entering each stage
        SELECT 
            h.to_status as stage,
            COUNT(*) as entered
        FROM lead_status_history h
        WHERE h.changed_at::DATE BETWEEN start_date AND end_date
        GROUP BY h.to_status
    ),
    stage_exits AS (
        -- Count leads exiting each stage
        SELECT 
            h.from_status as stage,
            COUNT(*) as exited
        FROM lead_status_history h
        WHERE h.changed_at::DATE BETWEEN start_date AND end_date
        AND h.from_status IS NOT NULL
        GROUP BY h.from_status
    ),
    current_counts AS (
        -- Count leads currently in each stage
        SELECT 
            l.status as stage,
            COUNT(*) as current_count
        FROM leads l
        GROUP BY l.status
    ),
    stage_durations AS (
        -- Average time spent in each stage
        SELECT 
            h.from_status as stage,
            AVG(h.duration_in_previous_status) as avg_seconds
        FROM lead_status_history h
        WHERE h.duration_in_previous_status IS NOT NULL
        AND h.changed_at::DATE BETWEEN start_date AND end_date
        GROUP BY h.from_status
    )
    SELECT 
        COALESCE(se.stage, sx.stage, cc.stage, sd.stage) as stage,
        COALESCE(se.entered, 0) as total_entered,
        COALESCE(sx.exited, 0) as total_exited,
        COALESCE(cc.current_count, 0) as currently_in_stage,
        CASE 
            WHEN sd.avg_seconds IS NOT NULL 
            THEN (sd.avg_seconds || ' seconds')::INTERVAL 
            ELSE NULL 
        END as avg_time_in_stage,
        CASE 
            WHEN se.entered > 0 
            THEN ROUND((sx.exited::DECIMAL / se.entered) * 100, 2)
            ELSE 0 
        END as conversion_to_next
    FROM stage_entries se
    FULL OUTER JOIN stage_exits sx ON se.stage = sx.stage
    FULL OUTER JOIN current_counts cc ON COALESCE(se.stage, sx.stage) = cc.stage
    FULL OUTER JOIN stage_durations sd ON COALESCE(se.stage, sx.stage) = sd.stage
    ORDER BY 
        CASE COALESCE(se.stage, sx.stage, cc.stage, sd.stage)
            WHEN 'new_customer' THEN 1
            WHEN 'negotiation' THEN 2
            WHEN 'won' THEN 3
            WHEN 'delivered' THEN 4
            WHEN 'lost' THEN 5
            ELSE 6
        END;
END;
$$ LANGUAGE plpgsql;

-- Step 8: Add comments for documentation
COMMENT ON TABLE lead_status_history IS 'Tracks all lead status changes for conversion funnel analysis';
COMMENT ON COLUMN lead_status_history.duration_in_previous_status IS 'Time spent in previous status (seconds)';
COMMENT ON VIEW lead_conversion_funnel IS 'Shows conversion rates between lead statuses';
COMMENT ON FUNCTION get_funnel_metrics IS 'Returns comprehensive funnel metrics for a date range';

-- Step 9: Test the new functions
SELECT * FROM get_funnel_metrics((CURRENT_DATE - INTERVAL '30 days')::DATE, CURRENT_DATE);

-- Step 10: View conversion flows
SELECT * FROM lead_conversion_funnel; 