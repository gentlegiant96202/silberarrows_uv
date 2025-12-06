"use client";

import { useState, useEffect } from 'react';
import { 
  Search, Filter, RefreshCw, ExternalLink,
  TrendingUp, TrendingDown, DollarSign, Clock
} from 'lucide-react';
import UVAccountingDashboard from './UVAccountingDashboard';

interface DealSummary {
  id: string;
  lead_id: string;
  deal_number: string;
  status: string;
  customer_name: string;
  customer_phone: string;
  vehicle_model?: string;
  vehicle_year?: number;
  invoice_total: number;
  total_paid: number;
  balance_due: number;
  created_at: string;
}

interface Totals {
  total_invoiced: number;
  total_collected: number;
  total_outstanding: number;
  count_pending: number;
  count_partial: number;
  count_paid: number;
  count_cancelled: number;
}

const formatCurrency = (amount: number) => {
  if (amount >= 1000000) {
    return (amount / 1000000).toFixed(1) + 'M';
  }
  if (amount >= 1000) {
    return (amount / 1000).toFixed(0) + 'K';
  }
  return amount.toFixed(0);
};

const formatFullCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-AE', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

const formatDate = (dateString: string) => {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short'
  });
};

export default function UVReceivablesList() {
  const [deals, setDeals] = useState<DealSummary[]>([]);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDeal, setSelectedDeal] = useState<DealSummary | null>(null);

  useEffect(() => {
    fetchDeals();
  }, [statusFilter, searchQuery]);

  const fetchDeals = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (searchQuery) params.set('search', searchQuery);

      const response = await fetch(`/api/uv-accounting/deals?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch deals');

      const data = await response.json();
      setDeals(data.deals || []);
      setTotals(data.totals || null);
    } catch (error) {
      console.error('Error fetching deals:', error);
    } finally {
      setLoading(false);
    }
  };

  const statusColors: Record<string, { bg: string; text: string; dot: string }> = {
    'pending': { bg: 'bg-yellow-500/10', text: 'text-yellow-400', dot: '○' },
    'partial': { bg: 'bg-blue-500/10', text: 'text-blue-400', dot: '◐' },
    'paid': { bg: 'bg-green-500/10', text: 'text-green-400', dot: '●' },
    'cancelled': { bg: 'bg-red-500/10', text: 'text-red-400', dot: '✕' }
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      {totals && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-white/10 to-white/5 rounded-xl p-4 border border-white/10">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-white/10">
                <DollarSign size={18} className="text-white/60" />
              </div>
              <span className="text-white/60 text-xs uppercase tracking-wide">Total Invoiced</span>
            </div>
            <p className="text-2xl font-bold text-white">
              {formatCurrency(totals.total_invoiced)} <span className="text-sm font-normal text-white/50">AED</span>
            </p>
          </div>

          <div className="bg-gradient-to-br from-green-500/10 to-green-500/5 rounded-xl p-4 border border-green-500/20">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-green-500/20">
                <TrendingUp size={18} className="text-green-400" />
              </div>
              <span className="text-white/60 text-xs uppercase tracking-wide">Collected</span>
            </div>
            <p className="text-2xl font-bold text-green-400">
              {formatCurrency(totals.total_collected)} <span className="text-sm font-normal text-green-400/50">AED</span>
            </p>
          </div>

          <div className="bg-gradient-to-br from-red-500/10 to-red-500/5 rounded-xl p-4 border border-red-500/20">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-red-500/20">
                <TrendingDown size={18} className="text-red-400" />
              </div>
              <span className="text-white/60 text-xs uppercase tracking-wide">Outstanding</span>
            </div>
            <p className="text-2xl font-bold text-red-400">
              {formatCurrency(totals.total_outstanding)} <span className="text-sm font-normal text-red-400/50">AED</span>
            </p>
          </div>

          <div className="bg-gradient-to-br from-white/10 to-white/5 rounded-xl p-4 border border-white/10">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-white/10">
                <Clock size={18} className="text-white/60" />
              </div>
              <span className="text-white/60 text-xs uppercase tracking-wide">By Status</span>
            </div>
            <div className="flex gap-3 text-sm">
              <span className="text-yellow-400">{totals.count_pending} ○</span>
              <span className="text-blue-400">{totals.count_partial} ◐</span>
              <span className="text-green-400">{totals.count_paid} ●</span>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
          <input
            type="text"
            placeholder="Search customer or deal number..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-white/30 placeholder-white/40"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-white/30"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="partial">Partial</option>
            <option value="paid">Paid</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <button
            onClick={fetchDeals}
            disabled={loading}
            className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-all disabled:opacity-50"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Deals Table */}
      <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left px-4 py-3 text-xs font-semibold text-white/60 uppercase tracking-wide">Deal #</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-white/60 uppercase tracking-wide">Customer</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-white/60 uppercase tracking-wide hidden md:table-cell">Vehicle</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-white/60 uppercase tracking-wide">Invoice</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-white/60 uppercase tracking-wide">Paid</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-white/60 uppercase tracking-wide">Balance</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-white/60 uppercase tracking-wide">Status</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-white/60 uppercase tracking-wide"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-white/5">
                    <td colSpan={8} className="px-4 py-3">
                      <div className="h-4 bg-white/5 rounded animate-pulse"></div>
                    </td>
                  </tr>
                ))
              ) : deals.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-white/40">
                    No deals found
                  </td>
                </tr>
              ) : (
                deals.map(deal => {
                  const status = statusColors[deal.status] || statusColors.pending;
                  return (
                    <tr 
                      key={deal.id} 
                      className="border-b border-white/5 hover:bg-white/5 cursor-pointer transition-all"
                      onClick={() => setSelectedDeal(deal)}
                    >
                      <td className="px-4 py-3">
                        <span className="text-white font-medium text-sm">{deal.deal_number}</span>
                        <span className="text-white/40 text-xs block">{formatDate(deal.created_at)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-white text-sm">{deal.customer_name}</span>
                        <span className="text-white/40 text-xs block">{deal.customer_phone}</span>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className="text-white/70 text-sm">
                          {deal.vehicle_year && deal.vehicle_model 
                            ? `${deal.vehicle_year} ${deal.vehicle_model}` 
                            : '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-white text-sm font-medium">{formatFullCurrency(deal.invoice_total)}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-green-400 text-sm">{formatFullCurrency(deal.total_paid)}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`text-sm font-semibold ${deal.balance_due > 0 ? 'text-red-400' : 'text-green-400'}`}>
                          {formatFullCurrency(Math.max(deal.balance_due, 0))}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-sm ${status.bg} ${status.text}`}>
                          {status.dot}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button className="p-1.5 text-white/40 hover:text-white hover:bg-white/10 rounded transition-all">
                          <ExternalLink size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer */}
        {deals.length > 0 && (
          <div className="px-4 py-3 border-t border-white/10 bg-white/5 flex items-center justify-between">
            <span className="text-white/50 text-xs">{deals.length} deals</span>
            <div className="flex items-center gap-4 text-xs">
              <span className="text-white/50">Total Balance:</span>
              <span className="text-white font-semibold">
                {formatFullCurrency(deals.reduce((sum, d) => sum + Math.max(d.balance_due, 0), 0))} AED
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-white/50">
        <span className="flex items-center gap-1"><span className="text-yellow-400">○</span> Pending</span>
        <span className="flex items-center gap-1"><span className="text-blue-400">◐</span> Partial</span>
        <span className="flex items-center gap-1"><span className="text-green-400">●</span> Paid</span>
        <span className="flex items-center gap-1"><span className="text-red-400">✕</span> Cancelled</span>
      </div>

      {/* Accounting Dashboard Modal */}
      {selectedDeal && (
        <UVAccountingDashboard
          leadId={selectedDeal.lead_id}
          customerName={selectedDeal.customer_name}
          customerPhone={selectedDeal.customer_phone}
          dealId={selectedDeal.id}
          onClose={() => {
            setSelectedDeal(null);
            fetchDeals(); // Refresh after closing
          }}
        />
      )}
    </div>
  );
}

