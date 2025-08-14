# 🗃️ CRM Archive Functionality Setup Instructions

## Overview
This adds archive functionality to the UV CRM kanban board, similar to the marketing kanban. Leads can be archived from the "DELIVERED" status and the archive column can be toggled on/off.

## 📋 Database Migration Required

⚠️ **IMPORTANT**: This migration must be run in **TWO SEPARATE STEPS** due to PostgreSQL enum limitations.

### **Step 1: Add the Enum Value**

1. Open your **Supabase Dashboard**
2. Go to **SQL Editor**
3. Copy and paste **ONLY** this code:

```sql
ALTER TYPE lead_status_enum ADD VALUE 'archived';
```

4. **Click "RUN"** to execute
5. ✅ **Wait for completion** before proceeding

### **Step 2: Update Everything Else**

1. In the **same SQL Editor** (or new tab)
2. Copy and paste the contents of `/database/add_archived_status_to_leads_step2.sql`
3. **Click "RUN"** to execute
4. ✅ **Verify completion** - you should see success messages

### **Step 2: Verify the Migration**

After running the migration, verify that:
- The `archived` status was added to the enum
- The constraint was updated to include `archived`
- The `archived_at` timestamp column was added
- Indexes were created for performance

## 🎯 Features Added

### **Archive Column**
- ✅ **Hidden by default** - Archive column is hidden initially
- ✅ **Toggle in LOST column** - Show/hide toggle is placed in the LOST column header
- ✅ **Conditional rendering** - Only shows when `showArchived` is true

### **Archive Actions**
- ✅ **Archive button** - Appears on delivered leads (with edit permissions)
- ✅ **Drag to archive** - Leads can be dragged to archive column when visible
- ✅ **Timestamp tracking** - `archived_at` timestamp is set when lead is archived

### **Permissions**
- ✅ **Permission-based** - Only users with `uv_crm` edit permissions can archive leads
- ✅ **Visual indicators** - Archive button only shows for users with edit permissions

## 🚀 Usage

### **How to Archive a Lead:**
1. **Method 1 (Button):** Hover over a delivered lead card and click the archive button
2. **Method 2 (Drag):** Toggle archive column visibility and drag lead to archive column

### **How to View Archived Leads:**
1. Click the "Show Archive" button in the LOST column header
2. Archive column will appear on the right
3. Click "Hide Archive" to hide the column again

### **Lead Archiving Rules:**
- Only leads in "DELIVERED" status can be archived via button
- Any lead can be dragged to archive column when visible
- Archived leads get an `archived_at` timestamp
- Archive column is hidden by default to reduce clutter

## 🔧 Technical Implementation

### **Database Changes:**
- Added `archived` to `lead_status_enum`
- Updated status constraint to include `archived`
- Added `archived_at` timestamp column
- Created performance indexes

### **Frontend Changes:**
- Added archive column to columns array
- Implemented `showArchived` state management
- Added archive toggle button in LOST column
- Added archive action button on delivered leads
- Updated drag-and-drop to handle archive status
- Added permission checks using `useModulePermissions`

### **Archive Toggle Placement:**
The archive toggle is placed in the **LOST** column header (rightmost non-archive column) to maintain visual balance and logical flow.

## 🔍 Files Modified

1. **Database:** `/database/add_archived_status_to_leads.sql` (new)
2. **CRM Kanban:** `/components/modules/uv-crm/kanban/KanbanBoard.tsx`
3. **Instructions:** `/CRM_ARCHIVE_SETUP_INSTRUCTIONS.md` (this file)

## ✅ Testing Checklist

After setup, verify:
- [ ] Archive column is hidden by default
- [ ] Toggle button appears in LOST column header
- [ ] Clicking toggle shows/hides archive column
- [ ] Archive button appears on delivered leads (with edit permissions)
- [ ] Archive button successfully archives leads
- [ ] Drag-and-drop to archive column works
- [ ] Archived leads appear in archive column
- [ ] `archived_at` timestamp is set correctly
- [ ] Real-time updates work for archive actions

## 🎨 Visual Design

The archive functionality follows the same design patterns as the marketing kanban:
- **Glassmorphism styling** for consistency
- **Smooth transitions** for show/hide
- **Permission-based visibility** for archive actions
- **Consistent iconography** using Lucide Archive icon
- **Hover states** for better UX

The implementation maintains the existing CRM kanban's visual identity while seamlessly integrating archive functionality. 