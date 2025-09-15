-- Create business_cards table for simple business card management
CREATE TABLE IF NOT EXISTS business_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(255) UNIQUE NOT NULL, -- For public URL like /business-card/john-smith
  name VARCHAR(255) NOT NULL, -- Contact person name
  title VARCHAR(255), -- Job title
  company VARCHAR(255), -- Company name
  phone VARCHAR(50), -- Phone number
  email VARCHAR(255), -- Email address
  website VARCHAR(255), -- Website URL
  
  -- Social media and review links
  google_review_url TEXT,
  facebook_url TEXT,
  instagram_url TEXT,
  linkedin_url TEXT,
  
  -- Settings
  is_active BOOLEAN DEFAULT true,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_business_cards_updated_at 
  BEFORE UPDATE ON business_cards 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create index on slug for fast public lookups
CREATE INDEX IF NOT EXISTS idx_business_cards_slug ON business_cards(slug);
CREATE INDEX IF NOT EXISTS idx_business_cards_active ON business_cards(is_active);

-- Row Level Security (RLS)
ALTER TABLE business_cards ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view all active business cards (for public access)
CREATE POLICY "Public can view active business cards" ON business_cards
  FOR SELECT USING (is_active = true);

-- Policy: Authenticated users can manage their own business cards
CREATE POLICY "Users can manage own business cards" ON business_cards
  FOR ALL USING (auth.uid() = created_by);

-- Policy: Admins can manage all business cards (assuming you have admin roles)
CREATE POLICY "Admins can manage all business cards" ON business_cards
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Insert a sample business card for testing
INSERT INTO business_cards (
  slug, name, title, company, phone, email, website,
  google_review_url, facebook_url, instagram_url,
  created_by
) VALUES (
  'sample-card',
  'John Smith',
  'Service Manager',
  'Mercedes Service Center',
  '+1 (555) 123-4567',
  'john.smith@example.com',
  'https://www.example.com',
  'https://g.page/r/example/review',
  'https://facebook.com/example',
  'https://instagram.com/example',
  (SELECT id FROM auth.users LIMIT 1) -- Use first available user for testing
) ON CONFLICT (slug) DO NOTHING;
