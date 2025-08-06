-- ================================
-- SERVICE CONTRACTS SCHEMA
-- ================================
-- Database schema for ServiceCare and Warranty contracts management

-- 1. DROP EXISTING TABLES IF EXISTS
DROP TABLE IF EXISTS service_contracts CASCADE;
DROP TABLE IF EXISTS warranty_contracts CASCADE;
DROP TABLE IF EXISTS contract_activities CASCADE;

-- Drop existing ENUM types if they exist
DROP TYPE IF EXISTS contract_status_enum CASCADE;
DROP TYPE IF EXISTS contract_type_enum CASCADE;

-- 2. CREATE ENUM FOR CONTRACT STATUS
CREATE TYPE contract_status_enum AS ENUM (
    'active',
    'expired', 
    'cancelled',
    'pending',
    'completed'
);

-- 3. CREATE ENUM FOR CONTRACT TYPE  
CREATE TYPE contract_type_enum AS ENUM (
    'service',
    'warranty'
);

-- 4. SERVICE CONTRACTS TABLE
CREATE TABLE service_contracts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Reference and basic info
    reference_no TEXT NOT NULL UNIQUE, -- SC12345 format
    contract_type contract_type_enum NOT NULL DEFAULT 'service',
    status contract_status_enum NOT NULL DEFAULT 'active',
    
    -- Customer Information
    owner_name TEXT NOT NULL,
    mobile_no TEXT NOT NULL,
    email TEXT NOT NULL,
    
    -- Dealer Information (pre-filled)
    dealer_name TEXT NOT NULL DEFAULT 'SilberArrows',
    dealer_phone TEXT NOT NULL DEFAULT '+971 4 380 5515',
    dealer_email TEXT NOT NULL DEFAULT 'service@silberarrows.com',
    
    -- Vehicle Information
    vin TEXT NOT NULL,
    make TEXT NOT NULL,
    model TEXT NOT NULL,
    model_year TEXT NOT NULL,
    current_odometer TEXT NOT NULL,
    
    -- Duration of Agreement
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    cut_off_km TEXT NOT NULL,
    
    -- Additional contract details
    terms_conditions TEXT, -- For any specific terms
    notes TEXT, -- Internal notes
    pdf_url TEXT, -- Link to generated PDF
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- 5. WARRANTY CONTRACTS TABLE (Similar structure but for warranties)
CREATE TABLE warranty_contracts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Reference and basic info
    reference_no TEXT NOT NULL UNIQUE, -- WC12345 format
    contract_type contract_type_enum NOT NULL DEFAULT 'warranty',
    status contract_status_enum NOT NULL DEFAULT 'active',
    
    -- Customer Information
    owner_name TEXT NOT NULL,
    mobile_no TEXT NOT NULL,
    email TEXT NOT NULL,
    
    -- Dealer Information
    dealer_name TEXT NOT NULL DEFAULT 'SilberArrows',
    dealer_phone TEXT NOT NULL DEFAULT '+971 4 380 5515', 
    dealer_email TEXT NOT NULL DEFAULT 'service@silberarrows.com',
    
    -- Vehicle Information
    vin TEXT NOT NULL,
    make TEXT NOT NULL,
    model TEXT NOT NULL,
    model_year TEXT NOT NULL,
    current_odometer TEXT NOT NULL,
    
    -- Warranty Duration
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    coverage_details TEXT, -- What's covered
    warranty_type TEXT, -- Extended, Basic, Premium, etc.
    
    -- Additional details
    terms_conditions TEXT,
    notes TEXT,
    pdf_url TEXT,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- 6. CONTRACT ACTIVITIES TABLE (for tracking updates, renewals, claims)
