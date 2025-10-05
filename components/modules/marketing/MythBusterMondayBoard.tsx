'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/shared/AuthProvider';
import { supabase } from '@/lib/supabaseClient';
import { Plus, Sparkles, Eye, Pencil, Trash2, Check, X } from 'lucide-react';
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
  // Database field names (snake_case) for backward compatibility
  titlefontsize?: number;
  imagefit?: string;
  imagealignment?: string;
  imagezoom?: number;
  imageverticalposition?: number;
}

const statusConfig = {
  draft: { label: 'Draft', color: 'bg-gradient-to-r from-gray-700 to-gray-600', textColor: 'text-gray-200' },
  ready: { label: 'Ready', color: 'bg-gradient-to-r from-gray-600 to-gray-500', textColor: 'text-gray-200' },
  published: { label: 'Published', color: 'bg-gradient-to-r from-gray-800 to-gray-700', textColor: 'text-gray-300' },
  archived: { label: 'Archived', color: 'bg-gradient-to-r from-gray-900 to-gray-800', textColor: 'text-gray-400' }
};

const marketingStatusConfig = {
  not_sent: { label: 'Not Sent', color: 'bg-gradient-to-r from-gray-700 to-gray-600', textColor: 'text-gray-200' },
  sent: { label: 'Sent', color: 'bg-gradient-to-r from-gray-600 to-gray-500', textColor: 'text-gray-200' },
  published: { label: 'Published', color: 'bg-gradient-to-r from-gray-800 to-gray-700', textColor: 'text-gray-300' },
  failed: { label: 'Failed', color: 'bg-gradient-to-r from-gray-900 to-gray-800', textColor: 'text-gray-400' }
};

