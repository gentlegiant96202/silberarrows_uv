"use client";
import { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, Calendar, User, Ticket } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/components/shared/AuthProvider';

interface MyMarketingTicketsProps {
  sourceModule: string;
}

interface MarketingTicket {
  id: string;
  title: string;
  status: string;
  created_at: string;
  due_date?: string;
  assignee?: string;
  task_type?: 'design' | 'photo' | 'video';
}

export default function MyMarketingTickets({ sourceModule }: MyMarketingTicketsProps) {
  const [tickets, setTickets] = useState<MarketingTicket[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  const statusColors = {
    planned: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    intake: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    in_progress: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
    in_review: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
    approved: 'bg-green-500/20 text-green-300 border-green-500/30',
    instagram_feed_preview: 'bg-pink-500/20 text-pink-300 border-pink-500/30',
  };

  const statusLabels = {
    planned: 'PLANNED',
    intake: 'INTAKE',
    in_progress: 'IN PROGRESS',
    in_review: 'IN REVIEW',
    approved: 'APPROVED',
    instagram_feed_preview: 'PREVIEW',
  };

  const taskTypeIcons = {
    design: '🎨',
    photo: '📸',
    video: '🎬',
  };

  useEffect(() => {
    fetchMyTickets();
    
    // Subscribe to real-time updates
    const subscription = supabase
      .channel('my_marketing_tickets')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'design_tasks',
          filter: `source_module=eq.${sourceModule}`,
        },
        (payload) => {
          // Refresh tickets when changes occur
          fetchMyTickets();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [sourceModule, user]);

  const fetchMyTickets = async () => {
    if (!user?.id) return;

    try {
      const headers = {
        'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        'Content-Type': 'application/json'
      };

      const response = await fetch(`/api/design-tasks?source_module=${sourceModule}&user_tickets=true`, {
        headers
      });

      if (response.ok) {
        const data = await response.json();
        setTickets(data);
      }
    } catch (error) {
      console.error('Error fetching my tickets:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB');
  };

  if (isLoading) {
    return (
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-4">
        <div className="animate-pulse">
          <div className="h-4 bg-white/10 rounded w-48 mb-2"></div>
          <div className="h-3 bg-white/5 rounded w-32"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg overflow-hidden">
      {/* Header */}
      <div 
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/5 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-500/20 rounded-lg">
            <Ticket className="w-4 h-4 text-orange-300" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">
              📁 My Marketing Requests ({tickets.length})
            </h3>
            <p className="text-xs text-white/60">
              {tickets.filter(t => ['planned', 'intake', 'in_progress'].includes(t.status)).length} pending
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {tickets.length > 0 && (
            <div className="flex -space-x-1">
              {tickets.slice(0, 3).map((ticket) => (
                <div 
                  key={ticket.id}
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2 border-black ${statusColors[ticket.status as keyof typeof statusColors] || 'bg-gray-500/20 text-gray-300'}`}
                >
                  {taskTypeIcons[ticket.task_type as keyof typeof taskTypeIcons] || '📄'}
                </div>
              ))}
              {tickets.length > 3 && (
                <div className="w-6 h-6 rounded-full bg-white/10 border-2 border-black flex items-center justify-center text-xs font-bold text-white/70">
                  +{tickets.length - 3}
                </div>
              )}
            </div>
          )}
          
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-white/60" />
          ) : (
            <ChevronRight className="w-4 h-4 text-white/60" />
          )}
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-white/10">
          {tickets.length === 0 ? (
            <div className="p-4 text-center text-white/60 text-sm">
              No marketing requests yet
            </div>
          ) : (
            <div className="p-4 space-y-3 max-h-64 overflow-y-auto">
              {tickets.map((ticket) => (
                <div 
                  key={ticket.id}
                  className="bg-white/5 border border-white/10 rounded-lg p-3 hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-sm font-medium text-white truncate">
                          {ticket.title}
                        </h4>
                        {ticket.task_type && (
                          <span className="text-xs">
                            {taskTypeIcons[ticket.task_type]}
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-3 text-xs text-white/60">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>Created {formatDate(ticket.created_at)}</span>
                        </div>
                        {ticket.assignee && (
                          <div className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            <span>{ticket.assignee}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className={`px-2 py-1 rounded-full text-xs font-medium border ${statusColors[ticket.status as keyof typeof statusColors] || 'bg-gray-500/20 text-gray-300 border-gray-500/30'}`}>
                      {statusLabels[ticket.status as keyof typeof statusLabels] || ticket.status.toUpperCase()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
} 