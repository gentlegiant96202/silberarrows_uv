"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useIsAdminSimple } from '@/lib/useIsAdminSimple';
import * as XLSX from 'xlsx';
import { 
  ShieldCheck,
  RefreshCw,
  Filter,
  Download,
  Search,
  X,
  Loader2,
  AlertCircle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  FileText,
  CreditCard,
  Receipt,
  Building2,
  User,
  Clock
} from 'lucide-react';
import SalesOrderModal from '../modals/SalesOrderModal';

// ===== INTERFACES =====
interface AuditEntry {
  id: string;
  user_id: string;
  user_email: string;
  action: string;
  entity_type: string;
  entity_id: string;
  entity_number: string;
  lead_id: string;
  customer_number: string;
  customer_name: string;
  old_values: any;
  new_values: any;
  metadata: any;
  created_at: string;
}

interface FilterState {
  fromDate: string;
  toDate: string;
  action: string;
  entityType: string;
  searchQuery: string;
  userId: string;
}

// ===== HELPER FUNCTIONS =====
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

const getActionColor = (action: string) => {
  if (action.includes('created')) return 'text-green-400 bg-green-500/10';
  if (action.includes('reversed') || action.includes('deleted')) return 'text-red-400 bg-red-500/10';
  if (action.includes('updated') || action.includes('changed')) return 'text-amber-400 bg-amber-500/10';
  if (action.includes('allocated')) return 'text-blue-400 bg-blue-500/10';
  if (action.includes('generated')) return 'text-purple-400 bg-purple-500/10';
  return 'text-white/70 bg-white/5';
};

const getActionIcon = (entityType: string) => {
  switch (entityType) {
    case 'sales_order': return <FileText className="w-3 h-3" />;
    case 'invoice': return <FileText className="w-3 h-3" />;
    case 'payment': return <CreditCard className="w-3 h-3" />;
    case 'payment_allocation': return <CreditCard className="w-3 h-3" />;
    case 'credit_note': return <Receipt className="w-3 h-3" />;
    case 'debit_note': return <Receipt className="w-3 h-3" />;
    case 'refund': return <Receipt className="w-3 h-3" />;
    case 'bank_finance': return <Building2 className="w-3 h-3" />;
    default: return <FileText className="w-3 h-3" />;
  }
};

