'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/shared/AuthProvider';
import { supabase } from '@/lib/supabaseClient';
import { Plus, Sparkles, Eye, Pencil, Trash2, Check, X, Send } from 'lucide-react';
import MythBusterMondayModal from './MythBusterMondayModal';

interface MythBusterItem {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  myth?: string;
  fact?: string;
  difficulty?: string;
  tools_needed?: string;
  warning?: string;
  badge_text?: string;
  media_files?: any[];
  media_files_a?: any[];
  media_files_b?: any[];
  content_type?: string;
  status: 'draft' | 'ready' | 'published' | 'archived';
  marketing_status: 'not_sent' | 'sent' | 'published' | 'failed';
  created_by?: string;
  created_at: string;
  updated_at: string;
  published_at?: string;
  marketing_sent_at?: string;
  titleFontSize?: number;
  imageFit?: string;
  imageAlignment?: string;
  imageZoom?: number;
  imageVerticalPosition?: number;
  image_width?: number;
  image_height?: number;
  template_type?: 'A' | 'B';
  generated_image_a_url?: string;
  generated_image_b_url?: string;
  generated_image_a_id?: string;
  generated_image_b_id?: string;
  // Database field names (snake_case) for backward compatibility
  titlefontsize?: number;
  imagefit?: string;
  imagealignment?: string;
  imagezoom?: number;
  imageverticalposition?: number;
}

const statusConfig = {
  draft: { label: 'Draft', color: 'bg-gradient-to-r from-neutral-700 to-neutral-600', textColor: 'text-neutral-200' },
  ready: { label: 'Ready', color: 'bg-gradient-to-r from-neutral-600 to-neutral-500', textColor: 'text-neutral-200' },
  published: { label: 'Published', color: 'bg-gradient-to-r from-neutral-800 to-neutral-700', textColor: 'text-neutral-300' },
  archived: { label: 'Archived', color: 'bg-gradient-to-r from-neutral-900 to-neutral-800', textColor: 'text-neutral-400' }
};

const marketingStatusConfig = {
  not_sent: { label: 'Not Sent', color: 'bg-gradient-to-r from-neutral-700 to-neutral-600', textColor: 'text-neutral-200' },
  sent: { label: 'Sent', color: 'bg-gradient-to-r from-neutral-600 to-neutral-500', textColor: 'text-neutral-200' },
  published: { label: 'Published', color: 'bg-gradient-to-r from-neutral-800 to-neutral-700', textColor: 'text-neutral-300' },
  failed: { label: 'Failed', color: 'bg-gradient-to-r from-neutral-900 to-neutral-800', textColor: 'text-neutral-400' }
};

const SkeletonCard = () => (
  <div className="bg-black border p-4 animate-pulse" style={{ borderColor: '#27272a' }}>
    <div className="h-3 bg-neutral-900 mb-2"></div>
    <div className="h-2 bg-neutral-900 mb-1.5 w-3/4"></div>
    <div className="h-2 bg-neutral-900 mb-3 w-1/2"></div>
    <div className="mb-3">
      <div className="h-4 bg-neutral-950 border" style={{ borderColor: '#27272a' }}></div>
    </div>
    <div className="space-y-2">
      <div className="h-8 bg-neutral-950 border" style={{ borderColor: '#27272a' }}></div>
      <div className="h-8 bg-neutral-950 border" style={{ borderColor: '#27272a' }}></div>
    </div>
  </div>
);

