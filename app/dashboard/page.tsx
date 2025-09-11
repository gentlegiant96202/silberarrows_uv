"use client";
import React, { useEffect, useState, useRef } from 'react';



import SharedSalesDashboard from '@/components/shared/SalesDashboard';
import { supabase } from '@/lib/supabaseClient';
import { 
  SkeletonSalesDashboard, 
  SkeletonKPIGrid, 
  SkeletonChart, 
  SkeletonStockAge, 
  SkeletonLocationInsights, 
  SkeletonFunnel 
} from '@/components/shared/SkeletonLoaders';

import { useSalesData } from '@/lib/useSalesData';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import dayjs from 'dayjs';

// Sales Filter Component (connected to sales dashboard)
function SalesFilterInline({ salesYear, salesMonth, setSalesYear, setSalesMonth }: {
  salesYear: number;
  salesMonth: number;
  setSalesYear: (year: number) => void;
  setSalesMonth: (month: number) => void;
}) {
  return (
    <div className="flex items-center gap-3 px-3 py-2 backdrop-blur-md bg-gradient-to-r from-white/10 to-white/5 border border-white/10 rounded-lg shadow-inner">
      <div className="flex items-center gap-1.5">
        <span className="text-white/60 text-xs font-medium">Year:</span>
        <select
          value={salesYear}
          onChange={(e) => setSalesYear(Number(e.target.value))}
          className="bg-white/10 border border-white/20 text-white rounded px-2 py-1 text-xs focus:outline-none focus:border-white/40 backdrop-blur-sm"
        >
          {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
            <option key={year} value={year} className="bg-gray-800 text-white">{year}</option>
          ))}
        </select>
      </div>
      
      <div className="flex items-center gap-1.5">
        <span className="text-white/60 text-xs font-medium">Month:</span>
        <select
          value={salesMonth}
          onChange={(e) => setSalesMonth(Number(e.target.value))}
          className="bg-white/10 border border-white/20 text-white rounded px-2 py-1 text-xs focus:outline-none focus:border-white/40 backdrop-blur-sm"
        >
          {[
            { value: 1, label: 'January' },
            { value: 2, label: 'February' },
            { value: 3, label: 'March' },
            { value: 4, label: 'April' },
            { value: 5, label: 'May' },
            { value: 6, label: 'June' },
            { value: 7, label: 'July' },
            { value: 8, label: 'August' },
            { value: 9, label: 'September' },
            { value: 10, label: 'October' },
            { value: 11, label: 'November' },
            { value: 12, label: 'December' }
          ].map(month => (
            <option key={month.value} value={month.value} className="bg-gray-800 text-white">{month.label}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

// TypeScript interface for car data
interface CarData {
  ownership_type: string;
  sale_status: string;
  status: string;
  created_at: string;
  stock_age_days?: number | null;
  advertised_price_aed?: number;
  stock_number?: string;
  car_location?: string | null;
  id?: string;
  vehicle_model?: string;
  model_year?: number;
}

// Simple Cumulative Funnel Component
function CumulativeFunnel({ salesYear, salesMonth }: { salesYear: number; salesMonth: number }) {
  const STAGES = [
    { key: 'new_lead', label: 'New Lead', color: 'bg-slate-500' },
    { key: 'new_customer', label: 'New Appointment', color: 'bg-blue-500' },
    { key: 'negotiation', label: 'Negotiation', color: 'bg-yellow-500' },
    { key: 'won', label: 'Reserved', color: 'bg-green-500' },
    { key: 'delivered', label: 'Delivered', color: 'bg-purple-500' },
  ];

  const year = salesYear;
  const months = [salesMonth];
  const [funnelData, setFunnelData] = useState<any[]>([]);
  const [totalLeads, setTotalLeads] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchFunnelData() {
      setLoading(true);
      
      try {
        // Calculate date range based on filters
        let from: Date;
        let to: Date;
        
        if (months.length > 0) {
          const firstMonth = Math.min(...months) - 1;
          const lastMonth = Math.max(...months) - 1;
          from = new Date(year, firstMonth, 1);
          to = new Date(year, lastMonth + 1, 0);
        } else {
          from = new Date(year, 0, 1);
          to = new Date(year, 11, 31);
        }

        const response = await fetch(`/api/funnel-metrics?startDate=${from.toISOString().split('T')[0]}&endDate=${to.toISOString().split('T')[0]}`);
        const data = await response.json();
        
        if (data.error) {
          console.error('Funnel API Error:', data.error);
          setFunnelData([]);
          setTotalLeads(0);
        } else {
          setFunnelData(data.funnelData || []);
          setTotalLeads(data.totalLeads || 0);
        }
      } catch (error) {
        console.error('Error fetching funnel data:', error);
        setFunnelData([]);
        setTotalLeads(0);
      } finally {
        setLoading(false);
      }
    }

    fetchFunnelData();
  }, [salesYear, salesMonth]);

  const maxCount = Math.max(...funnelData.map(stage => stage.cumulative_count || 0), 1);

  return (
    <div className="rounded-lg bg-black/70 backdrop-blur p-4 border border-white/10 h-[260px] flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-white/80">Cumulative Lead Funnel</h2>
        <span className="text-xs text-white/50">
          {totalLeads} total leads
        </span>
      </div>
      
      <div className="space-y-2 flex-1">
        {STAGES.map((stage) => {
          const stageData = funnelData.find(s => s.stage === stage.key);
          const cumulativeCount = stageData?.cumulative_count || 0;
          const widthPercent = cumulativeCount > 0 ? (cumulativeCount / maxCount) * 100 : 0;

          return (
            <div key={stage.key} className="relative">
              <div className="w-full bg-white/10 rounded-lg h-8 relative overflow-hidden">
                {loading ? (
                  <div className="bg-white/30 h-8 rounded-lg animate-pulse absolute inset-0" style={{ width: '30%' }} />
                ) : (
                  <div
                    className="bg-white h-8 rounded-lg absolute inset-0 transition-all duration-700 ease-out flex items-center justify-between px-3"
                    style={{ 
                      width: `${Math.max(widthPercent, cumulativeCount > 0 ? 15 : 0)}%`
                    }}
                  >
                    <span className="text-sm font-semibold text-black">
                      {stage.label}
                    </span>
                    <span className="text-sm font-bold text-black">
                      {cumulativeCount}
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

  // Sales data hooks for the shared component
  const { 
    loading: salesLoading, 
    error: salesError, 
    fetchSalesMetrics, 
    submitSalesData, 
    deleteSalesData 
  } = useSalesData();

  // Sales dashboard state
  const [allSalesMetrics, setAllSalesMetrics] = useState<any[]>([]);
  const [allSalesTargets, setAllSalesTargets] = useState<any[]>([]);
  const hasFetchedInitialData = useRef(false);

  // Component-by-component optimistic loading states (top to bottom)
  const [componentLoading, setComponentLoading] = useState({
    salesDashboard: true,    // Top: Sales Dashboard  
    leadKPIs: true,          // Row 1: Lead KPIs
    inventoryKPIs: true,     // Row 1: Inventory KPIs  
    stockAge: true,          // Row 2: Stock Age Insights
    location: true,          // Row 3: Location Insights
    funnel: true,            // Row 4: Cumulative Funnel
    modelDemand: true,       // Row 4: Model Demand Chart
    stockAcquisitions: true, // Row 5: Stock Acquisitions
    consignmentAcqs: true,   // Row 5: Consignment Acquisitions
    acquisitionsTrend: true  // Row 6: Acquisitions Trend
  });
  
  // Legacy states for compatibility
  const [salesLoaded, setSalesLoaded] = useState(false);
  const [otherComponentsLoaded, setOtherComponentsLoaded] = useState(false);

  // Trend chart data
  const [trendData, setTrendData] = useState<any[]>([]);

  // Sales filter state
  const [salesYear, setSalesYear] = useState(new Date().getFullYear());
  const [salesMonth, setSalesMonth] = useState(new Date().getMonth() + 1);

  // Sales data fetching
  const fetchAllSalesTargets = async () => {
    try {
      const { data: salesTargets, error } = await supabase
        .from('sales_monthly_targets')
        .select('*')
        .order('year', { ascending: false })
        .order('month', { ascending: false });

      if (error) {
        console.error('Error fetching sales targets:', error);
        return [];
      }

      setAllSalesTargets(salesTargets || []);
      return salesTargets || [];
    } catch (error) {
      console.error('Error fetching sales targets:', error);
      return [];
    }
  };

  // Load sales data first, then other components
  useEffect(() => {
    if (!hasFetchedInitialData.current) {
      async function loadSalesData() {
        try {
          console.log('🚀 Loading sales metrics first...');
          
          // Add retry mechanism for fetch failures
          let retryCount = 0;
          const maxRetries = 2;
          
          const loadWithRetry = async () => {
            try {
              const [salesMetrics, salesTargets] = await Promise.all([
                fetchSalesMetrics(),
                fetchAllSalesTargets()
              ]);
              return { salesMetrics, salesTargets };
            } catch (error) {
              if (retryCount < maxRetries && error instanceof TypeError && error.message === 'fetch failed') {
                retryCount++;
                console.log(`🔄 Retry attempt ${retryCount}/${maxRetries} for sales data...`);
                await new Promise(resolve => setTimeout(resolve, 200)); // Brief delay before retry
                return loadWithRetry();
              }
              throw error;
            }
          };
          
          const { salesMetrics, salesTargets } = await loadWithRetry();
          
          setAllSalesMetrics(salesMetrics);
          setAllSalesTargets(salesTargets);
          hasFetchedInitialData.current = true;
          
          console.log('✅ Sales metrics loaded, starting progressive component loading...');
          setSalesLoaded(true);
          
          // Progressive top-to-bottom component loading
          const componentPriorities = [
            { key: 'salesDashboard', delay: 0 },    // Top: Sales Dashboard (already loaded)
            { key: 'leadKPIs', delay: 100 },        // Row 1: Lead KPIs  
            { key: 'inventoryKPIs', delay: 150 },   // Row 1: Inventory KPIs
            { key: 'stockAge', delay: 200 },        // Row 2: Stock Age Insights
            { key: 'location', delay: 250 },        // Row 3: Location Insights  
            { key: 'funnel', delay: 300 },          // Row 4: Cumulative Funnel
            { key: 'modelDemand', delay: 350 },     // Row 4: Model Demand Chart
            { key: 'stockAcquisitions', delay: 400 }, // Row 5: Stock Acquisitions
            { key: 'consignmentAcqs', delay: 450 },   // Row 5: Consignment Acquisitions  
            { key: 'acquisitionsTrend', delay: 500 }  // Row 6: Acquisitions Trend
          ];

          // Load each component progressively from top to bottom
          componentPriorities.forEach(({ key, delay }) => {
            setTimeout(() => {
              setComponentLoading(prev => ({ ...prev, [key]: false }));
              console.log(`✅ Dashboard: ${key} component loaded`);
            }, delay);
          });
          
          // Legacy compatibility
          setTimeout(() => {
            setOtherComponentsLoaded(true);
          }, 100);
          
        } catch (error) {
          console.error('❌ Error loading sales data after retries:', error);
          // Show detailed error info for debugging
          if (error instanceof Error) {
            console.error('Error name:', error.name);
            console.error('Error message:', error.message);
            console.error('Error stack:', error.stack);
          }
          // Still show components even if sales fails, but with empty data
          setAllSalesMetrics([]);
          setAllSalesTargets([]);
          setSalesLoaded(true);
          setOtherComponentsLoaded(true);
        }
      }

      loadSalesData();
    }
  }, []);

  // trend effect
  useEffect(() => {
    async function fetchTrend() {
      // Calculate date range based on filters (same logic as funnel)
      let from: Date;
      let to: Date;
      
      const months = [salesMonth];
      if (months.length > 0) {
        // When specific months are selected
        const firstMonth = Math.min(...months) - 1; // Convert to 0-based index
        const lastMonth = Math.max(...months) - 1;  // Convert to 0-based index
        
        from = new Date(salesYear, firstMonth, 1); // First day of first selected month
        to = new Date(salesYear, lastMonth + 1, 0); // Last day of last selected month
      } else {
        // When no months selected (show full year)
        from = new Date(salesYear, 0, 1);     // January 1st
        to = new Date(salesYear, 11, 31);     // December 31st
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
  }, [salesYear, salesMonth]);

  return (
    <main className="h-full overflow-y-auto no-scrollbar relative">
      {/* Dashboard Content - Always Visible */}
      <div className="p-4 text-white text-sm">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-lg font-semibold">Dashboard</h1>
          <div className="flex items-center gap-4">
            <a 
              href="/dashboard/gargash-report" 
              className="px-3 py-2 bg-black border border-white/20 hover:border-white/40 text-white text-sm font-semibold rounded-lg shadow-xl hover:shadow-2xl transition-all duration-300 flex items-center gap-3 hover:bg-white/5 group"
            >
              <span className="text-lg group-hover:scale-110 transition-transform duration-200">◼️</span>
              <span>Gargash Report</span>
            </a>
            <SalesFilterInline 
              salesYear={salesYear}
              salesMonth={salesMonth}
              setSalesYear={setSalesYear}
              setSalesMonth={setSalesMonth}
            />
          </div>
        </div>
        
        {/* Sales Dashboard Section - Priority Loading */}
        <div className="mb-6">
          {!salesLoaded ? (
            <div>
              <SkeletonSalesDashboard className="mb-4" />
              {/* Show subtle loading indicator during retries */}
              <div className="text-center text-white/40 text-xs">
                Loading sales data...
              </div>
            </div>
          ) : (
            <div className="animate-fadeIn">
              <SharedSalesDashboard 
                metrics={allSalesMetrics} 
                targets={allSalesTargets}
                loading={salesLoading}
                className="mb-4"
                salesYear={salesYear}
                salesMonth={salesMonth}
              />
            </div>
          )}
        </div>
        
        {/* Other Components - Progressive Loading with Skeletons */}
        {!otherComponentsLoaded ? (
          <>
            {/* Skeleton for KPI Cards */}
            <div className="grid gap-4 lg:grid-cols-2">
              <SkeletonKPIGrid />
              <SkeletonKPIGrid />
            </div>

            {/* Skeleton for Stock Age */}
            <div className="mt-4">
              <SkeletonStockAge />
            </div>

            {/* Skeleton for Location Insights */}
            <div className="mt-4">
              <SkeletonLocationInsights />
            </div>

            {/* Skeleton for Charts */}
            <div className="grid gap-4 mt-4 lg:grid-cols-2">
              <SkeletonFunnel />
              <SkeletonChart height="h-[260px]" />
            </div>

            {/* Skeleton for Acquisitions Charts */}
            <div className="mb-6">
              <div className="grid gap-4 lg:grid-cols-2 mb-4">
                <SkeletonChart height="h-[300px]" />
                <SkeletonChart height="h-[300px]" />
              </div>
              <SkeletonChart height="h-[320px]" />
            </div>
          </>
        ) : (
          <div>
            {/* Top row: Lead and Inventory KPIs */}
            <div className="grid gap-4 lg:grid-cols-2">
              {componentLoading.leadKPIs ? (
                <SkeletonKPIGrid />
              ) : (
                <div className="animate-fadeIn">
                  <LeadKPICards year={salesYear} months={[salesMonth]} />
                </div>
              )}
              {componentLoading.inventoryKPIs ? (
                <SkeletonKPIGrid />
              ) : (
                <div className="animate-fadeIn">
                  <InventoryKPICards year={salesYear} months={[salesMonth]} />
                </div>
              )}
            </div>

            {/* Second row: Stock Age Insights */}
            <div className="mt-4">
              {componentLoading.stockAge ? (
                <SkeletonStockAge />
              ) : (
                <div className="animate-fadeIn">
                  <StockAgeInsights year={salesYear} months={[salesMonth]} />
                </div>
              )}
            </div>

            {/* Location Insights */}
            <div className="mt-4">
              {componentLoading.location ? (
                <SkeletonLocationInsights />
              ) : (
                <div className="animate-fadeIn">
                  <LocationInsights year={salesYear} months={[salesMonth]} />
                </div>
              )}
            </div>

            {/* Third row: Charts and Analytics */}
            <div className="grid gap-4 mt-4 lg:grid-cols-2">
              <div className="lg:col-span-1">
                {componentLoading.funnel ? (
                  <SkeletonFunnel />
                ) : (
                  <div className="animate-fadeIn">
                    <CumulativeFunnel salesYear={salesYear} salesMonth={salesMonth} />
                  </div>
                )}
              </div>
              <div className="lg:col-span-1">
                {componentLoading.modelDemand ? (
                  <SkeletonChart height="h-[300px]" />
                ) : (
                  <div className="animate-fadeIn">
                    <ModelDemandChart year={salesYear} months={[salesMonth]} />
                  </div>
                )}
              </div>
            </div>

            {/* Acquisitions Charts Section */}
            <div className="mb-6">
              <div className="grid gap-4 lg:grid-cols-2 mb-4">
                {componentLoading.stockAcquisitions ? (
                  <SkeletonChart height="h-[300px]" />
                ) : (
                  <div className="animate-fadeIn">
                    <StockAcquisitionsChart year={salesYear} months={[salesMonth]} />
                  </div>
                )}
                {componentLoading.consignmentAcqs ? (
                  <SkeletonChart height="h-[300px]" />
                ) : (
                  <div className="animate-fadeIn">
                    <ConsignmentAcquisitionsChart year={salesYear} months={[salesMonth]} />
                  </div>
                )}
              </div>
              {componentLoading.acquisitionsTrend ? (
                <SkeletonChart height="h-[320px]" />
              ) : (
                <div className="animate-fadeIn">
                  <AcquisitionsTrendChart year={salesYear} months={[salesMonth]} />
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </main>
  );
}

/* ---------------- Lead KPI Cards ---------------- */
const LeadKPICards: React.FC<{year:number; months:number[]}> = ({year, months}) => {
  const [kpi, setKpi] = useState({
    totalLeads: 0,
    activePipeline: 0,
    conversions: 0,
    conversionRate: 0,
    averageBudget: 0
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchKPIs() {
      setLoading(true);
      
      // Calculate current period dates
      let currentFrom: Date, currentTo: Date;
      if (months.length > 0) {
        const first = Math.min(...months) - 1;
        const last = Math.max(...months) - 1;
        currentFrom = new Date(year, first, 1);
        currentTo = new Date(year, last + 1, 0);
      } else {
        currentFrom = new Date(year, 0, 1);
        currentTo = new Date(year, 11, 31);
      }

      // Fetch all leads for current period
      const { data: currentLeads } = await supabase
        .from('leads')
        .select('status, payment_type, monthly_budget, total_budget, created_at')
        .gte('created_at', currentFrom.toISOString().split('T')[0])
        .lte('created_at', currentTo.toISOString().split('T')[0]);

      // Fetch current active pipeline (all statuses except new_lead)
      const { count: activePipelineCount } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .in('status', ['new_customer', 'negotiation']);

      if (currentLeads) {
        // Calculate metrics
        const totalLeads = currentLeads.length;
        const conversions = currentLeads.filter(l => l.status === 'won' || l.status === 'delivered').length;
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
          totalLeads,
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

  return (
    <div className="space-y-4">
      <div className="grid gap-3 grid-cols-2">
        <div className="rounded-lg bg-gradient-to-br from-white/10 to-white/5 backdrop-blur p-3 border border-white/10 shadow-inner">
          <p className="text-sm text-white/60">Total Leads</p>
          <p className="text-xl font-semibold text-white">{loading ? '—' : kpi.totalLeads}</p>
          <p className="text-xs text-white/40">Current period</p>
        </div>
        <div className="rounded-lg bg-gradient-to-br from-white/10 to-white/5 backdrop-blur p-3 border border-white/10 shadow-inner">
          <p className="text-sm text-white/60">Active Pipeline</p>
          <p className="text-xl font-semibold text-white">{loading ? '—' : kpi.activePipeline}</p>
          <p className="text-xs text-white/40">In pipeline</p>
        </div>
        <div className="rounded-lg bg-gradient-to-br from-white/10 to-white/5 backdrop-blur p-3 border border-white/10 shadow-inner">
          <p className="text-sm text-white/60">Conversions</p>
          <p className="text-xl font-semibold text-white">{loading ? '—' : kpi.conversions}</p>
          <p className="text-xs text-white/40">Reserved + Delivered</p>
        </div>
        <div className="rounded-lg bg-gradient-to-br from-white/10 to-white/5 backdrop-blur p-3 border border-white/10 shadow-inner">
          <p className="text-sm text-white/60">Conversion Rate</p>
          <p className="text-xl font-semibold text-white">{loading ? '—' : `${kpi.conversionRate}%`}</p>
          <p className="text-xs text-white/40">Success rate</p>
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

        // Fetch current inventory data
        const { data: allCarsData } = await supabase
          .from('cars')
          .select('ownership_type, sale_status, status, created_at')
          .eq('status', 'inventory');
        const allCars = allCarsData as CarData[] || [];

        // Fetch ALL cars added in the selected period (regardless of current status)
        const { data: periodCarsData } = await supabase
          .from('cars')
          .select('ownership_type, created_at')
          .gte('created_at', from.toISOString().split('T')[0])
          .lte('created_at', to.toISOString().split('T')[0]);
        const periodCars = periodCarsData as CarData[] || [];

        if (allCars && periodCars) {
          // Current inventory breakdown
          const stockCars = allCars.filter((c: CarData) => 
            c.ownership_type === 'stock' && c.sale_status === 'available'
          ).length;
          
          const consignmentCars = allCars.filter((c: CarData) => 
            c.ownership_type === 'consignment' && c.sale_status === 'available'
          ).length;
          
          const stockReserved = allCars.filter((c: CarData) => 
            c.ownership_type === 'stock' && c.sale_status === 'reserved'
          ).length;
          
          const consignmentReserved = allCars.filter((c: CarData) => 
            c.ownership_type === 'consignment' && c.sale_status === 'reserved'
          ).length;

          // Total cars - only counting inventory status cars that are available
          const totalCars = allCars.filter((c: CarData) => c.sale_status === 'available').length;

          // Cars bought/added in selected period (ALL cars, regardless of current status)
          const stockBoughtPeriod = periodCars.filter((c: CarData) => 
            c.ownership_type === 'stock'
          ).length;

          const consignmentBoughtPeriod = periodCars.filter((c: CarData) => 
            c.ownership_type === 'consignment'
          ).length;

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
        <p className="text-sm text-white/60">Stock Cars</p>
        <p className="text-xl font-semibold text-white">{loading ? '—' : kpiData.stockCars}</p>
        <p className="text-xs text-white/40">Reserved: {kpiData.stockReserved}</p>
      </div>
      <div className="rounded-lg bg-gradient-to-br from-white/10 to-white/5 backdrop-blur p-3 border border-white/10 shadow-inner">
        <p className="text-sm text-white/60">Consignment Cars</p>
        <p className="text-xl font-semibold text-white">{loading ? '—' : kpiData.consignmentCars}</p>
        <p className="text-xs text-white/40">Reserved: {kpiData.consignmentReserved}</p>
      </div>
      <div className="rounded-lg bg-gradient-to-br from-white/10 to-white/5 backdrop-blur p-3 border border-white/10 shadow-inner">
        <p className="text-sm text-white/60">Total Cars</p>
        <p className="text-xl font-semibold text-white">{loading ? '—' : kpiData.totalCars}</p>
        <p className="text-xs text-white/40">In inventory</p>
      </div>
      <div className="rounded-lg bg-gradient-to-br from-white/10 to-white/5 backdrop-blur p-3 border border-white/10 shadow-inner">
        <p className="text-sm text-white/60">Added This Period</p>
        <p className="text-xl font-semibold text-white">
          {loading ? '—' : kpiData.stockBoughtPeriod + kpiData.consignmentBoughtPeriod}
        </p>
        <p className="text-xs text-white/40">
          S:{kpiData.stockBoughtPeriod} C:{kpiData.consignmentBoughtPeriod}
        </p>
      </div>
    </div>
  );
};

/* ---------------- Stock Age Insights ---------------- */
const StockAgeInsights: React.FC<{year:number; months:number[]}> = ({year, months}) => {
  const [ageData, setAgeData] = useState({
    stockAvgAge: 0,
    consignmentAvgAge: 0,
    freshCars: 0,
    agingCars: 0,
    oldCars: 0,
    stockFresh: 0,
    stockAging: 0,
    stockOld: 0,
    consignmentFresh: 0,
    consignmentAging: 0,
    consignmentOld: 0
  });
  const [loading, setLoading] = useState(false);
  const [showCarList, setShowCarList] = useState<{ type: string; cars: any[]; position: { x: number; y: number } } | null>(null);

  useEffect(() => {
    async function fetchStockAgeData() {
      setLoading(true);
      try {
        // Fetch cars data with proper module permissions
        const { data: cars, error } = await supabase
          .from('cars')
          .select('ownership_type, stock_age_days')
          .eq('status', 'inventory')
          .eq('sale_status', 'available')
          .not('stock_age_days', 'is', null);

        if (error) {
          console.error('❌ [Stock Age] Error fetching cars:', error);
          return;
        }

        if (cars) {
          // Separate by ownership type
          const stockCars = cars.filter((c: any) => c.ownership_type === 'stock');
          const consignmentCars = cars.filter((c: any) => c.ownership_type === 'consignment');

          // Calculate averages
          const stockAvgAge = stockCars.length > 0 
            ? Math.round(stockCars.reduce((sum: number, car: any) => sum + (car.stock_age_days || 0), 0) / stockCars.length)
            : 0;
          
          const consignmentAvgAge = consignmentCars.length > 0 
            ? Math.round(consignmentCars.reduce((sum: number, car: any) => sum + (car.stock_age_days || 0), 0) / consignmentCars.length)
            : 0;

          // Categorize by age ranges
          const categorizeByAge = (carList: any[]) => {
            const fresh = carList.filter(c => (c.stock_age_days || 0) < 60).length;
            const aging = carList.filter(c => (c.stock_age_days || 0) >= 60 && (c.stock_age_days || 0) < 90).length;
            const old = carList.filter(c => (c.stock_age_days || 0) >= 90).length;
            return { fresh, aging, old };
          };

          const stockAges = categorizeByAge(stockCars);
          const consignmentAges = categorizeByAge(consignmentCars);

          // Overall totals
          const freshCars = stockAges.fresh + consignmentAges.fresh;
          const agingCars = stockAges.aging + consignmentAges.aging;
          const oldCars = stockAges.old + consignmentAges.old;

          setAgeData({
            stockAvgAge,
            consignmentAvgAge,
            freshCars,
            agingCars,
            oldCars,
            stockFresh: stockAges.fresh,
            stockAging: stockAges.aging,
            stockOld: stockAges.old,
            consignmentFresh: consignmentAges.fresh,
            consignmentAging: consignmentAges.aging,
            consignmentOld: consignmentAges.old
          });
        }
      } catch (error) {
        console.error('Error fetching stock age data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchStockAgeData();
  }, [year, months]); // Update when filters change to refresh data

  const handleCategoryClick = async (category: 'fresh' | 'aging' | 'old', event: React.MouseEvent) => {
    try {
      const rect = event.currentTarget.getBoundingClientRect();
      const position = {
        x: rect.left + rect.width / 2, // Center horizontally
        y: rect.top - 10 // Position above the card
      };
      
      let minDays = 0;
      let maxDays = 0;
      let title = '';

      switch (category) {
        case 'fresh':
          minDays = 0;
          maxDays = 59;
          title = 'Fresh Cars (0-59 days)';
          break;
        case 'aging':
          minDays = 60;
          maxDays = 89;
          title = 'Aging Cars (60-89 days)';
          break;
        case 'old':
          minDays = 90;
          maxDays = 9999;
          title = 'Old Cars (90+ days)';
          break;
      }

      const { data: cars, error } = await supabase
        .from('cars')
        .select('id, stock_number, vehicle_model, model_year, ownership_type, stock_age_days, advertised_price_aed')
        .eq('status', 'inventory')
        .eq('sale_status', 'available')
        .gte('stock_age_days', minDays)
        .lte('stock_age_days', maxDays)
        .order('stock_age_days', { ascending: false });

      if (error) {
        console.error('Error fetching car list:', error);
        return;
      }

      setShowCarList({ type: title, cars: cars || [], position });
    } catch (error) {
      console.error('Error in handleCategoryClick:', error);
    }
  };

  return (
    <>
      <div className="rounded-lg bg-black/50 backdrop-blur p-4 border border-white/10">
        <h3 className="text-sm font-semibold text-white/80 mb-3">Stock Age Analysis</h3>
        <div className="grid gap-3 grid-cols-5">
          {/* Average Ages */}
          <div className="rounded-lg bg-white/10 backdrop-blur p-3 border border-white/10 shadow-inner">
            <p className="text-sm text-white/60">Stock Avg Age</p>
            <p className="text-lg font-semibold text-white">{loading ? '—' : `${ageData.stockAvgAge}`}</p>
            <p className="text-xs text-white/40">days</p>
          </div>
          <div className="rounded-lg bg-white/10 backdrop-blur p-3 border border-white/10 shadow-inner">
            <p className="text-sm text-white/60">Consignment Avg</p>
            <p className="text-lg font-semibold text-white">{loading ? '—' : `${ageData.consignmentAvgAge}`}</p>
            <p className="text-xs text-white/40">days</p>
          </div>
          
          {/* Age Categories - Clickable */}
          <div 
            className="rounded-lg bg-white/10 backdrop-blur p-3 border border-white/10 shadow-inner cursor-pointer hover:bg-white/20 transition-colors"
            onClick={(event) => handleCategoryClick('fresh', event)}
          >
            <p className="text-sm text-white/60">Fresh (0-59d)</p>
            <p className="text-lg font-semibold text-white">{loading ? '—' : ageData.freshCars}</p>
            <p className="text-xs text-white/40">S:{ageData.stockFresh} C:{ageData.consignmentFresh}</p>
          </div>
          <div 
            className="rounded-lg bg-white/10 backdrop-blur p-3 border border-white/10 shadow-inner cursor-pointer hover:bg-white/20 transition-colors"
            onClick={(event) => handleCategoryClick('aging', event)}
          >
            <p className="text-sm text-white/60">Aging (60-89d)</p>
            <p className="text-lg font-semibold text-white">{loading ? '—' : ageData.agingCars}</p>
            <p className="text-xs text-white/40">S:{ageData.stockAging} C:{ageData.consignmentAging}</p>
          </div>
          <div 
            className="rounded-lg bg-white/10 backdrop-blur p-3 border border-white/10 shadow-inner cursor-pointer hover:bg-white/20 transition-colors"
            onClick={(event) => handleCategoryClick('old', event)}
          >
            <p className="text-sm text-white/60">Old (90+ days)</p>
            <p className="text-lg font-semibold text-white">{loading ? '—' : ageData.oldCars}</p>
            <p className="text-xs text-white/40">S:{ageData.stockOld} C:{ageData.consignmentOld}</p>
          </div>
        </div>
      </div>

      {/* Stock Age Cars Overlay */}
      {showCarList && (
        <>
          {/* Backdrop to close overlay when clicked */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setShowCarList(null)}
          />
          
          {/* Overlay positioned above the clicked card */}
          <div 
            className="fixed z-50 bg-black/95 backdrop-blur-xl border border-white/20 rounded-lg shadow-2xl max-w-md w-80 max-h-96 overflow-hidden"
            style={{
              left: `${showCarList.position.x}px`,
              top: `${showCarList.position.y}px`,
              transform: 'translate(-50%, -100%)'
            }}
          >
            <div className="p-3 border-b border-white/10 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">
                {showCarList.type}
              </h3>
              <button 
                onClick={() => setShowCarList(null)}
                className="text-white/60 hover:text-white text-lg leading-none"
              >
                ✕
              </button>
            </div>
            <div className="p-3 overflow-y-auto max-h-80">
              {showCarList.cars.length === 0 ? (
                <p className="text-white/60 text-center py-4 text-sm">No cars found in this category</p>
              ) : (
                <div className="space-y-2">
                  {showCarList.cars.map((car) => (
                    <div key={car.id} className="bg-white/5 border border-white/10 rounded-lg p-2 hover:bg-white/10 transition-colors">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-white font-medium text-sm">{car.stock_number}</div>
                          <div className="text-white/70 text-xs">{car.model_year} {car.vehicle_model}</div>
                          <div className="text-white/50 text-xs">{car.ownership_type}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-white font-medium text-sm">AED {car.advertised_price_aed?.toLocaleString()}</div>
                          <div className="text-white/60 text-xs">{car.stock_age_days} days</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
};

/* ---------------- Stock Acquisitions Chart ---------------- */
const StockAcquisitionsChart: React.FC<{year:number; months:number[]}> = ({year, months}) => {
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchStockData() {
      setLoading(true);
      try {
        console.log(`🔍 [Stock] Fetching data for year: ${year}`);
        
        // Fetch cars data with proper module permissions
        const { data: cars, error } = await supabase
          .from('cars')
          .select('created_at, advertised_price_aed, stock_number')
          .eq('ownership_type', 'stock')
          .gte('created_at', `${year}-01-01`)
          .lte('created_at', `${year}-12-31T23:59:59`);

        if (error) {
          console.error('❌ [Stock] Query error:', error);
          return;
        }

        console.log(`✅ [Stock] Found ${cars?.length || 0} cars for ${year}`);

        if (cars) {
          const monthlyData = [];
          for (let month = 1; month <= 12; month++) {
            const monthCars = cars.filter(car => {
              const carDate = new Date(car.created_at);
              const carMonth = carDate.getMonth() + 1;
              return carMonth === month;
            });

            const count = monthCars.length;
            
            // Debug January specifically
            if (month === 1) {
              console.log(`📊 [Stock] January ${year} cars:`, count);
            }

            monthlyData.push({
              month: new Date(year, month - 1).toLocaleDateString('default', { month: 'short' }),
              count
            });
          }

          setChartData(monthlyData);
        }
      } catch (error) {
        console.error('💥 [Stock] Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchStockData();
  }, [year, months]);

  return (
    <div className="rounded-lg bg-black/70 backdrop-blur p-4 border border-white/10 h-[300px]">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-white/80">Stock Acquisitions ({year})</h2>
        <div className="flex items-center gap-4 text-xs text-white/50">
          <div className="flex items-center gap-1">
                        <div className="w-3 h-2 bg-white/80 rounded-sm"></div>
            <span>Count</span>
          </div>
        </div>
      </div>
      
      {loading ? (
        <div className="flex items-center justify-center h-48 text-white/50">Loading...</div>
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={chartData} margin={{ top: 20, right: 30, left: -10, bottom: 20 }}>
            <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#ffffff60' }} />
            <YAxis tick={{ fontSize: 10, fill: '#ffffff60' }} width={50} />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'rgba(0,0,0,0.9)', 
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '8px',
                color: '#ffffff'
              }} 
              formatter={(value: any, name: string) => {
                if (name === 'count') return [value, 'Cars Added'];
                return [value, name];
              }}
            />
            <Area dataKey="count" fill="url(#stockGradient)" stroke="#ffffff80" strokeWidth={2} name="count" />
            <defs>
              <linearGradient id="stockGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ffffff" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#ffffff" stopOpacity={0.1}/>
              </linearGradient>
            </defs>
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};

/* ---------------- Consignment Acquisitions Chart ---------------- */
const ConsignmentAcquisitionsChart: React.FC<{year:number; months:number[]}> = ({year, months}) => {
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchConsignmentData() {
      setLoading(true);
      try {
        console.log(`🔍 [Consignment] Fetching data for year: ${year}`);
        
        // Fetch cars data with proper module permissions
        const { data: cars, error } = await supabase
          .from('cars')
          .select('created_at, advertised_price_aed, stock_number')
          .eq('ownership_type', 'consignment')
          .gte('created_at', `${year}-01-01`)
          .lte('created_at', `${year}-12-31T23:59:59`);

        if (error) {
          console.error('❌ [Consignment] Query error:', error);
          return;
        }

        console.log(`✅ [Consignment] Found ${cars?.length || 0} cars for ${year}`);

        if (cars) {
          const monthlyData = [];
          for (let month = 1; month <= 12; month++) {
            const monthCars = cars.filter(car => {
              const carDate = new Date(car.created_at);
              const carMonth = carDate.getMonth() + 1;
              return carMonth === month;
            });

            const count = monthCars.length;
            
            // Debug January specifically
            if (month === 1) {
              console.log(`📊 [Consignment] January ${year} cars:`, count);
              if (count > 0) {
                console.log('🚗 [Consignment] January cars:', monthCars.map(c => c.stock_number));
              }
            }

            monthlyData.push({
              month: new Date(year, month - 1).toLocaleDateString('default', { month: 'short' }),
              count
            });
          }

          console.log('📈 [Consignment] Monthly data:', monthlyData);
          setChartData(monthlyData);
        }
      } catch (error) {
        console.error('💥 [Consignment] Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchConsignmentData();
  }, [year, months]);

  return (
    <div className="rounded-lg bg-black/70 backdrop-blur p-4 border border-white/10 h-[300px]">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-white/80">Consignment Acquisitions ({year})</h2>
        <div className="flex items-center gap-4 text-xs text-white/50">
          <div className="flex items-center gap-1">
            <div className="w-3 h-2 bg-white/60 rounded-sm"></div>
            <span>Count</span>
          </div>
        </div>
      </div>
      
      {loading ? (
        <div className="flex items-center justify-center h-48 text-white/50">Loading...</div>
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={chartData} margin={{ top: 20, right: 30, left: -10, bottom: 20 }}>
            <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#ffffff60' }} />
            <YAxis tick={{ fontSize: 10, fill: '#ffffff60' }} width={50} />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'rgba(0,0,0,0.9)', 
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '8px',
                color: '#ffffff'
              }} 
              formatter={(value: any, name: string) => {
                if (name === 'count') return [value, 'Cars Added'];
                return [value, name];
              }}
            />
            <Area dataKey="count" fill="url(#consignmentGradient)" stroke="#ffffff60" strokeWidth={2} name="count" />
            <defs>
              <linearGradient id="consignmentGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ffffff" stopOpacity={0.6}/>
                <stop offset="95%" stopColor="#ffffff" stopOpacity={0.05}/>
              </linearGradient>
            </defs>
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};

/* ---------------- Combined Acquisitions Trend Chart ---------------- */
const AcquisitionsTrendChart: React.FC<{year:number; months:number[]}> = ({year, months}) => {
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchTrendData() {
      setLoading(true);
      try {
        // Fetch cars data with proper module permissions  
        const { data: cars } = await supabase
          .from('cars')
          .select('ownership_type, created_at')
          .gte('created_at', new Date(year, 0, 1).toISOString())
          .lte('created_at', new Date(year, 11, 31).toISOString());

        if (cars) {
          const monthlyData = [];
          for (let month = 1; month <= 12; month++) {
            const monthCars = cars.filter(car => {
              const carDate = new Date(car.created_at);
              return carDate.getMonth() + 1 === month;
            });

            const stockCount = monthCars.filter(c => c.ownership_type === 'stock').length;
            const consignmentCount = monthCars.filter(c => c.ownership_type === 'consignment').length;
            const total = stockCount + consignmentCount;

            monthlyData.push({
              month: new Date(year, month - 1).toLocaleDateString('default', { month: 'short' }),
              stock: stockCount,
              consignment: consignmentCount,
              total
            });
          }

          setChartData(monthlyData);
        }
      } catch (error) {
        console.error('Error fetching trend data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchTrendData();
  }, [year, months]);

  return (
    <div className="rounded-lg bg-black/70 backdrop-blur p-4 border border-white/10 h-[320px]">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-white/80">Acquisitions Comparison Trend ({year})</h2>
        <div className="flex items-center gap-6 text-xs text-white/50">
          <div className="flex items-center gap-1">
            <div className="w-3 h-2 bg-white/80 rounded-sm"></div>
            <span>Stock</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-2 bg-white/40 rounded-sm"></div>
            <span>Consignment</span>
          </div>
        </div>
      </div>
      
      {loading ? (
        <div className="flex items-center justify-center h-48 text-white/50">Loading...</div>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={chartData} margin={{ top: 20, right: 30, left: -10, bottom: 20 }}>
            <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#ffffff60' }} />
            <YAxis tick={{ fontSize: 10, fill: '#ffffff60' }} width={50} />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'rgba(0,0,0,0.9)', 
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '8px',
                color: '#ffffff'
              }} 
              formatter={(value: any, name: string) => {
                if (name === 'stock') return [value, 'Stock Cars'];
                if (name === 'consignment') return [value, 'Consignment Cars'];
                return [value, name];
              }}
            />
            <Area dataKey="stock" stackId="1" fill="url(#stockTrendGradient)" stroke="#ffffff80" strokeWidth={2} name="stock" />
            <Area dataKey="consignment" stackId="1" fill="url(#consignmentTrendGradient)" stroke="#ffffff40" strokeWidth={2} name="consignment" />
            <defs>
              <linearGradient id="stockTrendGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ffffff" stopOpacity={0.6}/>
                <stop offset="95%" stopColor="#ffffff" stopOpacity={0.1}/>
              </linearGradient>
              <linearGradient id="consignmentTrendGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ffffff" stopOpacity={0.2}/>
                <stop offset="95%" stopColor="#ffffff" stopOpacity={0.05}/>
              </linearGradient>
            </defs>
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
              // Match based on model_family from inventory - EXACT MATCH ONLY
              const matchingSupply = cars.filter(car => {
                if (!car.model_family) return false;
                
                // Case-insensitive exact matching only
                const modelFamily = car.model_family.toUpperCase();
                const requestedModel = demandedModel.toUpperCase();
                
                // Only exact matches (removed problematic includes logic)
                return modelFamily === requestedModel;
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
    <div className="rounded-lg bg-black/70 backdrop-blur p-4 border border-white/10 h-[260px]">
      <h2 className="text-sm font-semibold text-white/80 mb-3">Demand vs Supply</h2>
      
      {loading ? (
        <div className="flex items-center justify-center h-48 text-white/50">Loading...</div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: -10, bottom: 20 }}>
            <XAxis dataKey="model" tick={{ fontSize: 10, fill: '#ffffff60' }} />
            <YAxis tick={{ fontSize: 10, fill: '#ffffff60' }} width={50} />
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

/* ---------------- Location Insights ---------------- */
const LocationInsights: React.FC<{year:number; months:number[]}> = ({year, months}) => {
  const [locationData, setLocationData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCarList, setShowCarList] = useState<{ location: string; cars: any[]; position: { x: number; y: number } } | null>(null);

  useEffect(() => {
    async function fetchLocationData() {
      setLoading(true);
      try {
        // Fetch cars data with proper module permissions
        const { data: cars, error } = await supabase
          .from('cars')
          .select('id, stock_number, vehicle_model, model_year, ownership_type, car_location, advertised_price_aed, stock_age_days')
          .eq('status', 'inventory')
          .eq('sale_status', 'available');

        if (error) {
          console.error('❌ [Location] Error fetching cars:', error);
          return;
        }

        if (cars) {
          // Define all possible locations
          const locations = ['SHOWROOM','YARD','STONE','CAR PARK','SHOWROOM 2','NOT ON SITE','GARGASH','IN SERVICE'];
          
          // Group cars by location
          const locationGroups: Record<string, any[]> = {};
          let unaccountedCars: any[] = [];

          // Initialize location groups
          locations.forEach(loc => {
            locationGroups[loc] = [];
          });

          // Categorize cars
          cars.forEach(car => {
            if (!car.car_location || car.car_location.trim() === '') {
              unaccountedCars.push(car);
            } else {
              const location = car.car_location.toUpperCase();
              if (locationGroups[location]) {
                locationGroups[location].push(car);
              } else {
                // Handle any unexpected locations
                locationGroups[location] = locationGroups[location] || [];
                locationGroups[location].push(car);
              }
            }
          });

          // Create data for cards - ALWAYS show all 9 cards (8 locations + unaccounted)
          const locationCards = [];
          
          // Add cards for each location (always show all 8 locations)
          locations.forEach(location => {
            const cars = locationGroups[location] || [];
            locationCards.push({
              location,
              count: cars.length,
              cars,
              type: 'location'
            });
          });

          // Always add unaccounted card (even if 0 cars)
          locationCards.push({
            location: 'UNACCOUNTED FOR',
            count: unaccountedCars.length,
            cars: unaccountedCars,
            type: 'unaccounted'
          });

          setLocationData(locationCards);
        }
      } catch (error) {
        console.error('Error fetching location data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchLocationData();
  }, [year, months]);

  const handleLocationClick = (locationCard: any, event: React.MouseEvent) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const position = {
      x: rect.left + rect.width / 2, // Center horizontally
      y: rect.top - 10 // Position above the card
    };
    
    setShowCarList({ 
      location: locationCard.location, 
      cars: locationCard.cars,
      position
    });
  };

  return (
    <>
      <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur border border-white/10 rounded-lg p-4">
        <h3 className="text-white text-sm font-semibold mb-4">📍 Vehicle Locations</h3>
        
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-white/50"></div>
          </div>
        ) : (
          <div className="flex gap-2">
            {locationData.map((locationCard) => (
              <div 
                key={locationCard.location}
                onClick={(event) => handleLocationClick(locationCard, event)}
                className={`cursor-pointer transition-all duration-200 rounded-lg p-2 border flex-1 ${
                  locationCard.type === 'unaccounted' 
                    ? 'bg-red-500/10 border-red-400/30 hover:bg-red-500/20 hover:border-red-400/50' 
                    : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                }`}
              >
                <div className="text-center">
                  <div className={`text-lg font-bold ${
                    locationCard.type === 'unaccounted' ? 'text-red-400' : 'text-white'
                  }`}>
                    {locationCard.count}
                  </div>
                  <div className={`text-[10px] font-medium ${
                    locationCard.type === 'unaccounted' ? 'text-red-300' : 'text-white/70'
                  }`}>
                    {locationCard.location}
                  </div>
                  <div className="text-[9px] text-white/40">
                    {locationCard.count === 1 ? 'vehicle' : 'vehicles'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Location Cars Overlay */}
      {showCarList && (
        <>
          {/* Backdrop to close overlay when clicked */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setShowCarList(null)}
          />
          
          {/* Overlay positioned above the clicked card */}
          <div 
            className="fixed z-50 bg-black/95 backdrop-blur-xl border border-white/20 rounded-lg shadow-2xl max-w-md w-80 max-h-96 overflow-hidden"
            style={{
              left: `${showCarList.position.x}px`,
              top: `${showCarList.position.y}px`,
              transform: 'translate(-50%, -100%)'
            }}
          >
            <div className="p-3 border-b border-white/10 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">
                📍 {showCarList.location}
              </h3>
              <button 
                onClick={() => setShowCarList(null)}
                className="text-white/60 hover:text-white text-lg leading-none"
              >
                ✕
              </button>
            </div>
            <div className="p-3 overflow-y-auto max-h-80">
              {showCarList.cars.length === 0 ? (
                <p className="text-white/60 text-center py-4 text-sm">No cars found at this location</p>
              ) : (
                <div className="space-y-2">
                  {showCarList.cars.map((car) => (
                    <div key={car.id} className="bg-white/5 border border-white/10 rounded-lg p-2 hover:bg-white/10 transition-colors">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-white font-medium text-sm">{car.stock_number}</div>
                          <div className="text-white/70 text-xs">{car.model_year} {car.vehicle_model}</div>
                          <div className="text-white/50 text-xs">{car.ownership_type}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-white font-medium text-sm">AED {car.advertised_price_aed?.toLocaleString()}</div>
                          <div className="text-white/60 text-xs">{car.stock_age_days || 0} days</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
};


 