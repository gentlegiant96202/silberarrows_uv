"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import * as XLSX from 'xlsx';
import { 
  FileText, 
  CreditCard, 
  Receipt, 
  RefreshCw,
  ChevronDown,
  Filter,
  Download,
  Search,
  X,
  Loader2,
  Wallet,
  AlertCircle,
  FileDown,
  ExternalLink
} from 'lucide-react';
import SalesOrderModal from '../modals/SalesOrderModal';

// ===== INTERFACES =====
interface LedgerEntry {
  id: string;
  posted_at: string;
  transaction_date: string;
  entry_type: 'invoice' | 'payment' | 'credit_note' | 'refund';
  document_number: string;
  description: string;
  debit: number;
  credit: number;
  lead_id: string;
  customer_name: string;
  customer_number: string;
  customer_phone: string;
  source_table: string;
  source_id: string;
  pdf_url: string | null;
}

interface LedgerSummary {
  total_invoiced: number;
  total_paid: number;
  total_credit_notes: number;
  total_refunds: number;
  net_receivables: number;
  transaction_count: number;
}

interface FilterState {
  fromDate: string;
  toDate: string;
  transactionType: string;
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

const formatDateTime = (dateString: string) => {
  const date = new Date(dateString);
  return {
    date: date.toLocaleDateString('en-GB', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric' 
    }),
    time: date.toLocaleTimeString('en-GB', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    })
  };
};

const getTransactionIcon = (type: string) => {
  switch (type) {
    case 'invoice': return <FileText className="w-4 h-4" />;
    case 'payment': return <CreditCard className="w-4 h-4" />;
    case 'credit_note': return <Receipt className="w-4 h-4" />;
    case 'refund': return <RefreshCw className="w-4 h-4" />;
    default: return <FileText className="w-4 h-4" />;
  }
};

const getTransactionColor = (type: string) => {
  switch (type) {
    case 'invoice': return 'text-white bg-white/10';
    case 'payment': return 'text-green-400 bg-green-500/10';
    case 'credit_note': return 'text-purple-400 bg-purple-500/10';
    case 'refund': return 'text-orange-400 bg-orange-500/10';
    default: return 'text-white/70 bg-white/5';
  }
};

const getTransactionLabel = (type: string) => {
  switch (type) {
    case 'invoice': return 'Invoice';
    case 'payment': return 'Payment';
    case 'credit_note': return 'Credit Note';
    case 'refund': return 'Refund';
    default: return type;
  }
};

