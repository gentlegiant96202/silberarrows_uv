'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Image from 'next/image';
import { Plus, Calendar, User, Clock, Video, FileText, Image as ImageIcon, Eye, PenTool, Archive, CheckCircle, Instagram, Pin } from 'lucide-react';
import { MarketingTask, MarketingStatus, MarketingColumn } from '@/types/marketing';
import { supabase } from '@/lib/supabaseClient';
import { useModulePermissions } from '@/lib/useModulePermissions';
import { useUserRole } from '@/lib/useUserRole';
import { useAuth } from '@/components/shared/AuthProvider';
import { useSearchStore } from '@/lib/searchStore';
import { FixedSizeGrid as Grid } from 'react-window';
import dayjs from 'dayjs';
import AddTaskModal from './AddTaskModal';
import MarketingWorkspace from './MarketingWorkspace';
import { useMarketingLoading } from '@/lib/MarketingLoadingContext';

// Helper function to format dates to dd/mm/yyyy
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

// Helper function to format relative due dates
const formatRelativeDueDate = (dateString: string) => {
  const dueDate = new Date(dateString);
  const today = new Date();
  
  // Reset time to start of day for accurate day comparison
  dueDate.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  
  const diffTime = dueDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) {
    return 'Due today';
  } else if (diffDays === 1) {
    return 'Due in 1D';
  } else if (diffDays > 1 && diffDays <= 7) {
    return `Due in ${diffDays}D`;
  } else if (diffDays > 7 && diffDays <= 30) {
    const weeks = Math.ceil(diffDays / 7);
    return `Due in ${weeks}W`;
  } else if (diffDays > 30) {
    const months = Math.ceil(diffDays / 30);
    return `Due in ${months}M`;
  } else if (diffDays === -1) {
    return 'Overdue 1D';
  } else if (diffDays < -1 && diffDays >= -7) {
    return `Overdue ${Math.abs(diffDays)}D`;
  } else if (diffDays < -7 && diffDays >= -30) {
    const weeks = Math.ceil(Math.abs(diffDays) / 7);
    return `Overdue ${weeks}W`;
  } else {
    const months = Math.ceil(Math.abs(diffDays) / 30);
    return `Overdue ${months}M`;
  }
};

// Helper function to check if task is urgent (due in 1 day or overdue)
const isTaskUrgent = (dateString: string) => {
  const dueDate = new Date(dateString);
  const today = new Date();
  
  // Reset time to start of day for accurate day comparison
  dueDate.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  
  const diffTime = dueDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  // Urgent if due today, due in 1 day, or overdue
  return diffDays <= 1;
};

// Helper to get preview image (thumbnail or first image)
function getPreviewUrl(mediaFiles: any[] = []): string | null {
  if (!mediaFiles || !mediaFiles.length) return null;
  
  // Helper function to convert URLs to custom domain and add transformations
  const convertToCustomDomain = (url: string | null): string | null => {
    if (!url) return null;
    // Convert old Supabase URLs to custom domain
    let transformedUrl = url.replace('rrxfvdtubynlsanplbta.supabase.co', 'database.silberarrows.com');
    
    // Add Supabase image transformation for thumbnails (300x375px for 4:5 aspect ratio)
    if (transformedUrl.includes('.supabase.co') || transformedUrl.includes('database.silberarrows.com')) {
      transformedUrl = `${transformedUrl}?width=300&height=375&resize=cover`;
    }
    
    return transformedUrl;
  };
  
  // Prefer thumbnail if present
  const withThumbnail = mediaFiles.find((f: any) => f.thumbnail);
  if (withThumbnail) return convertToCustomDomain(withThumbnail.thumbnail);
  
  // Try to find an image file
  const imageFile = mediaFiles.find((f: any) => {
    if (typeof f === 'string') {
      return f.match(/\.(jpe?g|png|webp|gif)$/i);
    }
    return f.type?.startsWith('image/') || f.name?.match(/\.(jpe?g|png|webp|gif)$/i);
  });
  
  if (imageFile) {
    const url = typeof imageFile === 'string' ? imageFile : imageFile.url;
    return convertToCustomDomain(url);
  }
  
  // Fallback: Check for PDF files and return a special indicator
  const pdfFile = mediaFiles.find((f: any) => {
    if (typeof f === 'string') {
      return f.match(/\.pdf$/i);
    }
    return f.type === 'application/pdf' || f.name?.match(/\.pdf$/i);
  });

  if (pdfFile) {
    return 'PDF_PREVIEW'; // Special indicator for PDF preview
  }

  // Ultimate fallback: return the URL of the first media item (image / video / whatever)
  const first = mediaFiles[0];
  if (typeof first === 'string') return convertToCustomDomain(first);
  return convertToCustomDomain(first.url || null);
}

// Column definitions matching CRM Kanban style
const columns: MarketingColumn[] = [
  { 
    key: "intake", 
    title: "INTAKE", 
    icon: <Archive className="w-4 h-4" />,
    color: "gray"
  },
  { 
    key: "planned", 
    title: "PLANNED", 
    icon: <Calendar className="w-4 h-4" />,
    color: "purple"
  },
  { 
    key: "in_progress", 
    title: "IN PROGRESS", 
    icon: <Clock className="w-4 h-4" />,
    color: "yellow"
  },
  { 
    key: "in_review", 
    title: "IN REVIEW", 
    icon: <Eye className="w-4 h-4" />,
    color: "orange"
  },
  { 
    key: "approved", 
    title: "APPROVED", 
    icon: <CheckCircle className="w-4 h-4" />,
    color: "green"
  },
  { 
    key: "instagram_feed_preview", 
    title: "INSTAGRAM FEED PREVIEW", 
    icon: <Instagram className="w-4 h-4" />,
    color: "pink"
  },
  { 
    key: "archived", 
    title: "ARCHIVED", 
    icon: <Archive className="w-4 h-4" />,
    color: "gray"
  }
];

type ColKey = MarketingStatus;

