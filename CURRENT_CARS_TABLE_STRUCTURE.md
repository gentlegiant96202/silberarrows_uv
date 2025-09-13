# Current Cars Table Structure

Based on analysis of the INSERT statement in `AddCarModal.tsx`, here's the current structure of the `cars` table:

## Current Fields (from INSERT analysis)

```sql
-- Basic Vehicle Information
stock_number TEXT
model_year INTEGER
vehicle_model TEXT
model_family TEXT
colour TEXT
interior_colour TEXT
chassis_number TEXT

-- Pricing
cost_price_aed INTEGER (nullable)
advertised_price_aed INTEGER
monthly_0_down_aed INTEGER (nullable)
monthly_20_down_aed INTEGER (nullable)

-- Vehicle Details
current_mileage_km INTEGER (nullable)
current_warranty TEXT
current_service TEXT
regional_specification TEXT (nullable)
body_style TEXT (nullable)

-- Technical Specifications
engine TEXT (nullable)
transmission TEXT (nullable)
horsepower_hp INTEGER (nullable)
torque_nm INTEGER (nullable)
cubic_capacity_cc INTEGER (nullable)
number_of_keys INTEGER (nullable)

-- Ownership & Status
ownership_type TEXT ('stock' or 'consignment')
status TEXT (default: 'marketing')
sale_status TEXT (default: 'available')
created_by UUID

-- Consignment-Specific Fields (nullable for stock cars)
customer_name TEXT (nullable)
customer_email TEXT (nullable)
customer_phone TEXT (nullable)
registration_expiry_date DATE (nullable)
insurance_expiry_date DATE (nullable)
service_records_acquired BOOLEAN (nullable)
owners_manual_acquired BOOLEAN (nullable)
spare_tyre_tools_acquired BOOLEAN (nullable)
fire_extinguisher_acquired BOOLEAN (nullable)

-- Vehicle History Disclosure
customer_disclosed_accident BOOLEAN (nullable)
customer_disclosed_flood_damage BOOLEAN (nullable)
damage_disclosure_details TEXT (nullable)

-- NEW FIELDS (from our damage system)
damage_annotations JSONB (nullable) -- NEW
visual_inspection_notes TEXT (nullable) -- NEW

-- Content
key_equipment TEXT
description TEXT
```

## Fields We're Adding

Our `add_damage_annotations.sql` adds these fields:

```sql
-- Damage assessment data
damage_annotations JSONB DEFAULT '[]'::jsonb;
visual_inspection_notes TEXT;
```

## Additional Fields (likely existing but not in INSERT)

Based on other parts of the codebase, the cars table likely also has:

```sql
-- Standard fields
id UUID PRIMARY KEY
created_at TIMESTAMP
updated_at TIMESTAMP

-- Additional fields seen in other queries
stock_age_days INTEGER (calculated/computed)
xml_image_url TEXT (nullable)
vehicle_details_pdf_url TEXT (nullable)
fuel_level_nm INTEGER (nullable)
car_location TEXT (nullable)
fuel_level INTEGER (nullable)
website_url TEXT (nullable)
archived_at TIMESTAMP (nullable)
```

## To Run the Schema Check

You can call the debug endpoint I created:

```bash
curl https://your-domain.vercel.app/api/debug/cars-schema
```

This will return the actual current schema from your database.
