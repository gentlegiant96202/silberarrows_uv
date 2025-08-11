"use client";
import { useState, useEffect, useRef } from 'react';
import { MessageSquarePlus, ChevronDown, Calendar, User, Ticket } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/components/shared/AuthProvider';
import AddTaskModal from '@/components/modules/marketing/AddTaskModal';
import { MarketingTask } from '@/types/marketing';

interface MarketingTicket {
  id: string;
  title: string;
  status: string;
  created_at: string;
  due_date?: string;
  assignee?: string;
  task_type?: 'design' | 'photo' | 'video';
  acknowledged_at?: string;
  created_by?: string;
}

export default function MarketingTicketsDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [tickets, setTickets] = useState<MarketingTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, right: 0 });
  const { user } = useAuth();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const lastFetchedUserId = useRef<string | null>(null);
  const hasFetchedOnce = useRef(false);

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
    if (!user?.id) return;
    
    // Only fetch if user changed or we haven't fetched yet
    if (user.id !== lastFetchedUserId.current || !hasFetchedOnce.current) {
      console.log('Fetching design tasks...');
      fetchMyTickets();
      lastFetchedUserId.current = user.id;
      hasFetchedOnce.current = true;
    }
    
    // Subscribe to real-time updates
    const subscription = supabase
      .channel(`my_marketing_tickets_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'design_tasks',
        },
        (payload) => {
          // Only refresh if it affects this user's tickets
          if (payload.new?.assignee === user.id || payload.old?.assignee === user.id) {
            fetchMyTickets();
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user?.id]); // Only depend on user.id, not the entire user object

  // Close dropdown when clicking outside and handle window resize
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleResize() {
      if (isOpen) {
        updateDropdownPosition();
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('resize', handleResize);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('resize', handleResize);
    };
  }, [isOpen]);

  const fetchMyTickets = async () => {
    if (!user?.id) return;

    try {
      const headers = {
        'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        'Content-Type': 'application/json'
      };

      const response = await fetch('/api/design-tasks?user_tickets=true', {
        headers
      });

      if (response.ok) {
        const data = await response.json();
        setTickets(data);
      }
    } catch (error) {
      console.error('Error fetching department tickets:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const acknowledgeTicket = async (ticketId: string) => {
    try {
      const headers = {
        'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        'Content-Type': 'application/json'
      };

      const response = await fetch(`/api/design-tasks?id=${ticketId}&action=acknowledge`, {
        method: 'PATCH',
        headers
      });

      if (response.ok) {
        // Remove the acknowledged ticket from the list immediately
        setTickets(tickets.filter(t => t.id !== ticketId));
      } else {
        console.error('Failed to acknowledge ticket');
      }
    } catch (error) {
      console.error('Error acknowledging ticket:', error);
    }
  };

  const handleSaveTask = async (taskData: any): Promise<MarketingTask | null> => {
    try {
      // Auto-populate requester name if not provided
      const userName = user?.user_metadata?.full_name;
      const autoDisplayName = userName || 
        (user?.email?.split('@')[0]?.replace(/\./g, ' ')?.replace(/\b\w/g, l => l.toUpperCase())) || 
        'User';

      // Task automatically gets created_by from API
      const headers = {
        'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        'Content-Type': 'application/json'
      };

      const response = await fetch('/api/design-tasks', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          ...taskData,
          assignee: taskData.assignee || autoDisplayName, // Auto-populate if empty
          status: 'intake', // All tickets start in intake
        }),
      });

      if (response.ok) {
        const createdTask = await response.json();
        setShowModal(false);
        fetchMyTickets(); // Refresh the list
        return createdTask;
      } else {
        throw new Error('Failed to create marketing ticket');
      }
    } catch (error) {
      console.error('Error creating marketing ticket:', error);
      return null;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB');
  };

  const updateDropdownPosition = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 8, // 8px gap below button
        right: window.innerWidth - rect.right // Align right edge with button
      });
    }
  };

  const handleToggleDropdown = () => {
    if (!isOpen) {
      updateDropdownPosition();
    }
    setIsOpen(!isOpen);
  };

  const pendingCount = tickets.filter(t => ['planned', 'intake', 'in_progress'].includes(t.status)).length;

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        <button
          ref={buttonRef}
          onClick={handleToggleDropdown}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-colors text-sm text-white"
        >
          <MessageSquarePlus className="w-4 h-4 text-orange-300" />
          <span>Marketing Tickets</span>
          {pendingCount > 0 && (
            <span className="bg-orange-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
              {pendingCount}
            </span>
          )}
          <ChevronDown className={`w-4 h-4 text-white/60 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <div 
            className="fixed w-72 bg-black/90 backdrop-blur-xl border border-white/20 rounded-lg shadow-2xl z-[9999] overflow-hidden"
            style={{
              top: `${dropdownPosition.top}px`,
              right: `${dropdownPosition.right}px`
            }}
          >
            {/* Header */}
            <div className="p-2.5 border-b border-white/10">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold text-white">Department Marketing Requests</h3>
                <span className="text-[10px] text-white/60">{tickets.length} total</span>
              </div>
              
              <button
                onClick={() => {
                  setShowModal(true);
                  setIsOpen(false);
                }}
                className="w-full flex items-center gap-1.5 px-2.5 py-1.5 bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/30 rounded text-orange-300 text-[11px] font-medium transition-colors"
              >
                <MessageSquarePlus className="w-3.5 h-3.5" />
                Raise New Ticket
              </button>
            </div>

            {/* Tickets List */}
            <div className="max-h-48 overflow-y-auto">
              {isLoading ? (
                <div className="p-2.5">
                  <div className="animate-pulse space-y-2">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="h-12 bg-white/5 rounded"></div>
                    ))}
                  </div>
                </div>
              ) : tickets.length === 0 ? (
                <div className="p-2.5 text-center text-white/60 text-[11px]">
                  No department marketing requests yet
                </div>
              ) : (
                <div className="p-2.5 space-y-2">
                  {tickets.map((ticket) => (
                    <div 
                      key={ticket.id}
                      className="bg-white/5 border border-white/10 rounded p-2 hover:bg-white/10 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-1">
                            {/* Creator indicator */}
                            {ticket.created_by === user?.id ? (
                              <div className="w-1.5 h-1.5 bg-blue-400 rounded-full flex-shrink-0" title="Created by you" />
                            ) : (
                              <div className="w-1.5 h-1.5 bg-orange-400 rounded-full flex-shrink-0" title="Created by department colleague" />
                            )}
                            <h4 className="text-[11px] font-medium text-white truncate">
                              {ticket.title}
                            </h4>
                            {ticket.task_type && (
                              <span className="text-[10px]">
                                {taskTypeIcons[ticket.task_type]}
                              </span>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-2 text-[10px] text-white/60">
                            <div className="flex items-center gap-0.5">
                              <Calendar className="w-2.5 h-2.5" />
                              <span>{formatDate(ticket.created_at)}</span>
                            </div>
                            {ticket.assignee && (
                              <div className="flex items-center gap-0.5">
                                <User className="w-2.5 h-2.5" />
                                <span className="truncate">{ticket.assignee}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-1.5">
                          {/* Acknowledge button for approved tickets created by current user only */}
                          {ticket.status === 'approved' && ticket.created_by === user?.id && (
                            <button
                              onClick={() => acknowledgeTicket(ticket.id)}
                              className="p-1 hover:bg-green-500/20 rounded text-green-300 hover:text-green-200 transition-colors"
                              title="Mark as seen"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </button>
                          )}
                          
                          <div className={`px-1.5 py-0.5 rounded text-[9px] font-medium border ${statusColors[ticket.status as keyof typeof statusColors] || 'bg-gray-500/20 text-gray-300 border-gray-500/30'}`}>
                            {statusLabels[ticket.status as keyof typeof statusLabels] || ticket.status.toUpperCase()}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <AddTaskModal
          task={{
            assignee: user?.user_metadata?.full_name || 
              (user?.email?.split('@')[0]?.replace(/\./g, ' ')?.replace(/\b\w/g, l => l.toUpperCase())) || 
              'User'
          } as any}
          onSave={handleSaveTask}
          onClose={() => setShowModal(false)}
          isAdmin={false} // External users have limited access
        />
      )}
    </>
  );
} 