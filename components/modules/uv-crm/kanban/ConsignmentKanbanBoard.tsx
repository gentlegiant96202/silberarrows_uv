"use client";
import React, { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { MessageSquare, CheckCircle, Wrench, XCircle, Car, Plus, Archive } from "lucide-react";
import { useSearchStore } from "@/lib/searchStore";
import ConsignmentDetailsModal from "../modals/ConsignmentDetailsModal";
import AddConsignmentModal from "../modals/AddConsignmentModal";

dayjs.extend(relativeTime);

interface Consignment {
  id: string;
  status: string;
  phone_number: string;
  vehicle_model: string;
  asking_price: number;
  listing_url: string;
  notes?: string;
  archived: boolean;
  created_at: string;
  updated_at: string;
  // Negotiation fields
  vehicle_make?: string;
  vehicle_year?: number;
  mileage?: number;
  vin?: string;
  direct_purchase_price?: number;
  consignment_price?: number;
  negotiation_notes?: string;
  pdf_quotation_url?: string;
}

const columns = [
  { key: "new_lead", title: "NEW LEAD", icon: null },
  { key: "negotiation", title: "NEGOTIATION", icon: <MessageSquare className="w-4 h-4" /> },
  { key: "preinspection", title: "PRE-INSPECTION", icon: <Wrench className="w-4 h-4" /> },
  { key: "consigned", title: "CONSIGNED / PURCHASED", icon: <CheckCircle className="w-4 h-4" /> },
  { key: "lost", title: "LOST", icon: <XCircle className="w-4 h-4" /> },
  { 
    key: "archived", 
    title: "ARCHIVED", 
    icon: <Archive className="w-4 h-4" />
  },
] as const;

type ColKey = (typeof columns)[number]["key"];


export default function ConsignmentKanbanBoard() {
  const [items, setItems] = useState<Consignment[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [hovered, setHovered] = useState<ColKey | null>(null);
  const [selectedConsignment, setSelectedConsignment] = useState<Consignment | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  // Load consignments function (moved outside useEffect for scope access)
  const loadConsignments = useCallback(async () => {
    const { data, error } = await supabase
        .from("consignments")
        .select("*")
        .order("created_at", { ascending: false });
    
    if (error) {
      console.error("Error loading consignments:", error);
    } else {
      setItems(data as unknown as Consignment[]);
      console.log("Loaded consignments:", data?.length || 0);
    }
  }, []);



  // Load consignments from Supabase and set up real-time subscription
  useEffect(() => {
    loadConsignments();

    // Try a different approach - use a unique channel name and listen to all events
    const channelName = `consignments-${Date.now()}`;
    console.log("🔍 Using unique channel name:", channelName);

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        { 
          event: "*", 
          schema: "public", 
          table: "consignments"
        },
        (payload: any) => {
          console.log("🔔 Real-time event received:", payload);
          console.log("🔔 Event type:", payload.eventType);
          console.log("🔔 New data:", payload.new);
          console.log("🔔 Old data:", payload.old);
          
          setItems((prev) => {
            if (payload.eventType === "INSERT") {
              console.log("➕ Adding new consignment to state:", payload.new);
              return [payload.new as Consignment, ...prev];
            } else if (payload.eventType === "UPDATE") {
              console.log("✏️ Updating consignment in state:", payload.new);
              return prev.map((c) => (c.id === payload.new.id ? (payload.new as Consignment) : c));
            } else if (payload.eventType === "DELETE") {
              console.log("🗑️ Deleting consignment from state:", payload.old);
              return prev.filter((c) => c.id !== payload.old.id);
            }
            return prev;
          });
        }
      );

    channel.subscribe((status, err) => {
      console.log("Real-time subscription status:", status);
      if (err) {
        console.error("Real-time subscription error:", err);
      }
      if (status === 'SUBSCRIBED') {
        console.log("✅ Real-time subscription active for consignments");
        console.log("🔍 Channel details:", channel);
      } else if (status === 'CHANNEL_ERROR') {
        console.error("❌ Real-time subscription error");
        console.error("Error details:", err);
      } else if (status === 'TIMED_OUT') {
        console.error("❌ Real-time subscription timed out");
        console.error("This usually means the connection was idle too long");
      } else if (status === 'CLOSED') {
        // Only log as warning in development, not error
        if (process.env.NODE_ENV === 'development') {
          console.warn("⚠️ Real-time subscription closed (normal in React Strict Mode)");
        } else {
          console.error("❌ Real-time subscription closed");
          console.error("This can happen due to:");
          console.error("- Network connectivity issues");
          console.error("- Supabase service restart");
          console.error("- Authentication token expiration");
          console.error("- Browser tab becoming inactive");
          
          // Attempt to reconnect after a delay
          setTimeout(() => {
            console.log("🔄 Attempting to reconnect real-time subscription...");
    channel.subscribe();
          }, 5000);
        }
      }
    });

    // Additional debugging - check if we can receive any real-time events
    console.log("🔍 Setting up real-time listener for consignments table");
    console.log("🔍 Channel name:", channelName);
    console.log("🔍 Table: consignments, Schema: public");
    
    // Test if we can receive ANY real-time events by listening to a different table
    const testChannel = supabase
      .channel(`test-channel-${Date.now()}`)
      .on(
        "postgres_changes",
        { 
          event: "*", 
          schema: "public", 
          table: "leads" // Test with leads table instead
        },
        (payload: any) => {
          console.log("🧪 TEST: Real-time event from leads table:", payload);
        }
      );
    
    testChannel.subscribe((status, err) => {
      console.log("🧪 TEST: Leads channel status:", status);
      if (err) {
        console.error("🧪 TEST: Leads channel error:", err);
      }
      if (status === 'CLOSED') {
        console.log("🧪 TEST: Leads channel closed - this is normal for test channel");
      }
    });

    return () => {
      console.log("Cleaning up real-time subscription");
      supabase.removeChannel(channel);
      supabase.removeChannel(testChannel);
    };
  }, []);


  // Drag-n-drop handlers
  const onDragStart = (item: Consignment) => (e: React.DragEvent) => {
    setIsDragging(true);
    e.dataTransfer.setData("text/plain", item.id);
  };
  
  const onDragEnd = () => setIsDragging(false);
  
  const onDrop = (target: ColKey) => (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    setHovered(null);
    const id = e.dataTransfer.getData("text/plain");
    if (!id) return;
    
    setItems((prev) => {
      const idx = prev.findIndex((i) => i.id === id);
      if (idx === -1) return prev;
      const moved = { 
        ...prev[idx], 
        status: target === 'archived' ? prev[idx].status : target,
        archived: target === 'archived'
      } as Consignment;
      return [moved, ...prev.filter((i) => i.id !== id)];
    });
    
    // Special case: moving to archived - set archived flag
    if (target === 'archived') {
      supabase.from("consignments").update({ 
        archived: true,
        updated_at: new Date().toISOString()
      }).eq("id", id).then(
        (result) => {
          if (result.error) {
            console.error('Error archiving consignment:', result.error);
          }
        }
      );
      return;
    }
    
    // Normal drag and drop - update database asynchronously without awaiting
    supabase.from("consignments").update({ status: target }).eq("id", id).then(
      (result) => {
        if (result.error) {
          console.error('Error updating consignment status:', result.error);
        }
      }
    );
  };

  // Archive/unarchive consignment
  const toggleArchive = async (consignment: Consignment) => {
    try {
      const { error } = await supabase
        .from("consignments")
        .update({ 
          archived: !consignment.archived,
          updated_at: new Date().toISOString()
        })
        .eq("id", consignment.id);
      
      if (error) {
        console.error('Error toggling archive status:', error);
      } else {
        setItems(prev => 
          prev.map(c => 
            c.id === consignment.id 
              ? { ...c, archived: !c.archived }
              : c
          )
        );
      }
    } catch (error) {
      console.error('Error toggling archive status:', error);
    }
  };
  
  const onDragOver = (e: React.DragEvent) => e.preventDefault();

  // Card click handler
  const handleCardClick = (consignment: Consignment, e: React.MouseEvent) => {
    // Don't open modal if we're dragging
    if (isDragging) return;
    
    // Small delay to distinguish between drag and click
    setTimeout(() => {
      if (!isDragging) {
        setSelectedConsignment(consignment);
      }
    }, 10);
  };


  // Modal handlers
  const handleConsignmentUpdated = (updatedConsignment: Consignment) => {
    setItems(prev => prev.map(c => c.id === updatedConsignment.id ? updatedConsignment : c));
    setSelectedConsignment(null);
  };

  // Update consignment data without closing modal (for PDF generation, etc.)
  const handleConsignmentDataUpdated = (updatedConsignment: Consignment) => {
    setItems(prev => prev.map(c => c.id === updatedConsignment.id ? updatedConsignment : c));
    setSelectedConsignment(updatedConsignment); // Keep modal open with updated data
  };

  const handleConsignmentDeleted = (consignmentId: string) => {
    setItems(prev => prev.filter(c => c.id !== consignmentId));
    setSelectedConsignment(null);
  };

  // Add new consignment
  const handleAddConsignment = async (consignmentData: Omit<Consignment, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error } = await supabase
        .from('consignments')
        .insert([{
          status: consignmentData.status || 'new_lead',
          phone_number: consignmentData.phone_number,
          vehicle_model: consignmentData.vehicle_model,
          asking_price: consignmentData.asking_price,
          listing_url: consignmentData.listing_url,
          notes: consignmentData.notes || '',
          archived: false
        }])
        .select()
        .single();

      if (error) {
        console.error('Error adding consignment:', error);
        alert('Error adding consignment: ' + error.message);
        return;
      }

      // Add to local state
      setItems(prev => [data as Consignment, ...prev]);
      setShowAddModal(false);
    } catch (error) {
      console.error('Error adding consignment:', error);
      alert('Error adding consignment. Please try again.');
    }
  };

  // Search filter & highlight
  const { query } = useSearchStore();
  const upperQuery = query.toUpperCase();
  const match = (text?: string) => (query ? String(text || "").toUpperCase().includes(upperQuery) : true);
  
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

  // Filter according to search query
  const visible = items.filter(i =>
    match(i.phone_number) || match(i.vehicle_model) || match(i.listing_url)
  );

  // Group by column
  const grouped: Record<ColKey, Consignment[]> = {
    new_lead: [],
    negotiation: [],
    preinspection: [],
    consigned: [],
    lost: [],
    archived: [],
  };

  visible.forEach((i) => {
    // If item is archived, put it in archived column
    if (i.archived) {
      grouped.archived.push(i);
      return;
    }
    
    const key = (i.status || "").trim().toLowerCase().replace(/\s+/g, "_") as ColKey;
    if (grouped[key]) grouped[key].push(i);
    else grouped.new_lead.push(i);
  });




  return (
    <div className="px-4" style={{ height: "calc(100vh - 72px)" }}>
      <div className="flex gap-3 pb-4 w-full h-full overflow-x-auto custom-scrollbar">
        {columns
          .filter(col => showArchived || col.key !== 'archived')
          .map((col) => (
          <div
            key={col.key}
            className={`bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-3 flex-1 min-w-0 flex flex-col transition-shadow ${hovered === col.key ? "ring-2 ring-gray-300/60" : ""}`}
            onDragOver={(e) => {
              onDragOver(e);
              setHovered(col.key as ColKey);
            }}
            onDrop={onDrop(col.key as ColKey)}
            onDragEnter={() => setHovered(col.key as ColKey)}
            onDragLeave={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node)) setHovered(null);
            }}
          >
            <div className="mb-3 px-1 flex flex-col relative sticky top-0 z-10 bg-black/50 backdrop-blur-sm pb-2 pt-1">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {col.icon}
                  <h3 className="text-xs font-medium text-white whitespace-nowrap">{col.title}</h3>
                  {col.key === 'new_lead' ? (
                      <button
                      onClick={() => setShowAddModal(true)}
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold transition-colors shadow-sm bg-gradient-to-br from-gray-200 via-gray-400 to-gray-200 text-black hover:brightness-110"
                      title="Add new consignment"
                    >
                      {grouped[col.key as ColKey].length}
                      <span className="ml-1 text-[12px] leading-none">＋</span>
                      </button>
                  ) : col.key === 'lost' ? (
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-white/10 text-white/70 text-[10px] font-medium">
                        {grouped[col.key as ColKey].length}
                      </span>
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
                        title={showArchived ? 'Hide archived consignments' : 'Show archived consignments'}
                      >
                        <Archive className="w-2.5 h-2.5" />
                        {showArchived ? 'Hide' : 'Show'} Archive
                      </button>
                    </div>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-white/10 text-white/70 text-[10px] font-medium">
                      {grouped[col.key as ColKey].length}
                    </span>
                  )}
                </div>
              </div>
              
            </div>
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {grouped[col.key as ColKey].map((c) => (
                <div
                  key={c.id}
                  draggable
                  onDragStart={onDragStart(c)}
                  onDragEnd={onDragEnd}
                  onClick={(e) => handleCardClick(c, e)}
                  className="backdrop-blur-sm transition-all duration-200 rounded-lg shadow-sm p-1.5 text-xs select-none cursor-pointer bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 group h-24 flex flex-col"
                >
        <div className="flex items-start justify-between mb-1 flex-shrink-0">
          <div className="text-xs font-medium text-white truncate max-w-[120px]">
                      {highlight(c.phone_number)}
                    </div>
          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                      <svg className="w-2.5 h-2.5 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                  <div className="text-xs text-white/70 flex items-center gap-1 flex-1 min-h-0">
                    <Car className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate">{highlight(c.vehicle_model)}</span>
                  </div>
                  <div className="text-xs text-white/70 flex items-center gap-1 flex-shrink-0">
                    AED {c.asking_price?.toLocaleString() || "-"}
                  </div>
                  <div className="text-[9px] text-blue-400 underline truncate max-w-[140px] flex-shrink-0">
                    <a href={c.listing_url} target="_blank" rel="noopener noreferrer">Listing</a>
                  </div>
                  <div className="text-[10px] text-white/50 mt-0.5 flex-shrink-0">
                    {dayjs(c.updated_at || c.created_at).fromNow()}
                  </div>
                </div>
              ))}
              {grouped[col.key as ColKey].length === 0 && col.key !== 'new_lead' && (
                <div className="text-center text-xs text-white/50 py-4">No consignments</div>
              )}
            </div>
          </div>
        ))}
      </div>
      
      {/* Consignment Details Modal */}
      {selectedConsignment && (
        <ConsignmentDetailsModal
          consignment={selectedConsignment}
          onClose={() => setSelectedConsignment(null)}
          onUpdated={handleConsignmentUpdated}
          onDataUpdated={handleConsignmentDataUpdated}
          onDeleted={handleConsignmentDeleted}
        />
      )}

      {/* Add Consignment Modal */}
      {showAddModal && (
        <AddConsignmentModal
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddConsignment}
        />
      )}

    </div>
  );
} 