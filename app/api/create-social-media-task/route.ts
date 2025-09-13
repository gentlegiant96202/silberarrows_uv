import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import crypto from 'crypto'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Call ClipDrop “Uncrop” – we pass the original (cropped) image plus the exact pixels to extend on each side.
async function processWithClipDrop(
  imageBuffer: Buffer,
  extendUp: number,
  extendDown: number,
  extendLeft: number,
  extendRight: number,
  car: any,
  taskId: string,
) {
  try {
    console.log('🚀 Starting background ClipDrop Uncrop for task:', taskId)

    // Dynamic imports (keep dev bundle small & avoid ESM issues)
    // @ts-ignore
    const fetch = (await import('node-fetch')).default
    // @ts-ignore
    const FormData = (await import('form-data')).default

    const form = new FormData()
    form.append('image_file', imageBuffer, {
      filename: 'image.jpg',
      contentType: 'image/jpeg',
    })
    // Tell ClipDrop exactly how many pixels to add on each side
    if (extendUp) form.append('extend_up', extendUp.toString())
    if (extendDown) form.append('extend_down', extendDown.toString())
    if (extendLeft) form.append('extend_left', extendLeft.toString())
    if (extendRight) form.append('extend_right', extendRight.toString())

    const clipdropKey = process.env.CLIPDROP_API_KEY || '3893b8070a022dd453fd74ff1e6cc8cc1913509f06dc9f05b2b70787886e05ccfcfde300dc888d502193b1288d0e96d0'

    const res = await fetch('https://clipdrop-api.co/uncrop/v1', {
      method: 'POST',
      headers: {
        'x-api-key': clipdropKey,
      },
      body: form,
    })

    if (!res.ok) {
      const errorText = await res.text()
      console.error('ClipDrop error:', errorText)
      throw new Error('ClipDrop uncrop failed')
    }

    const inpaintedBuffer = await res.buffer()

    // Upload the ClipDrop result to Supabase
    const processedFileName = `${car.id}/social-media-clipdrop-${crypto.randomUUID()}.jpg`
    const { error: uploadError } = await supabase.storage
      .from('media-files')
      .upload(processedFileName, inpaintedBuffer, {
        contentType: 'image/jpeg',
        cacheControl: '3600',
        upsert: false,
      })

    if (uploadError) {
      console.error('Failed to upload ClipDrop image:', uploadError)
      throw new Error('ClipDrop image upload failed')
    }

    const { data: publicUrlData } = supabase.storage
      .from('media-files')
      .getPublicUrl(processedFileName)

    const processedImageUrl = publicUrlData.publicUrl
    console.log('✅ ClipDrop image uploaded:', processedImageUrl)

    // Update the task with the ClipDrop result
    const { error: updateError } = await supabase
      .from('design_tasks')
      .update({
        media_files: [processedImageUrl],
        description: `Social media content for ${car.make} ${car.model} - ${car.stock_number} (AI enhanced)`,
      })
      .eq('id', taskId)

    if (updateError) {
      console.error('Failed to update task with ClipDrop result:', updateError)
    } else {
      console.log('✅ Task updated with ClipDrop result:', taskId)
    }
  } catch (error) {
    console.error('Background ClipDrop processing failed for task', taskId, ':', error)
  }
}

