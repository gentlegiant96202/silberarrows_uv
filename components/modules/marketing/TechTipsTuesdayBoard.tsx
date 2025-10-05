'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/shared/AuthProvider';
import { supabase } from '@/lib/supabaseClient';
import { Plus, Sparkles, Eye, Pencil, Trash2, Check, X } from 'lucide-react';
import TechTipsTuesdayModal from './TechTipsTuesdayModal';

interface TechTipsItem {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  problem?: string;
  solution?: string;
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
  titlefontsize?: number;
  imagefit?: string;
  imagealignment?: string;
  imagezoom?: number;
  imageverticalposition?: number;
  image_width?: number;
  image_height?: number;
}

const statusConfig = {
  draft: { label: 'Draft', color: 'bg-gray-500', textColor: 'text-gray-200' },
  ready: { label: 'Ready', color: 'bg-gray-500', textColor: 'text-gray-200' },
  published: { label: 'Published', color: 'bg-green-500', textColor: 'text-green-200' },
  archived: { label: 'Archived', color: 'bg-gray-600', textColor: 'text-gray-300' }
};

const marketingStatusConfig = {
  not_sent: { label: 'Not Sent', color: 'bg-gray-500', textColor: 'text-gray-200' },
  sent: { label: 'Sent', color: 'bg-yellow-500', textColor: 'text-yellow-200' },
  published: { label: 'Published', color: 'bg-green-500', textColor: 'text-green-200' },
  failed: { label: 'Failed', color: 'bg-red-500', textColor: 'text-red-200' }
};

const SkeletonCard = () => (
  <div className="bg-gray-800/50 rounded-lg p-6 animate-pulse">
    <div className="h-4 bg-gray-700 rounded mb-3"></div>
    <div className="h-3 bg-gray-700 rounded mb-2 w-3/4"></div>
    <div className="h-3 bg-gray-700 rounded mb-4 w-1/2"></div>
    <div className="flex gap-2 mb-4">
      <div className="h-6 bg-gray-700 rounded-full w-16"></div>
      <div className="h-6 bg-gray-700 rounded-full w-20"></div>
    </div>
    <div className="flex gap-2">
      <div className="h-8 bg-gray-700 rounded w-20"></div>
      <div className="h-8 bg-gray-700 rounded w-20"></div>
      <div className="h-8 bg-gray-700 rounded w-20"></div>
    </div>
  </div>
);

export default function TechTipsTuesdayBoard() {
  const { user } = useAuth();
  const [items, setItems] = useState<TechTipsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<TechTipsItem | null>(null);
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

      const response = await fetch('/api/tech-tips-tuesday', {
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
      console.error('Error fetching tech tips tuesday items:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingItem(null);
    setShowModal(true);
  };

  const handleEdit = (item: TechTipsItem) => {
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
      
      const response = await fetch(`/api/tech-tips-tuesday?id=${id}`, {
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
      
      const response = await fetch('/api/tech-tips-tuesday', {
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
    try {
      // Get auth token for API call
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error('No session found');
        return;
      }

      const url = editingItem ? '/api/tech-tips-tuesday' : '/api/tech-tips-tuesday';
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

      await fetchItems();
      setShowModal(false);
      setEditingItem(null);
    } catch (error) {
      console.error('Error saving item:', error);
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
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white mb-2">Tech Tips Tuesday</h1>
          <p className="text-white/70">Create and manage technical tips for Mercedes service</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-white mb-2">Tech Tips Tuesday</h1>
            <p className="text-white/70">Create and manage technical tips for Mercedes service</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowAIModal(true)}
              className="px-4 py-2 bg-gradient-to-r from-gray-700 to-gray-600 text-white rounded-lg hover:from-gray-600 hover:to-gray-500 transition-all duration-200 flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              AI Generate
            </button>
            <button
              onClick={handleCreate}
              className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all duration-200 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              New Tech Tip
            </button>
          </div>
        </div>
      </div>

      {/* Items Grid */}
      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 transition-all duration-500 ${
        columnsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}>
        {items.map((item) => (
          <div key={item.id} className="bg-gray-800/50 rounded-lg p-6 hover:bg-gray-800/70 transition-all duration-200">
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white mb-1 line-clamp-2">{item.title}</h3>
                {item.subtitle && (
                  <p className="text-sm text-white/70 mb-2">{item.subtitle}</p>
                )}
              </div>
              <div className="flex gap-2 ml-2">
                <button
                  onClick={() => handleEdit(item)}
                  className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Content Preview */}
            <div className="mb-4 space-y-2">
              {item.problem && (
                <div className="text-sm">
                  <span className="text-orange-400 font-medium">Problem:</span>
                  <p className="text-white/80 line-clamp-2">{item.problem}</p>
                </div>
              )}
              {item.solution && (
                <div className="text-sm">
                  <span className="text-green-400 font-medium">Solution:</span>
                  <p className="text-white/80 line-clamp-2">{item.solution}</p>
                </div>
              )}
            </div>

            {/* Status Badges */}
            <div className="flex flex-wrap gap-2 mb-4">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusConfig[item.status].color} ${statusConfig[item.status].textColor}`}>
                {statusConfig[item.status].label}
              </span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${marketingStatusConfig[item.marketing_status].color} ${marketingStatusConfig[item.marketing_status].textColor}`}>
                {marketingStatusConfig[item.marketing_status].label}
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => handleStatusChange(item.id, item.status === 'draft' ? 'ready' : 'draft', 'status')}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  item.status === 'draft' 
                    ? 'bg-gray-600 hover:bg-gray-700 text-white' 
                    : 'bg-gray-600 hover:bg-gray-700 text-white'
                }`}
              >
                {item.status === 'draft' ? 'Mark Ready' : 'Mark Draft'}
              </button>
              <button
                onClick={() => handleStatusChange(item.id, item.marketing_status === 'not_sent' ? 'sent' : 'not_sent', 'marketing_status')}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  item.marketing_status === 'not_sent' 
                    ? 'bg-green-600 hover:bg-green-700 text-white' 
                    : 'bg-gray-600 hover:bg-gray-700 text-white'
                }`}
              >
                {item.marketing_status === 'not_sent' ? 'Send to Marketing' : 'Mark Not Sent'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {items.length === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🔧</div>
          <h3 className="text-xl font-semibold text-white mb-2">No Tech Tips yet</h3>
          <p className="text-white/70 mb-6">Create your first technical tip to get started</p>
          <button
            onClick={handleCreate}
            className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all duration-200 flex items-center gap-2 mx-auto"
          >
            <Plus className="w-5 h-5" />
            Create First Tech Tip
          </button>
        </div>
      )}

      {/* Modals */}
      {showModal && (
        <TechTipsTuesdayModal
          isOpen={showModal}
          onClose={() => {
            setShowModal(false);
            setEditingItem(null);
          }}
          onSave={handleSave}
          editingItem={editingItem}
        />
      )}
    </div>
  );
}
