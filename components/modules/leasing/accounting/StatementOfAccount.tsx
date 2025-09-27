"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { 
  Download, 
  FileText, 
  Calendar,
  DollarSign,
  CreditCard,
  Receipt,
  TrendingUp,
  TrendingDown,
  Filter,
  X
} from "lucide-react";

interface StatementEntry {
  id: string;
  date: string;
  description: string;
  reference: string;
  debit: number;
  credit: number;
  balance: number;
  type: 'charge' | 'payment' | 'invoice';
  billing_period?: string;
  status: string;
}

interface Props {
  leaseId: string;
  customerName: string;
  records: any[];
  onExportPDF: () => void;
}

export default function StatementOfAccount({ 
  leaseId, 
  customerName, 
  records,
  onExportPDF 
}: Props) {
  const [statementEntries, setStatementEntries] = useState<StatementEntry[]>([]);
  const [filteredEntries, setFilteredEntries] = useState<StatementEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'charge' | 'payment' | 'invoice'>('all');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    generateStatement();
  }, [records]);

  useEffect(() => {
    applyFilters();
  }, [statementEntries, dateFrom, dateTo, typeFilter]);

  const generateStatement = () => {
    setLoading(true);
    
    const entries: StatementEntry[] = [];
    let runningBalance = 0;

    // Sort records by date
    const sortedRecords = [...records].sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    sortedRecords.forEach(record => {
      const isPayment = record.total_amount < 0;
      const amount = Math.abs(record.total_amount);
      
      if (isPayment) {
        // Payment entry (credit)
        runningBalance -= amount;
        entries.push({
          id: record.id,
          date: record.created_at.split('T')[0],
          description: `Payment Received - ${record.comment?.split(' - ')[1]?.split(',')[0] || 'Payment'}`,
          reference: record.payment_id || record.id.slice(0, 8),
          debit: 0,
          credit: amount,
          balance: runningBalance,
          type: 'payment',
          status: record.status
        });
      } else {
        // Charge entry (debit)
        runningBalance += amount;
        
        const chargeTypes = {
          rental: 'Monthly Rental',
          salik: 'Salik Charges',
          mileage: 'Excess Mileage',
          late_fee: 'Late Payment Fee',
          fine: 'Traffic Fine'
        };
        
        const description = chargeTypes[record.charge_type as keyof typeof chargeTypes] || record.charge_type;
        
        entries.push({
          id: record.id,
          date: record.billing_period || record.created_at.split('T')[0],
          description: `${description}${record.comment ? ` - ${record.comment}` : ''}`,
          reference: record.invoice_id ? `INV-${record.invoice_id.slice(0, 8)}` : record.id.slice(0, 8),
          debit: amount,
          credit: 0,
          balance: runningBalance,
          type: record.invoice_id ? 'invoice' : 'charge',
          billing_period: record.billing_period,
          status: record.status
        });
      }
    });

    setStatementEntries(entries);
    setLoading(false);
  };

  const applyFilters = () => {
    let filtered = [...statementEntries];

    // Date filters
    if (dateFrom) {
      filtered = filtered.filter(entry => entry.date >= dateFrom);
    }
    if (dateTo) {
      filtered = filtered.filter(entry => entry.date <= dateTo);
    }

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(entry => entry.type === typeFilter);
    }

    setFilteredEntries(filtered);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AE', {
      style: 'currency',
      currency: 'AED',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getEntryIcon = (type: string) => {
    switch (type) {
      case 'payment':
        return <CreditCard size={16} className="text-green-400" />;
      case 'invoice':
        return <FileText size={16} className="text-blue-400" />;
      default:
        return <Receipt size={16} className="text-yellow-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    const colors = {
      pending: 'text-yellow-400',
      invoiced: 'text-blue-400',
      paid: 'text-green-400',
      overdue: 'text-red-400'
    };
    return colors[status as keyof typeof colors] || 'text-gray-400';
  };

  const clearFilters = () => {
    setDateFrom('');
    setDateTo('');
    setTypeFilter('all');
  };

  // Calculate summary statistics
  const totalDebits = filteredEntries.reduce((sum, entry) => sum + entry.debit, 0);
  const totalCredits = filteredEntries.reduce((sum, entry) => sum + entry.credit, 0);
  const currentBalance = filteredEntries.length > 0 ? filteredEntries[filteredEntries.length - 1].balance : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white/60"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Summary */}
      <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-semibold text-white">Statement of Account</h3>
            <p className="text-white/60 text-sm mt-1">{customerName}</p>
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-all border border-white/10"
            >
              <Filter size={16} />
              Filters
            </button>
            
            <button
              onClick={onExportPDF}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-br from-gray-200 via-gray-100 to-gray-400 text-black font-medium rounded-lg hover:shadow-lg transition-all"
            >
              <Download size={16} />
              Export PDF
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white/5 rounded-lg p-4 border border-white/10">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/20">
                <TrendingUp size={20} className="text-red-400" />
              </div>
              <div>
                <p className="text-white/60 text-sm">Total Charges</p>
                <p className="text-white font-semibold">{formatCurrency(totalDebits)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white/5 rounded-lg p-4 border border-white/10">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/20">
                <TrendingDown size={20} className="text-green-400" />
              </div>
              <div>
                <p className="text-white/60 text-sm">Total Payments</p>
                <p className="text-white font-semibold">{formatCurrency(totalCredits)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white/5 rounded-lg p-4 border border-white/10">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/20">
                <DollarSign size={20} className="text-blue-400" />
              </div>
              <div>
                <p className="text-white/60 text-sm">Current Balance</p>
                <p className={`font-semibold ${currentBalance >= 0 ? 'text-red-400' : 'text-green-400'}`}>
                  {formatCurrency(Math.abs(currentBalance))} {currentBalance >= 0 ? 'Due' : 'Credit'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white/5 rounded-lg p-4 border border-white/10">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-white/10">
                <FileText size={20} className="text-white/60" />
              </div>
              <div>
                <p className="text-white/60 text-sm">Total Entries</p>
                <p className="text-white font-semibold">{filteredEntries.length}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-white font-semibold">Filters</h4>
            <button
              onClick={() => setShowFilters(false)}
              className="p-1 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-all"
            >
              <X size={16} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-white/80 text-sm font-medium mb-2">From Date</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-black/20 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-white/30"
              />
            </div>

            <div>
              <label className="block text-white/80 text-sm font-medium mb-2">To Date</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-black/20 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-white/30"
              />
            </div>

            <div>
              <label className="block text-white/80 text-sm font-medium mb-2">Entry Type</label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as any)}
                className="w-full px-3 py-2 rounded-lg bg-black/20 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-white/30"
              >
                <option value="all">All Types</option>
                <option value="charge">Charges Only</option>
                <option value="payment">Payments Only</option>
                <option value="invoice">Invoices Only</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={clearFilters}
                className="w-full px-4 py-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-all border border-white/10"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Statement Table */}
      <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10 bg-white/5">
                <th className="text-left text-white/80 font-medium py-4 px-4">Date</th>
                <th className="text-left text-white/80 font-medium py-4 px-4">Description</th>
                <th className="text-left text-white/80 font-medium py-4 px-4">Reference</th>
                <th className="text-right text-white/80 font-medium py-4 px-4">Debit</th>
                <th className="text-right text-white/80 font-medium py-4 px-4">Credit</th>
                <th className="text-right text-white/80 font-medium py-4 px-4">Balance</th>
                <th className="text-center text-white/80 font-medium py-4 px-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-white/60">
                    <FileText size={32} className="text-white/20 mx-auto mb-2" />
                    <p>No entries found</p>
                    <p className="text-white/40 text-sm mt-1">Try adjusting your filters</p>
                  </td>
                </tr>
              ) : (
                filteredEntries.map((entry, index) => (
                  <tr 
                    key={entry.id} 
                    className={`border-b border-white/5 hover:bg-white/5 transition-all ${
                      index % 2 === 0 ? 'bg-white/2' : ''
                    }`}
                  >
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        {getEntryIcon(entry.type)}
                        <span className="text-white text-sm">{formatDate(entry.date)}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div>
                        <p className="text-white text-sm font-medium">{entry.description}</p>
                        {entry.billing_period && (
                          <p className="text-white/50 text-xs">Period: {formatDate(entry.billing_period)}</p>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-white/70 text-sm font-mono">{entry.reference}</span>
                    </td>
                    <td className="py-4 px-4 text-right">
                      {entry.debit > 0 && (
                        <span className="text-red-400 font-medium">{formatCurrency(entry.debit)}</span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-right">
                      {entry.credit > 0 && (
                        <span className="text-green-400 font-medium">{formatCurrency(entry.credit)}</span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-right">
                      <span className={`font-medium ${entry.balance >= 0 ? 'text-red-400' : 'text-green-400'}`}>
                        {formatCurrency(Math.abs(entry.balance))}
                        <span className="text-xs ml-1 text-white/50">
                          {entry.balance >= 0 ? 'DR' : 'CR'}
                        </span>
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className={`text-xs px-2 py-1 rounded-full bg-white/10 ${getStatusColor(entry.status)}`}>
                        {entry.status.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Statement Footer */}
      <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
        <div className="flex justify-between items-center text-sm text-white/60">
          <div>
            Statement generated on {formatDate(new Date().toISOString())} • 
            Showing {filteredEntries.length} of {statementEntries.length} entries
          </div>
          <div className="flex items-center gap-4">
            <span>Balance as of {formatDate(new Date().toISOString())}:</span>
            <span className={`font-semibold text-lg ${currentBalance >= 0 ? 'text-red-400' : 'text-green-400'}`}>
              {formatCurrency(Math.abs(currentBalance))} {currentBalance >= 0 ? 'Due' : 'Credit'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
