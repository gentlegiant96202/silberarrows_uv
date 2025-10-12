"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Calendar, TrendingUp, Target, FileText, AlertCircle, ChevronDown, Sparkles, Zap, Users, BarChart3 } from 'lucide-react';
import DirhamIcon from '@/components/ui/DirhamIcon';
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
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Smooth loading animation
  useEffect(() => {
    if (isInitialLoad && !loading) {
      const timer = setTimeout(() => setIsInitialLoad(false), 500);
      return () => clearTimeout(timer);
    }
  }, [loading, isInitialLoad]);

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

      // Calculate sum of invoices UP TO the selected date
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

  // Enhanced color system with better visual hierarchy
  const getProgressColor = (percentage: number) => {
    if (percentage >= 100) return 'from-emerald-400 to-emerald-500';
    if (percentage >= 85) return 'from-amber-400 to-amber-500';
    if (percentage >= 70) return 'from-orange-400 to-orange-500';
    return 'from-rose-400 to-rose-500';
  };

  const getStatusVariant = (percentage: number) => {
    if (percentage >= 100) return 'success';
    if (percentage >= 85) return 'warning';
    if (percentage >= 70) return 'caution';
    return 'critical';
  };

  // Enhanced status badges with better animations
  const StatusBadge = ({ current, target, stretch = false, className = '' }: { 
    current: number; 
    target: number; 
    stretch?: boolean;
    className?: string;
  }) => {
    const targetValue = stretch ? target * 1.12 : target;
    const isMet = current >= targetValue;
    
    if (!isMet) return null;

      return (
      <div className={`absolute -top-2 -right-2 flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide backdrop-blur-sm border ${
        stretch 
          ? 'bg-gradient-to-r from-amber-500/30 to-yellow-500/30 text-amber-100 border-amber-400/50 shadow-lg shadow-amber-500/20' 
          : 'bg-gradient-to-r from-emerald-500/30 to-green-500/30 text-emerald-100 border-emerald-400/50 shadow-lg shadow-emerald-500/20'
      } ${className}`}>
        {stretch ? (
          <>
            <Zap className="w-3 h-3" />
            STRETCH
          </>
        ) : (
          <>
            <div className="w-1.5 h-1.5 rounded-full bg-current" />
            MET
          </>
        )}
      </div>
    );
  };

  // Calculate derived metrics
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
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white/60 text-lg font-medium">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 lg:p-6">
      <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
        {/* Enhanced Header */}
        <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6 shadow-2xl">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/30">
                <BarChart3 className="w-6 h-6 text-blue-400" />
          </div>
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">Service Dashboard</h1>
                <p className="text-white/60 text-sm">Real-time performance metrics and insights</p>
              </div>
        </div>
        
            <div className="flex flex-wrap gap-3">
              {/* Enhanced Month Selector */}
              <div className="relative group">
            <select
              value={selectedMonth}
              onChange={(e) => {
                setSelectedMonth(Number(e.target.value));
                    setSelectedDate('');
                  }}
                  className="appearance-none bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 cursor-pointer pr-10 hover:bg-white/10 transition-all duration-200"
                >
                  {[
                    { value: 1, label: 'January' }, { value: 2, label: 'February' },
                    { value: 3, label: 'March' }, { value: 4, label: 'April' },
                    { value: 5, label: 'May' }, { value: 6, label: 'June' },
                    { value: 7, label: 'July' }, { value: 8, label: 'August' },
                    { value: 9, label: 'September' }, { value: 10, label: 'October' },
                    { value: 11, label: 'November' }, { value: 12, label: 'December' }
              ].map(month => (
                    <option key={month.value} value={month.value} className="bg-slate-800 text-white">
                  {month.label}
                </option>
              ))}
            </select>
                <ChevronDown className="w-4 h-4 text-white/60 absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none transition-transform group-hover:scale-110" />
          </div>

              {/* Enhanced Year Selector */}
              <div className="relative group">
            <select
              value={selectedYear}
              onChange={(e) => {
                setSelectedYear(Number(e.target.value));
                    setSelectedDate('');
              }}
                  className="appearance-none bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 cursor-pointer pr-10 hover:bg-white/10 transition-all duration-200"
            >
              {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
                    <option key={year} value={year} className="bg-slate-800 text-white">{year}</option>
              ))}
            </select>
                <ChevronDown className="w-4 h-4 text-white/60 absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none transition-transform group-hover:scale-110" />
          </div>

              {/* Enhanced Date Selector */}
              <div className="relative group">
            <select
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
                  className="appearance-none bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 cursor-pointer pr-10 hover:bg-white/10 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={availableDates.length === 0}
            >
              {availableDates.length === 0 ? (
                <option>No data available</option>
              ) : (
                availableDates.map(date => (
                      <option key={date} value={date} className="bg-slate-800 text-white">
                        {new Date(date).toLocaleDateString('en-GB', { 
                          day: 'numeric', 
                          month: 'short',
                          year: 'numeric'
                        })}
                  </option>
                ))
              )}
            </select>
                <Calendar className="w-4 h-4 text-white/60 absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none transition-transform group-hover:scale-110" />
              </div>
          </div>
        </div>
      </div>

      {!dashboardData ? (
          <div className="flex flex-col items-center justify-center h-96 bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-8 text-center">
            <AlertCircle className="w-16 h-16 text-white/40 mb-4" />
            <h3 className="text-xl font-semibold text-white/80 mb-2">No Data Available</h3>
            <p className="text-white/50">Please select a different period or add data in the Data Grid tab</p>
        </div>
      ) : (
        <>
            {/* Hero Metrics Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Net Sales - Hero Card */}
              <div className="relative bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl rounded-2xl border border-white/10 p-6 shadow-2xl lg:col-span-2">
                <StatusBadge 
                  current={dashboardData.current_net_sales || 0} 
                  target={monthTarget?.net_sales_target || 0} 
                />
                <StatusBadge 
                  current={dashboardData.current_net_sales || 0} 
                  target={monthTarget?.net_sales_target || 0} 
                  stretch 
                  className="-top-2 -right-20"
                />
                
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <p className="text-white/60 text-sm font-medium uppercase tracking-wider">Net Sales</p>
                    <h2 className="text-2xl font-bold text-white mt-1">Current Performance</h2>
              </div>
                  <div className="p-2 rounded-lg bg-white/5 border border-white/10">
                    <TrendingUp className="w-5 h-5 text-blue-400" />
              </div>
            </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <MetricCard
                    label="Current"
                    value={dashboardData.current_net_sales || 0}
                    percentage={dashboardData.current_net_sales_percentage || 0}
                    format="currency"
                    variant={getStatusVariant(dashboardData.current_net_sales_percentage || 0)}
                  />
                  <MetricCard
                    label="Est. Month End"
                    value={dashboardData.estimated_net_sales || 0}
                    percentage={dashboardData.estimated_net_sales_percentage || 0}
                    format="currency"
                    variant={getStatusVariant(dashboardData.estimated_net_sales_percentage || 0)}
                  />
                  <MetricCard
                    label="Daily Average"
                    value={dashboardData.current_daily_average || 0}
                    format="currency"
                    variant="neutral"
                  />
                  <MetricCard
                    label="Target 112%"
                    value={monthTarget?.net_sales_112_percent || 0}
                    format="currency"
                    variant="premium"
                    icon={<Zap className="w-4 h-4" />}
                  />
              </div>
            </div>

              {/* Labour Sales - Hero Card */}
              <div className="relative bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl rounded-2xl border border-white/10 p-6 shadow-2xl">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <p className="text-white/60 text-sm font-medium uppercase tracking-wider">Labour Sales</p>
                    <h2 className="text-2xl font-bold text-white mt-1">Team Performance</h2>
              </div>
                  <div className="p-2 rounded-lg bg-white/5 border border-white/10">
                    <Users className="w-5 h-5 text-green-400" />
              </div>
            </div>

                <div className="space-y-4">
                  <MetricCard
                    label="Current Labour"
                    value={dashboardData.current_net_labor_sales || 0}
                    percentage={dashboardData.current_labour_sales_percentage || 0}
                    format="currency"
                    variant={getStatusVariant(dashboardData.current_labour_sales_percentage || 0)}
                    compact
                  />
                  <MetricCard
                    label="Est. Labour End"
                    value={dashboardData.estimated_labor_sales || 0}
                    percentage={dashboardData.estimated_labor_sales_percentage || 0}
                    format="currency"
                    variant={getStatusVariant(dashboardData.estimated_labor_sales_percentage || 0)}
                    compact
                  />
              </div>
              </div>
            </div>

            {/* Progress Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

            {/* Additional Insights Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

            {/* KPI Grid & Performance */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* KPI Cards */}
              <div className="grid grid-cols-2 gap-4 lg:col-span-2">
                <KPICard
                  icon={<FileText className="w-5 h-5" />}
                  label="Marketing Spend %"
                  value={marketingSpendPercentage}
                  format="percentage"
                  description="Of total sales"
                  variant="neutral"
                />
                <KPICard
                  icon={<FileText className="w-5 h-5" />}
                  label="Avg Invoice Value"
                  value={averageInvoiceValue}
                  format="currency"
                  description="Per invoice"
                  variant="neutral"
                />
                <KPICard
                  icon={<FileText className="w-5 h-5" />}
                  label="Total Marketing"
                  value={dashboardData.current_marketing_spend || 0}
                  format="currency"
                  description="This month"
                  variant="neutral"
                />
                <KPICard
                  icon={<FileText className="w-5 h-5" />}
                  label="Total Invoices"
                  value={monthlyInvoiceSum}
                  format="number"
                  description="This month"
                  variant="neutral"
                />
              </div>

              {/* Vehicle Throughput */}
              <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Vehicle Throughput</h3>
              <div className="flex items-center justify-center">
                <VehicleThroughputGauge value={vehicleThroughput} />
              </div>
            </div>
          </div>

            {/* Sales Team Performance */}
            <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-white">Team Performance</h3>
                <Users className="w-5 h-5 text-white/60" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

/* ---------------- Enhanced Metric Card Component ---------------- */
const MetricCard: React.FC<{
  label: string;
  value: number;
  percentage?: number;
  format: 'currency' | 'percentage' | 'number';
  variant: 'success' | 'warning' | 'caution' | 'critical' | 'neutral' | 'premium';
  compact?: boolean;
  icon?: React.ReactNode;
}> = ({ label, value, percentage, format, variant, compact = false, icon }) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AE', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const variantStyles = {
    success: 'from-emerald-500/10 to-emerald-600/5 border-emerald-500/20',
    warning: 'from-amber-500/10 to-amber-600/5 border-amber-500/20',
    caution: 'from-orange-500/10 to-orange-600/5 border-orange-500/20',
    critical: 'from-rose-500/10 to-rose-600/5 border-rose-500/20',
    neutral: 'from-slate-500/10 to-slate-600/5 border-slate-500/20',
    premium: 'from-amber-500/10 to-yellow-500/5 border-amber-500/30'
  };

  const textColors = {
    success: 'text-emerald-400',
    warning: 'text-amber-400',
    caution: 'text-orange-400',
    critical: 'text-rose-400',
    neutral: 'text-slate-300',
    premium: 'text-amber-300'
  };

  return (
    <div className={`relative bg-gradient-to-br ${variantStyles[variant]} backdrop-blur-sm rounded-xl border p-4 transition-all duration-300 hover:scale-105 hover:shadow-lg ${
      compact ? 'h-24' : 'h-32'
    }`}>
      <div className="flex items-start justify-between mb-2">
        <p className="text-white/60 text-sm font-medium">{label}</p>
        {icon && (
          <div className="text-white/60">
            {icon}
          </div>
        )}
      </div>
      
      <div className="flex items-center gap-2 mb-2">
        {format === 'currency' && <DirhamIcon className="w-5 h-5 text-white/80" />}
        <p className={`text-2xl font-bold ${textColors[variant]}`}>
          {format === 'currency' ? formatCurrency(value) : 
           format === 'percentage' ? formatPercentage(value) : 
           value.toLocaleString()}
        </p>
      </div>
      
      {percentage !== undefined && (
        <div className="space-y-2">
          <div className="w-full bg-white/10 rounded-full h-2">
            <div 
              className={`bg-gradient-to-r h-2 rounded-full transition-all duration-1000 ease-out ${
                variant === 'success' ? 'from-emerald-400 to-emerald-500' :
                variant === 'warning' ? 'from-amber-400 to-amber-500' :
                variant === 'caution' ? 'from-orange-400 to-orange-500' :
                variant === 'premium' ? 'from-amber-400 to-yellow-400' :
                'from-rose-400 to-rose-500'
              }`}
              style={{ width: `${Math.min(percentage, 100)}%` }}
            />
          </div>
          <p className="text-xs text-white/60 font-medium">
            {formatPercentage(percentage)}
          </p>
        </div>
      )}
    </div>
  );
};

