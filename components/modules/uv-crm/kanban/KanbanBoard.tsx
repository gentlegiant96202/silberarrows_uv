"use client";
import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { MessageSquare, CheckCircle, Car, XCircle } from 'lucide-react';
import NewAppointmentModal from "../modals/NewAppointmentModal";
import LeadDetailsModal from "../modals/LeadDetailsModal";
import { useSearchStore } from "@/lib/searchStore";

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

const columns = [
  { key: "new_lead", title: "NEW LEAD", icon: null },
  { key: "new_customer", title: "NEW APPOINTMENT", icon: null },
  { 
    key: "negotiation", 
    title: "NEGOTIATION",
    icon: <MessageSquare className="w-4 h-4" />
  },
  { 
    key: "won", 
    title: "RESERVED",
    icon: <CheckCircle className="w-4 h-4" />
  },
  { 
    key: "delivered", 
    title: "DELIVERED",
    icon: <Car className="w-4 h-4" />
  },
  { 
    key: "lost", 
    title: "LOST",
    icon: <XCircle className="w-4 h-4" />
  },
] as const;

type ColKey = (typeof columns)[number]["key"];

// Format time for display (convert 24-hour to 12-hour)
const formatTimeForDisplay = (time24: string) => {
  if (!time24) return '';
  
  // Handle both 24-hour format (HH:MM) and 12-hour format (H:MM AM/PM)
  if (time24.includes('AM') || time24.includes('PM')) {
    return time24; // Already in 12-hour format
  }
  
  const [hour, minute] = time24.split(':').map(Number);
  if (isNaN(hour) || isNaN(minute)) return time24; // Return original if invalid
  
  const hour12 = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  const ampm = hour >= 12 ? 'PM' : 'AM';
  
  return `${hour12}:${minute.toString().padStart(2, '0')} ${ampm}`;
};

dayjs.extend(relativeTime);

