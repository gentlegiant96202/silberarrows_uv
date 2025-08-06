# 🚀 Manual Migration: Add Workflow Status

## Quick Fix - Copy and Run in Supabase SQL Editor

**Go to your Supabase Dashboard → SQL Editor → New Query and paste this:**

```sql
-- ================================
-- ADD WORKFLOW STATUS TO CONTRACTS
-- ================================

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

-- 6. UPDATE EXISTING CONTRACTS TO HAVE WORKFLOW STATUS
-- Set existing active contracts to 'card_issued' workflow status
UPDATE service_contracts 
SET workflow_status = 'card_issued' 
WHERE status = 'active';

UPDATE warranty_contracts 
SET workflow_status = 'card_issued' 
WHERE status = 'active';

-- 7. RECREATE VIEWS (they will be recreated automatically by the app)
-- The views will be recreated when you restart your Next.js application
```

## ✅ After Running the Migration

1. **Check the results** - You should see success messages
2. **Refresh your service page** - The errors should be gone
3. **Test the workflow filter** - Click the filter icon in the Workflow column

## 🎯 New Workflow Status Options

- **Created** → Initial state when contract is created
- **Sent for Signing** → When contract is sent to customer  
- **Card Issued** → Final state when service card is issued

The filter icon shows: `C` / `S` / `I` for each status respectively.

---

**📝 Note**: This migration adds the `workflow_status` column to both `service_contracts` and `warranty_contracts` tables with the new 3-stage workflow you requested. 