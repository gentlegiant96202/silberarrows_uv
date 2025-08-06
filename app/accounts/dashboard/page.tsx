"use client";
import React, { useState, useEffect } from 'react';
import Header from '@/components/shared/header/Header';
import RouteProtector from '@/components/shared/RouteProtector';
import ServiceDataGrid from '@/components/service/ServiceDataGrid';
import ServiceTargetsManager from '@/components/service/ServiceTargetsManager';
import SalesDataGrid from '@/components/sales/SalesDataGrid';
import SalesTargetsManager from '@/components/sales/SalesTargetsManager';
import { useServiceData } from '@/lib/useServiceData';
import { useSalesData } from '@/lib/useSalesData';
import { supabase } from '@/lib/supabaseClient';
import { Building2, Grid3X3, Target, TrendingUp, Calculator, Package, DollarSign } from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, LineChart, Line, ComposedChart, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import dayjs from 'dayjs';

export default function AccountsDashboard() {

  const [activeTab, setActiveTab] = useState<'service' | 'sales' | 'leasing'>('service');
  const [serviceSubTab, setServiceSubTab] = useState<'grid' | 'targets'>('grid');
  const [salesSubTab, setSalesSubTab] = useState<'dashboard' | 'grid' | 'targets'>('dashboard');
  const [allMetrics, setAllMetrics] = useState<any[]>([]);
  const [allTargets, setAllTargets] = useState<any[]>([]);
  const [allSalesMetrics, setAllSalesMetrics] = useState<any[]>([]);
  const [allSalesTargets, setAllSalesTargets] = useState<any[]>([]);
  
  // Sales filter state
  const [salesYear, setSalesYear] = useState(new Date().getFullYear());
  const [salesMonth, setSalesMonth] = useState(new Date().getMonth() + 1);

  // Service data hooks
  const { 
    loading, 
    submitting, 
    error, 
    submitInputData, 
    fetchAllMetrics, 
    fetchMetricsRange, 
    deleteMetricsForDate 
  } = useServiceData(new Date().toISOString().split('T')[0]);

  // Sales data hooks with filters
  const { 
    loading: salesLoading, 
    error: salesError, 
    fetchSalesMetrics, 
    submitSalesData, 
    deleteSalesData 
  } = useSalesData();



  const handleTabChange = (tab: string) => {
    setActiveTab(tab as 'service' | 'sales' | 'leasing');
  };

  const handleSubmitData = async (data: any) => {
    try {
      const success = await submitInputData(data);
      if (success) {
        await handleGridRefresh();
      }
      return success;
    } catch (error) {
      console.error('Error submitting data:', error);
      return false;
    }
  };

  const fetchAllTargets = async () => {
    try {
      const { data: targets, error } = await supabase
        .from('service_monthly_targets')
        .select('*')
        .order('year', { ascending: false })
        .order('month', { ascending: false });
      
      if (error) {
        console.error('Error fetching targets:', error);
        return [];
      }
      
      setAllTargets(targets || []);
      return targets || [];
    } catch (error) {
      console.error('Error fetching targets:', error);
      return [];
    }
  };

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

  const handleGridRefresh = async () => {
    if (activeTab === 'service') {
      try {
        const [metrics, targets] = await Promise.all([
          fetchAllMetrics(),
          fetchAllTargets()
        ]);
        setAllMetrics(metrics);
        setAllTargets(targets);
      } catch (error) {
        console.error('Error refreshing service data:', error);
      }
    } else if (activeTab === 'sales') {
      try {
        const [salesMetrics, salesTargets] = await Promise.all([
          fetchSalesMetrics(),
          fetchAllSalesTargets()
        ]);
        setAllSalesMetrics(salesMetrics);
        setAllSalesTargets(salesTargets);
      } catch (error) {
        console.error('Error refreshing sales data:', error);
      }
    }
  };

  const handleServiceSubTabChange = async (tab: 'grid' | 'targets') => {
    setServiceSubTab(tab);
    if (tab === 'grid') {
      await handleGridRefresh();
    } else if (tab === 'targets') {
      await handleGridRefresh();
    }
  };

  const handleFetchMetricsRange = async (filter: any) => {
    if (filter.startDate && filter.endDate) {
      return await fetchMetricsRange(filter.startDate, filter.endDate);
    }
    return [];
  };

  const handleSalesSubTabChange = async (tab: 'dashboard' | 'grid' | 'targets') => {
    setSalesSubTab(tab);
    await handleGridRefresh();
  };

  const handleSalesSubmitData = async (data: any) => {
    try {
      const success = await submitSalesData(data);
      if (success) {
        await handleGridRefresh();
      }
      return success;
    } catch (error) {
      console.error('Error submitting sales data:', error);
      return false;
    }
  };

  // Load grid data on component mount and tab change
  useEffect(() => {
    handleGridRefresh();
  }, [activeTab, fetchAllMetrics, fetchSalesMetrics]);



  return (
    <RouteProtector moduleName="accounts">
      <div className="min-h-screen bg-black">
        <Header activeTab={activeTab} onTabChange={handleTabChange} />
        <div className="w-full">
          <div className="w-full px-4 py-4">
            

            {/* Service Sub-Navigation */}
            {activeTab === 'service' && (
              <div className="mb-6">
                <div className="flex space-x-1 bg-gray-900/50 p-1 rounded-lg border border-gray-700/50 backdrop-blur-sm">

                  <button
                    onClick={() => handleServiceSubTabChange('grid')}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                      serviceSubTab === 'grid'
                        ? 'bg-gradient-to-r from-gray-600 to-gray-700 text-white shadow-md'
                        : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                    }`}
                  >
                    <Grid3X3 className="w-4 h-4" />
                    <span>Data Grid</span>
                  </button>
                  <button
                    onClick={() => handleServiceSubTabChange('targets')}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                      serviceSubTab === 'targets'
                        ? 'bg-gradient-to-r from-gray-600 to-gray-700 text-white shadow-md'
                        : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                    }`}
                  >
                    <Target className="w-4 h-4" />
                    <span>Targets</span>
                  </button>
                </div>
              </div>
            )}

            {/* Sales Sub-Navigation */}
            {activeTab === 'sales' && (
              <div className="mb-6">
                <div className="flex space-x-1 bg-gray-900/50 p-1 rounded-lg border border-gray-700/50 backdrop-blur-sm">

                  <button
                    onClick={() => handleSalesSubTabChange('dashboard')}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                      salesSubTab === 'dashboard'
                        ? 'bg-gradient-to-r from-gray-600 to-gray-700 text-white shadow-md'
                        : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                    }`}
                  >
                    <TrendingUp className="w-4 h-4" />
                    <span>Dashboard</span>
                  </button>
                  <button
                    onClick={() => handleSalesSubTabChange('grid')}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                      salesSubTab === 'grid'
                        ? 'bg-gradient-to-r from-gray-600 to-gray-700 text-white shadow-md'
                        : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                    }`}
                  >
                    <Grid3X3 className="w-4 h-4" />
                    <span>Data Grid</span>
                  </button>
                  <button
                    onClick={() => handleSalesSubTabChange('targets')}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                      salesSubTab === 'targets'
                        ? 'bg-gradient-to-r from-gray-600 to-gray-700 text-white shadow-md'
                        : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                    }`}
                  >
                    <Target className="w-4 h-4" />
                    <span>Targets</span>
                  </button>
                </div>
              </div>
            )}

            {/* Loading State */}
            {/* The 'calculating' state is no longer destructured from useServiceData,
                so this block will always show loading if 'loading' is true.
                If 'loading' is false, it will show the content based on activeTab and serviceSubTab. */}
            {(loading || salesLoading) && (
              <div className="mb-6 p-4 backdrop-blur-md bg-gradient-to-r from-blue-900/40 via-blue-800/30 to-blue-700/40 border border-blue-500/30 rounded-lg flex items-center space-x-3 shadow-lg">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-400/20 border-t-blue-400"></div>
                <span className="text-blue-100">
                  {activeTab === 'sales' ? 'Loading sales data...' : 'Loading service data...'}
                </span>
              </div>
            )}

            {/* Content */}
            <div className="space-y-6">
              {activeTab === 'service' ? (
                <>

                  {serviceSubTab === 'grid' && (
                    <ServiceDataGrid
                      metrics={allMetrics}
                      targets={allTargets}
                      onSubmit={handleSubmitData}
                      onRefresh={handleGridRefresh}
                      onDelete={deleteMetricsForDate}
                      loading={loading}
                      submitting={submitting}
                      error={error}
                    />
                  )}
                  {serviceSubTab === 'targets' && (
                    <ServiceTargetsManager
                      targets={allTargets}
                      onRefresh={handleGridRefresh}
                      loading={loading}
                    />
                  )}
                </>
              ) : activeTab === 'sales' ? (
                <>
                  {salesSubTab === 'dashboard' && (
                    <main className="text-white text-sm">
                      <div className="flex items-center justify-between mb-6">
                        <h1 className="text-lg font-semibold">Sales Performance Dashboard</h1>
                        
                        {/* Inline Sales Filter Bar */}
                        <div className="flex items-center gap-4 p-3 backdrop-blur-md bg-gradient-to-r from-white/10 to-white/5 border border-white/10 rounded-xl shadow-inner">
                          <div className="flex items-center gap-2">
                            <span className="text-white/60 text-sm font-medium">Year:</span>
                            <select
                              value={salesYear}
                              onChange={(e) => setSalesYear(Number(e.target.value))}
                              className="bg-white/10 border border-white/20 text-white rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-white/40 backdrop-blur-sm"
                            >
                              {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
                                <option key={year} value={year} className="bg-gray-800 text-white">{year}</option>
                              ))}
                            </select>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <span className="text-white/60 text-sm font-medium">Month:</span>
                            <select
                              value={salesMonth}
                              onChange={(e) => setSalesMonth(Number(e.target.value))}
                              className="bg-white/10 border border-white/20 text-white rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-white/40 backdrop-blur-sm"
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
                          
                          <div className="text-white/40 text-xs">
                            {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][salesMonth - 1]} {salesYear}
                          </div>
                        </div>
                      </div>
                      
                        {/* Top row: Sales KPI Cards */}
                        <div className="grid gap-4 lg:grid-cols-2">
                          {/* Left column */}
                          <SalesKPICards 
                            metrics={allSalesMetrics} 
                            targets={allSalesTargets}
                            selectedYear={salesYear}
                            selectedMonth={salesMonth}
                          />

                          {/* Right column */}
                          <SalesPerformanceCards 
                            metrics={allSalesMetrics} 
                            targets={allSalesTargets}
                            selectedYear={salesYear}
                            selectedMonth={salesMonth}
                          />
                        </div>

                      {/* Charts Section */}
                      <div className="grid gap-4 mt-4 lg:grid-cols-2">
                        {/* Profit Trend Chart */}
                        <div className="lg:col-span-1">
                          <DailyCumulativeProgressChart 
                            metrics={allSalesMetrics} 
                            targets={allSalesTargets}
                            selectedYear={salesYear}
                            selectedMonth={salesMonth}
                          />
                        </div>

                        {/* Revenue vs Cost Chart */}
                        <div className="lg:col-span-1">
                          <CumulativeYearlyTargetChart 
                            metrics={allSalesMetrics} 
                            targets={allSalesTargets}
                            selectedYear={salesYear}
                          />
                        </div>
                      </div>
                    </main>
                  )}
                  {salesSubTab === 'grid' && (
                    <SalesDataGrid
                      metrics={allSalesMetrics}
                      targets={allSalesTargets}
                      onSubmit={handleSalesSubmitData}
                      onRefresh={handleGridRefresh}
                      onDelete={deleteSalesData}
                      loading={salesLoading}
                      error={salesError}
                    />
                  )}
                  {salesSubTab === 'targets' && (
                    <SalesTargetsManager
                      targets={allSalesTargets}
                      onRefresh={handleGridRefresh}
                      loading={salesLoading}
                    />
                  )}
                </>
              ) : (
                // Coming Soon for Leasing
                <div className="flex items-center justify-center h-[calc(100vh-300px)]">
                  <div className="text-center">
                    <div className="w-32 h-32 mx-auto mb-8 bg-white/5 backdrop-blur border border-white/10 rounded-full flex items-center justify-center">
                      <Building2 className="w-16 h-16 text-white/20" />
                    </div>
                    <div className="text-6xl mb-4">🚧</div>
                    <h2 className="text-2xl font-semibold text-white mb-2">Coming Soon</h2>
                    <p className="text-white/70 max-w-md mx-auto">
                      The <span className="text-white font-semibold">{activeTab.toUpperCase()}</span> department analytics and tracking system is under development.
                    </p>
                    <div className="mt-6 text-sm text-white/50">
                      Available: Service Department ✓ | Sales Department ✓
                    </div>
                  </div>
                </div>
              )}
            </div>


          </div>
        </div>
      </div>
    </RouteProtector>
  );
}

/* ---------------- Sales KPI Cards ---------------- */
const SalesKPICards: React.FC<{metrics: any[], targets?: any[], selectedYear: number, selectedMonth: number}> = ({ metrics, targets = [], selectedYear, selectedMonth }) => {
  const [kpi, setKpi] = useState({
    monthlyGrossProfit: 0,
    monthlyTarget: 0,
    yearlyGrossProfit: 0,
    yearlyTarget: 0,
    totalUnitsSold: 0,
    stockUnitsSold: 0,
    consignmentUnitsSold: 0
  });

  useEffect(() => {
    if (metrics.length > 0 && targets.length > 0) {
      // Filter metrics and targets based on selected year and month
      const selectedMetric = metrics.find(m => {
        const metricDate = new Date(m.metric_date);
        return metricDate.getFullYear() === selectedYear && 
               metricDate.getMonth() + 1 === selectedMonth;
      });
      
      const selectedMonthTarget = targets.find(t => 
        t.year === selectedYear && t.month === selectedMonth
      );
      
      const selectedYearTargets = targets.filter(t => t.year === selectedYear);
      
      // Calculate totals for the selected year
      const yearlyMetrics = metrics.filter(m => {
        const metricDate = new Date(m.metric_date);
        return metricDate.getFullYear() === selectedYear;
      });
      
      const yearlyGrossProfit = yearlyMetrics.reduce((sum, m) => sum + (m.gross_profit_month_actual || 0), 0);
      
      // Get yearly target from any target record for the selected year (should be consistent)
      const yearlyTarget = selectedYearTargets.length > 0 ? 
        (selectedYearTargets[0].gross_profit_year_target || 0) : 0;
      
      setKpi({
        monthlyGrossProfit: selectedMetric?.gross_profit_month_actual || 0,
        monthlyTarget: selectedMonthTarget?.gross_profit_month_target || 0,
        yearlyGrossProfit: yearlyGrossProfit,
        yearlyTarget: yearlyTarget,
        totalUnitsSold: selectedMetric?.total_units_sold_month || 0,
        stockUnitsSold: selectedMetric?.units_sold_stock_month || 0,
        consignmentUnitsSold: selectedMetric?.units_sold_consignment_month || 0
      });
    }
  }, [metrics, targets, selectedYear, selectedMonth]);

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
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] text-white/60">Monthly Gross Profit</p>
              <p className="text-xl font-semibold text-white">{formatCurrency(kpi.monthlyGrossProfit)}</p>
              <p className="text-[8px] text-white/40">Month to date</p>
            </div>
            <div className="text-right">
              <p className="text-[11px] text-white/60">Units Sold</p>
              <p className="text-lg font-semibold text-white">{kpi.totalUnitsSold}</p>
              <p className="text-[8px] text-white/40">S:{kpi.stockUnitsSold} C:{kpi.consignmentUnitsSold}</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg bg-gradient-to-br from-white/10 to-white/5 backdrop-blur p-3 border border-white/10 shadow-inner">
          <p className="text-[11px] text-white/60">Monthly Target</p>
          <p className="text-xl font-semibold text-white">{formatCurrency(kpi.monthlyTarget)}</p>
          <p className="text-[8px] text-white/40">Current month goal</p>
        </div>
        <div className="rounded-lg bg-gradient-to-br from-white/10 to-white/5 backdrop-blur p-3 border border-white/10 shadow-inner">
          <p className="text-[11px] text-white/60">Yearly Profit</p>
          <p className="text-xl font-semibold text-white">{formatCurrency(kpi.yearlyGrossProfit)}</p>
          <p className="text-[8px] text-white/40">Year to date</p>
        </div>
        <div className="rounded-lg bg-gradient-to-br from-white/10 to-white/5 backdrop-blur p-3 border border-white/10 shadow-inner">
          <p className="text-[11px] text-white/60">Yearly Target</p>
          <p className="text-xl font-semibold text-white">{formatCurrency(kpi.yearlyTarget)}</p>
          <p className="text-[8px] text-white/40">Full year goal</p>
        </div>
      </div>
    </div>
  );
};

/* ---------------- Sales Performance Cards ---------------- */
const SalesPerformanceCards: React.FC<{metrics: any[], targets: any[], selectedYear: number, selectedMonth: number}> = ({ metrics, targets, selectedYear, selectedMonth }) => {
  const [performance, setPerformance] = useState({
    targetAchievement: 0,
    marketingSpend: 0,
    marketingRate: 0,
    yearlyAchievement: 0,
    avgProfitPerCar: 0
  });

  useEffect(() => {
    if (metrics.length > 0 && targets.length > 0) {
      // Filter data based on selected year and month
      const selectedMetric = metrics.find(m => {
        const metricDate = new Date(m.metric_date);
        return metricDate.getFullYear() === selectedYear && 
               metricDate.getMonth() + 1 === selectedMonth;
      });
      
      const selectedMonthTarget = targets.find(t => 
        t.year === selectedYear && t.month === selectedMonth
      );
      
      // Calculate yearly data for selected year
      const yearlyMetrics = metrics.filter(m => {
        const metricDate = new Date(m.metric_date);
        return metricDate.getFullYear() === selectedYear;
      });
      
      const yearlyGrossProfit = yearlyMetrics.reduce((sum, m) => sum + (m.gross_profit_month_actual || 0), 0);
      
      // Get yearly target from any target record for the selected year (should be consistent)
      const yearlyTargets = targets.filter(t => t.year === selectedYear);
      const yearlyTarget = yearlyTargets.length > 0 ? 
        (yearlyTargets[0].gross_profit_year_target || 0) : 0;
      
      // Monthly calculations
      const monthlyActual = selectedMetric?.gross_profit_month_actual || 0;
      const monthlyTarget = selectedMonthTarget?.gross_profit_month_target || 0;
      const targetAchievement = monthlyTarget > 0 ? (monthlyActual / monthlyTarget) * 100 : 0;
      
      // Yearly calculations  
      const yearlyAchievement = yearlyTarget > 0 ? (yearlyGrossProfit / yearlyTarget) * 100 : 0;
      
      // Marketing data for selected month
      const marketingSpend = selectedMetric?.marketing_spend_month || 0;
      const marketingRate = selectedMetric?.marketing_rate_against_gross_profit || 0;
      
      // Average profit per car for selected month
      const avgProfitPerCar = selectedMetric?.average_gross_profit_per_car_month || 0;
      
      setPerformance({
        targetAchievement: Math.round(targetAchievement),
        marketingSpend,
        marketingRate,
        yearlyAchievement: Math.round(yearlyAchievement),
        avgProfitPerCar
      });
    }
  }, [metrics, targets, selectedYear, selectedMonth]);

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
        <p className="text-[11px] text-white/60">Marketing</p>
        <p className="text-xl font-semibold text-white">{formatCurrency(performance.marketingSpend)}</p>
        <p className="text-[8px] text-white/40">Rate: {performance.marketingRate.toFixed(1)}%</p>
      </div>
      <div className="rounded-lg bg-gradient-to-br from-white/10 to-white/5 backdrop-blur p-3 border border-white/10 shadow-inner">
        <p className="text-[11px] text-white/60">Yearly Achievement</p>
        <p className="text-xl font-semibold text-white">{performance.yearlyAchievement.toFixed(1)}%</p>
        <p className="text-[8px] text-white/40">vs yearly target</p>
      </div>
      <div className="rounded-lg bg-gradient-to-br from-white/10 to-white/5 backdrop-blur p-3 border border-white/10 shadow-inner">
        <p className="text-[11px] text-white/60">Avg Profit/Car</p>
        <p className="text-xl font-semibold text-white">{formatCurrency(performance.avgProfitPerCar)}</p>
        <p className="text-[8px] text-white/40">Per unit sold</p>
      </div>
    </div>
  );
};

/* ---------------- Daily Cumulative Progress Chart ---------------- */
const DailyCumulativeProgressChart: React.FC<{metrics: any[], targets: any[], selectedYear: number, selectedMonth: number}> = ({ metrics, targets, selectedYear, selectedMonth }) => {
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    if (metrics.length > 0 && targets.length > 0) {
      // Use selected filters instead of current date
      const currentYear = selectedYear;
      const currentMonth = selectedMonth;
      
      // Find target for selected month
      const monthlyTarget = targets.find(t => t.year === currentYear && t.month === currentMonth);
      if (!monthlyTarget) return;

      // Use working days from target, fallback to days in month
      const workingDays = monthlyTarget.number_of_working_days || new Date(currentYear, currentMonth, 0).getDate();
      const monthlyTargetAmount = monthlyTarget.gross_profit_month_target || monthlyTarget.gross_profit_target || 0;
      
      // Daily target pace (target divided by working days)
      const dailyTargetPace = monthlyTargetAmount / workingDays;
      
      // Get all daily entries for the selected month and sort by date
      const monthlyMetrics = metrics
        .filter(m => {
          const metricDate = new Date(m.metric_date);
          return metricDate.getFullYear() === currentYear && 
                 metricDate.getMonth() + 1 === currentMonth;
        })
        .sort((a, b) => new Date(a.metric_date).getTime() - new Date(b.metric_date).getTime());
      
      // Build chart data for each working day
      const data = [];
      
      for (let day = 1; day <= workingDays; day++) {
        // Cumulative target pace up to this working day
        const cumulativeTargetPace = dailyTargetPace * day;
        
        // Find the daily entry for this working day (if it exists)
        const dayEntry = monthlyMetrics.find(m => {
          const metricDate = new Date(m.metric_date);
          return metricDate.getDate() === day || m.working_days_elapsed === day;
        });
        
        // Use the actual recorded value for this day
        const actualValue = dayEntry?.gross_profit_month_actual || null;
        
        data.push({
          day: `Day ${day}`,
          dayNumber: day,
          targetPace: Math.round(cumulativeTargetPace),
          actual: actualValue ? Math.round(actualValue) : null,
          isCurrentDay: !!dayEntry && day === (monthlyMetrics.length)
        });
      }
      
      setChartData(data);
    }
  }, [metrics, targets, selectedYear, selectedMonth]);

  return (
    <div className="bg-black/90 rounded-xl border border-white/20 p-6 shadow-2xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div>
            <h3 className="text-lg font-semibold text-white mb-1">Monthly Progress vs Target Pace</h3>
            <p className="text-gray-300 text-sm">Cumulative target pace vs actual performance</p>
          </div>
        </div>
        {/* Connecting line from heading to chart */}
        <div className="hidden md:block">
          <div className="w-12 h-0.5 bg-gradient-to-r from-gray-400 to-transparent"></div>
        </div>
      </div>

      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: -10, bottom: 20 }}>
            <XAxis 
              dataKey="dayNumber" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#9CA3AF', fontSize: 11 }}
              tickFormatter={(value) => `Day ${value}`}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#9CA3AF', fontSize: 11 }}
              tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
              width={40}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'rgba(0, 0, 0, 0.8)', 
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '8px',
                color: 'white'
              }}
              labelFormatter={(label) => `Working Day ${label}`}
              formatter={(value: any, name: string) => [
                value ? `AED ${value.toLocaleString()}` : 'No data',
                name === 'targetPace' ? 'Cumulative Target' : 'Actual Progress'
              ]}
            />
            
            {/* Gradient definitions */}
            <defs>
              <linearGradient id="targetGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6B7280" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#6B7280" stopOpacity={0.05}/>
              </linearGradient>
            </defs>
            
            {/* Target Area - Grey area under the target line */}
            <Area
              type="monotone"
              dataKey="targetPace"
              stroke="#6B7280"
              strokeWidth={1.5}
              fill="url(#targetGradient)"
              dot={false}
              name="Target Pace"
            />
            
            {/* Actual Progress Line - Shows where we currently are */}
            <Line 
              type="monotone" 
              dataKey="actual" 
              stroke="#10B981" 
              strokeWidth={3}
              dot={{ fill: '#10B981', strokeWidth: 1, r: 3 }}
              connectNulls={false}
              name="Actual Progress"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      
      {/* Legend */}
      <div className="flex items-center justify-center space-x-6 mt-4 pt-4 border-t border-white/10">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-3 bg-gradient-to-b from-gray-500/30 to-gray-500/5 border-t border-gray-500"></div>
          <span className="text-gray-300 text-sm">Cumulative Target</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-6 h-0.5 bg-green-500"></div>
          <span className="text-gray-300 text-sm">Actual Progress</span>
        </div>
      </div>
    </div>
  );
};

/* ---------------- Cumulative Yearly Target Chart ---------------- */
const CumulativeYearlyTargetChart: React.FC<{metrics: any[], targets: any[], selectedYear: number}> = ({ metrics, targets, selectedYear }) => {
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    if (targets.length > 0) {
      const currentYear = selectedYear; // Use selected year instead of current year
      const currentMonth = new Date().getMonth() + 1; // Keep current month for progress tracking
      
      // Get all monthly targets for selected year
      const yearlyTargets = targets.filter(t => t.year === currentYear).sort((a, b) => a.month - b.month);
      
      const months = [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
      ];
      
      const data = [];
      let cumulativeTarget = 0;
      let cumulativeActual = 0;
      
      for (let month = 1; month <= 12; month++) {
        // Find target for this month
        const monthTarget = yearlyTargets.find(t => t.month === month);
        const monthlyTargetAmount = monthTarget?.gross_profit_month_target || monthTarget?.gross_profit_target || 0;
        
        // Add to cumulative target
        cumulativeTarget += monthlyTargetAmount;
        
        // Get actual for this month (only if month has passed or is current in selected year)
        let monthlyActual = 0;
        const isCurrentYear = selectedYear === new Date().getFullYear();
        const shouldShowActual = isCurrentYear ? month <= currentMonth : true; // Show all months for past years
        
        if (shouldShowActual) {
          const monthMetric = metrics.find(m => {
            const metricDate = new Date(m.metric_date);
            return metricDate.getFullYear() === currentYear && metricDate.getMonth() + 1 === month;
          });
          monthlyActual = monthMetric?.gross_profit_month_actual || 0;
          cumulativeActual += monthlyActual;
        }
        
        data.push({
          month: months[month - 1],
          monthNumber: month,
          cumulativeTarget: Math.round(cumulativeTarget),
          cumulativeActual: shouldShowActual ? Math.round(cumulativeActual) : null,
          isCurrentMonth: isCurrentYear && month === currentMonth,
          isPast: isCurrentYear ? month < currentMonth : true,
          isFuture: isCurrentYear ? month > currentMonth : false
        });
      }
      
      setChartData(data);
    }
  }, [metrics, targets, selectedYear]);

  return (
    <div className="bg-black/90 rounded-xl border border-white/20 p-6 shadow-2xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div>
            <h3 className="text-lg font-semibold text-white mb-1">Cumulative Yearly Target Progress</h3>
            <p className="text-gray-300 text-sm">January to December cumulative performance vs target</p>
          </div>
        </div>
        {/* Connecting line from heading to chart */}
        <div className="hidden md:block">
          <div className="w-12 h-0.5 bg-gradient-to-r from-gray-400 to-transparent"></div>
        </div>
      </div>

      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: -10, bottom: 20 }}>
            <XAxis 
              dataKey="month" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#9CA3AF', fontSize: 11 }}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#9CA3AF', fontSize: 11 }}
              tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`}
              width={50}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'rgba(0, 0, 0, 0.8)', 
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '8px',
                color: 'white'
              }}
              labelFormatter={(label) => `${label} ${new Date().getFullYear()}`}
              formatter={(value: any, name: string) => [
                value ? `AED ${value.toLocaleString()}` : 'No data',
                name === 'cumulativeTarget' ? 'Cumulative Target' : 'Actual Progress'
              ]}
            />
            
            {/* Gradient definitions */}
            <defs>
              <linearGradient id="yearlyTargetGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6B7280" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#6B7280" stopOpacity={0.05}/>
              </linearGradient>
            </defs>
            
            {/* Yearly Target Area - Grey area under the target line */}
            <Area
              type="monotone"
              dataKey="cumulativeTarget"
              stroke="#6B7280"
              strokeWidth={1.5}
              fill="url(#yearlyTargetGradient)"
              dot={false}
              name="Cumulative Target"
            />
            
            {/* Actual Progress Line - Shows where we currently are */}
            <Line 
              type="monotone" 
              dataKey="cumulativeActual" 
              stroke="#10B981" 
              strokeWidth={3}
              dot={{ fill: '#10B981', strokeWidth: 1, r: 3 }}
              connectNulls={false}
              name="Actual Progress"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      
      {/* Legend */}
      <div className="flex items-center justify-center space-x-6 mt-4 pt-4 border-t border-white/10">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-3 bg-gradient-to-b from-gray-500/30 to-gray-500/5 border-t border-gray-500"></div>
          <span className="text-gray-300 text-sm">Cumulative Target</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-6 h-0.5 bg-green-500"></div>
          <span className="text-gray-300 text-sm">Actual Progress</span>
        </div>
      </div>
    </div>
  );
}; 