import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

interface Props {
  carId: string;
  onUploaded?: () => void;
}

export default function DocUploader({ carId, onUploaded }: Props) {
  const [uploading, setUploading] = useState(false);

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);

    for (const file of files) {
      const ext = file.name.split('.').pop();
      const path = `${carId}/docs-${crypto.randomUUID()}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from('car-media')
        .upload(path, file, {
          contentType: file.type,
          cacheControl: '3600',
          upsert: false,
        });
      if (upErr) { alert(upErr.message); continue; }

      const { data: pub } = supabase.storage.from('car-media').getPublicUrl(path);
      const url = pub.publicUrl;

      await supabase.from('car_media').insert({
        car_id: carId,
        kind: 'document',
        url,
        is_primary: false,
      });
    }

    setUploading(false);
    e.target.value = '';
    onUploaded?.();
  };

  return (
    <div className="space-y-1">
      <label className="block text-white/70 text-xs">Upload Vehicle Documents (PDF)</label>
      <input
        type="file"
        multiple
        accept="application/pdf"
        onChange={handleFiles}
        disabled={uploading}
        className="text-white text-xs"
      />
      {uploading && <p className="text-xs text-white/60">Uploading...</p>}
    </div>
  );
} 