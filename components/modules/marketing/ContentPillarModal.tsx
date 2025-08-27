'use client';

import React, { useState, useEffect, useRef } from 'react';
import { FileText, Video, Image as ImageIcon, Sparkles, Upload, X, Download, Eye } from 'lucide-react';

// Define the content pillar item type (matching the main component)
interface ContentPillarItem {
  id: string;
  title: string;
  description?: string;
  content_type: 'image' | 'video' | 'text' | 'carousel';
  day_of_week: string;
  media_files?: any[];
  created_at: string;
  updated_at: string;
  badge_text?: string;
  subtitle?: string;
  myth?: string;
  fact?: string;
  problem?: string;
  solution?: string;
  difficulty?: string;
  tools_needed?: string;
  warning?: string;
}

// File handling types
interface FileWithThumbnail {
  file: File;
  thumbnail: string;
  uploadProgress: number;
  uploading: boolean;
  uploaded: boolean;
  error?: string;
}

// Car inventory types
interface InventoryCar {
  id: string;
  stock_number: string;
  model_year: number;
  vehicle_model: string;
  colour: string;
  interior_colour: string | null;
  chassis_number: string;
  advertised_price_aed: number;
  current_mileage_km: number | null;
  engine: string | null;
  transmission: string | null;
  horsepower_hp: number | null;
  key_equipment: string | null;
  description: string | null;
  car_media: {
    url: string;
    kind: string;
    sort_order: number;
  }[];
}

interface ContentPillarModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: Partial<ContentPillarItem>) => void;
  onDelete?: () => void;
  dayKey: string;
  dayTitle: string;
  isEditing?: boolean;
  editingItem?: ContentPillarItem | null;
  onRegenerate?: (contentType: 'image' | 'video' | 'text' | 'carousel') => void;
  aiGeneratedContent?: {
    title: string;
    description: string;
    content_type: 'image' | 'video' | 'text' | 'carousel';
    badge_text?: string;
    subtitle?: string;
    myth?: string;
    fact?: string;
    problem?: string;
    solution?: string;
    difficulty?: string;
    tools_needed?: string;
    warning?: string;
  };
  generatedImageBase64?: string | null;
  onGeneratedImageChange?: (imageBase64: string | null) => void;
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