// ===== MAIN COMPONENT =====
export default function AccountsLedger() {
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [summary, setSummary] = useState<LedgerSummary | null>(null);
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
    transactionType: '',
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

  // Load ledger entries from new table
  const loadEntries = useCallback(async (reset: boolean = false) => {
    if (reset) {
      setLoading(true);
      setOffset(0);
    } else {
      setLoadingMore(true);
    }

    try {
      const currentOffset = reset ? 0 : offset;
      
      // Build query against new ledger table
      let query = supabase
        .from('uv_ledger_entries')
        .select('*')
        .order('transaction_date', { ascending: false })
        .order('posted_at', { ascending: false })
        .range(currentOffset, currentOffset + LIMIT - 1);

      // Apply filters
      if (filters.fromDate) {
        query = query.gte('transaction_date', filters.fromDate);
      }
      if (filters.toDate) {
        query = query.lte('transaction_date', filters.toDate);
      }
      if (filters.transactionType) {
        query = query.eq('entry_type', filters.transactionType);
      }
      if (filters.customerId) {
        query = query.eq('lead_id', filters.customerId);
      }
      if (filters.searchQuery) {
        query = query.or(`customer_name.ilike.%${filters.searchQuery}%,customer_number.ilike.%${filters.searchQuery}%,document_number.ilike.%${filters.searchQuery}%,description.ilike.%${filters.searchQuery}%`);
      }

      const { data, error } = await query;

      if (error) throw error;

      if (reset) {
        setEntries(data || []);
      } else {
        setEntries(prev => [...prev, ...(data || [])]);
      }

      setHasMore((data?.length || 0) === LIMIT);
      setOffset(currentOffset + LIMIT);
    } catch (error) {
      console.error('Error loading ledger:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [filters, offset]);

  // Load summary using new function
  const loadSummary = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .rpc('get_ledger_summary_v2', {
          p_from_date: filters.fromDate || null,
          p_to_date: filters.toDate || null,
          p_lead_id: filters.customerId || null
        });

      if (error) throw error;
      if (data && data.length > 0) {
        setSummary(data[0]);
      }
    } catch (error) {
      console.error('Error loading summary:', error);
      // Fallback: calculate from entries if function doesn't exist yet
      if (entries.length > 0) {
        const summary = entries.reduce((acc, entry) => {
          if (entry.entry_type === 'invoice') acc.total_invoiced += entry.debit;
          if (entry.entry_type === 'payment') acc.total_paid += entry.credit;
          if (entry.entry_type === 'credit_note') acc.total_credit_notes += entry.credit;
          if (entry.entry_type === 'refund') acc.total_refunds += entry.debit;
          acc.net_receivables += (entry.debit - entry.credit);
          acc.transaction_count++;
          return acc;
        }, { total_invoiced: 0, total_paid: 0, total_credit_notes: 0, total_refunds: 0, net_receivables: 0, transaction_count: 0 });
        setSummary(summary);
      }
    }
  }, [filters.fromDate, filters.toDate, filters.customerId, entries]);

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

  // Download PDF
  const downloadPdf = (url: string, documentNumber: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `${documentNumber}.pdf`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Initial load
  useEffect(() => {
    loadEntries(true);
    loadSummary();
    loadCustomers();
  }, []);

  // Update summary when entries change
  useEffect(() => {
    if (entries.length > 0) {
      loadSummary();
    }
  }, [entries]);

  // Reload when filters change
  const applyFilters = () => {
    loadEntries(true);
    loadSummary();
  };

  const clearFilters = () => {
    setFilters({
      fromDate: '',
      toDate: '',
      transactionType: '',
      searchQuery: '',
      customerId: ''
    });
    setSelectedCustomerDisplay('');
    setTimeout(() => {
      loadEntries(true);
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

  const hasActiveFilters = filters.fromDate || filters.toDate || filters.transactionType || filters.searchQuery || filters.customerId;

  // Export to Excel
  const handleExport = async () => {
    try {
      let query = supabase
        .from('uv_ledger_entries')
        .select('*')
        .order('transaction_date', { ascending: false });

      if (filters.fromDate) query = query.gte('transaction_date', filters.fromDate);
      if (filters.toDate) query = query.lte('transaction_date', filters.toDate);
      if (filters.transactionType) query = query.eq('entry_type', filters.transactionType);
      if (filters.customerId) query = query.eq('lead_id', filters.customerId);
      if (filters.searchQuery) {
        query = query.or(`customer_name.ilike.%${filters.searchQuery}%,customer_number.ilike.%${filters.searchQuery}%,document_number.ilike.%${filters.searchQuery}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      if (!data || data.length === 0) {
        alert('No data to export');
        return;
      }

      const excelData = data.map(entry => ({
        'Date': new Date(entry.transaction_date).toLocaleDateString('en-GB'),
        'Posted': new Date(entry.posted_at).toLocaleString('en-GB'),
        'Type': getTransactionLabel(entry.entry_type),
        'Reference': entry.document_number,
        'Customer #': entry.customer_number || '',
        'Customer': entry.customer_name,
        'Description': entry.description,
        'Debit (AED)': entry.debit > 0 ? entry.debit : '',
        'Credit (AED)': entry.credit > 0 ? entry.credit : '',
      }));

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(excelData);

      ws['!cols'] = [
        { wch: 12 }, { wch: 18 }, { wch: 12 }, { wch: 15 },
        { wch: 12 }, { wch: 25 }, { wch: 40 }, { wch: 15 }, { wch: 15 }
      ];

      XLSX.utils.book_append_sheet(wb, ws, 'Ledger');

      const dateStr = new Date().toISOString().split('T')[0];
      XLSX.writeFile(wb, `Ledger_${dateStr}.xlsx`);
    } catch (error) {
      console.error('Error exporting:', error);
      alert('Error exporting data');
    }
  };

  // Calculate running balance for display
  const calculateRunningBalance = (entries: LedgerEntry[]) => {
    let balance = 0;
    return [...entries].reverse().map(entry => {
      balance += (entry.debit - entry.credit);
      return { ...entry, runningBalance: balance };
    }).reverse();
  };

  const entriesWithBalance = calculateRunningBalance(entries);

  return (
    <div className="h-full flex flex-col bg-black text-white">
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/10">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-white">Customer Ledger</h1>
            <p className="text-sm text-white/50">All customer transactions • Click row to open account</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => { loadEntries(true); loadSummary(); }}
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
          <div className="grid grid-cols-5 gap-4 mb-4">
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <div className="flex items-center gap-2 text-white/50 text-xs mb-1">
                <FileText className="w-3.5 h-3.5" />
                INVOICED
              </div>
              <p className="text-lg font-bold text-white">AED {formatCurrency(summary.total_invoiced)}</p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <div className="flex items-center gap-2 text-green-400/70 text-xs mb-1">
                <CreditCard className="w-3.5 h-3.5" />
                RECEIVED
              </div>
              <p className="text-lg font-bold text-green-400">AED {formatCurrency(summary.total_paid)}</p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <div className="flex items-center gap-2 text-purple-400/70 text-xs mb-1">
                <Receipt className="w-3.5 h-3.5" />
                CREDIT NOTES
              </div>
              <p className="text-lg font-bold text-purple-400">AED {formatCurrency(summary.total_credit_notes)}</p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <div className="flex items-center gap-2 text-orange-400/70 text-xs mb-1">
                <RefreshCw className="w-3.5 h-3.5" />
                REFUNDS
              </div>
              <p className="text-lg font-bold text-orange-400">AED {formatCurrency(summary.total_refunds)}</p>
            </div>
            <div className="bg-gradient-to-br from-white/10 to-white/5 border border-white/20 rounded-xl p-4">
              <div className="flex items-center gap-2 text-white/70 text-xs mb-1">
                <Wallet className="w-3.5 h-3.5" />
                NET RECEIVABLES
              </div>
              <p className={`text-lg font-bold ${summary.net_receivables >= 0 ? 'text-white' : 'text-green-400'}`}>
                AED {formatCurrency(Math.abs(summary.net_receivables))}
                {summary.net_receivables < 0 && ' CR'}
              </p>
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
                <label className="block text-xs text-white/50 mb-1">Type</label>
                <select
                  value={filters.transactionType}
                  onChange={(e) => setFilters(prev => ({ ...prev, transactionType: e.target.value }))}
                  className="w-full px-3 py-2 bg-black border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:border-white/40"
                >
                  <option value="">All Types</option>
                  <option value="invoice">Invoices</option>
                  <option value="payment">Payments</option>
                  <option value="credit_note">Credit Notes</option>
                  <option value="refund">Refunds</option>
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
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-white/40">
            <AlertCircle className="w-12 h-12 mb-3 opacity-50" />
            <p className="text-lg">No transactions found</p>
            <p className="text-sm">Try adjusting your filters</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="sticky top-0 bg-black/95 backdrop-blur-sm z-10">
              <tr className="border-b border-white/10">
                <th className="px-4 py-3 text-left text-xs font-medium text-white/50 uppercase tracking-wider w-28">
                  Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white/50 uppercase tracking-wider w-24">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white/50 uppercase tracking-wider w-32">
                  Reference
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white/50 uppercase tracking-wider w-48">
                  Customer
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white/50 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-white/50 uppercase tracking-wider w-28">
                  Debit
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-white/50 uppercase tracking-wider w-28">
                  Credit
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-white/50 uppercase tracking-wider w-32">
                  Balance
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-white/50 uppercase tracking-wider w-16">
                  PDF
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {entriesWithBalance.map((entry, index) => {
                const { date } = formatDateTime(entry.transaction_date);
                const isLoading = loadingLead === entry.lead_id;
                return (
                  <tr 
                    key={entry.id}
                    onClick={() => openCustomerModal(entry.lead_id)}
                    className="hover:bg-white/5 transition-colors cursor-pointer group"
                  >
                    <td className="px-4 py-3">
                      <div className="text-sm text-white">{date}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium ${getTransactionColor(entry.entry_type)}`}>
                        {getTransactionIcon(entry.entry_type)}
                        {getTransactionLabel(entry.entry_type)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-mono text-amber-400">{entry.document_number}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {isLoading && <Loader2 className="w-3 h-3 animate-spin text-white/50" />}
                        <div>
                          <div className="text-sm text-white group-hover:text-amber-400 transition-colors">
                            {entry.customer_name}
                          </div>
                          <div className="text-xs text-white/40 font-mono">{entry.customer_number}</div>
                        </div>
                        <ExternalLink className="w-3 h-3 text-white/20 group-hover:text-white/50 transition-colors" />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-white/70 truncate max-w-xs" title={entry.description}>
                        {entry.description}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {entry.debit > 0 ? (
                        <span className="text-sm text-white font-medium">
                          {formatCurrency(entry.debit)}
                        </span>
                      ) : (
                        <span className="text-sm text-white/30">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {entry.credit > 0 ? (
                        <span className="text-sm text-green-400 font-medium">
                          {formatCurrency(entry.credit)}
                        </span>
                      ) : (
                        <span className="text-sm text-white/30">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`text-sm font-medium ${
                        (entry as any).runningBalance > 0 
                          ? 'text-white' 
                          : (entry as any).runningBalance < 0 
                            ? 'text-green-400' 
                            : 'text-white/50'
                      }`}>
                        {formatCurrency(Math.abs((entry as any).runningBalance))}
                        {(entry as any).runningBalance < 0 && ' CR'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                      {entry.pdf_url ? (
                        <button
                          onClick={() => downloadPdf(entry.pdf_url!, entry.document_number)}
                          className="p-1.5 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                          title="Download PDF"
                        >
                          <FileDown className="w-4 h-4" />
                        </button>
                      ) : (
                        <span className="text-white/20">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {/* Load More */}
        {hasMore && !loading && entries.length > 0 && (
          <div className="flex justify-center py-6">
            <button
              onClick={() => loadEntries(false)}
              disabled={loadingMore}
              className="flex items-center gap-2 px-6 py-2 bg-white/10 text-white/70 hover:bg-white/15 rounded-lg transition-colors disabled:opacity-50"
            >
              {loadingMore ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4" />
                  Load More
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-3 border-t border-white/10 bg-white/5">
        <div className="flex items-center justify-between text-sm text-white/50">
          <span>
            Showing {entries.length} transactions
            {summary && ` of ${summary.transaction_count} total`}
          </span>
          <span>
            All amounts in AED
          </span>
        </div>
      </div>

      {/* Account Modal */}
      {showAccountModal && selectedLead && (
        <SalesOrderModal
          isOpen={showAccountModal}
          onClose={() => {
            setShowAccountModal(false);
            setSelectedLead(null);
          }}
          lead={selectedLead}
          onSalesOrderCreated={() => loadEntries(true)}
          onSalesOrderUpdated={() => loadEntries(true)}
        />
      )}
    </div>
  );
}
