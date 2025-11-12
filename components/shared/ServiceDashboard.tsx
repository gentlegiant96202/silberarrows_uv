"use client";
import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/components/shared/AuthProvider';
import { Calendar, TrendingUp, Target, FileText, AlertCircle, ChevronDown, Zap, Users, Search, Bell, BarChart3, Activity, Wrench, Trophy, DollarSign, CalendarDays, Percent, Receipt, ChartLine, ChartBar, PieChart as PieIcon, ChartPie, CalendarRange, BarChart4, LayoutGrid, Gauge, Phone, CheckCircle, XCircle, Award, X } from 'lucide-react';
import DirhamIcon from '@/components/ui/DirhamIcon';
import { ComposedChart, AreaChart, Line, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, ReferenceLine, ReferenceArea, CartesianGrid, PieChart, Pie, Cell } from 'recharts';
import type { DailyServiceMetrics, ServiceMonthlyTarget } from '@/types/service';

interface ServiceDashboardProps {
  metrics: DailyServiceMetrics[];
  targets: ServiceMonthlyTarget[];
  loading?: boolean;
}

interface CallLogEntry {
  id: string;
  call_date: string;
  call_time: string;
  customer_name: string;
  phone_number: string;
  reach_out_method: string;
  person_in_charge: string;
  answered_yn: string;
  action_taken: string;
  person_in_charge_2: string;
  answered_yn_2: string;
  notes: string;
}