// Skeleton Loading Components
const SkeletonCard = () => (
  <div className="relative overflow-hidden rounded-xl select-none animate-pulse bg-gradient-to-br from-white/5 via-white/3 to-white/5 backdrop-blur-xl border border-white/10">
    {/* Main Content Container */}
    <div className="flex px-2 py-1 gap-1.5 min-h-[55px]">
      {/* Left Side - Preview Thumbnail Skeleton */}
      <div className="flex-shrink-0 w-16 h-20 relative">
        <div className="w-full h-full rounded-lg bg-white/10 animate-pulse"></div>
        {/* Icons Row Skeleton */}
        <div className="absolute bottom-1 left-0 right-0 flex items-center justify-between px-1">
          <div className="w-6 h-3 bg-white/10 rounded-full"></div>
          <div className="w-4 h-3 bg-white/10 rounded-full"></div>
        </div>
      </div>
      
      {/* Right Side - Content Skeleton */}
      <div className="flex-1 flex flex-col justify-between min-w-0 py-0.5">
        {/* Title Section */}
        <div className="flex-shrink-0">
          <div className="h-3 bg-white/10 rounded w-3/4 mb-1"></div>
        </div>
        
        {/* Metadata Section */}
        <div className="flex-shrink-0 space-y-1">
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 bg-white/10 rounded"></div>
            <div className="h-2 bg-white/10 rounded w-16"></div>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 bg-white/10 rounded"></div>
            <div className="h-2 bg-white/10 rounded w-20"></div>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 bg-white/10 rounded"></div>
            <div className="h-2 bg-white/10 rounded w-14"></div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const SkeletonInstagramCard = () => (
  <div className="aspect-[4/5] bg-white/5 border border-white/10 backdrop-blur-sm rounded-lg animate-pulse">
    <div className="w-full h-full rounded-lg bg-white/10"></div>
  </div>
);

const SkeletonColumn = ({ title, icon }: { title: string; icon: React.ReactNode }) => (
  <div className={`bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-3 flex flex-col flex-1 min-w-0 transition-all duration-300 ${
    title === 'INSTAGRAM FEED PREVIEW' 
      ? 'flex-[1.38] max-w-sm' 
      : ''
  }`}>
    <div className="mb-3 px-1">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          {icon}
          <h3 className="text-[10px] font-medium text-white whitespace-nowrap">
            {title}
          </h3>
          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-white/10 text-white/70 text-[8px] font-medium animate-pulse">
            --
          </span>
        </div>
      </div>
    </div>
    
    <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar">
      {title === 'INSTAGRAM FEED PREVIEW' ? (
        <div className="grid grid-cols-3 gap-1">
          {Array.from({ length: 9 }).map((_, i) => (
            <SkeletonInstagramCard key={i} />
          ))}
        </div>
      ) : (
        <div className="space-y-1">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}
    </div>
  </div>
);

// Instagram Feed Virtualized Grid Component
interface InstagramGridItemProps {
  columnIndex: number;
  rowIndex: number;
  style: React.CSSProperties;
  data: {
    tasks: MarketingTask[];
    columnCount: number;
    onDragStart: (task: MarketingTask) => void;
    onDragEnd: () => void;
    handleCardClick: (task: MarketingTask) => void;
    draggedTask: MarketingTask | null;
    canEdit: boolean;
    handlePin: (taskId: string, currentPinned: boolean) => Promise<void>;
    pinningTask: string | null;
  };
}

const InstagramGridItem: React.FC<InstagramGridItemProps> = ({
  columnIndex,
  rowIndex,
  style,
  data
}) => {
  const { tasks, columnCount, onDragStart, onDragEnd, handleCardClick, draggedTask, canEdit, handlePin, pinningTask } = data;
  const taskIndex = rowIndex * columnCount + columnIndex;
  const task = tasks[taskIndex];

  if (!task) {
    return <div style={style} />;
  }

  // Use preview URL if it has been computed (images populate after cards render)
  const previewUrl = task.previewUrl;

  return (
    <div style={{ ...style, padding: '2px' }}>
      <div
        key={task.id}
        draggable={canEdit}
        onDragStart={canEdit ? () => onDragStart(task) : undefined}
        onDragEnd={canEdit ? onDragEnd : undefined}
        onClick={() => handleCardClick(task)}
        className={`aspect-[4/5] bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 backdrop-blur-sm rounded-lg shadow-sm cursor-pointer group relative overflow-hidden ${
          draggedTask?.id === task.id 
            ? 'z-50 opacity-80 border-white/40' 
            : 'z-10 transition-all duration-200'
        }`}
      >
        {/* Annotation Badge */}
        {task.status === 'in_progress' && task.annotations && task.annotations.length > 0 && (
          <div className="absolute top-0.5 left-0.5 z-20">
            <div 
              className="flex items-center gap-0.5 bg-orange-400/80 text-white text-[6px] font-medium px-0.5 py-0.5 rounded-full shadow-sm"
              title={`${task.annotations.length} annotation${task.annotations.length > 1 ? 's' : ''}`}
            >
              <div className="w-0.5 h-0.5 bg-white rounded-full"></div>
              <span>{task.annotations.length}</span>
            </div>
          </div>
        )}
        
        {/* Pin Icon */}
        {canEdit && (
          <div className="absolute top-0.5 right-0.5 z-30">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handlePin(task.id, task.pinned || false);
              }}
              disabled={pinningTask === task.id}
              className={`
                p-0.5 rounded-full transition-all duration-200 
                ${task.pinned 
                  ? 'bg-gradient-to-br from-gray-300 via-gray-500 to-gray-700 text-white shadow-lg opacity-100' 
                  : 'bg-black/50 backdrop-blur-sm text-white/70 opacity-0 group-hover:opacity-100 hover:text-white'
                }
                ${pinningTask === task.id ? 'animate-pulse' : ''}
                hover:bg-gradient-to-br hover:from-gray-300 hover:via-gray-500 hover:to-gray-700
                hover:shadow-lg hover:scale-110
                focus:outline-none focus:ring-2 focus:ring-gray-400/50
              `}
              title={task.pinned ? 'Unpin from top' : 'Pin to top'}
            >
              <Pin className="w-2 h-2" />
            </button>
          </div>
        )}
        
        {/* Image Display */}
        <div className="w-full h-full rounded-lg overflow-hidden relative">
          {previewUrl === 'PDF_PREVIEW' ? (
            <div className="w-full h-full bg-gradient-to-br from-red-500/20 to-red-600/10 flex items-center justify-center p-1.5">
              <FileText className="w-8 h-8 text-red-400" />
            </div>
          ) : previewUrl && previewUrl !== null ? (
            <div className="w-full h-full animate-fadeIn">
              <Image 
                src={previewUrl} 
                alt={task.title}
                fill
                sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                className="object-cover transition-transform duration-300 group-hover:scale-110"
                loading="lazy"
                placeholder="blur"
                blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjUwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjUwMCIgZmlsbD0iIzFhMWExYSIvPjwvc3ZnPg=="
              />
            </div>
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center p-1.5 border border-white/5">
              <Image 
                src="/MAIN LOGO.png" 
                alt="SilberArrows Logo" 
                width={32} 
                height={32} 
                className="object-contain opacity-40"
                priority={false}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default function MarketingKanbanBoard() {
  const { setLoading: setGlobalLoading } = useMarketingLoading();
  const [tasks, setTasks] = useState<MarketingTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showWorkspace, setShowWorkspace] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [archivedTasks, setArchivedTasks] = useState<MarketingTask[]>([]);
  const [loadingArchived, setLoadingArchived] = useState(false);
  const [archivedFetched, setArchivedFetched] = useState(false);
  const [showInstagramFeed, setShowInstagramFeed] = useState(false);
  const [selectedTask, setSelectedTask] = useState<MarketingTask | null>(null);
  const [draggedTask, setDraggedTask] = useState<MarketingTask | null>(null);
  const [hovered, setHovered] = useState<ColKey | null>(null);
  const [pinningTask, setPinningTask] = useState<string | null>(null);
  const [tasksWithActiveUploads, setTasksWithActiveUploads] = useState<Set<string>>(new Set());
  const hasFetchedTasks = useRef(false);
  const instagramColumnRef = useRef<HTMLDivElement>(null);
  const [columnWidth, setColumnWidth] = useState(360);
  
  // Progressive loading state for fade-in animation (like inventory kanban)
  const [columnsVisible, setColumnsVisible] = useState(true);
  
  // Sync local loading state with global loading context
  useEffect(() => {
    setGlobalLoading(loading);
  }, [loading, setGlobalLoading]);
  
  // Helper to group tasks by status (avoids repeated reduce logic)
  const groupTasksByStatus = useCallback((tasksList: MarketingTask[]): Record<ColKey, MarketingTask[]> => {
    const base: Record<ColKey, MarketingTask[]> = {
      intake: [],
      planned: [],
      in_progress: [],
      in_review: [],
      approved: [],
      instagram_feed_preview: [],
      archived: []
    };

    for (const task of tasksList) {
      if (base[task.status as ColKey]) {
        base[task.status as ColKey].push(task);
      }
    }

    return base;
  }, []);

  // Column-by-column optimistic loading states
  const [columnLoading, setColumnLoading] = useState<Record<ColKey, boolean>>({
    intake: true,
    planned: true,
    in_progress: true,
    in_review: true,
    approved: true,
    instagram_feed_preview: true,
    archived: true
  });
  const [columnData, setColumnData] = useState<Record<ColKey, MarketingTask[]>>({
    intake: [],
    planned: [],
    in_progress: [],
    in_review: [],
    approved: [],
    instagram_feed_preview: [],
    archived: []
  });
  
  // Get permissions and user role
  const { canView, canCreate, canEdit, canDelete, isLoading: permissionsLoading } = useModulePermissions('marketing');
  const { isAdmin } = useUserRole();
  const { user } = useAuth();
  
  // Get search query from global store
  const { query: searchQuery } = useSearchStore();

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


  // Measure column width for responsive Instagram grid
  useEffect(() => {
    const updateColumnWidth = () => {
      if (instagramColumnRef.current) {
        const width = instagramColumnRef.current.offsetWidth - 16; // Account for padding
        setColumnWidth(Math.max(width, 300)); // Minimum width of 300px
      }
    };

    updateColumnWidth();
    window.addEventListener('resize', updateColumnWidth);
    return () => window.removeEventListener('resize', updateColumnWidth);
  }, []);

  // Lightweight poll to check for card movements when tab becomes active
  const pollForCardMovements = useCallback(async () => {
    try {
      const headers = await getAuthHeaders();
      
      // Use lightweight mode - only fetch essential fields to detect status changes
      const response = await fetch('/api/design-tasks?limit=200&exclude_archived=true&lightweight=true', { headers });
      
      if (!response.ok) return;

      const rawData = await response.json();
      
      // Only update tasks that have changed (status or updated_at)
      setTasks(prevTasks => {
        const taskMap = new Map(prevTasks.map(t => [t.id, t]));
        let hasChanges = false;
        
        const updatedTasks = rawData.map((rawTask: any) => {
          const existingTask = taskMap.get(rawTask.id);
          
          // Check if status or updated_at changed
          if (existingTask) {
            const statusChanged = existingTask.status !== rawTask.status;
            const updatedChanged = existingTask.updated_at !== rawTask.updated_at;
            
            if (statusChanged || updatedChanged) {
              hasChanges = true;
              // Preserve existing media_files and previewUrl to avoid refetching
              return {
                ...existingTask,
                status: rawTask.status,
                updated_at: rawTask.updated_at,
                pinned: rawTask.pinned || false,
                // Keep existing media_files and previewUrl
                media_files: existingTask.media_files || [],
                previewUrl: existingTask.previewUrl || null
              };
            }
            return existingTask;
          } else {
            // New task
            hasChanges = true;
            return transformRawTask(rawTask);
          }
        });
        
        // Remove tasks that no longer exist
        const existingIds = new Set(rawData.map((t: any) => t.id));
        const filteredTasks = updatedTasks.filter((t: MarketingTask) => existingIds.has(t.id));
        
        if (hasChanges || filteredTasks.length !== prevTasks.length) {
          setColumnData(groupTasksByStatus(filteredTasks));
          return filteredTasks;
        }
        
        return prevTasks;
      });
    } catch (error) {
      // Silently fail - real-time subscription will handle updates
    }
  }, [transformRawTask, groupTasksByStatus, getAuthHeaders]);

  // Fetch all tasks at once with LIGHTWEIGHT mode for faster initial load
  const fetchAllTasks = async () => {
    try {
      const headers = await getAuthHeaders();
      const startTime = performance.now();
      
      // Use lightweight=true to fetch only essential fields (no media_files, annotations, etc.)
      const response = await fetch('/api/design-tasks?limit=200&exclude_archived=true&lightweight=true', { headers });
      
      if (!response.ok) {
        setLoading(false);
        return;
      }

      const rawData = await response.json();
      const fetchTime = performance.now() - startTime;
      const baseTasks: MarketingTask[] = rawData.map((rawTask: any) => ({
        id: rawTask.id,
        title: rawTask.title,
        description: '', // Not fetched in lightweight mode
        status: rawTask.status,
        assignee: rawTask.requested_by || rawTask.assignee,
        due_date: rawTask.due_date,
        created_at: rawTask.created_at,
        updated_at: rawTask.updated_at,
        media_files: [], // Not fetched in lightweight mode - will lazy load when needed
        annotations: [], // Not fetched in lightweight mode
        pinned: rawTask.pinned || false,
        task_type: rawTask.task_type || 'design',
        priority: 'medium',
        content_type: 'post',
        tags: [],
        created_by: rawTask.created_by,
        acknowledged_at: rawTask.acknowledged_at,
        previewUrl: null // Will be loaded for critical columns
      }));
      setTasks(baseTasks);
      setColumnData(groupTasksByStatus(baseTasks));
      setColumnLoading({
        intake: false,
        planned: false,
        in_progress: false,
        in_review: false,
        approved: false,
        instagram_feed_preview: false,
        archived: false
      });
      setLoading(false);

      // IMMEDIATELY fetch preview data for visual review columns (in_review, approved, instagram_feed_preview)
      // These columns need previews for proper review workflow
      fetchPreviewsForCriticalColumns(baseTasks);

    } catch (error) {
      setLoading(false);
    }
  };

  // Fetch full task details (including media_files) for tasks in visual review columns
  // Loads simultaneously across columns, each column cascades top to bottom
  const fetchPreviewsForCriticalColumns = async (baseTasks: MarketingTask[]) => {
    try {
      // Identify tasks that need preview images (in_progress, in_review, approved)
      // Note: instagram_feed_preview is loaded on-demand when user clicks "Show Feed"
      const criticalStatuses = ['in_progress', 'in_review', 'approved'];
      
      // Group tasks by status and sort by updated_at (newest first, which is top of column)
      const tasksByStatus: Record<string, MarketingTask[]> = {};
      baseTasks.forEach(task => {
        if (criticalStatuses.includes(task.status)) {
          if (!tasksByStatus[task.status]) {
            tasksByStatus[task.status] = [];
          }
          tasksByStatus[task.status].push(task);
        }
      });

      // Sort each column's tasks by updated_at DESC (top to bottom order)
      Object.keys(tasksByStatus).forEach(status => {
        tasksByStatus[status].sort((a, b) => {
          // Pinned tasks first, then by updated_at
          if (a.pinned && !b.pinned) return -1;
          if (!a.pinned && b.pinned) return 1;
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
        });
      });

      const totalTasks = Object.values(tasksByStatus).reduce((sum, arr) => sum + arr.length, 0);
      
      if (totalTasks === 0) {
        return;
      }
      const headers = await getAuthHeaders();
      const startTime = performance.now();

      // Load each column simultaneously, but cascade within each column
      const columnPromises = criticalStatuses.map(async (status) => {
        const columnTasks = tasksByStatus[status] || [];
        
        for (let i = 0; i < columnTasks.length; i++) {
          const task = columnTasks[i];
          
          try {
            const response = await fetch(`/api/design-tasks?id=${task.id}`, { headers });
            if (response.ok) {
              const fullTask = await response.json();
              const enrichedTask: MarketingTask = {
                ...task,
                media_files: fullTask.media_files || [],
                annotations: fullTask.annotations || [],
                description: fullTask.description || '',
                previewUrl: getPreviewUrl(fullTask.media_files || [])
              };

              // Update state immediately for smooth progressive loading
              setTasks(prev => prev.map(t => t.id === task.id ? enrichedTask : t));
              
              setColumnData(prev => {
                const updated = { ...prev };
                const list = updated[task.status];
                if (list) {
                  const idx = list.findIndex(t => t.id === task.id);
                  if (idx !== -1) {
                    list[idx] = enrichedTask;
                  }
                }
                return updated;
              });

              // Faster cascade delay (20ms between cards in same column)
              if (i < columnTasks.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 20));
              }
            }
          } catch (error) {
          }
        }
      });

      // Wait for all columns to finish loading
      await Promise.all(columnPromises);

      const fetchTime = performance.now() - startTime;
    } catch (error) {
    }
  };

  // Fetch previews for Instagram feed when user clicks "Show Feed"
  const fetchInstagramPreviews = async () => {
    try {
      const instagramTasks = tasks.filter(task => task.status === 'instagram_feed_preview');
      
      // Filter tasks that don't have previews loaded yet
      const tasksNeedingPreviews = instagramTasks.filter(task => 
        !task.previewUrl || task.previewUrl === null
      );

      if (tasksNeedingPreviews.length === 0) {
        return;
      }
      const headers = await getAuthHeaders();
      const startTime = performance.now();

      // Sort by pinned + updated_at (top to bottom)
      const sortedTasks = [...tasksNeedingPreviews].sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      });

      // Load sequentially with fast cascade
      for (let i = 0; i < sortedTasks.length; i++) {
        const task = sortedTasks[i];
        
        try {
          const response = await fetch(`/api/design-tasks?id=${task.id}`, { headers });
          if (response.ok) {
            const fullTask = await response.json();
            const enrichedTask: MarketingTask = {
              ...task,
              media_files: fullTask.media_files || [],
              annotations: fullTask.annotations || [],
              description: fullTask.description || '',
              previewUrl: getPreviewUrl(fullTask.media_files || [])
            };

            setTasks(prev => prev.map(t => t.id === task.id ? enrichedTask : t));
            
            setColumnData(prev => {
              const updated = { ...prev };
              const list = updated['instagram_feed_preview'];
              if (list) {
                const idx = list.findIndex(t => t.id === task.id);
                if (idx !== -1) {
                  list[idx] = enrichedTask;
                }
              }
              return updated;
            });

            // Fast cascade for Instagram grid
            if (i < sortedTasks.length - 1) {
              await new Promise(resolve => setTimeout(resolve, 15));
            }
          }
        } catch (error) {
        }
      }

      const fetchTime = performance.now() - startTime;
    } catch (error) {
    }
  };

  // Helper function to transform raw database task to frontend format
  const transformRawTask = useCallback((rawTask: any): MarketingTask => {
    const baseTask: MarketingTask = {
      id: rawTask.id,
      title: rawTask.title,
      description: rawTask.description,
      status: rawTask.status,
      assignee: rawTask.requested_by, // Map database field to frontend field
      due_date: rawTask.due_date,
      created_at: rawTask.created_at,
      updated_at: rawTask.updated_at,
      media_files: rawTask.media_files || [],
      annotations: rawTask.annotations || [],
      pinned: rawTask.pinned || false,
      task_type: rawTask.task_type || 'design',
      priority: 'medium',
      content_type: 'post',
      tags: [],
      previewUrl: getPreviewUrl(rawTask.media_files || [])
    };
    return baseTask;
  }, []);

  useEffect(() => {
    if (!hasFetchedTasks.current) {
      fetchAllTasks();
      hasFetchedTasks.current = true;
    }
    
    // Progressive fade-in animation (like inventory kanban)
    const timer = setTimeout(() => {
      setColumnsVisible(true);
    }, 100);
    
    // Real-time subscription for live updates across browsers
    const channel = supabase
      .channel('marketing-tasks-stream')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'design_tasks' },
        (payload: any) => {
          // ===== UPDATE TASKS STATE =====
          setTasks(prev => {
            if (payload.eventType === 'INSERT') {
              const newTask = transformRawTask(payload.new);
              
              // Check if task already exists to prevent duplicates
              const taskExists = prev.some(task => task.id === newTask.id);
              if (taskExists) {
                return prev;
              }
              return [...prev, newTask];
            } 
            else if (payload.eventType === 'UPDATE') {
              const updatedTask = transformRawTask(payload.new);
              
              return prev.map(task => {
                if (task.id === updatedTask.id) {
                  // Smart merging: If the local task has more recent updates than the incoming update,
                  // preserve local data. This prevents overwrites during active file uploads.
                  const localUpdateTime = new Date(task.updated_at).getTime();
                  const incomingUpdateTime = new Date(updatedTask.updated_at).getTime();
                  
                  // If this is a local update from AddTaskModal, ignore real-time updates for a short period
                  if ((task as any)._localUpdate) {
                    const timeSinceLocalUpdate = Date.now() - localUpdateTime;
                    if (timeSinceLocalUpdate < 2000) { 
                      return task;
                    }
                    // Remove the local update flag after grace period
                    const { _localUpdate, ...cleanTask } = task as any;
                    task = cleanTask;
                  }
                  
                  // If local task is newer, preserve local media_files and other critical fields
                  if (localUpdateTime > incomingUpdateTime) {
                    return {
                      ...updatedTask,
                      media_files: task.media_files, // Preserve local media files
                      updated_at: task.updated_at,   // Keep local timestamp
                      previewUrl: task.previewUrl    // Keep local preview
                    };
                  }
                  
                  // If incoming update has more media files than local, merge them intelligently
                  const incomingMediaCount = updatedTask.media_files?.length || 0;
                  const localMediaCount = task.media_files?.length || 0;
                  if (incomingMediaCount > localMediaCount) {
                    return updatedTask;
                  }
                  
                  // Default: use incoming update
                  return updatedTask;
                }
                return task;
              });
            } 
            else if (payload.eventType === 'DELETE') {
              return prev.filter(task => task.id !== payload.old.id);
            }
            
            return prev;
          });
          
          // ===== SYNC COLUMNDATA WITH THE SAME CHANGES =====
          setColumnData(prev => {
            const updated = { ...prev };
            
            if (payload.eventType === 'INSERT') {
              const newTask = transformRawTask(payload.new);
              
              // Check if task already exists in column to prevent duplicates
              const taskExists = updated[newTask.status]?.some(task => task.id === newTask.id);
              if (taskExists) {
                return prev;
              }
              
              // Add to appropriate column
              if (updated[newTask.status]) {
                updated[newTask.status] = [newTask, ...updated[newTask.status]];
              }
            }
            else if (payload.eventType === 'UPDATE') {
              const updatedTask = transformRawTask(payload.new);
              const oldStatus = payload.old?.status;
              
              // Remove from old column (could be any column if status changed)
              Object.keys(updated).forEach(key => {
                const colKey = key as ColKey;
                updated[colKey] = updated[colKey].filter(t => t.id !== updatedTask.id);
              });
              
              // Add to correct column with smart merging
              if (updated[updatedTask.status]) {
                // Check if we should preserve local state (same logic as tasks state)
                const existingTask = Object.values(updated)
                  .flat()
                  .find(t => t.id === updatedTask.id);
                
                if (existingTask && (existingTask as any)._localUpdate) {
                  const localUpdateTime = new Date(existingTask.updated_at).getTime();
                  const timeSinceLocalUpdate = Date.now() - localUpdateTime;
                  
                  if (timeSinceLocalUpdate < 2000) {
                    // Re-add the existing task to its original column
                    updated[existingTask.status] = [existingTask, ...updated[existingTask.status]];
                    return updated;
                  }
                }
                
                updated[updatedTask.status] = [updatedTask, ...updated[updatedTask.status]];
              }
            }
            else if (payload.eventType === 'DELETE') {
              // Remove from all columns
              Object.keys(updated).forEach(key => {
                const colKey = key as ColKey;
                updated[colKey] = updated[colKey].filter(t => t.id !== payload.old.id);
              });
            }
            
            return updated;
          });
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
        } else if (status === 'CHANNEL_ERROR') {
        } else if (status === 'CLOSED') {
        }
      });

    // Cleanup both timer and subscription on unmount
    return () => {
      clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [transformRawTask]);

  // Lightweight poll when tab becomes active (visibility change)
  useEffect(() => {
    let pollTimeout: NodeJS.Timeout | null = null;
    let lastPollTime = 0;
    const POLL_DEBOUNCE_MS = 2000; // Prevent rapid polls (min 2 seconds between polls)

    const handleVisibilityChange = () => {
      // Only poll when tab becomes visible (not when it becomes hidden)
      if (document.visibilityState === 'visible') {
        const now = Date.now();
        const timeSinceLastPoll = now - lastPollTime;
        
        // Debounce: only poll if enough time has passed since last poll
        if (timeSinceLastPoll >= POLL_DEBOUNCE_MS) {
          // Clear any pending poll
          if (pollTimeout) {
            clearTimeout(pollTimeout);
          }
          
          // Poll immediately
          lastPollTime = now;
          pollForCardMovements();
        } else {
          // Schedule poll for when debounce period expires
          const remainingTime = POLL_DEBOUNCE_MS - timeSinceLastPoll;
          if (pollTimeout) {
            clearTimeout(pollTimeout);
          }
          pollTimeout = setTimeout(() => {
            lastPollTime = Date.now();
            pollForCardMovements();
          }, remainingTime);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (pollTimeout) {
        clearTimeout(pollTimeout);
      }
    };
  }, [pollForCardMovements]);

  // Group tasks by status with search filtering and optimized sorting logic (memoized for performance)
  const grouped = useMemo(() => {
    const result: Record<ColKey, MarketingTask[]> = {
      intake: [],
      planned: [],
      in_progress: [],
      in_review: [],
      approved: [],
      instagram_feed_preview: [],
      archived: []
    };
    
    // Pre-compile search query for performance
    const hasSearch = searchQuery && searchQuery.trim();
    const searchLower = hasSearch ? searchQuery.toLowerCase() : '';
    
    // Process each column
    for (const col of columns) {
      const columnTasks = col.key === 'archived' && showArchived 
        ? archivedTasks 
        : (columnData[col.key] || []);
      
      // Filter and process in a single pass for better performance
      const processedTasks: (MarketingTask & { sortKey: number })[] = [];
      
      for (const task of columnTasks) {
        // Status check
        if (task.status !== col.key) continue;
        
        // Search filter - skip if doesn't match
        if (hasSearch) {
          const matchesSearch = 
            task.title?.toLowerCase().includes(searchLower) ||
            task.assignee?.toLowerCase().includes(searchLower) ||
            task.task_type?.toLowerCase().includes(searchLower);
          
          if (!matchesSearch) continue;
        }
        
        // Add with pre-computed sort key for faster sorting
        // Pinned tasks get negative timestamps so they sort first
        const timestamp = new Date(task.updated_at).getTime();
        processedTasks.push({
          ...task,
          sortKey: task.pinned ? -timestamp : timestamp
        });
      }
      
      // Sort by pre-computed sort key (much faster than multiple comparisons)
      processedTasks.sort((a, b) => b.sortKey - a.sortKey);
      
      // Remove sort keys before storing
      result[col.key] = processedTasks;
    }
    
    return result;
  }, [columnData, archivedTasks, showArchived, columns, searchQuery]);

  // Optimized drag and drop handlers (memoized for performance)
  const onDragStart = useCallback((task: MarketingTask) => {
    setDraggedTask(task);
  }, []);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  // Fixed onDrop with fresh data fetching to prevent media loss
  const onDrop = useCallback((status: ColKey) => async (e: React.DragEvent) => {
    e.preventDefault();
    if (!draggedTask || draggedTask.status === status) {
      setDraggedTask(null);
      setHovered(null);
      return;
    }

    // Permission check: Only users with edit permission can move cards
    if (!canEdit) {
      if (process.env.NODE_ENV === 'development') {
      }
      setDraggedTask(null);
      setHovered(null);
      return;
    }

    // Prevent moving cards that have active uploads to avoid media loss
    if (tasksWithActiveUploads.has(draggedTask.id)) {
      alert('Please wait for file uploads to complete before moving this card.');
      setDraggedTask(null);
      setHovered(null);
      return;
    }

    // Special rule: Only admins can move cards to "approved" status
    if (status === 'approved' && !isAdmin) {
      alert('Only administrators can approve tasks');
      setDraggedTask(null);
      setHovered(null);
      return;
    }
    
    const taskToUpdate = draggedTask;
    
    // Clear drag state immediately for better UX
    setDraggedTask(null);
    setHovered(null);
    
    // Optimistic update for immediate UI feedback - preserve all existing data
    const updatedTaskOptimistic = { ...taskToUpdate, status, updated_at: new Date().toISOString() };
    
    setTasks(prevTasks => 
      prevTasks.map(task =>
        task.id === taskToUpdate.id
          ? updatedTaskOptimistic
          : task
      )
    );
    
    // Also update columnData for immediate visual feedback
    setColumnData(prev => {
      const updated = { ...prev };
      // Remove from old column
      updated[taskToUpdate.status] = updated[taskToUpdate.status].filter(t => t.id !== taskToUpdate.id);
      // Add to new column
      updated[status] = [updatedTaskOptimistic, ...updated[status]];
      return updated;
    });
    
    // Fetch fresh task data from database to ensure we have the latest media_files
    try {
      const headers = await getAuthHeaders();
      
      // Step 1: Get current task state from database to preserve any recent uploads
      const fetchResponse = await fetch(`/api/design-tasks?id=${taskToUpdate.id}`, { headers });
      if (!fetchResponse.ok) {
        throw new Error('Failed to fetch current task state');
      }
      
      const freshTaskData = await fetchResponse.json();
      const currentTask = Array.isArray(freshTaskData) ? freshTaskData[0] : freshTaskData;
      
      if (!currentTask) {
        throw new Error('Task not found in database');
      }
      
      // Step 2: Update with only the status change, preserving fresh media_files
      const response = await fetch('/api/design-tasks', {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          id: taskToUpdate.id,
          status,
          // Use fresh data from database to preserve recent uploads
          title: currentTask.title,
          description: currentTask.description,
          assignee: currentTask.requested_by, // Use only the authoritative database field
          due_date: currentTask.due_date,
          task_type: currentTask.task_type,
          media_files: currentTask.media_files, // This is the critical fix - use fresh data
          // Don't send annotations in status updates to avoid conflicts
        }),
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }
      
      // Update local state with the response to ensure consistency
      const updatedTask: MarketingTask = await response.json();

      // Ensure we keep media_files if backend omitted them
      const existingMedia = selectedTask?.media_files || [];
      const mergedMedia = (updatedTask.media_files && updatedTask.media_files.length)
        ? updatedTask.media_files
        : existingMedia;

      const previewUrl = getPreviewUrl(mergedMedia || []);

      const taskWithPreview = {
        ...updatedTask,
        assignee: (updatedTask as any).requested_by, // Map database field back to frontend
        media_files: mergedMedia,
        previewUrl: previewUrl || selectedTask?.previewUrl || null,
        _localUpdate: true,
      } as MarketingTask;

      // Update local state with preview-aware task
      setTasks(prevTasks => 
        prevTasks.map(task => 
          task.id === taskWithPreview.id ? taskWithPreview : task
        )
      );
      return taskWithPreview;
      
    } catch (error) {
      // Revert optimistic update on error
      setTasks(prevTasks => 
        prevTasks.map(task =>
          task.id === taskToUpdate.id
            ? { ...task, status: taskToUpdate.status, updated_at: taskToUpdate.updated_at }
            : task
        )
      );
      
      // Also revert columnData
      setColumnData(prev => {
        const updated = { ...prev };
        // Remove from the new column
        updated[status] = updated[status].filter(t => t.id !== taskToUpdate.id);
        // Add back to the old column
        updated[taskToUpdate.status] = [taskToUpdate, ...updated[taskToUpdate.status]];
        return updated;
      });
      // Show user-friendly error message
      alert('Failed to move card. Your media files are safe. Please try again.');
    }
  }, [draggedTask, isAdmin, canEdit, getAuthHeaders, tasksWithActiveUploads]);

  const onDragEnd = useCallback(() => {
    setDraggedTask(null);
    setHovered(null);
  }, []);

  const handleCardClick = async (task: MarketingTask) => {
    // Check if task needs full data (media_files not loaded yet)
    // Note: Tasks in review columns already have previews loaded via fetchPreviewsForCriticalColumns
    const needsFullData = !task.media_files || task.media_files.length === 0;
    
    if (needsFullData) {
      try {
        const headers = await getAuthHeaders();
        const response = await fetch(`/api/design-tasks?id=${task.id}`, { headers });
        
        if (response.ok) {
          const fullTask = await response.json();
          const enrichedTask: MarketingTask = {
            ...task,
            description: fullTask.description || '',
            media_files: fullTask.media_files || [],
            annotations: fullTask.annotations || [],
            previewUrl: getPreviewUrl(fullTask.media_files || [])
          };
          
          // Update task in state with full data
          setTasks(prev => prev.map(t => t.id === task.id ? enrichedTask : t));
          setColumnData(prev => {
            const updated = { ...prev };
            const list = updated[task.status];
            if (list) {
              const idx = list.findIndex(t => t.id === task.id);
              if (idx !== -1) {
                list[idx] = enrichedTask;
              }
            }
            return updated;
          });
          
          setSelectedTask(enrichedTask);
        } else {
          // Fallback to lightweight task if fetch fails
          setSelectedTask(task);
        }
      } catch (error) {
        // Fallback to lightweight task if fetch fails
        setSelectedTask(task);
      }
    } else {
      setSelectedTask(task);
    }
    
    // Show workspace for in_progress and in_review tasks, modal for others
    if (task.status === 'in_progress' || task.status === 'in_review') {
      setShowWorkspace(true);
    } else {
      setShowModal(true);
    }
  };

  const handleCreateTask = () => {
    setSelectedTask(null);
    setShowModal(true);
  };

  const handlePin = async (taskId: string, currentPinned: boolean) => {
    try {
      setPinningTask(taskId);
      const newPinned = !currentPinned;

      const headers = await getAuthHeaders();
      const response = await fetch('/api/social-media-tasks/pin', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          taskId,
          pinned: newPinned
        }),
      });

      if (response.ok) {
        // Update local state immediately for better UX
        setTasks(prev => prev.map(task =>
          task.id === taskId
            ? { ...task, pinned: newPinned, updated_at: new Date().toISOString() }
            : task
        ));
      } else {
        const error = await response.json();
        // Optionally show user notification here
      }
    } catch (error) {
      // Optionally show user notification here
    } finally {
      setPinningTask(null);
    }
  };

  const handleSaveTask = async (taskData: Partial<MarketingTask>): Promise<MarketingTask | null> => {
    try {
      if (selectedTask) {
        // Update existing task
        const updatePayload = {
          id: selectedTask.id,
          ...taskData,
        };
        const headers = await getAuthHeaders();
        const response = await fetch('/api/design-tasks', {
          method: 'PUT',
          headers,
          body: JSON.stringify(updatePayload),
        });
        if (response.ok) {
          const updatedTask: any = await response.json(); // API returns database format
          
          // Map database fields back to frontend format and recalculate preview URL
        const taskWithPreview: MarketingTask = {
            ...updatedTask,
            assignee: updatedTask.requested_by, // Map database field back to frontend
          previewUrl: getPreviewUrl(updatedTask.media_files || [])
          };
          
          // Update local state with the updated task including preview
          setTasks(prevTasks => 
            prevTasks.map(task => 
              task.id === updatedTask.id ? taskWithPreview : task
            )
          );
          return taskWithPreview;
        } else {
          return null;
        }
      } else {
        // Create new task
        const headers = await getAuthHeaders();
        const response = await fetch('/api/design-tasks', {
          method: 'POST',
          headers,
          body: JSON.stringify(taskData),
        });
        if (response.ok) {
          const newTask: any = await response.json(); // API returns database format
          
          // Map database fields back to frontend format and calculate preview URL
        const taskWithPreview: MarketingTask = {
            ...newTask,
            assignee: newTask.requested_by, // Map database field back to frontend
          previewUrl: getPreviewUrl(newTask.media_files || [])
          };
          
          // Add new task to local state with preview
          setTasks(prevTasks => [...prevTasks, taskWithPreview]);
          return taskWithPreview;
        } else {
          return null;
        }
      }
    } catch (error) {
      return null;
    }
  };

  // Fetch archived tasks on-demand with lightweight mode
  const fetchArchivedTasks = async () => {
    if (archivedFetched) {
      // If already fetched, just ensure they're visible
      setShowArchived(true);
      return;
    }

    try {
      setLoadingArchived(true);
      const headers = await getAuthHeaders();
      const startTime = performance.now();
      
      // Use lightweight mode for archived tasks too
      const response = await fetch('/api/design-tasks?limit=100&status=archived&lightweight=true', { headers });
      
      if (response.ok) {
        const rawData = await response.json();
        const fetchTime = performance.now() - startTime;
        // Transform archived tasks the same way as regular tasks (lightweight)
        const transformedArchivedTasks = rawData.map((rawTask: any) => ({
          id: rawTask.id,
          title: rawTask.title,
          description: '', // Not fetched in lightweight mode
          status: rawTask.status,
          assignee: rawTask.requested_by || rawTask.assignee,
          due_date: rawTask.due_date,
          created_at: rawTask.created_at,
          updated_at: rawTask.updated_at,
          media_files: [], // Not fetched in lightweight mode
          annotations: [], // Not fetched in lightweight mode
          pinned: rawTask.pinned || false,
          task_type: rawTask.task_type || 'design',
          priority: 'medium',
          content_type: 'post',
          tags: [],
          created_by: rawTask.created_by,
          acknowledged_at: rawTask.acknowledged_at,
          previewUrl: null // Will be loaded on-demand
        }));
        
        setArchivedTasks(transformedArchivedTasks);
        setArchivedFetched(true);
        setShowArchived(true);
      } else {
      }
    } catch (error) {
    } finally {
      setLoadingArchived(false);
    }
  };

  // Archive task function
  const handleArchiveTask = async (taskId: string) => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch('/api/design-tasks', {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          id: taskId,
          status: 'archived'
        }),
      });
      
      if (response.ok) {
        const updatedTask: MarketingTask = await response.json();
        // Update the tasks state
        setTasks(prevTasks => 
          prevTasks.map(task => 
            task.id === taskId ? updatedTask : task
          )
        );
      } else {
      }
    } catch (error) {
    }
  };

  const handleCloseWorkspace = () => {
    setShowWorkspace(false);
    setSelectedTask(null);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedTask(null);
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/design-tasks?id=${taskId}`, {
        method: 'DELETE',
        headers,
      });

      if (response.ok) {
        setTasks(prev => prev.filter(task => task.id !== taskId));
        setShowModal(false);
        setSelectedTask(null);
      } else {
      }
    } catch (error) {
    }
  };


  return (
    <div className="h-full px-4 overflow-hidden relative">
      <div className={`flex gap-3 pb-4 w-full h-full overflow-hidden transition-all duration-700 ease-out transform ${
        columnsVisible 
          ? 'opacity-100 translate-y-0' 
          : 'opacity-0 translate-y-4'
      }`}>
        {columns
          .filter(col => {
            if (col.key === 'archived' && !showArchived) return false;
            if (col.key === 'instagram_feed_preview' && !showInstagramFeed) return false;
            return true;
          })
          .map(col => (
          <div
            key={col.key}
            ref={col.key === 'instagram_feed_preview' ? instagramColumnRef : undefined}
            className={`bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-3 flex flex-col flex-1 min-w-0 transition-all duration-300 ${hovered === col.key ? 'ring-2 ring-gray-300/60' : ''} ${
              col.key === 'instagram_feed_preview' 
                ? 'flex-[1.38] max-w-sm' 
                : ''
            }`}
            onDragOver={(e) => { onDragOver(e); setHovered(col.key); }}
            onDrop={onDrop(col.key)}
            onDragEnter={() => setHovered(col.key)}
            onDragLeave={(e) => { 
              if (!e.currentTarget.contains(e.relatedTarget as Node)) setHovered(null); 
            }}
          >
            <div className="mb-3 px-1">
              <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                {col.icon}
                <h3 className="text-[10px] font-medium text-white whitespace-nowrap">
                  {col.title}
                </h3>
                {col.key === 'archived' && (
                  <button
                    onClick={fetchArchivedTasks}
                    disabled={loadingArchived}
                    className={`
                      inline-flex items-center gap-1 px-1.5 py-0.5 rounded-lg text-[8px] font-medium transition-all duration-200
                      ${archivedFetched 
                        ? 'bg-green-600/20 text-green-300 border border-green-500/30' 
                        : 'bg-gray-600/20 text-gray-300 border border-gray-500/30 hover:bg-gray-600/30'
                      }
                      ${loadingArchived ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                    title={
                      loadingArchived 
                        ? 'Loading archived tasks...' 
                        : archivedFetched 
                          ? 'Archived tasks loaded'
                          : 'Fetch archived tasks'
                    }
                  >
                    <Archive className={`w-2.5 h-2.5 ${loadingArchived ? 'animate-spin' : ''}`} />
                    {loadingArchived 
                      ? 'Loading...' 
                      : archivedFetched 
                        ? 'Loaded'
                        : 'Fetch'
                    }
                  </button>
                )}
                {col.key === 'intake' && canCreate ? (
                  <button
                    onClick={handleCreateTask}
                    className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[8px] font-semibold transition-colors shadow-sm bg-gradient-to-br from-gray-200 via-gray-400 to-gray-200 text-black hover:brightness-110"
                    title="Add new task"
                  >
                    {grouped[col.key].length}
                    <span className="ml-0.5 text-[10px] leading-none">＋</span>
                  </button>
                ) : col.key !== 'intake' ? (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-white/10 text-white/70 text-[8px] font-medium">
                    {grouped[col.key].length}
                  </span>
                ) : null}
              </div>
              
              {/* Search Results Indicator - Show when search is active */}
              {searchQuery && searchQuery.trim() && (
                <div className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[8px] font-medium bg-gray-600/20 text-gray-300 border border-gray-500/30">
                  <span>{grouped[col.key].length} found</span>
                </div>
              )}
              
              {/* Instagram Feed Toggle Button - Show in Approved column */}
              {col.key === 'approved' && (
                <button
                  onClick={() => {
                    const newState = !showInstagramFeed;
                    setShowInstagramFeed(newState);
                    // Load Instagram previews when showing the feed
                    if (newState) {
                      fetchInstagramPreviews();
                    }
                  }}
                  className={`
                    inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[8px] font-medium transition-all duration-200
                    ${showInstagramFeed 
                      ? 'bg-gradient-to-br from-gray-200 via-gray-400 to-gray-200 text-black shadow-lg' 
                      : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white'
                    }
                    backdrop-blur-sm border border-white/20 hover:border-white/30
                  `}
                  title={showInstagramFeed ? 'Hide Instagram feed preview' : 'Show Instagram feed preview'}
                >
                  <Instagram className="w-2.5 h-2.5" />
                  {showInstagramFeed ? 'Hide' : 'Show'} Feed
                </button>
              )}
              
              {/* Archive Toggle Button - Show in Instagram Feed Preview column */}
              {col.key === 'instagram_feed_preview' && (
                <button
                  onClick={() => setShowArchived(!showArchived)}
                  className={`
                    inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[8px] font-medium transition-all duration-200
                    ${showArchived 
                      ? 'bg-gray-600 text-white shadow-lg' 
                      : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white'
                    }
                    backdrop-blur-sm border border-white/20 hover:border-white/30
                  `}
                  title={showArchived ? 'Hide archived tasks' : 'Show archived tasks'}
                >
                  <Archive className="w-2.5 h-2.5" />
                  {showArchived ? 'Hide' : 'Show'} Archive
                </button>
              )}
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar">
              {columnLoading[col.key] ? (
                // Show skeleton while column is loading
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <SkeletonCard key={i} />
                  ))}
                </div>
              ) : col.key === 'instagram_feed_preview' ? (
                // Virtualized Instagram feed preview layout
                <div className="h-full">
                  {grouped[col.key].length > 0 ? (
                    <Grid
                      columnCount={3}
                      columnWidth={columnWidth / 3} // Dynamic width based on measured column
                      width={columnWidth} // Take full measured column width
                      height={Math.max(
                        Math.ceil(25 / 3) * 150, // Height for at least 25 cards (9 rows * 150px)
                        Math.min(window.innerHeight - 200, 1200) // Max height with higher limit
                      )}
                      rowCount={Math.ceil(grouped[col.key].length / 3)}
                      rowHeight={150}
                      itemData={{
                        tasks: grouped[col.key],
                        columnCount: 3,
                        onDragStart,
                        onDragEnd,
                        handleCardClick,
                        draggedTask,
                        canEdit,
                        handlePin,
                        pinningTask
                      }}
                      style={{ 
                        outline: 'none',
                        // Hide scrollbars to match the column design
                        scrollbarWidth: 'none', // Firefox
                        msOverflowStyle: 'none', // IE/Edge
                      }}
                      className="instagram-grid-no-scrollbar"
                    >
                      {InstagramGridItem}
                    </Grid>
                  ) : (
                    <div className="flex items-center justify-center h-32 text-white/50 text-sm">
                      No approved tasks yet
                          </div>
                        )}
                </div>
              ) : (
                // Glassmorphism card layout for other columns
                grouped[col.key].map(task => {
                  // Use preview URL if already computed, otherwise show fallback
                  const previewUrl = task.previewUrl;

                  return (
                    <div
                      key={task.id}
                      draggable={canEdit}
                      onDragStart={canEdit ? () => onDragStart(task) : undefined}
                      onDragEnd={canEdit ? onDragEnd : undefined}
                      onClick={() => handleCardClick(task)}
                      className={`
                        relative overflow-hidden rounded-xl select-none cursor-pointer group
                        transition-all duration-300 ease-out
                        ${draggedTask?.id === task.id 
                          ? 'z-50 scale-105 rotate-1 shadow-2xl' 
                          : 'z-10 hover:scale-[1.02] hover:-translate-y-1'
                        }
                        
                        // Glassmorphism styling
                        bg-gradient-to-br from-white/10 via-white/5 to-white/5
                        backdrop-blur-xl border border-white/20
                        hover:bg-gradient-to-br hover:from-white/15 hover:via-white/8 hover:to-white/8
                        hover:border-white/30 hover:shadow-xl hover:shadow-black/20
                        
                        // Silver gradient border enhancement
                        before:absolute before:inset-0 before:rounded-xl before:p-px
                        before:bg-gradient-to-br before:from-gray-300/30 before:via-gray-500/20 before:to-gray-300/30
                        before:-z-10 before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-300
                      `}
                      style={{
                        opacity: draggedTask?.id === task.id ? 0.8 : 1,
                        transition: draggedTask?.id === task.id ? 'none' : 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        boxShadow: draggedTask?.id === task.id 
                          ? '0 4px 8px rgba(0, 0, 0, 0.3)' 
                          : '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2)'
                      }}
                    >
                      {/* Task Type Badge - Top Right */}
                                            <div className="absolute top-0.5 right-0.5 z-20">
                        {task.task_type === 'design' && (
                          <div className="flex items-center gap-1 bg-gray-500/20 text-gray-300 px-1.5 py-0.5 rounded-full backdrop-blur-sm">
                            <svg className="w-2 h-2" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                            </svg>
                            <span className="text-[7px] font-medium uppercase">Design</span>
                          </div>
                        )}
                        {task.task_type === 'photo' && (
                          <div className="flex items-center gap-1 bg-green-500/20 text-green-300 px-1.5 py-0.5 rounded-full backdrop-blur-sm">
                            <svg className="w-2 h-2" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M9 2l1.06 2.06L12 5l-1.94.94L9 8 7.94 5.94 6 5l1.94-.94L9 2zm6.5 6L17 10l-1.5 2L14 10l1.5-2zm2.5 5l-.62 1.38L16 15l1.38.62L18 17l.62-1.38L20 15l-1.38-.62L18 13z"/>
                            </svg>
                            <span className="text-[7px] font-medium uppercase">Photo</span>
                          </div>
                        )}
                                                 {task.task_type === 'video' && (
                           <div className="flex items-center gap-1 bg-gray-500/20 text-gray-300 px-1.5 py-0.5 rounded-full backdrop-blur-sm">
                             <svg className="w-2 h-2" fill="currentColor" viewBox="0 0 24 24">
                               <path d="M8 5v14l11-7z"/>
                            </svg>
                            <span className="text-[7px] font-medium uppercase">Video</span>
                          </div>
                        )}
                      </div>

                      
                      {/* Main Content Container */}
                      <div className="flex px-2 py-1 gap-1.5 min-h-[55px]">
                        {/* Left Side - Preview Thumbnail (4:5 ratio) */}
                        <div className="flex-shrink-0 w-16 h-20 relative">
                          {previewUrl === 'PDF_PREVIEW' ? (
                            <div className="w-full h-full rounded-lg overflow-hidden border border-red-400/40 shadow-lg bg-gradient-to-br from-red-500/20 to-red-600/10 flex items-center justify-center">
                              <FileText className="w-6 h-6 text-red-400" />
                            </div>
                          ) : previewUrl && previewUrl !== null ? (
                            <div className="w-full h-full rounded-lg overflow-hidden border border-white/20 shadow-lg relative animate-fadeIn">
                              <Image 
                                src={previewUrl} 
                                alt="Preview" 
                                fill
                                sizes="64px"
                                className="object-cover transition-transform duration-300 group-hover:scale-110" 
                                loading="lazy"
                                placeholder="blur"
                                blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iODAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjgwIiBmaWxsPSIjMWExYTFhIi8+PC9zdmc+"
                              />
                              {/* Overlay gradient for depth */}
                              <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                            </div>
                          ) : (
                            <div className="w-full h-full rounded-lg bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center shadow-inner p-1 border border-white/10">
                              <Image 
                                src="/MAIN LOGO.png" 
                                alt="SilberArrows Logo" 
                                width={24} 
                                height={24} 
                                className="object-contain opacity-40"
                                priority={false}
                              />
                            </div>
                          )}
                          
                          {/* Icons Row - Bottom of Thumbnail */}
                          <div className="absolute bottom-1 left-0 right-0 flex items-center justify-between px-1">
                            {/* Left Side - Media Count */}
                            <div className="flex items-center gap-1">
                              {task.media_files && task.media_files.length > 0 && (
                                <div className="flex items-center gap-0.5 bg-white/20 backdrop-blur-sm border border-white/30 rounded-full px-1 py-0.5">
                                  <ImageIcon className="w-2 h-2 text-white/80" />
                                  <span className="text-white font-bold text-[8px]">{task.media_files.length}</span>
                                </div>
                              )}
                            </div>
                            
                            {/* Right Side - Annotation Count */}
                            <div className="flex items-center gap-1">
                              {task.status === 'in_progress' && task.annotations && task.annotations.length > 0 && (
                                <div 
                                  className="flex items-center gap-0.5 bg-orange-400/90 backdrop-blur-sm border border-orange-300/50 rounded-full px-1 py-0.5"
                                  title={`${task.annotations.length} annotation${task.annotations.length > 1 ? 's' : ''}`}
                                >
                                  <div className="w-1 h-1 bg-white rounded-full animate-pulse"></div>
                                  <span className="text-white font-bold text-[8px]">{task.annotations.length}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {/* Right Side - Content */}
                        <div className="flex-1 flex flex-col justify-between min-w-0 py-0.5">
                          {/* Title Section - Top */}
                          <div className="flex-shrink-0">
                            <div className="flex items-center gap-1">
                              <h4 className="text-[11px] font-bold text-white leading-tight line-clamp-1 group-hover:text-gray-100 transition-colors duration-200 uppercase flex-1">
                                {task.title}
                              </h4>
                              {tasksWithActiveUploads.has(task.id) && (
                                <div className="flex items-center gap-0.5 bg-gray-500/20 text-gray-300 px-1 py-0.5 rounded-full backdrop-blur-sm animate-pulse">
                                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-ping"></div>
                                  <span className="text-[7px] font-medium uppercase">Uploading</span>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {/* Metadata Section - Bottom */}
                          <div className="flex-shrink-0 space-y-0.5 text-xs">
                            {/* Assigned By */}
                            <div className="flex items-center gap-1 text-white/70">
                              <User className="w-2.5 h-2.5 flex-shrink-0" />
                              <span className="truncate text-[9px] font-medium uppercase">{task.assignee || 'Unassigned'}</span>
                            </div>
                            
                            {/* Created Date */}
                            <div className="flex items-center gap-1 text-white/60">
                              <Calendar className="w-2.5 h-2.5 flex-shrink-0" />
                              <span className="text-[8px]">Created {formatDate(task.created_at)}</span>
                            </div>
                            
                            {/* Due Date */}
                            <div className={`flex items-center gap-1 ${
                              task.due_date && isTaskUrgent(task.due_date) && 
                              (task.status === 'intake' || task.status === 'planned' || task.status === 'in_progress') &&
                              !(task.status === 'in_progress' && task.annotations && task.annotations.length > 0)
                                ? 'text-red-400' 
                                : 'text-white/60'
                            }`}>
                              <Calendar className="w-2.5 h-2.5 flex-shrink-0" />
                              <span 
                                className="text-[8px] truncate"
                                style={
                                  task.due_date && isTaskUrgent(task.due_date) && 
                                  (task.status === 'intake' || task.status === 'planned' || task.status === 'in_progress') &&
                                  !(task.status === 'in_progress' && task.annotations && task.annotations.length > 0)
                                    ? { animation: 'pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite' }
                                    : {}
                                }
                              >
                                {task.due_date ? formatRelativeDueDate(task.due_date) : 'No deadline'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Archive Button - Only for approved tasks */}
                      {task.status === 'approved' && canEdit && (
                        <div className="absolute bottom-1 right-1 z-20">
                          <button
                            onClick={(e) => {
                              e.stopPropagation(); // Prevent card click
                              handleArchiveTask(task.id);
                            }}
                            className="
                              p-1 rounded-full transition-all duration-200 
                              bg-black/50 backdrop-blur-sm text-white/70 opacity-0 group-hover:opacity-100 
                              hover:text-white hover:bg-gray-700/70
                              hover:shadow-lg hover:scale-110
                              focus:outline-none focus:ring-2 focus:ring-gray-400/50
                            "
                            title="Archive task"
                          >
                            <Archive className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                      
                      {/* Bottom gradient line for visual separation */}
                      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <AddTaskModal
          task={selectedTask}
          onSave={handleSaveTask}
          onClose={handleCloseModal}
          onDelete={canDelete ? handleDeleteTask : undefined}
          onTaskUpdate={(updatedTask) => {
            // Update the task in local state when files are uploaded
            // Add timestamp to help with race condition resolution
            const taskWithTimestamp = {
              ...updatedTask,
              updated_at: new Date().toISOString(),
              _localUpdate: true, // Flag to indicate this is a local update
              // Ensure preview URL is maintained or recalculated if missing
              previewUrl: updatedTask.previewUrl || getPreviewUrl(updatedTask.media_files || [])
            };
            
            setTasks(prevTasks => 
              prevTasks.map(task => 
                task.id === updatedTask.id ? taskWithTimestamp : task
              )
            );
          }}
          onUploadStart={(taskId) => {
            // Track upload start to prevent card moves during upload
            setTasksWithActiveUploads(prev => new Set(prev).add(taskId));
          }}
          onUploadComplete={(taskId) => {
            // Remove from active uploads when complete
            setTasksWithActiveUploads(prev => {
              const next = new Set(prev);
              next.delete(taskId);
              return next;
            });
          }}
          isAdmin={isAdmin}
        />
      )}

      {showWorkspace && selectedTask && (
        <MarketingWorkspace
          task={selectedTask}
          onClose={handleCloseWorkspace}
          onSave={handleSaveTask}
          onUploadStart={(taskId) => {
            // Track upload start to prevent card moves during upload
            setTasksWithActiveUploads(prev => new Set(prev).add(taskId));
          }}
          onUploadComplete={(taskId) => {
            // Remove from active uploads when complete
            setTasksWithActiveUploads(prev => {
              const next = new Set(prev);
              next.delete(taskId);
              return next;
            });
          }}
          canEdit={canEdit}
          isAdmin={isAdmin}
        />
      )}
    </div>
  );
} 