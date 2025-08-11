'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Plus, Calendar, User, Clock, Video, FileText, Image as ImageIcon, Eye, PenTool, Archive, CheckCircle, Instagram, Pin } from 'lucide-react';
import { MarketingTask, MarketingStatus, MarketingColumn } from '@/types/marketing';
import { supabase } from '@/lib/supabaseClient';
import { useModulePermissions } from '@/lib/useModulePermissions';
import { useUserRole } from '@/lib/useUserRole';
import { useAuth } from '@/components/shared/AuthProvider';
import dayjs from 'dayjs';
import AddTaskModal from './AddTaskModal';
import MarketingWorkspace from './MarketingWorkspace';

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
  
  // Prefer thumbnail if present
  const withThumbnail = mediaFiles.find((f: any) => f.thumbnail);
  if (withThumbnail) return withThumbnail.thumbnail;
  
  // Try to find an image file
  const imageFile = mediaFiles.find((f: any) => {
    if (typeof f === 'string') {
      return f.match(/\.(jpe?g|png|webp|gif)$/i);
    }
    return f.type?.startsWith('image/') || f.name?.match(/\.(jpe?g|png|webp|gif)$/i);
  });
  
  if (imageFile) {
    return typeof imageFile === 'string' ? imageFile : imageFile.url;
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
  
  return null;
}

