'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { X, ChevronUp, ChevronDown, Save, ArrowLeft, Trash2, FileText, Video, Image as ImageIcon, Play, Plus } from 'lucide-react';
import { MarketingTask } from '@/types/marketing';
import { supabase } from '@/lib/supabaseClient';
import AnnotationOverlay from './AnnotationOverlay';

// Helper function to format dates to dd/mm/yyyy
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

interface MarketingWorkspaceProps {
  task: MarketingTask;
  onClose: () => void;
  onSave: (taskData: Partial<MarketingTask>) => Promise<MarketingTask | null>;
}

// Media Viewer Component with zoom/pan and SVG annotation support
interface MediaViewerProps {
  mediaUrl?: string;
  fileName: string;
  mediaType: 'image' | 'video' | 'pdf';
  pdfPages?: any[]; // Array of PDF page objects for multi-page display
  task: any; // Task object for saving annotations
  onAnnotationsChange?: (annotations: any[]) => void; // Callback for annotation updates
  currentPageNumber: number; // Current page number based on selected thumbnail
  selectedAnnotationId?: string | null; // ID of selected annotation to highlight
  onPageChange?: (pageNumber: number) => void; // Callback to navigate to specific page
  setSelectedAnnotationId?: (id: string | null) => void; // Callback to set selected annotation ID
  zoom: number; // Zoom level from parent
  setZoom: (zoom: number) => void; // Set zoom handler from parent
  resetZoomPan: () => void; // Reset zoom and pan handler from parent
  pan: { x: number; y: number }; // Pan state from parent
  setPan: (pan: { x: number; y: number }) => void; // Set pan handler from parent
  showCommentPopup: boolean; // Comment popup state from parent
  setShowCommentPopup: (show: boolean) => void; // Set comment popup handler from parent
  isAnnotationMode: boolean; // Annotation mode state from parent
  setIsAnnotationMode: (mode: boolean) => void; // Set annotation mode handler from parent
  currentAnnotations: any[]; // Pass current annotations from parent
}

function MediaViewer({ mediaUrl, fileName, mediaType, pdfPages, task, onAnnotationsChange, currentPageNumber, selectedAnnotationId, onPageChange, setSelectedAnnotationId, zoom, setZoom, resetZoomPan, pan, setPan, showCommentPopup, setShowCommentPopup, isAnnotationMode, setIsAnnotationMode, currentAnnotations }: MediaViewerProps) {
  // Zoom and Pan state
  const [isDragging, setIsDragging] = useState(false);
  const [lastPos, setLastPos] = useState({ x: 0, y: 0 });
  
  // Use annotations from parent workspace instead of local state
  // const [annotations, setAnnotations] = useState<any[]>([]);  // REMOVED - causes state sync issues
  
  // Mouse wheel zoom handler
  const handleWheel = (e: React.WheelEvent) => {
    // Disable zoom during annotation mode
    if (isAnnotationMode) {
      e.preventDefault();
      return;
    }
    
    e.preventDefault();
    
    const rect = e.currentTarget.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.5, Math.min(3, zoom * zoomFactor));
    
    // Zoom towards mouse position
    const mouseX = e.clientX - rect.left - centerX;
    const mouseY = e.clientY - rect.top - centerY;
    
    const zoomChange = newZoom / zoom;
    const newPanX = pan.x - (mouseX * (zoomChange - 1));
    const newPanY = pan.y - (mouseY * (zoomChange - 1));
    
    setZoom(newZoom);
    setPan({ x: newPanX, y: newPanY });
  };
  
  // Mouse down handler for panning
  const handleMouseDown = (e: React.MouseEvent) => {
    // Only handle panning if we're not over a draggable thumbnail
    if (e.button === 0 && !isAnnotationMode && !(e.target as Element).closest('[data-thumbnail-draggable]')) {
      setIsDragging(true);
      setLastPos({ x: e.clientX, y: e.clientY });
      e.preventDefault();
    }
  };
  
  // Mouse move handler for panning
  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && !isAnnotationMode) {
      // Continue panning
      const deltaX = e.clientX - lastPos.x;
      const deltaY = e.clientY - lastPos.y;
      
      setPan({ x: pan.x + deltaX, y: pan.y + deltaY });
      
      setLastPos({ x: e.clientX, y: e.clientY });
    }
  };
  
  // Mouse up handler
  const handleMouseUp = (e: React.MouseEvent) => {
    setIsDragging(false);
  };
  
  // Calculate current page number based on selected thumbnail
  const getCurrentPageNumber = () => {
    return currentPageNumber; // Use the passed page number from selectedImageIndex + 1
  };


  
  // Annotations are now managed by parent workspace - no need to load here

  // Add global mouse up listener
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      setIsDragging(false);
    };
    
    // Only add global listeners if we're actually dragging for panning
    if (isDragging) {
      document.addEventListener('mouseup', handleGlobalMouseUp);
      document.addEventListener('mouseleave', handleGlobalMouseUp);
    }
    
    return () => {
      document.removeEventListener('mouseup', handleGlobalMouseUp);
      document.removeEventListener('mouseleave', handleGlobalMouseUp);
    };
  }, [isDragging]);
  if (mediaType === 'pdf' && pdfPages && pdfPages.length > 0) {
    // Multi-page PDF display - scrollable with zoom/pan
    return (
      <div 
        className="relative w-full h-full overflow-hidden"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        style={{ 
          cursor: isAnnotationMode 
            ? 'url("data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTMgMTdIMjFMMTMgOUwzIDE3WiIgZmlsbD0iI0ZGRkYwMCIgc3Ryb2tlPSIjRkY4RjAwIiBzdHJva2Utd2lkdGg9IjIiLz4KPHN2Zz4K") 12 12, crosshair'
            : isDragging ? 'grabbing' : 'grab'
        }}
      >
        {/* Transformable container for PDF pages */}
        <div 
          className="w-full h-full flex items-center justify-center"
          style={{
            transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`,
            transformOrigin: 'center center',
            transition: isDragging ? 'none' : 'transform 0.1s ease'
          }}
        >
          <div className="flex flex-col gap-6 p-4">
            {pdfPages
              .sort((a, b) => (a.pageIndex || 0) - (b.pageIndex || 0))
              .map((page, index) => (
                <div key={index} className="relative flex-shrink-0">
                  <img
                    src={typeof page === 'string' ? page : page.url}
                    alt={`${fileName} - Page ${index + 1}`}
                    className="max-w-full max-h-[80vh] mx-auto rounded-lg shadow-2xl object-contain"
                    style={{ maxWidth: '100%', height: 'auto' }}
                    draggable={false}
                  />
                  {/* Page number indicator */}
                  <div className="absolute top-4 right-4 bg-black/70 text-white px-3 py-1 rounded-full text-sm font-medium">
                    Page {index + 1}
                  </div>
                </div>
              ))}
          </div>
        </div>
        
        {/* SVG Annotation Layer - Over the entire area */}
        {(isAnnotationMode || selectedAnnotationId) && (
          <AnnotationOverlay
            width="100%"
            height="100%"
            isActive={isAnnotationMode && !showCommentPopup && selectedAnnotationId == null}
            onSave={(path, comment) => {
              const newAnnotation = {
                id: Date.now().toString(),
                path,
                comment,
                pageIndex: getCurrentPageNumber(),
                timestamp: new Date().toISOString(),
                mediaType,
                zoom,
                pan
              };
              const updatedAnnotations = [...currentAnnotations, newAnnotation];
              onAnnotationsChange?.(updatedAnnotations);
              // Save to DB
              supabase.from('design_tasks')
                .update({ annotations: updatedAnnotations })
                .eq('id', task.id)
                .then(({ error }) => {
                  if (error) {
                    console.error('Error saving annotation:', error);
                  }
                });
            }}
            existingPaths={selectedAnnotationId
              ? currentAnnotations.filter(a => a.id === selectedAnnotationId).map(a => ({ d: a.path, color: '#FFD700' }))
              : []}
          />
        )}
        
        {/* Comment Popup */}

      </div>
    );
  }

  // Single image or video display with zoom/pan
  return (
    <div 
      className="relative w-full h-full overflow-hidden"
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      style={{ 
        cursor: isAnnotationMode 
          ? 'url("data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTMgMTdIMjFMMTMgOUwzIDE3WiIgZmlsbD0iI0ZGRkYwMCIgc3Ryb2tlPSIjRkY4RjAwIiBzdHJva2Utd2lkdGg9IjIiLz4KPHN2Zz4K") 12 12, crosshair'
          : isDragging ? 'grabbing' : 'grab'
      }}
    >
      {/* Transformable container for media */}
      <div 
        className="w-full h-full flex items-center justify-center"
        style={{
          transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`,
          transformOrigin: 'center center',
          transition: isDragging ? 'none' : 'transform 0.1s ease'
        }}
      >
        {/* Media Content */}
        {mediaType === 'image' && (
          <img
            src={mediaUrl}
            alt={fileName}
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
            draggable={false}
          />
        )}

        {mediaType === 'video' && (
          <video
            src={mediaUrl}
            controls
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl bg-black"
          />
        )}

        {mediaType === 'pdf' && !pdfPages && (
          <iframe
            src={mediaUrl}
            title={fileName}
            className="w-full h-full rounded-lg shadow-2xl bg-white"
            style={{ minHeight: '80vh' }}
          />
        )}
      </div>

      {/* SVG Annotation Layer - Positioned absolutely over any media type */}
      <AnnotationOverlay
        width="100%"
        height="100%"
        isActive={isAnnotationMode}
        onSave={(path, comment) => {
          const newAnnotation = {
            id: Date.now().toString(),
            path,
            comment,
            pageIndex: getCurrentPageNumber(),
            timestamp: new Date().toISOString(),
            mediaType,
            zoom,
            pan
          };
          const updatedAnnotations = [...currentAnnotations, newAnnotation];
          onAnnotationsChange?.(updatedAnnotations);
          // Save to DB
          supabase.from('design_tasks')
            .update({ annotations: updatedAnnotations })
            .eq('id', task.id)
            .then(({ error }) => {
              if (error) {
                console.error('Error saving annotation:', error);
              }
            });
        }}
        existingPaths={selectedAnnotationId
          ? currentAnnotations.filter(a => a.id === selectedAnnotationId).map(a => ({ d: a.path, color: '#FFD700' }))
          : []}
      />
      

    </div>
  );
}



