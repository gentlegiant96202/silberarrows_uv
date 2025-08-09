'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { MarketingTask } from '@/types/marketing';
import { Trash2, FileText, Video, Image as ImageIcon, Plus, Play } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import dayjs from 'dayjs';

// PDF conversion is currently disabled (dependency issues). Return empty list.
const convertPdfToImages = async (_file: File): Promise<Array<{blob: Blob, name: string, pageIndex: number, dataURL: string}>> => {
  return [];
};

interface AddTaskModalProps {
  task?: MarketingTask | null;
  onSave: (task: Partial<MarketingTask>) => Promise<MarketingTask | null>;
  onClose: () => void;
  onDelete?: (taskId: string) => void;
  isAdmin?: boolean;
}

interface FileWithThumbnail {
  file: File;
  thumbnail?: string;
  uploadProgress: number;
  uploading: boolean;
  uploaded: boolean;
  error?: string;
}



export default function AddTaskModal({ task, onSave, onClose, onDelete, isAdmin = false }: AddTaskModalProps) {
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [hasActiveUpload, setHasActiveUpload] = useState(false);
  const [formData, setFormData] = useState({
    title: task?.title || '',
    description: task?.description || '',
    due_date: task?.due_date || '',
    requested_by: task?.assignee || '',
    caption: task?.description || '', // We'll use description field for caption for now
    status: (task?.status || 'intake') as MarketingTask['status'],
    task_type: (task?.task_type || 'design') as MarketingTask['task_type'],
  });

  const [selectedFiles, setSelectedFiles] = useState<FileWithThumbnail[]>([]);
  const [existingMedia, setExistingMedia] = useState<any[]>(task?.media_files || []);

  // Drag and drop state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [failedThumbnails, setFailedThumbnails] = useState<Set<number>>(new Set());

  // Check if caption should be visible (not in planned or intake)
  const showCaption = formData.status !== 'planned' && formData.status !== 'intake';

  // Filter for different file types (similar to MarketingWorkspace)
  const imageFiles = useMemo(() => {
    return existingMedia.filter((file: any) => {
      if (typeof file === 'string') {
        return file.match(/\.(jpe?g|png|gif|webp)$/i);
      }
      return file.type?.startsWith('image/') || 
             file.originalType === 'application/pdf' ||
             file.name?.match(/\.(jpe?g|png|gif|webp)$/i);
    });
  }, [existingMedia, refreshKey]);

  const videoFiles = useMemo(() => {
    return existingMedia.filter((file: any) => {
      if (typeof file === 'string') {
        return file.match(/\.(mp4|mov|avi|webm|mkv)$/i);
      }
      return file.type?.startsWith('video/') || file.name?.match(/\.(mp4|mov|avi|webm|mkv)$/i);
    });
  }, [existingMedia, refreshKey]);

  const pdfFiles = useMemo(() => {
    return existingMedia.filter((file: any) => {
      if (typeof file === 'string') {
        return file.match(/\.pdf$/i);
      }
      return (file.type === 'application/pdf' || file.name?.match(/\.pdf$/i)) && 
             !file.originalType;
    });
  }, [existingMedia, refreshKey]);

  // Combine all files for navigation - maintain original order!
  const allViewableFiles = useMemo(() => {
    const viewableInOriginalOrder = existingMedia.filter((file: any) => {
      if (typeof file === 'string') {
        return file.match(/\.(jpe?g|png|gif|webp|mp4|mov|avi|webm|mkv|pdf)$/i);
      }
      return file.type?.startsWith('image/') || 
             file.type?.startsWith('video/') || 
             file.type === 'application/pdf' ||
             file.originalType === 'application/pdf' ||
             file.name?.match(/\.(jpe?g|png|gif|webp|mp4|mov|avi|webm|mkv|pdf)$/i);
    });
    return viewableInOriginalOrder;
  }, [existingMedia, refreshKey]);

  // Create mapping between viewable files and original media files indices
  const viewableToMediaMapping = useMemo(() => {
    const mapping: number[] = [];
    allViewableFiles.forEach((viewableFile: any, viewableIndex: number) => {
      const originalIndex = existingMedia.findIndex((mediaFile: any, mediaIndex: number) => {
        const viewableUrl = typeof viewableFile === 'string' ? viewableFile : viewableFile.url;
        const mediaUrl = typeof mediaFile === 'string' ? mediaFile : mediaFile.url;
        return viewableUrl === mediaUrl;
      });
      if (originalIndex !== -1) {
        mapping.push(originalIndex);
      }
    });
    return mapping;
  }, [existingMedia, allViewableFiles, refreshKey]);

  // Reset failed thumbnails when media files change
  useEffect(() => {
    setFailedThumbnails(new Set());
  }, [existingMedia, refreshKey]);

  // Drag and drop handlers (from MarketingWorkspace)
  const handleThumbnailDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
    
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '0.5';
    }
  };

  const handleThumbnailDragEnd = (e: React.DragEvent) => {
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '1';
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleThumbnailDragOver = (e: React.DragEvent, targetIndex: number) => {
    if (draggedIndex === null) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIndex !== targetIndex) {
      setDragOverIndex(targetIndex);
    }
  };

  const handleThumbnailDragEnter = (e: React.DragEvent, targetIndex: number) => {
    if (draggedIndex === null) return;
    e.preventDefault();
  };

  const handleThumbnailDragLeave = (e: React.DragEvent, targetIndex: number) => {
    if (draggedIndex === null) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      if (dragOverIndex === targetIndex) {
        setDragOverIndex(null);
      }
    }
  };

  const handleThumbnailDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverIndex(null);
    
    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null);
      return;
    }

    try {
      const draggedMediaIndex = viewableToMediaMapping[draggedIndex];
      const targetMediaIndex = viewableToMediaMapping[targetIndex];
      
      if (draggedMediaIndex === undefined || targetMediaIndex === undefined) {
        setDraggedIndex(null);
        return;
      }

      const newMediaFiles = [...existingMedia];
      const draggedItem = newMediaFiles[draggedMediaIndex];
      
      // Remove from old position
      newMediaFiles.splice(draggedMediaIndex, 1);
      
      // Calculate correct insertion index
      let insertIndex = targetMediaIndex;
      if (draggedMediaIndex < targetMediaIndex) {
        insertIndex = targetMediaIndex - 1;
      } else {
        insertIndex = targetMediaIndex;
      }
      
      // Insert at new position
      newMediaFiles.splice(insertIndex, 0, draggedItem);

      // Update state
      setExistingMedia(newMediaFiles);
      setRefreshKey(prev => prev + 1);
      setDraggedIndex(null);
      
      // Update database if editing existing task
      if (task?.id) {
        supabase
          .from('design_tasks')
          .update({ media_files: newMediaFiles })
          .eq('id', task.id)
          .then(({ error }) => {
            if (error) {
              console.error('Failed to update media files order:', error);
            }
          });
      }
    } catch (error) {
      console.error('Error during drop:', error);
      setDraggedIndex(null);
    }
  };

  // Helper functions for file URLs and types
  const getImageUrl = (file: any): string => {
    if (typeof file === 'string') return file;
    return file.url || (file.file ? URL.createObjectURL(file.file) : '');
  };

  // Helper function to get proper video URL
  const getVideoUrl = (file: any): string => {
    if (typeof file === 'string') return file;
    return file.url || (file.file ? URL.createObjectURL(file.file) : '');
  };

  // Helper function to get proper file URL for downloads
  const getOriginalFileUrl = (file: any) => {
    return typeof file === 'string' ? file : file.url;
  };

  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title || '',
        description: task.description || '',
        due_date: task.due_date || '',
        requested_by: task.assignee || '',
        caption: task.description || '', // We'll use description field for caption for now
        status: task.status || 'intake',
        task_type: task.task_type || 'design',
      });
      setExistingMedia(task.media_files || []);
    } else {
      setExistingMedia([]);
    }
  }, [task]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Check browser WebP support with more robust detection
  const supportsWebP = (): boolean => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 2;
      canvas.height = 1;
      const ctx = canvas.getContext('2d');
      if (!ctx) return false;
      
      // Draw a simple pixel to test actual encoding
      ctx.fillStyle = '#FF0000';
      ctx.fillRect(0, 0, 1, 1);
      
      const webpDataUrl = canvas.toDataURL('image/webp', 0.8);
      
      // Check if WebP is actually supported by looking at the data URL format
      const isWebP = webpDataUrl.indexOf('data:image/webp') === 0 && webpDataUrl.length > 100;
      
      return isWebP;
    } catch (error) {
      console.warn('WebP detection failed:', error);
      return false;
    }
  };

  // Generate thumbnail for different file types
  const generateThumbnail = async (file: File): Promise<string> => {
    if (file.type.startsWith('application/pdf')) {
      try {
        const pageImages = await convertPdfToImages(file);
        if (Array.isArray(pageImages) && pageImages.length > 0 && pageImages[0]?.dataURL) {
          return pageImages[0].dataURL; // First page preview
        }
      } catch {}
      // Fallback: no client-side PDF thumbnail (server generates thumbnail post-upload)
      return '';
    }

    const useWebP = supportsWebP();
    const quality = 0.8;
    
    console.log(`📸 Generating thumbnail with ${useWebP ? 'WebP' : 'JPEG'} format for:`, file.name);

    return new Promise((resolve, reject) => {
      if (file.type.startsWith('image/')) {
        // Handle images - resize and compress
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Canvas context not available'));
            return;
          }

          // Calculate thumbnail dimensions (max 300px, maintain aspect ratio)
          const maxSize = 300;
          let { width, height } = img;
          if (width > height) {
            if (width > maxSize) {
              height = (height * maxSize) / width;
              width = maxSize;
            }
          } else {
            if (height > maxSize) {
              width = (width * maxSize) / height;
              height = maxSize;
            }
          }

          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(img, 0, 0, width, height);

          const format = useWebP ? 'image/webp' : 'image/jpeg';
          const dataURL = canvas.toDataURL(format, quality);
          resolve(dataURL);
        };
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = URL.createObjectURL(file);
      } else if (file.type.startsWith('video/')) {
        // Handle videos - capture first frame as thumbnail
        const video = document.createElement('video');
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Canvas context not available'));
          return;
        }

        let timeoutId: NodeJS.Timeout;
        let resolved = false;

        const cleanup = () => {
          if (timeoutId) clearTimeout(timeoutId);
          video.removeEventListener('loadedmetadata', onMetadataLoaded);
          video.removeEventListener('seeked', onSeeked);
          video.removeEventListener('error', onError);
          URL.revokeObjectURL(video.src);
        };

        const resolveOnce = (result: string) => {
          if (resolved) return;
          resolved = true;
          cleanup();
          resolve(result);
        };

        const rejectOnce = (error: Error) => {
          if (resolved) return;
          resolved = true;
          cleanup();
          reject(error);
        };

        const onMetadataLoaded = () => {
          console.log('📸 Video metadata loaded, seeking to first frame');
          // Set canvas size to video dimensions (scaled down)
          const maxSize = 300;
          let { videoWidth: width, videoHeight: height } = video;
          
          if (width > height) {
            if (width > maxSize) {
              height = (height * maxSize) / width;
              width = maxSize;
            }
          } else {
            if (height > maxSize) {
              width = (width * maxSize) / height;
              height = maxSize;
            }
          }

          canvas.width = width;
          canvas.height = height;
          
          // Seek to first frame (0.1 seconds to ensure we get a frame)
          video.currentTime = 0.1;
        };

        const onSeeked = () => {
          console.log('📸 Video seeked to first frame, capturing thumbnail');
          try {
            // Draw the current video frame to canvas
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            
            // Convert to data URL
            const format = useWebP ? 'image/webp' : 'image/jpeg';
            const dataURL = canvas.toDataURL(format, quality);
            
            console.log('📸 Video thumbnail generated successfully');
            resolveOnce(dataURL);
          } catch (error) {
            console.error('📸 Error capturing video frame:', error);
            rejectOnce(new Error('Failed to capture video frame'));
          }
        };

        const onError = (error: any) => {
          console.error('📸 Video error:', error);
          rejectOnce(new Error('Failed to load video for thumbnail'));
        };

        // Set up event listeners
        video.addEventListener('loadedmetadata', onMetadataLoaded);
        video.addEventListener('seeked', onSeeked);
        video.addEventListener('error', onError);

        // Timeout after 10 seconds
        timeoutId = setTimeout(() => {
          console.error('📸 Video thumbnail generation timeout');
          rejectOnce(new Error('Video thumbnail generation timeout'));
        }, 10000);

        // Load the video
        video.preload = 'metadata';
        video.crossOrigin = 'anonymous';
        video.src = URL.createObjectURL(file);
      } else {
        reject(new Error('Unsupported file type for thumbnail generation'));
      }
    });
  };

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

      // Get the current length before adding new files
      const currentLength = selectedFiles.length;
      setSelectedFiles(prev => [...prev, ...filesWithThumbnails]);

      // If editing existing task, upload immediately
      if (task?.id) {
        await uploadFilesToStorageImmediate(task.id, filesWithThumbnails, currentLength);
      }
    }
  };

  // Upload files immediately when selected (for existing tasks)
  const uploadFilesToStorageImmediate = async (taskId: string, filesToUpload: FileWithThumbnail[], startIndex: number) => {
    console.log('uploadFilesToStorageImmediate called with:', { taskId, fileCount: filesToUpload.length, startIndex });
    
    const { data: existing } = await supabase
      .from('design_tasks')
      .select('media_files')
      .eq('id', taskId)
      .single();

    if (!existing) {
      console.error('Task not found:', taskId);
      return;
    }

    const currentMedia: any[] = existing?.media_files || [];
    const newMedia: any[] = [];

    console.log('Setting uploading state for files starting at index', startIndex);

    // Update files to uploading state
    setSelectedFiles(prev => {
      const updated = prev.map((f, idx) => {
        if (idx >= startIndex) {
          console.log(`Setting file ${idx} (${f.file.name}) to uploading`);
          return { ...f, uploading: true, uploadProgress: 0 };
        }
        return f;
      });
      return updated;
    });
    setHasActiveUpload(true);

    // Process each file individually with real progress tracking
    for (let i = 0; i < filesToUpload.length; i++) {
      const fileWithThumbnail = filesToUpload[i];
      const file = fileWithThumbnail.file;
      const globalIndex = startIndex + i;
      console.log(`Processing file ${i + 1}/${filesToUpload.length}: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);
      
      try {
        // Use XMLHttpRequest for real progress tracking (small/medium files)
        const isVideo = file.type.startsWith('video/');
        const largeFile = file.size > 20 * 1024 * 1024; // >20MB
        let result: any;
        if (isVideo || largeFile) {
          // Bypass Next.js route for very large files to avoid 413; upload directly to Supabase
          const ext = file.name.split('.').pop();
          const fileName = `${crypto.randomUUID()}.${ext}`;
          const storagePath = `${taskId}/${fileName}`;
          const { error: upErr } = await supabase.storage
            .from('media-files')
            .upload(storagePath, file, { contentType: file.type, cacheControl: '3600', upsert: false });
          if (upErr) {
            throw new Error(upErr.message);
          }
          const { data: { publicUrl } } = supabase.storage
            .from('media-files')
            .getPublicUrl(storagePath);
          result = { success: true, fileUrl: publicUrl };
        } else {
          const formData = new FormData();
          formData.append('file', file);
          formData.append('taskId', taskId);

          const uploadPromise = new Promise<any>((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            
            // Track upload progress
            xhr.upload.addEventListener('progress', (event) => {
              if (event.lengthComputable) {
                const percentComplete = Math.round((event.loaded / event.total) * 100);
                setSelectedFiles(prev => prev.map((f, idx) => 
                  idx === globalIndex ? { ...f, uploadProgress: percentComplete } : f
                ));
              }
            });

            xhr.addEventListener('load', () => {
              if (xhr.status >= 200 && xhr.status < 300) {
                try {
                  const parsed = JSON.parse(xhr.responseText);
                  resolve(parsed);
                } catch (e) {
                  reject(new Error('Invalid JSON response'));
                }
              } else {
                reject(new Error(`HTTP ${xhr.status}: ${xhr.statusText}`));
              }
            });

            xhr.addEventListener('error', () => {
              reject(new Error('Network error during upload'));
            });

            xhr.addEventListener('timeout', () => {
              reject(new Error('Upload timeout'));
            });

            xhr.open('POST', '/api/upload-file');
            xhr.timeout = 300000; // 5 minutes
            xhr.send(formData);
          });

          result = await uploadPromise;
        }
         
        if (!result.success) {
          console.error('Upload error:', result.error);
          setSelectedFiles(prev => prev.map((f, idx) => idx === globalIndex ? { ...f, error: result.error, uploading: false, uploadProgress: 0 } : f));
          continue;
        }

        const newMediaItem = {
          url: result.fileUrl,
          name: file.name,
          type: file.type,
          size: file.size,
          uploadedAt: new Date().toISOString(),
          ...(result.thumbnailUrl ? { thumbnail: result.thumbnailUrl } : {}),
          // Include client-generated thumbnail for videos
          ...(fileWithThumbnail.thumbnail ? { thumbnail: fileWithThumbnail.thumbnail } : {})
        };
        
        newMedia.push(newMediaItem);
        setSelectedFiles(prev => prev.map((f, idx) => idx === globalIndex ? { ...f, uploadProgress: 100, uploading: false, uploaded: true } : f));
        setExistingMedia(prev => [...prev, newMediaItem]);
        console.log('✅ File upload completed:', file.name);
        
      } catch (error) {
        console.error('❌ Upload error for file', file.name, ':', error);
        setSelectedFiles(prev => prev.map((f, idx) => idx === globalIndex ? { 
          ...f, 
          error: error instanceof Error ? error.message : 'Upload failed', 
          uploading: false, 
          uploadProgress: 0 
        } : f));
      }
    }
    setHasActiveUpload(false);

    // Update database with all new media
    if (newMedia.length) {
      console.log('Updating database with', newMedia.length, 'new files');
      const updatedArray = [...currentMedia, ...newMedia];
      const { error: updErr } = await supabase
        .from('design_tasks')
        .update({ media_files: updatedArray })
        .eq('id', taskId);
      if (updErr) {
        console.error('Error updating media_files:', updErr);
      }
    }
  };

  // Upload remaining files when creating new task
  const uploadFilesToStorage = async (taskId: string) => {
    const filesToUpload = selectedFiles.filter(f => !f.uploaded);
    if (!filesToUpload.length) return;

    // Find the start index of unuploaded files
    const startIndex = selectedFiles.findIndex(f => !f.uploaded);
    await uploadFilesToStorageImmediate(taskId, filesToUpload, startIndex >= 0 ? startIndex : 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const taskData: Partial<MarketingTask> = {
        title: formData.title,
        status: formData.status,
        // Handle empty due_date by setting to undefined instead of empty string
        due_date: formData.due_date || undefined,
        assignee: formData.requested_by,
        task_type: formData.task_type,
        // Use caption field for description when visible, otherwise use description
        description: showCaption ? formData.caption : formData.description,
      };

      if (task) {
        taskData.id = task.id;
      }

      console.log('AddTaskModal - Form data:', formData);
      console.log('AddTaskModal - Sending task data:', taskData);

      const savedTask = await onSave(taskData);

      // If creating a new task and we have unuploaded files, upload them
      if (!task && savedTask && selectedFiles.some(f => !f.uploaded)) {
        await uploadFilesToStorage(savedTask.id);
      }
      // Close modal on successful save
      if (savedTask) {
        onClose();
      }
      
      // Reset form if creating new task
      if (!task) {
        setFormData({
          title: '',
          description: '',
          due_date: '',
          requested_by: '',
          caption: '',
          status: 'intake',
          task_type: 'design',
        });
        setSelectedFiles([]);
      }
    } catch (error) {
      console.error('Error saving task:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!task || !onDelete) return;
    
    if (confirm('Are you sure you want to delete this task? This action cannot be undone.')) {
      setDeleting(true);
      try {
        await onDelete(task.id);
        onClose();
      } catch (error) {
        console.error('Error deleting task:', error);
      } finally {
        setDeleting(false);
      }
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Get file type icon
  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) {
      return <ImageIcon className="w-6 h-6 text-white/60" />;
    } else if (file.type.startsWith('video/')) {
      return <Video className="w-6 h-6 text-white/60" />;
    } else if (file.type === 'application/pdf') {
      return <FileText className="w-6 h-6 text-gray-400" />;
    } else {
      return <FileText className="w-6 h-6 text-white/60" />;
    }
  };



  const handleDeleteExistingFile = async (file: any, index: number) => {
    if (!task?.id) return;
    // Remove confirm dialog if you want instant delete, or keep if you want confirmation
    // const confirmDelete = confirm('Are you sure you want to delete this file?');
    // if (!confirmDelete) return;
    try {
      // Get the original file URL (not thumbnail) for proper comparison
      const originalFileUrl = getOriginalFileUrl(file);
      // For videos with thumbnails, we need to delete both files from storage
      const filesToDeleteFromStorage: string[] = [];
      // Extract original file storage path
      const originalUrlParts = originalFileUrl.split('/storage/v1/object/public/media-files/');
      if (originalUrlParts.length > 1) {
        filesToDeleteFromStorage.push(originalUrlParts[1]);
      }
      // If this is a video with a thumbnail, also delete the thumbnail
      if (typeof file !== 'string' && file.thumbnail) {
        const thumbnailUrlParts = file.thumbnail.split('/storage/v1/object/public/media-files/');
        if (thumbnailUrlParts.length > 1) {
          filesToDeleteFromStorage.push(thumbnailUrlParts[1]);
        }
      }
      // Delete files from Supabase storage
      if (filesToDeleteFromStorage.length > 0) {
        const { error: storageError } = await supabase.storage
          .from('media-files')
          .remove(filesToDeleteFromStorage);
        if (storageError) {
          console.error('Storage deletion error:', storageError);
        }
      }
      // Remove from local state using original file URL for comparison
      const updatedMedia = existingMedia.filter((existingFile: any) => {
        const currentOriginalUrl = typeof existingFile === 'string' ? existingFile : existingFile.url;
        return currentOriginalUrl !== originalFileUrl;
      });
      setExistingMedia(updatedMedia);
      // Force refresh of computed arrays
      setRefreshKey(prev => prev + 1);
      // Update database
      const { error: dbError } = await supabase
        .from('design_tasks')
        .update({ media_files: updatedMedia })
        .eq('id', task.id);
      if (dbError) {
        console.error('Database update error:', dbError);
        // Revert local state if database update failed
        setExistingMedia(existingMedia);
      }
    } catch (error) {
      console.error('Delete error:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-2">
      <div className="bg-white/5 backdrop-blur-xl border border-white/20 rounded-xl p-5 w-full max-w-2xl text-xs relative max-h-[90vh] overflow-visible shadow-2xl ring-1 ring-white/10">
        <div className="flex justify-between items-center mb-6 border-b border-white/20 pb-4">
          <h2 className="text-2xl font-bold text-white">
            {task ? 'Edit Task' : 'Add New Task'}
          </h2>
          
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="text-white/60 hover:text-white text-2xl transition-colors duration-200"
            >
              ×
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3 overflow-y-auto pr-1">
          
          {/* Task Information */}
          <div className="bg-white/8 backdrop-blur-md rounded-xl p-4 border border-white/15 shadow-lg ring-1 ring-white/5">
            <div className="space-y-2.5">
              
              {/* Title */}
              <div>
                <label className="block text-xs font-medium text-white mb-1 flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  Title
                </label>
                <input
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-black/30 backdrop-blur-sm border border-white/15 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/40 focus:border-white/40 transition-all uppercase shadow-inner"
                  style={{ textTransform: 'uppercase' }}
                  placeholder="Enter task title"
                  required
                />
              </div>

              {/* Description (only show in intake) */}
              {!showCaption && (
              <div>
                <label className="block text-xs font-medium text-white mb-1 flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                    </svg>
                  Description
                </label>
                <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                  rows={3}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-black/30 backdrop-blur-sm border border-white/15 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/40 focus:border-white/40 transition-all resize-none shadow-inner"
                    placeholder="Enter task description and requirements"
                />
              </div>
              )}

              {/* Caption (only show when not in intake) */}
              {showCaption && (
                <div>
                  <label className="block text-xs font-medium text-white mb-1 flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                    </svg>
                    Caption
                  </label>
                  <textarea
                    name="caption"
                    value={formData.caption}
                    onChange={handleChange}
                    rows={3}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-black/30 backdrop-blur-sm border border-white/15 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/40 focus:border-white/40 transition-all resize-none shadow-inner"
                    placeholder="Enter social media caption"
                  />
                </div>
              )}

              {/* Due Date and Requested By in row */}
              <div className="grid grid-cols-2 gap-1.5">
                <div>
                  <label className="block text-xs font-medium text-white mb-1 flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Due Date
                    {!isAdmin && (
                      <span className="text-xs text-red-400 flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        Admin Only
                      </span>
                    )}
                  </label>
                  <DatePicker
                    selected={formData.due_date ? new Date(formData.due_date) : null}
                    onChange={(date) => handleChange({
                      target: {
                        name: 'due_date',
                        value: date ? dayjs(date).format('YYYY-MM-DD') : ''
                      }
                    } as any)}
                    disabled={!isAdmin}
                    readOnly={!isAdmin}
                    dateFormat="dd/MM/yyyy"
                    popperPlacement="top-start"
                    className={`w-full px-3 py-2 text-xs rounded-lg bg-black/30 backdrop-blur-sm border border-white/15 text-white focus:outline-none focus:ring-2 focus:ring-white/40 focus:border-white/40 transition-all shadow-inner ${!isAdmin ? 'opacity-60 cursor-not-allowed' : ''}`}
                    wrapperClassName="w-full"
                    placeholderText={isAdmin ? "Select due date" : "Only admins can edit due date"}
                    isClearable={isAdmin}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-white mb-1 flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Requested By
                  </label>
                  <input
                    name="requested_by"
                    value={formData.requested_by}
                    onChange={handleChange}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-black/30 backdrop-blur-sm border border-white/15 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/40 focus:border-white/40 transition-all uppercase shadow-inner"
                    placeholder="Enter requester name"
                  />
                </div>
              </div>

              {/* Task Type */}
              <div>
                <label className="block text-xs font-medium text-white mb-1 flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  Task Type
                </label>
                <select
                  name="task_type"
                  value={formData.task_type}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-black/30 backdrop-blur-sm border border-white/15 text-white focus:outline-none focus:ring-2 focus:ring-white/40 focus:border-white/40 transition-all shadow-inner"
                >
                  <option value="design" className="bg-black text-white">Design Task</option>
                  <option value="photo" className="bg-black text-white">Photo Task</option>
                  <option value="video" className="bg-black text-white">Video Task</option>
                </select>
              </div>

            </div>
          </div>

          {/* File Upload */}
          <div className="bg-white/8 backdrop-blur-md rounded-xl p-4 border border-white/15 shadow-lg ring-1 ring-white/5">
            <div className="space-y-2.5">
              <div>
                <label className="block text-xs font-medium text-white mb-1 flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  File Upload <span className="text-white/40 font-normal">(optional)</span>
                </label>

                {/* File input */}
                <div className="relative">
                  <input
                    type="file"
                    multiple
                    onChange={handleFileChange}
                    className="hidden"
                    id="file-upload"
                    accept="image/*,video/*,.pdf,.doc,.docx,.txt,.mp4,.mov,.avi,.webm,.mkv"
                  />
                  <label
                    htmlFor="file-upload"
                    className="w-full h-12 flex items-center justify-center px-3 gap-2 rounded-lg border-2 border-dashed border-white/25 bg-black/30 backdrop-blur-sm text-[10px] text-white/70 cursor-pointer transition-all hover:border-white/40 hover:bg-black/40 shadow-inner ring-1 ring-white/5"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <span>Upload images, videos, PDFs and documents</span>
                  </label>
                </div>

                {/* Selected files with thumbnails and progress */}
                {selectedFiles.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3 max-h-32 overflow-y-auto">
                    {selectedFiles.map((fileWithThumbnail, index) => {
                      const { file, thumbnail, uploadProgress, uploading, uploaded, error } = fileWithThumbnail;
                      const isImage = file.type.startsWith('image/');
                      
                      return (
                        <div key={index} className="flex-shrink-0 w-64 flex items-center gap-2 p-2 bg-black/30 backdrop-blur-sm border border-white/15 rounded-lg shadow-inner ring-1 ring-white/5">
                          {/* Thumbnail or file icon */}
                                                      <div className="flex-shrink-0 w-10 h-10 rounded overflow-hidden bg-white/5 flex items-center justify-center">
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

                          {/* File info and progress */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-white text-[10px] truncate">{file.name}</span>
                              <span className="text-white/40 text-[9px] flex-shrink-0">
                                {(file.size / 1024 / 1024).toFixed(1)} MB
                              </span>
                            </div>
                            

                            
                            {/* Status */}
                            <div className="text-[9px]">
                              {error ? (
                                <span className="text-red-400">{error}</span>
                              ) : uploaded ? (
                                <span className="text-green-400">✓ Uploaded</span>
                              ) : uploading ? (
                                <div className="space-y-1">
                                  <span className="text-indigo-400">Uploading... {uploadProgress}%</span>
                                  <div className="w-full h-1 bg-white/10 rounded overflow-hidden">
                                    <div
                                      className="h-full bg-gradient-to-r from-blue-400 to-blue-600 transition-all duration-300 ease-out"
                                      style={{ width: `${uploadProgress}%` }}
                                    />
                                  </div>
                                </div>
                              ) : (
                                <span className="text-white/50">Ready to upload</span>
                              )}
                            </div>
                          </div>

                          {/* Remove button */}
                          {!uploading && (
                            <button
                              type="button"
                              onClick={() => removeFile(index)}
                              className="text-white/70 hover:text-white text-xs leading-none flex-shrink-0 w-6 h-6 flex items-center justify-center"
                            >
                              ×
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Overall upload progress */}
                {selectedFiles.some(f => f.uploading) && (
                  <div className="mt-2">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[10px] text-white/70">Uploading Files...</span>
                      <span className="text-[10px] text-white/70">
                        {selectedFiles.filter(f => f.uploaded).length} / {selectedFiles.length}
                      </span>
                    </div>
                    <div className="w-full h-2 bg-white/10 rounded overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-green-400 to-green-600 transition-all"
                        style={{ 
                          width: `${(selectedFiles.filter(f => f.uploaded).length / selectedFiles.length) * 100}%` 
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Existing media files with MarketingWorkspace-style thumbnails */}
                {allViewableFiles.length > 0 && (
                  <div className="mt-3">
                    <span className="text-[10px] text-white/50 mb-2 block">Media Files ({allViewableFiles.length})</span>
                    
                    {/* Horizontal Thumbnail Grid with Wrapping */}
                    <div 
                      className="flex flex-wrap gap-3 overflow-y-auto pb-2 mb-4 scrollbar-hide max-h-32" 
                      style={{ 
                        scrollbarWidth: 'none', 
                        msOverflowStyle: 'none'
                      }}
                    >
                      {allViewableFiles.map((file: any, index: number) => {
                        const isVideo = typeof file === 'string' ? 
                          file.match(/\.(mp4|mov|avi|webm|mkv)$/i) :
                          file.type?.startsWith('video/') || file.name?.match(/\.(mp4|mov|avi|webm|mkv)$/i);
                        const isPdf = typeof file === 'string' ? 
                          file.match(/\.pdf$/i) :
                          (file.type === 'application/pdf' || file.name?.match(/\.pdf$/i)) && !file.originalType;
                        const isConvertedPdf = typeof file === 'string' ? false : file.originalType === 'application/pdf';
                        
                        // Generate stable key for React rendering
                        const stableKey = typeof file === 'string' 
                          ? `${file}-${index}-${refreshKey}` 
                          : `${file.url || file.name}-${index}-${refreshKey}`;
                        
                        return (
                          <div
                            key={stableKey}
                            data-thumbnail-draggable="true"
                            draggable={true}
                            onDragStart={(e) => handleThumbnailDragStart(e, index)}
                            onDragEnd={handleThumbnailDragEnd}
                            onDragOver={(e) => handleThumbnailDragOver(e, index)}
                            onDragEnter={(e) => handleThumbnailDragEnter(e, index)}
                            onDragLeave={(e) => handleThumbnailDragLeave(e, index)}
                            onDrop={(e) => handleThumbnailDrop(e, index)}
                            className={`relative group aspect-square rounded-lg overflow-hidden transition-all cursor-pointer flex-shrink-0 w-16 h-16 hover:ring-1 hover:ring-white/20 ${
                              draggedIndex === index ? 'opacity-30 scale-95 rotate-3' : ''
                            } ${
                              dragOverIndex === index && draggedIndex !== index ? 'ring-2 ring-blue-400 scale-105' : ''
                            }`}
                          >
                            <div className="w-full h-full bg-white/5 relative">
                              {isVideo ? (
                                // Show video thumbnail that was generated during file selection
                                typeof file === 'string' ? (
                                  <div className="w-full h-full flex items-center justify-center bg-black/50">
                                    <Video className="w-4 h-4 text-white/60" />
                                  </div>
                                ) : file.thumbnail && !failedThumbnails.has(index) ? (
                                  <img
                                    src={file.thumbnail}
                                    alt={`Video thumbnail ${index + 1}`}
                                    className="w-full h-full object-cover"
                                    onError={() => {
                                      setFailedThumbnails(prev => new Set(prev).add(index));
                                    }}
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center bg-black/50">
                                    <Video className="w-4 h-4 text-white/60" />
                                  </div>
                                )
                              ) : isPdf || isConvertedPdf ? (
                                <div className="w-full h-full flex items-center justify-center bg-white/10">
                                  <FileText className="w-4 h-4 text-gray-400" />
                                </div>
                              ) : (
                                <img
                                  src={getImageUrl(file)}
                                  alt={`Media ${index + 1}`}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                  }}
                                />
                              )}
                              
                              {/* Media type indicators */}
                              {isVideo && (
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                  <div className="bg-black/60 backdrop-blur-sm rounded-full p-1">
                                    <Play className="w-2 h-2 text-white fill-white" />
                                  </div>
                                </div>
                              )}
                              
                              {(isPdf || isConvertedPdf) && (
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                  <div className="bg-white/20 backdrop-blur-sm rounded-full p-1">
                                    <FileText className="w-2 h-2 text-white" />
                                  </div>
                                </div>
                              )}
                              
                              {/* Delete button */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const originalIndex = viewableToMediaMapping[index];
                                  if (originalIndex !== undefined) {
                                    handleDeleteExistingFile(existingMedia[originalIndex], originalIndex);
                                  }
                                }}
                                className="absolute top-1 right-1 p-0.5 bg-black/80 hover:bg-black backdrop-blur-sm rounded-full text-white opacity-0 group-hover:opacity-100 transition-all duration-200"
                                title="Delete file"
                              >
                                <Trash2 className="w-2 h-2" />
                              </button>
                              
                              {/* Index indicator */}
                              <div className="absolute bottom-1 left-1 bg-black/60 backdrop-blur-sm rounded px-1 py-0.5">
                                <div className="text-white text-[10px] font-medium">#{index + 1}</div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-between items-center pt-2">
            {/* Delete button (only show for existing tasks) */}
            <div>
              {task && onDelete && (
            <button
              type="button"
                  onClick={handleDelete}
                  className="px-2 py-1 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-300 hover:text-red-200 text-xs rounded transition-all flex items-center gap-1.5"
                  disabled={deleting}
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  {deleting ? 'Deleting...' : 'Delete'}
            </button>
              )}
            </div>

            {/* Save/Cancel buttons */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-white/8 hover:bg-white/12 backdrop-blur-md border border-white/15 text-white text-xs rounded-lg transition-all shadow-lg ring-1 ring-white/5"
                disabled={loading || deleting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-gradient-to-br from-gray-300 via-gray-400 to-gray-500 hover:from-gray-400 hover:via-gray-500 hover:to-gray-600 text-black text-xs rounded-lg transition-all font-semibold shadow-lg"
                disabled={loading || deleting || hasActiveUpload}
              >
                {loading ? 'Saving...' : (task ? 'Update' : 'Create')} Task
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
} 