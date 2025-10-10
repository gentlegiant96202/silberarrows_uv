"use client";
import React, { useState, useEffect } from 'react';

import RouteProtector from '@/components/shared/RouteProtector';
import ServiceDashboard from '@/components/service/ServiceDashboard';
import ServiceDataGrid from '@/components/service/ServiceDataGrid';
import ServiceTargetsManager from '@/components/service/ServiceTargetsManager';
import SalesDataGrid from '@/components/sales/SalesDataGrid';
import SalesTargetsManager from '@/components/sales/SalesTargetsManager';
import SharedSalesDashboard from '@/components/shared/SalesDashboard';
import ReservationsInvoicesGrid from '@/components/shared/accounting/ReservationsInvoicesGrid';
import { useServiceData } from '@/lib/useServiceData';
import { useSalesData } from '@/lib/useSalesData';
import { supabase } from '@/lib/supabaseClient';
import { Building2, Grid3X3, Target, TrendingUp, Calculator, Package, DollarSign, FileText, BarChart3 } from 'lucide-react';
import dayjs from 'dayjs';
import { AccountsTabProvider, useAccountsTab } from '@/lib/AccountsTabContext';

function AccountsDashboardContent() {
  const { activeTab, setActiveTab } = useAccountsTab();
  const [serviceSubTab, setServiceSubTab] = useState<'dashboard' | 'grid' | 'targets'>('dashboard');
  const [salesSubTab, setSalesSubTab] = useState<'dashboard' | 'grid' | 'targets' | 'accounting'>('dashboard');
  const [allMetrics, setAllMetrics] = useState<any[]>([]);
  const [allTargets, setAllTargets] = useState<any[]>([]);
  const [allSalesMetrics, setAllSalesMetrics] = useState<any[]>([]);
  const [allSalesTargets, setAllSalesTargets] = useState<any[]>([]);
  


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
      console.error('Error submitting data:', error);
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
        console.error('Error fetching targets:', error);
        return [];
      }
      
      setAllTargets(targets || []);
      return targets || [];
    } catch (error) {
      console.error('Error fetching targets:', error);
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
        console.error('Error fetching sales targets:', error);
        return [];
      }
      
      setAllSalesTargets(salesTargets || []);
      return salesTargets || [];
    } catch (error) {
      console.error('Error fetching sales targets:', error);
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
        console.error('Error refreshing service data:', error);
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
        console.error('Error refreshing sales data:', error);
      }
    }
  };

  const handleServiceSubTabChange = async (tab: 'dashboard' | 'grid' | 'targets') => {
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

  const handleSalesSubTabChange = async (tab: 'dashboard' | 'grid' | 'targets' | 'accounting') => {
    setSalesSubTab(tab);
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
      console.error('Error submitting sales data:', error);
      return false;
    }
  };

  // Load grid data on component mount and tab change
  useEffect(() => {
    handleGridRefresh();
  }, [activeTab, fetchAllMetrics, fetchSalesMetrics]);



  return (
    <RouteProtector moduleName="accounts">
      <div className="min-h-screen bg-black">

        <div className="w-full">
          <div className="w-full px-4 py-4">
            

            {/* Service Sub-Navigation */}
            {activeTab === 'service' && (
              <div className="mb-6">
                <div className="flex space-x-1 bg-gray-900/50 p-1 rounded-lg border border-gray-700/50 backdrop-blur-sm">

                  <button
                    onClick={() => handleServiceSubTabChange('dashboard')}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                      serviceSubTab === 'dashboard'
                        ? 'bg-gradient-to-r from-gray-600 to-gray-700 text-white shadow-md'
                        : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                    }`}
                  >
                    <BarChart3 className="w-4 h-4" />
                    <span>Dashboard</span>
                  </button>
                  <button
                    onClick={() => handleServiceSubTabChange('grid')}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                      serviceSubTab === 'grid'
                        ? 'bg-gradient-to-r from-gray-600 to-gray-700 text-white shadow-md'
                        : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                    }`}
                  >
                    <Grid3X3 className="w-4 h-4" />
                    <span>Data Grid</span>
                  </button>
                  <button
                    onClick={() => handleServiceSubTabChange('targets')}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                      serviceSubTab === 'targets'
                        ? 'bg-gradient-to-r from-gray-600 to-gray-700 text-white shadow-md'
                        : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                    }`}
                  >
                    <Target className="w-4 h-4" />
                    <span>Targets</span>
                  </button>
                </div>
              </div>
            )}

            {/* Sales Sub-Navigation */}
            {activeTab === 'sales' && (
              <div className="mb-6">
                <div className="flex space-x-1 bg-gray-900/50 p-1 rounded-lg border border-gray-700/50 backdrop-blur-sm">

                  <button
                    onClick={() => handleSalesSubTabChange('dashboard')}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                      salesSubTab === 'dashboard'
                        ? 'bg-gradient-to-r from-gray-600 to-gray-700 text-white shadow-md'
                        : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                    }`}
                  >
                    <TrendingUp className="w-4 h-4" />
                    <span>Dashboard</span>
                  </button>
                  <button
                    onClick={() => handleSalesSubTabChange('grid')}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                      salesSubTab === 'grid'
                        ? 'bg-gradient-to-r from-gray-600 to-gray-700 text-white shadow-md'
                        : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                    }`}
                  >
                    <Grid3X3 className="w-4 h-4" />
                    <span>Data Grid</span>
                  </button>
                  <button
                    onClick={() => handleSalesSubTabChange('targets')}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                      salesSubTab === 'targets'
                        ? 'bg-gradient-to-r from-gray-600 to-gray-700 text-white shadow-md'
                        : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                    }`}
                  >
                    <Target className="w-4 h-4" />
                    <span>Targets</span>
                  </button>
                  <button
                    onClick={() => handleSalesSubTabChange('accounting')}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                      salesSubTab === 'accounting'
                        ? 'bg-gradient-to-r from-gray-600 to-gray-700 text-white shadow-md'
                        : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                    }`}
                  >
                    <FileText className="w-4 h-4" />
                    <span>Accounting</span>
                  </button>
                </div>
              </div>
            )}

            {/* Loading State */}
            {/* The 'calculating' state is no longer destructured from useServiceData,
                so this block will always show loading if 'loading' is true.
                If 'loading' is false, it will show the content based on activeTab and serviceSubTab. */}
            {(loading || salesLoading) && (
              <div className="mb-6 p-4 backdrop-blur-md bg-gradient-to-r from-blue-900/40 via-blue-800/30 to-blue-700/40 border border-blue-500/30 rounded-lg flex items-center space-x-3 shadow-lg">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-400/20 border-t-blue-400"></div>
                <span className="text-blue-100">
                  {activeTab === 'sales' ? 'Loading sales data...' : 'Loading service data...'}
                </span>
              </div>
            )}

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
                </>
              ) : activeTab === 'sales' ? (
                <>
                  {salesSubTab === 'dashboard' && !salesLoading && (
                    <SharedSalesDashboard 
                      metrics={allSalesMetrics} 
                      targets={allSalesTargets}
                      loading={false}
                    />
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
                  {salesSubTab === 'accounting' && (
                    <ReservationsInvoicesGrid />
                  )}
                </>
              ) : (
                // Coming Soon for Leasing
                <div className="flex items-center justify-center h-[calc(100vh-300px)]">
                  <div className="text-center">
                    <div className="w-32 h-32 mx-auto mb-8 bg-white/5 backdrop-blur border border-white/10 rounded-full flex items-center justify-center">
                      <Building2 className="w-16 h-16 text-white/20" />
                    </div>
                    <div className="text-6xl mb-4">🚧</div>
                    <h2 className="text-2xl font-semibold text-white mb-2">Coming Soon</h2>
                    <p className="text-white/70 max-w-md mx-auto">
                      The <span className="text-white font-semibold">{activeTab.toUpperCase()}</span> department analytics and tracking system is under development.
                    </p>
                    <div className="mt-6 text-sm text-white/50">
                      Available: Service Department ✓ | Sales Department ✓
                    </div>
                  </div>
                </div>
              )}
            </div>


          </div>
        </div>
      </div>
    </RouteProtector>
  );
}

export default function AccountsDashboard() {
  return <AccountsDashboardContent />;
} 