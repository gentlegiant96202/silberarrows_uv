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
  // Otherwise, use first image
  const imageFile = mediaFiles.find((f: any) => {
    if (typeof f === 'string') {
      return f.match(/\.(jpe?g|png|webp|gif)$/i);
    }
    return f.type?.startsWith('image/') || f.name?.match(/\.(jpe?g|png|webp|gif)$/i);
  });
  return imageFile ? (typeof imageFile === 'string' ? imageFile : imageFile.url) : null;
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
  const [initialLoading, setInitialLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showWorkspace, setShowWorkspace] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [selectedTask, setSelectedTask] = useState<MarketingTask | null>(null);
  const [draggedTask, setDraggedTask] = useState<MarketingTask | null>(null);
  const [hovered, setHovered] = useState<ColKey | null>(null);
  const [pinningTask, setPinningTask] = useState<string | null>(null);
  const [loadingTaskId, setLoadingTaskId] = useState<string | null>(null);
  const initializedRef = useRef(false);

  // Pagination state per column
  const PAGE_SIZE = 20;
  const initialOffsets: Record<ColKey, number> = {
    intake: 0,
    planned: 0,
    in_progress: 0,
    in_review: 0,
    approved: 0,
    instagram_feed_preview: 0,
    archived: 0,
  } as Record<ColKey, number>;
  const [offsets, setOffsets] = useState<Record<ColKey, number>>(initialOffsets);
  const [hasMore, setHasMore] = useState<Record<ColKey, boolean>>({
    intake: true,
    planned: true,
    in_progress: true,
    in_review: true,
    approved: true,
    instagram_feed_preview: true,
  } as Record<ColKey, boolean>);

  // Get permissions and user role
  const { canView, canCreate, canEdit, canDelete, isLoading: permissionsLoading } = useModulePermissions('marketing');
  const { isAdmin } = useUserRole();
  const { user } = useAuth();
  const showArchivedRef = useRef(showArchived);
  useEffect(() => {
    showArchivedRef.current = showArchived;
  }, [showArchived]);

  // Helper function to get authorization headers
  const getAuthHeaders = useCallback(async (): Promise<Record<string, string>> => {
    if (!user) return { 'Content-Type': 'application/json' };
    const session = await supabase.auth.getSession();
    const token = session.data.session?.access_token;
    return token
      ? {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      : {
          'Content-Type': 'application/json',
        };
  }, [user]);

  // Convert a full/raw task to lightweight preview
  const toPreview = (rawTask: any): MarketingTask => {
    const baseTask = {
      id: rawTask.id,
      title: rawTask.title,
      description: rawTask.description,
      status: rawTask.status as MarketingStatus,
      assignee: rawTask.assignee || rawTask.requested_by,
      due_date: rawTask.due_date,
      created_at: rawTask.created_at,
      updated_at: rawTask.updated_at,
      media_files: rawTask.media_files || [],
      annotations: rawTask.annotations || [],
      pinned: rawTask.pinned || false,
      task_type: rawTask.task_type || 'design',
      priority: rawTask.priority || 'medium',
      content_type: rawTask.content_type || 'post',
      tags: rawTask.tags || [],
      created_by: rawTask.created_by,
      acknowledged_at: rawTask.acknowledged_at,
    } as MarketingTask;

    // Compute previewUrl and counts
    const mediaFiles: any[] = baseTask.media_files || [];
    const previewUrl = getPreviewUrl(mediaFiles);
    const media_count = Array.isArray(mediaFiles) ? mediaFiles.length : 0;
    const annotations_count = Array.isArray(baseTask.annotations) ? baseTask.annotations.length : 0;

    return { ...baseTask, previewUrl, media_count, annotations_count };
  };

  // Fetch preview tasks for a given status with pagination
  const fetchStatusTasks = useCallback(
    async (status: ColKey, offset: number = 0) => {
      try {
        const headers = await getAuthHeaders();
        const params = new URLSearchParams({
          fields: 'preview',
          limit: PAGE_SIZE.toString(),
          offset: offset.toString(),
          status,
        });
        const response = await fetch(`/api/design-tasks?${params.toString()}`, { headers });
        if (!response.ok) {
          console.error('Failed to fetch tasks for status', status, response.statusText);
          return [] as MarketingTask[];
        }
        const data = await response.json();
        // data is already compact preview; just trust fields if present
        const previewTasks: MarketingTask[] = data.map((t: any) => ({
          id: t.id,
          title: t.title,
          description: t.description ?? null,
          status: t.status,
          assignee: t.assignee ?? null,
          due_date: t.due_date ?? null,
          created_at: t.created_at,
          updated_at: t.updated_at,
          pinned: t.pinned ?? false,
          task_type: t.task_type ?? 'design',
          priority: t.priority ?? 'medium',
          content_type: t.content_type ?? 'post',
          tags: t.tags ?? [],
          previewUrl: t.previewUrl ?? null,
          media_count: t.media_count ?? 0,
          annotations_count: t.annotations_count ?? 0,
        })) as MarketingTask[];
        return previewTasks;
      } catch (error) {
        console.error('Error fetching tasks for status', status, error);
        return [] as MarketingTask[];
      }
    },
    [getAuthHeaders]
  );

  // Initial load: fetch first PAGE_SIZE per visible column (excluding archived)
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    const loadInitial = async () => {
      setInitialLoading(true);
      try {
        const visibleStatuses: ColKey[] = ['intake', 'planned', 'in_progress', 'in_review', 'approved', 'instagram_feed_preview'];
        const results = await Promise.all(visibleStatuses.map((s) => fetchStatusTasks(s, 0)));
        const merged = results.flat();
        setTasks(merged);
        // Reset offsets and hasMore based on results
        const newOffsets = { ...initialOffsets };
        const newHasMore = { ...hasMore } as Record<ColKey, boolean>;
        visibleStatuses.forEach((s, idx) => {
          newOffsets[s] = results[idx].length;
          newHasMore[s] = results[idx].length === PAGE_SIZE;
        });
        setOffsets(newOffsets);
        setHasMore(newHasMore);
      } finally {
        setInitialLoading(false);
      }
    };
    loadInitial();

    // Real-time subscription for live updates across browsers
    const channel = supabase
      .channel('marketing-tasks-stream')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'design_tasks' },
        (payload: any) => {
          setTasks((prev) => {
            if (payload.eventType === 'INSERT') {
              const preview = toPreview(payload.new);
              // Exclude archived by default from board state
              if (preview.status === 'archived') return prev;
              const exists = prev.some((t) => t.id === preview.id);
              if (exists) return prev;
              return [preview, ...prev];
            }
            if (payload.eventType === 'UPDATE') {
              const preview = toPreview(payload.new);
              // If moved to archived, remove from board unless showArchived is enabled
              if (preview.status === 'archived' && !showArchivedRef.current) {
                return prev.filter((t) => t.id !== preview.id);
              }
              return prev.map((t) => (t.id === preview.id ? preview : t));
            }
            if (payload.eventType === 'DELETE') {
              return prev.filter((t) => t.id !== payload.old.id);
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
  }, [fetchStatusTasks]);

  // Group tasks by status with optimized sorting logic (memoized for performance)
  const grouped = useMemo(() => {
    return columns.reduce((acc, col) => {
      const filteredTasks = tasks.filter((task) => task.status === col.key);
      const tasksWithComputedDates = filteredTasks.map((task) => ({
        ...task,
        updatedAtValue: dayjs(task.updated_at).valueOf(),
      }));
      acc[col.key] = tasksWithComputedDates.sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        return b.updatedAtValue - a.updatedAtValue;
      });
      return acc;
    }, {} as Record<ColKey, MarketingTask[]>);
  }, [tasks, columns]);

  // Load more for a specific column
  const loadMore = useCallback(
    async (status: ColKey) => {
      const nextOffset = offsets[status] || 0;
      const more = await fetchStatusTasks(status, nextOffset);
      if (!more.length) {
        setHasMore((prev) => ({ ...prev, [status]: false }));
        return;
      }
      setTasks((prev) => {
        const existingIds = new Set(prev.map((t) => t.id));
        const deduped = more.filter((t) => !existingIds.has(t.id));
        return [...prev, ...deduped];
      });
      setOffsets((prev) => ({ ...prev, [status]: nextOffset + more.length }));
      if (more.length < PAGE_SIZE) setHasMore((prev) => ({ ...prev, [status]: false }));
    },
    [fetchStatusTasks, offsets]
  );

  const onDragStart = useCallback((task: MarketingTask) => {
    setDraggedTask(task);
  }, []);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  // Optimized onDrop with reduced dependencies and deferred updates
  const onDrop = useCallback(
    (status: ColKey) => async (e: React.DragEvent) => {
      e.preventDefault();
      if (!draggedTask || draggedTask.status === status) {
        setDraggedTask(null);
        setHovered(null);
        return;
      }

      if (status === 'approved' && !isAdmin) {
        alert('Only administrators can approve tasks');
        setDraggedTask(null);
        setHovered(null);
        return;
      }

      const taskToUpdate = draggedTask;
      setDraggedTask(null);
      setHovered(null);

      // Optimistic update
      setTasks((prevTasks) =>
        prevTasks.map((task) => (task.id === taskToUpdate.id ? { ...task, status, updated_at: new Date().toISOString() } : task))
      );

      try {
        const headers = await getAuthHeaders();
        const response = await fetch('/api/design-tasks', {
          method: 'PUT',
          headers,
          body: JSON.stringify({ id: taskToUpdate.id, status }),
        });

        if (!response.ok) {
          // Revert optimistic update on failure
          setTasks((prevTasks) =>
            prevTasks.map((task) => (task.id === taskToUpdate.id ? { ...task, status: taskToUpdate.status, updated_at: taskToUpdate.updated_at } : task))
          );
          console.error('Failed to update task status');
          return;
        }

        const updatedFull = await response.json();
        const updatedPreview = toPreview(updatedFull);
        setTasks((prev) => prev.map((t) => (t.id === updatedPreview.id ? updatedPreview : t)));
      } catch (error) {
        setTasks((prevTasks) =>
          prevTasks.map((task) => (task.id === taskToUpdate.id ? { ...task, status: taskToUpdate.status, updated_at: taskToUpdate.updated_at } : task))
        );
        console.error('Error updating task:', error);
      }
    },
    [draggedTask, isAdmin, getAuthHeaders]
  );

  const onDragEnd = useCallback(() => {
    setDraggedTask(null);
    setHovered(null);
  }, []);

  const handleCardClick = async (task: MarketingTask) => {
    setLoadingTaskId(task.id);
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/design-tasks?id=${task.id}`, { headers });
      if (!response.ok) {
        console.error('Failed to load full task');
        setLoadingTaskId(null);
        return;
      }
      const fullTask = (await response.json()) as MarketingTask;
      setSelectedTask(fullTask);
      if (fullTask.status === 'in_progress' || fullTask.status === 'in_review') {
        setShowWorkspace(true);
      } else {
        setShowModal(true);
      }
    } catch (e) {
      console.error('Error loading full task', e);
    } finally {
      setLoadingTaskId(null);
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
        body: JSON.stringify({ taskId, pinned: newPinned }),
      });

      if (response.ok) {
        setTasks((prev) => prev.map((task) => (task.id === taskId ? { ...task, pinned: newPinned, updated_at: new Date().toISOString() } : task)));
      } else {
        const error = await response.json();
        console.error('❌ Failed to update pin status:', error);
      }
    } catch (error) {
      console.error('❌ Error updating pin status:', error);
    } finally {
      setPinningTask(null);
    }
  };

  const handleSaveTask = async (taskData: Partial<MarketingTask>): Promise<MarketingTask | null> => {
    try {
      if (selectedTask) {
        const updatePayload = { id: selectedTask.id, ...taskData };
        const headers = await getAuthHeaders();
        const response = await fetch('/api/design-tasks', { method: 'PUT', headers, body: JSON.stringify(updatePayload) });
        if (response.ok) {
          const updatedFull: MarketingTask = await response.json();
          const updatedPreview = toPreview(updatedFull);
          setTasks((prev) => prev.map((t) => (t.id === updatedPreview.id ? updatedPreview : t)));
          setShowModal(false);
          setSelectedTask(null);
          return updatedFull;
        } else {
          console.error('Failed to update task');
          return null;
        }
      } else {
        const headers = await getAuthHeaders();
        const response = await fetch('/api/design-tasks', { method: 'POST', headers, body: JSON.stringify(taskData) });
        if (response.ok) {
          const newFull: MarketingTask = await response.json();
          const newPreview = toPreview(newFull);
          setTasks((prev) => [newPreview, ...prev]);
          setShowModal(false);
          setSelectedTask(null);
          return newFull;
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
        body: JSON.stringify({ id: taskId, status: 'archived' }),
      });

      if (response.ok) {
        const updatedFull: MarketingTask = await response.json();
        const updatedPreview = toPreview(updatedFull);
        setTasks((prev) => prev.map((t) => (t.id === updatedPreview.id ? updatedPreview : t)));
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
      const response = await fetch(`/api/design-tasks?id=${taskId}`, { method: 'DELETE', headers });
      if (response.ok) {
        setTasks((prev) => prev.filter((task) => task.id !== taskId));
        setShowModal(false);
        setSelectedTask(null);
      } else {
        console.error('Failed to delete task');
      }
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  if (initialLoading) {
    return (
      <div className="px-4 flex items-center justify-center h-64">
        <div className="text-white/70">Loading tasks...</div>
      </div>
    );
  }

  return (
    <div className="px-2" style={{ height: 'calc(100vh - 72px)' }}>
      <div className="flex gap-1.5 pb-2 w-full h-full overflow-hidden">
        {columns
          .filter((col) => (showArchived ? true : col.key !== 'archived'))
          .map((col) => (
            <div
              key={col.key}
              className={`bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-2 flex flex-col transition-shadow min-w-0 ${
                hovered === col.key ? 'ring-2 ring-gray-300/60' : ''
              } ${col.key === 'instagram_feed_preview' ? 'flex-[1.38] max-w-sm' : 'flex-1'}`}
              onDragOver={(e) => {
                onDragOver(e);
                setHovered(col.key as ColKey);
              }}
              onDrop={onDrop(col.key as ColKey)}
              onDragEnter={() => setHovered(col.key as ColKey)}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) setHovered(null);
              }}
            >
              <div className="mb-2 px-1 flex items-center justify-between relative sticky top-0 z-10 bg-black/50 backdrop-blur-sm pb-1.5 pt-0.5">
                <div className="flex items-center gap-1.5">
                  {col.icon}
                  <h3 className="text-[10px] font-medium text-white whitespace-nowrap">{col.title}</h3>
                  {col.key === 'intake' && canCreate ? (
                    <button
                      onClick={handleCreateTask}
                      className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[8px] font-semibold transition-colors shadow-sm bg-gradient-to-br from-gray-200 via-gray-400 to-gray-200 text-black hover:brightness-110"
                      title="Add new task"
                    >
                      {grouped[col.key as ColKey]?.length || 0}
                      <span className="ml-0.5 text-[10px] leading-none">＋</span>
                    </button>
                  ) : col.key !== 'intake' ? (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-white/10 text-white/70 text-[8px] font-medium">
                      {grouped[col.key as ColKey]?.length || 0}
                    </span>
                  ) : null}
                </div>

                {col.key === 'instagram_feed_preview' && (
                  <button
                    onClick={async () => {
                      const next = !showArchived;
                      setShowArchived(next);
                      if (next) {
                        // When showing archived for the first time, fetch first page for archived
                        const headers = await getAuthHeaders();
                        const params = new URLSearchParams({ fields: 'preview', limit: PAGE_SIZE.toString(), offset: '0', status: 'archived', include_archived: 'true' });
                        const resp = await fetch(`/api/design-tasks?${params.toString()}`, { headers });
                        if (resp.ok) {
                          const data = await resp.json();
                          const previewTasks: MarketingTask[] = data.map((t: any) => ({
                            id: t.id,
                            title: t.title,
                            description: t.description ?? null,
                            status: t.status,
                            assignee: t.assignee ?? null,
                            due_date: t.due_date ?? null,
                            created_at: t.created_at,
                            updated_at: t.updated_at,
                            pinned: t.pinned ?? false,
                            task_type: t.task_type ?? 'design',
                            priority: t.priority ?? 'medium',
                            content_type: t.content_type ?? 'post',
                            tags: t.tags ?? [],
                            previewUrl: t.previewUrl ?? null,
                            media_count: t.media_count ?? 0,
                            annotations_count: t.annotations_count ?? 0,
                          }));
                          setTasks((prev) => {
                            const existingIds = new Set(prev.map((x) => x.id));
                            const deduped = previewTasks.filter((x) => !existingIds.has(x.id));
                            return [...prev, ...deduped];
                          });
                        }
                      }
                    }}
                    className={`
                      inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[8px] font-medium transition-all duration-200
                      ${showArchived ? 'bg-gray-600 text-white shadow-lg' : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white'}
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
                  <div className="grid grid-cols-3 gap-1">
                    {grouped[col.key as ColKey].map((task) => (
                      <div
                        key={task.id}
                        draggable
                        onDragStart={() => onDragStart(task)}
                        onDragEnd={onDragEnd}
                        onClick={() => handleCardClick(task)}
                        className={`aspect-[4/5] bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 backdrop-blur-sm rounded-lg shadow-sm cursor-pointer group relative overflow-hidden ${
                          draggedTask?.id === task.id ? 'z-50 opacity-80 border-white/40' : 'z-10 transition-all duration-200'
                        }`}
                      >
                        {task.status === 'in_progress' && (task.annotations_count || 0) > 0 && (
                          <div className="absolute top-0.5 left-0.5 z-20">
                            <div
                              className="flex items-center gap-0.5 bg-orange-400/80 text-white text-[6px] font-medium px-0.5 py-0.5 rounded-full shadow-sm"
                              title={`${task.annotations_count} annotation${(task.annotations_count || 0) > 1 ? 's' : ''}`}
                            >
                              <div className="w-0.5 h-0.5 bg-white rounded-full"></div>
                              <span>{task.annotations_count || 0}</span>
                            </div>
                          </div>
                        )}

                        <div className="w-full h-full rounded-lg overflow-hidden">
                          {task.previewUrl ? (
                            <img
                              src={task.previewUrl}
                              alt={task.title}
                              loading="lazy"
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center p-1.5">
                              <img src="/MAIN LOGO.png" alt="SilberArrows Logo" loading="lazy" className="w-full h-full object-contain opacity-60 filter brightness-200" />
                            </div>
                          )}
                        </div>

                        {loadingTaskId === task.id && (
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                            <div className="text-white text-[10px]">Loading…</div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  grouped[col.key as ColKey].map((task) => {
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
                          ${draggedTask?.id === task.id ? 'z-50 scale-105 rotate-1 shadow-2xl' : 'z-10 hover:scale-[1.02] hover:-translate-y-1'}
                          bg-gradient-to-br from-white/10 via-white/5 to-white/5
                          backdrop-blur-xl border border-white/20
                          hover:bg-gradient-to-br hover:from-white/15 hover:via-white/8 hover:to-white/8
                          hover:border-white/30 hover:shadow-xl hover:shadow-black/20
                          before:absolute before:inset-0 before:rounded-xl before:p-px
                          before:bg-gradient-to-br before:from-gray-300/30 before:via-gray-500/20 before:to-gray-300/30
                          before:-z-10 before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-300
                        `}
                        style={{
                          opacity: draggedTask?.id === task.id ? 0.8 : 1,
                          transition: draggedTask?.id === task.id ? 'none' : 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                          boxShadow:
                            draggedTask?.id === task.id
                              ? '0 4px 8px rgba(0, 0, 0, 0.3)'
                              : '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2)',
                        }}
                      >
                        <div className="absolute top-0.5 right-0.5 z-20">
                          {task.task_type === 'design' && (
                            <div className="flex items-center gap-1 bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded-full backdrop-blur-sm">
                              <svg className="w-2 h-2" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                              </svg>
                              <span className="text-[7px] font-medium uppercase">Design</span>
                            </div>
                          )}
                          {task.task_type === 'photo' && (
                            <div className="flex items-center gap-1 bg-green-500/20 text-green-300 px-1.5 py-0.5 rounded-full backdrop-blur-sm">
                              <svg className="w-2 h-2" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M9 2l1.06 2.06L12 5l-1.94.94L9 8 7.94 5.94 6 5l1.94-.94L9 2zm6.5 6L17 10l-1.5 2L14 10l1.5-2zm2.5 5l-.62 1.38L16 15l1.38.62L18 17l.62-1.38L20 15l-1.38-.62L18 13z" />
                              </svg>
                              <span className="text-[7px] font-medium uppercase">Photo</span>
                            </div>
                          )}
                          {task.task_type === 'video' && (
                            <div className="flex items-center gap-1 bg-cyan-500/20 text-cyan-300 px-1.5 py-0.5 rounded-full backdrop-blur-sm">
                              <svg className="w-2 h-2" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M8 5v14l11-7z" />
                              </svg>
                              <span className="text-[7px] font-medium uppercase">Video</span>
                            </div>
                          )}
                        </div>

                        <div className="flex px-2 py-1 gap-1.5 min-h-[55px]">
                          <div className="flex-shrink-0 w-16 h-20 relative">
                            {previewUrl ? (
                              <div className="w-full h-full rounded-lg overflow-hidden border border-white/20 shadow-lg">
                                <img src={previewUrl} alt="Preview" loading="lazy" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                              </div>
                            ) : (
                              <div className="w-full h-full rounded-lg bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center shadow-inner p-1">
                                <img src="/MAIN LOGO.png" alt="SilberArrows Logo" loading="lazy" className="w-full h-full object-contain opacity-60 filter brightness-200" />
                              </div>
                            )}

                            <div className="absolute bottom-1 left-0 right-0 flex items-center justify-between px-1">
                              <div className="flex items-center gap-1">
                                {(task.media_count || 0) > 0 && (
                                  <div className="flex items-center gap-0.5 bg-white/20 backdrop-blur-sm border border-white/30 rounded-full px-1 py-0.5">
                                    <ImageIcon className="w-2 h-2 text-white/80" />
                                    <span className="text-white font-bold text-[8px]">{task.media_count || 0}</span>
                                  </div>
                                )}
                              </div>

                              <div className="flex items-center gap-1">
                                {task.status === 'in_progress' && (task.annotations_count || 0) > 0 && (
                                  <div
                                    className="flex items-center gap-0.5 bg-orange-400/90 backdrop-blur-sm border border-orange-300/50 rounded-full px-1 py-0.5"
                                    title={`${task.annotations_count} annotation${(task.annotations_count || 0) > 1 ? 's' : ''}`}
                                  >
                                    <div className="w-1 h-1 bg-white rounded-full animate-pulse"></div>
                                    <span className="text-white font-bold text-[8px]">{task.annotations_count || 0}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex-1 flex flex-col justify-between min-w-0 py-0.5">
                            <div className="flex-shrink-0">
                              <h4 className="text-[11px] font-bold text-white leading-tight line-clamp-1 group-hover:text-gray-100 transition-colors duration-200 uppercase">{task.title}</h4>
                            </div>
                            <div className="flex-shrink-0 space-y-0.5 text-xs">
                              <div className="flex items-center gap-1 text-white/70">
                                <User className="w-2.5 h-2.5 flex-shrink-0" />
                                <span className="truncate text-[9px] font-medium uppercase">{task.assignee || 'Unassigned'}</span>
                              </div>
                              <div className="flex items-center gap-1 text-white/60">
                                <Calendar className="w-2.5 h-2.5 flex-shrink-0" />
                                <span className="text-[8px]">Created {formatDate(task.created_at)}</span>
                              </div>
                              <div
                                className={`flex items-center gap-1 ${
                                  task.due_date && isTaskUrgent(task.due_date) &&
                                  (task.status === 'intake' || task.status === 'planned' || task.status === 'in_progress') &&
                                  !(task.status === 'in_progress' && (task.annotations_count || 0) > 0)
                                    ? 'text-red-400'
                                    : 'text-white/60'
                                }`}
                              >
                                <Calendar className="w-2.5 h-2.5 flex-shrink-0" />
                                <span
                                  className="text-[8px] truncate"
                                  style={
                                    task.due_date && isTaskUrgent(task.due_date) &&
                                    (task.status === 'intake' || task.status === 'planned' || task.status === 'in_progress') &&
                                    !(task.status === 'in_progress' && (task.annotations_count || 0) > 0)
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

                        {task.status === 'approved' && canEdit && (
                          <div className="absolute bottom-1 right-1 z-20">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
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

                        {loadingTaskId === task.id && (
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                            <div className="text-white text-[10px]">Loading…</div>
                          </div>
                        )}

                        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Load more */}
              {col.key !== 'archived' && (
                <div className="pt-1">
                  {hasMore[col.key as ColKey] ? (
                    <button
                      onClick={() => loadMore(col.key as ColKey)}
                      className="w-full text-center text-[9px] py-1 bg-white/10 hover:bg-white/20 text-white/80 rounded border border-white/20"
                    >
                      Load more
                    </button>
                  ) : (
                    <div className="text-center text-[9px] text-white/40 py-1">No more</div>
                  )}
                </div>
              )}
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
        <MarketingWorkspace task={selectedTask} onClose={handleCloseWorkspace} onSave={handleSaveTask} canEdit={canEdit} isAdmin={isAdmin} />
      )}
    </div>
  );
} 