#!/usr/bin/env node

/**
 * 🚀 SETUP STORAGE BUCKET FOR SERVICE CONTRACTS
 * 
 * This script creates the required Supabase storage bucket for PDF storage
 * Run with: node scripts/setup-storage-bucket.js
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables:');
  console.error('   - NEXT_PUBLIC_SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  console.error('   Please check your .env.local file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupStorageBucket() {
  console.log('🚀 Setting up storage bucket for Service Contracts...\n');

  try {
    // Check if bucket already exists
    console.log('🔍 Checking if storage bucket exists...');
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('❌ Error listing buckets:', listError);
      return;
    }

    const existingBucket = buckets.find(bucket => bucket.name === 'service-documents');
    
    if (existingBucket) {
      console.log('✅ Storage bucket "service-documents" already exists!');
      console.log('📁 Bucket details:', {
        name: existingBucket.name,
        public: existingBucket.public,
        created: existingBucket.created_at
      });
    } else {
      // Create the bucket
      console.log('📦 Creating storage bucket "service-documents"...');
      
      const { data: newBucket, error: createError } = await supabase.storage.createBucket('service-documents', {
        public: true,
        fileSizeLimit: 52428800, // 50MB in bytes
        allowedMimeTypes: ['application/pdf']
      });

      if (createError) {
        console.error('❌ Error creating bucket:', createError);
        console.log('\n📋 MANUAL SETUP REQUIRED:');
        console.log('   1. Go to your Supabase Dashboard');
        console.log('   2. Navigate to Storage');
        console.log('   3. Click "Create Bucket"');
        console.log('   4. Name: "service-documents"');
        console.log('   5. Public: YES (enabled)');
        console.log('   6. File size limit: 50MB');
        console.log('   7. Allowed MIME types: application/pdf');
        return;
      }

      console.log('✅ Storage bucket "service-documents" created successfully!');
      console.log('📁 Bucket details:', newBucket);
    }

    // Test upload to verify bucket is working
    console.log('\n🧪 Testing bucket with a small test file...');
    
    const testContent = 'PDF storage test file';
    const testBuffer = Buffer.from(testContent);
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('service-documents')
      .upload('test/test-file.txt', testBuffer, {
        contentType: 'text/plain',
        upsert: true
      });

    if (uploadError) {
      console.error('❌ Test upload failed:', uploadError);
      return;
    }

    console.log('✅ Test upload successful!');

    // Get public URL for test file
    const { data: urlData } = supabase.storage
      .from('service-documents')
      .getPublicUrl('test/test-file.txt');

    console.log('🔗 Test file URL:', urlData.publicUrl);

    // Clean up test file
    const { error: deleteError } = await supabase.storage
      .from('service-documents')
      .remove(['test/test-file.txt']);

    if (!deleteError) {
      console.log('🧹 Test file cleaned up');
    }

    console.log('\n🎉 STORAGE SETUP COMPLETE!');
    console.log('📋 Your Service Contracts system can now:');
    console.log('   ✅ Upload generated PDFs to Supabase storage');
    console.log('   ✅ Store PDF URLs in contract records');
    console.log('   ✅ Display PDF download buttons in contract details');
    console.log('   ✅ Provide audit trail with PDF links');
    console.log('\n💡 Try creating a new service contract to test PDF storage!');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    console.log('\n📋 MANUAL SETUP REQUIRED:');
    console.log('   1. Go to your Supabase Dashboard');
    console.log('   2. Navigate to Storage');
    console.log('   3. Click "Create Bucket"');
    console.log('   4. Name: "service-documents"');
    console.log('   5. Public: YES (enabled)');
    console.log('   6. File size limit: 50MB');
    console.log('   7. Allowed MIME types: application/pdf');
  }
}

// Run the setup
setupStorageBucket(); 