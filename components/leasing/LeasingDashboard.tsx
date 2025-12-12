"use client";
import React, { useState, useEffect } from 'react';
import { Area, Line, ComposedChart, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import DirhamIcon from '@/components/ui/DirhamIcon';

interface LeasingDashboardProps {
  metrics: any[];
  targets: any[];
  loading?: boolean;
  className?: string;
  leasingYear?: number;
  leasingMonth?: number;
}

export default function LeasingDashboard({ 
  metrics, 
  targets, 
  loading = false, 
  className = "",
  leasingYear = new Date().getFullYear(),
  leasingMonth = new Date().getMonth() + 1
}: LeasingDashboardProps) {

  if (loading) {
    return (
      <div className={`mb-6 p-4 backdrop-blur-md bg-gradient-to-r from-white/10 via-white/5 to-white/10 border border-white/20 rounded-lg flex items-center space-x-3 shadow-lg ${className}`}>
        <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/20 border-t-white"></div>
        <span className="text-white">Loading leasing data...</span>
      </div>
    );
  }

  return (
    <main className={`text-white text-sm ${className}`}>
      
      {/* Top row: Leasing KPI Cards */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Left column */}
        <LeasingKPICards 
          metrics={metrics} 
          targets={targets}
          selectedYear={leasingYear}
          selectedMonth={leasingMonth}
        />

        {/* Right column */}
        <LeasingPerformanceCards 
          metrics={metrics} 
          targets={targets}
          selectedYear={leasingYear}
          selectedMonth={leasingMonth}
        />
      </div>

      {/* Charts Section Row 1 */}
      <div className="grid gap-4 mt-4 lg:grid-cols-2">
        {/* Daily Progress Chart */}
        <div className="lg:col-span-1">
          <DailyCumulativeProgressChart 
            metrics={metrics} 
            targets={targets}
            selectedYear={leasingYear}
            selectedMonth={leasingMonth}
          />
        </div>

        {/* Yearly Progress Chart */}
        <div className="lg:col-span-1">
          <CumulativeYearlyTargetChart 
            metrics={metrics} 
            targets={targets}
            selectedYear={leasingYear}
          />
        </div>
      </div>

      {/* Charts Section Row 2 - Full Width Additional Revenue */}
      <div className="mt-4">
        <AdditionalRevenueChart 
          metrics={metrics}
          selectedYear={leasingYear}
        />
      </div>
    </main>
  );
}

/* ---------------- Leasing KPI Cards ---------------- */
const LeasingKPICards: React.FC<{metrics: any[], targets?: any[], selectedYear: number, selectedMonth: number}> = ({ metrics, targets = [], selectedYear, selectedMonth }) => {
  const [kpi, setKpi] = useState({
    totalNetSales: 0,
    aClassSales: 0,
    othersSales: 0,
    totalTarget: 0,
    aClassTarget: 0,
    othersTarget: 0,
    invoiceCount: 0,
    // Additional Revenue
    excessMileage: 0,
    trafficFines: 0,
    salik: 0,
    totalAdditionalRevenue: 0,
    // Days to Target
    workingDaysElapsed: 0,
    totalWorkingDays: 0,
    remainingDays: 0,
    requiredDailyAverage: 0,
    // Trend (vs last month)
    lastMonthSales: 0,
    trendPercentage: 0,
    trendDirection: 'up' as 'up' | 'down' | 'same'
  });

  useEffect(() => {
    if (metrics.length > 0 && targets.length > 0) {
      // Find current month's data
      const selectedMetric = metrics.find(m => {
        const metricDate = new Date(m.metric_date);
        return metricDate.getFullYear() === selectedYear && 
               metricDate.getMonth() + 1 === selectedMonth;
      });
      
      const selectedMonthTarget = targets.find(t => 
        t.year === selectedYear && t.month === selectedMonth
      );
      
      // Find last month's data for trend - compare at the same working day
      let lastMonth = selectedMonth - 1;
      let lastYear = selectedYear;
      if (lastMonth === 0) {
        lastMonth = 12;
        lastYear = selectedYear - 1;
      }
      
      const currentWorkingDay = selectedMetric?.working_days_elapsed || 0;
      
      // Find last month's metric at the SAME working day for fair comparison
      const lastMonthMetric = metrics.find(m => {
        const metricDate = new Date(m.metric_date);
        return metricDate.getFullYear() === lastYear && 
               metricDate.getMonth() + 1 === lastMonth &&
               m.working_days_elapsed === currentWorkingDay;
      });
      
      const currentSales = selectedMetric?.total_net_sales || 0;
      // Compare to last month at the same working day (not full month)
      const lastSalesAtSameDay = lastMonthMetric?.total_net_sales || 0;
      const trendPct = lastSalesAtSameDay > 0 ? ((currentSales - lastSalesAtSameDay) / lastSalesAtSameDay) * 100 : 0;
      
      // Calculate remaining days and required average
      const totalWorkingDays = selectedMonthTarget?.number_of_working_days || 25;
      const workingDaysElapsed = selectedMetric?.working_days_elapsed || 0;
      const remainingDays = Math.max(0, totalWorkingDays - workingDaysElapsed);
      const remainingSales = Math.max(0, (selectedMonthTarget?.total_target || 0) - currentSales);
      const requiredDailyAvg = remainingDays > 0 ? remainingSales / remainingDays : 0;
      
      // Additional revenue
      const excessMileage = selectedMetric?.excess_mileage || 0;
      const trafficFines = selectedMetric?.traffic_fines || 0;
      const salik = selectedMetric?.salik || 0;
      
      setKpi({
        totalNetSales: currentSales,
        aClassSales: selectedMetric?.current_a_class_sales || 0,
        othersSales: selectedMetric?.current_others_sales || 0,
        totalTarget: selectedMonthTarget?.total_target || 0,
        aClassTarget: selectedMonthTarget?.a_class_sales_target || 0,
        othersTarget: selectedMonthTarget?.others_sales_target || 0,
        invoiceCount: selectedMetric?.number_of_invoices || 0,
        excessMileage,
        trafficFines,
        salik,
        totalAdditionalRevenue: excessMileage + trafficFines + salik,
        workingDaysElapsed,
        totalWorkingDays,
        remainingDays,
        requiredDailyAverage: requiredDailyAvg,
        lastMonthSales: lastSalesAtSameDay,
        trendPercentage: Math.abs(trendPct),
        trendDirection: trendPct > 0 ? 'up' : trendPct < 0 ? 'down' : 'same'
      });
    }
  }, [metrics, targets, selectedYear, selectedMonth]);

  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat('en-AE', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 grid-cols-2">
        {/* Total Net Sales with Trend Indicator */}
        <div className="rounded-lg bg-gradient-to-br from-white/10 to-white/5 backdrop-blur p-3 border border-white/10 shadow-inner">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/60">Total Net Sales</p>
              <div className="flex items-center gap-2">
                <DirhamIcon className="w-5 h-5 text-white/80" />
                <p className="text-xl font-semibold text-white">{formatCurrency(kpi.totalNetSales)}</p>
              </div>
              {/* Trend Indicator - comparing at same working day */}
              <div className="flex items-center gap-1 mt-1">
                {kpi.trendDirection === 'up' && kpi.lastMonthSales > 0 && (
                  <span className="text-green-400 text-xs flex items-center gap-0.5">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                    </svg>
                    {kpi.trendPercentage.toFixed(1)}% vs day {kpi.workingDaysElapsed} last month
                  </span>
                )}
                {kpi.trendDirection === 'down' && kpi.lastMonthSales > 0 && (
                  <span className="text-red-400 text-xs flex items-center gap-0.5">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </svg>
                    {kpi.trendPercentage.toFixed(1)}% vs day {kpi.workingDaysElapsed} last month
                  </span>
                )}
                {kpi.trendDirection === 'same' && kpi.lastMonthSales > 0 && (
                  <span className="text-white/40 text-xs">No change vs day {kpi.workingDaysElapsed} last month</span>
                )}
                {kpi.lastMonthSales === 0 && (
                  <span className="text-white/40 text-xs">No data for day {kpi.workingDaysElapsed} last month</span>
                )}
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-white/60">Invoices</p>
              <p className="text-lg font-semibold text-white">{kpi.invoiceCount}</p>
              <p className="text-xs text-white/40">This month</p>
            </div>
          </div>
        </div>

        {/* Monthly Target */}
        <div className="rounded-lg bg-gradient-to-br from-white/10 to-white/5 backdrop-blur p-3 border border-white/10 shadow-inner">
          <p className="text-sm text-white/60">Monthly Target</p>
          <div className="flex items-center gap-2">
            <DirhamIcon className="w-5 h-5 text-white/80" />
            <p className="text-xl font-semibold text-white">{formatCurrency(kpi.totalTarget)}</p>
          </div>
          <p className="text-xs text-white/40">Current month goal</p>
        </div>

        {/* Days to Target */}
        <div className="rounded-lg bg-gradient-to-br from-white/10 to-white/5 backdrop-blur p-3 border border-white/10 shadow-inner">
          <p className="text-sm text-white/60">Days to Target</p>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xl font-semibold text-white">{kpi.remainingDays} <span className="text-sm font-normal text-white/60">days left</span></p>
            </div>
            <div className="text-right">
              <p className="text-xs text-white/60">Need daily avg</p>
              <div className="flex items-center gap-1 justify-end">
                <DirhamIcon className="w-3 h-3 text-white/80" />
                <p className="text-sm font-semibold text-white">{formatCurrency(kpi.requiredDailyAverage)}</p>
              </div>
            </div>
          </div>
          <div className="mt-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-white/60 to-white/40 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, (kpi.workingDaysElapsed / kpi.totalWorkingDays) * 100)}%` }}
            />
          </div>
          <p className="text-xs text-white/40 mt-1">{kpi.workingDaysElapsed} of {kpi.totalWorkingDays} working days elapsed</p>
        </div>

        {/* Additional Revenue */}
        <div className="rounded-lg bg-gradient-to-br from-white/10 to-white/5 backdrop-blur p-3 border border-white/10 shadow-inner">
          <p className="text-sm text-white/60">Additional Revenue</p>
          <div className="flex items-center gap-2">
            <DirhamIcon className="w-5 h-5 text-white/80" />
            <p className="text-xl font-semibold text-white">{formatCurrency(kpi.totalAdditionalRevenue)}</p>
          </div>
          <div className="flex gap-2 mt-1 text-xs text-white/50">
            <span>Mileage: {formatCurrency(kpi.excessMileage)}</span>
            <span>•</span>
            <span>Fines: {formatCurrency(kpi.trafficFines)}</span>
            <span>•</span>
            <span>Salik: {formatCurrency(kpi.salik)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ---------------- Leasing Performance Cards ---------------- */
const LeasingPerformanceCards: React.FC<{metrics: any[], targets: any[], selectedYear: number, selectedMonth: number}> = ({ metrics, targets, selectedYear, selectedMonth }) => {
  const [performance, setPerformance] = useState({
    targetAchievement: 0,
    aClassAchievement: 0,
    othersAchievement: 0,
    dailyAverage: 0,
    estimatedSales: 0,
    estimatedPercentage: 0,
    excessMileage: 0,
    trafficFines: 0,
    salik: 0,
    // Pace status
    paceStatus: 'on_track' as 'ahead' | 'on_track' | 'behind',
    expectedProgress: 0,
    actualProgress: 0,
    // Revenue mix
    aClassSales: 0,
    othersSales: 0,
    totalSales: 0
  });

  useEffect(() => {
    if (metrics.length > 0 && targets.length > 0) {
      const selectedMetric = metrics.find(m => {
        const metricDate = new Date(m.metric_date);
        return metricDate.getFullYear() === selectedYear && 
               metricDate.getMonth() + 1 === selectedMonth;
      });
      
      const selectedMonthTarget = targets.find(t => 
        t.year === selectedYear && t.month === selectedMonth
      );
      
      // Calculate pace status
      const workingDaysElapsed = selectedMetric?.working_days_elapsed || 0;
      const totalWorkingDays = selectedMonthTarget?.number_of_working_days || 25;
      const totalTarget = selectedMonthTarget?.total_target || 0;
      const currentSales = selectedMetric?.total_net_sales || 0;
      
      const expectedProgress = totalWorkingDays > 0 ? (workingDaysElapsed / totalWorkingDays) * totalTarget : 0;
      const progressDiff = currentSales - expectedProgress;
      const progressRatio = expectedProgress > 0 ? (currentSales / expectedProgress) : 1;
      
      let paceStatus: 'ahead' | 'on_track' | 'behind' = 'on_track';
      if (progressRatio >= 1.05) paceStatus = 'ahead';
      else if (progressRatio < 0.9) paceStatus = 'behind';
      
      const aClassSales = selectedMetric?.current_a_class_sales || 0;
      const othersSales = selectedMetric?.current_others_sales || 0;
      
      setPerformance({
        targetAchievement: selectedMetric?.current_net_sales_percentage || 0,
        aClassAchievement: selectedMetric?.a_class_net_sales_percentage || 0,
        othersAchievement: selectedMetric?.others_net_sales_percentage || 0,
        dailyAverage: selectedMetric?.total_daily_average || 0,
        estimatedSales: selectedMetric?.estimated_net_sales || 0,
        estimatedPercentage: selectedMetric?.estimated_net_sales_percentage || 0,
        excessMileage: selectedMetric?.excess_mileage || 0,
        trafficFines: selectedMetric?.traffic_fines || 0,
        salik: selectedMetric?.salik || 0,
        paceStatus,
        expectedProgress,
        actualProgress: currentSales,
        aClassSales,
        othersSales,
        totalSales: aClassSales + othersSales
      });
    }
  }, [metrics, targets, selectedYear, selectedMonth]);

  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat('en-AE', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);

  // Pace status - monochrome with indicators
  const paceConfig = {
    ahead: { label: 'Ahead of Pace', indicator: '●' },
    on_track: { label: 'On Track', indicator: '●' },
    behind: { label: 'Behind Pace', indicator: '●' }
  };

  const currentPace = paceConfig[performance.paceStatus];

  // Calculate A CLASS vs OTHERS percentages
  const aClassPct = performance.totalSales > 0 ? (performance.aClassSales / performance.totalSales) * 100 : 0;
  const othersPct = performance.totalSales > 0 ? (performance.othersSales / performance.totalSales) * 100 : 0;

  return (
    <div className="grid gap-3 grid-cols-2">
      {/* Pace Status Card */}
      <div className="rounded-lg bg-gradient-to-br from-white/10 to-white/5 backdrop-blur p-3 border border-white/10 shadow-inner">
        <div className="flex items-center gap-2">
          <span className={`text-sm ${performance.paceStatus === 'ahead' ? 'text-white' : performance.paceStatus === 'behind' ? 'text-white/50' : 'text-white/70'}`}>
            {currentPace.indicator}
          </span>
          <p className="text-sm text-white/60">{currentPace.label}</p>
        </div>
        <p className="text-xl font-semibold text-white mt-1">{performance.targetAchievement.toFixed(1)}%</p>
        <p className="text-xs text-white/40">of target achieved</p>
      </div>

      {/* Daily Average */}
      <div className="rounded-lg bg-gradient-to-br from-white/10 to-white/5 backdrop-blur p-3 border border-white/10 shadow-inner">
        <p className="text-sm text-white/60">Daily Average</p>
        <div className="flex items-center gap-2">
          <DirhamIcon className="w-5 h-5 text-white/80" />
          <p className="text-xl font-semibold text-white">{formatCurrency(performance.dailyAverage)}</p>
        </div>
        <p className="text-xs text-white/40">Per working day</p>
      </div>

      {/* A CLASS vs OTHERS Split */}
      <div className="rounded-lg bg-gradient-to-br from-white/10 to-white/5 backdrop-blur p-3 border border-white/10 shadow-inner">
        <p className="text-sm text-white/60">Revenue Split</p>
        <div className="flex items-center gap-2 mt-2">
          <div className="flex-1 h-3 bg-white/5 rounded-full overflow-hidden flex">
            <div 
              className="h-full bg-gradient-to-r from-white/70 to-white/50 transition-all duration-500"
              style={{ width: `${aClassPct}%` }}
            />
            <div 
              className="h-full bg-gradient-to-r from-white/30 to-white/20 transition-all duration-500"
              style={{ width: `${othersPct}%` }}
            />
          </div>
        </div>
        <div className="flex justify-between mt-1 text-xs">
          <span className="text-white/70">A CLASS {aClassPct.toFixed(0)}%</span>
          <span className="text-white/50">OTHERS {othersPct.toFixed(0)}%</span>
        </div>
      </div>

      {/* Estimated Sales */}
      <div className="rounded-lg bg-gradient-to-br from-white/10 to-white/5 backdrop-blur p-3 border border-white/10 shadow-inner">
        <p className="text-sm text-white/60">Estimated End of Month</p>
        <div className="flex items-center gap-2">
          <DirhamIcon className="w-5 h-5 text-white/80" />
          <p className="text-xl font-semibold text-white">{formatCurrency(performance.estimatedSales)}</p>
        </div>
        <p className="text-xs text-white/40">{performance.estimatedPercentage.toFixed(1)}% of target</p>
      </div>
    </div>
  );
};

/* ---------------- Daily Cumulative Progress Chart with Projections ---------------- */
const DailyCumulativeProgressChart: React.FC<{metrics: any[], targets: any[], selectedYear: number, selectedMonth: number}> = ({ metrics, targets, selectedYear, selectedMonth }) => {
  const [chartData, setChartData] = useState<any[]>([]);
  const [animatedData, setAnimatedData] = useState<any[]>([]);

  // Animation effect for step-by-step line drawing
  useEffect(() => {
    if (chartData.length > 0) {
      setAnimatedData(chartData.map(item => ({ ...item, actual: null, estimatedProjection: null })));
      
      const animationInterval = setInterval(() => {
        setAnimatedData(prevData => {
          const nextIndex = prevData.findIndex(item => item.actual === null && chartData[prevData.indexOf(item)]?.actual !== null);
          if (nextIndex !== -1 && nextIndex < chartData.length) {
            return prevData.map((item, index) => 
              index === nextIndex 
                ? { ...item, actual: chartData[index].actual }
                : item
            );
          } else {
            // Animation complete, show projections
            clearInterval(animationInterval);
            // Show all projection data
            return chartData;
          }
        });
      }, 300);

      return () => clearInterval(animationInterval);
    }
  }, [chartData]);

  useEffect(() => {
    if (metrics.length > 0 && targets.length > 0) {
      const currentYear = selectedYear;
      const currentMonth = selectedMonth;
      
      const monthlyTarget = targets.find(t => t.year === currentYear && t.month === currentMonth);
      if (!monthlyTarget) return;

      const workingDays = monthlyTarget.number_of_working_days || 25;
      const monthlyTargetAmount = monthlyTarget.total_target || 0;
      
      const dailyTargetPace = monthlyTargetAmount / workingDays;
      
      const monthlyMetrics = metrics
        .filter(m => {
          const metricDate = new Date(m.metric_date);
          return metricDate.getFullYear() === currentYear && 
                 metricDate.getMonth() + 1 === currentMonth;
        })
        .sort((a, b) => new Date(a.metric_date).getTime() - new Date(b.metric_date).getTime());
      
      // Find the latest metric to get current values
      const latestMetric = monthlyMetrics[monthlyMetrics.length - 1];
      const currentDayElapsed = latestMetric?.working_days_elapsed || 0;
      const currentActual = latestMetric?.total_net_sales || 0;
      const dailyAverage = latestMetric?.total_daily_average || 0;
      const estimatedEndOfMonth = latestMetric?.estimated_net_sales || 0;
      
      // Calculate required daily pace to hit target from current point
      const remainingDays = workingDays - currentDayElapsed;
      const remainingToTarget = monthlyTargetAmount - currentActual;
      const requiredDailyPace = remainingDays > 0 ? remainingToTarget / remainingDays : 0;
      
      const data = [];
      
      for (let day = 1; day <= workingDays; day++) {
        const cumulativeTargetPace = dailyTargetPace * day;
        
        const dayEntry = monthlyMetrics.find(m => m.working_days_elapsed === day);
        const actualValue = dayEntry?.total_net_sales;
        const isCurrentDay = dayEntry && day === currentDayElapsed;
        
        // Estimated projection (dotted line from current day to end of month)
        let estimatedProjection = null;
        let requiredPaceProjection = null;
        
        if (day >= currentDayElapsed && currentDayElapsed > 0) {
          const daysFromCurrent = day - currentDayElapsed;
          estimatedProjection = currentActual + (dailyAverage * daysFromCurrent);
          requiredPaceProjection = currentActual + (requiredDailyPace * daysFromCurrent);
        }
        
        data.push({
          day: `Day ${day}`,
          dayNumber: day,
          targetPace: Math.round(cumulativeTargetPace),
          actual: actualValue !== null && actualValue !== undefined ? Math.round(actualValue) : null,
          estimatedProjection: day >= currentDayElapsed ? Math.round(estimatedProjection || 0) : null,
          requiredPace: day >= currentDayElapsed ? Math.round(requiredPaceProjection || 0) : null,
          isCurrentDay,
          isFuture: day > currentDayElapsed
        });
      }
      
      setChartData(data);
    }
  }, [metrics, targets, selectedYear, selectedMonth]);

  return (
    <div className="rounded-lg bg-black/70 backdrop-blur p-4 border border-white/10">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-white/80">Target Pace vs Monthly Progress</h2>
        <div className="flex flex-wrap items-center gap-4 text-xs text-white/50">
          <div className="flex items-center gap-1">
            <div className="w-3 h-0.5 bg-white/60"></div>
            <span>Target</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-0.5 bg-white"></div>
            <span>Actual</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-0.5 bg-white/40 border-dashed"></div>
            <span>Estimated</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-0.5 bg-white/30 border-dashed"></div>
            <span>Required</span>
          </div>
        </div>
      </div>

      <div className="h-80">
        {chartData.length === 0 ? (
          <div className="flex items-center justify-center h-full text-white/50">Loading...</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={animatedData} margin={{ top: 20, right: 30, left: -10, bottom: 20 }}>
            <defs>
              <linearGradient id="leasingMonthlyTargetGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ffffff" stopOpacity={0.4}/>
                <stop offset="95%" stopColor="#ffffff" stopOpacity={0.02}/>
              </linearGradient>
            </defs>
            
            <XAxis 
              dataKey="dayNumber" 
              tick={{ fontSize: 10, fill: '#ffffff60' }}
              tickFormatter={(value: number) => `D${value}`}
            />
            <YAxis 
              tick={{ fontSize: 10, fill: '#ffffff60' }}
              tickFormatter={(value: number) => `${(value / 1000).toFixed(0)}K`}
              width={45}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'rgba(0,0,0,0.95)', 
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '8px',
                color: '#ffffff',
                fontSize: '12px'
              }}
              labelFormatter={(label: string | number) => `Working Day ${label}`}
              formatter={(value: any, name: string) => {
                const labels: Record<string, string> = {
                  targetPace: 'Target Pace',
                  actual: 'Actual Progress',
                  estimatedProjection: 'Estimated End',
                  requiredPace: 'Required Pace'
                };
                return [value ? value.toLocaleString() : '-', labels[name] || name];
              }}
            />
            
            {/* Target Area */}
            <Area
              type="monotone"
              dataKey="targetPace"
              stroke="#ffffff50"
              strokeWidth={2}
              fill="url(#leasingMonthlyTargetGradient)"
              dot={false}
              name="targetPace"
            />
            
            {/* Required Pace Line (dotted silver) */}
            <Line 
              type="monotone" 
              dataKey="requiredPace" 
              stroke="#ffffff" 
              strokeWidth={1.5}
              strokeDasharray="3 3"
              strokeOpacity={0.3}
              dot={false}
              connectNulls={true}
              name="requiredPace"
            />
            
            {/* Estimated Projection Line (dotted white) */}
            <Line 
              type="monotone" 
              dataKey="estimatedProjection" 
              stroke="#ffffff" 
              strokeWidth={1.5}
              strokeDasharray="6 4"
              strokeOpacity={0.5}
              dot={false}
              connectNulls={true}
              name="estimatedProjection"
            />
            
            {/* Actual Progress Line with Live Indicator */}
            <Line 
              type="monotone" 
              dataKey="actual" 
              stroke="#ffffff" 
              strokeWidth={3}
              dot={(props: any) => {
                const { cx, cy, payload } = props;
                if (payload?.isCurrentDay) {
                  // Pulsing dot for current day
                  return (
                    <g key={`pulse-${cx}-${cy}`}>
                      <circle cx={cx} cy={cy} r={8} fill="#ffffff" opacity={0.2}>
                        <animate attributeName="r" values="8;14;8" dur="1.5s" repeatCount="indefinite" />
                        <animate attributeName="opacity" values="0.3;0.1;0.3" dur="1.5s" repeatCount="indefinite" />
                      </circle>
                      <circle cx={cx} cy={cy} r={5} fill="#ffffff" stroke="#000" strokeWidth={2} />
                    </g>
                  );
                }
                return payload?.actual !== null 
                  ? <circle key={`dot-${cx}-${cy}`} cx={cx} cy={cy} r={3} fill="#ffffff" />
                  : null;
              }}
              connectNulls={false}
              name="actual"
              animationBegin={0}
              animationDuration={300}
            />
          </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

/* ---------------- Cumulative Yearly Target Chart with Live Indicator ---------------- */
const CumulativeYearlyTargetChart: React.FC<{metrics: any[], targets: any[], selectedYear: number}> = ({ metrics, targets, selectedYear }) => {
  const [chartData, setChartData] = useState<any[]>([]);
  const [animatedData, setAnimatedData] = useState<any[]>([]);

  useEffect(() => {
    if (chartData.length > 0) {
      setAnimatedData(chartData.map(item => ({ ...item, cumulativeActual: null })));
      
      const animationInterval = setInterval(() => {
        setAnimatedData(prevData => {
          const nextIndex = prevData.findIndex(item => item.cumulativeActual === null && chartData[prevData.indexOf(item)]?.cumulativeActual !== null);
          if (nextIndex !== -1) {
            return prevData.map((item, index) => 
              index === nextIndex 
                ? { ...item, cumulativeActual: chartData[index].cumulativeActual }
                : item
            );
          } else {
            clearInterval(animationInterval);
            return prevData;
          }
        });
      }, 400);

      return () => clearInterval(animationInterval);
    }
  }, [chartData]);

  useEffect(() => {
    if (targets.length > 0) {
      const currentYear = selectedYear;
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentDay = now.getDate();
      const daysInCurrentMonth = new Date(now.getFullYear(), currentMonth, 0).getDate();
      const monthProgress = currentDay / daysInCurrentMonth;
      
      const yearlyTargets = targets.filter(t => t.year === currentYear).sort((a, b) => a.month - b.month);
      
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      
      const data = [];
      let cumulativeTarget = 0;
      let cumulativeActual = 0;
      const isCurrentYear = selectedYear === new Date().getFullYear();
      
      for (let month = 1; month <= 12; month++) {
        const monthTarget = yearlyTargets.find(t => t.month === month);
        const monthlyTargetAmount = monthTarget?.total_target || 0;
        
        cumulativeTarget += monthlyTargetAmount;
        
        let monthlyActual = 0;
        const shouldShowActual = isCurrentYear ? month < currentMonth : true;
        
        if (shouldShowActual) {
          const monthMetric = metrics.find(m => {
            const metricDate = new Date(m.metric_date);
            return metricDate.getFullYear() === currentYear && metricDate.getMonth() + 1 === month;
          });
          monthlyActual = monthMetric?.total_net_sales || 0;
          cumulativeActual += monthlyActual;
        }
        
        data.push({
          xPosition: month,
          month: months[month - 1],
          monthNumber: month,
          cumulativeTarget: Math.round(cumulativeTarget),
          cumulativeActual: shouldShowActual ? Math.round(cumulativeActual) : null,
          isCurrentMonth: isCurrentYear && month === currentMonth,
          isPast: isCurrentYear ? month < currentMonth : true,
          isFuture: isCurrentYear ? month > currentMonth : false,
          isLivePoint: false
        });
        
        // Add live data point for current month
        if (isCurrentYear && month === currentMonth) {
          const currentMonthMetric = metrics.find(m => {
            const metricDate = new Date(m.metric_date);
            return metricDate.getFullYear() === currentYear && metricDate.getMonth() + 1 === month;
          });
          const currentMonthActual = currentMonthMetric?.total_net_sales || 0;
          const liveActual = cumulativeActual + currentMonthActual;
          const liveXPosition = month - 1 + monthProgress;
          const prevCumulativeTarget = cumulativeTarget - monthlyTargetAmount;
          const liveTarget = prevCumulativeTarget + (monthlyTargetAmount * monthProgress);
          
          data.push({
            xPosition: liveXPosition,
            month: `${months[month - 1]} ${currentDay}`,
            monthNumber: month,
            cumulativeTarget: Math.round(liveTarget),
            cumulativeActual: Math.round(liveActual),
            isCurrentMonth: true,
            isPast: false,
            isFuture: false,
            isLivePoint: true
          });
        }
      }
      
      data.sort((a, b) => a.xPosition - b.xPosition);
      setChartData(data);
    }
  }, [metrics, targets, selectedYear]);

  const formatXAxis = (value: number) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    if (Number.isInteger(value) && value >= 1 && value <= 12) {
      return months[value - 1];
    }
    return '';
  };

  return (
    <div className="rounded-lg bg-black/70 backdrop-blur p-4 border border-white/10">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-white/80">Target Pace vs Yearly Progress</h2>
        <div className="flex items-center gap-6 text-xs text-white/50">
          <div className="flex items-center gap-1">
            <div className="w-3 h-2 bg-white/40 rounded-sm"></div>
            <span>Target Pace</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-2 bg-white rounded-sm"></div>
            <span>Yearly Progress</span>
          </div>
        </div>
      </div>

      <div className="h-80">
        {chartData.length === 0 ? (
          <div className="flex items-center justify-center h-full text-white/50">Loading...</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={animatedData} margin={{ top: 20, right: 30, left: -10, bottom: 20 }}>
            <defs>
              <linearGradient id="leasingYearlyTargetAreaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ffffff" stopOpacity={0.4}/>
                <stop offset="95%" stopColor="#ffffff" stopOpacity={0.02}/>
              </linearGradient>
            </defs>
            
            <XAxis 
              dataKey="xPosition"
              type="number"
              domain={[1, 12]}
              ticks={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]}
              tickFormatter={formatXAxis}
              tick={{ fontSize: 10, fill: '#ffffff60' }}
            />
            <YAxis 
              tick={{ fontSize: 10, fill: '#ffffff60' }}
              tickFormatter={(value: number) => `${(value / 1000000).toFixed(1)}M`}
              width={50}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'rgba(0,0,0,0.95)', 
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '8px',
                color: '#ffffff',
                fontSize: '12px'
              }}
              labelFormatter={(label: string | number, payload: any[]) => {
                if (payload && payload.length > 0) {
                  const item = payload[0]?.payload;
                  return item?.isLivePoint 
                    ? `${item.month} ${selectedYear} (Live)`
                    : `${item?.month || label} ${selectedYear}`;
                }
                return `${selectedYear}`;
              }}
              formatter={(value: any, name: string) => [
                value ? value.toLocaleString() : '-',
                name === 'cumulativeTarget' ? 'Target Pace' : 'Yearly Progress'
              ]}
            />
            
            <Area
              type="monotone"
              dataKey="cumulativeTarget"
              stroke="#ffffff50"
              strokeWidth={2}
              fill="url(#leasingYearlyTargetAreaGradient)"
              dot={false}
              name="cumulativeTarget"
            />
            
            <Line 
              type="monotone" 
              dataKey="cumulativeActual" 
              stroke="#ffffff" 
              strokeWidth={3}
              dot={(props: any) => {
                const { cx, cy, payload } = props;
                if (payload?.isLivePoint) {
                  // Pulsing dot for live point
                  return (
                    <g key={`live-${cx}-${cy}`}>
                      <circle cx={cx} cy={cy} r={8} fill="#ffffff" opacity={0.2}>
                        <animate attributeName="r" values="8;14;8" dur="1.5s" repeatCount="indefinite" />
                        <animate attributeName="opacity" values="0.3;0.1;0.3" dur="1.5s" repeatCount="indefinite" />
                      </circle>
                      <circle cx={cx} cy={cy} r={5} fill="#ffffff" stroke="#000" strokeWidth={2} />
                    </g>
                  );
                }
                return payload?.cumulativeActual !== null 
                  ? <circle key={`dot-${cx}-${cy}`} cx={cx} cy={cy} r={3} fill="#ffffff" />
                  : null;
              }}
              connectNulls={false}
              name="cumulativeActual"
              animationBegin={0}
              animationDuration={400}
            />
          </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

/* ---------------- Additional Revenue Chart (Mileage, Fines, Salik) ---------------- */
const AdditionalRevenueChart: React.FC<{metrics: any[], selectedYear: number}> = ({ metrics, selectedYear }) => {
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    if (metrics.length > 0) {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const isCurrentYear = selectedYear === now.getFullYear();
      
      const data = [];
      
      for (let month = 1; month <= 12; month++) {
        const shouldShow = isCurrentYear ? month <= currentMonth : true;
        
        if (shouldShow) {
          const monthMetric = metrics.find(m => {
            const metricDate = new Date(m.metric_date);
            return metricDate.getFullYear() === selectedYear && metricDate.getMonth() + 1 === month;
          });
          
          const mileage = monthMetric?.excess_mileage || 0;
          const fines = monthMetric?.traffic_fines || 0;
          const salik = monthMetric?.salik || 0;
          
          data.push({
            month: months[month - 1],
            monthNumber: month,
            mileage,
            fines,
            salik,
            total: mileage + fines + salik,
            isCurrentMonth: isCurrentYear && month === currentMonth
          });
        }
      }
      
      setChartData(data);
    }
  }, [metrics, selectedYear]);

  return (
    <div className="rounded-lg bg-black/70 backdrop-blur p-4 border border-white/10">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-white/80">Additional Revenue by Month</h2>
        <div className="flex items-center gap-4 text-xs text-white/50">
          <div className="flex items-center gap-1">
            <div className="w-3 h-2 bg-white rounded-sm"></div>
            <span>Mileage</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-2 bg-white/60 rounded-sm"></div>
            <span>Fines</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-2 bg-white/30 rounded-sm"></div>
            <span>Salik</span>
          </div>
        </div>
      </div>

      <div className="h-64">
        {chartData.length === 0 ? (
          <div className="flex items-center justify-center h-full text-white/50">No additional revenue data</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 30, left: -10, bottom: 20 }}>
              <defs>
                <linearGradient id="mileageGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ffffff" stopOpacity={0.9}/>
                  <stop offset="95%" stopColor="#ffffff" stopOpacity={0.6}/>
                </linearGradient>
                <linearGradient id="finesGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ffffff" stopOpacity={0.6}/>
                  <stop offset="95%" stopColor="#ffffff" stopOpacity={0.3}/>
                </linearGradient>
                <linearGradient id="salikGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ffffff" stopOpacity={0.35}/>
                  <stop offset="95%" stopColor="#ffffff" stopOpacity={0.15}/>
                </linearGradient>
              </defs>
              <XAxis 
                dataKey="month" 
                tick={{ fontSize: 11, fill: '#ffffff80', fontWeight: 500 }}
                axisLine={{ stroke: '#ffffff20' }}
                tickLine={{ stroke: '#ffffff20' }}
              />
              <YAxis 
                tick={{ fontSize: 11, fill: '#ffffff80', fontWeight: 500 }}
                tickFormatter={(value: number) => `${(value / 1000).toFixed(0)}K`}
                width={50}
                axisLine={{ stroke: '#ffffff20' }}
                tickLine={{ stroke: '#ffffff20' }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(0,0,0,0.95)', 
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '8px',
                  color: '#ffffff',
                  fontSize: '12px'
                }}
                formatter={(value: any, name: string) => {
                  const labels: Record<string, string> = {
                    mileage: 'Excess Mileage',
                    fines: 'Traffic Fines',
                    salik: 'Salik'
                  };
                  return [value ? value.toLocaleString() : '-', labels[name] || name];
                }}
              />
              <Bar dataKey="mileage" fill="url(#mileageGradient)" radius={[2, 2, 0, 0]} name="mileage" />
              <Bar dataKey="fines" fill="url(#finesGradient)" radius={[2, 2, 0, 0]} name="fines" />
              <Bar dataKey="salik" fill="url(#salikGradient)" radius={[2, 2, 0, 0]} name="salik" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};
