"use client";
import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { MessageSquare, CheckCircle, Wrench, XCircle, Car, Plus } from "lucide-react";
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
  created_at: string;
  updated_at: string;
}

const columns = [
  { key: "new_lead", title: "NEW LEAD", icon: null },
  { key: "negotiation", title: "NEGOTIATION", icon: <MessageSquare className="w-4 h-4" /> },
  { key: "preinspection", title: "PRE-INSPECTION", icon: <Wrench className="w-4 h-4" /> },
  { key: "consigned", title: "CONSIGNED / PURCHASED", icon: <CheckCircle className="w-4 h-4" /> },
  { key: "lost", title: "LOST", icon: <XCircle className="w-4 h-4" /> },
] as const;

type ColKey = (typeof columns)[number]["key"];


export default function ConsignmentKanbanBoard() {
  const [items, setItems] = useState<Consignment[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [hovered, setHovered] = useState<ColKey | null>(null);
  const [selectedConsignment, setSelectedConsignment] = useState<Consignment | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // Test function to check if real-time is working
  const testRealtime = async () => {
    console.log("🧪 Testing real-time by creating a test consignment...");
    const timestamp = Date.now();
    const { data, error } = await supabase
      .from("consignments")
      .insert([{
        vehicle_model: "Test Real-time " + timestamp,
        asking_price: 100000,
        phone_number: `1234567${timestamp.toString().slice(-3)}`, // Unique phone number
        listing_url: `https://test-realtime-${timestamp}.com`, // Unique URL
        notes: "Real-time test",
        status: "new_lead"
      }])
      .select()
      .single();
    
    if (error) {
      console.error("Error creating test consignment:", error);
    } else {
      console.log("Test consignment created:", data);
    }
  };


  // Load consignments from Supabase and set up real-time subscription
  useEffect(() => {
    const loadConsignments = async () => {
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
    };

    loadConsignments();

    const channel = supabase
      .channel("consignments-realtime")
      .on(
        "postgres_changes",
        { 
          event: "*", 
          schema: "public", 
          table: "consignments",
          filter: "*"
        },
        (payload: any) => {
          console.log("🔔 Real-time consignment change received:", payload);
          console.log("🔔 Event type:", payload.eventType);
          console.log("🔔 New data:", payload.new);
          console.log("🔔 Old data:", payload.old);
          setItems((prev) => {
            if (payload.eventType === "INSERT") {
              console.log("➕ Adding new consignment:", payload.new);
              return [payload.new as Consignment, ...prev];
            }
            if (payload.eventType === "UPDATE") {
              console.log("✏️ Updating consignment:", payload.new);
              return prev.map((c) => (c.id === payload.new.id ? (payload.new as Consignment) : c));
            }
            if (payload.eventType === "DELETE") {
              console.log("🗑️ Deleting consignment:", payload.old);
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
      } else if (status === 'CHANNEL_ERROR') {
        console.error("❌ Real-time subscription error");
      } else if (status === 'TIMED_OUT') {
        console.error("❌ Real-time subscription timed out");
      } else if (status === 'CLOSED') {
        console.error("❌ Real-time subscription closed");
      }
    });

    return () => {
      console.log("Cleaning up real-time subscription");
      supabase.removeChannel(channel);
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
      const moved = { ...prev[idx], status: target } as Consignment;
      return [moved, ...prev.filter((i) => i.id !== id)];
    });
    
    // Update database asynchronously without awaiting
    supabase.from("consignments").update({ status: target }).eq("id", id).then(
      (result) => {
        if (result.error) {
          console.error('Error updating consignment status:', result.error);
        }
      }
    );
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
          notes: consignmentData.notes || ''
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
  };

  visible.forEach((i) => {
    const key = (i.status || "").trim().toLowerCase().replace(/\s+/g, "_") as ColKey;
    if (grouped[key]) grouped[key].push(i);
    else grouped.new_lead.push(i);
  });




  return (
    <div className="px-4" style={{ height: "calc(100vh - 72px)" }}>
      <div className="flex gap-3 pb-4 w-full h-full overflow-x-auto custom-scrollbar">
        {columns.map((col) => (
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
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setShowAddModal(true)}
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold transition-colors shadow-sm bg-gradient-to-br from-gray-200 via-gray-400 to-gray-200 text-black hover:brightness-110"
                        title="Add new consignment"
                      >
                        {grouped[col.key as ColKey].length}
                        <span className="ml-1 text-[12px] leading-none">＋</span>
                      </button>
                      <button
                        onClick={testRealtime}
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold transition-colors shadow-sm bg-blue-500 text-white hover:bg-blue-600"
                        title="Test real-time"
                      >
                        🧪
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
                  className="backdrop-blur-sm transition-all duration-200 rounded-lg shadow-sm p-1.5 text-xs select-none cursor-pointer bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 group"
                >
                  <div className="flex items-start justify-between mb-1">
                    <div className="text-xs font-medium text-white truncate max-w-[160px]">
                      {highlight(c.phone_number)}
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <svg className="w-2.5 h-2.5 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                  <div className="text-xs text-white/70 flex items-center gap-1">
                    <Car className="w-3 h-3" /> {highlight(c.vehicle_model)}
                  </div>
                  <div className="text-xs text-white/70 flex items-center gap-1">
                    AED {c.asking_price?.toLocaleString() || "-"}
                  </div>
                  <div className="text-[9px] text-blue-400 underline truncate max-w-[160px]">
                    <a href={c.listing_url} target="_blank" rel="noopener noreferrer">Listing</a>
                  </div>
                  <div className="text-[10px] text-white/50 mt-0.5">
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