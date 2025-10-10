"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Calendar, DollarSign, TrendingUp, Target, FileText, AlertCircle } from 'lucide-react';
import { ComposedChart, Line, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, ReferenceLine, ReferenceArea, CartesianGrid, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import type { DailyServiceMetrics, ServiceMonthlyTarget } from '@/types/service';

interface ServiceDashboardProps {
  metrics: DailyServiceMetrics[];
  targets: ServiceMonthlyTarget[];
  loading?: boolean;
}

export default function ServiceDashboard({ metrics, targets, loading = false }: ServiceDashboardProps) {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [dashboardData, setDashboardData] = useState<DailyServiceMetrics | null>(null);
  const [monthTarget, setMonthTarget] = useState<ServiceMonthlyTarget | null>(null);
  const [monthlyInvoiceSum, setMonthlyInvoiceSum] = useState(0);

  // Get list of available dates for the selected month
  const availableDates = metrics
    .filter(m => {
      const date = new Date(m.metric_date);
      return date.getFullYear() === selectedYear && (date.getMonth() + 1) === selectedMonth;
    })
    .map(m => m.metric_date)
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  // Load data when month/year changes or when date is selected
  useEffect(() => {
    const loadDashboardData = () => {
      // Find target for selected month
      const target = targets.find(t => t.year === selectedYear && t.month === selectedMonth);
      setMonthTarget(target || null);

      // Get metrics for selected month
      const monthMetrics = metrics.filter(m => {
        const date = new Date(m.metric_date);
        return date.getFullYear() === selectedYear && (date.getMonth() + 1) === selectedMonth;
      });

      if (monthMetrics.length === 0) {
        setDashboardData(null);
        setMonthlyInvoiceSum(0);
        return;
      }

      // If specific date is selected, use that, otherwise use latest
      let selectedMetric: DailyServiceMetrics | null = null;
      
      if (selectedDate) {
        selectedMetric = monthMetrics.find(m => m.metric_date === selectedDate) || null;
      } else {
        // Get latest date
        const latestDate = monthMetrics.sort((a, b) => 
          new Date(b.metric_date).getTime() - new Date(a.metric_date).getTime()
        )[0];
        selectedMetric = latestDate;
        if (latestDate) {
          setSelectedDate(latestDate.metric_date);
        }
      }

      setDashboardData(selectedMetric);

      // Calculate sum of invoices UP TO the selected date (not cumulative, so we need to sum)
      const selectedDateObj = selectedMetric ? new Date(selectedMetric.metric_date) : new Date();
      const invoiceSum = monthMetrics
        .filter(m => new Date(m.metric_date) <= selectedDateObj)
        .reduce((sum, m) => sum + (m.number_of_invoices || 0), 0);
      setMonthlyInvoiceSum(invoiceSum);
    };

    loadDashboardData();
  }, [selectedYear, selectedMonth, selectedDate, metrics, targets]);

  const formatCurrency = (amount: number) => {
    return `AED ${new Intl.NumberFormat('en-AE', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)}`;
  };

  const formatPercentage = (value: number | undefined | null) => {
    if (value === null || value === undefined || isNaN(value)) {
      return '0.0%';
    }
    return `${value.toFixed(1)}%`;
  };

  // Helper function for color-coded progress bars
  const getProgressColor = (percentage: number) => {
    if (percentage >= 100) return 'from-emerald-400/80 to-emerald-500/60';
    if (percentage >= 80) return 'from-amber-400/80 to-amber-500/60';
    return 'from-red-400/80 to-red-500/60';
  };

  // Helper function for status badges
  const getStatusBadge = (current: number, target: number, stretch?: boolean) => {
    const targetValue = stretch ? target * 1.12 : target;
    if (current >= targetValue) {
      return (
        <span className="absolute -top-2 -right-2 text-[9px] px-2 py-1 bg-emerald-500/30 text-emerald-200 rounded-full font-bold border border-emerald-400/50 shadow-lg animate-pulse">
          {stretch ? '⚡ STRETCH' : '✓ MET'}
        </span>
      );
    }
    return null;
  };

  // Calculate vehicle throughput (average invoices per working day)
  const vehicleThroughput = dashboardData && dashboardData.working_days_elapsed > 0
    ? monthlyInvoiceSum / dashboardData.working_days_elapsed
    : 0;

  // Calculate average invoice value
  const averageInvoiceValue = monthlyInvoiceSum > 0 && dashboardData
    ? dashboardData.current_net_sales / monthlyInvoiceSum
    : 0;

  // Calculate marketing spend percentage
  const marketingSpendPercentage = dashboardData && dashboardData.current_net_sales > 0
    ? (dashboardData.current_marketing_spend / dashboardData.current_net_sales) * 100
    : 0;

  // Calculate labour to net sales ratio
  const labourToNetSalesRatio = dashboardData && dashboardData.current_net_sales > 0
    ? (dashboardData.current_net_labor_sales / dashboardData.current_net_sales) * 100
    : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-white/60">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header with Date/Month Selectors */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-6 bg-gradient-to-r from-white/10 via-white/5 to-transparent backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-white/10 border border-white/20">
            <Calendar className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-xl font-bold text-white tracking-wide">Service Department Dashboard</h2>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Month Selector */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-lg border border-white/10">
            <span className="text-white/70 text-xs font-semibold uppercase tracking-wider">Month</span>
            <select
              value={selectedMonth}
              onChange={(e) => {
                setSelectedMonth(Number(e.target.value));
                setSelectedDate(''); // Reset date when month changes
              }}
              className="bg-transparent border-none text-white text-sm font-medium focus:outline-none focus:ring-0 cursor-pointer"
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
                <option key={month.value} value={month.value} className="bg-gray-800 text-white">
                  {month.label}
                </option>
              ))}
            </select>
          </div>

          {/* Year Selector */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-lg border border-white/10">
            <span className="text-white/70 text-xs font-semibold uppercase tracking-wider">Year</span>
            <select
              value={selectedYear}
              onChange={(e) => {
                setSelectedYear(Number(e.target.value));
                setSelectedDate(''); // Reset date when year changes
              }}
              className="bg-transparent border-none text-white text-sm font-medium focus:outline-none focus:ring-0 cursor-pointer"
            >
              {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
                <option key={year} value={year} className="bg-gray-800 text-white">{year}</option>
              ))}
            </select>
          </div>

          {/* Report Date Selector */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-lg border border-white/10">
            <span className="text-white/70 text-xs font-semibold uppercase tracking-wider">Report Date</span>
            <select
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent border-none text-white text-sm font-medium focus:outline-none focus:ring-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={availableDates.length === 0}
            >
              {availableDates.length === 0 ? (
                <option>No data available</option>
              ) : (
                availableDates.map(date => (
                  <option key={date} value={date} className="bg-gray-800 text-white">
                    {new Date(date).toLocaleDateString('en-GB')}
                  </option>
                ))
              )}
            </select>
          </div>
        </div>
      </div>

      {!dashboardData ? (
        <div className="flex flex-col items-center justify-center h-64 bg-gradient-to-br from-white/5 to-transparent backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl">
          <AlertCircle className="w-16 h-16 text-white/40 mb-6" />
          <p className="text-white/70 text-xl font-semibold">No data available for the selected period</p>
          <p className="text-white/50 text-sm mt-3">Please select a different month or add data in the Data Grid tab</p>
        </div>
      ) : (
        <>
          {/* Net Sales Metrics Row */}
          <div className="grid grid-cols-5 gap-4">
            {/* Current Net Sales - HERO CARD */}
            <div className="relative rounded-xl bg-gradient-to-br from-white/20 to-white/10 backdrop-blur-xl p-6 border-2 border-white/30 shadow-2xl" style={{ boxShadow: '0 0 40px rgba(255,255,255,0.1)' }}>
              {/* Status Badge */}
              {monthTarget && getStatusBadge(dashboardData.current_net_sales || 0, monthTarget.net_sales_target)}
              
              <div className="flex items-center justify-between mb-4">
                <p className="text-base font-bold text-white uppercase tracking-wide">Current Net Sales</p>
                <DollarSign className="w-6 h-6 text-white/80" />
              </div>
              <p className="text-4xl font-black text-white mb-3 drop-shadow-lg">
                {formatCurrency(dashboardData.current_net_sales || 0)}
              </p>
              <div className="w-full bg-white/10 rounded-full h-3 mb-3">
                <div 
                  className={`bg-gradient-to-r ${getProgressColor(dashboardData.current_net_sales_percentage || 0)} h-3 rounded-full transition-all duration-500 shadow-lg`}
                  style={{ width: `${Math.min(dashboardData.current_net_sales_percentage || 0, 100)}%` }}
                ></div>
              </div>
              <p className="text-sm font-bold text-white">
                {formatPercentage(dashboardData.current_net_sales_percentage)}
              </p>
            </div>

            {/* Estimated Sales Month End */}
            <div className="relative rounded-lg bg-gradient-to-br from-white/10 to-white/5 backdrop-blur p-4 border border-white/10 shadow-inner">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-white/70">Est. Month End</p>
                <TrendingUp className="w-5 h-5 text-white/60" />
              </div>
              <p className="text-3xl font-bold text-white mb-2">
                {formatCurrency(dashboardData.estimated_net_sales || 0)}
              </p>
              <div className="w-full bg-white/10 rounded-full h-2 mb-2">
                <div 
                  className={`bg-gradient-to-r ${getProgressColor(dashboardData.estimated_net_sales_percentage || 0)} h-2 rounded-full transition-all duration-500 shadow-md`}
                  style={{ width: `${Math.min(dashboardData.estimated_net_sales_percentage || 0, 100)}%` }}
                ></div>
              </div>
              <p className="text-xs text-white/50">
                {formatPercentage(dashboardData.estimated_net_sales_percentage)}
              </p>
            </div>

            {/* Daily Average */}
            <div className="rounded-lg bg-gradient-to-br from-white/10 to-white/5 backdrop-blur p-4 border border-white/10 shadow-inner">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-white/70">Daily Average</p>
                <DollarSign className="w-5 h-5 text-white/60" />
              </div>
              <p className="text-3xl font-bold text-white mb-2">
                {formatCurrency(dashboardData.current_daily_average || 0)}
              </p>
              <p className="text-xs text-white/40">Daily pace</p>
            </div>

            {/* Net Sales Target - 100% */}
            <div className="rounded-lg bg-gradient-to-br from-white/10 to-white/5 backdrop-blur p-4 border border-white/10 shadow-inner">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-white/70">Target - 100%</p>
                <Target className="w-5 h-5 text-white/60" />
              </div>
              <p className="text-3xl font-bold text-white mb-2">
                {monthTarget ? formatCurrency(monthTarget.net_sales_target) : 'N/A'}
              </p>
              <p className="text-xs text-white/40">
                {(dashboardData.current_net_sales || 0) >= (monthTarget?.net_sales_target || 0) 
                  ? `Exceeded by: ${formatCurrency((dashboardData.current_net_sales || 0) - (monthTarget?.net_sales_target || 0))}`
                  : `Remaining: ${formatCurrency((monthTarget?.net_sales_target || 0) - (dashboardData.current_net_sales || 0))}`
                }
              </p>
            </div>

            {/* Net Sales Target - 112% - GOLD ACCENT */}
            <div className="relative rounded-lg bg-gradient-to-br from-amber-500/20 to-amber-600/10 backdrop-blur p-4 border-2 border-amber-500/50 shadow-lg">
              {/* Stretch Goal Badge */}
              {monthTarget && getStatusBadge(dashboardData.current_net_sales || 0, monthTarget.net_sales_target, true)}
              
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-bold text-amber-200">Target - 112% ⚡</p>
                <Target className="w-5 h-5 text-amber-300" />
              </div>
              <p className="text-3xl font-bold text-amber-100 mb-2">
                {monthTarget ? formatCurrency(monthTarget.net_sales_112_percent) : 'N/A'}
              </p>
              <p className={`text-xs font-semibold ${
                monthTarget && (dashboardData.current_net_sales || 0) >= (monthTarget.net_sales_112_percent || 0)
                  ? 'text-emerald-300'
                  : 'text-amber-300/70'
              }`}>
                {monthTarget && (dashboardData.current_net_sales || 0) >= (monthTarget.net_sales_112_percent || 0)
                  ? `✓ Exceeded by: ${formatCurrency((dashboardData.current_net_sales || 0) - (monthTarget.net_sales_112_percent || 0))}`
                  : monthTarget ? `Remaining: ${formatCurrency((monthTarget.net_sales_112_percent || 0) - (dashboardData.current_net_sales || 0))}` : 'N/A'
                }
              </p>
            </div>
          </div>

          {/* Labour to Net Sales Ratio */}
          <div className="text-center py-3">
            <div className="inline-flex items-center px-5 py-2 bg-white/5 backdrop-blur border border-white/10 rounded-lg">
              <span className="text-xs text-white/60 uppercase tracking-wider font-semibold mr-3">Labour to Net Sales Ratio:</span>
              <span className="text-base font-bold text-white">{formatPercentage(labourToNetSalesRatio)}</span>
            </div>
          </div>

          {/* Labour Sales Metrics Row */}
          <div className="grid grid-cols-5 gap-4">
            {/* Current Labour Sales */}
            <div className="rounded-lg bg-gradient-to-br from-white/10 to-white/5 backdrop-blur p-4 border border-white/10 shadow-inner">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-white/70">Current Labour</p>
                <DollarSign className="w-5 h-5 text-white/60" />
              </div>
              <p className="text-3xl font-bold text-white mb-2">
                {formatCurrency(dashboardData.current_net_labor_sales || 0)}
              </p>
              <div className="w-full bg-white/10 rounded-full h-2 mb-2">
                <div 
                  className={`bg-gradient-to-r ${getProgressColor(dashboardData.current_labour_sales_percentage || 0)} h-2 rounded-full transition-all duration-500 shadow-md`}
                  style={{ width: `${Math.min(dashboardData.current_labour_sales_percentage || 0, 100)}%` }}
                ></div>
              </div>
              <p className="text-xs text-white/50">
                {formatPercentage(dashboardData.current_labour_sales_percentage)}
              </p>
            </div>

            {/* Estimated Labour Sales Month End */}
            <div className="rounded-lg bg-gradient-to-br from-white/10 to-white/5 backdrop-blur p-4 border border-white/10 shadow-inner">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-white/70">Est. Labour End</p>
                <TrendingUp className="w-5 h-5 text-white/60" />
              </div>
              <p className="text-3xl font-bold text-white mb-2">
                {formatCurrency(dashboardData.estimated_labor_sales || 0)}
              </p>
              <div className="w-full bg-white/10 rounded-full h-2 mb-2">
                <div 
                  className={`bg-gradient-to-r ${getProgressColor(dashboardData.estimated_labor_sales_percentage || 0)} h-2 rounded-full transition-all duration-500 shadow-md`}
                  style={{ width: `${Math.min(dashboardData.estimated_labor_sales_percentage || 0, 100)}%` }}
                ></div>
              </div>
              <p className="text-xs text-white/50">
                {formatPercentage(dashboardData.estimated_labor_sales_percentage)}
              </p>
            </div>

            {/* Daily Average */}
            <div className="rounded-lg bg-gradient-to-br from-white/10 to-white/5 backdrop-blur p-4 border border-white/10 shadow-inner">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-white/70">Daily Average</p>
                <DollarSign className="w-5 h-5 text-white/60" />
              </div>
              <p className="text-3xl font-bold text-white mb-2">
                {formatCurrency((dashboardData.working_days_elapsed || 0) > 0 
                  ? (dashboardData.current_net_labor_sales || 0) / (dashboardData.working_days_elapsed || 1)
                  : 0)}
              </p>
              <p className="text-xs text-white/40">Daily pace</p>
            </div>

            {/* Labour Sales Target - 100% */}
            <div className="rounded-lg bg-gradient-to-br from-white/10 to-white/5 backdrop-blur p-4 border border-white/10 shadow-inner">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-white/70">Target - 100%</p>
                <Target className="w-5 h-5 text-white/60" />
              </div>
              <p className="text-3xl font-bold text-white mb-2">
                {monthTarget ? formatCurrency(monthTarget.labour_sales_target) : 'N/A'}
              </p>
              <p className="text-xs text-white/40">
                {(dashboardData.current_net_labor_sales || 0) >= (monthTarget?.labour_sales_target || 0)
                  ? `Exceeded by: ${formatCurrency((dashboardData.current_net_labor_sales || 0) - (monthTarget?.labour_sales_target || 0))}`
                  : `Remaining: ${formatCurrency((monthTarget?.labour_sales_target || 0) - (dashboardData.current_net_labor_sales || 0))}`
                }
              </p>
            </div>

            {/* Labour Sales Target - 112% */}
            <div className="rounded-lg bg-gradient-to-br from-white/10 to-white/5 backdrop-blur p-4 border border-white/10 shadow-inner">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-white/70">Target - 112%</p>
                <Target className="w-5 h-5 text-white/60" />
              </div>
              <p className="text-3xl font-bold text-white mb-2">
                {monthTarget ? formatCurrency(monthTarget.labour_sales_target * 1.12) : 'N/A'}
              </p>
              <p className="text-xs text-white/40">
                {monthTarget && (dashboardData.current_net_labor_sales || 0) >= ((monthTarget.labour_sales_target || 0) * 1.12)
                  ? `Exceeded by: ${formatCurrency((dashboardData.current_net_labor_sales || 0) - ((monthTarget.labour_sales_target || 0) * 1.12))}`
                  : monthTarget ? `Remaining: ${formatCurrency(((monthTarget.labour_sales_target || 0) * 1.12) - (dashboardData.current_net_labor_sales || 0))}` : 'N/A'
                }
              </p>
            </div>
          </div>

          {/* Progress Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            {/* Net Sales Progress Chart */}
            <NetSalesProgressChart 
              metrics={metrics.filter(m => {
                const date = new Date(m.metric_date);
                const metricDate = new Date(m.metric_date);
                const selectedDateObj = new Date(selectedDate);
                return date.getFullYear() === selectedYear && 
                       (date.getMonth() + 1) === selectedMonth &&
                       metricDate <= selectedDateObj;
              })}
              target={monthTarget}
            />

            {/* Labour Sales Progress Chart */}
            <LabourSalesProgressChart 
              metrics={metrics.filter(m => {
                const date = new Date(m.metric_date);
                const metricDate = new Date(m.metric_date);
                const selectedDateObj = new Date(selectedDate);
                return date.getFullYear() === selectedYear && 
                       (date.getMonth() + 1) === selectedMonth &&
                       metricDate <= selectedDateObj;
              })}
              target={monthTarget}
            />
          </div>

          {/* New Additional Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            {/* Target Achievement Forecast Chart */}
            <TargetAchievementForecastChart 
              metrics={metrics.filter(m => {
                const date = new Date(m.metric_date);
                const metricDate = new Date(m.metric_date);
                const selectedDateObj = new Date(selectedDate);
                return date.getFullYear() === selectedYear && 
                       (date.getMonth() + 1) === selectedMonth &&
                       metricDate <= selectedDateObj;
              })}
              target={monthTarget}
              selectedDate={selectedDate}
            />

            {/* Labour vs Parts Breakdown Chart */}
            <LabourPartsBreakdownChart 
              dashboardData={dashboardData}
              target={monthTarget}
            />
          </div>

          {/* Charts and Additional Metrics Row */}
          <div className="grid gap-4 lg:grid-cols-2 mb-4">
            {/* Left column */}
            <div className="space-y-4">
              <div className="grid gap-3 grid-cols-2">
                {/* Marketing Spend % */}
                <div className="rounded-lg bg-gradient-to-br from-white/10 to-white/5 backdrop-blur p-3 border border-white/10 shadow-inner">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-medium text-white/70">Marketing %</p>
                    <DollarSign className="w-5 h-5 text-white/60" />
                  </div>
                  <p className="text-3xl font-bold text-white mb-2">{formatPercentage(marketingSpendPercentage)}</p>
                  <p className="text-xs text-white/40">Of sales</p>
                </div>

                {/* Average Invoice Value */}
                <div className="rounded-lg bg-gradient-to-br from-white/10 to-white/5 backdrop-blur p-3 border border-white/10 shadow-inner">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-medium text-white/70">Avg Invoice</p>
                    <FileText className="w-5 h-5 text-white/60" />
                  </div>
                  <p className="text-3xl font-bold text-white mb-2">{formatCurrency(averageInvoiceValue)}</p>
                  <p className="text-xs text-white/40">Per invoice</p>
                </div>

                {/* Marketing Spend */}
                <div className="rounded-lg bg-gradient-to-br from-white/10 to-white/5 backdrop-blur p-3 border border-white/10 shadow-inner">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-medium text-white/70">Marketing</p>
                    <DollarSign className="w-5 h-5 text-white/60" />
                  </div>
                  <p className="text-3xl font-bold text-white mb-2">{formatCurrency(dashboardData.current_marketing_spend || 0)}</p>
                  <p className="text-xs text-white/40">Total spend</p>
                </div>

                {/* Number of Invoices */}
                <div className="rounded-lg bg-gradient-to-br from-white/10 to-white/5 backdrop-blur p-3 border border-white/10 shadow-inner">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-medium text-white/70">Invoices</p>
                    <FileText className="w-5 h-5 text-white/60" />
                  </div>
                  <p className="text-3xl font-bold text-white mb-2">{monthlyInvoiceSum}</p>
                  <p className="text-xs text-white/40">This month</p>
                </div>
              </div>
            </div>

            {/* Right column: Vehicle Throughput */}
            <div className="rounded-lg bg-black/40 backdrop-blur-xl border border-white/10 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Vehicle Throughput</h3>
              <div className="flex items-center justify-center">
                <VehicleThroughputGauge value={vehicleThroughput} />
              </div>
            </div>
          </div>

          {/* Individual Salesperson Performance */}
          <div className="rounded-lg bg-black/40 backdrop-blur-xl border border-white/10 p-6">
            <h3 className="text-lg font-semibold text-white mb-6">Individual Performance</h3>
            <div className="grid grid-cols-3 gap-4">
              <SalespersonCard 
                name="DANIEL" 
                amount={dashboardData.daniel_total_sales || 0}
                totalSales={
                  (dashboardData.daniel_total_sales || 0) +
                  (dashboardData.lucy_total_sales || 0) +
                  (dashboardData.essrar_total_sales || 0)
                }
                rank={
                  [
                    { name: 'DANIEL', amount: dashboardData.daniel_total_sales || 0 },
                    { name: 'LUCY', amount: dashboardData.lucy_total_sales || 0 },
                    { name: 'ESSRAR', amount: dashboardData.essrar_total_sales || 0 }
                  ]
                    .sort((a, b) => b.amount - a.amount)
                    .findIndex(p => p.name === 'DANIEL') + 1
                }
              />
              <SalespersonCard 
                name="LUCY" 
                amount={dashboardData.lucy_total_sales || 0}
                totalSales={
                  (dashboardData.daniel_total_sales || 0) +
                  (dashboardData.lucy_total_sales || 0) +
                  (dashboardData.essrar_total_sales || 0)
                }
                rank={
                  [
                    { name: 'DANIEL', amount: dashboardData.daniel_total_sales || 0 },
                    { name: 'LUCY', amount: dashboardData.lucy_total_sales || 0 },
                    { name: 'ESSRAR', amount: dashboardData.essrar_total_sales || 0 }
                  ]
                    .sort((a, b) => b.amount - a.amount)
                    .findIndex(p => p.name === 'LUCY') + 1
                }
              />
              <SalespersonCard 
                name="ESSRAR" 
                amount={dashboardData.essrar_total_sales || 0}
                totalSales={
                  (dashboardData.daniel_total_sales || 0) +
                  (dashboardData.lucy_total_sales || 0) +
                  (dashboardData.essrar_total_sales || 0)
                }
                rank={
                  [
                    { name: 'DANIEL', amount: dashboardData.daniel_total_sales || 0 },
                    { name: 'LUCY', amount: dashboardData.lucy_total_sales || 0 },
                    { name: 'ESSRAR', amount: dashboardData.essrar_total_sales || 0 }
                  ]
                    .sort((a, b) => b.amount - a.amount)
                    .findIndex(p => p.name === 'ESSRAR') + 1
                }
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}


/* ---------------- Vehicle Throughput Gauge ---------------- */
const VehicleThroughputGauge: React.FC<{ value: number }> = ({ value }) => {
  const safeValue = value || 0;
  const maxValue = 15;
  const normalizedValue = Math.min(safeValue, maxValue);
  const percentage = (normalizedValue / maxValue) * 100;

  return (
    <div className="relative w-48 h-48">
      {/* Background arc */}
      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 200 200">
        <circle
          cx="100"
          cy="100"
          r="80"
          fill="none"
          stroke="#374151"
          strokeWidth="20"
          strokeDasharray="376.99"
          strokeDashoffset="125.66"
        />
        <circle
          cx="100"
          cy="100"
          r="80"
          fill="none"
          stroke="url(#silverGradient)"
          strokeWidth="20"
          strokeDasharray="376.99"
          strokeDashoffset={125.66 + (251.33 * (1 - percentage / 100))}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
        <defs>
          <linearGradient id="silverGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity={0.8} />
            <stop offset="50%" stopColor="#d1d5db" stopOpacity={0.6} />
            <stop offset="100%" stopColor="#ffffff" stopOpacity={0.8} />
          </linearGradient>
        </defs>
      </svg>
      
      {/* Center value */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <p className="text-4xl font-bold text-white">{safeValue.toFixed(2)}</p>
        <p className="text-xs text-white/60 mt-1">invoices/day</p>
      </div>
      
      {/* Scale markers */}
      <div className="absolute bottom-0 left-0 right-0 flex justify-between px-4 text-xs text-white/40">
        <span>1.00</span>
        <span>15.00</span>
      </div>
    </div>
  );
};

/* ---------------- Net Sales Progress Chart ---------------- */
const NetSalesProgressChart: React.FC<{ 
  metrics: DailyServiceMetrics[]; 
  target: ServiceMonthlyTarget | null;
}> = ({ metrics, target }) => {
  const [chartData, setChartData] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});
  const [currentDay, setCurrentDay] = useState<number>(0);

  useEffect(() => {
    if (metrics.length > 0 && target) {
      const sortedMetrics = [...metrics].sort((a, b) => 
        new Date(a.metric_date).getTime() - new Date(b.metric_date).getTime()
      );

      // Get today's date
      const today = new Date().getDate();
      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();
      
      // Check if we're in the same month as the metrics
      const firstMetric = sortedMetrics[0];
      const metricDate = new Date(firstMetric.metric_date);
      const isCurrentMonth = metricDate.getMonth() + 1 === currentMonth && metricDate.getFullYear() === currentYear;
      
      setCurrentDay(isCurrentMonth ? today : 0);

      // Get total working days from target to build full timeline
      const totalWorkingDays = target.number_of_working_days || 22;
      const lastMetricDay = sortedMetrics.length > 0 ? new Date(sortedMetrics[sortedMetrics.length - 1].metric_date).getDate() : 1;

      // Build data for ALL working days (full timeline)
      const data = [];
      for (let workingDay = 1; workingDay <= totalWorkingDays; workingDay++) {
        const dailyCumulativeTarget = (target.daily_cumulative_target || 0) * workingDay;
        
        // Find metric for this working day
        const metric = sortedMetrics[workingDay - 1]; // Working day is 1-indexed, array is 0-indexed
        const metricDayOfMonth = metric ? new Date(metric.metric_date).getDate() : null;
        
        data.push({
          day: metricDayOfMonth || workingDay, // Use actual day of month if available
          cumulativeTarget: dailyCumulativeTarget,
          currentNetSales: metric ? (metric.current_net_sales || 0) : null,
          estimatedNetSales: metric ? (metric.estimated_net_sales || 0) : null,
          target112: target.net_sales_112_percent || 0,
          metricDate: metric ? metric.metric_date : null,
        });
      }

      // Calculate statistics (only from actual data)
      const actualData = data.filter(d => d.currentNetSales !== null);
      const salesValues = actualData.map(d => d.currentNetSales!);
      const bestDay = salesValues.length > 0 ? Math.max(...salesValues) : 0;
      const avgDaily = salesValues.length > 0 ? salesValues.reduce((a, b) => a + b, 0) / salesValues.length : 0;
      const latestData = actualData[actualData.length - 1];
      const daysAheadBehind = latestData ? 
        Math.round((latestData.currentNetSales! - latestData.cumulativeTarget) / (target.daily_cumulative_target || 1)) : 0;
      
      // Calculate trend
      const recentData = actualData.slice(-3);
      const trend = recentData.length >= 2 ? 
        (recentData[recentData.length - 1].currentNetSales! - recentData[0].currentNetSales!) / recentData.length : 0;

      setStats({
        bestDay,
        avgDaily,
        daysAheadBehind,
        trend: trend > 0 ? 'up' : trend < 0 ? 'down' : 'flat',
        trendValue: Math.abs(trend)
      });

      setChartData(data);
    }
  }, [metrics, target]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-AE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  const CustomLabel = (props: any) => {
    const { x, y, value, index } = props;
    // Only show labels for every other point to avoid clutter
    if (index % 2 !== 0) return null;
    return (
      <text 
        x={x} 
        y={y - 8} 
        fill="#10b981" 
        fontSize="9" 
        fontWeight="700"
        textAnchor="middle"
      >
        {formatCurrency(value)}
      </text>
    );
  };

  // Enhanced Tooltip Component
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    
    const data = payload[0].payload;
    const gap = data.currentNetSales - data.cumulativeTarget;
    const percentageOfTarget = (data.currentNetSales / data.cumulativeTarget) * 100;
    
    return (
      <div className="bg-black/98 border border-white/30 rounded-xl p-4 shadow-2xl">
        <p className="text-white font-bold text-sm mb-3 border-b border-white/20 pb-2">Day {data.day}</p>
        
        <div className="space-y-2 text-xs">
          <div className="flex justify-between items-center gap-4">
            <span className="text-emerald-400 font-semibold flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-emerald-400" />
              Current:
            </span>
            <span className="text-white font-mono">AED {formatCurrency(data.currentNetSales)}</span>
          </div>
          
          <div className="flex justify-between items-center gap-4">
            <span className="text-gray-400 font-semibold flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-gray-400" />
              Target:
            </span>
            <span className="text-white font-mono">AED {formatCurrency(data.cumulativeTarget)}</span>
          </div>
          
          <div className="border-t border-white/10 pt-2 mt-2">
            <div className="flex justify-between items-center gap-4">
              <span className={`font-bold ${gap >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {gap >= 0 ? '↑ Ahead:' : '↓ Behind:'}
              </span>
              <span className={`font-mono font-bold ${gap >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                AED {formatCurrency(Math.abs(gap))}
              </span>
            </div>
            <div className="flex justify-between items-center gap-4 mt-1">
              <span className="text-gray-400">Achievement:</span>
              <span className={`font-bold ${percentageOfTarget >= 100 ? 'text-emerald-400' : 'text-amber-400'}`}>
                {percentageOfTarget.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const latestData = chartData[chartData.length - 1];
  const performance = latestData ? (latestData.currentNetSales / latestData.cumulativeTarget) * 100 : 0;

  return (
    <div className="rounded-xl bg-black backdrop-blur-xl border border-white/20 shadow-2xl p-6">
      {/* Header with Trend */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-white">Net Sales Progress</h3>
            {stats.trend && (
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                stats.trend === 'up' ? 'text-emerald-400 bg-emerald-500/20' : 
                stats.trend === 'down' ? 'text-red-400 bg-red-500/20' : 
                'text-gray-400 bg-gray-500/20'
              }`}>
                {stats.trend === 'up' ? '↗ Trending Up' : stats.trend === 'down' ? '↘ Trending Down' : '→ Flat'}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400">Month-to-date cumulative performance vs targets</p>
        </div>
        
        {/* Performance Badge */}
        {latestData && (
          <div className={`px-3 py-1 rounded-lg text-xs font-bold ${
            performance >= 100 ? 'bg-emerald-500/20 text-emerald-300' :
            performance >= 80 ? 'bg-amber-500/20 text-amber-300' :
            'bg-red-500/20 text-red-300'
          }`}>
            {performance.toFixed(1)}% of Target
          </div>
        )}
      </div>
      
      {/* Legend */}
      <div className="flex items-center justify-center gap-5 mb-6 flex-wrap">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/20">
          <div className="w-2.5 h-2.5 rounded-full bg-gray-400 opacity-40"></div>
          <span className="text-xs font-medium text-gray-400">Daily Target</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-emerald-500/30">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
          <span className="text-xs font-medium text-emerald-300">Current Net Sales</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-orange-500/30">
          <div className="w-2.5 h-2.5 rounded-full bg-orange-400"></div>
          <span className="text-xs font-medium text-orange-300">Estimated</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-amber-500/30">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div>
          <span className="text-xs font-medium text-amber-300">112% Target</span>
        </div>
      </div>
      
      <ResponsiveContainer width="100%" height={380}>
        <ComposedChart data={chartData} margin={{ top: 5, right: 30, bottom: 10, left: -20 }}>
          <defs>
            <linearGradient id="netSalesGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity={0.4}/>
              <stop offset="100%" stopColor="#10b981" stopOpacity={0.05}/>
            </linearGradient>
          </defs>
          
          {/* Performance Zones */}
          {target && (
            <>
              <ReferenceArea 
                y1={0} 
                y2={target.net_sales_target * 0.6} 
                fill="#ef4444" 
                fillOpacity={0.03}
              />
              <ReferenceArea 
                y1={target.net_sales_target * 0.6} 
                y2={target.net_sales_target * 0.9} 
                fill="#f59e0b" 
                fillOpacity={0.03}
              />
              <ReferenceArea 
                y1={target.net_sales_target * 0.9} 
                y2={target.net_sales_target * 1.3} 
                fill="#10b981" 
                fillOpacity={0.03}
              />
            </>
          )}
          
          {/* Today Marker */}
          {currentDay > 0 && (
            <ReferenceLine 
              x={currentDay} 
              stroke="#ffffff" 
              strokeWidth={2} 
              strokeDasharray="3 3"
              label={{ 
                value: 'TODAY', 
                position: 'top', 
                fill: '#ffffff', 
                fontSize: 10, 
                fontWeight: 'bold'
              }}
            />
          )}
          
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
          
          <XAxis 
            dataKey="day" 
            tick={{ fontSize: 10, fill: '#9ca3af' }}
            stroke="#4b5563"
            tickLine={{ stroke: '#4b5563' }}
            axisLine={{ stroke: '#4b5563' }}
          />
          <YAxis 
            tick={{ fontSize: 10, fill: '#9ca3af' }}
            stroke="#4b5563"
            tickLine={{ stroke: '#4b5563' }}
            axisLine={{ stroke: '#4b5563' }}
            tickFormatter={(value: number) => new Intl.NumberFormat('en-AE', { notation: 'compact', compactDisplay: 'short' }).format(value)}
            width={50}
          />
          <Tooltip content={<CustomTooltip />} />
          
          <Line 
            type="monotone"
            dataKey="cumulativeTarget" 
            stroke="#9ca3af" 
            strokeWidth={2}
            strokeOpacity={0.4}
            dot={{ fill: '#9ca3af', r: 2, strokeWidth: 0, fillOpacity: 0.4 }}
            name="Daily Cumulative Target"
            animationDuration={1000}
          />
          <Area 
            type="monotone"
            dataKey="currentNetSales" 
            fill="url(#netSalesGradient)" 
            stroke="#10b981" 
            strokeWidth={4}
            dot={{ fill: '#10b981', r: 4, strokeWidth: 2, stroke: '#065f46' }}
            activeDot={{ r: 6, strokeWidth: 3 }}
            name="Current Net Sales"
            animationDuration={1500}
          />
          <Line 
            type="monotone"
            dataKey="estimatedNetSales" 
            stroke="#fb923c" 
            strokeWidth={2.5}
            strokeDasharray="4 4"
            dot={false}
            name="Estimated Net Sales"
            animationDuration={1000}
          />
          <Line 
            type="monotone"
            dataKey="target112" 
            stroke="#f59e0b" 
            strokeWidth={2}
            strokeDasharray="6 3"
            dot={false}
            name="Net Sales 112%"
            animationDuration={1000}
          />
        </ComposedChart>
      </ResponsiveContainer>
      
      {/* Mini Stats */}
      {stats.avgDaily && (
        <div className="mt-6 grid grid-cols-3 gap-4 border-t border-white/10 pt-4">
          <div className="text-center">
            <p className="text-xs text-gray-400 mb-1">Best Day</p>
            <p className="text-sm font-bold text-white">AED {(stats.bestDay / 1000).toFixed(0)}K</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-400 mb-1">Avg Daily</p>
            <p className="text-sm font-bold text-white">AED {(stats.avgDaily / 1000).toFixed(0)}K</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-400 mb-1">Days {stats.daysAheadBehind >= 0 ? 'Ahead' : 'Behind'}</p>
            <p className={`text-sm font-bold ${stats.daysAheadBehind >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {stats.daysAheadBehind >= 0 ? '+' : ''}{stats.daysAheadBehind}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

/* ---------------- Labour Sales Progress Chart ---------------- */
const LabourSalesProgressChart: React.FC<{ 
  metrics: DailyServiceMetrics[]; 
  target: ServiceMonthlyTarget | null;
}> = ({ metrics, target }) => {
  const [chartData, setChartData] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});
  const [currentDay, setCurrentDay] = useState<number>(0);

  useEffect(() => {
    if (metrics.length > 0 && target) {
      const sortedMetrics = [...metrics].sort((a, b) => 
        new Date(a.metric_date).getTime() - new Date(b.metric_date).getTime()
      );

      // Get today's date
      const today = new Date().getDate();
      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();
      
      const firstMetric = sortedMetrics[0];
      const metricDate = new Date(firstMetric.metric_date);
      const isCurrentMonth = metricDate.getMonth() + 1 === currentMonth && metricDate.getFullYear() === currentYear;
      
      setCurrentDay(isCurrentMonth ? today : 0);

      // Get total working days from target to build full timeline
      const totalWorkingDays = target.number_of_working_days || 22;
      const target112 = (target.net_sales_target || 0) * 1.12;

      // Build data for ALL working days (full timeline)
      const data = [];
      for (let workingDay = 1; workingDay <= totalWorkingDays; workingDay++) {
        // Find metric for this working day
        const metric = sortedMetrics[workingDay - 1];
        const metricDayOfMonth = metric ? new Date(metric.metric_date).getDate() : null;
        
        if (metric) {
          const workingDays = metric.working_days_elapsed || workingDay;
          const currentAvg = (metric.current_net_sales || 0) / workingDays;
          const remainingDays = totalWorkingDays - workingDays;
          const requiredAvg = remainingDays > 0 
            ? (target112 - (metric.current_net_sales || 0)) / remainingDays
            : 0;

          data.push({
            day: metricDayOfMonth || workingDay,
            currentAvg: currentAvg || 0,
            requiredAvg: requiredAvg > 0 ? requiredAvg : 0,
          });
        } else {
          // Empty data point for future days
          data.push({
            day: workingDay,
            currentAvg: null,
            requiredAvg: null,
          });
        }
      }

      // Calculate statistics (only from actual data)
      const actualData = data.filter(d => d.currentAvg !== null);
      const avgValues = actualData.map(d => d.currentAvg!);
      const bestDayAvg = avgValues.length > 0 ? Math.max(...avgValues) : 0;
      const overallAvg = avgValues.length > 0 ? avgValues.reduce((a, b) => a + b, 0) / avgValues.length : 0;
      const latestData = actualData[actualData.length - 1];
      const improvementNeeded = latestData ? latestData.requiredAvg! - latestData.currentAvg! : 0;
      
      // Calculate 7-day moving average
      const movingAvg7Day = actualData.length >= 7 ? 
        actualData.slice(-7).reduce((sum, d) => sum + d.currentAvg!, 0) / 7 : overallAvg;

      setStats({
        bestDayAvg,
        overallAvg,
        improvementNeeded,
        movingAvg7Day,
        isOnTrack: latestData ? latestData.currentAvg! >= latestData.requiredAvg! : false
      });

      setChartData(data);
    }
  }, [metrics, target]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-AE', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  // Enhanced Tooltip Component
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    
    const data = payload[0].payload;
    const gap = data.currentAvg - data.requiredAvg;
    const percentageOfRequired = (data.currentAvg / data.requiredAvg) * 100;
    
    return (
      <div className="bg-black/98 border border-white/30 rounded-xl p-4 shadow-2xl">
        <p className="text-white font-bold text-sm mb-3 border-b border-white/20 pb-2">Day {data.day}</p>
        
        <div className="space-y-2 text-xs">
          <div className="flex justify-between items-center gap-4">
            <span className="text-cyan-400 font-semibold flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-cyan-400" />
              Current Avg:
            </span>
            <span className="text-white font-mono">AED {formatCurrency(data.currentAvg)}</span>
          </div>
          
          <div className="flex justify-between items-center gap-4">
            <span className="text-orange-400 font-semibold flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-orange-400" />
              Required:
            </span>
            <span className="text-white font-mono">AED {formatCurrency(data.requiredAvg)}</span>
          </div>
          
          <div className="border-t border-white/10 pt-2 mt-2">
            <div className="flex justify-between items-center gap-4">
              <span className={`font-bold ${gap >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {gap >= 0 ? '✓ On Track:' : '⚠ Gap:'}
              </span>
              <span className={`font-mono font-bold ${gap >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                AED {formatCurrency(Math.abs(gap))}
              </span>
            </div>
            <div className="flex justify-between items-center gap-4 mt-1">
              <span className="text-gray-400">Performance:</span>
              <span className={`font-bold ${percentageOfRequired >= 100 ? 'text-emerald-400' : 'text-amber-400'}`}>
                {percentageOfRequired.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const latestData = chartData[chartData.length - 1];
  
  // Determine line color based on performance
  const getLineColor = () => {
    if (!latestData) return '#06b6d4';
    if (latestData.currentAvg >= latestData.requiredAvg) return '#10b981'; // Green - on track
    if (latestData.currentAvg >= latestData.requiredAvg * 0.9) return '#f59e0b'; // Amber - close
    return '#ef4444'; // Red - behind
  };

  return (
    <div className="rounded-xl bg-black backdrop-blur-xl border border-white/20 shadow-2xl p-6">
      {/* Header with Status */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-white">Net Sales Daily Average</h3>
            {stats.isOnTrack !== undefined && (
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                stats.isOnTrack ? 'text-emerald-400 bg-emerald-500/20' : 'text-amber-400 bg-amber-500/20'
              }`}>
                {stats.isOnTrack ? '✓ On Track' : '⚠ Needs Improvement'}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400">Current daily performance vs required pace for 112% target</p>
        </div>
        
        {/* Improvement Badge */}
        {stats.improvementNeeded !== undefined && stats.improvementNeeded > 0 && (
          <div className="px-3 py-1 rounded-lg text-xs font-bold bg-amber-500/20 text-amber-300">
            +AED {(stats.improvementNeeded / 1000).toFixed(0)}K needed/day
          </div>
        )}
      </div>
      
      {/* Legend */}
      <div className="flex items-center justify-center gap-5 mb-6 flex-wrap">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-cyan-500/30">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-500"></div>
          <span className="text-xs font-medium text-cyan-300">Current Daily Average</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-orange-500/30">
          <div className="w-2.5 h-2.5 rounded-full bg-orange-500"></div>
          <span className="text-xs font-medium text-orange-300">Required for 112%</span>
        </div>
      </div>
      
      <ResponsiveContainer width="100%" height={380}>
        <ComposedChart data={chartData} margin={{ top: 5, right: 30, bottom: 10, left: -20 }}>
          <defs>
            <linearGradient id="labourAvgGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={getLineColor()} stopOpacity={0.4}/>
              <stop offset="100%" stopColor={getLineColor()} stopOpacity={0.05}/>
            </linearGradient>
          </defs>
          
          {/* Performance Zones */}
          {latestData && (
            <>
              <ReferenceArea 
                y1={0} 
                y2={latestData.requiredAvg * 0.7} 
                fill="#ef4444" 
                fillOpacity={0.03}
              />
              <ReferenceArea 
                y1={latestData.requiredAvg * 0.7} 
                y2={latestData.requiredAvg} 
                fill="#f59e0b" 
                fillOpacity={0.03}
              />
              <ReferenceArea 
                y1={latestData.requiredAvg} 
                y2={latestData.requiredAvg * 1.5} 
                fill="#10b981" 
                fillOpacity={0.03}
              />
            </>
          )}
          
          {/* Today Marker */}
          {currentDay > 0 && (
            <ReferenceLine 
              x={currentDay} 
              stroke="#ffffff" 
              strokeWidth={2} 
              strokeDasharray="3 3"
              label={{ 
                value: 'TODAY', 
                position: 'top', 
                fill: '#ffffff', 
                fontSize: 10, 
                fontWeight: 'bold'
              }}
            />
          )}
          
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
          
          <XAxis 
            dataKey="day" 
            tick={{ fontSize: 10, fill: '#9ca3af' }}
            stroke="#4b5563"
            tickLine={{ stroke: '#4b5563' }}
            axisLine={{ stroke: '#4b5563' }}
          />
          <YAxis 
            tick={{ fontSize: 10, fill: '#9ca3af' }}
            stroke="#4b5563"
            tickLine={{ stroke: '#4b5563' }}
            axisLine={{ stroke: '#4b5563' }}
            tickFormatter={(value: number) => new Intl.NumberFormat('en-AE', { notation: 'compact', compactDisplay: 'short' }).format(value)}
            width={50}
          />
          <Tooltip content={<CustomTooltip />} />
          
          <Area 
            type="monotone"
            dataKey="currentAvg" 
            fill="url(#labourAvgGradient)" 
            stroke={getLineColor()} 
            strokeWidth={4}
            dot={{ fill: getLineColor(), r: 4, strokeWidth: 2 }}
            activeDot={{ r: 6, strokeWidth: 3 }}
            name="Current Daily Average"
            animationDuration={1500}
          />
          <Line 
            type="monotone"
            dataKey="requiredAvg" 
            stroke="#f97316" 
            strokeWidth={2.5}
            strokeDasharray="4 4"
            dot={false}
            name="Required for 112%"
            animationDuration={1000}
          />
        </ComposedChart>
      </ResponsiveContainer>
      
      {/* Mini Stats */}
      {stats.overallAvg && (
        <div className="mt-6 grid grid-cols-3 gap-4 border-t border-white/10 pt-4">
          <div className="text-center">
            <p className="text-xs text-gray-400 mb-1">Best Day Avg</p>
            <p className="text-sm font-bold text-white">AED {(stats.bestDayAvg / 1000).toFixed(0)}K</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-400 mb-1">7-Day Avg</p>
            <p className="text-sm font-bold text-white">AED {(stats.movingAvg7Day / 1000).toFixed(0)}K</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-400 mb-1">Status</p>
            <p className={`text-sm font-bold ${stats.isOnTrack ? 'text-emerald-400' : 'text-amber-400'}`}>
              {stats.isOnTrack ? '✓ On Target' : '⚡ Push Harder'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

/* ---------------- Salesperson Performance Card ---------------- */
const SalespersonCard: React.FC<{ 
  name: string; 
  amount: number; 
  totalSales: number;
  rank: number;
}> = ({ name, amount, totalSales, rank }) => {
  const percentage = totalSales > 0 ? (amount / totalSales) * 100 : 0;
  
  const formatCurrency = (amount: number) => {
    return `AED ${new Intl.NumberFormat('en-AE', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)}`;
  };

  const formatCompact = (amount: number) => {
    if (amount >= 1000000) {
      return `${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `${(amount / 1000).toFixed(0)}K`;
    }
    return amount.toString();
  };

  const getRankBadge = (rank: number) => {
    switch(rank) {
      case 1:
        return (
          <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-gradient-to-br from-white to-gray-300 border-2 border-white/20 flex items-center justify-center shadow-lg">
            <span className="text-xs font-black text-gray-900">1st</span>
          </div>
        );
      case 2:
        return (
          <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-gradient-to-br from-gray-300 to-gray-400 border-2 border-white/20 flex items-center justify-center shadow-lg">
            <span className="text-xs font-black text-gray-900">2nd</span>
          </div>
        );
      case 3:
        return (
          <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-gradient-to-br from-gray-400 to-gray-500 border-2 border-white/20 flex items-center justify-center shadow-lg">
            <span className="text-xs font-black text-white">3rd</span>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className={`relative rounded-xl bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border ${
      rank === 1 ? 'border-white/30 shadow-xl shadow-white/10' : 'border-white/10'
    } p-5 transition-all duration-300 hover:scale-105 hover:shadow-2xl`}>
      {getRankBadge(rank)}
      
      {/* Name */}
      <div className="text-center mb-4">
        <h4 className="text-lg font-black text-white uppercase tracking-wider">{name}</h4>
        <div className="h-0.5 w-12 mx-auto mt-2 bg-gradient-to-r from-transparent via-white/50 to-transparent"></div>
      </div>

      {/* Total Sales Amount */}
      <div className="text-center mb-4">
        <p className="text-xs text-white/50 uppercase tracking-wider mb-1">Total Sales</p>
        <p className="text-2xl font-black text-white">{formatCompact(amount)}</p>
        <p className="text-xs text-white/40 mt-1">{formatCurrency(amount)}</p>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="w-full bg-white/10 rounded-full h-2.5 overflow-hidden">
          <div 
            className="bg-gradient-to-r from-white/90 to-white/70 h-2.5 rounded-full transition-all duration-1000 ease-out shadow-lg shadow-white/20"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      {/* Percentage of Total */}
      <div className="text-center">
        <div className="inline-flex items-center justify-center px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
          <span className="text-xs font-bold text-white/90">{percentage.toFixed(1)}%</span>
          <span className="text-xs text-white/50 ml-1.5">of total</span>
        </div>
      </div>
    </div>
  );
};

/* ---------------- Target Achievement Forecast Chart ---------------- */
const TargetAchievementForecastChart: React.FC<{ 
  metrics: DailyServiceMetrics[];
  target: ServiceMonthlyTarget | null;
  selectedDate: string;
}> = ({ metrics, target, selectedDate }) => {
  const [chartData, setChartData] = useState<any[]>([]);
  const [forecastStats, setForecastStats] = useState<any>({});

  useEffect(() => {
    if (metrics.length > 0 && target) {
      const sortedMetrics = [...metrics].sort((a, b) => 
        new Date(a.metric_date).getTime() - new Date(b.metric_date).getTime()
      );

      const latestMetric = sortedMetrics[sortedMetrics.length - 1];
      const currentSales = latestMetric.current_net_sales || 0;
      const estimatedSales = latestMetric.estimated_net_sales || 0;
      const workingDaysElapsed = latestMetric.working_days_elapsed || 1;
      const totalWorkingDays = target.number_of_working_days || 1;
      const remainingDays = totalWorkingDays - workingDaysElapsed;

      // Calculate projections
      const target100 = target.net_sales_target || 0;
      const target112 = target.net_sales_112_percent || 0;
      const projectedFinish = estimatedSales;
      
      // Calculate required daily average to hit targets
      const requiredDailyFor100 = remainingDays > 0 ? (target100 - currentSales) / remainingDays : 0;
      const requiredDailyFor112 = remainingDays > 0 ? (target112 - currentSales) / remainingDays : 0;
      const currentDailyAvg = workingDaysElapsed > 0 ? currentSales / workingDaysElapsed : 0;

      // Build chart data
      const data = [];
      for (let day = 1; day <= totalWorkingDays; day++) {
        const isHistorical = day <= workingDaysElapsed;
        const historicalMetric = sortedMetrics.find(m => {
          const metricDay = new Date(m.metric_date).getDate();
          return metricDay === day;
        });

        data.push({
          day: day,
          actual: isHistorical ? (historicalMetric?.current_net_sales || 0) : null,
          projected: !isHistorical ? (currentSales + (day - workingDaysElapsed) * currentDailyAvg) : null,
          target100: (target100 / totalWorkingDays) * day,
          target112: (target112 / totalWorkingDays) * day,
        });
      }

      setChartData(data);
      setForecastStats({
        projectedFinish,
        target100,
        target112,
        will100: projectedFinish >= target100,
        will112: projectedFinish >= target112,
        requiredDailyFor100,
        requiredDailyFor112,
        currentDailyAvg,
        gap100: projectedFinish - target100,
        gap112: projectedFinish - target112,
      });
    }
  }, [metrics, target, selectedDate]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-AE', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  return (
    <div className="rounded-xl bg-black backdrop-blur-xl border border-white/20 shadow-2xl p-6">
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white mb-1">Target Achievement Forecast</h3>
            <p className="text-xs text-gray-400">Projected vs target trajectory</p>
          </div>
          {forecastStats.will100 !== undefined && (
            <div className={`px-3 py-1 rounded-lg text-xs font-bold ${
              forecastStats.will112 ? 'bg-emerald-500/20 text-emerald-300' :
              forecastStats.will100 ? 'bg-amber-500/20 text-amber-300' :
              'bg-red-500/20 text-red-300'
            }`}>
              {forecastStats.will112 ? '🎯 112% Track' : forecastStats.will100 ? '✓ 100% Track' : '⚠ Below Target'}
            </div>
          )}
        </div>
      </div>
      
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={chartData} margin={{ top: 20, right: 30, bottom: 10, left: -20 }}>
          <defs>
            <linearGradient id="actualGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity={0.3}/>
              <stop offset="100%" stopColor="#10b981" stopOpacity={0.05}/>
            </linearGradient>
            <linearGradient id="projectedGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366f1" stopOpacity={0.3}/>
              <stop offset="100%" stopColor="#6366f1" stopOpacity={0.05}/>
            </linearGradient>
          </defs>
          
          {/* Safe/Danger Zones */}
          {target && (
            <>
              <ReferenceArea 
                y1={0} 
                y2={forecastStats.target100 * 0.9} 
                fill="#ef4444" 
                fillOpacity={0.05}
              />
              <ReferenceArea 
                y1={forecastStats.target100 * 0.9} 
                y2={forecastStats.target100} 
                fill="#f59e0b" 
                fillOpacity={0.05}
              />
              <ReferenceArea 
                y1={forecastStats.target100} 
                y2={forecastStats.target112 * 1.1} 
                fill="#10b981" 
                fillOpacity={0.05}
              />
            </>
          )}
          
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
          <XAxis 
            dataKey="day" 
            tick={{ fontSize: 10, fill: '#9ca3af' }}
            stroke="#4b5563"
            tickLine={{ stroke: '#4b5563' }}
            axisLine={{ stroke: '#4b5563' }}
          />
          <YAxis 
            tick={{ fontSize: 10, fill: '#9ca3af' }}
            stroke="#4b5563"
            tickLine={{ stroke: '#4b5563' }}
            axisLine={{ stroke: '#4b5563' }}
            tickFormatter={(value: number) => new Intl.NumberFormat('en-AE', { notation: 'compact', compactDisplay: 'short' }).format(value)}
            width={50}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'rgba(0, 0, 0, 0.98)', 
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '12px',
              padding: '12px'
            }}
            labelStyle={{ color: '#ffffff', fontWeight: 700 }}
            itemStyle={{ color: '#d1d5db', fontSize: '12px' }}
            formatter={(value: any) => value ? `AED ${formatCurrency(Number(value))}` : 'N/A'}
            labelFormatter={(value: string | number) => `Day ${value}`}
          />
          
          <Line 
            type="monotone"
            dataKey="target100" 
            stroke="#ffffff" 
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={false}
            name="100% Target"
            strokeOpacity={0.5}
          />
          <Line 
            type="monotone"
            dataKey="target112" 
            stroke="#f59e0b" 
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={false}
            name="112% Target"
            strokeOpacity={0.7}
          />
          <Area 
            type="monotone"
            dataKey="actual" 
            fill="url(#actualGradient)" 
            stroke="#10b981" 
            strokeWidth={3}
            dot={{ fill: '#10b981', r: 3 }}
            name="Actual"
          />
          <Line 
            type="monotone"
            dataKey="projected" 
            stroke="#6366f1" 
            strokeWidth={3}
            strokeDasharray="3 3"
            dot={{ fill: '#6366f1', r: 3 }}
            name="Projected"
          />
        </ComposedChart>
      </ResponsiveContainer>

      {/* Forecast Stats */}
      <div className="mt-4 grid grid-cols-3 gap-4 border-t border-white/10 pt-4">
        <div className="text-center">
          <p className="text-xs text-gray-400 mb-1">Projected Finish</p>
          <p className={`text-sm font-bold ${
            forecastStats.will112 ? 'text-emerald-400' : 
            forecastStats.will100 ? 'text-amber-400' : 
            'text-red-400'
          }`}>
            AED {(forecastStats.projectedFinish / 1000).toFixed(0)}K
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-400 mb-1">Gap to 100%</p>
          <p className={`text-sm font-bold ${forecastStats.gap100 >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {forecastStats.gap100 >= 0 ? '+' : ''}{(forecastStats.gap100 / 1000).toFixed(0)}K
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-400 mb-1">Gap to 112%</p>
          <p className={`text-sm font-bold ${forecastStats.gap112 >= 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
            {forecastStats.gap112 >= 0 ? '+' : ''}{(forecastStats.gap112 / 1000).toFixed(0)}K
          </p>
        </div>
      </div>
    </div>
  );
};

/* ---------------- Labour vs Parts Breakdown Chart ---------------- */
const LabourPartsBreakdownChart: React.FC<{ 
  dashboardData: DailyServiceMetrics | null;
  target: ServiceMonthlyTarget | null;
}> = ({ dashboardData, target }) => {
  if (!dashboardData) return null;

  const labourSales = dashboardData.current_net_labor_sales || 0;
  const totalSales = dashboardData.current_net_sales || 0;
  const partsSales = totalSales - labourSales;

  const pieData = [
    { name: 'Labour Sales', value: labourSales, color: '#10b981' },
    { name: 'Parts Sales', value: partsSales, color: '#f59e0b' },
  ];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-AE', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const CustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        fontSize="14"
        fontWeight="bold"
      >
        {`${(percent * 100).toFixed(1)}%`}
      </text>
    );
  };

  return (
    <div className="rounded-xl bg-black backdrop-blur-xl border border-white/20 shadow-2xl p-6">
      <div className="mb-4">
        <h3 className="text-base font-bold text-white mb-1">Revenue Mix</h3>
        <p className="text-xs text-gray-400">Labour vs Parts sales breakdown</p>
      </div>
      
      <div className="flex items-center justify-center">
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={CustomLabel}
              outerRadius={100}
              fill="#8884d8"
              dataKey="value"
              animationDuration={1000}
            >
              {pieData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'rgba(0, 0, 0, 0.98)', 
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '12px',
                padding: '12px'
              }}
              formatter={(value: any) => `AED ${formatCurrency(Number(value))}`}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Legend and Stats */}
      <div className="mt-4 space-y-3 border-t border-white/10 pt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
            <span className="text-xs text-white/70">Labour Sales</span>
          </div>
          <span className="text-sm font-bold text-white">AED {formatCurrency(labourSales)}</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-amber-500"></div>
            <span className="text-xs text-white/70">Parts Sales</span>
          </div>
          <span className="text-sm font-bold text-white">AED {formatCurrency(partsSales)}</span>
        </div>
        <div className="flex items-center justify-between pt-3 border-t border-white/10">
          <span className="text-xs font-bold text-white/90">Labour Ratio</span>
          <span className="text-sm font-bold text-emerald-400">
            {totalSales > 0 ? ((labourSales / totalSales) * 100).toFixed(1) : 0}%
          </span>
        </div>
      </div>
    </div>
  );
};

