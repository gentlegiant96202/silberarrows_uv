export interface MarketingTask {
  id: string;
  title: string;
  description?: string;
  status: 'intake' | 'planned' | 'in_progress' | 'in_review' | 'approved' | 'instagram_feed_preview' | 'archived';
  priority?: 'low' | 'medium' | 'high';
  assignee?: string;
  due_date?: string;
  created_at: string;
  updated_at: string;
  tags?: string[];
  media_files?: string[];
  content_type?: 'post' | 'story' | 'reel' | 'carousel' | 'ad';
  task_type?: 'design' | 'photo' | 'video';
  annotations?: any[];
  pinned?: boolean;
  created_by?: string; // User ID who created the task
  acknowledged_at?: string; // Timestamp when user acknowledged approved ticket
  previewUrl?: string | null; // Pre-computed preview URL for performance optimization
  media_count?: number; // Number of media files, for previews without full media payload
  annotations_count?: number; // Number of annotations, for previews without full annotations payload
}

export type MarketingStatus = 'intake' | 'planned' | 'in_progress' | 'in_review' | 'approved' | 'instagram_feed_preview' | 'archived';

export type TaskType = 'design' | 'photo' | 'video';

export interface MarketingColumn {
  key: MarketingStatus;
  title: string;
  icon: React.ReactNode;
  color: string;
} 