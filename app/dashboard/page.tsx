"use client";
import React, { useEffect, useState } from 'react';
import Header from '@/components/Header';
import DashboardFilterBar from '@/components/DashboardFilterBar';
import { supabase } from '@/lib/supabaseClient';
import { useDashboardFilter } from '@/lib/dashboardFilterStore';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import dayjs from 'dayjs';

// Inline LeadsFunnel component to keep dashboard self-contained
function LeadsFunnel() {
  const STAGES = [
    { key: 'lost', label: 'Lost' },
    { key: 'new_customer', label: 'New' },
    { key: 'negotiation', label: 'Negotiation' },
    { key: 'won', label: 'Reserved' },
    { key: 'delivered', label: 'Delivered' },
  ];

  const { year, months } = useDashboardFilter();
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchCounts() {
      setLoading(true);
      const from = new Date(year, 0, 1).toISOString();
      const to = new Date(year + 1, 0, 1).toISOString();

      let { data, error } = await supabase
        .from('leads')
        .select('status, created_at')
        .gte('created_at', from)
        .lt('created_at', to);

      if (error) {
        console.error(error);
        setLoading(false);
        return;
      }

      if (!data) data = [];

      const filtered = data.filter((row: any) => {
        if (months.length === 0) return true;
        const m = new Date(row.created_at).getMonth() + 1;
        return months.includes(m);
      });

      const stageCounts: Record<string, number> = {};
      STAGES.forEach((s) => (stageCounts[s.key] = 0));

      filtered.forEach((row: any) => {
        stageCounts[row.status] = (stageCounts[row.status] || 0) + 1;
      });

      setCounts(stageCounts);
      setLoading(false);
    }

    fetchCounts();
  }, [year, months]);

  if (loading) return <p className="text-white/60">Loading funnel…</p>;

  const maxCount = Math.max(...STAGES.map((s) => counts[s.key] || 0), 1);

  return (
    <div className="rounded-lg bg-black/70 backdrop-blur p-4 border border-white/10 h-[260px] flex flex-col">
      <h2 className="text-sm font-semibold text-white/80 mb-4">Lead Funnel</h2>
      <div className="space-y-2 flex-1 overflow-hidden">
        {STAGES.map((stage) => {
          const c = counts[stage.key] || 0;
          const widthPercent = (c / maxCount) * 100;
          return (
            <div key={stage.key} className="flex items-center gap-2">
              <div
                className="transition-all h-6 rounded-r-full bg-white/80 relative text-black"
                style={{ width: `${widthPercent}%`, minWidth: '4px' }}
              >
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-black">
                  {c}
                </span>
              </div>
              <span className="text-xs text-white/70 w-20">{stage.label}</span>
            </div>
          );
        })}
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
      const from = new Date(year, 0, 1).toISOString();
      const to = new Date(year + 1, 0, 1).toISOString();

      const { data, error } = await supabase
        .from('leads')
        .select('created_at,updated_at,status');
      if (error) { console.error(error); return; }

      const filtered = (data || []).filter((row: any) => {
        // within year range
        const date = new Date(row.created_at);
        if (date < new Date(from) || date >= new Date(to)) return false;
        if (months.length === 0) return true;
        const m = date.getMonth() + 1;
        return months.includes(m);
      });

      const leadsCount = filtered.length;
      const negotiationsCount = (data || []).filter((row: any) => {
        if (row.status !== 'negotiation') return false;
        const upd = new Date(row.updated_at);
        if (upd < new Date(from) || upd >= new Date(to)) return false;
        if (months.length === 0) return true;
        const m = upd.getMonth() + 1;
        return months.includes(m);
      }).length;

      setKpi(prev => ({ ...prev, periodLeads: leadsCount, negotiations: negotiationsCount }));
    }

    fetchPeriodCounts();
  }, [year, months]);

  // trend effect
  useEffect(() => {
    async function fetchTrend() {
      const from = new Date(year, 0, 1).toISOString();
      const to = new Date(year + 1, 0, 1).toISOString();

      const { data, error } = await supabase
        .from('leads')
        .select('created_at,status')
        .gte('created_at', from)
        .lt('created_at', to);

      if (error) {
        console.error(error);
        return;
      }

      const filtered = (data || []).filter((row: any) => {
        if (months.length === 0) return true;
        const m = new Date(row.created_at).getMonth() + 1;
        return months.includes(m);
      });

      type RowAgg = { date: string; new_customer: number; negotiation: number; won: number; delivered: number; lost: number };
      const map: Record<string, RowAgg> = {};
      filtered.forEach((row: any) => {
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
      if (months.length === 0) return setEvents({});
      const firstMonth = months[0] - 1; // JS month index
      const start = dayjs(new Date(year, firstMonth, 1)).startOf('month');
      const end = dayjs(start).endOf('month');

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
        {['S','M','T','W','T','F','S'].map(d=>(<div key={d}>{d}</div>))}
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