/* ---------------- Enhanced KPI Card Component ---------------- */
const KPICard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: number;
  format: 'currency' | 'percentage' | 'number';
  description: string;
  variant: 'success' | 'warning' | 'caution' | 'critical' | 'neutral';
}> = ({ icon, label, value, format, description, variant }) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AE', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const textColors = {
    success: 'text-emerald-400',
    warning: 'text-amber-400',
    caution: 'text-orange-400',
    critical: 'text-rose-400',
    neutral: 'text-slate-300'
  };
    
    return (
    <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4 transition-all duration-300 hover:bg-white/10">
      <div className="flex items-center gap-3 mb-3">
        <div className="p-2 rounded-lg bg-white/5 border border-white/10">
          {icon}
        </div>
        <div>
          <p className="text-white/60 text-sm font-medium">{label}</p>
        </div>
          </div>
          
      <div className="flex items-center gap-2 mb-1">
        {format === 'currency' && <DirhamIcon className="w-5 h-5 text-white/80" />}
        <p className={`text-2xl font-bold ${textColors[variant]}`}>
          {format === 'currency' ? formatCurrency(value) : 
           format === 'percentage' ? `${value.toFixed(1)}%` : 
           value.toLocaleString()}
        </p>
          </div>
          
      <p className="text-xs text-white/40">{description}</p>
      </div>
    );
  };

