"use client";

import { useState } from 'react';
import { Plus, Calendar } from 'lucide-react';
import NewAppointmentModal from '@/components/modules/uv-crm/modals/NewAppointmentModal';

export default function MobileActions() {
  const [showCreateLead, setShowCreateLead] = useState(false);
  const [showCreateAppointment, setShowCreateAppointment] = useState(false);

  const handleLeadCreated = (lead: any) => {
    setShowCreateLead(false);
    // The kanban will automatically update via real-time subscription
  };

  const handleAppointmentCreated = (lead: any) => {
    setShowCreateAppointment(false);
    // The kanban will automatically update via real-time subscription
  };

  return (
    <>
      {/* Top Action Bar */}
      <div className="flex-shrink-0 bg-black border-b border-white/10 p-3">
        <div className="flex gap-2">
          <button
            onClick={() => setShowCreateLead(true)}
            className="flex-1 h-12 bg-white/20 hover:bg-white/30 active:bg-white/40 
                       text-white rounded-lg font-medium text-sm
                       flex items-center justify-center space-x-2
                       transition-colors touch-manipulation border border-white/30"
          >
            <Plus className="w-5 h-5" />
            <span>New Lead</span>
          </button>

          <button
            onClick={() => setShowCreateAppointment(true)}
            className="flex-1 h-12 bg-white/20 hover:bg-white/30 active:bg-white/40 
                       text-white rounded-lg font-medium text-sm
                       flex items-center justify-center space-x-2
                       transition-colors touch-manipulation border border-white/30"
          >
            <Calendar className="w-5 h-5" />
            <span>New Appointment</span>
          </button>
        </div>
      </div>

      {/* Create Lead Modal - Uses main app's NewAppointmentModal */}
      {showCreateLead && (
        <NewAppointmentModal
          onClose={() => setShowCreateLead(false)}
          onCreated={handleLeadCreated}
          mode="create_lead"
        />
      )}

      {/* Create Appointment Modal - Uses main app's NewAppointmentModal */}
      {showCreateAppointment && (
        <NewAppointmentModal
          onClose={() => setShowCreateAppointment(false)}
          onCreated={handleAppointmentCreated}
          mode="create_lead"
        />
      )}
    </>
  );
} 