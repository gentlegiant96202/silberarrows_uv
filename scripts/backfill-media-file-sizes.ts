/**
 * Backfill File Sizes for Existing Media
 * 
 * This script fetches file size information from Supabase Storage
 * and updates the car_media table with file_size data for existing records.
 * 
 * Usage:
 *   npx tsx scripts/backfill-media-file-sizes.ts
 * 
 * Or with bun:
 *   bun run scripts/backfill-media-file-sizes.ts
 */

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   - NEXT_PUBLIC_SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface MediaRecord {
  id: string;
  url: string;
  kind: string;
  file_size: number | null;
}

/**
 * Extract storage path from Supabase URL
 */
function extractStoragePath(url: string): string | null {
  try {
    // Handle both direct Supabase URLs and custom domain URLs
    const patterns = [
      /\/storage\/v1\/object\/public\/car-media\/(.+)$/,
      /database\.silberarrows\.com\/storage\/v1\/object\/public\/car-media\/(.+)$/,
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return decodeURIComponent(match[1]);
      }
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Get file size from Supabase Storage
 */
async function getFileSize(path: string): Promise<number | null> {
  try {
    const { data, error } = await supabase.storage
      .from('car-media')
      .list(path.split('/')[0], {
        search: path.split('/').slice(1).join('/')
      });
    
    if (error || !data || data.length === 0) {
      return null;
    }
    
    // Find the exact file
    const fileName = path.split('/').pop();
    const file = data.find(f => f.name === fileName);
    
    if (file && file.metadata?.size) {
      return file.metadata.size;
    }
    
    return null;
  } catch (error) {
    console.error(`Error fetching file size for ${path}:`, error);
    return null;
  }
}

/**
 * Main backfill function
 */
async function backfillFileSizes() {
  console.log('🚀 Starting file size backfill process...\n');
  
  // Fetch all media records without file_size
  const { data: mediaRecords, error: fetchError } = await supabase
    .from('car_media')
    .select('id, url, kind, file_size')
    .is('file_size', null);
  
  if (fetchError) {
    console.error('❌ Error fetching media records:', fetchError);
    process.exit(1);
  }
  
  if (!mediaRecords || mediaRecords.length === 0) {
    console.log('✅ No records to update. All media already has file_size information!');
    return;
  }
  
  console.log(`📊 Found ${mediaRecords.length} media records without file_size`);
  console.log('⏳ Fetching file sizes from storage...\n');
  
  let updated = 0;
  let failed = 0;
  let skipped = 0;
  
  for (let i = 0; i < mediaRecords.length; i++) {
    const record = mediaRecords[i];
    const progress = `[${i + 1}/${mediaRecords.length}]`;
    
    // Extract storage path from URL
    const storagePath = extractStoragePath(record.url);
    
    if (!storagePath) {
      console.log(`${progress} ⚠️  Skipped: Could not extract path from URL (ID: ${record.id.substring(0, 8)})`);
      skipped++;
      continue;
    }
    
    // Get file size from storage
    const fileSize = await getFileSize(storagePath);
    
    if (fileSize === null) {
      console.log(`${progress} ❌ Failed: Could not fetch file size (ID: ${record.id.substring(0, 8)}, ${record.kind})`);
      failed++;
      continue;
    }
    
    // Update database record
    const { error: updateError } = await supabase
      .from('car_media')
      .update({ file_size: fileSize })
      .eq('id', record.id);
    
    if (updateError) {
      console.log(`${progress} ❌ Failed to update: ${updateError.message} (ID: ${record.id.substring(0, 8)})`);
      failed++;
      continue;
    }
    
    // Format file size for display
    const sizeDisplay = fileSize < 1024 ? `${fileSize} B` :
                       fileSize < 1024 * 1024 ? `${(fileSize / 1024).toFixed(1)} KB` :
                       fileSize < 1024 * 1024 * 1024 ? `${(fileSize / (1024 * 1024)).toFixed(1)} MB` :
                       `${(fileSize / (1024 * 1024 * 1024)).toFixed(1)} GB`;
    
    console.log(`${progress} ✅ Updated: ${record.kind} - ${sizeDisplay} (ID: ${record.id.substring(0, 8)})`);
    updated++;
    
    // Add a small delay to avoid rate limiting
    if (i > 0 && i % 10 === 0) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('📈 Backfill Summary:');
  console.log(`   ✅ Successfully updated: ${updated}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   ⚠️  Skipped: ${skipped}`);
  console.log(`   📊 Total processed: ${mediaRecords.length}`);
  console.log('='.repeat(60));
  
  if (updated > 0) {
    console.log('\n✅ File size backfill completed successfully!');
  } else if (failed > 0 || skipped > 0) {
    console.log('\n⚠️  File size backfill completed with some issues.');
  }
}

// Run the backfill
backfillFileSizes()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });



