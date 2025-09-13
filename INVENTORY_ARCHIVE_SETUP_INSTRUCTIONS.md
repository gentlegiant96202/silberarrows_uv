# 🚗 Inventory Archive Functionality Setup Instructions

## Overview
This adds archive functionality to the inventory kanban board (CarKanbanBoard), similar to the CRM and marketing kanbans. Cars can be archived from both "SOLD" and "RETURNED" statuses, and the archive column can be toggled on/off.

## 📋 Database Migration Required

⚠️ **IMPORTANT**: This migration must be run in **TWO SEPARATE STEPS** due to PostgreSQL enum limitations.

### **Step 1: Add the Enum Value**

1. Open your **Supabase Dashboard**
2. Go to **SQL Editor**
3. Copy and paste **ONLY** this code:

```sql
ALTER TYPE car_sale_status ADD VALUE 'archived';
```

4. **Click "RUN"** to execute
5. ✅ **Wait for completion** before proceeding

### **Step 2: Update Everything Else**

1. In the **same SQL Editor** (or new tab)
2. Copy and paste the contents of `/database/add_archived_sale_status_to_cars_step2.sql`
3. **Click "RUN"** to execute
4. ✅ **Verify completion** - you should see success messages and sale_status distribution

### **Step 2: Verify the Migration**

After running the migration, verify that:
- The `cars_sale_status_check` constraint includes `archived`
- The `archived_at` timestamp column was added
- Indexes were created for performance

## 🎯 Features Added

### **Archive Column**
- ✅ **Hidden by default** - Archive column is hidden initially
- ✅ **Toggle in RETURNED column** - Show/hide toggle is placed in the RETURNED column header
- ✅ **Conditional rendering** - Only shows when `showArchived` is true

### **Archive Actions**
- ✅ **Archive buttons** - Appear on sold and returned car cards (with edit permissions)
- ✅ **Drag to archive** - Cars can be dragged to archive column when visible
- ✅ **Timestamp tracking** - `archived_at` timestamp is set when car is archived
- ✅ **Expanded view support** - Archive buttons work in both normal and expanded inventory views

### **Permissions**
- ✅ **Permission-based** - Only users with `inventory` edit permissions can archive cars
- ✅ **Visual indicators** - Archive buttons only show for users with edit permissions

## 🚀 Usage

### **How to Archive a Car:**
1. **Method 1 (Button):** Hover over a sold or returned car card and click the archive button
2. **Method 2 (Drag):** Toggle archive column visibility and drag car to archive column

### **How to View Archived Cars:**
1. Click the "Show Archive" button in the RETURNED column header
2. Archive column will appear on the right
3. Click "Hide Archive" to hide the column again

### **Car Archiving Rules:**
- Only cars with `sale_status` of "sold" or "returned" can be archived via button
- Any car can be dragged to archive column when visible
- Archived cars get an `archived_at` timestamp
- Archive column is hidden by default to reduce clutter
- Cars maintain `status: 'inventory'` but get `sale_status: 'archived'`

## 🔧 Technical Implementation

### **Database Changes:**
- Added `archived_at` timestamp column to cars table
- Updated `cars_sale_status_check` constraint to include 'archived'
- Created performance indexes for archived cars

### **Frontend Changes:**
- Added archive column to columns array
- Implemented `showArchived` state management
- Added archive toggle button in RETURNED column header
- Added archive action buttons on sold and returned car cards
- Updated drag-and-drop logic to handle archive status
- Added permission checks using `useModulePermissions('inventory')`
- Updated car filtering logic to handle archived cars

### **Archive Toggle Placement:**
The archive toggle is placed in the **RETURNED** column header since both sold and returned cars can be archived.

## 🔍 Files Modified

1. **Database:** `/database/add_archived_sale_status_to_cars.sql` (new)
2. **Inventory Kanban:** `/components/modules/uv-crm/kanban/CarKanbanBoard.tsx`
3. **Instructions:** `/INVENTORY_ARCHIVE_SETUP_INSTRUCTIONS.md` (this file)

## ✅ Testing Checklist

After setup, verify:
- [ ] Archive column is hidden by default
- [ ] Toggle button appears in RETURNED column header
- [ ] Clicking toggle shows/hides archive column
- [ ] Archive buttons appear on sold and returned cars (with edit permissions)
- [ ] Archive button successfully archives cars
- [ ] Drag-and-drop to archive column works
- [ ] Archived cars appear in archive column
- [ ] `archived_at` timestamp is set correctly
- [ ] Real-time updates work for archive actions
- [ ] Archive buttons work in both normal and expanded inventory views

## 🎨 Visual Design

The archive functionality follows the same design patterns as the CRM and marketing kanbans:
- **Glassmorphism styling** for consistency
- **Smooth transitions** for show/hide
- **Permission-based visibility** for archive actions
- **Consistent iconography** using Lucide Archive icon
- **Hover states** for better UX
- **Responsive design** works in both list and grid views

## 💡 Business Logic

This implementation makes sense for inventory management:
- **SOLD cars**: Successfully sold vehicles that can be archived when deal is complete
- **RETURNED cars**: Cars that were returned and can be archived when processed
- **Archive workflow**: MARKETING → QC CHECK CEO → INVENTORY → RESERVED → SOLD/RETURNED → **ARCHIVED**

The implementation maintains the existing inventory kanban's functionality while seamlessly integrating archive capabilities for better inventory organization and historical tracking. 