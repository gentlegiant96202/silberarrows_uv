"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import * as XLSX from 'xlsx';
import { 
  FileText, 
  RefreshCw,
  ChevronDown,
  Filter,
  Download,
  Search,
  X,
  Loader2,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  Eye,
  ChevronRight,
  ExternalLink
} from 'lucide-react';
import SalesOrderModal from '../modals/SalesOrderModal';

// ===== INTERFACES =====
interface Invoice {
  id: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string | null;
  status: 'pending' | 'partial' | 'paid' | 'reversed';
  total_amount: number;
  credit_note_total: number;
  paid_amount: number;
  balance_due: number;
  reversed_at: string | null;
  reversal_reason: string | null;
  created_at: string;
  // Joined fields
  customer_name: string;
  customer_phone: string;
  customer_number: string;
  vehicle_make_model: string;
  order_number: string;
  lead_id: string;
}

interface FilterState {
  status: string;
  searchQuery: string;
  showReversed: boolean;
}

// ===== HELPER FUNCTIONS =====
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-AE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-GB', { 
    day: '2-digit', 
    month: 'short', 
    year: 'numeric' 
  });
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'paid': return <CheckCircle className="w-3 h-3" />;
    case 'partial': return <Clock className="w-3 h-3" />;
    case 'pending': return <Clock className="w-3 h-3" />;
    case 'reversed': return <XCircle className="w-3 h-3" />;
    default: return <FileText className="w-3 h-3" />;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'paid': return 'text-green-400 bg-green-500/10';
    case 'partial': return 'text-yellow-400 bg-yellow-500/10';
    case 'pending': return 'text-orange-400 bg-orange-500/10';
    case 'reversed': return 'text-red-400 bg-red-500/10';
    default: return 'text-white/70 bg-white/5';
  }
};

const getAgingDays = (invoiceDate: string): number => {
  const now = new Date();
  const invoice = new Date(invoiceDate);
  const diffTime = now.getTime() - invoice.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
};

const getAgingColor = (days: number, status: string) => {
  if (status === 'paid' || status === 'reversed') return 'text-white/40';
  if (days > 90) return 'text-red-500';
  if (days > 60) return 'text-orange-500';
  if (days > 30) return 'text-yellow-500';
  return 'text-white/60';
};

