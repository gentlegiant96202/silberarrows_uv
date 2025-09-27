"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { 
  Download, 
  Calendar, 
  Receipt,
  FileText,
  Filter,
  TrendingUp,
  TrendingDown,
  CreditCard,
  RefreshCw
} from "lucide-react";

//  Types
interface LeaseAccountingRecord {
  id: string;
  lease_id: string;
  billing_period: string;
  charge_type: 'rental' | 'salik' | 'mileage' | 'late_fee' | 'fine' | 'refund';
  quantity: number | null;
  unit_price: number | null;
  total_amount: number;
  comment: string | null;
  invoice_id: string | null;
  invoice_number: string | null;
  payment_id: string | null;
  status: 'pending' | 'invoiced' | 'paid' | 'overdue';
  vat_applicable: boolean;
  account_closed: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
  version: number;
  documents: any;
}

interface Props {
  leaseId: string;
  customerName: string;
  records: LeaseAccountingRecord[];
  onExportPDF?: () => void;
}

export default function StatementOfAccount({ 
  leaseId, 
  customerName, 
  records,
  onExportPDF 
}: Props) {
  
  const [filteredRecords, setFilteredRecords] = useState<LeaseAccountingRecord[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [dateRange, setDateRange] = useState({
    start: '',
    end: ''
  });
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  useEffect(() => {
    applyFilters();
  }, [records, dateRange, statusFilter, typeFilter]);

  const applyFilters = () => {
    let filtered = [...records];

    // Date range filter
    if (dateRange.start) {
      filtered = filtered.filter(record => 
        new Date(record.created_at) >= new Date(dateRange.start)
      );
    }
    if (dateRange.end) {
      filtered = filtered.filter(record => 
        new Date(record.created_at) <= new Date(dateRange.end + 'T23:59:59')
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(record => record.status === statusFilter);
    }

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(record => record.charge_type === typeFilter);
    }

    // Sort by date (newest first)
    filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    setFilteredRecords(filtered);
  };

  const clearFilters = () => {
    setDateRange({ start: '', end: '' });
    setStatusFilter('all');
    setTypeFilter('all');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AE', {
      style: 'currency',
      style: 'decimal',
      minimumFractionDigits: 2
    }).format(amount) + ' AED';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB');
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getChargeTypeLabel = (type: string) => {
    const labels = {
      rental: 'Monthly Rental',
      salik: 'Salik Fee',
      mileage: 'Excess Mileage',
      late_fee: 'Late Fee',
      fine: 'Traffic Fine',
      refund: 'Refund/Credit'
    };
    return labels[type as keyof typeof labels] || type;
  };

  const getTransactionIcon = (record: LeaseAccountingRecord) => {
    if (record.comment?.startsWith('PAYMENT')) return CreditCard;
    if (record.charge_type === 'refund') return RefreshCw;
    if (record.invoice_id) return Receipt;
    return Receipt;
  };

  // Calculate running balance
  const calculateRunningBalance = () => {
    let runningBalance = 0;
    return filteredRecords.map(record => {
      runningBalance += record.total_amount;
      return { ...record, running_balance: runningBalance };
    }).reverse(); // Reverse to show oldest first for statement
  };

  const recordsWithBalance = calculateRunningBalance();
  const currentBalance = recordsWithBalance.length > 0 ? recordsWithBalance[recordsWithBalance.length - 1].running_balance : 0;
  const totalCharges = filteredRecords.filter(r => r.total_amount > 0).reduce((sum, r) => sum + r.total_amount, 0);
  const totalPayments = Math.abs(filteredRecords.filter(r => r.total_amount < 0).reduce((sum, r) => sum + r.total_amount, 0));

  return (
    <div className="space-y-6">
      
      {/* Statement Header */}
      <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xl font-bold text-white"> Statement of Account</h3>
            <p className="text-neutral-400">{customerName}</p>
          </div>
          
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2 bg-neutral-600 hover:bg-neutral-700 text-white rounded-lg transition-colors"
            >
              <Filter size={16} />
              Filters
            </button>
            
            <button
              onClick={onExportPDF}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg hover:shadow-lg transition-all"
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
              <Receipt className={`${currentBalance > 0 ? 'text-red-400' : 'text-green-400'}`} size={24} />
              <div>
                <p className="text-sm text-neutral-400">Current Balance</p>
                <p className={`text-lg font-bold ${currentBalance > 0 ? 'text-red-400' : 'text-green-400'}`}>
                  {formatCurrency(currentBalance)}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white/5 rounded-lg p-4 border border-white/10">
            <div className="flex items-center gap-3">
              <TrendingUp className="text-red-400" size={24} />
              <div>
                <p className="text-sm text-neutral-400">Total Charges</p>
                <p className="text-lg font-bold text-red-400">
                  {formatCurrency(totalCharges)}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white/5 rounded-lg p-4 border border-white/10">
            <div className="flex items-center gap-3">
              <TrendingDown className="text-green-400" size={24} />
              <div>
                <p className="text-sm text-neutral-400">Total Payments</p>
                <p className="text-lg font-bold text-green-400">
                  {formatCurrency(totalPayments)}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white/5 rounded-lg p-4 border border-white/10">
            <div className="flex items-center gap-3">
              <FileText className="text-blue-400" size={24} />
              <div>
                <p className="text-sm text-neutral-400">Transactions</p>
                <p className="text-lg font-bold text-blue-400">
                  {filteredRecords.length}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm text-neutral-400 mb-2">Start Date</label>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                className="w-full p-2 bg-neutral-700 border border-neutral-600 rounded text-white text-sm"
              />
            </div>
            
            <div>
              <label className="block text-sm text-neutral-400 mb-2">End Date</label>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                className="w-full p-2 bg-neutral-700 border border-neutral-600 rounded text-white text-sm"
              />
            </div>
            
            <div>
              <label className="block text-sm text-neutral-400 mb-2">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full p-2 bg-neutral-700 border border-neutral-600 rounded text-white text-sm"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="invoiced">Invoiced</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm text-neutral-400 mb-2">Type</label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full p-2 bg-neutral-700 border border-neutral-600 rounded text-white text-sm"
              >
                <option value="all">All Types</option>
                <option value="rental">Monthly Rental</option>
                <option value="salik">Salik Fee</option>
                <option value="mileage">Excess Mileage</option>
                <option value="late_fee">Late Fee</option>
                <option value="fine">Traffic Fine</option>
                <option value="refund">Refund/Credit</option>
              </select>
            </div>
          </div>
          
          <div className="flex gap-2 mt-4">
            <button
              onClick={clearFilters}
              className="px-4 py-2 bg-neutral-600 hover:bg-neutral-700 text-white rounded-lg transition-colors text-sm"
            >
              Clear Filters
            </button>
            <span className="text-neutral-400 text-sm py-2">
              Showing {filteredRecords.length} of {records.length} transactions
            </span>
          </div>
        </div>
      )}

      {/* Statement Table */}
      <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden">
        <div className="p-4 border-b border-white/10 bg-white/5">
          <h4 className="text-white font-semibold">Transaction History</h4>
          <p className="text-neutral-400 text-sm">-compliant statement with audit trail</p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-white/5 border-b border-white/10">
              <tr>
                <th className="text-left p-3 text-neutral-400 text-sm font-medium">Date</th>
                <th className="text-left p-3 text-neutral-400 text-sm font-medium">Description</th>
                <th className="text-left p-3 text-neutral-400 text-sm font-medium">Reference</th>
                <th className="text-right p-3 text-neutral-400 text-sm font-medium">Debit</th>
                <th className="text-right p-3 text-neutral-400 text-sm font-medium">Credit</th>
                <th className="text-right p-3 text-neutral-400 text-sm font-medium">Balance</th>
                <th className="text-center p-3 text-neutral-400 text-sm font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {recordsWithBalance.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12">
                    <FileText size={32} className="text-white/20 mx-auto mb-2" />
                    <p className="text-white/60">No transactions found</p>
                    <p className="text-white/40 text-sm">Adjust filters or add transactions</p>
                  </td>
                </tr>
              ) : (
                recordsWithBalance.map((record, index) => {
                  const Icon = getTransactionIcon(record);
                  const isDebit = record.total_amount > 0;
                  const isCredit = record.total_amount < 0;
                  
                  return (
                    <tr key={record.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="p-3">
                        <div className="text-white text-sm">
                          {formatDate(record.created_at)}
                        </div>
                        <div className="text-neutral-400 text-xs">
                          {formatTime(record.created_at)}
                        </div>
                      </td>
                      
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <Icon size={16} className={`${
                            isCredit ? 'text-green-400' : 'text-white/60'
                          }`} />
                          <div>
                            <p className="text-white text-sm font-medium">
                              {getChargeTypeLabel(record.charge_type)}
                            </p>
                            {record.comment && (
                              <p className="text-neutral-400 text-xs truncate max-w-xs">
                                {record.comment}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      
                      <td className="p-3">
                        <div className="text-white text-sm">
                          {record.invoice_number || 
                           (record.invoice_id ? `INV-${record.invoice_id.slice(-8)}` : '') ||
                           (record.payment_id ? `PAY-${record.payment_id.slice(-8)}` : '') ||
                           `TXN-${record.id.slice(-8)}`
                          }
                        </div>
                        <div className="text-neutral-400 text-xs">
                          Period: {formatDate(record.billing_period)}
                        </div>
                      </td>
                      
                      <td className="p-3 text-right">
                        {isDebit && (
                          <div className="text-red-400 font-medium">
                            {formatCurrency(record.total_amount)}
                          </div>
                        )}
                      </td>
                      
                      <td className="p-3 text-right">
                        {isCredit && (
                          <div className="text-green-400 font-medium">
                            {formatCurrency(Math.abs(record.total_amount))}
                          </div>
                        )}
                      </td>
                      
                      <td className="p-3 text-right">
                        <div className={`font-bold ${
                          record.running_balance > 0 ? 'text-red-400' : 
                          record.running_balance < 0 ? 'text-green-400' : 'text-white'
                        }`}>
                          {formatCurrency(record.running_balance)}
                        </div>
                      </td>
                      
                      <td className="p-3 text-center">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                          record.status === 'pending' ? 'text-yellow-400 bg-yellow-400/10' :
                          record.status === 'invoiced' ? 'text-blue-400 bg-blue-400/10' :
                          record.status === 'paid' ? 'text-green-400 bg-green-400/10' :
                          'text-red-400 bg-red-400/10'
                        }`}>
                          {record.status.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        
        {/* Statement Footer */}
        <div className="p-4 border-t border-white/10 bg-white/5">
          <div className="flex items-center justify-between">
            <div className="text-sm text-neutral-400">
-Compliant Statement • Generated: {new Date().toLocaleDateString('en-GB')} {new Date().toLocaleTimeString('en-GB')}
            </div>
            <div className="text-right">
              <p className="text-sm text-neutral-400">Current Balance</p>
              <p className={`text-xl font-bold ${
                currentBalance > 0 ? 'text-red-400' : 
                currentBalance < 0 ? 'text-green-400' : 'text-white'
              }`}>
                {formatCurrency(currentBalance)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Transaction Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-white/10">
          <div className="flex items-center gap-3">
            <TrendingUp className="text-red-400" size={20} />
            <div>
              <p className="text-sm text-neutral-400">Total Debits</p>
              <p className="text-red-400 font-bold">{formatCurrency(totalCharges)}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-white/10">
          <div className="flex items-center gap-3">
            <TrendingDown className="text-green-400" size={20} />
            <div>
              <p className="text-sm text-neutral-400">Total Credits</p>
              <p className="text-green-400 font-bold">{formatCurrency(totalPayments)}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-white/10">
          <div className="flex items-center gap-3">
            <FileText className="text-blue-400" size={20} />
            <div>
              <p className="text-sm text-neutral-400">Net Position</p>
              <p className={`font-bold ${
                currentBalance > 0 ? 'text-red-400' : 
                currentBalance < 0 ? 'text-green-400' : 'text-white'
              }`}>
                {currentBalance > 0 ? 'Amount Due' : currentBalance < 0 ? 'Credit Balance' : 'Balanced'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
