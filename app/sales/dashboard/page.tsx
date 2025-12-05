"use client";
import React, { useState, useEffect } from 'react';

import RouteProtector from '@/components/shared/RouteProtector';
import SalesDataGrid from '@/components/sales/SalesDataGrid';
import SalesTargetsManager from '@/components/sales/SalesTargetsManager';
import { useSalesData } from '@/lib/useSalesData';
import { supabase } from '@/lib/supabaseClient';
import { Building2, Grid3X3, Target, TrendingUp, Calculator, Package, DollarSign, FileText } from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import dayjs from 'dayjs';

export default function SalesDashboard() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'grid' | 'targets'>('dashboard');
  const [allSalesMetrics, setAllSalesMetrics] = useState<any[]>([]);
  const [allSalesTargets, setAllSalesTargets] = useState<any[]>([]);
  
  const {
    loading,
    error,
    fetchSalesMetrics,
    submitSalesData,
    deleteSalesData
  } = useSalesData();

  const handleTabChange = (tab: string) => {
    setActiveTab(tab as 'dashboard' | 'grid' | 'targets');
  };

  const fetchAllSalesTargets = async () => {
    try {
      const { data: salesTargets, error } = await supabase
        .from('sales_monthly_targets')
        .select('*')
        .order('year', { ascending: false })
        .order('month', { ascending: false });
      
      if (error) {
        return [];
      }
      
      setAllSalesTargets(salesTargets || []);
      return salesTargets || [];
    } catch (error) {
      return [];
    }
  };

  const handleGridRefresh = async () => {
    try {
      const [salesMetrics, salesTargets] = await Promise.all([
        fetchSalesMetrics(),
        fetchAllSalesTargets()
      ]);
      setAllSalesMetrics(salesMetrics);
      setAllSalesTargets(salesTargets);
    } catch (error) {
    }
  };

  const handleSalesSubmitData = async (data: any) => {
    try {
      const success = await submitSalesData(data);
      if (success) {
        await handleGridRefresh();
      }
      return success;
    } catch (error) {
      return false;
    }
  };

  // Load data on component mount and tab change
  useEffect(() => {
    handleGridRefresh();
  }, [activeTab, fetchSalesMetrics]);

  return (
    <RouteProtector moduleName="accounts">
      <div className="min-h-screen bg-black">

        <div className="w-full">
          <div className="w-full px-4 py-4">
            {/* Navigation Tabs */}
            <div className="mb-6">
              <div className="flex space-x-1 bg-gray-900/50 p-1 rounded-lg border border-gray-700/50 backdrop-blur-sm">
                <button
                  onClick={() => handleTabChange('dashboard')}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                    activeTab === 'dashboard'
                      ? 'bg-gradient-to-r from-gray-600 to-gray-700 text-white shadow-md'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                  }`}
                >
                  <TrendingUp className="w-4 h-4" />
                  <span>Dashboard</span>
                </button>
                <button
                  onClick={() => handleTabChange('grid')}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                    activeTab === 'grid'
                      ? 'bg-gradient-to-r from-gray-600 to-gray-700 text-white shadow-md'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                  }`}
                >
                  <Grid3X3 className="w-4 h-4" />
                  <span>Data Grid</span>
                </button>
                <button
                  onClick={() => handleTabChange('targets')}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                    activeTab === 'targets'
                      ? 'bg-gradient-to-r from-gray-600 to-gray-700 text-white shadow-md'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                  }`}
                >
                  <Target className="w-4 h-4" />
                  <span>Targets</span>
                </button>
                <button
                  onClick={() => handleTabChange('accounting')}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                    activeTab === 'accounting'
                      ? 'bg-gradient-to-r from-gray-600 to-gray-700 text-white shadow-md'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  <span>Accounting</span>
                </button>
              </div>
            </div>

            {/* Loading State */}
            {loading && (
              <div className="mb-6 p-4 backdrop-blur-md bg-gradient-to-r from-blue-900/40 via-blue-800/30 to-blue-700/40 border border-blue-500/30 rounded-lg flex items-center space-x-3 shadow-lg">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-400/20 border-t-blue-400"></div>
                <span className="text-blue-100">Loading sales data...</span>
              </div>
            )}

            {/* Content */}
            <div className="space-y-6">
              {activeTab === 'dashboard' ? (
                <main className="text-white text-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h1 className="text-lg font-semibold">Sales Performance Dashboard</h1>
                  </div>
                  
                  {/* Top row: Sales KPI Cards */}
                  <div className="grid gap-4 lg:grid-cols-2">
                    {/* Left column */}
                    <SalesKPICards metrics={allSalesMetrics} />

                    {/* Right column */}
                    <SalesPerformanceCards metrics={allSalesMetrics} targets={allSalesTargets} />
                  </div>

                  {/* Charts Section */}
                  <div className="grid gap-4 mt-4 lg:grid-cols-2">
                    {/* Profit Trend Chart */}
                    <div className="lg:col-span-1">
                      <ProfitTrendChart metrics={allSalesMetrics} />
                    </div>

                    {/* Revenue vs Cost Chart */}
                    <div className="lg:col-span-1">
                      <RevenueVsCostChart metrics={allSalesMetrics} />
                    </div>
                  </div>

                  {/* Second row of charts */}
                  <div className="grid gap-4 mt-4 lg:grid-cols-2">
                    {/* Units Performance Chart */}
                    <div className="lg:col-span-1">
                      <UnitsPerformanceChart metrics={allSalesMetrics} />
                    </div>

                    {/* Marketing ROI Chart */}
                    <div className="lg:col-span-1">
                      <MarketingROIChart metrics={allSalesMetrics} />
                    </div>
                  </div>
                </main>
              ) : activeTab === 'grid' ? (
                <SalesDataGrid
                  metrics={allSalesMetrics}
                  targets={allSalesTargets}
                  onSubmit={handleSalesSubmitData}
                  onRefresh={handleGridRefresh}
                  onDelete={deleteSalesData}
                  loading={loading}
                  error={error}
                />
              ) : (
                <SalesTargetsManager
                  targets={allSalesTargets}
                  onRefresh={handleGridRefresh}
                  loading={loading}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </RouteProtector>
  );
}



/* ---------------- Sales KPI Cards ---------------- */
const SalesKPICards: React.FC<{metrics: any[]}> = ({ metrics }) => {
  const [kpi, setKpi] = useState({
    monthlyGrossProfit: 0,
    profitMargin: 0,
    yearlyGrossProfit: 0,
    totalUnitsSold: 0
  });

  useEffect(() => {
    if (metrics.length > 0) {
      // Get the latest entry for current metrics
      const latestMetric = metrics[0]; // Assuming sorted by date desc
      
      const monthlyGrossProfit = latestMetric.gross_profit_month_actual || 0;
      const monthlyGrossSales = latestMetric.gross_sales_month_actual || 0;
      const profitMargin = monthlyGrossSales > 0 ? (monthlyGrossProfit / monthlyGrossSales) * 100 : 0;
      
      setKpi({
        monthlyGrossProfit,
        profitMargin,
        yearlyGrossProfit: latestMetric.gross_profit_year_actual || 0,
        totalUnitsSold: latestMetric.total_units_sold_month || 0
      });
    }
  }, [metrics]);

  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat('en-AE', {
      style: 'currency',
      currency: 'AED',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 grid-cols-2">
        <div className="rounded-lg bg-gradient-to-br from-white/10 to-white/5 backdrop-blur p-3 border border-white/10 shadow-inner">
          <p className="text-[11px] text-white/60">Monthly Gross Profit</p>
          <p className="text-xl font-semibold text-white">{formatCurrency(kpi.monthlyGrossProfit)}</p>
          <p className="text-[8px] text-white/40">Month to date</p>
        </div>
        <div className="rounded-lg bg-gradient-to-br from-white/10 to-white/5 backdrop-blur p-3 border border-white/10 shadow-inner">
          <p className="text-[11px] text-white/60">Profit Margin</p>
          <p className="text-xl font-semibold text-white">{kpi.profitMargin.toFixed(1)}%</p>
          <p className="text-[8px] text-white/40">Monthly margin</p>
        </div>
        <div className="rounded-lg bg-gradient-to-br from-white/10 to-white/5 backdrop-blur p-3 border border-white/10 shadow-inner">
          <p className="text-[11px] text-white/60">Yearly Profit</p>
          <p className="text-xl font-semibold text-white">{formatCurrency(kpi.yearlyGrossProfit)}</p>
          <p className="text-[8px] text-white/40">Year to date</p>
        </div>
        <div className="rounded-lg bg-gradient-to-br from-white/10 to-white/5 backdrop-blur p-3 border border-white/10 shadow-inner">
          <p className="text-[11px] text-white/60">Units Sold</p>
          <p className="text-xl font-semibold text-white">{kpi.totalUnitsSold}</p>
          <p className="text-[8px] text-white/40">Cars sold MTD</p>
        </div>
      </div>
    </div>
  );
};

/* ---------------- Sales Performance Cards ---------------- */
const SalesPerformanceCards: React.FC<{metrics: any[], targets: any[]}> = ({ metrics, targets }) => {
  const [performance, setPerformance] = useState({
    targetAchievement: 0,
    marketingSpend: 0,
    averageProfitPerCar: 0,
    marketingEfficiency: 0
  });

  useEffect(() => {
    if (metrics.length > 0) {
      const latestMetric = metrics[0];
      
      setPerformance({
        targetAchievement: latestMetric.gross_profit_month_achieved_percentage || 0,
        marketingSpend: latestMetric.marketing_spend_month || 0,
        averageProfitPerCar: latestMetric.average_gross_profit_per_car_month || 0,
        marketingEfficiency: latestMetric.marketing_rate_against_gross_profit || 0
      });
    }
  }, [metrics, targets]);

  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat('en-AE', {
      style: 'currency',
      currency: 'AED',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);

  return (
    <div className="grid gap-3 grid-cols-2">
      <div className="rounded-lg bg-gradient-to-br from-white/10 to-white/5 backdrop-blur p-3 border border-white/10 shadow-inner">
        <p className="text-[11px] text-white/60">Target Achievement</p>
        <p className="text-xl font-semibold text-white">{performance.targetAchievement.toFixed(1)}%</p>
        <p className="text-[8px] text-white/40">vs monthly target</p>
      </div>
      <div className="rounded-lg bg-gradient-to-br from-white/10 to-white/5 backdrop-blur p-3 border border-white/10 shadow-inner">
        <p className="text-[11px] text-white/60">Marketing Spend</p>
        <p className="text-xl font-semibold text-white">{formatCurrency(performance.marketingSpend)}</p>
        <p className="text-[8px] text-white/40">This month</p>
      </div>
      <div className="rounded-lg bg-gradient-to-br from-white/10 to-white/5 backdrop-blur p-3 border border-white/10 shadow-inner">
        <p className="text-[11px] text-white/60">Avg Profit/Car</p>
        <p className="text-xl font-semibold text-white">{formatCurrency(performance.averageProfitPerCar)}</p>
        <p className="text-[8px] text-white/40">Per unit sold</p>
      </div>
      <div className="rounded-lg bg-gradient-to-br from-white/10 to-white/5 backdrop-blur p-3 border border-white/10 shadow-inner">
        <p className="text-[11px] text-white/60">Marketing Rate</p>
        <p className="text-xl font-semibold text-white">{performance.marketingEfficiency.toFixed(1)}%</p>
        <p className="text-[8px] text-white/40">vs gross profit</p>
      </div>
    </div>
  );
};

/* ---------------- Profit Trend Chart ---------------- */
const ProfitTrendChart: React.FC<{metrics: any[]}> = ({ metrics }) => {
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    if (metrics.length > 0) {
      const sortedMetrics = [...metrics].sort((a, b) => 
        new Date(a.metric_date).getTime() - new Date(b.metric_date).getTime()
      );

      const data = sortedMetrics.map(metric => ({
        date: dayjs(metric.metric_date).format('MMM DD'),
        profit: metric.gross_profit_month_actual || 0,
        target: metric.gross_profit_month_target || 0
      }));

      setChartData(data);
    }
  }, [metrics]);

  return (
    <div className="rounded-lg bg-black/70 backdrop-blur p-4 border border-white/10 h-[300px]">
      <h2 className="text-sm font-semibold text-white/80 mb-3">Monthly Profit Trend</h2>
      
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={chartData}>
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#ffffff60' }} />
          <YAxis tick={{ fontSize: 10, fill: '#ffffff60' }} />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'rgba(0,0,0,0.9)', 
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '8px',
              color: '#ffffff'
            }} 
          />
          <Line dataKey="profit" stroke="#ffffff80" strokeWidth={2} name="Actual Profit" />
          <Line dataKey="target" stroke="#ffffff40" strokeWidth={2} strokeDasharray="5 5" name="Target" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

/* ---------------- Revenue vs Cost Chart ---------------- */
const RevenueVsCostChart: React.FC<{metrics: any[]}> = ({ metrics }) => {
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    if (metrics.length > 0) {
      const sortedMetrics = [...metrics].sort((a, b) => 
        new Date(a.metric_date).getTime() - new Date(b.metric_date).getTime()
      );

      const data = sortedMetrics.map(metric => ({
        date: dayjs(metric.metric_date).format('MMM DD'),
        revenue: metric.gross_sales_month_actual || 0,
        cost: metric.cost_of_sales_month_actual || 0
      }));

      setChartData(data);
    }
  }, [metrics]);

  return (
    <div className="rounded-lg bg-black/70 backdrop-blur p-4 border border-white/10 h-[300px]">
      <h2 className="text-sm font-semibold text-white/80 mb-3">Revenue vs Cost Analysis</h2>
      
      <ResponsiveContainer width="100%" height={240}>
        <AreaChart data={chartData}>
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#ffffff60' }} />
          <YAxis tick={{ fontSize: 10, fill: '#ffffff60' }} />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'rgba(0,0,0,0.9)', 
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '8px',
              color: '#ffffff'
            }} 
          />
          <Area dataKey="revenue" stackId="1" fill="url(#revenueGradient)" stroke="#ffffff80" strokeWidth={2} name="Revenue" />
          <Area dataKey="cost" stackId="2" fill="url(#costGradient)" stroke="#ffffff40" strokeWidth={2} name="Cost" />
          <defs>
            <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ffffff" stopOpacity={0.6}/>
              <stop offset="95%" stopColor="#ffffff" stopOpacity={0.1}/>
            </linearGradient>
            <linearGradient id="costGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ffffff" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#ffffff" stopOpacity={0.05}/>
            </linearGradient>
          </defs>
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

/* ---------------- Units Performance Chart ---------------- */
const UnitsPerformanceChart: React.FC<{metrics: any[]}> = ({ metrics }) => {
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    if (metrics.length > 0) {
      const sortedMetrics = [...metrics].sort((a, b) => 
        new Date(a.metric_date).getTime() - new Date(b.metric_date).getTime()
      );

      const data = sortedMetrics.map(metric => ({
        date: dayjs(metric.metric_date).format('MMM DD'),
        stock: metric.units_sold_stock_month || 0,
        consignment: metric.units_sold_consignment_month || 0
      }));

      setChartData(data);
    }
  }, [metrics]);

  return (
    <div className="rounded-lg bg-black/70 backdrop-blur p-4 border border-white/10 h-[300px]">
      <h2 className="text-sm font-semibold text-white/80 mb-3">Units Sales Performance</h2>
      
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={chartData}>
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#ffffff60' }} />
          <YAxis tick={{ fontSize: 10, fill: '#ffffff60' }} />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'rgba(0,0,0,0.9)', 
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '8px',
              color: '#ffffff'
            }} 
          />
          <Bar dataKey="stock" fill="#ffffff80" name="Stock" />
          <Bar dataKey="consignment" fill="#ffffff40" name="Consignment" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

/* ---------------- Marketing ROI Chart ---------------- */
const MarketingROIChart: React.FC<{metrics: any[]}> = ({ metrics }) => {
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    if (metrics.length > 0) {
      const sortedMetrics = [...metrics].sort((a, b) => 
        new Date(a.metric_date).getTime() - new Date(b.metric_date).getTime()
      );

      const data = sortedMetrics.map(metric => ({
        date: dayjs(metric.metric_date).format('MMM DD'),
        marketingSpend: metric.marketing_spend_month || 0,
        grossProfit: metric.gross_profit_month_actual || 0,
        roi: metric.gross_profit_month_actual && metric.marketing_spend_month ? 
          (metric.gross_profit_month_actual / metric.marketing_spend_month) : 0
      }));

      setChartData(data);
    }
  }, [metrics]);

  return (
    <div className="rounded-lg bg-black/70 backdrop-blur p-4 border border-white/10 h-[300px]">
      <h2 className="text-sm font-semibold text-white/80 mb-3">Marketing ROI Analysis</h2>
      
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={chartData}>
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#ffffff60' }} />
          <YAxis tick={{ fontSize: 10, fill: '#ffffff60' }} />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'rgba(0,0,0,0.9)', 
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '8px',
              color: '#ffffff'
            }} 
          />
          <Line dataKey="roi" stroke="#ffffff80" strokeWidth={2} name="ROI Ratio" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}; 