import React, { useState } from 'react';
import dayjs from 'dayjs';
import { supabase } from '@/lib/supabaseClient';

export interface NoteItem {
  ts: string; // ISO timestamp
  text: string;
  user?: string;
}

interface NotesTimelineProps {
  leadId?: string; // optional; if omitted works in local mode
  notes: NoteItem[];
  canEdit: boolean;
  onAdded?: (newNote: NoteItem) => void;
}

const normalizeNotes = (input: any): NoteItem[] => {
  if (!input) return [];
  if (Array.isArray(input)) return input as NoteItem[];
  if (typeof input === 'string' && input.trim() !== '') {
    return [{ ts: new Date().toISOString(), text: input.trim() }];
  }
  return [];
};

export default function NotesTimeline({ leadId, notes, canEdit, onAdded }: NotesTimelineProps) {
  const [items, setItems] = useState<NoteItem[]>(normalizeNotes(notes));
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);

  // Update internal items when notes prop changes (fix for timeline persistence)
  React.useEffect(() => {
    const normalizedNotes = normalizeNotes(notes);
    setItems(normalizedNotes);
  }, [notes]);

  const handleAdd = async () => {
    const text = draft.trim();
    if (!text) return;
    const newNote: NoteItem = { ts: new Date().toISOString(), text };

    setSaving(true);
    try {
      if (leadId) {
        const { data, error } = await supabase.rpc('append_note', {
          p_lead: leadId,
          p_note: newNote
        });
        if (error) throw error;
        const updated = Array.isArray(data) ? (data as NoteItem[]) : items;
        setItems(updated);
      } else {
        // local-only mode (before lead exists)
        setItems(prev => [newNote, ...prev]);
      }
      setDraft('');
      onAdded?.(newNote);
    } catch (err) {
      console.error('Failed to add note', err);
      alert('Failed to add note.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-2 text-[10px] text-white/80">
      {canEdit && (
        <div className="space-y-1">
          <textarea
            value={draft}
            onChange={e => setDraft(e.target.value)}
            className="w-full bg-black/30 border border-white/10 rounded p-1 text-[10px] focus:outline-none"
            placeholder="Add a note…"
            rows={2}
          />
          <button
            onClick={handleAdd}
            disabled={saving || !draft.trim()}
            className="w-full bg-brand hover:bg-brand/90 text-white rounded py-1 disabled:opacity-40"
          >
            {saving ? 'Saving…' : 'Add Note'}
          </button>
        </div>
      )}

      {items.length === 0 && <div className="text-white/40 italic">No notes yet</div>}

      {items.map((n, idx) => (
        <div key={idx} className="flex gap-1 items-start">
          <span className="text-white/40 min-w-[4rem]">{dayjs(n.ts).format('DD MMM YY')}</span>
          <span className="flex-1 whitespace-pre-line">{n.text}</span>
        </div>
      ))}
    </div>
  );
} 