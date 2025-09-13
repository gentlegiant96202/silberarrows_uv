'use client';

import React, { useState, useEffect } from 'react';
import { BookOpen, Plus, Edit3, Trash2, FileText, Video, Image as ImageIcon } from 'lucide-react';

// Define content example type (matching the main component)
interface ContentExample {
  id: string;
  title: string;
  description: string;
  content_type: 'image' | 'video' | 'text' | 'carousel';
  day_of_week: string;
}

type ContentType = ContentExample['content_type'];

interface ContentExamplesModalProps {
  isOpen: boolean;
  onClose: () => void;
  dayKey: string;
  dayTitle: string;
  examples: ContentExample[];
  onSaveExamples: (examples: ContentExample[]) => void;
}

// Helper function to get content type icon
const getContentTypeIcon = (type: string) => {
  switch (type) {
    case 'image':
      return <ImageIcon className="w-4 h-4" />;
    case 'video':
      return <Video className="w-4 h-4" />;
    case 'carousel':
      return <FileText className="w-4 h-4" />;
    default:
      return <FileText className="w-4 h-4" />;
  }
};

export default function ContentExamplesModal({ 
  isOpen, 
  onClose, 
  dayKey, 
  dayTitle, 
  examples,
  onSaveExamples
}: ContentExamplesModalProps) {
  const [localExamples, setLocalExamples] = useState<ContentExample[]>([]);
  const [editingExample, setEditingExample] = useState<ContentExample | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState<{ title: string; description: string; content_type: ContentType }>({
    title: '',
    description: '',
    content_type: 'image',
  });

  // Initialize local examples when modal opens
  useEffect(() => {
    if (isOpen) {
      setLocalExamples(examples.filter(ex => ex.day_of_week === dayKey));
    }
  }, [isOpen, examples, dayKey]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'content_type') {
      setFormData(prev => ({ ...prev, content_type: value as ContentType }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value } as any));
    }
  };

  const handleAddExample = () => {
    if (!formData.title.trim()) return;

    const newExample: ContentExample = {
      id: Date.now().toString(),
      title: formData.title,
      description: formData.description,
      content_type: formData.content_type,
      day_of_week: dayKey,
    };

    setLocalExamples(prev => [...prev, newExample]);
    setFormData({ title: '', description: '', content_type: 'image' });
    setShowAddForm(false);
  };

  const handleEditExample = (example: ContentExample) => {
    setEditingExample(example);
    setFormData({
      title: example.title,
      description: example.description,
      content_type: example.content_type,
    });
  };

  const handleUpdateExample = () => {
    if (!editingExample || !formData.title.trim()) return;

    const updatedExample: ContentExample = {
      ...editingExample,
      title: formData.title,
      description: formData.description,
      content_type: formData.content_type,
    };

    setLocalExamples(prev => 
      prev.map(ex => ex.id === editingExample.id ? updatedExample : ex)
    );
    setEditingExample(null);
    setFormData({ title: '', description: '', content_type: 'image' });
  };

  const handleDeleteExample = (exampleId: string) => {
    if (confirm('Are you sure you want to delete this content example?')) {
      setLocalExamples(prev => prev.filter(ex => ex.id !== exampleId));
    }
  };

  const handleSave = () => {
    // Update the global examples array
    const otherDayExamples = examples.filter(ex => ex.day_of_week !== dayKey);
    const updatedExamples = [...otherDayExamples, ...localExamples];
    onSaveExamples(updatedExamples);
    onClose();
  };

  const handleCancel = () => {
    setEditingExample(null);
    setShowAddForm(false);
    setFormData({ title: '', description: '', content_type: 'image' });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-2">
      <div className="bg-white/5 backdrop-blur-xl border border-white/20 rounded-xl p-5 w-full max-w-4xl text-xs relative max-h-[90vh] overflow-hidden shadow-2xl ring-1 ring-white/10">
        <div className="flex justify-between items-center mb-6 border-b border-white/20 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30">
              <BookOpen className="w-5 h-5 text-blue-300" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">
                Content Examples
              </h2>
              <p className="text-white/60 text-sm">
                {dayTitle} - Edit and manage content examples
              </p>
            </div>
          </div>
          
          <button
            type="button"
            onClick={onClose}
            className="text-white/60 hover:text-white text-2xl transition-colors duration-200"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-col h-[calc(90vh-200px)]">
          
          {/* Add New Example Button */}
          <div className="mb-4">
            <button
              onClick={() => {
                setShowAddForm(true);
                setEditingExample(null);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 hover:from-blue-500/30 hover:to-cyan-500/30 border border-blue-500/30 text-blue-300 hover:text-blue-200 text-sm rounded-lg transition-all"
            >
              <Plus className="w-4 h-4" />
              Add New Example
            </button>
          </div>

          {/* Add/Edit Form */}
          {(showAddForm || editingExample) && (
            <div className="bg-white/8 backdrop-blur-md rounded-xl p-4 border border-white/15 shadow-lg ring-1 ring-white/5 mb-4">
              <h3 className="text-sm font-medium text-white mb-3">
                {editingExample ? 'Edit Example' : 'Add New Example'}
              </h3>
              
              <div className="space-y-3">
                {/* Title */}
                <div>
                  <label className="block text-xs font-medium text-white mb-1">Title</label>
                  <input
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    className="w-full px-3 py-2 text-sm rounded-lg bg-black/30 backdrop-blur-sm border border-white/15 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400/50 transition-all"
                    placeholder="Enter content title"
                    required
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-medium text-white mb-1">Description</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows={3}
                    className="w-full px-3 py-2 text-sm rounded-lg bg-black/30 backdrop-blur-sm border border-white/15 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400/50 transition-all resize-none"
                    placeholder="Enter content description"
                  />
                </div>

                {/* Content Type */}
                <div>
                  <label className="block text-xs font-medium text-white mb-1">Content Type</label>
                  <select
                    name="content_type"
                    value={formData.content_type}
                    onChange={handleChange}
                    className="w-full px-3 py-2 text-sm rounded-lg bg-black/30 backdrop-blur-sm border border-white/15 text-white focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400/50 transition-all"
                  >
                    <option value="image">Image Post</option>
                    <option value="video">Video Content</option>
                    <option value="carousel">Carousel Post</option>
                    <option value="text">Text Post</option>
                  </select>
                </div>

                {/* Form Actions */}
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={editingExample ? handleUpdateExample : handleAddExample}
                    className="px-4 py-2 bg-gradient-to-br from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white text-sm rounded-lg transition-all font-medium"
                  >
                    {editingExample ? 'Update' : 'Add'} Example
                  </button>
                  <button
                    onClick={handleCancel}
                    className="px-4 py-2 bg-white/8 hover:bg-white/12 border border-white/15 text-white text-sm rounded-lg transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Examples List */}
          <div className="flex-1 overflow-y-auto space-y-2">
            {localExamples.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
                  <BookOpen className="w-8 h-8 text-white/30" />
                </div>
                <p className="text-white/40 text-sm font-medium mb-2">No content examples yet</p>
                <p className="text-white/30 text-xs">Add examples to guide AI content generation</p>
              </div>
            ) : (
              localExamples.map((example) => (
                <div
                  key={example.id}
                  className="bg-white/8 backdrop-blur-md rounded-lg p-3 border border-white/10 hover:border-white/20 transition-all group"
                >
                  <div className="flex items-start gap-3">
                    {/* Content Type Icon */}
                    <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-white/10 to-white/5 rounded-lg flex items-center justify-center border border-white/10">
                      <div className="text-white/70">
                        {getContentTypeIcon(example.content_type)}
                      </div>
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-white mb-1 line-clamp-1">
                        {example.title}
                      </h4>
                      <p className="text-xs text-white/60 line-clamp-2 mb-2">
                        {example.description}
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-white/50 bg-white/10 px-2 py-0.5 rounded-full capitalize">
                          {example.content_type}
                        </span>
                      </div>
                    </div>
                    
                    {/* Actions */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleEditExample(example)}
                        className="p-1.5 rounded-full bg-blue-500/20 text-blue-300 hover:text-blue-200 hover:bg-blue-500/30 transition-all"
                        title="Edit example"
                      >
                        <Edit3 className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => handleDeleteExample(example.id)}
                        className="p-1.5 rounded-full bg-red-500/20 text-red-300 hover:text-red-200 hover:bg-red-500/30 transition-all"
                        title="Delete example"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex justify-end items-center gap-3 pt-4 border-t border-white/20 mt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white/8 hover:bg-white/12 backdrop-blur-md border border-white/15 text-white text-sm rounded-lg transition-all shadow-lg ring-1 ring-white/5"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-gradient-to-br from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white text-sm rounded-lg transition-all font-semibold shadow-lg"
          >
            Save Examples
          </button>
        </div>
      </div>
    </div>
  );
}
