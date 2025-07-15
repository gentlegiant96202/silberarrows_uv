-- Quick migration script for Supabase SQL Editor
-- Copy and paste this entire script into the Supabase SQL Editor and run it

-- 1. Create lead_status_history table
CREATE TABLE IF NOT EXISTS lead_status_history (
  id SERIAL PRIMARY KEY,
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,
  changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  changed_by TEXT,
  duration_in_previous_status INTEGER,
  notes TEXT
);

-- 2. Create indexes
CREATE INDEX IF NOT EXISTS idx_lead_status_history_lead_id ON lead_status_history(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_status_history_changed_at ON lead_status_history(changed_at);
CREATE INDEX IF NOT EXISTS idx_lead_status_history_status ON lead_status_history(from_status, to_status);

-- 3. Create trigger function
CREATE OR REPLACE FUNCTION track_lead_status_change()
RETURNS TRIGGER AS $$
DECLARE
  previous_change_time TIMESTAMP;
  duration_seconds INTEGER;
BEGIN
  -- Only proceed if status actually changed
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- Get the timestamp of the last status change for this lead
    SELECT changed_at INTO previous_change_time
    FROM lead_status_history
    WHERE lead_id = NEW.id
    ORDER BY changed_at DESC
    LIMIT 1;

    -- Calculate duration in previous status
    IF previous_change_time IS NOT NULL THEN
      duration_seconds := EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - previous_change_time))::INTEGER;
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
      OLD.status,
      NEW.status,
      CURRENT_TIMESTAMP,
      duration_seconds
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Create trigger
DROP TRIGGER IF EXISTS lead_status_change_trigger ON leads;
CREATE TRIGGER lead_status_change_trigger
  AFTER UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION track_lead_status_change();

-- 5. Create conversion funnel view
CREATE OR REPLACE VIEW lead_conversion_funnel AS
SELECT 
  from_status,
  to_status,
  COUNT(*) as conversion_count,
  AVG(duration_in_previous_status) as avg_duration_seconds
FROM lead_status_history
WHERE from_status IS NOT NULL
GROUP BY from_status, to_status
ORDER BY from_status, to_status;

-- 6. Create get_funnel_metrics function
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
    SELECT 
      h.to_status as stage,
      COUNT(*) as entered
    FROM lead_status_history h
    WHERE h.changed_at::DATE BETWEEN start_date AND end_date
    GROUP BY h.to_status
  ),
  stage_exits AS (
    SELECT 
      h.from_status as stage,
      COUNT(*) as exited
    FROM lead_status_history h
    WHERE h.changed_at::DATE BETWEEN start_date AND end_date
    AND h.from_status IS NOT NULL
    GROUP BY h.from_status
  ),
  current_counts AS (
    SELECT 
      l.status as stage,
      COUNT(*) as current_count
    FROM leads l
    GROUP BY l.status
  ),
  stage_durations AS (
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
  WHERE COALESCE(se.stage, sx.stage, cc.stage, sd.stage) IS NOT NULL
  ORDER BY 
    CASE COALESCE(se.stage, sx.stage, cc.stage, sd.stage)
      WHEN 'New Customer' THEN 1
      WHEN 'Negotiation' THEN 2
      WHEN 'Reserved' THEN 3
      WHEN 'Delivered' THEN 4
      WHEN 'Lost Lead' THEN 5
      ELSE 6
    END;
END;
$$ LANGUAGE plpgsql;

-- 7. Test the function (optional)
-- SELECT * FROM get_funnel_metrics((CURRENT_DATE - INTERVAL '30 days')::DATE, CURRENT_DATE);

-- Migration completed successfully! 