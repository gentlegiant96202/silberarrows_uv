-- Create storage bucket for buyer journey videos
INSERT INTO storage.buckets (id, name, public)
VALUES ('buyer-journey-videos', 'buyer-journey-videos', true)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies for buyer journey videos
CREATE POLICY "Allow authenticated users to upload buyer journey videos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'buyer-journey-videos');

CREATE POLICY "Allow public to view buyer journey videos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'buyer-journey-videos');

CREATE POLICY "Allow authenticated users to update buyer journey videos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'buyer-journey-videos');

CREATE POLICY "Allow authenticated users to delete buyer journey videos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'buyer-journey-videos');