export default function ContentPillarModal({ 
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
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<FileWithThumbnail[]>([]);
  const [existingMedia, setExistingMedia] = useState<any[]>(editingItem?.media_files || []);
  const [generatingTemplate, setGeneratingTemplate] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<'A' | 'B'>('A');
  const [inventoryCars, setInventoryCars] = useState<InventoryCar[]>([]);
  const [selectedCarId, setSelectedCarId] = useState<string>('');
  const [loadingCars, setLoadingCars] = useState(false);
  const [formData, setFormData] = useState({
    title: editingItem?.title || aiGeneratedContent?.title || '',
    description: editingItem?.description || aiGeneratedContent?.description || '',
    content_type: editingItem?.content_type || aiGeneratedContent?.content_type || 'image' as const,
    badgeText: editingItem?.badge_text || aiGeneratedContent?.badge_text || (dayKey === 'monday' ? 'MYTH BUSTER MONDAY' : dayKey.toUpperCase()),
    subtitle: editingItem?.subtitle || aiGeneratedContent?.subtitle || (dayKey === 'monday' ? 'Independent Mercedes Service' : 'Premium Selection'),
    myth: editingItem?.myth ?? aiGeneratedContent?.myth ?? '',
    fact: editingItem?.fact ?? aiGeneratedContent?.fact ?? '',
    problem: editingItem?.problem ?? aiGeneratedContent?.problem ?? '',
    solution: editingItem?.solution ?? aiGeneratedContent?.solution ?? '',
    difficulty: editingItem?.difficulty ?? aiGeneratedContent?.difficulty ?? '',
    tools_needed: editingItem?.tools_needed ?? aiGeneratedContent?.tools_needed ?? '',
    warning: editingItem?.warning ?? aiGeneratedContent?.warning ?? '',
    imageAlignment: 'center' as 'left' | 'center' | 'right',
    imageFit: 'cover' as 'cover' | 'contain' | 'fill',
    imageZoom: 100,
    imageVerticalPosition: 0,
    // Car-specific fields for Wednesday spotlight
    car_make: '',
    car_model: '',
    car_year: '',
    car_trim: '',
    car_mileage: '',
    car_horsepower: '',
    car_exterior_color: '',
    car_interior_color: '',
    car_engine: '',
    car_transmission: '',
    car_color: '',
    car_fuel_type: '',
    car_price: '',
    feature_1: '',
    feature_2: '',
    feature_3: '',
    feature_4: '',
    key_equipment: '',
  });

  // Create refs for both template preview iframes
  const iframeRefA = useRef<HTMLIFrameElement>(null);
  const iframeRefB = useRef<HTMLIFrameElement>(null);

  // Update form data when editingItem or aiGeneratedContent changes
  useEffect(() => {
    setFormData({
      title: editingItem?.title || aiGeneratedContent?.title || '',
      description: editingItem?.description || aiGeneratedContent?.description || '',
      content_type: editingItem?.content_type || aiGeneratedContent?.content_type || 'image' as const,
      badgeText: editingItem?.badge_text || aiGeneratedContent?.badge_text || (dayKey === 'monday' ? 'MYTH BUSTER MONDAY' : dayKey.toUpperCase()),
      subtitle: editingItem?.subtitle || aiGeneratedContent?.subtitle || (dayKey === 'monday' ? 'Independent Mercedes Service' : 'Premium Selection'),
      myth: editingItem?.myth ?? aiGeneratedContent?.myth ?? '',
      fact: editingItem?.fact ?? aiGeneratedContent?.fact ?? '',
      problem: editingItem?.problem ?? aiGeneratedContent?.problem ?? '',
      solution: editingItem?.solution ?? aiGeneratedContent?.solution ?? '',
      difficulty: editingItem?.difficulty ?? aiGeneratedContent?.difficulty ?? '',
      tools_needed: editingItem?.tools_needed ?? aiGeneratedContent?.tools_needed ?? '',
      warning: editingItem?.warning ?? aiGeneratedContent?.warning ?? '',
      imageAlignment: 'center' as 'left' | 'center' | 'right',
      imageFit: 'cover' as 'cover' | 'contain' | 'fill',
      imageZoom: 100,
      imageVerticalPosition: 0,
      // Car-specific fields for Wednesday spotlight
      car_make: '',
      car_model: '',
      car_year: '',
      car_trim: '',
      car_mileage: '',
      car_horsepower: '',
      car_exterior_color: '',
      car_interior_color: '',
      car_engine: '',
      car_transmission: '',
      car_color: '',
      car_fuel_type: '',
      car_price: '',
      feature_1: '',
      feature_2: '',
      feature_3: '',
      feature_4: '',
      key_equipment: '',
    });
    setExistingMedia(editingItem?.media_files || []);
    setSelectedFiles([]);
  }, [editingItem, aiGeneratedContent]);

  // Fetch inventory cars for Wednesday spotlight
  useEffect(() => {
    if (dayKey === 'wednesday' && isOpen) {
      fetchInventoryCars();
    }
  }, [dayKey, isOpen]);

  const fetchInventoryCars = async () => {
    setLoadingCars(true);
    try {
      const response = await fetch('/api/inventory-cars');
      const data = await response.json();
      
      if (data.success) {
        setInventoryCars(data.cars);
      } else {
        console.error('Failed to fetch inventory cars:', data.error);
      }
    } catch (error) {
      console.error('Error fetching inventory cars:', error);
    } finally {
      setLoadingCars(false);
    }
  };

  const handleCarSelection = (carId: string) => {
    setSelectedCarId(carId);
    const selectedCar = inventoryCars.find(car => car.id === carId);
    
    if (selectedCar) {
      // Auto-populate form fields with car data
      setFormData(prev => ({
        ...prev,
        title: selectedCar.vehicle_model,
        description: selectedCar.description || `Premium ${selectedCar.model_year} ${selectedCar.vehicle_model} in excellent condition`,
        car_make: selectedCar.vehicle_model.split(' ')[0] || 'Mercedes-Benz',
        car_model: selectedCar.vehicle_model,
        car_year: selectedCar.model_year.toString(),
        car_trim: 'Premium', // Default value, can be customized
        car_mileage: selectedCar.current_mileage_km?.toString() || '0',
        car_horsepower: selectedCar.horsepower_hp?.toString() || '300',
        car_exterior_color: selectedCar.colour,
        car_interior_color: selectedCar.interior_colour || 'Black',
        car_engine: selectedCar.engine || '3.0L V6 Turbo',
        car_transmission: selectedCar.transmission || '9G-TRONIC Automatic',
        car_price: `AED ${selectedCar.advertised_price_aed.toLocaleString()}`,
        key_equipment: selectedCar.key_equipment || 'Premium Interior Package, Advanced Driver Assistance, Panoramic Sunroof, AMG Styling Package, Leather Seats, Navigation System, Bluetooth Connectivity, Cruise Control, Parking Sensors, Automatic Climate Control, Keyless Entry, Power Windows, Electric Mirrors, Heated Seats, Premium Sound System'
      }));

      // Auto-populate second social media image if available
      if (selectedCar.car_media && selectedCar.car_media.length > 0) {
        const socialMediaImage = selectedCar.car_media.find(media => media.sort_order === 2) || 
                                selectedCar.car_media.sort((a, b) => a.sort_order - b.sort_order)[1] ||
                                selectedCar.car_media.sort((a, b) => a.sort_order - b.sort_order)[0];
        
        // Create a file-like object from the URL for the preview
        fetch(socialMediaImage.url)
          .then(response => response.blob())
          .then(blob => {
            const file = new File([blob], `${selectedCar.vehicle_model}_social_media.jpg`, { type: 'image/jpeg' });
            const fileWithThumbnail: FileWithThumbnail = {
              file: file,
              thumbnail: socialMediaImage.url,
              uploadProgress: 100,
              uploading: false,
              uploaded: true,
              error: undefined
            };
            setSelectedFiles([fileWithThumbnail]);
          })
          .catch(error => {
            console.error('Error loading social media image:', error);
          });
      }
    }
  };

  // Compress base64 image to reduce payload size
  const compressBase64Image = async (base64: string, quality: number = 0.7, maxWidth: number = 800): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }
        
        // Calculate new dimensions while maintaining aspect ratio
        let { width, height } = img;
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height);
        const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedBase64);
      };
      
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = base64;
    });
  };

  // Generate thumbnail for uploaded files
  const generateThumbnail = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      } else if (file.type.startsWith('video/')) {
        const video = document.createElement('video');
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        video.onloadedmetadata = () => {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          video.currentTime = 1; // Seek to 1 second
        };
        
        video.onseeked = () => {
          ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL());
          URL.revokeObjectURL(video.src);
        };
        
        video.onerror = () => reject(new Error('Video thumbnail generation failed'));
        video.src = URL.createObjectURL(file);
      } else {
        resolve(''); // No thumbnail for other file types
      }
    });
  };

  // Handle file selection
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      const filesWithThumbnails: FileWithThumbnail[] = [];

      for (const file of files) {
        try {
          const thumbnail = await generateThumbnail(file);
          filesWithThumbnails.push({
            file,
            thumbnail,
            uploadProgress: 0,
            uploading: false,
            uploaded: false
          });
        } catch (error) {
          console.error('Error generating thumbnail:', error);
          filesWithThumbnails.push({
            file,
            thumbnail: '',
            uploadProgress: 0,
            uploading: false,
            uploaded: false
          });
        }
      }

      setSelectedFiles(prev => [...prev, ...filesWithThumbnails]);
    }
  };

  // Remove selected file
  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Remove existing media file
  const removeExistingMedia = async (indexToRemove: number) => {
    const mediaToRemove = existingMedia[indexToRemove];
    if (!mediaToRemove) return;

    try {
      // Remove from local state immediately for better UX
      setExistingMedia(prev => prev.filter((_, index) => index !== indexToRemove));

      // If we have an editingItem, we should update it to remove this media
      if (editingItem && onSave) {
        const updatedMediaFiles = existingMedia.filter((_, index) => index !== indexToRemove);
        const updatedItem = {
          ...editingItem,
          media_files: updatedMediaFiles
        };
        
        // Save the updated item
        await onSave(updatedItem);
      }
    } catch (error) {
      console.error('Error removing media:', error);
      // Restore the media item if there was an error
      setExistingMedia(prev => [...prev.slice(0, indexToRemove), mediaToRemove, ...prev.slice(indexToRemove)]);
    }
  };

  // Get file type icon
  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) {
      return <ImageIcon className="w-4 h-4 text-white/60" />;
    } else if (file.type.startsWith('video/')) {
      return <Video className="w-4 h-4 text-white/60" />;
    } else {
      return <FileText className="w-4 h-4 text-white/60" />;
    }
  };

  // Generate template image using live preview HTML
  const generateTemplateImage = async () => {
    // For Wednesday, check car selection instead of title/description
    if (dayKey === 'wednesday') {
      if (!formData.car_model || !dayKey) {
        alert('Please select a car from inventory first');
        return;
      }
    } else {
    if (!formData.title || !formData.description || !dayKey) {
      alert('Please fill in title and description first');
      return;
      }
    }

    setGeneratingTemplate(true);
    
    try {
      console.log('🎨 Generating images for both templates...');
      
      // Generate both Template A and Template B
      const templates = ['A', 'B'] as const;
      const generatedImages: { template: string; imageBase64: string }[] = [];
      
      for (const template of templates) {
        console.log(`📄 Generating Template ${template}...`);
        
        // Generate HTML for this template
        const htmlContent = generateLivePreviewHTML(template);
        console.log(`📄 Generated HTML for Template ${template}, length:`, htmlContent.length);

      const response = await fetch('/api/generate-content-pillar-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          html: htmlContent,
          dayOfWeek: dayKey
        })
      });

      if (!response.ok) {
          throw new Error(`Failed to generate Template ${template} image`);
      }

      const result = await response.json();
      
      if (!result.success) {
          throw new Error(result.error || `Failed to generate Template ${template}`);
        }
        
        generatedImages.push({
          template,
          imageBase64: result.imageBase64
        });
        
        console.log(`✅ Template ${template} image generated successfully`);
      }
      
      // Save and download both images
      for (const { template, imageBase64 } of generatedImages) {
        await saveGeneratedImageAsFile(imageBase64, template);
        downloadGeneratedImage(imageBase64, template);
      }
      
      console.log('✅ Both template images generated, saved to files, and downloaded successfully');
      
    } catch (error) {
      console.error('❌ Error generating template:', error);
      alert('Failed to generate template images. Please try again.');
    } finally {
      setGeneratingTemplate(false);
    }
  };

  // Save generated image as a file in the task
  const saveGeneratedImageAsFile = async (imageBase64: string, template?: string) => {
    try {
      // Convert base64 to blob
      const response = await fetch(`data:image/png;base64,${imageBase64}`);
      const blob = await response.blob();
      
      // Create a File object
      const templateSuffix = template ? `_template_${template}` : '';
      const fileName = `template_${formData.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${dayKey}${templateSuffix}_${Date.now()}.png`;
      const file = new File([blob], fileName, { type: 'image/png' });
      
      // Generate thumbnail for the file
      const thumbnail = await generateThumbnail(file);
      
      // Replace all existing files with the generated image
      const fileWithThumbnail: FileWithThumbnail = {
        file,
        thumbnail,
        uploadProgress: 100,
        uploading: false,
        uploaded: true
      };
      
      // Add the generated image to existing files (don't replace)
      setSelectedFiles(prev => [...prev, fileWithThumbnail]);
      
      console.log('✅ Generated image added to task files alongside existing media');
    } catch (error) {
      console.error('❌ Error saving generated image as file:', error);
    }
  };

  // Generate live preview HTML (client-side template rendering)
  const generateLivePreviewHTML = (templateType: 'A' | 'B' = 'A') => {
    // Filter out generated template images from preview (only use uploaded images)
    const uploadedFiles = selectedFiles.filter(file => !file.file.name.includes('template_'));
    const imageUrl = uploadedFiles[0]?.thumbnail || 
                    existingMedia[0]?.url || 
                    'https://res.cloudinary.com/dw0ciqgwd/image/upload/v1748497977/qgdbuhm5lpnxuggmltts.png';

    // Force refresh timestamp
    const timestamp = Date.now();

    // Get the template based on day and template type
    const templatesA = {
      monday: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=1080, height=1920, initial-scale=1.0" />
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
          <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
        </head>
        <body>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; -webkit-font-smoothing: antialiased; }
          body { font-family: 'Inter', sans-serif; background: #000000; color: #ffffff; height: 100vh; overflow: hidden; margin: 0; padding: 0; width: 1080px; }
          .content-card { display: flex; flex-direction: column; width: 100%; height: 100vh; }
          .image-section { position: relative; width: 100%; height: 75%; }
          .background-image { width: 100%; height: 100%; object-fit: ${formData.imageFit || 'cover'}; object-position: ${formData.imageAlignment || 'center'}; }
          .badge-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; }
          .badge { background: linear-gradient(135deg, #f8fafc, #e2e8f0, #cbd5e1); color: #000; padding: 16px 32px; border-radius: 25px; font-weight: 900; font-size: 24px; text-transform: uppercase; letter-spacing: 0.8px; white-space: nowrap; display: inline-flex; align-items: center; box-shadow: 0 6px 20px rgba(255,255,255,0.1); border: 2px solid rgba(255,255,255,0.2); }
          .content { padding: 40px; height: 25%; display: flex; flex-direction: column; justify-content: flex-start; gap: 16px; overflow: visible; }
          .title { font-size: 68px; font-weight: 900; color: #ffffff; line-height: 1.1; text-shadow: 0 2px 4px rgba(0,0,0,0.3); margin-bottom: 12px; }
          .subtitle { font-size: 42px; color: #f1f5f9; margin-bottom: 16px; font-weight: 600; text-shadow: 0 2px 4px rgba(0,0,0,0.2); }
          .description { font-size: 36px; color: #f1f5f9; line-height: 1.5; text-align: left; margin: 16px 0; max-width: 96%; text-shadow: 0 1px 2px rgba(0,0,0,0.2); font-weight: 500; }
          .company-logo-inline { height: 96px; width: auto; filter: brightness(1.3) drop-shadow(0 2px 4px rgba(0,0,0,0.3)); margin-top: 4px; flex-shrink: 0; }
          
          .content-container {
            margin-bottom: 24px;
          }
          
          .arrow-indicator {
            position: fixed;
            left: 40px;
            right: 40px;
            bottom: 20px;
            z-index: 5;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 16px;
            background: rgba(255,255,255,0.15);
            border: 2px solid rgba(255,255,255,0.3);
            padding: 24px 32px;
            border-radius: 20px;
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            font-weight: 800;
            font-size: 32px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.2);
          }
          
          .arrow-indicator i {
            color: #ffffff;
            font-size: 26px;
          }
          
          .arrow-text {
            color: #ffffff;
            font-weight: 800;
            font-size: 32px;
          }
        </style>

        <div class="content-card">
          <div class="image-section">
            <img src="${imageUrl}" class="background-image" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src='https://images.unsplash.com/photo-1619767886558-efdc259cde1f?auto=format&fit=crop&w=1080&h=720&q=80';" />
          </div>
          
          <div class="content">
            <div class="badge-row">
              <div class="badge"><i class="fas fa-exclamation-triangle" style="margin-right:6px;"></i> ${formData.badgeText || 'MYTH BUSTER MONDAY'}</div>
              <img src="https://res.cloudinary.com/dw0ciqgwd/image/upload/v1748497977/qgdbuhm5lpnxuggmltts.png" alt="SilberArrows Logo" class="company-logo-inline" referrerpolicy="no-referrer" onerror="this.onerror=null;this.style.display='none';" />
            </div>
            
            <div class="content-container">
            <div>
              <h1 class="title">${formData.title || 'Your Title Here'}</h1>
                </div>
            </div>
          </div>
              
          <!-- Arrow indicator positioned like contact box -->
          <div class="arrow-indicator">
            <i class="fas fa-arrow-right"></i>
            <span class="arrow-text">More Details</span>
          </div>
        </div>
        </body>
        </html>`,
      
      tuesday: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=1080, height=1920, initial-scale=1.0" />
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
          <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
        </head>
        <body>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; -webkit-font-smoothing: antialiased; }
          body { font-family: 'Inter', sans-serif; background: #000000; color: #ffffff; height: 100vh; overflow: hidden; margin: 0; padding: 0; width: 1080px; }
          .content-card { display: flex; flex-direction: column; width: 100%; height: 100vh; }
          .image-section { position: relative; width: 100%; height: 75%; }
          .background-image { width: 100%; height: 100%; object-fit: ${formData.imageFit || 'cover'}; object-position: ${formData.imageAlignment || 'center'}; }
          .badge-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; }
          .badge { background: linear-gradient(135deg, #f8fafc, #e2e8f0, #cbd5e1); color: #000; padding: 16px 32px; border-radius: 25px; font-weight: 900; font-size: 24px; text-transform: uppercase; letter-spacing: 0.8px; white-space: nowrap; display: inline-flex; align-items: center; box-shadow: 0 6px 20px rgba(255,255,255,0.1); border: 2px solid rgba(255,255,255,0.2); }
          .content { padding: 40px; height: 25%; display: flex; flex-direction: column; justify-content: flex-start; gap: 16px; overflow: visible; }
          .title { font-size: 68px; font-weight: 900; color: #ffffff; line-height: 1.1; text-shadow: 0 2px 4px rgba(0,0,0,0.3); margin-bottom: 12px; }
          .subtitle { font-size: 42px; color: #f1f5f9; margin-bottom: 16px; font-weight: 600; text-shadow: 0 2px 4px rgba(0,0,0,0.2); }
          .description { font-size: 36px; color: #f1f5f9; line-height: 1.5; text-align: left; margin: 16px 0; max-width: 96%; text-shadow: 0 1px 2px rgba(0,0,0,0.2); font-weight: 500; }
          .company-logo-inline { height: 96px; width: auto; filter: brightness(1.3) drop-shadow(0 2px 4px rgba(0,0,0,0.3)); margin-top: 4px; flex-shrink: 0; }
          
          .tech-grid { 
            display: grid; 
            grid-template-columns: 1fr 1fr; 
            gap: 20px; 
            margin: 24px 0; 
          }
          
          .tech-section {
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.15);
            border-radius: 16px;
            padding: 32px;
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
          }
          
          .section-header {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 16px;
          }
          
          .section-header i {
            font-size: 41px;
            color: #e2e8f0;
            background: linear-gradient(135deg, #f8fafc, #cbd5e1);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
          }
          
          .section-title {
            font-size: 41px;
            font-weight: 700;
            color: #f1f5f9;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          
          .section-content {
            font-size: 37px;
            color: #e2e8f0;
            line-height: 1.4;
          }
          
          .info-card {
            text-align: center;
            padding: 12px;
          }
          
          .info-icon {
            font-size: 37px;
            margin-bottom: 8px;
            color: #cbd5e1;
          }
          
          .info-label {
            font-size: 23px;
            color: #cbd5e1;
            margin-bottom: 6px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          
          .info-value {
            font-size: 32px;
            color: #f8fafc;
            font-weight: 700;
          }
          
          .warning-section {
            background: rgba(255, 100, 100, 0.1);
            border: 1px solid rgba(255, 150, 150, 0.3);
            border-radius: 16px;
            padding: 32px;
            margin: 24px 0;
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
          }
          
          .warning-header {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 16px;
          }
          
          .warning-header i {
            font-size: 32px;
            color: #ff6b6b;
          }
          
          .warning-title {
            font-size: 32px;
            font-weight: 700;
            color: #ff6b6b;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          
          .warning-content {
            font-size: 32px;
            color: #ffebeb;
            line-height: 1.4;
          }
          
          .content-container {
            margin-bottom: 24px;
          }
          
          .arrow-indicator {
            position: fixed;
            left: 40px;
            right: 40px;
            bottom: 20px;
            z-index: 5;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 16px;
            background: rgba(255,255,255,0.15);
            border: 2px solid rgba(255,255,255,0.3);
            padding: 24px 32px;
            border-radius: 20px;
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            font-weight: 800;
            font-size: 32px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.2);
          }
          
          .arrow-indicator i {
            color: #ffffff;
            font-size: 26px;
          }
          
          .arrow-text {
            color: #ffffff;
            font-weight: 800;
            font-size: 32px;
          }
        </style>

        <div class="content-card">
          <div class="image-section">
            <img src="${imageUrl}" class="background-image" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src='https://images.unsplash.com/photo-1619767886558-efdc259cde1f?auto=format&fit=crop&w=1080&h=720&q=80';" />
          </div>
          
          <div class="content">
            <div class="badge-row">
              <div class="badge"><i class="fas fa-lightbulb" style="margin-right:6px;"></i> ${formData.badgeText || 'TECH TIPS TUESDAY'}</div>
              <img src="https://res.cloudinary.com/dw0ciqgwd/image/upload/v1748497977/qgdbuhm5lpnxuggmltts.png" alt="SilberArrows Logo" class="company-logo-inline" referrerpolicy="no-referrer" onerror="this.onerror=null;this.style.display='none';" />
            </div>
            
                        <div class="content-container">
              <div>
            <h1 class="title">${formData.title || 'Your Title Here'}</h1>
              </div>
            </div>
          </div>
              
          <!-- Arrow indicator positioned like contact box -->
          <div class="arrow-indicator">
            <i class="fas fa-arrow-right"></i>
            <span class="arrow-text">More Details</span>
          </div>
        </div>
        </body>
        </html>`,
      
      // Add more days with simplified templates

      
      // Simplified templates for other days
      thursday: `<style>* { margin: 0; padding: 0; box-sizing: border-box; } body { font-family: 'Inter', sans-serif; background: linear-gradient(135deg, #7c2d12, #ea580c); color: #ffffff; height: 100vh; display: flex; align-items: center; justify-content: center; text-align: center; } .content { padding: 40px; } .badge { background: rgba(255,255,255,0.2); padding: 10px 20px; border-radius: 20px; margin-bottom: 20px; } .title { font-size: 3rem; font-weight: 700; margin-bottom: 15px; } .description { font-size: 1.2rem; margin-bottom: 25px; } .testimonial { background: rgba(255,255,255,0.15); padding: 25px; border-radius: 15px; margin-bottom: 20px; } .stars { color: #fbbf24; font-size: 1.5rem; margin-bottom: 10px; }</style><div class="content"><div class="badge">💬 CUSTOMER STORIES</div><h1 class="title">${formData.title || 'Your Title Here'}</h1><p class="description">${formData.description || 'Your description will appear here...'}</p><div class="testimonial"><div class="stars">⭐⭐⭐⭐⭐</div><p>"Exceptional service and premium quality!"</p></div><div>📞 +971 4 380 5515</div></div>`,
      
      friday: `<style>* { margin: 0; padding: 0; box-sizing: border-box; } body { font-family: 'Inter', sans-serif; background: linear-gradient(135deg, #7c3aed, #a855f7); color: #ffffff; height: 100vh; display: flex; align-items: center; justify-content: center; text-align: center; } .content { padding: 40px; } .badge { background: linear-gradient(135deg, #fbbf24, #f59e0b); padding: 12px 25px; border-radius: 25px; margin-bottom: 20px; } .title { font-size: 3rem; font-weight: 700; margin-bottom: 15px; } .description { font-size: 1.2rem; margin-bottom: 25px; } .features { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 25px; } .feature { background: rgba(255,255,255,0.15); padding: 20px; border-radius: 12px; }</style><div class="content"><div class="badge">🎉 FRIDAY CELEBRATION</div><h1 class="title">${formData.title || 'Your Title Here'}</h1><p class="description">${formData.description || 'Your description will appear here...'}</p><div class="features"><div class="feature">🏆<br>Achievement</div><div class="feature">⭐<br>Excellence</div><div class="feature">🚀<br>Success</div></div><div>📞 +971 4 380 5515</div></div>`,
      
      saturday: `<style>* { margin: 0; padding: 0; box-sizing: border-box; } body { font-family: 'Inter', sans-serif; background: linear-gradient(135deg, #0891b2, #06b6d4); color: #ffffff; height: 100vh; display: flex; align-items: center; justify-content: center; text-align: center; } .content { padding: 40px; } .badge { background: rgba(255,255,255,0.2); padding: 12px 25px; border-radius: 25px; margin-bottom: 20px; } .title { font-size: 3rem; font-weight: 700; margin-bottom: 15px; } .description { font-size: 1.2rem; margin-bottom: 25px; } .features { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-bottom: 25px; } .feature { background: rgba(255,255,255,0.15); padding: 25px; border-radius: 12px; }</style><div class="content"><div class="badge">☀️ WEEKEND LIFESTYLE</div><h1 class="title">${formData.title || 'Your Title Here'}</h1><p class="description">${formData.description || 'Your description will appear here...'}</p><div class="features"><div class="feature">❤️<br>Passion</div><div class="feature">👥<br>Community</div></div><div>📞 +971 4 380 5515</div></div>`,
      
      wednesday: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=1080, height=1920, initial-scale=1.0" />
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
          <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
        </head>
        <body>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; -webkit-font-smoothing: antialiased; }
          body { font-family: 'Inter', sans-serif; background: #D5D5D5; color: #ffffff; height: 100vh; overflow: hidden; margin: 0; padding: 0; width: 1080px; }
          .content-card { display: flex; flex-direction: column; width: 100%; height: 100vh; }
          .image-section { position: relative; width: 100%; height: 100%; overflow: hidden; }
          .background-image { width: 100%; height: 100%; object-fit: ${formData.imageFit || 'cover'}; object-position: ${formData.imageAlignment || 'center'}; transform: scale(${(formData.imageZoom || 100) / 100}) translateY(${formData.imageVerticalPosition || 0}px); }
          .badge-row { display: flex; align-items: center; justify-content: center; margin-bottom: 24px; gap: 20px; }
          .badge { background: linear-gradient(135deg, #f8fafc, #e2e8f0, #cbd5e1); color: #000; padding: 16px 32px; border-radius: 25px; font-weight: 900; font-size: 24px; text-transform: uppercase; letter-spacing: 0.8px; white-space: nowrap; display: inline-flex; align-items: center; box-shadow: 0 6px 20px rgba(255,255,255,0.1); border: 2px solid rgba(255,255,255,0.2); }
          .content { padding: 40px; height: 100%; display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 16px; overflow: visible; position: absolute; top: 2%; left: 0; right: 0; z-index: 10; text-align: center; }
          .title { font-size: 68px; font-weight: 950; color: #6a6a6a; line-height: 1.1; text-shadow: 1px 1px 2px rgba(0,0,0,0.3); margin-bottom: 12px; font-stretch: ultra-condensed; -webkit-text-stroke: 1px #4a4a4a; text-stroke: 1px #4a4a4a; font-style: italic; padding: 0 80px; }
          .subtitle { font-size: 42px; color: #6a6a6a; margin-bottom: 16px; font-weight: 800; text-shadow: none; font-style: italic; }
          .company-logo-inline { height: 96px; width: auto; filter: brightness(1.3) drop-shadow(0 2px 4px rgba(0,0,0,0.3)); margin-top: 4px; flex-shrink: 0; }
          .contact { position: fixed; left: 40px; right: 40px; bottom: 20px; z-index: 5; display: flex; align-items: center; justify-content: center; gap: 16px; background: rgba(0,0,0,0.15); border: 2px solid rgba(0,0,0,0.3); padding: 24px 32px; border-radius: 20px; backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); font-weight: 800; font-size: 28px; box-shadow: 0 8px 32px rgba(0,0,0,0.2); color: #000000; }
          .contact i { color: #000000; font-size: 26px; }
          
          /* Car spotlight specific styles */
          .car-specs-grid { 
            display: grid; 
            grid-template-columns: 1fr 1fr; 
            gap: 16px; 
            margin: 16px 0; 
          }
          
          .spec-card {
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.15);
            border-radius: 16px;
            padding: 24px;
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
            text-align: center;
          }
          
          .spec-icon {
            font-size: 32px;
            margin-bottom: 12px;
            color: #e2e8f0;
            background: linear-gradient(135deg, #f8fafc, #cbd5e1);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
          }
          
          .spec-label {
            font-size: 20px;
            color: #333333;
            margin-bottom: 6px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          
          .spec-value {
            font-size: 28px;
            color: #000000;
            font-weight: 700;
          }
          
          .car-price {
            text-align: center;
            background: linear-gradient(135deg, rgba(255,215,0,0.15), rgba(255,140,0,0.15));
            border: 1px solid rgba(255, 215, 0, 0.3);
            border-radius: 16px;
            padding: 24px;
            margin: 20px 0;
          }
          
          .price-label {
            font-size: 24px;
            color: #ffd700;
            margin-bottom: 6px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          
          .price-value {
            font-size: 46px;
            color: #ffd700;
            font-weight: 900;
            text-shadow: 0 2px 4px rgba(0,0,0,0.3);
          }
          
          .spotlight-badge {
            position: absolute;
            top: 30px;
            right: 30px;
            background: linear-gradient(135deg, #ffd700, #ff8c00);
            color: #000;
            padding: 16px 32px;
            border-radius: 25px;
            font-weight: 900;
            font-size: 28px;
            text-transform: uppercase;
            letter-spacing: 1px;
            box-shadow: 0 6px 20px rgba(0,0,0,0.3);
            border: 2px solid rgba(255,255,255,0.3);
            z-index: 10;
          }
          
          .arrow-indicator { 
            position: fixed; 
            left: 32px; 
            right: 32px; 
            bottom: 20px; 
            z-index: 5; 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            gap: 16px; 
            background: rgba(255,255,255,0.15); 
            border: 2px solid rgba(255,255,255,0.3); 
            padding: 24px 32px; 
            border-radius: 20px; 
            backdrop-filter: blur(20px); 
            -webkit-backdrop-filter: blur(20px); 
            font-weight: 800; 
            font-size: 32px; 
            box-shadow: 0 8px 32px rgba(0,0,0,0.2); 
          }
          .arrow-indicator i { 
            color: #ffffff; 
            font-size: 32px; 
          }
          .arrow-text { 
            color: #ffffff; 
          }
        </style>

        <div class="content-card">
          <div class="image-section">
            <img src="${imageUrl}" class="background-image" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src='https://images.unsplash.com/photo-1542362567-b07e54358753?auto=format&fit=crop&w=1080&h=768&q=80';" />
            <div class="spotlight-badge"><i class="fas fa-star" style="margin-right:8px;"></i> SPOTLIGHT OF THE WEEK</div>
          </div>
          
          <div class="content">
            <div>
              <h1 class="title">${formData.car_model || formData.title}</h1>
              <div class="subtitle">${formData.car_year || '2023'} • Premium Selection</div>
            </div>
          </div>
        </div>
        </body>
        </html>
      `,
      
      sunday: `<style>* { margin: 0; padding: 0; box-sizing: border-box; } body { font-family: 'Inter', sans-serif; background: linear-gradient(135deg, #581c87, #7c3aed); color: #ffffff; height: 100vh; display: flex; align-items: center; justify-content: center; text-align: center; } .content { padding: 40px; } .badge { background: rgba(255,255,255,0.2); padding: 12px 25px; border-radius: 25px; margin-bottom: 20px; } .title { font-size: 3rem; font-weight: 700; margin-bottom: 15px; } .description { font-size: 1.2rem; margin-bottom: 25px; font-style: italic; } .quote { background: rgba(255,255,255,0.1); padding: 25px; border-radius: 15px; margin-bottom: 25px; border-left: 4px solid #a855f7; } .features { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 25px; } .feature { background: rgba(255,255,255,0.1); padding: 15px; border-radius: 10px; }</style><div class="content"><div class="badge">🕊️ SUNDAY REFLECTION</div><h1 class="title">${formData.title || 'Your Title Here'}</h1><p class="description">${formData.description || 'Your description will appear here...'}</p><div class="quote">"Excellence is never an accident. It is always the result of high intention, sincere effort, and intelligent execution." — Aristotle</div><div class="features"><div class="feature">💡<br>Inspiration</div><div class="feature">🎯<br>Focus</div><div class="feature">🌱<br>Growth</div></div><div>📞 +971 4 380 5515</div></div>`
    };

    // Template B - Alternative design for Tuesday (and can be extended for other days)
    const templatesB = {
      tuesday: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=1080, height=1920, initial-scale=1.0" />
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
          <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
        </head>
        <body>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; -webkit-font-smoothing: antialiased; }
          body { font-family: 'Inter', sans-serif; background: #000000; color: #ffffff; height: 100vh; overflow: hidden; margin: 0; padding: 0; width: 1080px; }
          .content-card { display: flex; flex-direction: column; width: 100%; height: 100vh; }
          .badge-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; }
          .badge { background: linear-gradient(135deg, #f8fafc, #e2e8f0, #cbd5e1); color: #000; padding: 16px 32px; border-radius: 25px; font-weight: 900; font-size: 24px; text-transform: uppercase; letter-spacing: 0.8px; white-space: nowrap; display: inline-flex; align-items: center; box-shadow: 0 6px 20px rgba(255,255,255,0.1); border: 2px solid rgba(255,255,255,0.2); }
          .content { padding: 40px; height: 100%; display: flex; flex-direction: column; justify-content: flex-start; gap: 16px; overflow: visible; }
          .title { font-size: 68px; font-weight: 900; color: #ffffff; line-height: 1.1; text-shadow: 0 2px 4px rgba(0,0,0,0.3); margin-bottom: 12px; }
          .subtitle { font-size: 42px; color: #f1f5f9; margin-bottom: 16px; font-weight: 600; text-shadow: 0 2px 4px rgba(0,0,0,0.2); }
          .description { font-size: 36px; color: #f1f5f9; line-height: 1.5; text-align: left; margin: 16px 0; max-width: 96%; text-shadow: 0 1px 2px rgba(0,0,0,0.2); font-weight: 500; }
          .company-logo-inline { height: 96px; width: auto; filter: brightness(1.3) drop-shadow(0 2px 4px rgba(0,0,0,0.3)); margin-top: 4px; flex-shrink: 0; }
          .contact { position: fixed; left: 40px; right: 40px; bottom: 20px; z-index: 5; display: flex; align-items: center; justify-content: center; gap: 16px; background: rgba(255,255,255,0.15); border: 2px solid rgba(255,255,255,0.3); padding: 24px 32px; border-radius: 20px; backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); font-weight: 800; font-size: 28px; box-shadow: 0 8px 32px rgba(0,0,0,0.2); }
          .contact i { color: #ffffff; font-size: 26px; }
          
          /* Tech sections styling */
          .tech-grid { 
            display: grid; 
            grid-template-columns: 1fr 1fr; 
            gap: 24px; 
            margin: 24px 0; 
          }
          
          .tech-section {
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.15);
            border-radius: 16px;
            padding: 32px;
            margin-bottom: 24px;
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
          }
          
          .section-header {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 16px;
          }
          
          .section-header i {
            font-size: 41px;
            color: #e2e8f0;
            background: linear-gradient(135deg, #f8fafc, #cbd5e1);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
          }
          
          .section-title {
            font-size: 41px;
            font-weight: 700;
            color: #f1f5f9;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          
          .section-content {
            font-size: 37px;
            color: #e2e8f0;
            line-height: 1.4;
          }
          
          .info-card {
            text-align: center;
            padding: 12px;
          }
          
          .info-icon {
            font-size: 37px;
            margin-bottom: 8px;
            color: #cbd5e1;
          }
          
          .info-label {
            font-size: 23px;
            color: #cbd5e1;
            margin-bottom: 6px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          
          .info-value {
            font-size: 32px;
            color: #f8fafc;
            font-weight: 700;
          }
          
          .warning-section {
            background: rgba(255, 100, 100, 0.1);
            border: 1px solid rgba(255, 150, 150, 0.3);
            border-radius: 16px;
            padding: 32px;
            margin: 24px 0;
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
          }
          
          .warning-header {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 16px;
          }
          
          .warning-header i {
            font-size: 32px;
            color: #ff6b6b;
          }
          
          .warning-title {
            font-size: 32px;
            font-weight: 700;
            color: #ff6b6b;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          
          .warning-content {
            font-size: 32px;
            color: #ffebeb;
            line-height: 1.4;
          }
          
          .content-container {
            margin-bottom: 24px;
          }
        </style>

        <div class="content-card">
          <div class="content">
            <div class="badge-row">
              <div class="badge"><i class="fas fa-lightbulb" style="margin-right:6px;"></i> ${formData.badgeText || 'TECH TIPS TUESDAY'}</div>
              <img src="https://res.cloudinary.com/dw0ciqgwd/image/upload/v1748497977/qgdbuhm5lpnxuggmltts.png" alt="SilberArrows Logo" class="company-logo-inline" referrerpolicy="no-referrer" onerror="this.onerror=null;this.style.display='none';" />
            </div>
            
            <div class="content-container">
              ${formData.problem ? `
              <div class="tech-section">
                <div class="section-header">
                  <i class="fas fa-exclamation-circle"></i>
                  <span class="section-title">The Problem</span>
            </div>
                <div class="section-content">${formData.problem}</div>
              </div>
              ` : ''}

              ${formData.solution ? `
              <div class="tech-section">
                <div class="section-header">
                  <i class="fas fa-tools"></i>
                  <span class="section-title">The Solution</span>
              </div>
                <div class="section-content">${formData.solution}</div>
            </div>
              ` : ''}

              ${formData.difficulty && formData.tools_needed ? `
              <div class="tech-grid">
                <div class="tech-section info-card">
                  <div class="info-icon"><i class="fas fa-gauge-high"></i></div>
                  <div class="info-label">Difficulty</div>
                  <div class="info-value">${formData.difficulty}</div>
          </div>
                
                <div class="tech-section info-card">
                  <div class="info-icon"><i class="fas fa-clock"></i></div>
                  <div class="info-label">Tools Needed</div>
                  <div class="info-value">${formData.tools_needed}</div>
                </div>
              </div>
              ` : ''}

              ${formData.warning ? `
              <div class="warning-section">
                <div class="warning-header">
                  <i class="fas fa-exclamation-triangle"></i>
                  <span class="warning-title">Important Warning</span>
                </div>
                <div class="warning-content">${formData.warning}</div>
              </div>
              ` : ''}
            </div>
            
            <div class="contact"><i class="fas fa-phone"></i> <i class="fab fa-whatsapp"></i> Call or WhatsApp us at +971 4 380 5515</div>
          </div>
        </div>
        </body>
        </html>`,
      
      // Add other days with Template B style (simplified for now)
      wednesday: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=1080, height=1920, initial-scale=1.0" />
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
          <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
        </head>
        <body>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; -webkit-font-smoothing: antialiased; }
          body { font-family: 'Inter', sans-serif; background: #D5D5D5; color: #ffffff; height: 100vh; overflow: hidden; margin: 0; padding: 0; width: 1080px; }
          .content-card { display: flex; flex-direction: column; width: 100%; height: 100vh; }
          .content { padding: 32px; height: 100%; display: flex; flex-direction: column; justify-content: flex-start; gap: 20px; overflow: visible; position: relative; z-index: 2; }
          .badge-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; }
          .badge { background: linear-gradient(135deg, #f8fafc, #e2e8f0, #cbd5e1); color: #000; padding: 16px 32px; border-radius: 25px; font-weight: 900; font-size: 24px; text-transform: uppercase; letter-spacing: 0.8px; white-space: nowrap; display: inline-flex; align-items: center; box-shadow: 0 6px 20px rgba(255,255,255,0.1); border: 2px solid rgba(255,255,255,0.2); }
          .company-logo-inline { height: 96px; width: auto; filter: brightness(1.3) drop-shadow(0 2px 4px rgba(0,0,0,0.3)); margin-top: 4px; flex-shrink: 0; }
          .content-container { margin-top: 120px; }
          .title-section { margin-bottom: 20px; }
          .title { font-size: 41px; font-weight: 900; color: #000000; line-height: 1.1; text-shadow: none; margin-bottom: 12px; }
          .subtitle { font-size: 32px; color: #333333; margin-bottom: 16px; font-weight: 600; text-shadow: none; }
          .contact { position: fixed; left: 32px; right: 32px; bottom: 20px; z-index: 5; display: flex; align-items: center; justify-content: center; gap: 16px; background: rgba(0,0,0,0.15); border: 2px solid rgba(0,0,0,0.3); padding: 24px 32px; border-radius: 20px; backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); font-weight: 800; font-size: 32px; box-shadow: 0 8px 32px rgba(0,0,0,0.2); color: #000000; }
          .contact i { color: #000000; font-size: 32px; }
          
          /* Car spotlight specific styles for Template B */
          .car-specs-grid { 
            display: grid; 
            grid-template-columns: 1fr 1fr; 
            gap: 20px; 
            margin: 20px 0; 
          }
          
          .car-details-section { 
            display: grid; 
            grid-template-columns: 1fr 1fr; 
            gap: 20px; 
            margin: 0; 
          }
          
          .detail-card {
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.15);
            border-radius: 16px;
            padding: 24px;
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.25);
          }
          
          .detail-header {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 16px;
          }
          
          .detail-header i {
            font-size: 28px;
            color: #000000;
          }
          
          .detail-title {
            font-size: 28px;
            font-weight: 700;
            color: #000000;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          
          .detail-content {
            font-size: 26px;
            color: #333333;
            line-height: 1.4;
            padding-left: 40px;
          }
          
          .car-features {
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.15);
            border-radius: 16px;
            padding: 24px;
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            margin: 0;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.25);
          }
          
          .features-header {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 16px;
          }
          
          .features-header i {
            font-size: 28px;
            color: #000000;
          }
          
          .features-title {
            font-size: 28px;
            font-weight: 700;
            color: #000000;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          
          .features-list {
            font-size: 26px;
            color: #333333;
            line-height: 1.4;
            padding-left: 40px;
          }
          
          .features-list li {
            margin-bottom: 12px;
          }
          
          .car-pricing {
            text-align: center;
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.15);
            border-radius: 16px;
            padding: 24px;
            margin: 0;
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.25);
          }
          
          .pricing-header {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 12px;
            margin-bottom: 16px;
          }
          
          .pricing-header i {
            font-size: 28px;
            color: #000000;
          }
          
          .pricing-title {
            font-size: 28px;
            color: #000000;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          
          .pricing-value {
            font-size: 46px;
            color: #000000;
            font-weight: 900;
            text-shadow: none;
          }
          
          .financing-info {
            font-size: 24px;
            color: #333333;
            margin-top: 12px;
            opacity: 0.8;
          }
          
          .spotlight-badge {
            position: absolute;
            top: 30px;
            right: 30px;
            background: linear-gradient(135deg, #ffd700, #ff8c00);
            color: #000;
            padding: 16px 32px;
            border-radius: 25px;
            font-weight: 900;
            font-size: 28px;
            text-transform: uppercase;
            letter-spacing: 1px;
            box-shadow: 0 6px 20px rgba(0,0,0,0.3);
            border: 2px solid rgba(255,255,255,0.3);
            z-index: 10;
          }
        </style>

        <div class="content-card">
          <div class="content">
            <div class="spotlight-badge"><i class="fas fa-star" style="margin-right:8px;"></i> SPOTLIGHT OF THE WEEK</div>
            
            <div class="content-container">
              <div class="title-section">
                <h1 class="title">${(() => {
                  const year = formData.car_year || '2023';
                  const title = formData.car_model || formData.title || '';
                  // Add year to beginning - no wrapping needed
                  return `${year} ${title}`;
                })()}</h1>
            </div>
              
                            <!-- Car Specifications Grid -->
              <div class="car-specs-grid">
                <div class="detail-card">
                  <div class="detail-header">
                    <i class="fas fa-tachometer-alt"></i>
                    <span class="detail-title">Mileage</span>
            </div>
                  <div class="detail-content">${formData.car_mileage || '25,000'} km</div>
          </div>
                
                <div class="detail-card">
                  <div class="detail-header">
                    <i class="fas fa-bolt"></i>
                    <span class="detail-title">Horsepower</span>
                  </div>
                  <div class="detail-content">${formData.car_horsepower || '300'} HP</div>
                </div>
                
                <div class="detail-card">
                  <div class="detail-header">
                    <i class="fas fa-paint-brush"></i>
                    <span class="detail-title">Exterior Color</span>
                  </div>
                  <div class="detail-content">${formData.car_exterior_color || 'Black'}</div>
                </div>
                
                <div class="detail-card">
                  <div class="detail-header">
                    <i class="fas fa-car-side"></i>
                    <span class="detail-title">Interior Color</span>
                  </div>
                  <div class="detail-content">${formData.car_interior_color || 'Black'}</div>
                </div>
              </div>
            </div>
            
            <!-- Car Details Grid -->
            <div class="car-details-section">
              <div class="detail-card">
                <div class="detail-header">
                  <i class="fas fa-cogs"></i>
                  <span class="detail-title">Engine</span>
                </div>
                <div class="detail-content">${formData.car_engine || '3.0L V6 Turbo'}</div>
              </div>
              
              <div class="detail-card">
                <div class="detail-header">
                  <i class="fas fa-cog"></i>
                  <span class="detail-title">Transmission</span>
                </div>
                <div class="detail-content">${formData.car_transmission || '9G-TRONIC Automatic'}</div>
              </div>
            </div>
            
            <!-- Key Equipment -->
            <div class="car-features">
              <div class="features-header">
                <i class="fas fa-list-check"></i>
                <span class="features-title">Key Equipment (highlights)</span>
              </div>
              <ul class="features-list">
                ${(() => {
                  let equipmentText = formData.key_equipment || 'Premium Interior Package, Advanced Driver Assistance, Panoramic Sunroof, AMG Styling Package, Leather Seats, Navigation System, Bluetooth Connectivity, Cruise Control, Parking Sensors, Automatic Climate Control, Keyless Entry, Power Windows, Electric Mirrors, Heated Seats, Premium Sound System, AMG Performance Package, Burmester Sound System, Ambient Lighting, Memory Seats, Wireless Charging, Head-Up Display, 360° Camera, Lane Keeping Assist, Blind Spot Monitoring, Adaptive Cruise Control';
                  
                  console.log('Key Equipment Text:', equipmentText);
                  console.log('Contains newline?', equipmentText.includes('\n'));
                  console.log('Contains arrow?', equipmentText.includes('↵'));
                  
                  // Handle different formats of equipment data
                  let allEquipment = [];
                  
                  // Always try newline splitting first since that's the primary format
                  if (equipmentText.includes('\n') || equipmentText.includes('↵')) {
                    // Handle newline characters (both actual newlines and arrow symbols)
                    allEquipment = equipmentText
                      .replace(/↵/g, '\n') // Replace arrow symbols with actual newlines
                      .split(/\n/) // Split by actual newlines
                      .map(item => item.trim());
                  } else if (equipmentText.includes(',')) {
                    // Split by commas (comma-separated format)
                    allEquipment = equipmentText.split(',').map(item => item.trim());
                  } else {
                    // Split by multiple spaces, semicolons, or camelCase patterns
                    allEquipment = equipmentText
                      .replace(/([A-Z])([A-Z][a-z])/g, '$1 $2') // Split consecutive capitals
                      .split(/\s{2,}|;|\.|(?=[A-Z][A-Z\s]*[A-Z](?=[a-z]))|(?<=[a-z])(?=[A-Z])/) // Split on multiple spaces, punctuation, or camelCase
                      .map(item => item.trim());
                  }
                  
                  // Filter and clean the equipment list
                  allEquipment = allEquipment
                    .filter(item => item.length > 2 && item.length < 120) // Keep most items
                    .filter(item => item !== '') // Remove empty strings
                    .filter(item => item.match(/[A-Za-z]/)) // Must contain at least one letter
                    .filter(item => !item.match(/^[A-Z]{1,2}$/)); // Remove single/double letter abbreviations only
                  
                  console.log('Processed Equipment:', allEquipment);
                  
                  // Shuffle and pick 13 random items
                  const shuffled = [...allEquipment].sort(() => 0.5 - Math.random());
                  const selectedEquipment = shuffled.slice(0, 13);
                  
                  console.log('Selected Equipment:', selectedEquipment);
                  
                  return selectedEquipment.map(item => `<li>${item}</li>`).join('');
                })()}
              </ul>
            </div>
            
            <!-- Pricing -->
            <div class="car-pricing">
              <div class="pricing-header">
                <i class="fas fa-tag"></i>
                <span class="pricing-title">Special Offer</span>
              </div>
              <div class="pricing-value">${formData.car_price || 'AED 185,000'}</div>
              <div class="financing-info">Financing Available • Trade-ins Welcome</div>
            </div>
            
            <div class="contact"><i class="fas fa-phone"></i> <i class="fab fa-whatsapp"></i> Call or WhatsApp us at +971 4 380 5515</div>
          </div>
        </div>
        </body>
        </html>
      `,
      
      monday: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=1080, height=1920, initial-scale=1.0" />
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
          <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
        </head>
        <body>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; -webkit-font-smoothing: antialiased; }
          body { font-family: 'Inter', sans-serif; background: #000000; color: #ffffff; height: 100vh; overflow: hidden; margin: 0; padding: 0; width: 1080px; }
          .content-card { display: flex; flex-direction: column; width: 100%; height: 100vh; }
          .badge-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; }
          .badge { background: linear-gradient(135deg, #f8fafc, #e2e8f0, #cbd5e1); color: #000; padding: 16px 32px; border-radius: 25px; font-weight: 900; font-size: 24px; text-transform: uppercase; letter-spacing: 0.8px; white-space: nowrap; display: inline-flex; align-items: center; box-shadow: 0 6px 20px rgba(255,255,255,0.1); border: 2px solid rgba(255,255,255,0.2); }
          .content { padding: 40px; height: 100%; display: flex; flex-direction: column; justify-content: flex-start; gap: 16px; overflow: visible; }
          .title { font-size: 68px; font-weight: 900; color: #ffffff; line-height: 1.1; text-shadow: 0 2px 4px rgba(0,0,0,0.3); margin-bottom: 12px; }
          .subtitle { font-size: 42px; color: #f1f5f9; margin-bottom: 16px; font-weight: 600; text-shadow: 0 2px 4px rgba(0,0,0,0.2); }
          .description { font-size: 36px; color: #f1f5f9; line-height: 1.5; text-align: left; margin: 16px 0; max-width: 96%; text-shadow: 0 1px 2px rgba(0,0,0,0.2); font-weight: 500; }
          .company-logo-inline { height: 96px; width: auto; filter: brightness(1.3) drop-shadow(0 2px 4px rgba(0,0,0,0.3)); margin-top: 4px; flex-shrink: 0; }
          .contact { position: fixed; left: 40px; right: 40px; bottom: 20px; z-index: 5; display: flex; align-items: center; justify-content: center; gap: 16px; background: rgba(255,255,255,0.15); border: 2px solid rgba(255,255,255,0.3); padding: 24px 32px; border-radius: 20px; backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); font-weight: 800; font-size: 28px; box-shadow: 0 8px 32px rgba(0,0,0,0.2); }
          .contact i { color: #ffffff; font-size: 26px; }
          
          /* Tech sections styling */
          .tech-grid { 
            display: grid; 
            grid-template-columns: 1fr 1fr; 
            gap: 24px; 
            margin: 24px 0; 
          }
          
          .tech-section {
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.15);
            border-radius: 16px;
            padding: 32px;
            margin-bottom: 24px;
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
          }
          
          .section-header {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 16px;
          }
          
          .section-header i {
            font-size: 41px;
            color: #e2e8f0;
            background: linear-gradient(135deg, #f8fafc, #cbd5e1);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
          }
          
          .section-title {
            font-size: 41px;
            font-weight: 700;
            color: #f1f5f9;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          
          .section-content {
            font-size: 37px;
            color: #e2e8f0;
            line-height: 1.4;
          }
          
          .myth-section .section-header i {
            color: #ef4444;
          }
          
          .myth-section .section-title {
            color: #ef4444;
          }
          
          .fact-section .section-header i {
            color: #22c55e;
          }
          
          .fact-section .section-title {
            color: #22c55e;
          }
          
          .info-card {
            text-align: center;
            padding: 12px;
          }
          
          .info-icon {
            font-size: 37px;
            margin-bottom: 8px;
            color: #cbd5e1;
          }
          
          .info-label {
            font-size: 23px;
            color: #cbd5e1;
            margin-bottom: 6px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          
          .info-value {
            font-size: 32px;
            color: #f8fafc;
            font-weight: 700;
          }
          
          .warning-section {
            background: rgba(255, 100, 100, 0.1);
            border: 1px solid rgba(255, 150, 150, 0.3);
            border-radius: 16px;
            padding: 32px;
            margin: 24px 0;
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
          }
          
          .warning-header {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 16px;
          }
          
          .warning-header i {
            font-size: 32px;
            color: #ff6b6b;
          }
          
          .warning-title {
            font-size: 32px;
            font-weight: 700;
            color: #ff6b6b;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          
          .warning-content {
            font-size: 32px;
            color: #ffebeb;
            line-height: 1.4;
          }
          
          .content-container {
            margin-bottom: 24px;
          }
                  
          .background-image-container {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 0;
          }
          
          .background-image-blur {
            width: 100%;
            height: 100%;
            object-fit: cover;
            filter: blur(8px);
            opacity: 0.3;
          }
          
          .background-overlay {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(135deg, rgba(0,0,0,0.7), rgba(0,0,0,0.5));
          }
          
          .content {
            position: relative;
            z-index: 1;
          }
        </style>

        <div class="content-card">
          <!-- Background image with blur -->
          <div class="background-image-container">
            <img src="${imageUrl}" class="background-image-blur" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src='https://images.unsplash.com/photo-1619767886558-efdc259cde1f?auto=format&fit=crop&w=1080&h=720&q=80';" />
            <div class="background-overlay"></div>
          </div>
          <div class="content">
            <div class="badge-row">
              <div class="badge"><i class="fas fa-exclamation-triangle" style="margin-right:6px;"></i> ${formData.badgeText || 'MYTH BUSTER MONDAY'}</div>
              <img src="https://res.cloudinary.com/dw0ciqgwd/image/upload/v1748497977/qgdbuhm5lpnxuggmltts.png" alt="SilberArrows Logo" class="company-logo-inline" referrerpolicy="no-referrer" onerror="this.onerror=null;this.style.display='none';" />
            </div>
            
            <div class="content-container">
              ${formData.myth ? `
              <div class="tech-section myth-section">
                <div class="section-header">
                  <i class="fas fa-times-circle"></i>
                  <span class="section-title">The Myth</span>
            </div>
                <div class="section-content">${formData.myth}</div>
          </div>
              ` : ''}

              ${formData.fact ? `
              <div class="tech-section fact-section">
                <div class="section-header">
                  <i class="fas fa-check-circle"></i>
                  <span class="section-title">The Fact</span>
              </div>
                <div class="section-content">${formData.fact}</div>
            </div>
              ` : ''}

              ${formData.difficulty && formData.tools_needed ? `
              <div class="tech-grid">
                <div class="tech-section info-card">
                  <div class="info-icon"><i class="fas fa-gauge-high"></i></div>
                  <div class="info-label">Difficulty</div>
                  <div class="info-value">${formData.difficulty}</div>
          </div>
                
                <div class="tech-section info-card">
                  <div class="info-icon"><i class="fas fa-clock"></i></div>
                  <div class="info-label">Tools Needed</div>
                  <div class="info-value">${formData.tools_needed}</div>
                </div>
              </div>
              ` : ''}

              ${formData.warning ? `
              <div class="warning-section">
                <div class="warning-header">
                  <i class="fas fa-exclamation-triangle"></i>
                  <span class="warning-title">Important Warning</span>
                </div>
                <div class="warning-content">${formData.warning}</div>
              </div>
              ` : ''}
            </div>
            
            <div class="contact"><i class="fas fa-phone"></i> <i class="fab fa-whatsapp"></i> Call or WhatsApp us at +971 4 380 5515</div>
          </div>
        </div>
        </body>
        </html>`,

      thursday: templatesA.thursday,
      friday: templatesA.friday,
      saturday: templatesA.saturday,
      sunday: templatesA.sunday
    };

    const selectedTemplates = templateType === 'A' ? templatesA : templatesB;
    return selectedTemplates[dayKey as keyof typeof selectedTemplates] || selectedTemplates.monday;
  };

  // Download generated image
  const downloadGeneratedImage = (imageBase64?: string, template?: string) => {
    const imageToDownload = imageBase64 || generatedImageBase64;
    if (!imageToDownload) return;
    
    const link = document.createElement('a');
    link.href = `data:image/png;base64,${imageToDownload}`;
    const templateSuffix = template ? `_template_${template}` : '';
    link.download = `${formData.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${dayKey}${templateSuffix}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // TODO: Upload files to storage and get URLs
      // For now, we'll just pass the file info - the parent component will handle upload
      const mediaFiles = selectedFiles.map(f => ({
        name: f.file.name,
        type: f.file.type,
        size: f.file.size,
        file: f.file // Pass the actual file for upload
      }));

      console.log('🔍 Frontend formData before save:', {
        title: formData.title,
        subtitle: formData.subtitle,
        myth: formData.myth,
        fact: formData.fact,
        badgeText: formData.badgeText
      });

      console.log('🔍 Raw formData object:', formData);

      const contentPillarData: Partial<ContentPillarItem> = {
        title: formData.title,
        description: formData.description,
        content_type: formData.content_type,
        day_of_week: dayKey,
        media_files: [...existingMedia, ...mediaFiles],
        badge_text: formData.badgeText,
        subtitle: formData.subtitle,
        myth: formData.myth,
        fact: formData.fact,
        problem: formData.problem,
        solution: formData.solution,
        difficulty: formData.difficulty,
        tools_needed: formData.tools_needed,
        warning: formData.warning,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      console.log('📤 Sending to API:', contentPillarData);
      console.log('📤 Sending to API - specific fields:', {
        badge_text: contentPillarData.badge_text,
        subtitle: contentPillarData.subtitle,
        myth: contentPillarData.myth,
        fact: contentPillarData.fact
      });

      await onSave(contentPillarData);
      onClose();
      
      // Reset form
      setFormData({
        title: '',
        description: '',
        content_type: 'image',
        badgeText: dayKey === 'monday' ? 'MYTH BUSTER MONDAY' : (dayKey === 'tuesday' ? 'TECH TIPS TUESDAY' : dayKey.toUpperCase()),
        subtitle: dayKey === 'monday' ? 'Independent Mercedes Service' : (dayKey === 'tuesday' ? 'Expert Mercedes Knowledge' : 'Premium Selection'),
        myth: '',
        fact: '',
        problem: '',
        solution: '',
        difficulty: '',
        tools_needed: '',
        warning: '',
        imageAlignment: 'center' as 'left' | 'center' | 'right',
        imageFit: 'cover' as 'cover' | 'contain' | 'fill',
        imageZoom: 100,
        imageVerticalPosition: 0,
        // Car-specific fields for Wednesday spotlight
        car_make: '',
        car_model: '',
        car_year: '',
        car_trim: '',
        car_mileage: '',
        car_horsepower: '',
        car_exterior_color: '',
        car_interior_color: '',
        car_engine: '',
        car_transmission: '',
        car_color: '',
        car_fuel_type: '',
        car_price: '',
        feature_1: '',
        feature_2: '',
        feature_3: '',
        feature_4: '',
        key_equipment: '',
      });
    } catch (error) {
      console.error('Error saving content pillar:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    
    if (confirm('Are you sure you want to delete this content pillar? This action cannot be undone.')) {
      setDeleting(true);
      try {
        await onDelete();
        onClose();
      } catch (error) {
        console.error('Error deleting content pillar:', error);
      } finally {
        setDeleting(false);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-white/5 backdrop-blur-xl border border-white/20 rounded-xl p-6 w-full max-w-[95vw] text-xs relative h-[95vh] overflow-hidden shadow-2xl ring-1 ring-white/10">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 h-full">
          
          {/* Left Panel - Form */}
          <div className="overflow-y-auto lg:col-span-2 h-full flex flex-col">
        <div className="flex justify-between items-center mb-6 border-b border-white/20 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30">
              <Sparkles className="w-5 h-5 text-purple-300" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">
                {isEditing ? 'Edit Content Pillar' : 'AI Generated Content'}
              </h2>
              <p className="text-white/60 text-sm">
                {dayTitle} Content Pillar
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
          
          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto space-y-4 pr-2">
          
          {/* Content Information */}
          <div className="bg-white/8 backdrop-blur-md rounded-xl p-4 border border-white/15 shadow-lg ring-1 ring-white/5">
            <div className="space-y-3">
              
              {/* Title */}
              <div>
                <label className="block text-xs font-medium text-white mb-2 flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  Content Title
                </label>
                <input
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-sm rounded-lg bg-black/30 backdrop-blur-sm border border-white/15 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-400/50 focus:border-purple-400/50 transition-all uppercase shadow-inner"
                  style={{ textTransform: 'uppercase' }}
                  placeholder="Enter content title"
                  required
                />
              </div>

              {/* Car Selection Dropdown (Wednesday only) */}
              {dayKey === 'wednesday' && (
                <div>
                  <label className="block text-xs font-medium text-white mb-2 flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    Select Car from Inventory
                  </label>
                  <select
                    value={selectedCarId}
                    onChange={(e) => handleCarSelection(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg bg-black/30 backdrop-blur-sm border border-white/15 text-white focus:outline-none focus:ring-2 focus:ring-purple-400/50 focus:border-purple-400/50 transition-all"
                    disabled={loadingCars}
                  >
                    <option value="">
                      {loadingCars ? 'Loading cars...' : 'Choose a car from inventory'}
                    </option>
                    {inventoryCars.map((car) => (
                      <option key={car.id} value={car.id} className="bg-gray-800">
                        {car.model_year} {car.vehicle_model} - {car.colour} - AED {car.advertised_price_aed.toLocaleString()}
                      </option>
                    ))}
                  </select>
                  {selectedCarId && (
                    <p className="text-xs text-green-400 mt-1">
                      ✓ Car selected - form fields auto-populated
                    </p>
                  )}
                </div>
              )}

              {/* Badge Text Field (Monday only) */}
              {dayKey === 'monday' && (
                <div>
                  <label className="block text-xs font-medium text-white mb-2 flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                    Badge Text
                  </label>
                  <input
                    name="badgeText"
                    value={formData.badgeText}
                    onChange={handleChange}
                    className="w-full px-3 py-2 text-sm rounded-lg bg-black/30 backdrop-blur-sm border border-white/15 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-400/50 focus:border-purple-400/50 transition-all uppercase shadow-inner"
                    style={{ textTransform: 'uppercase' }}
                    placeholder="MYTH BUSTER MONDAY"
                  />
                </div>
              )}

              {/* Subtitle Field (Monday only) */}
              {dayKey === 'monday' && (
                <div>
                  <label className="block text-xs font-medium text-white mb-2 flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                    </svg>
                    Subtitle
                  </label>
                  <input
                    name="subtitle"
                    value={formData.subtitle}
                    onChange={handleChange}
                    className="w-full px-3 py-2 text-sm rounded-lg bg-black/30 backdrop-blur-sm border border-white/15 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-400/50 focus:border-purple-400/50 transition-all shadow-inner"
                    placeholder="Independent Mercedes Service"
                  />
                </div>
              )}

              {/* Myth Field (Monday only) */}
              {dayKey === 'monday' && (
                <div>
                  <label className="block text-xs font-medium text-white mb-2 flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <span className="text-red-400">Myth</span>
                  </label>
                  <textarea
                    name="myth"
                    value={formData.myth}
                    onChange={handleChange}
                    rows={2}
                    className="w-full px-3 py-2 text-sm rounded-lg bg-red-500/10 backdrop-blur-sm border border-red-500/30 text-white placeholder-red-300/50 focus:outline-none focus:ring-2 focus:ring-red-400/50 focus:border-red-400/50 transition-all resize-none shadow-inner"
                    placeholder="State the common misconception plainly (1-2 sentences)"
                  />
                </div>
              )}

              {/* Fact Field (Monday only) */}
              {dayKey === 'monday' && (
                <div>
                  <label className="block text-xs font-medium text-white mb-2 flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-green-400">Fact</span>
                  </label>
                  <textarea
                    name="fact"
                    value={formData.fact}
                    onChange={handleChange}
                    rows={3}
                    className="w-full px-3 py-2 text-sm rounded-lg bg-green-500/10 backdrop-blur-sm border border-green-500/30 text-white placeholder-green-300/50 focus:outline-none focus:ring-2 focus:ring-green-400/50 focus:border-green-400/50 transition-all resize-none shadow-inner"
                    placeholder="Correct the myth with factory-accurate reasoning, include specific Mercedes specs/tools, and tie to UAE conditions (3-5 sentences)"
                  />
                </div>
              )}

              {/* Tuesday Tech Tips Fields */}
              {dayKey === 'tuesday' && (
                <>
                  {/* Badge Text Field (Tuesday only) */}
                  <div>
                    <label className="block text-xs font-medium text-white mb-2 flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                      Badge Text
                    </label>
                    <input
                      name="badgeText"
                      value={formData.badgeText}
                      onChange={handleChange}
                      className="w-full px-3 py-2 text-sm rounded-lg bg-black/30 backdrop-blur-sm border border-white/15 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-teal-400/50 focus:border-teal-400/50 transition-all uppercase shadow-inner"
                      style={{ textTransform: 'uppercase' }}
                      placeholder="TECH TIPS TUESDAY"
                    />
                  </div>

                  {/* Subtitle Field (Tuesday only) */}
                  <div>
                    <label className="block text-xs font-medium text-white mb-2 flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                      </svg>
                      Subtitle
                    </label>
                    <input
                      name="subtitle"
                      value={formData.subtitle}
                      onChange={handleChange}
                      className="w-full px-3 py-2 text-sm rounded-lg bg-black/30 backdrop-blur-sm border border-white/15 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-teal-400/50 focus:border-teal-400/50 transition-all shadow-inner"
                      placeholder="Expert Mercedes Knowledge"
                    />
                  </div>

                  {/* Problem Field (Tuesday only) */}
                  <div>
                    <label className="block text-xs font-medium text-white mb-2 flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                      <span className="text-orange-400">Problem</span>
                    </label>
                    <textarea
                      name="problem"
                      value={formData.problem}
                      onChange={handleChange}
                      rows={2}
                      className="w-full px-3 py-2 text-sm rounded-lg bg-orange-500/10 backdrop-blur-sm border border-orange-500/30 text-white placeholder-orange-300/50 focus:outline-none focus:ring-2 focus:ring-orange-400/50 focus:border-orange-400/50 transition-all resize-none shadow-inner"
                      placeholder="What issue or challenge does this tip address?"
                    />
                  </div>

                  {/* Solution Field (Tuesday only) */}
                  <div>
                    <label className="block text-xs font-medium text-white mb-2 flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-teal-400">Solution</span>
                    </label>
                    <textarea
                      name="solution"
                      value={formData.solution}
                      onChange={handleChange}
                      rows={3}
                      className="w-full px-3 py-2 text-sm rounded-lg bg-teal-500/10 backdrop-blur-sm border border-teal-500/30 text-white placeholder-teal-300/50 focus:outline-none focus:ring-2 focus:ring-teal-400/50 focus:border-teal-400/50 transition-all resize-none shadow-inner"
                      placeholder="Step-by-step explanation or solution with Mercedes-specific details"
                    />
                  </div>

                  {/* Difficulty and Tools Grid */}
                  <div className="grid grid-cols-2 gap-3">
                    {/* Difficulty Field */}
                    <div>
                      <label className="block text-xs font-medium text-white mb-2 flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        <span className="text-blue-400">Difficulty</span>
                      </label>
                      <select
                        name="difficulty"
                        value={formData.difficulty}
                        onChange={handleChange}
                        className="w-full px-3 py-2 text-sm rounded-lg bg-blue-500/10 backdrop-blur-sm border border-blue-500/30 text-white focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400/50 transition-all shadow-inner"
                      >
                        <option value="">Select difficulty</option>
                        <option value="DIY">DIY</option>
                        <option value="Professional Required">Professional Required</option>
                        <option value="Inspection Only">Inspection Only</option>
                      </select>
                    </div>

                    {/* Tools Needed Field */}
                    <div>
                      <label className="block text-xs font-medium text-white mb-2 flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span className="text-purple-400">Tools Needed</span>
                      </label>
                      <input
                        name="tools_needed"
                        value={formData.tools_needed}
                        onChange={handleChange}
                        className="w-full px-3 py-2 text-sm rounded-lg bg-purple-500/10 backdrop-blur-sm border border-purple-500/30 text-white placeholder-purple-300/50 focus:outline-none focus:ring-2 focus:ring-purple-400/50 focus:border-purple-400/50 transition-all shadow-inner"
                        placeholder="e.g., XENTRY, Basic tools, None"
                      />
                    </div>
                  </div>

                  {/* Warning Field (Tuesday only) */}
                  <div>
                    <label className="block text-xs font-medium text-white mb-2 flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      <span className="text-red-400">Warning (Optional)</span>
                    </label>
                    <textarea
                      name="warning"
                      value={formData.warning}
                      onChange={handleChange}
                      rows={2}
                      className="w-full px-3 py-2 text-sm rounded-lg bg-red-500/10 backdrop-blur-sm border border-red-500/30 text-white placeholder-red-300/50 focus:outline-none focus:ring-2 focus:ring-red-400/50 focus:border-red-400/50 transition-all resize-none shadow-inner"
                      placeholder="Safety considerations or warranty warnings (optional)"
                    />
                  </div>
                </>
              )}

              {/* Description */}
              <div>
                <label className="block text-xs font-medium text-white mb-2 flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                  </svg>
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={4}
                  className="w-full px-3 py-2 text-sm rounded-lg bg-black/30 backdrop-blur-sm border border-white/15 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-400/50 focus:border-purple-400/50 transition-all resize-none shadow-inner"
                  placeholder="Enter content description and details"
                />
              </div>

              {/* Content Type */}
              <div>
                <label className="block text-xs font-medium text-white mb-2 flex items-center gap-1.5">
                  {getContentTypeIcon(formData.content_type)}
                  Content Type
                </label>
                <select
                  name="content_type"
                  value={formData.content_type}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-sm rounded-lg bg-black/30 backdrop-blur-sm border border-white/15 text-white focus:outline-none focus:ring-2 focus:ring-purple-400/50 focus:border-purple-400/50 transition-all shadow-inner"
                >
                  <option value="image">Image Post</option>
                  <option value="video">Video Content</option>
                  <option value="carousel">Carousel Post</option>
                  <option value="text">Text Post</option>
                </select>
              </div>

              {/* Image Positioning Options */}
              <div className="grid grid-cols-2 gap-3">
                {/* Image Alignment */}
                <div>
                  <label className="block text-xs font-medium text-white mb-2 flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                    </svg>
                    Image Alignment
                  </label>
                  <select
                    name="imageAlignment"
                    value={formData.imageAlignment}
                    onChange={handleChange}
                    className="w-full px-3 py-2 text-sm rounded-lg bg-black/30 backdrop-blur-sm border border-white/15 text-white focus:outline-none focus:ring-2 focus:ring-purple-400/50 focus:border-purple-400/50 transition-all shadow-inner"
                  >
                    <option value="left">Left Align</option>
                    <option value="center">Center</option>
                    <option value="right">Right Align</option>
                  </select>
                </div>

                {/* Image Fit */}
                <div>
                  <label className="block text-xs font-medium text-white mb-2 flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4a1 1 0 011-1h4m0 0l-3 3m3-3v4M20 8V4a1 1 0 00-1-1h-4m0 0l3 3m-3-3v4M4 16v4a1 1 0 001 1h4m0 0l-3-3m3 3h-4M20 16v4a1 1 0 01-1 1h-4m0 0l3-3m-3 3h-4" />
                    </svg>
                    Image Fit
                  </label>
                  <select
                    name="imageFit"
                    value={formData.imageFit}
                    onChange={handleChange}
                    className="w-full px-3 py-2 text-sm rounded-lg bg-black/30 backdrop-blur-sm border border-white/15 text-white focus:outline-none focus:ring-2 focus:ring-purple-400/50 focus:border-purple-400/50 transition-all shadow-inner"
                  >
                    <option value="cover">Cover (crop to fill)</option>
                    <option value="contain">Contain (fit within)</option>
                    <option value="fill">Fill (stretch to fit)</option>
                  </select>
                </div>
              </div>

              {/* Image Zoom */}
              <div>
                <label className="block text-xs font-medium text-white mb-2 flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                  </svg>
                  Image Zoom ({formData.imageZoom}%)
                </label>
                <input
                  type="range"
                  name="imageZoom"
                  min="50"
                  max="200"
                  step="5"
                  value={formData.imageZoom}
                  onChange={handleChange}
                  className="w-full h-2 bg-black/30 rounded-lg appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, #8b5cf6 0%, #8b5cf6 ${((formData.imageZoom - 50) / (200 - 50)) * 100}%, rgba(255,255,255,0.3) ${((formData.imageZoom - 50) / (200 - 50)) * 100}%, rgba(255,255,255,0.3) 100%)`
                  }}
                />
                <div className="flex justify-between text-xs text-white/50 mt-1">
                  <span>50%</span>
                  <span>100%</span>
                  <span>200%</span>
                </div>
              </div>

              {/* Image Vertical Position */}
              <div>
                <label className="block text-xs font-medium text-white mb-2 flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                  </svg>
                  Vertical Position ({formData.imageVerticalPosition > 0 ? '+' : ''}{formData.imageVerticalPosition}px)
                </label>
                <input
                  type="range"
                  name="imageVerticalPosition"
                  min="-100"
                  max="100"
                  step="5"
                  value={formData.imageVerticalPosition}
                  onChange={handleChange}
                  className="w-full h-2 bg-black/30 rounded-lg appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.3) ${((formData.imageVerticalPosition + 100) / 200) * 100}%, #8b5cf6 ${((formData.imageVerticalPosition + 100) / 200) * 100}%, #8b5cf6 100%)`
                  }}
                />
                <div className="flex justify-between text-xs text-white/50 mt-1">
                  <span>Up 100px</span>
                  <span>Center</span>
                  <span>Down 100px</span>
                </div>
              </div>
            </div>
          </div>

          {/* File Upload Section */}
          <div className="bg-white/8 backdrop-blur-md rounded-xl p-4 border border-white/15 shadow-lg ring-1 ring-white/5">
            <div className="space-y-3">
              <label className="block text-xs font-medium text-white mb-2 flex items-center gap-1.5">
                <Upload className="w-3.5 h-3.5 text-white" />
                Media Files
              </label>
              
              {/* File Upload Input */}
              <div>
                <input
                  type="file"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                  id="content-file-upload"
                  accept="image/*,video/*,.pdf,.doc,.docx,.txt,.mp4,.mov,.avi,.webm,.mkv"
                />
                <label
                  htmlFor="content-file-upload"
                  className="w-full h-12 flex items-center justify-center px-3 gap-2 rounded-lg border-2 border-dashed border-white/25 bg-black/30 backdrop-blur-sm text-xs text-white/70 cursor-pointer transition-all hover:border-white/40 hover:bg-black/40 shadow-inner ring-1 ring-white/5"
                >
                  <Upload className="w-4 h-4" />
                  <span>Upload images, videos, PDFs and documents</span>
                </label>
              </div>

              {/* Selected Files Display */}
              {selectedFiles.length > 0 && (
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {selectedFiles.map((fileWithThumbnail, index) => {
                    const { file, thumbnail, uploadProgress, uploading, uploaded, error } = fileWithThumbnail;
                    
                    return (
                      <div key={index} className="flex items-center gap-2 p-2 bg-black/30 backdrop-blur-sm border border-white/15 rounded-lg shadow-inner ring-1 ring-white/5">
                        {/* Thumbnail or file icon */}
                        <div className="flex-shrink-0 w-8 h-8 rounded overflow-hidden bg-white/5 flex items-center justify-center">
                          {thumbnail ? (
                            <img 
                              src={thumbnail} 
                              alt={file.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            getFileIcon(file)
                          )}
                        </div>

                        {/* File info */}
                        <div className="flex-1 min-w-0">
                          <div className="text-xs text-white truncate">{file.name}</div>
                          <div className="text-xs text-white/50">
                            {(file.size / 1024 / 1024).toFixed(1)} MB
                          </div>
                        </div>

                        {/* Remove button */}
                        <button
                          type="button"
                          onClick={() => removeFile(index)}
                          className="flex-shrink-0 p-1 text-white/50 hover:text-red-400 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Existing Media Files */}
              {existingMedia.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs text-white/50">Existing Files ({existingMedia.length})</div>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {existingMedia.map((media, index) => (
                      <div key={index} className="flex items-center gap-2 p-2 bg-black/20 backdrop-blur-sm border border-white/10 rounded-lg">
                        <div className="flex-shrink-0 w-8 h-8 rounded overflow-hidden bg-white/5 flex items-center justify-center">
                          {media.type?.startsWith('image/') ? (
                            <ImageIcon className="w-4 h-4 text-white/60" />
                          ) : media.type?.startsWith('video/') ? (
                            <Video className="w-4 h-4 text-white/60" />
                          ) : (
                            <FileText className="w-4 h-4 text-white/60" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs text-white/80 truncate">{media.name}</div>
                        </div>
                        
                        {/* Delete button */}
                        <button
                          type="button"
                          onClick={() => removeExistingMedia(index)}
                          className="flex-shrink-0 p-1 text-white/50 hover:text-red-400 transition-colors"
                          title="Delete this image"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* AI Generation Info */}
          {aiGeneratedContent && dayKey !== 'wednesday' && (
            <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 backdrop-blur-md rounded-xl p-4 border border-purple-500/20 shadow-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-300" />
                <span className="text-xs font-medium text-purple-300">AI Generated Content</span>
                </div>
                {onRegenerate && (
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-white/50">Regenerate as:</span>
                    <select
                      onChange={(e) => onRegenerate(e.target.value as 'image' | 'video' | 'text' | 'carousel')}
                      className="text-xs bg-black/30 border border-purple-500/30 text-purple-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-purple-400"
                      defaultValue=""
                    >
                      <option value="" disabled>Choose type</option>
                      <option value="image">Image Post</option>
                      <option value="video">Video Content</option>
                      <option value="carousel">Carousel Post</option>
                      <option value="text">Text Post</option>
                    </select>
                  </div>
                )}
              </div>
              <p className="text-xs text-white/70 mb-3">
                This content was automatically generated for {dayTitle}. You can edit the title and description above before saving.
              </p>
              
              {/* Generate Another Version Button */}
              <button
                type="button"
                onClick={() => onRegenerate?.('image')}
                className="w-full px-3 py-2 bg-gradient-to-br from-purple-500/20 to-pink-500/20 hover:from-purple-500/30 hover:to-pink-500/30 border border-purple-500/30 text-purple-300 hover:text-purple-200 text-xs rounded-lg transition-all font-medium flex items-center justify-center gap-2"
              >
                <Sparkles className="w-3 h-3" />
                Generate Another AI Version
              </button>
            </div>
          )}

          {/* Save Image Section */}
          <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 backdrop-blur-md rounded-xl p-4 border border-green-500/20 shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Download className="w-4 h-4 text-green-300" />
                <span className="text-xs font-medium text-green-300">Save Final Image</span>
              </div>
              <button
                type="button"
                onClick={generateTemplateImage}
                disabled={generatingTemplate || (dayKey === 'wednesday' ? !formData.car_model : (!formData.title || !formData.description))}
                className="px-3 py-1.5 bg-gradient-to-br from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white text-xs rounded-lg transition-all font-semibold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {generatingTemplate ? (
                  <>
                    <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin"></div>
                    Generating & Downloading...
                  </>
                ) : (
                  <>
                    <Download className="w-3 h-3" />
                    Generate & Download Image
                  </>
                )}
              </button>
            </div>

            

                </div>
          </div>

          {/* Actions */}
          <div className="flex justify-between items-center pt-2">
            {/* Left side - Delete button (only show when editing) */}
            <div>
              {isEditing && onDelete && (
                <button
                  type="button"
                  onClick={handleDelete}
                  className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-300 hover:text-red-200 text-sm rounded-lg transition-all flex items-center gap-1.5"
                  disabled={deleting || loading}
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  {deleting ? 'Deleting...' : 'Delete'}
                </button>
              )}
            </div>

            {/* Right side - Cancel/Save buttons */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-white/8 hover:bg-white/12 backdrop-blur-md border border-white/15 text-white text-sm rounded-lg transition-all shadow-lg ring-1 ring-white/5"
                disabled={loading || deleting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-gradient-to-br from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white text-sm rounded-lg transition-all font-semibold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loading || deleting}
              >
                {loading ? 'Saving...' : 'Save Content Pillar'}
              </button>
            </div>
          </div>
        </form>
          </div>

          {/* Right Panel - Dual Template Previews */}
          <div className="hidden lg:flex flex-col lg:col-span-3 h-full">
            <div className="flex items-center justify-between mb-3 border-b border-white/20 pb-3">
              <h3 className="text-lg font-semibold text-white">Template Previews</h3>
              <div className="text-xs text-white/60 capitalize">{dayKey} Templates • 1080×1920</div>
            </div>
            
            {/* Template Selection Buttons */}
            <div className="flex gap-2 mb-3">
              <button
                onClick={() => setSelectedTemplate('A')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  selectedTemplate === 'A'
                    ? 'bg-white/20 text-white border border-white/30'
                    : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white/80'
                }`}
              >
                Template A
              </button>
              <button
                onClick={() => setSelectedTemplate('B')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  selectedTemplate === 'B'
                    ? 'bg-white/20 text-white border border-white/30'
                    : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white/80'
                }`}
              >
                Template B
              </button>
            </div>
            
            {/* Dual Preview Panes */}
            <div className="flex-1 flex gap-2">
              {/* Template A Preview */}
              <div className="flex-1 bg-white/5 rounded-xl border border-white/10 overflow-hidden p-1">
                <div className="text-xs text-white/60 mb-1 text-center">Template A</div>
              {formData.title || formData.description ? (
                <div className="w-full h-full flex items-center justify-center overflow-hidden">
                    <div style={{ position: 'relative', width: '648px', height: '1152px' }}>
                    <iframe
                        ref={iframeRefA}
                        key={`A-${dayKey}-${formData.title}-${formData.description}-${Date.now()}`}
                        srcDoc={generateLivePreviewHTML('A')}
                      className="border-0 rounded-lg shadow-lg"
                        style={{ position: 'absolute', top: 0, left: 0, width: '1080px', height: '1920px', transform: 'scale(0.6)', transformOrigin: 'top left' }}
                        title="Template A Preview"
                    />
                  </div>
                </div>
              ) : (
                  <div className="flex items-center justify-center h-full text-center text-white/60 p-4">
                  <div>
                      <Eye className="w-12 h-12 mx-auto mb-2 text-white/20" />
                      <p className="text-sm font-medium mb-1">Template A</p>
                      <p className="text-xs">Start typing to preview</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Template B Preview */}
              <div className="flex-1 bg-white/5 rounded-xl border border-white/10 overflow-hidden p-1">
                <div className="text-xs text-white/60 mb-1 text-center">Template B</div>
                {formData.title || formData.description ? (
                  <div className="w-full h-full flex items-center justify-center overflow-hidden">
                    <div style={{ position: 'relative', width: '648px', height: '1152px' }}>
                      <iframe
                        ref={iframeRefB}
                        key={`B-${dayKey}-${formData.title}-${formData.description}-${Date.now()}`}
                        srcDoc={generateLivePreviewHTML('B')}
                        className="border-0 rounded-lg shadow-lg"
                        style={{ position: 'absolute', top: 0, left: 0, width: '1080px', height: '1920px', transform: 'scale(0.6)', transformOrigin: 'top left' }}
                        title="Template B Preview"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-center text-white/60 p-4">
                    <div>
                      <Eye className="w-12 h-12 mx-auto mb-2 text-white/20" />
                      <p className="text-sm font-medium mb-1">Template B</p>
                      <p className="text-xs">Start typing to preview</p>
                  </div>
                </div>
              )}
              </div>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}
