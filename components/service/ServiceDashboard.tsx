"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { Calendar, DollarSign, TrendingUp, Target, FileText, AlertCircle } from 'lucide-react';
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
    return new Intl.NumberFormat('en-AE', {
      style: 'currency',
      currency: 'AED',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
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
    <div className="space-y-6">
      {/* Header with Date/Month Selectors */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-gradient-to-r from-white/10 to-white/5 backdrop-blur border border-white/10 rounded-lg">
        <div className="flex items-center space-x-2">
          <Calendar className="w-5 h-5 text-white/60" />
          <h2 className="text-lg font-semibold text-white">Service Department Dashboard</h2>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Month Selector */}
          <div className="flex items-center gap-2">
            <span className="text-white/60 text-sm font-medium">Month:</span>
            <select
              value={selectedMonth}
              onChange={(e) => {
                setSelectedMonth(Number(e.target.value));
                setSelectedDate(''); // Reset date when month changes
              }}
              className="bg-white/10 border border-white/20 text-white rounded px-3 py-1.5 text-sm focus:outline-none focus:border-white/40 backdrop-blur-sm"
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
          <div className="flex items-center gap-2">
            <span className="text-white/60 text-sm font-medium">Year:</span>
            <select
              value={selectedYear}
              onChange={(e) => {
                setSelectedYear(Number(e.target.value));
                setSelectedDate(''); // Reset date when year changes
              }}
              className="bg-white/10 border border-white/20 text-white rounded px-3 py-1.5 text-sm focus:outline-none focus:border-white/40 backdrop-blur-sm"
            >
              {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
                <option key={year} value={year} className="bg-gray-800 text-white">{year}</option>
              ))}
            </select>
          </div>

          {/* Report Date Selector */}
          <div className="flex items-center gap-2">
            <span className="text-white/60 text-sm font-medium">Report Date:</span>
            <select
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-white/10 border border-white/20 text-white rounded px-3 py-1.5 text-sm focus:outline-none focus:border-white/40 backdrop-blur-sm"
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
        <div className="flex flex-col items-center justify-center h-64 bg-white/5 backdrop-blur border border-white/10 rounded-lg">
          <AlertCircle className="w-12 h-12 text-white/40 mb-4" />
          <p className="text-white/60 text-lg">No data available for the selected period</p>
          <p className="text-white/40 text-sm mt-2">Please select a different month or add data in the Data Grid tab</p>
        </div>
      ) : (
        <>
          {/* Service Report Title */}
          <div className="text-center py-2">
            <h1 className="text-3xl font-bold text-white/90 tracking-wider">SERVICE REPORT</h1>
          </div>

          {/* Net Sales Metrics Row */}
          <div className="grid grid-cols-5 gap-4">
            {/* Current Net Sales */}
            <div className="rounded-lg bg-gradient-to-br from-emerald-500/20 to-teal-500/10 backdrop-blur p-4 border border-emerald-500/20">
              <div className="text-center">
                <p className="text-2xl font-bold text-white mb-1">
                  {formatCurrency(dashboardData.current_net_sales)}
                </p>
                <p className={`text-lg font-semibold mb-2 ${
                  dashboardData.current_net_sales_percentage >= 100 ? 'text-green-400' : 
                  dashboardData.current_net_sales_percentage >= 75 ? 'text-yellow-400' : 'text-red-400'
                }`}>
                  {formatPercentage(dashboardData.current_net_sales_percentage)}
                </p>
                <p className="text-xs text-white/70 uppercase tracking-wide">Current Net Sales</p>
              </div>
            </div>

            {/* Estimated Sales Month End */}
            <div className="rounded-lg bg-gradient-to-br from-emerald-500/20 to-teal-500/10 backdrop-blur p-4 border border-emerald-500/20">
              <div className="text-center">
                <p className="text-2xl font-bold text-white mb-1">
                  {formatCurrency(dashboardData.estimated_net_sales)}
                </p>
                <p className={`text-lg font-semibold mb-2 ${
                  dashboardData.estimated_net_sales_percentage >= 100 ? 'text-green-400' : 
                  dashboardData.estimated_net_sales_percentage >= 75 ? 'text-yellow-400' : 'text-red-400'
                }`}>
                  {formatPercentage(dashboardData.estimated_net_sales_percentage)}
                </p>
                <p className="text-xs text-white/70 uppercase tracking-wide">Est. Sales Month End</p>
              </div>
            </div>

            {/* Daily Average */}
            <div className="rounded-lg bg-gradient-to-br from-emerald-500/20 to-teal-500/10 backdrop-blur p-4 border border-emerald-500/20">
              <div className="text-center">
                <p className="text-2xl font-bold text-white mb-1">
                  {formatCurrency(dashboardData.current_daily_average)}
                </p>
                <p className="text-xs text-white/70 uppercase tracking-wide mt-6">Daily Average</p>
              </div>
            </div>

            {/* Net Sales Target - 100% */}
            <div className="rounded-lg bg-gradient-to-br from-gray-600/40 to-gray-700/30 backdrop-blur p-4 border border-gray-500/30">
              <div className="text-center">
                <p className="text-2xl font-bold text-white mb-1">
                  {monthTarget ? formatCurrency(monthTarget.net_sales_target) : 'N/A'}
                </p>
                <p className="text-red-400 text-lg font-semibold mb-2">
                  {dashboardData.remaining_net_sales < 0 ? '+' : ''}{formatCurrency(Math.abs(dashboardData.remaining_net_sales))}
                </p>
                <p className="text-xs text-white/70 uppercase tracking-wide">Net Sales Target - 100%</p>
              </div>
            </div>

            {/* Net Sales Target - 112% */}
            <div className="rounded-lg bg-gradient-to-br from-gray-600/40 to-gray-700/30 backdrop-blur p-4 border border-gray-500/30">
              <div className="text-center">
                <p className="text-2xl font-bold text-white mb-1">
                  {monthTarget ? formatCurrency(monthTarget.net_sales_112_percent) : 'N/A'}
                </p>
                <p className="text-red-400 text-lg font-semibold mb-2">
                  {monthTarget ? formatCurrency(monthTarget.net_sales_112_percent - dashboardData.current_net_sales) : 'N/A'}
                </p>
                <p className="text-xs text-white/70 uppercase tracking-wide">Net Sales Target - 112%</p>
              </div>
            </div>
          </div>

          {/* Labour to Net Sales Ratio */}
          <div className="text-center py-2">
            <p className="text-sm text-white/60 uppercase tracking-wide">
              Labour to Net Sales Ratio: <span className="font-bold text-white">{formatPercentage(labourToNetSalesRatio)}</span>
            </p>
          </div>

          {/* Labour Sales Metrics Row */}
          <div className="grid grid-cols-5 gap-4">
            {/* Current Labour Sales */}
            <div className="rounded-lg bg-gradient-to-br from-emerald-500/20 to-teal-500/10 backdrop-blur p-4 border border-emerald-500/20">
              <div className="text-center">
                <p className="text-2xl font-bold text-white mb-1">
                  {formatCurrency(dashboardData.current_net_labor_sales)}
                </p>
                <p className={`text-lg font-semibold mb-2 ${
                  dashboardData.current_labour_sales_percentage >= 100 ? 'text-green-400' : 
                  dashboardData.current_labour_sales_percentage >= 75 ? 'text-yellow-400' : 'text-red-400'
                }`}>
                  {formatPercentage(dashboardData.current_labour_sales_percentage)}
                </p>
                <p className="text-xs text-white/70 uppercase tracking-wide">Current Labour Sales</p>
              </div>
            </div>

            {/* Estimated Labour Sales Month End */}
            <div className="rounded-lg bg-gradient-to-br from-emerald-500/20 to-teal-500/10 backdrop-blur p-4 border border-emerald-500/20">
              <div className="text-center">
                <p className="text-2xl font-bold text-white mb-1">
                  {formatCurrency(dashboardData.estimated_labor_sales)}
                </p>
                <p className={`text-lg font-semibold mb-2 ${
                  dashboardData.estimated_labor_sales_percentage >= 100 ? 'text-green-400' : 
                  dashboardData.estimated_labor_sales_percentage >= 75 ? 'text-yellow-400' : 'text-red-400'
                }`}>
                  {formatPercentage(dashboardData.estimated_labor_sales_percentage)}
                </p>
                <p className="text-xs text-white/70 uppercase tracking-wide">Est. Labour Sales Month End</p>
              </div>
            </div>

            {/* Daily Average */}
            <div className="rounded-lg bg-gradient-to-br from-emerald-500/20 to-teal-500/10 backdrop-blur p-4 border border-emerald-500/20">
              <div className="text-center">
                <p className="text-2xl font-bold text-white mb-1">
                  {formatCurrency(dashboardData.working_days_elapsed > 0 
                    ? dashboardData.current_net_labor_sales / dashboardData.working_days_elapsed 
                    : 0)}
                </p>
                <p className="text-xs text-white/70 uppercase tracking-wide mt-6">Daily Average</p>
              </div>
            </div>

            {/* Labour Sales Target - 100% */}
            <div className="rounded-lg bg-gradient-to-br from-gray-600/40 to-gray-700/30 backdrop-blur p-4 border border-gray-500/30">
              <div className="text-center">
                <p className="text-2xl font-bold text-white mb-1">
                  {monthTarget ? formatCurrency(monthTarget.labour_sales_target) : 'N/A'}
                </p>
                <p className="text-red-400 text-lg font-semibold mb-2">
                  {dashboardData.remaining_labour_sales < 0 ? '+' : ''}{formatCurrency(Math.abs(dashboardData.remaining_labour_sales))}
                </p>
                <p className="text-xs text-white/70 uppercase tracking-wide">Labour Sales Target - 100%</p>
              </div>
            </div>

            {/* Labour Sales Target - 112% */}
            <div className="rounded-lg bg-gradient-to-br from-gray-600/40 to-gray-700/30 backdrop-blur p-4 border border-gray-500/30">
              <div className="text-center">
                <p className="text-2xl font-bold text-white mb-1">
                  {monthTarget ? formatCurrency(monthTarget.labour_sales_target * 1.12) : 'N/A'}
                </p>
                <p className="text-red-400 text-lg font-semibold mb-2">
                  {monthTarget ? formatCurrency((monthTarget.labour_sales_target * 1.12) - dashboardData.current_net_labor_sales) : 'N/A'}
                </p>
                <p className="text-xs text-white/70 uppercase tracking-wide">Labour Sales Target - 112%</p>
              </div>
            </div>
          </div>

          {/* Charts and Additional Metrics Row */}
          <div className="grid grid-cols-3 gap-4">
            {/* Left Column: Target Progress Charts */}
            <div className="space-y-4">
              {/* Net Sales Progress Pie Chart */}
              <div className="rounded-lg bg-black/40 backdrop-blur border border-white/10 p-4">
                <h3 className="text-sm font-semibold text-white/80 mb-2 text-center uppercase tracking-wide">
                  Target Progress - Net Sales
                </h3>
                <NetSalesProgressChart 
                  currentPercentage={dashboardData.current_net_sales_percentage} 
                />
              </div>

              {/* Labour Sales Progress Pie Chart */}
              <div className="rounded-lg bg-black/40 backdrop-blur border border-white/10 p-4">
                <h3 className="text-sm font-semibold text-white/80 mb-2 text-center uppercase tracking-wide">
                  Target Progress - Labour Sales
                </h3>
                <LabourSalesProgressChart 
                  currentPercentage={dashboardData.current_labour_sales_percentage} 
                />
              </div>
            </div>

            {/* Middle Column: Marketing & Invoices */}
            <div className="space-y-4">
              {/* Marketing Spend % */}
              <div className="rounded-lg bg-gradient-to-br from-emerald-500/20 to-teal-500/10 backdrop-blur p-4 border border-emerald-500/20">
                <div className="text-center">
                  <p className="text-3xl font-bold text-white mb-2">
                    {formatPercentage(marketingSpendPercentage)}
                  </p>
                  <p className="text-xs text-white/70 uppercase tracking-wide">Marketing Spend%</p>
                </div>
              </div>

              {/* Average Invoice Value */}
              <div className="rounded-lg bg-gradient-to-br from-gray-600/40 to-gray-700/30 backdrop-blur p-4 border border-gray-500/30">
                <div className="text-center">
                  <p className="text-3xl font-bold text-white mb-2">
                    {formatCurrency(averageInvoiceValue)}
                  </p>
                  <p className="text-xs text-white/70 uppercase tracking-wide">Average Invoice Value</p>
                </div>
              </div>

              {/* Marketing Spend */}
              <div className="rounded-lg bg-gradient-to-br from-emerald-500/20 to-teal-500/10 backdrop-blur p-4 border border-emerald-500/20">
                <div className="text-center">
                  <p className="text-3xl font-bold text-white mb-2">
                    {formatCurrency(dashboardData.current_marketing_spend)}
                  </p>
                  <p className="text-xs text-white/70 uppercase tracking-wide">Marketing Spend</p>
                </div>
              </div>

              {/* Number of Invoices */}
              <div className="rounded-lg bg-gradient-to-br from-gray-600/40 to-gray-700/30 backdrop-blur p-4 border border-gray-500/30">
                <div className="text-center">
                  <p className="text-3xl font-bold text-white mb-2">
                    {monthlyInvoiceSum}
                  </p>
                  <p className="text-xs text-white/70 uppercase tracking-wide"># of Invoices</p>
                </div>
              </div>
            </div>

            {/* Right Column: Vehicle Throughput Gauge */}
            <div className="rounded-lg bg-black/40 backdrop-blur border border-white/10 p-4 flex flex-col items-center justify-center">
              <h3 className="text-sm font-semibold text-white/80 mb-4 uppercase tracking-wide">
                Vehicle Throughput
              </h3>
              <VehicleThroughputGauge value={vehicleThroughput} />
            </div>
          </div>

          {/* Individual Salesperson Performance */}
          <div className="space-y-3">
            <SalespersonBar 
              name="DANIEL" 
              amount={dashboardData.daniel_total_sales}
              maxAmount={Math.max(
                dashboardData.daniel_total_sales,
                dashboardData.essrar_total_sales,
                dashboardData.lucy_total_sales
              )}
            />
            <SalespersonBar 
              name="LUCY" 
              amount={dashboardData.lucy_total_sales}
              maxAmount={Math.max(
                dashboardData.daniel_total_sales,
                dashboardData.essrar_total_sales,
                dashboardData.lucy_total_sales
              )}
            />
            <SalespersonBar 
              name="ESSRAR" 
              amount={dashboardData.essrar_total_sales}
              maxAmount={Math.max(
                dashboardData.daniel_total_sales,
                dashboardData.essrar_total_sales,
                dashboardData.lucy_total_sales
              )}
            />
          </div>
        </>
      )}
    </div>
  );
}

