'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Calendar, User, Clock, Video, FileText, Image as ImageIcon, Eye, PenTool, Archive, CheckCircle, Instagram, Pin } from 'lucide-react';
import { MarketingTask, MarketingStatus, MarketingColumn } from '@/types/marketing';
import { supabase } from '@/lib/supabaseClient';
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

// Column definitions matching CRM Kanban style
const columns: MarketingColumn[] = [
  { 
    key: "intake", 
    title: "INTAKE", 
    icon: <Archive className="w-4 h-4" />,
    color: "blue"
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

  // Fetch tasks from API
  const fetchTasks = async () => {
    try {
      const response = await fetch('/api/design-tasks');
      if (response.ok) {
        const data = await response.json();
        setTasks(data);
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
              const newTask = payload.new as MarketingTask;
              
              // Check if task already exists to prevent duplicates (local creation + real-time)
              const taskExists = prev.some(task => task.id === newTask.id);
              if (taskExists) {
                return prev; // Don't add duplicate
              }
              
              return [newTask, ...prev];
            }
            if (payload.eventType === 'UPDATE') {
              const updatedTask = payload.new as MarketingTask;
              return prev.map(task => 
                task.id === updatedTask.id ? updatedTask : task
              );
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

  // Group tasks by status with Instagram-style pinning logic
  const grouped = columns.reduce((acc, col) => {
    const filteredTasks = tasks.filter(task => task.status === col.key);
    
    // Sort tasks with Instagram logic: newest pins go leftmost, then unpinned items
    acc[col.key] = filteredTasks.sort((a, b) => {
      // Pinned tasks always come first
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      
      // If both pinned: sort by updated_at DESC (newest pin goes leftmost like Instagram)
      if (a.pinned && b.pinned) {
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      }
      
      // If both unpinned: sort by created_at DESC (newest first)
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    
    return acc;
  }, {} as Record<ColKey, MarketingTask[]>);

  // Drag and drop handlers
  const onDragStart = (task: MarketingTask) => {
    setDraggedTask(task);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const onDrop = (status: ColKey) => async (e: React.DragEvent) => {
    e.preventDefault();
    if (draggedTask && draggedTask.status !== status) {
      try {
        // Update in database
        const response = await fetch('/api/design-tasks', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id: draggedTask.id,
            status,
          }),
        });

        if (response.ok) {
          // Update local state only if API call succeeds
          const updatedTasks = tasks.map(task =>
            task.id === draggedTask.id
              ? { ...task, status, updated_at: new Date().toISOString() }
              : task
          );
          setTasks(updatedTasks);
        } else {
          console.error('Failed to update task status');
        }
      } catch (error) {
        console.error('Error updating task:', error);
      }
    }
    setDraggedTask(null);
    setHovered(null);
  };

  const onDragEnd = () => {
    setDraggedTask(null);
    setHovered(null);
  };

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

      console.log(`📌 ${newPinned ? 'Pinning' : 'Unpinning'} task ${taskId}`);

      const response = await fetch('/api/social-media-tasks/pin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
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
        console.log(`✅ Task ${newPinned ? 'pinned' : 'unpinned'} successfully`);
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
        const response = await fetch('/api/design-tasks', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id: selectedTask.id,
            ...taskData,
          }),
        });

        if (response.ok) {
          const updatedTask: MarketingTask = await response.json();
          // Don't update local state - let real-time subscription handle it  
          // const updatedTasks = tasks.map(task =>
          //   task.id === selectedTask.id ? updatedTask : task
          // );
          // setTasks(updatedTasks); // REMOVED to prevent conflicts
          return updatedTask;
        } else {
          console.error('Failed to update task');
          return null;
        }
      } else {
        // Create new task
        const response = await fetch('/api/design-tasks', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(taskData),
        });

        if (response.ok) {
          const newTask: MarketingTask = await response.json();
          // Don't add to local state - let real-time subscription handle it
          // setTasks([...tasks, newTask]); // REMOVED to prevent duplicates
          return newTask;
        } else {
          console.error('Failed to create task');
          return null;
        }
      }
    } catch (error) {
      console.error('Error saving task:', error);
      return null;
    } finally {
      setShowModal(false);
      setSelectedTask(null);
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
      const response = await fetch(`/api/design-tasks?id=${taskId}`, {
        method: 'DELETE',
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
    <div className="px-4">
      <div
        className="flex gap-3 pb-4 w-full h-full overflow-hidden"
        style={{ height: "calc(100vh - 72px)" }}
      >
        {columns.map(col => (
          <div
            key={col.key}
            className={`bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-3 ${col.key === 'instagram_feed_preview' ? 'flex-[1.5]' : 'flex-[0.8]'} min-w-0 flex flex-col transition-shadow ${hovered === col.key ? 'ring-2 ring-gray-300/60' : ''}`}
            onDragOver={(e) => { onDragOver(e); setHovered(col.key); }}
            onDrop={onDrop(col.key)}
            onDragEnter={() => setHovered(col.key)}
            onDragLeave={(e) => { 
              if (!e.currentTarget.contains(e.relatedTarget as Node)) setHovered(null); 
            }}
          >
            <div className="mb-3 px-1 flex items-center justify-between relative sticky top-0 z-10 bg-black/50 backdrop-blur-sm pb-2 pt-1">
              <div className="flex items-center gap-2">
                {col.icon}
                <h3 className="text-xs font-medium text-white whitespace-nowrap">
                  {col.title}
                </h3>
                {col.key === 'intake' ? (
                  <button
                    onClick={handleCreateTask}
                    className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold transition-colors shadow-sm bg-gradient-to-br from-gray-200 via-gray-400 to-gray-200 text-black hover:brightness-110"
                    title="Add new task"
                  >
                    {grouped[col.key].length}
                    <span className="ml-1 text-[12px] leading-none">＋</span>
                  </button>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-white/10 text-white/70 text-[10px] font-medium">
                    {grouped[col.key].length}
                  </span>
                )}
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-hide">
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
                      className={`aspect-[4/5] bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 backdrop-blur-sm transition-all duration-200 rounded-lg shadow-sm cursor-pointer group relative overflow-hidden ${
                        draggedTask?.id === task.id 
                          ? 'z-50 scale-105 rotate-2 shadow-2xl bg-white/20 border-white/30' 
                          : 'z-10'
                      }`}
                      style={{
                        transform: draggedTask?.id === task.id ? 'translateY(-8px)' : 'translateY(0px)',
                        transition: 'all 0.2s ease-in-out'
                      }}
                    >
                      {/* Annotation Badge - Subtle */}
                      {task.status === 'in_progress' && task.annotations && task.annotations.length > 0 && (
                        <div className="absolute top-0.5 left-0.5 z-20">
                          <div className="flex items-center gap-0.5 bg-orange-400/80 text-white text-[6px] font-medium px-0.5 py-0.5 rounded-full shadow-sm">
                            <div className="w-0.5 h-0.5 bg-white rounded-full"></div>
                            <span>{task.annotations.length}</span>
                          </div>
                        </div>
                      )}
                      
                      {/* Pin Icon - Top Right Corner */}
                      <div className="absolute top-1 right-1 z-30">
                        <button
                          onClick={(e) => {
                            e.stopPropagation(); // Prevent card click
                            handlePin(task.id, task.pinned || false);
                          }}
                          disabled={pinningTask === task.id}
                          className={`
                            p-1 rounded-full transition-all duration-200 
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
                          <Pin className="w-3 h-3" />
                        </button>
                      </div>
                      
                      {/* Full image display */}
                      <div className="w-full h-full rounded-lg overflow-hidden">
                        {(() => {
                          // Get the first image for preview
                          const previewImage = task.media_files?.find((f: any) => {
                            if (typeof f === 'string') {
                              return f.match(/\.(jpe?g|png|webp|gif)$/i);
                            }
                            return f.type?.startsWith('image/') || f.name?.match(/\.(jpe?g|png|webp|gif)$/i);
                          });
                          const previewUrl = previewImage ? (typeof previewImage === 'string' ? previewImage : (previewImage as any).url) : null;
                          
                          return previewUrl ? (
                            <img 
                              src={previewUrl} 
                              alt={task.title}
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" 
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center p-3">
                              <img 
                                src="/MAIN LOGO.png" 
                                alt="SilberArrows Logo" 
                                className="w-full h-full object-contain opacity-60 filter brightness-200" 
                              />
                            </div>
                          );
                        })()}
                      </div>

                    </div>
                  ))}
                </div>
              ) : (
                // Glassmorphism card layout for other columns
                grouped[col.key].map(task => {
                  // Get the first image for preview thumbnail
                  const previewImage = task.media_files?.find((f: any) => {
                    if (typeof f === 'string') {
                      return f.match(/\.(jpe?g|png|webp|gif)$/i);
                    }
                    return f.type?.startsWith('image/') || f.name?.match(/\.(jpe?g|png|webp|gif)$/i);
                  });
                  const previewUrl = previewImage ? (typeof previewImage === 'string' ? previewImage : (previewImage as any).url) : null;

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
                        transform: draggedTask?.id === task.id ? 'translateY(-8px) scale(1.05) rotate(1deg)' : 'translateY(0px)',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        boxShadow: draggedTask?.id === task.id 
                          ? '0 25px 50px -12px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.1)' 
                          : '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2)'
                      }}
                    >

                      
                      {/* Main Content Container */}
                      <div className="flex px-3 py-3 gap-3 min-h-[100px]">
                        {/* Left Side - Preview Thumbnail (4:5 ratio) */}
                        <div className="flex-shrink-0 w-16 h-20 relative">
                          {previewUrl ? (
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
                            <div className="w-full h-full rounded-lg bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center shadow-inner p-2">
                              <img 
                                src="/MAIN LOGO.png" 
                                alt="SilberArrows Logo" 
                                className="w-full h-full object-contain opacity-60 filter brightness-200" 
                              />
                            </div>
                          )}
                          
                          {/* Icons Row - Bottom of Thumbnail */}
                          <div className="absolute -bottom-2 left-0 right-0 flex items-center justify-between px-1">
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
                                <div className="flex items-center gap-0.5 bg-orange-400/90 backdrop-blur-sm border border-orange-300/50 rounded-full px-1 py-0.5">
                                  <div className="w-1 h-1 bg-white rounded-full animate-pulse"></div>
                                  <span className="text-white font-bold text-[8px]">{task.annotations.length}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {/* Right Side - Content */}
                        <div className="flex-1 flex flex-col justify-between min-w-0 py-1">
                          {/* Title Section - Top */}
                          <div className="flex-shrink-0">
                            <h4 className="text-xs font-bold text-white leading-tight line-clamp-1 group-hover:text-gray-100 transition-colors duration-200 uppercase">
                              {task.title}
                            </h4>
                          </div>
                          
                          {/* Metadata Section - Bottom */}
                          <div className="flex-shrink-0 space-y-1 text-xs">
                            {/* Assigned By */}
                            <div className="flex items-center gap-1.5 text-white/70">
                              <User className="w-2.5 h-2.5 flex-shrink-0" />
                              <span className="truncate text-[9px] font-medium">{task.assignee || 'Unassigned'}</span>
                            </div>
                            
                            {/* Created Date */}
                            <div className="flex items-center gap-1.5 text-white/60">
                              <Calendar className="w-2.5 h-2.5 flex-shrink-0" />
                              <span className="text-[8px]">Created {formatDate(task.created_at)}</span>
                            </div>
                            
                            {/* Due Date */}
                            <div className="flex items-center gap-1.5 text-white/60">
                              <Calendar className="w-2.5 h-2.5 flex-shrink-0" />
                              <span className="text-[8px] truncate">
                                {task.due_date ? `Due ${formatDate(task.due_date)}` : 'No deadline'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
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
          onDelete={handleDeleteTask}
        />
      )}

      {showWorkspace && selectedTask && (
        <MarketingWorkspace
          task={selectedTask}
          onClose={handleCloseWorkspace}
          onSave={handleSaveTask}
        />
      )}
    </div>
  );
} 