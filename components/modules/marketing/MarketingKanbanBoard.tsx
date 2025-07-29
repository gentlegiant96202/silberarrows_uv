'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Calendar, User, Clock, Video, FileText, Image as ImageIcon, Eye, PenTool, Inbox, CheckCircle, Instagram } from 'lucide-react';
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
    icon: <Inbox className="w-4 h-4" />,
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
  }, []);

  // Group tasks by status
  const grouped = columns.reduce((acc, col) => {
    acc[col.key] = tasks.filter(task => task.status === col.key);
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

  const handleCloseWorkspace = () => {
    setShowWorkspace(false);
    setSelectedTask(null);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedTask(null);
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
          const updatedTasks = tasks.map(task =>
            task.id === selectedTask.id ? updatedTask : task
          );
          setTasks(updatedTasks);
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
          setTasks([...tasks, newTask]);
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
        className="flex flex-col md:flex-row md:flex-wrap gap-3 pb-4 w-full"
        style={{ height: "calc(100vh - 72px)" }}
      >
        {columns.map(col => (
          <div
            key={col.key}
            className={`bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-3 flex-1 min-w-0 flex flex-col transition-shadow ${hovered === col.key ? 'ring-2 ring-gray-300/60' : ''}`}
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
            
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
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
                      className="aspect-[4/5] bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 backdrop-blur-sm transition-all duration-200 rounded-lg shadow-sm cursor-pointer group relative overflow-hidden"
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
                      
                      {/* Preview image placeholder */}
                      <div className="w-full h-3/4 bg-white/5 flex items-center justify-center">
                        <ImageIcon className="w-8 h-8 text-white/30" />
                      </div>
                      {/* Title */}
                      <div className="p-1 h-1/4 flex items-center">
                        <span className="text-[8px] text-white/70 truncate">
                          {task.title}
                        </span>
                      </div>
                      {/* Live indicator */}
                      <div className="absolute top-1 right-1">
                        <div className="bg-gradient-to-br from-gray-200 via-gray-400 to-gray-200 text-black text-[6px] px-1 py-0.5 rounded font-semibold">
                          LIVE
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                // Regular card layout for other columns
                grouped[col.key].map(task => (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={() => onDragStart(task)}
                    onDragEnd={onDragEnd}
                    onClick={() => handleCardClick(task)}
                    className="backdrop-blur-sm transition-all duration-200 rounded-lg shadow-sm p-1.5 text-xs select-none cursor-pointer bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 group relative"
                  >
                    {/* Annotation Badge - Subtle */}
                    {task.status === 'in_progress' && task.annotations && task.annotations.length > 0 && (
                      <div className="absolute top-1 right-1 z-10">
                        <div className="flex items-center gap-0.5 bg-orange-400/80 text-white text-[8px] font-medium px-1 py-0.5 rounded-full shadow-sm">
                          <div className="w-1 h-1 bg-white rounded-full"></div>
                          <span>{task.annotations.length}</span>
                        </div>
                      </div>
                    )}
                    
                    <h4 className="text-sm font-medium text-white mb-2 line-clamp-2 uppercase">
                      {task.title.toUpperCase()}
                    </h4>

                    {task.description && (
                      <p className="text-xs text-white/70 mb-2 truncate">
                        {task.description.split(' ').slice(0, 5).join(' ')}
                      </p>
                    )}

                    {/* Thumbnails */}
                    {task.media_files && task.media_files.length > 0 && (
                      <div className="flex gap-1 mb-2">
                        {task.media_files.filter((f: any) => {
                          if (typeof f === 'string') {
                            return f.match(/\.(jpe?g|png|webp|gif)$/i);
                          }
                          return f.type?.startsWith('image/') || f.name?.match(/\.(jpe?g|png|webp|gif)$/i);
                        }).slice(0,3).map((file: any, idx: number) => {
                          const url = typeof file === 'string' ? file : file.url;
                          return (
                            <img key={idx} src={url} alt="thumb" className="w-8 h-8 object-cover rounded" />
                          );
                        })}
                        {/* Show video count if any */}
                        {task.media_files.filter((f: any) => {
                          if (typeof f === 'string') {
                            return f.match(/\.(mp4|mov|avi|webm|mkv)$/i);
                          }
                          return f.type?.startsWith('video/') || f.name?.match(/\.(mp4|mov|avi|webm|mkv)$/i);
                        }).length > 0 && (
                          <div className="w-8 h-8 bg-black/30 border border-white/10 rounded flex items-center justify-center">
                            <svg className="w-4 h-4 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6-4h8a2 2 0 012 2v8a2 2 0 01-2 2H8a2 2 0 01-2-2V8a2 2 0 012-2z" />
                            </svg>
                          </div>
                        )}
                        {/* Show PDF count if any */}
                        {task.media_files.filter((f: any) => {
                          if (typeof f === 'string') {
                            return f.match(/\.pdf$/i);
                          }
                          return f.type === 'application/pdf' || f.name?.match(/\.pdf$/i);
                        }).length > 0 && (
                          <div className="w-8 h-8 bg-red-500/10 border border-red-500/20 rounded flex items-center justify-center">
                            <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                        )}
                      </div>
                    )}



                    <div className="flex items-center gap-2 text-xs text-white/50 mb-3">
                      <User className="w-3 h-3" />
                      <span>{task.assignee || 'Unassigned'}</span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-white/60">
                      <div className="flex items-center gap-1">
                        <span>Requested on</span>
                        <span>{formatDate(task.created_at)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>Due: {task.due_date ? formatDate(task.due_date) : 'No deadline'}</span>
                      </div>
                    </div>
                  </div>
                ))
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