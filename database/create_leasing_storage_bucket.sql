-- =====================================================
-- CREATE LEASING STORAGE BUCKET
-- =====================================================
-- This creates a dedicated Supabase Storage bucket for leasing customer documents

-- Create the leasing storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'leasing',
    'leasing',
    true,  -- Public bucket for easy access
    10485760,  -- 10MB file size limit per document
    ARRAY[
        'image/jpeg',
        'image/jpg', 
        'image/png',
        'image/webp',
        'application/pdf'
    ]
);

-- =====================================================
-- STORAGE POLICIES FOR LEASING BUCKET
-- =====================================================

-- Policy 1: Allow authenticated users to upload files
CREATE POLICY "Allow authenticated users to upload leasing documents" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'leasing' 
        AND auth.role() = 'authenticated'
    );

-- Policy 2: Allow authenticated users to view files
CREATE POLICY "Allow authenticated users to view leasing documents" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'leasing' 
        AND auth.role() = 'authenticated'
    );

-- Policy 3: Allow authenticated users to update files (for re-uploads)
CREATE POLICY "Allow authenticated users to update leasing documents" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'leasing' 
        AND auth.role() = 'authenticated'
    );

-- Policy 4: Allow authenticated users to delete files (for cleanup)
CREATE POLICY "Allow authenticated users to delete leasing documents" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'leasing' 
        AND auth.role() = 'authenticated'
    );

-- =====================================================
-- FOLDER STRUCTURE CONVENTION
-- =====================================================
/*
The leasing bucket will use this folder structure:

/leasing/
  ├── {customer_id}/
  │   ├── emirates-id/
  │   │   ├── front.jpg
  │   │   └── back.jpg
  │   ├── passport/
  │   │   ├── front.jpg
  │   │   └── back.jpg
  │   ├── driving-license/
  │   │   ├── front.jpg
  │   │   └── back.jpg
  │   ├── visa/
  │   │   └── copy.jpg
  │   └── address-proof/
  │       └── document.pdf

Example paths:
- /leasing/550e8400-e29b-41d4-a716-446655440000/emirates-id/front.jpg
- /leasing/550e8400-e29b-41d4-a716-446655440000/passport/back.jpg
- /leasing/550e8400-e29b-41d4-a716-446655440000/visa/copy.pdf

This structure provides:
✅ Clear organization by customer
✅ Logical grouping by document type
✅ Consistent naming for front/back documents
✅ Easy cleanup when customer is deleted
✅ Simple path construction in frontend
*/

-- =====================================================
-- USAGE EXAMPLE IN FRONTEND
-- =====================================================
/*
// Upload Emirates ID Front
const customerId = "550e8400-e29b-41d4-a716-446655440000";
const storagePath = `${customerId}/emirates-id/front.jpg`;

const { error } = await supabase.storage
  .from('leasing')
  .upload(storagePath, file, {
    contentType: file.type,
    cacheControl: '31536000', // 1 year cache
    upsert: true // Allow overwrite
  });

// Get public URL
const { data: { publicUrl } } = supabase.storage
  .from('leasing')
  .getPublicUrl(storagePath);

// Store URL in database
await supabase
  .from('leasing_customers')
  .update({ emirates_id_front_url: publicUrl })
  .eq('id', customerId);
*/
