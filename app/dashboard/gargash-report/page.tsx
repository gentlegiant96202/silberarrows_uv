"use client";
import React, { useEffect, useState } from 'react';

import { supabase } from '@/lib/supabaseClient';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import dayjs from 'dayjs';

/**
 * Gargash Report Dashboard
 * 
 * Historical Data Configuration:
 * - To update historical sales count: Change HISTORICAL_GARGASH_SOLD
 * - To update historical average price: Change HISTORICAL_AVG_PRICE  
 * - To update estimated sale time: Change HISTORICAL_AVG_DAYS_TO_SALE
 */

export default function GargashReportPage() {
  const [reportData, setReportData] = useState({
    totalCars: 0,
    avgAge: 0,
    freshCars: 0,
    agingCars: 0,
    oldCars: 0,
    avgPrice: 0,
    reservedCars: 0,
    availableCars: 0,
    soldCars: 0,
    soldThisWeek: 0,
    avgDaysToSale: 0,
    carsAddedThisWeek: 0,
    conversionRate: 0
  });
  
  const [gargashCars, setGargashCars] = useState<any[]>([]);
  const [weeklyTrend, setWeeklyTrend] = useState<any[]>([]);
  const [ageDistribution, setAgeDistribution] = useState<any[]>([]);
  const [priceDistribution, setPriceDistribution] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchGargashData();
  }, []);

  const fetchGargashData = async () => {
    setLoading(true);
    try {
      // Fetch all Gargash consignment cars with lead counts
      const { data: cars, error } = await supabase
        .from('cars')
        .select(`
          *,
          leads:leads!inventory_car_id(count)
        `)
        .eq('ownership_type', 'consignment')
        .ilike('customer_name', '%gargash%')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching Gargash cars:', error);
        return;
      }

      // Process cars and add lead counts
      const allCars = (cars || []).map(car => ({
        ...car,
        lead_count: car.leads?.[0]?.count || 0
      }));
      setGargashCars(allCars);

      // Historical sales data (adjust these numbers as needed)
      const HISTORICAL_GARGASH_SOLD = 9; // Previously sold Gargash cars not in current system
      
      // Calculate KPI metrics (including historical cars in total)
      const currentTotalCars = allCars.length;
      const totalCars = currentTotalCars + HISTORICAL_GARGASH_SOLD; // Include historical in total count
      const inventoryCars = allCars.filter(c => c.status === 'inventory');
      const availableCars = inventoryCars.filter(c => c.sale_status === 'available').length;
      const reservedCars = inventoryCars.filter(c => c.sale_status === 'reserved').length;
      
      const currentSoldCars = allCars.filter(c => c.sale_status === 'sold').length;
      const soldCars = currentSoldCars + HISTORICAL_GARGASH_SOLD;
      
      const weekAgo = dayjs().subtract(7, 'days');
      const soldThisWeek = allCars.filter(c => 
        c.sale_status === 'sold' && dayjs(c.updated_at).isAfter(weekAgo)
      ).length;
      
      // Sold cars analysis
      const soldCarsList = allCars.filter(c => c.sale_status === 'sold');
      
      // Cars added this week
      const carsAddedThisWeek = allCars.filter(c => 
        dayjs(c.created_at).isAfter(weekAgo)
      ).length;
      
      // Conversion rate (sold / total cars including historical)
      const conversionRate = totalCars > 0 ? Math.round((soldCars / totalCars) * 100) : 0;
      
      // Average days to sale (estimate based on stock age of sold cars + historical estimate)
      const HISTORICAL_AVG_DAYS_TO_SALE = 45; // Estimated average for historical sales
      const currentTotalDays = soldCarsList.reduce((sum, car) => sum + (car.stock_age_days || 0), 0);
      const historicalTotalDays = HISTORICAL_GARGASH_SOLD * HISTORICAL_AVG_DAYS_TO_SALE;
      
      const avgDaysToSale = soldCars > 0
        ? Math.round((currentTotalDays + historicalTotalDays) / soldCars)
        : 0;
      
      // Age analysis
      const carsWithAge = inventoryCars.filter(c => c.stock_age_days !== null);
      const avgAge = carsWithAge.length > 0 
        ? Math.round(carsWithAge.reduce((sum, car) => sum + (car.stock_age_days || 0), 0) / carsWithAge.length)
        : 0;
      
      const freshCars = carsWithAge.filter(c => (c.stock_age_days || 0) < 60).length;
      const agingCars = carsWithAge.filter(c => (c.stock_age_days || 0) >= 60 && (c.stock_age_days || 0) < 90).length;
      const oldCars = carsWithAge.filter(c => (c.stock_age_days || 0) >= 90).length;

      // Price analysis
      const avgPrice = inventoryCars.length > 0
        ? Math.round(inventoryCars.reduce((sum, car) => sum + (car.advertised_price_aed || 0), 0) / inventoryCars.length)
        : 0;

      setReportData({
        totalCars,
        avgAge,
        freshCars,
        agingCars,
        oldCars,
        avgPrice,
        reservedCars,
        availableCars,
        soldCars,
        soldThisWeek,
        avgDaysToSale,
        carsAddedThisWeek,
        conversionRate
      });

      // Generate weekly trend (last 12 weeks)
      const weeklyData = [];
      for (let i = 11; i >= 0; i--) {
        const weekStart = dayjs().subtract(i, 'week').startOf('week');
        const weekEnd = dayjs().subtract(i, 'week').endOf('week');
        
        const weekCars = allCars.filter(car => {
          const carDate = dayjs(car.created_at);
          return carDate.isAfter(weekStart) && carDate.isBefore(weekEnd);
        });

        weeklyData.push({
          week: weekStart.format('MMM DD'),
          added: weekCars.length,
          totalInInventory: allCars.filter(car => {
            const carDate = dayjs(car.created_at);
            return carDate.isBefore(weekEnd) && car.status === 'inventory';
          }).length
        });
      }
      setWeeklyTrend(weeklyData);

      // Age distribution for pie chart
      setAgeDistribution([
        { name: 'Fresh (0-59d)', value: freshCars },
        { name: 'Aging (60-89d)', value: agingCars },
        { name: 'Old (90+ days)', value: oldCars }
      ]);

      // Price distribution
      const priceRanges = [
        { name: 'Under 100K', min: 0, max: 100000 },
        { name: '100K-200K', min: 100000, max: 200000 },
        { name: '200K-400K', min: 200000, max: 400000 },
        { name: '400K+', min: 400000, max: Infinity }
      ];

      const priceData = priceRanges.map(range => ({
        name: range.name,
        count: inventoryCars.filter(car => 
          car.advertised_price_aed >= range.min && car.advertised_price_aed < range.max
        ).length
      }));
      setPriceDistribution(priceData);

    } catch (error) {
      console.error('Error in fetchGargashData:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number | null | undefined) => {
    if (!price || price === 0) return '0';
    if (price >= 1000000) return `${(price / 1000000).toFixed(1)}M`;
    if (price >= 1000) return `${Math.round(price / 1000)}K`;
    return price.toString();
  };

  const getStatusColor = (status: string, saleStatus: string) => {
    if (saleStatus === 'reserved') return 'bg-white/20 text-white border-white/30';
    if (saleStatus === 'sold') return 'bg-white/15 text-white/80 border-white/25';
    if (status === 'inventory') return 'bg-white/10 text-white/70 border-white/20';
    return 'bg-white/10 text-white/70 border-white/20';
  };

  const getAgeColor = (days: number | null) => {
    if (!days) return 'text-white/50';
    if (days < 60) return 'text-white';
    if (days < 90) return 'text-white/80';
    return 'text-white/60';
  };

  const handlePrint = () => {
    // Add print styles to maintain dark theme and create two-page layout
    const printStyleSheet = document.createElement('style');
    printStyleSheet.innerHTML = `
      @media print {
        * {
          -webkit-print-color-adjust: exact !important;
          color-adjust: exact !important;
          print-color-adjust: exact !important;
          box-sizing: border-box !important;
        }
        
        html {
          background: black !important;
          margin: 0 !important;
          padding: 0 !important;
        }
        
        body {
          background: black !important;
          color: white !important;
          margin: 0 !important;
          padding: 0 !important;
          font-size: 12px !important;
        }
        
        main {
          background: black !important;
          margin: 0 !important;
          padding: 0 !important;
        }
        
        .bg-black\\/40,
        .bg-white\\/10,
        .bg-white\\/5 {
          background-color: black !important;
          border: 1px solid rgba(255, 255, 255, 0.2) !important;
        }
        
        .text-white {
          color: white !important;
        }
        
        .text-white\\/70 {
          color: rgba(255, 255, 255, 0.7) !important;
        }
        
        .text-white\\/60 {
          color: rgba(255, 255, 255, 0.6) !important;
        }
        
        .text-white\\/50 {
          color: rgba(255, 255, 255, 0.5) !important;
        }
        
        .text-white\\/40 {
          color: rgba(255, 255, 255, 0.4) !important;
        }
        
        .border-white\\/10 {
          border-color: rgba(255, 255, 255, 0.2) !important;
        }
        
        .border-white\\/5 {
          border-color: rgba(255, 255, 255, 0.1) !important;
        }
        
        .print-page-1 {
          height: 100vh !important;
          max-height: 100vh !important;
          page-break-after: always !important;
          overflow: hidden !important;
          background: black !important;
          padding: 0.5rem !important;
          box-sizing: border-box !important;
        }
        
        .print-page-2 {
          height: 100vh !important;
          max-height: 100vh !important;
          background: black !important;
          page-break-before: always !important;
          padding: 0.5rem !important;
          box-sizing: border-box !important;
          overflow: hidden !important;
        }
        
        .page-break {
          page-break-before: always !important;
          break-before: page !important;
        }
        
        @page {
          margin: 0 !important;
          padding: 0 !important;
          background-color: black !important;
          size: A4;
        }
        
        /* Force exactly 2 pages */
        @page:nth(n+3) {
          display: none !important;
        }
        
        @page :first {
          margin: 0 !important;
          background-color: black !important;
        }
        
        @page :left {
          margin: 0 !important;
          background-color: black !important;
        }
        
        @page :right {
          margin: 0 !important;
          background-color: black !important;
        }
        
        /* Hide elements for print */
        .print-hide,
        header {
          display: none !important;
        }
        
        /* Hide all navigation and browser UI */
        nav, .nav, .navigation,
        .header, .top-bar,
        .menu, .sidebar {
          display: none !important;
        }
        
        /* Ultra compact spacing for print */
        .mb-8 { margin-bottom: 0.3rem !important; }
        .mb-6 { margin-bottom: 0.25rem !important; }
        .mb-4 { margin-bottom: 0.2rem !important; }
        .mb-3 { margin-bottom: 0.15rem !important; }
        .mb-2 { margin-bottom: 0.1rem !important; }
        .mb-1 { margin-bottom: 0.05rem !important; }
        .p-6 { padding: 0.3rem !important; }
        .p-4 { padding: 0.25rem !important; }
        .mt-8 { margin-top: 0.2rem !important; }
        .mt-4 { margin-top: 0.15rem !important; }
        .mt-2 { margin-top: 0.1rem !important; }
        .mt-1 { margin-top: 0.05rem !important; }
        
        /* Chart containers */
        .recharts-wrapper {
          max-height: 100px !important;
          height: 100px !important;
        }
        
        /* Grid adjustments */
        .grid {
          gap: 0.1rem !important;
        }
        
        /* Ultra compact text for print */
        body { font-size: 10px !important; }
        h1 { font-size: 0.8rem !important; margin: 0.1rem 0 !important; }
        h2 { font-size: 0.7rem !important; margin: 0.1rem 0 !important; }
        h3 { font-size: 0.6rem !important; margin: 0.1rem 0 !important; }
        p { font-size: 0.5rem !important; margin: 0.05rem 0 !important; }
        .text-3xl { font-size: 1rem !important; }
        .text-2xl { font-size: 0.8rem !important; }
        .text-xl { font-size: 0.7rem !important; }
        .text-lg { font-size: 0.6rem !important; }
        .text-sm { font-size: 0.4rem !important; }
        .text-xs { font-size: 0.35rem !important; }
        
        /* Reduce card padding */
        .bg-white\\/10,
        .bg-black\\/40 {
          padding: 0.2rem !important;
        }
        
        /* Table compact */
        table {
          font-size: 0.4rem !important;
        }
        
        td, th {
          padding: 0.1rem 0.2rem !important;
        }
        
        /* Prevent any content overflow beyond 2 pages */
        * {
          page-break-inside: avoid !important;
        }
        
        .print-page-1 * {
          max-height: none !important;
        }
        
        .print-page-2 * {
          max-height: none !important;
        }
        
        /* Hide any content that might cause additional pages */
        .print-page-2 ~ * {
          display: none !important;
        }
      }
    `;
    
    // Add print styles to head
    document.head.appendChild(printStyleSheet);
    
    // Print
    window.print();
    
    // Remove print styles after printing
    setTimeout(() => {
      document.head.removeChild(printStyleSheet);
    }, 1000);
  };

  return (
    <main className="min-h-screen overflow-y-auto no-scrollbar bg-black print:bg-black">
      <div className="print-hide">

      </div>
      <div className="p-6 text-white print:p-4">
        {/* PAGE 1: Header, KPIs, Charts, Performance Summary */}
        <div className="print-page-1">
          {/* Header Section */}
          <div className="mb-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-4 mb-2">
                <a 
                  href="/dashboard" 
                  className="flex items-center gap-2 text-white/60 hover:text-white transition-colors text-sm print-hide"
                >
                  ← Back to Dashboard
                </a>
              </div>
              <h1 className="text-3xl font-bold text-white">
                Gargash Weekly Report
              </h1>
              <p className="text-white/60 mt-2">
                Consignment Vehicle Performance • Generated {dayjs().format('dddd, MMMM D, YYYY')}
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm text-white/50">Report Period</div>
              <div className="text-lg font-semibold mb-3">
                {dayjs().subtract(7, 'days').format('MMM D')} - {dayjs().format('MMM D, YYYY')}
              </div>
              <button
                onClick={handlePrint}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-sm font-semibold rounded-lg border border-white/10 shadow-lg transition-all duration-200 flex items-center gap-2 print-hide"
              >
                🖨️ Print Report
              </button>
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid gap-2 grid-cols-2 md:grid-cols-5 mb-4 print:text-xs">
          <div className="bg-white/10 backdrop-blur p-4 rounded-xl border border-white/10">
            <div className="text-white/60 text-xs font-medium flex items-center justify-between">
              Total Cars
              <span className="bg-white/20 text-white/70 px-2 py-0.5 rounded text-xs">Includes historical</span>
            </div>
            <div className="text-2xl font-bold text-white mt-1">{loading ? '—' : reportData.totalCars}</div>
            <div className="text-white/40 text-xs mt-1">Complete relationship (+9 historical)</div>
          </div>
          
          <div className="bg-white/10 backdrop-blur p-4 rounded-xl border border-white/10">
            <div className="text-white/60 text-xs font-medium">Available</div>
            <div className="text-2xl font-bold text-white mt-1">{loading ? '—' : reportData.availableCars}</div>
            <div className="text-white/40 text-xs mt-1">Ready for sale</div>
          </div>
          
          <div className="bg-white/10 backdrop-blur p-4 rounded-xl border border-white/10">
            <div className="text-white/60 text-xs font-medium">Reserved</div>
            <div className="text-2xl font-bold text-white mt-1">{loading ? '—' : reportData.reservedCars}</div>
            <div className="text-white/40 text-xs mt-1">Pending delivery</div>
          </div>
          
          <div className="bg-white/10 backdrop-blur p-4 rounded-xl border border-white/10">
            <div className="text-white/60 text-xs font-medium flex items-center justify-between">
              Sold
              <span className="bg-white/20 text-white/70 px-2 py-0.5 rounded text-xs">Includes historical</span>
            </div>
            <div className="text-2xl font-bold text-white mt-1">{loading ? '—' : reportData.soldCars}</div>
            <div className="text-white/40 text-xs mt-1">Total sold (+9 historical)</div>
          </div>
          
          <div className="bg-white/10 backdrop-blur p-4 rounded-xl border border-white/10">
            <div className="text-white/60 text-xs font-medium">Sold This Week</div>
            <div className="text-2xl font-bold text-white mt-1">{loading ? '—' : reportData.soldThisWeek}</div>
            <div className="text-white/40 text-xs mt-1">Last 7 days</div>
          </div>
        </div>

        {/* Additional KPI Row */}
        <div className="grid gap-2 grid-cols-2 md:grid-cols-4 mb-4 print:text-xs">
          <div className="bg-white/10 backdrop-blur p-4 rounded-xl border border-white/10">
            <div className="text-white/60 text-xs font-medium flex items-center justify-between">
              Avg Days to Sale
              <span className="bg-white/20 text-white/70 px-2 py-0.5 rounded text-xs">Est.</span>
            </div>
            <div className="text-2xl font-bold text-white mt-1">{loading ? '—' : `${reportData.avgDaysToSale}d`}</div>
            <div className="text-white/40 text-xs mt-1">Including historical</div>
          </div>
          
          <div className="bg-white/10 backdrop-blur p-4 rounded-xl border border-white/10">
            <div className="text-white/60 text-xs font-medium">Added This Week</div>
            <div className="text-2xl font-bold text-white mt-1">{loading ? '—' : reportData.carsAddedThisWeek}</div>
            <div className="text-white/40 text-xs mt-1">New consignments</div>
          </div>
          
          <div className="bg-white/10 backdrop-blur p-4 rounded-xl border border-white/10">
            <div className="text-white/60 text-xs font-medium">Conversion Rate</div>
            <div className="text-2xl font-bold text-white mt-1">{loading ? '—' : `${reportData.conversionRate}%`}</div>
            <div className="text-white/40 text-xs mt-1">Sold / Total</div>
          </div>
          
          <div className="bg-white/10 backdrop-blur p-4 rounded-xl border border-white/10">
            <div className="text-white/60 text-xs font-medium">Avg Stock Age</div>
            <div className="text-2xl font-bold text-white mt-1">{loading ? '—' : `${reportData.avgAge}d`}</div>
            <div className="text-white/40 text-xs mt-1">Current inventory</div>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid gap-3 lg:grid-cols-2 mb-4">
          {/* Weekly Trend */}
          <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Weekly Inventory Trend</h3>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={weeklyTrend}>
                <XAxis dataKey="week" tick={{ fontSize: 11, fill: '#ffffff60' }} />
                <YAxis tick={{ fontSize: 11, fill: '#ffffff60' }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(0,0,0,0.9)', 
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '8px',
                    color: '#ffffff'
                  }} 
                />
                <Area dataKey="totalInInventory" fill="url(#inventoryGradient)" stroke="#ffffff80" strokeWidth={2} />
                <defs>
                  <linearGradient id="inventoryGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ffffff" stopOpacity={0.6}/>
                    <stop offset="95%" stopColor="#ffffff" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Age Distribution */}
          <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Age Distribution</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={ageDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  dataKey="value"
                >
                  {ageDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={`rgba(255, 255, 255, ${0.8 - index * 0.2})`} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(0,0,0,0.9)', 
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '8px',
                    color: '#ffffff'
                  }} 
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-6 mt-4">
              {ageDistribution.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-white" style={{ opacity: 0.8 - index * 0.2 }}></div>
                  <span className="text-xs text-white/70">{item.name}: {item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Price Distribution Chart */}
        <div className="grid gap-3 lg:grid-cols-2 mb-4">
          <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Price Distribution</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={priceDistribution}>
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#ffffff60' }} />
                <YAxis tick={{ fontSize: 11, fill: '#ffffff60' }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(0,0,0,0.9)', 
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '8px',
                    color: '#ffffff'
                  }} 
                />
                <Bar dataKey="count" fill="#ffffff80" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Key Metrics */}
          <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Performance Summary</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-3 border-b border-white/10">
                <span className="text-white/70">Average Selling Price</span>
                <span className="text-xl font-semibold text-white">AED {formatPrice(reportData.avgPrice)}</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-white/10">
                <span className="text-white/70">Fresh Inventory</span>
                <span className="text-xl font-semibold text-white">{reportData.freshCars} cars (under 60 days)</span>
              </div>
              <div className="flex justify-between items-center py-3">
                <span className="text-white/70">Aging Stock</span>
                <span className="text-xl font-semibold text-white">{reportData.oldCars} cars (over 90 days)</span>
              </div>
            </div>
          </div>
        </div>
        </div>

                {/* PAGE 2: Current Gargash Inventory */}
        <div className="print-page-2 page-break">
          {/* Page 2 Header */}
          <div className="mb-3 text-center print:mb-2">
            <h2 className="text-xl font-bold text-white mb-1 print:text-lg">Gargash Consignment Report</h2>
            <p className="text-white/70 text-sm print:text-xs">Current Inventory Details</p>
          </div>
          
          {/* Car Listing */}
          <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-6">Vehicle Inventory</h3>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : gargashCars.length === 0 ? (
            <p className="text-white/50 text-center py-12">No Gargash cars found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-3 px-4 text-white/70 text-sm font-medium">Stock #</th>
                    <th className="text-left py-3 px-4 text-white/70 text-sm font-medium">Vehicle</th>
                    <th className="text-left py-3 px-4 text-white/70 text-sm font-medium">Price</th>
                    <th className="text-left py-3 px-4 text-white/70 text-sm font-medium">Age</th>
                    <th className="text-left py-3 px-4 text-white/70 text-sm font-medium">Enquiries</th>
                    <th className="text-left py-3 px-4 text-white/70 text-sm font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {gargashCars.map((car) => (
                    <tr key={car.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="py-3 px-4 text-white font-mono text-sm">{car.stock_number}</td>
                      <td className="py-3 px-4 text-white">
                        <div className="text-sm font-medium">{car.model_year} {car.vehicle_model}</div>
                        <div className="text-xs text-white/50">{car.colour}</div>
                      </td>
                      <td className="py-3 px-4 text-white font-semibold">
                        AED {car.advertised_price_aed?.toLocaleString()}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`text-sm font-medium ${getAgeColor(car.stock_age_days)}`}>
                          {car.stock_age_days ? `${car.stock_age_days}d` : '—'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold ${
                            car.lead_count > 0 
                              ? 'bg-green-500/20 text-green-400 border border-green-400/30' 
                              : 'bg-white/10 text-white/40 border border-white/20'
                          }`}>
                            {car.lead_count || 0}
                          </span>
                          {car.lead_count > 0 && (
                            <span className="text-xs text-green-400 font-medium">
                              {car.lead_count === 1 ? 'lead' : 'leads'}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(car.status, car.sale_status)}`}>
                          {car.sale_status || car.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

          {/* Footer */}
          <div className="mt-8 text-center text-white/50 text-sm">
            <p>Generated by SilberArrows CRM • {dayjs().format('YYYY-MM-DD HH:mm')} • Confidential</p>
          </div>
        </div>
      </div>
    </main>
  );
} 