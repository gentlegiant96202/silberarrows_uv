'use client';

import { useState, useEffect } from 'react';
import { X, Sparkles } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { MythBusterPreview, generateMythBusterHTMLString } from './MythBusterPreview';

interface MythBusterItem {
  id?: string;
  title: string;
  myth?: string;
  fact?: string;
  badge_text?: string;
  media_files?: any[];
  media_files_a?: any[];
  media_files_b?: any[];
  content_type?: string;
  status?: 'draft' | 'ready' | 'published' | 'archived';
  marketing_status?: 'not_sent' | 'sent' | 'published' | 'failed';
  titleFontSize?: number;
  imageFit?: string;
  imageAlignment?: string;
  imageZoom?: number;
  imageVerticalPosition?: number;
  template_type?: 'A' | 'B';
  // Database field names (snake_case) for backward compatibility
  titlefontsize?: number;
  imagefit?: string;
  imagealignment?: string;
  imagezoom?: number;
  imageverticalposition?: number;
  generated_image_a_url?: string;
  generated_image_b_url?: string;
  generated_image_a_id?: string;
  generated_image_b_id?: string;
}

interface MythBusterMondayModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: MythBusterItem) => Promise<MythBusterItem | null>;
  editingItem?: MythBusterItem | null;
}

