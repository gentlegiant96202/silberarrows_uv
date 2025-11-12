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
    return null;
  }
}

/**
 * Main backfill function
 */
async function backfillFileSizes() {
  // Fetch all media records without file_size
  const { data: mediaRecords, error: fetchError } = await supabase
    .from('car_media')
    .select('id, url, kind, file_size')
    .is('file_size', null);
  
  if (fetchError) {
    process.exit(1);
  }
  
  if (!mediaRecords || mediaRecords.length === 0) {
    return;
  }
  let updated = 0;
  let failed = 0;
  let skipped = 0;
  
  for (let i = 0; i < mediaRecords.length; i++) {
    const record = mediaRecords[i];
    const progress = `[${i + 1}/${mediaRecords.length}]`;
    
    // Extract storage path from URL
    const storagePath = extractStoragePath(record.url);
    
    if (!storagePath) {
      skipped++;
      continue;
    }
    
    // Get file size from storage
    const fileSize = await getFileSize(storagePath);
    
    if (fileSize === null) {
      failed++;
      continue;
    }
    
    // Update database record
    const { error: updateError } = await supabase
      .from('car_media')
      .update({ file_size: fileSize })
      .eq('id', record.id);
    
    if (updateError) {
      failed++;
      continue;
    }
    
    // Format file size for display
    const sizeDisplay = fileSize < 1024 ? `${fileSize} B` :
                       fileSize < 1024 * 1024 ? `${(fileSize / 1024).toFixed(1)} KB` :
                       fileSize < 1024 * 1024 * 1024 ? `${(fileSize / (1024 * 1024)).toFixed(1)} MB` :
                       `${(fileSize / (1024 * 1024 * 1024)).toFixed(1)} GB`;
    updated++;
    
    // Add a small delay to avoid rate limiting
    if (i > 0 && i % 10 === 0) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  if (updated > 0) {
  } else if (failed > 0 || skipped > 0) {
  }
}

// Run the backfill
backfillFileSizes()
  .then(() => process.exit(0))
  .catch((error) => {
    process.exit(1);
  });