export default function ServiceDashboard({ metrics, targets, loading = false }: ServiceDashboardProps) {
  const { user } = useAuth();
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [dashboardData, setDashboardData] = useState<DailyServiceMetrics | null>(null);
  const [monthTarget, setMonthTarget] = useState<ServiceMonthlyTarget | null>(null);
  const [monthlyInvoiceSum, setMonthlyInvoiceSum] = useState(0);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [compareWithPrevious, setCompareWithPrevious] = useState(false);
  const [previousMonthData, setPreviousMonthData] = useState<DailyServiceMetrics | null>(null);
  const [callLogs, setCallLogs] = useState<CallLogEntry[]>([]);
  const [callLogsLoading, setCallLogsLoading] = useState(false);
  const [appHeaderHeight, setAppHeaderHeight] = useState(0);

  // Add animation styles for current sales lines
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes drawLine {
        from {
          stroke-dashoffset: 2000;
        }
        to {
          stroke-dashoffset: 0;
        }
      }
      @keyframes shimmer {
        0% {
          transform: translateX(-100%);
        }
        100% {
          transform: translateX(100%);
        }
      }
      @keyframes pulse-slow {
        0%, 100% {
          opacity: 1;
        }
        50% {
          opacity: 0.8;
        }
      }
      .chart-container-current-sales svg path[stroke="#4CD964"]:not([stroke-dasharray]) {
        stroke-dasharray: 2000;
        stroke-dashoffset: 2000;
        animation: drawLine 2.5s ease-out forwards;
      }
      .chart-container-labour-sales svg path[stroke="#4CD964"]:not([stroke-dasharray]) {
        stroke-dasharray: 2000;
        stroke-dashoffset: 2000;
        animation: drawLine 2.5s ease-out forwards;
      }
      .chart-container-daily-avg svg path[stroke="#4CD964"]:not([stroke-dasharray]) {
        stroke-dasharray: 2000;
        stroke-dashoffset: 2000;
        animation: drawLine 2.5s ease-out forwards;
      }
      .chart-container-forecast svg path[stroke="#4CD964"]:not([stroke-dasharray]) {
        stroke-dasharray: 2000;
        stroke-dashoffset: 2000;
        animation: drawLine 2.5s ease-out forwards;
      }
      .animate-shimmer {
        animation: shimmer 2s infinite;
      }
      .animate-pulse-slow {
        animation: pulse-slow 2s ease-in-out infinite;
      }
      @keyframes firecracker-burst {
        0% {
          transform: translateX(0) translateY(0) scale(1);
          opacity: 1;
        }
        100% {
          transform: translateX(50px) translateY(-50px) scale(0);
          opacity: 0;
        }
      }
      @keyframes firecracker {
        0% {
          transform: translateY(0) scale(1);
          opacity: 1;
        }
        100% {
          transform: translateY(-60px) scale(0);
          opacity: 0;
        }
      }
      .animate-firecracker {
        animation: firecracker 1s ease-out infinite;
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  useLayoutEffect(() => {
    const updateAppHeaderHeight = () => {
      const globalHeader = document.querySelector('header');
      // Also check for tabs navigation in accounts module
      const tabsNav = document.querySelector('.bg-gray-900\\/50');
      
      let totalHeight = 0;
      
      if (globalHeader) {
        totalHeight += globalHeader.getBoundingClientRect().height;
      }
      
      if (tabsNav) {
        totalHeight += tabsNav.getBoundingClientRect().height + 24; // Add margin
      }
      
      setAppHeaderHeight(totalHeight);
    };

    updateAppHeaderHeight();
    window.addEventListener('resize', updateAppHeaderHeight);
    
    // Update when tabs might render
    const observer = new MutationObserver(updateAppHeaderHeight);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      window.removeEventListener('resize', updateAppHeaderHeight);
      observer.disconnect();
    };
  }, []);

  // Reset isInitialLoad when loading starts
  useEffect(() => {
    if (loading) {
      setIsInitialLoad(true);
    } else {
      // Signal that loading is complete for RouteProtector
      window.dispatchEvent(new Event('module-transition-complete'));
    }
  }, [loading]);

  // Turn off isInitialLoad after loading finishes
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

  // Fetch call logs for Service department
  useEffect(() => {
    const fetchCallLogs = async () => {
      setCallLogsLoading(true);
      try {
        const { data, error } = await supabase
          .from('call_management')
          .select('*')
          .eq('record_type', 'call_entry')
          .order('call_date', { ascending: false })
          .order('call_time', { ascending: false });

        if (error) {
          return;
        }
        setCallLogs(data || []);
      } catch (error) {
      } finally {
        setCallLogsLoading(false);
      }
    };

    fetchCallLogs();
  }, []);

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

  // Calculate monthly averages for the current year (for line chart)
  const calculateMonthlyAverages = () => {
    const currentYear = selectedYear;
    const monthlyData: { month: number; average: number }[] = [];
    
    for (let month = 1; month <= 12; month++) {
      const monthMetrics = metrics.filter(m => {
        const date = new Date(m.metric_date);
        return date.getFullYear() === currentYear && (date.getMonth() + 1) === month;
      });
      
      if (monthMetrics.length > 0) {
        const totalInvoices = monthMetrics.reduce((sum, m) => sum + (m.number_of_invoices || 0), 0);
        const totalWorkingDays = monthMetrics.reduce((sum, m) => sum + (m.working_days_elapsed || 0), 0);
        
        // Get the last day's working_days_elapsed for the month (cumulative)
        const lastMetric = monthMetrics.sort((a, b) => 
          new Date(b.metric_date).getTime() - new Date(a.metric_date).getTime()
        )[0];
        
        const workingDays = lastMetric.working_days_elapsed || 0;
        const average = workingDays > 0 ? totalInvoices / workingDays : 0;
        
        monthlyData.push({ month, average });
      }
    }
    
    return monthlyData;
  };

  const monthlyAverages = calculateMonthlyAverages();
  
  // Calculate YTD average
  const ytdAverage = monthlyAverages.length > 0
    ? monthlyAverages.reduce((sum, m) => sum + m.average, 0) / monthlyAverages.length
    : 0;

  // Calculate team contributions (from existing logic)
  const totalSales = dashboardData 
    ? (dashboardData.daniel_total_sales || 0) + (dashboardData.essrar_total_sales || 0) + (dashboardData.lucy_total_sales || 0)
    : 0;

  const danielContribution = totalSales > 0 && dashboardData ? ((dashboardData.daniel_total_sales || 0) / totalSales) * 100 : 0;
  const lucyContribution = totalSales > 0 && dashboardData ? ((dashboardData.lucy_total_sales || 0) / totalSales) * 100 : 0;
  const essrarContribution = totalSales > 0 && dashboardData ? ((dashboardData.essrar_total_sales || 0) / totalSales) * 100 : 0;

  if (loading || isInitialLoad) {
    return (
      <div className="w-full bg-gradient-to-br from-[#050505] to-[#0A0A0A] text-[#E0E0E0] p-5 pb-10">
        <div className="w-full flex flex-col gap-5">
          {/* Header Skeleton - Dark background to match other skeleton cards */}
          <div className="bg-[rgba(255,255,255,0.08)] backdrop-blur-[10px] border border-[rgba(255,255,255,0.1)] rounded-2xl pl-5 pr-6 py-5 flex items-center justify-between animate-pulse">
            <div className="h-10 w-48 bg-[rgba(255,255,255,0.1)] rounded-xl"></div>
            <div className="flex items-center gap-5">
              {/* Days Remaining Skeleton */}
              <div className="flex items-center gap-2 border-r border-[rgba(255,255,255,0.1)] pr-5">
                <div className="w-4 h-4 bg-[rgba(255,255,255,0.1)] rounded"></div>
                <div className="flex flex-col gap-1">
                  <div className="h-3 w-24 bg-[rgba(255,255,255,0.1)] rounded"></div>
                  <div className="h-4 w-16 bg-[rgba(255,255,255,0.1)] rounded"></div>
                </div>
              </div>
              {/* Date Filter Skeleton */}
              <div className="h-10 w-24 bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.1)] rounded-xl"></div>
              {/* Month Filter Skeleton */}
              <div className="h-10 w-32 bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.1)] rounded-xl"></div>
              {/* Year Filter Skeleton */}
              <div className="h-10 w-32 bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.1)] rounded-xl"></div>
            </div>
          </div>

          {/* Main Grid Skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 auto-rows-auto gap-5">
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
    <div className="w-full bg-gradient-to-br from-[#050505] to-[#0A0A0A] text-[#E0E0E0] pb-10">
      {/* Fixed Floating Header */}
      <div
        className="fixed left-0 md:left-[64px] right-0 z-40 flex flex-col md:flex-row items-start md:items-center justify-between text-[#0A0A0A] px-3 md:px-5 py-3 md:py-5 rounded-none md:rounded-2xl mx-0 md:mx-5 mb-6 gap-3 md:gap-0"
        style={{ 
          top: appHeaderHeight ? appHeaderHeight + 20 : 85,
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.18)',
          boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.5)'
        }}
      >
          {/* Left-aligned Heading */}
        <h1 className="text-xl md:text-3xl font-semibold text-white tracking-tight">
          {(() => {
            const hour = new Date().getHours();
            const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';
            const fullName = user?.user_metadata?.full_name || 
              (user?.email?.split('@')[0]?.replace(/\./g, ' ')?.replace(/\b\w/g, l => l.toUpperCase())) || 
              'User';
            const firstName = fullName.split(' ')[0];
            return `${greeting}, ${firstName}`;
          })()}
        </h1>
        
          {/* Date Filters Container */}
          <div className="flex flex-wrap items-center gap-2 md:gap-5 w-full md:w-auto">
            {/* Days Remaining */}
            {monthTarget && dashboardData && (() => {
              const workingDaysElapsed = dashboardData.working_days_elapsed || 0;
              const totalWorkingDays = monthTarget.number_of_working_days || 30;
              const daysRemaining = Math.max(0, totalWorkingDays - workingDaysElapsed);
              
              return (
                <div className="flex items-center gap-2 border-r border-white/20 pr-3 md:pr-5">
                  <CalendarDays size={14} className="text-white md:w-4 md:h-4" />
                  <div className="flex flex-col">
                    <span className="text-[10px] md:text-xs text-white/70">Days Remaining</span>
                    <span className="text-xs md:text-sm font-bold text-white">{daysRemaining} of {totalWorkingDays}</span>
        </div>
                </div>
              );
            })()}
        
            {/* Date Selector */}
            <div className="relative flex-1 md:flex-initial min-w-[120px]">
            <select
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
                className="appearance-none bg-white/10 border border-white/20 rounded-xl pl-3 md:pl-4 pr-8 md:pr-10 py-2 md:py-2.5 text-white text-xs md:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-white/40 focus:border-white/50 cursor-pointer hover:bg-white/20 transition-all disabled:opacity-50 w-full"
              disabled={availableDates.length === 0}
            >
              {availableDates.length === 0 ? (
                <option className="text-black">No data available</option>
              ) : (
                availableDates.map(date => (
                    <option key={date} value={date} className="bg-black text-white">
                      {new Date(date).toLocaleDateString('en-GB', { 
                        day: 'numeric', 
                        month: 'short',
                        year: 'numeric'
                      })}
                  </option>
                ))
              )}
            </select>
              <Calendar className="w-4 h-4 text-white/60 absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Month Selector */}
            <div className="relative flex-1 md:flex-initial min-w-[100px]">
            <select
              value={selectedMonth}
              onChange={(e) => {
                setSelectedMonth(Number(e.target.value));
                  setSelectedDate('');
                }}
                className="appearance-none bg-white/10 border border-white/20 rounded-xl pl-3 md:pl-4 pr-8 md:pr-10 py-2 text-white text-xs md:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/40 cursor-pointer hover:bg-white/20 transition-all w-full"
              >
                {[
                  { value: 1, label: 'January' }, { value: 2, label: 'February' },
                  { value: 3, label: 'March' }, { value: 4, label: 'April' },
                  { value: 5, label: 'May' }, { value: 6, label: 'June' },
                  { value: 7, label: 'July' }, { value: 8, label: 'August' },
                  { value: 9, label: 'September' }, { value: 10, label: 'October' },
                  { value: 11, label: 'November' }, { value: 12, label: 'December' }
              ].map(month => (
                  <option key={month.value} value={month.value} className="bg-black text-white">
                  {month.label}
                </option>
              ))}
            </select>
              <ChevronDown className="w-4 h-4 text-white/60 absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Year Selector */}
            <div className="relative flex-1 md:flex-initial min-w-[80px]">
            <select
              value={selectedYear}
              onChange={(e) => {
                setSelectedYear(Number(e.target.value));
                  setSelectedDate('');
              }}
                className="appearance-none bg-white/10 border border-white/20 rounded-xl pl-3 md:pl-4 pr-8 md:pr-10 py-2 text-white text-xs md:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/40 cursor-pointer hover:bg-white/20 transition-all w-full"
            >
              {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
                  <option key={year} value={year} className="bg-black text-white">{year}</option>
              ))}
            </select>
              <ChevronDown className="w-4 h-4 text-white/60 absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none" />
          </div>
          </div>
        </div>

      {/* Spacer for fixed header */}
      <div className="h-40 md:h-32"></div>

      {/* Main Content Area */}
      <div className="px-3 md:px-5 pb-5 w-full">
        <div className="w-full flex flex-col gap-5">
      {!dashboardData ? (
          <div className="bg-[rgba(255,255,255,0.08)] backdrop-blur-[10px] border border-[rgba(255,255,255,0.1)] rounded-2xl p-12 flex flex-col items-center justify-center text-center min-h-[400px]">
            <AlertCircle className="w-20 h-20 text-[rgba(255,255,255,0.4)] mb-6" />
            <h3 className="text-2xl font-semibold text-[rgba(255,255,255,0.8)] mb-3">No Data Available</h3>
            <p className="text-[rgba(255,255,255,0.5)] text-lg">Please select a different period or add data in the Data Grid tab</p>
        </div>
      ) : (
          <main className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 auto-rows-auto gap-5">
            {/* Net Sales Section Header */}
            <div className="col-span-6 flex items-center gap-3 mb-0">
              <div className="flex items-center gap-2">
                <Wrench size={20} className="text-white" />
                <h2 className="text-xl font-bold text-white uppercase tracking-wide">Net Sales Metrics</h2>
              </div>
              <div className="h-px flex-1 bg-white/20"></div>
            </div>

            {/* Net Sales Row - 4 cards */}
            <Card className="col-span-1">
              <CardHeader>
                <CardTitle>Current Net Sales</CardTitle>
                <CardIcon progress={dashboardData.current_net_sales_percentage}><Wrench size={20} /></CardIcon>
              </CardHeader>
              <CardValue>
                <DirhamIcon className="w-4 h-4 flex-shrink-0 mr-1.5" />
                  {formatCurrency(dashboardData.current_net_sales || 0)}
              </CardValue>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1 text-sm font-medium text-[#0A0A0A]">
                {dashboardData.current_net_sales_percentage >= 100 ? '↑' : '↓'} {formatPercentage(dashboardData.current_net_sales_percentage)} vs target
              </div>
                {previousMonthData && (() => {
                  const prevDate = new Date(previousMonthData.metric_date);
                  const prevDateStr = prevDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
                  const changePercent = ((dashboardData.current_net_sales - previousMonthData.current_net_sales) / previousMonthData.current_net_sales) * 100;
                  return (
                    <div className="text-xs text-[#0A0A0A]/70">
                      {changePercent >= 0 ? '↑' : '↓'}{' '}
                      {formatPercentage(Math.abs(changePercent))} vs {prevDateStr}
                    </div>
                  );
                })()}
              </div>
            </Card>

            <Card className="col-span-1">
              <CardHeader>
                <CardTitle>Est. Sales Month End</CardTitle>
                <CardIcon progress={dashboardData.estimated_net_sales_percentage}><TrendingUp size={20} /></CardIcon>
              </CardHeader>
              <CardValue>
                <DirhamIcon className="w-4 h-4 flex-shrink-0 mr-1.5" />
                  {formatCurrency(dashboardData.estimated_net_sales || 0)}
              </CardValue>
              <div className="flex items-center gap-1 text-sm font-medium text-[#0A0A0A]">
                {dashboardData.estimated_net_sales_percentage >= 100 ? '↑' : '↓'} {formatPercentage(dashboardData.estimated_net_sales_percentage)} vs target
              </div>
            </Card>

            <Card className="col-span-1">
              <CardHeader>
                <CardTitle>Daily Average</CardTitle>
                <CardIcon><CalendarDays size={20} /></CardIcon>
              </CardHeader>
              <CardValue>
                <DirhamIcon className="w-4 h-4 flex-shrink-0 mr-1.5" />
                  {formatCurrency(dashboardData.current_daily_average || 0)}
              </CardValue>
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
                  <div className="flex items-center gap-1 text-xs text-[#0A0A0A]">
                    <span>Need</span>
                    <DirhamIcon className="w-3 h-3" />
                    <span className="font-semibold">{formatCompact(dailyRateNeeded)}/day</span>
                  </div>
                ) : null;
              })()}
            </Card>

            <Card className="col-span-3">
              <div className="flex flex-col gap-2">
                {/* Daily Run Rate Required for 112% - Prominent Alert */}
                {(() => {
                  const target112 = (monthTarget?.net_sales_target || 0) * 1.12;
                  const daysRemaining = monthTarget && dashboardData ? Math.max(0, (monthTarget.number_of_working_days || 0) - (dashboardData.working_days_elapsed || 0)) : 0;
                  const currentSales = dashboardData.current_net_sales || 0;
                  const amountNeeded = Math.max(0, target112 - currentSales);
                  const dailyRunRateRequired = daysRemaining > 0 ? amountNeeded / daysRemaining : 0;
                  const isTargetAchieved = currentSales >= target112;
                  
                  return (
                    <div className={`rounded-xl p-4 border-2 shadow-lg mb-2 transition-all duration-500 ${
                      isTargetAchieved 
                        ? 'bg-gradient-to-r from-[#2A2A2A] via-[#1A1A1A] to-[#2A2A2A] border-[#FFD700] shadow-[0_0_20px_rgba(255,215,0,0.3)]' 
                        : 'bg-gradient-to-r from-[#FFA500] to-[#FF8C00] border-[#FFD700]'
                    }`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {isTargetAchieved ? (
                            <Trophy size={18} className="text-[#FFD700]" />
                          ) : (
                            <Zap size={18} className="text-white" />
                          )}
                          <span className={`text-sm font-bold uppercase tracking-wide ${
                            isTargetAchieved ? 'text-[#FFD700]' : 'text-white'
                          }`}>
                            {isTargetAchieved ? 'Target Achieved!' : 'Daily Target (112%)'}
                          </span>
                        </div>
                        {isTargetAchieved ? (
                          <CheckCircle size={16} className="text-[#FFD700]" />
                        ) : (
                          <Target size={16} className="text-white" />
                        )}
                      </div>
                      {isTargetAchieved ? (
                        <TargetAchievedBox />
                      ) : (
                        <>
                          <div className="flex items-center gap-1.5">
                            <DirhamIcon className="w-5 h-5 text-white" />
                            <span className="text-2xl font-extrabold text-white tabular-nums">
                              {formatCurrency(dailyRunRateRequired)}
                            </span>
                            <span className="text-xs text-white/80 font-medium">/day</span>
                          </div>
                          <div className="text-xs text-white/90 mt-1 font-medium">
                            {daysRemaining} days left • <DirhamIcon className="w-3 h-3 inline-block" /> {formatCurrency(amountNeeded)} to go
                          </div>
                        </>
                      )}
                    </div>
                  );
                })()}
                
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
            <div className="col-span-6 border-t-2 border-[rgba(255,255,255,0.25)] my-6"></div>

            {/* Labour Sales Section Header */}
            <div className="col-span-6 flex items-center gap-3 mb-0">
              <div className="flex items-center gap-2">
                <Wrench size={20} className="text-white" />
                <h2 className="text-xl font-bold text-white uppercase tracking-wide">Labour Sales Metrics</h2>
              </div>
              <div className="h-px flex-1 bg-white/20"></div>
            </div>

            {/* Labour Sales Row - 4 cards */}
            <Card className="col-span-1">
              <CardHeader>
                <CardTitle>Current Labour Sales</CardTitle>
                <CardIcon progress={dashboardData.current_labour_sales_percentage}><Wrench size={20} /></CardIcon>
              </CardHeader>
              <CardValue>
                <DirhamIcon className="w-4 h-4 flex-shrink-0 mr-1.5" />
                  {formatCurrency(dashboardData.current_net_labor_sales || 0)}
              </CardValue>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1 text-sm font-medium text-[#0A0A0A]">
                {dashboardData.current_labour_sales_percentage >= 100 ? '↑' : '↓'} {formatPercentage(dashboardData.current_labour_sales_percentage)} vs target
              </div>
                {previousMonthData && (() => {
                  const prevDate = new Date(previousMonthData.metric_date);
                  const prevDateStr = prevDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
                  const changePercent = ((dashboardData.current_net_labor_sales - previousMonthData.current_net_labor_sales) / previousMonthData.current_net_labor_sales) * 100;
                  return (
                    <div className="text-xs text-[#0A0A0A]">
                      {changePercent >= 0 ? '↑' : '↓'}{' '}
                      {formatPercentage(Math.abs(changePercent))} vs {prevDateStr}
                    </div>
                  );
                })()}
              </div>
            </Card>

            <Card className="col-span-1">
              <CardHeader>
                <CardTitle>Est. Labour Month End</CardTitle>
                <CardIcon progress={dashboardData.estimated_labor_sales_percentage}><TrendingUp size={20} /></CardIcon>
              </CardHeader>
              <CardValue>
                <DirhamIcon className="w-4 h-4 flex-shrink-0 mr-1.5" />
                  {formatCurrency(dashboardData.estimated_labor_sales || 0)}
              </CardValue>
              <div className="flex items-center gap-1 text-sm font-medium text-[#0A0A0A]">
                {dashboardData.estimated_labor_sales_percentage >= 100 ? '↑' : '↓'} {formatPercentage(dashboardData.estimated_labor_sales_percentage)} vs target
              </div>
            </Card>

            <Card className="col-span-1">
              <CardHeader>
                <CardTitle>Daily Average</CardTitle>
                <CardIcon><CalendarDays size={20} /></CardIcon>
              </CardHeader>
              <CardValue>
                <DirhamIcon className="w-4 h-4 flex-shrink-0 mr-1.5" />
                {formatCurrency((dashboardData.current_net_labor_sales || 0) / (dashboardData.working_days_elapsed || 1))}
              </CardValue>
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
                  <div className="flex items-center gap-1 text-xs text-[#0A0A0A]">
                    <span>Need</span>
                    <DirhamIcon className="w-3 h-3" />
                    <span className="font-semibold">{formatCompact(dailyRateNeeded)}/day</span>
                  </div>
                ) : null;
              })()}
            </Card>

            <Card className="col-span-3">
              <div className="flex flex-col gap-2">
                {/* Daily Run Rate Required for 112% - Prominent Alert */}
                {(() => {
                  const target112 = (monthTarget?.labour_sales_target || 0) * 1.12;
                  const daysRemaining = monthTarget && dashboardData ? Math.max(0, (monthTarget.number_of_working_days || 0) - (dashboardData.working_days_elapsed || 0)) : 0;
                  const currentSales = dashboardData.current_net_labor_sales || 0;
                  const amountNeeded = Math.max(0, target112 - currentSales);
                  const dailyRunRateRequired = daysRemaining > 0 ? amountNeeded / daysRemaining : 0;
                  const isTargetAchieved = currentSales >= target112;
                  
                  return (
                    <div className={`rounded-xl p-4 border-2 shadow-lg mb-2 transition-all duration-500 ${
                      isTargetAchieved 
                        ? 'bg-gradient-to-r from-[#2A2A2A] via-[#1A1A1A] to-[#2A2A2A] border-[#FFD700] shadow-[0_0_20px_rgba(255,215,0,0.3)]' 
                        : 'bg-gradient-to-r from-[#FFA500] to-[#FF8C00] border-[#FFD700]'
                    }`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {isTargetAchieved ? (
                            <Trophy size={18} className="text-[#FFD700]" />
                          ) : (
                            <Zap size={18} className="text-white" />
                          )}
                          <span className={`text-sm font-bold uppercase tracking-wide ${
                            isTargetAchieved ? 'text-[#FFD700]' : 'text-white'
                          }`}>
                            {isTargetAchieved ? 'Target Achieved!' : 'Daily Target (112%)'}
                          </span>
                        </div>
                        {isTargetAchieved ? (
                          <CheckCircle size={16} className="text-[#FFD700]" />
                        ) : (
                          <Target size={16} className="text-white" />
                        )}
                      </div>
                      {isTargetAchieved ? (
                        <TargetAchievedBox />
                      ) : (
                        <>
                          <div className="flex items-center gap-1.5">
                            <DirhamIcon className="w-5 h-5 text-white" />
                            <span className="text-2xl font-extrabold text-white tabular-nums">
                              {formatCurrency(dailyRunRateRequired)}
                            </span>
                            <span className="text-xs text-white/80 font-medium">/day</span>
                          </div>
                          <div className="text-xs text-white/90 mt-1 font-medium">
                            {daysRemaining} days left • <DirhamIcon className="w-3 h-3 inline-block" /> {formatCurrency(amountNeeded)} to go
                          </div>
                        </>
                      )}
                    </div>
                  );
                })()}
                
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
            <NetSalesProgressChart metrics={metrics} selectedYear={selectedYear} selectedMonth={selectedMonth} selectedDate={selectedDate} monthTarget={monthTarget} />
            <LabourSalesProgressChart metrics={metrics} selectedYear={selectedYear} selectedMonth={selectedMonth} selectedDate={selectedDate} monthTarget={monthTarget} />
            <TargetForecastChart metrics={metrics} selectedYear={selectedYear} selectedMonth={selectedMonth} selectedDate={selectedDate} monthTarget={monthTarget} />
            <DailyAverageChart dashboardData={dashboardData} monthTarget={monthTarget} metrics={metrics} selectedYear={selectedYear} selectedMonth={selectedMonth} selectedDate={selectedDate} />

            {/* Call Metrics Section */}
            <CallMetricsSection callLogs={callLogs} selectedYear={selectedYear} selectedMonth={selectedMonth} selectedDate={selectedDate} loading={callLogsLoading} />

            {/* Two Column Layout Container */}
            <div className="col-span-6 grid grid-cols-2 gap-5">
              {/* Left Column: Marketing & Invoice Metrics */}
              <div className="grid grid-cols-2 gap-5">
                {/* Marketing Spend % */}
            <Card className="col-span-1">
              <CardHeader>
                    <CardTitle>Marketing Spend %</CardTitle>
                <CardIcon><TrendingUp size={20} /></CardIcon>
              </CardHeader>
                  <CardValue>
                    {marketingSpendPercentage.toFixed(1)}%
                  </CardValue>
                  <div className="flex items-center gap-1 text-sm font-medium text-[#0A0A0A]">
                    Budget allocation
          </div>
                </Card>

                {/* Marketing Spend */}
                <Card className="col-span-1">
                  <CardHeader>
                    <CardTitle>Marketing Spend</CardTitle>
                    <CardIcon><TrendingUp size={20} /></CardIcon>
                  </CardHeader>
                  <CardValue>
                    <DirhamIcon className="w-4 h-4 flex-shrink-0 mr-1.5" />
                    {formatCurrency(dashboardData.current_marketing_spend || 0)}
                  </CardValue>
                  <div className="flex items-center gap-1 text-sm font-medium text-[#0A0A0A]">
                    Total spend
              </div>
            </Card>

            {/* Avg Invoice Value */}
            <Card className="col-span-1">
              <CardHeader>
                <CardTitle>Avg. Invoice Value</CardTitle>
                <CardIcon><FileText size={20} /></CardIcon>
              </CardHeader>
              <CardValue>
                    <FileText className="w-5 h-5 mr-2" />
                {formatCurrency(averageInvoiceValue)}
              </CardValue>
                  <div className="flex items-center gap-1 text-sm font-medium text-[#0A0A0A]">
                    Per transaction
                  </div>
            </Card>

              {/* Number of Invoices */}
            <Card className="col-span-1">
              <CardHeader>
                <CardTitle>Number of Invoices</CardTitle>
                    <CardIcon><FileText size={20} /></CardIcon>
              </CardHeader>
              <CardValue>
                {monthlyInvoiceSum}
              </CardValue>
                  <div className="flex items-center gap-1 text-sm font-medium text-[#0A0A0A]">
                    Total count
                  </div>
            </Card>
              </div>

              {/* Right Column: Vehicle Throughput & Revenue Mix */}
              <div className="grid grid-cols-2 gap-5">
            {/* Vehicle Throughput */}
            <Card className="col-span-1">
              <CardHeader>
                <CardTitle>Vehicle Throughput</CardTitle>
                <CardIcon><Gauge size={20} /></CardIcon>
              </CardHeader>
              <div className="flex flex-col items-center justify-center py-4">
                {/* Speedometer */}
                <div className="relative w-[200px] h-[120px]">
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
                    <path
                      d="M 20 100 A 80 80 0 0 1 73 35"
                      fill="none"
                      stroke="#FF3B30"
                      strokeWidth="20"
                      strokeLinecap="round"
                    />
                    <path
                      d="M 73 35 A 80 80 0 0 1 127 35"
                      fill="none"
                      stroke="#FFC107"
                      strokeWidth="20"
                      strokeLinecap="round"
                    />
                    <path
                      d="M 127 35 A 80 80 0 0 1 180 100"
                      fill="none"
                      stroke="#4CD964"
                      strokeWidth="20"
                      strokeLinecap="round"
                    />
                    {/* Needle */}
                    <g transform={`rotate(${-90 + ((vehicleThroughput / vehicleThroughputTarget) * 180)} 100 100)`}>
                      <line
                        x1="100"
                        y1="100"
                        x2="100"
                        y2="35"
                        stroke="#3A3A3A"
                        strokeWidth="3"
                        strokeLinecap="round"
                      />
                      <circle cx="100" cy="100" r="8" fill="#3A3A3A" />
                    </g>
                  </svg>
                </div>
                
                {/* Current Value */}
                <div className="flex flex-col items-center mt-2 mb-4">
                  <div className="text-3xl font-bold text-[#0A0A0A]">
                    {vehicleThroughput.toFixed(1)}
                  </div>
                  <div className="text-xs text-[#0A0A0A]/60">Vehicles per day</div>
                </div>

                {/* Monthly Average Line Chart with Axes */}
                {monthlyAverages.length > 0 && (
                  <div className="w-full px-6">
                    <svg viewBox="0 0 280 80" className="w-full h-[80px]">
                      {/* Chart area dimensions */}
                      {(() => {
                        const chartLeft = 20;
                        const chartRight = 275;
                        const chartTop = 5;
                        const chartBottom = 60;
                        const chartWidth = chartRight - chartLeft;
                        const chartHeight = chartBottom - chartTop;

                        return (
                          <>
                            {/* Vertical axis */}
                            <line
                              x1={chartLeft}
                              y1={chartTop}
                              x2={chartLeft}
                              y2={chartBottom}
                              stroke="rgba(0,0,0,0.2)"
                              strokeWidth="1"
                            />
                            
                            {/* Horizontal axis */}
                            <line
                              x1={chartLeft}
                              y1={chartBottom}
                              x2={chartRight}
                              y2={chartBottom}
                              stroke="rgba(0,0,0,0.2)"
                              strokeWidth="1"
                            />

                            {/* Target line at 12 */}
                            <line
                              x1={chartLeft}
                              y1={chartTop}
                              x2={chartRight}
                              y2={chartTop}
                              stroke="rgba(0,0,0,0.15)"
                              strokeWidth="1"
                              strokeDasharray="4,4"
                            />

                            {/* Y-axis label (12 target) */}
                            <text
                              x={chartLeft - 3}
                              y={chartTop + 3}
                              textAnchor="end"
                              fill="rgba(0,0,0,0.5)"
                              fontSize="9"
                              fontFamily="system-ui, -apple-system, sans-serif"
                            >
                              12
                            </text>
                            
                            {/* Y-axis label (0) */}
                            <text
                              x={chartLeft - 3}
                              y={chartBottom + 3}
                              textAnchor="end"
                              fill="rgba(0,0,0,0.5)"
                              fontSize="9"
                              fontFamily="system-ui, -apple-system, sans-serif"
                            >
                              0
                            </text>

                            {/* Month labels on X-axis */}
                            {['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'].map((month, index) => {
                              const xPos = chartLeft + (index / 11) * chartWidth;
                              return (
                                <text
                                  key={`month-${index}`}
                                  x={xPos}
                                  y={chartBottom + 12}
                                  textAnchor="middle"
                                  fill="rgba(0,0,0,0.5)"
                                  fontSize="9"
                                  fontFamily="system-ui, -apple-system, sans-serif"
                                >
                                  {month}
                                </text>
                              );
                            })}

                            {/* Data line */}
                            <polyline
                              points={monthlyAverages.map((data) => {
                                const xPos = chartLeft + ((data.month - 1) / 11) * chartWidth;
                                const yPos = chartBottom - ((data.average / vehicleThroughputTarget) * chartHeight);
                                return `${xPos},${yPos}`;
                              }).join(' ')}
                              fill="none"
                              stroke="rgba(0,0,0,0.7)"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />

                            {/* Data points */}
                            {monthlyAverages.map((data) => {
                              const xPos = chartLeft + ((data.month - 1) / 11) * chartWidth;
                              const yPos = chartBottom - ((data.average / vehicleThroughputTarget) * chartHeight);
                              return (
                                <circle
                                  key={`point-${data.month}`}
                                  cx={xPos}
                                  cy={yPos}
                                  r="3"
                                  fill="rgba(0,0,0,0.8)"
                                />
                              );
                            })}

                            {/* YTD Average text next to last point */}
                            {ytdAverage > 0 && monthlyAverages.length > 0 && (() => {
                              const lastPoint = monthlyAverages[monthlyAverages.length - 1];
                              const lastXPos = chartLeft + ((lastPoint.month - 1) / 11) * chartWidth;
                              const lastYPos = chartBottom - ((lastPoint.average / vehicleThroughputTarget) * chartHeight);
                              
                              return (
                                <text
                                  x={lastXPos + 8}
                                  y={lastYPos + 3}
                                  textAnchor="start"
                                  fill="rgba(0,0,0,0.6)"
                                  fontSize="10"
                                  fontWeight="600"
                                  fontFamily="system-ui, -apple-system, sans-serif"
                                >
                                  YTD: {ytdAverage.toFixed(1)}
                                </text>
                              );
                            })()}
                          </>
                        );
                      })()}
                    </svg>
                  </div>
                )}
              </div>
            </Card>

                {/* Revenue Mix */}
                <RevenueMixChart dashboardData={dashboardData} />
              </div>
            </div>

            {/* Team Performance */}
            <div className="col-span-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <div className="text-xl font-bold text-white mb-1">Team Performance</div>
                  <div className="text-sm text-white/70">Individual contributions and rankings</div>
                </div>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[rgba(255,255,255,0.1)] text-white">
                  <Users size={20} />
                </div>
              </div>
            <div className="grid grid-cols-3 gap-5">
                {(() => {
                  // Calculate rankings
                  const members = [
                    { name: 'Daniel', sales: dashboardData.daniel_total_sales || 0, contribution: danielContribution },
                    { name: 'Lucy', sales: dashboardData.lucy_total_sales || 0, contribution: lucyContribution },
                    { name: 'Essrar', sales: dashboardData.essrar_total_sales || 0, contribution: essrarContribution }
                  ].sort((a, b) => b.contribution - a.contribution)
                  .map((member, index) => ({ ...member, rank: index + 1 }));

                  return members.map(member => (
                <TeamMember
                      key={member.name}
                      name={member.name}
                  role="Service Advisor"
                      sales={member.sales}
                      contribution={member.contribution}
                      rank={member.rank}
                    />
                  ));
                })()}
            </div>
          </div>

            {/* Annual Charts */}
            <AnnualNetSalesChart metrics={metrics} targets={targets} selectedYear={selectedYear} selectedMonth={selectedMonth} selectedDate={selectedDate} />
            <AnnualLabourSalesChart metrics={metrics} targets={targets} selectedYear={selectedYear} selectedMonth={selectedMonth} selectedDate={selectedDate} />
          </main>
      )}
        </div>
      </div>
    </div>
  );
}

