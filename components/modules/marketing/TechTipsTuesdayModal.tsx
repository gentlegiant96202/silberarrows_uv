'use client';

import { useState, useEffect } from 'react';
import { X, Image as ImageIcon, Sparkles } from 'lucide-react';

interface TechTipsItem {
  id?: string;
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
  status?: 'draft' | 'ready' | 'published' | 'archived';
  marketing_status?: 'not_sent' | 'sent' | 'published' | 'failed';
  titlefontsize?: number;
  imagefit?: string;
  imagealignment?: string;
  imagezoom?: number;
  imageverticalposition?: number;
}

interface TechTipsTuesdayModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: TechTipsItem) => void;
  editingItem?: TechTipsItem | null;
}

export default function TechTipsTuesdayModal({ 
  isOpen, 
  onClose, 
  onSave, 
  editingItem 
}: TechTipsTuesdayModalProps) {
  const [formData, setFormData] = useState<TechTipsItem>({
    title: '',
    subtitle: 'Expert Mercedes Knowledge',
    description: '',
    problem: '',
    solution: '',
    difficulty: '',
    tools_needed: '',
    warning: '',
    badge_text: 'TECH TIPS TUESDAY',
    media_files: [],
    media_files_a: [],
    media_files_b: [],
    content_type: 'image',
    status: 'draft',
    marketing_status: 'not_sent',
    titlefontsize: 72,
    imagefit: 'cover',
    imagealignment: 'center',
    imagezoom: 100,
    imageverticalposition: 0
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [showImageSettings, setShowImageSettings] = useState(false);

  useEffect(() => {
    if (editingItem) {
      setFormData(editingItem);
    } else {
      setFormData({
        title: '',
        subtitle: 'Expert Mercedes Knowledge',
        description: '',
        problem: '',
        solution: '',
        difficulty: '',
        tools_needed: '',
        warning: '',
        badge_text: 'TECH TIPS TUESDAY',
        media_files: [],
        media_files_a: [],
        media_files_b: [],
        content_type: 'image',
        status: 'draft',
        marketing_status: 'not_sent',
        titlefontsize: 72,
        imagefit: 'cover',
        imagealignment: 'center',
        imagezoom: 100,
        imageverticalposition: 0
      });
    }
  }, [editingItem, isOpen]);

  const handleInputChange = (field: keyof TechTipsItem, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const handleAIGenerate = async () => {
    setIsGenerating(true);
    try {
      // Implement AI generation logic here
      // This would call your AI generation API
    } catch (error) {
    } finally {
      setIsGenerating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-white">
            {editingItem ? 'Edit Tech Tip' : 'Create New Tech Tip'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[calc(90vh-80px)]">
          <div className="p-6 space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
                  placeholder="Enter tech tip title"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Subtitle
                </label>
                <input
                  type="text"
                  value={formData.subtitle}
                  onChange={(e) => handleInputChange('subtitle', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
                  placeholder="Expert Mercedes Knowledge"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
                placeholder="Enter description"
              />
            </div>

            {/* Problem and Solution */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  The Problem *
                </label>
                <textarea
                  value={formData.problem}
                  onChange={(e) => handleInputChange('problem', e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Describe the technical problem"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  The Solution *
                </label>
                <textarea
                  value={formData.solution}
                  onChange={(e) => handleInputChange('solution', e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Describe the solution"
                  required
                />
              </div>
            </div>

            {/* Difficulty and Tools */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Difficulty Level
                </label>
                <select
                  value={formData.difficulty}
                  onChange={(e) => handleInputChange('difficulty', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  <option value="">Select difficulty</option>
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                  <option value="Expert">Expert</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Tools Needed
                </label>
                <input
                  type="text"
                  value={formData.tools_needed}
                  onChange={(e) => handleInputChange('tools_needed', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
                  placeholder="e.g., Diagnostic tools, Specialized equipment"
                />
              </div>
            </div>

            {/* Warning */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Warning
              </label>
              <textarea
                value={formData.warning}
                onChange={(e) => handleInputChange('warning', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                placeholder="Enter any important warnings"
              />
            </div>

            {/* Image Settings Toggle */}
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-white">Image Settings</h3>
              <button
                type="button"
                onClick={() => setShowImageSettings(!showImageSettings)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                {showImageSettings ? 'Hide' : 'Show'} Settings
              </button>
            </div>

            {showImageSettings && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-4 bg-gray-800/50 rounded-lg">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Title Font Size
                  </label>
                  <input
                    type="number"
                    value={formData.titlefontsize}
                    onChange={(e) => handleInputChange('titlefontsize', parseInt(e.target.value))}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-gray-500"
                    min="20"
                    max="120"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Image Fit
                  </label>
                  <select
                    value={formData.imagefit}
                    onChange={(e) => handleInputChange('imagefit', e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-gray-500"
                  >
                    <option value="cover">Cover</option>
                    <option value="contain">Contain</option>
                    <option value="fill">Fill</option>
                    <option value="scale-down">Scale Down</option>
                    <option value="none">None</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Image Alignment
                  </label>
                  <select
                    value={formData.imagealignment}
                    onChange={(e) => handleInputChange('imagealignment', e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-gray-500"
                  >
                    <option value="center">Center</option>
                    <option value="top">Top</option>
                    <option value="bottom">Bottom</option>
                    <option value="left">Left</option>
                    <option value="right">Right</option>
                    <option value="top-left">Top Left</option>
                    <option value="top-right">Top Right</option>
                    <option value="bottom-left">Bottom Left</option>
                    <option value="bottom-right">Bottom Right</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Image Zoom (%)
                  </label>
                  <input
                    type="number"
                    value={formData.imagezoom}
                    onChange={(e) => handleInputChange('imagezoom', parseInt(e.target.value))}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-gray-500"
                    min="10"
                    max="200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Vertical Position (px)
                  </label>
                  <input
                    type="number"
                    value={formData.imageverticalposition}
                    onChange={(e) => handleInputChange('imageverticalposition', parseInt(e.target.value))}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-gray-500"
                    min="-500"
                    max="500"
                  />
                </div>
              </div>
            )}

            {/* AI Generation Button */}
            <div className="flex justify-center">
              <button
                type="button"
                onClick={handleAIGenerate}
                disabled={isGenerating}
                className="px-6 py-3 bg-gradient-to-r from-gray-700 to-gray-600 text-white rounded-lg hover:from-gray-600 hover:to-gray-500 transition-all duration-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Sparkles className="w-5 h-5" />
                {isGenerating ? 'Generating...' : 'AI Generate Content'}
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all duration-200"
            >
              {editingItem ? 'Update' : 'Create'} Tech Tip
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
