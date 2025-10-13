"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Calendar, TrendingUp, Target, FileText, AlertCircle, ChevronDown, Zap, Users, Search, Bell, BarChart3, Activity, Wrench, Trophy, DollarSign, CalendarDays, Percent, Receipt, ChartLine, ChartBar, PieChart as PieIcon, ChartPie, CalendarRange, BarChart4, LayoutGrid, Gauge } from 'lucide-react';
import DirhamIcon from '@/components/ui/DirhamIcon';
import { ComposedChart, AreaChart, Line, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, ReferenceLine, ReferenceArea, CartesianGrid, PieChart, Pie, Cell } from 'recharts';
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
  const [compareWithPrevious, setCompareWithPrevious] = useState(false);
  const [previousMonthData, setPreviousMonthData] = useState<DailyServiceMetrics | null>(null);

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

  // Load previous month data for comparison (same period)
  useEffect(() => {
    if (!dashboardData) {
      setPreviousMonthData(null);
      return;
    }

    const currentDate = new Date(dashboardData.metric_date);
    const currentDayOfMonth = currentDate.getDate();
    
    const previousMonth = selectedMonth === 1 ? 12 : selectedMonth - 1;
    const previousYear = selectedMonth === 1 ? selectedYear - 1 : selectedYear;

    const prevMonthMetrics = metrics.filter(m => {
      const date = new Date(m.metric_date);
      return date.getFullYear() === previousYear && (date.getMonth() + 1) === previousMonth;
    });

    if (prevMonthMetrics.length > 0) {
      // First try: Find metric with same day of month (e.g., 11th of Sept vs 11th of Oct)
      let targetMetric = prevMonthMetrics.find(m => {
        const prevDate = new Date(m.metric_date);
        return prevDate.getDate() === currentDayOfMonth;
      });
      
      // Second try: Find metric with same working days elapsed
      if (!targetMetric) {
        targetMetric = prevMonthMetrics.find(m => 
          m.working_days_elapsed === dashboardData.working_days_elapsed
        );
      }
      
      // Last resort: Find closest by working days elapsed
      if (!targetMetric) {
        targetMetric = prevMonthMetrics.sort((a, b) => 
          Math.abs((a.working_days_elapsed || 0) - (dashboardData.working_days_elapsed || 0)) -
          Math.abs((b.working_days_elapsed || 0) - (dashboardData.working_days_elapsed || 0))
        )[0];
      }
      
      setPreviousMonthData(targetMetric);
    } else {
      setPreviousMonthData(null);
    }
  }, [dashboardData, selectedYear, selectedMonth, metrics]);

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

  const vehicleThroughput = dashboardData && dashboardData.working_days_elapsed > 0
    ? monthlyInvoiceSum / dashboardData.working_days_elapsed
    : 0;

  const averageInvoiceValue = monthlyInvoiceSum > 0 && dashboardData
    ? dashboardData.current_net_sales / monthlyInvoiceSum
    : 0;

  const marketingSpendPercentage = dashboardData && dashboardData.current_net_sales > 0
    ? (dashboardData.current_marketing_spend / dashboardData.current_net_sales) * 100
    : 0;

  const vehicleThroughputTarget = 12;
  const vehicleThroughputPercentage = (vehicleThroughput / vehicleThroughputTarget) * 100;

  // Calculate team contributions (from existing logic)
  const totalSales = dashboardData 
    ? (dashboardData.daniel_total_sales || 0) + (dashboardData.essrar_total_sales || 0) + (dashboardData.lucy_total_sales || 0)
    : 0;

  const danielContribution = totalSales > 0 && dashboardData ? ((dashboardData.daniel_total_sales || 0) / totalSales) * 100 : 0;
  const lucyContribution = totalSales > 0 && dashboardData ? ((dashboardData.lucy_total_sales || 0) / totalSales) * 100 : 0;
  const essrarContribution = totalSales > 0 && dashboardData ? ((dashboardData.essrar_total_sales || 0) / totalSales) * 100 : 0;

  if (loading || isInitialLoad) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#050505] to-[#0A0A0A] text-[#E0E0E0] p-5">
        <div className="w-full flex flex-col gap-5">
          {/* Header Skeleton - Matches actual header structure */}
          <div className="flex items-center justify-between">
            <div className="text-2xl font-bold text-[#C0C0C0]">Service Report</div>
            <div className="bg-[rgba(255,255,255,0.08)] backdrop-blur-[10px] border border-[rgba(255,255,255,0.1)] rounded-2xl px-6 py-3 flex items-center gap-5 shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
              <div className="h-12 w-24 bg-[rgba(255,255,255,0.05)] rounded-xl animate-pulse"></div>
              <div className="h-12 w-32 bg-[rgba(255,255,255,0.05)] rounded-xl animate-pulse"></div>
              <div className="h-12 w-32 bg-[rgba(255,255,255,0.05)] rounded-xl animate-pulse"></div>
              <div className="h-12 w-32 bg-[rgba(255,255,255,0.05)] rounded-xl animate-pulse"></div>
            </div>
          </div>

          {/* Main Grid Skeleton */}
          <div className="grid grid-cols-6 auto-rows-auto gap-5">
          {/* Row 1: Net Sales Cards */}
          <div className="col-span-1 bg-[rgba(255,255,255,0.08)] backdrop-blur-[10px] border border-[rgba(255,255,255,0.1)] rounded-2xl p-6 space-y-4 animate-pulse">
            <div className="h-6 w-32 bg-[rgba(255,255,255,0.1)] rounded"></div>
            <div className="h-10 w-full bg-[rgba(255,255,255,0.1)] rounded"></div>
            <div className="h-4 w-24 bg-[rgba(255,255,255,0.1)] rounded"></div>
          </div>
          <div className="col-span-1 bg-[rgba(255,255,255,0.08)] backdrop-blur-[10px] border border-[rgba(255,255,255,0.1)] rounded-2xl p-6 space-y-4 animate-pulse">
            <div className="h-6 w-32 bg-[rgba(255,255,255,0.1)] rounded"></div>
            <div className="h-10 w-full bg-[rgba(255,255,255,0.1)] rounded"></div>
            <div className="h-4 w-24 bg-[rgba(255,255,255,0.1)] rounded"></div>
          </div>
          <div className="col-span-1 bg-[rgba(255,255,255,0.08)] backdrop-blur-[10px] border border-[rgba(255,255,255,0.1)] rounded-2xl p-6 space-y-4 animate-pulse">
            <div className="h-6 w-32 bg-[rgba(255,255,255,0.1)] rounded"></div>
            <div className="h-10 w-full bg-[rgba(255,255,255,0.1)] rounded"></div>
            <div className="h-4 w-24 bg-[rgba(255,255,255,0.1)] rounded"></div>
          </div>
          <div className="col-span-1 bg-[rgba(255,255,255,0.08)] backdrop-blur-[10px] border border-[rgba(255,255,255,0.1)] rounded-2xl p-6 space-y-4 animate-pulse">
            <div className="h-6 w-32 bg-[rgba(255,255,255,0.1)] rounded"></div>
            <div className="h-10 w-full bg-[rgba(255,255,255,0.1)] rounded"></div>
            <div className="h-4 w-24 bg-[rgba(255,255,255,0.1)] rounded"></div>
          </div>
          
          {/* Target Cards */}
          <div className="col-span-1 row-span-2 bg-[rgba(255,255,255,0.08)] backdrop-blur-[10px] border border-[rgba(255,255,255,0.1)] rounded-2xl p-6 space-y-4 animate-pulse">
            <div className="h-6 w-28 bg-[rgba(255,255,255,0.1)] rounded"></div>
            <div className="space-y-3">
              <div className="h-8 w-full bg-[rgba(255,255,255,0.1)] rounded"></div>
              <div className="h-8 w-full bg-[rgba(255,255,255,0.1)] rounded"></div>
            </div>
          </div>
          <div className="col-span-1 row-span-2 bg-[rgba(255,255,255,0.08)] backdrop-blur-[10px] border border-[rgba(255,255,255,0.1)] rounded-2xl p-6 space-y-4 animate-pulse">
            <div className="h-6 w-28 bg-[rgba(255,255,255,0.1)] rounded"></div>
            <div className="space-y-3">
              <div className="h-8 w-full bg-[rgba(255,255,255,0.1)] rounded"></div>
              <div className="h-8 w-full bg-[rgba(255,255,255,0.1)] rounded"></div>
            </div>
          </div>

          {/* Row 2: Labour Sales Cards */}
          <div className="col-span-1 bg-[rgba(255,255,255,0.08)] backdrop-blur-[10px] border border-[rgba(255,255,255,0.1)] rounded-2xl p-6 space-y-4 animate-pulse">
            <div className="h-6 w-32 bg-[rgba(255,255,255,0.1)] rounded"></div>
            <div className="h-10 w-full bg-[rgba(255,255,255,0.1)] rounded"></div>
            <div className="h-4 w-24 bg-[rgba(255,255,255,0.1)] rounded"></div>
          </div>
          <div className="col-span-1 bg-[rgba(255,255,255,0.08)] backdrop-blur-[10px] border border-[rgba(255,255,255,0.1)] rounded-2xl p-6 space-y-4 animate-pulse">
            <div className="h-6 w-32 bg-[rgba(255,255,255,0.1)] rounded"></div>
            <div className="h-10 w-full bg-[rgba(255,255,255,0.1)] rounded"></div>
            <div className="h-4 w-24 bg-[rgba(255,255,255,0.1)] rounded"></div>
          </div>
          <div className="col-span-1 bg-[rgba(255,255,255,0.08)] backdrop-blur-[10px] border border-[rgba(255,255,255,0.1)] rounded-2xl p-6 space-y-4 animate-pulse">
            <div className="h-6 w-32 bg-[rgba(255,255,255,0.1)] rounded"></div>
            <div className="h-10 w-full bg-[rgba(255,255,255,0.1)] rounded"></div>
            <div className="h-4 w-24 bg-[rgba(255,255,255,0.1)] rounded"></div>
          </div>
          <div className="col-span-1 bg-[rgba(255,255,255,0.08)] backdrop-blur-[10px] border border-[rgba(255,255,255,0.1)] rounded-2xl p-6 space-y-4 animate-pulse">
            <div className="h-6 w-32 bg-[rgba(255,255,255,0.1)] rounded"></div>
            <div className="h-10 w-full bg-[rgba(255,255,255,0.1)] rounded"></div>
            <div className="h-4 w-24 bg-[rgba(255,255,255,0.1)] rounded"></div>
          </div>

          {/* Charts Row */}
          <div className="col-span-3 row-span-2 bg-[rgba(0,0,0,1)] backdrop-blur-[10px] border border-[rgba(255,255,255,0.1)] rounded-2xl p-6 space-y-4 animate-pulse">
            <div className="h-6 w-48 bg-[rgba(255,255,255,0.1)] rounded"></div>
            <div className="h-[350px] w-full bg-[rgba(255,255,255,0.05)] rounded"></div>
          </div>
          <div className="col-span-3 row-span-2 bg-[rgba(0,0,0,1)] backdrop-blur-[10px] border border-[rgba(255,255,255,0.1)] rounded-2xl p-6 space-y-4 animate-pulse">
            <div className="h-6 w-48 bg-[rgba(255,255,255,0.1)] rounded"></div>
            <div className="h-[350px] w-full bg-[rgba(255,255,255,0.05)] rounded"></div>
          </div>

          {/* Additional metric cards */}
          <div className="col-span-1 row-span-2 bg-[rgba(255,255,255,0.08)] backdrop-blur-[10px] border border-[rgba(255,255,255,0.1)] rounded-2xl p-6 space-y-4 animate-pulse">
            <div className="h-6 w-32 bg-[rgba(255,255,255,0.1)] rounded"></div>
            <div className="h-10 w-full bg-[rgba(255,255,255,0.1)] rounded"></div>
            <div className="h-4 w-24 bg-[rgba(255,255,255,0.1)] rounded"></div>
          </div>
          <div className="col-span-1 row-span-2 bg-[rgba(255,255,255,0.08)] backdrop-blur-[10px] border border-[rgba(255,255,255,0.1)] rounded-2xl p-6 space-y-4 animate-pulse">
            <div className="h-6 w-32 bg-[rgba(255,255,255,0.1)] rounded"></div>
            <div className="h-10 w-full bg-[rgba(255,255,255,0.1)] rounded"></div>
            <div className="h-4 w-24 bg-[rgba(255,255,255,0.1)] rounded"></div>
          </div>
          <div className="col-span-1 row-span-2 bg-[rgba(255,255,255,0.08)] backdrop-blur-[10px] border border-[rgba(255,255,255,0.1)] rounded-2xl p-6 space-y-4 animate-pulse">
            <div className="h-6 w-32 bg-[rgba(255,255,255,0.1)] rounded"></div>
            <div className="h-10 w-full bg-[rgba(255,255,255,0.1)] rounded"></div>
            <div className="h-4 w-24 bg-[rgba(255,255,255,0.1)] rounded"></div>
          </div>
          <div className="col-span-1 row-span-2 bg-[rgba(255,255,255,0.08)] backdrop-blur-[10px] border border-[rgba(255,255,255,0.1)] rounded-2xl p-6 space-y-4 animate-pulse">
            <div className="h-6 w-32 bg-[rgba(255,255,255,0.1)] rounded"></div>
            <div className="h-10 w-full bg-[rgba(255,255,255,0.1)] rounded"></div>
            <div className="h-4 w-24 bg-[rgba(255,255,255,0.1)] rounded"></div>
          </div>
          <div className="col-span-1 row-span-2 bg-[rgba(255,255,255,0.08)] backdrop-blur-[10px] border border-[rgba(255,255,255,0.1)] rounded-2xl p-6 space-y-4 animate-pulse">
            <div className="h-6 w-32 bg-[rgba(255,255,255,0.1)] rounded"></div>
            <div className="h-10 w-full bg-[rgba(255,255,255,0.1)] rounded"></div>
            <div className="h-4 w-24 bg-[rgba(255,255,255,0.1)] rounded"></div>
          </div>
          <div className="col-span-1 row-span-2 bg-[rgba(255,255,255,0.08)] backdrop-blur-[10px] border border-[rgba(255,255,255,0.1)] rounded-2xl p-6 space-y-4 animate-pulse">
            <div className="h-6 w-32 bg-[rgba(255,255,255,0.1)] rounded"></div>
            <div className="h-10 w-full bg-[rgba(255,255,255,0.1)] rounded"></div>
            <div className="h-4 w-24 bg-[rgba(255,255,255,0.1)] rounded"></div>
          </div>

          {/* Team Performance Skeleton */}
          <div className="col-span-6 bg-[rgba(255,255,255,0.08)] backdrop-blur-[10px] border border-[rgba(255,255,255,0.1)] rounded-2xl p-6 space-y-4 animate-pulse">
            <div className="h-6 w-48 bg-[rgba(255,255,255,0.1)] rounded"></div>
            <div className="grid grid-cols-3 gap-4">
              <div className="h-48 bg-[rgba(255,255,255,0.05)] rounded-xl"></div>
              <div className="h-48 bg-[rgba(255,255,255,0.05)] rounded-xl"></div>
              <div className="h-48 bg-[rgba(255,255,255,0.05)] rounded-xl"></div>
            </div>
          </div>

          {/* Annual Charts Skeleton */}
          <div className="col-span-3 row-span-2 bg-[rgba(0,0,0,1)] backdrop-blur-[10px] border border-[rgba(255,255,255,0.1)] rounded-2xl p-6 space-y-4 animate-pulse">
            <div className="h-6 w-48 bg-[rgba(255,255,255,0.1)] rounded"></div>
            <div className="h-[350px] w-full bg-[rgba(255,255,255,0.05)] rounded"></div>
          </div>
          <div className="col-span-3 row-span-2 bg-[rgba(0,0,0,1)] backdrop-blur-[10px] border border-[rgba(255,255,255,0.1)] rounded-2xl p-6 space-y-4 animate-pulse">
            <div className="h-6 w-48 bg-[rgba(255,255,255,0.1)] rounded"></div>
            <div className="h-[350px] w-full bg-[rgba(255,255,255,0.05)] rounded"></div>
          </div>
        </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#050505] to-[#0A0A0A] text-[#E0E0E0] p-5">
      <div className="w-full flex flex-col gap-5">
        {/* Header with Title and Date Filters */}
        <div className="flex items-center justify-between">
          {/* Left-aligned Heading */}
            <div className="text-2xl font-bold text-[#C0C0C0]">
              Service Report
          </div>
        
          {/* Date Filters Container */}
          <div className="bg-[rgba(255,255,255,0.08)] backdrop-blur-[10px] border border-[rgba(255,255,255,0.1)] rounded-2xl px-6 py-3 flex items-center gap-5 shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
            {/* Days Remaining */}
            {monthTarget && dashboardData && (() => {
              const workingDaysElapsed = dashboardData.working_days_elapsed || 0;
              const totalWorkingDays = monthTarget.number_of_working_days || 30;
              const daysRemaining = Math.max(0, totalWorkingDays - workingDaysElapsed);
              
              return (
                <div className="flex items-center gap-2 border-r border-[rgba(255,255,255,0.1)] pr-5">
                  <CalendarDays size={16} className="text-white" />
                  <div className="flex flex-col">
                    <span className="text-xs text-[rgba(255,255,255,0.5)]">Days Remaining</span>
                    <span className="text-sm font-bold text-white">{daysRemaining} of {totalWorkingDays}</span>
        </div>
                </div>
              );
            })()}
        
            {/* Date Selector */}
            <div className="relative">
            <select
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
                className="appearance-none bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-xl pl-4 pr-10 py-2 text-[#E0E0E0] text-sm font-medium focus:outline-none cursor-pointer hover:bg-[rgba(255,255,255,0.08)] transition-all disabled:opacity-50"
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
              <Calendar className="w-4 h-4 text-[rgba(255,255,255,0.5)] absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Month Selector */}
            <div className="relative">
            <select
              value={selectedMonth}
              onChange={(e) => {
                setSelectedMonth(Number(e.target.value));
                  setSelectedDate('');
                }}
                className="appearance-none bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-xl pl-4 pr-10 py-2 text-[#E0E0E0] text-sm font-medium focus:outline-none cursor-pointer hover:bg-[rgba(255,255,255,0.08)] transition-all"
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
              <ChevronDown className="w-4 h-4 text-[rgba(255,255,255,0.5)] absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Year Selector */}
            <div className="relative">
            <select
              value={selectedYear}
              onChange={(e) => {
                setSelectedYear(Number(e.target.value));
                  setSelectedDate('');
              }}
                className="appearance-none bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-xl pl-4 pr-10 py-2 text-[#E0E0E0] text-sm font-medium focus:outline-none cursor-pointer hover:bg-[rgba(255,255,255,0.08)] transition-all"
            >
              {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
                  <option key={year} value={year} className="bg-gray-900 text-white">{year}</option>
              ))}
            </select>
              <ChevronDown className="w-4 h-4 text-[rgba(255,255,255,0.5)] absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none" />
          </div>
          </div>
        </div>

      {!dashboardData ? (
          <div className="bg-[rgba(255,255,255,0.08)] backdrop-blur-[10px] border border-[rgba(255,255,255,0.1)] rounded-2xl p-12 flex flex-col items-center justify-center text-center min-h-[400px]">
            <AlertCircle className="w-20 h-20 text-[rgba(255,255,255,0.4)] mb-6" />
            <h3 className="text-2xl font-semibold text-[rgba(255,255,255,0.8)] mb-3">No Data Available</h3>
            <p className="text-[rgba(255,255,255,0.5)] text-lg">Please select a different period or add data in the Data Grid tab</p>
        </div>
      ) : (
          <main className="grid grid-cols-6 auto-rows-auto gap-5">
            {/* Net Sales Row - 4 cards */}
            <Card className="col-span-1">
              <CardHeader>
                <CardTitle>Current Net Sales</CardTitle>
                <CardIcon progress={dashboardData.current_net_sales_percentage}><Wrench size={20} /></CardIcon>
              </CardHeader>
              <CardValue>
                <DirhamIcon className="w-5 h-5 mr-2" />
                  {formatCurrency(dashboardData.current_net_sales || 0)}
              </CardValue>
              <div className="flex flex-col gap-1 mb-2">
                <div className="flex items-center gap-1 text-sm font-medium text-white">
                {dashboardData.current_net_sales_percentage >= 100 ? '↑' : '↓'} {formatPercentage(dashboardData.current_net_sales_percentage)} vs target
              </div>
                {previousMonthData && (() => {
                  const prevDate = new Date(previousMonthData.metric_date);
                  const prevDateStr = prevDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
                  const changePercent = ((dashboardData.current_net_sales - previousMonthData.current_net_sales) / previousMonthData.current_net_sales) * 100;
                  return (
                    <div className="text-xs text-white">
                      {changePercent >= 0 ? '↑' : '↓'}{' '}
                      {formatPercentage(Math.abs(changePercent))} vs {prevDateStr}
                    </div>
                  );
                })()}
              </div>
              {monthTarget && dashboardData && dashboardData.current_net_sales_percentage < 112 && (() => {
                const target112 = (monthTarget.net_sales_target || 0) * 1.12;
                const remaining = Math.max(0, target112 - dashboardData.current_net_sales);
                const daysRemaining = Math.max(0, (monthTarget.number_of_working_days || 0) - (dashboardData.working_days_elapsed || 0));
                const dailyRateNeeded = daysRemaining > 0 ? remaining / daysRemaining : 0;
                const formatCompact = (amount: number) => {
                  if (amount >= 1000) {
                    return `${(amount / 1000).toFixed(1)}K`;
                  }
                  return formatCurrency(amount);
                };
                return daysRemaining > 0 ? (
                  <div className="flex items-center gap-1 text-xs text-white">
                    <span>Need</span>
                    <DirhamIcon className="w-3 h-3" />
                    <span className="font-semibold">{formatCompact(dailyRateNeeded)}/day</span>
                  </div>
                ) : null;
              })()}
            </Card>

            <Card className="col-span-1">
              <CardHeader>
                <CardTitle>Est. Sales Month End</CardTitle>
                <CardIcon progress={dashboardData.estimated_net_sales_percentage}><TrendingUp size={20} /></CardIcon>
              </CardHeader>
              <CardValue>
                <DirhamIcon className="w-5 h-5 mr-2" />
                  {formatCurrency(dashboardData.estimated_net_sales || 0)}
              </CardValue>
              <div className="flex items-center gap-1 text-sm font-medium text-white">
                {dashboardData.estimated_net_sales_percentage >= 100 ? '↑' : '↓'} {formatPercentage(dashboardData.estimated_net_sales_percentage)} vs target
              </div>
            </Card>

            <Card className="col-span-1">
              <CardHeader>
                <CardTitle>Daily Average</CardTitle>
                <CardIcon><CalendarDays size={20} /></CardIcon>
              </CardHeader>
              <CardValue>
                <DirhamIcon className="w-5 h-5 mr-2" />
                  {formatCurrency(dashboardData.current_daily_average || 0)}
              </CardValue>
              <div className="flex items-center gap-1 text-sm font-medium text-white">
                Daily pace
              </div>
            </Card>

            <Card className="col-span-3">
              <CardHeader>
                <CardTitle>Net Sales Targets</CardTitle>
                <CardIcon><Trophy size={20} /></CardIcon>
              </CardHeader>
              <div className="flex flex-col gap-4 mt-2">
                <TargetItem
                  label="100% Target"
                  value={monthTarget?.net_sales_target || 0}
                  progress={(dashboardData.current_net_sales / (monthTarget?.net_sales_target || 1)) * 100}
                  current={dashboardData.current_net_sales}
                  daysRemaining={monthTarget && dashboardData ? Math.max(0, (monthTarget.number_of_working_days || 0) - (dashboardData.working_days_elapsed || 0)) : 0}
                  showDailyRate={false}
                />
                <TargetItem
                  label="112% Target"
                  value={(monthTarget?.net_sales_target || 0) * 1.12}
                  progress={(dashboardData.current_net_sales / ((monthTarget?.net_sales_target || 1) * 1.12)) * 100}
                  current={dashboardData.current_net_sales}
                  daysRemaining={monthTarget && dashboardData ? Math.max(0, (monthTarget.number_of_working_days || 0) - (dashboardData.working_days_elapsed || 0)) : 0}
                  showDailyRate={false}
                />
              </div>
            </Card>

            {/* Divider between Net Sales and Labour Sales */}
            <div className="col-span-6 border-t border-[rgba(255,255,255,0.1)] my-2"></div>

            {/* Labour Sales Row - 4 cards */}
            <Card className="col-span-1">
              <CardHeader>
                <CardTitle>Current Labour Sales</CardTitle>
                <CardIcon progress={dashboardData.current_labour_sales_percentage}><Wrench size={20} /></CardIcon>
              </CardHeader>
              <CardValue>
                <DirhamIcon className="w-5 h-5 mr-2" />
                  {formatCurrency(dashboardData.current_net_labor_sales || 0)}
              </CardValue>
              <div className="flex flex-col gap-1 mb-2">
                <div className="flex items-center gap-1 text-sm font-medium text-white">
                {dashboardData.current_labour_sales_percentage >= 100 ? '↑' : '↓'} {formatPercentage(dashboardData.current_labour_sales_percentage)} vs target
              </div>
                {previousMonthData && (() => {
                  const prevDate = new Date(previousMonthData.metric_date);
                  const prevDateStr = prevDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
                  const changePercent = ((dashboardData.current_net_labor_sales - previousMonthData.current_net_labor_sales) / previousMonthData.current_net_labor_sales) * 100;
                  return (
                    <div className="text-xs text-white">
                      {changePercent >= 0 ? '↑' : '↓'}{' '}
                      {formatPercentage(Math.abs(changePercent))} vs {prevDateStr}
                    </div>
                  );
                })()}
              </div>
              {monthTarget && dashboardData && (dashboardData.current_net_labor_sales / ((monthTarget.labour_sales_target || 1) * 1.12) * 100) < 112 && (() => {
                const target112 = (monthTarget.labour_sales_target || 0) * 1.12;
                const remaining = Math.max(0, target112 - dashboardData.current_net_labor_sales);
                const daysRemaining = Math.max(0, (monthTarget.number_of_working_days || 0) - (dashboardData.working_days_elapsed || 0));
                const dailyRateNeeded = daysRemaining > 0 ? remaining / daysRemaining : 0;
                const formatCompact = (amount: number) => {
                  if (amount >= 1000) {
                    return `${(amount / 1000).toFixed(1)}K`;
                  }
                  return formatCurrency(amount);
                };
                return daysRemaining > 0 ? (
                  <div className="flex items-center gap-1 text-xs text-white">
                    <span>Need</span>
                    <DirhamIcon className="w-3 h-3" />
                    <span className="font-semibold">{formatCompact(dailyRateNeeded)}/day</span>
                  </div>
                ) : null;
              })()}
            </Card>

            <Card className="col-span-1">
              <CardHeader>
                <CardTitle>Est. Labour Month End</CardTitle>
                <CardIcon progress={dashboardData.estimated_labor_sales_percentage}><TrendingUp size={20} /></CardIcon>
              </CardHeader>
              <CardValue>
                <DirhamIcon className="w-5 h-5 mr-2" />
                  {formatCurrency(dashboardData.estimated_labor_sales || 0)}
              </CardValue>
              <div className="flex items-center gap-1 text-sm font-medium text-white">
                {dashboardData.estimated_labor_sales_percentage >= 100 ? '↑' : '↓'} {formatPercentage(dashboardData.estimated_labor_sales_percentage)} vs target
              </div>
            </Card>

            <Card className="col-span-1">
              <CardHeader>
                <CardTitle>Daily Average</CardTitle>
                <CardIcon><CalendarDays size={20} /></CardIcon>
              </CardHeader>
              <CardValue>
                <DirhamIcon className="w-5 h-5 mr-2" />
                {formatCurrency((dashboardData.current_net_labor_sales || 0) / (dashboardData.working_days_elapsed || 1))}
              </CardValue>
              <div className="flex items-center gap-1 text-sm font-medium text-white">
                Daily pace
              </div>
            </Card>

            <Card className="col-span-3">
              <CardHeader>
                <CardTitle>Labour Sales Targets</CardTitle>
                <CardIcon><Trophy size={20} /></CardIcon>
              </CardHeader>
              <div className="flex flex-col gap-4 mt-2">
                <TargetItem
                  label="100% Target"
                  value={monthTarget?.labour_sales_target || 0}
                  progress={(dashboardData.current_net_labor_sales / (monthTarget?.labour_sales_target || 1)) * 100}
                  current={dashboardData.current_net_labor_sales}
                  daysRemaining={monthTarget && dashboardData ? Math.max(0, (monthTarget.number_of_working_days || 0) - (dashboardData.working_days_elapsed || 0)) : 0}
                  showDailyRate={false}
                />
                <TargetItem
                  label="112% Target"
                  value={(monthTarget?.labour_sales_target || 0) * 1.12}
                  progress={(dashboardData.current_net_labor_sales / ((monthTarget?.labour_sales_target || 1) * 1.12)) * 100}
                  current={dashboardData.current_net_labor_sales}
                  daysRemaining={monthTarget && dashboardData ? Math.max(0, (monthTarget.number_of_working_days || 0) - (dashboardData.working_days_elapsed || 0)) : 0}
                  showDailyRate={false}
            />
          </div>
            </Card>

            {/* Charts Section */}
            <NetSalesProgressChart metrics={metrics} selectedYear={selectedYear} selectedMonth={selectedMonth} monthTarget={monthTarget} />
            <LabourSalesProgressChart metrics={metrics} selectedYear={selectedYear} selectedMonth={selectedMonth} monthTarget={monthTarget} />
            <TargetForecastChart metrics={metrics} selectedYear={selectedYear} selectedMonth={selectedMonth} monthTarget={monthTarget} />
            <DailyAverageChart dashboardData={dashboardData} monthTarget={monthTarget} metrics={metrics} selectedYear={selectedYear} selectedMonth={selectedMonth} />

            {/* Marketing Spend % */}
            <Card className="col-span-1 row-span-2">
              <CardHeader>
                <CardTitle>Marketing Spend %</CardTitle>
                <CardIcon><TrendingUp size={20} /></CardIcon>
              </CardHeader>
              <CardValue>
                {marketingSpendPercentage.toFixed(1)}%
              </CardValue>
              <div className="flex items-center gap-1 text-sm font-medium text-white">
                Budget allocation
          </div>
            </Card>

            {/* Marketing Spend */}
            <Card className="col-span-1 row-span-2">
              <CardHeader>
                <CardTitle>Marketing Spend</CardTitle>
                <CardIcon><TrendingUp size={20} /></CardIcon>
              </CardHeader>
              <CardValue>
                <DirhamIcon className="w-5 h-5 mr-2" />
                {formatCurrency(dashboardData.current_marketing_spend || 0)}
              </CardValue>
              <div className="flex items-center gap-1 text-sm font-medium text-white">
                Total spend
              </div>
            </Card>

            {/* Avg Invoice Value */}
            <Card className="col-span-1 row-span-2">
              <CardHeader>
                <CardTitle>Avg. Invoice Value</CardTitle>
                <CardIcon><FileText size={20} /></CardIcon>
              </CardHeader>
              <CardValue>
                <FileText className="w-5 h-5 mr-2" />
                {formatCurrency(averageInvoiceValue)}
              </CardValue>
              <div className="flex items-center gap-1 text-sm font-medium text-white">
                Per transaction
              </div>
            </Card>

              {/* Number of Invoices */}
            <Card className="col-span-1 row-span-2">
              <CardHeader>
                <CardTitle>Number of Invoices</CardTitle>
                <CardIcon><FileText size={20} /></CardIcon>
              </CardHeader>
              <CardValue>
                {monthlyInvoiceSum}
              </CardValue>
              <div className="flex items-center gap-1 text-sm font-medium text-white">
                Total count
              </div>
            </Card>

            {/* Vehicle Throughput */}
            <Card className="col-span-1 row-span-2">
              <CardHeader>
                <CardTitle>Vehicle Throughput</CardTitle>
                <CardIcon><Gauge size={20} /></CardIcon>
              </CardHeader>
              <div className="flex flex-col items-center justify-center py-8">
                <div className="relative w-[200px] h-[120px]">
                  {/* Speedometer Arc Background */}
                  <svg viewBox="0 0 200 120" className="w-full h-full">
                    {/* Background arc */}
                    <path
                      d="M 20 100 A 80 80 0 0 1 180 100"
                      fill="none"
                      stroke="rgba(255,255,255,0.1)"
                      strokeWidth="20"
                      strokeLinecap="round"
                    />
                    {/* Colored segments - Red (1-5), Orange (5-8), Green (8-12) */}
                    {/* Red zone: 0-41.67% of arc (5/12) */}
                    <path
                      d="M 20 100 A 80 80 0 0 1 73 35"
                      fill="none"
                      stroke="#FF3B30"
                      strokeWidth="20"
                      strokeLinecap="round"
                    />
                    {/* Orange zone: 41.67-66.67% of arc (5-8/12) */}
                    <path
                      d="M 73 35 A 80 80 0 0 1 127 35"
                      fill="none"
                      stroke="#FFC107"
                      strokeWidth="20"
                      strokeLinecap="round"
                    />
                    {/* Green zone: 66.67-100% of arc (8-12/12) */}
                    <path
                      d="M 127 35 A 80 80 0 0 1 180 100"
                      fill="none"
                      stroke="#4CD964"
                      strokeWidth="20"
                      strokeLinecap="round"
                    />
                    {/* Needle - rotates based on value (1-12 mapped to 180 degrees) */}
                    <g transform={`rotate(${-90 + ((vehicleThroughput / vehicleThroughputTarget) * 180)} 100 100)`}>
                      <line
                        x1="100"
                        y1="100"
                        x2="100"
                        y2="35"
                        stroke="#ffffff"
                        strokeWidth="3"
                        strokeLinecap="round"
                      />
                      <circle cx="100" cy="100" r="8" fill="#ffffff" />
                    </g>
                  </svg>
                </div>
                {/* Value below speedometer */}
                <div className="flex flex-col items-center mt-4">
                  <div className="text-3xl font-bold text-white">
                    {vehicleThroughput.toFixed(1)}
                </div>
                  <div className="text-xs text-white/60">Vehicles per day</div>
              </div>
            </div>
            </Card>

            <RevenueMixChart dashboardData={dashboardData} />

            {/* Team Performance */}
            <div className="col-span-6 bg-[rgba(255,255,255,0.08)] backdrop-blur-[10px] border border-[rgba(255,255,255,0.1)] rounded-2xl p-6 shadow-[0_4px_20px_rgba(0,0,0,0.2)] transition-all duration-300 hover:shadow-[0_8px_30px_rgba(0,0,0,0.3)]">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <div className="text-xl font-bold text-white mb-1">Team Performance</div>
                  <div className="text-sm text-white/60">Individual contributions</div>
                </div>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[rgba(255,255,255,0.1)] text-white">
                  <Users size={20} />
                </div>
              </div>
            <div className="grid grid-cols-3 gap-4">
                <TeamMember
                  name="Daniel"
                  role="Service Advisor"
                  sales={dashboardData.daniel_total_sales || 0}
                  contribution={danielContribution}
                />
                <TeamMember
                  name="Lucy"
                  role="Service Advisor"
                  sales={dashboardData.lucy_total_sales || 0}
                  contribution={lucyContribution}
                />
                <TeamMember
                  name="Essrar"
                  role="Service Advisor"
                  sales={dashboardData.essrar_total_sales || 0}
                  contribution={essrarContribution}
              />
            </div>
          </div>

            {/* Annual Charts */}
            <AnnualNetSalesChart metrics={metrics} targets={targets} selectedYear={selectedYear} />
            <AnnualLabourSalesChart metrics={metrics} targets={targets} selectedYear={selectedYear} />
          </main>
      )}
      </div>
    </div>
  );
}

