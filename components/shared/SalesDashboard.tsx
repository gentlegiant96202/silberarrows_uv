"use client";
import React, { useState, useEffect } from 'react';
import { AreaChart, Area, BarChart, Bar, LineChart, Line, ComposedChart, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface SalesDashboardProps {
  metrics: any[];
  targets: any[];
  loading?: boolean;
  className?: string;
  salesYear?: number;
  salesMonth?: number;
}

export default function SharedSalesDashboard({ 
  metrics, 
  targets, 
  loading = false, 
  className = "",
  salesYear = new Date().getFullYear(),
  salesMonth = new Date().getMonth() + 1
}: SalesDashboardProps) {



  if (loading) {
    return (
      <div className={`mb-6 p-4 backdrop-blur-md bg-gradient-to-r from-white/10 via-white/5 to-white/10 border border-white/20 rounded-lg flex items-center space-x-3 shadow-lg ${className}`}>
        <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/20 border-t-white"></div>
        <span className="text-white">Loading sales data...</span>
      </div>
    );
  }

  return (
    <main className={`text-white text-sm ${className}`}>

      
      {/* Top row: Sales KPI Cards */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Left column */}
        <SalesKPICards 
          metrics={metrics} 
          targets={targets}
          selectedYear={salesYear}
          selectedMonth={salesMonth}
        />

        {/* Right column */}
        <SalesPerformanceCards 
          metrics={metrics} 
          targets={targets}
          selectedYear={salesYear}
          selectedMonth={salesMonth}
        />
      </div>

      {/* Charts Section */}
      <div className="grid gap-4 mt-4 lg:grid-cols-2">
        {/* Profit Trend Chart */}
        <div className="lg:col-span-1">
          <DailyCumulativeProgressChart 
            metrics={metrics} 
            targets={targets}
            selectedYear={salesYear}
            selectedMonth={salesMonth}
          />
        </div>

        {/* Revenue vs Cost Chart */}
        <div className="lg:col-span-1">
          <CumulativeYearlyTargetChart 
            metrics={metrics} 
            targets={targets}
            selectedYear={salesYear}
          />
        </div>
      </div>
    </main>
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
      
      const yearlyGrossProfit = selectedMetric?.gross_profit_year_actual || 0;
      
      // Get yearly target from any target record for the selected year (should be consistent)
      const yearlyTarget = selectedYearTargets.length > 0 ? 
        (selectedYearTargets[0].gross_profit_year_target || 0) : 0;
      
      setKpi({
        monthlyGrossProfit: selectedMetric?.gross_profit_month_actual || 0,
        monthlyTarget: selectedMonthTarget?.gross_profit_month_target || 0,
        yearlyGrossProfit: yearlyGrossProfit,
        yearlyTarget: yearlyTarget,
        totalUnitsSold: (selectedMetric?.total_units_sold_month ?? 0) || (selectedMetric?.units_disposed_month ?? 0) || 0,
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
              <p className="text-sm text-white/60">Monthly Gross Profit</p>
              <p className="text-xl font-semibold text-white">{formatCurrency(kpi.monthlyGrossProfit)}</p>
              <p className="text-xs text-white/40">Month to date</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-white/60">Units Sold</p>
              <p className="text-lg font-semibold text-white">{kpi.totalUnitsSold}</p>
              <p className="text-xs text-white/40">Stock:{kpi.stockUnitsSold} Consignment:{kpi.consignmentUnitsSold}</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg bg-gradient-to-br from-white/10 to-white/5 backdrop-blur p-3 border border-white/10 shadow-inner">
          <p className="text-sm text-white/60">Monthly Target</p>
          <p className="text-xl font-semibold text-white">{formatCurrency(kpi.monthlyTarget)}</p>
          <p className="text-xs text-white/40">Current month goal</p>
        </div>
        <div className="rounded-lg bg-gradient-to-br from-white/10 to-white/5 backdrop-blur p-3 border border-white/10 shadow-inner">
          <p className="text-sm text-white/60">Yearly Profit</p>
          <p className="text-xl font-semibold text-white">{formatCurrency(kpi.yearlyGrossProfit)}</p>
          <p className="text-xs text-white/40">Year to date</p>
        </div>
        <div className="rounded-lg bg-gradient-to-br from-white/10 to-white/5 backdrop-blur p-3 border border-white/10 shadow-inner">
          <p className="text-sm text-white/60">Yearly Target</p>
          <p className="text-xl font-semibold text-white">{formatCurrency(kpi.yearlyTarget)}</p>
          <p className="text-xs text-white/40">Full year goal</p>
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
      
      const yearlyGrossProfit = selectedMetric?.gross_profit_year_actual || 0;
      
      // Get yearly target from any target record for the selected year (should be consistent)
      const yearlyTargets = targets.filter(t => t.year === selectedYear);
      const yearlyTarget = yearlyTargets.length > 0 ? 
        (yearlyTargets[0].gross_profit_year_target || 0) : 0;
      
      // Use auto-computed percentages from database instead of manual calculation
      const targetAchievement = selectedMetric?.gross_profit_month_achieved_percentage || 0;
      const yearlyAchievement = selectedMetric?.gross_profit_year_achieved_percentage || 0;
      
      // Marketing data for selected month
      const marketingSpend = selectedMetric?.marketing_spend_month || 0;
      const marketingRate = selectedMetric?.marketing_rate_against_gross_profit || 0;
      
      // Average profit per car for selected month
      const avgProfitPerCar = selectedMetric?.average_gross_profit_per_car_month || 0;
      
      setPerformance({
        targetAchievement,
        marketingSpend,
        marketingRate,
        yearlyAchievement,
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
        <p className="text-sm text-white/60">Target Achievement</p>
        <p className="text-xl font-semibold text-white">{performance.targetAchievement.toFixed(1)}%</p>
        <p className="text-xs text-white/40">vs monthly target</p>
      </div>
      <div className="rounded-lg bg-gradient-to-br from-white/10 to-white/5 backdrop-blur p-3 border border-white/10 shadow-inner">
        <p className="text-sm text-white/60">Marketing</p>
        <p className="text-xl font-semibold text-white">{formatCurrency(performance.marketingSpend)}</p>
        <p className="text-xs text-white/40">Rate: {performance.marketingRate.toFixed(1)}%</p>
      </div>
      <div className="rounded-lg bg-gradient-to-br from-white/10 to-white/5 backdrop-blur p-3 border border-white/10 shadow-inner">
        <p className="text-sm text-white/60">Yearly Achievement</p>
        <p className="text-xl font-semibold text-white">{performance.yearlyAchievement.toFixed(1)}%</p>
        <p className="text-xs text-white/40">vs yearly target</p>
      </div>
      <div className="rounded-lg bg-gradient-to-br from-white/10 to-white/5 backdrop-blur p-3 border border-white/10 shadow-inner">
        <p className="text-sm text-white/60">Avg Profit/Car</p>
        <p className="text-xl font-semibold text-white">{formatCurrency(performance.avgProfitPerCar)}</p>
        <p className="text-xs text-white/40">Per unit sold</p>
      </div>
    </div>
  );
};

/* ---------------- Daily Cumulative Progress Chart ---------------- */
const DailyCumulativeProgressChart: React.FC<{metrics: any[], targets: any[], selectedYear: number, selectedMonth: number}> = ({ metrics, targets, selectedYear, selectedMonth }) => {
  const [chartData, setChartData] = useState<any[]>([]);
  const [animatedData, setAnimatedData] = useState<any[]>([]);
  const [currentAnimationIndex, setCurrentAnimationIndex] = useState(0);

  // Animation effect for step-by-step line drawing
  useEffect(() => {
    if (chartData.length > 0) {
      setCurrentAnimationIndex(0);
      setAnimatedData(chartData.map(item => ({ ...item, actual: null })));
      
      const animationInterval = setInterval(() => {
        setCurrentAnimationIndex(prev => {
          const nextIndex = prev + 1;
          if (nextIndex <= chartData.length) {
            setAnimatedData(prevData => 
              prevData.map((item, index) => 
                index < nextIndex 
                  ? { ...item, actual: chartData[index].actual }
                  : item
              )
            );
            return nextIndex;
          } else {
            clearInterval(animationInterval);
            return prev;
          }
        });
      }, 400); // 400ms delay between each point

      return () => clearInterval(animationInterval);
    }
  }, [chartData]);

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
          return m.working_days_elapsed === day;
        });
        
        // Use the actual recorded value for this day
        const actualValue = dayEntry?.gross_profit_month_actual;
        
        data.push({
          day: `Day ${day}`,
          dayNumber: day,
          targetPace: Math.round(cumulativeTargetPace),
          actual: actualValue !== null && actualValue !== undefined ? Math.round(actualValue) : null,
          isCurrentDay: !!dayEntry && day === (monthlyMetrics.length)
        });
      }
      
      setChartData(data);
    }
  }, [metrics, targets, selectedYear, selectedMonth]);

  return (
    <div className="rounded-lg bg-black/70 backdrop-blur p-4 border border-white/10">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-white/80">Target Pace vs Monthly Progress</h2>
        <div className="flex items-center gap-6 text-xs text-white/50">
          <div className="flex items-center gap-1">
            <div className="w-3 h-2 bg-white/60 rounded-sm"></div>
            <span>Target Pace</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-2 bg-green-500 rounded-sm"></div>
            <span>Monthly Progress</span>
          </div>
        </div>
      </div>

      <div className="h-80">
        {chartData.length === 0 ? (
          <div className="flex items-center justify-center h-full text-white/50">Loading...</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={animatedData} margin={{ top: 20, right: 30, left: -10, bottom: 20 }}>
            <XAxis 
              dataKey="dayNumber" 
              tick={{ fontSize: 10, fill: '#ffffff60' }}
              tickFormatter={(value: number) => `Day ${value}`}
            />
            <YAxis 
              tick={{ fontSize: 10, fill: '#ffffff60' }}
              tickFormatter={(value: number) => `${(value / 1000).toFixed(0)}K`}
              width={40}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'rgba(0,0,0,0.9)', 
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '8px',
                color: '#ffffff'
              }}
              labelFormatter={(label: string | number) => `Working Day ${label}`}
              formatter={(value: any, name: string) => [
                value ? `AED ${value.toLocaleString()}` : 'No data',
                name === 'targetPace' ? 'Target Pace' : 'Monthly Progress'
              ]}
            />
            
            {/* Gradient definitions */}
            <defs>
              <linearGradient id="monthlyTargetGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ffffff" stopOpacity={0.6}/>
                <stop offset="95%" stopColor="#ffffff" stopOpacity={0.05}/>
              </linearGradient>
            </defs>
            
            {/* Target Area - White area under the target line - Always visible */}
            <Area
              type="monotone"
              dataKey="targetPace"
              stroke="#ffffff60"
              strokeWidth={2}
              fill="url(#monthlyTargetGradient)"
              dot={false}
              name="targetPace"
            />
            
            {/* Actual Progress Line - Shows where we currently are - Animated */}
            <Line 
              type="monotone" 
              dataKey="actual" 
              stroke="#10B981" 
              strokeWidth={3}
              dot={{ fill: '#10B981', strokeWidth: 1, r: 3 }}
              connectNulls={false}
              name="actual"
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

/* ---------------- Cumulative Yearly Target Chart ---------------- */
const CumulativeYearlyTargetChart: React.FC<{metrics: any[], targets: any[], selectedYear: number}> = ({ metrics, targets, selectedYear }) => {
  const [chartData, setChartData] = useState<any[]>([]);
  const [animatedData, setAnimatedData] = useState<any[]>([]);
  const [currentAnimationIndex, setCurrentAnimationIndex] = useState(0);

  // Animation effect for step-by-step line drawing
  useEffect(() => {
    if (chartData.length > 0) {
      setCurrentAnimationIndex(0);
      setAnimatedData(chartData.map(item => ({ ...item, cumulativeActual: null })));
      
      const animationInterval = setInterval(() => {
        setCurrentAnimationIndex(prev => {
          const nextIndex = prev + 1;
          if (nextIndex <= chartData.length) {
            setAnimatedData(prevData => 
              prevData.map((item, index) => 
                index < nextIndex 
                  ? { ...item, cumulativeActual: chartData[index].cumulativeActual }
                  : item
              )
            );
            return nextIndex;
          } else {
            clearInterval(animationInterval);
            return prev;
          }
        });
      }, 500); // 500ms delay between each point for yearly (slower than monthly)

      return () => clearInterval(animationInterval);
    }
  }, [chartData]);

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
    <div className="rounded-lg bg-black/70 backdrop-blur p-4 border border-white/10">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-white/80">Target Pace vs Yearly Progress</h2>
        <div className="flex items-center gap-6 text-xs text-white/50">
          <div className="flex items-center gap-1">
            <div className="w-3 h-2 bg-white/60 rounded-sm"></div>
            <span>Target Pace</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-2 bg-green-500 rounded-sm"></div>
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
            <XAxis 
              dataKey="month" 
              tick={{ fontSize: 10, fill: '#ffffff60' }}
            />
            <YAxis 
              tick={{ fontSize: 10, fill: '#ffffff60' }}
              tickFormatter={(value: number) => `${(value / 1000000).toFixed(1)}M`}
              width={50}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'rgba(0,0,0,0.9)', 
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '8px',
                color: '#ffffff'
              }}
              labelFormatter={(label: string | number) => `${label} ${new Date().getFullYear()}`}
              formatter={(value: any, name: string) => [
                value ? `AED ${value.toLocaleString()}` : 'No data',
                name === 'cumulativeTarget' ? 'Target Pace' : 'Yearly Progress'
              ]}
            />
            
            {/* Gradient definitions */}
            <defs>
              <linearGradient id="yearlyTargetAreaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ffffff" stopOpacity={0.6}/>
                <stop offset="95%" stopColor="#ffffff" stopOpacity={0.05}/>
              </linearGradient>
            </defs>
            
            {/* Yearly Target Area - White area under the target line - Always visible */}
            <Area
              type="monotone"
              dataKey="cumulativeTarget"
              stroke="#ffffff60"
              strokeWidth={2}
              fill="url(#yearlyTargetAreaGradient)"
              dot={false}
              name="cumulativeTarget"
            />
            
            {/* Actual Progress Line - Shows where we currently are - Animated */}
            <Line 
              type="monotone" 
              dataKey="cumulativeActual" 
              stroke="#10B981" 
              strokeWidth={3}
              dot={{ fill: '#10B981', strokeWidth: 1, r: 3 }}
              connectNulls={false}
              name="cumulativeActual"
              animationBegin={0}
              animationDuration={500}
            />
          </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};