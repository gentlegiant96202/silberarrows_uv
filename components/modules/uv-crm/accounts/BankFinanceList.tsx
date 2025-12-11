"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import * as XLSX from 'xlsx';
import { 
  Building2,
  RefreshCw,
  Filter,
  Download,
  Search,
  X,
  Loader2,
  AlertCircle,
  ExternalLink,
  Clock,
  CheckCircle,
  XCircle,
  FileText,
  Calendar
} from 'lucide-react';
import SalesOrderModal from '../modals/SalesOrderModal';

// ===== INTERFACES =====
interface BankFinanceApplication {
  id: string;
  sales_order_id: string;
  lead_id: string;
  application_number: number;
  status: string;
  bank_name: string | null;
  bank_finance_amount: number | null;
  approved_amount: number | null;
  bank_reference: string | null;
  rejection_reason: string | null;
  created_at: string;
  decision_at: string | null;
  processing_duration: string | null;
  customer_docs_count: number;
  bank_docs_count: number;
  // From joins
  customer_name?: string;
  customer_number?: string;
  sales_order_number?: string;
  vehicle_info?: string;
}

interface BankFinanceSummary {
  total_applications: number;
  pending_count: number;
  docs_collection_count: number;
  submitted_count: number;
  approved_count: number;
  declined_count: number;
  total_approved_amount: number;
}

interface FilterState {
  fromDate: string;
  toDate: string;
  status: string;
  searchQuery: string;
  customerId: string;
}

interface Customer {
  id: string;
  full_name: string;
  customer_number: string;
  phone_number: string;
}

// ===== HELPER FUNCTIONS =====
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-AE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', { 
    day: '2-digit', 
    month: 'short', 
    year: 'numeric' 
  });
};

const getStatusColor = (status: string) => {
  switch (status?.toLowerCase()) {
    case 'pending': return 'text-gray-400 bg-gray-500/10';
    case 'docs_collection': return 'text-blue-400 bg-blue-500/10';
    case 'submitted': return 'text-purple-400 bg-purple-500/10';
    case 'under_review': return 'text-amber-400 bg-amber-500/10';
    case 'approved': return 'text-green-400 bg-green-500/10';
    case 'declined': return 'text-red-400 bg-red-500/10';
    case 'cancelled': return 'text-white/40 bg-white/5';
    default: return 'text-white/70 bg-white/5';
  }
};

const getStatusIcon = (status: string) => {
  switch (status?.toLowerCase()) {
    case 'pending': return <Clock className="w-3 h-3" />;
    case 'docs_collection': return <FileText className="w-3 h-3" />;
    case 'submitted': return <Building2 className="w-3 h-3" />;
    case 'under_review': return <Clock className="w-3 h-3" />;
    case 'approved': return <CheckCircle className="w-3 h-3" />;
    case 'declined': return <XCircle className="w-3 h-3" />;
    case 'cancelled': return <X className="w-3 h-3" />;
    default: return <Clock className="w-3 h-3" />;
  }
};

const getStatusLabel = (status: string) => {
  switch (status?.toLowerCase()) {
    case 'pending': return 'Pending';
    case 'docs_collection': return 'Docs Collection';
    case 'submitted': return 'Submitted';
    case 'under_review': return 'Under Review';
    case 'approved': return 'Approved';
    case 'declined': return 'Declined';
    case 'cancelled': return 'Cancelled';
    default: return status || 'Unknown';
  }
};