// Card Components
function Card({ children, className = "", style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <div className={`rounded-lg bg-gradient-to-br from-white/10 to-white/5 backdrop-blur p-3 border border-white/10 shadow-inner ${className}`} style={style}>
      {children}
    </div>
  );
}

function CardHeader({ children }: { children: React.ReactNode }) {
  return <div className="flex justify-between items-center mb-3">{children}</div>;
}

function CardTitle({ children }: { children: React.ReactNode }) {
  return <div className="text-sm font-medium text-white/70">{children}</div>;
}

function CardIcon({ children, progress }: { children: React.ReactNode; progress?: number }) {
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  // Cap progress at 112% for visual display, but keep color logic based on actual percentage
  const displayProgress = progress !== undefined ? Math.min(progress, 112) : undefined;
  const strokeDashoffset = displayProgress !== undefined ? circumference - (displayProgress / 112) * circumference : 0;
  
  const getProgressColor = () => {
    if (progress === undefined) return '#C0C0C0';
    if (progress >= 100) return '#4CD964';
    if (progress >= 85) return '#FFC107';
    return '#FF3B30';
  };

  return (
    <div className="relative w-10 h-10 rounded-xl flex items-center justify-center bg-[rgba(192,192,192,0.2)] text-[#C0C0C0]">
      {progress !== undefined && (
        <svg className="absolute inset-0 w-10 h-10 -rotate-90" viewBox="0 0 40 40">
          <circle
            cx="20"
            cy="20"
            r={radius}
            stroke="rgba(255,255,255,0.1)"
            strokeWidth="2"
            fill="none"
          />
          <circle
            cx="20"
            cy="20"
            r={radius}
            stroke={getProgressColor()}
            strokeWidth="2"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-500"
          />
        </svg>
      )}
      <div className="relative z-10">{children}</div>
    </div>
  );
}