export default function KanbanBoard() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [hovered, setHovered] = useState<ColKey | null>(null);
  const [convertingLead, setConvertingLead] = useState<Lead | null>(null);
  const [selectedInventoryCarId, setSelectedInventoryCarId] = useState<string>("");

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

  // fetch initial data
  useEffect(() => {
    async function load() {
      const leadsResult = await supabase.from("leads").select("*").order("created_at", { ascending: false });
      if (leadsResult.data) setLeads(leadsResult.data as unknown as Lead[]);
    }
    load();

    // realtime subscription
    const channel = supabase
      .channel("leads-stream")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "leads" },
        (payload: any) => {
          setLeads(prev => {
            if (payload.eventType === "INSERT") {
              return [payload.new as Lead, ...prev];
            }
            if (payload.eventType === "UPDATE") {
              return prev.map(l => (l.id === payload.new.id ? (payload.new as Lead) : l));
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

  const grouped: Record<ColKey, Lead[]> = {
    new_lead: [],
    new_customer: [],
    negotiation: [],
    won: [],
    delivered: [],
    lost: [],
  } as const;
  
  // Normalise status values so variations like "New Customer" or "NEW_CUSTOMER"
  // still map to the correct column. Any unrecognised status defaults to the first column.
  const visibleLeads = leads.filter(
    l =>
      match(l.full_name) ||
      match(l.phone_number) ||
      match(l.model_of_interest)
  );

  visibleLeads.forEach(l => {
    const normalisedStatus = (l.status || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "_") as ColKey;
    if (grouped[normalisedStatus]) {
      grouped[normalisedStatus].push(l);
    } else {
      grouped.new_lead.push(l); // fallback to new lead
    }
  });

  // sort each column by appointment_date nearest first (nulls last)
  (Object.keys(grouped) as ColKey[]).forEach(k=>{
    grouped[k].sort((a,b)=>{
      if(!a.appointment_date) return 1;
      if(!b.appointment_date) return -1;
      return dayjs(a.appointment_date).valueOf() - dayjs(b.appointment_date).valueOf();
    });
  });

  const onDragStart = (lead: Lead) => (e: React.DragEvent) => {
    setIsDragging(true);
    e.dataTransfer.setData("text/plain", lead.id);
  };

  const onDragEnd = () => {
    setIsDragging(false);
  };

  const onDrop = (targetCol: ColKey) => async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    setHovered(null);
    const id = e.dataTransfer.getData("text/plain");
    if (!id) return;
    
    const leadToMove = leads.find(l => l.id === id);
    if (!leadToMove) return;
    
    // Special case: converting from new_lead to new_customer (appointment)
    if (leadToMove.status === 'new_lead' && targetCol === 'new_customer') {
      setConvertingLead(leadToMove);
      return; // Don't update database yet, wait for modal
    }
    
    // Normal drag and drop - update immediately
    setLeads(prev => {
      const idx = prev.findIndex(l => l.id === id);
      if (idx === -1) return prev;
      const moved = { ...prev[idx], status: targetCol } as Lead;
      const rest = prev.filter(l => l.id !== id);
      return [moved, ...rest];
    });
    await supabase.from("leads").update({ status: targetCol }).eq("id", id);
  };

  const onDragOver = (e: React.DragEvent) => e.preventDefault();

  const handleCardClick = (lead: Lead, e: React.MouseEvent) => {
    // Don't open modal if we're dragging
    if (isDragging) return;
    
    // Small delay to distinguish between drag and click
    setTimeout(() => {
      if (!isDragging) {
        setSelectedLead(lead);
      }
    }, 10);
  };

  const handleLeadUpdated = (updatedLead: Lead) => {
    setLeads(prev => prev.map(l => l.id === updatedLead.id ? updatedLead : l));
    setSelectedLead(updatedLead); // Keep modal open with fresh data (like mobile version)
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
      if (!lead.monthly_budget || lead.monthly_budget === 0) return "No monthly budget set";
      return `AED ${lead.monthly_budget.toLocaleString()}/mo`;
    } else {
      if (!lead.total_budget || lead.total_budget === 0) return "No total budget set";
      return `AED ${lead.total_budget.toLocaleString()}`;
    }
  };

  return (
    <div className="px-4">
      <div
        className="flex flex-col md:flex-row md:flex-wrap gap-3 pb-4 w-full"
        style={{ height: "calc(100vh - 72px)" }}
      >
        {columns.map(col => (
        <div
          key={col.key}
          className={`bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-3 flex-1 min-w-0 flex flex-col transition-shadow ${hovered===col.key ? 'ring-2 ring-gray-300/60' : ''}`}
          onDragOver={(e)=>{onDragOver(e); setHovered(col.key as ColKey);}}
          onDrop={onDrop(col.key as ColKey)}
          onDragEnter={()=>setHovered(col.key as ColKey)}
          onDragLeave={(e)=>{ if(!e.currentTarget.contains(e.relatedTarget as Node)) setHovered(null); }}
        >
          <div className="mb-3 px-1 flex items-center justify-between relative sticky top-0 z-10 bg-black/50 backdrop-blur-sm pb-2 pt-1">
            <div className="flex items-center gap-2">
              {col.icon}
              <h3 className="text-xs font-medium text-white whitespace-nowrap">
                {col.title}
              </h3>
              {(col.key === 'new_lead' || col.key === 'new_customer') ? (
              <button
                onClick={() => setShowModal(true)}
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold transition-colors shadow-sm bg-gradient-to-br from-gray-200 via-gray-400 to-gray-200 text-black hover:brightness-110"
                title={col.key === 'new_lead' ? "Add new lead" : "Add new appointment"}
              >
                  {grouped[col.key as ColKey].length}
                  <span className="ml-1 text-[12px] leading-none">＋</span>
              </button>
              ) : (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-white/10 text-white/70 text-[10px] font-medium">
                  {grouped[col.key as ColKey].length}
                </span>
            )}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {grouped[col.key as ColKey].map(l => (
              <div
                key={l.id}
                draggable
                onDragStart={onDragStart(l)}
                onDragEnd={onDragEnd}
                onClick={(e) => handleCardClick(l, e)}
                className={`${(()=>{
                  // Create precise appointment datetime by combining date and time_slot
                  const appointmentDateTime = l.appointment_date && l.time_slot 
                    ? dayjs(`${l.appointment_date} ${l.time_slot}`)
                    : null;
                  
                  const now = dayjs();
                  const base = 'backdrop-blur-sm transition-all duration-200 rounded-lg shadow-sm p-1.5 text-xs select-none cursor-pointer group ';
                  
                  // Only apply colors for new_customer column and when we have a complete appointment datetime
                  if (col.key === 'new_customer' && appointmentDateTime) {
                    const past = appointmentDateTime.isBefore(now);
                    const within24Hours = appointmentDateTime.isAfter(now) && appointmentDateTime.diff(now, 'hour') <= 24;
                    
                    if (past) return base + 'bg-red-500/20 border-red-400/30';
                    if (within24Hours) return base + 'bg-green-500/20 border-green-400/30';
                  }
                  
                  // Special styling for new_lead column
                  if (col.key === 'new_lead') {
                    return base + 'bg-blue-500/10 border-blue-400/20 hover:bg-blue-500/15 hover:border-blue-400/30';
                  }
                  
                  return base + 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20';
                })()}`}
              >
                <div className="flex items-start justify-between mb-1">
                  <div className="text-xs font-medium text-white group-hover:text-white/90 transition-colors">
                    {highlight(l.full_name)}
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
                    {l.country_code} {l.phone_number}
                    <span className="text-white/50">·</span>
                  </div>
                  
                  <div className="text-xs text-white/70 flex items-center gap-1">
                    <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    {highlight(l.model_of_interest)} (Max {l.max_age})
                  </div>
                  
                  <div className="text-xs text-white/70 flex items-center gap-1">
                    <span className="w-2.5 h-2.5 text-white/70 font-bold text-[10px] flex items-center justify-center">د.إ</span>
                    {formatBudget(l)}
                  </div>
                  
                  <div className="text-[10px] text-white/70 flex items-center gap-1 mt-0.5 pt-0.5 border-t border-white/10">
                    {col.key === 'new_customer' && l.appointment_date && l.time_slot ? (
                      <>
                        <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                        {dayjs(l.appointment_date).format('DD MMM')}
                      <span className="text-white/50">at {formatTimeForDisplay(l.time_slot)}</span>
                      </>
                    ) : col.key === 'new_lead' ? (
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
                          const rel = dayjs(l.updated_at).fromNow();
                          return rel.startsWith('in ') ? `a few seconds ago` : rel;
                        })()}
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {grouped[col.key as ColKey].length === 0 && (
              <div className="text-center text-xs text-white/50 py-4">No leads</div>
            )}
          </div>
        </div>
        ))}
      </div>
      
      {showModal && (
        <NewAppointmentModal
          mode="create_lead"
          onClose={() => setShowModal(false)}
          onCreated={() => {}} // Real-time subscription will handle adding the lead
          initialSelectedCarId={selectedInventoryCarId}
          onInventoryCarSelected={setSelectedInventoryCarId}
        />
      )}
      
      {convertingLead && (
        <NewAppointmentModal
          mode="convert_appointment"
          existingLead={convertingLead}
          onClose={handleConversionCancelled}
          onCreated={handleConversionCompleted}
          initialSelectedCarId={selectedInventoryCarId}
          onInventoryCarSelected={setSelectedInventoryCarId}
        />
      )}
      
      {selectedLead && (
        <LeadDetailsModal
          lead={selectedLead}
          onClose={() => setSelectedLead(null)}
          onUpdated={handleLeadUpdated}
          onDeleted={handleLeadDeleted}
        />
      )}
    </div>
  );
} 