"use client";
import { useState } from 'react';
import { MessageSquarePlus } from 'lucide-react';
import AddTaskModal from '@/components/modules/marketing/AddTaskModal';
import { useAuth } from '@/components/shared/AuthProvider';

interface MarketingTicketButtonProps {
  sourceModule: string; // e.g., 'crm', 'inventory', 'workshop'
  variant?: 'button' | 'card';
}

export default function MarketingTicketButton({ 
  sourceModule, 
  variant = 'button' 
}: MarketingTicketButtonProps) {
  const [showModal, setShowModal] = useState(false);
  const { user } = useAuth();

  const handleSaveTask = async (taskData: any) => {
    try {
      // Add source_module to the task data
      const ticketData = {
        ...taskData,
        source_module: sourceModule,
        status: 'intake', // All tickets start in intake
      };

      const headers = user ? {
        'Authorization': `Bearer ${(await import('@/lib/supabaseClient')).supabase.auth.getSession().then(s => s.data.session?.access_token)}`,
        'Content-Type': 'application/json'
      } : {
        'Content-Type': 'application/json'
      };

      const response = await fetch('/api/design-tasks', {
        method: 'POST',
        headers,
        body: JSON.stringify(ticketData),
      });

      if (response.ok) {
        setShowModal(false);
        // Could add success toast here
      } else {
        throw new Error('Failed to create marketing ticket');
      }
    } catch (error) {
      console.error('Error creating marketing ticket:', error);
      // Could add error toast here
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
  };

  if (variant === 'card') {
    return (
      <>
        <div 
          onClick={() => setShowModal(true)}
          className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-4 cursor-pointer hover:bg-white/10 transition-colors group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-500/20 rounded-lg group-hover:bg-orange-500/30 transition-colors">
              <MessageSquarePlus className="w-5 h-5 text-orange-300" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Raise Marketing Ticket</h3>
              <p className="text-xs text-white/60">Request marketing support</p>
            </div>
          </div>
        </div>

        {showModal && (
          <AddTaskModal
            task={null}
            onSave={handleSaveTask}
            onClose={handleCloseModal}
            isAdmin={false} // External users have limited access
          />
        )}
      </>
    );
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="inline-flex items-center gap-2 px-3 py-2 bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/30 rounded-lg text-orange-300 text-sm font-medium transition-colors"
      >
        <MessageSquarePlus className="w-4 h-4" />
        Raise Marketing Ticket
      </button>

      {showModal && (
        <AddTaskModal
          task={null}
          onSave={handleSaveTask}
          onClose={handleCloseModal}
          isAdmin={false} // External users have limited access
        />
      )}
    </>
  );
} 