export async function POST(request: NextRequest) {
  try {
    // @ts-ignore dynamic import to avoid build-time sharp resolution on Vercel
    const sharpDyn = (await import('sharp')).default

    const { carId } = await request.json()

    if (!carId) {
      return NextResponse.json({ error: 'Car ID is required' }, { status: 400 })
    }

    // 1. Fetch car details
    const { data: car, error: carError } = await supabase
      .from('cars')
      .select('*')
      .eq('id', carId)
      .single()

    if (carError || !car) {
      console.error('Car not found:', carError)
      return NextResponse.json({ error: 'Car not found' }, { status: 404 })
    }

    // 2. Get car images
    const { data: images, error: imagesError } = await supabase.storage
      .from('car-media')
      .list(carId)

    if (imagesError || !images || images.length === 0) {
      console.error('No images found for car:', imagesError)
      return NextResponse.json({ error: 'No images found for this car' }, { status: 404 })
    }

    console.log(`Found ${images.length} images for car ${car.stock_number}`)

    // Filter to image file types only (skip pdf, etc.)
    const imageFiles = images.filter((file) => /\.(jpe?g|png|webp)$/i.test(file.name))

    if (imageFiles.length === 0) {
      console.error('No valid image files found for car')
      return NextResponse.json({ error: 'No valid image files found' }, { status: 404 })
    }

    // Sort images by created_at to maintain inventory order consistency
    const sortedImages = imageFiles.sort((a, b) => {
      const aTime = new Date(a.created_at || a.updated_at || 0).getTime()
      const bTime = new Date(b.created_at || b.updated_at || 0).getTime()
      return aTime - bTime
    })

    // Process the first image (first uploaded/oldest)
    const firstImage = sortedImages[0]
    console.log(`Selected image ${1} of ${images.length}: ${firstImage.name}`)
    
    const { data: imageData } = supabase.storage
      .from('car-media')
      .getPublicUrl(`${carId}/${firstImage.name}`)
    
    const imageUrl = imageData.publicUrl
    console.log('Processing image:', imageUrl)

    // 3. Download and process the image
    const response = await fetch(imageUrl)
    if (!response.ok) {
      throw new Error('Failed to download image')
    }

    const buffer = await response.arrayBuffer()
    const imageBuffer = Buffer.from(buffer)

    // Get original image dimensions
    const { width: imgW, height: imgH } = await sharpDyn(imageBuffer).metadata()
    if (!imgW || !imgH) {
      throw new Error('Failed to get image dimensions')
    }

    // Target dimensions for 4:5 aspect ratio (Instagram)
    const targetWidth = 864
    const targetHeight = 1080

    console.log('Original image dimensions:', imgW, imgH)

    // Calculate how to fit the image in the target dimensions
    // Make the car fill ~90% of the available frame so it is larger / more in-focus.
    // We scale by the smaller ratio (height-first) then apply a 0.9 multiplier to leave a ~5% margin top+bottom.
    const baseScale = Math.min(targetWidth / imgW, targetHeight / imgH)
    const scaleFactor = baseScale * 0.9

    const scaledW = Math.floor(imgW * scaleFactor)
    const scaledH = Math.floor(imgH * scaleFactor)
 
    const leftPad = Math.round((targetWidth - scaledW) / 2)
    const topPad = Math.round((targetHeight - scaledH) / 2)
    
    console.log('Scaled dimensions:', scaledW, scaledH, 'Padding:', leftPad, topPad)

    // Resize the image to fit
    const resizedImageBuffer = await sharpDyn(imageBuffer)
      .resize(scaledW, scaledH, { fit: 'inside', withoutEnlargement: true })
      .toBuffer()

    // Build padded canvas (black border) and separate mask (white = fill, black = keep)
    const canvasBuffer = await sharpDyn({
      create: {
        width: targetWidth,
        height: targetHeight,
        channels: 3, // RGB for final JPEG conversion
        background: { r: 0, g: 0, b: 0 }, // black border (will be filled by LaMa)
      },
    } as any)
      .composite([
        {
          input: resizedImageBuffer,
          top: topPad,
          left: leftPad,
        },
      ])
      .jpeg({ quality: 95 })
      .toBuffer()

    // Generate binary mask: white border to be inpainted, black region for original car
    const blackRect = await sharpDyn({
      create: {
        width: scaledW,
        height: scaledH,
        channels: 3,
        background: { r: 0, g: 0, b: 0 }, // keep area
      },
    } as any).png().toBuffer()

    const maskBuffer = await sharpDyn({
      create: {
        width: targetWidth,
        height: targetHeight,
        channels: 3,
        background: { r: 255, g: 255, b: 255 }, // area to fill
      },
    } as any)
      .composite([
        {
          input: blackRect,
          top: topPad,
          left: leftPad,
        },
      ])
      .png()
      .toBuffer()

    const paddedImage = canvasBuffer;
    const mask = maskBuffer;

    console.log('Mask and padded image generated.')

    // 4. Create marketing task immediately with fallback image (fast response)
    // Create immediate fallback by smart-cropping to 4:5 (center-crop)
    // This avoids sending a letter-boxed frame with black bars.
    const fallbackBuffer = await sharpDyn(imageBuffer)
      .resize(targetWidth, targetHeight, {
        fit: 'cover',          // fills frame, cropping if necessary
        position: 'centre',    // keep car roughly centred
      })
      .jpeg({ quality: 90 })
      .toBuffer()

    const fallbackFileName = `${carId}/social-media-fallback-${crypto.randomUUID()}.jpg`
    const { data: fallbackUploadData, error: fallbackUploadError } = await supabase.storage
      .from('media-files')
      .upload(fallbackFileName, fallbackBuffer, {
        contentType: 'image/jpeg',
        cacheControl: '3600',
        upsert: false,
      })

    if (fallbackUploadError) {
      console.error('Failed to upload fallback image:', fallbackUploadError)
      throw new Error('Failed to upload processed image')
    }

    const { data: publicUrlData } = supabase.storage
      .from('media-files')
      .getPublicUrl(fallbackFileName)
    
    const processedImageUrl = publicUrlData.publicUrl
    console.log('✅ Fallback processed image uploaded:', processedImageUrl)

    // 5. Create marketing task in the design_tasks table (Intake column)
    const { data: createdTask, error: taskError } = await supabase
      .from('design_tasks')
      .insert({
        title: car.stock_number || `Car ${carId}`,
        description: `Social media content for ${car.make} ${car.model} - ${car.stock_number} (AI processing...)`,
        status: 'intake',
        task_type: 'design',
        requested_by: 'system',
        media_files: [processedImageUrl],
      })
      .select()
      .single()

    if (taskError) {
      console.error('Error creating marketing task:', taskError)
      throw new Error('Failed to create marketing task')
    }

    console.log('✅ Marketing task created:', createdTask.id)

    // 6. Start ClipDrop Uncrop processing in background (don't await)
    setImmediate(() => {
      const extendUp = topPad
      const extendDown = topPad
      const extendLeft = leftPad
      const extendRight = leftPad

      processWithClipDrop(
        resizedImageBuffer,
        extendUp,
        extendDown,
        extendLeft,
        extendRight,
        car,
        createdTask.id,
      ).catch((error) => {
        console.error('Background ClipDrop processing failed:', error)
      })
    })

    return NextResponse.json({ 
      success: true, 
      taskId: createdTask.id,
      message: 'Task created! AI enhancement processing in background...',
      imageUrl: processedImageUrl
    })

  } catch (error) {
    console.error('Error in social media task creation:', error)
    return NextResponse.json(
      { error: 'Failed to create social media task' },
      { status: 500 }
    )
  }
} 