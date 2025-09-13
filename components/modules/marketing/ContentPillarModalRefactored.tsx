'use client';

import React, { useState, useEffect, useRef } from 'react';
import { FileText, Video, Image as ImageIcon, Sparkles, Upload, X, Download, Eye, RotateCcw, Trash2 } from 'lucide-react';
import { useAuth } from '@/components/shared/AuthProvider';
import { supabase } from '@/lib/supabaseClient';

// Import our modular structure
import { 
  ContentPillarModalProps, 
  ContentPillarFormData, 
  FileWithThumbnail, 
  InventoryCar,
  ContentPillarItem
} from './types';
import { 
  generateTemplate, 
  getSupportedTemplateTypes, 
  getDefaultBadgeText,
  getTemplateConfig,
  DayKey,
  TemplateType 
} from './templates/TemplateRegistry';
import { 
  getFontFaceCSS, 
  getAbsoluteLogoUrl, 
  getCacheBustedImageUrl, 
  getImageUrl,
  cleanMercedesTitle,
  formatMonthlyPayment
} from './utils/templateUtils';

export default function ContentPillarModalRefactored({
  isOpen,
  onClose,
  onSave,
  onDelete,
  dayKey,
  dayTitle,
  isEditing = false,
  editingItem,
  onRegenerate,
  aiGeneratedContent,
  generatedImageBase64,
  onGeneratedImageChange
}: ContentPillarModalProps) {
  
  const { user } = useAuth();
  
  // State management
  const [deleting, setDeleting] = useState(false);
  const [selectedFilesA, setSelectedFilesA] = useState<FileWithThumbnail[]>([]);
  const [selectedFilesB, setSelectedFilesB] = useState<FileWithThumbnail[]>([]);
  const [existingMediaA, setExistingMediaA] = useState<any[]>([]);
  const [existingMediaB, setExistingMediaB] = useState<any[]>([]);
  const [generatingTemplate, setGeneratingTemplate] = useState(false);
  const [generatingVideo, setGeneratingVideo] = useState(false);
  const [inventoryCars, setInventoryCars] = useState<InventoryCar[]>([]);
  const [selectedCarId, setSelectedCarId] = useState<string>('');
  const [loadingCars, setLoadingCars] = useState(false);

  // Helper functions to safely use template registry
  const getSafeBadgeText = (day: string): string => {
    try {
      return getDefaultBadgeText(day as DayKey);
    } catch (error) {
      console.warn(`Invalid dayKey: ${day}, falling back to default badge`);
      return day.toUpperCase();
    }
  };

  const getSafeSupportedTypes = (day: string): TemplateType[] => {
    try {
      return getSupportedTemplateTypes(day as DayKey);
    } catch (error) {
      console.warn(`Invalid dayKey: ${day}, falling back to template A`);
      return ['A'];
    }
  };

  const getSafeTemplate = (day: string, formData: ContentPillarFormData, renderImageUrl: string, absoluteLogoUrl: string, fontFaceCSS: string, templateType: TemplateType = 'A'): string => {
    try {
      return generateTemplate(day as DayKey, formData, renderImageUrl, absoluteLogoUrl, fontFaceCSS, templateType);
    } catch (error) {
      console.error(`Error generating template for ${day}:`, error);
      return `<html><body><div style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:Arial;color:red;">Template Error for ${day}</div></body></html>`;
    }
  };
  
  // Form data with ALL original fields
  const [formData, setFormData] = useState<ContentPillarFormData>({
    title: editingItem?.title || aiGeneratedContent?.title || '',
    description: editingItem?.description || aiGeneratedContent?.description || '',
    titleFontSize: 72,
    imageFit: 'cover',
    imageAlignment: 'center',
    imageZoom: 100,
    imageVerticalPosition: 0,
    badgeText: editingItem?.badge_text || aiGeneratedContent?.badge_text || getSafeBadgeText(dayKey),
    subtitle: editingItem?.subtitle || aiGeneratedContent?.subtitle || '',
    myth: editingItem?.myth || aiGeneratedContent?.myth || '',
    fact: editingItem?.fact || aiGeneratedContent?.fact || '',
    problem: editingItem?.problem || aiGeneratedContent?.problem || '',
    solution: editingItem?.solution || aiGeneratedContent?.solution || '',
    difficulty: editingItem?.difficulty || aiGeneratedContent?.difficulty || '',
    tools_needed: editingItem?.tools_needed || aiGeneratedContent?.tools_needed || '',
    warning: editingItem?.warning || aiGeneratedContent?.warning || '',
    car_model: '',
    monthly_20_down_aed: 0,
    media_files: [],
  });

  // Template preview refs
  const iframeRefA = useRef<HTMLIFrameElement>(null);
  const iframeRefB = useRef<HTMLIFrameElement>(null);

  // File input refs for each template
  const fileInputRefA = useRef<HTMLInputElement>(null);
  const fileInputRefB = useRef<HTMLInputElement>(null);

  // Fetch inventory cars for Wednesday spotlight
  const fetchInventoryCars = async () => {
    if (dayKey === 'wednesday' && isOpen) {
      setLoadingCars(true);
      try {
        const headers = await getAuthHeaders();
        const response = await fetch('/api/inventory-cars', { headers });
        
        if (response.ok) {
          const data = await response.json();
          console.log('✅ Fetched inventory cars response:', data);
          
          // Extract cars array from response
          const cars = data.success ? data.cars : data;
          console.log('✅ Extracted cars array:', cars?.length || 0, cars);
          console.log('✅ Setting inventory cars state...');
          setInventoryCars(cars || []);
          
          // Debug: Check if state was set
          setTimeout(() => {
            console.log('✅ State check - inventoryCars length after setState:', inventoryCars.length);
          }, 100);
        } else {
          console.error('Failed to fetch inventory cars');
          setInventoryCars([]);
        }
      } catch (error) {
        console.error('Error fetching inventory cars:', error);
        setInventoryCars([]);
      } finally {
        setLoadingCars(false);
      }
    }
  };

  // Helper function to get authorization headers
  const getAuthHeaders = async (): Promise<Record<string, string>> => {
    if (!user) return { 'Content-Type': 'application/json' };
    
    const session = await supabase.auth.getSession();
    const token = session.data.session?.access_token;
    
    return token ? {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    } : {
      'Content-Type': 'application/json'
    };
  };

  // Generate live preview HTML using our new modular system
  const generateLivePreviewHTML = (templateType: TemplateType = 'A'): string => {
    // Use appropriate media files for each template
    const selectedFiles = templateType === 'A' ? selectedFilesA : selectedFilesB;
    const existingMedia = templateType === 'A' ? existingMediaA : existingMediaB;
    
    console.log(`🎨 Template ${templateType} Media:`, {
      selectedFiles: selectedFiles.length,
      existingMedia: existingMedia.length,
      selectedFileNames: selectedFiles.map(f => f.file.name),
      existingMediaNames: existingMedia.map(m => m.name)
    });
    
    const imageUrl = getImageUrl(selectedFiles, existingMedia);
    const renderImageUrl = getCacheBustedImageUrl(imageUrl);
    const absoluteLogoUrl = getAbsoluteLogoUrl();
    const fontFaceCSS = getFontFaceCSS();
    
    console.log(`🖼️ Template ${templateType} using image:`, imageUrl);
    
    return getSafeTemplate(
      dayKey,
      formData,
      renderImageUrl,
      absoluteLogoUrl,
      fontFaceCSS,
      templateType
    );
  };

  // File upload handler - upload directly to Supabase
  const handleFileUpload = async (files: FileList, templateType: TemplateType = 'A') => {
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // Check file type
      if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
        alert(`File ${file.name} is not a supported image or video format.`);
        continue;
      }
      
      // Check file size (50MB limit)
      const maxFileSize = 50 * 1024 * 1024;
      if (file.size > maxFileSize) {
        alert(`File ${file.name} exceeds the 50MB size limit.`);
        continue;
      }
      
      // Create file entry with uploading state
      const fileEntry: FileWithThumbnail = {
        file,
        thumbnail: '',
        uploadProgress: 0,
        uploading: true,
        uploaded: false
      };
      
      // Add to appropriate template's selected files
      const setSelectedFilesForTemplate = templateType === 'A' ? setSelectedFilesA : setSelectedFilesB;
      const selectedFilesForTemplate = templateType === 'A' ? selectedFilesA : selectedFilesB;
      
      setSelectedFilesForTemplate(prev => [...prev, fileEntry]);
      const currentIndex = selectedFilesForTemplate.length;
      
      try {
        // Upload directly to Supabase
        const tempPillarId = editingItem?.id || crypto.randomUUID();
        const ext = file.name.split('.').pop();
        const fileName = `${crypto.randomUUID()}.${ext}`;
        const storagePath = `content-pillars/${tempPillarId}/${fileName}`;
        
        console.log(`📤 Uploading ${file.name} to Supabase...`);
        
        const { error: uploadError } = await supabase.storage
          .from('media-files')
          .upload(storagePath, file, { 
            contentType: file.type, 
            cacheControl: '3600', 
            upsert: false 
          });
        
        if (uploadError) {
          console.error('📤 Supabase upload error:', uploadError);
          throw new Error(uploadError.message);
        }
        
        const { data: { publicUrl: rawUrl } } = supabase.storage
          .from('media-files')
          .getPublicUrl(storagePath);
        
        // Convert to custom domain to avoid ISP blocking
        const publicUrl = rawUrl.replace('rrxfvdtubynlsanplbta.supabase.co', 'database.silberarrows.com');
        
        // Create media item for existing media
        const mediaItem = {
          url: publicUrl,
          name: file.name,
          type: file.type,
          size: file.size,
          uploadedAt: new Date().toISOString(),
        };
        
        // Add to appropriate template's existing media and remove from selected files
        const setExistingMediaForTemplate = templateType === 'A' ? setExistingMediaA : setExistingMediaB;
        setExistingMediaForTemplate(prev => [...prev, mediaItem]);
        setSelectedFilesForTemplate(prev => prev.filter((_, i) => i !== currentIndex));
        
        console.log(`✅ ${file.name} uploaded successfully to Supabase`);
        
      } catch (error) {
        console.error(`❌ Error uploading ${file.name}:`, error);
        
        // Update file entry to show error state
        setSelectedFilesForTemplate(prev => prev.map((item, i) => 
          i === currentIndex 
            ? { ...item, uploading: false, uploaded: false, error: error instanceof Error ? error.message : 'Upload failed' }
            : item
        ));
        
        alert(`Failed to upload ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  };


  // Remove existing media file
  const removeExistingMedia = async (indexToRemove: number, templateType: TemplateType = 'A') => {
    const currentMedia = templateType === 'A' ? existingMediaA : existingMediaB;
    const mediaToRemove = currentMedia[indexToRemove];
    if (!mediaToRemove) return;

    try {
      // Remove from local state immediately for better UX
      if (templateType === 'A') {
        setExistingMediaA(prev => prev.filter((_, index) => index !== indexToRemove));
      } else {
        setExistingMediaB(prev => prev.filter((_, index) => index !== indexToRemove));
      }

      // If we have an editingItem, we should update it to remove this media
      if (editingItem && onSave) {
        const updatedMediaFiles = currentMedia.filter((_, index) => index !== indexToRemove);
        
        // Update the content pillar in the database
        await onSave({
          ...editingItem,
          media_files: updatedMediaFiles
        });
        
        console.log('✅ Existing media file removed and updated in database');
      }
    } catch (error) {
      console.error('❌ Error removing existing media:', error);
      // Restore the media file if database update failed
      if (templateType === 'A') {
        setExistingMediaA(prev => [...prev.slice(0, indexToRemove), mediaToRemove, ...prev.slice(indexToRemove)]);
      } else {
        setExistingMediaB(prev => [...prev.slice(0, indexToRemove), mediaToRemove, ...prev.slice(indexToRemove)]);
      }
      alert('Failed to remove media file. Please try again.');
    }
  };

  // Handle car selection for Wednesday
  const handleCarSelection = (carId: string) => {
    if (!inventoryCars || inventoryCars.length === 0) {
      console.warn('No inventory cars available');
      return;
    }
    
    const selectedCar = inventoryCars.find(car => car.id === carId);
    if (selectedCar) {
      setSelectedCarId(carId);
      setFormData(prev => ({
        ...prev,
        car_model: `${selectedCar.model_year} ${selectedCar.vehicle_model}`,
        title: cleanMercedesTitle(`${selectedCar.model_year} ${selectedCar.vehicle_model}`),
        monthly_20_down_aed: selectedCar.monthly_20_down_aed || 0,
        year: selectedCar.model_year,
        make: 'Mercedes-Benz',
        model: selectedCar.vehicle_model,
        price: selectedCar.advertised_price_aed,
        exterior_color: selectedCar.colour,
        interior_color: selectedCar.interior_colour || undefined,
        // Additional fields for Wednesday Template B
        mileage: selectedCar.current_mileage_km || 25000,
        horsepower: selectedCar.horsepower_hp || 300,
        engine: selectedCar.engine || '3.0L V6 Turbo',
        transmission: selectedCar.transmission || '9G-TRONIC Automatic',
        fuel_type: 'Petrol', // Default value
        features: selectedCar.key_equipment ? selectedCar.key_equipment.split(',').map(f => f.trim()) : [],
        // Monthly payment fields
        monthly_0_down_aed: selectedCar.monthly_0_down_aed,
        monthly_20_down_aed: selectedCar.monthly_20_down_aed
      }));
      
    // Set car image if available - use second social_media image
    if (selectedCar.car_media && selectedCar.car_media.length >= 2) {
      const socialMediaImages = selectedCar.car_media
        .filter((media: any) => media.kind === 'social_media')
        .sort((a: any, b: any) => a.sort_order - b.sort_order);
      
      if (socialMediaImages.length >= 2) {
        // Use the second social_media image
        const secondSocialImage = socialMediaImages[1];
        // For Wednesday, add social media image to Template A only
        setExistingMediaA([{ url: secondSocialImage.url, name: 'Car Social Media Image', type: 'image/jpeg' }]);
        setExistingMediaB([]); // Clear Template B media for Wednesday
      }
    }
    }
  };

  // Template generation function
  const handleGenerateTemplate = async () => {
    if (dayKey === 'wednesday') {
      if (!formData.car_model && !selectedCarId) {
        alert('Please select a car first for Wednesday spotlight.');
        return;
      }
    } else {
      if (!formData.title) {
        alert('Please enter a title first.');
        return;
      }
    }

    setGeneratingTemplate(true);
    
    try {
      const supportedTypes = getSafeSupportedTypes(dayKey);
      
      for (const template of supportedTypes) {
        console.log(`📄 Generating Template ${template}...`);
        
        const htmlContent = generateLivePreviewHTML(template);
        console.log(`📄 Generated HTML for Template ${template}, length:`, htmlContent.length);
        console.log(`📄 HTML preview:`, htmlContent.substring(0, 500) + '...');
        
        const response = await fetch('/api/generate-content-pillar-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            html: htmlContent,
            dayOfWeek: dayKey
          })
        });

        if (!response.ok) {
          throw new Error(`Failed to generate Template ${template} image`);
        }

        const result = await response.json();
        
        if (result.success && result.imageBase64) {
          // Save generated image and update state
          if (onGeneratedImageChange) {
            onGeneratedImageChange(result.imageBase64);
          }
          
          // Also save as file
          await saveGeneratedImageAsFile(result.imageBase64, template);
          
          console.log(`✅ Template ${template} generated successfully`);
        }
      }
    } catch (error) {
      console.error('Error generating template:', error);
      alert('Failed to generate template. Please try again.');
    } finally {
      setGeneratingTemplate(false);
    }
  };

  // Video generation function
  const handleGenerateVideo = async () => {
    if (dayKey === 'wednesday') {
      if (!formData.car_model && !selectedCarId) {
        alert('Please select a car first for Wednesday spotlight.');
        return;
      }
    }

    setGeneratingVideo(true);
    try {
      console.log('🎬 Starting video generation...');
      
      // Prepare video generation request
      const videoRequest = {
        dayOfWeek: dayKey,
        templateType: 'A', // For now, always use template A for videos
        formData: {
          ...formData,
          badgeText: getSafeBadgeText(dayKey || ''),
        }
      };

      console.log('📤 Sending video generation request:', videoRequest);

      // Call our video generation API
      const response = await fetch('/api/generate-content-pillar-video', {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify(videoRequest)
      });

      const result = await response.json();
      console.log('📥 Video generation response:', result);

      if (result.success && result.videoData) {
        console.log('✅ Video generated successfully!');
        
        // Download the video
        downloadVideo(result.videoData, `content_pillar_${dayKey}_video_${Date.now()}.mp4`);
        
        alert('Video generated successfully!');
      } else {
        console.error('❌ Video generation failed:', result.error);
        alert(`Failed to generate video: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('❌ Error generating video:', error);
      alert('Failed to generate video. Please try again.');
    } finally {
      setGeneratingVideo(false);
    }
  };

  // Download video helper
  const downloadVideo = (videoBase64: string, filename: string) => {
    const byteCharacters = atob(videoBase64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'video/mp4' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  };

  // Save generated image as file
  const saveGeneratedImageAsFile = async (imageBase64: string, template: TemplateType) => {
    try {
      const titleForFilename = dayKey === 'wednesday' ? (formData.car_model || 'car') : formData.title;
      const cleanTitle = titleForFilename
        .replace(/[^a-zA-Z0-9\s]/g, '')
        .replace(/\s+/g, '_')
        .toLowerCase();
      
      const filename = `template_${template.toLowerCase()}_${cleanTitle}_${Date.now()}.png`;
      
      // Convert base64 to blob
      const byteCharacters = atob(imageBase64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'image/png' });
      
      // Create file object
      const file = new File([blob], filename, { type: 'image/png' });
      
      // Add to selected files without thumbnail
      const fileWithThumbnail: FileWithThumbnail = {
        file,
        thumbnail: '', // No thumbnail needed
        uploadProgress: 100,
        uploading: false,
        uploaded: true
      };
      
      // Add generated template to Template A files (default behavior)
      setSelectedFilesA(prev => {
        // Remove any existing template files for this template type
        const filtered = prev.filter(f => !f.file.name.includes(`template_${template.toLowerCase()}`));
        return [...filtered, fileWithThumbnail];
      });
      
      console.log(`✅ Template ${template} saved as file: ${filename}`);
    } catch (error) {
      console.error(`❌ Error saving Template ${template} as file:`, error);
    }
  };

  // Save handler - files already uploaded to Supabase
  const handleSave = async () => {
    try {
      const pillarData = {
        title: formData.title,
        description: formData.description,
        content_type: 'image' as const,
        day_of_week: dayKey,
        badge_text: formData.badgeText,
        subtitle: formData.subtitle,
        myth: formData.myth,
        fact: formData.fact,
        problem: formData.problem,
        solution: formData.solution,
        difficulty: formData.difficulty,
        tools_needed: formData.tools_needed,
        warning: formData.warning,
        media_files: [...existingMediaA, ...existingMediaB], // Combine media from both templates
      };

      console.log('📤 Saving content pillar data:', pillarData);
      await onSave(pillarData);
      onClose();
    } catch (error) {
      console.error('Error saving content pillar:', error);
      alert('Failed to save content pillar. Please try again.');
    }
  };

  // Delete handler
  const handleDelete = async () => {
    if (!onDelete || !editingItem) return;
    
    if (!confirm('Are you sure you want to delete this content pillar?')) return;
    
    setDeleting(true);
    try {
      await onDelete();
      onClose();
    } catch (error) {
      console.error('Error deleting content pillar:', error);
      alert('Failed to delete content pillar. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  // Download generated image
  const handleDownloadImage = () => {
    if (!generatedImageBase64) return;
    
    const titleForDownload = dayKey === 'wednesday' ? (formData.car_model || 'car') : formData.title;
    const cleanTitle = titleForDownload
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .replace(/\s+/g, '_')
      .toLowerCase();
    
    const link = document.createElement('a');
    link.href = `data:image/png;base64,${generatedImageBase64}`;
    link.download = `content_pillar_${cleanTitle}_${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Effects
  useEffect(() => {
    if (isOpen) {
      fetchInventoryCars();
    }
  }, [isOpen, dayKey]);

  useEffect(() => {
    if (editingItem) {
      setFormData(prev => ({
        ...prev,
        title: editingItem.title,
        description: editingItem.description || '',
        badgeText: editingItem.badge_text || getSafeBadgeText(dayKey),
        subtitle: editingItem.subtitle || '',
        myth: editingItem.myth || '',
        fact: editingItem.fact || '',
        problem: editingItem.problem || '',
        solution: editingItem.solution || '',
        difficulty: editingItem.difficulty || '',
        tools_needed: editingItem.tools_needed || '',
        warning: editingItem.warning || '',
      }));
      
      // Split existing media files between templates (for now, put all in Template A)
      // TODO: Add logic to separate media files by template type if stored in database
      setExistingMediaA(editingItem.media_files || []);
      setExistingMediaB([]);
    }
  }, [editingItem, dayKey]);

  if (!isOpen) return null;

  return (
    <>
      {/* Custom styles for resizable textareas and inputs */}
      <style jsx>{`
        .resizable-textarea {
          background: rgba(0,0,0,0.6) !important;
          backdrop-filter: blur(5px) !important;
          transition: all 0.2s ease !important;
        }
        .resizable-textarea:focus {
          background: rgba(0,0,0,0.8) !important;
          border-color: rgba(156, 163, 175, 0.6) !important;
          box-shadow: 0 0 0 1px rgba(156, 163, 175, 0.3) !important;
        }
        .resizable-textarea::-webkit-resizer {
          background: linear-gradient(-45deg, transparent 40%, rgba(156, 163, 175, 0.4) 40%, rgba(156, 163, 175, 0.4) 60%, transparent 60%);
          border-radius: 0 0 4px 0;
          cursor: nw-resize;
        }
        .custom-input {
          background: rgba(0,0,0,0.6) !important;
          backdrop-filter: blur(5px) !important;
          transition: all 0.2s ease !important;
        }
        .custom-input:focus {
          background: rgba(0,0,0,0.8) !important;
          border-color: rgba(156, 163, 175, 0.6) !important;
          box-shadow: 0 0 0 1px rgba(156, 163, 175, 0.3) !important;
        }
        .custom-select {
          background: rgba(0,0,0,0.6) !important;
          backdrop-filter: blur(5px) !important;
          transition: all 0.2s ease !important;
        }
        .custom-select:focus {
          background: rgba(0,0,0,0.8) !important;
          border-color: rgba(156, 163, 175, 0.6) !important;
          box-shadow: 0 0 0 1px rgba(156, 163, 175, 0.3) !important;
        }
        .custom-select option {
          background: rgba(20,20,20,0.95) !important;
          color: #e5e7eb !important;
        }
        
        /* Custom scrollbar styling */
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: rgba(156, 163, 175, 0.3) transparent;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.2);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(156, 163, 175, 0.3);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(156, 163, 175, 0.5);
        }
      `}</style>
    <div className="fixed inset-0 top-[72px] bg-black/80 backdrop-blur-sm z-[9999] flex p-4" style={{ height: 'calc(100vh - 72px)' }}>
      <div className="bg-black/90 backdrop-blur-sm border border-gray-600/30 rounded-xl flex flex-col shadow-2xl overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(0,0,0,0.95) 0%, rgba(20,20,20,0.95) 50%, rgba(0,0,0,0.95) 100%)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          width: 'calc(100vw - 32px)',
          height: 'calc(100vh - 104px)',
          maxWidth: '100vw',
          maxHeight: 'calc(100vh - 72px)'
        }}
      >
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-600/30"
          style={{
            background: 'linear-gradient(135deg, rgba(30,30,30,0.8) 0%, rgba(50,50,50,0.6) 50%, rgba(30,30,30,0.8) 100%)'
          }}
        >
          <div>
            <h2 className="text-2xl font-bold text-white" style={{ fontFamily: 'Resonate, Inter, sans-serif' }}>{dayTitle}</h2>
            <p className="text-gray-400 text-sm mt-1">
              {isEditing ? 'Edit content pillar' : 'Create new content pillar'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors border border-gray-600/30"
          >
            <X className="w-5 h-5 text-gray-400 hover:text-white" />
          </button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          
          {/* Left Panel - Form */}
          <div className="w-1/3 flex flex-col"
            style={{
              background: 'linear-gradient(135deg, rgba(15,15,15,0.8) 0%, rgba(25,25,25,0.6) 50%, rgba(15,15,15,0.8) 100%)',
              borderRight: '1px solid rgba(156, 163, 175, 0.2)'
            }}
          >
            <div className="p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar"
              style={{
                maxHeight: 'calc(100vh - 272px)'
              }}
            >
            
            {/* Car Selection for Wednesday */}
            {dayKey === 'wednesday' && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2" style={{ fontFamily: 'Resonate, Inter, sans-serif' }}>
                  Select Car for Spotlight *
                </label>
                {loadingCars ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  </div>
                ) : (
                  <select
                    value={selectedCarId}
                    onChange={(e) => handleCarSelection(e.target.value)}
                    className="w-full px-3 py-2 bg-black/40 border border-gray-600/40 rounded-lg text-gray-200 focus:border-gray-400 focus:outline-none backdrop-blur-sm custom-select"
                  >
                    <option value="">Select a car...</option>
                    {inventoryCars && inventoryCars.length > 0 ? inventoryCars.map((car) => (
                      <option key={car.id} value={car.id} className="bg-gray-800">
                        {car.model_year} {car.vehicle_model} - {car.colour} - AED {car.advertised_price_aed?.toLocaleString()}
                      </option>
                    )) : (
                      <option disabled className="bg-gray-800">No cars available</option>
                    )}
                  </select>
                )}
              </div>
            )}

            {/* Title Input */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none"
                placeholder="Enter title..."
                disabled={dayKey === 'wednesday' && !selectedCarId}
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 bg-black/40 border border-gray-600/40 rounded-lg text-gray-200 placeholder-gray-500 focus:border-gray-400 focus:outline-none backdrop-blur-sm resize-y min-h-[80px] max-h-[400px] resizable-textarea"
                placeholder="Enter description..."
              />
            </div>

            {/* Badge Text */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Badge Text
              </label>
              <input
                type="text"
                value={formData.badgeText}
                onChange={(e) => setFormData(prev => ({ ...prev, badgeText: e.target.value }))}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none"
                placeholder="Badge text..."
              />
            </div>

            {/* Extended fields for Monday (Myth Buster) */}
            {dayKey === 'monday' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Myth
                  </label>
                  <textarea
                    value={formData.myth}
                    onChange={(e) => setFormData(prev => ({ ...prev, myth: e.target.value }))}
                    rows={2}
                    className="w-full px-3 py-2 bg-black/40 border border-gray-600/40 rounded-lg text-gray-200 placeholder-gray-500 focus:border-gray-400 focus:outline-none backdrop-blur-sm resize-y min-h-[80px] max-h-[400px] resizable-textarea"
                    placeholder="Describe the common myth..."
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Fact
                  </label>
                  <textarea
                    value={formData.fact}
                    onChange={(e) => setFormData(prev => ({ ...prev, fact: e.target.value }))}
                    rows={2}
                    className="w-full px-3 py-2 bg-black/40 border border-gray-600/40 rounded-lg text-gray-200 placeholder-gray-500 focus:border-gray-400 focus:outline-none backdrop-blur-sm resize-y min-h-[80px] max-h-[400px] resizable-textarea"
                    placeholder="Provide the actual fact..."
                  />
                </div>
              </>
            )}

            {/* Extended fields for Tuesday (Tech Tips) */}
            {dayKey === 'tuesday' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Problem
                  </label>
                  <textarea
                    value={formData.problem}
                    onChange={(e) => setFormData(prev => ({ ...prev, problem: e.target.value }))}
                    rows={2}
                    className="w-full px-3 py-2 bg-black/40 border border-gray-600/40 rounded-lg text-gray-200 placeholder-gray-500 focus:border-gray-400 focus:outline-none backdrop-blur-sm resize-y min-h-[80px] max-h-[400px] resizable-textarea"
                    placeholder="Describe the problem..."
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Solution
                  </label>
                  <textarea
                    value={formData.solution}
                    onChange={(e) => setFormData(prev => ({ ...prev, solution: e.target.value }))}
                    rows={2}
                    className="w-full px-3 py-2 bg-black/40 border border-gray-600/40 rounded-lg text-gray-200 placeholder-gray-500 focus:border-gray-400 focus:outline-none backdrop-blur-sm resize-y min-h-[80px] max-h-[400px] resizable-textarea"
                    placeholder="Provide the solution..."
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Difficulty Level
                  </label>
                  <select
                    value={formData.difficulty}
                    onChange={(e) => setFormData(prev => ({ ...prev, difficulty: e.target.value }))}
                    className="w-full px-3 py-2 bg-black/40 border border-gray-600/40 rounded-lg text-gray-200 focus:border-gray-400 focus:outline-none backdrop-blur-sm custom-select"
                  >
                    <option value="">Select difficulty...</option>
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                    <option value="Expert">Expert</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Tools Needed
                  </label>
                  <input
                    type="text"
                    value={formData.tools_needed}
                    onChange={(e) => setFormData(prev => ({ ...prev, tools_needed: e.target.value }))}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none"
                    placeholder="List required tools..."
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Warning (Optional)
                  </label>
                  <textarea
                    value={formData.warning}
                    onChange={(e) => setFormData(prev => ({ ...prev, warning: e.target.value }))}
                    rows={2}
                    className="w-full px-3 py-2 bg-black/40 border border-gray-600/40 rounded-lg text-gray-200 placeholder-gray-500 focus:border-gray-400 focus:outline-none backdrop-blur-sm resize-y min-h-[80px] max-h-[400px] resizable-textarea"
                    placeholder="Any safety warnings..."
                  />
                </div>
              </>
            )}

            {/* Template A Media Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2" style={{ fontFamily: 'Resonate, Inter, sans-serif' }}>
                Template A Media Files
              </label>
              
              <input
                ref={fileInputRefA}
                type="file"
                multiple
                accept="image/*,video/*"
                onChange={(e) => e.target.files && handleFileUpload(e.target.files, 'A')}
                className="hidden"
              />
              
              <div 
                className="border-2 border-dashed border-gray-600/40 rounded-lg p-3 text-center cursor-pointer hover:border-gray-500/60 transition-colors"
                style={{
                  background: 'rgba(0,0,0,0.3)',
                  backdropFilter: 'blur(5px)'
                }}
                onClick={() => fileInputRefA.current?.click()}
              >
                <Upload className="w-6 h-6 text-gray-500 mx-auto mb-1" />
                <p className="text-gray-400 text-xs">Template A Media</p>
              </div>
              
              {/* Template A File List */}
              {(selectedFilesA.length > 0 || existingMediaA.length > 0) && (
                <div className="mt-2 space-y-1">
                  {existingMediaA.map((media, index) => (
                    <div key={`existing-a-${index}`} className="flex items-center gap-2 p-2 bg-black/30 border border-gray-600/30 rounded-lg backdrop-blur-sm">
                      <div className="w-8 h-8 bg-white/10 rounded flex items-center justify-center">
                        <ImageIcon className="w-4 h-4 text-white/60" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-gray-200 text-xs font-medium truncate" title={media.name || 'Template A Media'}>
                          {(() => {
                            const name = media.name || 'Template A Media';
                            return name.length > 20 ? `${name.substring(0, 20)}...` : name;
                          })()}
                        </p>
                      </div>
                      <button
                        onClick={() => setExistingMediaA(prev => prev.filter((_, i) => i !== index))}
                        className="p-1 hover:bg-gray-700/50 rounded transition-colors"
                        title="Delete this media file"
                      >
                        <X className="w-3 h-3 text-gray-400 hover:text-red-400" />
                      </button>
                    </div>
                  ))}
                  
                  {selectedFilesA.map((fileInfo, index) => (
                    <div key={`new-a-${index}`} className="flex items-center gap-2 p-2 bg-black/30 border border-gray-600/30 rounded-lg backdrop-blur-sm">
                      <div className="w-8 h-8 bg-white/10 rounded flex items-center justify-center">
                        {fileInfo.uploading ? (
                          <div className="w-3 h-3 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
                        ) : fileInfo.error ? (
                          <X className="w-4 h-4 text-red-400" />
                        ) : (
                          <ImageIcon className="w-4 h-4 text-white/60" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-gray-200 text-xs font-medium truncate" title={fileInfo.file.name}>
                          {fileInfo.file.name.length > 20 ? `${fileInfo.file.name.substring(0, 20)}...` : fileInfo.file.name}
                        </p>
                        <p className="text-gray-400 text-xs">
                          {fileInfo.uploading ? 'Uploading...' : 
                           fileInfo.error ? 'Error' :
                           `${(fileInfo.file.size / 1024 / 1024).toFixed(1)}MB`}
                        </p>
                      </div>
                      {!fileInfo.uploading && (
                        <button
                          onClick={() => setSelectedFilesA(prev => prev.filter((_, i) => i !== index))}
                          className="p-1 hover:bg-gray-700/50 rounded transition-colors"
                        >
                          <X className="w-3 h-3 text-gray-400 hover:text-red-400" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Template B Media Upload - Only show if Template B is supported */}
            {getSafeSupportedTypes(dayKey).includes('B') && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2" style={{ fontFamily: 'Resonate, Inter, sans-serif' }}>
                  Template B Media Files
                </label>
                
                <input
                  ref={fileInputRefB}
                  type="file"
                  multiple
                  accept="image/*,video/*"
                  onChange={(e) => e.target.files && handleFileUpload(e.target.files, 'B')}
                  className="hidden"
                />
                
                <div 
                  className="border-2 border-dashed border-gray-600/40 rounded-lg p-3 text-center cursor-pointer hover:border-gray-500/60 transition-colors"
                  style={{
                    background: 'rgba(0,0,0,0.3)',
                    backdropFilter: 'blur(5px)'
                  }}
                  onClick={() => fileInputRefB.current?.click()}
                >
                  <Upload className="w-6 h-6 text-gray-500 mx-auto mb-1" />
                  <p className="text-gray-400 text-xs">Template B Media</p>
                </div>
                
                {/* Template B File List */}
                {(selectedFilesB.length > 0 || existingMediaB.length > 0) && (
                  <div className="mt-2 space-y-1">
                    {existingMediaB.map((media, index) => (
                      <div key={`existing-b-${index}`} className="flex items-center gap-2 p-2 bg-black/30 border border-gray-600/30 rounded-lg backdrop-blur-sm">
                        <div className="w-8 h-8 bg-white/10 rounded flex items-center justify-center">
                          <ImageIcon className="w-4 h-4 text-white/60" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-gray-200 text-xs font-medium truncate" title={media.name || 'Template B Media'}>
                            {(() => {
                              const name = media.name || 'Template B Media';
                              return name.length > 20 ? `${name.substring(0, 20)}...` : name;
                            })()}
                          </p>
                        </div>
                        <button
                          onClick={() => setExistingMediaB(prev => prev.filter((_, i) => i !== index))}
                          className="p-1 hover:bg-gray-700/50 rounded transition-colors"
                          title="Delete this media file"
                        >
                          <X className="w-3 h-3 text-gray-400 hover:text-red-400" />
                        </button>
                      </div>
                    ))}
                    
                    {selectedFilesB.map((fileInfo, index) => (
                      <div key={`new-b-${index}`} className="flex items-center gap-2 p-2 bg-black/30 border border-gray-600/30 rounded-lg backdrop-blur-sm">
                        <div className="w-8 h-8 bg-white/10 rounded flex items-center justify-center">
                          {fileInfo.uploading ? (
                            <div className="w-3 h-3 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
                          ) : fileInfo.error ? (
                            <X className="w-4 h-4 text-red-400" />
                          ) : (
                            <ImageIcon className="w-4 h-4 text-white/60" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-gray-200 text-xs font-medium truncate" title={fileInfo.file.name}>
                            {fileInfo.file.name.length > 20 ? `${fileInfo.file.name.substring(0, 20)}...` : fileInfo.file.name}
                          </p>
                          <p className="text-gray-400 text-xs">
                            {fileInfo.uploading ? 'Uploading...' : 
                             fileInfo.error ? 'Error' :
                             `${(fileInfo.file.size / 1024 / 1024).toFixed(1)}MB`}
                          </p>
                        </div>
                        {!fileInfo.uploading && (
                          <button
                            onClick={() => setSelectedFilesB(prev => prev.filter((_, i) => i !== index))}
                            className="p-1 hover:bg-gray-700/50 rounded transition-colors"
                          >
                            <X className="w-3 h-3 text-gray-400 hover:text-red-400" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <button
                onClick={handleGenerateTemplate}
                disabled={generatingTemplate || (dayKey === 'wednesday' ? !selectedCarId : !formData.title)}
                className="flex-1 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-medium transition-all flex items-center justify-center gap-2 border border-gray-600/40"
                style={{
                  background: 'linear-gradient(135deg, rgba(100,100,100,0.8) 0%, rgba(120,120,120,0.6) 50%, rgba(100,100,100,0.8) 100%)',
                  backdropFilter: 'blur(10px)',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(135deg, rgba(120,120,120,0.9) 0%, rgba(140,140,140,0.7) 50%, rgba(120,120,120,0.9) 100%)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(135deg, rgba(100,100,100,0.8) 0%, rgba(120,120,120,0.6) 50%, rgba(100,100,100,0.8) 100%)';
                }}
              >
                {generatingTemplate ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <ImageIcon className="w-4 h-4" />
                    Generate Template
                  </>
                )}
              </button>

              <button
                onClick={handleGenerateVideo}
                disabled={generatingVideo || (dayKey === 'wednesday' ? !selectedCarId : !formData.title)}
                className="flex-1 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-medium transition-all flex items-center justify-center gap-2 border border-gray-600/40"
                style={{
                  background: 'linear-gradient(135deg, rgba(220,38,127,0.8) 0%, rgba(239,68,68,0.6) 50%, rgba(220,38,127,0.8) 100%)',
                  backdropFilter: 'blur(10px)',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(135deg, rgba(240,58,147,0.9) 0%, rgba(255,88,88,0.7) 50%, rgba(240,58,147,0.9) 100%)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(135deg, rgba(220,38,127,0.8) 0%, rgba(239,68,68,0.6) 50%, rgba(220,38,127,0.8) 100%)';
                }}
              >
                {generatingVideo ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Generating Video...
                  </>
                ) : (
                  <>
                    <Video className="w-4 h-4" />
                    Generate Video
                  </>
                )}
              </button>

              <button
                onClick={handleSave}
                disabled={dayKey === 'wednesday' ? !selectedCarId : !formData.title}
                className="flex-1 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-medium transition-all border border-gray-600/40"
                style={{
                  background: 'linear-gradient(135deg, rgba(120,120,120,0.8) 0%, rgba(140,140,140,0.6) 50%, rgba(120,120,120,0.8) 100%)',
                  backdropFilter: 'blur(10px)',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(135deg, rgba(140,140,140,0.9) 0%, rgba(160,160,160,0.7) 50%, rgba(140,140,140,0.9) 100%)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(135deg, rgba(120,120,120,0.8) 0%, rgba(140,140,140,0.6) 50%, rgba(120,120,120,0.8) 100%)';
                }}
              >
                {isEditing ? 'Update' : 'Save'}
              </button>
            </div>

            {/* AI Regenerate Button */}
            {onRegenerate && aiGeneratedContent && !isEditing && (
              <button
                onClick={() => onRegenerate('image')}
                className="w-full bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Regenerate AI Content
              </button>
            )}

            {/* Delete Button for Editing */}
            {isEditing && onDelete && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="w-full bg-red-600/20 hover:bg-red-600/30 text-red-400 px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                {deleting ? (
                  <div className="w-4 h-4 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                Delete Content Pillar
              </button>
            )}

            {/* Download Generated Image */}
            {generatedImageBase64 && (
              <button
                onClick={handleDownloadImage}
                className="w-full bg-gray-600/20 hover:bg-gray-600/30 text-gray-400 px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download Generated Image
              </button>
            )}
            </div>
          </div>

          {/* Right Panel - Dual Template Previews */}
          <div className="w-2/3 p-6"
            style={{
              background: 'linear-gradient(135deg, rgba(10,10,10,0.9) 0%, rgba(20,20,20,0.7) 50%, rgba(10,10,10,0.9) 100%)'
            }}
          >
            <div className="h-full flex flex-col">
              <div className="flex items-center justify-between mb-4 border-b border-gray-600/30 pb-3">
                <h3 className="text-lg font-semibold text-white" style={{ fontFamily: 'Resonate, Inter, sans-serif' }}>Template Previews</h3>
                <div className="text-xs text-gray-400 capitalize">{dayKey} Templates • 1080×1920</div>
              </div>

              {/* Dual Preview Panes */}
              <div className="flex-1 flex gap-4">
                {/* Template A Preview */}
                <div className="flex-1 rounded-xl border border-gray-600/30 overflow-hidden p-2"
                  style={{
                    background: 'linear-gradient(135deg, rgba(0,0,0,0.7) 0%, rgba(30,30,30,0.5) 50%, rgba(0,0,0,0.7) 100%)',
                    backdropFilter: 'blur(10px)'
                  }}
                >
                  <div className="text-xs text-gray-300 mb-2 text-center font-medium" style={{ fontFamily: 'Resonate, Inter, sans-serif' }}>Template A</div>
                  {(dayKey === 'wednesday' ? selectedCarId : formData.title) ? (
                    <div className="w-full h-full flex items-center justify-center overflow-hidden">
                      <div style={{ position: 'relative', width: '432px', height: '768px' }}>
                        <iframe
                          ref={iframeRefA}
                          key={`A-${dayKey}-${formData.title}-${selectedCarId}-${Date.now()}`}
                          srcDoc={generateLivePreviewHTML('A')}
                          className="border-0 rounded-lg shadow-2xl"
                          style={{ 
                            position: 'absolute', 
                            top: 0, 
                            left: 0, 
                            width: '1080px', 
                            height: '1920px', 
                            transform: 'scale(0.4)', 
                            transformOrigin: 'top left',
                            border: '1px solid rgba(156, 163, 175, 0.3)'
                          }}
                          title="Template A Preview"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full text-center text-gray-400 p-4">
                      <div>
                        <Eye className="w-12 h-12 mx-auto mb-2 text-gray-600" />
                        <p className="text-sm font-medium mb-1 text-gray-300">Template A</p>
                        <p className="text-xs text-gray-500">
                          {dayKey === 'wednesday' 
                            ? 'Select a car to see preview' 
                            : 'Enter a title to see preview'
                          }
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Template B Preview - Only show if supported */}
                {getSafeSupportedTypes(dayKey).includes('B') && (
                  <div className="flex-1 rounded-xl border border-gray-600/30 overflow-hidden p-2"
                    style={{
                      background: 'linear-gradient(135deg, rgba(0,0,0,0.7) 0%, rgba(30,30,30,0.5) 50%, rgba(0,0,0,0.7) 100%)',
                      backdropFilter: 'blur(10px)'
                    }}
                  >
                    <div className="text-xs text-gray-300 mb-2 text-center font-medium" style={{ fontFamily: 'Resonate, Inter, sans-serif' }}>Template B</div>
                    {(dayKey === 'wednesday' ? selectedCarId : formData.title) ? (
                      <div className="w-full h-full flex items-center justify-center overflow-hidden">
                        <div style={{ position: 'relative', width: '432px', height: '768px' }}>
                          <iframe
                            ref={iframeRefB}
                            key={`B-${dayKey}-${formData.title}-${selectedCarId}-${Date.now()}`}
                            srcDoc={generateLivePreviewHTML('B')}
                            className="border-0 rounded-lg shadow-2xl"
                            style={{ 
                              position: 'absolute', 
                              top: 0, 
                              left: 0, 
                              width: '1080px', 
                              height: '1920px', 
                              transform: 'scale(0.4)', 
                              transformOrigin: 'top left',
                              border: '1px solid rgba(156, 163, 175, 0.3)'
                            }}
                            title="Template B Preview"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-full text-center text-gray-400 p-4">
                        <div>
                          <Eye className="w-12 h-12 mx-auto mb-2 text-gray-600" />
                          <p className="text-sm font-medium mb-1 text-gray-300">Template B</p>
                          <p className="text-xs text-gray-500">
                            {dayKey === 'wednesday' 
                              ? 'Select a car to see preview' 
                              : 'Enter a title to see preview'
                            }
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
