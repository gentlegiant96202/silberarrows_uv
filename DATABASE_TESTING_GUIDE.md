# 🧪 SERVICE & WARRANTY MODULE - TESTING GUIDE

## **Quick Setup Steps**

### 1. **Run Database Script**
```sql
-- In Supabase Dashboard SQL Editor, run:
-- /database/add_service_module_restricted.sql
```

### 2. **Test Different Department Access**

#### **🔧 Service Department Users**
- **Expected:** ✅ Full access to SERVICE & WARRANTY tab
- **Test:** Navigate to `/service` - should see full dashboard

#### **🚗 Sales (Used Car) Department Users** 
- **Expected:** ✅ Full access to SERVICE & WARRANTY tab
- **Test:** Navigate to `/service` - should see full dashboard

#### **📈 Marketing Department Users**
- **Expected:** ❌ No SERVICE & WARRANTY tab visible
- **Test:** Tab should not appear in navigation

#### **💳 Leasing Department Users**
- **Expected:** ❌ No SERVICE & WARRANTY tab visible
- **Test:** Tab should not appear in navigation

#### **⚙️ Admin Users**
- **Expected:** ✅ Full access (for system administration)
- **Test:** Navigate to `/service` - should see full dashboard

---

## **Manual Testing Steps**

### **Step 1: Check Navigation Visibility**
1. Login as different department users
2. Navigate to UV CRM module
3. Check if "SERVICE & WARRANTY" tab appears:
   - ✅ **Should appear for:** Service, Sales, Admin
   - ❌ **Should NOT appear for:** Marketing, Leasing

### **Step 2: Direct URL Access Test**
1. Try accessing `/service` directly:
   - ✅ **Allowed for:** Service, Sales, Admin
   - ❌ **Blocked for:** Marketing, Leasing (should show access denied page)

### **Step 3: Permission Verification**
1. Open browser developer tools
2. Check network requests for permission calls
3. Verify `get_user_module_permissions` returns correct values

---

## **SQL Verification Queries**

### **Check Current Permissions**
```sql
SELECT 
  rp.role as department,
  CASE WHEN rp.can_view THEN '✅ YES' ELSE '❌ NO' END as view_access,
  CASE WHEN rp.can_create THEN '✅ YES' ELSE '❌ NO' END as create_access,
  CASE WHEN rp.can_edit THEN '✅ YES' ELSE '❌ NO' END as edit_access,
  CASE WHEN rp.can_delete THEN '✅ YES' ELSE '❌ NO' END as delete_access
FROM role_permissions rp 
JOIN modules m ON rp.module_id = m.id 
WHERE m.name = 'service'
ORDER BY 
  CASE rp.role 
    WHEN 'admin' THEN 1
    WHEN 'service' THEN 2  
    WHEN 'sales' THEN 3
    WHEN 'marketing' THEN 4
    WHEN 'leasing' THEN 5
  END;
```

### **Check User Roles**
```sql
SELECT 
  u.email,
  ur.role as department,
  ur.created_at
FROM auth.users u
JOIN user_roles ur ON u.id = ur.user_id
ORDER BY ur.role;
```

---

## **Expected Results**

| Department | Tab Visible | Direct Access | Permissions |
|------------|-------------|---------------|-------------|
| **Service** | ✅ YES | ✅ Allowed | Full (CRUD) |
| **Sales** | ✅ YES | ✅ Allowed | Full (CRUD) |
| **Admin** | ✅ YES | ✅ Allowed | Full (CRUD) |
| **Marketing** | ❌ NO | ❌ Blocked | None |
| **Leasing** | ❌ NO | ❌ Blocked | None |

---

## **Troubleshooting**

### **If Tab Doesn't Appear:**
1. Check user role: `SELECT role FROM user_roles WHERE user_id = auth.uid();`
2. Verify permissions: `SELECT * FROM role_permissions WHERE role = 'your_role';`
3. Clear browser cache and refresh

### **If Access Denied Page Shows Incorrectly:**
1. Check `useUserRole()` hook is working
2. Verify database permissions are set correctly
3. Check browser console for errors

### **If Service Components Don't Load:**
1. Verify service tables exist (daily_service_metrics, service_monthly_targets)
2. Check API endpoints are accessible
3. Review service data hooks for errors

---

## **Success Criteria** ✅

- [ ] Service department users can access SERVICE & WARRANTY
- [ ] Sales department users can access SERVICE & WARRANTY  
- [ ] Marketing department users CANNOT see the tab
- [ ] Leasing department users CANNOT see the tab
- [ ] Direct URL access is properly restricted
- [ ] Service components load correctly
- [ ] Permission system works as expected 