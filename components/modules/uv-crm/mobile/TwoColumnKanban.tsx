"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
// Icons are now inline SVGs to match main kanban
import LeadDetailsModal from '@/components/modules/uv-crm/modals/LeadDetailsModal';
import NewAppointmentModal from '@/components/modules/uv-crm/modals/NewAppointmentModal';
import { useSearchStore } from '@/lib/searchStore';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

interface Lead {
  id: string;
  status: string;
  full_name: string;
  phone_number: string;
  country_code: string;
  model_of_interest: string;
  max_age: string;
  payment_type: string;
  monthly_budget: number;
  total_budget: number;
  appointment_date: string;
  time_slot: string;
  notes: string;
  timeline_notes?: any[]; // Add timeline_notes field
  created_at: string;
  updated_at: string;
  inventory_car_id?: string; // Also add this field that might be missing
}

export default function TwoColumnKanban() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [draggedLead, setDraggedLead] = useState<Lead | null>(null);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [convertingLead, setConvertingLead] = useState<Lead | null>(null);

  // Search store
  const { query } = useSearchStore();
  const upperQuery = query.toUpperCase();
  const match = (text?: string) =>
    query ? String(text || "").toUpperCase().includes(upperQuery) : true;
  const highlight = (text: string): React.ReactNode => {
    if (!query) return text;
    const idx = text.toUpperCase().indexOf(upperQuery);
    if (idx === -1) return text;
    return (
      <span>
        {text.slice(0, idx)}
        <span className="bg-yellow-300 text-black">
          {text.slice(idx, idx + query.length)}
        </span>
        {text.slice(idx + query.length)}
      </span>
    );
  };

  const columns = [
    { 
      key: 'new_lead', 
      label: 'New Leads', 
      bgColor: 'bg-white/10', 
      borderColor: 'border-white/20',
      accentColor: 'text-white'
    },
    { 
      key: 'new_customer', 
      label: 'Appointments', 
      bgColor: 'bg-white/10', 
      borderColor: 'border-white/20',
      accentColor: 'text-white'
    }
  ];

  // Load initial data
  useEffect(() => {
    async function load() {
      const leadsResult = await supabase
        .from("leads")
        .select("*")
        .in('status', ['new_lead', 'new_customer'])
        .order("created_at", { ascending: false });
      
      if (leadsResult.data) {
        setLeads(leadsResult.data as unknown as Lead[]);
      }
      setLoading(false);
    }
    load();

    // Real-time subscription
    const channel = supabase
      .channel("mobile-leads-stream")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "leads" },
        (payload: any) => {
          setLeads(prev => {
            if (payload.eventType === "INSERT") {
              const newLead = payload.new as Lead;
              // Only show new_lead and new_customer statuses
              if (['new_lead', 'new_customer'].includes(newLead.status)) {
                return [newLead, ...prev];
              }
              return prev;
            }
            if (payload.eventType === "UPDATE") {
              const updatedLead = payload.new as Lead;
              return prev.map(l => {
                if (l.id === updatedLead.id) {
                  // If lead moved out of our view (different status), remove it
                  if (!['new_lead', 'new_customer'].includes(updatedLead.status)) {
                    return null;
                  }
                  return updatedLead;
                }
                return l;
              }).filter(Boolean) as Lead[];
            }
            if (payload.eventType === "DELETE") {
              return prev.filter(l => l.id !== payload.old.id);
            }
            return prev;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleDragStart = (e: React.DragEvent, lead: Lead) => {
    setDraggedLead(lead);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData("text/plain", lead.id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: string) => {
    e.preventDefault();
    
    if (!draggedLead || draggedLead.status === targetStatus) {
      setDraggedLead(null);
      return;
    }

    // Special case: converting from new_lead to new_customer (appointment)
    if (draggedLead.status === 'new_lead' && targetStatus === 'new_customer') {
      setConvertingLead(draggedLead);
      setDraggedLead(null);
      return; // Don't update database yet, wait for modal
    }

    try {
      // Normal drag and drop - update immediately
      const { error } = await supabase
        .from('leads')
        .update({ status: targetStatus })
        .eq('id', draggedLead.id);

      if (error) throw error;

      // Update local state immediately for responsive UI
      setLeads(prev => prev.map(lead => 
        lead.id === draggedLead.id 
          ? { ...lead, status: targetStatus }
          : lead
      ));
    } catch (error) {
      console.error('Error updating lead status:', error);
    } finally {
      setDraggedLead(null);
    }
  };

  const handleLeadClick = (lead: Lead) => {
    setSelectedLead(lead);
  };

  const handleLeadUpdated = (updatedLead: Lead) => {
    setLeads(prev => prev.map(l => l.id === updatedLead.id ? updatedLead : l));
    setSelectedLead(updatedLead);
  };

  const handleLeadDeleted = (leadId: string) => {
    setLeads(prev => prev.filter(l => l.id !== leadId));
    setSelectedLead(null);
  };

  const handleConversionCompleted = (updatedLead: Lead) => {
    setLeads(prev => prev.map(l => l.id === updatedLead.id ? updatedLead : l));
    setConvertingLead(null);
  };

  const handleConversionCancelled = () => {
    setConvertingLead(null);
  };



  const formatBudget = (lead: Lead) => {
    if (lead.payment_type === 'monthly') {
      if (!lead.monthly_budget || lead.monthly_budget === 0) return "";
      return `AED ${lead.monthly_budget.toLocaleString()}/mo`;
    } else {
      if (!lead.total_budget || lead.total_budget === 0) return "";
      return `AED ${lead.total_budget.toLocaleString()}`;
    }
  };

  const formatTimeForDisplay = (time24: string) => {
    if (!time24) return '';
    
    if (time24.includes('AM') || time24.includes('PM')) {
      return time24;
    }
    
    const [hour, minute] = time24.split(':').map(Number);
    if (isNaN(hour) || isNaN(minute)) return time24;
    
    const hour12 = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    const ampm = hour >= 12 ? 'PM' : 'AM';
    
    return `${hour12}:${minute.toString().padStart(2, '0')} ${ampm}`;
  };

  const getLeadsForColumn = (status: string) => {
    return leads.filter(lead => 
      lead.status === status &&
      (match(lead.full_name) ||
       match(lead.phone_number) ||
       match(lead.model_of_interest))
    );
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-white/70 text-center">
          <div className="animate-pulse">Loading leads...</div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex-1 grid grid-cols-2 gap-2 p-3 overflow-hidden">
        {columns.map(column => {
          const columnLeads = getLeadsForColumn(column.key);
          
          return (
            <div
              key={column.key}
              className={`flex flex-col ${column.bgColor} ${column.borderColor} border rounded-xl overflow-hidden`}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, column.key)}
            >
              {/* Column Header */}
              <div className="p-3 border-b border-white/10">
                <div className="flex items-center justify-between">
                  <h3 className={`font-semibold text-sm ${column.accentColor}`}>
                    {column.label}
                  </h3>
                  <span className="text-xs text-white/60 bg-white/10 px-2 py-1 rounded-full">
                    {columnLeads.length}
                  </span>
                </div>
              </div>

              {/* Column Content */}
              <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {columnLeads.map(lead => (
                  <div
                    key={lead.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, lead)}
                    onClick={() => handleLeadClick(lead)}
                    className={`${(()=>{
                      // Create precise appointment datetime by combining date and time_slot
                      const appointmentDateTime = lead.appointment_date && lead.time_slot 
                        ? dayjs(`${lead.appointment_date} ${lead.time_slot}`)
                        : null;
                      
                      const now = dayjs();
                      const base = 'backdrop-blur-sm transition-all duration-200 rounded-lg shadow-sm p-1.5 text-xs select-none cursor-pointer group ';
                      
                      // Only apply colors for new_customer column and when we have a complete appointment datetime
                      if (column.key === 'new_customer' && appointmentDateTime) {
                        const past = appointmentDateTime.isBefore(now);
                        const within24Hours = appointmentDateTime.isAfter(now) && appointmentDateTime.diff(now, 'hour') <= 24;
                        
                        if (past) return base + 'bg-red-500/20 border-red-400/30';
                        if (within24Hours) return base + 'bg-green-500/20 border-green-400/30';
                      }
                      
                      // Special styling for new_lead column
                      if (column.key === 'new_lead') {
                        return base + 'bg-blue-500/10 border-blue-400/20 hover:bg-blue-500/15 hover:border-blue-400/30';
                      }
                      
                      return base + 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20';
                    })()}`}
                  >
                    <div className="flex items-start justify-between mb-1">
                      <div className="text-xs font-medium text-white group-hover:text-white/90 transition-colors">
                        {highlight(lead.full_name)}
                      </div>
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <svg className="w-2.5 h-2.5 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                    
                    <div className="space-y-0.5">
                      <div className="text-xs text-white/70 flex items-center gap-1">
                        <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        {lead.country_code} {lead.phone_number}
                        <span className="text-white/50">·</span>
                      </div>
                      
                      <div className="text-xs text-white/70 flex items-center gap-1">
                        <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                        {highlight(lead.model_of_interest)} (Max {lead.max_age})
                      </div>
                      
                      <div className="text-xs text-white/70 flex items-center gap-1">
                        <span className="w-2.5 h-2.5 text-white/70 font-bold text-[10px] flex items-center justify-center">د.إ</span>
                        {formatBudget(lead)}
                      </div>
                      
                      <div className="text-[10px] text-white/70 flex items-center gap-1 mt-0.5 pt-0.5 border-t border-white/10">
                        {column.key === 'new_customer' && lead.appointment_date && lead.time_slot ? (
                          <>
                            <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            {dayjs(lead.appointment_date).format('DD MMM')}
                            <span className="text-white/50">at {formatTimeForDisplay(lead.time_slot)}</span>
                          </>
                        ) : column.key === 'new_lead' ? (
                          <>
                            <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Drag to schedule appointment
                          </>
                        ) : (
                          <>
                            <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {(() => {
                              const rel = dayjs(lead.updated_at).fromNow();
                              return rel.startsWith('in ') ? `a few seconds ago` : rel;
                            })()}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {/* Empty State */}
                {columnLeads.length === 0 && (
                  <div className="text-center text-xs text-white/50 py-4">No leads</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Lead Details Modal */}
      {selectedLead && (
        <LeadDetailsModal
          lead={selectedLead}
          onClose={() => setSelectedLead(null)}
          onUpdated={handleLeadUpdated}
          onDeleted={handleLeadDeleted}
        />
      )}

      {/* Conversion Modal - Converting lead to appointment */}
      {convertingLead && (
        <NewAppointmentModal
          onClose={handleConversionCancelled}
          onCreated={handleConversionCompleted}
          mode="convert_appointment"
          existingLead={convertingLead}
        />
      )}
    </>
  );
} 