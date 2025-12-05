"use client";

import { useState } from 'react';
import { Plus, Calendar } from 'lucide-react';
import LeadDetailsModal from '@/components/modules/uv-crm/modals/LeadDetailsModal';
import { useModulePermissions } from '@/lib/useModulePermissions';

export default function MobileActions() {
  const [showCreateLead, setShowCreateLead] = useState(false);
  const [showCreateAppointment, setShowCreateAppointment] = useState(false);
  
  // Check permissions
  const { canCreate, isLoading } = useModulePermissions('uv_crm');

  const handleLeadCreated = (lead: any) => {
    setShowCreateLead(false);
    // The kanban will automatically update via real-time subscription
  };

  const handleAppointmentCreated = (lead: any) => {
    setShowCreateAppointment(false);
    // The kanban will automatically update via real-time subscription
  };

  // Don't show buttons if still loading permissions
  if (isLoading) {
    return null;
  }

  // Only show buttons if user has create permission
  if (!canCreate) {
    return null;
  }

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

      {/* Create Lead Modal */}
      {showCreateLead && (
        <LeadDetailsModal
          mode="create"
          onClose={() => setShowCreateLead(false)}
          onCreated={handleLeadCreated}
        />
      )}

      {/* Create Appointment Modal */}
      {showCreateAppointment && (
        <LeadDetailsModal
          mode="create"
          onClose={() => setShowCreateAppointment(false)}
          onCreated={handleAppointmentCreated}
        />
      )}
    </>
  );
}
