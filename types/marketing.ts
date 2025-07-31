export interface MarketingTask {
  id: string;
  title: string;
  description?: string;
  status: 'intake' | 'in_progress' | 'in_review' | 'approved' | 'instagram_feed_preview';
  priority?: 'low' | 'medium' | 'high';
  assignee?: string;
  due_date?: string;
  created_at: string;
  updated_at: string;
  tags?: string[];
  media_files?: string[];
  content_type?: 'post' | 'story' | 'reel' | 'carousel' | 'ad';
  annotations?: any[];
  pinned?: boolean;
}

export type MarketingStatus = 'intake' | 'in_progress' | 'in_review' | 'approved' | 'instagram_feed_preview';

export interface MarketingColumn {
  key: MarketingStatus;
  title: string;
  icon: React.ReactNode;
  color: string;
} 