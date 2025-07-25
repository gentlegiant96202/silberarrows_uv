import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
// @ts-ignore – no types bundled
import imageCompression from 'browser-image-compression';

interface Props {
  carId: string;
  onUploaded?: () => void;
}

export default function MediaUploader({ carId, onUploaded }: Props) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [totalFiles, setTotalFiles] = useState(0);

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    setTotalFiles(files.length);
    setProgress(0);

    // Get current max sort_order to ensure proper ordering
    const { data: existingMedia } = await supabase
      .from('car_media')
      .select('sort_order')
      .eq('car_id', carId)
      .eq('kind', 'photo')
      .order('sort_order', { ascending: false })
      .limit(1);

    let currentMaxSortOrder = existingMedia?.[0]?.sort_order ?? -1;

    for (let idx=0; idx<files.length; idx++){
      const file = files[idx];
      // If this is an image, compress it before upload (max 1600 px, 1 MB)
      let uploadFile: File | Blob = file;
      if (file.type.startsWith('image')) {
        try {
          uploadFile = await imageCompression(file, {
            maxWidthOrHeight: 1600,
            maxSizeMB: 1,
            useWebWorker: true,
          });
        } catch (err) {
          console.warn('Image compression failed, falling back to original', err);
        }
      }

      const ext = file.name.split('.').pop();
      const path = `${carId}/${crypto.randomUUID()}.${ext}`;

      // Check if car already has media
      const { count: photoCount } = await supabase
        .from('car_media')
        .select('*', { head: true, count: 'exact' })
        .eq('car_id', carId)
        .eq('kind','photo');

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
        alert(upErr.message);
        continue;
      }

      // Get permanent public URL
      const { data: pub } = supabase.storage.from('car-media').getPublicUrl(path);
      const url = pub.publicUrl;

      // Increment sort_order for each new upload
      currentMaxSortOrder++;

      // Store the public URL in DB with proper sort_order
      await supabase.from('car_media').insert({
        car_id: carId,
        kind: file.type.startsWith('video') ? 'video' : 'photo',
        url,
        is_primary: isFirstPhoto,
        sort_order: currentMaxSortOrder, // Ensure proper ordering
      });

      // update progress & notify parent immediately
      setProgress(Math.round(((idx + 1) / files.length) * 100));
      onUploaded?.();
    }

    // Keep 100% bar visible briefly, then hide
    setProgress(100);
    setTimeout(() => {
    setUploading(false);
      setProgress(0);
      setTotalFiles(0);
    }, 800);

    e.target.value = '';
  };

  return (
    <div className="space-y-1">
      <label className="block text-white/70 text-xs">Upload Photos / Videos</label>
      <input
        type="file"
        multiple
        accept="image/*,video/*"
        onChange={handleFiles}
        disabled={uploading}
        className="text-white text-xs"
      />
      {uploading && (
        <div className="w-full bg-gray-700/50 h-3 rounded overflow-hidden relative">
          <div
            className="bg-red-500 h-3 transition-all"
            style={{ width: `${progress}%` }}
          />
          <span className="absolute inset-0 text-[10px] flex items-center justify-center text-white/80">
            {Math.max(progress,1)}% ({Math.round((progress/100)*totalFiles)}/{totalFiles})
          </span>
        </div>
      )}
    </div>
  );
} 