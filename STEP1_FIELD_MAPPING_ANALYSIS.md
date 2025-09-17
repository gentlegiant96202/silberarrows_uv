# 📋 STEP 1: Field Mapping Analysis - Customer & Vehicle Details

## 🎯 EXECUTIVE SUMMARY
Analysis of VehicleDocumentModal vs ServiceContracts schema to identify missing fields needed for integration.

---

## 📊 CUSTOMER DETAILS FIELD MAPPING

| VehicleDocument Field | VehicleReservations Column | ServiceContracts Column | Status | Action Required |
|----------------------|----------------------------|------------------------|--------|-----------------|
| `customerName` | `customer_name` | `owner_name` | ✅ **MAPPED** | None - field names different but mapped |
| `contactNo` | `contact_no` | `mobile_no` | ✅ **MAPPED** | None - field names different but mapped |
| `emailAddress` | `email_address` | `email` | ✅ **MAPPED** | None - field names different but mapped |
| `customerIdType` | `customer_id_type` | ❌ **MISSING** | 🚨 **ADD FIELD** | Add to service_contracts & warranty_contracts |
| `customerIdNumber` | `customer_id_number` | ❌ **MISSING** | 🚨 **ADD FIELD** | Add to service_contracts & warranty_contracts |

---

## 🚗 VEHICLE DETAILS FIELD MAPPING

| VehicleDocument Field | VehicleReservations Column | ServiceContracts Column | Status | Action Required |
|----------------------|----------------------------|------------------------|--------|-----------------|
| `makeModel` | `vehicle_make_model` | `make` + `model` | ⚠️ **SPLIT NEEDED** | Parse vehicle_make_model into make/model |
| `modelYear` | `model_year` | `model_year` | ✅ **MAPPED** | None - direct mapping |
| `chassisNo` | `chassis_no` | `vin` | ✅ **MAPPED** | None - field names different but mapped |
| `exteriorColour` | `vehicle_colour` | ❌ **MISSING** | 🚨 **ADD FIELD** | Add vehicle_colour to service_contracts |
| `mileage` | `vehicle_mileage` | `current_odometer` | ✅ **MAPPED** | None - field names different but mapped |

---

## 🔗 RELATIONSHIP MAPPING

| Integration Need | Current State | Required Addition |
|-----------------|---------------|-------------------|
| Link ServiceCare to Reservation | ❌ **NO LINK** | Add `reservation_id` foreign key |
| Link Warranty to Reservation | ❌ **NO LINK** | Add `reservation_id` foreign key |
| Auto-populate from VehicleDocument | ❌ **MANUAL ONLY** | Create auto-population API |

---

## 📋 REQUIRED DATABASE CHANGES

### 🚨 NEW FIELDS TO ADD

#### Service Contracts Table:
```sql
-- Customer ID fields (missing)
customer_id_type TEXT CHECK (customer_id_type IN ('EID', 'Passport')),
customer_id_number TEXT,

-- Vehicle color (missing)  
vehicle_colour TEXT,

-- Relationship link (missing)
reservation_id UUID REFERENCES vehicle_reservations(id)
```

#### Warranty Contracts Table:
```sql
-- Same fields as service_contracts
customer_id_type TEXT CHECK (customer_id_type IN ('EID', 'Passport')),
customer_id_number TEXT,
vehicle_colour TEXT,
reservation_id UUID REFERENCES vehicle_reservations(id)
```

### ✅ EXISTING FIELDS (NO CHANGES NEEDED)

#### Already Correctly Mapped:
- Customer: `owner_name`, `mobile_no`, `email`
- Vehicle: `make`, `model`, `model_year`, `vin`, `current_odometer`
- Service: `service_type`, `start_date`, `end_date`, `cut_off_km`, `invoice_amount`

---

## 🎯 DATA FLOW DESIGN

### 📥 AUTO-POPULATION LOGIC
```javascript
// VehicleDocument → ServiceContract mapping
const mapVehicleToService = (reservationData) => ({
  // Direct mappings (existing fields)
  owner_name: reservationData.customer_name,
  mobile_no: reservationData.contact_no, 
  email: reservationData.email_address,
  vin: reservationData.chassis_no,
  model_year: reservationData.model_year,
  current_odometer: reservationData.vehicle_mileage,
  
  // NEW FIELDS (to be added)
  customer_id_type: reservationData.customer_id_type,
  customer_id_number: reservationData.customer_id_number,
  vehicle_colour: reservationData.vehicle_colour,
  reservation_id: reservationData.id,
  
  // PARSING REQUIRED
  make: parseVehicleMake(reservationData.vehicle_make_model),
  model: parseVehicleModel(reservationData.vehicle_make_model)
});
```

---

## 📊 IMPACT ASSESSMENT

### ✅ LOW RISK CHANGES:
- Adding new fields to existing tables
- Adding foreign key relationships  
- Creating auto-population APIs

### ⚠️ MEDIUM RISK CHANGES:
- Parsing `vehicle_make_model` into separate `make`/`model` fields
- Updating existing ServiceContract modal to include new fields

### 🚨 HIGH IMPACT AREAS:
- All existing service contracts will have NULL values for new fields
- Need migration strategy for existing data
- Modal redesign affects user workflow

---

## 🚀 NEXT STEPS (STEP 2)

1. **Create migration SQL** to add the 4 new fields
2. **Add proper indexes** for new fields
3. **Update constraints** and validation
4. **Plan data migration** for existing records
5. **Test migration** on development environment

---

## ✅ STEP 1 COMPLETE - READY FOR APPROVAL

**SUMMARY**: Need to add 4 fields total (customer_id_type, customer_id_number, vehicle_colour, reservation_id) to both service_contracts and warranty_contracts tables to enable VehicleDocument integration.