function CardValue({ children }: { children: React.ReactNode }) {
  return <div className="text-xl font-semibold mb-2 text-white flex items-center tabular-nums">{children}</div>;
}

function CardGrowth({ children, positive = true, percentage }: { children: React.ReactNode; positive?: boolean; percentage?: number }) {
  // Color coding based on percentage to target
  const getColor = () => {
    if (!percentage) return positive ? 'text-[#4CD964]' : 'text-[#FF3B30]';
    if (percentage >= 100) return 'text-[#4CD964]'; // Green for on/above target
    if (percentage >= 85) return 'text-[#FFC107]'; // Yellow/amber for approaching target
    return 'text-[#FF3B30]'; // Red for below target
  };

    return (
    <div className={`flex items-center gap-1 text-sm font-medium ${getColor()}`}>
      {children}
      </div>
  );
}

function TargetItem({ label, value, progress, current, daysRemaining, showDailyRate = false }: { label: string; value: number; progress: number; current: number; daysRemaining?: number; showDailyRate?: boolean }) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AE', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatCompact = (amount: number) => {
    if (amount >= 1000) {
      return `${(amount / 1000).toFixed(1)}K`;
    }
    return formatCurrency(amount);
  };

  const remaining = Math.max(0, value - current);
  const isAchieved = progress >= 100;
  const dailyRateNeeded = daysRemaining && daysRemaining > 0 ? remaining / daysRemaining : 0;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between items-center">
        <span className="text-sm text-[rgba(255,255,255,0.8)]">{label}</span>
        <div className="flex items-center gap-1">
          <DirhamIcon className="w-4 h-4 text-[#C0C0C0]" />
          <span className="text-lg font-bold text-[#C0C0C0] tabular-nums">{formatCurrency(value)}</span>
            </div>
            </div>
      <div className="h-1.5 bg-[rgba(255,255,255,0.1)] rounded-full overflow-hidden">
        <div 
          className="h-full rounded-full transition-all duration-300" 
          style={{ 
            width: `${Math.min(progress, 100)}%`,
            background: isAchieved 
              ? 'linear-gradient(90deg, #4CD964 0%, #34C759 100%)'
              : 'linear-gradient(90deg, #C0C0C0 0%, #A0A0A0 100%)'
          }}
        ></div>
      </div>
      <div className="flex justify-between items-center">
        <span className="text-xs text-[rgba(255,255,255,0.5)]">
          {isAchieved ? 'Target Achieved! 🎉' : 'Remaining'}
        </span>
        {!isAchieved && (
          <div className="flex items-center gap-1">
            <DirhamIcon className="w-3 h-3 text-[rgba(255,255,255,0.5)]" />
            <span className="text-sm font-semibold text-[rgba(255,255,255,0.7)] tabular-nums">
              {formatCurrency(remaining)}
            </span>
          </div>
        )}
      </div>
      {!isAchieved && showDailyRate && daysRemaining && daysRemaining > 0 && (
        <div className="flex items-center gap-1 text-xs text-[#FFC107] bg-[rgba(255,193,7,0.1)] px-2 py-1 rounded">
          <span>Need</span>
          <DirhamIcon className="w-3 h-3" />
          <span className="font-semibold">{formatCompact(dailyRateNeeded)}/day</span>
          <span>to hit target</span>
        </div>
      )}
    </div>
  );
}

