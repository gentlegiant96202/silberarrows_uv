"use client";
import React, { useEffect, useState } from 'react';
import Header from '@/components/Header';
import DashboardFilterBar from '@/components/DashboardFilterBar';
import { supabase } from '@/lib/supabaseClient';
import { useDashboardFilter } from '@/lib/dashboardFilterStore';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
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

  // Trend chart data
  const [trendData, setTrendData] = useState<any[]>([]);

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
          <LeadKPICards year={year} months={months} />

          {/* Right column inventory KPI cards */}
          <InventoryKPICards year={year} months={months} />
        </div>

        {/* Second row: Charts and Analytics */}
        <div className="grid gap-4 mt-4 lg:grid-cols-3">
          {/* Lead Conversion Funnel */}
          <div className="lg:col-span-1">
            <LeadsFunnel />
          </div>

          {/* Inventory Status Chart */}
          <div className="lg:col-span-1">
            <InventoryStatusChart year={year} months={months} />
          </div>

          {/* Model Demand Chart */}
          <div className="lg:col-span-1">
            <ModelDemandChart year={year} months={months} />
          </div>
        </div>


      </div>
    </main>
  );
}

/* ---------------- Lead KPI Cards ---------------- */
const LeadKPICards: React.FC<{year:number; months:number[]}> = ({year, months}) => {
  const [kpi, setKpi] = useState({
    newLeads: 0,
    previousLeads: 0,
    activePipeline: 0,
    conversions: 0,
    conversionRate: 0,
    averageBudget: 0
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchKPIs() {
      setLoading(true);
      
      // Calculate current and previous period dates
      let currentFrom: Date, currentTo: Date, previousFrom: Date, previousTo: Date;
      if (months.length > 0) {
        const first = Math.min(...months) - 1;
        const last = Math.max(...months) - 1;
        currentFrom = new Date(year, first, 1);
        currentTo = new Date(year, last + 1, 0);
        // Previous period (same months, previous year)
        previousFrom = new Date(year - 1, first, 1);
        previousTo = new Date(year - 1, last + 1, 0);
      } else {
        currentFrom = new Date(year, 0, 1);
        currentTo = new Date(year, 11, 31);
        previousFrom = new Date(year - 1, 0, 1);
        previousTo = new Date(year - 1, 11, 31);
      }

      // Fetch all leads for current period
      const { data: currentLeads } = await supabase
        .from('leads')
        .select('status, payment_type, monthly_budget, total_budget, created_at')
        .gte('created_at', currentFrom.toISOString().split('T')[0])
        .lte('created_at', currentTo.toISOString().split('T')[0]);

      // Fetch previous period for comparison
      const { count: previousLeadsCount } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'new_lead')
        .gte('created_at', previousFrom.toISOString().split('T')[0])
        .lte('created_at', previousTo.toISOString().split('T')[0]);

      // Fetch current active pipeline (all statuses except new_lead)
      const { count: activePipelineCount } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .in('status', ['new_customer', 'negotiation']);

      if (currentLeads) {
        // Calculate metrics
        const newLeads = currentLeads.filter(l => l.status === 'new_lead').length;
        const conversions = currentLeads.filter(l => l.status === 'won' || l.status === 'delivered').length;
        const totalLeads = currentLeads.length;
        const conversionRate = totalLeads > 0 ? Math.round((conversions / totalLeads) * 100) : 0;
        
        // Calculate average budget
        const leadsWithBudget = currentLeads.filter(l => {
          if (l.payment_type === 'monthly') return l.monthly_budget > 0;
          if (l.payment_type === 'cash') return l.total_budget > 0;
          return false;
        });
        
        const averageBudget = leadsWithBudget.length > 0 
          ? Math.round(leadsWithBudget.reduce((sum, lead) => {
              return sum + (lead.payment_type === 'monthly' ? lead.monthly_budget : lead.total_budget);
            }, 0) / leadsWithBudget.length)
          : 0;

        setKpi({
          newLeads,
          previousLeads: previousLeadsCount || 0,
          activePipeline: activePipelineCount || 0,
          conversions,
          conversionRate,
          averageBudget
        });
      }
      
      setLoading(false);
    }

    fetchKPIs();
  }, [year, months]);

  const formatBudget = (amount: number) =>
    amount >= 1000 ? `${Math.round(amount / 1000)}K` : amount.toString();

  const getGrowthIndicator = () => {
    if (kpi.previousLeads === 0) return '';
    const growth = kpi.newLeads - kpi.previousLeads;
    return growth > 0 ? `+${growth}` : growth < 0 ? `${growth}` : '0';
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 grid-cols-2">
        <div className="rounded-lg bg-gradient-to-br from-white/10 to-white/5 backdrop-blur p-3 border border-white/10 shadow-inner">
          <p className="text-[11px] text-white/60">New Leads</p>
          <p className="text-xl font-semibold text-white">{loading ? '—' : kpi.newLeads}</p>
          <p className="text-[8px] text-white/40">vs last year: {getGrowthIndicator()}</p>
        </div>
        <div className="rounded-lg bg-gradient-to-br from-white/10 to-white/5 backdrop-blur p-3 border border-white/10 shadow-inner">
          <p className="text-[11px] text-white/60">Active Pipeline</p>
          <p className="text-xl font-semibold text-white">{loading ? '—' : kpi.activePipeline}</p>
          <p className="text-[8px] text-white/40">In progress</p>
        </div>
        <div className="rounded-lg bg-gradient-to-br from-white/10 to-white/5 backdrop-blur p-3 border border-white/10 shadow-inner">
          <p className="text-[11px] text-white/60">Conversions</p>
          <p className="text-xl font-semibold text-white">{loading ? '—' : kpi.conversions}</p>
          <p className="text-[8px] text-white/40">Won + delivered</p>
        </div>
        <div className="rounded-lg bg-gradient-to-br from-white/10 to-white/5 backdrop-blur p-3 border border-white/10 shadow-inner">
          <p className="text-[11px] text-white/60">Conversion Rate</p>
          <p className="text-xl font-semibold text-white">{loading ? '—' : `${kpi.conversionRate}%`}</p>
          <p className="text-[8px] text-white/40">Success rate</p>
        </div>
      </div>
    </div>
  );
};

