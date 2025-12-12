"use client";
import React, { useState, useEffect, Suspense, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';

import RouteProtector from '@/components/shared/RouteProtector';
import ServiceDashboard from '@/components/shared/ServiceDashboard';
import ServiceDataGrid from '@/components/service/ServiceDataGrid';
import ServiceTargetsManager from '@/components/service/ServiceTargetsManager';
import ReceivablesManager from '@/components/service/ReceivablesManager';
import SalesDataGrid from '@/components/sales/SalesDataGrid';
import SalesTargetsManager from '@/components/sales/SalesTargetsManager';
import SharedSalesDashboard from '@/components/shared/SalesDashboard';
import LeasingDataGrid from '@/components/leasing/LeasingDataGrid';
import LeasingTargetsManager from '@/components/leasing/LeasingTargetsManager';
import LeasingDashboard from '@/components/leasing/LeasingDashboard';
import { useServiceData } from '@/lib/useServiceData';
import { useSalesData } from '@/lib/useSalesData';
import { useLeasingData } from '@/lib/useLeasingData';
import { useAuth } from '@/components/shared/AuthProvider';
import { supabase } from '@/lib/supabaseClient';
import { Building2, Grid3X3, Target, TrendingUp, Calculator, Package, DollarSign, FileText, BarChart3 } from 'lucide-react';
import DirhamIcon from '@/components/ui/DirhamIcon';
import dayjs from 'dayjs';
import { AccountsTabProvider, useAccountsTab } from '@/lib/AccountsTabContext';

// Get time-based greeting
function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

// Sales Filter Component with Greeting
function SalesFilterInline({ salesYear, salesMonth, setSalesYear, setSalesMonth, userName }: {
  salesYear: number;
  salesMonth: number;
  setSalesYear: (year: number) => void;
  setSalesMonth: (month: number) => void;
  userName: string;
}) {
  const greeting = getGreeting();
  
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3 px-3 sm:px-4 py-3 backdrop-blur-md bg-gradient-to-r from-white/10 to-white/5 border border-white/10 rounded-lg shadow-inner mb-4">
      {/* Left side - Greeting */}
      <div className="flex items-center gap-2">
        <span className="text-white text-sm font-medium">{greeting},</span>
        <span className="text-white/80 text-sm">{userName}</span>
      </div>
      
      {/* Right side - Filters */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span className="text-white/60 text-xs font-medium whitespace-nowrap">Year:</span>
          <select
            value={salesYear}
            onChange={(e) => setSalesYear(Number(e.target.value))}
            className="bg-white/10 border border-white/20 text-white rounded px-2 py-1 text-xs focus:outline-none focus:border-white/40 backdrop-blur-sm"
          >
            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
              <option key={year} value={year} className="bg-gray-800 text-white">{year}</option>
            ))}
          </select>
        </div>
        
        <div className="flex items-center gap-1.5">
          <span className="text-white/60 text-xs font-medium whitespace-nowrap">Month:</span>
          <select
            value={salesMonth}
            onChange={(e) => setSalesMonth(Number(e.target.value))}
            className="bg-white/10 border border-white/20 text-white rounded px-2 py-1 text-xs focus:outline-none focus:border-white/40 backdrop-blur-sm"
          >
            {[
              { value: 1, label: 'Jan' },
              { value: 2, label: 'Feb' },
              { value: 3, label: 'Mar' },
              { value: 4, label: 'Apr' },
              { value: 5, label: 'May' },
              { value: 6, label: 'Jun' },
              { value: 7, label: 'Jul' },
              { value: 8, label: 'Aug' },
              { value: 9, label: 'Sep' },
              { value: 10, label: 'Oct' },
              { value: 11, label: 'Nov' },
              { value: 12, label: 'Dec' }
            ].map(month => (
              <option key={month.value} value={month.value} className="bg-gray-800 text-white">
                {month.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

// Leasing Filter Component with Greeting
function LeasingFilterInline({ leasingYear, leasingMonth, setLeasingYear, setLeasingMonth, userName }: {
  leasingYear: number;
  leasingMonth: number;
  setLeasingYear: (year: number) => void;
  setLeasingMonth: (month: number) => void;
  userName: string;
}) {
  const greeting = getGreeting();
  
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3 px-3 sm:px-4 py-3 backdrop-blur-md bg-gradient-to-r from-white/10 to-white/5 border border-white/10 rounded-lg shadow-inner mb-4">
      {/* Left side - Greeting */}
      <div className="flex items-center gap-2">
        <span className="text-white text-sm font-medium">{greeting},</span>
        <span className="text-white/80 text-sm">{userName}</span>
      </div>
      
      {/* Right side - Filters */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span className="text-white/60 text-xs font-medium whitespace-nowrap">Year:</span>
          <select
            value={leasingYear}
            onChange={(e) => setLeasingYear(Number(e.target.value))}
            className="bg-white/10 border border-white/20 text-white rounded px-2 py-1 text-xs focus:outline-none focus:border-white/40 backdrop-blur-sm"
          >
            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
              <option key={year} value={year} className="bg-gray-800 text-white">{year}</option>
            ))}
          </select>
        </div>
        
        <div className="flex items-center gap-1.5">
          <span className="text-white/60 text-xs font-medium whitespace-nowrap">Month:</span>
          <select
            value={leasingMonth}
            onChange={(e) => setLeasingMonth(Number(e.target.value))}
            className="bg-white/10 border border-white/20 text-white rounded px-2 py-1 text-xs focus:outline-none focus:border-white/40 backdrop-blur-sm"
          >
            {[
              { value: 1, label: 'Jan' },
              { value: 2, label: 'Feb' },
              { value: 3, label: 'Mar' },
              { value: 4, label: 'Apr' },
              { value: 5, label: 'May' },
              { value: 6, label: 'Jun' },
              { value: 7, label: 'Jul' },
              { value: 8, label: 'Aug' },
              { value: 9, label: 'Sep' },
              { value: 10, label: 'Oct' },
              { value: 11, label: 'Nov' },
              { value: 12, label: 'Dec' }
            ].map(month => (
              <option key={month.value} value={month.value} className="bg-gray-800 text-white">
                {month.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

function AccountsDashboardContent() {
  const { activeTab, setActiveTab } = useAccountsTab();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  
  const [serviceSubTab, setServiceSubTab] = useState<'dashboard' | 'grid' | 'targets' | 'receivables'>('dashboard');
  const [salesSubTab, setSalesSubTab] = useState<'dashboard' | 'grid' | 'targets'>('dashboard');
  const [leasingSubTab, setLeasingSubTab] = useState<'dashboard' | 'grid' | 'targets'>('dashboard');
  
  // Sales filter state
  const [salesYear, setSalesYear] = useState(new Date().getFullYear());
  const [salesMonth, setSalesMonth] = useState(new Date().getMonth() + 1);
  
  // Leasing filter state
  const [leasingYear, setLeasingYear] = useState(new Date().getFullYear());
  const [leasingMonth, setLeasingMonth] = useState(new Date().getMonth() + 1);
  
  // Get user display name
  const displayName = useMemo(() => {
    if (!user) return 'User';
    if (user.user_metadata?.full_name) {
      return user.user_metadata.full_name;
    }
    if (user.email) {
      const emailPrefix = user.email.split('@')[0];
      return emailPrefix.replace(/\./g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
    return 'User';
  }, [user?.user_metadata?.full_name, user?.email]);
  
  // Set active tab and subtab from URL query parameter on mount
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    const subtabParam = searchParams.get('subtab');
    
    if (tabParam && ['service', 'sales', 'leasing'].includes(tabParam)) {
      setActiveTab(tabParam as 'service' | 'sales' | 'leasing');
    } else {
      // Default to service tab if no tab parameter
      setActiveTab('service');
    }
    
    // Set service subtab from URL
    if (tabParam === 'service' && subtabParam && ['dashboard', 'grid', 'targets', 'receivables'].includes(subtabParam)) {
      setServiceSubTab(subtabParam as 'dashboard' | 'grid' | 'targets' | 'receivables');
    }
    
    // Set sales subtab from URL
    if (tabParam === 'sales' && subtabParam && ['dashboard', 'grid', 'targets'].includes(subtabParam)) {
      setSalesSubTab(subtabParam as 'dashboard' | 'grid' | 'targets');
    }
    
    // Set leasing subtab from URL
    if (tabParam === 'leasing' && subtabParam && ['dashboard', 'grid', 'targets'].includes(subtabParam)) {
      setLeasingSubTab(subtabParam as 'dashboard' | 'grid' | 'targets');
    }
  }, [searchParams, setActiveTab]);
  
  const [allMetrics, setAllMetrics] = useState<any[]>([]);
  const [allTargets, setAllTargets] = useState<any[]>([]);
  const [allSalesMetrics, setAllSalesMetrics] = useState<any[]>([]);
  const [allSalesTargets, setAllSalesTargets] = useState<any[]>([]);
  const [allLeasingMetrics, setAllLeasingMetrics] = useState<any[]>([]);
  const [allLeasingTargets, setAllLeasingTargets] = useState<any[]>([]);
  

  // Service data hooks
  const { 
    loading, 
    submitting, 
    error, 
    submitInputData, 
    fetchAllMetrics, 
    fetchMetricsRange, 
    deleteMetricsForDate 
  } = useServiceData(new Date().toISOString().split('T')[0]);

  // Sales data hooks with filters
  const { 
    loading: salesLoading, 
    error: salesError, 
    fetchSalesMetrics, 
    submitSalesData, 
    deleteSalesData 
  } = useSalesData();

  // Leasing data hooks
  const { 
    loading: leasingLoading, 
    error: leasingError, 
    fetchLeasingMetrics, 
    submitLeasingData, 
    deleteLeasingData 
  } = useLeasingData();


  const handleTabChange = (tab: string) => {
    setActiveTab(tab as 'service' | 'sales' | 'leasing');
  };

  const handleSubmitData = async (data: any) => {
    try {
      const success = await submitInputData(data);
      if (success) {
        await handleGridRefresh();
      }
      return success;
    } catch (error) {
      return false;
    }
  };

  const fetchAllTargets = async () => {
    try {
      const { data: targets, error } = await supabase
        .from('service_monthly_targets')
        .select('*')
        .order('year', { ascending: false })
        .order('month', { ascending: false });
      
      if (error) {
        return [];
      }
      
      setAllTargets(targets || []);
      return targets || [];
    } catch (error) {
      return [];
    }
  };

  const fetchAllSalesTargets = async () => {
    try {
      const { data: salesTargets, error } = await supabase
        .from('sales_monthly_targets')
        .select('*')
        .order('year', { ascending: false })
        .order('month', { ascending: false });
      
      if (error) {
        return [];
      }
      
      setAllSalesTargets(salesTargets || []);
      return salesTargets || [];
    } catch (error) {
      return [];
    }
  };

  const fetchAllLeasingTargets = async () => {
    try {
      const { data: leasingTargets, error } = await supabase
        .from('leasing_monthly_targets')
        .select('*')
        .order('year', { ascending: false })
        .order('month', { ascending: false });
      
      if (error) {
        return [];
      }
      
      setAllLeasingTargets(leasingTargets || []);
      return leasingTargets || [];
    } catch (error) {
      return [];
    }
  };

  const handleGridRefresh = async () => {
    if (activeTab === 'service') {
      try {
        const [metrics, targets] = await Promise.all([
          fetchAllMetrics(),
          fetchAllTargets()
        ]);
        setAllMetrics(metrics);
        setAllTargets(targets);
      } catch (error) {
      }
    } else if (activeTab === 'sales') {
      try {
        const [salesMetrics, salesTargets] = await Promise.all([
          fetchSalesMetrics(),
          fetchAllSalesTargets()
        ]);
        setAllSalesMetrics(salesMetrics);
        setAllSalesTargets(salesTargets);
      } catch (error) {
      }
    } else if (activeTab === 'leasing') {
      try {
        const [leasingMetrics, leasingTargets] = await Promise.all([
          fetchLeasingMetrics(),
          fetchAllLeasingTargets()
        ]);
        setAllLeasingMetrics(leasingMetrics);
        setAllLeasingTargets(leasingTargets);
      } catch (error) {
      }
    }
  };

  const handleServiceSubTabChange = async (tab: 'dashboard' | 'grid' | 'targets' | 'receivables') => {
    setServiceSubTab(tab);
    if (tab === 'dashboard' || tab === 'grid' || tab === 'targets') {
      await handleGridRefresh();
    }
  };

  const handleFetchMetricsRange = async (filter: any) => {
    if (filter.startDate && filter.endDate) {
      return await fetchMetricsRange(filter.startDate, filter.endDate);
    }
    return [];
  };

  const handleSalesSubTabChange = async (tab: 'dashboard' | 'grid' | 'targets') => {
    setSalesSubTab(tab);
    await handleGridRefresh();
  };

  const handleLeasingSubTabChange = async (tab: 'dashboard' | 'grid' | 'targets') => {
    setLeasingSubTab(tab);
    await handleGridRefresh();
  };

  const handleSalesSubmitData = async (data: any) => {
    try {
      const success = await submitSalesData(data);
      if (success) {
        await handleGridRefresh();
      }
      return success;
    } catch (error) {
      return false;
    }
  };

  const handleLeasingSubmitData = async (data: any) => {
    try {
      const success = await submitLeasingData(data);
      if (success) {
        await handleGridRefresh();
      }
      return success;
    } catch (error) {
      return false;
    }
  };

  // Load grid data on component mount and tab change
  useEffect(() => {
    handleGridRefresh();
  }, [activeTab, fetchAllMetrics, fetchSalesMetrics, fetchLeasingMetrics]);



  return (
    <RouteProtector moduleName="accounts">
      <div className="w-full bg-black min-h-full">
        <div className="w-full px-4 py-4">

            {/* Content */}
            <div className="space-y-6">
              {activeTab === 'service' ? (
                <>

                  {serviceSubTab === 'dashboard' && (
                    <ServiceDashboard
                      metrics={allMetrics}
                      targets={allTargets}
                      loading={loading}
                    />
                  )}
                  {serviceSubTab === 'grid' && (
                    <ServiceDataGrid
                      metrics={allMetrics}
                      targets={allTargets}
                      onSubmit={handleSubmitData}
                      onRefresh={handleGridRefresh}
                      onDelete={deleteMetricsForDate}
                      loading={loading}
                      submitting={submitting}
                      error={error}
                    />
                  )}
                  {serviceSubTab === 'targets' && (
                    <ServiceTargetsManager
                      targets={allTargets}
                      onRefresh={handleGridRefresh}
                      loading={loading}
                    />
                  )}
                  {serviceSubTab === 'receivables' && (
                    <ReceivablesManager
                      onRefresh={handleGridRefresh}
                    />
                  )}
                </>
              ) : activeTab === 'sales' ? (
                <>
                  {salesSubTab === 'dashboard' && !salesLoading && (
                    <>
                      <SalesFilterInline 
                        salesYear={salesYear}
                        salesMonth={salesMonth}
                        setSalesYear={setSalesYear}
                        setSalesMonth={setSalesMonth}
                        userName={displayName}
                      />
                      <SharedSalesDashboard 
                        metrics={allSalesMetrics} 
                        targets={allSalesTargets}
                        loading={false}
                        salesYear={salesYear}
                        salesMonth={salesMonth}
                      />
                    </>
                  )}
                  {salesSubTab === 'grid' && (
                    <SalesDataGrid
                      metrics={allSalesMetrics}
                      targets={allSalesTargets}
                      onSubmit={handleSalesSubmitData}
                      onRefresh={handleGridRefresh}
                      onDelete={deleteSalesData}
                      loading={salesLoading}
                      error={salesError}
                    />
                  )}
                  {salesSubTab === 'targets' && (
                    <SalesTargetsManager
                      targets={allSalesTargets}
                      onRefresh={handleGridRefresh}
                      loading={salesLoading}
                    />
                  )}
                </>
              ) : activeTab === 'leasing' ? (
                <>
                  {leasingSubTab === 'dashboard' && !leasingLoading && (
                    <>
                      <LeasingFilterInline 
                        leasingYear={leasingYear}
                        leasingMonth={leasingMonth}
                        setLeasingYear={setLeasingYear}
                        setLeasingMonth={setLeasingMonth}
                        userName={displayName}
                      />
                      <LeasingDashboard 
                        metrics={allLeasingMetrics} 
                        targets={allLeasingTargets}
                        loading={false}
                        leasingYear={leasingYear}
                        leasingMonth={leasingMonth}
                      />
                    </>
                  )}
                  {leasingSubTab === 'grid' && (
                    <LeasingDataGrid
                      metrics={allLeasingMetrics}
                      targets={allLeasingTargets}
                      onSubmit={handleLeasingSubmitData}
                      onRefresh={handleGridRefresh}
                      onDelete={deleteLeasingData}
                      loading={leasingLoading}
                      error={leasingError}
                    />
                  )}
                  {leasingSubTab === 'targets' && (
                    <LeasingTargetsManager
                      targets={allLeasingTargets}
                      onRefresh={handleGridRefresh}
                      loading={leasingLoading}
                    />
                  )}
                </>
              ) : (
                // Fallback - should not reach here
                <div className="flex items-center justify-center h-[calc(100vh-300px)]">
                  <div className="text-center">
                    <div className="w-32 h-32 mx-auto mb-8 bg-white/5 backdrop-blur border border-white/10 rounded-full flex items-center justify-center">
                      <Building2 className="w-16 h-16 text-white/20" />
                    </div>
                    <h2 className="text-2xl font-semibold text-white mb-2">Select a Department</h2>
                    <p className="text-white/70 max-w-md mx-auto">
                      Choose a department from the sidebar to view analytics.
                    </p>
                  </div>
                </div>
              )}
            </div>


        </div>
      </div>
    </RouteProtector>
  );
}

export default function AccountsDashboard() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen bg-black"><div className="text-white">Loading...</div></div>}>
      <AccountsDashboardContent />
    </Suspense>
  );
}