// ===== MAIN COMPONENT =====
export default function BankFinanceList() {
  const [applications, setApplications] = useState<BankFinanceApplication[]>([]);
  const [summary, setSummary] = useState<BankFinanceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [offset, setOffset] = useState(0);
  const LIMIT = 50;

  // Customer list for dropdown
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  // Modal state
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [loadingLead, setLoadingLead] = useState<string | null>(null);

  const [filters, setFilters] = useState<FilterState>({
    fromDate: '',
    toDate: '',
    status: '',
    searchQuery: '',
    customerId: ''
  });

  // Selected customer display
  const [selectedCustomerDisplay, setSelectedCustomerDisplay] = useState('');

  // Load customers for dropdown
  const loadCustomers = useCallback(async (search: string = '') => {
    setLoadingCustomers(true);
    try {
      let query = supabase
        .from('leads')
        .select('id, full_name, customer_number, phone_number')
        .not('customer_number', 'is', null)
        .order('full_name')
        .limit(20);

      if (search) {
        query = query.or(`full_name.ilike.%${search}%,customer_number.ilike.%${search}%,phone_number.ilike.%${search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error loading customers:', error);
    } finally {
      setLoadingCustomers(false);
    }
  }, []);

  // Load bank finance applications
  const loadApplications = useCallback(async (reset: boolean = false) => {
    if (reset) {
      setLoading(true);
      setOffset(0);
    } else {
      setLoadingMore(true);
    }

    try {
      const currentOffset = reset ? 0 : offset;
      
      // Query from uv_bank_finance_summary view
      let query = supabase
        .from('uv_bank_finance_summary')
        .select('*')
        .order('created_at', { ascending: false })
        .range(currentOffset, currentOffset + LIMIT - 1);

      // Apply filters
      if (filters.fromDate) {
        query = query.gte('created_at', filters.fromDate);
      }
      if (filters.toDate) {
        query = query.lte('created_at', filters.toDate + 'T23:59:59');
      }
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.customerId) {
        query = query.eq('lead_id', filters.customerId);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Get unique lead IDs and sales order IDs to fetch additional info
      const leadIds = [...new Set((data || []).map(a => a.lead_id))];
      const soIds = [...new Set((data || []).map(a => a.sales_order_id))];
      
      // Fetch customer info
      let leadsMap: Record<string, { full_name: string; customer_number: string }> = {};
      if (leadIds.length > 0) {
        const { data: leads } = await supabase
          .from('leads')
          .select('id, full_name, customer_number')
          .in('id', leadIds);
        
        if (leads) {
          leadsMap = leads.reduce((acc, lead) => {
            acc[lead.id] = { full_name: lead.full_name || '', customer_number: lead.customer_number || '' };
            return acc;
          }, {} as Record<string, any>);
        }
      }

      // Fetch sales order info
      let soMap: Record<string, { so_number: string; vehicle_info: string }> = {};
      if (soIds.length > 0) {
        const { data: salesOrders } = await supabase
          .from('uv_sales_orders')
          .select('id, so_number, vehicle_make, vehicle_model')
          .in('id', soIds);
        
        if (salesOrders) {
          soMap = salesOrders.reduce((acc, so) => {
            acc[so.id] = { 
              so_number: so.so_number || '', 
              vehicle_info: [so.vehicle_make, so.vehicle_model].filter(Boolean).join(' ') || ''
            };
            return acc;
          }, {} as Record<string, any>);
        }
      }

      // Transform data
      const transformedData = (data || []).map(app => ({
        ...app,
        customer_name: leadsMap[app.lead_id]?.full_name || 'Unknown',
        customer_number: leadsMap[app.lead_id]?.customer_number || '',
        sales_order_number: soMap[app.sales_order_id]?.so_number || '',
        vehicle_info: soMap[app.sales_order_id]?.vehicle_info || ''
      })).filter(app => {
        // Apply search filter client-side
        if (filters.searchQuery) {
          const search = filters.searchQuery.toLowerCase();
          return (
            app.customer_name?.toLowerCase().includes(search) ||
            app.customer_number?.toLowerCase().includes(search) ||
            app.sales_order_number?.toLowerCase().includes(search) ||
            app.bank_name?.toLowerCase().includes(search) ||
            app.vehicle_info?.toLowerCase().includes(search)
          );
        }
        return true;
      });

      if (reset) {
        setApplications(transformedData);
      } else {
        setApplications(prev => [...prev, ...transformedData]);
      }

      setHasMore((data?.length || 0) === LIMIT);
      setOffset(currentOffset + LIMIT);
    } catch (error) {
      console.error('Error loading bank finance applications:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [filters, offset]);

  // Load summary
  const loadSummary = useCallback(async () => {
    try {
      let query = supabase
        .from('uv_bank_finance_summary')
        .select('status, approved_amount');

      if (filters.fromDate) {
        query = query.gte('created_at', filters.fromDate);
      }
      if (filters.toDate) {
        query = query.lte('created_at', filters.toDate + 'T23:59:59');
      }
      if (filters.customerId) {
        query = query.eq('lead_id', filters.customerId);
      }

      const { data, error } = await query;

      if (error) throw error;

      if (data && data.length > 0) {
        const summary = data.reduce((acc, app) => {
          acc.total_applications++;
          if (app.status === 'pending') acc.pending_count++;
          if (app.status === 'docs_collection') acc.docs_collection_count++;
          if (app.status === 'submitted' || app.status === 'under_review') acc.submitted_count++;
          if (app.status === 'approved') {
            acc.approved_count++;
            acc.total_approved_amount += app.approved_amount || 0;
          }
          if (app.status === 'declined') acc.declined_count++;
          return acc;
        }, { 
          total_applications: 0, 
          pending_count: 0, 
          docs_collection_count: 0, 
          submitted_count: 0, 
          approved_count: 0, 
          declined_count: 0, 
          total_approved_amount: 0 
        });
        
        setSummary(summary);
      } else {
        setSummary({ 
          total_applications: 0, 
          pending_count: 0, 
          docs_collection_count: 0, 
          submitted_count: 0, 
          approved_count: 0, 
          declined_count: 0, 
          total_approved_amount: 0 
        });
      }
    } catch (error) {
      console.error('Error loading summary:', error);
    }
  }, [filters.fromDate, filters.toDate, filters.customerId]);

  // Open customer account modal
  const openCustomerModal = async (leadId: string) => {
    setLoadingLead(leadId);
    try {
      const { data: lead, error } = await supabase
        .from('leads')
        .select('*')
        .eq('id', leadId)
        .single();

      if (error) throw error;
      
      if (lead) {
        setSelectedLead(lead);
        setShowAccountModal(true);
      }
    } catch (error) {
      console.error('Error loading lead:', error);
    } finally {
      setLoadingLead(null);
    }
  };

  // Initial load
  useEffect(() => {
    loadApplications(true);
    loadSummary();
    loadCustomers();
  }, []);

  // Reload when filters change
  const applyFilters = () => {
    loadApplications(true);
    loadSummary();
  };

  const clearFilters = () => {
    setFilters({
      fromDate: '',
      toDate: '',
      status: '',
      searchQuery: '',
      customerId: ''
    });
    setSelectedCustomerDisplay('');
    setTimeout(() => {
      loadApplications(true);
      loadSummary();
    }, 0);
  };

  const selectCustomer = (customer: Customer) => {
    setFilters(prev => ({ ...prev, customerId: customer.id }));
    setSelectedCustomerDisplay(`${customer.customer_number} • ${customer.full_name}`);
    setShowCustomerDropdown(false);
    setCustomerSearch('');
  };

  const clearCustomer = () => {
    setFilters(prev => ({ ...prev, customerId: '' }));
    setSelectedCustomerDisplay('');
  };

  const hasActiveFilters = filters.fromDate || filters.toDate || filters.status || filters.searchQuery || filters.customerId;

  // Export to Excel
  const handleExport = async () => {
    try {
      let query = supabase
        .from('uv_bank_finance_summary')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters.fromDate) query = query.gte('created_at', filters.fromDate);
      if (filters.toDate) query = query.lte('created_at', filters.toDate + 'T23:59:59');
      if (filters.status) query = query.eq('status', filters.status);
      if (filters.customerId) query = query.eq('lead_id', filters.customerId);

      const { data, error } = await query;
      if (error) throw error;

      if (!data || data.length === 0) {
        alert('No data to export');
        return;
      }

      // Fetch customer info
      const leadIds = [...new Set(data.map(a => a.lead_id))];
      let leadsMap: Record<string, { full_name: string; customer_number: string }> = {};
      if (leadIds.length > 0) {
        const { data: leads } = await supabase
          .from('leads')
          .select('id, full_name, customer_number')
          .in('id', leadIds);
        
        if (leads) {
          leadsMap = leads.reduce((acc, lead) => {
            acc[lead.id] = { full_name: lead.full_name || '', customer_number: lead.customer_number || '' };
            return acc;
          }, {} as Record<string, any>);
        }
      }

      const excelData = data.map(app => ({
        'Date': formatDate(app.created_at),
        'Customer #': leadsMap[app.lead_id]?.customer_number || '',
        'Customer': leadsMap[app.lead_id]?.full_name || '',
        'Bank': app.bank_name || '',
        'Status': getStatusLabel(app.status),
        'Finance Amount': app.bank_finance_amount || '',
        'Approved Amount': app.approved_amount || '',
        'Bank Ref': app.bank_reference || '',
        'Customer Docs': app.customer_docs_count || 0,
        'Bank Docs': app.bank_docs_count || 0,
      }));

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(excelData);

      ws['!cols'] = [
        { wch: 12 }, { wch: 12 }, { wch: 25 }, { wch: 20 },
        { wch: 14 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 12 }
      ];

      XLSX.utils.book_append_sheet(wb, ws, 'Bank Finance');

      const dateStr = new Date().toISOString().split('T')[0];
      XLSX.writeFile(wb, `Bank_Finance_${dateStr}.xlsx`);
    } catch (error) {
      console.error('Error exporting:', error);
      alert('Error exporting data');
    }
  };

  return (
    <div className="h-full flex flex-col bg-black text-white">
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/10">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-white">Bank Finance Applications</h1>
            <p className="text-sm text-white/50">All bank finance applications • Click row to open account</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => { loadApplications(true); loadSummary(); }}
              className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                showFilters || hasActiveFilters 
                  ? 'bg-white/20 text-white' 
                  : 'bg-white/10 text-white/70 hover:bg-white/15'
              }`}
            >
              <Filter className="w-4 h-4" />
              Filters
              {hasActiveFilters && (
                <span className="w-2 h-2 rounded-full bg-green-400" />
              )}
            </button>
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-3 py-2 bg-white/10 text-white/70 hover:bg-white/15 rounded-lg transition-colors"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-6 gap-4 mb-4">
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <div className="flex items-center gap-2 text-white/50 text-xs mb-1">
                <Building2 className="w-3.5 h-3.5" />
                TOTAL
              </div>
              <p className="text-lg font-bold text-white">{summary.total_applications}</p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <div className="flex items-center gap-2 text-gray-400/70 text-xs mb-1">
                <Clock className="w-3.5 h-3.5" />
                PENDING
              </div>
              <p className="text-lg font-bold text-gray-400">{summary.pending_count}</p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <div className="flex items-center gap-2 text-blue-400/70 text-xs mb-1">
                <FileText className="w-3.5 h-3.5" />
                DOCS COLLECTION
              </div>
              <p className="text-lg font-bold text-blue-400">{summary.docs_collection_count}</p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <div className="flex items-center gap-2 text-purple-400/70 text-xs mb-1">
                <Building2 className="w-3.5 h-3.5" />
                SUBMITTED
              </div>
              <p className="text-lg font-bold text-purple-400">{summary.submitted_count}</p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <div className="flex items-center gap-2 text-green-400/70 text-xs mb-1">
                <CheckCircle className="w-3.5 h-3.5" />
                APPROVED
              </div>
              <p className="text-lg font-bold text-green-400">{summary.approved_count}</p>
            </div>
            <div className="bg-gradient-to-br from-green-500/20 to-green-500/5 border border-green-500/30 rounded-xl p-4">
              <div className="flex items-center gap-2 text-green-400/70 text-xs mb-1">
                <CheckCircle className="w-3.5 h-3.5" />
                APPROVED VALUE
              </div>
              <p className="text-lg font-bold text-green-400">AED {formatCurrency(summary.total_approved_amount)}</p>
            </div>
          </div>
        )}

        {/* Filters Panel */}
        {showFilters && (
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-4">
            <div className="grid grid-cols-6 gap-4">
              {/* Customer Filter */}
              <div className="col-span-2 relative">
                <label className="block text-xs text-white/50 mb-1">Customer (CIN or Name)</label>
                {selectedCustomerDisplay ? (
                  <div className="flex items-center gap-2 px-3 py-2 bg-black border border-white/20 rounded-lg">
                    <span className="text-white text-sm flex-1 truncate">{selectedCustomerDisplay}</span>
                    <button onClick={clearCustomer} className="text-white/40 hover:text-white">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                    <input
                      type="text"
                      value={customerSearch}
                      onChange={(e) => {
                        setCustomerSearch(e.target.value);
                        loadCustomers(e.target.value);
                        setShowCustomerDropdown(true);
                      }}
                      onFocus={() => {
                        loadCustomers(customerSearch);
                        setShowCustomerDropdown(true);
                      }}
                      placeholder="Search CIN-1057, John..."
                      className="w-full pl-9 pr-3 py-2 bg-black border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:border-white/40 placeholder:text-white/30"
                    />
                    {showCustomerDropdown && (
                      <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-black border border-white/20 rounded-lg shadow-xl max-h-60 overflow-auto">
                        {loadingCustomers ? (
                          <div className="p-3 text-center text-white/50">
                            <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                            Loading...
                          </div>
                        ) : customers.length === 0 ? (
                          <div className="p-3 text-center text-white/50">No customers found</div>
                        ) : (
                          customers.map(customer => (
                            <button
                              key={customer.id}
                              onClick={() => selectCustomer(customer)}
                              className="w-full px-3 py-2 text-left hover:bg-white/10 transition-colors"
                            >
                              <span className="text-amber-400 font-mono text-xs">{customer.customer_number}</span>
                              <span className="text-white/30 mx-2">•</span>
                              <span className="text-white text-sm">{customer.full_name}</span>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs text-white/50 mb-1">From Date</label>
                <input
                  type="date"
                  value={filters.fromDate}
                  onChange={(e) => setFilters(prev => ({ ...prev, fromDate: e.target.value }))}
                  className="w-full px-3 py-2 bg-black border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:border-white/40"
                />
              </div>
              <div>
                <label className="block text-xs text-white/50 mb-1">To Date</label>
                <input
                  type="date"
                  value={filters.toDate}
                  onChange={(e) => setFilters(prev => ({ ...prev, toDate: e.target.value }))}
                  className="w-full px-3 py-2 bg-black border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:border-white/40"
                />
              </div>
              <div>
                <label className="block text-xs text-white/50 mb-1">Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full px-3 py-2 bg-black border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:border-white/40"
                >
                  <option value="">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="docs_collection">Docs Collection</option>
                  <option value="submitted">Submitted</option>
                  <option value="under_review">Under Review</option>
                  <option value="approved">Approved</option>
                  <option value="declined">Declined</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div className="flex items-end gap-2">
                <button
                  onClick={applyFilters}
                  className="flex-1 px-4 py-2 bg-white text-black font-medium rounded-lg hover:bg-white/90 transition-colors"
                >
                  Apply
                </button>
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                    title="Clear filters"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Click outside to close customer dropdown */}
      {showCustomerDropdown && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowCustomerDropdown(false)} 
        />
      )}

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 text-white/50 animate-spin" />
          </div>
        ) : applications.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-white/40">
            <AlertCircle className="w-12 h-12 mb-3 opacity-50" />
            <p className="text-lg">No bank finance applications found</p>
            <p className="text-sm">Try adjusting your filters</p>
          </div>
        ) : (
          <table className="w-full border-collapse border border-white/20">
            <thead className="sticky top-0 bg-zinc-900 z-10">
              <tr>
                <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-white/70 uppercase tracking-wider border border-white/20 bg-zinc-800 w-24">
                  Date
                </th>
                <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-white/70 uppercase tracking-wider border border-white/20 bg-zinc-800 w-24">
                  CIN
                </th>
                <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-white/70 uppercase tracking-wider border border-white/20 bg-zinc-800 w-44">
                  Customer Name
                </th>
                <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-white/70 uppercase tracking-wider border border-white/20 bg-zinc-800 w-36">
                  Vehicle
                </th>
                <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-white/70 uppercase tracking-wider border border-white/20 bg-zinc-800 w-28">
                  Bank
                </th>
                <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-white/70 uppercase tracking-wider border border-white/20 bg-zinc-800 w-28">
                  Status
                </th>
                <th className="px-3 py-2.5 text-right text-[10px] font-semibold text-white/70 uppercase tracking-wider border border-white/20 bg-zinc-800 w-28">
                  Finance Amt
                </th>
                <th className="px-3 py-2.5 text-right text-[10px] font-semibold text-white/70 uppercase tracking-wider border border-white/20 bg-zinc-800 w-28">
                  Approved Amt
                </th>
                <th className="px-3 py-2.5 text-center text-[10px] font-semibold text-white/70 uppercase tracking-wider border border-white/20 bg-zinc-800 w-16">
                  Docs
                </th>
              </tr>
            </thead>
            <tbody>
              {applications.map((app) => {
                const isLoading = loadingLead === app.lead_id;
                return (
                  <tr 
                    key={app.id}
                    onClick={() => openCustomerModal(app.lead_id)}
                    className="hover:bg-white/10 transition-colors cursor-pointer group"
                  >
                    <td className="px-3 py-2 border border-white/20 bg-black">
                      <div className="text-xs text-white">{formatDate(app.created_at)}</div>
                    </td>
                    <td className="px-3 py-2 border border-white/20 bg-black">
                      <span className="text-xs font-mono text-white/70">{app.customer_number}</span>
                    </td>
                    <td className="px-3 py-2 border border-white/20 bg-black">
                      <div className="flex items-center gap-1.5">
                        {isLoading && <Loader2 className="w-3 h-3 animate-spin text-white/50" />}
                        <span className="text-xs text-white group-hover:text-amber-400 transition-colors truncate">
                          {app.customer_name}
                        </span>
                        <ExternalLink className="w-3 h-3 text-white/20 group-hover:text-white/50 transition-colors flex-shrink-0" />
                      </div>
                    </td>
                    <td className="px-3 py-2 border border-white/20 bg-black">
                      <div 
                        className="text-[10px] text-white/50 truncate" 
                        title={app.vehicle_info}
                      >
                        {app.vehicle_info || '-'}
                      </div>
                    </td>
                    <td className="px-3 py-2 border border-white/20 bg-black">
                      <span className="text-xs text-white">{app.bank_name || '-'}</span>
                    </td>
                    <td className="px-3 py-2 border border-white/20 bg-black">
                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${getStatusColor(app.status)}`}>
                        {getStatusIcon(app.status)}
                        {getStatusLabel(app.status)}
                      </span>
                    </td>
                    <td className="px-3 py-2 border border-white/20 bg-black text-right">
                      {app.bank_finance_amount ? (
                        <span className="text-xs text-white">
                          {formatCurrency(app.bank_finance_amount)}
                        </span>
                      ) : (
                        <span className="text-xs text-white/30">-</span>
                      )}
                    </td>
                    <td className="px-3 py-2 border border-white/20 bg-black text-right">
                      {app.approved_amount ? (
                        <span className="text-xs text-green-400 font-medium">
                          {formatCurrency(app.approved_amount)}
                        </span>
                      ) : (
                        <span className="text-xs text-white/30">-</span>
                      )}
                    </td>
                    <td className="px-3 py-2 border border-white/20 bg-black text-center">
                      <div className="flex items-center justify-center gap-1">
                        <span className="text-[10px] text-blue-400" title="Customer Docs">{app.customer_docs_count}</span>
                        <span className="text-[10px] text-white/30">/</span>
                        <span className="text-[10px] text-purple-400" title="Bank Docs">{app.bank_docs_count}</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {/* Load More */}
        {!loading && hasMore && applications.length > 0 && (
          <div className="p-4 text-center">
            <button
              onClick={() => loadApplications(false)}
              disabled={loadingMore}
              className="px-4 py-2 bg-white/10 text-white/70 hover:bg-white/15 rounded-lg transition-colors disabled:opacity-50"
            >
              {loadingMore ? (
                <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
              ) : null}
              Load More
            </button>
          </div>
        )}
      </div>

      {/* Account Summary Modal */}
      {showAccountModal && selectedLead && (
        <SalesOrderModal
          isOpen={showAccountModal}
          onClose={() => {
            setShowAccountModal(false);
            setSelectedLead(null);
            // Refresh applications after modal closes
            loadApplications(true);
            loadSummary();
          }}
          lead={selectedLead}
          onSalesOrderCreated={() => {
            loadApplications(true);
            loadSummary();
          }}
          onSalesOrderUpdated={() => {
            loadApplications(true);
            loadSummary();
          }}
        />
      )}
    </div>
  );
}