/* ---------------- Inventory KPI Cards ---------------- */
const InventoryKPICards: React.FC<{year:number; months:number[]}> = ({year, months}) => {
  const [kpiData, setKpiData] = useState({
    stockCars: 0,
    consignmentCars: 0,
    stockReserved: 0,
    consignmentReserved: 0,
    totalCars: 0,
    stockBoughtPeriod: 0,
    consignmentBoughtPeriod: 0
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchKPIData() {
      setLoading(true);
      try {
        // Calculate date range for period analysis
        let from: Date, to: Date;
        if (months.length > 0) {
          const firstMonth = Math.min(...months) - 1;
          const lastMonth = Math.max(...months) - 1;
          from = new Date(year, firstMonth, 1);
          to = new Date(year, lastMonth + 1, 0);
        } else {
          from = new Date(year, 0, 1);
          to = new Date(year, 11, 31);
        }

        // Fetch all cars with ownership type
        const { data: allCars } = await supabase
          .from('cars')
          .select('ownership_type, sale_status, status, created_at')
          .eq('status', 'inventory');

        if (allCars) {
          // Current inventory breakdown
          const stockCars = allCars.filter(c => 
            c.ownership_type === 'stock' && c.sale_status === 'available'
          ).length;
          
          const consignmentCars = allCars.filter(c => 
            c.ownership_type === 'consignment' && c.sale_status === 'available'
          ).length;
          
          const stockReserved = allCars.filter(c => 
            c.ownership_type === 'stock' && c.sale_status === 'reserved'
          ).length;
          
          const consignmentReserved = allCars.filter(c => 
            c.ownership_type === 'consignment' && c.sale_status === 'reserved'
          ).length;

          const totalCars = allCars.length;

          // Cars bought/added in selected period
          const stockBoughtPeriod = allCars.filter(c => {
            if (c.ownership_type === 'stock' && c.created_at) {
              const addedDate = new Date(c.created_at);
              return addedDate >= from && addedDate <= to;
            }
            return false;
          }).length;

          const consignmentBoughtPeriod = allCars.filter(c => {
            if (c.ownership_type === 'consignment' && c.created_at) {
              const addedDate = new Date(c.created_at);
              return addedDate >= from && addedDate <= to;
            }
            return false;
          }).length;

          setKpiData({
            stockCars,
            consignmentCars,
            stockReserved,
            consignmentReserved,
            totalCars,
            stockBoughtPeriod,
            consignmentBoughtPeriod
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

  return (
    <div className="grid gap-3 grid-cols-2">
      <div className="rounded-lg bg-gradient-to-br from-white/10 to-white/5 backdrop-blur p-3 border border-white/10 shadow-inner">
        <p className="text-[11px] text-white/60">Stock Cars</p>
        <p className="text-xl font-semibold text-white">{loading ? '—' : kpiData.stockCars}</p>
        <p className="text-[8px] text-white/40">Reserved: {kpiData.stockReserved}</p>
      </div>
      <div className="rounded-lg bg-gradient-to-br from-white/10 to-white/5 backdrop-blur p-3 border border-white/10 shadow-inner">
        <p className="text-[11px] text-white/60">Consignment Cars</p>
        <p className="text-xl font-semibold text-white">{loading ? '—' : kpiData.consignmentCars}</p>
        <p className="text-[8px] text-white/40">Reserved: {kpiData.consignmentReserved}</p>
      </div>
      <div className="rounded-lg bg-gradient-to-br from-white/10 to-white/5 backdrop-blur p-3 border border-white/10 shadow-inner">
        <p className="text-[11px] text-white/60">Total Cars</p>
        <p className="text-xl font-semibold text-white">{loading ? '—' : kpiData.totalCars}</p>
        <p className="text-[8px] text-white/40">All inventory</p>
      </div>
      <div className="rounded-lg bg-gradient-to-br from-white/10 to-white/5 backdrop-blur p-3 border border-white/10 shadow-inner">
        <p className="text-[11px] text-white/60">Added This Period</p>
        <p className="text-xl font-semibold text-white">
          {loading ? '—' : kpiData.stockBoughtPeriod + kpiData.consignmentBoughtPeriod}
        </p>
        <p className="text-[8px] text-white/40">
          S:{kpiData.stockBoughtPeriod} C:{kpiData.consignmentBoughtPeriod}
        </p>
      </div>
    </div>
  );
};

/* ---------------- Monthly Acquisitions Chart ---------------- */
const InventoryStatusChart: React.FC<{year:number; months:number[]}> = ({year, months}) => {
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchChartData() {
      setLoading(true);
      try {
        // Fetch all cars added to inventory in the selected year
        const { data: cars } = await supabase
          .from('cars')
          .select('ownership_type, created_at')
          .eq('status', 'inventory')
          .gte('created_at', new Date(year, 0, 1).toISOString())
          .lte('created_at', new Date(year, 11, 31).toISOString());

        if (cars) {
          // Create monthly data for all 12 months
          const monthlyData = [];
          for (let month = 1; month <= 12; month++) {
            const monthCars = cars.filter(car => {
              const carDate = new Date(car.created_at);
              return carDate.getMonth() + 1 === month;
            });

            const stockCars = monthCars.filter(c => c.ownership_type === 'stock').length;
            const consignmentCars = monthCars.filter(c => c.ownership_type === 'consignment').length;

            monthlyData.push({
              month: new Date(year, month - 1).toLocaleDateString('default', { month: 'short' }),
              stock: stockCars,
              consignment: consignmentCars,
              total: stockCars + consignmentCars
            });
          }

          setChartData(monthlyData);
        }
      } catch (error) {
        console.error('Error fetching chart data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchChartData();
  }, [year, months]);

  return (
    <div className="rounded-lg bg-black/70 backdrop-blur p-4 border border-white/10 h-[280px]">
      <h2 className="text-sm font-semibold text-white/80 mb-3">Monthly Acquisitions ({year})</h2>
      
      {loading ? (
        <div className="flex items-center justify-center h-48 text-white/50">Loading...</div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={chartData}>
            <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#ffffff60' }} />
            <YAxis tick={{ fontSize: 10, fill: '#ffffff60' }} />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'rgba(0,0,0,0.8)', 
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                color: '#ffffff'
              }} 
            />
            <Area dataKey="stock" stackId="1" fill="#ffffff80" name="Stock Cars" />
            <Area dataKey="consignment" stackId="1" fill="#ffffff40" name="Consignment Cars" />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};

/* ---------------- Model Demand Chart ---------------- */
const ModelDemandChart: React.FC<{year:number; months:number[]}> = ({year, months}) => {
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchDemandChart() {
      setLoading(true);
      try {
        // Calculate date range
        let from: Date, to: Date;
        if (months.length > 0) {
          const firstMonth = Math.min(...months) - 1;
          const lastMonth = Math.max(...months) - 1;
          from = new Date(year, firstMonth, 1);
          to = new Date(year, lastMonth + 1, 0);
        } else {
          from = new Date(year, 0, 1);
          to = new Date(year, 11, 31);
        }

        // Fetch leads and inventory
        const { data: leads } = await supabase
          .from('leads')
          .select('model_of_interest')
          .gte('created_at', from.toISOString().split('T')[0])
          .lte('created_at', to.toISOString().split('T')[0]);

        const { data: cars } = await supabase
          .from('cars')
          .select('model_family')
          .eq('status', 'inventory')
          .eq('sale_status', 'available');

                 if (leads && cars) {
           // Count demand by model of interest
           const demandCount: Record<string, number> = {};
           leads.forEach(lead => {
             if (lead.model_of_interest) {
               demandCount[lead.model_of_interest] = (demandCount[lead.model_of_interest] || 0) + 1;
             }
           });

           // Create chart data for top 5 demanded models
           const chartData = Object.entries(demandCount)
             .sort(([,a], [,b]) => b - a)
             .slice(0, 5)
             .map(([demandedModel, demand]) => {
               // Match based on model_family from inventory
               const matchingSupply = cars.filter(car => {
                 if (!car.model_family) return false;
                 
                 // Case-insensitive matching - check if model_family matches the demanded model
                 const modelFamily = car.model_family.toUpperCase();
                 const requestedModel = demandedModel.toUpperCase();
                 
                 // Direct match or contains match
                 return modelFamily === requestedModel || 
                        modelFamily.includes(requestedModel) ||
                        requestedModel.includes(modelFamily);
               }).length;

               return {
                 model: demandedModel.length > 8 ? demandedModel.slice(0, 8) + '...' : demandedModel,
                 demand,
                 supply: matchingSupply,
                 gap: demand - matchingSupply
               };
             });

           setChartData(chartData);
         }
      } catch (error) {
        console.error('Error fetching demand chart:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchDemandChart();
  }, [year, months]);

  return (
    <div className="rounded-lg bg-black/70 backdrop-blur p-4 border border-white/10 h-[280px]">
      <h2 className="text-sm font-semibold text-white/80 mb-3">Demand vs Supply</h2>
      
      {loading ? (
        <div className="flex items-center justify-center h-48 text-white/50">Loading...</div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData}>
            <XAxis dataKey="model" tick={{ fontSize: 10, fill: '#ffffff60' }} />
            <YAxis tick={{ fontSize: 10, fill: '#ffffff60' }} />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'rgba(0,0,0,0.8)', 
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                color: '#ffffff'
              }} 
            />
            <Bar dataKey="demand" fill="#ffffff80" name="Demand" />
            <Bar dataKey="supply" fill="#ffffff40" name="Supply" />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};


 