// ===== MAIN COMPONENT =====
export default function InvoicesList() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [expandedInvoice, setExpandedInvoice] = useState<string | null>(null);
  const [lineItems, setLineItems] = useState<any[]>([]);
  const [loadingLineItems, setLoadingLineItems] = useState(false);
  
  // Modal state
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [loadingLead, setLoadingLead] = useState<string | null>(null);

  const [filters, setFilters] = useState<FilterState>({
    status: '',
    searchQuery: '',
    showReversed: false
  });

  const [summary, setSummary] = useState({
    total: 0,
    pending: 0,
    partial: 0,
    paid: 0,
    reversed: 0,
    totalOutstanding: 0
  });

  // Load invoices
  const loadInvoices = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('uv_invoices')
        .select(`
          *,
          uv_sales_orders!inner (
            order_number,
            customer_name,
            customer_phone,
            vehicle_make_model,
            lead_id,
            leads!inner (
              customer_number
            )
          )
        `)
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (!filters.showReversed && !filters.status) {
        query = query.neq('status', 'reversed');
      }
      if (filters.searchQuery) {
        query = query.or(`invoice_number.ilike.%${filters.searchQuery}%`);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Transform data
      const transformed = (data || []).map((inv: any) => ({
        ...inv,
        customer_name: inv.uv_sales_orders?.customer_name || '',
        customer_phone: inv.uv_sales_orders?.customer_phone || '',
        customer_number: inv.uv_sales_orders?.leads?.customer_number || '',
        vehicle_make_model: inv.uv_sales_orders?.vehicle_make_model || '',
        order_number: inv.uv_sales_orders?.order_number || '',
        lead_id: inv.uv_sales_orders?.lead_id || ''
      }));

      setInvoices(transformed);

      // Calculate summary
      const summaryData = {
        total: transformed.length,
        pending: transformed.filter((i: Invoice) => i.status === 'pending').length,
        partial: transformed.filter((i: Invoice) => i.status === 'partial').length,
        paid: transformed.filter((i: Invoice) => i.status === 'paid').length,
        reversed: transformed.filter((i: Invoice) => i.status === 'reversed').length,
        totalOutstanding: transformed
          .filter((i: Invoice) => i.status !== 'reversed' && i.status !== 'paid')
          .reduce((sum: number, i: Invoice) => sum + (i.balance_due || 0), 0)
      };
      setSummary(summaryData);

    } catch (error) {
      console.error('Error loading invoices:', error);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Load line items for expanded invoice
  const loadLineItems = async (invoiceId: string) => {
    setLoadingLineItems(true);
    try {
      const { data, error } = await supabase
        .from('uv_invoice_lines')
        .select('*')
        .eq('invoice_id', invoiceId)
        .order('sort_order');

      if (error) throw error;
      setLineItems(data || []);
    } catch (error) {
      console.error('Error loading line items:', error);
    } finally {
      setLoadingLineItems(false);
    }
  };

  // Toggle expanded invoice
  const toggleExpand = (invoiceId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (expandedInvoice === invoiceId) {
      setExpandedInvoice(null);
      setLineItems([]);
    } else {
      setExpandedInvoice(invoiceId);
      loadLineItems(invoiceId);
    }
  };

  // Open account modal for invoice
  const openAccountModal = async (invoice: Invoice) => {
    if (!invoice.lead_id) {
      alert('No customer linked to this invoice');
      return;
    }
    
    setLoadingLead(invoice.id);
    try {
      // Fetch the lead data
      const { data: lead, error } = await supabase
        .from('leads')
        .select('*')
        .eq('id', invoice.lead_id)
        .single();

      if (error) throw error;
      
      if (lead) {
        setSelectedLead(lead);
        setShowAccountModal(true);
      }
    } catch (error) {
      console.error('Error loading lead:', error);
      alert('Failed to load customer data');
    } finally {
      setLoadingLead(null);
    }
  };

  // Initial load
  useEffect(() => {
    loadInvoices();
  }, []);

  // Apply filters
  const applyFilters = () => {
    loadInvoices();
  };

  const clearFilters = () => {
    setFilters({
      status: '',
      searchQuery: '',
      showReversed: false
    });
    setTimeout(() => loadInvoices(), 0);
  };

  // Export to Excel
  const handleExport = async () => {
    if (invoices.length === 0) {
      alert('No data to export');
      return;
    }

    const excelData = invoices.map(inv => ({
      'Invoice #': inv.invoice_number,
      'Date': formatDate(inv.invoice_date),
      'Customer': inv.customer_name,
      'Customer #': inv.customer_number || '',
      'Vehicle': inv.vehicle_make_model,
      'Total (AED)': inv.total_amount,
      'Credit Notes (AED)': inv.credit_note_total || 0,
      'Paid (AED)': inv.paid_amount || 0,
      'Balance (AED)': inv.balance_due || 0,
      'Status': inv.status.toUpperCase(),
      'Age (Days)': getAgingDays(inv.invoice_date)
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);
    ws['!cols'] = [
      { wch: 15 }, { wch: 12 }, { wch: 25 }, { wch: 12 }, { wch: 30 },
      { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 10 }, { wch: 10 }
    ];
    XLSX.utils.book_append_sheet(wb, ws, 'Invoices');
    XLSX.writeFile(wb, `Invoices_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const hasActiveFilters = filters.status || filters.searchQuery || filters.showReversed;

  return (
    <div className="h-full flex flex-col bg-black text-white">
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/10">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-white">Invoices</h1>
            <p className="text-sm text-white/50">All sales invoices</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={loadInvoices}
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
              {hasActiveFilters && <span className="w-2 h-2 rounded-full bg-green-400" />}
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
        <div className="grid grid-cols-6 gap-4 mb-4">
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <div className="text-white/50 text-xs mb-1">TOTAL</div>
            <p className="text-lg font-bold text-white">{summary.total}</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <div className="text-orange-400/70 text-xs mb-1">PENDING</div>
            <p className="text-lg font-bold text-orange-400">{summary.pending}</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <div className="text-yellow-400/70 text-xs mb-1">PARTIAL</div>
            <p className="text-lg font-bold text-yellow-400">{summary.partial}</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <div className="text-green-400/70 text-xs mb-1">PAID</div>
            <p className="text-lg font-bold text-green-400">{summary.paid}</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <div className="text-red-400/70 text-xs mb-1">REVERSED</div>
            <p className="text-lg font-bold text-red-400">{summary.reversed}</p>
          </div>
          <div className="bg-gradient-to-br from-white/10 to-white/5 border border-white/20 rounded-xl p-4">
            <div className="text-white/70 text-xs mb-1">OUTSTANDING</div>
            <p className="text-lg font-bold text-white">AED {formatCurrency(summary.totalOutstanding)}</p>
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-4">
            <div className="grid grid-cols-4 gap-4">
              <div>
                <label className="block text-xs text-white/50 mb-1">Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full px-3 py-2 bg-black border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:border-white/40"
                >
                  <option value="">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="partial">Partial</option>
                  <option value="paid">Paid</option>
                  <option value="reversed">Reversed</option>
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
                    placeholder="Invoice number..."
                    className="w-full pl-9 pr-3 py-2 bg-black border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:border-white/40 placeholder:text-white/30"
                  />
                </div>
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.showReversed}
                    onChange={(e) => setFilters(prev => ({ ...prev, showReversed: e.target.checked }))}
                    className="w-4 h-4 rounded border-white/20 bg-black text-white focus:ring-0"
                  />
                  <span className="text-sm text-white/70">Show Reversed</span>
                </label>
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
        ) : invoices.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-white/40">
            <AlertCircle className="w-12 h-12 mb-3 opacity-50" />
            <p className="text-lg">No invoices found</p>
          </div>
        ) : (
          <table className="w-full border-collapse border border-white/20">
            <thead className="sticky top-0 bg-zinc-900 z-10">
              <tr>
                <th className="px-2 py-2.5 text-center text-[10px] font-semibold text-white/70 uppercase tracking-wider border border-white/20 bg-zinc-800 w-10"></th>
                <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-white/70 uppercase tracking-wider border border-white/20 bg-zinc-800 w-28">Invoice</th>
                <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-white/70 uppercase tracking-wider border border-white/20 bg-zinc-800 w-24">Date</th>
                <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-white/70 uppercase tracking-wider border border-white/20 bg-zinc-800 w-24">CIN</th>
                <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-white/70 uppercase tracking-wider border border-white/20 bg-zinc-800 w-44">Customer</th>
                <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-white/70 uppercase tracking-wider border border-white/20 bg-zinc-800 w-40">Vehicle</th>
                <th className="px-3 py-2.5 text-right text-[10px] font-semibold text-white/70 uppercase tracking-wider border border-white/20 bg-zinc-800 w-24">Total</th>
                <th className="px-3 py-2.5 text-right text-[10px] font-semibold text-white/70 uppercase tracking-wider border border-white/20 bg-zinc-800 w-24">Paid</th>
                <th className="px-3 py-2.5 text-right text-[10px] font-semibold text-white/70 uppercase tracking-wider border border-white/20 bg-zinc-800 w-24">Balance</th>
                <th className="px-3 py-2.5 text-center text-[10px] font-semibold text-white/70 uppercase tracking-wider border border-white/20 bg-zinc-800 w-20">Status</th>
                <th className="px-3 py-2.5 text-center text-[10px] font-semibold text-white/70 uppercase tracking-wider border border-white/20 bg-zinc-800 w-14">Age</th>
                <th className="px-2 py-2.5 text-center text-[10px] font-semibold text-white/70 uppercase tracking-wider border border-white/20 bg-zinc-800 w-12"></th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice) => {
                const agingDays = getAgingDays(invoice.invoice_date);
                const isExpanded = expandedInvoice === invoice.id;
                
                return (
                  <React.Fragment key={invoice.id}>
                    <tr 
                      className={`hover:bg-white/10 transition-colors ${isExpanded ? 'bg-white/5' : ''}`}
                    >
                      <td className="px-2 py-2 border border-white/20 bg-black text-center cursor-pointer" onClick={(e) => toggleExpand(invoice.id, e)}>
                        <ChevronRight className={`w-3.5 h-3.5 text-white/40 transition-transform mx-auto ${isExpanded ? 'rotate-90' : ''}`} />
                      </td>
                      <td className="px-3 py-2 border border-white/20 bg-black cursor-pointer" onClick={() => openAccountModal(invoice)}>
                        <span className="text-xs font-mono text-amber-400">{invoice.invoice_number}</span>
                        <div className="text-[10px] text-white/40">{invoice.order_number}</div>
                      </td>
                      <td className="px-3 py-2 border border-white/20 bg-black text-xs text-white/70 cursor-pointer" onClick={() => openAccountModal(invoice)}>
                        {formatDate(invoice.invoice_date)}
                      </td>
                      <td className="px-3 py-2 border border-white/20 bg-black cursor-pointer" onClick={() => openAccountModal(invoice)}>
                        <span className="text-xs font-mono text-white/70">{invoice.customer_number || '-'}</span>
                      </td>
                      <td className="px-3 py-2 border border-white/20 bg-black cursor-pointer" onClick={() => openAccountModal(invoice)}>
                        <div className="text-xs text-white truncate">{invoice.customer_name}</div>
                      </td>
                      <td className="px-3 py-2 border border-white/20 bg-black cursor-pointer" onClick={() => openAccountModal(invoice)}>
                        <div className="text-[10px] text-white/60 truncate" title={invoice.vehicle_make_model}>
                          {invoice.vehicle_make_model}
                        </div>
                      </td>
                      <td className="px-3 py-2 border border-white/20 bg-black text-right text-xs text-white font-medium cursor-pointer" onClick={() => openAccountModal(invoice)}>
                        {formatCurrency(invoice.total_amount)}
                      </td>
                      <td className="px-3 py-2 border border-white/20 bg-black text-right text-xs text-green-400 cursor-pointer" onClick={() => openAccountModal(invoice)}>
                        {formatCurrency(invoice.paid_amount || 0)}
                      </td>
                      <td className="px-3 py-2 border border-white/20 bg-black text-right cursor-pointer" onClick={() => openAccountModal(invoice)}>
                        <span className={`text-xs font-medium ${
                          invoice.balance_due > 0 ? 'text-red-400' : 'text-green-400'
                        }`}>
                          {formatCurrency(invoice.balance_due || 0)}
                        </span>
                      </td>
                      <td className="px-2 py-2 border border-white/20 bg-black text-center cursor-pointer" onClick={() => openAccountModal(invoice)}>
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${getStatusColor(invoice.status)}`}>
                          {getStatusIcon(invoice.status)}
                          {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-2 py-2 border border-white/20 bg-black text-center cursor-pointer" onClick={() => openAccountModal(invoice)}>
                        <span className={`text-xs font-medium ${getAgingColor(agingDays, invoice.status)}`}>
                          {agingDays}d
                        </span>
                      </td>
                      <td className="px-2 py-2 border border-white/20 bg-black text-center">
                        <button
                          onClick={() => openAccountModal(invoice)}
                          disabled={loadingLead === invoice.id}
                          className="p-1 text-white/40 hover:text-white hover:bg-white/10 rounded transition-colors disabled:opacity-50"
                          title="View Account"
                        >
                          {loadingLead === invoice.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <ExternalLink className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </td>
                    </tr>
                    
                    {/* Expanded Line Items */}
                    {isExpanded && (
                      <tr>
                        <td colSpan={11} className="bg-white/5 px-8 py-4">
                          {loadingLineItems ? (
                            <div className="flex items-center justify-center py-4">
                              <Loader2 className="w-5 h-5 text-white/50 animate-spin" />
                            </div>
                          ) : lineItems.length === 0 ? (
                            <p className="text-sm text-white/40 text-center py-2">No line items found</p>
                          ) : (
                            <div className="space-y-2">
                              <p className="text-xs text-white/50 uppercase tracking-wider mb-2">Line Items</p>
                              <table className="w-full">
                                <thead>
                                  <tr className="text-xs text-white/40">
                                    <th className="text-left py-1 px-2">Description</th>
                                    <th className="text-right py-1 px-2 w-20">Qty</th>
                                    <th className="text-right py-1 px-2 w-32">Unit Price</th>
                                    <th className="text-right py-1 px-2 w-32">Total</th>
                                  </tr>
                                </thead>
                                <tbody className="text-sm">
                                  {lineItems.map((item, idx) => (
                                    <tr key={idx} className="border-t border-white/5">
                                      <td className="py-2 px-2 text-white/80">{item.description}</td>
                                      <td className="py-2 px-2 text-right text-white/60">{item.quantity}</td>
                                      <td className="py-2 px-2 text-right text-white/60">{formatCurrency(item.unit_price)}</td>
                                      <td className="py-2 px-2 text-right text-white font-medium">{formatCurrency(item.line_total)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-3 border-t border-white/10 bg-white/5">
        <div className="flex items-center justify-between text-sm text-white/50">
          <span>Showing {invoices.length} invoices</span>
          <span>All amounts in AED</span>
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
          onSalesOrderCreated={() => loadInvoices()}
          onSalesOrderUpdated={() => loadInvoices()}
        />
      )}
    </div>
  );
}

