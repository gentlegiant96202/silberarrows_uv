-- Vehicle Reservations/Invoices Table Schema
-- This stores the form data from the VehicleDocumentModal
-- Run this in your Supabase SQL Editor

-- Drop existing table if needed (be careful in production!)
-- DROP TABLE IF EXISTS vehicle_reservations CASCADE;

-- Create vehicle_reservations table
CREATE TABLE vehicle_reservations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Reference to original lead
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    
    -- Document type and metadata
    document_type TEXT NOT NULL CHECK (document_type IN ('reservation', 'invoice')),
    document_status TEXT NOT NULL DEFAULT 'pending' CHECK (document_status IN ('pending', 'completed', 'cancelled')),
    pdf_url TEXT, -- URL to generated PDF
    
    -- Document details (auto-populated)
    sales_executive TEXT NOT NULL,
    document_date DATE NOT NULL,
    
    -- Customer information
    customer_name TEXT NOT NULL,
    contact_no TEXT NOT NULL,
    email_address TEXT NOT NULL,
    customer_id_type TEXT NOT NULL CHECK (customer_id_type IN ('EID', 'Passport')),
    customer_id_number TEXT NOT NULL,
    
    -- Vehicle information (from inventory)
    vehicle_make_model TEXT NOT NULL,
    model_year INTEGER NOT NULL,
    chassis_no TEXT NOT NULL,
    vehicle_colour TEXT NOT NULL,
    vehicle_mileage INTEGER NOT NULL,
    
    -- Warranty information
    manufacturer_warranty BOOLEAN DEFAULT FALSE,
    manufacturer_warranty_expiry_date DATE,
    manufacturer_warranty_expiry_mileage INTEGER,
    dealer_service_package BOOLEAN DEFAULT FALSE,
    dealer_service_package_expiry_date DATE,
    dealer_service_package_expiry_mileage INTEGER,
    
    -- Part exchange (optional)
    has_part_exchange BOOLEAN DEFAULT FALSE,
    part_exchange_make_model TEXT,
    part_exchange_model_year TEXT,
    part_exchange_chassis_no TEXT,
    part_exchange_colour TEXT,
    part_exchange_engine_no TEXT,
    part_exchange_mileage TEXT,
    part_exchange_value DECIMAL(12,2) DEFAULT 0,
    
    -- Add-ons
    extended_warranty BOOLEAN DEFAULT FALSE,
    extended_warranty_price DECIMAL(12,2) DEFAULT 0,
    ceramic_treatment BOOLEAN DEFAULT FALSE,
    ceramic_treatment_price DECIMAL(12,2) DEFAULT 0,
    service_care BOOLEAN DEFAULT FALSE,
    service_care_price DECIMAL(12,2) DEFAULT 0,
    window_tints BOOLEAN DEFAULT FALSE,
    window_tints_price DECIMAL(12,2) DEFAULT 0,
    
    -- Payment details
    rta_fees DECIMAL(12,2) DEFAULT 0,
    vehicle_sale_price DECIMAL(12,2) NOT NULL,
    add_ons_total DECIMAL(12,2) DEFAULT 0,
    invoice_total DECIMAL(12,2) NOT NULL,
    deposit DECIMAL(12,2) DEFAULT 0,
    amount_due DECIMAL(12,2) NOT NULL,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- Add indexes for performance
CREATE INDEX idx_vehicle_reservations_lead_id ON vehicle_reservations(lead_id);
CREATE INDEX idx_vehicle_reservations_document_type ON vehicle_reservations(document_type);
CREATE INDEX idx_vehicle_reservations_status ON vehicle_reservations(document_status);
CREATE INDEX idx_vehicle_reservations_date ON vehicle_reservations(document_date);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_vehicle_reservations_updated_at 
    BEFORE UPDATE ON vehicle_reservations 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE vehicle_reservations IS 'Stores vehicle reservation and invoice form data from VehicleDocumentModal';
COMMENT ON COLUMN vehicle_reservations.lead_id IS 'References the original lead that generated this reservation/invoice';
COMMENT ON COLUMN vehicle_reservations.document_type IS 'Type of document: reservation or invoice';
COMMENT ON COLUMN vehicle_reservations.pdf_url IS 'URL to the generated PDF document';
COMMENT ON COLUMN vehicle_reservations.amount_due IS 'Final amount due after deposit and part exchange';

-- Add RLS (Row Level Security) if needed
ALTER TABLE vehicle_reservations ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users (adjust as needed)
CREATE POLICY "Enable all operations for authenticated users" 
ON vehicle_reservations 
FOR ALL 
USING (true);

-- Sample query to verify table structure
/*
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'vehicle_reservations' 
ORDER BY ordinal_position;
*/ 