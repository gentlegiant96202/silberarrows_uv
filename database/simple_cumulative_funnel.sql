-- SIMPLE CUMULATIVE FUNNEL SETUP
-- Clean, straightforward implementation for tracking lead progression

-- ======================================
-- 1. CREATE STATUS HISTORY TABLE
-- ======================================
CREATE TABLE IF NOT EXISTS lead_status_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    to_status TEXT NOT NULL,
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_lead_status_history_lead_id ON lead_status_history(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_status_history_changed_at ON lead_status_history(changed_at);

-- ======================================
-- 2. CREATE TRIGGER TO AUTO-TRACK STATUS CHANGES
-- ======================================
CREATE OR REPLACE FUNCTION track_status_changes()
RETURNS TRIGGER AS $$
BEGIN
    -- Track any status change (INSERT or UPDATE)
    IF (TG_OP = 'INSERT') OR (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) THEN
        INSERT INTO lead_status_history (lead_id, to_status, changed_at)
        VALUES (NEW.id, NEW.status, NOW());
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS track_lead_status_trigger ON leads;
CREATE TRIGGER track_lead_status_trigger
    AFTER INSERT OR UPDATE ON leads
    FOR EACH ROW
    EXECUTE FUNCTION track_status_changes();

-- ======================================
-- 3. POPULATE EXISTING LEADS
-- ======================================
-- Add current status for all existing leads
INSERT INTO lead_status_history (lead_id, to_status, changed_at)
SELECT 
    id,
    status,
    created_at
FROM leads
WHERE id NOT IN (SELECT DISTINCT lead_id FROM lead_status_history);

-- ======================================
-- 4. CREATE CUMULATIVE FUNNEL FUNCTION
-- ======================================
CREATE OR REPLACE FUNCTION get_cumulative_funnel(
    start_date DATE DEFAULT (CURRENT_DATE - INTERVAL '30 days')::DATE,
    end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
    stage TEXT,
    cumulative_count INTEGER,
    currently_in_stage INTEGER
) AS $$
BEGIN
    RETURN QUERY
    WITH stage_order AS (
        SELECT 'new_lead' as stage, 1 as order_num
        UNION ALL SELECT 'new_customer', 2
        UNION ALL SELECT 'negotiation', 3
        UNION ALL SELECT 'won', 4
        UNION ALL SELECT 'delivered', 5
        UNION ALL SELECT 'lost', 6
    ),
    lead_progression AS (
        -- Find the highest stage each lead reached in the date range
        SELECT DISTINCT
            lsh.lead_id,
            CASE 
                WHEN EXISTS (SELECT 1 FROM lead_status_history lsh2 WHERE lsh2.lead_id = lsh.lead_id AND lsh2.to_status = 'delivered' AND lsh2.changed_at::DATE BETWEEN start_date AND end_date) THEN 5
                WHEN EXISTS (SELECT 1 FROM lead_status_history lsh2 WHERE lsh2.lead_id = lsh.lead_id AND lsh2.to_status = 'won' AND lsh2.changed_at::DATE BETWEEN start_date AND end_date) THEN 4
                WHEN EXISTS (SELECT 1 FROM lead_status_history lsh2 WHERE lsh2.lead_id = lsh.lead_id AND lsh2.to_status = 'negotiation' AND lsh2.changed_at::DATE BETWEEN start_date AND end_date) THEN 3
                WHEN EXISTS (SELECT 1 FROM lead_status_history lsh2 WHERE lsh2.lead_id = lsh.lead_id AND lsh2.to_status = 'new_customer' AND lsh2.changed_at::DATE BETWEEN start_date AND end_date) THEN 2
                WHEN EXISTS (SELECT 1 FROM lead_status_history lsh2 WHERE lsh2.lead_id = lsh.lead_id AND lsh2.to_status = 'new_lead' AND lsh2.changed_at::DATE BETWEEN start_date AND end_date) THEN 1
                ELSE 0
            END as highest_stage_reached
        FROM lead_status_history lsh
        WHERE lsh.changed_at::DATE BETWEEN start_date AND end_date
    ),
    current_counts AS (
        -- Count leads currently in each stage
        SELECT 
            l.status as stage,
            COUNT(*) as current_count
        FROM leads l
        GROUP BY l.status
    )
    SELECT 
        so.stage,
        COALESCE(COUNT(lp.lead_id), 0)::INTEGER as cumulative_count,
        COALESCE(cc.current_count, 0)::INTEGER as currently_in_stage
    FROM stage_order so
    LEFT JOIN lead_progression lp ON lp.highest_stage_reached >= so.order_num
    LEFT JOIN current_counts cc ON so.stage = cc.stage
    WHERE so.stage != 'lost'  -- Handle lost separately if needed
    GROUP BY so.stage, so.order_num, cc.current_count
    ORDER BY so.order_num;
END;
$$ LANGUAGE plpgsql;

-- ======================================
-- 5. TEST THE FUNCTION
-- ======================================
SELECT 'SETUP COMPLETE - Testing funnel function:' as info;
SELECT * FROM get_cumulative_funnel();

SELECT 'Total leads:' as info, COUNT(*) as count FROM leads;
SELECT 'Status history entries:' as info, COUNT(*) as count FROM lead_status_history; 