const formatAction = (action: string) => {
  return action
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const formatEntityType = (type: string) => {
  return type
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

// ===== MAIN COMPONENT =====
export default function AuditLog() {
  const { isAdmin } = useIsAdminSimple();
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [offset, setOffset] = useState(0);
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null);
  const LIMIT = 50;

  // Users list for filter dropdown
  const [users, setUsers] = useState<{ id: string; email: string }[]>([]);

  // Modal state
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [loadingLead, setLoadingLead] = useState<string | null>(null);

  const [filters, setFilters] = useState<FilterState>({
    fromDate: '',
    toDate: '',
    action: '',
    entityType: '',
    searchQuery: '',
    userId: ''
  });

  // Load unique users from audit log
  const loadUsers = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('uv_audit_log')
        .select('user_id, user_email')
        .not('user_email', 'is', null);
      
      if (error) throw error;
      
      // Get unique users
      const uniqueUsers = Array.from(
        new Map(data?.map(u => [u.user_id, { id: u.user_id, email: u.user_email }])).values()
      );
      setUsers(uniqueUsers);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  }, []);

  // Load audit entries
  const loadEntries = useCallback(async (reset: boolean = false) => {
    if (reset) {
      setLoading(true);
      setOffset(0);
    } else {
      setLoadingMore(true);
    }

    try {
      const currentOffset = reset ? 0 : offset;
      
      let query = supabase
        .from('uv_audit_log')
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
      if (filters.action) {
        query = query.eq('action', filters.action);
      }
      if (filters.entityType) {
        query = query.eq('entity_type', filters.entityType);
      }
      if (filters.userId) {
        query = query.eq('user_id', filters.userId);
      }
      if (filters.searchQuery) {
        query = query.or(`customer_name.ilike.%${filters.searchQuery}%,customer_number.ilike.%${filters.searchQuery}%,entity_number.ilike.%${filters.searchQuery}%,user_email.ilike.%${filters.searchQuery}%`);
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
      console.error('Error loading audit log:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [filters, offset]);

  // Open customer modal
  const openCustomerModal = async (leadId: string) => {
    if (!leadId) return;
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
    loadEntries(true);
    loadUsers();
  }, []);

  // Apply filters
  const applyFilters = () => {
    loadEntries(true);
  };

  const clearFilters = () => {
    setFilters({
      fromDate: '',
      toDate: '',
      action: '',
      entityType: '',
      searchQuery: '',
      userId: ''
    });
    setTimeout(() => loadEntries(true), 0);
  };

  const hasActiveFilters = filters.fromDate || filters.toDate || filters.action || filters.entityType || filters.searchQuery || filters.userId;

  // Export to Excel
  const handleExport = async () => {
    try {
      let query = supabase
        .from('uv_audit_log')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters.fromDate) query = query.gte('created_at', filters.fromDate);
      if (filters.toDate) query = query.lte('created_at', filters.toDate + 'T23:59:59');
      if (filters.action) query = query.eq('action', filters.action);
      if (filters.entityType) query = query.eq('entity_type', filters.entityType);
      if (filters.userId) query = query.eq('user_id', filters.userId);
      if (filters.searchQuery) {
        query = query.or(`customer_name.ilike.%${filters.searchQuery}%,customer_number.ilike.%${filters.searchQuery}%,entity_number.ilike.%${filters.searchQuery}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      if (!data || data.length === 0) {
        alert('No data to export');
        return;
      }

      const excelData = data.map(entry => {
        const { date, time } = formatDateTime(entry.created_at);
        return {
          'Date': date,
          'Time': time,
          'User': entry.user_email || 'System',
          'Action': formatAction(entry.action),
          'Entity Type': formatEntityType(entry.entity_type),
          'Reference': entry.entity_number || '',
          'Customer #': entry.customer_number || '',
          'Customer': entry.customer_name || '',
          'Old Values': entry.old_values ? JSON.stringify(entry.old_values) : '',
          'New Values': entry.new_values ? JSON.stringify(entry.new_values) : '',
        };
      });

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(excelData);

      ws['!cols'] = [
        { wch: 12 }, { wch: 10 }, { wch: 25 }, { wch: 25 },
        { wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 25 },
        { wch: 40 }, { wch: 40 }
      ];

      XLSX.utils.book_append_sheet(wb, ws, 'Audit Log');

      const dateStr = new Date().toISOString().split('T')[0];
      XLSX.writeFile(wb, `Audit_Log_${dateStr}.xlsx`);
    } catch (error) {
      console.error('Error exporting:', error);
      alert('Error exporting data');
    }
  };

  // Get unique actions for filter dropdown
  const actionOptions = [
    'sales_order_created', 'sales_order_updated', 'sales_order_status_changed',
    'invoice_created', 'invoice_reversed', 'invoice_status_changed', 'invoice_pdf_generated',
    'payment_created', 'payment_status_changed', 'payment_allocated', 'payment_unallocated', 'payment_allocation_updated',
    'credit_note_created', 'debit_note_created', 'refund_created',
    'bank_finance_created', 'bank_finance_status_changed'
  ];

  const entityTypeOptions = [
    'sales_order', 'invoice', 'payment', 'payment_allocation',
    'credit_note', 'debit_note', 'refund', 'bank_finance'
  ];

  // Check admin access
  if (!isAdmin) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-black text-white">
        <ShieldCheck className="w-16 h-16 text-white/20 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Access Restricted</h2>
        <p className="text-white/50">Audit log is only available to administrators.</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-black text-white">
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/10">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5" />
              Audit Log
            </h1>
            <p className="text-sm text-white/50">Complete audit trail of all accounting actions</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => loadEntries(true)}
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

        {/* Filters Panel */}
        {showFilters && (
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-4">
            <div className="grid grid-cols-7 gap-4">
              {/* Search */}
              <div className="col-span-2">
                <label className="block text-xs text-white/50 mb-1">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                  <input
                    type="text"
                    value={filters.searchQuery}
                    onChange={(e) => setFilters(prev => ({ ...prev, searchQuery: e.target.value }))}
                    placeholder="Customer, reference, user..."
                    className="w-full pl-9 pr-3 py-2 bg-black border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:border-white/40 placeholder:text-white/30"
                  />
                </div>
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
                <label className="block text-xs text-white/50 mb-1">Action</label>
                <select
                  value={filters.action}
                  onChange={(e) => setFilters(prev => ({ ...prev, action: e.target.value }))}
                  className="w-full px-3 py-2 bg-black border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:border-white/40"
                >
                  <option value="">All Actions</option>
                  {actionOptions.map(action => (
                    <option key={action} value={action}>{formatAction(action)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-white/50 mb-1">Entity Type</label>
                <select
                  value={filters.entityType}
                  onChange={(e) => setFilters(prev => ({ ...prev, entityType: e.target.value }))}
                  className="w-full px-3 py-2 bg-black border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:border-white/40"
                >
                  <option value="">All Types</option>
                  {entityTypeOptions.map(type => (
                    <option key={type} value={type}>{formatEntityType(type)}</option>
                  ))}
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

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 text-white/50 animate-spin" />
          </div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-white/40">
            <AlertCircle className="w-12 h-12 mb-3 opacity-50" />
            <p className="text-lg">No audit entries found</p>
            <p className="text-sm">Try adjusting your filters</p>
          </div>
        ) : (
          <table className="w-full border-collapse border border-white/20">
            <thead className="sticky top-0 bg-zinc-900 z-10">
              <tr>
                <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-white/70 uppercase tracking-wider border border-white/20 bg-zinc-800 w-28">
                  Date/Time
                </th>
                <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-white/70 uppercase tracking-wider border border-white/20 bg-zinc-800 w-40">
                  User
                </th>
                <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-white/70 uppercase tracking-wider border border-white/20 bg-zinc-800 w-40">
                  Action
                </th>
                <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-white/70 uppercase tracking-wider border border-white/20 bg-zinc-800 w-24">
                  Entity
                </th>
                <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-white/70 uppercase tracking-wider border border-white/20 bg-zinc-800 w-28">
                  Reference
                </th>
                <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-white/70 uppercase tracking-wider border border-white/20 bg-zinc-800 w-24">
                  CIN
                </th>
                <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-white/70 uppercase tracking-wider border border-white/20 bg-zinc-800">
                  Customer
                </th>
                <th className="px-3 py-2.5 text-center text-[10px] font-semibold text-white/70 uppercase tracking-wider border border-white/20 bg-zinc-800 w-14">
                  Details
                </th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => {
                const { date, time } = formatDateTime(entry.created_at);
                const isExpanded = expandedEntry === entry.id;
                const isLoading = loadingLead === entry.lead_id;
                
                return (
                  <React.Fragment key={entry.id}>
                    <tr className="hover:bg-white/5 transition-colors">
                      <td className="px-3 py-2 border border-white/20 bg-black">
                        <div className="text-xs text-white">{date}</div>
                        <div className="text-[10px] text-white/40">{time}</div>
                      </td>
                      <td className="px-3 py-2 border border-white/20 bg-black">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3 h-3 text-white/30" />
                          <span className="text-xs text-white/70 truncate">
                            {entry.user_email || 'System'}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2 border border-white/20 bg-black">
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${getActionColor(entry.action)}`}>
                          {getActionIcon(entry.entity_type)}
                          {formatAction(entry.action)}
                        </span>
                      </td>
                      <td className="px-3 py-2 border border-white/20 bg-black">
                        <span className="text-xs text-white/50">{formatEntityType(entry.entity_type)}</span>
                      </td>
                      <td className="px-3 py-2 border border-white/20 bg-black">
                        <span className="text-xs font-mono text-amber-400">{entry.entity_number || '-'}</span>
                      </td>
                      <td className="px-3 py-2 border border-white/20 bg-black">
                        <span className="text-xs font-mono text-white/70">{entry.customer_number || '-'}</span>
                      </td>
                      <td className="px-3 py-2 border border-white/20 bg-black">
                        {entry.lead_id ? (
                          <button
                            onClick={() => openCustomerModal(entry.lead_id)}
                            className="flex items-center gap-1.5 text-xs text-white hover:text-amber-400 transition-colors"
                          >
                            {isLoading && <Loader2 className="w-3 h-3 animate-spin" />}
                            <span className="truncate">{entry.customer_name || '-'}</span>
                            <ExternalLink className="w-3 h-3 text-white/20 flex-shrink-0" />
                          </button>
                        ) : (
                          <span className="text-xs text-white/40">-</span>
                        )}
                      </td>
                      <td className="px-3 py-2 border border-white/20 bg-black text-center">
                        <button
                          onClick={() => setExpandedEntry(isExpanded ? null : entry.id)}
                          className="p-1 text-white/40 hover:text-white hover:bg-white/10 rounded transition-colors"
                        >
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </button>
                      </td>
                    </tr>
                    
                    {/* Expanded Details Row */}
                    {isExpanded && (
                      <tr>
                        <td colSpan={8} className="px-4 py-3 border border-white/20 bg-white/5">
                          <div className="grid grid-cols-2 gap-4">
                            {entry.old_values && Object.keys(entry.old_values).length > 0 && (
                              <div>
                                <p className="text-xs font-semibold text-white/50 mb-2">Previous Values</p>
                                <pre className="text-xs text-white/70 bg-black/50 p-2 rounded overflow-auto max-h-32">
                                  {JSON.stringify(entry.old_values, null, 2)}
                                </pre>
                              </div>
                            )}
                            {entry.new_values && Object.keys(entry.new_values).length > 0 && (
                              <div>
                                <p className="text-xs font-semibold text-white/50 mb-2">New Values</p>
                                <pre className="text-xs text-green-400/80 bg-black/50 p-2 rounded overflow-auto max-h-32">
                                  {JSON.stringify(entry.new_values, null, 2)}
                                </pre>
                              </div>
                            )}
                            {entry.metadata && Object.keys(entry.metadata).length > 0 && (
                              <div className="col-span-2">
                                <p className="text-xs font-semibold text-white/50 mb-2">Additional Details</p>
                                <pre className="text-xs text-white/70 bg-black/50 p-2 rounded overflow-auto max-h-32">
                                  {JSON.stringify(entry.metadata, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        )}

        {/* Load More */}
        {!loading && hasMore && entries.length > 0 && (
          <div className="p-4 text-center">
            <button
              onClick={() => loadEntries(false)}
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

      {/* Account Modal */}
      {showAccountModal && selectedLead && (
        <SalesOrderModal
          isOpen={showAccountModal}
          onClose={() => {
            setShowAccountModal(false);
            setSelectedLead(null);
          }}
          lead={selectedLead}
          onSalesOrderCreated={() => {}}
          onSalesOrderUpdated={() => {}}
        />
      )}
    </div>
  );
}

