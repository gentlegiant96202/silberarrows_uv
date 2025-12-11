"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import * as XLSX from 'xlsx';
import { 
  CreditCard, 
  RefreshCw,
  Filter,
  Download,
  Search,
  X,
  Loader2,
  Wallet,
  AlertCircle,
  FileDown,
  ExternalLink,
  Receipt,
  ArrowRight
} from 'lucide-react';
import SalesOrderModal from '../modals/SalesOrderModal';

// ===== INTERFACES =====
interface UnallocatedPayment {
  id: string;
  payment_number: string;
  lead_id: string;
  payment_date: string;
  payment_method: string;
  total_amount: number;
  reference: string;
  status: string;
  allocated_amount: number;
  refunded_amount: number;
  available_amount: number;
  created_at: string;
  // Joined from leads
  customer_name?: string;
  customer_number?: string;
  phone_number?: string;
}

interface PaymentSummary {
  total_payments: number;
  total_amount: number;
  total_allocated: number;
  total_unallocated: number;
  payment_count: number;
}

interface FilterState {
  fromDate: string;
  toDate: string;
  paymentMethod: string;
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

const getPaymentMethodColor = (method: string) => {
  switch (method?.toLowerCase()) {
    case 'cash': return 'text-green-400 bg-green-500/10';
    case 'bank_transfer': return 'text-blue-400 bg-blue-500/10';
    case 'credit_card': return 'text-purple-400 bg-purple-500/10';
    case 'cheque': return 'text-amber-400 bg-amber-500/10';
    default: return 'text-white/70 bg-white/5';
  }
};

const getPaymentMethodLabel = (method: string) => {
  switch (method?.toLowerCase()) {
    case 'cash': return 'Cash';
    case 'bank_transfer': return 'Bank Transfer';
    case 'credit_card': return 'Credit Card';
    case 'cheque': return 'Cheque';
    default: return method || 'Unknown';
  }
};

// ===== MAIN COMPONENT =====
export default function UnallocatedPayments() {
  const [payments, setPayments] = useState<UnallocatedPayment[]>([]);
  const [summary, setSummary] = useState<PaymentSummary | null>(null);
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
  
  // PDF generation state
  const [generatingPdf, setGeneratingPdf] = useState<string | null>(null);

  const [filters, setFilters] = useState<FilterState>({
    fromDate: '',
    toDate: '',
    paymentMethod: '',
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

  // Load unallocated payments from view
  const loadPayments = useCallback(async (reset: boolean = false) => {
    if (reset) {
      setLoading(true);
      setOffset(0);
    } else {
      setLoadingMore(true);
    }

    try {
      const currentOffset = reset ? 0 : offset;
      
      // Query from uv_payment_summary view (no join - views don't support PostgREST joins)
      let query = supabase
        .from('uv_payment_summary')
        .select('*')
        .gt('available_amount', 0) // Only payments with unallocated amounts (available_amount = unallocated)
        .eq('status', 'received')
        .order('payment_date', { ascending: false })
        .range(currentOffset, currentOffset + LIMIT - 1);

      // Apply filters
      if (filters.fromDate) {
        query = query.gte('payment_date', filters.fromDate);
      }
      if (filters.toDate) {
        query = query.lte('payment_date', filters.toDate);
      }
      if (filters.paymentMethod) {
        query = query.eq('payment_method', filters.paymentMethod);
      }
      if (filters.customerId) {
        query = query.eq('lead_id', filters.customerId);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Get unique lead IDs to fetch customer info
      const leadIds = [...new Set((data || []).map(p => p.lead_id))];
      
      // Fetch customer info for these leads
      let leadsMap: Record<string, { full_name: string; customer_number: string; phone_number: string }> = {};
      if (leadIds.length > 0) {
        const { data: leads, error: leadsError } = await supabase
          .from('leads')
          .select('id, full_name, customer_number, phone_number')
          .in('id', leadIds);
        
        if (!leadsError && leads) {
          leadsMap = leads.reduce((acc, lead) => {
            acc[lead.id] = {
              full_name: lead.full_name || 'Unknown',
              customer_number: lead.customer_number || '',
              phone_number: lead.phone_number || ''
            };
            return acc;
          }, {} as Record<string, any>);
        }
      }

      // Transform data to include customer info
      const transformedData = (data || []).map(payment => ({
        ...payment,
        customer_name: leadsMap[payment.lead_id]?.full_name || 'Unknown',
        customer_number: leadsMap[payment.lead_id]?.customer_number || '',
        phone_number: leadsMap[payment.lead_id]?.phone_number || ''
      })).filter(payment => {
        // Apply search filter client-side
        if (filters.searchQuery) {
          const search = filters.searchQuery.toLowerCase();
          return (
            payment.customer_name?.toLowerCase().includes(search) ||
            payment.customer_number?.toLowerCase().includes(search) ||
            payment.payment_number?.toLowerCase().includes(search) ||
            payment.reference?.toLowerCase().includes(search)
          );
        }
        return true;
      });

      if (reset) {
        setPayments(transformedData);
      } else {
        setPayments(prev => [...prev, ...transformedData]);
      }

      setHasMore((data?.length || 0) === LIMIT);
      setOffset(currentOffset + LIMIT);
    } catch (error) {
      console.error('Error loading unallocated payments:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [filters, offset]);

  // Load summary
  const loadSummary = useCallback(async () => {
    try {
      // Query all unallocated payments for summary
      let query = supabase
        .from('uv_payment_summary')
        .select('total_amount, allocated_amount, available_amount')
        .gt('available_amount', 0)
        .eq('status', 'received');

      if (filters.fromDate) {
        query = query.gte('payment_date', filters.fromDate);
      }
      if (filters.toDate) {
        query = query.lte('payment_date', filters.toDate);
      }
      if (filters.customerId) {
        query = query.eq('lead_id', filters.customerId);
      }

      const { data, error } = await query;

      if (error) throw error;

      if (data && data.length > 0) {
        const summary = data.reduce((acc, payment) => {
          acc.total_amount += payment.total_amount || 0;
          acc.total_allocated += payment.allocated_amount || 0;
          acc.total_unallocated += payment.available_amount || 0;
          acc.payment_count++;
          return acc;
        }, { total_payments: 0, total_amount: 0, total_allocated: 0, total_unallocated: 0, payment_count: 0 });
        
        summary.total_payments = summary.payment_count;
        setSummary(summary);
      } else {
        setSummary({ total_payments: 0, total_amount: 0, total_allocated: 0, total_unallocated: 0, payment_count: 0 });
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

  // Generate and download receipt PDF
  const generateReceipt = async (payment: UnallocatedPayment) => {
    setGeneratingPdf(payment.id);
    
    try {
      const response = await fetch('/api/generate-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId: payment.id })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate receipt');
      }
      
      const data = await response.json();
      const pdfUrl = data.pdfUrl || data.pdf_url;
      
      if (pdfUrl) {
        // Download the PDF
        const link = document.createElement('a');
        link.href = pdfUrl;
        link.download = `${payment.payment_number}.pdf`;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        throw new Error('No PDF URL returned');
      }
    } catch (error: any) {
      console.error('Error generating receipt:', error);
      alert('Error generating receipt: ' + error.message);
    } finally {
      setGeneratingPdf(null);
    }
  };

  // Initial load
  useEffect(() => {
    loadPayments(true);
    loadSummary();
    loadCustomers();
  }, []);

  // Reload when filters change
  const applyFilters = () => {
    loadPayments(true);
    loadSummary();
  };

  const clearFilters = () => {
    setFilters({
      fromDate: '',
      toDate: '',
      paymentMethod: '',
      searchQuery: '',
      customerId: ''
    });
    setSelectedCustomerDisplay('');
    setTimeout(() => {
      loadPayments(true);
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

  const hasActiveFilters = filters.fromDate || filters.toDate || filters.paymentMethod || filters.searchQuery || filters.customerId;

  // Export to Excel
  const handleExport = async () => {
    try {
      // Query payments
      let query = supabase
        .from('uv_payment_summary')
        .select('*')
        .gt('available_amount', 0)
        .eq('status', 'received')
        .order('payment_date', { ascending: false });

      if (filters.fromDate) query = query.gte('payment_date', filters.fromDate);
      if (filters.toDate) query = query.lte('payment_date', filters.toDate);
      if (filters.paymentMethod) query = query.eq('payment_method', filters.paymentMethod);
      if (filters.customerId) query = query.eq('lead_id', filters.customerId);

      const { data, error } = await query;
      if (error) throw error;

      if (!data || data.length === 0) {
        alert('No data to export');
        return;
      }

      // Fetch customer info
      const leadIds = [...new Set(data.map(p => p.lead_id))];
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

      const excelData = data.map(payment => ({
        'Date': formatDate(payment.payment_date),
        'Payment #': payment.payment_number,
        'Method': getPaymentMethodLabel(payment.payment_method),
        'Reference': payment.reference || '',
        'Customer #': leadsMap[payment.lead_id]?.customer_number || '',
        'Customer': leadsMap[payment.lead_id]?.full_name || '',
        'Total Amount': payment.total_amount,
        'Allocated': payment.allocated_amount,
        'Unallocated': payment.available_amount,
      }));

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(excelData);

      ws['!cols'] = [
        { wch: 12 }, { wch: 15 }, { wch: 14 }, { wch: 20 },
        { wch: 12 }, { wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 15 }
      ];

      XLSX.utils.book_append_sheet(wb, ws, 'Unallocated Payments');

      const dateStr = new Date().toISOString().split('T')[0];
      XLSX.writeFile(wb, `Unallocated_Payments_${dateStr}.xlsx`);
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
            <h1 className="text-xl font-bold text-white">Unallocated Payments</h1>
            <p className="text-sm text-white/50">Payments not yet fully allocated to invoices • Click row to open account</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => { loadPayments(true); loadSummary(); }}
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
          <div className="grid grid-cols-4 gap-4 mb-4">
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <div className="flex items-center gap-2 text-white/50 text-xs mb-1">
                <Receipt className="w-3.5 h-3.5" />
                TOTAL PAYMENTS
              </div>
              <p className="text-lg font-bold text-white">{summary.payment_count}</p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <div className="flex items-center gap-2 text-green-400/70 text-xs mb-1">
                <CreditCard className="w-3.5 h-3.5" />
                TOTAL RECEIVED
              </div>
              <p className="text-lg font-bold text-green-400">AED {formatCurrency(summary.total_amount)}</p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <div className="flex items-center gap-2 text-blue-400/70 text-xs mb-1">
                <ArrowRight className="w-3.5 h-3.5" />
                ALLOCATED
              </div>
              <p className="text-lg font-bold text-blue-400">AED {formatCurrency(summary.total_allocated)}</p>
            </div>
            <div className="bg-gradient-to-br from-amber-500/20 to-amber-500/5 border border-amber-500/30 rounded-xl p-4">
              <div className="flex items-center gap-2 text-amber-400/70 text-xs mb-1">
                <Wallet className="w-3.5 h-3.5" />
                UNALLOCATED
              </div>
              <p className="text-lg font-bold text-amber-400">AED {formatCurrency(summary.total_unallocated)}</p>
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
                <label className="block text-xs text-white/50 mb-1">Payment Method</label>
                <select
                  value={filters.paymentMethod}
                  onChange={(e) => setFilters(prev => ({ ...prev, paymentMethod: e.target.value }))}
                  className="w-full px-3 py-2 bg-black border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:border-white/40"
                >
                  <option value="">All Methods</option>
                  <option value="cash">Cash</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="credit_card">Credit Card</option>
                  <option value="cheque">Cheque</option>
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
        ) : payments.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-white/40">
            <AlertCircle className="w-12 h-12 mb-3 opacity-50" />
            <p className="text-lg">No unallocated payments found</p>
            <p className="text-sm">All payments have been allocated to invoices</p>
          </div>
        ) : (
          <table className="w-full border-collapse border border-white/20">
            <thead className="sticky top-0 bg-zinc-900 z-10">
              <tr>
                <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-white/70 uppercase tracking-wider border border-white/20 bg-zinc-800 w-24">
                  Date
                </th>
                <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-white/70 uppercase tracking-wider border border-white/20 bg-zinc-800 w-28">
                  Payment #
                </th>
                <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-white/70 uppercase tracking-wider border border-white/20 bg-zinc-800 w-24">
                  Method
                </th>
                <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-white/70 uppercase tracking-wider border border-white/20 bg-zinc-800 w-24">
                  CIN
                </th>
                <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-white/70 uppercase tracking-wider border border-white/20 bg-zinc-800 w-52">
                  Customer Name
                </th>
                <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-white/70 uppercase tracking-wider border border-white/20 bg-zinc-800 w-36">
                  Reference
                </th>
                <th className="px-3 py-2.5 text-right text-[10px] font-semibold text-white/70 uppercase tracking-wider border border-white/20 bg-zinc-800 w-28">
                  Total Amount
                </th>
                <th className="px-3 py-2.5 text-right text-[10px] font-semibold text-white/70 uppercase tracking-wider border border-white/20 bg-zinc-800 w-28">
                  Allocated
                </th>
                <th className="px-3 py-2.5 text-right text-[10px] font-semibold text-white/70 uppercase tracking-wider border border-white/20 bg-zinc-800 w-28">
                  Unallocated
                </th>
                <th className="px-3 py-2.5 text-center text-[10px] font-semibold text-white/70 uppercase tracking-wider border border-white/20 bg-zinc-800 w-14">
                  PDF
                </th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => {
                const isLoading = loadingLead === payment.lead_id;
                const isGenerating = generatingPdf === payment.id;
                return (
                  <tr 
                    key={payment.id}
                    onClick={() => openCustomerModal(payment.lead_id)}
                    className="hover:bg-white/10 transition-colors cursor-pointer group"
                  >
                    <td className="px-3 py-2 border border-white/20 bg-black">
                      <div className="text-xs text-white">{formatDate(payment.payment_date)}</div>
                    </td>
                    <td className="px-3 py-2 border border-white/20 bg-black">
                      <span className="text-xs font-mono text-amber-400">{payment.payment_number}</span>
                    </td>
                    <td className="px-3 py-2 border border-white/20 bg-black">
                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${getPaymentMethodColor(payment.payment_method)}`}>
                        <CreditCard className="w-3 h-3" />
                        {getPaymentMethodLabel(payment.payment_method)}
                      </span>
                    </td>
                    <td className="px-3 py-2 border border-white/20 bg-black">
                      <span className="text-xs font-mono text-white/70">{payment.customer_number}</span>
                    </td>
                    <td className="px-3 py-2 border border-white/20 bg-black">
                      <div className="flex items-center gap-1.5">
                        {isLoading && <Loader2 className="w-3 h-3 animate-spin text-white/50" />}
                        <span className="text-xs text-white group-hover:text-amber-400 transition-colors truncate">
                          {payment.customer_name}
                        </span>
                        <ExternalLink className="w-3 h-3 text-white/20 group-hover:text-white/50 transition-colors flex-shrink-0" />
                      </div>
                    </td>
                    <td className="px-3 py-2 border border-white/20 bg-black">
                      <div 
                        className="text-[10px] text-white/50 truncate" 
                        title={payment.reference}
                      >
                        {payment.reference || '-'}
                      </div>
                    </td>
                    <td className="px-3 py-2 border border-white/20 bg-black text-right">
                      <span className="text-xs text-white font-medium">
                        {formatCurrency(payment.total_amount)}
                      </span>
                    </td>
                    <td className="px-3 py-2 border border-white/20 bg-black text-right">
                      <span className="text-xs text-blue-400">
                        {formatCurrency(payment.allocated_amount)}
                      </span>
                    </td>
                    <td className="px-3 py-2 border border-white/20 bg-black text-right">
                      <span className="text-xs text-amber-400 font-medium">
                        {formatCurrency(payment.available_amount)}
                      </span>
                    </td>
                    <td className="px-3 py-2 border border-white/20 bg-black text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          generateReceipt(payment);
                        }}
                        disabled={isGenerating}
                        className="p-1 text-white/40 hover:text-white hover:bg-white/10 rounded transition-colors disabled:opacity-50"
                        title="Download Receipt"
                      >
                        {isGenerating ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <FileDown className="w-4 h-4" />
                        )}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {/* Load More */}
        {!loading && hasMore && payments.length > 0 && (
          <div className="p-4 text-center">
            <button
              onClick={() => loadPayments(false)}
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
            // Refresh payments after modal closes
            loadPayments(true);
            loadSummary();
          }}
          lead={selectedLead}
          onSalesOrderCreated={() => {
            loadPayments(true);
            loadSummary();
          }}
          onSalesOrderUpdated={() => {
            loadPayments(true);
            loadSummary();
          }}
        />
      )}
    </div>
  );
}

