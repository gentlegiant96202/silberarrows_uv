"use client";
import React, { useEffect, useState } from 'react';
import Header from '@/components/Header';
import DashboardFilterBar from '@/components/DashboardFilterBar';
import { supabase } from '@/lib/supabaseClient';
import { useDashboardFilter } from '@/lib/dashboardFilterStore';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import dayjs from 'dayjs';

// Enhanced LeadsFunnel component with conversion tracking
function LeadsFunnel() {
  const STAGES = [
    { key: 'new_customer', label: 'New Customer', color: 'bg-blue-500' },
    { key: 'negotiation', label: 'Negotiation', color: 'bg-yellow-500' },
    { key: 'won', label: 'Reserved', color: 'bg-green-500' },
    { key: 'delivered', label: 'Delivered', color: 'bg-purple-500' },
    { key: 'lost', label: 'Lost', color: 'bg-red-500' },
  ];

  const { year, months } = useDashboardFilter();
  const [funnelData, setFunnelData] = useState<any>(null);
  const [currentLeadCounts, setCurrentLeadCounts] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [animateAfterLoad, setAnimateAfterLoad] = useState(false);

  useEffect(() => {
    async function fetchConversionFunnel() {
      setLoading(true);
      setAnimateAfterLoad(false);
      
      try {
        // Calculate date range based on filters
        let from: Date;
        let to: Date;
        
        if (months.length > 0) {
          // When specific months are selected
          const firstMonth = Math.min(...months) - 1; // Convert to 0-based index
          const lastMonth = Math.max(...months) - 1;  // Convert to 0-based index
          
          from = new Date(year, firstMonth, 1); // First day of first selected month
          to = new Date(year, lastMonth + 1, 0); // Last day of last selected month
        } else {
          // When no months selected (show full year)
          from = new Date(year, 0, 1);     // January 1st
          to = new Date(year, 11, 31);     // December 31st
        }

        // Fetch funnel metrics - this shows total entries into each stage over time
        const response = await fetch(`/api/funnel-metrics?startDate=${from.toISOString().split('T')[0]}&endDate=${to.toISOString().split('T')[0]}`);
        const data = await response.json();
        
        if (data.error) {
          console.error('API Error:', data.error);
          setFunnelData(null);
        } else {
          setFunnelData(data);
          
          // Create conversion funnel counts (total entries into each stage)
          const conversionCounts: any = {};
          if (data.funnelMetrics) {
            data.funnelMetrics.forEach((stage: any) => {
              conversionCounts[stage.stage] = stage.total_entered || 0;
            });
          }
          setCurrentLeadCounts(conversionCounts);
          
          // Trigger animation after data loads
          setTimeout(() => setAnimateAfterLoad(true), 100);
        }
      } catch (error) {
        console.error('Error fetching funnel data:', error);
        setFunnelData(null);
      } finally {
        setLoading(false);
      }
    }

    fetchConversionFunnel();
  }, [year, months]);

  // Use conversion funnel data - shows total entries into each stage
  const totalLeads = funnelData?.summary?.totalLeads || 0;
  const maxCount = Math.max(...Object.values(currentLeadCounts).map(v => Number(v) || 0), 1);
  
  // Show skeleton immediately, even while loading
  const showSkeleton = Object.keys(currentLeadCounts).length === 0;

  return (
    <div className="rounded-lg bg-black/70 backdrop-blur p-4 border border-white/10 h-[260px] flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-white/80">Lead Conversion Funnel</h2>
        <span className="text-xs text-white/50">
          {totalLeads} total leads
        </span>
      </div>
      
      <div className="space-y-2 flex-1">
        {STAGES.filter(stage => stage.key !== 'lost').map((stage, index) => {
          const leadCount = currentLeadCounts[stage.key] || 0;
          const widthPercent = leadCount > 0 ? (leadCount / maxCount) * 100 : 0;
          
          // Get conversion rate from historical data if available
          const stageData = funnelData?.funnelMetrics?.find((s: any) => s.stage === stage.key);
          const conversionRate = stageData?.conversion_to_next || 0;

          return (
            <div key={stage.key} className="relative">
              <div className="w-full bg-white/10 rounded-lg h-8 relative overflow-hidden">
                {showSkeleton ? (
                  <div className="bg-white/30 h-8 rounded-lg animate-pulse absolute inset-0" style={{ width: '30%' }} />
                ) : (
                  <div
                    className="bg-white h-8 rounded-lg absolute inset-0 transition-all duration-700 ease-out flex items-center justify-between px-3"
                    style={{ 
                      width: animateAfterLoad ? `${Math.max(widthPercent, leadCount > 0 ? 15 : 0)}%` : '0%'
                    }}
                  >
                    <span className="text-sm font-semibold text-black">
                      {stage.label}
                    </span>
                    <span className="text-sm font-bold text-black">
                      {leadCount}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        
        {/* Lost leads section */}
        {(() => {
          const lostCount = currentLeadCounts['lost'] || 0;
          if (lostCount === 0) return null;
          
          const lostWidthPercent = lostCount > 0 ? (lostCount / maxCount) * 100 : 0;
          
          return (
            <div className="border-t border-white/10 pt-2 mt-2 relative">
              <div className="w-full bg-red-500/20 rounded-lg h-8 relative overflow-hidden">
                <div
                  className="bg-red-500/80 h-8 rounded-lg absolute inset-0 transition-all duration-700 ease-out flex items-center justify-between px-3"
                  style={{ 
                    width: animateAfterLoad ? `${Math.max(lostWidthPercent, lostCount > 0 ? 15 : 0)}%` : '0%'
                  }}
                >
                  <span className="text-sm font-semibold text-white">
                    Lost
                  </span>
                  <span className="text-sm font-bold text-white">
                    {lostCount}
                  </span>
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { year, months } = useDashboardFilter();

  // KPI counts
  const [kpi, setKpi] = useState<{ today: number; periodLeads: number; negotiations: number; upcoming: number }>({ today: 0, periodLeads: 0, negotiations: 0, upcoming: 0 });

  // Trend chart data
  const [trendData, setTrendData] = useState<any[]>([]);

  useEffect(() => {
    async function fetchKpis() {
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      const startOfTomorrow = new Date(startOfToday);
      startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const weekAhead = new Date();
      weekAhead.setDate(weekAhead.getDate() + 7);

      const todayRes = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startOfToday.toISOString())
        .lt('created_at', startOfTomorrow.toISOString());

      const weekRes = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', sevenDaysAgo.toISOString());

      const upcomingRes = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .gte('appointment_date', dayjs().format('YYYY-MM-DD'))
        .lte('appointment_date', dayjs(weekAhead).format('YYYY-MM-DD'));

      setKpi(prev => ({
        ...prev,
        today: todayRes.count || 0,
        upcoming: upcomingRes.count || 0,
      }));
    }

    fetchKpis();
  }, []);

  // re-calc counts for selected period (year + months)
  useEffect(() => {
    async function fetchPeriodCounts() {
      // Calculate date range based on filters (same logic as funnel)
      let from: Date;
      let to: Date;
      
      if (months.length > 0) {
        // When specific months are selected
        const firstMonth = Math.min(...months) - 1; // Convert to 0-based index
        const lastMonth = Math.max(...months) - 1;  // Convert to 0-based index
        
        from = new Date(year, firstMonth, 1); // First day of first selected month
        to = new Date(year, lastMonth + 1, 0); // Last day of last selected month
      } else {
        // When no months selected (show full year)
        from = new Date(year, 0, 1);     // January 1st
        to = new Date(year, 11, 31);     // December 31st
      }

      // Fetch leads filtered by date range
      const { data, error } = await supabase
        .from('leads')
        .select('created_at,updated_at,status')
        .gte('created_at', from.toISOString().split('T')[0])
        .lte('created_at', to.toISOString().split('T')[0]);
      
      if (error) { console.error(error); return; }

      const leadsCount = data?.length || 0;
      
      // Get negotiations count (leads currently in negotiation status)
      const { count: negotiationCount, error: negError } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'negotiation')
        .gte('created_at', from.toISOString().split('T')[0])
        .lte('created_at', to.toISOString().split('T')[0]);
      
      if (negError) { console.error(negError); return; }

      setKpi(prev => ({ ...prev, periodLeads: leadsCount, negotiations: negotiationCount || 0 }));
    }

    fetchPeriodCounts();
  }, [year, months]);

  // trend effect
  useEffect(() => {
    async function fetchTrend() {
      // Calculate date range based on filters (same logic as funnel)
      let from: Date;
      let to: Date;
      
      if (months.length > 0) {
        // When specific months are selected
        const firstMonth = Math.min(...months) - 1; // Convert to 0-based index
        const lastMonth = Math.max(...months) - 1;  // Convert to 0-based index
        
        from = new Date(year, firstMonth, 1); // First day of first selected month
        to = new Date(year, lastMonth + 1, 0); // Last day of last selected month
      } else {
        // When no months selected (show full year)
        from = new Date(year, 0, 1);     // January 1st
        to = new Date(year, 11, 31);     // December 31st
      }

      const { data, error } = await supabase
        .from('leads')
        .select('created_at,status')
        .gte('created_at', from.toISOString().split('T')[0])
        .lte('created_at', to.toISOString().split('T')[0]);

      if (error) {
        console.error(error);
        return;
      }

      type RowAgg = { date: string; new_customer: number; negotiation: number; won: number; delivered: number; lost: number };
      const map: Record<string, RowAgg> = {};
      (data || []).forEach((row: any) => {
        const d = dayjs(row.created_at).format('YYYY-MM-DD');
        if (!map[d]) {
          map[d] = { date: d, new_customer: 0, negotiation: 0, won: 0, delivered: 0, lost: 0 };
        }
        (map[d] as any)[row.status] = ((map[d] as any)[row.status] || 0) + 1;
      });

      const arr = Object.values(map).sort((a, b) => a.date.localeCompare(b.date));
      setTrendData(arr);
    }

    fetchTrend();
  }, [year, months]);

  return (
    <main className="min-h-screen overflow-y-auto no-scrollbar">
      <Header />
      <div className="p-4 text-white text-sm">
        <h1 className="text-lg font-semibold mb-4">Dashboard</h1>
        <DashboardFilterBar />
        {/* Board grid split */}
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Left column */}
          <div className="space-y-4">
            <div className="grid gap-3 grid-cols-2">
              <div className="rounded-lg bg-gradient-to-br from-white/10 to-white/5 backdrop-blur p-3 border border-white/10 shadow-inner">
                <p className="text-[11px] text-white/60">New Leads (Today)</p>
                <p className="text-xl font-semibold text-white">{kpi.today}</p>
              </div>
              <div className="rounded-lg bg-gradient-to-br from-white/10 to-white/5 backdrop-blur p-3 border border-white/10 shadow-inner">
                <p className="text-[11px] text-white/60">Leads (Selected Months)</p>
                <p className="text-xl font-semibold text-white">{kpi.periodLeads}</p>
              </div>
              <div className="rounded-lg bg-gradient-to-br from-white/10 to-white/5 backdrop-blur p-3 border border-white/10 shadow-inner">
                <p className="text-[11px] text-white/60">Negotiations (Selected Months)</p>
                <p className="text-xl font-semibold text-white">{kpi.negotiations}</p>
              </div>
              <div className="rounded-lg bg-gradient-to-br from-white/10 to-white/5 backdrop-blur p-3 border border-white/10 shadow-inner">
                <p className="text-[11px] text-white/60">Appointments (Next 7 Days)</p>
                <p className="text-xl font-semibold text-white">{kpi.upcoming}</p>
              </div>
            </div>
          </div>

          {/* Right column inventory KPI cards */}
          <div className="grid gap-3 grid-cols-2">
            {[
              'Stock (Available)',
              'Reserved',
              'Sold This Month',
              'Total Stock Value'
            ].map((label,index)=>(
              <div key={index} className="rounded-lg bg-gradient-to-br from-white/10 to-white/5 backdrop-blur p-3 border border-white/10 shadow-inner">
                <p className="text-[11px] text-white/60">{label}</p>
                <p className="text-xl font-semibold text-white">—</p>
              </div>
            ))}
          </div>
        </div>

        {/* Second row: Funnel/Calendar and Coming-Soon column */}
        <div className="grid gap-4 mt-4 lg:grid-cols-2">
          {/* Left sub-column */}
          <div className="space-y-4">
            <LeadsFunnel />
            <MiniCalendar year={year} months={months} />
          </div>

          {/* Right sub-column – Coming soon */}
          <div className="space-y-4">
            {[1,2].map(idx=>(
              <div key={idx} className="rounded-lg bg-black/70 backdrop-blur p-4 border border-white/10 h-[260px] flex items-center justify-center text-white/60 text-sm uppercase tracking-wide">
                Coming Soon
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}

/* ---------------- Mini Calendar ---------------- */
const MiniCalendar: React.FC<{year:number; months:number[]}> = ({year, months}) => {
  const [events, setEvents] = useState<Record<string, any[]>>({}); // date -> leads array
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAppts() {
      let start: dayjs.Dayjs;
      let end: dayjs.Dayjs;
      
      if (months.length === 0) {
        // When no months selected, show current month
        start = dayjs().startOf('month');
        end = dayjs().endOf('month');
      } else {
        // When specific months are selected, show first selected month
        const firstMonth = months[0] - 1; // JS month index
        start = dayjs(new Date(year, firstMonth, 1)).startOf('month');
        end = dayjs(start).endOf('month');
      }

      const { data } = await supabase
        .from('leads')
        .select('id,full_name,time_slot,appointment_date')
        .gte('appointment_date', start.format('YYYY-MM-DD'))
        .lte('appointment_date', end.format('YYYY-MM-DD'));

      const map: Record<string, any[]> = {};
      (data || []).forEach((row: any) => {
        const d = row.appointment_date;
        map[d] ||= [];
        map[d].push(row);
      });
      setEvents(map);
    }
    fetchAppts();
  }, [year, months]);

  // Build days grid for first selected month
  const monthIdx = months.length ? months[0] - 1 : new Date().getMonth();
  const firstDay = dayjs(new Date(year, monthIdx, 1));
  const daysInMonth = firstDay.daysInMonth();
  const prefix = firstDay.day(); // 0=Sun

  const weeks: (number | null)[] = Array(prefix).fill(null).concat(
    Array.from({ length: daysInMonth }, (_, i) => i + 1)
  );
  while (weeks.length % 7 !== 0) weeks.push(null);

  return (
    <div className="rounded-lg bg-black/70 backdrop-blur p-3 border border-white/10 h-[260px] flex flex-col">
      <h2 className="text-xs font-semibold text-white/80 mb-2">
        {firstDay.format('MMMM YYYY')}
      </h2>
      <div className="grid grid-cols-7 gap-1 text-[10px] text-center text-white/60 mb-1">
        {['S','M','T','W','T','F','S'].map((d,index)=>(<div key={index}>{d}</div>))}
      </div>
      <div className="grid grid-cols-7 gap-1 text-[10px] flex-1 overflow-y-auto">
        {weeks.map((day,i)=>{
          if(day===null) return <div key={i} />;
          const dateStr = dayjs(new Date(year, monthIdx, day)).format('YYYY-MM-DD');
          const has = events[dateStr]?.length;
          const selected = selectedDate===dateStr;
          return (
            <button
              key={i}
              onClick={()=>setSelectedDate(dateStr)}
              className={`h-6 rounded flex items-center justify-center relative
                ${selected ? 'bg-white text-black shadow-inner' : has ? 'bg-white/10 text-white shadow' : 'bg-white/5 hover:bg-white/10 text-white/50'}
              `}
            >
              {day}
              {has && !selected && (
                <span className="absolute bottom-0.5 right-0.5 w-1 h-1 rounded-full bg-white"></span>
              )}
            </button>
          );
        })}
      </div>
      {selectedDate && events[selectedDate]?.length && (
        <div className="mt-2 flex-1 overflow-y-auto text-[11px] text-white/80">
          <p className="mb-1 font-semibold">{dayjs(selectedDate).format('DD MMM')} Appointments</p>
          {events[selectedDate].map((e,i)=>(
            <div key={i} className="border-b border-white/10 py-0.5 last:border-none">
              {e.time_slot?.slice(0,5)} – {e.full_name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}; 