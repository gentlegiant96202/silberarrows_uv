-- Create myth_buster_monday table
CREATE TABLE IF NOT EXISTS myth_buster_monday (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    subtitle TEXT,
    description TEXT,
    myth TEXT,
    fact TEXT,
    difficulty TEXT,
    tools_needed TEXT,
    warning TEXT,
    badge_text TEXT DEFAULT 'MYTH BUSTER MONDAY',
    media_files JSONB DEFAULT '[]'::jsonb,
    media_files_a JSONB DEFAULT '[]'::jsonb,
    media_files_b JSONB DEFAULT '[]'::jsonb,
    content_type TEXT DEFAULT 'image',
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'ready', 'published', 'archived')),
    marketing_status TEXT DEFAULT 'not_sent' CHECK (marketing_status IN ('not_sent', 'sent', 'published', 'failed')),
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    published_at TIMESTAMP WITH TIME ZONE,
    marketing_sent_at TIMESTAMP WITH TIME ZONE,
    
    -- Form fields for image customization
    titlefontsize INTEGER DEFAULT 72,
    imagefit TEXT DEFAULT 'cover' CHECK (imagefit IN ('cover', 'contain', 'fill', 'scale-down', 'none')),
    imagealignment TEXT DEFAULT 'center' CHECK (imagealignment IN ('center', 'top', 'bottom', 'left', 'right', 'top-left', 'top-right', 'bottom-left', 'bottom-right')),
    imagezoom INTEGER DEFAULT 100 CHECK (imagezoom >= 10 AND imagezoom <= 200),
    imageverticalposition INTEGER DEFAULT 0,
    
    -- Instagram story size (2x for better quality)
    image_width INTEGER DEFAULT 1080,
    image_height INTEGER DEFAULT 1920
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_myth_buster_monday_status ON myth_buster_monday(status);
CREATE INDEX IF NOT EXISTS idx_myth_buster_monday_marketing_status ON myth_buster_monday(marketing_status);
CREATE INDEX IF NOT EXISTS idx_myth_buster_monday_created_by ON myth_buster_monday(created_by);
CREATE INDEX IF NOT EXISTS idx_myth_buster_monday_created_at ON myth_buster_monday(created_at DESC);

-- Enable RLS
ALTER TABLE myth_buster_monday ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view myth buster monday content" ON myth_buster_monday
    FOR SELECT USING (true);

CREATE POLICY "Users can create myth buster monday content" ON myth_buster_monday
    FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update myth buster monday content" ON myth_buster_monday
    FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Users can delete myth buster monday content" ON myth_buster_monday
    FOR DELETE USING (auth.uid() = created_by);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_myth_buster_monday_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_myth_buster_monday_updated_at
    BEFORE UPDATE ON myth_buster_monday
    FOR EACH ROW
    EXECUTE FUNCTION update_myth_buster_monday_updated_at();

-- Create tech_tips_tuesday table (similar structure)
CREATE TABLE IF NOT EXISTS tech_tips_tuesday (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    subtitle TEXT,
    description TEXT,
    problem TEXT,
    solution TEXT,
    difficulty TEXT,
    tools_needed TEXT,
    warning TEXT,
    badge_text TEXT DEFAULT 'TECH TIPS TUESDAY',
    media_files JSONB DEFAULT '[]'::jsonb,
    media_files_a JSONB DEFAULT '[]'::jsonb,
    media_files_b JSONB DEFAULT '[]'::jsonb,
    content_type TEXT DEFAULT 'image',
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'ready', 'published', 'archived')),
    marketing_status TEXT DEFAULT 'not_sent' CHECK (marketing_status IN ('not_sent', 'sent', 'published', 'failed')),
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    published_at TIMESTAMP WITH TIME ZONE,
    marketing_sent_at TIMESTAMP WITH TIME ZONE,
    
    -- Form fields for image customization
    titlefontsize INTEGER DEFAULT 72,
    imagefit TEXT DEFAULT 'cover' CHECK (imagefit IN ('cover', 'contain', 'fill', 'scale-down', 'none')),
    imagealignment TEXT DEFAULT 'center' CHECK (imagealignment IN ('center', 'top', 'bottom', 'left', 'right', 'top-left', 'top-right', 'bottom-left', 'bottom-right')),
    imagezoom INTEGER DEFAULT 100 CHECK (imagezoom >= 10 AND imagezoom <= 200),
    imageverticalposition INTEGER DEFAULT 0,
    
    -- Instagram story size (2x for better quality)
    image_width INTEGER DEFAULT 1080,
    image_height INTEGER DEFAULT 1920
);

-- Create indexes for tech tips tuesday
CREATE INDEX IF NOT EXISTS idx_tech_tips_tuesday_status ON tech_tips_tuesday(status);
CREATE INDEX IF NOT EXISTS idx_tech_tips_tuesday_marketing_status ON tech_tips_tuesday(marketing_status);
CREATE INDEX IF NOT EXISTS idx_tech_tips_tuesday_created_by ON tech_tips_tuesday(created_by);
CREATE INDEX IF NOT EXISTS idx_tech_tips_tuesday_created_at ON tech_tips_tuesday(created_at DESC);

-- Enable RLS for tech tips tuesday
ALTER TABLE tech_tips_tuesday ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for tech tips tuesday
CREATE POLICY "Users can view tech tips tuesday content" ON tech_tips_tuesday
    FOR SELECT USING (true);

CREATE POLICY "Users can create tech tips tuesday content" ON tech_tips_tuesday
    FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update tech tips tuesday content" ON tech_tips_tuesday
    FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Users can delete tech tips tuesday content" ON tech_tips_tuesday
    FOR DELETE USING (auth.uid() = created_by);

-- Create updated_at trigger for tech tips tuesday
CREATE TRIGGER update_tech_tips_tuesday_updated_at
    BEFORE UPDATE ON tech_tips_tuesday
    FOR EACH ROW
    EXECUTE FUNCTION update_myth_buster_monday_updated_at();
