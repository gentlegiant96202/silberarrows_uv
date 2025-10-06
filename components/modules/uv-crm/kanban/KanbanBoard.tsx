"use client";
import React, { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { MessageSquare, CheckCircle, Car, XCircle, Archive } from 'lucide-react';
import { useUserRole } from '@/lib/useUserRole';

// Skeleton Components
const SkeletonLeadCard = () => (
  <div className="backdrop-blur-sm transition-all duration-200 rounded-lg shadow-sm p-1.5 text-xs bg-white/5 border border-white/10 animate-pulse">
    <div className="flex items-start justify-between mb-1">
      <div className="h-3 bg-white/10 rounded w-3/4"></div>
      <div className="w-2.5 h-2.5 bg-white/10 rounded"></div>
    </div>
    
    <div className="space-y-0.5">
      {/* Phone */}
      <div className="flex items-center gap-1">
        <div className="w-2.5 h-2.5 bg-white/10 rounded"></div>
        <div className="h-2 bg-white/10 rounded w-1/2"></div>
      </div>
      
      {/* Model of interest */}
      <div className="flex items-center gap-1">
        <div className="w-2.5 h-2.5 bg-white/10 rounded"></div>
        <div className="h-2 bg-white/10 rounded w-2/3"></div>
      </div>
      
      {/* Budget */}
      <div className="flex items-center gap-1">
        <div className="w-2.5 h-2.5 bg-white/10 rounded"></div>
        <div className="h-2 bg-white/10 rounded w-1/3"></div>
      </div>
      
      {/* Appointment */}
      <div className="flex items-center gap-1">
        <div className="w-2.5 h-2.5 bg-white/10 rounded"></div>
        <div className="h-2 bg-white/10 rounded w-1/2"></div>
      </div>
      
      {/* Timeline */}
      <div className="h-2 bg-white/10 rounded w-1/4 mt-1"></div>
    </div>
  </div>
);

const SkeletonCRMColumn = ({ title, icon, canCreate = false }: { 
  title: string; 
  icon: React.ReactNode; 
  canCreate?: boolean;
}) => (
  <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-3 flex-1 min-w-0 flex flex-col">
    <div className="mb-3 px-1 flex items-center justify-between relative sticky top-0 z-10 bg-black/50 backdrop-blur-sm pb-2 pt-1">
      <div className="flex items-center gap-2">
        {icon}
        <h3 className="text-xs font-medium text-white whitespace-nowrap">
          {title}
        </h3>
        {canCreate ? (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-white/10 text-white/70 text-[10px] font-medium animate-pulse">
            --
          </span>
        ) : (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-white/10 text-white/70 text-[10px] font-medium animate-pulse">
            --
          </span>
        )}
      </div>
      
      {title === 'LOST' && (
        <div className="h-6 w-20 bg-white/10 rounded animate-pulse"></div>
      )}
    </div>
    
    <div className="flex-1 overflow-y-auto space-y-2">
      {Array.from({ length: 3 }).map((_, i) => (
        <SkeletonLeadCard key={i} />
      ))}
    </div>
  </div>
);
import NewAppointmentModal from "../modals/NewAppointmentModal";
import LeadDetailsModal from "../modals/LeadDetailsModal";
import LostReasonModal from "../modals/LostReasonModal";
import VehicleDocumentModal from "../modals/VehicleDocumentModal";
import { useSearchStore } from "@/lib/searchStore";
import { useModulePermissions } from "@/lib/useModulePermissions";

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
  lost_reason?: string; // Why the lead was lost
  lost_reason_notes?: string; // Additional context for lost reason
  lost_at?: string; // When the lead was marked as lost
  archived_at?: string; // When the lead was archived
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
  { 
    key: "archived", 
    title: "ARCHIVED", 
    icon: <Archive className="w-4 h-4" />
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
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [hovered, setHovered] = useState<ColKey | null>(null);
  const [convertingLead, setConvertingLead] = useState<Lead | null>(null);
  const [selectedInventoryCarId, setSelectedInventoryCarId] = useState<string>("");
  const [showLostReasonModal, setShowLostReasonModal] = useState(false);
  const [leadToLose, setLeadToLose] = useState<Lead | null>(null);
  const [isUpdatingLostLead, setIsUpdatingLostLead] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  
  // Column-by-column optimistic loading states
  const [columnLoading, setColumnLoading] = useState<Record<ColKey, boolean>>({
    new_lead: true,
    new_customer: true,
    negotiation: true,
    won: true,
    delivered: true,
    lost: true,
    archived: true
  });
  const [columnData, setColumnData] = useState<Record<ColKey, Lead[]>>({
    new_lead: [],
    new_customer: [],
    negotiation: [],
    won: [],
    delivered: [],
    lost: [],
    archived: []
  });
  const hasFetchedLeads = useRef(false);

  // Get permissions and role
  const { canEdit } = useModulePermissions('uv_crm');
  const { isAdmin } = useUserRole();
  
  // Vehicle Document Modal states
  const [showVehicleDocumentModal, setShowVehicleDocumentModal] = useState(false);
  const [vehicleDocumentMode, setVehicleDocumentMode] = useState<'reservation' | 'invoice'>('reservation');
  const [leadForDocument, setLeadForDocument] = useState<Lead | null>(null);

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

  // Column-by-column optimistic loading
  useEffect(() => {
    if (!hasFetchedLeads.current) {
      
      // Define loading priority (left to right column order)
      const columnPriorities: { key: ColKey; delay: number; status: string[] }[] = [
        { key: 'new_lead', delay: 0, status: ['new_lead'] },           // NEW LEAD (leftmost)
        { key: 'new_customer', delay: 80, status: ['new_customer'] },  // NEW APPOINTMENT
        { key: 'negotiation', delay: 160, status: ['negotiation'] },   // NEGOTIATION
        { key: 'won', delay: 240, status: ['won'] },                   // RESERVED
        { key: 'delivered', delay: 320, status: ['delivered'] },       // DELIVERED
        { key: 'lost', delay: 400, status: ['lost'] },                 // LOST
        { key: 'archived', delay: 480, status: ['archived'] }          // ARCHIVED (rightmost)
      ];

      // Load each column progressively
      columnPriorities.forEach(({ key, delay, status }) => {
        setTimeout(async () => {
          try {
            let query = supabase
              .from('leads')
              .select('*')
              .in('status', status);

            // Keep consistent base sorting for all columns
            query = query.order('updated_at', { ascending: false });

            const { data } = await query;

            if (data) {
              let sortedData = data as Lead[];

              // Apply specific sorting for new_customer column (appointments) in JavaScript
              if (key === 'new_customer') {
                sortedData = [...data].sort((a, b) => {
                  // Both have appointment dates - sort by date then time
                  if (a.appointment_date && b.appointment_date) {
                    const dateComparison = new Date(a.appointment_date).getTime() - new Date(b.appointment_date).getTime();
                    if (dateComparison !== 0) return dateComparison;
                    
                    // Same date, sort by time slot
                    if (a.time_slot && b.time_slot) {
                      return a.time_slot.localeCompare(b.time_slot);
                    }
                  }
                  
                  // Handle nulls: appointments with dates come first
                  if (a.appointment_date && !b.appointment_date) return -1;
                  if (!a.appointment_date && b.appointment_date) return 1;
                  
                  // Fallback sort: created_at (newest first) for records without appointments
                  return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                });
              }

              // Update column data
              setColumnData(prev => ({
                ...prev,
                [key]: sortedData
              }));

              
              // Also update main leads array for compatibility
              setLeads(prev => {
                const filteredPrev = prev.filter(lead => !status.includes(lead.status));
                return [...filteredPrev, ...sortedData];
              });
              
            }
          } catch (error) {
            console.error(`❌ Failed to load ${key} column:`, error);
          } finally {
            // Mark column as loaded
            setColumnLoading(prev => ({
              ...prev,
              [key]: false
            }));
          }
        }, delay);
      });

      hasFetchedLeads.current = true;
      setLoading(false);
    }

    // realtime subscription - update both leads and columnData
    const channel = supabase
      .channel("leads-stream")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "leads" },
        (payload: any) => {
          const sortColumnData = (leads: Lead[], columnKey: ColKey): Lead[] => {
            // Apply specific sorting for new_customer column (appointments)
            if (columnKey === 'new_customer') {
              return [...leads].sort((a, b) => {
                // Both have appointment dates - sort by date then time
                if (a.appointment_date && b.appointment_date) {
                  const dateComparison = new Date(a.appointment_date).getTime() - new Date(b.appointment_date).getTime();
                  if (dateComparison !== 0) return dateComparison;
                  
                  // Same date, sort by time slot
                  if (a.time_slot && b.time_slot) {
                    return a.time_slot.localeCompare(b.time_slot);
                  }
                }
                
                // Handle nulls: appointments with dates come first
                if (a.appointment_date && !b.appointment_date) return -1;
                if (!a.appointment_date && b.appointment_date) return 1;
                
                // Fallback sort: created_at (newest first) for records without appointments
                return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
              });
            }
            
            // Keep existing order for other columns
            return leads;
          };

          const updateColumnData = (lead: Lead, eventType: 'INSERT' | 'UPDATE' | 'DELETE') => {
            const normalizedStatus = (lead.status || "")
              .trim()
              .toLowerCase()
              .replace(/\s+/g, "_") as ColKey;

            setColumnData(prev => {
              const newColumnData = { ...prev };
              
              if (eventType === "INSERT") {
                if (newColumnData[normalizedStatus]) {
                  const updatedColumn = [lead, ...newColumnData[normalizedStatus]];
                  newColumnData[normalizedStatus] = sortColumnData(updatedColumn, normalizedStatus);
                }
              } else if (eventType === "UPDATE") {
                // Remove from all columns first
                Object.keys(newColumnData).forEach(key => {
                  newColumnData[key as ColKey] = newColumnData[key as ColKey].filter(l => l.id !== lead.id);
                });
                // Add to correct column
                if (newColumnData[normalizedStatus]) {
                  const updatedColumn = [lead, ...newColumnData[normalizedStatus]];
                  newColumnData[normalizedStatus] = sortColumnData(updatedColumn, normalizedStatus);
                }
              } else if (eventType === "DELETE") {
                Object.keys(newColumnData).forEach(key => {
                  newColumnData[key as ColKey] = newColumnData[key as ColKey].filter(l => l.id !== lead.id);
                });
              }
              
              return newColumnData;
            });
          };

          setLeads(prev => {
            let newLeads;
            if (payload.eventType === "INSERT") {
              const newLead = payload.new as Lead;
              updateColumnData(newLead, "INSERT");
              newLeads = [newLead, ...prev];
            } else if (payload.eventType === "UPDATE") {
              const updatedLead = payload.new as Lead;
              updateColumnData(updatedLead, "UPDATE");
              newLeads = prev.map(l => (l.id === updatedLead.id ? updatedLead : l));
            } else if (payload.eventType === "DELETE") {
              const deletedLead = payload.old as Lead;
              updateColumnData(deletedLead, "DELETE");
              newLeads = prev.filter(l => l.id !== deletedLead.id);
            } else {
              return prev;
            }
            
            // Always maintain updated_at DESC sorting to prevent glitching
            return newLeads.sort((a, b) => 
              dayjs(b.updated_at).valueOf() - dayjs(a.updated_at).valueOf()
            );
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Use columnData for progressive loading, apply search filter
  const grouped: Record<ColKey, Lead[]> = {
    new_lead: [],
    new_customer: [],
    negotiation: [],
    won: [],
    delivered: [],
    lost: [],
    archived: [],
  } as const;

  // Apply search filtering to each column's data
  (Object.keys(columnData) as ColKey[]).forEach(key => {
    const columnLeads = columnData[key] || [];
    const filteredLeads = columnLeads.filter(l =>
      match(l.full_name) ||
      match(l.phone_number) ||
      match(l.model_of_interest)
    );
    
    // For new_customer column, preserve the sorted order from columnData (appointment sorting)
    // For other columns, sort by updated_at newest first (stacking on top)
    if (key === 'new_customer') {
      grouped[key] = filteredLeads; // Keep the appointment-sorted order from columnData
    } else {
      grouped[key] = filteredLeads.sort((a, b) => 
        dayjs(b.updated_at).valueOf() - dayjs(a.updated_at).valueOf()
      );
    }
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
    
    // Special case: moving to lost - require reason
    if (targetCol === 'lost') {
      setLeadToLose(leadToMove);
      setShowLostReasonModal(true);
      return; // Don't update database yet, wait for lost reason modal
    }
    
    // Special case: moving to reserved (won) - check if reservation exists
    if (targetCol === 'won') {
      // Check if reservation already exists
      const { data: existingReservation } = await supabase
        .from('vehicle_reservations')
        .select('id')
        .eq('lead_id', leadToMove.id)
        .eq('document_type', 'reservation')
        .maybeSingle();
      
      if (existingReservation) {
        // Reservation exists - just move the card
        const { error } = await supabase.from("leads").update({ 
          status: 'won',
          updated_at: new Date().toISOString()
        }).eq("id", leadToMove.id);
        
        if (error) {
          console.error("Failed to update lead status:", error);
        }
        return;
      }
      
      // No reservation - show modal to generate it
      setLeadForDocument(leadToMove);
      setVehicleDocumentMode('reservation');
      setShowVehicleDocumentModal(true);
      return;
    }
    
    // Special case: moving to delivered - check if invoice exists
    if (targetCol === 'delivered') {
      // Check if invoice already exists
      const { data: existingInvoice } = await supabase
        .from('vehicle_reservations')
        .select('id')
        .eq('lead_id', leadToMove.id)
        .eq('document_type', 'invoice')
        .maybeSingle();
      
      if (existingInvoice) {
        // Invoice exists - just move the card
        const { error } = await supabase.from("leads").update({ 
          status: 'delivered',
          updated_at: new Date().toISOString()
        }).eq("id", leadToMove.id);
        
        if (error) {
          console.error("Failed to update lead status:", error);
        }
        return;
      }
      
      // No invoice - show modal to generate it
      setLeadForDocument(leadToMove);
      setVehicleDocumentMode('invoice');
      setShowVehicleDocumentModal(true);
      return;
    }
    
    // Special case: moving to archived - add archived timestamp
    if (targetCol === 'archived') {
      const { error } = await supabase.from("leads").update({ 
        status: targetCol,
        archived_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }).eq("id", id);
      
      if (error) {
        console.error("Failed to archive lead:", error);
      }
      return;
    }
    
    // Normal drag and drop - update database and let realtime subscription handle UI update
    const { error } = await supabase.from("leads").update({ 
      status: targetCol,
      updated_at: new Date().toISOString() // Ensure updated_at is refreshed for proper sorting
    }).eq("id", id);
    
    if (error) {
      console.error("Failed to update lead status:", error);
    }
  };

  const onDragOver = (e: React.DragEvent) => e.preventDefault();

  const handleCardClick = async (lead: Lead, e: React.MouseEvent) => {
    // Don't open modal if we're dragging
    if (isDragging) return;
    
    // Small delay to distinguish between drag and click
    setTimeout(async () => {
      if (!isDragging) {
        // Check if lead is in won/delivered status and has a reservation document
        console.log('Lead clicked:', lead.id, 'status:', lead.status);
        if (lead.status === 'won' || lead.status === 'delivered') {
          console.log('Checking for existing reservation for lead:', lead.id);
          // Check for existing reservation
          const { data: existingReservation, error } = await supabase
            .from('vehicle_reservations')
            .select('*')
            .eq('lead_id', lead.id)
            .single();
            
          console.log('Existing reservation:', existingReservation, 'error:', error);
          
          // Always open vehicle document modal for won/delivered leads
          console.log('Opening vehicle document modal');
          setLeadForDocument(lead);
          setVehicleDocumentMode(lead.status === 'won' ? 'reservation' : 'invoice');
          setShowVehicleDocumentModal(true);
          return;
        }
        
        // Default behavior - open lead details modal
        setSelectedLead(lead);
      }
    }, 10);
  };

  const handleLeadUpdated = (updatedLead: Lead) => {
    setLeads(prev => {
      const updated = prev.map(l => l.id === updatedLead.id ? updatedLead : l);
      // Maintain sorting after update
      return updated.sort((a, b) => 
        dayjs(b.updated_at).valueOf() - dayjs(a.updated_at).valueOf()
      );
    });
    setSelectedLead(updatedLead); // Keep modal open with fresh data (like mobile version)
  };

  const handleLeadDeleted = (leadId: string) => {
    setLeads(prev => prev.filter(l => l.id !== leadId));
    setSelectedLead(null);
  };

  const handleConversionCompleted = (updatedLead: Lead) => {
    setLeads(prev => {
      const updated = prev.map(l => l.id === updatedLead.id ? updatedLead : l);
      // Maintain sorting after update
      return updated.sort((a, b) => 
        dayjs(b.updated_at).valueOf() - dayjs(a.updated_at).valueOf()
      );
    });
    setConvertingLead(null);
  };

  const handleConversionCancelled = () => {
    setConvertingLead(null);
  };

  const handleLostReasonConfirm = async (reason: string, notes?: string) => {
    if (!leadToLose) return;
    
    setIsUpdatingLostLead(true);
    
    try {
      const { error } = await supabase.from("leads").update({
        status: 'lost',
        lost_reason: reason,
        lost_reason_notes: notes || null,
        lost_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }).eq("id", leadToLose.id);
      
      if (error) {
        console.error("Failed to update lead with lost reason:", error);
      }
      
      // Close modal and reset state
      setShowLostReasonModal(false);
      setLeadToLose(null);
    } catch (error) {
      console.error("Error updating lost lead:", error);
    } finally {
      setIsUpdatingLostLead(false);
    }
  };

  const handleLostReasonCancel = () => {
    setShowLostReasonModal(false);
    setLeadToLose(null);
  };

  const handleVehicleDocumentSubmit = async () => {
    if (!leadForDocument) return;
    
    // For invoice mode, verify invoice was actually created before updating status
    if (vehicleDocumentMode === 'invoice') {
      try {
        // Check if invoice actually exists
        const { data: invoiceCheck, error: checkErr } = await supabase
          .from('vehicle_reservations')
          .select('id, document_number, pdf_url')
          .eq('lead_id', leadForDocument.id)
          .eq('document_type', 'invoice')
          .maybeSingle();
        
        if (checkErr) {
          console.error('Failed to verify invoice creation:', checkErr);
          alert('Error verifying invoice. Status not updated.');
          return;
        }
        
        const hasValidInvoice = invoiceCheck && (invoiceCheck.document_number || invoiceCheck.pdf_url);
        if (!hasValidInvoice) {
          alert('Invoice must be generated before moving to DELIVERED. Please complete the invoice first.');
          return;
        }
      } catch (error) {
        console.error('Invoice verification failed:', error);
        alert('Cannot verify invoice creation. Status not updated.');
        return;
      }
    }
    
    // Only update status if invoice is confirmed (for delivered) or for reservations
    const newStatus = vehicleDocumentMode === 'reservation' ? 'won' : 'delivered';
    const { error } = await supabase.from("leads").update({ 
      status: newStatus,
      updated_at: new Date().toISOString()
    }).eq("id", leadForDocument.id);
    
    if (error) {
      console.error("Failed to update lead status:", error);
      alert('Failed to update lead status.');
    }
    
    // Keep modal open - user will close manually when ready
    // Modal stays open to allow DocuSign workflow or further actions
  };

  const handleVehicleDocumentCancel = () => {
    // If user cancels invoice generation, revert lead back to previous status
    if (vehicleDocumentMode === 'invoice' && leadForDocument) {
      // Revert to 'won' status (previous step before delivered)
      supabase.from("leads").update({ 
        status: 'won',
        updated_at: new Date().toISOString()
      }).eq("id", leadForDocument.id).then(({ error }) => {
        if (error) {
          console.error("Failed to revert lead status:", error);
        } else {
          console.log("Lead reverted to WON status due to cancelled invoice");
        }
      });
    }
    
    setShowVehicleDocumentModal(false);
    setLeadForDocument(null);
  };

  // Archive lead function
  const handleArchiveLead = async (leadId: string) => {
    try {
      const { error } = await supabase.from("leads").update({
        status: 'archived',
        archived_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }).eq("id", leadId);
      
      if (error) {
        console.error("❌ Failed to archive lead:", error);
      } else {
        console.log("✅ Lead archived successfully:", leadId);
      }
    } catch (error) {
      console.error("❌ Error archiving lead:", error);
    }
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

  // Remove individual loading state - RouteProtector handles skeleton loading
  // if (loading) { ... }

  return (
    <div className="px-4">
      <div
        className="flex gap-3 pb-4 w-full h-full overflow-hidden"
        style={{ height: "calc(100vh - 72px)" }}
      >
        {columns
          .filter(col => showArchived || col.key !== 'archived')
          .map(col => (
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
                  {columnLoading[col.key as ColKey] ? '--' : grouped[col.key as ColKey].length}
                </span>
            )}
            </div>
            
            {/* Archive Toggle Button - Only show on LOST column */}
            {col.key === 'lost' && (
              <button
                onClick={() => setShowArchived(!showArchived)}
                className={`
                  inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[8px] font-medium transition-all duration-200
                  ${showArchived 
                    ? 'bg-gray-600 text-white shadow-lg' 
                    : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white'
                  }
                  backdrop-blur-sm border border-white/20 hover:border-white/30
                `}
                title={showArchived ? 'Hide archived leads' : 'Show archived leads'}
              >
                <Archive className="w-2.5 h-2.5" />
                {showArchived ? 'Hide' : 'Show'} Archive
              </button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar">
            {columnLoading[col.key as ColKey] ? (
              // Show skeleton while column is loading
              <div className="space-y-2">
                {Array.from({ length: col.key === 'new_lead' ? 2 : 1 }).map((_, i) => (
                  <div key={i} className="backdrop-blur-sm transition-all duration-200 rounded-lg shadow-sm p-1.5 text-xs bg-white/5 border border-white/10 animate-pulse">
                    <div className="flex items-start justify-between mb-1">
                      <div className="h-3 bg-white/10 rounded w-3/4"></div>
                      <div className="w-2.5 h-2.5 bg-white/10 rounded"></div>
                    </div>
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1">
                        <div className="w-2.5 h-2.5 bg-white/10 rounded"></div>
                        <div className="h-2 bg-white/10 rounded w-1/2"></div>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-2.5 h-2.5 bg-white/10 rounded"></div>
                        <div className="h-2 bg-white/10 rounded w-2/3"></div>
                      </div>
                      <div className="h-2 bg-white/10 rounded w-1/4 mt-1"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              // Show real data when loaded
              grouped[col.key as ColKey].map(l => (
              <div
                key={`${l.id}-${col.key}`}
                draggable
                onDragStart={onDragStart(l)}
                onDragEnd={onDragEnd}
                onClick={(e) => handleCardClick(l, e)}
                className={`animate-fadeIn ${(()=>{
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
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {/* Archive Button - For delivered and lost leads */}
                    {(l.status === 'delivered' || l.status === 'lost') && canEdit && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation(); // Prevent card click
                          handleArchiveLead(l.id);
                        }}
                        className="
                          p-0.5 rounded-full transition-all duration-200 
                          bg-black/50 backdrop-blur-sm text-white/70 hover:text-white hover:bg-gray-700/70
                          hover:shadow-lg hover:scale-110
                          focus:outline-none focus:ring-2 focus:ring-gray-400/50
                        "
                        title="Archive lead"
                      >
                        <Archive className="w-2.5 h-2.5" />
                      </button>
                    )}
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
              ))
            )}
            {!columnLoading[col.key as ColKey] && grouped[col.key as ColKey].length === 0 && (
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
      
      {showLostReasonModal && leadToLose && (
        <LostReasonModal
          lead={leadToLose}
          onClose={handleLostReasonCancel}
          onConfirm={handleLostReasonConfirm}
          isLoading={isUpdatingLostLead}
        />
      )}
      
      {showVehicleDocumentModal && leadForDocument && (
        <VehicleDocumentModal
          isOpen={showVehicleDocumentModal}
          mode={vehicleDocumentMode}
          lead={leadForDocument}
          onClose={handleVehicleDocumentCancel}
          onSubmit={handleVehicleDocumentSubmit}
        />
      )}
    </div>
  );
} 