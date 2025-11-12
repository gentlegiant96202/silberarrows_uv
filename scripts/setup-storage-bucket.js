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
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupStorageBucket() {
  try {
    // Check if bucket already exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      return;
    }

    const existingBucket = buckets.find(bucket => bucket.name === 'service-documents');
    
    if (existingBucket) {
    } else {
      // Create the bucket
      const { data: newBucket, error: createError } = await supabase.storage.createBucket('service-documents', {
        public: true,
        fileSizeLimit: 52428800, // 50MB in bytes
        allowedMimeTypes: ['application/pdf']
      });

      if (createError) {
        return;
      }
    }

    // Test upload to verify bucket is working
    const testContent = 'PDF storage test file';
    const testBuffer = Buffer.from(testContent);
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('service-documents')
      .upload('test/test-file.txt', testBuffer, {
        contentType: 'text/plain',
        upsert: true
      });

    if (uploadError) {
      return;
    }
    // Get public URL for test file
    const { data: urlData } = supabase.storage
      .from('service-documents')
      .getPublicUrl('test/test-file.txt');
    // Clean up test file
    const { error: deleteError } = await supabase.storage
      .from('service-documents')
      .remove(['test/test-file.txt']);

    if (!deleteError) {
    }
  } catch (error) {
  }
}

// Run the setup
setupStorageBucket(); 