// Target Achieved Box with Confetti
function TargetAchievedBox() {
  const confettiRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const duration = 3000;
    const animationEnd = Date.now() + duration;
    const defaults = { 
      startVelocity: 30, 
      spread: 360, 
      ticks: 60, 
      zIndex: 999,
      colors: ['#FFD700', '#FFA500', '#FF8C00']
    };

    const fireConfetti = () => {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return setTimeout(fireConfetti, 3000); // Repeat every 3 seconds
      }

      const particleCount = 3;
      
      confetti({
        ...defaults,
        particleCount,
        origin: { x: 0.9, y: 0.3 }
      });

      requestAnimationFrame(fireConfetti);
    };

    fireConfetti();
  }, []);

  return (
    <div ref={confettiRef} className="relative">
      <div className="flex items-center gap-2 text-[#FFD700]">
        <span className="text-2xl font-extrabold">112% Complete</span>
      </div>
    </div>
  );
}

// Card Components
function Card({ children, className = "", style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  // If backgroundColor is provided in style (like black for charts), use solid background, otherwise use silver gradient
  const bgClass = style?.backgroundColor ? '' : 'bg-gradient-to-br from-[#C0C0C0] via-[#E8E8E8] to-[#C0C0C0]';
  return (
    <div className={`rounded-xl ${bgClass} p-5 border-2 border-[rgba(255,255,255,0.25)] shadow-[0_8px_32px_rgba(192,192,192,0.4)] transition-all duration-300 hover:shadow-[0_12px_40px_rgba(192,192,192,0.5)] hover:border-[rgba(255,255,255,0.35)] hover:scale-[1.02] ${className}`} style={style}>
      {children}
    </div>
  );
}

function CardHeader({ children }: { children: React.ReactNode }) {
  return <div className="flex justify-between items-center mb-3">{children}</div>;
}

function CardTitle({ children }: { children: React.ReactNode }) {
  return <div className="text-sm font-semibold text-[#0A0A0A] tracking-wide">{children}</div>;
}

function CardIcon({ children, progress }: { children: React.ReactNode; progress?: number }) {
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  // Cap progress at 112% for visual display, but keep color logic based on actual percentage
  const displayProgress = progress !== undefined ? Math.min(progress, 112) : undefined;
  const strokeDashoffset = displayProgress !== undefined ? circumference - (displayProgress / 112) * circumference : 0;
  
  const getProgressColor = () => {
    if (progress === undefined) return '#3A3A3A';
    if (progress >= 100) return '#4CD964';
    if (progress >= 85) return '#FFC107';
    return '#FF3B30';
  };

  return (
    <div className="relative w-10 h-10 rounded-xl flex items-center justify-center bg-[rgba(0,0,0,0.1)] text-[#0A0A0A]">
      {progress !== undefined && (
        <svg className="absolute inset-0 w-10 h-10 -rotate-90" viewBox="0 0 40 40" style={{ willChange: 'transform' }}>
          <circle
            cx="20"
            cy="20"
            r={radius}
            stroke="rgba(0,0,0,0.1)"
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
            className="transition-all duration-500 ease-out"
            style={{ willChange: 'stroke-dashoffset' }}
          />
        </svg>
      )}
      <div className="relative z-10">{children}</div>
    </div>
  );
}

function CardValue({ children }: { children: React.ReactNode }) {
  return <div className="text-2xl font-bold mb-2 text-[#0A0A0A] flex items-center tabular-nums">{children}</div>;
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
        <span className="text-sm font-semibold text-[#0A0A0A]">{label}</span>
        <div className="flex items-center gap-1">
          <DirhamIcon className="w-4 h-4 text-[#0A0A0A]" />
          <span className="text-base font-bold text-[#0A0A0A] tabular-nums">{formatCurrency(value)}</span>
            </div>
            </div>
      <div className="h-2 bg-[rgba(0,0,0,0.15)] rounded-full overflow-hidden">
        <div 
          className="h-full rounded-full transition-all duration-300 ease-out" 
          style={{ 
            width: `${Math.min(progress, 100)}%`,
            background: isAchieved 
              ? 'linear-gradient(90deg, #4CD964 0%, #34C759 100%)'
              : 'linear-gradient(90deg, #2A2A2A 0%, #4A4A4A 100%)',
            willChange: 'width'
          }}
        ></div>
      </div>
      <div className="flex justify-between items-center">
        <span className="text-xs text-[#0A0A0A]/80 font-semibold">
          {isAchieved ? 'Target Achieved! 🎉' : 'Remaining'}
        </span>
        {!isAchieved && (
          <div className="flex items-center gap-1">
            <DirhamIcon className="w-3 h-3 text-[#0A0A0A]/70" />
            <span className="text-sm font-bold text-[#0A0A0A] tabular-nums">
              {formatCurrency(remaining)}
            </span>
          </div>
        )}
      </div>
      {!isAchieved && showDailyRate && daysRemaining && daysRemaining > 0 && (
        <div className="flex items-center gap-1 text-xs text-[#FFC107] bg-[rgba(255,193,7,0.15)] px-2 py-1 rounded font-semibold">
          <span>Need</span>
          <DirhamIcon className="w-3 h-3" />
          <span className="font-bold">{formatCompact(dailyRateNeeded)}/day</span>
          <span>to hit target</span>
        </div>
      )}
    </div>
  );
}