/* ---------------- Net Sales Progress Pie Chart ---------------- */
const NetSalesProgressChart: React.FC<{ currentPercentage: number }> = ({ currentPercentage }) => {
  const percentage = Math.min(currentPercentage, 100);
  const remaining = Math.max(100 - percentage, 0);

  const data = [
    { name: 'Achieved', value: percentage },
    { name: 'Remaining', value: remaining }
  ];

  const COLORS = ['#10b981', '#4b5563'];

  return (
    <div className="relative h-48">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={80}
            paddingAngle={2}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index]} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <p className="text-3xl font-bold text-white">{percentage.toFixed(1)}%</p>
        <p className="text-xs text-white/60 mt-1">Complete</p>
      </div>
    </div>
  );
};

/* ---------------- Labour Sales Progress Pie Chart ---------------- */
const LabourSalesProgressChart: React.FC<{ currentPercentage: number }> = ({ currentPercentage }) => {
  const percentage = Math.min(currentPercentage, 100);
  const remaining = Math.max(100 - percentage, 0);

  const data = [
    { name: 'Achieved', value: percentage },
    { name: 'Remaining', value: remaining }
  ];

  const COLORS = ['#10b981', '#4b5563'];

  return (
    <div className="relative h-48">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={80}
            paddingAngle={2}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index]} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <p className="text-3xl font-bold text-white">{percentage.toFixed(1)}%</p>
        <p className="text-xs text-white/60 mt-1">Complete</p>
      </div>
    </div>
  );
};