function TeamMember({ name, role, sales, contribution }: { name: string; role: string; sales: number; contribution: number }) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AE', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Subtle ranking indicator
  const isTopPerformer = contribution >= 40;

  return (
    <div className="relative flex flex-col items-center gap-4 p-6 bg-[rgba(255,255,255,0.05)] backdrop-blur-[10px] border border-[rgba(255,255,255,0.1)] rounded-xl transition-all duration-300 hover:bg-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.15)]">
      {/* Subtle top performer indicator */}
      {isTopPerformer && (
        <div className="absolute top-3 right-3 w-2 h-2 bg-white/30 rounded-full"></div>
      )}
      
      {/* Name and Role */}
      <div className="text-center">
        <div className="text-2xl font-bold text-white mb-1">{name}</div>
        <div className="text-sm text-white/50">{role}</div>
          </div>
      
      {/* Sales Amount */}
      <div className="flex items-center gap-2">
        <DirhamIcon className="w-5 h-5 text-white/60" />
        <div className="text-2xl font-bold text-white tabular-nums">{formatCurrency(sales)}</div>
        </div>
      
      {/* Contribution Percentage */}
      <div className="w-full">
        {/* Progress bar */}
        <div className="h-1.5 bg-[rgba(255,255,255,0.1)] rounded-full overflow-hidden mb-2">
          <div 
            className="h-full bg-gradient-to-r from-white/40 to-white/60 rounded-full transition-all duration-500"
            style={{ width: `${contribution}%` }}
          ></div>
        </div>
        {/* Percentage text */}
        <div className="text-center text-sm text-white/70 font-medium">
          {contribution.toFixed(1)}% of total
        </div>
      </div>
          </div>
  );
}

