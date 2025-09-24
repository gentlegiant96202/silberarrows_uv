import { useState, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';

interface Props {
  vehicleId: string;
  onUploaded?: () => void;
  variant?: 'default' | 'button';
  buttonLabel?: string;
}

export default function LeasingDocUploader({ vehicleId, onUploaded, variant = 'default', buttonLabel = 'Upload' }: Props) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);

    try {
      // Get current documents from vehicle record
      const { data: vehicle } = await supabase
        .from('leasing_inventory')
        .select('documents')
        .eq('id', vehicleId)
        .single();

      const currentDocs = vehicle?.documents || [];

      for (const file of files) {
        const ext = file.name.split('.').pop();
        const path = `${vehicleId}/docs-${crypto.randomUUID()}.${ext}`;

        // Upload to leasing bucket
        const { error: upErr } = await supabase.storage
          .from('leasing')
          .upload(path, file, {
            contentType: file.type,
            cacheControl: '3600',
            upsert: false,
          });

        if (upErr) { 
          console.error('Upload error:', upErr);
          alert(`Error uploading ${file.name}: ${upErr.message}`); 
          continue; 
        }

        // Get public URL
        const { data: pub } = supabase.storage.from('leasing').getPublicUrl(path);

        // Create document object
        const docObj = {
          id: crypto.randomUUID(),
          url: pub.publicUrl,
          filename: file.name,
          type: 'document',
          uploaded_at: new Date().toISOString()
        };

        // Add to documents array
        currentDocs.push(docObj);
      }

      // Update vehicle record with new documents
      const { error: updateError } = await supabase
        .from('leasing_inventory')
        .update({ documents: currentDocs })
        .eq('id', vehicleId);

      if (updateError) {
        console.error('Error updating documents:', updateError);
        alert('Error saving document references');
      }

    } catch (error) {
      console.error('Error uploading documents:', error);
      alert('Error uploading documents');
    } finally {
      setUploading(false);
      if (e.target) e.target.value = '';
      onUploaded?.();
    }
  };

  if (variant === 'button') {
    return (
      <div className="flex items-center">
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="application/pdf"
          onChange={handleFiles}
          disabled={uploading}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="text-sm bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 h-9 min-w-[160px] rounded transition-colors disabled:opacity-50"
        >
          {uploading ? 'Uploading…' : buttonLabel}
        </button>
      </div>
    );
  }

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
