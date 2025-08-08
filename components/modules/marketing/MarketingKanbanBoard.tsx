'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Plus, Calendar, User, Clock, Video, FileText, Image as ImageIcon, Eye, PenTool, Archive, CheckCircle, Instagram, Pin, Edit2, Trash2, Tag } from 'lucide-react';
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
const isTaskUrgent = (dateString: string | undefined) => {
  if (!dateString) return false;
  
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
  }
];

type ColKey = MarketingStatus;



export default function MarketingKanbanBoard() {
  const [tasks, setTasks] = useState<MarketingTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showWorkspace, setShowWorkspace] = useState(false);
  const [selectedTask, setSelectedTask] = useState<MarketingTask | null>(null);
  const [draggedTask, setDraggedTask] = useState<MarketingTask | null>(null);
  const [hovered, setHovered] = useState<ColKey | null>(null);
  const [pinningTask, setPinningTask] = useState<string | null>(null);
  
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
            ...baseTask
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
    fetchTasks();

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
                ...baseTask
              };
              // Check if task already exists to prevent duplicates
              const taskExists = prev.some(task => task.id === newTask.id);
              if (taskExists) {
                return prev;
              }
              return [newTask, ...prev];
            }
            if (payload.eventType === 'UPDATE') {
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
              
              const updatedTask = {
                ...baseTask
              };
              return prev.map(task => task.id === updatedTask.id ? updatedTask : task);
            }
            if (payload.eventType === 'DELETE') {
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
    
    // Optimistic update for immediate UI feedback
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
          setShowModal(false);
          setSelectedTask(null);
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
          setShowModal(false);
          setSelectedTask(null);
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
    // Do NOT close the modal for partial updates like media file deletion
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

  const handleEditClick = (e: React.MouseEvent, task: MarketingTask) => {
    e.stopPropagation(); // Prevent card click
    setSelectedTask(task);
    setShowModal(true);
  };

  const handleDeleteClick = (e: React.MouseEvent, task: MarketingTask) => {
    e.stopPropagation(); // Prevent card click
    if (window.confirm(`Are you sure you want to delete task "${task.title}"?`)) {
      handleDeleteTask(task.id);
    }
  };

  const getStatusColor = (status: MarketingStatus) => {
    switch (status) {
      case 'intake':
        return 'bg-blue-500/20 text-blue-300';
      case 'planned':
        return 'bg-purple-500/20 text-purple-300';
      case 'in_progress':
        return 'bg-yellow-500/20 text-yellow-300';
      case 'in_review':
        return 'bg-orange-500/20 text-orange-300';
      case 'approved':
        return 'bg-green-500/20 text-green-300';
      case 'instagram_feed_preview':
        return 'bg-pink-500/20 text-pink-300';
      default:
        return 'bg-gray-500/20 text-gray-300';
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
        {columns.map(col => (
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
                ) : (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-white/10 text-white/70 text-[8px] font-medium">
                    {grouped[col.key].length}
                  </span>
                )}
              </div>
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
                      
                      {/* Text-only content - No Image */}
                      <div className="w-full h-full p-2 flex flex-col justify-between">
                        <div>
                          <h4 className="text-xs font-medium text-white/90 line-clamp-2 mb-1">
                            {task.title}
                          </h4>
                          {task.media_files && task.media_files.length > 0 && (
                            <span className="text-xs text-white/60">{task.media_files.length} files</span>
                          )}
                        </div>
                        <div className="text-xs text-white/50">
                          {task.assignee}
                        </div>
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
                      className="group relative flex bg-black/40 backdrop-blur-lg rounded-xl border border-white/20 shadow-lg hover:shadow-2xl hover:border-white/30 transition-all duration-300 p-3 cursor-pointer"
                      onClick={() => handleCardClick(task)}
                    >
                      {/* Full Width Content - No Thumbnail */}
                      <div className="flex-1 min-w-0">
                        {/* Top Row - Status, Title and Actions */}
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 min-w-0">
                            {/* Status Badge */}
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor(task.status)} shadow-sm`}>
                                {task.status}
                              </span>
                              {isTaskUrgent(task.due_date) && (
                                <span className="px-2 py-0.5 text-xs font-medium bg-red-500/80 text-white rounded-full shadow-sm animate-pulse">
                                  URGENT
                                </span>
                              )}
                            </div>
                            
                            {/* Title */}
                            <h3 className="font-semibold text-white/90 text-sm leading-tight mb-1 line-clamp-2">
                              {task.title}
                            </h3>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center gap-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            <button 
                              onClick={(e) => handleEditClick(e, task)}
                              className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button 
                              onClick={(e) => handleDeleteClick(e, task)}
                              className="p-1.5 text-red-400/70 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all duration-200"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>

                        {/* Description */}
                        {task.description && (
                          <p className="text-white/70 text-xs leading-relaxed mb-3 line-clamp-2">
                            {task.description}
                          </p>
                        )}

                        {/* Media Count and File Types */}
                        {task.media_files && task.media_files.length > 0 && (
                          <div className="flex items-center gap-2 mb-3">
                            <div className="flex items-center gap-1">
                              <ImageIcon size={14} className="text-blue-400" />
                              <span className="text-xs text-white/60">{task.media_files.length} files</span>
                            </div>
                          </div>
                        )}

                        {/* Bottom Row - Due Date, Assignee, and Additional Info */}
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-3">
                            {/* Due Date */}
                            {task.due_date && (
                              <div className={`flex items-center gap-1 ${
                                isTaskUrgent(task.due_date) 
                                  ? 'text-red-400' 
                                  : 'text-white/60'
                              }`}>
                                <Calendar size={12} />
                                <span>{new Date(task.due_date).toLocaleDateString('en-US', { 
                                  month: 'short', 
                                  day: 'numeric' 
                                })}</span>
                              </div>
                            )}

                            {/* Assignee */}
                            {task.assignee && (
                              <div className="flex items-center gap-1 text-white/60">
                                <User size={12} />
                                <span>{task.assignee}</span>
                              </div>
                            )}

                            {/* Task Type */}
                            {task.task_type && (
                              <div className="flex items-center gap-1 text-white/60">
                                <Tag size={12} />
                                <span className="capitalize">{task.task_type}</span>
                              </div>
                            )}
                          </div>

                          {/* Pin Indicator */}
                          {task.pinned && (
                            <div className="text-yellow-400">
                              <Pin size={12} />
                            </div>
                          )}
                        </div>
                      </div>
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