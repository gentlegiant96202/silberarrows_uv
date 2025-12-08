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
  ChevronUp,
  Filter,
  Download,
  Calendar,
  Search,
  X,
  Loader2,
  TrendingUp,
  TrendingDown,
  Wallet,
  AlertCircle
} from 'lucide-react';

// ===== INTERFACES =====
interface LedgerEntry {
  transaction_date: string;
  transaction_type: 'invoice' | 'payment' | 'credit_note' | 'refund';
  reference: string;
  description: string;
  debit: number;
  credit: number;
  lead_id: string;
  source_id: string;
  customer_name: string;
  customer_phone: string;
  customer_number: string;
  customer_balance: number;
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

  const [filters, setFilters] = useState<FilterState>({
    fromDate: '',
    toDate: '',
    transactionType: '',
    searchQuery: ''
  });

  // Load ledger entries
  const loadEntries = useCallback(async (reset: boolean = false) => {
    if (reset) {
      setLoading(true);
      setOffset(0);
    } else {
      setLoadingMore(true);
    }

    try {
      const currentOffset = reset ? 0 : offset;
      
      // Build query
      let query = supabase
        .from('uv_accounts_ledger')
        .select('*')
        .order('transaction_date', { ascending: false })
        .range(currentOffset, currentOffset + LIMIT - 1);

      // Apply filters
      if (filters.fromDate) {
        query = query.gte('transaction_date', filters.fromDate);
      }
      if (filters.toDate) {
        query = query.lte('transaction_date', filters.toDate + 'T23:59:59');
      }
      if (filters.transactionType) {
        query = query.eq('transaction_type', filters.transactionType);
      }
      if (filters.searchQuery) {
        query = query.or(`customer_name.ilike.%${filters.searchQuery}%,reference.ilike.%${filters.searchQuery}%,description.ilike.%${filters.searchQuery}%`);
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

  // Load summary
  const loadSummary = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .rpc('get_ledger_summary', {
          p_from_date: filters.fromDate || null,
          p_to_date: filters.toDate || null
        });

      if (error) throw error;
      if (data && data.length > 0) {
        setSummary(data[0]);
      }
    } catch (error) {
      console.error('Error loading summary:', error);
    }
  }, [filters.fromDate, filters.toDate]);

  // Initial load
  useEffect(() => {
    loadEntries(true);
    loadSummary();
  }, []);

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
      searchQuery: ''
    });
    setTimeout(() => {
      loadEntries(true);
      loadSummary();
    }, 0);
  };

  const hasActiveFilters = filters.fromDate || filters.toDate || filters.transactionType || filters.searchQuery;

  // Export to Excel
  const handleExport = async () => {
    try {
      // Fetch all entries (no pagination) for export
      let query = supabase
        .from('uv_accounts_ledger')
        .select('*')
        .order('transaction_date', { ascending: false });

      // Apply current filters
      if (filters.fromDate) {
        query = query.gte('transaction_date', filters.fromDate);
      }
      if (filters.toDate) {
        query = query.lte('transaction_date', filters.toDate + 'T23:59:59');
      }
      if (filters.transactionType) {
        query = query.eq('transaction_type', filters.transactionType);
      }
      if (filters.searchQuery) {
        query = query.or(`customer_name.ilike.%${filters.searchQuery}%,reference.ilike.%${filters.searchQuery}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      if (!data || data.length === 0) {
        alert('No data to export');
        return;
      }

      // Format data for Excel
      const excelData = data.map(entry => ({
        'Date': new Date(entry.transaction_date).toLocaleDateString('en-GB'),
        'Time': new Date(entry.transaction_date).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
        'Type': entry.transaction_type.replace('_', ' ').toUpperCase(),
        'Reference': entry.reference,
        'Customer': entry.customer_name,
        'Customer #': entry.customer_number || '',
        'Description': entry.description,
        'Debit (AED)': entry.debit > 0 ? entry.debit : '',
        'Credit (AED)': entry.credit > 0 ? entry.credit : '',
        'Customer Balance': entry.customer_balance
      }));

      // Create workbook and worksheet
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(excelData);

      // Set column widths
      ws['!cols'] = [
        { wch: 12 }, // Date
        { wch: 8 },  // Time
        { wch: 12 }, // Type
        { wch: 15 }, // Reference
        { wch: 25 }, // Customer
        { wch: 12 }, // Customer #
        { wch: 40 }, // Description
        { wch: 15 }, // Debit
        { wch: 15 }, // Credit
        { wch: 15 }, // Balance
      ];

      XLSX.utils.book_append_sheet(wb, ws, 'Customer Ledger');

      // Generate filename with date
      const dateStr = new Date().toISOString().split('T')[0];
      const filename = `Customer_Ledger_${dateStr}.xlsx`;

      // Download
      XLSX.writeFile(wb, filename);
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
            <h1 className="text-xl font-bold text-white">Customer Ledger</h1>
            <p className="text-sm text-white/50">All customer transactions in chronological order</p>
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
            <div className="grid grid-cols-5 gap-4">
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
                <label className="block text-xs text-white/50 mb-1">Transaction Type</label>
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
              <div>
                <label className="block text-xs text-white/50 mb-1">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                  <input
                    type="text"
                    value={filters.searchQuery}
                    onChange={(e) => setFilters(prev => ({ ...prev, searchQuery: e.target.value }))}
                    placeholder="Customer, reference..."
                    className="w-full pl-9 pr-3 py-2 bg-black border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:border-white/40 placeholder:text-white/30"
                  />
                </div>
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
                <th className="px-4 py-3 text-left text-xs font-medium text-white/50 uppercase tracking-wider w-40">
                  Date & Time
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white/50 uppercase tracking-wider w-28">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white/50 uppercase tracking-wider w-32">
                  Reference
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white/50 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white/50 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-white/50 uppercase tracking-wider w-32">
                  Debit
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-white/50 uppercase tracking-wider w-32">
                  Credit
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-white/50 uppercase tracking-wider w-36">
                  Customer Bal
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {entries.map((entry, index) => {
                const { date, time } = formatDateTime(entry.transaction_date);
                return (
                  <tr 
                    key={`${entry.source_id}-${index}`}
                    className="hover:bg-white/5 transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-3">
                      <div className="text-sm text-white">{date}</div>
                      <div className="text-xs text-white/40">{time}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium ${getTransactionColor(entry.transaction_type)}`}>
                        {getTransactionIcon(entry.transaction_type)}
                        {getTransactionLabel(entry.transaction_type)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-mono text-white/80">{entry.reference}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-white">{entry.customer_name}</div>
                      <div className="text-xs text-white/40">{entry.customer_number || entry.customer_phone}</div>
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
                        entry.customer_balance > 0 
                          ? 'text-red-400' 
                          : entry.customer_balance < 0 
                            ? 'text-green-400' 
                            : 'text-white/50'
                      }`}>
                        {formatCurrency(Math.abs(entry.customer_balance))}
                        {entry.customer_balance < 0 && ' CR'}
                      </span>
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
    </div>
  );
}