/* ---------------- Vehicle Throughput Gauge ---------------- */
const VehicleThroughputGauge: React.FC<{ value: number }> = ({ value }) => {
  // Gauge ranges: 0-15, ideal around 7.5
  const maxValue = 15;
  const normalizedValue = Math.min(value, maxValue);
  const percentage = (normalizedValue / maxValue) * 100;
  
  // Determine color based on value
  let gaugeColor = '#10b981'; // green
  if (value < 5) {
    gaugeColor = '#ef4444'; // red
  } else if (value < 7) {
    gaugeColor = '#f59e0b'; // orange
  }

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
          stroke={gaugeColor}
          strokeWidth="20"
          strokeDasharray="376.99"
          strokeDashoffset={125.66 + (251.33 * (1 - percentage / 100))}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      
      {/* Center value */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <p className="text-4xl font-bold text-white">{value.toFixed(2)}</p>
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

/* ---------------- Salesperson Performance Bar ---------------- */
const SalespersonBar: React.FC<{ name: string; amount: number; maxAmount: number }> = ({ 
  name, 
  amount, 
  maxAmount 
}) => {
  const percentage = maxAmount > 0 ? (amount / maxAmount) * 100 : 0;
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AE', {
      style: 'currency',
      currency: 'AED',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="flex items-center gap-3">
      <div className="w-20 text-right">
        <span className="text-sm font-bold text-white/90 uppercase tracking-wide">{name}</span>
      </div>
      <div className="flex-1 relative h-12 bg-gray-700/30 rounded-lg overflow-hidden border border-gray-600/30">
        <div 
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-1000 ease-out"
          style={{ width: `${percentage}%` }}
        />
        <div className="absolute inset-0 flex items-center justify-start px-4">
          <span className="text-lg font-bold text-white relative z-10">
            {formatCurrency(amount)}
          </span>
        </div>
      </div>
    </div>
  );
};

