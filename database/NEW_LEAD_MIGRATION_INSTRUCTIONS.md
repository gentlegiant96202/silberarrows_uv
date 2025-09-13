# 🗃️ New Lead Status Migration Instructions

## ⚠️ Important: Two-Step Process Required

Due to PostgreSQL enum limitations, this migration **MUST** be run in **TWO SEPARATE STEPS**.

---

## 📋 Step-by-Step Instructions

### **Step 1: Add the New Enum Value**

1. Open your **Supabase Dashboard**
2. Go to **SQL Editor**
3. Copy and paste **ONLY** this code:

```sql
ALTER TYPE lead_status_enum ADD VALUE 'new_lead';
```

4. **Click "RUN"** to execute
5. ✅ **Wait for completion** before proceeding

---

### **Step 2: Update Everything Else**

1. In the **same SQL Editor** (or new tab)
2. Copy and paste this code:

```sql
-- Update the status check constraint
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_status_check;
ALTER TABLE leads ADD CONSTRAINT leads_status_check 
    CHECK (status IN ('new_lead', 'new_customer', 'negotiation', 'won', 'delivered', 'lost'));

-- Make appointment fields optional (nullable)
ALTER TABLE leads ALTER COLUMN appointment_date DROP NOT NULL;
ALTER TABLE leads ALTER COLUMN time_slot DROP NOT NULL;

-- Change default status to new_lead
ALTER TABLE leads ALTER COLUMN status SET DEFAULT 'new_lead';

-- Add missing columns if they don't exist
ALTER TABLE leads ADD COLUMN IF NOT EXISTS timeline_notes JSONB DEFAULT '[]';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS inventory_car_id UUID;

-- Verify the changes
SELECT unnest(enum_range(NULL::lead_status_enum)) AS available_statuses;
```

3. **Click "RUN"** to execute
4. ✅ You should see the new statuses listed

---

## 🎯 What This Migration Does

- ✅ **Adds "new_lead" status** to your lead workflow
- ✅ **Makes appointment_date optional** (for leads without appointments)
- ✅ **Makes time_slot optional** (for leads without appointments)
- ✅ **Changes default status** to "new_lead"
- ✅ **Adds timeline_notes column** for notes functionality
- ✅ **Adds inventory_car_id column** for car matching

---

## 🔍 Verification

After Step 2, you should see output like:

```
available_statuses
├── new_lead
├── new_customer  
├── negotiation
├── won
├── delivered
└── lost
```

---

## 🚨 If You Get Errors

- **"unsafe use of new value"** → You tried to run both steps together. Run Step 1 first, then Step 2.
- **"column does not exist"** → Ignore this if it's about timeline_notes or inventory_car_id (they're being added).
- **"constraint does not exist"** → This is normal, the constraint is being recreated.

---

## ✅ After Migration

Your database will support:
- **"new_lead"** → Leads without scheduled appointments
- **"new_customer"** → Leads with scheduled appointments  

Your frontend will now work perfectly! 🎉 