// Chart Components
function NetSalesProgressChart({ metrics, selectedYear, selectedMonth, monthTarget }: any) {
  const formatCurrencyCompact = (amount: number) => {
    return new Intl.NumberFormat('en-AE', { notation: 'compact', maximumFractionDigits: 1 }).format(amount);
  };

  const formatCurrencyFull = (amount: number) => {
    return new Intl.NumberFormat('en-AE', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const monthMetrics = metrics
    .filter((m: any) => {
      const date = new Date(m.metric_date);
      return date.getFullYear() === selectedYear && (date.getMonth() + 1) === selectedMonth;
    })
    .sort((a: any, b: any) => new Date(a.metric_date).getTime() - new Date(b.metric_date).getTime());

  const workingDays = monthTarget?.number_of_working_days || 30;
  const dailyTarget = (monthTarget?.net_sales_target || 0) / workingDays;
  const dailyTarget112 = dailyTarget * 1.12;
  const finalTarget112 = (monthTarget?.net_sales_target || 0) * 1.12;

  // Find the last calendar day with actual data
  const lastDayWithData = monthMetrics.length > 0
    ? Math.max(...monthMetrics.map((m: any) => new Date(m.metric_date).getDate()))
    : 0;

  // Use working days as the chart range (not last day with data)
  const daysInMonth = workingDays;
  

  // Create full working days array with all days, even if no data exists
  const chartData = Array.from({ length: workingDays }, (_, i) => {
    const workingDay = i + 1;

    // Get all metrics up to this working day (sorted by date)
    const metricsUpToDay = monthMetrics.slice(0, workingDay);
    const latestMetricUpToDay = metricsUpToDay[metricsUpToDay.length - 1];

    // Calculate targets as a proportion of the total, reaching exact target values at the last working day
    const progressRatio = workingDay / workingDays;
    const cumulativeTargetValue = (monthTarget?.net_sales_target || 0) * progressRatio;

    // 112% target as a straight line proportional to working days
    const dynamicTarget112 = finalTarget112 * progressRatio;

    // Only show current net sales data if we have actual data for this working day
    const currentNetSalesValue = (workingDay <= monthMetrics.length && latestMetricUpToDay) 
      ? latestMetricUpToDay.current_net_sales 
      : null;

    return {
      day: workingDay.toString(),
      cumulativeTarget: cumulativeTargetValue,
      currentNetSales: currentNetSalesValue,
      target112: dynamicTarget112,
    };
  });

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
    return (
        <div style={{
          backgroundColor: 'rgba(0, 0, 0, 0.9)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          borderRadius: '12px',
          padding: '10px'
        }}>
          <p style={{ color: '#ffffff', fontWeight: 700, marginBottom: '8px' }}>{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} style={{ color: '#E0E0E0', fontSize: '12px', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span>{entry.name} : </span>
              <DirhamIcon className="w-3 h-3" />
              <span>{entry.value ? formatCurrencyFull(Number(entry.value)) : 'N/A'}</span>
          </div>
          ))}
      </div>
    );
    }
    return null;
  };

  // Calculate current performance for status badge
  const latestMetric = monthMetrics[monthMetrics.length - 1];
  const currentSales = latestMetric?.current_net_sales || 0;
  const currentPercentage = monthTarget ? (currentSales / (monthTarget.net_sales_target * 1.12)) * 100 : 0;
  
  const statusText = currentPercentage >= 100 ? 'Target Achieved' : currentPercentage >= 85 ? 'On Pace' : 'Needs Improvement';
  const statusColor = currentPercentage >= 100 ? '#4CD964' : currentPercentage >= 85 ? '#4CD964' : '#FFC107';
  const statusBgColor = currentPercentage >= 100 ? 'rgba(76, 217, 100, 0.2)' : currentPercentage >= 85 ? 'rgba(76, 217, 100, 0.2)' : 'rgba(255, 193, 7, 0.2)';
  const statusIcon = currentPercentage >= 100 ? '🎉' : currentPercentage >= 85 ? '✓' : '⚠';

  return (
    <Card className="col-span-3 row-span-2" style={{ backgroundColor: '#000000' }}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-xl font-bold text-white">Net Sales Progress</h3>
            <span style={{ 
              backgroundColor: statusBgColor, 
              color: statusColor, 
              padding: '4px 12px', 
              borderRadius: '6px', 
              fontSize: '12px', 
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              <span>{statusIcon}</span> {statusText}
            </span>
          </div>
          <p className="text-sm text-white/60">Cumulative sales progress vs targets</p>
        </div>
      </div>
      
      <div className="h-[400px] rounded-xl relative bg-black" style={{ backgroundColor: '#000000' }}>
        {/* Legend */}
        <div className="flex items-center justify-center gap-6 mb-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-0.5 bg-white opacity-60"></div>
            <span className="text-xs text-white/60">100% Target</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-0.5 border-t-2 border-dashed border-white opacity-40"></div>
            <span className="text-xs text-white/60">112% Target</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-0.5 bg-[#4CD964]"></div>
            <span className="text-xs text-white/60">Current Sales</span>
          </div>
        </div>

        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: -25, bottom: 20 }}>
            <defs>
              <linearGradient id="targetGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ffffff" stopOpacity={0.48}/>
                <stop offset="95%" stopColor="#ffffff" stopOpacity={0.06}/>
              </linearGradient>
            </defs>
            <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#ffffff60' }} />
            <YAxis tick={{ fontSize: 10, fill: '#ffffff60' }} width={60} tickFormatter={formatCurrencyCompact} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(0,0,0,0.9)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '8px',
                color: '#ffffff'
              }}
              formatter={(value: any, name: string) => {
                if (name === 'cumulativeTarget') return [formatCurrencyFull(value), '100% Target'];
                if (name === 'currentNetSales') return [formatCurrencyFull(value), 'Current Sales'];
                if (name === 'target112') return [formatCurrencyFull(value), '112% Target'];
                return [value, name];
              }}
            />
            <Line type="monotone" dataKey="target112" stroke="#ffffff" strokeWidth={1.5} strokeDasharray="3 3" strokeOpacity={0.4} name="target112" dot={false} />
            <Area type="monotone" dataKey="cumulativeTarget" fill="url(#targetGradient)" stroke="#ffffff60" strokeWidth={1.5} name="cumulativeTarget" connectNulls={true} />
            <Line 
            type="monotone"
            dataKey="currentNetSales" 
              stroke="#4CD964" 
              strokeWidth={3} 
              name="currentNetSales" 
              dot={{ fill: '#4CD964', r: 4, strokeWidth: 0 }} 
              activeDot={{ r: 6 }} 
              connectNulls={false} 
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
    </Card>
  );
}

