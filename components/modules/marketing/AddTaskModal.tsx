'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import dayjs from 'dayjs';
import { MarketingTask } from '@/types/marketing';
import { Trash2, FileText, Video, Image as ImageIcon } from 'lucide-react';

// PDF conversion is currently disabled (dependency issues). Return empty list.
const convertPdfToImages = async (_file: File): Promise<Array<{blob: Blob, name: string, pageIndex: number, dataURL: string}>> => {
  return [];
};

interface AddTaskModalProps {
  task?: MarketingTask | null;
  onSave: (task: Partial<MarketingTask>) => Promise<MarketingTask | null>;
  onClose: () => void;
  onDelete?: (taskId: string) => void;
}

interface FileWithThumbnail {
  file: File;
  thumbnail?: string;
  uploadProgress: number;
  uploading: boolean;
  uploaded: boolean;
  error?: string;
}

interface ExistingFileItemProps {
  file: any;
  index: number;
  onDelete: (file: any, index: number) => void;
}

function ExistingFileItem({ file, index, onDelete }: ExistingFileItemProps) {
  const [imageLoadError, setImageLoadError] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const isImage = file.type?.startsWith('image/') || file.name?.match(/\.(jpe?g|png|gif|webp)$/i);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await onDelete(file, index);
    } finally {
      setDeleting(false);
    }
  };

  // Get file type icon
  const getExistingFileIcon = (file: any) => {
    const fileName = file.name || '';
    const fileType = file.type || '';
    
    if (fileType.startsWith('image/') || fileName.match(/\.(jpe?g|png|gif|webp)$/i)) {
      return <ImageIcon className="w-6 h-6 text-white/60" />;
    } else if (fileType.startsWith('video/') || fileName.match(/\.(mp4|mov|avi|webm|mkv)$/i)) {
      return <Video className="w-6 h-6 text-white/60" />;
    } else if (fileType === 'application/pdf' || fileName.match(/\.pdf$/i)) {
      return <FileText className="w-6 h-6 text-gray-400" />;
    } else {
      return <FileText className="w-6 h-6 text-white/60" />;
    }
  };

  return (
    <div className="flex items-center gap-3 p-2 bg-black/20 border border-white/5 rounded group">
      {/* Thumbnail or file icon */}
      <div className="flex-shrink-0 w-12 h-12 rounded overflow-hidden bg-white/5 flex items-center justify-center">
        {isImage && file.url && !imageLoadError ? (
          <img 
            src={file.url} 
            alt={file.name || 'image'}
            className="w-full h-full object-cover"
            onError={() => setImageLoadError(true)}
          />
        ) : (
          getExistingFileIcon(file)
        )}
      </div>

      {/* File info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-white text-[10px] truncate">{file.name || 'file'}</span>
          {file.size && (
            <span className="text-white/40 text-[9px] flex-shrink-0">
              {(file.size / 1024 / 1024).toFixed(1)} MB
            </span>
          )}
        </div>
        <div className="text-[9px] text-green-400">✓ Uploaded</div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2">
        <a
          href={file.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-shrink-0 text-indigo-300 hover:text-indigo-200 text-[10px] underline"
        >
          View
        </a>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="flex-shrink-0 p-1 text-gray-400 hover:text-white hover:bg-black/20 rounded transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-50"
          title="Delete file"
        >
          {deleting ? (
            <div className="w-3 h-3 border border-gray-400/30 border-t-gray-400 rounded-full animate-spin" />
          ) : (
            <Trash2 className="w-3 h-3" />
          )}
        </button>
      </div>
    </div>
  );
}

export default function AddTaskModal({ task, onSave, onClose, onDelete }: AddTaskModalProps) {
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [formData, setFormData] = useState({
    title: task?.title || '',
    description: task?.description || '',
    due_date: task?.due_date || '',
    requested_by: task?.assignee || '',
    caption: task?.description || '', // We'll use description field for caption for now
    status: (task?.status || 'intake') as MarketingTask['status'],
  });

  const [selectedFiles, setSelectedFiles] = useState<FileWithThumbnail[]>([]);
  const [existingMedia, setExistingMedia] = useState<any[]>(task?.media_files || []);

  // Check if caption should be visible (not in intake)
  const showCaption = formData.status !== 'intake';

  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title || '',
        description: task.description || '',
        due_date: task.due_date || '',
        requested_by: task.assignee || '',
        caption: task.description || '', // We'll use description field for caption for now
        status: task.status || 'intake',
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

  // Generate thumbnail for different file types
  const generateThumbnail = async (file: File): Promise<string> => {
    if (file.type.startsWith('application/pdf')) {
      const pageImages = await convertPdfToImages(file);
      return pageImages[0].dataURL; // Return the first page's data URL
    }

    return new Promise((resolve, reject) => {
      if (file.type.startsWith('image/')) {
        // Handle images
        const reader = new FileReader();
        reader.onload = (e) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // Set thumbnail size
            const maxSize = 100;
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
            
            ctx?.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', 0.8));
          };
          img.onerror = () => reject(new Error('Failed to load image'));
          img.src = e.target?.result as string;
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
      } else if (file.type.startsWith('video/')) {
        // Handle videos - generate thumbnail from first frame
        const video = document.createElement('video');
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        video.crossOrigin = 'anonymous';
        video.currentTime = 1; // Get frame at 1 second
        
        video.onloadeddata = () => {
          const maxSize = 100;
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
          
          ctx?.drawImage(video, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.8));
        };
        
        video.onerror = () => resolve(''); // Fallback to no thumbnail
        video.src = URL.createObjectURL(file);
      } else {
        // No thumbnail for PDFs and other files
        resolve('');
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
    if (!filesToUpload.length) return;

    console.log('Starting immediate upload for', filesToUpload.length, 'files');
    console.log('Start index provided:', startIndex);

    // Fetch existing media_files array
    const { data: existing, error: fetchErr } = await supabase
      .from('design_tasks')
      .select('media_files')
      .eq('id', taskId)
      .single();

    if (fetchErr) {
      console.error('Error fetching existing media_files:', fetchErr);
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
          return { ...f, uploading: true, uploadProgress: 5 };
        }
        return f;
      });
      return updated;
    });

    // Process each file individually
    for (let i = 0; i < filesToUpload.length; i++) {
      const fileWithThumbnail = filesToUpload[i];
      const file = fileWithThumbnail.file;
      const globalIndex = startIndex + i;
      
      console.log(`Processing file ${i + 1}/${filesToUpload.length}: ${file.name}`);
      
      try {
        // Generate unique path
        const timestamp = Date.now();
        const randomId = Math.random().toString(36).substring(2);
        
        // Handle PDF conversion to image
        let fileToUpload: File | Blob = file;
        let fileName = file.name;
        let contentType = file.type;
        
        if (file.type === 'application/pdf') {
          console.log('Converting PDF to multiple images:', file.name);
          try {
            const pageImages = await convertPdfToImages(file);
            
            // Upload each page as a separate file
            for (let pageIndex = 0; pageIndex < pageImages.length; pageIndex++) {
              const pageImage = pageImages[pageIndex];
              const pageTimestamp = timestamp + pageIndex; // Ensure unique timestamps
              const pageRandomId = Math.random().toString(36).substring(2);
              const pagePath = `media/${taskId}/${pageTimestamp}_${pageRandomId}_${pageImage.name}`;
              
              // Update progress for this page
              const progressPercent = 20 + (pageIndex / pageImages.length) * 60;
              setSelectedFiles(prev => prev.map((f, idx) => 
                idx === globalIndex ? { ...f, uploadProgress: progressPercent } : f
              ));
              
              // Upload page image
              const { error: pageUpErr, data: pageUploadData } = await supabase.storage
                .from('media-files')
                .upload(pagePath, pageImage.blob, {
                  contentType: 'image/jpeg',
                  cacheControl: '3600',
                  upsert: false,
                });
              
              if (pageUpErr) {
                console.error(`Error uploading page ${pageIndex + 1}:`, pageUpErr);
                continue;
              }
              
              // Get public URL for page
              const { data: pagePub } = supabase.storage
                .from('media-files')
                .getPublicUrl(pagePath);
              
              // Add page to new media array
              const pageMediaItem = {
                url: pagePub.publicUrl,
                name: pageImage.name,
                type: 'image/jpeg',
                size: pageImage.blob.size,
                originalName: file.name, // Track original PDF name
                originalType: 'application/pdf', // Track that this was originally a PDF
                pageIndex: pageImage.pageIndex, // Track page number
              };
              
              newMedia.push(pageMediaItem);
            }
            
            // Update progress to 100% and mark as complete
            setSelectedFiles(prev => prev.map((f, idx) => 
              idx === globalIndex ? { ...f, uploadProgress: 100, uploaded: true, uploading: false } : f
            ));
            
            // Skip the normal upload process for PDFs since we handled it above
            continue;
          } catch (conversionError) {
            console.error('PDF conversion failed:', conversionError);
            throw new Error('Failed to convert PDF to image');
          }
        }
        
        const path = `media/${taskId}/${timestamp}_${randomId}_${fileName}`;
        console.log('Uploading to path:', path);

        // Update progress to 20%
        setSelectedFiles(prev => prev.map((f, idx) => 
          idx === globalIndex ? { ...f, uploadProgress: 20 } : f
        ));

        // Upload to Supabase storage
        const { error: upErr, data: uploadData } = await supabase.storage
          .from('media-files')
          .upload(path, fileToUpload, {
            contentType: contentType,
            cacheControl: '3600',
            upsert: false,
          });

        if (upErr) {
          console.error('Storage upload error:', upErr);
          setSelectedFiles(prev => prev.map((f, idx) => 
            idx === globalIndex ? { ...f, error: upErr.message, uploading: false, uploadProgress: 0 } : f
          ));
          continue;
        }

        console.log('Upload successful:', uploadData);

        // Update progress to 60%
        setSelectedFiles(prev => prev.map((f, idx) => 
          idx === globalIndex ? { ...f, uploadProgress: 60 } : f
        ));

        // Get public URL
        const { data: pub } = supabase.storage.from('media-files').getPublicUrl(path);
        console.log('Public URL:', pub.publicUrl);

        // Update progress to 80%
        setSelectedFiles(prev => prev.map((f, idx) => 
          idx === globalIndex ? { ...f, uploadProgress: 80 } : f
        ));

        const newMediaItem = {
          url: pub.publicUrl,
          name: fileName, // Use converted filename
          type: contentType, // Use converted content type
          size: fileToUpload instanceof Blob ? fileToUpload.size : file.size,
          originalName: file.name, // Keep track of original filename
          originalType: file.type, // Keep track of original type
        };
        newMedia.push(newMediaItem);

        // Mark as completed
        setSelectedFiles(prev => prev.map((f, idx) => 
          idx === globalIndex ? { ...f, uploadProgress: 100, uploading: false, uploaded: true } : f
        ));

        // Add to existing media immediately for instant feedback
        setExistingMedia(prev => [...prev, newMediaItem]);
        console.log('File upload completed:', file.name);

      } catch (error) {
        console.error('Upload error for file', file.name, ':', error);
        setSelectedFiles(prev => prev.map((f, idx) => 
          idx === globalIndex ? { ...f, error: 'Upload failed', uploading: false, uploadProgress: 0 } : f
        ));
      }
    }

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
        // Remove from existing media if database update failed
        setExistingMedia(prev => prev.slice(0, -newMedia.length));
      } else {
        console.log('Database updated successfully');
        // Clear uploaded files from selected files after successful upload
        setTimeout(() => {
          setSelectedFiles(prev => prev.filter(f => !f.uploaded));
          // Reset file input
          const fileInput = document.getElementById('file-upload') as HTMLInputElement;
          if (fileInput) fileInput.value = '';
        }, 1500); // Slightly longer delay to show completion
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
        ...formData,
        // Handle empty due_date by setting to undefined instead of empty string
        due_date: formData.due_date || undefined,
        assignee: formData.requested_by,
        // Use caption field for description when visible, otherwise use description
        description: showCaption ? formData.caption : formData.description,
      };

      if (task) {
        taskData.id = task.id;
      }

      const savedTask = await onSave(taskData);

      // If task saved successfully and we have unuploaded files, upload them
      if (savedTask && selectedFiles.some(f => !f.uploaded)) {
        await uploadFilesToStorage(savedTask.id);
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

  // Get file type for existing files
  const getExistingFileIcon = (file: any) => {
    const fileName = file.name || '';
    const fileType = file.type || '';
    
    if (fileType.startsWith('image/') || fileName.match(/\.(jpe?g|png|gif|webp)$/i)) {
      return <ImageIcon className="w-6 h-6 text-white/60" />;
    } else if (fileType.startsWith('video/') || fileName.match(/\.(mp4|mov|avi|webm|mkv)$/i)) {
      return <Video className="w-6 h-6 text-white/60" />;
    } else if (fileType === 'application/pdf' || fileName.match(/\.pdf$/i)) {
      return <FileText className="w-6 h-6 text-gray-400" />;
    } else {
      return <FileText className="w-6 h-6 text-white/60" />;
    }
  };

  const handleDeleteExistingFile = async (file: any, index: number) => {
    if (!task?.id) return;
    
    const confirmDelete = confirm('Are you sure you want to delete this file? This action cannot be undone.');
    if (!confirmDelete) return;

    try {
      // Extract storage path from URL
      const fileUrl = file.url;
      const urlParts = fileUrl.split('/storage/v1/object/public/media-files/');
      if (urlParts.length > 1) {
        const filePath = urlParts[1];
        
        // Delete from Supabase storage
        const { error: storageError } = await supabase.storage
          .from('media-files')
          .remove([filePath]);

        if (storageError) {
          console.error('Storage deletion error:', storageError);
        }
      }

      // Remove from local state
      const updatedMedia = existingMedia.filter((_, i) => i !== index);
      setExistingMedia(updatedMedia);

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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-2">
      <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-lg p-4 w-full max-w-2xl text-xs relative max-h-[90vh] overflow-visible shadow-2xl">
        <button 
          onClick={onClose}
          className="absolute top-3 right-3 text-lg leading-none text-white/70 hover:text-white transition-colors z-10"
        >
          ×
        </button>
        
        {/* Header */}
        <div className="mb-3 pr-8">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h2 className="text-base font-semibold text-white mb-0.5">
                {task ? 'Edit Task' : 'Create New Task'}
              </h2>
              <p className="text-xs text-white/60">
                {task ? 'Update task information and details' : 'Create a new marketing design task'}
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3 overflow-y-auto pr-1">
          
          {/* Task Information */}
          <div className="bg-white/5 backdrop-blur-sm rounded-lg p-2.5 border border-white/10">
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
                  className="w-full px-2.5 py-1.5 text-xs rounded bg-black/20 border border-white/10 text-white placeholder-white/50 focus:outline-none focus:ring-1 focus:ring-white/30 focus:border-white/30 transition-all uppercase"
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
                  className="w-full px-2.5 py-1.5 text-xs rounded bg-black/20 border border-white/10 text-white placeholder-white/50 focus:outline-none focus:ring-1 focus:ring-white/30 focus:border-white/30 transition-all resize-none"
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
                    className="w-full px-2.5 py-1.5 text-xs rounded bg-black/20 border border-white/10 text-white placeholder-white/50 focus:outline-none focus:ring-1 focus:ring-white/30 focus:border-white/30 transition-all resize-none"
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
                  </label>
                  <DatePicker
                    selected={formData.due_date ? new Date(formData.due_date) : null}
                    onChange={(date) => handleChange({
                      target: {
                        name: 'due_date',
                        value: date ? dayjs(date).format('YYYY-MM-DD') : ''
                      }
                    } as any)}
                    dateFormat="dd/MM/yyyy"
                    popperPlacement="top-start"
                    className="w-full px-2.5 py-1.5 text-xs rounded bg-black/20 border border-white/10 text-white focus:outline-none focus:ring-1 focus:ring-white/30 focus:border-white/30 transition-all"
                    wrapperClassName="w-full"
                    placeholderText="Select due date"
                    isClearable
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
                    className="w-full px-2.5 py-1.5 text-xs rounded bg-black/20 border border-white/10 text-white placeholder-white/50 focus:outline-none focus:ring-1 focus:ring-white/30 focus:border-white/30 transition-all uppercase"
                    placeholder="Enter requester name"
                  />
                </div>
              </div>

            </div>
          </div>

          {/* File Upload */}
          <div className="bg-white/5 backdrop-blur-sm rounded-lg p-2.5 border border-white/10">
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
                    accept="image/*,video/*,.doc,.docx,.txt,.mp4,.mov,.avi,.webm,.mkv"
                  />
                  <label
                    htmlFor="file-upload"
                    className="w-full h-12 flex items-center justify-center px-3 gap-2 rounded-lg border-2 border-dashed border-white/20 bg-black/20 text-[10px] text-white/60 cursor-pointer transition-colors hover:border-white/30 hover:bg-black/30"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <span>Upload images, videos, PDFs and documents</span>
                  </label>
                </div>

                {/* Selected files with thumbnails and progress */}
                {selectedFiles.length > 0 && (
                  <div className="space-y-2 mt-3">
                    {selectedFiles.map((fileWithThumbnail, index) => {
                      const { file, thumbnail, uploadProgress, uploading, uploaded, error } = fileWithThumbnail;
                      const isImage = file.type.startsWith('image/');
                      
                      return (
                        <div key={index} className="flex items-center gap-3 p-2 bg-black/30 border border-white/10 rounded">
                          {/* Thumbnail or file icon */}
                          <div className="flex-shrink-0 w-12 h-12 rounded overflow-hidden bg-white/5 flex items-center justify-center">
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
                                <span className="text-indigo-400">Uploading... {uploadProgress}%</span>
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

                {/* Existing media list with thumbnails */}
                {existingMedia.length > 0 && (
                  <div className="mt-3">
                    <span className="text-[10px] text-white/50 mb-2 block">Existing Files:</span>
                    <div className="space-y-2">
                      {existingMedia.map((file, idx) => (
                        <ExistingFileItem key={idx} file={file} index={idx} onDelete={handleDeleteExistingFile} />
                      ))}
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
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={onClose}
                className="px-2 py-1 bg-white/5 hover:bg-white/10 backdrop-blur-sm border border-white/10 text-white text-xs rounded transition-all"
                disabled={loading || deleting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-2 py-1 bg-gradient-to-br from-gray-200 via-gray-400 to-gray-200 text-black text-xs rounded transition-colors font-semibold"
                disabled={loading || deleting}
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