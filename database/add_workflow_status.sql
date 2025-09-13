-- ================================
-- ADD WORKFLOW STATUS TO CONTRACTS
-- ================================
-- Adds manual workflow status tracking to service and warranty contracts

-- 1. DROP EXISTING VIEWS FIRST (to avoid conflicts)
DROP VIEW IF EXISTS active_service_contracts CASCADE;
DROP VIEW IF EXISTS active_warranty_contracts CASCADE;

-- 2. CREATE WORKFLOW STATUS ENUM
CREATE TYPE workflow_status_enum AS ENUM (
    'created',
    'sent_for_signing', 
    'card_issued'
);

-- 3. ADD WORKFLOW STATUS COLUMN TO SERVICE CONTRACTS
ALTER TABLE service_contracts 
ADD COLUMN workflow_status workflow_status_enum NOT NULL DEFAULT 'created';

-- 4. ADD WORKFLOW STATUS COLUMN TO WARRANTY CONTRACTS  
ALTER TABLE warranty_contracts 
ADD COLUMN workflow_status workflow_status_enum NOT NULL DEFAULT 'created';

-- 5. CREATE INDEXES FOR PERFORMANCE
CREATE INDEX idx_service_contracts_workflow ON service_contracts(workflow_status);
CREATE INDEX idx_warranty_contracts_workflow ON warranty_contracts(workflow_status);

-- 6. UPDATE EXISTING CONTRACTS TO HAVE WORKFLOW STATUS BASED ON CURRENT STATUS
-- Set existing active contracts to 'card_issued' workflow status
UPDATE service_contracts 
SET workflow_status = 'card_issued' 
WHERE status = 'active';

UPDATE warranty_contracts 
SET workflow_status = 'card_issued' 
WHERE status = 'active';

-- 7. RECREATE VIEWS TO INCLUDE WORKFLOW STATUS
CREATE OR REPLACE VIEW active_service_contracts AS
SELECT 
    sc.*,
    CASE 
        WHEN sc.end_date < CURRENT_DATE THEN 'Expired'
        WHEN sc.end_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'Expiring Soon'
        ELSE 'Active'
    END as contract_health,
    (sc.end_date - CURRENT_DATE) as days_until_expiry
FROM service_contracts sc
WHERE sc.status != 'cancelled'
ORDER BY sc.end_date;

CREATE OR REPLACE VIEW active_warranty_contracts AS
SELECT 
    wc.*,
    CASE 
        WHEN wc.end_date < CURRENT_DATE THEN 'Expired'
        WHEN wc.end_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'Expiring Soon'
        ELSE 'Active'
    END as warranty_health,
    (wc.end_date - CURRENT_DATE) as days_until_expiry
FROM warranty_contracts wc
WHERE wc.status != 'cancelled'
ORDER BY wc.end_date;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Workflow status added successfully!';
    RAISE NOTICE 'New field: workflow_status with values: created, sent_for_signing, card_issued';
    RAISE NOTICE 'Existing active contracts updated to card_issued workflow status';
    RAISE NOTICE 'Views updated to exclude cancelled contracts';
END
$$; 