export default function MythBusterMondayBoard() {
  const { user } = useAuth();
  const [items, setItems] = useState<MythBusterItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<MythBusterItem | null>(null);
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [columnsVisible, setColumnsVisible] = useState(false);

  // Fetch data from API
  useEffect(() => {
    let isMounted = true;
    
    const fetchData = async () => {
      if (isMounted) {
        await fetchItems();
      }
    };
    
    fetchData();
    
    // Progressive fade-in animation
    const timer = setTimeout(() => {
      setColumnsVisible(true);
    }, 100);
    
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, []);

  const fetchItems = async () => {
    try {
      setLoading(true);
      
      // Get auth token for API call
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        return;
      }

      const response = await fetch('/api/myth-buster-monday', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch items');
      }

      const data = await response.json();
      setItems(data);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingItem(null);
    setShowModal(true);
  };

  const handleEdit = (item: MythBusterItem) => {
    setEditingItem(item);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;

    try {
      // Get auth token for API call
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        return;
      }
      
      const response = await fetch(`/api/myth-buster-monday?id=${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete item');
      }

      await fetchItems();
    } catch (error) {
    }
  };

  const handleStatusChange = async (id: string, newStatus: string, field: 'status' | 'marketing_status') => {
    try {
      // Get auth token for API call
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        return;
      }
      
      const response = await fetch('/api/myth-buster-monday', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id,
          [field]: newStatus
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update status');
      }

      await fetchItems();
    } catch (error) {
    }
  };

  // Format description for Creative Hub
  const formatMythBusterDescription = (item: MythBusterItem): string => {
    const sections: string[] = [];
    
    // Include title in description
    if (item.title) {
      sections.push('TITLE:');
      sections.push(item.title);
      sections.push('');
    }
    
    if (item.myth) {
      sections.push('MYTH:');
      sections.push(item.myth);
      sections.push('');
    }
    
    if (item.fact) {
      sections.push('FACT:');
      sections.push(item.fact);
    }
    
    return sections.filter(Boolean).join('\n');
  };

  // Send to Creative Hub
  const handleSendToCreativeHub = async (item: MythBusterItem) => {
    try {
      if (!user) {
        throw new Error('Authentication required');
      }

      // Check if images are generated
      if (!item.generated_image_a_url && !item.generated_image_b_url) {
        alert('Please generate images first before sending to Creative Hub');
        return;
      }

      // Get user display name
      const userName = user.user_metadata?.full_name || 
        user.email?.split('@')[0]?.replace(/\./g, ' ')?.replace(/\b\w/g, l => l.toUpperCase()) || 
        'Marketing Team';

      // Prepare media files - use generated images with proper format
      const mediaFiles = [];
      if (item.generated_image_a_url) {
        mediaFiles.push({
          url: item.generated_image_a_url,
          name: `myth-buster-template-a-${item.id}.jpg`,
          type: 'image/jpeg',
          size: 0,
          template_type: 'A'
        });
      }
      if (item.generated_image_b_url) {
        mediaFiles.push({
          url: item.generated_image_b_url,
          name: `myth-buster-template-b-${item.id}.jpg`,
          type: 'image/jpeg',
          size: 0,
          template_type: 'B'
        });
      }
      
      // Format description
      const formattedDescription = formatMythBusterDescription(item);
      // Create task data for the Marketing Kanban
      // Use 'in_progress' status so description shows in Caption field
      const taskData = {
        title: item.title,
        description: formattedDescription,
        status: 'in_progress',
        assignee: userName,
        task_type: 'design',
        due_date: null,
        media_files: mediaFiles
      };

      // Get auth token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No session found');
      }
      const response = await fetch('/api/design-tasks', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(taskData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create task in Creative Hub');
      }

      const newTask = await response.json();
      // Update marketing status to 'sent'
      await handleStatusChange(item.id, 'sent', 'marketing_status');
      
      alert('Successfully sent to Creative Hub!');
      
    } catch (error) {
      alert(`Failed to send to Creative Hub: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleSave = async (itemData: any) => {
    try {
      // Get auth token for API call
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        return;
      }

      const url = editingItem ? '/api/myth-buster-monday' : '/api/myth-buster-monday';
      const method = editingItem ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editingItem ? { ...itemData, id: editingItem.id } : itemData),
      });

      if (!response.ok) {
        throw new Error('Failed to save item');
      }

      const result = await response.json();
      // The API returns the data directly, not wrapped in a 'data' property
      const savedItem = result.data || result;
      // Don't refresh items or close modal - let user close with X button
      // await fetchItems();
      // setShowModal(false);
      // setEditingItem(null);
      
      return savedItem; // Return the saved item for auto-image generation
    } catch (error) {
      return null;
    }
  };

  const handleAIGenerate = async (prompt: string) => {
    setAiGenerating(true);
    try {
      // Implement AI generation logic here
      // This would call your AI generation API
    } catch (error) {
    } finally {
      setAiGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 bg-black min-h-screen">
        <div className="mb-6">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-white via-neutral-200 to-neutral-400 bg-clip-text text-transparent mb-2">Myth Buster Monday</h1>
          <p className="text-neutral-400">Create and manage myth-busting content for Mercedes service</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <style jsx global>{`
        /* Force pure zinc/neutral colors in this component */
        * {
          accent-color: #52525b !important;
        }
        
        input:focus, textarea:focus, select:focus, button:focus {
          outline: none !important;
          border-color: #52525b !important;
          box-shadow: none !important;
        }
        
        input:focus-visible, textarea:focus-visible, select:focus-visible {
          outline: none !important;
          border-color: #52525b !important;
          box-shadow: none !important;
        }
        
        /* Ensure checkboxes and radio buttons are pure zinc */
        input[type="checkbox"]:checked,
        input[type="radio"]:checked {
          background-color: #71717a !important;
          border-color: #71717a !important;
        }
      `}</style>
      <div className="p-6 bg-black min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-white via-neutral-200 to-neutral-400 bg-clip-text text-transparent mb-2">Myth Buster Monday</h1>
            <p className="text-neutral-400">Create and manage myth-busting content for Mercedes service</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowAIModal(true)}
              className="px-4 py-2 bg-gradient-to-r from-neutral-700 to-neutral-600 text-white rounded-lg hover:from-neutral-600 hover:to-neutral-500 transition-all duration-200 flex items-center gap-2 border"
              style={{ borderColor: '#52525b' }}
            >
              <Sparkles className="w-4 h-4" />
              AI Generate
            </button>
            <button
              onClick={handleCreate}
              className="px-4 py-2 bg-gradient-to-r from-neutral-700 to-neutral-600 text-white rounded-lg hover:from-neutral-600 hover:to-neutral-500 transition-all duration-200 flex items-center gap-2 border"
              style={{ borderColor: '#52525b' }}
            >
              <Plus className="w-4 h-4" />
              New Myth Buster
            </button>
          </div>
        </div>
      </div>

      {/* Items Grid */}
      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4 transition-all duration-500 ${
        columnsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}>
        {items.map((item) => (
          <div key={item.id} className="bg-black border p-4 transition-all duration-200 hover:border-opacity-80" style={{ borderColor: '#27272a' }}>
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h3 className="text-sm font-medium text-neutral-200 mb-1 line-clamp-2">{item.title}</h3>
              </div>
              <div className="flex gap-1 ml-2">
                <button
                  onClick={() => handleEdit(item)}
                  className="p-1 text-neutral-600 hover:text-neutral-400 hover:bg-neutral-900 transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="p-1 text-neutral-700 hover:text-neutral-500 hover:bg-neutral-900 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Content Preview */}
            <div className="mb-3 space-y-2 text-xs">
              {item.myth && (
                <div className="border-l-2 pl-2" style={{ borderColor: '#27272a' }}>
                  <span className="text-neutral-600 uppercase tracking-wide text-[10px]">Myth</span>
                  <p className="text-neutral-400 line-clamp-1">{item.myth}</p>
                </div>
              )}
              {item.fact && (
                <div className="border-l-2 pl-2" style={{ borderColor: '#3f3f46' }}>
                  <span className="text-neutral-600 uppercase tracking-wide text-[10px]">Fact</span>
                  <p className="text-neutral-400 line-clamp-1">{item.fact}</p>
                </div>
              )}
            </div>

            {/* Generated Images Indicator */}
            {(item.generated_image_a_url || item.generated_image_b_url) && (
              <div className="mb-3 py-1.5 px-2 bg-neutral-950 border text-center" style={{ borderColor: '#27272a' }}>
                <span className="text-[10px] text-neutral-500 uppercase tracking-wider">
                  ✓ {item.generated_image_a_url && item.generated_image_b_url ? '2 Images' : '1 Image'} Generated
                </span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-2">
              {/* Ready Toggle */}
              <button
                onClick={() => handleStatusChange(item.id, item.status === 'draft' ? 'ready' : 'draft', 'status')}
                className={`w-full px-3 py-2 text-xs font-medium transition-all border ${
                  item.status === 'ready' 
                    ? 'bg-gradient-to-r from-neutral-200 to-neutral-300 hover:from-neutral-300 hover:to-neutral-400 text-black' 
                    : 'bg-neutral-950 hover:bg-neutral-900 text-neutral-500'
                }`}
                style={{ borderColor: item.status === 'ready' ? '#a3a3a3' : '#27272a' }}
              >
                {item.status === 'ready' ? '✓ Ready' : 'Mark Ready'}
              </button>
              
              {/* Send to Creative Hub */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSendToCreativeHub(item);
                }}
                disabled={item.status !== 'ready' || (!item.generated_image_a_url && !item.generated_image_b_url)}
                className={`w-full px-3 py-2 text-xs font-medium transition-all border flex items-center justify-center gap-1.5 ${
                  item.status === 'ready' && (item.generated_image_a_url || item.generated_image_b_url)
                    ? 'bg-gradient-to-r from-neutral-700 to-neutral-800 hover:from-neutral-600 hover:to-neutral-700 text-neutral-200 cursor-pointer'
                    : 'bg-neutral-950 text-neutral-700 cursor-not-allowed opacity-50'
                }`}
                style={{ borderColor: item.status === 'ready' && (item.generated_image_a_url || item.generated_image_b_url) ? '#52525b' : '#18181b' }}
              >
                <Send className="w-3 h-3" />
                {item.marketing_status === 'sent' ? 'Sent to Hub' : 'Send to Hub'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {items.length === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🔧</div>
          <h3 className="text-xl font-semibold bg-gradient-to-r from-white to-neutral-300 bg-clip-text text-transparent mb-2">No Myth Buster content yet</h3>
          <p className="text-neutral-400 mb-6">Create your first myth-busting content to get started</p>
          <button
            onClick={handleCreate}
            className="px-6 py-3 bg-gradient-to-r from-neutral-700 to-neutral-600 text-white rounded-lg hover:from-neutral-600 hover:to-neutral-500 transition-all duration-200 flex items-center gap-2 mx-auto border"
            style={{ borderColor: '#52525b' }}
          >
            <Plus className="w-5 h-5" />
            Create First Myth Buster
          </button>
        </div>
      )}

      {/* Modals */}
      {showModal && (
        <MythBusterMondayModal
          isOpen={showModal}
          onClose={async () => {
            setShowModal(false);
            setEditingItem(null);
            // Refresh items when modal is closed
            await fetchItems();
          }}
          onSave={handleSave}
          editingItem={editingItem}
        />
      )}
      </div>
    </>
  );
}