function LabourSalesProgressChart({ metrics, selectedYear, selectedMonth, monthTarget }: any) {
  const formatCurrencyCompact = (amount: number) => {
    return new Intl.NumberFormat('en-AE', { notation: 'compact', maximumFractionDigits: 1 }).format(amount);
  };

  const formatCurrencyFull = (amount: number) => {
    return new Intl.NumberFormat('en-AE', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const monthMetrics = metrics
    .filter((m: any) => {
      const date = new Date(m.metric_date);
      return date.getFullYear() === selectedYear && (date.getMonth() + 1) === selectedMonth;
    })
    .sort((a: any, b: any) => new Date(a.metric_date).getTime() - new Date(b.metric_date).getTime());

  const workingDays = monthTarget?.number_of_working_days || 30;
  const dailyTarget = (monthTarget?.labour_sales_target || 0) / workingDays;
  const dailyTarget112 = dailyTarget * 1.12;
  const finalTarget112 = (monthTarget?.labour_sales_target || 0) * 1.12;

  // Find the last calendar day with actual data
  const lastDayWithData = monthMetrics.length > 0
    ? Math.max(...monthMetrics.map((m: any) => new Date(m.metric_date).getDate()))
    : 0;

  // Use working days as the chart range (not last day with data)
  const daysInMonth = workingDays;
  

  // Create full working days array with all days, even if no data exists
  const chartData = Array.from({ length: workingDays }, (_, i) => {
    const workingDay = i + 1;

    // Get all metrics up to this working day (sorted by date)
    const metricsUpToDay = monthMetrics.slice(0, workingDay);
    const latestMetricUpToDay = metricsUpToDay[metricsUpToDay.length - 1];

    // Calculate targets as a proportion of the total, reaching exact target values at the last working day
    const progressRatio = workingDay / workingDays;
    const cumulativeTargetValue = (monthTarget?.labour_sales_target || 0) * progressRatio;

    // 112% target as a straight line proportional to working days
    const dynamicTarget112 = finalTarget112 * progressRatio;

    // Only show current labour sales data if we have actual data for this working day
    const currentLabourSalesValue = (workingDay <= monthMetrics.length && latestMetricUpToDay) 
      ? latestMetricUpToDay.current_net_labor_sales 
      : null;

    return {
      day: workingDay.toString(),
      cumulativeTarget: cumulativeTargetValue,
      currentLabourSales: currentLabourSalesValue,
      target112: dynamicTarget112,
    };
  });

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
    return (
        <div style={{
          backgroundColor: 'rgba(0, 0, 0, 0.9)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          borderRadius: '12px',
          padding: '10px'
        }}>
          <p style={{ color: '#ffffff', fontWeight: 700, marginBottom: '8px' }}>{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} style={{ color: '#E0E0E0', fontSize: '12px', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span>{entry.name} : </span>
              <DirhamIcon className="w-3 h-3" />
              <span>{entry.value ? formatCurrencyFull(Number(entry.value)) : 'N/A'}</span>
          </div>
          ))}
      </div>
    );
    }
    return null;
  };

  // Calculate current performance for status badge
  const latestMetric = monthMetrics[monthMetrics.length - 1];
  const currentSales = latestMetric?.current_net_labor_sales || 0;
  const currentPercentage = monthTarget ? (currentSales / (monthTarget.labour_sales_target * 1.12)) * 100 : 0;
  
  const statusText = currentPercentage >= 100 ? 'Target Achieved' : currentPercentage >= 85 ? 'On Pace' : 'Needs Improvement';
  const statusColor = currentPercentage >= 100 ? '#4CD964' : currentPercentage >= 85 ? '#4CD964' : '#FFC107';
  const statusBgColor = currentPercentage >= 100 ? 'rgba(76, 217, 100, 0.2)' : currentPercentage >= 85 ? 'rgba(76, 217, 100, 0.2)' : 'rgba(255, 193, 7, 0.2)';
  const statusIcon = currentPercentage >= 100 ? '🎉' : currentPercentage >= 85 ? '✓' : '⚠';

  return (
    <Card className="col-span-3 row-span-2" style={{ backgroundColor: '#000000' }}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-xl font-bold text-white">Labour Sales Progress</h3>
            <span style={{ 
              backgroundColor: statusBgColor, 
              color: statusColor, 
              padding: '4px 12px', 
              borderRadius: '6px', 
              fontSize: '12px', 
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              <span>{statusIcon}</span> {statusText}
            </span>
          </div>
          <p className="text-sm text-white/60">Cumulative labour sales progress vs targets</p>
        </div>
      </div>
      
      <div className="h-[400px] rounded-xl relative bg-black" style={{ backgroundColor: '#000000' }}>
        {/* Legend */}
        <div className="flex items-center justify-center gap-6 mb-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-0.5 bg-white opacity-60"></div>
            <span className="text-xs text-white/60">100% Target</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-0.5 border-t-2 border-dashed border-white opacity-40"></div>
            <span className="text-xs text-white/60">112% Target</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-0.5 bg-[#4CD964]"></div>
            <span className="text-xs text-white/60">Current Labour Sales</span>
          </div>
        </div>

        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: -25, bottom: 20 }}>
            <defs>
              <linearGradient id="labourTargetGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ffffff" stopOpacity={0.48}/>
                <stop offset="95%" stopColor="#ffffff" stopOpacity={0.06}/>
              </linearGradient>
            </defs>
            <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#ffffff60' }} />
            <YAxis tick={{ fontSize: 10, fill: '#ffffff60' }} width={60} tickFormatter={formatCurrencyCompact} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(0,0,0,0.9)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '8px',
                color: '#ffffff'
              }}
              formatter={(value: any, name: string) => {
                if (name === 'cumulativeTarget') return [formatCurrencyFull(value), '100% Target'];
                if (name === 'currentLabourSales') return [formatCurrencyFull(value), 'Current Labour Sales'];
                if (name === 'target112') return [formatCurrencyFull(value), '112% Target'];
                return [value, name];
              }}
            />
            <Line type="monotone" dataKey="target112" stroke="#ffffff" strokeWidth={1.5} strokeDasharray="3 3" strokeOpacity={0.4} name="target112" dot={false} />
            <Area type="monotone" dataKey="cumulativeTarget" fill="url(#labourTargetGradient)" stroke="#ffffff60" strokeWidth={1.5} name="cumulativeTarget" connectNulls={true} />
          <Line 
            type="monotone"
            dataKey="currentLabourSales" 
              stroke="#4CD964" 
              strokeWidth={3} 
              name="currentLabourSales" 
              dot={{ fill: '#4CD964', r: 4, strokeWidth: 0 }} 
              activeDot={{ r: 6 }} 
              connectNulls={false} 
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
    </Card>
  );
}

