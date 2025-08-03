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
      await supabase.from('car_media').insert({
        car_id: carId,
        kind: file.type.startsWith('video') ? 'video' : 'photo',
        url,
        is_primary: isFirstPhoto,
        sort_order: currentMaxSortOrder, // Ensure proper ordering
      });

      setProgress(Math.round(((idx + 1) / files.length) * 100));
    }

    setProgress(100);
    setTimeout(() => {
      setUploading(false);
      setProgress(0);
      setTotalFiles(0);
      if (onUploaded) onUploaded();
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
      <label className="block text-white/70 text-xs">Upload Photos / Videos</label>
      <input
        type="file"
        multiple
        accept="image/*,video/*"
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