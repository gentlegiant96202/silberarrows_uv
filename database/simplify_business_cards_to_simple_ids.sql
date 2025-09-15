-- Simplify business cards to use simple 5-digit IDs instead of UUIDs and slugs
-- This creates a single, simple URL system: /business-card/12345

BEGIN;

-- Create new table with simple ID structure
CREATE TABLE business_cards_new (
  id INTEGER PRIMARY KEY, -- Simple 5-digit number like 12345
  name VARCHAR(255) NOT NULL,
  title VARCHAR(255),
  company VARCHAR(255),
  landline_phone VARCHAR(50),
  mobile_phone VARCHAR(50),
  email VARCHAR(255),
  website VARCHAR(255),
  
  -- Social media and review links
  google_review_url TEXT,
  facebook_url TEXT,
  instagram_url TEXT,
  linkedin_url TEXT,
  
  -- QR Code tracking
  qr_generated_at TIMESTAMP WITH TIME ZONE,
  
  -- Settings
  is_active BOOLEAN DEFAULT true,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create function to generate random 5-digit ID
CREATE OR REPLACE FUNCTION generate_simple_id() RETURNS INTEGER AS $$
DECLARE
  new_id INTEGER;
  max_attempts INTEGER := 100;
  attempt INTEGER := 0;
BEGIN
  LOOP
    -- Generate random 5-digit number (10000 to 99999)
    new_id := floor(random() * 90000 + 10000)::INTEGER;
    
    -- Check if this ID already exists
    IF NOT EXISTS (SELECT 1 FROM business_cards_new WHERE id = new_id) THEN
      RETURN new_id;
    END IF;
    
    attempt := attempt + 1;
    IF attempt >= max_attempts THEN
      RAISE EXCEPTION 'Could not generate unique ID after % attempts', max_attempts;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Migrate existing data with new simple IDs
INSERT INTO business_cards_new (
  id, name, title, company, landline_phone, mobile_phone, email, website,
  google_review_url, facebook_url, instagram_url, linkedin_url,
  is_active, created_at, updated_at, created_by
)
SELECT 
  generate_simple_id(),
  name, title, company, landline_phone, mobile_phone, email, website,
  google_review_url, facebook_url, instagram_url, linkedin_url,
  is_active, created_at, updated_at, created_by
FROM business_cards;

-- Drop old table and rename new one
DROP TABLE business_cards;
ALTER TABLE business_cards_new RENAME TO business_cards;

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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_business_cards_active ON business_cards(is_active);
CREATE INDEX IF NOT EXISTS idx_business_cards_qr_generated ON business_cards(qr_generated_at);

-- Row Level Security (RLS)
ALTER TABLE business_cards ENABLE ROW LEVEL SECURITY;

-- Policy: Public can view active business cards
CREATE POLICY "Public can view active business cards" ON business_cards
  FOR SELECT USING (is_active = true);

-- Policy: Authenticated users can manage their own business cards
CREATE POLICY "Users can manage own business cards" ON business_cards
  FOR ALL USING (auth.uid() = created_by);

-- Policy: Admins can manage all business cards
CREATE POLICY "Admins can manage all business cards" ON business_cards
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

COMMIT;

-- Show the new simple IDs
SELECT id, name, title, company FROM business_cards;