function DailyAverageChart({ dashboardData, monthTarget, metrics, selectedYear, selectedMonth }: any) {
  const formatCurrencyCompact = (amount: number) => {
    return new Intl.NumberFormat('en-AE', { notation: 'compact', maximumFractionDigits: 1 }).format(amount);
  };

  const formatCurrencyFull = (amount: number) => {
    return new Intl.NumberFormat('en-AE', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const monthMetrics = metrics
    .filter((m: any) => {
      const date = new Date(m.metric_date);
      return date.getFullYear() === selectedYear && (date.getMonth() + 1) === selectedMonth;
    })
    .sort((a: any, b: any) => new Date(a.metric_date).getTime() - new Date(b.metric_date).getTime());

  const currentDailyAverage = dashboardData?.current_daily_average || 0;
  const target112 = monthTarget ? (monthTarget.net_sales_target * 1.12) : 0;
  const workingDays = monthTarget?.number_of_working_days || 30;
  const currentDay = dashboardData?.working_days_elapsed || 0;

  // Calculate current required daily average based on remaining days (fluctuates with performance)
  const currentSales = dashboardData?.current_net_sales || 0;
  const remainingTarget = target112 - currentSales;
  const remainingDays = workingDays - currentDay;
  const requiredFor112 = remainingDays > 0 ? Math.round(remainingTarget / remainingDays) : 0;

  const gap = requiredFor112 - currentDailyAverage;
  const performance = requiredFor112 > 0 ? (currentDailyAverage / requiredFor112) * 100 : 0;

  // Find the last calendar day with actual data
  const lastDayWithData = monthMetrics.length > 0 
    ? Math.max(...monthMetrics.map((m: any) => new Date(m.metric_date).getDate()))
    : currentDay;
  
  // Use working days as the chart range (not calendar days)
  const daysInMonth = workingDays;

  // Create chart data array for all working days, but only populate elapsed days
  const chartData = Array.from({ length: workingDays }, (_, i) => {
    const day = i + 1;

    // Only populate data for elapsed working days
    if (day > currentDay) {
      return {
        day: day.toString(),
        currentAvg: null,
        requiredDailyAverage: null,
        performance: null,
        displayDay: day,
      };
    }

    const metric = monthMetrics.find((m: any) => new Date(m.metric_date).getDate() === day);

    // Calculate cumulative average up to this day (use latest available if no data for this day)
    const metricsUpToDay = monthMetrics.filter((m: any) => new Date(m.metric_date).getDate() <= day);
    const latestMetricUpToDay = metricsUpToDay[metricsUpToDay.length - 1];

    let dailyAvg = null;
    let currentSalesForDay = 0;
    let requiredDailyAverage = null;
    let performanceForDay = null;

    if (latestMetricUpToDay) {
      dailyAvg = latestMetricUpToDay.current_daily_average;
      currentSalesForDay = latestMetricUpToDay.current_net_sales;

      // Calculate required daily average for this specific day
      // For current day, use same values as header for consistency
      const salesUpToDay = (day === currentDay) ? currentSales : currentSalesForDay;
      const targetAtDay = target112;
      const daysElapsedAtDay = day;
      const remainingDaysAtDay = workingDays - daysElapsedAtDay;
      requiredDailyAverage = remainingDaysAtDay > 0 ? Math.round((targetAtDay - salesUpToDay) / remainingDaysAtDay) : 0;

      performanceForDay = dailyAvg && requiredDailyAverage > 0 ? (dailyAvg / requiredDailyAverage) * 100 : null;
    }

    return {
      day: day.toString(),
      currentAvg: dailyAvg,
      requiredDailyAverage: requiredDailyAverage,
      performance: performanceForDay,
      displayDay: day,
    };
  });

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const dayData = chartData[parseInt(label) - 1];
      if (dayData && dayData.currentAvg !== null) {
        const requiredColor = dayData.requiredDailyAverage && dayData.requiredDailyAverage > dayData.currentAvg ? '#FF3B30' : '#4CD964';
        const performanceColor = dayData.performance && dayData.performance >= 100 ? '#4CD964' : dayData.performance && dayData.performance >= 85 ? '#FFC107' : '#FF3B30';
    return (
          <div style={{
            backgroundColor: 'rgba(0, 0, 0, 0.95)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '12px',
            padding: '12px 16px',
            minWidth: '200px'
          }}>
            <p style={{ color: '#ffffff', fontWeight: 700, marginBottom: '10px', fontSize: '14px' }}>Day {label}</p>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ color: requiredColor, fontSize: '12px' }}>Required Avg:</span>
              <span style={{ color: requiredColor, fontSize: '12px', fontWeight: 600 }}>{dayData.requiredDailyAverage !== null ? Math.round(dayData.requiredDailyAverage).toLocaleString() : 'N/A'}</span>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ color: '#4CD964', fontSize: '12px' }}>Current Avg:</span>
              <span style={{ color: '#ffffff', fontSize: '12px', fontWeight: 600 }}>{Math.round(dayData.currentAvg).toLocaleString()}</span>
          </div>
          
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
              <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px' }}>Performance:</span>
              <span style={{ color: performanceColor, fontSize: '12px', fontWeight: 600 }}>{dayData.performance !== null ? dayData.performance.toFixed(1) : '0.0'}%</span>
        </div>
      </div>
    );
      }
    }
    return null;
  };

  const statusColor = performance >= 100 ? '#4CD964' : performance >= 85 ? '#FFC107' : '#FF3B30';
  const statusText = performance >= 100 ? 'On Track' : 'Needs Improvement';

  return (
    <Card className="col-span-3 row-span-2" style={{ backgroundColor: '#000000' }}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-xl font-bold text-white">Net Sales Daily Average</h3>
            <span style={{ 
              backgroundColor: 'rgba(255, 193, 7, 0.2)', 
              color: '#FFC107', 
              padding: '4px 12px', 
              borderRadius: '6px', 
              fontSize: '12px', 
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              <span>⚠</span> {statusText}
              </span>
          </div>
          <p className="text-sm text-white/60 mb-3">Daily average performance and required daily average</p>
        </div>
        <span style={{ 
          backgroundColor: 'rgba(255, 193, 7, 0.2)', 
          color: '#FFC107', 
          padding: '4px 12px', 
          borderRadius: '6px', 
          fontSize: '12px', 
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}>
          {formatCurrencyCompact(requiredFor112)} required/day
          </span>
      </div>
      
      <div className="h-[400px] rounded-xl relative bg-black" style={{ backgroundColor: '#000000' }}>
        {/* Legend */}
        <div className="flex items-center justify-center gap-6 mb-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-0.5 bg-white opacity-60"></div>
            <span className="text-xs text-white/60">Required Daily Avg (112%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-0.5 bg-[#4CD964]"></div>
            <span className="text-xs text-white/60">Current Daily Avg</span>
          </div>
      </div>
      
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: -25, bottom: 20 }}>
            <defs>
              <linearGradient id="requiredGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ffffff" stopOpacity={0.36}/>
                <stop offset="95%" stopColor="#ffffff" stopOpacity={0.03}/>
              </linearGradient>
            </defs>
            <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#ffffff60' }} />
            <YAxis tick={{ fontSize: 10, fill: '#ffffff60' }} width={60} tickFormatter={formatCurrencyCompact} />
          <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="requiredDailyAverage" fill="url(#requiredGradient)" stroke="#ffffff60" strokeWidth={1.5} name="Required Daily Average" />
            <Line 
            type="monotone"
            dataKey="currentAvg" 
              stroke="#4CD964" 
              strokeWidth={3} 
              name="currentAvg" 
              dot={{ fill: '#4CD964', r: 4, strokeWidth: 0 }} 
              activeDot={{ r: 6 }}
              connectNulls={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
    </Card>
  );
}

function TargetForecastChart({ metrics, selectedYear, selectedMonth, monthTarget }: any) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AE', { notation: 'compact' }).format(amount);
  };

  const monthMetrics = metrics
    .filter((m: any) => {
      const date = new Date(m.metric_date);
      return date.getFullYear() === selectedYear && (date.getMonth() + 1) === selectedMonth;
    })
    .sort((a: any, b: any) => new Date(a.metric_date).getTime() - new Date(b.metric_date).getTime());

  const totalWorkingDays = monthTarget?.number_of_working_days || 30;
  const lastMetric = monthMetrics[monthMetrics.length - 1];
  const workingDaysElapsed = lastMetric?.working_days_elapsed || 1;
  const currentSales = lastMetric?.current_net_sales || 0;
  const estimatedSales = lastMetric?.estimated_net_sales || 0;
  const remainingDays = totalWorkingDays - workingDaysElapsed;
  const currentDailyAvg = workingDaysElapsed > 0 ? currentSales / workingDaysElapsed : 0;

  const target100 = monthTarget?.net_sales_target || 0;
  const target112 = (monthTarget?.net_sales_target || 0) * 1.12;

  // Calculate projections
  const linearProjection = currentSales + (remainingDays * currentDailyAvg);

  // Marketing Magic with end-of-month surge (26% surge in last 2 days)
  const END_OF_MONTH_SURGE_PCT = 0.26;
  const normalDays = Math.max(0, totalWorkingDays - 2);
  const rushDays = 2;
  
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

  // Build chart data for each working day
  const chartData = [];
  for (let workingDay = 1; workingDay <= totalWorkingDays; workingDay++) {
    const metric = monthMetrics[workingDay - 1];
    const isHistorical = workingDay <= workingDaysElapsed;
    
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

    chartData.push({
      day: workingDay,
      actual: isHistorical && metric ? (metric.current_net_sales || 0) : null,
      projected: !isHistorical ? (currentSales + (workingDay - workingDaysElapsed) * currentDailyAvg) : null,
      marketingMagic: marketingMagicValue,
      target100: (target100 / totalWorkingDays) * workingDay,
      target112: (target112 / totalWorkingDays) * workingDay,
    });
  }

  // Calculate current performance for status badge
  const currentPercentage = monthTarget ? (currentSales / (monthTarget.net_sales_target * 1.12)) * 100 : 0;
  
  const statusText = currentPercentage >= 100 ? 'Target Achieved' : currentPercentage >= 85 ? 'On Pace' : 'Needs Improvement';
  const statusColor = currentPercentage >= 100 ? '#4CD964' : currentPercentage >= 85 ? '#4CD964' : '#FFC107';
  const statusBgColor = currentPercentage >= 100 ? 'rgba(76, 217, 100, 0.2)' : currentPercentage >= 85 ? 'rgba(76, 217, 100, 0.2)' : 'rgba(255, 193, 7, 0.2)';
  const statusIcon = currentPercentage >= 100 ? '🎉' : currentPercentage >= 85 ? '✓' : '⚠';

  return (
    <Card className="col-span-3 row-span-2" style={{ backgroundColor: '#000000' }}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-xl font-bold text-white">Target Achievement Forecast</h3>
            <span style={{ 
              backgroundColor: statusBgColor, 
              color: statusColor, 
              padding: '4px 12px', 
              borderRadius: '6px', 
              fontSize: '12px', 
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              <span>{statusIcon}</span> {statusText}
            </span>
          </div>
          <p className="text-sm text-white/60">Weekly progress and month-end forecast</p>
        </div>
      </div>
      
      <div className="h-[400px] rounded-xl relative bg-black" style={{ backgroundColor: '#000000' }}>
        {/* Legend */}
        <div className="flex items-center justify-center gap-6 mb-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-0.5 bg-white opacity-40"></div>
            <span className="text-xs text-white/60">100% Target</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-0.5 bg-white opacity-60"></div>
            <span className="text-xs text-white/60">112% Target</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-0.5 bg-[#4CD964]"></div>
            <span className="text-xs text-white/60">Actual</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-white"></div>
            <span className="text-xs text-white/60">Projected</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-white" style={{ clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' }}></div>
            <span className="text-xs text-white/60">Marketing Forecast</span>
          </div>
        </div>

        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: -25, bottom: 20 }}>
            <defs>
              <linearGradient id="actualGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#4CD964" stopOpacity={0.5}/>
                <stop offset="50%" stopColor="#4CD964" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#4CD964" stopOpacity={0.05}/>
              </linearGradient>
            </defs>
            <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#ffffff60' }} />
            <YAxis tick={{ fontSize: 10, fill: '#ffffff60' }} width={60} tickFormatter={formatCurrency} />
          <Tooltip 
            contentStyle={{ 
                backgroundColor: 'rgba(0, 0, 0, 0.9)', 
              border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '8px',
                color: '#ffffff'
            }}
            formatter={(value: any) => {
              if (!value) return 'N/A';
              const formatted = new Intl.NumberFormat('en-AE', { 
                minimumFractionDigits: 0,
                maximumFractionDigits: 0 
              }).format(Number(value));
              return (
                <>
                  <DirhamIcon className="inline w-3 h-3 mr-1" />
                  {formatted}
                </>
              );
            }}
            />
            
            <Line 
              type="monotone"
              dataKey="target100" 
              stroke="#ffffff" 
              strokeWidth={1.5}
              strokeDasharray="3 3"
              strokeOpacity={0.4}
              dot={false}
              name="100% Target"
            />
            <Line 
            type="monotone"
              dataKey="target112" 
              stroke="#ffffff" 
            strokeWidth={2}
              strokeDasharray="3 3"
              strokeOpacity={0.6}
              dot={false}
              name="112% Target"
          />
          <Area 
            type="monotone"
              dataKey="actual" 
              fill="url(#actualGradient)" 
              stroke="#4CD964" 
              strokeWidth={3}
              dot={{ fill: '#4CD964', r: 4, strokeWidth: 0 }}
              activeDot={{ r: 6 }}
              name="Actual"
            />
            <Line 
              type="monotone"
              dataKey="projected" 
              stroke="#ffffff" 
              strokeWidth={2}
              strokeDasharray="3 3"
              strokeOpacity={0.5}
              dot={{ fill: '#ffffff', r: 3, strokeWidth: 0, fillOpacity: 0.5 }}
              activeDot={{ r: 5 }}
              name="Projected"
          />
          <Line 
            type="monotone"
              dataKey="marketingMagic" 
              stroke="#ffffff" 
              strokeWidth={2}
              strokeDasharray="5 3"
              strokeOpacity={0.5}
              dot={{ fill: '#ffffff', r: 3, strokeWidth: 1, stroke: '#000000', fillOpacity: 0.5 }}
              activeDot={{ r: 5, strokeWidth: 1 }}
              name="Marketing Forecast"
          />
        </ComposedChart>
      </ResponsiveContainer>
          </div>
    </Card>
  );
}

function RevenueMixChart({ dashboardData }: any) {
  const labourSales = dashboardData?.current_net_labor_sales || 0;
  const partsSales = (dashboardData?.current_net_sales || 0) - labourSales;
  const total = labourSales + partsSales;
  
  const labourPercent = total > 0 ? (labourSales / total) * 100 : 50;
  const partsPercent = total > 0 ? (partsSales / total) * 100 : 50;

  const chartData = [
    { name: 'Labour Sales', value: labourPercent },
    { name: 'Parts Sales', value: partsPercent },
  ];

  const COLORS = ['#4CD964', 'rgba(192, 192, 192, 0.8)'];

    return (
    <Card className="col-span-1 row-span-2">
      <CardHeader>
        <CardTitle>Revenue Mix</CardTitle>
        <CardIcon><ChartPie size={20} /></CardIcon>
      </CardHeader>
      <div className="h-[250px] flex items-center justify-center rounded-xl mt-2.5">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              fill="#8884d8"
              paddingAngle={5}
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'rgba(0, 0, 0, 0.9)', 
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '12px'
              }}
              formatter={(value: any) => `${Number(value).toFixed(1)}%`}
            />
            <Legend 
              wrapperStyle={{ paddingTop: '10px' }}
              formatter={(value: string) => <span className="text-xs text-[#E0E0E0]">{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

function AnnualNetSalesChart({ metrics, targets, selectedYear }: any) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AE', { notation: 'compact', maximumFractionDigits: 1 }).format(amount);
  };

  const formatCurrencyFull = (amount: number) => {
    return new Intl.NumberFormat('en-AE', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Calculate cumulative monthly data
  let cumulativeTarget = 0;
  let cumulativeActual = 0;
  
  // Find the last month with actual data
  const monthsWithData = Array.from({ length: 12 }, (_, i) => {
    const month = i + 1;
    const monthMetrics = metrics.filter((m: any) => {
      const date = new Date(m.metric_date);
      return date.getFullYear() === selectedYear && (date.getMonth() + 1) === month;
    });
    return monthMetrics.length > 0 ? month : null;
  }).filter(m => m !== null);
  
  const lastMonthWithData = monthsWithData.length > 0 ? Math.max(...monthsWithData) : 0;

  const monthlyData = Array.from({ length: 12 }, (_, i) => {
    const month = i + 1;
    const monthName = new Date(selectedYear, i, 1).toLocaleDateString('en-US', { month: 'short' });
    
    // Find target for this month
    const target = targets.find((t: any) => t.year === selectedYear && t.month === month);
    
    // Find latest metric for this month
    const monthMetrics = metrics
      .filter((m: any) => {
        const date = new Date(m.metric_date);
        return date.getFullYear() === selectedYear && (date.getMonth() + 1) === month;
      })
      .sort((a: any, b: any) => new Date(b.metric_date).getTime() - new Date(a.metric_date).getTime());
    
    const latestMetric = monthMetrics[0];
    
    // Accumulate targets and actuals only if we have data
    if (latestMetric || target) {
      cumulativeTarget += (target?.net_sales_target || 0);
      cumulativeActual += (latestMetric?.current_net_sales || 0);
    }
    
    return {
      month: monthName,
      monthNum: month,
      cumulativeTarget: cumulativeTarget,
      cumulativeActual: month <= lastMonthWithData && latestMetric ? cumulativeActual : null,
      cumulative112Target: cumulativeTarget * 1.12,
      hasData: !!latestMetric || !!target,
    };
  });

  // Calculate annual totals
  const annualNetSalesTarget = cumulativeTarget;
  const annualNetSalesActual = cumulativeActual;
  
  const netSalesAchievementPercent = annualNetSalesTarget > 0 ? 
    (annualNetSalesActual / annualNetSalesTarget) * 100 : 0;

  const statusText = netSalesAchievementPercent >= 100 ? 'Target Achieved' : netSalesAchievementPercent >= 85 ? 'On Pace' : 'Needs Improvement';
  const statusColor = netSalesAchievementPercent >= 100 ? '#4CD964' : netSalesAchievementPercent >= 85 ? '#4CD964' : '#FFC107';
  const statusBgColor = netSalesAchievementPercent >= 100 ? 'rgba(76, 217, 100, 0.2)' : netSalesAchievementPercent >= 85 ? 'rgba(76, 217, 100, 0.2)' : 'rgba(255, 193, 7, 0.2)';
  const statusIcon = netSalesAchievementPercent >= 100 ? '🎉' : netSalesAchievementPercent >= 85 ? '✓' : '⚠';

  return (
    <Card className="col-span-3 row-span-2" style={{ backgroundColor: '#000000' }}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-xl font-bold text-white">Annual Net Sales {selectedYear}</h3>
            <span style={{ 
              backgroundColor: statusBgColor, 
              color: statusColor, 
              padding: '4px 12px', 
              borderRadius: '6px', 
              fontSize: '12px', 
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              <span>{statusIcon}</span> {statusText}
            </span>
          </div>
          <p className="text-sm text-white/60">Year-to-date cumulative performance</p>
        </div>
      </div>
      
      <div className="h-[400px] rounded-xl relative bg-black" style={{ backgroundColor: '#000000' }}>
        {/* Legend */}
        <div className="flex items-center justify-center gap-6 mb-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-0.5 bg-white opacity-60"></div>
            <span className="text-xs text-white/60">100% Target</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-0.5 border-t-2 border-dashed border-white opacity-40"></div>
            <span className="text-xs text-white/60">112% Target</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-0.5 bg-[#4CD964]"></div>
            <span className="text-xs text-white/60">Current Sales</span>
          </div>
        </div>

        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={monthlyData} margin={{ top: 20, right: 30, left: -25, bottom: 20 }}>
            <defs>
              <linearGradient id="annualNetTargetGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ffffff" stopOpacity={0.48}/>
                <stop offset="95%" stopColor="#ffffff" stopOpacity={0.06}/>
              </linearGradient>
            </defs>
            <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#ffffff60' }} />
            <YAxis tick={{ fontSize: 10, fill: '#ffffff60' }} width={60} tickFormatter={formatCurrency} />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'rgba(0,0,0,0.9)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '8px',
                color: '#ffffff'
              }}
              formatter={(value: any, name: string) => {
                if (name === 'cumulativeTarget') return [formatCurrencyFull(value), '100% Target'];
                if (name === 'cumulativeActual') return [formatCurrencyFull(value), 'Current Sales'];
                if (name === 'cumulative112Target') return [formatCurrencyFull(value), '112% Target'];
                return [value, name];
              }}
            />
            <Line type="monotone" dataKey="cumulative112Target" stroke="#ffffff" strokeWidth={1.5} strokeDasharray="3 3" strokeOpacity={0.4} name="cumulative112Target" dot={false} />
            <Area type="monotone" dataKey="cumulativeTarget" fill="url(#annualNetTargetGradient)" stroke="#ffffff60" strokeWidth={1.5} name="cumulativeTarget" />
            <Line 
              type="monotone"
              dataKey="cumulativeActual" 
              stroke="#4CD964" 
              strokeWidth={3} 
              name="cumulativeActual" 
              dot={{ fill: '#4CD964', r: 4, strokeWidth: 0 }} 
              activeDot={{ r: 6 }} 
            />
          </ComposedChart>
        </ResponsiveContainer>
          </div>
    </Card>
  );
}

function AnnualLabourSalesChart({ metrics, targets, selectedYear }: any) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AE', { notation: 'compact', maximumFractionDigits: 1 }).format(amount);
  };

  const formatCurrencyFull = (amount: number) => {
    return new Intl.NumberFormat('en-AE', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Calculate cumulative monthly data
  let cumulativeTarget = 0;
  let cumulativeActual = 0;
  
  // Find the last month with actual data
  const monthsWithData = Array.from({ length: 12 }, (_, i) => {
    const month = i + 1;
    const monthMetrics = metrics.filter((m: any) => {
      const date = new Date(m.metric_date);
      return date.getFullYear() === selectedYear && (date.getMonth() + 1) === month;
    });
    return monthMetrics.length > 0 ? month : null;
  }).filter(m => m !== null);
  
  const lastMonthWithData = monthsWithData.length > 0 ? Math.max(...monthsWithData) : 0;

  const monthlyData = Array.from({ length: 12 }, (_, i) => {
    const month = i + 1;
    const monthName = new Date(selectedYear, i, 1).toLocaleDateString('en-US', { month: 'short' });
    
    // Find target for this month
    const target = targets.find((t: any) => t.year === selectedYear && t.month === month);
    
    // Find latest metric for this month
    const monthMetrics = metrics
      .filter((m: any) => {
        const date = new Date(m.metric_date);
        return date.getFullYear() === selectedYear && (date.getMonth() + 1) === month;
      })
      .sort((a: any, b: any) => new Date(b.metric_date).getTime() - new Date(a.metric_date).getTime());
    
    const latestMetric = monthMetrics[0];
    
    // Accumulate targets and actuals only if we have data
    if (latestMetric || target) {
      cumulativeTarget += (target?.labour_sales_target || 0);
      cumulativeActual += (latestMetric?.current_net_labor_sales || 0);
    }
    
    return {
      month: monthName,
      monthNum: month,
      cumulativeTarget: cumulativeTarget,
      cumulativeActual: month <= lastMonthWithData && latestMetric ? cumulativeActual : null,
      cumulative112Target: cumulativeTarget * 1.12,
      hasData: !!latestMetric || !!target,
    };
  });

  // Calculate annual totals
  const annualLabourTarget = cumulativeTarget;
  const annualLabourActual = cumulativeActual;
  
  const labourAchievementPercent = annualLabourTarget > 0 ? 
    (annualLabourActual / annualLabourTarget) * 100 : 0;

  const statusText = labourAchievementPercent >= 100 ? 'Target Achieved' : labourAchievementPercent >= 85 ? 'On Pace' : 'Needs Improvement';
  const statusColor = labourAchievementPercent >= 100 ? '#4CD964' : labourAchievementPercent >= 85 ? '#4CD964' : '#FFC107';
  const statusBgColor = labourAchievementPercent >= 100 ? 'rgba(76, 217, 100, 0.2)' : labourAchievementPercent >= 85 ? 'rgba(76, 217, 100, 0.2)' : 'rgba(255, 193, 7, 0.2)';
  const statusIcon = labourAchievementPercent >= 100 ? '🎉' : labourAchievementPercent >= 85 ? '✓' : '⚠';

  return (
    <Card className="col-span-3 row-span-2" style={{ backgroundColor: '#000000' }}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-xl font-bold text-white">Annual Labour Sales {selectedYear}</h3>
            <span style={{ 
              backgroundColor: statusBgColor, 
              color: statusColor, 
              padding: '4px 12px', 
              borderRadius: '6px', 
              fontSize: '12px', 
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              <span>{statusIcon}</span> {statusText}
            </span>
          </div>
          <p className="text-sm text-white/60">Year-to-date cumulative performance</p>
        </div>
      </div>
      
      <div className="h-[400px] rounded-xl relative bg-black" style={{ backgroundColor: '#000000' }}>
        {/* Legend */}
        <div className="flex items-center justify-center gap-6 mb-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-0.5 bg-white opacity-60"></div>
            <span className="text-xs text-white/60">100% Target</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-0.5 border-t-2 border-dashed border-white opacity-40"></div>
            <span className="text-xs text-white/60">112% Target</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-0.5 bg-[#4CD964]"></div>
            <span className="text-xs text-white/60">Current Labour Sales</span>
          </div>
        </div>

        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={monthlyData} margin={{ top: 20, right: 30, left: -25, bottom: 20 }}>
            <defs>
              <linearGradient id="annualLabourTargetGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ffffff" stopOpacity={0.48}/>
                <stop offset="95%" stopColor="#ffffff" stopOpacity={0.06}/>
              </linearGradient>
            </defs>
            <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#ffffff60' }} />
            <YAxis tick={{ fontSize: 10, fill: '#ffffff60' }} width={60} tickFormatter={formatCurrency} />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'rgba(0,0,0,0.9)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '8px',
                color: '#ffffff'
              }}
              formatter={(value: any, name: string) => {
                if (name === 'cumulativeTarget') return [formatCurrencyFull(value), '100% Target'];
                if (name === 'cumulativeActual') return [formatCurrencyFull(value), 'Current Labour Sales'];
                if (name === 'cumulative112Target') return [formatCurrencyFull(value), '112% Target'];
                return [value, name];
              }}
            />
            <Line type="monotone" dataKey="cumulative112Target" stroke="#ffffff" strokeWidth={1.5} strokeDasharray="3 3" strokeOpacity={0.4} name="cumulative112Target" dot={false} />
            <Area type="monotone" dataKey="cumulativeTarget" fill="url(#annualLabourTargetGradient)" stroke="#ffffff60" strokeWidth={1.5} name="cumulativeTarget" />
            <Line 
              type="monotone"
              dataKey="cumulativeActual" 
              stroke="#4CD964" 
              strokeWidth={3} 
              name="cumulativeActual" 
              dot={{ fill: '#4CD964', r: 4, strokeWidth: 0 }} 
              activeDot={{ r: 6 }} 
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
