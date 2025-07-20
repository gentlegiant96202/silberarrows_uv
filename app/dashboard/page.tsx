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
    { key: 'new_lead', label: 'New Lead', color: 'bg-slate-500' },
    { key: 'new_customer', label: 'New Appointment', color: 'bg-blue-500' },
    { key: 'negotiation', label: 'Negotiation', color: 'bg-yellow-500' },
    { key: 'won', label: 'Reserved', color: 'bg-green-500' },
    { key: 'delivered', label: 'Delivered', color: 'bg-purple-500' },
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
        {STAGES.map((stage, index) => {
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

      type RowAgg = { date: string; new_lead: number; new_customer: number; negotiation: number; won: number; delivered: number };
      const map: Record<string, RowAgg> = {};
      (data || []).forEach((row: any) => {
        const d = dayjs(row.created_at).format('YYYY-MM-DD');
        if (!map[d]) {
          map[d] = { date: d, new_lead: 0, new_customer: 0, negotiation: 0, won: 0, delivered: 0 };
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
          <InventoryKPICards year={year} months={months} />
        </div>

        {/* Second row: Funnel/Calendar and Coming-Soon column */}
        <div className="grid gap-4 mt-4 lg:grid-cols-2">
          {/* Left sub-column */}
          <div className="space-y-4">
            <LeadsFunnel />
            <MiniCalendar year={year} months={months} />
          </div>

          {/* Right sub-column – Inventory & Model Analytics */}
          <div className="space-y-4">
            <InventoryDashboard year={year} months={months} />
            <ModelDemandAnalysis year={year} months={months} />
          </div>
        </div>
      </div>
    </main>
  );
}

/* ---------------- Inventory KPI Cards ---------------- */
const InventoryKPICards: React.FC<{year:number; months:number[]}> = ({year, months}) => {
  const [kpiData, setKpiData] = useState({
    available: 0,
    reserved: 0,
    soldThisMonth: 0,
    totalValue: 0
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchKPIData() {
      setLoading(true);
      try {
        // Fetch all cars
        const { data: allCars } = await supabase
          .from('cars')
          .select('sale_status, advertised_price_aed, updated_at, status')
          .eq('status', 'inventory');

        // Calculate date range for "sold this month"
        let from: Date, to: Date;
        if (months.length > 0) {
          const firstMonth = Math.min(...months) - 1;
          const lastMonth = Math.max(...months) - 1;
          from = new Date(year, firstMonth, 1);
          to = new Date(year, lastMonth + 1, 0);
        } else {
          from = new Date(year, new Date().getMonth(), 1);
          to = new Date(year, new Date().getMonth() + 1, 0);
        }

        if (allCars) {
          const available = allCars.filter(c => c.sale_status === 'available').length;
          const reserved = allCars.filter(c => c.sale_status === 'reserved').length;
          
          // Count cars sold within the selected period
          const soldThisMonth = allCars.filter(c => {
            if (c.sale_status === 'sold' && c.updated_at) {
              const soldDate = new Date(c.updated_at);
              return soldDate >= from && soldDate <= to;
            }
            return false;
          }).length;
          
          const totalValue = allCars
            .filter(c => c.sale_status === 'available')
            .reduce((sum, car) => sum + (car.advertised_price_aed || 0), 0);

          setKpiData({
            available,
            reserved,
            soldThisMonth,
            totalValue
          });
        }
      } catch (error) {
        console.error('Error fetching KPI data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchKPIData();
  }, [year, months]);

  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat('en-AE', { style: 'currency', currency: 'AED', minimumFractionDigits: 0 }).format(amount);

  const formatValue = (amount: number) =>
    amount >= 1000000 
      ? `${(amount / 1000000).toFixed(1)}M`
      : amount >= 1000 
        ? `${(amount / 1000).toFixed(0)}K`
        : amount.toString();

  return (
    <div className="grid gap-3 grid-cols-2">
      <div className="rounded-lg bg-gradient-to-br from-white/10 to-white/5 backdrop-blur p-3 border border-white/10 shadow-inner">
        <p className="text-[11px] text-white/60">Stock (Available)</p>
        <p className="text-xl font-semibold text-white">{loading ? '—' : kpiData.available}</p>
      </div>
      <div className="rounded-lg bg-gradient-to-br from-white/10 to-white/5 backdrop-blur p-3 border border-white/10 shadow-inner">
        <p className="text-[11px] text-white/60">Reserved</p>
        <p className="text-xl font-semibold text-white">{loading ? '—' : kpiData.reserved}</p>
      </div>
      <div className="rounded-lg bg-gradient-to-br from-white/10 to-white/5 backdrop-blur p-3 border border-white/10 shadow-inner">
        <p className="text-[11px] text-white/60">Sold This Month</p>
        <p className="text-xl font-semibold text-white">{loading ? '—' : kpiData.soldThisMonth}</p>
      </div>
      <div className="rounded-lg bg-gradient-to-br from-white/10 to-white/5 backdrop-blur p-3 border border-white/10 shadow-inner">
        <p className="text-[11px] text-white/60">Total Stock Value</p>
        <p className="text-xl font-semibold text-white">
          {loading ? '—' : `${formatValue(kpiData.totalValue)}`}
        </p>
      </div>
    </div>
  );
};

/* ---------------- Inventory Dashboard ---------------- */
const InventoryDashboard: React.FC<{year:number; months:number[]}> = ({year, months}) => {
  const [inventoryData, setInventoryData] = useState<any>({
    available: 0,
    reserved: 0,
    sold: 0,
    aging30: 0,
    aging60: 0,
    aging90: 0,
    totalValue: 0,
    popularModels: []
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchInventoryData() {
      setLoading(true);
      try {
        // Calculate date range for filtering
        let dateFilter = '';
        if (months.length > 0) {
          const firstMonth = Math.min(...months) - 1;
          const lastMonth = Math.max(...months) - 1;
          const from = new Date(year, firstMonth, 1);
          const to = new Date(year, lastMonth + 1, 0);
          dateFilter = `created_at.gte.${from.toISOString().split('T')[0]}.and.created_at.lte.${to.toISOString().split('T')[0]}`;
        } else {
          const from = new Date(year, 0, 1);
          const to = new Date(year, 11, 31);
          dateFilter = `created_at.gte.${from.toISOString().split('T')[0]}.and.created_at.lte.${to.toISOString().split('T')[0]}`;
        }

        // Fetch car inventory data
        const { data: cars } = await supabase
          .from('cars')
          .select('sale_status, advertised_price_aed, vehicle_model, stock_age_days, created_at')
          .eq('status', 'inventory');

        // Fetch lead model interests for comparison (filtered by date)
        const { data: leads } = await supabase
          .from('leads')
          .select('model_of_interest')
          .or(dateFilter);

        if (cars && leads) {
          // Calculate inventory stats
          const available = cars.filter(c => c.sale_status === 'available').length;
          const reserved = cars.filter(c => c.sale_status === 'reserved').length;
          const sold = cars.filter(c => c.sale_status === 'sold').length;
          
          // Calculate aging inventory
          const aging30 = cars.filter(c => c.stock_age_days && c.stock_age_days > 30 && c.sale_status === 'available').length;
          const aging60 = cars.filter(c => c.stock_age_days && c.stock_age_days > 60 && c.sale_status === 'available').length;
          const aging90 = cars.filter(c => c.stock_age_days && c.stock_age_days > 90 && c.sale_status === 'available').length;
          
          // Calculate total inventory value
          const totalValue = cars
            .filter(c => c.sale_status === 'available')
            .reduce((sum, car) => sum + (car.advertised_price_aed || 0), 0);

          // Calculate popular models from leads vs inventory
          const leadModels: Record<string, number> = {};
          const inventoryModels: Record<string, number> = {};
          
          leads.forEach(lead => {
            if (lead.model_of_interest) {
              leadModels[lead.model_of_interest] = (leadModels[lead.model_of_interest] || 0) + 1;
            }
          });
          
          cars.filter(c => c.sale_status === 'available').forEach(car => {
            if (car.vehicle_model) {
              inventoryModels[car.vehicle_model] = (inventoryModels[car.vehicle_model] || 0) + 1;
            }
          });

          // Create popular models comparison (top 5)
          const popularModels = Object.entries(leadModels)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5)
            .map(([model, demand]) => ({
              model,
              demand,
              supply: inventoryModels[model] || 0
            }));

          setInventoryData({
            available,
            reserved,
            sold,
            aging30,
            aging60,
            aging90,
            totalValue,
            popularModels
          });
        }
      } catch (error) {
        console.error('Error fetching inventory data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchInventoryData();
  }, [year, months]);

  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat('en-AE', { style: 'currency', currency: 'AED', minimumFractionDigits: 0 }).format(amount);

  return (
    <div className="rounded-lg bg-black/70 backdrop-blur p-4 border border-white/10 h-[260px] overflow-y-auto">
      <h2 className="text-sm font-semibold text-white/80 mb-3 flex items-center gap-2">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
        Inventory Overview
      </h2>
      
      {loading ? (
        <div className="flex items-center justify-center h-32 text-white/50">Loading...</div>
      ) : (
        <div className="space-y-3">
          {/* Inventory Status */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-white/5 rounded p-2 text-center">
              <p className="text-[10px] text-white/60">Available</p>
              <p className="text-lg font-bold text-green-400">{inventoryData.available}</p>
            </div>
            <div className="bg-white/5 rounded p-2 text-center">
              <p className="text-[10px] text-white/60">Reserved</p>
              <p className="text-lg font-bold text-yellow-400">{inventoryData.reserved}</p>
            </div>
            <div className="bg-white/5 rounded p-2 text-center">
              <p className="text-[10px] text-white/60">Sold</p>
              <p className="text-lg font-bold text-blue-400">{inventoryData.sold}</p>
            </div>
          </div>

          {/* Aging Alerts */}
          <div className="bg-white/5 rounded p-2">
            <p className="text-[10px] text-white/60 mb-1">Aging Stock Alerts</p>
            <div className="flex justify-between text-xs">
              <span className="text-orange-400">&gt;30d: {inventoryData.aging30}</span>
              <span className="text-red-400">&gt;60d: {inventoryData.aging60}</span>
              <span className="text-red-500">&gt;90d: {inventoryData.aging90}</span>
            </div>
          </div>

          {/* Total Value */}
          <div className="bg-white/5 rounded p-2">
            <p className="text-[10px] text-white/60">Total Stock Value</p>
            <p className="text-sm font-bold text-white">{formatCurrency(inventoryData.totalValue)}</p>
          </div>

          {/* Popular Models Comparison */}
          <div className="bg-white/5 rounded p-2">
            <p className="text-[10px] text-white/60 mb-1">Demand vs Supply (Top 5)</p>
            <div className="space-y-1">
              {inventoryData.popularModels.slice(0, 3).map((item: any, idx: number) => (
                <div key={idx} className="flex justify-between text-[10px]">
                  <span className="text-white/70 truncate w-12">{item.model}</span>
                  <span className="text-blue-400">D:{item.demand}</span>
                  <span className="text-green-400">S:{item.supply}</span>
                  <span className={`${item.demand > item.supply ? 'text-red-400' : 'text-green-400'}`}>
                    {item.demand > item.supply ? '⚠️' : '✅'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ---------------- Model Demand Analysis ---------------- */
const ModelDemandAnalysis: React.FC<{year:number; months:number[]}> = ({year, months}) => {
  const [demandData, setDemandData] = useState<any>({
    currentPeriod: {},
    previousPeriod: {},
    gapAnalysis: [],
    trends: []
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchDemandData() {
      setLoading(true);
      try {
        // Calculate current and previous period dates
        let currentFrom: Date, currentTo: Date, previousFrom: Date, previousTo: Date;
        
        if (months.length > 0) {
          const firstMonth = Math.min(...months) - 1;
          const lastMonth = Math.max(...months) - 1;
          currentFrom = new Date(year, firstMonth, 1);
          currentTo = new Date(year, lastMonth + 1, 0);
          
          // Previous period (same months, previous year)
          previousFrom = new Date(year - 1, firstMonth, 1);
          previousTo = new Date(year - 1, lastMonth + 1, 0);
        } else {
          // Full year
          currentFrom = new Date(year, 0, 1);
          currentTo = new Date(year, 11, 31);
          previousFrom = new Date(year - 1, 0, 1);
          previousTo = new Date(year - 1, 11, 31);
        }

        // Fetch current period leads
        const { data: currentLeads } = await supabase
          .from('leads')
          .select('model_of_interest')
          .gte('created_at', currentFrom.toISOString().split('T')[0])
          .lte('created_at', currentTo.toISOString().split('T')[0]);

        // Fetch previous period leads
        const { data: previousLeads } = await supabase
          .from('leads')
          .select('model_of_interest')
          .gte('created_at', previousFrom.toISOString().split('T')[0])
          .lte('created_at', previousTo.toISOString().split('T')[0]);

        // Fetch current inventory
        const { data: inventory } = await supabase
          .from('cars')
          .select('vehicle_model')
          .eq('status', 'inventory')
          .eq('sale_status', 'available');

        if (currentLeads && previousLeads && inventory) {
          // Count current period demand
          const currentDemand: Record<string, number> = {};
          currentLeads.forEach(lead => {
            if (lead.model_of_interest) {
              currentDemand[lead.model_of_interest] = (currentDemand[lead.model_of_interest] || 0) + 1;
            }
          });

          // Count previous period demand
          const previousDemand: Record<string, number> = {};
          previousLeads.forEach(lead => {
            if (lead.model_of_interest) {
              previousDemand[lead.model_of_interest] = (previousDemand[lead.model_of_interest] || 0) + 1;
            }
          });

          // Count current inventory
          const currentInventory: Record<string, number> = {};
          inventory.forEach(car => {
            if (car.vehicle_model) {
              currentInventory[car.vehicle_model] = (currentInventory[car.vehicle_model] || 0) + 1;
            }
          });

          // Calculate gap analysis (high demand, low inventory)
          const gapAnalysis = Object.entries(currentDemand)
            .map(([model, demand]) => ({
              model,
              demand,
              supply: currentInventory[model] || 0,
              gap: demand - (currentInventory[model] || 0),
              growthRate: previousDemand[model] ? 
                ((demand - previousDemand[model]) / previousDemand[model] * 100) : 100
            }))
            .filter(item => item.gap > 0)
            .sort((a, b) => b.gap - a.gap)
            .slice(0, 5);

          // Calculate top trends (growth rates)
          const trends = Object.entries(currentDemand)
            .map(([model, demand]) => ({
              model,
              current: demand,
              previous: previousDemand[model] || 0,
              change: demand - (previousDemand[model] || 0),
              growthRate: previousDemand[model] ? 
                ((demand - previousDemand[model]) / previousDemand[model] * 100) : 100
            }))
            .sort((a, b) => b.growthRate - a.growthRate)
            .slice(0, 5);

          setDemandData({
            currentPeriod: currentDemand,
            previousPeriod: previousDemand,
            gapAnalysis,
            trends
          });
        }
      } catch (error) {
        console.error('Error fetching demand data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchDemandData();
  }, [year, months]);

  return (
    <div className="rounded-lg bg-black/70 backdrop-blur p-4 border border-white/10 h-[260px] overflow-y-auto">
      <h2 className="text-sm font-semibold text-white/80 mb-3 flex items-center gap-2">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        Model Demand Analysis
      </h2>
      
      {loading ? (
        <div className="flex items-center justify-center h-32 text-white/50">Loading...</div>
      ) : (
        <div className="space-y-3">
          {/* Gap Analysis */}
          <div className="bg-white/5 rounded p-2">
            <p className="text-[10px] text-white/60 mb-2 flex items-center gap-1">
              <span className="w-2 h-2 bg-red-400 rounded"></span>
              High Demand, Low Stock
            </p>
            <div className="space-y-1">
              {demandData.gapAnalysis.slice(0, 3).map((item: any, idx: number) => (
                <div key={idx} className="flex justify-between items-center text-[10px]">
                  <span className="text-white/70 truncate w-14">{item.model}</span>
                  <div className="flex gap-2">
                    <span className="text-red-400">-{item.gap}</span>
                    <span className="text-white/50">({item.demand}/{item.supply})</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Trend Analysis */}
          <div className="bg-white/5 rounded p-2">
            <p className="text-[10px] text-white/60 mb-2 flex items-center gap-1">
              <span className="w-2 h-2 bg-green-400 rounded"></span>
              Growth Trends (vs Last Year)
            </p>
            <div className="space-y-1">
              {demandData.trends.slice(0, 3).map((item: any, idx: number) => (
                <div key={idx} className="flex justify-between items-center text-[10px]">
                  <span className="text-white/70 truncate w-14">{item.model}</span>
                  <div className="flex gap-2">
                    <span className={`${item.change > 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {item.change > 0 ? '+' : ''}{item.change}
                    </span>
                    <span className="text-white/50">
                      ({item.current}/{item.previous})
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Period Comparison */}
          <div className="bg-white/5 rounded p-2">
            <p className="text-[10px] text-white/60 mb-1">Period Comparison</p>
            <div className="flex justify-between text-xs">
              <div className="text-center">
                <p className="text-white/50">Current</p>
                <p className="text-white font-bold">
                  {Object.values(demandData.currentPeriod).reduce((a: number, b: number) => a + b, 0)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-white/50">Previous</p>
                <p className="text-white font-bold">
                  {Object.values(demandData.previousPeriod).reduce((a: number, b: number) => a + b, 0)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-white/50">Change</p>
                <p className={`font-bold ${
                  Object.values(demandData.currentPeriod).reduce((a: number, b: number) => a + b, 0) > 
                  Object.values(demandData.previousPeriod).reduce((a: number, b: number) => a + b, 0) 
                    ? 'text-green-400' : 'text-red-400'
                }`}>
                  {Object.values(demandData.currentPeriod).reduce((a: number, b: number) => a + b, 0) > 
                   Object.values(demandData.previousPeriod).reduce((a: number, b: number) => a + b, 0) ? '+' : ''}
                  {Object.values(demandData.currentPeriod).reduce((a: number, b: number) => a + b, 0) - 
                   Object.values(demandData.previousPeriod).reduce((a: number, b: number) => a + b, 0)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

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