// Column definitions matching CRM Kanban style
const columns: MarketingColumn[] = [
  { 
    key: "intake", 
    title: "INTAKE", 
    icon: <Archive className="w-4 h-4" />,
    color: "blue"
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



export default function MarketingKanbanBoard() {
  const [tasks, setTasks] = useState<MarketingTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showWorkspace, setShowWorkspace] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [selectedTask, setSelectedTask] = useState<MarketingTask | null>(null);
  const [draggedTask, setDraggedTask] = useState<MarketingTask | null>(null);
  const [hovered, setHovered] = useState<ColKey | null>(null);
  const [pinningTask, setPinningTask] = useState<string | null>(null);
  const hasFetchedTasks = useRef(false);
  
  // Get permissions and user role
  const { canView, canCreate, canEdit, canDelete, isLoading: permissionsLoading } = useModulePermissions('marketing');
  const { isAdmin } = useUserRole();
  const { user } = useAuth();

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

  // Fetch tasks from API
  const fetchTasks = async () => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch('/api/design-tasks', { headers });
      if (response.ok) {
        const rawData = await response.json();
        
        // Transform raw database data to match frontend expectations (same as real-time updates)
        const transformedTasks = rawData.map((rawTask: any) => {
          const baseTask = {
            id: rawTask.id,
            title: rawTask.title,
            description: rawTask.description,
            status: rawTask.status,
            assignee: rawTask.assignee || rawTask.requested_by, // Handle both field names
            due_date: rawTask.due_date,
            created_at: rawTask.created_at,
            updated_at: rawTask.updated_at,
            media_files: rawTask.media_files || [],
            annotations: rawTask.annotations || [], // Ensure annotations is always an array
            pinned: rawTask.pinned || false,
            task_type: rawTask.task_type || 'design',
            priority: rawTask.priority || 'medium',
            content_type: rawTask.content_type || 'post',
            tags: rawTask.tags || [],
            created_by: rawTask.created_by,
            acknowledged_at: rawTask.acknowledged_at
          };
          
          return {
            ...baseTask,
            previewUrl: getPreviewUrl(baseTask.media_files)
          };
        });
        
        setTasks(transformedTasks);
      } else {
        console.error('Failed to fetch tasks:', response.statusText);
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!hasFetchedTasks.current) {
      fetchTasks();
      hasFetchedTasks.current = true;
    }

    // Real-time subscription for live updates across browsers
    const channel = supabase
      .channel('marketing-tasks-stream')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'design_tasks' },
        (payload: any) => {
          setTasks(prev => {
            if (payload.eventType === 'INSERT') {
              const rawTask = payload.new;
              
              // Transform raw database data to match frontend expectations
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
                task_type: rawTask.task_type || 'design', // Include task_type field
                priority: 'medium',
                content_type: 'post',
                tags: []
              };
              
              const newTask = {
                ...baseTask,
                previewUrl: getPreviewUrl(baseTask.media_files)
              };
              // Check if task already exists to prevent duplicates
              const taskExists = prev.some(task => task.id === newTask.id);
              if (taskExists) {
                return prev;
              }
              
              return [...prev, newTask];
            } 
            else if (payload.eventType === 'UPDATE') {
              const rawTask = payload.new;
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
                task_type: rawTask.task_type || 'design', // Include task_type field
                priority: 'medium',
                content_type: 'post',
                tags: []
              };
              
              const updatedTask = {
                ...baseTask,
                previewUrl: getPreviewUrl(baseTask.media_files)
              };
              
              return prev.map(task => 
                task.id === updatedTask.id ? updatedTask : task
              );
            } 
            else if (payload.eventType === 'DELETE') {
              return prev.filter(task => task.id !== payload.old.id);
            }
            
            return prev;
          });
        }
      )
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Group tasks by status with optimized sorting logic (memoized for performance)
  const grouped = useMemo(() => {
    return columns.reduce((acc, col) => {
      const filteredTasks = tasks.filter(task => task.status === col.key);
      
      // Pre-compute dayjs values to avoid repeated parsing during sort
      const tasksWithComputedDates = filteredTasks.map(task => ({
        ...task,
        updatedAtValue: dayjs(task.updated_at).valueOf()
      }));
      
      // Sort tasks with Instagram logic: newest pins go leftmost, then unpinned items
      acc[col.key] = tasksWithComputedDates.sort((a, b) => {
        // Pinned tasks always come first
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        
        // If both pinned or both unpinned: sort by pre-computed date value
        return b.updatedAtValue - a.updatedAtValue;
      });
      
      return acc;
    }, {} as Record<ColKey, MarketingTask[]>);
  }, [tasks, columns]);

  // Optimized drag and drop handlers (memoized for performance)
  const onDragStart = useCallback((task: MarketingTask) => {
    setDraggedTask(task);
  }, []);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  // Optimized onDrop with reduced dependencies and deferred updates
  const onDrop = useCallback((status: ColKey) => async (e: React.DragEvent) => {
    e.preventDefault();
    if (!draggedTask || draggedTask.status === status) {
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
    setTasks(prevTasks => 
      prevTasks.map(task =>
        task.id === taskToUpdate.id
          ? { ...task, status, updated_at: new Date().toISOString() }
          : task
      )
    );
    
    // Defer database update to not block UI
    try {
      const headers = await getAuthHeaders();
      const response = await fetch('/api/design-tasks', {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          id: taskToUpdate.id,
          status,
          // Preserve all existing task data to prevent data loss
          title: taskToUpdate.title,
          description: taskToUpdate.description,
          assignee: taskToUpdate.assignee,
          due_date: taskToUpdate.due_date,
          task_type: taskToUpdate.task_type,
          media_files: taskToUpdate.media_files,
          // Don't send annotations in status updates to avoid conflicts
        }),
      });

      if (!response.ok) {
        // Revert optimistic update on failure
        setTasks(prevTasks => 
          prevTasks.map(task =>
            task.id === taskToUpdate.id
              ? { ...task, status: taskToUpdate.status, updated_at: taskToUpdate.updated_at }
              : task
          )
        );
        console.error('Failed to update task status');
      }
    } catch (error) {
      // Revert optimistic update on error
      setTasks(prevTasks => 
        prevTasks.map(task =>
          task.id === taskToUpdate.id
            ? { ...task, status: taskToUpdate.status, updated_at: taskToUpdate.updated_at }
            : task
        )
      );
      console.error('Error updating task:', error);
    }
  }, [draggedTask, isAdmin, getAuthHeaders]);

  const onDragEnd = useCallback(() => {
    setDraggedTask(null);
    setHovered(null);
  }, []);

  const handleCardClick = (task: MarketingTask) => {
    setSelectedTask(task);
    
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
        console.error('❌ Failed to update pin status:', error);
        // Optionally show user notification here
      }
    } catch (error) {
      console.error('❌ Error updating pin status:', error);
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
        console.log('Sending update request:', updatePayload);
        const headers = await getAuthHeaders();
        const response = await fetch('/api/design-tasks', {
          method: 'PUT',
          headers,
          body: JSON.stringify(updatePayload),
        });
        if (response.ok) {
          const updatedTask: MarketingTask = await response.json();
          // Update local state with the updated task
          setTasks(prevTasks => 
            prevTasks.map(task => 
              task.id === updatedTask.id ? updatedTask : task
            )
          );
          return updatedTask;
        } else {
          console.error('Failed to update task');
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
          const newTask: MarketingTask = await response.json();
          // Add new task to local state
          setTasks(prevTasks => [...prevTasks, newTask]);
          return newTask;
        } else {
          console.error('Failed to create task');
          return null;
        }
      }
    } catch (error) {
      console.error('Error saving task:', error);
      return null;
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
        console.log('✅ Task archived successfully:', taskId);
      } else {
        console.error('❌ Failed to archive task');
      }
    } catch (error) {
      console.error('❌ Error archiving task:', error);
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
        console.error('Failed to delete task');
      }
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };


  if (loading) {
    return (
      <div className="px-4 flex items-center justify-center h-64">
        <div className="text-white/70">Loading tasks...</div>
      </div>
    );
  }

  return (
    <div className="px-2" style={{ height: "calc(100vh - 72px)" }}>
      <div className="flex gap-1.5 pb-2 w-full h-full overflow-hidden">
        {columns
          .filter(col => showArchived || col.key !== 'archived')
          .map(col => (
          <div
            key={col.key}
            className={`bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-2 flex flex-col transition-shadow min-w-0 ${hovered === col.key ? 'ring-2 ring-gray-300/60' : ''} ${
              col.key === 'instagram_feed_preview' 
                ? 'flex-[1.38] max-w-sm' 
                : 'flex-1'
            }`}
            onDragOver={(e) => { onDragOver(e); setHovered(col.key); }}
            onDrop={onDrop(col.key)}
            onDragEnter={() => setHovered(col.key)}
            onDragLeave={(e) => { 
              if (!e.currentTarget.contains(e.relatedTarget as Node)) setHovered(null); 
            }}
          >
            <div className="mb-2 px-1 flex items-center justify-between relative sticky top-0 z-10 bg-black/50 backdrop-blur-sm pb-1.5 pt-0.5">
              <div className="flex items-center gap-1.5">
                {col.icon}
                <h3 className="text-[10px] font-medium text-white whitespace-nowrap">
                  {col.title}
                </h3>
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
              
              {/* Archive Toggle Button - Only show on Instagram Feed Preview column */}
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
            
            <div className="flex-1 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
              {col.key === 'instagram_feed_preview' ? (
                // Instagram feed preview layout
                <div className="grid grid-cols-3 gap-1">
                  {grouped[col.key].map(task => (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={() => onDragStart(task)}
                      onDragEnd={onDragEnd}
                      onClick={() => handleCardClick(task)}
                      className={`aspect-[4/5] bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 backdrop-blur-sm rounded-lg shadow-sm cursor-pointer group relative overflow-hidden ${
                        draggedTask?.id === task.id 
                          ? 'z-50 opacity-80 border-white/40' 
                          : 'z-10 transition-all duration-200'
                      }`}
                    >
                      {/* Annotation Badge - Subtle */}
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
                      
                      {/* Pin Icon - Top Right Corner */}
                      {canEdit && (
                        <div className="absolute top-0.5 right-0.5 z-30">
                          <button
                            onClick={(e) => {
                              e.stopPropagation(); // Prevent card click
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
                      
                      {/* Full image display */}
                      <div className="w-full h-full rounded-lg overflow-hidden">
                        {task.previewUrl === 'PDF_PREVIEW' ? (
                          <div className="w-full h-full bg-gradient-to-br from-red-500/20 to-red-600/10 flex items-center justify-center p-1.5">
                            <FileText className="w-8 h-8 text-red-400" />
                          </div>
                        ) : task.previewUrl ? (
                          <img 
                            src={task.previewUrl} 
                            alt={task.title}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" 
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center p-1.5">
                            <img 
                              src="/MAIN LOGO.png" 
                              alt="SilberArrows Logo" 
                              className="w-full h-full object-contain opacity-60 filter brightness-200" 
                            />
                          </div>
                        )}
                      </div>

                    </div>
                  ))}
                </div>
              ) : (
                // Glassmorphism card layout for other columns
                grouped[col.key].map(task => {
                  // Use pre-computed preview URL to avoid expensive regex operations during render
                  const previewUrl = task.previewUrl;

                  return (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={() => onDragStart(task)}
                      onDragEnd={onDragEnd}
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
                          <div className="flex items-center gap-1 bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded-full backdrop-blur-sm">
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
                           <div className="flex items-center gap-1 bg-cyan-500/20 text-cyan-300 px-1.5 py-0.5 rounded-full backdrop-blur-sm">
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
                          ) : previewUrl ? (
                            <div className="w-full h-full rounded-lg overflow-hidden border border-white/20 shadow-lg">
                              <img 
                                src={previewUrl} 
                                alt="Preview" 
                                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" 
                              />
                              {/* Overlay gradient for depth */}
                              <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                            </div>
                          ) : (
                            <div className="w-full h-full rounded-lg bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center shadow-inner p-1">
                              <img 
                                src="/MAIN LOGO.png" 
                                alt="SilberArrows Logo" 
                                className="w-full h-full object-contain opacity-60 filter brightness-200" 
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
                            <h4 className="text-[11px] font-bold text-white leading-tight line-clamp-1 group-hover:text-gray-100 transition-colors duration-200 uppercase">
                              {task.title}
                            </h4>
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
            setTasks(prevTasks => 
              prevTasks.map(task => 
                task.id === updatedTask.id ? updatedTask : task
              )
            );
          }}
          isAdmin={isAdmin}
        />
      )}

      {showWorkspace && selectedTask && (
        <MarketingWorkspace
          task={selectedTask}
          onClose={handleCloseWorkspace}
          onSave={handleSaveTask}
          canEdit={canEdit}
          isAdmin={isAdmin}
        />
      )}
    </div>
  );
} 