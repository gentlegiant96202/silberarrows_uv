# 🚀 SERVICE CONTRACTS SYSTEM SETUP GUIDE

## 📋 OVERVIEW
Complete ServiceCare and Warranty contract management system with database integration, PDF generation, and real-time contract tracking.

## 🔧 SETUP STEPS

### 1. DATABASE SETUP
Run these SQL scripts in your Supabase dashboard in the following order:

#### Step 1: Run Service Module Permissions
```sql
-- File: database/add_service_module_restricted.sql
-- This adds the service module with restricted permissions
```

#### Step 2: Run Service Contracts Schema  
```sql
-- File: database/service_contracts_schema.sql
-- This creates all contract tables and sample data
```

### 2. VERIFY DATABASE TABLES
After running the scripts, you should have these new tables:
- ✅ `service_contracts` - Service agreements
- ✅ `warranty_contracts` - Warranty agreements  
- ✅ `contract_activities` - Activity logs
- ✅ Sample data for testing

### 3. ENVIRONMENT VARIABLES
Ensure these are set in your `.env.local`:
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
PDFSHIFT_API_KEY=your_pdfshift_key
```

## 🎯 FEATURES IMPLEMENTED

### ✅ SERVICE CONTRACT MODAL
- **Auto-generated Reference Numbers:** SC + 5 random digits
- **Pre-filled Dealer Information:** SilberArrows details
- **Complete Form Validation:** All required fields
- **Professional Glass Morphism Design**

### ✅ PDF GENERATION
- **Route:** `/api/generate-service-agreement`
- **Professional Layout:** Same style as consignment agreements
- **Date Formatting:** DD/MM/YYYY format
- **Signature Placeholders:** Ready for DocuSign

### ✅ DATABASE INTEGRATION
- **Route:** `/api/service-contracts`
- **Automatic Saving:** Contracts saved after PDF generation
- **Activity Logging:** All actions tracked
- **Real-time Stats:** Live contract counts and statuses

### ✅ CONTRACT MANAGEMENT
- **Live Contract Tables:** Service and warranty contracts
- **Search Functionality:** Filter by reference, customer, vehicle, VIN
- **Status Tracking:** Active, Expiring Soon, Expired
- **Contract Health Indicators:** Visual status badges

### ✅ PERMISSIONS & SECURITY
- **Restricted Access:** Only Service, Sales, and Admin departments
- **Row Level Security:** Database-level access control
- **Unified Role Manager Integration:** Automatic admin configuration

## 🧪 TESTING INSTRUCTIONS

### Test Access Control
1. **Service Department:** ✅ Full access
2. **Sales Department:** ✅ Full access  
3. **Admin:** ✅ Full access
4. **Marketing:** ❌ Access denied
5. **Leasing:** ❌ Access denied

### Test Contract Creation
1. Navigate to `/service`
2. Click "New Contract"
3. Fill out the form with test data:
   - Customer: Ahmed Al-Rashid
   - Phone: +971504567890
   - Email: ahmed@test.com
   - VIN: WDDGF4HB1CA123456
   - Vehicle: Mercedes-Benz C-Class 2022
4. Submit and verify:
   - ✅ PDF downloads automatically
   - ✅ Contract appears in database
   - ✅ Stats update in real-time

### Test Search & Filter
1. Use search bar to find contracts by:
   - Reference number (SC12345)
   - Customer name
   - Vehicle information
   - VIN number
2. Verify filtering works correctly

## 📊 SAMPLE DATA
The system includes sample contracts for testing:
- **SC10001:** Ahmed Al-Rashid - Mercedes C-Class
- **SC10002:** Sarah Johnson - Mercedes E-Class  
- **EW10001:** Omar Hassan - Mercedes S-Class (Warranty)

## 🔄 API ENDPOINTS

### Service Contracts
- **GET** `/api/service-contracts?type=service` - Fetch service contracts
- **GET** `/api/service-contracts?type=warranty` - Fetch warranty contracts
- **POST** `/api/generate-service-agreement` - Generate PDF + Save contract

### Query Parameters
- `type`: service | warranty
- `status`: active | expired | cancelled | pending
- `limit`: number of records (default: 50)
- `offset`: pagination offset (default: 0)

## 🎨 UI FEATURES
- **Glass Morphism Design:** Black and silver gradients
- **Responsive Layout:** Full-width, full-height design
- **Real-time Stats:** Contract counts and health indicators
- **Professional Tables:** Contract management interface
- **Search Integration:** Live filtering capabilities

## 🚦 DEPLOYMENT CHECKLIST
- [ ] Database scripts executed
- [ ] Environment variables configured
- [ ] PDFShift API key active
- [ ] Supabase permissions verified
- [ ] Service module permissions applied
- [ ] Test contract creation workflow
- [ ] Verify access control restrictions

## 📝 NEXT STEPS
1. Test the complete workflow end-to-end
2. Create additional warranty contract types if needed
3. Add contract editing and deletion functionality
4. Implement contract renewal workflows
5. Add advanced reporting and analytics

---

**🎉 Your ServiceCare system is ready to use!**

Navigate to `/service` to start creating and managing contracts. 