const SkeletonCard = () => (
  <div className="bg-gradient-to-br from-gray-900/80 to-gray-800/80 rounded-lg p-4 animate-pulse border border-gray-700/50 backdrop-blur-sm">
    <div className="h-3 bg-gradient-to-r from-gray-700 to-gray-600 rounded mb-2"></div>
    <div className="h-2 bg-gradient-to-r from-gray-700 to-gray-600 rounded mb-1.5 w-3/4"></div>
    <div className="h-2 bg-gradient-to-r from-gray-700 to-gray-600 rounded mb-3 w-1/2"></div>
    <div className="flex gap-1.5 mb-3">
      <div className="h-5 bg-gradient-to-r from-gray-700 to-gray-600 rounded-full w-12"></div>
      <div className="h-5 bg-gradient-to-r from-gray-700 to-gray-600 rounded-full w-16"></div>
    </div>
    <div className="flex gap-1.5">
      <div className="h-6 bg-gradient-to-r from-gray-700 to-gray-600 rounded w-16"></div>
      <div className="h-6 bg-gradient-to-r from-gray-700 to-gray-600 rounded w-16"></div>
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
        console.error('No session found');
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
      console.error('Error fetching myth buster monday items:', error);
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
        console.error('No session found');
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
      console.error('Error deleting item:', error);
    }
  };

  const handleStatusChange = async (id: string, newStatus: string, field: 'status' | 'marketing_status') => {
    try {
      // Get auth token for API call
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error('No session found');
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
      console.error('Error updating status:', error);
    }
  };

  const handleSave = async (itemData: any) => {
    console.log('💾 handleSave called in parent component with:', itemData);
    try {
      // Get auth token for API call
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error('No session found');
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
      console.log('💾 API response:', result);
      console.log('💾 API response type:', typeof result);
      console.log('💾 API response has data property:', 'data' in result);
      
      // The API returns the data directly, not wrapped in a 'data' property
      const savedItem = result.data || result;
      console.log('💾 savedItem:', savedItem);
      console.log('💾 savedItem has id:', !!savedItem?.id);

      // Don't refresh items or close modal - let user close with X button
      // await fetchItems();
      // setShowModal(false);
      // setEditingItem(null);
      
      return savedItem; // Return the saved item for auto-image generation
    } catch (error) {
      console.error('Error saving item:', error);
      return null;
    }
  };

  const handleAIGenerate = async (prompt: string) => {
    setAiGenerating(true);
    try {
      // Implement AI generation logic here
      // This would call your AI generation API
      console.log('AI Generation prompt:', prompt);
    } catch (error) {
      console.error('Error generating content:', error);
    } finally {
      setAiGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 bg-black min-h-screen">
        <div className="mb-6">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent mb-2">Myth Buster Monday</h1>
          <p className="text-gray-400">Create and manage myth-busting content for Mercedes service</p>
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
    <div className="p-6 bg-black min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent mb-2">Myth Buster Monday</h1>
            <p className="text-gray-400">Create and manage myth-busting content for Mercedes service</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowAIModal(true)}
              className="px-4 py-2 bg-gradient-to-r from-gray-700 to-gray-600 text-white rounded-lg hover:from-gray-600 hover:to-gray-500 transition-all duration-200 flex items-center gap-2 border border-gray-600"
            >
              <Sparkles className="w-4 h-4" />
              AI Generate
            </button>
            <button
              onClick={handleCreate}
              className="px-4 py-2 bg-gradient-to-r from-gray-700 to-gray-600 text-white rounded-lg hover:from-gray-600 hover:to-gray-500 transition-all duration-200 flex items-center gap-2 border border-gray-600"
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
          <div key={item.id} className="bg-gradient-to-br from-gray-900/80 to-gray-800/80 rounded-lg p-4 hover:from-gray-800/90 hover:to-gray-700/90 transition-all duration-200 border border-gray-700/50 backdrop-blur-sm">
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h3 className="text-base font-semibold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent mb-1 line-clamp-2">{item.title}</h3>
                {item.subtitle && (
                  <p className="text-xs text-gray-400 mb-1">{item.subtitle}</p>
                )}
              </div>
              <div className="flex gap-1 ml-2">
                <button
                  onClick={() => handleEdit(item)}
                  className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded transition-colors border border-gray-600/50"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-900/20 rounded transition-colors border border-gray-600/50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Content Preview */}
            <div className="mb-3 space-y-1.5">
              {item.myth && (
                <div className="text-xs">
                  <span className="text-gray-400 font-medium">Myth:</span>
                  <p className="text-gray-300 line-clamp-1">{item.myth}</p>
                </div>
              )}
              {item.fact && (
                <div className="text-xs">
                  <span className="text-gray-300 font-medium">Fact:</span>
                  <p className="text-gray-300 line-clamp-1">{item.fact}</p>
                </div>
              )}
            </div>

              {/* Status Badges */}
              <div className="flex flex-wrap gap-1.5 mb-3">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig[item.status].color} ${statusConfig[item.status].textColor}`}>
                  {statusConfig[item.status].label}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${marketingStatusConfig[item.marketing_status].color} ${marketingStatusConfig[item.marketing_status].textColor}`}>
                  {marketingStatusConfig[item.marketing_status].label}
                </span>
                {item.template_type && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gradient-to-r from-blue-500/20 to-blue-600/20 text-blue-300 border border-blue-500/30">
                    T{item.template_type}
                  </span>
                )}
              </div>

            {/* Action Buttons */}
            <div className="flex gap-1.5">
              <button
                onClick={() => handleStatusChange(item.id, item.status === 'draft' ? 'ready' : 'draft', 'status')}
                className={`flex-1 px-2 py-1.5 rounded text-xs font-medium transition-colors border ${
                  item.status === 'draft' 
                    ? 'bg-gradient-to-r from-gray-700 to-gray-600 hover:from-gray-600 hover:to-gray-500 text-white border-gray-600' 
                    : 'bg-gradient-to-r from-gray-800 to-gray-700 hover:from-gray-700 hover:to-gray-600 text-gray-300 border-gray-600'
                }`}
              >
                {item.status === 'draft' ? 'Ready' : 'Draft'}
              </button>
              <button
                onClick={() => handleStatusChange(item.id, item.marketing_status === 'not_sent' ? 'sent' : 'not_sent', 'marketing_status')}
                className={`flex-1 px-2 py-1.5 rounded text-xs font-medium transition-colors border ${
                  item.marketing_status === 'not_sent' 
                    ? 'bg-gradient-to-r from-gray-700 to-gray-600 hover:from-gray-600 hover:to-gray-500 text-white border-gray-600' 
                    : 'bg-gradient-to-r from-gray-800 to-gray-700 hover:from-gray-700 hover:to-gray-600 text-gray-300 border-gray-600'
                }`}
              >
                {item.marketing_status === 'not_sent' ? 'Send' : 'Not Sent'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {items.length === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🔧</div>
          <h3 className="text-xl font-semibold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent mb-2">No Myth Buster content yet</h3>
          <p className="text-gray-400 mb-6">Create your first myth-busting content to get started</p>
          <button
            onClick={handleCreate}
            className="px-6 py-3 bg-gradient-to-r from-gray-700 to-gray-600 text-white rounded-lg hover:from-gray-600 hover:to-gray-500 transition-all duration-200 flex items-center gap-2 mx-auto border border-gray-600"
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
  );
}
