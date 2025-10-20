import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface OptimizationResult {
  id: string;
  success: boolean;
  originalSize: number;
  optimizedSize: number;
  savingsPercent: number;
  skipped?: boolean;
  skipReason?: string;
  error?: string;
}

/**
 * Extract storage path from Supabase URL
 */
function extractStoragePath(url: string): string | null {
  try {
    const patterns = [
      /\/storage\/v1\/object\/public\/car-media\/(.+)$/,
      /database\.silberarrows\.com\/storage\/v1\/object\/public\/car-media\/(.+)$/,
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return decodeURIComponent(match[1].split('?')[0]);
      }
    }
    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Download image from URL
 */
async function downloadImage(url: string): Promise<Buffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Optimize image using Sharp
 */
async function optimizeImage(buffer: Buffer, quality: number = 85): Promise<{ buffer: Buffer; format: string }> {
  const image = sharp(buffer);
  const metadata = await image.metadata();
  
  // Determine optimal format and settings
  let optimized: sharp.Sharp;
  let format = 'jpeg';
  
  if (metadata.format === 'png' && metadata.hasAlpha) {
    // Keep PNG format if it has transparency
    optimized = image.png({
      quality: quality,
      compressionLevel: 9,
      adaptiveFiltering: true,
    });
    format = 'png';
  } else {
    // Convert to JPEG for better compression
    optimized = image.jpeg({
      quality: quality,
      mozjpeg: true, // Use mozjpeg for better compression
    });
    format = 'jpeg';
  }
  
  // Resize if image is very large (max 2000px on longest side)
  if (metadata.width && metadata.width > 2000) {
    optimized = optimized.resize(2000, null, {
      fit: 'inside',
      withoutEnlargement: true,
    });
  } else if (metadata.height && metadata.height > 2000) {
    optimized = optimized.resize(null, 2000, {
      fit: 'inside',
      withoutEnlargement: true,
    });
  }
  
  const outputBuffer = await optimized.toBuffer();
  return { buffer: outputBuffer, format };
}


export async function POST(request: NextRequest) {
  try {
    const { carId, quality = 85, minSizeKB = 500 } = await request.json();
    
    if (!carId) {
      return NextResponse.json({ error: 'Missing carId' }, { status: 400 });
    }
    
    console.log(`🎨 Starting image optimization for car: ${carId}`);
    console.log(`   Quality: ${quality}%, Min size: ${minSizeKB}KB`);
    
    // Fetch all photo media for this car
    const { data: mediaItems, error: fetchError } = await supabase
      .from('car_media')
      .select('*')
      .eq('car_id', carId)
      .in('kind', ['photo', 'social_media', 'catalog'])
      .order('sort_order', { ascending: true });
    
    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }
    
    if (!mediaItems || mediaItems.length === 0) {
      return NextResponse.json({ message: 'No images found to optimize' }, { status: 200 });
    }
    
    const results: OptimizationResult[] = [];
    let totalOriginalSize = 0;
    let totalOptimizedSize = 0;
    let optimizedCount = 0;
    let skippedCount = 0;
    
    for (const item of mediaItems) {
      const result: OptimizationResult = {
        id: item.id,
        success: false,
        originalSize: item.file_size || 0,
        optimizedSize: 0,
        savingsPercent: 0,
      };
      
      try {
        // Skip if file size is not available
        if (!item.file_size) {
          result.skipped = true;
          result.skipReason = 'No file size information';
          results.push(result);
          skippedCount++;
          continue;
        }
        
        // Skip if already small enough
        const sizeInKB = item.file_size / 1024;
        if (sizeInKB < minSizeKB) {
          result.skipped = true;
          result.skipReason = `Already optimized (${sizeInKB.toFixed(1)}KB < ${minSizeKB}KB)`;
          results.push(result);
          skippedCount++;
          continue;
        }
        
        // Extract storage path
        const storagePath = extractStoragePath(item.url);
        if (!storagePath) {
          result.skipped = true;
          result.skipReason = 'Could not extract storage path';
          results.push(result);
          skippedCount++;
          continue;
        }
        
        console.log(`📥 Processing: ${storagePath} (${(sizeInKB).toFixed(1)}KB)`);
        
        // Download original image
        const originalBuffer = await downloadImage(item.url);
        
        // Optimize image
        const { buffer: optimizedBuffer, format } = await optimizeImage(originalBuffer, quality);
        
        // Check if optimization actually reduced size
        if (optimizedBuffer.length >= originalBuffer.length) {
          result.skipped = true;
          result.skipReason = 'Optimization did not reduce size';
          results.push(result);
          skippedCount++;
          continue;
        }
        
        // Upload optimized image (replace original)
        const contentType = format === 'png' ? 'image/png' : 'image/jpeg';
        const { error: uploadError } = await supabase.storage
          .from('car-media')
          .upload(storagePath, optimizedBuffer, {
            contentType,
            cacheControl: '3600',
            upsert: true, // Overwrite existing
          });
        
        if (uploadError) {
          throw new Error(`Upload failed: ${uploadError.message}`);
        }
        
        // Update file_size in database
        const { error: updateError } = await supabase
          .from('car_media')
          .update({ file_size: optimizedBuffer.length })
          .eq('id', item.id);
        
        if (updateError) {
          console.error('Failed to update file_size:', updateError);
        }
        
        // Calculate savings
        const savings = ((originalBuffer.length - optimizedBuffer.length) / originalBuffer.length) * 100;
        
        result.success = true;
        result.originalSize = originalBuffer.length;
        result.optimizedSize = optimizedBuffer.length;
        result.savingsPercent = savings;
        
        totalOriginalSize += originalBuffer.length;
        totalOptimizedSize += optimizedBuffer.length;
        optimizedCount++;
        
        console.log(`✅ Optimized: ${(originalBuffer.length / 1024).toFixed(1)}KB → ${(optimizedBuffer.length / 1024).toFixed(1)}KB (${savings.toFixed(1)}% savings)`);
        
        results.push(result);
        
      } catch (error: any) {
        console.error(`❌ Error processing ${item.id}:`, error);
        result.error = error.message;
        results.push(result);
      }
    }
    
    const totalSavings = totalOriginalSize > 0 
      ? ((totalOriginalSize - totalOptimizedSize) / totalOriginalSize) * 100 
      : 0;
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 Optimization Summary:');
    console.log(`   ✅ Optimized: ${optimizedCount}`);
    console.log(`   ⏭️  Skipped: ${skippedCount}`);
    console.log(`   💾 Total savings: ${((totalOriginalSize - totalOptimizedSize) / 1024 / 1024).toFixed(2)}MB (${totalSavings.toFixed(1)}%)`);
    console.log('='.repeat(60));
    
    return NextResponse.json({
      success: true,
      summary: {
        total: mediaItems.length,
        optimized: optimizedCount,
        skipped: skippedCount,
        totalOriginalSize,
        totalOptimizedSize,
        totalSavingsPercent: totalSavings,
      },
      results,
    });
    
  } catch (error: any) {
    console.error('❌ Optimization failed:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

