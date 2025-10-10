"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Calendar, DollarSign, TrendingUp, Target, FileText, AlertCircle } from 'lucide-react';
import { ComposedChart, Line, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
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

      // Calculate sum of invoices for the month (not cumulative, so we need to sum)
      const invoiceSum = monthMetrics.reduce((sum, m) => sum + (m.number_of_invoices || 0), 0);
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
          <div className="grid grid-cols-5 gap-3">
            {/* Current Net Sales */}
            <div className="rounded-lg bg-gradient-to-br from-white/10 to-white/5 backdrop-blur p-4 border border-white/10 shadow-inner">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-white/70">Current Net Sales</p>
                <DollarSign className="w-5 h-5 text-white/60" />
              </div>
              <p className="text-3xl font-bold text-white mb-2">
                {formatCurrency(dashboardData.current_net_sales || 0)}
              </p>
              <div className="w-full bg-white/10 rounded-full h-2 mb-2">
                <div 
                  className="bg-gradient-to-r from-white/80 to-white/60 h-2 rounded-full transition-all duration-500" 
                  style={{ width: `${Math.min(dashboardData.current_net_sales_percentage || 0, 100)}%` }}
                ></div>
              </div>
              <p className="text-xs text-white/50">
                {formatPercentage(dashboardData.current_net_sales_percentage)}
              </p>
            </div>

            {/* Estimated Sales Month End */}
            <div className="rounded-lg bg-gradient-to-br from-white/10 to-white/5 backdrop-blur p-4 border border-white/10 shadow-inner">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-white/70">Est. Month End</p>
                <TrendingUp className="w-5 h-5 text-white/60" />
              </div>
              <p className="text-3xl font-bold text-white mb-2">
                {formatCurrency(dashboardData.estimated_net_sales || 0)}
              </p>
              <div className="w-full bg-white/10 rounded-full h-2 mb-2">
                <div 
                  className="bg-gradient-to-r from-white/80 to-white/60 h-2 rounded-full transition-all duration-500" 
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

            {/* Net Sales Target - 112% */}
            <div className="rounded-lg bg-gradient-to-br from-white/10 to-white/5 backdrop-blur p-4 border border-white/10 shadow-inner">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-white/70">Target - 112%</p>
                <Target className="w-5 h-5 text-white/60" />
              </div>
              <p className="text-3xl font-bold text-white mb-2">
                {monthTarget ? formatCurrency(monthTarget.net_sales_112_percent) : 'N/A'}
              </p>
              <p className="text-xs text-white/40">
                {monthTarget && (dashboardData.current_net_sales || 0) >= (monthTarget.net_sales_112_percent || 0)
                  ? `Exceeded by: ${formatCurrency((dashboardData.current_net_sales || 0) - (monthTarget.net_sales_112_percent || 0))}`
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
          <div className="grid grid-cols-5 gap-3">
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
                  className="bg-gradient-to-r from-white/80 to-white/60 h-2 rounded-full transition-all duration-500" 
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
                  className="bg-gradient-to-r from-white/80 to-white/60 h-2 rounded-full transition-all duration-500" 
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
                return date.getFullYear() === selectedYear && (date.getMonth() + 1) === selectedMonth;
              })}
              target={monthTarget}
            />

            {/* Labour Sales Progress Chart */}
            <LabourSalesProgressChart 
              metrics={metrics.filter(m => {
                const date = new Date(m.metric_date);
                return date.getFullYear() === selectedYear && (date.getMonth() + 1) === selectedMonth;
              })}
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

  useEffect(() => {
    if (metrics.length > 0 && target) {
      const sortedMetrics = [...metrics].sort((a, b) => 
        new Date(a.metric_date).getTime() - new Date(b.metric_date).getTime()
      );

      // Calculate cumulative target based on working days elapsed
      const data = sortedMetrics.map((metric, index) => {
        const day = new Date(metric.metric_date).getDate();
        const workingDaysElapsed = metric.working_days_elapsed || 1;
        const dailyCumulativeTarget = (target.daily_cumulative_target || 0) * workingDaysElapsed;
        
        return {
          day: day,
          cumulativeTarget: dailyCumulativeTarget,
          currentNetSales: metric.current_net_sales || 0,
          estimatedNetSales: metric.estimated_net_sales || 0,
          target112: target.net_sales_112_percent || 0,
        };
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

  return (
    <div className="rounded-xl bg-black backdrop-blur-xl border border-white/20 shadow-2xl p-6">
      <div className="mb-4">
        <h3 className="text-base font-bold text-white mb-1">Net Sales Progress</h3>
        <p className="text-xs text-gray-400">Month-to-date cumulative performance vs targets</p>
      </div>
      
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
              padding: '12px',
              boxShadow: '0 10px 40px rgba(0,0,0,0.5)'
            }}
            labelStyle={{ color: '#ffffff', fontWeight: 700, marginBottom: '8px' }}
            itemStyle={{ color: '#d1d5db', fontSize: '12px', padding: '4px 0' }}
            labelFormatter={(value) => `Day ${value}`}
            formatter={(value: any, name: string) => {
              const formattedValue = `AED ${formatCurrency(value)}`;
              if (name === 'Daily Cumulative Target') return [formattedValue, 'Daily Target'];
              if (name === 'Current Net Sales') return [formattedValue, 'Current'];
              if (name === 'Estimated Net Sales') return [formattedValue, 'Estimated'];
              if (name === 'Net Sales 112%') return [formattedValue, '112% Target'];
              return [formattedValue, name];
            }}
          />
          <Line 
            type="monotone"
            dataKey="cumulativeTarget" 
            stroke="#9ca3af" 
            strokeWidth={2}
            strokeOpacity={0.4}
            dot={{ fill: '#9ca3af', r: 2, strokeWidth: 0, fillOpacity: 0.4 }}
            name="Daily Cumulative Target"
          />
          <Area 
            type="monotone"
            dataKey="currentNetSales" 
            fill="url(#netSalesGradient)" 
            stroke="#10b981" 
            strokeWidth={3}
            dot={{ fill: '#10b981', r: 3, strokeWidth: 2, stroke: '#065f46' }}
            label={<CustomLabel />}
            name="Current Net Sales"
          />
          <Line 
            type="monotone"
            dataKey="estimatedNetSales" 
            stroke="#fb923c" 
            strokeWidth={2.5}
            strokeDasharray="4 4"
            dot={false}
            name="Estimated Net Sales"
          />
          <Line 
            type="monotone"
            dataKey="target112" 
            stroke="#f59e0b" 
            strokeWidth={2}
            strokeDasharray="6 3"
            dot={false}
            name="Net Sales 112%"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

/* ---------------- Labour Sales Progress Chart ---------------- */
const LabourSalesProgressChart: React.FC<{ 
  metrics: DailyServiceMetrics[]; 
  target: ServiceMonthlyTarget | null;
}> = ({ metrics, target }) => {
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    if (metrics.length > 0 && target) {
      const sortedMetrics = [...metrics].sort((a, b) => 
        new Date(a.metric_date).getTime() - new Date(b.metric_date).getTime()
      );

      const data = sortedMetrics.map((metric, index) => {
        const day = new Date(metric.metric_date).getDate();
        const workingDays = metric.working_days_elapsed || 1;
        const currentAvg = (metric.current_net_sales || 0) / workingDays;
        
        // Calculate required daily average to hit 112%
        const target112 = (target.net_sales_target || 0) * 1.12;
        const remainingDays = (target.number_of_working_days || 1) - workingDays;
        const requiredAvg = remainingDays > 0 
          ? (target112 - (metric.current_net_sales || 0)) / remainingDays
          : 0;

        return {
          day: day,
          currentAvg: currentAvg || 0,
          requiredAvg: requiredAvg > 0 ? requiredAvg : 0,
        };
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

  const CustomAvgLabel = (props: any) => {
    const { x, y, value, index } = props;
    // Only show labels for every other point
    if (index % 2 !== 0) return null;
    return (
      <text 
        x={x} 
        y={y - 8} 
        fill="#06b6d4" 
        fontSize="9" 
        fontWeight="700"
        textAnchor="middle"
      >
        AED {formatCurrency(value)}
      </text>
    );
  };

  const CustomRequiredLabel = (props: any) => {
    const { x, y, value, index } = props;
    // Only show labels for every other point
    if (index % 2 !== 0) return null;
    return (
      <text 
        x={x} 
        y={y - 8} 
        fill="#f97316" 
        fontSize="9" 
        fontWeight="700"
        textAnchor="middle"
      >
        AED {formatCurrency(value)}
      </text>
    );
  };

  return (
    <div className="rounded-xl bg-black backdrop-blur-xl border border-white/20 shadow-2xl p-6">
      <div className="mb-4">
        <h3 className="text-base font-bold text-white mb-1">Net Sales Daily Average</h3>
        <p className="text-xs text-gray-400">Current daily performance vs required pace for 112% target</p>
      </div>
      
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
              <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.4}/>
              <stop offset="100%" stopColor="#06b6d4" stopOpacity={0.05}/>
            </linearGradient>
          </defs>
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
              padding: '12px',
              boxShadow: '0 10px 40px rgba(0,0,0,0.5)'
            }}
            labelStyle={{ color: '#ffffff', fontWeight: 700, marginBottom: '8px' }}
            itemStyle={{ color: '#d1d5db', fontSize: '12px', padding: '4px 0' }}
            labelFormatter={(value) => `Day ${value}`}
            formatter={(value: any, name: string) => {
              const formattedValue = `AED ${formatCurrency(value)}`;
              if (name === 'Current Daily Average') return [formattedValue, 'Current Avg'];
              if (name === 'Required for 112%') return [formattedValue, 'Required Avg'];
              return [formattedValue, name];
            }}
          />
          <Area 
            type="monotone"
            dataKey="currentAvg" 
            fill="url(#labourAvgGradient)" 
            stroke="#06b6d4" 
            strokeWidth={3}
            dot={{ fill: '#06b6d4', r: 3, strokeWidth: 2, stroke: '#0e7490' }}
            label={<CustomAvgLabel />}
            name="Current Daily Average"
          />
          <Line 
            type="monotone"
            dataKey="requiredAvg" 
            stroke="#f97316" 
            strokeWidth={2.5}
            dot={{ fill: '#f97316', r: 3, strokeWidth: 2, stroke: '#c2410c' }}
            label={<CustomRequiredLabel />}
            name="Required for 112%"
          />
        </ComposedChart>
      </ResponsiveContainer>
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