/* ---------------- Enhanced Vehicle Throughput Gauge ---------------- */
const VehicleThroughputGauge: React.FC<{ value: number }> = ({ value }) => {
  const safeValue = value || 0;
  const maxValue = 15;
  const normalizedValue = Math.min(safeValue, maxValue);
  const percentage = (normalizedValue / maxValue) * 100;

  const getGradientColor = (percent: number) => {
    if (percent >= 80) return 'from-emerald-400 to-green-500';
    if (percent >= 60) return 'from-amber-400 to-amber-500';
    if (percent >= 40) return 'from-orange-400 to-orange-500';
    return 'from-rose-400 to-rose-500';
  };

  return (
    <div className="relative w-48 h-48">
      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 200 200">
        <circle
          cx="100"
          cy="100"
          r="80"
          fill="none"
          stroke="#374151"
          strokeWidth="16"
          strokeDasharray="376.99"
          strokeDashoffset="125.66"
        />
        <circle
          cx="100"
          cy="100"
          r="80"
          fill="none"
          stroke={`url(#throughputGradient)`}
          strokeWidth="16"
          strokeDasharray="376.99"
          strokeDashoffset={125.66 + (251.33 * (1 - percentage / 100))}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
        <defs>
          <linearGradient id="throughputGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity={0.9} />
            <stop offset="50%" stopColor="#d1d5db" stopOpacity={0.7} />
            <stop offset="100%" stopColor="#ffffff" stopOpacity={0.9} />
          </linearGradient>
        </defs>
      </svg>
      
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <p className="text-4xl font-bold text-white">{safeValue.toFixed(1)}</p>
        <p className="text-sm text-white/60 mt-1">invoices/day</p>
        <div className={`w-16 h-1.5 mt-2 bg-gradient-to-r ${getGradientColor(percentage)} rounded-full`} />
      </div>
    </div>
  );
};

