export interface MarketingTask {
  id: string;
  title: string;
  description?: string;
  status: 'intake' | 'planned' | 'in_progress' | 'in_review' | 'approved' | 'instagram_feed_preview';
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
}

export type MarketingStatus = 'intake' | 'planned' | 'in_progress' | 'in_review' | 'approved' | 'instagram_feed_preview';

export type TaskType = 'design' | 'photo' | 'video';

export interface MarketingColumn {
  key: MarketingStatus;
  title: string;
  icon: React.ReactNode;
  color: string;
} 