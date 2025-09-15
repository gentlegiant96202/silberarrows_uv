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
  const [saving, setSaving] = useState(false);
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
    console.log(`🏢 Template ${templateType} using logo:`, absoluteLogoUrl);
    console.log(`🔍 Template ${templateType} existingMedia details:`, existingMedia.map(m => ({ 
      name: m.name, 
      type: m.type, 
      url: m.url?.substring(0, 50) + '...', 
      isImage: m.type?.startsWith('image/') || m.name?.match(/\.(jpe?g|png|webp|gif)$/i) || m.url?.match(/\.(jpe?g|png|webp|gif)$/i)
    })));
    console.log(`🔍 Template ${templateType} selectedFiles:`, selectedFiles.map(f => ({ name: f.file.name, type: f.file.type })));
    
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
    console.log(`📤 handleFileUpload called with templateType: ${templateType}`);
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
            cacheControl: '31536000', // 1 year cache to prevent deletion
            upsert: true // Allow overwrite to prevent conflicts
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
        
        // Create media item for existing media (without file property to prevent re-upload)
        const mediaItem = {
          url: publicUrl,
          name: file.name,
          type: file.type,
          size: file.size,
          uploadedAt: new Date().toISOString(),
          templateType,
          // NOTE: No 'file' property - this marks it as already uploaded
        };
        
        // Add to appropriate template's existing media and remove from selected files
        const setExistingMediaForTemplate = templateType === 'A' ? setExistingMediaA : setExistingMediaB;
        setExistingMediaForTemplate(prev => [...prev, mediaItem]);
        setSelectedFilesForTemplate(prev => prev.filter((_, i) => i !== currentIndex));
        
        console.log(`✅ Added media to Template ${templateType}:`, mediaItem.name);
        
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
        monthly_20_down_aed: selectedCar.monthly_20_down_aed ?? undefined,
        year: selectedCar.model_year,
        make: 'Mercedes-Benz',
        model: selectedCar.vehicle_model,
        price: selectedCar.advertised_price_aed,
        exterior_color: selectedCar.colour,
        interior_color: selectedCar.interior_colour ?? undefined,
        // Additional fields for Wednesday Template B
        mileage: selectedCar.current_mileage_km ?? 25000,
        horsepower: selectedCar.horsepower_hp ?? 300,
        engine: selectedCar.engine ?? '3.0L V6 Turbo',
        transmission: selectedCar.transmission ?? '9G-TRONIC Automatic',
        fuel_type: 'Petrol', // Default value
        features: selectedCar.key_equipment ? selectedCar.key_equipment.split(',').map(f => f.trim()) : [],
        // Monthly payment fields
        monthly_0_down_aed: selectedCar.monthly_0_down_aed ?? undefined
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
      const generatedImages: { template: TemplateType; imageBase64: string }[] = [];
      
      // Generate all templates first
      for (const template of supportedTypes) {
        console.log(`📄 Generating Template ${template}...`);
        
        // For image generation, use direct URLs (not proxy URLs) that Puppeteer can access
        const selectedFiles = template === 'A' ? selectedFilesA : selectedFilesB;
        const existingMedia = template === 'A' ? existingMediaA : existingMediaB;
        
        // Get direct image URL (not proxy) for image generation
        const getDirectImageForGeneration = (): string => {
          // Use existing media with direct URLs
          if (existingMedia && existingMedia.length > 0) {
            const firstMedia = existingMedia[0];
            if (typeof firstMedia === 'string') {
              return firstMedia;
            } else if (firstMedia?.url) {
              return firstMedia.url;
            }
          }
          
          // Fallback to any uploaded image from either template
          const allExistingMedia = [...existingMediaA, ...existingMediaB];
          if (allExistingMedia.length > 0) {
            const firstMedia = allExistingMedia[0];
            if (typeof firstMedia === 'string') {
              return firstMedia;
            } else if (firstMedia?.url) {
              return firstMedia.url;
            }
          }
          
          return getAbsoluteLogoUrl();
        };
        
        const directImageUrl = getDirectImageForGeneration();
        const renderImageUrl = getCacheBustedImageUrl(directImageUrl);
        const absoluteLogoUrl = getAbsoluteLogoUrl();
        const fontFaceCSS = getFontFaceCSS();
        
        console.log(`📄 Template ${template} using direct image URL:`, directImageUrl);
        
        const htmlContent = getSafeTemplate(
          dayKey,
          formData,
          renderImageUrl,
          absoluteLogoUrl,
          fontFaceCSS,
          template
        );
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
          generatedImages.push({ template, imageBase64: result.imageBase64 });
          console.log(`✅ Template ${template} generated successfully`);
        }
      }
      
      // Now download and save all images
      for (let i = 0; i < generatedImages.length; i++) {
        const { template, imageBase64 } = generatedImages[i];
        
        // Force download with delay between downloads
        if (i === 0) {
          downloadImage(imageBase64, template);
        } else {
          setTimeout(() => {
            downloadImage(imageBase64, template);
          }, 1500 * i); // Stagger downloads
        }
        
        // Save to modal
        await saveGeneratedImageAsFile(imageBase64, template);
        
        // Update state for first image (backward compatibility)
        if (i === 0 && onGeneratedImageChange) {
          onGeneratedImageChange(imageBase64);
        }
      }
      
      const downloadedCount = generatedImages.length;
      alert(`Templates generated successfully! Downloaded ${downloadedCount} image(s).`);
      
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
    
    // Check if we have any uploaded images (not just local blob files)
    const hasUploadedImages = existingMediaA.length > 0 || existingMediaB.length > 0;
    const hasOnlyLocalFiles = selectedFilesA.length > 0 || selectedFilesB.length > 0;
    
    if (!hasUploadedImages && hasOnlyLocalFiles) {
      alert('Please save your uploaded images first before generating videos. Click "Update" to upload them to storage.');
      return;
    }

    setGeneratingVideo(true);
    try {
      console.log('🎬 Starting video generation...');
      
      // Generate the exact same HTML used for image templates A & B
      const htmlA = generateLivePreviewHTML('A');
      const supportsB = getSafeSupportedTypes(dayKey).includes('B');
      const htmlB = supportsB ? generateLivePreviewHTML('B') : htmlA;

      // Compute image URLs per template so the video service receives them explicitly
      // For video generation, we need direct URLs (not proxy URLs) that Railway can access
      const getDirectImageUrl = (selectedFiles: any[], existingMedia: any[], fallbackToAnyImage: boolean = true): string => {
        // For video generation, skip selectedFiles (blob URLs) and use only uploaded URLs
        // Blob URLs like blob:http://localhost:3000/... can't be accessed by Railway
        
        // Use existing media but return direct URL (not proxy)
        if (existingMedia && existingMedia.length > 0) {
          const firstMedia = existingMedia[0];
          let imageUrl = '';
          
          if (typeof firstMedia === 'string') {
            imageUrl = firstMedia;
          } else if (firstMedia?.url) {
            imageUrl = firstMedia.url;
          }
          
          // Return direct URL for video service
          if (imageUrl) return imageUrl;
        }
        
        // Fallback: if this template has no image, try to use any image from either template
        if (fallbackToAnyImage) {
          // Try the other template's existing media (skip selectedFiles to avoid blob URLs)
          const allExistingMedia = [...existingMediaA, ...existingMediaB];
          
          if (allExistingMedia.length > 0) {
            const firstMedia = allExistingMedia[0];
            if (typeof firstMedia === 'string') {
              return firstMedia;
            } else if (firstMedia?.url) {
              return firstMedia.url;
            }
          }
        }
        
        // Final fallback to logo
        return getAbsoluteLogoUrl();
      };
      
      const imageUrlA = getCacheBustedImageUrl(getDirectImageUrl(selectedFilesA, existingMediaA));
      const imageUrlB = getCacheBustedImageUrl(getDirectImageUrl(selectedFilesB, existingMediaB));
      
      console.log('🎬 Video generation - selectedFilesA:', selectedFilesA.length, selectedFilesA.map(f => f.file.name));
      console.log('🎬 Video generation - existingMediaA:', existingMediaA.length, existingMediaA.map(m => m.name));
      console.log('🎬 Video generation - selectedFilesB:', selectedFilesB.length, selectedFilesB.map(f => f.file.name));
      console.log('🎬 Video generation - existingMediaB:', existingMediaB.length, existingMediaB.map(m => m.name));
      console.log('🎬 Video generation - Image URL A:', imageUrlA);
      console.log('🎬 Video generation - Image URL B:', imageUrlB);

      const formDataA = { ...formData, imageUrl: imageUrlA } as typeof formData & { imageUrl?: string };
      const formDataB = { ...formData, imageUrl: imageUrlB } as typeof formData & { imageUrl?: string };

      // Prepare video generation request using HTML for A & B
      const videoRequest = {
        dayOfWeek: dayKey,
        htmlA,
        htmlB,
        // Pass all variables so the video service can populate Remotion props per template
        formDataA,
        formDataB,
      } as const;

      console.log('📤 Sending video generation request:', videoRequest);

      // Call our video generation API
      const response = await fetch('/api/generate-content-pillar-video', {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify(videoRequest)
      });

      const result = await response.json();
      console.log('📥 Video generation response:', result);
      console.log('📊 Videos object:', result?.videos);
      console.log('📊 Video A exists:', !!result?.videos?.A);
      console.log('📊 Video B exists:', !!result?.videos?.B);
      console.log('📊 Video A length:', result?.videos?.A?.length);
      console.log('📊 Video B length:', result?.videos?.B?.length);

      if (result?.success && result?.videos) {
        // New flow: both Template A and B provided
        const a = result.videos.A as string | undefined;
        const b = result.videos.B as string | undefined;

        console.log('🎬 About to download videos - A:', !!a, 'B:', !!b);

        if (a) {
          console.log('⬇️ Downloading Template A video...');
          downloadVideo(a, `content_pillar_${dayKey}_A_${Date.now()}.mp4`);
          // Upload to Supabase and save to modal
          try {
            const videoUrl = await uploadVideoToSupabase(a, 'A');
            if (videoUrl) {
              console.log('✅ Template A video uploaded, adding to modal:', videoUrl);
              setExistingMediaA((prev: any[]) => [
                ...prev,
                { 
                  name: `Template A Video ${new Date().toLocaleString()}`, 
                  type: 'video/mp4', 
                  size: Math.round(a.length * 0.75), // Approximate file size
                  url: videoUrl,
                  templateType: 'A'
                }
              ]);
            } else {
              console.error('❌ Template A video upload failed - no URL returned');
            }
          } catch (error) {
            console.error('❌ Template A video upload failed:', error);
          }
        } else {
          console.warn('⚠️ Template A video not found in response');
        }
        
        // Process Template B video (no setTimeout needed since we're awaiting)
        if (b) {
          console.log('⬇️ Downloading Template B video...');
          downloadVideo(b, `content_pillar_${dayKey}_B_${Date.now()}.mp4`);
          // Upload to Supabase and save to modal
          try {
            const videoUrl = await uploadVideoToSupabase(b, 'B');
            if (videoUrl) {
              console.log('✅ Template B video uploaded, adding to modal:', videoUrl);
              setExistingMediaB((prev: any[]) => [
                ...prev,
                { 
                  name: `Template B Video ${new Date().toLocaleString()}`, 
                  type: 'video/mp4', 
                  size: Math.round(b.length * 0.75), // Approximate file size
                  url: videoUrl,
                  templateType: 'B'
                }
              ]);
            } else {
              console.error('❌ Template B video upload failed - no URL returned');
            }
          } catch (error) {
            console.error('❌ Template B video upload failed:', error);
          }
        } else {
          console.warn('⚠️ Template B video not found in response');
        }

        const downloadedCount = (a ? 1 : 0) + (b ? 1 : 0);
        alert(`Videos generated successfully! Downloaded and saved ${downloadedCount} video(s) to modal.`);
      } else if (result?.success && result?.videoData) {
        // Legacy single video path
        console.log('✅ Video generated successfully!');
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

  // Upload video to Supabase storage
  const uploadVideoToSupabase = async (videoBase64: string, templateType: 'A' | 'B'): Promise<string | null> => {
    try {
      console.log(`📤 Uploading Template ${templateType} video to Supabase...`);
      
      // Convert base64 to blob
      const byteCharacters = atob(videoBase64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'video/mp4' });
      
      // Generate filename
      const tempPillarId = editingItem?.id || crypto.randomUUID();
      const timestamp = Date.now();
      const filename = `template_${templateType.toLowerCase()}_video_${timestamp}.mp4`;
      const storagePath = `content-pillars/${tempPillarId}/${filename}`;
      
      // Upload to Supabase
      const { error: uploadError } = await supabase.storage
        .from('media-files')
        .upload(storagePath, blob, { 
          contentType: 'video/mp4', 
          cacheControl: '3600', 
          upsert: true // Allow overwrite to prevent conflicts
        });
      
      if (uploadError) {
        console.error('📤 Supabase video upload error:', uploadError);
        return null;
      }
      
      // Get public URL
      const { data: { publicUrl: rawUrl } } = supabase.storage
        .from('media-files')
        .getPublicUrl(storagePath);
      
      // Convert to custom domain
      const publicUrl = rawUrl.replace('rrxfvdtubynlsanplbta.supabase.co', 'database.silberarrows.com');
      
      console.log(`✅ Template ${templateType} video uploaded successfully:`, publicUrl);
      return publicUrl;
      
    } catch (error) {
      console.error(`❌ Error uploading Template ${templateType} video:`, error);
      return null;
    }
  };

  // Download image helper
  const downloadImage = (imageBase64: string, templateType: TemplateType) => {
    try {
      const titleForFilename = dayKey === 'wednesday' ? (formData.car_model || 'car') : formData.title;
      const cleanTitle = titleForFilename
        .replace(/[^a-zA-Z0-9\s]/g, '')
        .replace(/\s+/g, '_')
        .toLowerCase();
      
      const filename = `template_${templateType.toLowerCase()}_${cleanTitle}_${Date.now()}.png`;
      
      console.log(`🖼️ Starting download for: ${filename}`);
      console.log(`📊 Image data length: ${imageBase64.length} characters`);
      
      const byteCharacters = atob(imageBase64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'image/png' });
      
      console.log(`📦 Created blob of size: ${blob.size} bytes`);
      
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      link.style.display = 'none';
      document.body.appendChild(link);
      
      console.log(`🔗 Created download link for: ${filename}`);
      link.click();
      console.log(`✅ Clicked download link for: ${filename}`);
      
      // Clean up after a short delay
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
        console.log(`🧹 Cleaned up download link for: ${filename}`);
      }, 1000);
      
    } catch (error) {
      console.error(`❌ Error downloading ${templateType} image:`, error);
    }
  };

  // Download video helper
  const downloadVideo = (videoBase64: string, filename: string) => {
    try {
      console.log(`🎬 Starting download for: ${filename}`);
      console.log(`📊 Video data length: ${videoBase64.length} characters`);
      
      const byteCharacters = atob(videoBase64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'video/mp4' });
      
      console.log(`📦 Created blob of size: ${blob.size} bytes`);
      
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      link.style.display = 'none';
      document.body.appendChild(link);
      
      console.log(`🔗 Created download link for: ${filename}`);
      link.click();
      console.log(`✅ Clicked download link for: ${filename}`);
      
      // Clean up after a short delay
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
        console.log(`🧹 Cleaned up download link for: ${filename}`);
      }, 1000);
      
    } catch (error) {
      console.error(`❌ Error downloading ${filename}:`, error);
    }
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
      
      // Add generated template to the correct template's files
      if (template === 'A') {
        setSelectedFilesA(prev => {
          // Remove any existing template files for this template type
          const filtered = prev.filter(f => !f.file.name.includes(`template_${template.toLowerCase()}`));
          return [...filtered, fileWithThumbnail];
        });
      } else if (template === 'B') {
        setSelectedFilesB(prev => {
          // Remove any existing template files for this template type
          const filtered = prev.filter(f => !f.file.name.includes(`template_${template.toLowerCase()}`));
          return [...filtered, fileWithThumbnail];
        });
      }
      
      console.log(`✅ Template ${template} saved as file: ${filename}`);
    } catch (error) {
      console.error(`❌ Error saving Template ${template} as file:`, error);
    }
  };

  // Save handler - files already uploaded to Supabase
  const handleSave = async () => {
    setSaving(true);
    try {
      // Dedupe helpers
      const dedupeByUrl = (arr: any[]) => {
        const seen = new Set<string>();
        return (arr || []).filter((media) => {
          const url = typeof media === 'string' ? media : media?.url;
          if (!url) return true;
          if (seen.has(url)) return false;
          seen.add(url);
          return true;
        });
      };

      // Prepare separate media arrays with explicit templateType tagging
      const mediaA = dedupeByUrl(existingMediaA).map((m) => ({
        ...m,
        templateType: 'A' // Force Template A
      }));
      const mediaB = dedupeByUrl(existingMediaB).map((m) => ({
        ...m,
        templateType: 'B' // Force Template B
      }));

      // Back-compat merged list (but keep templateType distinction)
      const merged = [...mediaA, ...mediaB];
      
      console.log('💾 Saving media - Template A:', mediaA.length, 'files', mediaA.map(m => m.name));
      console.log('💾 Saving media - Template B:', mediaB.length, 'files', mediaB.map(m => m.name));
      console.log('💾 Merged media total:', merged.length, 'files');
      console.log('💾 existingMediaA state:', existingMediaA.length, existingMediaA.map(m => ({name: m.name, templateType: m.templateType})));
      console.log('💾 existingMediaB state:', existingMediaB.length, existingMediaB.map(m => ({name: m.name, templateType: m.templateType})));

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
        media_files: merged, // Back-compat
        media_files_a: mediaA,
        media_files_b: mediaB,
      };

      console.log('📤 Saving content pillar data:', pillarData);
      await onSave(pillarData);
      onClose();
    } catch (error) {
      console.error('Error saving content pillar:', error);
      alert('Failed to save content pillar. Please try again.');
    } finally {
      setSaving(false);
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
      
      // Load existing media every time modal opens (not just when editingItem changes)
      if (editingItem) {
        console.log('🔄 Loading existing media from editingItem:', editingItem.media_files);
        // Always reload fresh from database to prevent stale state
        const mediaFiles = editingItem.media_files || [];
        const mediaFilesA = editingItem.media_files_a || [];
        const mediaFilesB = editingItem.media_files_b || [];
        // Prefer explicit A/B arrays if present, otherwise split by templateType strictly
        const mediaA: any[] = (Array.isArray(mediaFilesA) && mediaFilesA.length > 0)
          ? mediaFilesA
          : mediaFiles.filter(m => m?.templateType === 'A');
        
        const mediaB: any[] = (Array.isArray(mediaFilesB) && mediaFilesB.length > 0)
          ? mediaFilesB  
          : mediaFiles.filter(m => m?.templateType === 'B');
          
        console.log('🔄 Loading media - mediaFiles total:', mediaFiles.length);
        console.log('🔄 Loading media - split A:', mediaA.length, 'B:', mediaB.length);
        console.log('🔄 Media A items:', mediaA.map(m => ({name: m.name, templateType: m.templateType})));
        console.log('🔄 Media B items:', mediaB.map(m => ({name: m.name, templateType: m.templateType})));
        // Dedupe by URL inside each bucket
        const dedupeByUrl = (arr: any[]) => {
          const seen = new Set();
          return arr.filter((item) => {
            const url = typeof item === 'string' ? item : item?.url;
            if (!url) return true;
            if (seen.has(url)) return false;
            seen.add(url);
            return true;
          });
        };
        setExistingMediaA(dedupeByUrl(mediaA));
        setExistingMediaB(dedupeByUrl(mediaB));
        console.log('✅ Loaded media files:', mediaFiles.length);
      } else {
        // Clear existing media when creating new item
        setExistingMediaA([]);
        setExistingMediaB([]);
      }
    }
  }, [isOpen, dayKey, editingItem]);

  // Clear media arrays when modal closes to prevent stale state
  useEffect(() => {
    if (!isOpen) {
      console.log('🧹 Modal closed - clearing media arrays');
      setExistingMediaA([]);
      setExistingMediaB([]);
      setSelectedFilesA([]);
      setSelectedFilesB([]);
    }
  }, [isOpen]);

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
    }
  }, [editingItem, dayKey]);

  // Update form data when aiGeneratedContent changes (missing from refactored version)
  useEffect(() => {
    if (aiGeneratedContent && !editingItem) {
      setFormData(prev => ({
        ...prev,
        title: aiGeneratedContent.title || '',
        description: aiGeneratedContent.description || '',
        badgeText: aiGeneratedContent.badge_text || getSafeBadgeText(dayKey),
        subtitle: aiGeneratedContent.subtitle || '',
        myth: aiGeneratedContent.myth || '',
        fact: aiGeneratedContent.fact || '',
        problem: aiGeneratedContent.problem || '',
        solution: aiGeneratedContent.solution || '',
        difficulty: aiGeneratedContent.difficulty || '',
        tools_needed: aiGeneratedContent.tools_needed || '',
        warning: aiGeneratedContent.warning || '',
      }));
    }
  }, [aiGeneratedContent, dayKey]);

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
          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={saving || (dayKey === 'wednesday' ? !selectedCarId : !formData.title)}
              className="disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-medium transition-all border border-gray-600/40 flex items-center gap-2"
              style={{
                background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.8) 0%, rgba(22, 163, 74, 0.6) 50%, rgba(34, 197, 94, 0.8) 100%)',
                backdropFilter: 'blur(10px)',
                boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
              }}
              onMouseEnter={(e) => {
                if (!saving) e.currentTarget.style.background = 'linear-gradient(135deg, rgba(34, 197, 94, 0.9) 0%, rgba(22, 163, 74, 0.7) 50%, rgba(34, 197, 94, 0.9) 100%)';
              }}
              onMouseLeave={(e) => {
                if (!saving) e.currentTarget.style.background = 'linear-gradient(135deg, rgba(34, 197, 94, 0.8) 0%, rgba(22, 163, 74, 0.6) 50%, rgba(34, 197, 94, 0.8) 100%)';
              }}
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                'Save'
              )}
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors border border-gray-600/30"
            >
              <X className="w-5 h-5 text-gray-400 hover:text-white" />
            </button>
          </div>
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

            {/* Title Font Size Slider */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Title Font Size: {formData.titleFontSize}px
              </label>
              <input
                type="range"
                min="24"
                max="120"
                value={formData.titleFontSize}
                onChange={(e) => setFormData(prev => ({ ...prev, titleFontSize: parseInt(e.target.value) }))}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                style={{
                  background: `linear-gradient(to right, #8b5cf6 0%, #8b5cf6 ${((formData.titleFontSize - 24) / (120 - 24)) * 100}%, #374151 ${((formData.titleFontSize - 24) / (120 - 24)) * 100}%, #374151 100%)`
                }}
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>24px</span>
                <span>120px</span>
              </div>
            </div>

            {/* Image Size Slider */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Image Size: {formData.imageZoom}%
              </label>
              <input
                type="range"
                min="50"
                max="200"
                value={formData.imageZoom}
                onChange={(e) => setFormData(prev => ({ ...prev, imageZoom: parseInt(e.target.value) }))}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                style={{
                  background: `linear-gradient(to right, #10b981 0%, #10b981 ${((formData.imageZoom - 50) / (200 - 50)) * 100}%, #374151 ${((formData.imageZoom - 50) / (200 - 50)) * 100}%, #374151 100%)`
                }}
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>50%</span>
                <span>200%</span>
              </div>
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
                  
                  {selectedFilesA
                    // Hide selected files that have been uploaded and already exist in existingMediaA (match by name+size if possible)
                    .filter((fileInfo) => {
                      const match = existingMediaA.some((m) => {
                        const mName = (m?.name || '').toString();
                        const mSize = Number(m?.size || 0);
                        return mName === fileInfo.file.name && mSize === fileInfo.file.size;
                      });
                      return !match;
                    })
                    .map((fileInfo, index) => (
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
                    
                    {selectedFilesB
                      .filter((fileInfo) => {
                        const match = existingMediaB.some((m) => {
                          const mName = (m?.name || '').toString();
                          const mSize = Number(m?.size || 0);
                          return mName === fileInfo.file.name && mSize === fileInfo.file.size;
                        });
                        return !match;
                      })
                      .map((fileInfo, index) => (
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