export default function MythBusterMondayModal({ 
  isOpen, 
  onClose, 
  onSave, 
  editingItem 
}: MythBusterMondayModalProps) {
  const [formData, setFormData] = useState<MythBusterItem>({
    title: '',
    myth: '',
    fact: '',
    badge_text: 'MYTH BUSTER MONDAY',
    media_files: [],
    media_files_a: [],
    media_files_b: [],
    content_type: 'image',
    status: 'draft',
    marketing_status: 'not_sent',
    titleFontSize: 72,
    imageFit: 'cover',
    imageAlignment: 'center',
    imageZoom: 100,
    imageVerticalPosition: 0
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isGeneratingImages, setIsGeneratingImages] = useState(false);
  const [generatedImageA, setGeneratedImageA] = useState<string | null>(null);
  const [generatedImageB, setGeneratedImageB] = useState<string | null>(null);

  useEffect(() => {
    if (editingItem) {
      // Map database fields (snake_case) to form fields (camelCase)
      // Ensure all string fields are never null (use empty string instead)
      setFormData({
        ...editingItem,
        title: editingItem.title || '',
        myth: editingItem.myth || '',
        fact: editingItem.fact || '',
        badge_text: editingItem.badge_text || 'MYTH BUSTER MONDAY',
        titleFontSize: editingItem.titlefontsize || editingItem.titleFontSize || 72,
        imageFit: editingItem.imagefit || editingItem.imageFit || 'cover',
        imageAlignment: editingItem.imagealignment || editingItem.imageAlignment || 'center',
        imageZoom: editingItem.imagezoom || editingItem.imageZoom || 100,
        imageVerticalPosition: editingItem.imageverticalposition || editingItem.imageVerticalPosition || 0,
        generated_image_a_url: editingItem.generated_image_a_url || undefined,
        generated_image_b_url: editingItem.generated_image_b_url || undefined
      });
    } else {
      setFormData({
        title: '',
        myth: '',
        fact: '',
        badge_text: 'MYTH BUSTER MONDAY',
        media_files: [],
        media_files_a: [],
        media_files_b: [],
        content_type: 'image',
        status: 'draft',
        marketing_status: 'not_sent',
        titleFontSize: 72,
        imageFit: 'cover',
        imageAlignment: 'center',
        imageZoom: 100,
        imageVerticalPosition: 0
      });
    }
  }, [editingItem, isOpen]);

  const handleInputChange = (field: keyof MythBusterItem, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleClose = () => {
    // Reset form when closing
    setFormData({
      title: '',
      myth: '',
      fact: '',
      badge_text: 'MYTH BUSTER MONDAY',
      media_files: [],
      media_files_a: [],
      media_files_b: [],
      content_type: 'image',
      status: 'draft',
      marketing_status: 'not_sent',
      titleFontSize: 72,
      imageFit: 'cover',
      imageAlignment: 'center',
      imageZoom: 100,
      imageVerticalPosition: 0
    });
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    console.log('🚀 handleSubmit called!', { editingItem: !!editingItem, formData });
    console.log('📝 Myth field value:', formData.myth);
    console.log('📝 Fact field value:', formData.fact);
    e.preventDefault();

    try {
      // Just save the myth buster
      console.log('💾 Calling onSave with formData:', formData);
      const savedItem = await onSave(formData);
      console.log('💾 onSave returned:', savedItem);

      if (savedItem && savedItem.id) {
        console.log('✅ Successfully saved myth buster with ID:', savedItem.id);
        alert('✅ Myth Buster saved successfully!');
      } else {
        console.log('❌ Failed to save item');
        alert('❌ Failed to save item. Please try again.');
      }
    } catch (error) {
      console.error('Error in handleSubmit:', error);
      alert('❌ Error saving item. Please try again.');
    }
  };

  const handleAIGenerate = async () => {
    setIsGenerating(true);
    try {
      console.log('✨ Starting AI generation for Myth Buster Monday content');

      // Get auth token for API call
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error('No session found');
        return;
      }

      // Call the specialized Myth Buster Monday AI generation API
      const response = await fetch('/api/myth-buster-monday/generate-content', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contentType: 'image'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate content');
      }

      const result = await response.json();

      if (result.success && result.data) {
        const generatedContent = result.data;
        console.log('✅ AI generated content:', generatedContent);

        // Update form data with generated content (all fields)
        setFormData(prev => ({
          ...prev,
          title: generatedContent.title || prev.title,
          myth: generatedContent.myth || prev.myth,
          fact: generatedContent.fact || prev.fact,
          badge_text: generatedContent.badge_text || prev.badge_text
        }));

        console.log('✅ Form updated with AI generated content');
      } else {
        console.error('AI generation failed:', result.error);
        alert('Failed to generate content. Please try again.');
      }
    } catch (error) {
      console.error('Error generating content:', error);
      alert('Error generating content. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGeneratePreviewImages = async () => {
    setIsGeneratingImages(true);
    try {
      console.log('🎨 Generating preview images for both templates');

      // Get auth token for API call
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error('No session found');
        return;
      }

      // Use the utility function to generate HTML that exactly matches the preview component
      // Generate at 2x scale for better quality (2160x3840 instead of 1080x1920)
      const generateTemplateHTML = (templateType: 'A' | 'B') => {
        return generateMythBusterHTMLString({
          title: formData.title,
          myth: formData.myth,
          fact: formData.fact,
          badgeText: formData.badge_text,
          imageUrl: formData.media_files?.[0]?.url || '',
          templateType: templateType,
          titleFontSize: formData.titleFontSize,
          imageFit: formData.imageFit,
          imageAlignment: formData.imageAlignment,
          imageZoom: formData.imageZoom,
          imageVerticalPosition: formData.imageVerticalPosition,
          isPreview: false, // Don't apply preview scaling for image generation
          scale: 2 // Generate at 2x resolution for better quality
        });
      };

      // Generate both Template A and Template B images at 2x resolution for better quality
      // 2160x3840 = 2x Instagram Story size (1080x1920)
      const [templateAResponse, templateBResponse] = await Promise.all([
        fetch('/api/myth-buster-monday/generate-preview-image', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            html: generateTemplateHTML('A'),
            templateType: 'A',
            width: 2160,
            height: 3840
          }),
        }),
        fetch('/api/myth-buster-monday/generate-preview-image', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            html: generateTemplateHTML('B'),
            templateType: 'B',
            width: 2160,
            height: 3840
          }),
        })
      ]);

      if (!templateAResponse.ok || !templateBResponse.ok) {
        throw new Error('Failed to generate preview images');
      }

      const [templateAResult, templateBResult] = await Promise.all([
        templateAResponse.json(),
        templateBResponse.json()
      ]);

      if (templateAResult.success && templateBResult.success) {
        console.log('✅ Successfully generated both template preview images');
        console.log('Template A URL:', templateAResult.data.imageUrl);
        console.log('Template B URL:', templateBResult.data.imageUrl);

        // Download both images
        const downloadImage = async (url: string, filename: string) => {
          try {
            const response = await fetch(url);
            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(downloadUrl);
          } catch (error) {
            console.error(`Failed to download ${filename}:`, error);
          }
        };

        // Download Template A
        await downloadImage(
          templateAResult.data.imageUrl, 
          `myth-buster-monday-template-a-${Date.now()}.jpg`
        );

        // Download Template B
        await downloadImage(
          templateBResult.data.imageUrl, 
          `myth-buster-monday-template-b-${Date.now()}.jpg`
        );

        // Store the generated image URLs in formData for saving to database
        setFormData(prev => ({
          ...prev,
          generated_image_a_url: templateAResult.data.imageUrl,
          generated_image_b_url: templateBResult.data.imageUrl
        }));

        alert('✅ Images generated and downloaded successfully!');
      } else {
        console.error('Preview image generation failed:', templateAResult.error || templateBResult.error);
        alert('❌ Failed to generate preview images. Please try again.');
      }
    } catch (error) {
      console.error('Error generating preview images:', error);
      alert('❌ Error generating preview images. Please try again.');
    } finally {
      setIsGeneratingImages(false);
    }
  };



  if (!isOpen) return null;

  return (
    <>
      <style jsx global>{`
        /* Pure zinc/neutral colors - no blue tints */
        input, textarea, select, button {
          -webkit-appearance: none;
          -moz-appearance: none;
          appearance: none;
        }
        
        input:focus, textarea:focus, select:focus, button:focus {
          outline: none !important;
          border-color: #52525b !important;
          box-shadow: none !important;
          ring: none !important;
        }
        
        input:focus-visible, textarea:focus-visible, select:focus-visible {
          outline: none !important;
          border-color: #52525b !important;
          box-shadow: none !important;
        }
        
        /* Range slider styling */
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 16px;
          width: 16px;
          border-radius: 50%;
          background: linear-gradient(135deg, #e5e5e5, #a1a1aa);
          cursor: pointer;
          border: 1px solid #52525b;
        }
        .slider::-moz-range-thumb {
          height: 16px;
          width: 16px;
          border-radius: 50%;
          background: linear-gradient(135deg, #e5e5e5, #a1a1aa);
          cursor: pointer;
          border: 1px solid #52525b;
        }
        
        /* Select dropdown arrow */
        select {
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%2371717a' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3E%3C/svg%3E");
          background-position: right 0.5rem center;
          background-repeat: no-repeat;
          background-size: 1.5em 1.5em;
          padding-right: 2.5rem;
        }
      `}</style>
      <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-50 flex items-center justify-center p-6">
      <div className="bg-black w-full max-w-[95vw] max-h-[95vh] overflow-hidden border shadow-[0_0_80px_rgba(0,0,0,0.8)]" style={{ borderColor: '#27272a' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-6 border-b bg-gradient-to-r from-neutral-900/50 to-black" style={{ borderColor: '#27272a' }}>
          <h2 className="text-2xl font-light tracking-wide bg-gradient-to-r from-neutral-100 via-neutral-300 to-neutral-400 bg-clip-text text-transparent">
            {editingItem ? 'Edit Myth Buster Monday' : 'New Myth Buster Monday'}
          </h2>
          <button
            onClick={handleClose}
            className="text-neutral-500 hover:text-neutral-300 transition-colors p-2"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Main Content - Split Layout */}
        <div className="flex h-full">
          {/* Left Side - Form */}
          <div className="w-2/5 overflow-y-auto max-h-[calc(95vh-80px)] bg-black border-r" style={{ borderColor: '#27272a' }}>
            <form onSubmit={handleSubmit}>
              <div className="p-10 space-y-8">
            
            {/* Title Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-neutral-400 uppercase tracking-widest">
                  Title
                </label>
                <button
                  type="button"
                  onClick={handleAIGenerate}
                  disabled={isGenerating}
                  className="px-3 py-1.5 bg-gradient-to-r from-neutral-800 to-neutral-900 hover:from-neutral-700 hover:to-neutral-800 text-neutral-300 text-xs font-medium border transition-all disabled:opacity-50"
                  style={{ borderColor: '#3f3f46' }}
                >
                  {isGenerating ? (
                    <span>Generating...</span>
                  ) : (
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3" />
                      AI Generate
                    </span>
                  )}
                </button>
              </div>
              <textarea
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                className="w-full px-4 py-3 bg-neutral-950 border text-white placeholder-neutral-600 focus:outline-none focus:ring-0 transition-colors resize-none"
                style={{ borderColor: '#27272a' }}
                placeholder="Enter title..."
                rows={2}
                required
              />
            </div>

            {/* Myth Section */}
            <div className="space-y-3">
              <label className="text-xs font-medium text-neutral-400 uppercase tracking-widest">
                The Myth
              </label>
              <textarea
                value={formData.myth}
                onChange={(e) => handleInputChange('myth', e.target.value)}
                rows={3}
                className="w-full px-4 py-3 bg-neutral-950 border text-white placeholder-neutral-600 focus:outline-none focus:ring-0 transition-colors resize-none"
                style={{ borderColor: '#27272a' }}
                placeholder="Enter the myth..."
                required
              />
            </div>
            
            {/* Fact Section */}
            <div className="space-y-3">
              <label className="text-xs font-medium text-neutral-400 uppercase tracking-widest">
                The Fact
              </label>
              <textarea
                value={formData.fact}
                onChange={(e) => handleInputChange('fact', e.target.value)}
                rows={3}
                className="w-full px-4 py-3 bg-neutral-950 border text-white placeholder-neutral-600 focus:outline-none focus:ring-0 transition-colors resize-none"
                style={{ borderColor: '#27272a' }}
                placeholder="Enter the fact..."
                required
              />
            </div>

            {/* Image Upload Section */}
            <div className="space-y-3">
              <label className="text-xs font-medium text-neutral-400 uppercase tracking-widest">
                Background Image
              </label>
              <div className="border bg-neutral-950" style={{ borderColor: '#27272a' }}>
                <div className="flex items-center justify-center w-full">
                  <label className={`flex flex-col items-center justify-center w-full h-32 cursor-pointer transition-colors ${
                    isUploading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-neutral-900'
                  }`}>
                    <div className="flex flex-col items-center justify-center">
                      {isUploading ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-b mb-2" style={{ borderColor: '#71717a' }}></div>
                          <p className="text-xs text-neutral-500">Uploading...</p>
                        </>
                      ) : (
                        <>
                          <p className="text-sm text-neutral-500 mb-1">Click to upload</p>
                          <p className="text-xs text-neutral-600">PNG, JPG, WEBP · Max 10MB</p>
                        </>
                      )}
                    </div>
                    <input 
                      type="file" 
                      className="hidden" 
                      accept="image/*"
                      disabled={isUploading}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          try {
                            setIsUploading(true);
                            
                            // Validate file size (10MB max)
                            const maxSize = 10 * 1024 * 1024; // 10MB
                            if (file.size > maxSize) {
                              alert('File size must be less than 10MB');
                              return;
                            }

                            // Create form data for upload
                            const uploadFormData = new FormData();
                            uploadFormData.append('file', file);
                            uploadFormData.append('mythBusterId', editingItem?.id || 'temp');

                            // Upload to API
                            const response = await fetch('/api/myth-buster-monday/upload-image', {
                              method: 'POST',
                              body: uploadFormData,
                            });

                            if (!response.ok) {
                              const error = await response.json();
                              throw new Error(error.error || 'Upload failed');
                            }

                            const result = await response.json();
                            
                            // Update form data with uploaded file info
                            handleInputChange('media_files', [{ 
                              name: file.name, 
                              url: result.url,
                              type: file.type,
                              size: file.size,
                              fileName: result.fileName,
                              filePath: result.filePath
                            }]);

                          } catch (error) {
                            console.error('Upload error:', error);
                            alert(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
                          } finally {
                            setIsUploading(false);
                          }
                        }
                      }}
                    />
                  </label>
                </div>
                {formData.media_files?.[0] && (
                  <div className="p-3 border-t bg-neutral-900" style={{ borderColor: '#27272a' }}>
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-neutral-400 truncate">{formData.media_files[0].name}</p>
                        <p className="text-xs text-neutral-600 mt-0.5">
                          {(formData.media_files[0].size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleInputChange('media_files', [])}
                        className="text-neutral-600 hover:text-neutral-400 transition-colors ml-3"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Image Adjustments */}
            <div className="space-y-4 pt-4 border-t" style={{ borderColor: '#18181b' }}>
              <p className="text-xs font-medium text-neutral-500 uppercase tracking-widest">Image Adjustments</p>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs text-neutral-600">Font Size: {formData.titleFontSize}px</label>
                  <input
                    type="range"
                    value={formData.titleFontSize}
                    onChange={(e) => handleInputChange('titleFontSize', parseInt(e.target.value))}
                    className="w-full h-1 bg-neutral-900 appearance-none cursor-pointer slider"
                    min="20"
                    max="120"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-xs text-neutral-600">Zoom: {formData.imageZoom}%</label>
                  <input
                    type="range"
                    value={formData.imageZoom}
                    onChange={(e) => handleInputChange('imageZoom', parseInt(e.target.value))}
                    className="w-full h-1 bg-neutral-900 appearance-none cursor-pointer slider"
                    min="10"
                    max="200"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs text-neutral-600">Fit</label>
                  <select
                    value={formData.imageFit}
                    onChange={(e) => handleInputChange('imageFit', e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-950 border text-neutral-300 text-sm focus:outline-none focus:ring-0"
                    style={{ borderColor: '#27272a' }}
                  >
                    <option value="cover">Cover</option>
                    <option value="contain">Contain</option>
                    <option value="fill">Fill</option>
                  </select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-xs text-neutral-600">Alignment</label>
                  <select
                    value={formData.imageAlignment}
                    onChange={(e) => handleInputChange('imageAlignment', e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-950 border text-neutral-300 text-sm focus:outline-none focus:ring-0"
                    style={{ borderColor: '#27272a' }}
                  >
                    <option value="center">Center</option>
                    <option value="top">Top</option>
                    <option value="bottom">Bottom</option>
                  </select>
                </div>
              </div>
            </div>


            {/* Generated Images */}
            <div className="space-y-4 pt-6 border-t" style={{ borderColor: '#18181b' }}>
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-neutral-500 uppercase tracking-widest">Generated Images</p>
                <button
                  type="button"
                  onClick={handleGeneratePreviewImages}
                  disabled={isGeneratingImages}
                  className="px-4 py-2 bg-gradient-to-r from-neutral-200 to-neutral-300 hover:from-neutral-300 hover:to-neutral-400 text-black text-xs font-medium border transition-all disabled:opacity-50"
                  style={{ borderColor: '#a3a3a3' }}
                >
                  {isGeneratingImages ? 'Generating...' : 'Generate'}
                </button>
              </div>
              
              {(formData.generated_image_a_url || formData.generated_image_b_url) ? (
                <div className="space-y-2">
                  {formData.generated_image_a_url && (
                    <div className="flex items-center justify-between p-3 bg-neutral-950 border" style={{ borderColor: '#27272a' }}>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-neutral-500">Template A</span>
                        <span className="text-xs text-neutral-600">2160×3840</span>
                      </div>
                      <button
                        onClick={() => {
                          const link = document.createElement('a');
                          link.href = formData.generated_image_a_url!;
                          link.download = `myth-buster-template-a-${Date.now()}.jpg`;
                          link.click();
                        }}
                        className="px-3 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs transition-colors"
                      >
                        Download
                      </button>
                    </div>
                  )}
                  {formData.generated_image_b_url && (
                    <div className="flex items-center justify-between p-3 bg-neutral-950 border" style={{ borderColor: '#27272a' }}>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-neutral-500">Template B</span>
                        <span className="text-xs text-neutral-600">2160×3840</span>
                      </div>
                      <button
                        onClick={() => {
                          const link = document.createElement('a');
                          link.href = formData.generated_image_b_url!;
                          link.download = `myth-buster-template-b-${Date.now()}.jpg`;
                          link.click();
                        }}
                        className="px-3 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs transition-colors"
                      >
                        Download
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-neutral-600 text-center py-4">No images generated</p>
              )}
            </div>

            {/* Submit Button */}
            <div className="pt-8">
              <button
                type="submit"
                className="w-full py-4 bg-gradient-to-r from-neutral-200 via-neutral-300 to-neutral-200 hover:from-neutral-300 hover:via-neutral-400 hover:to-neutral-300 text-black font-medium tracking-wide transition-all border"
                style={{ borderColor: '#a3a3a3' }}
              >
                {editingItem ? 'Update' : 'Create'}
              </button>
            </div>
              </div>
            </form>
          </div>

          {/* Right Side - Live Preview */}
          <div className="w-3/5 border-l flex flex-col bg-black" style={{ borderColor: '#27272a' }}>
            <div className="px-8 py-6 border-b" style={{ borderColor: '#27272a' }}>
              <h3 className="text-sm font-light text-neutral-400 uppercase tracking-widest">Live Preview</h3>
            </div>
            
            <div className="flex-1 p-8">
              {/* Templates Side by Side */}
              <div className="grid grid-cols-2 gap-6 h-full">
                {/* Template A Preview */}
                <div className="space-y-3">
                  <p className="text-xs text-neutral-600 uppercase tracking-widest">Template A</p>
                  <div className="relative w-full overflow-hidden bg-neutral-200 border" style={{ height: 'calc(100vh - 300px)', position: 'relative', borderColor: '#d4d4d4' }}>
                    <MythBusterPreview
                      title={formData.title}
                      myth={formData.myth}
                      fact={formData.fact}
                      badgeText={formData.badge_text}
                      imageUrl={formData.media_files?.[0]?.url || ''}
                      templateType="A"
                      titleFontSize={formData.titleFontSize}
                      imageFit={formData.imageFit}
                      imageAlignment={formData.imageAlignment}
                      imageZoom={formData.imageZoom}
                      imageVerticalPosition={formData.imageVerticalPosition}
                      isPreview={true}
                    />
                  </div>
                </div>

                {/* Template B Preview */}
                <div className="space-y-3">
                  <p className="text-xs text-neutral-600 uppercase tracking-widest">Template B</p>
                  <div className="relative w-full overflow-hidden bg-neutral-200 border" style={{ height: 'calc(100vh - 300px)', position: 'relative', borderColor: '#d4d4d4' }}>
                    <MythBusterPreview
                      title={formData.title}
                      myth={formData.myth}
                      fact={formData.fact}
                      badgeText={formData.badge_text}
                      imageUrl={formData.media_files?.[0]?.url || ''}
                      templateType="B"
                      titleFontSize={formData.titleFontSize}
                      imageFit={formData.imageFit}
                      imageAlignment={formData.imageAlignment}
                      imageZoom={formData.imageZoom}
                      imageVerticalPosition={formData.imageVerticalPosition}
                      isPreview={true}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
