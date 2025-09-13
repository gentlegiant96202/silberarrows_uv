-- Content Pillars Database Schema for SilberArrows Marketing Module
-- This creates the database structure for the Content Pillars feature

-- =====================================================
-- 1. CONTENT PILLARS TABLE
-- =====================================================
-- Stores the actual content pillar items for each day
CREATE TABLE IF NOT EXISTS content_pillars (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    content_type TEXT NOT NULL CHECK (content_type IN ('image', 'video', 'text', 'carousel')),
    day_of_week TEXT NOT NULL CHECK (day_of_week IN ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday')),
    created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 2. CONTENT EXAMPLES TABLE  
-- =====================================================
-- Stores the content examples/templates for each day that guide AI generation
CREATE TABLE IF NOT EXISTS content_examples (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    content_type TEXT NOT NULL CHECK (content_type IN ('image', 'video', 'text', 'carousel')),
    day_of_week TEXT NOT NULL CHECK (day_of_week IN ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday')),
    created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 3. INDEXES FOR PERFORMANCE
-- =====================================================
-- Index for querying content pillars by day
CREATE INDEX IF NOT EXISTS idx_content_pillars_day_of_week ON content_pillars(day_of_week);
CREATE INDEX IF NOT EXISTS idx_content_pillars_created_by ON content_pillars(created_by);
CREATE INDEX IF NOT EXISTS idx_content_pillars_created_at ON content_pillars(created_at DESC);

-- Index for querying content examples by day
CREATE INDEX IF NOT EXISTS idx_content_examples_day_of_week ON content_examples(day_of_week);
CREATE INDEX IF NOT EXISTS idx_content_examples_created_by ON content_examples(created_by);

-- =====================================================
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on both tables
ALTER TABLE content_pillars ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_examples ENABLE ROW LEVEL SECURITY;

-- Content Pillars Policies
-- Users with marketing module permissions can view all content pillars
CREATE POLICY "Users with marketing permissions can view content pillars" ON content_pillars
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM get_user_module_permissions(auth.uid(), 'marketing') 
            WHERE can_view = true
        )
    );

-- Users with marketing create permissions can insert content pillars
CREATE POLICY "Users with marketing permissions can create content pillars" ON content_pillars
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM get_user_module_permissions(auth.uid(), 'marketing') 
            WHERE can_create = true
        )
    );

-- Users with marketing edit permissions can update content pillars
CREATE POLICY "Users with marketing permissions can update content pillars" ON content_pillars
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM get_user_module_permissions(auth.uid(), 'marketing') 
            WHERE can_edit = true
        )
    );

-- Users with marketing delete permissions can delete content pillars
CREATE POLICY "Users with marketing permissions can delete content pillars" ON content_pillars
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM get_user_module_permissions(auth.uid(), 'marketing') 
            WHERE can_delete = true
        )
    );

-- Content Examples Policies (same pattern as content pillars)
-- Users with marketing module permissions can view all content examples
CREATE POLICY "Users with marketing permissions can view content examples" ON content_examples
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM get_user_module_permissions(auth.uid(), 'marketing') 
            WHERE can_view = true
        )
    );

-- Users with marketing create permissions can insert content examples
CREATE POLICY "Users with marketing permissions can create content examples" ON content_examples
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM get_user_module_permissions(auth.uid(), 'marketing') 
            WHERE can_create = true
        )
    );

-- Users with marketing edit permissions can update content examples
CREATE POLICY "Users with marketing permissions can update content examples" ON content_examples
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM get_user_module_permissions(auth.uid(), 'marketing') 
            WHERE can_edit = true
        )
    );

-- Users with marketing delete permissions can delete content examples
CREATE POLICY "Users with marketing permissions can delete content examples" ON content_examples
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM get_user_module_permissions(auth.uid(), 'marketing') 
            WHERE can_delete = true
        )
    );

-- =====================================================
-- 5. TRIGGERS FOR UPDATED_AT TIMESTAMPS
-- =====================================================

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for content_pillars
CREATE TRIGGER update_content_pillars_updated_at 
    BEFORE UPDATE ON content_pillars 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger for content_examples
CREATE TRIGGER update_content_examples_updated_at 
    BEFORE UPDATE ON content_examples 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 6. SAMPLE DATA (OPTIONAL - FOR TESTING)
-- =====================================================

-- Insert sample content examples for each day (matching what we have in the frontend)
INSERT INTO content_examples (title, description, content_type, day_of_week) VALUES
-- Mercedes Monday Examples
('New S-Class AMG Arrival Showcase', 'Spotlight premium features, luxury interior, and performance details', 'video', 'monday'),
('Customer Delivery Joy Moment', 'First-time Mercedes owner reaction and handover ceremony', 'image', 'monday'),
('Luxury Interior Walkaround', 'Detailed showcase of premium materials and craftsmanship', 'carousel', 'monday'),