function TeamMember({ name, role, sales, contribution, rank }: { name: string; role: string; sales: number; contribution: number; rank: number }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [receivables, setReceivables] = useState<any[]>([]);
  const [loadingReceivables, setLoadingReceivables] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [showStatementModal, setShowStatementModal] = useState(false);
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AE', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Fetch receivables data for this advisor
  useEffect(() => {
    const fetchReceivables = async () => {
      setLoadingReceivables(true);
      try {
        // Map display names to database advisor names
        const advisorNameMap: Record<string, string> = {
          'Daniel': 'DANIEL',
          'Lucy': 'LUCY',
          'Essrar': 'ESSRAR'
        };
        
        const advisorName = advisorNameMap[name] || name.toUpperCase();
        
        const response = await fetch(`/api/service/receivables?advisor=${encodeURIComponent(advisorName)}`);
        if (response.ok) {
          const data = await response.json();
          
          // Group by customer and get final balance for each
          const customerMap = new Map();
          data.receivables.forEach((record: any) => {
            const key = `${record.customer_id}-${record.customer_name}`;
            if (!customerMap.has(key)) {
              customerMap.set(key, {
                customer_id: record.customer_id,
                customer: record.customer_name,
                amount: 0,
                days: 0,
                invoiceNo: record.reference_number,
                transactions: []
              });
            }
            const customer = customerMap.get(key);
            customer.transactions.push(record);
            // Update with latest transaction details
            if (new Date(record.transaction_date) > new Date(customer.latestDate || 0)) {
              customer.amount = record.balance;
              customer.days = record.age_days;
              customer.latestDate = record.transaction_date;
            }
          });
          
          // Convert to array and filter positive balances only
          const customersArray = Array.from(customerMap.values())
            .filter(c => c.amount > 0)
            .sort((a, b) => b.days - a.days); // Sort by days (oldest first)
          
          setReceivables(customersArray);
        }
      } catch (error) {
      } finally {
        setLoadingReceivables(false);
      }
    };

    fetchReceivables();
  }, [name]);
  
  const totalPendingReceivables = receivables.reduce((sum, item) => sum + item.amount, 0);

  // Aging badge color based on days
  const getAgingColor = (days: number) => {
    if (days <= 15) return 'bg-green-500/20 text-[#0A0A0A] border-green-500/30';
    if (days <= 30) return 'bg-yellow-500/20 text-[#0A0A0A] border-yellow-500/30';
    return 'bg-red-500/20 text-[#0A0A0A] border-red-500/30';
  };

  // Ranking badge colors and icons
  const getRankBadge = () => {
    switch (rank) {
      case 1:
        return {
          bg: 'bg-gradient-to-br from-[#FFD700] to-[#FFA500]',
          text: 'text-[#0A0A0A]',
          icon: <Trophy size={16} className="text-[#0A0A0A]" />,
          label: '1st',
          borderColor: 'rgba(255, 215, 0, 0.6)',
          glowColor: '0 0 30px rgba(255, 215, 0, 0.5)'
        };
      case 2:
        return {
          bg: 'bg-gradient-to-br from-[#C0C0C0] to-[#A0A0A0]',
          text: 'text-[#0A0A0A]',
          icon: <Award size={16} className="text-[#0A0A0A]" />,
          label: '2nd',
          borderColor: 'rgba(192, 192, 192, 0.5)',
          glowColor: '0 0 20px rgba(192, 192, 192, 0.4)'
        };
      case 3:
        return {
          bg: 'bg-gradient-to-br from-[#CD7F32] to-[#B87333]',
          text: 'text-white',
          icon: <Award size={16} className="text-white" />,
          label: '3rd',
          borderColor: 'rgba(205, 127, 50, 0.5)',
          glowColor: '0 0 20px rgba(205, 127, 50, 0.4)'
        };
      default:
        return null;
    }
  };

  // Progress bar color based on contribution
  const getProgressColor = () => {
    if (contribution >= 40) return 'from-[#4CD964] to-[#34C759]';
    if (contribution >= 30) return 'from-[#FFC107] to-[#FFB300]';
    return 'from-[#FF3B30] to-[#FF2D20]';
  };

  const rankBadge = getRankBadge();
  const isLeader = rank === 1;

  return (
    <div 
      className="relative flex flex-col items-center gap-3 p-5 bg-gradient-to-br from-[#C0C0C0] via-[#E8E8E8] to-[#C0C0C0] border-2 border-[rgba(255,255,255,0.25)] rounded-xl shadow-[0_4px_20px_rgba(192,192,192,0.3)] transition-all duration-500 hover:shadow-[0_6px_24px_rgba(192,192,192,0.4)] hover:border-[rgba(255,255,255,0.35)] hover:scale-[1.02] group overflow-hidden"
    >
      {/* Ranking Badge */}
      {rankBadge && (
        <div className={`absolute top-3 right-3 flex items-center gap-1.5 ${rankBadge.bg} ${rankBadge.text} px-3 py-1.5 rounded-lg text-sm font-bold shadow-lg ${isLeader ? 'animate-pulse' : ''}`}>
          {rankBadge.icon}
          <span>{rankBadge.label}</span>
        </div>
      )}
      
      {/* Name and Role */}
      <div className="text-center mt-2">
        <div className={`text-2xl font-bold text-[#0A0A0A] mb-1`}>{name}</div>
        <div className="text-xs text-[#0A0A0A]/70 font-medium uppercase tracking-wider">{role}</div>
          </div>
      
      {/* Sales Amount - More Prominent */}
      <div className="flex items-center gap-2 mt-2">
        <DirhamIcon className="w-6 h-6 text-[#0A0A0A]" />
        <div className="text-3xl font-bold text-[#0A0A0A] tabular-nums">{formatCurrency(sales)}</div>
        </div>
      
      {/* Contribution Percentage - Animated Progress Bar */}
      <div className="w-full mt-3">
        {/* Progress bar */}
        <div className="relative h-4 bg-black/30 rounded-full overflow-hidden mb-2 shadow-inner">
          <div 
            className={`h-full bg-gradient-to-r ${getProgressColor()} transition-all duration-1000 ease-out relative overflow-hidden ${isLeader ? 'animate-pulse-slow' : ''}`}
            style={{ width: `${Math.min(contribution, 100)}%` }}
          >
            {/* Animated shimmer effect for leader */}
            {isLeader && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
            )}
        </div>
          {/* Percentage label inside bar */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs font-bold text-white drop-shadow-md">{contribution.toFixed(1)}%</span>
          </div>
        </div>
        {/* Contribution label */}
        <div className="text-center text-xs text-[#0A0A0A]/60 font-semibold uppercase tracking-wide">
          Contribution
        </div>
      </div>

      {/* Pending Receivables Summary - Always Visible */}
      <div 
        className="w-full mt-2 pt-3 border-t border-[#0A0A0A]/10 cursor-pointer"
        onClick={(e) => {
          e.stopPropagation();
          if (!showStatementModal) {
            setIsExpanded(!isExpanded);
          }
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[#0A0A0A] uppercase tracking-wide">Pending Receivables</span>
            {loadingReceivables && (
              <span className="text-[10px] font-medium text-[#0A0A0A]/40 uppercase tracking-wider animate-pulse">Loading...</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <DirhamIcon className="w-4 h-4 text-[#0A0A0A]" />
              <span className="text-lg font-bold text-[#0A0A0A]">{formatCurrency(totalPendingReceivables)}</span>
            </div>
            <ChevronDown 
              size={16} 
              className={`text-[#0A0A0A]/60 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
            />
          </div>
        </div>
      </div>

      {/* Expanded Receivables Details */}
      <div 
        className={`w-full overflow-y-auto transition-all duration-300 ${isExpanded ? 'max-h-[500px] opacity-100 mt-3' : 'max-h-0 opacity-0'}`}
      >
        <div className="space-y-2 pr-2">
          <div className="text-xs font-bold text-[#0A0A0A] uppercase tracking-wider mb-2 flex items-center gap-2">
            <div className="h-px flex-1 bg-[#0A0A0A]/10"></div>
            <span>Customer Accounts</span>
            <div className="h-px flex-1 bg-[#0A0A0A]/10"></div>
          </div>
          
          {receivables.map((item, index) => (
            <div 
              key={index}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedCustomer(item);
                setShowStatementModal(true);
              }}
              className="bg-black/5 rounded-lg p-3 border border-[#0A0A0A]/10 hover:bg-black/10 transition-all cursor-pointer hover:scale-[1.02] hover:shadow-md"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-[#0A0A0A] truncate">{item.customer}</div>
                  <div className="text-xs text-[#0A0A0A]/60 font-mono">ID: {item.customer_id}</div>
                </div>
                <div className={`text-xs px-2 py-1 rounded-md border font-semibold whitespace-nowrap ml-2 ${getAgingColor(item.days)}`}>
                  {item.days}d
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#0A0A0A]/60">Amount Due</span>
                <div className="flex items-center gap-1">
                  <DirhamIcon className="w-3 h-3 text-[#0A0A0A]" />
                  <span className="text-sm font-bold text-[#0A0A0A]">{formatCurrency(item.amount)}</span>
                </div>
              </div>
            </div>
          ))}
          
          {receivables.length === 0 && !loadingReceivables && (
            <div className="text-center py-6 text-[#0A0A0A]/40">
              <CheckCircle size={32} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm font-medium text-[#0A0A0A]">No Pending Receivables</p>
            </div>
          )}
        </div>
      </div>

      {/* Customer Statement Modal */}
      {showStatementModal && selectedCustomer && (
        <div 
          className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-2"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setShowStatementModal(false);
            setIsExpanded(false); // Also collapse the list when closing modal
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div 
            className="bg-gradient-to-br from-gray-900 via-black to-gray-800 rounded-lg border border-gray-500/30 shadow-2xl w-full h-full overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b border-gray-500/30">
              <div className="min-w-0 flex-1 pr-2">
                <h2 className="text-lg font-bold text-white truncate">{selectedCustomer.customer}</h2>
                <p className="text-xs text-gray-400 mt-0.5 truncate">ID: {selectedCustomer.customer_id} • {name}</p>
              </div>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowStatementModal(false);
                  setIsExpanded(false);
                }}
                className="text-gray-400 hover:text-white transition-colors flex-shrink-0"
              >
                <X size={20} />
              </button>
            </div>

            {/* Balance Summary */}
            <div className="px-3 py-3 bg-gradient-to-br from-gray-800/90 via-gray-700/80 to-gray-800/90 border-b border-gray-500/30">
              <div className="space-y-2">
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Final Balance</p>
                  <div className="flex items-center gap-1.5">
                    <DirhamIcon className="w-5 h-5 text-white" />
                    <span className="text-2xl font-bold text-white">{formatCurrency(selectedCustomer.amount)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-400 uppercase tracking-wider">Age:</span>
                  <div className={`text-[10px] px-2 py-1 rounded-md border font-semibold ${getAgingColor(selectedCustomer.days)}`}>
                    {selectedCustomer.days} days
                  </div>
                </div>
              </div>
            </div>

            {/* Transactions Table */}
            <div className="flex-1 overflow-y-auto p-3">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-gray-800 border-b border-gray-600">
                    <tr>
                      <th className="px-2 py-2 text-left text-gray-100 font-semibold text-[10px]">Date</th>
                      <th className="px-2 py-2 text-left text-gray-100 font-semibold text-[10px]">Reference</th>
                      <th className="px-2 py-2 text-right text-gray-100 font-semibold text-[10px]">Invoice</th>
                      <th className="px-2 py-2 text-right text-gray-100 font-semibold text-[10px]">Receipt</th>
                      <th className="px-2 py-2 text-right text-gray-100 font-semibold text-[10px]">Balance</th>
                      <th className="px-2 py-2 text-center text-gray-100 font-semibold text-[10px]">Age</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedCustomer.transactions
                      .sort((a: any, b: any) => new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime())
                      .map((transaction: any, index: number) => {
                        const isLastTransaction = index === selectedCustomer.transactions.length - 1;
                        return (
                          <tr
                            key={transaction.id}
                            className={`border-b border-gray-400/10 hover:bg-gray-300/5 transition-colors ${
                              isLastTransaction ? 'bg-blue-900/10 border-b-2 border-blue-500/30' : 'bg-black/5'
                            }`}
                          >
                            <td className="px-2 py-1.5 text-gray-300 font-mono text-[10px]">
                              {new Date(transaction.transaction_date).toLocaleDateString('en-GB')}
                            </td>
                            <td className="px-2 py-1.5 text-gray-300 font-mono text-[10px]">{transaction.reference_number}</td>
                            <td className="px-2 py-1.5 text-right text-gray-300 font-mono text-[10px]">
                              {transaction.invoice_amount > 0 ? formatCurrency(transaction.invoice_amount) : '-'}
                            </td>
                            <td className="px-2 py-1.5 text-right text-gray-300 font-mono text-[10px]">
                              {transaction.receipt_amount > 0 ? formatCurrency(transaction.receipt_amount) : '-'}
                            </td>
                            <td className={`px-2 py-1.5 text-right font-mono text-xs ${
                              isLastTransaction ? 'text-white font-bold' : 
                              transaction.balance < 0 ? 'text-green-300' : 'text-gray-300'
                            }`}>
                              {formatCurrency(transaction.balance)}
                            </td>
                            <td className="px-2 py-1.5 text-center text-gray-400 font-mono text-[10px]">{transaction.age_days}d</td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Footer */}
            <div className="px-3 py-2 border-t border-gray-500/30 flex items-center justify-end">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowStatementModal(false);
                  setIsExpanded(false);
                }}
                className="px-3 py-1.5 text-sm bg-gradient-to-r from-gray-700 via-gray-600 to-gray-700 hover:from-gray-600 hover:via-gray-500 hover:to-gray-600 text-white rounded-md shadow-lg border border-gray-500/30 transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
          </div>
  );
}

// Call Metrics Section Component
function CallMetricsSection({ callLogs, selectedYear, selectedMonth, selectedDate, loading }: { callLogs: CallLogEntry[], selectedYear: number, selectedMonth: number, selectedDate: string, loading: boolean }) {
  // Filter call logs based on selected filters (NO staff filter - show ALL service calls)
  const filteredCalls = callLogs.filter(call => {
    if (!call.call_date) return false;
    
    // Use Date object for more reliable date comparisons
    const callDate = new Date(call.call_date);
    
    // Check if date is valid
    if (isNaN(callDate.getTime())) {
      return false;
    }
    
    const callYear = callDate.getFullYear();
    const callMonth = callDate.getMonth() + 1; // getMonth() returns 0-11, need 1-12
    
    // Filter by year and month
    if (callYear !== selectedYear || callMonth !== selectedMonth) {
      return false;
    }
    
    // Filter by selected date if provided (only show calls up to selected date)
    if (selectedDate) {
      const selectedDateObj = new Date(selectedDate);
      if (!isNaN(selectedDateObj.getTime())) {
        // Compare just the dates (ignore time)
        const callDateOnly = new Date(callDate.getFullYear(), callDate.getMonth(), callDate.getDate());
        const selectedDateOnly = new Date(selectedDateObj.getFullYear(), selectedDateObj.getMonth(), selectedDateObj.getDate());
        
        if (callDateOnly > selectedDateOnly) {
          return false;
        }
      }
    }
    
    // Show ALL calls (no staff filtering)
    return true;
  });

  // Debug: Log filtering results
  // Calculate metrics
  const totalCalls = filteredCalls.length;
  const answeredCalls = filteredCalls.filter(call => 
    call.answered_yn === 'Yes' || call.answered_yn_2 === 'Yes'
  ).length;
  const missedCalls = totalCalls - answeredCalls;
  const answerRate = totalCalls > 0 ? (answeredCalls / totalCalls) * 100 : 0;
  
  // Calculate calls by staff member (count all unique staff)
  const callsByStaff: { [key: string]: number } = {};
  filteredCalls.forEach(call => {
    if (call.person_in_charge) {
      callsByStaff[call.person_in_charge] = (callsByStaff[call.person_in_charge] || 0) + 1;
    }
    if (call.person_in_charge_2) {
      callsByStaff[call.person_in_charge_2] = (callsByStaff[call.person_in_charge_2] || 0) + 1;
    }
  });
  
  const topPerformer = Object.entries(callsByStaff).length > 0 
    ? Object.entries(callsByStaff).reduce((a, b) => a[1] > b[1] ? a : b)
    : ['N/A', 0];

  if (loading) {
    return (
      <div className="col-span-6 grid grid-cols-4 gap-5 animate-pulse">
        <div className="h-32 bg-[rgba(255,255,255,0.08)] rounded-lg"></div>
        <div className="h-32 bg-[rgba(255,255,255,0.08)] rounded-lg"></div>
        <div className="h-32 bg-[rgba(255,255,255,0.08)] rounded-lg"></div>
        <div className="h-32 bg-[rgba(255,255,255,0.08)] rounded-lg"></div>
      </div>
    );
  }

  // Calculate average calls per day (based on days that have calls)
  const uniqueDays = new Set(filteredCalls.map(call => call.call_date)).size;
  const avgCallsPerDay = uniqueDays > 0 ? totalCalls / uniqueDays : 0;

  return (
    <div className="col-span-6 grid grid-cols-4 gap-5">
      {/* Total Calls */}
      <Card className="col-span-1">
        <CardHeader>
          <CardTitle>Total Calls</CardTitle>
          <CardIcon><Phone size={20} /></CardIcon>
        </CardHeader>
        <CardValue>
          {totalCalls}
        </CardValue>
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1 text-sm font-medium text-[#0A0A0A]">
            {avgCallsPerDay.toFixed(1)} avg/day
          </div>
        </div>
      </Card>

      {/* Answered Calls */}
      <Card className="col-span-1">
        <CardHeader>
          <CardTitle>Answered Calls</CardTitle>
          <CardIcon><CheckCircle size={20} /></CardIcon>
        </CardHeader>
        <CardValue>
          {answeredCalls}
        </CardValue>
        <div className="flex items-center gap-1 text-sm font-medium text-[#0A0A0A]">
          {answerRate.toFixed(1)}% answer rate
        </div>
      </Card>

      {/* Missed Calls */}
      <Card className="col-span-1">
        <CardHeader>
          <CardTitle>Missed Calls</CardTitle>
          <CardIcon><XCircle size={20} /></CardIcon>
        </CardHeader>
        <CardValue>
          {missedCalls}
        </CardValue>
        <div className="flex items-center gap-1 text-sm font-medium text-[#0A0A0A]">
          {((100 - answerRate)).toFixed(1)}% missed
        </div>
      </Card>

      {/* Top Performer */}
      <Card className="col-span-1">
        <CardHeader>
          <CardTitle>Top Performer</CardTitle>
          <CardIcon><Award size={20} /></CardIcon>
        </CardHeader>
        <CardValue>
          {topPerformer[0] || 'N/A'}
        </CardValue>
        <div className="flex items-center gap-1 text-sm font-medium text-[#0A0A0A]">
          {topPerformer[1]} calls handled
        </div>
      </Card>
          </div>
  );
}

// Chart Components
function NetSalesProgressChart({ metrics, selectedYear, selectedMonth, selectedDate, monthTarget }: any) {
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
      if (selectedDate) {
        // If a specific date is selected, only show data up to that date
        return date.getFullYear() === selectedYear && 
               (date.getMonth() + 1) === selectedMonth &&
               m.metric_date <= selectedDate;
      }
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
      const dayData = chartData.find((d: any) => d.day === label);
      const currentSales = payload.find((p: any) => p.dataKey === 'currentNetSales')?.value || 0;
      const target100 = payload.find((p: any) => p.dataKey === 'cumulativeTarget')?.value || 0;
      const target112 = payload.find((p: any) => p.dataKey === 'target112')?.value || 0;
      const vsTarget100 = target100 > 0 ? ((currentSales / target100) * 100).toFixed(1) : '0.0';
      const vsTarget112 = target112 > 0 ? ((currentSales / target112) * 100).toFixed(1) : '0.0';
      
    return (
        <div className="bg-[rgba(0,0,0,0.95)] border-2 border-[rgba(255,255,255,0.3)] rounded-xl p-4 shadow-xl backdrop-blur-sm">
          <p className="text-white font-bold text-sm mb-3 pb-2 border-b border-white/20">Working Day {label}</p>
          <div className="space-y-2">
            {payload.map((entry: any, index: number) => {
              return (
                <div key={index} className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded" 
                      style={{ backgroundColor: entry.color || '#ffffff' }}
                    ></div>
                    <span className="text-xs text-white/80 font-medium">{entry.name}:</span>
          </div>
                  <div className="flex items-center gap-1">
                    <DirhamIcon className="w-3 h-3 text-white/60" />
                    <span className="text-sm font-bold text-white tabular-nums">
                      {entry.value ? formatCurrencyFull(Number(entry.value)) : 'N/A'}
                    </span>
                  </div>
                </div>
              );
            })}
            {currentSales > 0 && (
              <div className="mt-3 pt-2 border-t border-white/20 space-y-1">
                <div className="text-xs text-white/70">Performance:</div>
                <div className="text-xs text-white/90">
                  <span className="font-semibold">{vsTarget100}%</span> vs 100% target
                </div>
                <div className="text-xs text-white/90">
                  <span className="font-semibold">{vsTarget112}%</span> vs 112% target
                </div>
              </div>
            )}
          </div>
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
  const statusBgColor = currentPercentage >= 100 ? 'rgba(76, 217, 100, 0.15)' : currentPercentage >= 85 ? 'rgba(76, 217, 100, 0.15)' : 'rgba(255, 193, 7, 0.15)';
  const statusIcon = currentPercentage >= 100 ? '🎉' : currentPercentage >= 85 ? '✓' : '⚠';
  const statusBorderColor = currentPercentage >= 100 ? 'rgba(76, 217, 100, 0.4)' : currentPercentage >= 85 ? 'rgba(76, 217, 100, 0.4)' : 'rgba(255, 193, 7, 0.4)';

  return (
    <Card className="col-span-3 row-span-2" style={{ backgroundColor: '#000000' }}>
      <div className="flex items-start justify-between mb-5">
        <div>
          <div className="flex items-center gap-4 mb-3">
            <h3 className="text-2xl font-bold text-white">Net Sales Progress</h3>
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg border-2" style={{ 
              backgroundColor: statusBgColor, 
              borderColor: statusBorderColor,
              color: statusColor
            }}>
              <span className="text-lg">{statusIcon}</span>
              <span className="text-sm font-bold">{statusText}</span>
              <span className="text-xs font-semibold opacity-80 ml-1">({currentPercentage.toFixed(1)}%)</span>
          </div>
          </div>
          <p className="text-sm text-white/70">Cumulative sales progress vs targets</p>
        </div>
      </div>
      
      <div className="h-[400px] rounded-xl relative bg-black -ml-5 pl-5 chart-container-current-sales" style={{ backgroundColor: '#000000' }}>
        {/* Enhanced Legend */}
        <div className="flex items-center justify-center gap-6 mb-4 px-4 py-2 bg-[rgba(255,255,255,0.05)] rounded-lg backdrop-blur-sm">
          <div className="flex items-center gap-2 hover:bg-[rgba(255,255,255,0.1)] px-3 py-1 rounded transition-colors">
            <div className="w-10 h-1 bg-white opacity-70"></div>
            <span className="text-xs text-white/90 font-medium">100% Target</span>
          </div>
          <div className="flex items-center gap-2 hover:bg-[rgba(255,255,255,0.1)] px-3 py-1 rounded transition-colors">
            <div className="w-10 h-1 border-t-2 border-dashed border-white opacity-50"></div>
            <span className="text-xs text-white/90 font-medium">112% Target</span>
          </div>
          <div className="flex items-center gap-2 hover:bg-[rgba(255,255,255,0.1)] px-3 py-1 rounded transition-colors">
            <div className="w-10 h-1 bg-[#4CD964]"></div>
            <span className="text-xs text-white/90 font-medium">Current Sales</span>
          </div>
        </div>

        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: -20, bottom: 40 }}>
            <defs>
              <linearGradient id="targetGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ffffff" stopOpacity={0.6}/>
                <stop offset="95%" stopColor="#ffffff" stopOpacity={0.1}/>
              </linearGradient>
              <linearGradient id="currentSalesGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#4CD964" stopOpacity={0.7}/>
                <stop offset="95%" stopColor="#4CD964" stopOpacity={0.1}/>
              </linearGradient>
            </defs>
            <XAxis 
              dataKey="day" 
              tick={{ fontSize: 11, fill: '#ffffff80', fontWeight: 500 }} 
              axisLine={{ stroke: '#ffffff20' }}
              tickLine={{ stroke: '#ffffff20' }}
              tickMargin={8}
            />
            <YAxis 
              tick={{ fontSize: 11, fill: '#ffffff80', fontWeight: 500 }} 
              width={70} 
              tickFormatter={formatCurrencyCompact}
              axisLine={{ stroke: '#ffffff20' }}
              tickLine={{ stroke: '#ffffff20' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
            <Line type="monotone" dataKey="target112" stroke="#ffffff" strokeWidth={1.5} strokeDasharray="3 3" strokeOpacity={0.4} name="target112" dot={false} />
            <Area type="monotone" dataKey="cumulativeTarget" fill="url(#targetGradient)" stroke="#ffffff80" strokeWidth={2} name="cumulativeTarget" connectNulls={true} />
            <Line 
            type="monotone"
            dataKey="currentNetSales" 
              stroke="#4CD964" 
              strokeWidth={3} 
              name="currentNetSales" 
              dot={{ fill: '#4CD964', r: 4, strokeWidth: 0 }} 
              activeDot={{ r: 6, fill: '#4CD964', stroke: '#ffffff', strokeWidth: 2 }} 
              connectNulls={false} 
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
    </Card>
  );
}

function LabourSalesProgressChart({ metrics, selectedYear, selectedMonth, selectedDate, monthTarget }: any) {
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
      if (selectedDate) {
        // If a specific date is selected, only show data up to that date
        return date.getFullYear() === selectedYear && 
               (date.getMonth() + 1) === selectedMonth &&
               m.metric_date <= selectedDate;
      }
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
      const currentSales = payload.find((p: any) => p.dataKey === 'currentLabourSales')?.value || 0;
      const target100 = payload.find((p: any) => p.dataKey === 'cumulativeTarget')?.value || 0;
      const target112 = payload.find((p: any) => p.dataKey === 'target112')?.value || 0;
      const vsTarget100 = target100 > 0 ? ((currentSales / target100) * 100).toFixed(1) : '0.0';
      const vsTarget112 = target112 > 0 ? ((currentSales / target112) * 100).toFixed(1) : '0.0';
      
    return (
        <div className="bg-[rgba(0,0,0,0.95)] border-2 border-[rgba(255,255,255,0.3)] rounded-xl p-4 shadow-xl backdrop-blur-sm">
          <p className="text-white font-bold text-sm mb-3 pb-2 border-b border-white/20">Working Day {label}</p>
          <div className="space-y-2">
            {payload.map((entry: any, index: number) => {
              return (
                <div key={index} className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded" 
                      style={{ backgroundColor: entry.color || '#ffffff' }}
                    ></div>
                    <span className="text-xs text-white/80 font-medium">{entry.name}:</span>
          </div>
                  <div className="flex items-center gap-1">
                    <DirhamIcon className="w-3 h-3 text-white/60" />
                    <span className="text-sm font-bold text-white tabular-nums">
                      {entry.value ? formatCurrencyFull(Number(entry.value)) : 'N/A'}
                    </span>
                  </div>
                </div>
              );
            })}
            {currentSales > 0 && (
              <div className="mt-3 pt-2 border-t border-white/20 space-y-1">
                <div className="text-xs text-white/70">Performance:</div>
                <div className="text-xs text-white/90">
                  <span className="font-semibold">{vsTarget100}%</span> vs 100% target
                </div>
                <div className="text-xs text-white/90">
                  <span className="font-semibold">{vsTarget112}%</span> vs 112% target
                </div>
              </div>
            )}
          </div>
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
  const statusBgColor = currentPercentage >= 100 ? 'rgba(76, 217, 100, 0.15)' : currentPercentage >= 85 ? 'rgba(76, 217, 100, 0.15)' : 'rgba(255, 193, 7, 0.15)';
  const statusIcon = currentPercentage >= 100 ? '🎉' : currentPercentage >= 85 ? '✓' : '⚠';
  const statusBorderColor = currentPercentage >= 100 ? 'rgba(76, 217, 100, 0.4)' : currentPercentage >= 85 ? 'rgba(76, 217, 100, 0.4)' : 'rgba(255, 193, 7, 0.4)';

  return (
    <Card className="col-span-3 row-span-2" style={{ backgroundColor: '#000000' }}>
      <div className="flex items-start justify-between mb-5">
        <div>
          <div className="flex items-center gap-4 mb-3">
            <h3 className="text-2xl font-bold text-white">Labour Sales Progress</h3>
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg border-2" style={{ 
              backgroundColor: statusBgColor, 
              borderColor: statusBorderColor,
              color: statusColor
            }}>
              <span className="text-lg">{statusIcon}</span>
              <span className="text-sm font-bold">{statusText}</span>
              <span className="text-xs font-semibold opacity-80 ml-1">({currentPercentage.toFixed(1)}%)</span>
          </div>
          </div>
          <p className="text-sm text-white/70">Cumulative labour sales progress vs targets</p>
        </div>
      </div>
      
      <div className="h-[400px] rounded-xl relative bg-black -ml-5 pl-5 chart-container-labour-sales" style={{ backgroundColor: '#000000' }}>
        {/* Enhanced Legend */}
        <div className="flex items-center justify-center gap-6 mb-4 px-4 py-2 bg-[rgba(255,255,255,0.05)] rounded-lg backdrop-blur-sm">
          <div className="flex items-center gap-2 hover:bg-[rgba(255,255,255,0.1)] px-3 py-1 rounded transition-colors">
            <div className="w-10 h-1 bg-white opacity-70"></div>
            <span className="text-xs text-white/90 font-medium">100% Target</span>
          </div>
          <div className="flex items-center gap-2 hover:bg-[rgba(255,255,255,0.1)] px-3 py-1 rounded transition-colors">
            <div className="w-10 h-1 border-t-2 border-dashed border-white opacity-50"></div>
            <span className="text-xs text-white/90 font-medium">112% Target</span>
          </div>
          <div className="flex items-center gap-2 hover:bg-[rgba(255,255,255,0.1)] px-3 py-1 rounded transition-colors">
            <div className="w-10 h-1 bg-[#4CD964]"></div>
            <span className="text-xs text-white/90 font-medium">Current Labour Sales</span>
          </div>
        </div>

        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: -20, bottom: 40 }}>
            <defs>
              <linearGradient id="labourTargetGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ffffff" stopOpacity={0.6}/>
                <stop offset="95%" stopColor="#ffffff" stopOpacity={0.1}/>
              </linearGradient>
              <linearGradient id="currentLabourGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#4CD964" stopOpacity={0.7}/>
                <stop offset="95%" stopColor="#4CD964" stopOpacity={0.1}/>
              </linearGradient>
            </defs>
            <XAxis 
              dataKey="day" 
              tick={{ fontSize: 11, fill: '#ffffff80', fontWeight: 500 }} 
              axisLine={{ stroke: '#ffffff20' }}
              tickLine={{ stroke: '#ffffff20' }}
              tickMargin={8}
            />
            <YAxis 
              tick={{ fontSize: 11, fill: '#ffffff80', fontWeight: 500 }} 
              width={70} 
              tickFormatter={formatCurrencyCompact}
              axisLine={{ stroke: '#ffffff20' }}
              tickLine={{ stroke: '#ffffff20' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
            <Line type="monotone" dataKey="target112" stroke="#ffffff" strokeWidth={1.5} strokeDasharray="3 3" strokeOpacity={0.4} name="target112" dot={false} />
            <Area type="monotone" dataKey="cumulativeTarget" fill="url(#labourTargetGradient)" stroke="#ffffff80" strokeWidth={2} name="cumulativeTarget" connectNulls={true} />
          <Line 
            type="monotone"
            dataKey="currentLabourSales" 
              stroke="#4CD964" 
              strokeWidth={3} 
              name="currentLabourSales" 
              dot={{ fill: '#4CD964', r: 4, strokeWidth: 0 }} 
              activeDot={{ r: 6, fill: '#4CD964', stroke: '#ffffff', strokeWidth: 2 }} 
              connectNulls={false} 
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
    </Card>
  );
}

function DailyAverageChart({ dashboardData, monthTarget, metrics, selectedYear, selectedMonth, selectedDate }: any) {
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
      if (selectedDate) {
        // If a specific date is selected, only show data up to that date
        return date.getFullYear() === selectedYear && 
               (date.getMonth() + 1) === selectedMonth &&
               m.metric_date <= selectedDate;
      }
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
  
  // Fix status calculation: if it's the last day and target is achieved, show success
  // Otherwise calculate performance based on daily average
  let performance = 0;
  let statusText = 'Needs Improvement';
  let statusColor = '#FF3B30';
  
  if (remainingDays <= 0 || requiredFor112 <= 0) {
    // Last day or no remaining days - check if target achieved
    if (currentSales >= target112) {
      performance = 100;
      statusText = 'Target Achieved';
      statusColor = '#4CD964';
    } else if (currentSales >= monthTarget?.net_sales_target) {
      performance = 95;
      statusText = 'On Track';
      statusColor = '#4CD964';
    }
  } else {
    // Calculate performance based on daily average vs required
    performance = requiredFor112 > 0 ? (currentDailyAverage / requiredFor112) * 100 : 0;
    statusText = performance >= 100 ? 'On Track' : 'Needs Improvement';
    statusColor = performance >= 100 ? '#4CD964' : performance >= 85 ? '#FFC107' : '#FF3B30';
  }

  const statusBgColor = statusColor === '#4CD964' ? 'rgba(76, 217, 100, 0.15)' : statusColor === '#FFC107' ? 'rgba(255, 193, 7, 0.15)' : 'rgba(255, 59, 48, 0.15)';
  const statusBorderColor = statusColor === '#4CD964' ? 'rgba(76, 217, 100, 0.4)' : statusColor === '#FFC107' ? 'rgba(255, 193, 7, 0.4)' : 'rgba(255, 59, 48, 0.4)';
  const statusIcon = performance >= 100 ? '✓' : '⚠';

  // Find the last calendar day with actual data
  const lastDayWithData = monthMetrics.length > 0 
    ? Math.max(...monthMetrics.map((m: any) => new Date(m.metric_date).getDate()))
    : currentDay;
  
  // Use working days as the chart range (not calendar days)
  const daysInMonth = workingDays;

  // Create chart data array for all working days, but only populate elapsed days
  const chartData = Array.from({ length: workingDays }, (_, i) => {
    const workingDay = i + 1;

    // Only populate data for elapsed working days
    if (workingDay > currentDay) {
      return {
        day: workingDay.toString(),
        currentAvg: null,
        requiredDailyAverage: null,
        performance: null,
        displayDay: workingDay,
      };
    }

    // Find the metric for this working day number (not calendar day)
    const metric = monthMetrics.find((m: any) => m.working_days_elapsed === workingDay);

    // Get all metrics up to this working day
    const metricsUpToDay = monthMetrics.filter((m: any) => m.working_days_elapsed <= workingDay);
    const latestMetricUpToDay = metricsUpToDay[metricsUpToDay.length - 1];

    let dailyAvg = null;
    let currentSalesForDay = 0;
    let requiredDailyAverage = null;
    let performanceForDay = null;

    if (latestMetricUpToDay) {
      dailyAvg = latestMetricUpToDay.current_daily_average;
      currentSalesForDay = latestMetricUpToDay.current_net_sales;

      // Calculate required daily average based on THIS working day's context
      // This value should be fixed for this day - it shows what was needed from this day forward
      const salesUpToThisDay = currentSalesForDay;
      const targetAtDay = target112;
      const daysElapsedAtThisDay = workingDay;
      const remainingDaysFromThisDay = workingDays - daysElapsedAtThisDay;
      
      // Required average = (remaining target from this day) / (remaining days from this day)
      requiredDailyAverage = remainingDaysFromThisDay > 0 
        ? Math.round((targetAtDay - salesUpToThisDay) / remainingDaysFromThisDay) 
        : 0;

      performanceForDay = dailyAvg && requiredDailyAverage > 0 ? (dailyAvg / requiredDailyAverage) * 100 : null;
    }

    return {
      day: workingDay.toString(),
      currentAvg: dailyAvg,
      requiredDailyAverage: requiredDailyAverage,
      performance: performanceForDay,
      displayDay: workingDay,
    };
  });

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const dayData = chartData[parseInt(label) - 1];
      if (dayData && dayData.currentAvg !== null) {
        const requiredColor = dayData.requiredDailyAverage && dayData.requiredDailyAverage > dayData.currentAvg ? '#FF3B30' : '#4CD964';
        const performanceColor = dayData.performance && dayData.performance >= 100 ? '#4CD964' : dayData.performance && dayData.performance >= 85 ? '#FFC107' : '#FF3B30';
    return (
          <div className="bg-[rgba(0,0,0,0.95)] border-2 border-[rgba(255,255,255,0.3)] rounded-xl p-4 shadow-xl backdrop-blur-sm min-w-[220px]">
            <p className="text-white font-bold text-sm mb-3 pb-2 border-b border-white/20">Working Day {label}</p>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-4">
                <span className="text-xs text-white/80 font-medium" style={{ color: requiredColor }}>Required Avg:</span>
                <div className="flex items-center gap-1">
                  <DirhamIcon className="w-3 h-3 text-white/60" />
                  <span className="text-sm font-bold text-white tabular-nums" style={{ color: requiredColor }}>
                    {dayData.requiredDailyAverage !== null ? formatCurrencyFull(Math.round(dayData.requiredDailyAverage)) : 'N/A'}
                  </span>
          </div>
          </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-xs text-white/80 font-medium">Current Avg:</span>
                <div className="flex items-center gap-1">
                  <DirhamIcon className="w-3 h-3 text-white/60" />
                  <span className="text-sm font-bold text-white tabular-nums">{formatCurrencyFull(Math.round(dayData.currentAvg))}</span>
                </div>
              </div>
              <div className="mt-3 pt-2 border-t border-white/20">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-xs text-white/70">Performance:</span>
                  <span className="text-sm font-bold" style={{ color: performanceColor }}>
                    {dayData.performance !== null ? dayData.performance.toFixed(1) : '0.0'}%
                  </span>
                </div>
              </div>
        </div>
      </div>
    );
      }
    }
    return null;
  };

  return (
    <Card className="col-span-3 row-span-2" style={{ backgroundColor: '#000000' }}>
      <div className="flex items-start justify-between mb-5">
        <div>
          <div className="flex items-center gap-4 mb-3">
            <h3 className="text-2xl font-bold text-white">Net Sales Daily Average</h3>
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg border-2" style={{ 
              backgroundColor: statusBgColor, 
              borderColor: statusBorderColor,
              color: statusColor
            }}>
              <span className="text-lg">{statusIcon}</span>
              <span className="text-sm font-bold">{statusText}</span>
              <span className="text-xs font-semibold opacity-80 ml-1">({performance.toFixed(1)}%)</span>
          </div>
        </div>
          <p className="text-sm text-white/70 mb-3">Daily average performance and required daily average</p>
        </div>
      </div>
      
      <div className="h-[400px] rounded-xl relative bg-black -ml-5 pl-5 chart-container-daily-avg" style={{ backgroundColor: '#000000' }}>
        {/* Enhanced Legend */}
        <div className="flex items-center justify-center gap-6 mb-4 px-4 py-2 bg-[rgba(255,255,255,0.05)] rounded-lg backdrop-blur-sm">
          <div className="flex items-center gap-2 hover:bg-[rgba(255,255,255,0.1)] px-3 py-1 rounded transition-colors">
            <div className="w-10 h-1 bg-[#FF3B30]"></div>
            <span className="text-xs text-white/90 font-medium">Required Daily Avg (112%)</span>
          </div>
          <div className="flex items-center gap-2 hover:bg-[rgba(255,255,255,0.1)] px-3 py-1 rounded transition-colors">
            <div className="w-10 h-1 bg-[#4CD964]"></div>
            <span className="text-xs text-white/90 font-medium">Current Daily Avg</span>
          </div>
      </div>
      
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: -20, bottom: 40 }}>
            <defs>
              <linearGradient id="currentAvgGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#4CD964" stopOpacity={0.7}/>
                <stop offset="95%" stopColor="#4CD964" stopOpacity={0.1}/>
              </linearGradient>
              <linearGradient id="requiredAvgGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#FF3B30" stopOpacity={0.7}/>
                <stop offset="95%" stopColor="#FF3B30" stopOpacity={0.1}/>
              </linearGradient>
            </defs>
            <XAxis 
              dataKey="day" 
              tick={{ fontSize: 11, fill: '#ffffff80', fontWeight: 500 }} 
              axisLine={{ stroke: '#ffffff20' }}
              tickLine={{ stroke: '#ffffff20' }}
              tickMargin={8}
            />
            <YAxis 
              tick={{ fontSize: 11, fill: '#ffffff80', fontWeight: 500 }} 
              width={70} 
              tickFormatter={formatCurrencyCompact}
              axisLine={{ stroke: '#ffffff20' }}
              tickLine={{ stroke: '#ffffff20' }}
            />
          <Tooltip content={<CustomTooltip />} />
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
            <Line 
              type="monotone" 
              dataKey="requiredDailyAverage" 
              stroke="#FF3B30" 
              strokeWidth={2.5} 
              name="requiredDailyAverage" 
              dot={{ fill: '#FF3B30', r: 3, strokeWidth: 0 }} 
              activeDot={{ r: 5, fill: '#FF3B30', stroke: '#ffffff', strokeWidth: 2 }} 
              connectNulls={false} 
            />
            <Line 
            type="monotone"
            dataKey="currentAvg" 
              stroke="#4CD964" 
              strokeWidth={3} 
              name="currentAvg" 
              dot={{ fill: '#4CD964', r: 4, strokeWidth: 0 }} 
              activeDot={{ r: 6, fill: '#4CD964', stroke: '#ffffff', strokeWidth: 2 }} 
              connectNulls={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
    </Card>
  );
}

function TargetForecastChart({ metrics, selectedYear, selectedMonth, selectedDate, monthTarget }: any) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AE', { notation: 'compact' }).format(amount);
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
      if (selectedDate) {
        // If a specific date is selected, only show data up to that date
        return date.getFullYear() === selectedYear && 
               (date.getMonth() + 1) === selectedMonth &&
               m.metric_date <= selectedDate;
      }
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
  const statusBgColor = currentPercentage >= 100 ? 'rgba(76, 217, 100, 0.15)' : currentPercentage >= 85 ? 'rgba(76, 217, 100, 0.15)' : 'rgba(255, 193, 7, 0.15)';
  const statusIcon = currentPercentage >= 100 ? '🎉' : currentPercentage >= 85 ? '✓' : '⚠';
  const statusBorderColor = currentPercentage >= 100 ? 'rgba(76, 217, 100, 0.4)' : currentPercentage >= 85 ? 'rgba(76, 217, 100, 0.4)' : 'rgba(255, 193, 7, 0.4)';

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[rgba(0,0,0,0.95)] border-2 border-[rgba(255,255,255,0.3)] rounded-xl p-4 shadow-xl backdrop-blur-sm">
          <p className="text-white font-bold text-sm mb-3 pb-2 border-b border-white/20">Working Day {label}</p>
          <div className="space-y-2">
            {payload.map((entry: any, index: number) => {
              return (
                <div key={index} className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded" 
                      style={{ backgroundColor: entry.color || '#ffffff' }}
                    ></div>
                    <span className="text-xs text-white/80 font-medium">{entry.name}:</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <DirhamIcon className="w-3 h-3 text-white/60" />
                    <span className="text-sm font-bold text-white tabular-nums">
                      {entry.value ? formatCurrencyFull(Number(entry.value)) : 'N/A'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="col-span-3 row-span-2" style={{ backgroundColor: '#000000' }}>
      <div className="flex items-start justify-between mb-5">
        <div>
          <div className="flex items-center gap-4 mb-3">
            <h3 className="text-2xl font-bold text-white">Target Achievement Forecast</h3>
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg border-2" style={{ 
              backgroundColor: statusBgColor, 
              borderColor: statusBorderColor,
              color: statusColor
            }}>
              <span className="text-lg">{statusIcon}</span>
              <span className="text-sm font-bold">{statusText}</span>
              <span className="text-xs font-semibold opacity-80 ml-1">({currentPercentage.toFixed(1)}%)</span>
          </div>
          </div>
          <p className="text-sm text-white/70">Weekly progress and month-end forecast</p>
        </div>
      </div>
      
      <div className="h-[400px] rounded-xl relative bg-black -ml-5 pl-5 chart-container-forecast" style={{ backgroundColor: '#000000' }}>
        {/* Enhanced Legend */}
        <div className="flex items-center justify-center gap-4 mb-4 px-4 py-2 bg-[rgba(255,255,255,0.05)] rounded-lg backdrop-blur-sm flex-wrap">
          <div className="flex items-center gap-2 hover:bg-[rgba(255,255,255,0.1)] px-3 py-1 rounded transition-colors">
            <div className="w-10 h-1 bg-white opacity-50"></div>
            <span className="text-xs text-white/90 font-medium">100% Target</span>
          </div>
          <div className="flex items-center gap-2 hover:bg-[rgba(255,255,255,0.1)] px-3 py-1 rounded transition-colors">
            <div className="w-10 h-1 bg-white opacity-70"></div>
            <span className="text-xs text-white/90 font-medium">112% Target</span>
          </div>
          <div className="flex items-center gap-2 hover:bg-[rgba(255,255,255,0.1)] px-3 py-1 rounded transition-colors">
            <div className="w-10 h-1 bg-[#4CD964]"></div>
            <span className="text-xs text-white/90 font-medium">Actual</span>
          </div>
          <div className="flex items-center gap-2 hover:bg-[rgba(255,255,255,0.1)] px-3 py-1 rounded transition-colors">
            <div className="w-2 h-2 rounded-full bg-white"></div>
            <span className="text-xs text-white/90 font-medium">Projected</span>
          </div>
          <div className="flex items-center gap-2 hover:bg-[rgba(255,255,255,0.1)] px-3 py-1 rounded transition-colors">
            <div className="w-2 h-2 bg-white" style={{ clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' }}></div>
            <span className="text-xs text-white/90 font-medium">Marketing Forecast</span>
          </div>
        </div>

        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: -20, bottom: 40 }}>
            <defs>
              <linearGradient id="actualGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#4CD964" stopOpacity={0.6}/>
                <stop offset="95%" stopColor="#4CD964" stopOpacity={0.1}/>
              </linearGradient>
            </defs>
            <XAxis 
              dataKey="day" 
              tick={{ fontSize: 11, fill: '#ffffff80', fontWeight: 500 }} 
              axisLine={{ stroke: '#ffffff20' }}
              tickLine={{ stroke: '#ffffff20' }}
              tickMargin={8}
            />
            <YAxis 
              tick={{ fontSize: 11, fill: '#ffffff80', fontWeight: 500 }} 
              width={70} 
              tickFormatter={formatCurrency}
              axisLine={{ stroke: '#ffffff20' }}
              tickLine={{ stroke: '#ffffff20' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
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
              activeDot={{ r: 6, fill: '#4CD964', stroke: '#ffffff', strokeWidth: 2 }}
              name="Actual"
            />
            <Line 
              type="monotone"
              dataKey="projected" 
              stroke="#ffffff" 
              strokeWidth={2}
              strokeDasharray="5 5"
              strokeOpacity={0.5}
              dot={{ fill: '#ffffff', r: 3, strokeWidth: 0 }}
              activeDot={{ r: 5, fill: '#ffffff', stroke: '#4CD964', strokeWidth: 2 }}
              name="Projected"
          />
          <Line 
            type="monotone"
              dataKey="marketingMagic" 
              stroke="#FFC107" 
              strokeWidth={2.5}
              strokeDasharray="2 2"
              dot={{ fill: '#FFC107', r: 3, strokeWidth: 0 }}
              activeDot={{ r: 5, fill: '#FFC107', stroke: '#ffffff', strokeWidth: 2 }}
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

  const COLORS = ['#4CD964', '#3A3A3A'];

    return (
    <Card className="col-span-1">
      <CardHeader>
        <CardTitle>Revenue Mix</CardTitle>
        <CardIcon><ChartPie size={20} /></CardIcon>
      </CardHeader>
      <div className="h-[250px] flex items-center justify-center rounded-xl mt-2.5 relative">
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
                borderRadius: '12px',
                color: '#ffffff'
              }}
              labelStyle={{ color: '#ffffff' }}
              itemStyle={{ color: '#ffffff' }}
              formatter={(value: any) => [`${Number(value).toFixed(1)}%`, '']}
            />
            <Legend 
              wrapperStyle={{ paddingTop: '10px' }}
              formatter={(value: string) => <span className="text-xs text-[#0A0A0A]">{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
        {/* Center text showing labour sales percentage */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center" style={{ marginTop: '-20px' }}>
          <div className="text-3xl font-bold text-[#0A0A0A] tabular-nums">{labourPercent.toFixed(1)}%</div>
          <div className="text-xs text-[#0A0A0A]/60">Labour</div>
        </div>
      </div>
    </Card>
  );
}

function AnnualNetSalesChart({ metrics, targets, selectedYear, selectedMonth, selectedDate }: any) {
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
  
  // Find the last month with actual data, respecting the selected date
  const monthsWithData = Array.from({ length: 12 }, (_, i) => {
    const month = i + 1;
    // If we have a selected date and this month is after the selected month, skip it
    if (selectedDate && month > selectedMonth) {
      return null;
    }
    const monthMetrics = metrics.filter((m: any) => {
      const date = new Date(m.metric_date);
      // If this is the selected month, only include data up to the selected date
      if (selectedDate && month === selectedMonth) {
        return date.getFullYear() === selectedYear && 
               (date.getMonth() + 1) === month &&
               m.metric_date <= selectedDate;
      }
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
    
    // Find latest metric for this month, respecting the selected date
    const monthMetrics = metrics
      .filter((m: any) => {
        const date = new Date(m.metric_date);
        // If this is the selected month, only include data up to the selected date
        if (selectedDate && month === selectedMonth) {
          return date.getFullYear() === selectedYear && 
                 (date.getMonth() + 1) === month &&
                 m.metric_date <= selectedDate;
        }
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
      
      <div className="h-[400px] rounded-xl relative bg-black -ml-5 pl-5" style={{ backgroundColor: '#000000' }}>
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
          <ComposedChart data={monthlyData} margin={{ top: 20, right: 30, left: -20, bottom: 40 }}>
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

function AnnualLabourSalesChart({ metrics, targets, selectedYear, selectedMonth, selectedDate }: any) {
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
  
  // Find the last month with actual data, respecting the selected date
  const monthsWithData = Array.from({ length: 12 }, (_, i) => {
    const month = i + 1;
    // If we have a selected date and this month is after the selected month, skip it
    if (selectedDate && month > selectedMonth) {
      return null;
    }
    const monthMetrics = metrics.filter((m: any) => {
      const date = new Date(m.metric_date);
      // If this is the selected month, only include data up to the selected date
      if (selectedDate && month === selectedMonth) {
        return date.getFullYear() === selectedYear && 
               (date.getMonth() + 1) === month &&
               m.metric_date <= selectedDate;
      }
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
    
    // Find latest metric for this month, respecting the selected date
    const monthMetrics = metrics
      .filter((m: any) => {
        const date = new Date(m.metric_date);
        // If this is the selected month, only include data up to the selected date
        if (selectedDate && month === selectedMonth) {
          return date.getFullYear() === selectedYear && 
                 (date.getMonth() + 1) === month &&
                 m.metric_date <= selectedDate;
        }
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
      
      <div className="h-[400px] rounded-xl relative bg-black -ml-5 pl-5" style={{ backgroundColor: '#000000' }}>
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
          <ComposedChart data={monthlyData} margin={{ top: 20, right: 30, left: -20, bottom: 40 }}>
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
