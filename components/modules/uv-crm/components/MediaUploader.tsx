import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

interface Props {
  carId: string;
  onUploaded?: () => void;
  mediaKind?: 'photo' | 'video' | 'social_media' | 'catalog';
  acceptedFormats?: string;
  sizeRequirements?: {
    width?: number;
    height?: number;
    aspectRatio?: string;
  };
}

// Function to add light grey gradient background to transparent PNGs
const addGradientBackground = async (file: File): Promise<File> => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      
      if (!ctx) {
        resolve(file); // fallback to original if canvas context fails
        return;
      }
      
      // Create light grey gradient background
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      gradient.addColorStop(0, '#f8f8f8');  // Very light grey at top
      gradient.addColorStop(0.5, '#e8e8e8'); // Light grey in middle
      gradient.addColorStop(1, '#d8d8d8');   // Medium light grey at bottom
      
      // Fill background with gradient
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Draw the original image on top
      ctx.drawImage(img, 0, 0);
      
      // Convert canvas back to file
      canvas.toBlob((blob) => {
        if (blob) {
          const newFile = new File([blob], file.name.replace(/\.png$/i, '_with_bg.png'), {
            type: 'image/png',
            lastModified: Date.now()
          });
          resolve(newFile);
        } else {
          resolve(file); // fallback to original
        }
      }, 'image/png', 0.95);
    };
    
    img.onerror = () => {
      resolve(file); // fallback to original if image loading fails
    };
    
    img.src = URL.createObjectURL(file);
  });
};

// Function to check if PNG has transparency
const hasPngTransparency = async (file: File): Promise<boolean> => {
  if (!file.type.includes('png')) return false;
  
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      
      if (!ctx) {
        resolve(false);
        return;
      }
      
      ctx.drawImage(img, 0, 0);
      
      try {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        // Check for any pixels with alpha < 255 (transparency)
        for (let i = 3; i < data.length; i += 4) {
          if (data[i] < 255) {
            resolve(true);
            return;
          }
        }
        resolve(false);
      } catch (error) {
        // If we can't access image data (CORS, etc.), assume no transparency
        resolve(false);
      }
    };
    
    img.onerror = () => resolve(false);
    img.src = URL.createObjectURL(file);
  });
};