export default function MarketingWorkspace({ task, onClose, onSave }: MarketingWorkspaceProps) {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [title, setTitle] = useState(task.title || '');
  const [caption, setCaption] = useState(task.description || '');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [deleteMessage, setDeleteMessage] = useState<string | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [currentAnnotations, setCurrentAnnotations] = useState<any[]>([]);
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null);
  const [isAnnotationMode, setIsAnnotationMode] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [showCommentPopup, setShowCommentPopup] = useState(false);
  const [failedThumbnails, setFailedThumbnails] = useState<Set<number>>(new Set());
  const [loadingThumbnails, setLoadingThumbnails] = useState<Set<number>>(new Set());
  const [isMounted, setIsMounted] = useState(false);

  // Local state for media files that can be modified
  const [mediaFiles, setMediaFiles] = useState(() => {
    return (task.media_files || []);
  });

  // Filter for different file types  
  const imageFiles = useMemo(() => {
    const filtered = mediaFiles.filter((file: any) => {
      if (typeof file === 'string') {
        return file.match(/\.(jpe?g|png|gif|webp)$/i);
      }
      // Include converted PDFs as images
      return file.type?.startsWith('image/') || 
             file.originalType === 'application/pdf' ||
             file.name?.match(/\.(jpe?g|png|gif|webp)$/i);
    });
    return filtered;
  }, [mediaFiles, refreshKey]);

  const videoFiles = useMemo(() => {
    const filtered = mediaFiles.filter((file: any) => {
      if (typeof file === 'string') {
        return file.match(/\.(mp4|mov|avi|webm|mkv)$/i);
      }
      return file.type?.startsWith('video/') || file.name?.match(/\.(mp4|mov|avi|webm|mkv)$/i);
    });
    return filtered;
  }, [mediaFiles, refreshKey]);

  const pdfFiles = useMemo(() => {
    const filtered = mediaFiles.filter((file: any) => {
      if (typeof file === 'string') {
        return file.match(/\.pdf$/i);
      }
      // Only include actual PDFs that haven't been converted to images
      return (file.type === 'application/pdf' || file.name?.match(/\.pdf$/i)) && 
             !file.originalType; // Converted PDFs have originalType
    });
    return filtered;
  }, [mediaFiles, refreshKey]);

  const otherFiles = mediaFiles.filter((file: any) => {
    const isImage = typeof file === 'string' ? 
      file.match(/\.(jpe?g|png|gif|webp)$/i) : 
      file.type?.startsWith('image/') || file.originalType === 'application/pdf' || file.name?.match(/\.(jpe?g|png|gif|webp)$/i);
    const isVideo = typeof file === 'string' ? 
      file.match(/\.(mp4|mov|avi|webm|mkv)$/i) : 
      file.type?.startsWith('video/') || file.name?.match(/\.(mp4|mov|avi|webm|mkv)$/i);
    const isPdf = typeof file === 'string' ? 
      file.match(/\.pdf$/i) : 
      (file.type === 'application/pdf' || file.name?.match(/\.pdf$/i)) && !file.originalType;
    
    return !isImage && !isVideo && !isPdf;
  });

  // Combine all files for navigation with proper mapping - maintain original order!
  const allViewableFiles = useMemo(() => {
    // Instead of grouping by type, filter mediaFiles to keep original order
    const viewableInOriginalOrder = mediaFiles.filter((file: any) => {
      if (typeof file === 'string') {
        return file.match(/\.(jpe?g|png|gif|webp|mp4|mov|avi|webm|mkv|pdf)$/i);
      }
      // Include images, videos, and PDFs (including converted PDFs)
      return file.type?.startsWith('image/') || 
             file.type?.startsWith('video/') || 
             file.type === 'application/pdf' ||
             file.originalType === 'application/pdf' ||
             file.name?.match(/\.(jpe?g|png|gif|webp|mp4|mov|avi|webm|mkv|pdf)$/i);
    });
    
    return viewableInOriginalOrder;
  }, [mediaFiles, refreshKey]); // Remove imageFiles, videoFiles, pdfFiles dependencies

  // Create mapping between viewable files and original media files indices
  const viewableToMediaMapping = useMemo(() => {
    const mapping: number[] = [];
    
    // Since allViewableFiles now maintains original order, we just need to find 
    // the original media index for each viewable file
    allViewableFiles.forEach((viewableFile: any, viewableIndex: number) => {
      const originalIndex = mediaFiles.findIndex((mediaFile: any, mediaIndex: number) => {
        const viewableUrl = typeof viewableFile === 'string' ? viewableFile : viewableFile.url;
        const mediaUrl = typeof mediaFile === 'string' ? mediaFile : mediaFile.url;
        return viewableUrl === mediaUrl;
      });
      if (originalIndex !== -1) {
        mapping.push(originalIndex);
      }
    });
    
    return mapping;
  }, [mediaFiles, allViewableFiles, refreshKey]);

  // Navigate thumbnails
  const handlePrevImage = () => {
    setSelectedImageIndex(prev => prev > 0 ? prev - 1 : allViewableFiles.length - 1);
    setSelectedAnnotationId(null);
  };

  const handleNextImage = () => {
    setSelectedImageIndex(prev => prev < allViewableFiles.length - 1 ? prev + 1 : 0);
    setSelectedAnnotationId(null);
  };

  const resetZoomPan = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Load annotations when workspace mounts
  useEffect(() => {
    const loadAnnotations = async () => {
      try {
        const { data, error } = await supabase
          .from('design_tasks')
          .select('annotations')
          .eq('id', task.id)
          .single();
          
        if (error) {
          console.error('Error loading annotations:', error);
          return;
        }
        
        if (data?.annotations) {
          console.log('Loaded annotations from database:', data.annotations);
          setCurrentAnnotations(data.annotations);
        } else {
          console.log('No annotations found in database for task:', task.id);
          setCurrentAnnotations([]);
        }
      } catch (error) {
        console.error('Error loading annotations:', error);
        setCurrentAnnotations([]);
      }
    };
    
    loadAnnotations();
  }, [task.id]);

  // Reset failed thumbnails when media files change
  useEffect(() => {
    setFailedThumbnails(new Set());
    setLoadingThumbnails(new Set());
  }, [mediaFiles, refreshKey]);

  // Handle initial mount to prevent layout shift
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsMounted(true);
    }, 100); // Small delay to ensure layout is stable
    
    return () => clearTimeout(timer);
  }, []);

    // Enhanced drag and drop for thumbnail reordering
  const handleThumbnailDragStart = (e: React.DragEvent, index: number) => {
    if (isAnnotationMode) {
      e.preventDefault();
      return;
    }
    
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
    
    // Add ghost image styling
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '0.5';
    }
  };

  const handleThumbnailDragEnd = (e: React.DragEvent) => {
    // Reset opacity
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '1';
    }
    
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleThumbnailDragOver = (e: React.DragEvent, targetIndex: number) => {
    if (isAnnotationMode || draggedIndex === null) return;
    
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    // Only update if different from current
    if (dragOverIndex !== targetIndex) {
      setDragOverIndex(targetIndex);
    }
  };

  const handleThumbnailDragEnter = (e: React.DragEvent, targetIndex: number) => {
    if (isAnnotationMode || draggedIndex === null) return;
    e.preventDefault();
  };

  const handleThumbnailDragLeave = (e: React.DragEvent, targetIndex: number) => {
    if (isAnnotationMode || draggedIndex === null) return;
    
    // Only clear if we're actually leaving this element
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
    
    if (isAnnotationMode || draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null);
      return;
    }

    try {
      // Map viewable indices to media file indices
      const draggedMediaIndex = viewableToMediaMapping[draggedIndex];
      const targetMediaIndex = viewableToMediaMapping[targetIndex];
      
      if (draggedMediaIndex === undefined || targetMediaIndex === undefined) {
        setDraggedIndex(null);
        return;
      }

      // Reorder the original media files array
    const newMediaFiles = [...mediaFiles];
      const draggedItem = newMediaFiles[draggedMediaIndex];
      
      // Remove from old position
      newMediaFiles.splice(draggedMediaIndex, 1);
      
      // Calculate correct insertion index after removal
      let insertIndex = targetMediaIndex;
      if (draggedMediaIndex < targetMediaIndex) {
        // When moving forward, target index shifts left by 1 after removal
        insertIndex = targetMediaIndex - 1;
      } else {
        // When moving backward, target index stays the same
        insertIndex = targetMediaIndex;
      }
      
      // Insert at new position
      newMediaFiles.splice(insertIndex, 0, draggedItem);

    // Force immediate state updates
    setMediaFiles(newMediaFiles);
    task.media_files = newMediaFiles;
    
    // Force refresh of all computed arrays
    setRefreshKey(prev => prev + 1);
      
      // Adjust selected index if necessary (working with viewable indices)
      if (selectedImageIndex === draggedIndex) {
        setSelectedImageIndex(targetIndex);
      } else if (selectedImageIndex > draggedIndex && selectedImageIndex <= targetIndex) {
        setSelectedImageIndex(selectedImageIndex - 1);
      } else if (selectedImageIndex < draggedIndex && selectedImageIndex >= targetIndex) {
        setSelectedImageIndex(selectedImageIndex + 1);
      }
      
    setDraggedIndex(null);
    
    // Update database
    supabase
      .from('design_tasks')
      .update({ media_files: newMediaFiles })
        .eq('id', task.id)
        .then(({ error }) => {
          if (error) {
            console.error('Failed to update media files order:', error);
          }
        });
        
    } catch (error) {
      console.error('❌ Error during drop:', error);
      setDraggedIndex(null);
    }
  };

  // Generate video thumbnail from 0.05 second frame
  const generateVideoThumbnail = (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      console.log('🎬 Starting thumbnail generation for:', file.name, 'Type:', file.type, 'Size:', file.size);
      
      const video = document.createElement('video');
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        console.error('❌ Could not get canvas context');
        reject(new Error('Could not get canvas context'));
        return;
      }

      video.preload = 'metadata';
      video.muted = true;
      video.crossOrigin = 'anonymous'; // Handle CORS issues
      video.playsInline = true; // For mobile compatibility
      
      let hasResolved = false;
      const timeout = setTimeout(() => {
        if (!hasResolved) {
          console.error('❌ Thumbnail generation timeout after 15 seconds');
          URL.revokeObjectURL(video.src);
          reject(new Error('Thumbnail generation timeout'));
        }
      }, 15000); // Increased timeout

      video.onloadedmetadata = () => {
        console.log('📹 Video metadata loaded:', {
          duration: video.duration,
          videoWidth: video.videoWidth,
          videoHeight: video.videoHeight,
          readyState: video.readyState,
          networkState: video.networkState
        });
        
        if (video.videoWidth === 0 || video.videoHeight === 0) {
          console.error('❌ Invalid video dimensions');
          clearTimeout(timeout);
          URL.revokeObjectURL(video.src);
          reject(new Error('Invalid video dimensions'));
          return;
        }

        if (isNaN(video.duration) || video.duration <= 0) {
          console.error('❌ Invalid video duration:', video.duration);
          clearTimeout(timeout);
          URL.revokeObjectURL(video.src);
          reject(new Error('Invalid video duration'));
          return;
        }
        
        // Set canvas size to video dimensions
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        console.log('🎯 Seeking to frame...');
        // Seek to 0.1 seconds or 1% of duration, whichever is smaller, but at least 0.1s
        const seekTime = Math.max(0.1, Math.min(0.5, video.duration * 0.01));
        console.log('⏰ Seek time calculated:', seekTime);
        video.currentTime = seekTime;
      };

      video.onseeked = () => {
        if (hasResolved) return;
        
        console.log('✅ Video seeked successfully to:', video.currentTime, 'drawing frame...');
        try {
          // Wait a bit for the frame to be ready
          setTimeout(() => {
            try {
              // Draw the video frame to canvas
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              
              console.log('🎨 Frame drawn to canvas, converting to blob...');
              
              // Convert canvas to blob
              canvas.toBlob((blob) => {
                clearTimeout(timeout);
                URL.revokeObjectURL(video.src);
                
                if (blob && !hasResolved) {
                  hasResolved = true;
                  console.log('✅ Thumbnail blob created:', blob.size, 'bytes');
                  
                  // Create a File object from the blob
                  const thumbnailFile = new File(
                    [blob], 
                    file.name.replace(/\.[^/.]+$/, '_thumbnail.jpg'), 
                    { type: 'image/jpeg' }
                  );
                  
                  console.log('🖼️ Thumbnail file created:', thumbnailFile.name);
                  resolve(thumbnailFile);
                } else if (!hasResolved) {
                  hasResolved = true;
                  console.error('❌ Failed to create thumbnail blob');
                  reject(new Error('Failed to create thumbnail blob'));
                }
              }, 'image/jpeg', 0.9); // Higher quality
            } catch (drawError) {
              clearTimeout(timeout);
              URL.revokeObjectURL(video.src);
              if (!hasResolved) {
                hasResolved = true;
                console.error('❌ Error drawing video frame:', drawError);
                reject(drawError);
              }
            }
          }, 100); // Small delay to ensure frame is ready
        } catch (error) {
          clearTimeout(timeout);
          URL.revokeObjectURL(video.src);
          if (!hasResolved) {
            hasResolved = true;
            console.error('❌ Error in onseeked handler:', error);
            reject(error);
          }
        }
      };

      video.onerror = (error) => {
        clearTimeout(timeout);
        URL.revokeObjectURL(video.src);
        if (!hasResolved) {
          hasResolved = true;
          console.error('❌ Video loading error:', error, 'Error code:', video.error?.code, 'Message:', video.error?.message);
          reject(new Error(`Video loading error: ${video.error?.message || error}`));
        }
      };

      video.onloadstart = () => {
        console.log('🔄 Video loading started...');
      };

      video.oncanplay = () => {
        console.log('▶️ Video can start playing...');
      };

      video.onloadeddata = () => {
        console.log('📊 Video data loaded...');
      };

      // Load the video file
      try {
        const objectURL = URL.createObjectURL(file);
        console.log('🔗 Created object URL:', objectURL);
        video.src = objectURL;
        video.load(); // Explicitly load the video
      } catch (error) {
        clearTimeout(timeout);
        console.error('❌ Error creating object URL:', error);
        reject(new Error('Error creating object URL: ' + error));
      }
    });
  };

  // Handle file upload
  const handleFileUpload = async (files: FileList) => {
    if (files.length === 0) return;
    
    setUploading(true);
    try {
      const uploadedFiles = [];
      
      for (const file of Array.from(files)) {
        const timestamp = Date.now();
        const fileExtension = file.name.split('.').pop();
        const isVideo = file.type.startsWith('video/') || 
                       fileExtension?.match(/^(mp4|mov|avi|webm|mkv)$/i);
        
        // Create unique filename
        const fileName = `${task.id}_${timestamp}.${fileExtension}`;
        
        // Upload original file to Supabase storage
        const { data, error } = await supabase.storage
          .from('media-files')
          .upload(fileName, file);
          
        if (error) {
          console.error('Upload error:', error);
          continue;
        }
        
        // Get public URL for original file
        const { data: { publicUrl } } = supabase.storage
          .from('media-files')
          .getPublicUrl(fileName);
        
        let fileObject: any = {
          url: publicUrl,
          name: file.name,
          type: file.type,
          originalType: file.type
        };

        // Generate and upload thumbnail for videos
        if (isVideo) {
          console.log('🎥 Detected video file, starting thumbnail process...', {
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size,
            fileExtension: fileExtension
          });
          
          try {
            console.log('🎬 Calling generateVideoThumbnail...');
            const thumbnailFile = await generateVideoThumbnail(file);
            console.log('✅ Thumbnail generation completed:', {
              thumbnailName: thumbnailFile.name,
              thumbnailSize: thumbnailFile.size,
              thumbnailType: thumbnailFile.type
            });
            
            const thumbnailFileName = `${task.id}_${timestamp}_thumbnail.jpg`;
            console.log('📤 Uploading thumbnail to storage:', thumbnailFileName);
            
            // Upload thumbnail to storage
            const { data: thumbData, error: thumbError } = await supabase.storage
              .from('media-files')
              .upload(thumbnailFileName, thumbnailFile);
              
            if (!thumbError) {
              console.log('✅ Thumbnail uploaded successfully to storage');
              const { data: { publicUrl: thumbUrl } } = supabase.storage
                .from('media-files')
                .getPublicUrl(thumbnailFileName);
              
              fileObject.thumbnail = thumbUrl;
              console.log('✅ Video thumbnail URL assigned:', thumbUrl);
              console.log('✅ Final video file object:', fileObject);
            } else {
              console.error('❌ Thumbnail upload error:', thumbError);
            }
          } catch (error) {
            console.error('❌ Thumbnail generation error:', error);
            console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace');
            // Continue without thumbnail if generation fails
          }
        } else {
          console.log('📁 Non-video file detected, skipping thumbnail generation');
        }

        uploadedFiles.push(fileObject);
      }
      
      if (uploadedFiles.length > 0) {
        const updatedMediaFiles = [...mediaFiles, ...uploadedFiles];
        setMediaFiles(updatedMediaFiles);
        
        // Update the task object as well so other components can see the new files
        task.media_files = updatedMediaFiles;
        
        // Update database
        await supabase
          .from('design_tasks')
          .update({ media_files: updatedMediaFiles })
          .eq('id', task.id);
        
        // Force re-computation of file arrays
        setRefreshKey(prev => prev + 1);
          
        setDeleteMessage(`${uploadedFiles.length} file(s) uploaded successfully`);
        setTimeout(() => setDeleteMessage(null), 3000);
      }
    } catch (error) {
      console.error('Upload error:', error);
      setDeleteMessage('Failed to upload files');
      setTimeout(() => setDeleteMessage(null), 3000);
    } finally {
      setUploading(false);
    }
  };

  // Handle save
  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({
        id: task.id,
        title,
        description: caption,
      });
    } catch (error) {
      console.error('Save error:', error);
    } finally {
      setSaving(false);
    }
  };

  // Handle file deletion
  const handleDeleteFile = async (index: number) => {
    if (index < 0 || index >= allViewableFiles.length) return;
    
    const fileToDelete = allViewableFiles[index];
    const confirmDelete = confirm('Are you sure you want to delete this file? This action cannot be undone.');
    
    if (!confirmDelete) return;

    setDeleting(index);
    
    try {
      // Get the original file URL (not thumbnail) for proper comparison
      const originalFileUrl = getOriginalFileUrl(fileToDelete);
      
      // For videos with thumbnails, we need to delete both files from storage
      const filesToDeleteFromStorage: string[] = [];
      
      // Extract original file storage path
      const originalUrlParts = originalFileUrl.split('/storage/v1/object/public/media-files/');
      if (originalUrlParts.length > 1) {
        filesToDeleteFromStorage.push(originalUrlParts[1]);
      }
      
      // If this is a video with a thumbnail, also delete the thumbnail
      if (typeof fileToDelete !== 'string' && (fileToDelete as any).thumbnail) {
        const thumbnailUrlParts = (fileToDelete as any).thumbnail.split('/storage/v1/object/public/media-files/');
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
        } else {
          console.log('✅ Deleted from storage:', filesToDeleteFromStorage);
        }
      }

      // Remove from local state using original file URL for comparison
      const updatedMediaFiles = mediaFiles.filter((file: any) => {
        const currentOriginalUrl = typeof file === 'string' ? file : file.url;
        return currentOriginalUrl !== originalFileUrl;
      });
      
      console.log('🗑️ Media files before deletion:', mediaFiles.length);
      console.log('🗑️ Media files after deletion:', updatedMediaFiles.length);
      
      setMediaFiles(updatedMediaFiles);

      // Update database
      const { error: dbError } = await supabase
        .from('design_tasks')
        .update({ media_files: updatedMediaFiles })
        .eq('id', task.id);

      if (dbError) {
        console.error('Database update error:', dbError);
        // Revert local state if database update failed
        setMediaFiles(mediaFiles);
        return;
      }

      // Update the task object for other components
      task.media_files = updatedMediaFiles;
      
      // Force refresh of computed arrays by updating refreshKey
      setRefreshKey(prev => prev + 1);

      // Recalculate viewable files after deletion
      const newViewableFiles = [...updatedMediaFiles.filter((file: any) => {
        if (typeof file === 'string') {
          return file.match(/\.(jpe?g|png|gif|webp|mp4|mov|avi|webm|mkv|pdf)$/i);
        }
        return file.type?.startsWith('image/') || file.type?.startsWith('video/') || file.type === 'application/pdf' ||
               file.name?.match(/\.(jpe?g|png|gif|webp|mp4|mov|avi|webm|mkv|pdf)$/i);
      })];

      console.log('📊 Viewable files after deletion:', newViewableFiles.length);

      // Adjust selected index if necessary
      if (selectedImageIndex >= newViewableFiles.length) {
        setSelectedImageIndex(Math.max(0, newViewableFiles.length - 1));
      } else if (selectedImageIndex > index) {
        setSelectedImageIndex(selectedImageIndex - 1);
      }

      // Show success message
      setDeleteMessage('File deleted successfully');
      setTimeout(() => setDeleteMessage(null), 3000);

      // If no viewable files left, close the workspace after a brief delay
      if (newViewableFiles.length === 0) {
        setTimeout(() => {
          onClose();
        }, 1000);
      }

    } catch (error) {
      console.error('Delete error:', error);
      setDeleteMessage('Failed to delete file');
      setTimeout(() => setDeleteMessage(null), 3000);
    } finally {
      setDeleting(null);
    }
  };

  // Handle annotation click - navigate to page and highlight annotation
  const handleAnnotationClick = (annotation: any) => {
    console.log('Clicked annotation:', annotation);
    console.log('Setting selectedAnnotationId to:', annotation.id);
    console.log('Annotation page:', annotation.pageIndex, 'Current page:', selectedImageIndex + 1);
    
    setSelectedAnnotationId(annotation.id);
    
    // If annotation is on a different page, navigate to that page
    const annotationPageIndex = annotation.pageIndex - 1; // Convert to 0-based index
    if (annotationPageIndex !== selectedImageIndex && annotationPageIndex >= 0 && annotationPageIndex < allViewableFiles.length) {
      console.log('Navigating from page', selectedImageIndex + 1, 'to page', annotation.pageIndex);
      setSelectedImageIndex(annotationPageIndex);
    } else {
      console.log('Staying on current page', selectedImageIndex + 1);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrevImage();
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        e.preventDefault();
        handleNextImage();
      } else if (e.key === 'Escape') {
        onClose();
      } else if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const getImageUrl = (file: any) => {
    if (typeof file === 'string') {
      return file;
    }
    
    // For video files with thumbnails, return the thumbnail URL for thumbnail display
    // but keep the original video URL for actual video playback
    const isVideo = file.type?.startsWith('video/') || 
                   file.name?.match(/\.(mp4|mov|avi|webm|mkv)$/i);
    
    if (isVideo && file.thumbnail) {
      return file.thumbnail;
    }
    
    return file.url;
  };

  // Get the original file URL (for video playback, not thumbnails)
  const getOriginalFileUrl = (file: any) => {
    return typeof file === 'string' ? file : file.url;
  };

  // Download all media files
  const handleDownloadAllMedia = async () => {
    if (allViewableFiles.length === 0) return;
    
    try {
      // Dynamic import of JSZip for client-side ZIP creation
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      
      // Update button state to show progress
      const button = document.querySelector('[title="Download all media files"]') as HTMLButtonElement;
      if (button) {
        button.innerHTML = `
          <div class="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin"></div>
          Creating ZIP...
        `;
        button.disabled = true;
      }
      
      let processedFiles = 0;
      const totalFiles = allViewableFiles.length;
      
      for (let i = 0; i < allViewableFiles.length; i++) {
        const file = allViewableFiles[i];
        let fileUrl: string;
        let fileName: string;
        
        if (typeof file === 'string') {
          fileUrl = file;
          fileName = `media_${i + 1}_${file.split('/').pop() || 'file'}`;
        } else {
          fileUrl = (file as any).url || getOriginalFileUrl(file);
          fileName = (file as any).name || `media_${i + 1}`;
        }
        
        try {
          // Fetch the file content
          const response = await fetch(fileUrl);
          if (!response.ok) {
            console.warn(`Failed to fetch ${fileName}: ${response.statusText}`);
            continue;
          }
          
          // Get file as blob
          const blob = await response.blob();
          
          // Add to ZIP with organized folder structure
          const fileExtension = fileName.split('.').pop()?.toLowerCase();
          let folderName = 'Other';
          
          if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(fileExtension || '')) {
            folderName = 'Images';
          } else if (['mp4', 'mov', 'avi', 'webm', 'mkv'].includes(fileExtension || '')) {
            folderName = 'Videos';
          } else if (fileExtension === 'pdf') {
            folderName = 'PDFs';
          }
          
          // Add file to appropriate folder in ZIP
          zip.folder(folderName)?.file(fileName, blob);
          
          processedFiles++;
          
          // Update progress
          if (button) {
            button.innerHTML = `
              <div class="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin"></div>
              ${Math.round((processedFiles / totalFiles) * 100)}%
            `;
          }
        } catch (fileError) {
          console.error(`Error processing file ${fileName}:`, fileError);
          continue;
        }
      }
      
      if (processedFiles === 0) {
        throw new Error('No files could be processed');
      }
      
      // Update button to show ZIP generation
      if (button) {
        button.innerHTML = `
          <div class="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin"></div>
          Generating ZIP...
        `;
      }
      
      // Generate ZIP file
      const zipBlob = await zip.generateAsync({ 
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
      });
      
      // Create download link
      const link = document.createElement('a');
      link.href = URL.createObjectURL(zipBlob);
      link.download = `${task.title || 'Media Files'}_${new Date().toISOString().split('T')[0]}.zip`;
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up blob URL
      URL.revokeObjectURL(link.href);
      
      console.log(`✅ Successfully downloaded ${processedFiles} files in ZIP format`);
      
    } catch (error) {
      console.error('Error creating ZIP file:', error);
      alert(`Error creating ZIP file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      // Restore button state
      const button = document.querySelector('[title="Download all media files"]') as HTMLButtonElement;
      if (button) {
        button.innerHTML = `
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Download All
        `;
        button.disabled = false;
      }
    }
  };

  if (!allViewableFiles.length) {
    return (
      <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="text-center">
          <div className="text-6xl mb-4">📁</div>
          <h2 className="text-2xl font-semibold text-white mb-2">
            {(task.media_files?.length || 0) > 0 ? 'All Media Files Deleted' : 'No Media Files Found'}
          </h2>
          <p className="text-white/70 mb-6">
            {(task.media_files?.length || 0) > 0 
              ? 'All media files have been removed from this task.' 
              : "This task doesn't have any media files to preview."
            }
          </p>
          {otherFiles.length > 0 && (
            <div className="text-xs text-white/50 mb-6">
              {otherFiles.length} other file(s) available but not previewable
            </div>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gradient-to-br from-gray-200 via-gray-400 to-gray-200 text-black text-sm rounded transition-colors font-semibold"
          >
            Back to Tasks
          </button>
        </div>
      </div>
    );
  }

  // --- Main return ---
  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-50 flex">
      {/* Header Bar */}
      <div className="absolute top-0 left-0 right-0 h-14 bg-black/40 backdrop-blur-xl border-b border-white/10 flex items-center justify-between px-6 z-10">
        <div className="flex items-center gap-4">
          <button
            onClick={onClose}
            className="flex items-center gap-2 text-white/70 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Back to Board</span>
          </button>
          <div className="w-px h-6 bg-white/10" />
          <h1 className="text-white font-semibold">Design Workspace</h1>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Delete notification */}
          {deleteMessage && (
            <div className={`px-3 py-1.5 rounded text-xs font-medium ${
              deleteMessage.includes('successfully') 
                ? 'bg-green-500/20 text-green-300 border border-green-500/30' 
                : 'bg-white/20 text-white border border-white/30'
            }`}>
              {deleteMessage}
            </div>
          )}
          
          <div className="text-xs text-white/50">
            {selectedImageIndex + 1} of {allViewableFiles.length}
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-br from-gray-200 via-gray-400 to-gray-200 text-black text-sm rounded transition-colors font-semibold disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex w-full pt-14">
        
        {/* Main Canvas Area - Now Full Width */}
        <div className="flex-1 relative bg-black/10">
          {(() => {
            const currentFile: any = allViewableFiles[selectedImageIndex];
            if (!currentFile) return null;
            
            const fileName = typeof currentFile === 'string' 
              ? currentFile.split('/').pop() || 'Unknown file'
              : currentFile.name || 'Unknown file';
            const isVideo = typeof currentFile === 'string' ? 
              fileName.match(/\.(mp4|mov|avi|webm|mkv)$/i) :
              currentFile.type?.startsWith('video/') || fileName.match(/\.(mp4|mov|avi|webm|mkv)$/i);
            const fileUrl = getImageUrl(currentFile);
            // For videos, use original URL for playback
            const playbackUrl = isVideo ? getOriginalFileUrl(currentFile) : fileUrl;
            const isPdf = typeof currentFile === 'string' ? 
              fileName.match(/\.pdf$/i) :
              (currentFile.type === 'application/pdf' || fileName.match(/\.pdf$/i));
            
            // Check if this is a native PDF file (not converted to images)
            const isNativePdf = typeof currentFile === 'string' ? 
              false :
              currentFile.type === 'application/pdf' && !currentFile.originalType;
            
            // Get all PDF pages for multi-page PDFs
            const allPdfPages = allViewableFiles.filter((file: any) => 
              (typeof file === 'string' ? file.includes('_page_') : 
               file.originalType === 'application/pdf')
            );

            if (isVideo) {
              // Video
              return (
                <MediaViewer
                  key={selectedImageIndex}
                  mediaUrl={playbackUrl}
                  fileName={fileName}
                  mediaType="video"
                  task={task}
                  onAnnotationsChange={setCurrentAnnotations}
                  currentPageNumber={selectedImageIndex + 1}
                  selectedAnnotationId={selectedAnnotationId}
                  setSelectedAnnotationId={setSelectedAnnotationId}
                  onPageChange={(pageNum) => setSelectedImageIndex(pageNum - 1)}
                  zoom={zoom}
                  setZoom={setZoom}
                  resetZoomPan={resetZoomPan}
                  pan={pan}
                  setPan={setPan}
                  showCommentPopup={showCommentPopup}
                  setShowCommentPopup={setShowCommentPopup}
                  isAnnotationMode={isAnnotationMode}
                  setIsAnnotationMode={setIsAnnotationMode}
                  currentAnnotations={currentAnnotations}
                />
              );
            } else if (isNativePdf) {
              // Native PDF file - use browser's built-in PDF viewer
              return (
                <MediaViewer
                  key={selectedImageIndex}
                  mediaUrl={playbackUrl} // Use original URL for PDF
                  fileName={fileName}
                  mediaType="pdf"
                  task={task}
                  onAnnotationsChange={setCurrentAnnotations}
                  currentPageNumber={1}
                  selectedAnnotationId={selectedAnnotationId}
                  setSelectedAnnotationId={setSelectedAnnotationId}
                  onPageChange={() => {}} // No page change needed for single PDF
                  zoom={zoom}
                  setZoom={setZoom}
                  resetZoomPan={resetZoomPan}
                  pan={pan}
                  setPan={setPan}
                  showCommentPopup={showCommentPopup}
                  setShowCommentPopup={setShowCommentPopup}
                  isAnnotationMode={isAnnotationMode}
                  setIsAnnotationMode={setIsAnnotationMode}
                  currentAnnotations={currentAnnotations}
                />
              );
            } else if (isPdf) {
              // Multi-page PDF
              const originalPdfName = fileName.replace(/_page_\d+\.(jpg|jpeg|png)$/, '.pdf');
              
              if (allPdfPages.length > 1) {
                return (
                  <MediaViewer
                    key={selectedImageIndex}
                    mediaUrl={fileUrl}
                    fileName={originalPdfName}
                    mediaType="pdf"
                    pdfPages={allPdfPages}
                    task={task}
                    onAnnotationsChange={setCurrentAnnotations}
                    currentPageNumber={selectedImageIndex + 1}
                    selectedAnnotationId={selectedAnnotationId}
                    setSelectedAnnotationId={setSelectedAnnotationId}
                    onPageChange={(pageNum) => setSelectedImageIndex(pageNum - 1)}
                    zoom={zoom}
                    setZoom={setZoom}
                    resetZoomPan={resetZoomPan}
                    pan={pan}
                    setPan={setPan}
                    showCommentPopup={showCommentPopup}
                    setShowCommentPopup={setShowCommentPopup}
                    isAnnotationMode={isAnnotationMode}
                    setIsAnnotationMode={setIsAnnotationMode}
                    currentAnnotations={currentAnnotations}
                  />
                );
              } else {
                // Single page or treat as regular image
                return (
                  <MediaViewer
                    key={selectedImageIndex}
                    mediaUrl={fileUrl}
                    fileName={fileName}
                    mediaType="image"
                    task={task}
                    onAnnotationsChange={setCurrentAnnotations}
                    currentPageNumber={selectedImageIndex + 1}
                    selectedAnnotationId={selectedAnnotationId}
                    setSelectedAnnotationId={setSelectedAnnotationId}
                    onPageChange={(pageNum) => setSelectedImageIndex(pageNum - 1)}
                    zoom={zoom}
                    setZoom={setZoom}
                    resetZoomPan={resetZoomPan}
                    pan={pan}
                    setPan={setPan}
                    showCommentPopup={showCommentPopup}
                    setShowCommentPopup={setShowCommentPopup}
                    isAnnotationMode={isAnnotationMode}
                    setIsAnnotationMode={setIsAnnotationMode}
                    currentAnnotations={currentAnnotations}
                  />
                );
              }
            } else {
              // Image
              return (
                <MediaViewer
                  key={selectedImageIndex}
                  mediaUrl={fileUrl}
                  fileName={fileName}
                  mediaType="image"
                  task={task}
                  onAnnotationsChange={setCurrentAnnotations}
                  currentPageNumber={selectedImageIndex + 1}
                  selectedAnnotationId={selectedAnnotationId}
                  setSelectedAnnotationId={setSelectedAnnotationId}
                  onPageChange={(pageNum) => setSelectedImageIndex(pageNum - 1)}
                  zoom={zoom}
                  setZoom={setZoom}
                  resetZoomPan={resetZoomPan}
                  pan={pan}
                  setPan={setPan}
                  showCommentPopup={showCommentPopup}
                  setShowCommentPopup={setShowCommentPopup}
                  isAnnotationMode={isAnnotationMode}
                  setIsAnnotationMode={setIsAnnotationMode}
                  currentAnnotations={currentAnnotations}
                />
              );
            }
          })()}
           
          {/* Navigation Overlay */}
          {allViewableFiles.length > 1 && !isAnnotationMode && (
            <>
              <button
                onClick={handlePrevImage}
                className="absolute left-4 top-1/2 transform -translate-y-1/2 p-3 bg-black/60 backdrop-blur-sm rounded-full text-white/80 hover:text-white hover:bg-black/80 transition-all z-10"
              >
                <ChevronUp className="w-6 h-6 -rotate-90" />
              </button>
              <button
                onClick={handleNextImage}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 p-3 bg-black/60 backdrop-blur-sm rounded-full text-white/80 hover:text-white hover:bg-black/80 transition-all z-10"
              >
                <ChevronUp className="w-6 h-6 rotate-90" />
              </button>
            </>
          )}
        </div>

        {/* Right Sidebar - Task Info */}
        <div className="w-96 bg-black/30 backdrop-blur-sm border-l border-white/10 flex flex-col h-screen">
          <div className="p-4 flex-1 overflow-hidden flex flex-col">
            
            {/* Top Section - Task Info */}
            <div className="space-y-3 flex-shrink-0">
              {/* Task Title */}
              <div>
              <label className="block text-xs font-medium text-white/80 mb-1 flex items-center gap-2">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                Task Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 bg-black/20 border border-white/10 rounded text-sm text-white placeholder-white/40 focus:outline-none focus:ring-1 focus:ring-white/20 focus:border-white/30 transition-all"
                placeholder="Enter task title..."
              />
            </div>

            {/* Caption */}
            <div className="flex-shrink-0">
              <label className="block text-xs font-medium text-white/80 mb-1 flex items-center gap-2">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                </svg>
                Caption
              </label>
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                rows={5}
                className="w-full px-3 py-2 bg-black/20 border border-white/10 rounded text-sm text-white placeholder-white/40 focus:outline-none focus:ring-1 focus:ring-white/20 focus:border-white/30 transition-all resize-none"
                placeholder="Write your social media caption here..."
              />
            </div>

            {/* Task Metadata */}
            <div className="space-y-2 pt-3 border-t border-white/10 flex-shrink-0">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <div className="text-white/50 mb-0.5">Status</div>
                  <div className="text-white font-medium text-xs">IN PROGRESS</div>
                </div>
                <div>
                  <div className="text-white/50 mb-0.5">Assignee</div>
                  <div className="text-white font-medium text-xs">{task.assignee || 'Unassigned'}</div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <div className="text-white/50 mb-0.5">Created</div>
                  <div className="text-white text-xs">{formatDate(task.created_at)}</div>
                </div>
                <div>
                  <div className="text-white/50 mb-0.5">Due Date</div>
                  <div className="text-white text-xs">{task.due_date ? formatDate(task.due_date) : 'No deadline'}</div>
                </div>
              </div>
            </div>
            </div>

            {/* Bottom Section - Annotations */}
            <div className="flex-1 flex flex-col min-h-0">
            {/* Annotations */}
            <div className="pt-2 border-t border-white/10 flex flex-col min-h-0" style={{ maxHeight: '300px' }}>
              <h4 className="text-xs font-medium text-white/80 mb-2 flex items-center gap-1.5 flex-shrink-0">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                Annotations
              </h4>
              <div className="space-y-2 overflow-y-auto" style={{ maxHeight: '280px' }}>
                {(() => {
                   // Use real annotations from MediaViewer
                   const annotations = currentAnnotations;
                   const currentPage = selectedImageIndex + 1;
                   
                   if (annotations.length === 0) {
                     return (
                       <div className="text-xs text-white/40 italic text-center py-3">
                         No annotations yet. Use the highlighter tool to add annotations.
                       </div>
                     );
                   }
                   
                   // Group annotations by page for better organization
                   const annotationsByPage = annotations.reduce((acc: any, annotation: any) => {
                     const page = annotation.pageIndex || 1;
                     if (!acc[page]) acc[page] = [];
                     acc[page].push(annotation);
                     return acc;
                   }, {});
                   
                   return (
                     <div className="space-y-2">
                       {Object.entries(annotationsByPage)
                         .sort(([a], [b]) => Number(a) - Number(b))
                         .map(([pageNum, pageAnnotations]: [string, any]) => (
                           <div key={pageNum} className="mb-3">
                             <div className={`text-xs font-medium mb-1.5 flex items-center gap-1.5 ${
                               Number(pageNum) === currentPage ? 'text-white' : 'text-white/50'
                             }`}>
                               <span>Page {pageNum}</span>
                               {Number(pageNum) === currentPage && (
                                 <span className="bg-yellow-500/30 text-yellow-300 px-1.5 py-0.5 rounded text-xs">
                                   Current
                                 </span>
                               )}
                               <span className="text-white/40">
                                 ({pageAnnotations.length})
                               </span>
                             </div>
                             <div className="space-y-1.5">
                               {pageAnnotations.map((annotation: any) => (
                                 <div 
                                   key={annotation.id} 
                                   onClick={() => {
                                     handleAnnotationClick(annotation);
                                     setIsAnnotationMode(false);
                                   }}
                                   className={`rounded-lg p-2.5 border transition-colors cursor-pointer ${
                                     selectedAnnotationId === annotation.id
                                       ? 'bg-yellow-500/20 border-yellow-500/40 hover:bg-yellow-500/30'
                                       : Number(pageNum) === currentPage
                                         ? 'bg-black/20 border-white/10 hover:bg-black/30'
                                         : 'bg-black/10 border-white/5 hover:bg-black/20'
                                   }`}
                                 >
                                   <div className={`text-xs mb-0.5 ${
                                     Number(pageNum) === currentPage ? 'text-white/90' : 'text-white/60'
                                   }`}>
                                     {annotation.comment}
                                   </div>
                                   <div className="text-xs text-white/40">
                                     {new Date(annotation.timestamp).toLocaleString()}
                                   </div>
                                   {selectedAnnotationId === annotation.id && (
                                     <div className="text-xs text-yellow-400 mt-0.5 font-medium">
                                       ● Selected
                                     </div>
                                   )}
                                 </div>
                               ))}
                             </div>
                           </div>
                         ))}
                     </div>
                   );
                 })()}
              </div>
            </div>
            </div>

            {/* Middle Section - Thumbnails & Tools */}
            <div className="space-y-3 flex-shrink-0">
            {/* Horizontal Thumbnail Strip */}
            <div className="pt-3 border-t border-white/10 flex-shrink-0">
              <h4 className="text-xs font-medium text-white/80 mb-3 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Media Files ({allViewableFiles.length})
                
                {/* Download All Button - Show only for specific statuses */}
                {(task.status === 'in_progress' || task.status === 'approved' || task.status === 'in_review') && allViewableFiles.length > 0 && (
                  <button
                    onClick={handleDownloadAllMedia}
                    className="ml-auto px-2 py-1 bg-green-600/20 hover:bg-green-600/30 border border-green-500/30 rounded text-xs font-medium text-green-300 hover:text-green-200 transition-all flex items-center gap-1"
                    title="Download all media files"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Download All
                  </button>
                )}
              </h4>
              
                                           {/* Horizontal Thumbnail Grid */}
              <div 
                className="flex gap-3 overflow-x-auto pb-2 mb-4 scrollbar-hide" 
                style={{ 
                  scrollbarWidth: 'none', 
                  msOverflowStyle: 'none',
                  minHeight: '72px' // Fixed min-height to prevent initial collapse
                }}
              >
                {!isMounted || allViewableFiles.length === 0 ? (
                  // Loading skeleton to prevent layout shift
                  <div className="flex gap-3 items-center">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden bg-white/5 flex-shrink-0 animate-pulse">
                        <div className="w-full h-full bg-white/10"></div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <>
                    {allViewableFiles.map((file: any, index: number) => {
                      const isVideo = typeof file === 'string' ? 
                        file.match(/\.(mp4|mov|avi|webm|mkv)$/i) :
                        file.type?.startsWith('video/') || file.name?.match(/\.(mp4|mov|avi|webm|mkv)$/i);
                      const isPdf = typeof file === 'string' ? 
                        file.match(/\.pdf$/i) :
                        (file.type === 'application/pdf' || file.name?.match(/\.pdf$/i));
                      const isNativePdf = typeof file === 'string' ? 
                        false :
                        file.type === 'application/pdf' && !file.originalType;
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
                          onClick={() => {
                            setSelectedImageIndex(index);
                          }}
                          className={`relative group aspect-square rounded-lg overflow-hidden transition-all cursor-pointer flex-shrink-0 w-16 h-16 hover:ring-1 hover:ring-white/20 ${
                            draggedIndex === index ? 'opacity-30 scale-95 rotate-3' : ''
                          } ${
                            dragOverIndex === index && draggedIndex !== index ? 'ring-2 ring-blue-400 scale-105' : ''
                          } ${
                            selectedImageIndex === index ? 'ring-2 ring-white scale-105' : ''
                          }`}
                          style={{
                            width: '64px',
                            height: '64px',
                            minWidth: '64px',
                            minHeight: '64px',
                            maxWidth: '64px',
                            maxHeight: '64px'
                          }}
                        >
                            <div className="w-full h-full bg-white/5 relative">
                            {/* Video thumbnail or icon */}
                            {isVideo ? (
                              isPdf || isConvertedPdf ? (
                                <div className="w-full h-full flex items-center justify-center bg-red-500/20">
                                  <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                  </svg>
                                </div>
                              ) : file.thumbnail && !failedThumbnails.has(index) ? (
                                <div className="relative w-full h-full bg-black/50">
                                  {loadingThumbnails.has(index) && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
                                      <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />
                                    </div>
                                  )}
                                  <img
                                    src={file.thumbnail}
                                    alt={`Video thumbnail ${index + 1}`}
                                    className="w-full h-full object-cover"
                                    style={{ 
                                      backgroundColor: 'rgba(0, 0, 0, 0.5)',
                                      minWidth: '64px',
                                      minHeight: '64px'
                                    }}
                                    onLoad={() => {
                                      setLoadingThumbnails(prev => {
                                        const newSet = new Set(prev);
                                        newSet.delete(index);
                                        return newSet;
                                      });
                                    }}
                                    onLoadStart={() => {
                                      setLoadingThumbnails(prev => new Set(prev).add(index));
                                    }}
                                    onError={() => {
                                      setFailedThumbnails(prev => new Set(prev).add(index));
                                      setLoadingThumbnails(prev => {
                                        const newSet = new Set(prev);
                                        newSet.delete(index);
                                        return newSet;
                                      });
                                    }}
                                  />
                                </div>
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-black/50">
                                  <svg className="w-6 h-6 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1.01M15 10h1.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m15 9-6 6m0 0v-6m0 6h6" />
                                  </svg>
                                </div>
                              )
                            ) : isPdf || isConvertedPdf ? (
                              <div className="w-full h-full flex items-center justify-center bg-red-500/20">
                                <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                </svg>
                              </div>
                            ) : (
                              <div className="relative w-full h-full bg-white/10">
                                {loadingThumbnails.has(index) && (
                                  <div className="absolute inset-0 flex items-center justify-center bg-black/20 z-10">
                                    <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />
                                  </div>
                                )}
                                <img
                                  src={getImageUrl(file)}
                                  alt={`Media ${index + 1}`}
                                  className="w-full h-full object-cover"
                                  style={{ 
                                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                    minWidth: '64px',
                                    minHeight: '64px'
                                  }}
                                  onLoad={() => {
                                    setLoadingThumbnails(prev => {
                                      const newSet = new Set(prev);
                                      newSet.delete(index);
                                      return newSet;
                                    });
                                  }}
                                  onLoadStart={() => {
                                    setLoadingThumbnails(prev => new Set(prev).add(index));
                                  }}
                                  onError={(e) => {
                                    setLoadingThumbnails(prev => {
                                      const newSet = new Set(prev);
                                      newSet.delete(index);
                                      return newSet;
                                    });
                                    // Keep the placeholder instead of hiding
                                    e.currentTarget.style.opacity = '0';
                                  }}
                                />
                              </div>
                            )}

                            {/* Delete button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const mediaIndex = viewableToMediaMapping[index];
                                if (mediaIndex !== undefined) {
                                  handleDeleteFile(mediaIndex);
                                } else {
                                  // Fallback: Find the media index directly
                                  const currentFile = allViewableFiles[index];
                                  const currentUrl = typeof currentFile === 'string' ? currentFile : (currentFile as any).url;
                                  const fallbackIndex = mediaFiles.findIndex((file: any) => {
                                    const fileUrl = typeof file === 'string' ? file : file.url;
                                    return fileUrl === currentUrl;
                                  });
                                  if (fallbackIndex !== -1) {
                                    handleDeleteFile(fallbackIndex);
                                  }
                                }
                              }}
                              className="absolute top-1 right-1 w-5 h-5 bg-red-500/80 hover:bg-red-500 backdrop-blur-sm rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all z-10"
                            >
                              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                    
                    {/* Upload button */}
                    <div className="aspect-square border-2 border-dashed border-white/20 rounded-lg flex items-center justify-center hover:border-white/40 transition-colors cursor-pointer group relative flex-shrink-0 w-16 h-16">
                      <input
                        type="file"
                        multiple
                        accept="image/*,video/*,.pdf"
                        onChange={(e) => {
                          if (e.target.files) {
                            handleFileUpload(e.target.files);
                          }
                          e.target.value = ''; // Reset input
                        }}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        disabled={uploading}
                      />
                      <div className="text-center pointer-events-none">
                        {uploading ? (
                          <div className="w-4 h-4 border border-white/30 border-t-white rounded-full animate-spin mx-auto mb-1" />
                        ) : (
                          <svg className="w-4 h-4 text-white/50 group-hover:text-white/80 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                        )}
                        <div className="text-[10px] text-white/50 group-hover:text-white/80">
                          {uploading ? 'Uploading...' : 'Upload'}
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Tools */}
            <div className="pt-2 border-t border-white/10 flex-shrink-0">
              <h4 className="text-xs font-medium text-white/80 mb-2 flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                </svg>
                Tools
              </h4>
              
              {/* Zoom Controls */}
              <div className="space-y-3 mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-white/60 min-w-[40px]">Zoom:</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setZoom(Math.max(0.5, zoom / 1.2));
                        setSelectedAnnotationId(null);
                      }} 
                      disabled={isAnnotationMode}
                      className={`w-7 h-7 rounded flex items-center justify-center text-xs font-bold transition-colors ${
                        isAnnotationMode
                          ? 'bg-white/5 text-white/30 cursor-not-allowed border border-white/10' 
                          : 'bg-white/10 hover:bg-white/20 text-white hover:bg-white/30 border border-white/20'
                      }`}
                      title={isAnnotationMode ? "Disabled during annotation" : "Zoom Out"}
                    >
                      −
                    </button>
                    
                    <div className={`px-2 py-1 text-white text-xs rounded text-center min-w-[50px] border transition-colors ${
                      isAnnotationMode 
                        ? 'bg-black/20 border-white/10 text-white/30' 
                        : 'bg-black/50 border-white/10 text-white'
                    }`}>
                      {Math.round(zoom * 100)}%
                    </div>
                    
                    <button 
                      onClick={() => {
                        setZoom(Math.min(3, zoom * 1.2));
                        setSelectedAnnotationId(null);
                      }} 
                      disabled={isAnnotationMode}
                      className={`w-7 h-7 rounded flex items-center justify-center text-xs font-bold transition-colors ${
                        isAnnotationMode 
                          ? 'bg-white/5 text-white/30 cursor-not-allowed border border-white/10' 
                          : 'bg-white/10 hover:bg-white/20 text-white hover:bg-white/30 border border-white/20'
                      }`}
                      title={isAnnotationMode ? "Disabled during annotation" : "Zoom In"}
                    >
                      +
                    </button>
                    
                    <button 
                      onClick={() => {
                        resetZoomPan();
                        setSelectedAnnotationId(null);
                      }} 
                      disabled={isAnnotationMode}
                      className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                        isAnnotationMode 
                          ? 'bg-white/5 text-white/30 cursor-not-allowed border border-white/10' 
                          : 'bg-white/10 hover:bg-white/20 text-white hover:bg-white/30 border border-white/20'
                      }`}
                      title={isAnnotationMode ? "Disabled during annotation" : "Reset Zoom & Pan"}
                    >
                      Reset
                    </button>
                  </div>
                </div>
              </div>

              {/* Annotation Tool */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-white/60 min-w-[40px]">Draw:</span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      if (!isAnnotationMode) {
                        // When activating annotation mode, reset zoom and pan for better annotation experience
                        resetZoomPan();
                        setSelectedAnnotationId(null);
                        setIsAnnotationMode(true);
                      } else {
                        // When deactivating annotation mode, just turn it off
                        setIsAnnotationMode(false);
                        setSelectedAnnotationId(null);
                      }
                    }}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium transition-all ${
                      isAnnotationMode
                        ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                        : 'bg-black/20 text-white/70 border border-white/10 hover:bg-black/30'
                    }`}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                    Highlighter
                  </button>
                </div>
              </div>
            </div>
            </div>

            {/* Bottom Section - Annotations */}
            <div className="flex-1 flex flex-col min-h-0">
            </div>
          </div>
        </div>
      </div>
  </div>
  );
  }