/* ---------------- Enhanced Salesperson Card ---------------- */
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

  const getRankStyles = (rank: number) => {
    switch(rank) {
      case 1:
        return {
          badge: 'from-yellow-400 to-amber-500 border-yellow-400/50 shadow-lg shadow-yellow-500/25',
          text: 'text-yellow-100',
          glow: 'shadow-2xl shadow-yellow-500/20'
        };
      case 2:
        return {
          badge: 'from-gray-400 to-gray-500 border-gray-400/50 shadow-lg shadow-gray-500/25',
          text: 'text-gray-100',
          glow: 'shadow-xl shadow-gray-500/15'
        };
      case 3:
        return {
          badge: 'from-amber-700 to-amber-800 border-amber-600/50 shadow-lg shadow-amber-700/25',
          text: 'text-amber-100',
          glow: 'shadow-lg shadow-amber-700/10'
        };
      default:
        return {
          badge: 'from-slate-600 to-slate-700 border-slate-500/50',
          text: 'text-slate-100',
          glow: ''
        };
    }
  };

  const rankStyles = getRankStyles(rank);

  return (
    <div className={`relative bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6 transition-all duration-300 hover:scale-105 ${rankStyles.glow}`}>
      {/* Rank Badge */}
      <div className={`absolute -top-3 -right-3 w-12 h-12 rounded-full bg-gradient-to-br ${rankStyles.badge} border-2 flex items-center justify-center shadow-lg backdrop-blur-sm`}>
        <span className={`text-sm font-black ${rankStyles.text}`}>{rank}º</span>
      </div>
      
      <div className="text-center mb-6">
        <h4 className="text-xl font-black text-white uppercase tracking-wider">{name}</h4>
        <div className="h-1 w-16 mx-auto mt-3 bg-gradient-to-r from-transparent via-white/30 to-transparent rounded-full"></div>
      </div>

      <div className="text-center mb-6">
        <p className="text-xs text-white/50 uppercase tracking-wider mb-2">Total Sales</p>
        <div className="flex items-center justify-center gap-2">
          <DirhamIcon className="w-6 h-6 text-white/80" />
          <p className="text-3xl font-black text-white">{formatCurrency(amount)}</p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden">
          <div 
            className="bg-gradient-to-r from-white/90 to-white/70 h-3 rounded-full transition-all duration-1000 ease-out shadow-lg shadow-white/20"
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
            <span className="text-white font-mono flex items-center gap-1">
              <DirhamIcon className="w-3 h-3" />
              {formatCurrency(data.currentNetSales)}
            </span>
          </div>
          
          <div className="flex justify-between items-center gap-4">
            <span className="text-gray-400 font-semibold flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-gray-400" />
              Target:
            </span>
            <span className="text-white font-mono flex items-center gap-1">
              <DirhamIcon className="w-3 h-3" />
              {formatCurrency(data.cumulativeTarget)}
            </span>
          </div>
          
          <div className="border-t border-white/10 pt-2 mt-2">
            <div className="flex justify-between items-center gap-4">
              <span className={`font-bold ${gap >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {gap >= 0 ? '↑ Ahead:' : '↓ Behind:'}
              </span>
              <span className={`font-mono font-bold flex items-center gap-1 ${gap >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                <DirhamIcon className="w-3 h-3" />
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

  // Get latest day WITH actual data (not future days)
  const actualData = chartData.filter(d => d.currentNetSales !== null);
  const latestData = actualData[actualData.length - 1];
  const performance = latestData && latestData.cumulativeTarget > 0 ? (latestData.currentNetSales / latestData.cumulativeTarget) * 100 : 0;

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
            <span className="text-emerald-400 font-semibold flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-emerald-400" />
              Current Avg:
            </span>
            <span className="text-white font-mono flex items-center gap-1">
              <DirhamIcon className="w-3 h-3" />
              {formatCurrency(data.currentAvg)}
            </span>
          </div>
          
          <div className="flex justify-between items-center gap-4">
            <span className="text-orange-400 font-semibold flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-orange-400" />
              Required:
            </span>
            <span className="text-white font-mono flex items-center gap-1">
              <DirhamIcon className="w-3 h-3" />
              {formatCurrency(data.requiredAvg)}
            </span>
          </div>
          
          <div className="border-t border-white/10 pt-2 mt-2">
            <div className="flex justify-between items-center gap-4">
              <span className={`font-bold ${gap >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {gap >= 0 ? '✓ On Track:' : '⚠ Gap:'}
              </span>
              <span className={`font-mono font-bold flex items-center gap-1 ${gap >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                <DirhamIcon className="w-3 h-3" />
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

  // Get latest day WITH actual data (not future days)
  const actualDataDaily = chartData.filter(d => d.currentAvg !== null);
  const latestData = actualDataDaily[actualDataDaily.length - 1];
  
  // Current Daily Average is always green
  const getLineColor = () => {
    return '#10b981'; // Green - emerald-500
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
          <div className="px-3 py-1 rounded-lg text-xs font-bold bg-amber-500/20 text-amber-300 flex items-center gap-1">
            <span>+</span>
            <DirhamIcon className="w-3 h-3" />
            <span>{(stats.improvementNeeded / 1000).toFixed(0)}K needed/day</span>
          </div>
        )}
      </div>
      
      {/* Legend */}
      <div className="flex items-center justify-center gap-5 mb-6 flex-wrap">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-emerald-500/30">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
          <span className="text-xs font-medium text-emerald-300">Current Daily Average</span>
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

      // Find the metric for the selected date, or use the latest if not found
      const selectedMetric = sortedMetrics.find(m => m.metric_date === selectedDate) || sortedMetrics[sortedMetrics.length - 1];
      
      const currentSales = selectedMetric.current_net_sales || 0;
      const estimatedSales = selectedMetric.estimated_net_sales || 0;
      const workingDaysElapsed = selectedMetric.working_days_elapsed || 1;
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

      // MARKETING MAGIC FORECAST - accounts for 26% end-of-month surge (based on historical data)
      const END_OF_MONTH_SURGE_PCT = 0.26; // 26% of revenue comes in last 2 days
      const normalDays = Math.max(0, totalWorkingDays - 2); // Days before the rush
      const rushDays = 2; // Final 2 days
      
      // Calculate what the month WOULD total at current pace (without surge)
      const linearProjection = currentSales + (remainingDays * currentDailyAvg);
      
      // Marketing Magic: Boost the projection by accounting for end-of-month pattern
      // If 26% comes in last 2 days, that means 74% comes in the first (totalWorkingDays - 2) days
      // So: currentPace brings us to X in normal days, then we add 26% surge in final 2 days
      const normalDaysRemaining = Math.max(0, normalDays - workingDaysElapsed);
      const magicProjection = currentSales + (normalDaysRemaining * currentDailyAvg * 1.05); // Slight boost for normal days
      const magicFinalTotal = magicProjection / (1 - END_OF_MONTH_SURGE_PCT); // If 74% = magicProjection, then 100% = this
      const endOfMonthSurge = magicFinalTotal * END_OF_MONTH_SURGE_PCT;

      // Build chart data - use WORKING DAYS not calendar days
      const data = [];
      for (let workingDay = 1; workingDay <= totalWorkingDays; workingDay++) {
        const metric = sortedMetrics[workingDay - 1]; // Working day index matches array index
        const isHistorical = workingDay <= workingDaysElapsed;
        const dayOfMonth = metric ? new Date(metric.metric_date).getDate() : workingDay;
        
        // Calculate Marketing Magic value for this day
        let marketingMagicValue = null;
        if (!isHistorical) {
          const daysIntoFuture = workingDay - workingDaysElapsed;
          const daysUntilRush = Math.max(0, normalDays - workingDaysElapsed);
          
          if (workingDay <= normalDays) {
            // Normal growth phase
            marketingMagicValue = currentSales + (daysIntoFuture * currentDailyAvg * 1.05);
          } else {
            // RUSH PHASE - last 2 days!
            const baseBeforeRush = currentSales + (daysUntilRush * currentDailyAvg * 1.05);
            const rushDayNumber = workingDay - normalDays; // 1 or 2
            const surgePerDay = endOfMonthSurge / rushDays;
            marketingMagicValue = baseBeforeRush + (rushDayNumber * surgePerDay);
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
            formatter={(value: any) => value ? `د.إ ${formatCurrency(Number(value))}` : 'N/A'}
            labelFormatter={(value: string | number) => `Day ${value}`}
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
          <Line 
            type="monotone"
            dataKey="marketingMagic" 
            stroke="#a855f7" 
            strokeWidth={4}
            strokeDasharray="5 3"
            dot={{ fill: '#a855f7', r: 4, strokeWidth: 2, stroke: '#7e22ce' }}
            name="Marketing Magic ✨"
          />
        </ComposedChart>
      </ResponsiveContainer>

      {/* Forecast Stats */}
      <div className="mt-4 space-y-3">
        {/* Marketing Magic Row */}
        <div className="flex items-center justify-between p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg">
          <div className="flex items-center gap-2">
            <span className="text-xl">✨</span>
            <div>
              <p className="text-xs font-semibold text-purple-400">Marketing Magic Forecast</p>
            </div>
          </div>
          <div className={`flex items-center gap-1 text-lg font-bold ${
            forecastStats.magicWill112 ? 'text-emerald-400' : 
            forecastStats.magicWill100 ? 'text-amber-400' : 
            'text-purple-400'
          }`}>
            <DirhamIcon className="w-4 h-4" />
            <span>{formatCurrency(forecastStats.marketingMagicFinish || 0)}</span>
          </div>
        </div>
        
        {/* Standard Stats Grid */}
        <div className="grid grid-cols-3 gap-4 border-t border-white/10 pt-3">
        <div className="text-center">
          <p className="text-xs text-gray-400 mb-1">Projected Finish</p>
          <div className={`flex items-center justify-center gap-1 text-sm font-bold ${
            forecastStats.will112 ? 'text-emerald-400' : 
            forecastStats.will100 ? 'text-amber-400' : 
            'text-red-400'
          }`}>
            <DirhamIcon className="w-3 h-3" />
            <span>{formatCurrency(forecastStats.projectedFinish || 0)}</span>
          </div>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-400 mb-1">Gap to 100%</p>
          <div className={`flex items-center justify-center gap-1 text-sm font-bold ${forecastStats.gap100 >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            <span>{forecastStats.gap100 >= 0 ? '+' : ''}</span>
            <DirhamIcon className="w-3 h-3" />
            <span>{formatCurrency(Math.abs(forecastStats.gap100 || 0))}</span>
          </div>
        </div>
        <div className="text-center">
            <p className="text-xs text-gray-400 mb-1">Magic Gap to 112%</p>
            <div className={`flex items-center justify-center gap-1 text-sm font-bold ${forecastStats.magicGap112 >= 0 ? 'text-emerald-400' : 'text-purple-400'}`}>
              <span>{forecastStats.magicGap112 >= 0 ? '+' : ''}</span>
            <DirhamIcon className="w-3 h-3" />
              <span>{formatCurrency(Math.abs(forecastStats.magicGap112 || 0))}</span>
            </div>
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
              activeShape={false}
            >
              {pieData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Legend and Stats */}
      <div className="mt-4 space-y-3 border-t border-white/10 pt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#10b981' }}></div>
            <span className="text-xs text-white/70">Labour Sales</span>
          </div>
          <div className="flex items-center gap-1">
            <DirhamIcon className="w-3 h-3 text-white" />
            <span className="text-sm font-bold text-white">{formatCurrency(labourSales)}</span>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#f59e0b' }}></div>
            <span className="text-xs text-white/70">Parts Sales</span>
          </div>
          <div className="flex items-center gap-1">
            <DirhamIcon className="w-3 h-3 text-white" />
            <span className="text-sm font-bold text-white">{formatCurrency(partsSales)}</span>
          </div>
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