-- Tech Tuesday Examples  
('MBUX Voice Command Demo', 'Interactive demonstration of Hey Mercedes features', 'video', 'tuesday'),
('Service Department Tech Tour', 'Behind-the-scenes diagnostic equipment and precision tools', 'carousel', 'tuesday'),
('Driver Assistance Features', 'Safety technology and autonomous driving capabilities', 'video', 'tuesday'),

-- Wisdom Wednesday Examples
('Winter Maintenance Guide', 'Expert tips for Mercedes care in UAE climate', 'carousel', 'wednesday'),
('Lease vs Buy Education', 'Financial comparison and lifestyle considerations', 'text', 'wednesday'),
('Mercedes Heritage Story', 'Brand history and innovation timeline', 'image', 'wednesday'),

-- Transformation Thursday Examples
('Service Transformation', 'Before/after brake service on E-Class', 'carousel', 'thursday'),
('Team Member Spotlight', 'Service advisor journey and expertise', 'image', 'thursday'),
('Customer Success Story', 'Business owner upgrading to Mercedes fleet', 'video', 'thursday'),

-- Fun Friday Examples
('AMG vs Luxury Poll', 'This or that interactive choice for followers', 'image', 'friday'),
('Engine Sound Battle', 'Guess the Mercedes by exhaust note', 'video', 'friday'),
('Mercedes Quiz Challenge', 'Test your knowledge of Mercedes features', 'carousel', 'friday'),

-- Social Saturday Examples
('Caption This Mercedes', 'Community engagement with funny moments', 'image', 'saturday'),
('Mercedes Trivia Night', 'Interactive facts and brand knowledge', 'text', 'saturday'),
('Customer Photo Contest', 'Best Mercedes lifestyle shots from followers', 'carousel', 'saturday');

-- Insert sample content pillars (current active content)
INSERT INTO content_pillars (title, description, content_type, day_of_week) VALUES
('New AMG C63 Arrival', 'Spotlight premium AMG features and luxury interior details', 'image', 'monday'),
('MBUX System Deep Dive', 'Showcase advanced Mercedes technology and voice commands', 'video', 'tuesday'),
('Winter Maintenance Tips', 'Expert advice on Mercedes winter care and preparation', 'text', 'wednesday'),
('Service Transformation', 'Before/after: Complete brake service on E-Class', 'carousel', 'thursday'),
('AMG vs Luxury Poll', 'This or That: Which trim matches your style?', 'image', 'friday'),
('Mercedes Sound Quiz', 'Guess the engine: V8 AMG vs V6 Turbo challenge', 'video', 'saturday'),
('Customer Delivery Joy', 'Behind-the-scenes: First-time Mercedes owner reaction', 'video', 'monday'),
('Diagnostic Tech Tour', 'Service department precision tools and technology', 'carousel', 'tuesday'),
('Lease vs Buy Guide', 'Educational content: Which option fits your lifestyle?', 'carousel', 'wednesday'),
('Team Spotlight: Sarah', 'Service advisor Sarah shares her Mercedes journey', 'image', 'thursday'),
('Engine Sound Battle', 'Interactive: AMG exhaust vs turbo whistle sounds', 'video', 'friday'),
('Caption This Mercedes', 'Community fun: Followers caption funny Mercedes moments', 'image', 'saturday');

-- =====================================================
-- 7. HELPFUL QUERIES FOR TESTING
-- =====================================================

-- Query to get all content pillars grouped by day
-- SELECT day_of_week, COUNT(*) as pillar_count, 
--        array_agg(title ORDER BY created_at DESC) as titles
-- FROM content_pillars 
-- GROUP BY day_of_week 
-- ORDER BY 
--   CASE day_of_week 
--     WHEN 'monday' THEN 1 
--     WHEN 'tuesday' THEN 2 
--     WHEN 'wednesday' THEN 3 
--     WHEN 'thursday' THEN 4 
--     WHEN 'friday' THEN 5 
--     WHEN 'saturday' THEN 6 
--   END;

-- Query to get all content examples for a specific day
-- SELECT * FROM content_examples WHERE day_of_week = 'monday' ORDER BY created_at;

-- Query to get content pillars with creator information
-- SELECT cp.*, u.email as creator_email 
-- FROM content_pillars cp 
-- LEFT JOIN auth.users u ON cp.created_by = u.id 
-- ORDER BY cp.created_at DESC;
