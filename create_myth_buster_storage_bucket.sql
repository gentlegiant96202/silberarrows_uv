-- Create storage bucket for Myth Buster Monday generated images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'myth-buster-images',
    'myth-buster-images',
    true,
    52428800, -- 50MB limit
    ARRAY[
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp'
    ]
) ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Public Access to myth-buster-images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload to myth-buster-images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own myth-buster-images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own myth-buster-images" ON storage.objects;

-- Create policy for public read access to myth-buster-images bucket
CREATE POLICY "Public Access to myth-buster-images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'myth-buster-images');

-- Also allow authenticated users to upload to this bucket
CREATE POLICY "Authenticated users can upload to myth-buster-images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'myth-buster-images');

-- Allow users to update/delete their own objects
CREATE POLICY "Users can update their own myth-buster-images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'myth-buster-images');

CREATE POLICY "Users can delete their own myth-buster-images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'myth-buster-images');

-- Verify storage bucket creation
SELECT id, name, public FROM storage.buckets WHERE id = 'myth-buster-images';
