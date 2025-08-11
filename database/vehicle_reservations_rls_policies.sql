-- RLS Policies for vehicle_reservations table
-- Enable RLS on the table (if not already enabled)
ALTER TABLE vehicle_reservations ENABLE ROW LEVEL SECURITY;

-- Allow users to insert reservations for leads they have access to
CREATE POLICY "Users can insert vehicle reservations for their leads" ON vehicle_reservations
    FOR INSERT 
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM leads 
            WHERE leads.id = vehicle_reservations.lead_id
            AND (
                leads.created_by = auth.uid()
                OR auth.uid() IN (
                    SELECT user_id FROM user_roles 
                    WHERE role_name IN ('admin', 'ceo', 'sales_manager', 'sales_executive')
                )
            )
        )
    );

-- Allow users to view reservations for leads they have access to
CREATE POLICY "Users can view vehicle reservations for their leads" ON vehicle_reservations
    FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM leads 
            WHERE leads.id = vehicle_reservations.lead_id
            AND (
                leads.created_by = auth.uid()
                OR auth.uid() IN (
                    SELECT user_id FROM user_roles 
                    WHERE role_name IN ('admin', 'ceo', 'sales_manager', 'sales_executive')
                )
            )
        )
    );

-- Allow users to update reservations for leads they have access to
CREATE POLICY "Users can update vehicle reservations for their leads" ON vehicle_reservations
    FOR UPDATE 
    USING (
        EXISTS (
            SELECT 1 FROM leads 
            WHERE leads.id = vehicle_reservations.lead_id
            AND (
                leads.created_by = auth.uid()
                OR auth.uid() IN (
                    SELECT user_id FROM user_roles 
                    WHERE role_name IN ('admin', 'ceo', 'sales_manager', 'sales_executive')
                )
            )
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM leads 
            WHERE leads.id = vehicle_reservations.lead_id
            AND (
                leads.created_by = auth.uid()
                OR auth.uid() IN (
                    SELECT user_id FROM user_roles 
                    WHERE role_name IN ('admin', 'ceo', 'sales_manager', 'sales_executive')
                )
            )
        )
    );

-- Allow users to delete reservations for leads they have access to (if needed)
CREATE POLICY "Users can delete vehicle reservations for their leads" ON vehicle_reservations
    FOR DELETE 
    USING (
        EXISTS (
            SELECT 1 FROM leads 
            WHERE leads.id = vehicle_reservations.lead_id
            AND (
                leads.created_by = auth.uid()
                OR auth.uid() IN (
                    SELECT user_id FROM user_roles 
                    WHERE role_name IN ('admin', 'ceo', 'sales_manager', 'sales_executive')
                )
            )
        )
    ); 