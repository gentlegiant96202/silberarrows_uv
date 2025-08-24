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
  const [formData, setFormData] = useState({
    title: editingItem?.title || aiGeneratedContent?.title || '',
    description: editingItem?.description || aiGeneratedContent?.description || '',
    content_type: editingItem?.content_type || aiGeneratedContent?.content_type || 'image' as const,
    badgeText: editingItem?.badge_text || (dayKey === 'monday' ? 'MYTH BUSTER MONDAY' : dayKey.toUpperCase()),
    subtitle: editingItem?.subtitle || (dayKey === 'monday' ? 'Independent Mercedes Service' : 'Premium Selection'),
    imageAlignment: 'center' as 'left' | 'center' | 'right',
    imageFit: 'cover' as 'cover' | 'contain' | 'fill',
  });

  // Create ref for the live preview iframe
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Update form data when editingItem or aiGeneratedContent changes
  useEffect(() => {
    setFormData({
      title: editingItem?.title || aiGeneratedContent?.title || '',
      description: editingItem?.description || aiGeneratedContent?.description || '',
      content_type: editingItem?.content_type || aiGeneratedContent?.content_type || 'image' as const,
      badgeText: editingItem?.badge_text || (dayKey === 'monday' ? 'MYTH BUSTER MONDAY' : dayKey.toUpperCase()),
      subtitle: editingItem?.subtitle || (dayKey === 'monday' ? 'Independent Mercedes Service' : 'Premium Selection'),
      imageAlignment: 'center' as 'left' | 'center' | 'right',
      imageFit: 'cover' as 'cover' | 'contain' | 'fill',
    });
    setExistingMedia(editingItem?.media_files || []);
    setSelectedFiles([]);
  }, [editingItem, aiGeneratedContent]);

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
    if (!formData.title || !formData.description || !dayKey) {
      alert('Please fill in title and description first');
      return;
    }

    // No need to check iframe since we're generating HTML directly

    setGeneratingTemplate(true);
    
    try {
      console.log('🎨 Generating template image from live preview...');
      
      // Instead of capturing from iframe, generate the HTML directly
      // This avoids any browser duplication issues
      const htmlContent = generateLivePreviewHTML();
      
      console.log('📄 Generated HTML directly, length:', htmlContent.length);

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
        throw new Error('Failed to generate template image');
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to generate template');
      }

      onGeneratedImageChange?.(result.imageBase64);
      
      // Auto-save the generated image as a media file
      await saveGeneratedImageAsFile(result.imageBase64);
      
      console.log('✅ Template image generated successfully from live preview');
      
    } catch (error) {
      console.error('❌ Error generating template:', error);
      alert('Failed to generate template image. Please try again.');
    } finally {
      setGeneratingTemplate(false);
    }
  };

  // Save generated image as a file in the task
  const saveGeneratedImageAsFile = async (imageBase64: string) => {
    try {
      // Convert base64 to blob
      const response = await fetch(`data:image/png;base64,${imageBase64}`);
      const blob = await response.blob();
      
      // Create a File object
      const fileName = `template_${formData.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${dayKey}_${Date.now()}.png`;
      const file = new File([blob], fileName, { type: 'image/png' });
      
      // Generate thumbnail for the file
      const thumbnail = await generateThumbnail(file);
      
      // Add to selected files
      const fileWithThumbnail: FileWithThumbnail = {
        file,
        thumbnail,
        uploadProgress: 100,
        uploading: false,
        uploaded: true
      };
      
      setSelectedFiles(prev => [...prev, fileWithThumbnail]);
      
      console.log('✅ Generated image added to task files');
      
      // Show a brief success message
      const successMsg = document.createElement('div');
      successMsg.textContent = '✅ Template image added to files';
      successMsg.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50';
      document.body.appendChild(successMsg);
      setTimeout(() => {
        document.body.removeChild(successMsg);
      }, 3000);
    } catch (error) {
      console.error('❌ Error saving generated image as file:', error);
    }
  };

  // Generate live preview HTML (client-side template rendering)
  const generateLivePreviewHTML = () => {
    const imageUrl = selectedFiles[0]?.thumbnail || 
                    existingMedia[0]?.url || 
                    'https://res.cloudinary.com/dw0ciqgwd/image/upload/v1748497977/qgdbuhm5lpnxuggmltts.png';

    // Get the template based on day
    const templates = {
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
          .image-section { position: relative; width: 100%; height: 50%; }
          .background-image { width: 100%; height: 100%; object-fit: ${formData.imageFit}; object-position: ${formData.imageAlignment}; }
          .badge-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; }
          .badge { background: linear-gradient(135deg, #f8fafc, #e2e8f0, #cbd5e1); color: #000; padding: 16px 32px; border-radius: 25px; font-weight: 900; font-size: 24px; text-transform: uppercase; letter-spacing: 0.8px; white-space: nowrap; display: inline-flex; align-items: center; box-shadow: 0 6px 20px rgba(255,255,255,0.1); border: 2px solid rgba(255,255,255,0.2); }
          .content { padding: 40px; height: 50%; display: flex; flex-direction: column; justify-content: flex-start; gap: 16px; overflow: visible; }
          .title { font-size: 68px; font-weight: 900; color: #ffffff; line-height: 1.1; text-shadow: 0 2px 4px rgba(0,0,0,0.3); margin-bottom: 12px; }
          .subtitle { font-size: 42px; color: #f1f5f9; margin-bottom: 16px; font-weight: 600; text-shadow: 0 2px 4px rgba(0,0,0,0.2); }
          .description { font-size: 36px; color: #f1f5f9; line-height: 1.5; text-align: left; margin: 16px 0; max-width: 96%; text-shadow: 0 1px 2px rgba(0,0,0,0.2); font-weight: 500; }
          .company-logo-inline { height: 96px; width: auto; filter: brightness(1.3) drop-shadow(0 2px 4px rgba(0,0,0,0.3)); margin-top: 4px; flex-shrink: 0; }
          .contact { position: fixed; left: 40px; right: 40px; bottom: 20px; z-index: 5; display: flex; align-items: center; justify-content: center; gap: 16px; background: rgba(255,255,255,0.15); border: 2px solid rgba(255,255,255,0.3); padding: 24px 32px; border-radius: 20px; backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); font-weight: 800; font-size: 28px; box-shadow: 0 8px 32px rgba(0,0,0,0.2); }
          .contact i { color: #ffffff; font-size: 26px; }
        </style>
        <div class="content-card">
          <div class="image-section">
            <img src="${imageUrl}" class="background-image" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src='https://images.unsplash.com/photo-1619767886558-efdc259cde1f?auto=format&fit=crop&w=1080&h=720&q=80';" />
          </div>
          <div class="content">
            <div class="badge-row">
              <div class="badge"><i class="fas fa-star" style="margin-right:6px;"></i> ${formData.badgeText}</div>
              <img src="https://res.cloudinary.com/dw0ciqgwd/image/upload/v1748497977/qgdbuhm5lpnxuggmltts.png" alt="SilberArrows Logo" class="company-logo-inline" referrerpolicy="no-referrer" onerror="this.onerror=null;this.style.display='none';" />
            </div>
            <div>
              <h1 class="title">${formData.title || 'Your Title Here'}</h1>
              <p class="subtitle">${formData.subtitle}</p>
              <div class="description">${formData.description || 'Your description will appear here...'}</div>
            </div>
            <div class="contact"><i class="fas fa-phone"></i> <i class="fab fa-whatsapp"></i> Call or WhatsApp us at +971 4 380 5515</div>
          </div>
        </div>
        </body>
        </html>`,
      
      tuesday: `
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Inter', sans-serif; background: linear-gradient(135deg, #1e3a8a, #3b82f6); color: #ffffff; height: 100vh; overflow: hidden; }
          .content-card { display: grid; grid-template-rows: auto 1fr; height: 100vh; }
          .header { padding: 25px; text-align: center; background: rgba(0,0,0,0.2); }
          .badge { background: linear-gradient(135deg, #f59e0b, #d97706); color: white; padding: 10px 20px; border-radius: 20px; font-weight: 700; margin-bottom: 15px; display: inline-block; }
          .title { font-size: 2.2rem; font-weight: 700; }
          .main { display: grid; grid-template-columns: 1fr 1fr; height: 100%; }
          .image-panel { background: #000; position: relative; }
          .content-image { width: 100%; height: 100%; object-fit: cover; opacity: 0.9; }
          .info-panel { padding: 30px; display: flex; flex-direction: column; justify-content: center; background: rgba(255,255,255,0.05); }
          .description { font-size: 1.1rem; margin-bottom: 25px; }
          .steps { margin-bottom: 25px; }
          .step { display: flex; gap: 15px; margin-bottom: 15px; padding: 15px; background: rgba(255,255,255,0.08); border-radius: 10px; }
          .step-num { background: #f59e0b; color: white; width: 25px; height: 25px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; }
          .brand { display: flex; justify-content: space-between; align-items: center; padding-top: 15px; border-top: 1px solid rgba(255,255,255,0.2); }
        </style>
        <div class="content-card">
          <div class="header">
            <div class="badge">🎓 TUESDAY TUTORIAL</div>
            <h1 class="title">${formData.title || 'Your Title Here'}</h1>
          </div>
          <div class="main">
            <div class="image-panel">
              <img src="${imageUrl}" class="content-image" />
            </div>
            <div class="info-panel">
              <p class="description">${formData.description || 'Your description will appear here...'}</p>
              <div class="steps">
                <div class="step"><div class="step-num">1</div><div><strong>Learn</strong><br>Understanding basics</div></div>
                <div class="step"><div class="step-num">2</div><div><strong>Practice</strong><br>Hands-on experience</div></div>
                <div class="step"><div class="step-num">3</div><div><strong>Master</strong><br>Expert techniques</div></div>
              </div>
              <div class="brand">
                <div style="font-weight: 700;">SILBERARROWS</div>
                <div>📞 +971 4 380 5515</div>
              </div>
            </div>
          </div>
        </div>`,
      
      // Add more days with simplified templates
      wednesday: `
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Inter', sans-serif; background: linear-gradient(135deg, #065f46, #10b981); color: #ffffff; height: 100vh; overflow: hidden; }
          .content-card { position: relative; width: 100%; height: 100vh; }
          .background-image { position: absolute; width: 100%; height: 100%; object-fit: cover; opacity: 0.6; }
          .overlay { position: absolute; width: 100%; height: 100%; background: linear-gradient(135deg, rgba(6,95,70,0.9), rgba(16,185,129,0.7)); }
          .content { position: relative; z-index: 2; height: 100%; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; padding: 40px; }
          .badge { background: rgba(255,255,255,0.15); padding: 12px 25px; border-radius: 25px; font-weight: 700; margin-bottom: 20px; }
          .title { font-size: 3rem; font-weight: 700; margin-bottom: 15px; }
          .description { font-size: 1.3rem; margin-bottom: 30px; max-width: 600px; }
          .features { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 30px; width: 100%; max-width: 500px; }
          .feature { background: rgba(255,255,255,0.1); padding: 20px; border-radius: 12px; text-align: center; }
          .brand { display: flex; justify-content: space-between; align-items: center; width: 100%; max-width: 500px; }
        </style>
        <div class="content-card">
          <img src="${imageUrl}" class="background-image" />
          <div class="overlay"></div>
          <div class="content">
            <div class="badge">👁️ BEHIND THE SCENES</div>
            <h1 class="title">${formData.title || 'Your Title Here'}</h1>
            <p class="description">${formData.description || 'Your description will appear here...'}</p>
            <div class="features">
              <div class="feature">👥<br>Our Team</div>
              <div class="feature">⚙️<br>The Process</div>
              <div class="feature">❤️<br>Our Passion</div>
            </div>
            <div class="brand">
              <div style="font-weight: 700;">SILBERARROWS</div>
              <div>📞 +971 4 380 5515</div>
            </div>
          </div>
        </div>`,
      
      // Simplified templates for other days
      thursday: `<style>* { margin: 0; padding: 0; box-sizing: border-box; } body { font-family: 'Inter', sans-serif; background: linear-gradient(135deg, #7c2d12, #ea580c); color: #ffffff; height: 100vh; display: flex; align-items: center; justify-content: center; text-align: center; } .content { padding: 40px; } .badge { background: rgba(255,255,255,0.2); padding: 10px 20px; border-radius: 20px; margin-bottom: 20px; } .title { font-size: 3rem; font-weight: 700; margin-bottom: 15px; } .description { font-size: 1.2rem; margin-bottom: 25px; } .testimonial { background: rgba(255,255,255,0.15); padding: 25px; border-radius: 15px; margin-bottom: 20px; } .stars { color: #fbbf24; font-size: 1.5rem; margin-bottom: 10px; }</style><div class="content"><div class="badge">💬 CUSTOMER STORIES</div><h1 class="title">${formData.title || 'Your Title Here'}</h1><p class="description">${formData.description || 'Your description will appear here...'}</p><div class="testimonial"><div class="stars">⭐⭐⭐⭐⭐</div><p>"Exceptional service and premium quality!"</p></div><div>📞 +971 4 380 5515</div></div>`,
      
      friday: `<style>* { margin: 0; padding: 0; box-sizing: border-box; } body { font-family: 'Inter', sans-serif; background: linear-gradient(135deg, #7c3aed, #a855f7); color: #ffffff; height: 100vh; display: flex; align-items: center; justify-content: center; text-align: center; } .content { padding: 40px; } .badge { background: linear-gradient(135deg, #fbbf24, #f59e0b); padding: 12px 25px; border-radius: 25px; margin-bottom: 20px; } .title { font-size: 3rem; font-weight: 700; margin-bottom: 15px; } .description { font-size: 1.2rem; margin-bottom: 25px; } .features { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 25px; } .feature { background: rgba(255,255,255,0.15); padding: 20px; border-radius: 12px; }</style><div class="content"><div class="badge">🎉 FRIDAY CELEBRATION</div><h1 class="title">${formData.title || 'Your Title Here'}</h1><p class="description">${formData.description || 'Your description will appear here...'}</p><div class="features"><div class="feature">🏆<br>Achievement</div><div class="feature">⭐<br>Excellence</div><div class="feature">🚀<br>Success</div></div><div>📞 +971 4 380 5515</div></div>`,
      
      saturday: `<style>* { margin: 0; padding: 0; box-sizing: border-box; } body { font-family: 'Inter', sans-serif; background: linear-gradient(135deg, #0891b2, #06b6d4); color: #ffffff; height: 100vh; display: flex; align-items: center; justify-content: center; text-align: center; } .content { padding: 40px; } .badge { background: rgba(255,255,255,0.2); padding: 12px 25px; border-radius: 25px; margin-bottom: 20px; } .title { font-size: 3rem; font-weight: 700; margin-bottom: 15px; } .description { font-size: 1.2rem; margin-bottom: 25px; } .features { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-bottom: 25px; } .feature { background: rgba(255,255,255,0.15); padding: 25px; border-radius: 12px; }</style><div class="content"><div class="badge">☀️ WEEKEND LIFESTYLE</div><h1 class="title">${formData.title || 'Your Title Here'}</h1><p class="description">${formData.description || 'Your description will appear here...'}</p><div class="features"><div class="feature">❤️<br>Passion</div><div class="feature">👥<br>Community</div></div><div>📞 +971 4 380 5515</div></div>`,
      
      sunday: `<style>* { margin: 0; padding: 0; box-sizing: border-box; } body { font-family: 'Inter', sans-serif; background: linear-gradient(135deg, #581c87, #7c3aed); color: #ffffff; height: 100vh; display: flex; align-items: center; justify-content: center; text-align: center; } .content { padding: 40px; } .badge { background: rgba(255,255,255,0.2); padding: 12px 25px; border-radius: 25px; margin-bottom: 20px; } .title { font-size: 3rem; font-weight: 700; margin-bottom: 15px; } .description { font-size: 1.2rem; margin-bottom: 25px; font-style: italic; } .quote { background: rgba(255,255,255,0.1); padding: 25px; border-radius: 15px; margin-bottom: 25px; border-left: 4px solid #a855f7; } .features { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 25px; } .feature { background: rgba(255,255,255,0.1); padding: 15px; border-radius: 10px; }</style><div class="content"><div class="badge">🕊️ SUNDAY REFLECTION</div><h1 class="title">${formData.title || 'Your Title Here'}</h1><p class="description">${formData.description || 'Your description will appear here...'}</p><div class="quote">"Excellence is never an accident. It is always the result of high intention, sincere effort, and intelligent execution." — Aristotle</div><div class="features"><div class="feature">💡<br>Inspiration</div><div class="feature">🎯<br>Focus</div><div class="feature">🌱<br>Growth</div></div><div>📞 +971 4 380 5515</div></div>`
    };

    return templates[dayKey as keyof typeof templates] || templates.monday;
  };

  // Download generated image
  const downloadGeneratedImage = () => {
    if (!generatedImageBase64) return;
    
    const link = document.createElement('a');
    link.href = `data:image/png;base64,${generatedImageBase64}`;
    link.download = `${formData.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${dayKey}.png`;
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

      const contentPillarData: Partial<ContentPillarItem> = {
        title: formData.title,
        description: formData.description,
        content_type: formData.content_type,
        day_of_week: dayKey,
        media_files: [...existingMedia, ...mediaFiles],
        badge_text: formData.badgeText,
        subtitle: formData.subtitle,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await onSave(contentPillarData);
      onClose();
      
      // Reset form
      setFormData({
        title: '',
        description: '',
        content_type: 'image',
        badgeText: dayKey === 'monday' ? 'MYTH BUSTER MONDAY' : dayKey.toUpperCase(),
        subtitle: dayKey === 'monday' ? 'Independent Mercedes Service' : 'Premium Selection',
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
      <div className="bg-white/5 backdrop-blur-xl border border-white/20 rounded-xl p-6 w-full max-w-7xl text-xs relative h-[95vh] overflow-hidden shadow-2xl ring-1 ring-white/10">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 h-full">
          
          {/* Left Panel - Form */}
          <div className="overflow-y-auto lg:col-span-2">
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
        <form onSubmit={handleSubmit} className="space-y-4">
          
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
          {aiGeneratedContent && (
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
              <p className="text-xs text-white/70">
                This content was automatically generated for {dayTitle}. You can edit the title and description above before saving.
              </p>
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
                disabled={generatingTemplate || !formData.title || !formData.description}
                className="px-3 py-1.5 bg-gradient-to-br from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white text-xs rounded-lg transition-all font-semibold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {generatingTemplate ? (
                  <>
                    <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin"></div>
                    Saving Image...
                  </>
                ) : (
                  <>
                    <Download className="w-3 h-3" />
                    Save as Image
                  </>
                )}
              </button>
            </div>
            <p className="text-xs text-white/60 mb-2">
              Generate a high-quality 1080×1920 image and save it to your task files. See live preview on the right.
            </p>
            
            {generatedImageBase64 && (
              <div className="mt-4 p-3 bg-green-500/20 border border-green-500/30 rounded-lg">
                <div className="text-sm text-green-400 font-medium text-center mb-2">
                  ✅ High-quality image saved to task files
                </div>
                <div className="text-xs text-white/60 text-center mb-2">
                  1080 × 1920 • Instagram Story Format
                </div>
                <button
                  onClick={downloadGeneratedImage}
                  className="w-full px-3 py-1.5 bg-gradient-to-br from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white text-xs rounded-lg transition-all font-semibold shadow-lg flex items-center justify-center gap-2"
                >
                  <Download className="w-3 h-3" />
                  Download Copy
                </button>
              </div>
            )}
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

          {/* Right Panel - Full Size Live Preview */}
          <div className="hidden lg:flex flex-col lg:col-span-3">
            <div className="flex items-center justify-between mb-3 border-b border-white/20 pb-3">
              <h3 className="text-lg font-semibold text-white">Live Preview</h3>
              <div className="text-xs text-white/60 capitalize">{dayKey} Template • 1080×1920</div>
            </div>
            
            <div className="flex-1 bg-white/5 rounded-xl border border-white/10 overflow-hidden p-2">
              {formData.title || formData.description ? (
                <div className="w-full h-full flex items-center justify-center overflow-hidden">
                  <div style={{ position: 'relative', width: '810px', height: '1440px' }}>
                    <iframe
                      ref={iframeRef}
                      srcDoc={generateLivePreviewHTML()}
                      className="border-0 rounded-lg shadow-lg"
                      style={{ position: 'absolute', top: 0, left: 0, width: '1080px', height: '1920px', transform: 'scale(0.75)', transformOrigin: 'top left' }}
                      title="Live Template Preview"
                    />
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-center text-white/60 p-6">
                  <div>
                    <Eye className="w-20 h-20 mx-auto mb-4 text-white/20" />
                    <p className="text-xl font-medium mb-2">Live Preview</p>
                    <p className="text-sm mb-4 max-w-xs mx-auto">
                      Start typing your title and description to see a live preview of your {dayKey} content pillar
                    </p>
                    <div className="text-xs text-white/40">
                      Templates update in real-time as you type
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {generatedImageBase64 && (
              <div className="mt-3 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                <div className="text-sm text-green-400 font-medium text-center mb-2">
                  ✅ Generated image saved to task files
                </div>
                <button
                  onClick={downloadGeneratedImage}
                  className="w-full px-3 py-2 bg-gradient-to-br from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white text-sm rounded-lg transition-all font-semibold shadow-lg flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download Copy
                </button>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
