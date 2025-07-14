"use client";
import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { MessageSquare, CheckCircle, Wrench, XCircle, Car } from "lucide-react";
import { useSearchStore } from "@/lib/searchStore";
import ConsignmentDetailsModal from "./ConsignmentDetailsModal";

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

interface ScrapeJob {
  id: string;
  status: 'queued' | 'running' | 'finished' | 'error';
  total: number;
  processed: number;
  successful_leads?: number;
  search_url?: string;
  max_listings?: number;
  started_at?: string;
  log?: string;
}

export default function ConsignmentKanbanBoard() {
  const [items, setItems] = useState<Consignment[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [hovered, setHovered] = useState<ColKey | null>(null);
  const [currentJob, setCurrentJob] = useState<ScrapeJob | null>(null);
  const [isScrapingActive, setIsScrapingActive] = useState(false);
  const [selectedConsignment, setSelectedConsignment] = useState<Consignment | null>(null);
  const isProd = process.env.NODE_ENV === 'production';

  // CRITICAL FIX: Restore state from localStorage on mount instead of clearing it
  useEffect(() => {
    // Restore scraping state from localStorage
    const savedIsActive = localStorage.getItem('isScrapingActive') === 'true';
    const savedJob = localStorage.getItem('currentScrapeJob');
    
    console.log('🔄 Checking localStorage on mount:', { savedIsActive, savedJob: savedJob ? 'exists' : 'none' });
    
    if (savedIsActive && savedJob) {
      try {
        const job = JSON.parse(savedJob);
        setCurrentJob(job);
        setIsScrapingActive(true);
        console.log('🔄 Restored scraping state from localStorage:', job);
        console.log('🔄 Set isScrapingActive to:', true);
      } catch (err) {
        console.error('❌ Failed to restore scraping state:', err);
        localStorage.removeItem('currentScrapeJob');
        localStorage.removeItem('isScrapingActive');
      }
    } else {
      console.log('🔄 No saved scraping state found');
    }

    // CRITICAL: Add browser-level keep-alive to prevent tab throttling
    let keepAliveInterval: NodeJS.Timeout;
    
    const startKeepAlive = () => {
      if (keepAliveInterval) clearInterval(keepAliveInterval);
      
      keepAliveInterval = setInterval(() => {
        // Simulate minimal activity to prevent tab throttling
        const event = new Event('mousemove', { bubbles: false });
        document.dispatchEvent(event);
        
        // Keep a timestamp in localStorage to verify polling continues
        localStorage.setItem('lastKeepAlive', Date.now().toString());
      }, 5000); // Every 5 seconds
    };

    startKeepAlive();

    // Restart keep-alive when tab becomes visible
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('🔄 Tab visible - restarting keep-alive');
        startKeepAlive();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (keepAliveInterval) clearInterval(keepAliveInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Load consignments from Supabase
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("consignments")
        .select("*")
        .order("created_at", { ascending: false });
      if (data) setItems(data as unknown as Consignment[]);
    };
    
    load();

    const channel = supabase
      .channel("consignments-stream")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "consignments" },
        (payload: any) => {
          setItems((prev) => {
            if (payload.eventType === "INSERT") return [payload.new as Consignment, ...prev];
            if (payload.eventType === "UPDATE") return prev.map((c) => (c.id === payload.new.id ? (payload.new as Consignment) : c));
            if (payload.eventType === "DELETE") return prev.filter((c) => c.id !== payload.old.id);
            return prev;
          });
        }
      );

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Save state to localStorage whenever it changes
  useEffect(() => {
    if (isScrapingActive && currentJob) {
      localStorage.setItem('currentScrapeJob', JSON.stringify(currentJob));
      localStorage.setItem('isScrapingActive', 'true');
    } else if (!isScrapingActive) {
      localStorage.removeItem('currentScrapeJob');
      localStorage.removeItem('isScrapingActive');
    }
  }, [isScrapingActive, currentJob]);

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

  // ENHANCED: Poll job status with better error handling and persistence
  useEffect(() => {
    if (!isScrapingActive || !currentJob) {
      console.log('🔄 Polling stopped - isScrapingActive:', isScrapingActive, 'currentJob:', currentJob?.id);
      return;
    }

    console.log('🔄 Starting polling for job:', currentJob.id);

    const pollJob = async () => {
      try {
        const res = await fetch(`/api/consignments/scrape?id=${currentJob.id}`);
        if (res.ok) {
          const job = await res.json();
          console.log('📊 Frontend received job update:', job);
          setCurrentJob(job);
          
          // Always save updated job to localStorage
          localStorage.setItem('currentScrapeJob', JSON.stringify(job));
          localStorage.setItem('isScrapingActive', 'true');
          
          // Refresh consignments to show new leads
          const { data } = await supabase
            .from("consignments")
            .select("*")
            .order("created_at", { ascending: false });
          if (data) setItems(data as unknown as Consignment[]);
          
          // Stop polling only if job is truly finished
          if (job.status === 'finished' || job.status === 'error') {
            console.log('🏁 Job completed with status:', job.status);
            setIsScrapingActive(false);
            setCurrentJob(null);
            localStorage.removeItem('currentScrapeJob');
            localStorage.removeItem('isScrapingActive');
          }
        } else {
          console.error('❌ Failed to poll job status:', res.status);
        }
      } catch (err) {
        console.error('❌ Error polling job:', err);
      }
    };

    // Poll every 2 seconds
    const interval = setInterval(pollJob, 2000);
    
    // CRITICAL: Add visibility change listener to restore polling when tab becomes active
    const handleVisibilityChange = () => {
      if (!document.hidden && isScrapingActive && currentJob) {
        console.log('🔄 Tab became visible - checking job status immediately');
        pollJob(); // Poll immediately when tab becomes visible
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Cleanup function
    return () => {
      console.log('🔄 Stopping polling for job:', currentJob.id);
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isScrapingActive, currentJob?.id]);

  const toggleScraping = async () => {
    if (isScrapingActive) {
      // Stop scraping
      console.log('🛑 Stopping scraper by user request');
      
      // Call DELETE endpoint to kill Python processes
      try {
        const res = await fetch('/api/consignments/scrape', {
          method: 'DELETE'
        });
        if (res.ok) {
          console.log('✅ Scraper stopped successfully');
        } else {
          console.log('⚠️ Error stopping scraper:', res.status);
        }
      } catch (error) {
        console.log('⚠️ Error calling stop endpoint:', error);
      }
      
      setIsScrapingActive(false);
      setCurrentJob(null);
      localStorage.removeItem('currentScrapeJob');
      localStorage.removeItem('isScrapingActive');
    } else {
      // Start scraping
      console.log('🚀 Starting scraper');
      const url = 'https://dubai.dubizzle.com/motors/used-cars/mercedes-benz/?seller_type=OW&regional_specs=824&regional_specs=827&fuel_type=380&fuel_type=383&kilometers__lte=100000&kilometers__gte=0&year__gte=2015&year__lte=2026';
      try {
        console.log('🔄 Making fetch request to /api/consignments/scrape');
        const res = await fetch('/api/consignments/scrape', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url, max: 20 })
        });
        console.log('🔄 Fetch response:', res.status, res.statusText);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        console.log('🔄 Fetch response JSON:', json);
        
        const newJob = { 
          id: json.jobId, 
          status: 'queued' as const, 
          total: 0, 
          processed: 0,
          max_listings: 20,
          successful_leads: 0,
          log: 'Starting scraper...'
        };
        
        console.log('🔄 Setting up new job:', newJob);
        setCurrentJob(newJob);
        setIsScrapingActive(true);
        
        // Immediately save to localStorage
        localStorage.setItem('currentScrapeJob', JSON.stringify(newJob));
        localStorage.setItem('isScrapingActive', 'true');
        
        console.log('✅ Scraper started with job ID:', json.jobId);
        console.log('✅ isScrapingActive set to:', true);
        
        // Force a re-render to ensure UI updates
        setTimeout(() => {
          console.log('🔄 Force checking state after timeout:', { isScrapingActive: true, jobId: json.jobId });
        }, 100);
        
      } catch (err: any) {
        console.error('❌ Failed to start scraper:', err);
        alert('Failed to start scrape: ' + err.message);
      }
    }
  };

  // Helper to render the enhanced progress bar with Python scraper details
  const renderProgressBar = () => {
    const job = currentJob;
    const leads = job?.successful_leads ?? 0;
    const processed = job?.processed ?? 0;
    const max = job?.max_listings ?? 20;
    const pct = Math.min(100, (leads / max) * 100);
    
    const status = isScrapingActive
      ? job?.status === "running"
        ? "Finding…"
        : job?.status === "queued"
        ? "Starting…"
        : job?.status === "finished"
        ? "Complete!"
        : job?.status === "error"
        ? "Error"
        : "Processing…"
      : "Idle";

    return (
      <div className="w-full">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-white/70">
            {leads} of {max} leads found
          </span>
          <span className="text-[10px] text-white/70">{status}</span>
        </div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-[9px] text-white/50">{processed} cars checked</span>
          <span className="text-[9px] text-white/50">
            {processed ? Math.round((leads / Math.max(processed, 1)) * 100) : 0}% success rate
          </span>
        </div>
        
        {/* Enhanced progress info for Python scraper */}
        {job?.log && (
          <div className="mb-1">
            <span className="text-[9px] text-white/40 truncate block">
              {job.log}
            </span>
          </div>
        )}
        
        {/* Show additional stats if available */}
        {job && job.processed > 0 && (
          <div className="flex items-center justify-between mb-1">
            <span className="text-[8px] text-white/30">
              {job.status === 'running' ? 'Processing...' : 
               job.status === 'finished' ? 'Completed' : 
               job.status === 'error' ? 'Error' : 'Status unknown'}
            </span>
            <span className="text-[8px] text-white/30">
              {job.successful_leads || 0} successful
            </span>
          </div>
        )}
        <div className="w-full h-2 bg-black/30 rounded-full overflow-hidden border border-white/20 shadow-inner">
          <div
            className="h-full bg-gradient-to-r from-gray-300 via-gray-100 to-gray-300 transition-all duration-500 ease-out relative rounded-full"
            style={{ width: `${pct}%` }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent animate-pulse rounded-full"></div>
            <div className="absolute inset-0 bg-gradient-to-b from-white/30 via-transparent to-black/20 rounded-full"></div>
            {isScrapingActive && job?.status === "running" && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent animate-ping rounded-full"></div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="px-4" style={{ height: "calc(100vh - 72px)" }}>
      <div className="flex gap-3 pb-4 w-full h-full overflow-x-auto scrollbar-hide">
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
                    !isProd ? (
                      <button
                        onClick={toggleScraping}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold transition shadow-sm ${
                          isScrapingActive 
                            ? 'bg-gradient-to-br from-red-400 via-red-500 to-red-600 text-white animate-pulse' 
                            : 'bg-gradient-to-br from-gray-200 via-gray-400 to-gray-200 text-black hover:brightness-110'
                        }`}
                        title={isScrapingActive ? "Stop finding leads" : "Find new leads"}
                        disabled={false}
                      >
                        {grouped.new_lead.length}
                        <span className="ml-1">{isScrapingActive ? 'STOP' : 'FIND LEADS'}</span>
                      </button>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-white/10 text-white/70 text-[10px] font-medium">
                        {grouped.new_lead.length}
                      </span>
                    )
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-white/10 text-white/70 text-[10px] font-medium">
                      {grouped[col.key as ColKey].length}
                    </span>
                  )}
                </div>
              </div>
              
              {/* Progress Bar - Only show in development environment */}
              {col.key === 'new_lead' && !isProd && renderProgressBar()}
              
              {/* Debug info - Only show in development */}
              {col.key === 'new_lead' && !isProd && (
                <div className="text-[8px] text-white/30 mt-1">
                  Debug: isScrapingActive={isScrapingActive.toString()}, jobId={currentJob?.id || 'none'}
                </div>
              )}
            </div>
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-hide">
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
              {grouped[col.key as ColKey].length === 0 && (
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
    </div>
  );
} 