CREATE TABLE contract_activities (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    contract_id UUID NOT NULL, -- Can reference either service or warranty contracts
    contract_type contract_type_enum NOT NULL,
    activity_type TEXT NOT NULL, -- 'created', 'renewed', 'claim_filed', 'status_changed', 'note_added'
    activity_description TEXT NOT NULL,
    activity_data JSONB, -- Store additional structured data
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- 7. INDEXES FOR PERFORMANCE
CREATE INDEX idx_service_contracts_reference ON service_contracts(reference_no);
CREATE INDEX idx_service_contracts_status ON service_contracts(status);
CREATE INDEX idx_service_contracts_customer ON service_contracts(owner_name, mobile_no);
CREATE INDEX idx_service_contracts_vehicle ON service_contracts(vin, make, model);
CREATE INDEX idx_service_contracts_dates ON service_contracts(start_date, end_date);
CREATE INDEX idx_service_contracts_created ON service_contracts(created_at);

CREATE INDEX idx_warranty_contracts_reference ON warranty_contracts(reference_no);
CREATE INDEX idx_warranty_contracts_status ON warranty_contracts(status);
CREATE INDEX idx_warranty_contracts_customer ON warranty_contracts(owner_name, mobile_no);
CREATE INDEX idx_warranty_contracts_vehicle ON warranty_contracts(vin, make, model);
CREATE INDEX idx_warranty_contracts_dates ON warranty_contracts(start_date, end_date);
CREATE INDEX idx_warranty_contracts_created ON warranty_contracts(created_at);

CREATE INDEX idx_contract_activities_contract ON contract_activities(contract_id, contract_type);
CREATE INDEX idx_contract_activities_type ON contract_activities(activity_type);
CREATE INDEX idx_contract_activities_created ON contract_activities(created_at);

-- 8. UPDATED_AT TRIGGER FUNCTIONS
CREATE OR REPLACE FUNCTION update_contract_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers
CREATE TRIGGER update_service_contracts_updated_at 
    BEFORE UPDATE ON service_contracts 
    FOR EACH ROW 
    EXECUTE FUNCTION update_contract_updated_at();

CREATE TRIGGER update_warranty_contracts_updated_at 
    BEFORE UPDATE ON warranty_contracts 
    FOR EACH ROW 
    EXECUTE FUNCTION update_contract_updated_at();

-- 9. ROW LEVEL SECURITY
ALTER TABLE service_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE warranty_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_activities ENABLE ROW LEVEL SECURITY;

-- Service contracts policy (only service, sales, admin can access)
CREATE POLICY service_contracts_policy ON service_contracts
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles ur 
            JOIN role_permissions rp ON ur.role = rp.role 
            JOIN modules m ON rp.module_id = m.id 
            WHERE ur.user_id = auth.uid() 
            AND m.name = 'service' 
            AND rp.can_view = true
        )
    );

-- Warranty contracts policy
CREATE POLICY warranty_contracts_policy ON warranty_contracts
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles ur 
            JOIN role_permissions rp ON ur.role = rp.role 
            JOIN modules m ON rp.module_id = m.id 
            WHERE ur.user_id = auth.uid() 
            AND m.name = 'service' 
            AND rp.can_view = true
        )
    );

-- Contract activities policy
CREATE POLICY contract_activities_policy ON contract_activities
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles ur 
            JOIN role_permissions rp ON ur.role = rp.role 
            JOIN modules m ON rp.module_id = m.id 
            WHERE ur.user_id = auth.uid() 
            AND m.name = 'service' 
            AND rp.can_view = true
        )
    );

-- 10. SAMPLE DATA FOR TESTING
INSERT INTO service_contracts (
    reference_no, owner_name, mobile_no, email,
    vin, make, model, model_year, current_odometer,
    start_date, end_date, cut_off_km, notes
) VALUES (
    'SC10001', 'Ahmed Al-Rashid', '+971504567890', 'ahmed@email.com',
    'WDDGF4HB1CA123456', 'Mercedes-Benz', 'C-Class', '2022', '25000',
    '2025-01-01', '2026-01-01', '50000', 'Premium service package'
), (
    'SC10002', 'Sarah Johnson', '+971505678901', 'sarah@email.com', 
    'WDBRF40J12F123457', 'Mercedes-Benz', 'E-Class', '2021', '35000',
    '2025-01-15', '2026-01-15', '45000', 'Standard service coverage'
);

INSERT INTO warranty_contracts (
    reference_no, owner_name, mobile_no, email,
    vin, make, model, model_year, current_odometer,
    start_date, end_date, coverage_details, warranty_type
) VALUES (
    'WC10001', 'Omar Hassan', '+971506789012', 'omar@email.com',
    'WDDGF4HB1CA789123', 'Mercedes-Benz', 'S-Class', '2023', '15000', 
    '2025-01-01', '2027-01-01', 'Engine, transmission, electrical systems', 'Extended'
);

-- 11. VIEWS FOR EASY QUERYING (Simplified without problematic date calculations)
CREATE OR REPLACE VIEW active_service_contracts AS
SELECT 
    sc.*,
    CASE 
        WHEN sc.end_date < CURRENT_DATE THEN 'Expired'
        WHEN sc.end_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'Expiring Soon'
        ELSE 'Active'
    END as contract_health,
    (sc.end_date - CURRENT_DATE) as days_until_expiry
FROM service_contracts sc
WHERE sc.status = 'active'
ORDER BY sc.end_date;

CREATE OR REPLACE VIEW active_warranty_contracts AS
SELECT 
    wc.*,
    CASE 
        WHEN wc.end_date < CURRENT_DATE THEN 'Expired'
        WHEN wc.end_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'Expiring Soon'
        ELSE 'Active'
    END as warranty_health,
    (wc.end_date - CURRENT_DATE) as days_until_expiry
FROM warranty_contracts wc
WHERE wc.status = 'active'
ORDER BY wc.end_date;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Service contracts schema created successfully!';
    RAISE NOTICE 'Tables created: service_contracts, warranty_contracts, contract_activities';
    RAISE NOTICE 'Sample data inserted for testing';
    RAISE NOTICE 'Views created without complex date arithmetic';
END
$$; 