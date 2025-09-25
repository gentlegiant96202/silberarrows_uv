# 🔧 Fix Inventory Enum Issue - Step by Step

## Problem
The error `unsafe use of new value "inventory" of enum type` occurs because PostgreSQL requires enum values to be added in separate transactions.

## ✅ Solution: 3-Step Process

### **Step 1: Add Enum Value ONLY**
**Copy and paste ONLY this line in Supabase SQL Editor:**

```sql
ALTER TYPE leasing_vehicle_status_enum ADD VALUE IF NOT EXISTS 'inventory';
```

**Click "RUN" and wait for success message**

---

### **Step 2: Verify Enum (Wait 30 seconds after Step 1)**
**Copy and paste this in a NEW SQL query:**

```sql
SELECT unnest(enum_range(NULL::leasing_vehicle_status_enum)) as available_statuses;
```

**You should see 'inventory' in the list**

---

### **Step 3: Test Database Access**
**Copy and paste this in a NEW SQL query:**

```sql
SELECT COUNT(*) as inventory_count 
FROM leasing_inventory 
WHERE status = 'inventory';
```

**This should return 0 (not an error)**

---

### **Step 4: Re-enable Frontend Column**
**In the file `LeasingInventoryBoard.tsx` around line 199:**

**Change FROM:**
```javascript
// { key: 'inventory', delay: 80, statusFilter: 'inventory' },
```

**Change TO:**
```javascript
{ key: 'inventory', delay: 80, statusFilter: 'inventory' },
```

---

## ⚠️ Important Notes

1. **Run each step separately** - Don't combine SQL statements
2. **Wait between steps** - Let each transaction complete
3. **Use NEW SQL tabs** - Don't reuse the same query window
4. **Check for success** - Verify each step works before proceeding

## 🎯 Expected Result

After all steps:
- ✅ Inventory column appears in Kanban board
- ✅ No console errors
- ✅ Can drag vehicles to inventory status
- ✅ Purple "INVENTORY" badges display correctly