export default function MediaUploader({ 
  carId, 
  onUploaded, 
  mediaKind = 'photo',
  acceptedFormats = 'image/*,video/*',
  sizeRequirements 
}: Props) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [totalFiles, setTotalFiles] = useState(0);
  const [failedFiles, setFailedFiles] = useState<{ file: File, error: string }[]>([]);
  const [retrying, setRetrying] = useState(false);

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    setTotalFiles(files.length);
    setProgress(0);
    setFailedFiles([]);

    let failed: { file: File, error: string }[] = [];

    for (let idx = 0; idx < files.length; idx++) {
      const file = files[idx];
      let uploadFile: File | Blob = file;
      
      if (file.type.startsWith('image')) {
        try {
          // Check if PNG has transparency and add background if needed
          if (file.type.includes('png')) {
            const hasTransparency = await hasPngTransparency(file);
            if (hasTransparency) {
              console.log(`Adding light grey gradient background to transparent PNG: ${file.name}`);
              uploadFile = await addGradientBackground(file);
            }
          }
          // Note: Image compression removed - uploading original quality
        } catch (err) {
          console.warn('Image processing failed, falling back to original', err);
        }
      }

      const ext = file.name.split('.').pop();
      const path = `${carId}/${crypto.randomUUID()}.${ext}`;

      // Check if car already has media
      const { count: photoCount } = await supabase
        .from('car_media')
        .select('*', { head: true, count: 'exact' })
        .eq('car_id', carId)
        .eq('kind', 'photo');
      const isFirstPhoto = file.type.startsWith('image') && (!photoCount || photoCount === 0);

      // Upload to Storage bucket 'car-media'
      const { error: upErr } = await supabase.storage
        .from('car-media')
        .upload(path, uploadFile, {
          contentType: uploadFile.type || file.type,
          cacheControl: '3600',
          upsert: false,
        });
      if (upErr) {
        failed.push({ file, error: upErr.message });
        setFailedFiles([...failed]);
        setProgress(Math.round(((idx + 1) / files.length) * 100));
        continue;
      }

      // Get permanent public URL
      const { data: pub } = supabase.storage.from('car-media').getPublicUrl(path);
      const url = pub.publicUrl;

      // Increment sort_order for each new upload
      let currentMaxSortOrder = idx; // fallback if not fetched
      // Store the public URL in DB with proper sort_order
      let kind = mediaKind;
      if (mediaKind === 'photo' && file.type.startsWith('video')) {
        kind = 'video';
      }
      
      const { error: dbErr } = await supabase.from('car_media').insert({
        car_id: carId,
        kind: kind,
        url,
        is_primary: isFirstPhoto && (kind === 'photo'),
        sort_order: currentMaxSortOrder, // Ensure proper ordering
      });
      
      if (dbErr) {
        console.error('Database insert error:', dbErr);
        failed.push({ file, error: `Database error: ${dbErr.message}` });
        setFailedFiles([...failed]);
        setProgress(Math.round(((idx + 1) / files.length) * 100));
        continue;
      }

      setProgress(Math.round(((idx + 1) / files.length) * 100));
    }

    setProgress(100);
    setTimeout(() => {
      setUploading(false);
      setProgress(0);
      setTotalFiles(0);
      console.log('Upload completed for mediaKind:', mediaKind, 'calling onUploaded...');
      if (onUploaded) {
        onUploaded();
      }
    }, 800);
    e.target.value = '';
  };

  const retryFailed = async () => {
    if (!failedFiles.length) return;
    setRetrying(true);
    // Retry only failed files
    const filesToRetry = failedFiles.map(f => f.file);
    setFailedFiles([]);
    await handleFiles({ target: { files: filesToRetry } } as any);
    setRetrying(false);
  };

  return (
    <div className="space-y-1">
      <label className="block text-white/70 text-xs">
        {mediaKind === 'social_media' ? 'Upload Social Media Images' :
         mediaKind === 'catalog' ? 'Upload Catalog Image' :
         'Upload Photos / Videos'}
        {sizeRequirements && (
          <span className="block text-white/50 text-[10px] mt-1">
            {sizeRequirements.aspectRatio ? `Aspect ratio: ${sizeRequirements.aspectRatio}` : 
             `${sizeRequirements.width}×${sizeRequirements.height}`}
          </span>
        )}
      </label>
      <input
        type="file"
        multiple={mediaKind !== 'catalog'}
        accept={acceptedFormats}
        onChange={handleFiles}
        disabled={uploading || retrying}
        className="text-white text-xs"
      />
      {uploading && (
        <div className="w-full bg-gray-700/50 h-3 rounded overflow-hidden relative">
          <div
            className="bg-red-500 h-3 transition-all"
            style={{ width: `${progress}%` }}
          />
          <span className="absolute inset-0 text-[10px] flex items-center justify-center text-white/80">
            {Math.max(progress, 1)}% ({Math.round((progress / 100) * totalFiles)}/{totalFiles})
          </span>
        </div>
      )}
      {failedFiles.length > 0 && (
        <div className="mt-2 text-xs text-red-400">
          <div>Failed to upload:</div>
          <ul className="list-disc ml-4">
            {failedFiles.map(({ file, error }, idx) => (
              <li key={idx}>{file.name}: {error}</li>
            ))}
          </ul>
          <button
            className="mt-1 px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700"
            onClick={retryFailed}
            disabled={retrying}
          >
            {retrying ? 'Retrying...' : 'Retry Failed Uploads'}
          </button>
        </div>
      )}
    </div>
  );
} 