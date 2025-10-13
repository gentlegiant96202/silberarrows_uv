"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Calendar, TrendingUp, Target, FileText, AlertCircle, ChevronDown, Zap, Users } from 'lucide-react';
import DirhamIcon from '@/components/ui/DirhamIcon';
import { ComposedChart, Line, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, ReferenceLine, ReferenceArea, CartesianGrid, PieChart, Pie, Cell } from 'recharts';
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
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  useEffect(() => {
    if (isInitialLoad && !loading) {
      const timer = setTimeout(() => setIsInitialLoad(false), 500);
      return () => clearTimeout(timer);
    }
  }, [loading, isInitialLoad]);

  const availableDates = metrics
    .filter(m => {
      const date = new Date(m.metric_date);
      return date.getFullYear() === selectedYear && (date.getMonth() + 1) === selectedMonth;
    })
    .map(m => m.metric_date)
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  useEffect(() => {
    const loadDashboardData = () => {
      const target = targets.find(t => t.year === selectedYear && t.month === selectedMonth);
      setMonthTarget(target || null);

      const monthMetrics = metrics.filter(m => {
        const date = new Date(m.metric_date);
        return date.getFullYear() === selectedYear && (date.getMonth() + 1) === selectedMonth;
      });

      if (monthMetrics.length === 0) {
        setDashboardData(null);
        setMonthlyInvoiceSum(0);
        return;
      }

      let selectedMetric: DailyServiceMetrics | null = null;
      
      if (selectedDate) {
        selectedMetric = monthMetrics.find(m => m.metric_date === selectedDate) || null;
      } else {
        const latestDate = monthMetrics.sort((a, b) => 
          new Date(b.metric_date).getTime() - new Date(a.metric_date).getTime()
        )[0];
        selectedMetric = latestDate;
        if (latestDate) {
          setSelectedDate(latestDate.metric_date);
        }
      }

      setDashboardData(selectedMetric);

      const selectedDateObj = selectedMetric ? new Date(selectedMetric.metric_date) : new Date();
      const invoiceSum = monthMetrics
        .filter(m => new Date(m.metric_date) <= selectedDateObj)
        .reduce((sum, m) => sum + (m.number_of_invoices || 0), 0);
      setMonthlyInvoiceSum(invoiceSum);
    };

    loadDashboardData();
  }, [selectedYear, selectedMonth, selectedDate, metrics, targets]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AE', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatPercentage = (value: number | undefined | null) => {
    if (value === null || value === undefined || isNaN(value)) {
      return '0.0%';
    }
    return `${value.toFixed(1)}%`;
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 100) return 'from-emerald-400 to-emerald-500';
    if (percentage >= 80) return 'from-amber-400 to-amber-500';
    return 'from-rose-400 to-rose-500';
  };

  const getStatusBadge = (current: number, target: number, stretch?: boolean) => {
    const targetValue = stretch ? target * 1.12 : target;
    if (current >= targetValue) {
      return (
        <span className={`absolute -top-2 -right-2 text-[10px] px-2 py-1 rounded-full font-bold border backdrop-blur-sm ${
          stretch 
            ? 'bg-amber-500/30 text-amber-200 border-amber-400/50 shadow-lg shadow-amber-500/20' 
            : 'bg-emerald-500/30 text-emerald-200 border-emerald-400/50 shadow-lg shadow-emerald-500/20'
        }`}>
          {stretch ? '⚡ STRETCH' : '✓ MET'}
        </span>
      );
    }
    return null;
  };

  const vehicleThroughput = dashboardData && dashboardData.working_days_elapsed > 0
    ? monthlyInvoiceSum / dashboardData.working_days_elapsed
    : 0;

  const averageInvoiceValue = monthlyInvoiceSum > 0 && dashboardData
    ? dashboardData.current_net_sales / monthlyInvoiceSum
    : 0;

  const marketingSpendPercentage = dashboardData && dashboardData.current_net_sales > 0
    ? (dashboardData.current_marketing_spend / dashboardData.current_net_sales) * 100
    : 0;

  if (loading || isInitialLoad) {
    return (
      <div className="h-screen bg-black flex items-center justify-center overflow-hidden">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-6"></div>
          <p className="text-white/80 text-xl font-medium">Loading Service Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-black p-4 lg:p-8 overflow-auto">
      <div className="fixed inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,black,transparent)] pointer-events-none"></div>
      
      <div className="w-full space-y-8 relative z-10">
        {/* Header */}
        <div className="bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 p-8 shadow-2xl">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <h1 className="text-3xl font-bold text-white tracking-tight">Service Department Dashboard</h1>
              <p className="text-white/60 text-base mt-2">Real-time performance metrics and business insights</p>
            </div>
        
            <div className="flex flex-wrap gap-3">
              <div className="relative">
                <select
                  value={selectedMonth}
                  onChange={(e) => {
                    setSelectedMonth(Number(e.target.value));
                    setSelectedDate('');
                  }}
                  className="appearance-none bg-black/30 backdrop-blur-xl border border-white/10 rounded-2xl pl-5 pr-12 py-3 text-white text-base font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/50 cursor-pointer hover:bg-white/5 transition-all duration-200"
                >
                  {[
                    { value: 1, label: 'January' }, { value: 2, label: 'February' },
                    { value: 3, label: 'March' }, { value: 4, label: 'April' },
                    { value: 5, label: 'May' }, { value: 6, label: 'June' },
                    { value: 7, label: 'July' }, { value: 8, label: 'August' },
                    { value: 9, label: 'September' }, { value: 10, label: 'October' },
                    { value: 11, label: 'November' }, { value: 12, label: 'December' }
                  ].map(month => (
                    <option key={month.value} value={month.value} className="bg-gray-900 text-white">
                      {month.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-white/40 absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none" />
              </div>

              <div className="relative">
                <select
                  value={selectedYear}
                  onChange={(e) => {
                    setSelectedYear(Number(e.target.value));
                    setSelectedDate('');
                  }}
                  className="appearance-none bg-black/30 backdrop-blur-xl border border-white/10 rounded-2xl pl-5 pr-12 py-3 text-white text-base font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/50 cursor-pointer hover:bg-white/5 transition-all duration-200"
                >
                  {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
                    <option key={year} value={year} className="bg-gray-900 text-white">{year}</option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-white/40 absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none" />
              </div>

              <div className="relative">
                <select
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="appearance-none bg-black/30 backdrop-blur-xl border border-white/10 rounded-2xl pl-5 pr-12 py-3 text-white text-base font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/50 cursor-pointer hover:bg-white/5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={availableDates.length === 0}
            >
              {availableDates.length === 0 ? (
                <option>No data available</option>
              ) : (
                availableDates.map(date => (
                      <option key={date} value={date} className="bg-gray-900 text-white">
                        {new Date(date).toLocaleDateString('en-GB', { 
                          day: 'numeric', 
                          month: 'short',
                          year: 'numeric'
                        })}
                  </option>
                ))
              )}
                </select>
                <Calendar className="w-4 h-4 text-white/40 absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
        </div>
      </div>

      {!dashboardData ? (
          <div className="bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 p-12 flex flex-col items-center justify-center text-center min-h-[400px]">
            <AlertCircle className="w-20 h-20 text-white/40 mb-6" />
            <h3 className="text-2xl font-semibold text-white/80 mb-3">No Data Available</h3>
            <p className="text-white/50 text-lg">Please select a different period or add data in the Data Grid tab</p>
        </div>
      ) : (
        <>
            {/* Net Sales Metrics */}
            <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
              <div className="relative bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 p-8 xl:col-span-2">
              {monthTarget && getStatusBadge(dashboardData.current_net_sales || 0, monthTarget.net_sales_target)}
              
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <p className="text-white/60 text-sm font-medium uppercase tracking-wider mb-2">Current Net Sales</p>
                    <h2 className="text-2xl font-bold text-white">Performance Overview</h2>
              </div>
                  <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
                    <TrendingUp className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div className="flex items-center gap-4 mb-6">
                  <DirhamIcon className="w-12 h-12 text-white/90" />
                  <p className="text-5xl font-black text-white">
                  {formatCurrency(dashboardData.current_net_sales || 0)}
                </p>
              </div>
                <div className="w-full bg-white/10 rounded-full h-3 mb-4">
                <div 
                  className={`bg-gradient-to-r ${getProgressColor(dashboardData.current_net_sales_percentage || 0)} h-3 rounded-full transition-all duration-500 shadow-lg`}
                  style={{ width: `${Math.min(dashboardData.current_net_sales_percentage || 0, 100)}%` }}
                ></div>
              </div>
                <p className="text-xl font-bold text-white">
                {formatPercentage(dashboardData.current_net_sales_percentage)}
              </p>
            </div>

              <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-white/70 font-medium">Est. Month End</p>
                <TrendingUp className="w-5 h-5 text-white/60" />
              </div>
                <div className="flex items-center gap-3 mb-3">
                  <DirhamIcon className="w-7 h-7 text-white/80" />
                  <p className="text-2xl font-bold text-white">
                  {formatCurrency(dashboardData.estimated_net_sales || 0)}
                </p>
              </div>
                <div className="w-full bg-white/10 rounded-full h-2 mb-3">
                <div 
                  className={`bg-gradient-to-r ${getProgressColor(dashboardData.estimated_net_sales_percentage || 0)} h-2 rounded-full transition-all duration-500 shadow-md`}
                  style={{ width: `${Math.min(dashboardData.estimated_net_sales_percentage || 0, 100)}%` }}
                ></div>
              </div>
                <p className="text-white/50 text-sm">
                {formatPercentage(dashboardData.estimated_net_sales_percentage)}
              </p>
            </div>

              <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-white/70 font-medium">Daily Average</p>
              </div>
                <div className="flex items-center gap-3 mb-3">
                  <DirhamIcon className="w-7 h-7 text-white/80" />
                  <p className="text-2xl font-bold text-white">
                  {formatCurrency(dashboardData.current_daily_average || 0)}
                </p>
              </div>
                <p className="text-white/40 text-sm">Daily pace</p>
            </div>

              <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6 space-y-4">
                {/* 100% Target */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-white/70 font-medium">Target - 100%</p>
                <Target className="w-5 h-5 text-white/60" />
              </div>
                  <div className="flex items-center gap-3 mb-3">
                    <DirhamIcon className="w-7 h-7 text-white/80" />
                    <p className="text-2xl font-bold text-white">
                  {monthTarget ? formatCurrency(monthTarget.net_sales_target) : 'N/A'}
                </p>
              </div>
                  <p className="text-white/40 text-sm">
                {(dashboardData.current_net_sales || 0) >= (monthTarget?.net_sales_target || 0) 
                  ? `Exceeded by: ${formatCurrency((dashboardData.current_net_sales || 0) - (monthTarget?.net_sales_target || 0))}`
                  : `Remaining: ${formatCurrency((monthTarget?.net_sales_target || 0) - (dashboardData.current_net_sales || 0))}`
                }
              </p>
            </div>

                {/* Divider */}
                <div className="border-t border-white/10"></div>

                {/* 112% Stretch Goal - Nested Inside */}
                <div className="relative bg-gradient-to-br from-amber-500/20 to-amber-600/10 rounded-xl border-2 border-amber-500/40 p-4">
              {monthTarget && getStatusBadge(dashboardData.current_net_sales || 0, monthTarget.net_sales_target, true)}
              
              <div className="flex items-center justify-between mb-3">
                    <p className="text-amber-200 font-bold text-sm">Stretch Goal - 112% ⚡</p>
                    <Zap className="w-4 h-4 text-amber-300" />
              </div>
              <div className="flex items-center gap-2 mb-2">
                <DirhamIcon className="w-6 h-6 text-amber-200" />
                    <p className="text-xl font-bold text-amber-100">
                  {monthTarget ? formatCurrency(monthTarget.net_sales_112_percent) : 'N/A'}
                </p>
              </div>
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
          </div>

            {/* Labour Sales Metrics */}
            <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
              <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-white/70 font-medium">Current Labour</p>
              </div>
                <div className="flex items-center gap-3 mb-3">
                  <DirhamIcon className="w-7 h-7 text-white/80" />
                  <p className="text-2xl font-bold text-white">
                  {formatCurrency(dashboardData.current_net_labor_sales || 0)}
                </p>
              </div>
                <div className="w-full bg-white/10 rounded-full h-2 mb-3">
                <div 
                  className={`bg-gradient-to-r ${getProgressColor(dashboardData.current_labour_sales_percentage || 0)} h-2 rounded-full transition-all duration-500 shadow-md`}
                  style={{ width: `${Math.min(dashboardData.current_labour_sales_percentage || 0, 100)}%` }}
                ></div>
              </div>
                <p className="text-white/50 text-sm">
                {formatPercentage(dashboardData.current_labour_sales_percentage)}
              </p>
            </div>

              <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-white/70 font-medium">Est. Labour End</p>
                <TrendingUp className="w-5 h-5 text-white/60" />
              </div>
                <div className="flex items-center gap-3 mb-3">
                  <DirhamIcon className="w-7 h-7 text-white/80" />
                  <p className="text-2xl font-bold text-white">
                  {formatCurrency(dashboardData.estimated_labor_sales || 0)}
                </p>
              </div>
                <div className="w-full bg-white/10 rounded-full h-2 mb-3">
                <div 
                  className={`bg-gradient-to-r ${getProgressColor(dashboardData.estimated_labor_sales_percentage || 0)} h-2 rounded-full transition-all duration-500 shadow-md`}
                  style={{ width: `${Math.min(dashboardData.estimated_labor_sales_percentage || 0, 100)}%` }}
                ></div>
              </div>
                <p className="text-white/50 text-sm">
                {formatPercentage(dashboardData.estimated_labor_sales_percentage)}
              </p>
            </div>

              <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-white/70 font-medium">Daily Average</p>
              </div>
                <div className="flex items-center gap-3 mb-3">
                  <DirhamIcon className="w-7 h-7 text-white/80" />
                  <p className="text-2xl font-bold text-white">
                  {formatCurrency((dashboardData.working_days_elapsed || 0) > 0 
                    ? (dashboardData.current_net_labor_sales || 0) / (dashboardData.working_days_elapsed || 1)
                    : 0)}
                </p>
              </div>
                <p className="text-white/40 text-sm">Daily pace</p>
            </div>

              <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-white/70 font-medium">Target - 100%</p>
                <Target className="w-5 h-5 text-white/60" />
              </div>
                <div className="flex items-center gap-3 mb-3">
                  <DirhamIcon className="w-7 h-7 text-white/80" />
                  <p className="text-2xl font-bold text-white">
                  {monthTarget ? formatCurrency(monthTarget.labour_sales_target) : 'N/A'}
                </p>
              </div>
                <p className="text-white/40 text-sm">
                {(dashboardData.current_net_labor_sales || 0) >= (monthTarget?.labour_sales_target || 0)
                  ? `Exceeded by: ${formatCurrency((dashboardData.current_net_labor_sales || 0) - (monthTarget?.labour_sales_target || 0))}`
                  : `Remaining: ${formatCurrency((monthTarget?.labour_sales_target || 0) - (dashboardData.current_net_labor_sales || 0))}`
                }
              </p>
            </div>

              <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-white/70 font-medium">Target - 112%</p>
                <Target className="w-5 h-5 text-white/60" />
              </div>
                <div className="flex items-center gap-3 mb-3">
                  <DirhamIcon className="w-7 h-7 text-white/80" />
                  <p className="text-2xl font-bold text-white">
                  {monthTarget ? formatCurrency(monthTarget.labour_sales_target * 1.12) : 'N/A'}
                </p>
              </div>
                <p className="text-white/40 text-sm">
                {monthTarget && (dashboardData.current_net_labor_sales || 0) >= ((monthTarget.labour_sales_target || 0) * 1.12)
                  ? `Exceeded by: ${formatCurrency((dashboardData.current_net_labor_sales || 0) - ((monthTarget.labour_sales_target || 0) * 1.12))}`
                  : monthTarget ? `Remaining: ${formatCurrency(((monthTarget.labour_sales_target || 0) * 1.12) - (dashboardData.current_net_labor_sales || 0))}` : 'N/A'
                }
              </p>
            </div>
          </div>

            {/* Progress Charts */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
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

            {/* Additional Charts */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
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

            <LabourPartsBreakdownChart 
              dashboardData={dashboardData}
              target={monthTarget}
            />
          </div>

            {/* Annual Performance Charts - Full Width */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
              <AnnualNetSalesChart 
                metrics={metrics}
                targets={targets}
                selectedYear={selectedYear}
              />
              <AnnualLabourSalesChart 
                metrics={metrics}
                targets={targets}
                selectedYear={selectedYear}
              />
            </div>

            {/* KPI Grid & Performance */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
              <div className="grid grid-cols-2 gap-6 xl:col-span-2">
                <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-white/70 font-medium">Marketing %</p>
                  <DirhamIcon className="w-5 h-5 text-white/60" />
                </div>
                  <p className="text-3xl font-bold text-white mb-2">{formatPercentage(marketingSpendPercentage)}</p>
                  <p className="text-white/40 text-sm">Of sales</p>
              </div>

                <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-white/70 font-medium">Avg Invoice</p>
                  <FileText className="w-5 h-5 text-white/60" />
                </div>
                  <div className="flex items-center gap-3 mb-2">
                    <DirhamIcon className="w-6 h-6 text-white/80" />
                    <p className="text-3xl font-bold text-white">{formatCurrency(averageInvoiceValue)}</p>
                  </div>
                  <p className="text-white/40 text-sm">Per invoice</p>
              </div>

                <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-white/70 font-medium">Marketing</p>
                </div>
                  <div className="flex items-center gap-3 mb-2">
                    <DirhamIcon className="w-6 h-6 text-white/80" />
                    <p className="text-3xl font-bold text-white">{formatCurrency(dashboardData.current_marketing_spend || 0)}</p>
                  </div>
                  <p className="text-white/40 text-sm">Total spend</p>
              </div>

                <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-white/70 font-medium">Invoices</p>
                  <FileText className="w-5 h-5 text-white/60" />
                </div>
                  <p className="text-3xl font-bold text-white mb-2">{monthlyInvoiceSum}</p>
                  <p className="text-white/40 text-sm">This month</p>
              </div>
            </div>

              <div className="bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 p-8">
                <h3 className="text-xl font-semibold text-white mb-6">Vehicle Throughput</h3>
              <div className="flex items-center justify-center">
                <VehicleThroughputGauge value={vehicleThroughput} />
              </div>
            </div>
          </div>

            {/* Team Performance */}
            <div className="bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 p-8">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-semibold text-white">Team Performance</h3>
                <Users className="w-6 h-6 text-white/60" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
    <div className="relative w-56 h-56">
      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 200 200">
        <circle
          cx="100"
          cy="100"
          r="85"
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="12"
          strokeDasharray="376.99"
          strokeDashoffset="125.66"
        />
        <circle
          cx="100"
          cy="100"
          r="85"
          fill="none"
          stroke="url(#silverGradient)"
          strokeWidth="12"
          strokeDasharray="376.99"
          strokeDashoffset={125.66 + (251.33 * (1 - percentage / 100))}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
        <defs>
          <linearGradient id="silverGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity={0.9} />
            <stop offset="50%" stopColor="#d1d5db" stopOpacity={0.7} />
            <stop offset="100%" stopColor="#ffffff" stopOpacity={0.9} />
          </linearGradient>
        </defs>
      </svg>
      
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <p className="text-4xl font-bold text-white">{safeValue.toFixed(1)}</p>
        <p className="text-white/60 text-sm mt-2">invoices/day</p>
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

  useEffect(() => {
    if (metrics.length > 0 && target) {
      const sortedMetrics = [...metrics].sort((a, b) => 
        new Date(a.metric_date).getTime() - new Date(b.metric_date).getTime()
      );

      const totalWorkingDays = target.number_of_working_days || 22;
      const data = [];
      
      for (let workingDay = 1; workingDay <= totalWorkingDays; workingDay++) {
        const dailyCumulativeTarget = (target.daily_cumulative_target || 0) * workingDay;
        const metric = sortedMetrics[workingDay - 1];
        const metricDayOfMonth = metric ? new Date(metric.metric_date).getDate() : null;
        
        data.push({
          day: metricDayOfMonth || workingDay,
          cumulativeTarget: dailyCumulativeTarget,
          currentNetSales: metric ? (metric.current_net_sales || 0) : null,
          estimatedNetSales: metric ? (metric.estimated_net_sales || 0) : null,
          target112: target.net_sales_112_percent || 0,
        });
      }

      const actualData = data.filter(d => d.currentNetSales !== null);
      const salesValues = actualData.map(d => d.currentNetSales!);
      const bestDay = salesValues.length > 0 ? Math.max(...salesValues) : 0;
      const avgDaily = salesValues.length > 0 ? salesValues.reduce((a, b) => a + b, 0) / salesValues.length : 0;
      const latestData = actualData[actualData.length - 1];
      const daysAheadBehind = latestData ? 
        Math.round((latestData.currentNetSales! - latestData.cumulativeTarget) / (target.daily_cumulative_target || 1)) : 0;
      
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
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    
    const data = payload[0].payload;
    const gap = data.currentNetSales - data.cumulativeTarget;
    const percentageOfTarget = (data.currentNetSales / data.cumulativeTarget) * 100;
    
    return (
      <div className="bg-black/98 backdrop-blur-2xl border border-white/30 rounded-2xl p-4 shadow-2xl">
        <p className="text-white font-bold text-sm mb-3">Day {data.day}</p>
        
        <div className="space-y-2 text-xs">
          <div className="flex justify-between items-center gap-4">
            <span className="text-emerald-400 font-semibold">Current:</span>
            <span className="text-white font-mono">{formatCurrency(data.currentNetSales)}</span>
          </div>
          
          <div className="flex justify-between items-center gap-4">
            <span className="text-gray-400 font-semibold">Target:</span>
            <span className="text-white font-mono">{formatCurrency(data.cumulativeTarget)}</span>
          </div>
          
          <div className="border-t border-white/10 pt-2 mt-2">
            <div className="flex justify-between items-center gap-4">
              <span className={`font-bold ${gap >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {gap >= 0 ? '↑ Ahead:' : '↓ Behind:'}
              </span>
              <span className={`font-mono font-bold ${gap >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {formatCurrency(Math.abs(gap))}
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

  const actualData = chartData.filter(d => d.currentNetSales !== null);
  const latestData = actualData[actualData.length - 1];
  const performance = latestData && latestData.cumulativeTarget > 0 ? (latestData.currentNetSales / latestData.cumulativeTarget) * 100 : 0;

  return (
    <div className="bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-bold text-white">Net Sales Progress</h3>
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
          <p className="text-white/60">Month-to-date cumulative performance vs targets</p>
        </div>
        
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
      
      <ResponsiveContainer width="100%" height={400}>
        <ComposedChart data={chartData} margin={{ top: 5, right: 30, bottom: 10, left: -20 }}>
          <defs>
            <linearGradient id="netSalesGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity={0.6}/>
              <stop offset="50%" stopColor="#10b981" stopOpacity={0.3}/>
              <stop offset="100%" stopColor="#10b981" stopOpacity={0.05}/>
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          
          {target && (
            <>
              <ReferenceArea 
                y1={0} 
                y2={target.net_sales_target * 0.6} 
                fill="#ef4444" 
                fillOpacity={0.05}
              />
              <ReferenceArea 
                y1={target.net_sales_target * 0.6} 
                y2={target.net_sales_target * 0.9} 
                fill="#f59e0b" 
                fillOpacity={0.05}
              />
              <ReferenceArea 
                y1={target.net_sales_target * 0.9} 
                y2={target.net_sales_target * 1.3} 
                fill="#10b981" 
                fillOpacity={0.05}
              />
            </>
          )}
          
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.15)" />
          
          <XAxis 
            dataKey="day" 
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            stroke="rgba(255,255,255,0.3)"
          />
          <YAxis 
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            stroke="rgba(255,255,255,0.3)"
            tickFormatter={(value: number) => new Intl.NumberFormat('en-AE', { notation: 'compact' }).format(value)}
            width={50}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            wrapperStyle={{ paddingTop: '20px' }}
            iconType="line"
            formatter={(value: string) => <span className="text-xs text-white/80">{value}</span>}
          />
          
          <Line 
            type="monotone"
            dataKey="cumulativeTarget" 
            stroke="rgba(255,255,255,0.4)" 
            strokeWidth={2.5}
            strokeDasharray="4 4"
            dot={false}
            name="Daily Cumulative Target"
          />
          <Area 
            type="monotone"
            dataKey="currentNetSales" 
            fill="url(#netSalesGradient)" 
            stroke="#10b981" 
            strokeWidth={4}
            dot={{ fill: '#10b981', r: 6, strokeWidth: 2, stroke: '#065f46' }}
            activeDot={{ r: 8, strokeWidth: 3 }}
            name="Current Net Sales"
            filter="url(#glow)"
          />
          <Line 
            type="monotone"
            dataKey="target112" 
            stroke="#f59e0b" 
            strokeWidth={3}
            strokeDasharray="5 3"
            dot={false}
            name="112% Target"
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
  const [stats, setStats] = useState<any>({});

  useEffect(() => {
    if (metrics.length > 0 && target) {
      const sortedMetrics = [...metrics].sort((a, b) => 
        new Date(a.metric_date).getTime() - new Date(b.metric_date).getTime()
      );

      const totalWorkingDays = target.number_of_working_days || 22;
      const target112 = (target.net_sales_target || 0) * 1.12;

      const data = [];
      for (let workingDay = 1; workingDay <= totalWorkingDays; workingDay++) {
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
          data.push({
            day: workingDay,
            currentAvg: null,
            requiredAvg: null,
          });
        }
      }

      const actualData = data.filter(d => d.currentAvg !== null);
      const avgValues = actualData.map(d => d.currentAvg!);
      const bestDayAvg = avgValues.length > 0 ? Math.max(...avgValues) : 0;
      const overallAvg = avgValues.length > 0 ? avgValues.reduce((a, b) => a + b, 0) / avgValues.length : 0;
      const latestData = actualData[actualData.length - 1];
      const improvementNeeded = latestData ? latestData.requiredAvg! - latestData.currentAvg! : 0;
      
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

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    
    const data = payload[0].payload;
    const gap = data.currentAvg - data.requiredAvg;
    const percentageOfRequired = (data.currentAvg / data.requiredAvg) * 100;
    
    return (
      <div className="bg-black/98 backdrop-blur-2xl border border-white/30 rounded-2xl p-4 shadow-2xl">
        <p className="text-white font-bold text-sm mb-3">Day {data.day}</p>
        
        <div className="space-y-2 text-xs">
          <div className="flex justify-between items-center gap-4">
            <span className="text-emerald-400 font-semibold">Current Avg:</span>
            <span className="text-white font-mono">{formatCurrency(data.currentAvg)}</span>
          </div>
          
          <div className="flex justify-between items-center gap-4">
            <span className="text-orange-400 font-semibold">Required:</span>
            <span className="text-white font-mono">{formatCurrency(data.requiredAvg)}</span>
          </div>
          
          <div className="border-t border-white/10 pt-2 mt-2">
            <div className="flex justify-between items-center gap-4">
              <span className={`font-bold ${gap >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {gap >= 0 ? '✓ On Track:' : '⚠ Gap:'}
              </span>
              <span className={`font-mono font-bold ${gap >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {formatCurrency(Math.abs(gap))}
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

  const actualDataDaily = chartData.filter(d => d.currentAvg !== null);
  const latestData = actualDataDaily[actualDataDaily.length - 1];

  return (
    <div className="bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-bold text-white">Net Sales Daily Average</h3>
            {stats.isOnTrack !== undefined && (
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                stats.isOnTrack ? 'text-emerald-400 bg-emerald-500/20' : 'text-amber-400 bg-amber-500/20'
              }`}>
                {stats.isOnTrack ? '✓ On Track' : '⚠ Needs Improvement'}
              </span>
            )}
          </div>
          <p className="text-white/60">Current daily performance vs required pace for 112% target</p>
        </div>
        
        {stats.improvementNeeded !== undefined && stats.improvementNeeded > 0 && (
          <div className="px-3 py-1 rounded-lg text-xs font-bold bg-amber-500/20 text-amber-300 flex items-center gap-1">
            <span>+</span>
            <span>{(stats.improvementNeeded / 1000).toFixed(0)}K needed/day</span>
          </div>
        )}
      </div>
      
      <ResponsiveContainer width="100%" height={400}>
        <ComposedChart data={chartData} margin={{ top: 5, right: 30, bottom: 10, left: -20 }}>
          <defs>
            <linearGradient id="labourAvgGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity={0.6}/>
              <stop offset="50%" stopColor="#10b981" stopOpacity={0.3}/>
              <stop offset="100%" stopColor="#10b981" stopOpacity={0.05}/>
            </linearGradient>
            <filter id="glowLabour">
              <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          
          {latestData && (
            <>
              <ReferenceArea 
                y1={0} 
                y2={latestData.requiredAvg * 0.7} 
                fill="#ef4444" 
                fillOpacity={0.05}
              />
              <ReferenceArea 
                y1={latestData.requiredAvg * 0.7} 
                y2={latestData.requiredAvg} 
                fill="#f59e0b" 
                fillOpacity={0.05}
              />
              <ReferenceArea 
                y1={latestData.requiredAvg} 
                y2={latestData.requiredAvg * 1.5} 
                fill="#10b981" 
                fillOpacity={0.05}
              />
            </>
          )}
          
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.15)" />
          
          <XAxis 
            dataKey="day" 
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            stroke="rgba(255,255,255,0.3)"
          />
          <YAxis 
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            stroke="rgba(255,255,255,0.3)"
            tickFormatter={(value: number) => new Intl.NumberFormat('en-AE', { notation: 'compact' }).format(value)}
            width={50}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            wrapperStyle={{ paddingTop: '20px' }}
            iconType="line"
            formatter={(value: string) => <span className="text-xs text-white/80">{value}</span>}
          />
          
          <Area 
            type="monotone"
            dataKey="currentAvg" 
            fill="url(#labourAvgGradient)" 
            stroke="#10b981" 
            strokeWidth={4}
            dot={{ fill: '#10b981', r: 6, strokeWidth: 2, stroke: '#065f46' }}
            activeDot={{ r: 8, strokeWidth: 3 }}
            name="Current Daily Average"
            filter="url(#glowLabour)"
          />
          <Line 
            type="monotone"
            dataKey="requiredAvg" 
            stroke="#f97316" 
            strokeWidth={3}
            strokeDasharray="4 4"
            dot={false}
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
    return new Intl.NumberFormat('en-AE', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getRankBadge = (rank: number) => {
    switch(rank) {
      case 1:
        return (
          <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 border-2 border-white/20 flex items-center justify-center shadow-lg shadow-yellow-500/25">
            <span className="text-xs font-black text-gray-900">1st</span>
          </div>
        );
      case 2:
        return (
          <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-gradient-to-br from-gray-300 to-gray-400 border-2 border-white/20 flex items-center justify-center shadow-lg shadow-gray-500/25">
            <span className="text-xs font-black text-gray-900">2nd</span>
          </div>
        );
      case 3:
        return (
          <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-gradient-to-br from-amber-700 to-amber-800 border-2 border-white/20 flex items-center justify-center shadow-lg shadow-amber-700/25">
            <span className="text-xs font-black text-white">3rd</span>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className={`relative bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6 transition-all duration-300 hover:scale-105 ${
      rank === 1 ? 'shadow-xl shadow-white/10' : ''
    }`}>
      {getRankBadge(rank)}
      
      <div className="text-center mb-4">
        <h4 className="text-lg font-black text-white uppercase tracking-wider">{name}</h4>
        <div className="h-0.5 w-12 mx-auto mt-2 bg-gradient-to-r from-transparent via-white/50 to-transparent"></div>
      </div>

      <div className="text-center mb-4">
        <p className="text-xs text-white/50 uppercase tracking-wider mb-1">Total Sales</p>
        <div className="flex items-center justify-center gap-2">
          <DirhamIcon className="w-6 h-6 text-white/80" />
          <p className="text-2xl font-black text-white">{formatCurrency(amount)}</p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="w-full bg-white/10 rounded-full h-2.5 overflow-hidden">
          <div 
            className="bg-gradient-to-r from-white/90 to-white/70 h-2.5 rounded-full transition-all duration-1000 ease-out shadow-lg shadow-white/20"
            style={{ width: `${percentage}%` }}
          />
      </div>

        <div className="flex justify-between items-center">
          <span className="text-xs text-white/50">Share of total</span>
          <div className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
            <span className="text-sm font-bold text-white/90">{percentage.toFixed(1)}%</span>
          </div>
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

      const selectedMetric = sortedMetrics.find(m => m.metric_date === selectedDate) || sortedMetrics[sortedMetrics.length - 1];
      
      const currentSales = selectedMetric.current_net_sales || 0;
      const estimatedSales = selectedMetric.estimated_net_sales || 0;
      const workingDaysElapsed = selectedMetric.working_days_elapsed || 1;
      const totalWorkingDays = target.number_of_working_days || 1;
      const remainingDays = totalWorkingDays - workingDaysElapsed;

      const target100 = target.net_sales_target || 0;
      const target112 = target.net_sales_112_percent || 0;
      const projectedFinish = estimatedSales;
      
      const requiredDailyFor100 = remainingDays > 0 ? (target100 - currentSales) / remainingDays : 0;
      const requiredDailyFor112 = remainingDays > 0 ? (target112 - currentSales) / remainingDays : 0;
      const currentDailyAvg = workingDaysElapsed > 0 ? currentSales / workingDaysElapsed : 0;

      const END_OF_MONTH_SURGE_PCT = 0.26;
      const normalDays = Math.max(0, totalWorkingDays - 2);
      const rushDays = 2;
      
      const linearProjection = currentSales + (remainingDays * currentDailyAvg);
      
      let magicFinalTotal;
      let endOfMonthSurge;
      
      if (workingDaysElapsed < normalDays) {
        const normalDaysRemaining = Math.max(0, normalDays - workingDaysElapsed);
        const magicProjection = currentSales + (normalDaysRemaining * currentDailyAvg * 1.05);
        magicFinalTotal = magicProjection / (1 - END_OF_MONTH_SURGE_PCT);
        endOfMonthSurge = magicFinalTotal * END_OF_MONTH_SURGE_PCT;
      } else {
        magicFinalTotal = linearProjection;
        endOfMonthSurge = 0;
      }

      const data = [];
      for (let workingDay = 1; workingDay <= totalWorkingDays; workingDay++) {
        const metric = sortedMetrics[workingDay - 1];
        const isHistorical = workingDay <= workingDaysElapsed;
        const dayOfMonth = metric ? new Date(metric.metric_date).getDate() : workingDay;
        
        let marketingMagicValue = null;
        if (!isHistorical) {
          const daysIntoFuture = workingDay - workingDaysElapsed;
          
          if (workingDaysElapsed < normalDays) {
            const daysUntilRush = Math.max(0, normalDays - workingDaysElapsed);
            
            if (workingDay <= normalDays) {
              marketingMagicValue = currentSales + (daysIntoFuture * currentDailyAvg * 1.05);
            } else {
              const baseBeforeRush = currentSales + (daysUntilRush * currentDailyAvg * 1.05);
              const rushDayNumber = workingDay - normalDays;
              const surgePerDay = endOfMonthSurge / rushDays;
              marketingMagicValue = baseBeforeRush + (rushDayNumber * surgePerDay);
            }
          } else {
            marketingMagicValue = currentSales + (daysIntoFuture * currentDailyAvg);
          }
        }

        data.push({
          day: dayOfMonth,
          actual: isHistorical && metric ? (metric.current_net_sales || 0) : null,
          projected: !isHistorical ? (currentSales + (workingDay - workingDaysElapsed) * currentDailyAvg) : null,
          marketingMagic: marketingMagicValue,
          target100: (target100 / totalWorkingDays) * workingDay,
          target112: (target112 / totalWorkingDays) * workingDay,
        });
      }

      setChartData(data);
      setForecastStats({
        projectedFinish,
        marketingMagicFinish: magicFinalTotal,
        target100,
        target112,
        will100: projectedFinish >= target100,
        will112: projectedFinish >= target112,
        magicWill100: magicFinalTotal >= target100,
        magicWill112: magicFinalTotal >= target112,
        requiredDailyFor100,
        requiredDailyFor112,
        currentDailyAvg,
        gap100: projectedFinish - target100,
        gap112: projectedFinish - target112,
        magicGap112: magicFinalTotal - target112,
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
    <div className="bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 p-8">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-white mb-2">Target Achievement Forecast</h3>
            <p className="text-white/60">Projected vs target trajectory</p>
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
      
      <ResponsiveContainer width="100%" height={500}>
        <ComposedChart data={chartData} margin={{ top: 20, right: 30, bottom: 10, left: -20 }}>
          <defs>
            <linearGradient id="actualGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity={0.5}/>
              <stop offset="50%" stopColor="#10b981" stopOpacity={0.3}/>
              <stop offset="100%" stopColor="#10b981" stopOpacity={0.05}/>
            </linearGradient>
            <linearGradient id="projectedGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366f1" stopOpacity={0.5}/>
              <stop offset="50%" stopColor="#6366f1" stopOpacity={0.3}/>
              <stop offset="100%" stopColor="#6366f1" stopOpacity={0.05}/>
            </linearGradient>
            <filter id="glowForecast">
              <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          
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
          
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.15)" />
          <XAxis 
            dataKey="day" 
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            stroke="rgba(255,255,255,0.3)"
          />
          <YAxis 
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            stroke="rgba(255,255,255,0.3)"
            tickFormatter={(value: number) => new Intl.NumberFormat('en-AE', { notation: 'compact' }).format(value)}
            width={50}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'rgba(0, 0, 0, 0.98)', 
              border: '2px solid rgba(255, 255, 255, 0.3)',
              borderRadius: '16px',
              padding: '12px',
              backdropFilter: 'blur(16px)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
            }}
            labelStyle={{ color: '#ffffff', fontWeight: 700 }}
            itemStyle={{ color: '#d1d5db', fontSize: '12px' }}
            formatter={(value: any) => value ? `د.إ ${formatCurrency(Number(value))}` : 'N/A'}
            labelFormatter={(value: string | number) => `Day ${value}`}
          />
          <Legend 
            wrapperStyle={{ paddingTop: '20px' }}
            iconType="line"
            formatter={(value: string) => <span className="text-xs text-white/80">{value}</span>}
          />
          
          <Line 
            type="monotone"
            dataKey="target112" 
            stroke="#f59e0b" 
            strokeWidth={3}
            strokeDasharray="5 5"
            dot={false}
            name="112% Target"
            strokeOpacity={0.8}
          />
          <Line 
            type="monotone"
            dataKey="target100" 
            stroke="#ffffff" 
            strokeWidth={2.5}
            strokeDasharray="5 5"
            dot={false}
            name="100% Target"
            strokeOpacity={0.6}
          />
          <Area 
            type="monotone"
            dataKey="actual" 
            fill="url(#actualGradient)" 
            stroke="#10b981" 
            strokeWidth={4}
            dot={{ fill: '#10b981', r: 5, strokeWidth: 2, stroke: '#065f46' }}
            activeDot={{ r: 7, strokeWidth: 3 }}
            name="Actual"
            filter="url(#glowForecast)"
          />
          <Line 
            type="monotone"
            dataKey="projected" 
            stroke="#6366f1" 
            strokeWidth={4}
            strokeDasharray="3 3"
            dot={{ fill: '#6366f1', r: 5, strokeWidth: 2, stroke: '#4338ca' }}
            activeDot={{ r: 7, strokeWidth: 3 }}
            name="Projected"
          />
          <Line 
            type="monotone"
            dataKey="marketingMagic" 
            stroke="#06b6d4" 
            strokeWidth={4}
            strokeDasharray="5 3"
            dot={{ fill: '#06b6d4', r: 5, strokeWidth: 2, stroke: '#0891b2' }}
            activeDot={{ r: 7, strokeWidth: 3 }}
            name="Marketing Forecast"
          />
        </ComposedChart>
      </ResponsiveContainer>

      <div className="mt-8 grid grid-cols-4 gap-4">
        {/* Marketing Forecast */}
        <div className="bg-gradient-to-br from-cyan-500/20 to-cyan-600/10 backdrop-blur-xl rounded-xl border-2 border-cyan-500/40 p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <span className="text-sm">✨</span>
            <p className="text-xs font-semibold text-cyan-200">Marketing Forecast</p>
          </div>
          <div className="flex items-center gap-1.5 text-cyan-300">
            <DirhamIcon className="w-4 h-4" />
            <span className="text-lg font-bold">{formatCurrency(forecastStats.marketingMagicFinish || 0)}</span>
          </div>
        </div>

        {/* Projected Finish */}
        <div className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 p-3">
          <p className="text-xs font-semibold text-white/60 mb-2">Projected Finish</p>
          <div className={`flex items-center gap-1.5 ${
            forecastStats.will112 ? 'text-emerald-400' : 
            forecastStats.will100 ? 'text-amber-400' : 
            'text-red-400'
          }`}>
            <DirhamIcon className="w-4 h-4" />
            <span className="text-lg font-bold">{formatCurrency(forecastStats.projectedFinish || 0)}</span>
          </div>
        </div>

        {/* Gap to 100% */}
        <div className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 p-3">
          <p className="text-xs font-semibold text-white/60 mb-2">Gap to 100%</p>
          <div className={`flex items-center gap-1.5 ${forecastStats.gap100 >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            <span className="text-lg font-bold">{forecastStats.gap100 >= 0 ? '+' : '-'}</span>
            <DirhamIcon className="w-4 h-4" />
            <span className="text-lg font-bold">{formatCurrency(Math.abs(forecastStats.gap100 || 0))}</span>
          </div>
        </div>

        {/* Marketing Gap to 112% */}
        <div className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 p-3">
          <p className="text-xs font-semibold text-white/60 mb-2">Gap to 112%</p>
          <div className={`flex items-center gap-1.5 ${forecastStats.magicGap112 >= 0 ? 'text-emerald-400' : 'text-cyan-400'}`}>
            <span className="text-lg font-bold">{forecastStats.magicGap112 >= 0 ? '+' : '-'}</span>
            <DirhamIcon className="w-4 h-4" />
            <span className="text-lg font-bold">{formatCurrency(Math.abs(forecastStats.magicGap112 || 0))}</span>
          </div>
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
    <div className="bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 p-8">
      <div className="mb-6">
        <h3 className="text-xl font-bold text-white mb-2">Revenue Mix</h3>
        <p className="text-white/60">Labour vs Parts sales breakdown</p>
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
              activeShape={false}
            >
              {pieData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-6 space-y-3 border-t border-white/10 pt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
            <span className="text-white/70">Labour Sales</span>
          </div>
          <div className="flex items-center gap-1">
            <DirhamIcon className="w-3 h-3 text-white" />
            <span className="text-sm font-bold text-white">{formatCurrency(labourSales)}</span>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-amber-500"></div>
            <span className="text-white/70">Parts Sales</span>
          </div>
          <div className="flex items-center gap-1">
            <DirhamIcon className="w-3 h-3 text-white" />
            <span className="text-sm font-bold text-white">{formatCurrency(partsSales)}</span>
          </div>
        </div>
        <div className="flex items-center justify-between pt-3 border-t border-white/10">
          <span className="text-white/90 font-bold">Labour Ratio</span>
          <span className="text-emerald-400 font-bold">
            {totalSales > 0 ? ((labourSales / totalSales) * 100).toFixed(1) : 0}%
          </span>
        </div>
      </div>
    </div>
  );
};

/* ---------------- Annual Net Sales Chart ---------------- */
const AnnualNetSalesChart: React.FC<{
  metrics: DailyServiceMetrics[];
  targets: ServiceMonthlyTarget[];
  selectedYear: number;
}> = ({ metrics, targets, selectedYear }) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AE', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Calculate cumulative monthly data
  let cumulativeTarget = 0;
  let cumulativeActual = 0;
  
  const monthlyData = Array.from({ length: 12 }, (_, i) => {
    const month = i + 1;
    const monthName = new Date(selectedYear, i, 1).toLocaleDateString('en-US', { month: 'short' });
    
    // Find target for this month
    const target = targets.find(t => t.year === selectedYear && t.month === month);
    
    // Find latest metric for this month
    const monthMetrics = metrics
      .filter(m => {
        const date = new Date(m.metric_date);
        return date.getFullYear() === selectedYear && (date.getMonth() + 1) === month;
      })
      .sort((a, b) => new Date(b.metric_date).getTime() - new Date(a.metric_date).getTime());
    
    const latestMetric = monthMetrics[0];
    
    // Accumulate targets and actuals
    cumulativeTarget += (target?.net_sales_target || 0);
    cumulativeActual += (latestMetric?.current_net_sales || 0);
    
    return {
      month: monthName,
      monthNum: month,
      cumulativeTarget: cumulativeTarget,
      cumulativeActual: cumulativeActual,
      cumulative112Target: cumulativeTarget * 1.12,
      hasData: !!latestMetric || !!target,
    };
  }).filter(d => d.hasData); // Only show months with data

  // Calculate annual totals
  const annualNetSalesTarget = cumulativeTarget;
  const annualNetSalesActual = cumulativeActual;
  
  const netSalesAchievementPercent = annualNetSalesTarget > 0 ? 
    (annualNetSalesActual / annualNetSalesTarget) * 100 : 0;

  if (monthlyData.length === 0) {
    return null;
  }

  return (
    <div className="bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 p-8 shadow-2xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-white mb-1">Annual Net Sales {selectedYear}</h3>
          <p className="text-white/60 text-sm">Year-to-date cumulative performance</p>
        </div>
        
        {/* Achievement Badge */}
        <div className={`px-4 py-2 rounded-xl backdrop-blur-sm border ${
          netSalesAchievementPercent >= 100 ? 'bg-emerald-500/20 border-emerald-500/30' : 
          netSalesAchievementPercent >= 85 ? 'bg-amber-500/20 border-amber-500/30' : 
          'bg-red-500/20 border-red-500/30'
        }`}>
          <p className={`text-2xl font-black ${
            netSalesAchievementPercent >= 100 ? 'text-emerald-400' : 
            netSalesAchievementPercent >= 85 ? 'text-amber-400' : 
            'text-red-400'
          }`}>
            {netSalesAchievementPercent.toFixed(1)}% of Target
          </p>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={400}>
        <ComposedChart data={monthlyData} margin={{ top: 5, right: 30, bottom: 10, left: -20 }}>
          <defs>
            <linearGradient id="annualNetSalesGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity={0.6}/>
              <stop offset="50%" stopColor="#10b981" stopOpacity={0.3}/>
              <stop offset="100%" stopColor="#10b981" stopOpacity={0.05}/>
            </linearGradient>
            <linearGradient id="annualLabourGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.6}/>
              <stop offset="50%" stopColor="#3b82f6" stopOpacity={0.3}/>
              <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.05}/>
            </linearGradient>
            <filter id="glowAnnual">
              <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.15)" />
          
          <XAxis 
            dataKey="month" 
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            stroke="rgba(255,255,255,0.3)"
          />
          <YAxis 
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            stroke="rgba(255,255,255,0.3)"
            tickFormatter={(value: number) => new Intl.NumberFormat('en-AE', { notation: 'compact' }).format(value)}
            width={60}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'rgba(0, 0, 0, 0.98)', 
              border: '2px solid rgba(255, 255, 255, 0.3)',
              borderRadius: '16px',
              padding: '12px',
              backdropFilter: 'blur(16px)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
            }}
            labelStyle={{ color: '#ffffff', fontWeight: 700 }}
            itemStyle={{ color: '#d1d5db', fontSize: '12px' }}
            formatter={(value: any) => value ? `د.إ ${formatCurrency(Number(value))}` : 'N/A'}
          />
          <Legend 
            wrapperStyle={{ paddingTop: '20px' }}
            iconType="line"
            formatter={(value: string) => <span className="text-xs text-white/80">{value}</span>}
          />
          
          {/* Cumulative Net Sales Actual */}
          <Area 
            type="monotone"
            dataKey="cumulativeActual" 
            fill="url(#annualNetSalesGradient)" 
            stroke="#10b981" 
            strokeWidth={4}
            dot={{ fill: '#10b981', r: 6, strokeWidth: 2, stroke: '#059669' }}
            activeDot={{ r: 8, strokeWidth: 3 }}
            name="Current Net Sales"
            filter="url(#glowAnnual)"
          />
          
          {/* Cumulative Target */}
          <Line 
            type="monotone"
            dataKey="cumulativeTarget" 
            stroke="rgba(255,255,255,0.5)" 
            strokeWidth={2.5}
            strokeDasharray="4 4"
            dot={{ fill: '#ffffff', r: 4 }}
            name="Cumulative Target"
          />
          
          {/* 112% Target */}
          <Line 
            type="monotone"
            dataKey="cumulative112Target" 
            stroke="#f59e0b" 
            strokeWidth={2.5}
            strokeDasharray="5 5"
            dot={{ fill: '#f59e0b', r: 4 }}
            name="112% Target"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

/* ---------------- Annual Labour Sales Chart ---------------- */
const AnnualLabourSalesChart: React.FC<{
  metrics: DailyServiceMetrics[];
  targets: ServiceMonthlyTarget[];
  selectedYear: number;
}> = ({ metrics, targets, selectedYear }) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AE', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Calculate cumulative monthly data
  let cumulativeTarget = 0;
  let cumulativeActual = 0;
  
  const monthlyData = Array.from({ length: 12 }, (_, i) => {
    const month = i + 1;
    const monthName = new Date(selectedYear, i, 1).toLocaleDateString('en-US', { month: 'short' });
    
    // Find target for this month
    const target = targets.find(t => t.year === selectedYear && t.month === month);
    
    // Find latest metric for this month
    const monthMetrics = metrics
      .filter(m => {
        const date = new Date(m.metric_date);
        return date.getFullYear() === selectedYear && (date.getMonth() + 1) === month;
      })
      .sort((a, b) => new Date(b.metric_date).getTime() - new Date(a.metric_date).getTime());
    
    const latestMetric = monthMetrics[0];
    
    // Accumulate targets and actuals
    cumulativeTarget += (target?.labour_sales_target || 0);
    cumulativeActual += (latestMetric?.current_net_labor_sales || 0);
    
    return {
      month: monthName,
      monthNum: month,
      cumulativeTarget: cumulativeTarget,
      cumulativeActual: cumulativeActual,
      cumulative112Target: cumulativeTarget * 1.12,
      hasData: !!latestMetric || !!target,
    };
  }).filter(d => d.hasData); // Only show months with data

  // Calculate annual totals
  const annualLabourTarget = cumulativeTarget;
  const annualLabourActual = cumulativeActual;
  
  const labourAchievementPercent = annualLabourTarget > 0 ? 
    (annualLabourActual / annualLabourTarget) * 100 : 0;

  if (monthlyData.length === 0) {
    return null;
  }

  return (
    <div className="bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 p-8 shadow-2xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-white mb-1">Annual Labour Sales {selectedYear}</h3>
          <p className="text-white/60 text-sm">Year-to-date cumulative performance</p>
        </div>
        
        {/* Achievement Badge */}
        <div className={`px-4 py-2 rounded-xl backdrop-blur-sm border ${
          labourAchievementPercent >= 100 ? 'bg-emerald-500/20 border-emerald-500/30' : 
          labourAchievementPercent >= 85 ? 'bg-amber-500/20 border-amber-500/30' : 
          'bg-red-500/20 border-red-500/30'
        }`}>
          <p className={`text-2xl font-black ${
            labourAchievementPercent >= 100 ? 'text-emerald-400' : 
            labourAchievementPercent >= 85 ? 'text-amber-400' : 
            'text-red-400'
          }`}>
            {labourAchievementPercent.toFixed(1)}% of Target
          </p>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={400}>
        <ComposedChart data={monthlyData} margin={{ top: 5, right: 30, bottom: 10, left: -20 }}>
          <defs>
            <linearGradient id="annualLabourGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.6}/>
              <stop offset="50%" stopColor="#3b82f6" stopOpacity={0.3}/>
              <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.05}/>
            </linearGradient>
            <filter id="glowLabourAnnual">
              <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.15)" />
          
          <XAxis 
            dataKey="month" 
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            stroke="rgba(255,255,255,0.3)"
          />
          <YAxis 
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            stroke="rgba(255,255,255,0.3)"
            tickFormatter={(value: number) => new Intl.NumberFormat('en-AE', { notation: 'compact' }).format(value)}
            width={60}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'rgba(0, 0, 0, 0.98)', 
              border: '2px solid rgba(255, 255, 255, 0.3)',
              borderRadius: '16px',
              padding: '12px',
              backdropFilter: 'blur(16px)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
            }}
            labelStyle={{ color: '#ffffff', fontWeight: 700 }}
            itemStyle={{ color: '#d1d5db', fontSize: '12px' }}
            formatter={(value: any) => value ? `د.إ ${formatCurrency(Number(value))}` : 'N/A'}
          />
          <Legend 
            wrapperStyle={{ paddingTop: '20px' }}
            iconType="line"
            formatter={(value: string) => <span className="text-xs text-white/80">{value}</span>}
          />
          
          {/* Cumulative Labour Sales Actual */}
          <Area 
            type="monotone"
            dataKey="cumulativeActual" 
            fill="url(#annualLabourGradient)" 
            stroke="#3b82f6" 
            strokeWidth={4}
            dot={{ fill: '#3b82f6', r: 6, strokeWidth: 2, stroke: '#2563eb' }}
            activeDot={{ r: 8, strokeWidth: 3 }}
            name="Current Labour Sales"
            filter="url(#glowLabourAnnual)"
          />
          
          {/* Cumulative Target */}
          <Line 
            type="monotone"
            dataKey="cumulativeTarget" 
            stroke="rgba(255,255,255,0.5)" 
            strokeWidth={2.5}
            strokeDasharray="4 4"
            dot={{ fill: '#ffffff', r: 4 }}
            name="Cumulative Target"
          />
          
          {/* 112% Target */}
          <Line 
            type="monotone"
            dataKey="cumulative112Target" 
            stroke="#f59e0b" 
            strokeWidth={2.5}
            strokeDasharray="5 5"
            dot={{ fill: '#f59e0b', r: 4 }}
            name="112% Target"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};