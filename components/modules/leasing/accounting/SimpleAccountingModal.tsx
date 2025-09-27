"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { 
  X, 
  Plus, 
  CreditCard, 
  FileText, 
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  Calendar,
  Receipt,
  Banknote,
  Car,
  AlertCircle
} from "lucide-react";

// Types for the new simple system
interface LeaseTransaction {
  id: string;
  lease_id: string;
  transaction_date: string;
  due_date?: string;
  transaction_type: 'monthly_rent' | 'security_deposit' | 'salik_fee' | 'excess_mileage' | 'late_fee' | 'traffic_fine' | 'payment' | 'refund' | 'adjustment';
  amount: number;
  vat_amount: number;
  total_amount: number;
  description: string;
  reference_number?: string;
  status: 'draft' | 'pending' | 'invoiced' | 'paid' | 'overdue' | 'cancelled';
  invoice_group?: string;
  payment_group?: string;
  created_at: string;
  version: number;
}

interface LeaseBalance {
  lease_id: string;
  current_balance: number;
  overdue_amount: number;
  past_due_amount: number;
  overdue_count: number;
  oldest_overdue_date?: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  leaseId: string;
  customerName: string;
  leaseStartDate: string;
  monthlyPayment?: number;
}

export default function SimpleAccountingModal({ 
  isOpen, 
  onClose, 
  leaseId, 
  customerName,
  leaseStartDate,
  monthlyPayment = 0
}: Props) {
  // State management
  const [activeTab, setActiveTab] = useState<'overview' | 'charges' | 'payments' | 'invoices'>('overview');
  const [transactions, setTransactions] = useState<LeaseTransaction[]>([]);
  const [balance, setBalance] = useState<LeaseBalance | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Quick action states
  const [showAddCharge, setShowAddCharge] = useState(false);
  const [showRecordPayment, setShowRecordPayment] = useState(false);
  const [showCreateInvoice, setShowCreateInvoice] = useState(false);

  // Form states
  const [newCharge, setNewCharge] = useState({
    type: 'monthly_rent' as const,
    amount: '',
    description: '',
    dueDate: ''
  });

  const [newPayment, setNewPayment] = useState({
    amount: '',
    method: 'bank_transfer',
    reference: '',
    notes: ''
  });

  useEffect(() => {
    if (isOpen) {
      fetchAccountingData();
    }
  }, [isOpen, leaseId]);

  const fetchAccountingData = async () => {
    setLoading(true);
    try {
      // Fetch transactions
      const { data: transactionData, error: transactionError } = await supabase
        .from('lease_transactions')
        .select('*')
        .eq('lease_id', leaseId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (transactionError) throw transactionError;
      setTransactions(transactionData || []);

      // Fetch balance
      const { data: balanceData, error: balanceError } = await supabase
        .from('lease_balances')
        .select('*')
        .eq('lease_id', leaseId)
        .single();

      if (balanceError && balanceError.code !== 'PGRST116') throw balanceError;
      setBalance(balanceData);

    } catch (error) {
      console.error('Error fetching accounting data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCharge = async () => {
    if (!newCharge.amount || !newCharge.description) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      const { data, error } = await supabase.rpc('add_charge', {
        p_lease_id: leaseId,
        p_transaction_type: newCharge.type,
        p_amount: parseFloat(newCharge.amount),
        p_description: newCharge.description,
        p_due_date: newCharge.dueDate || null
      });

      if (error) throw error;

      alert('Charge added successfully!');
      setShowAddCharge(false);
      setNewCharge({ type: 'monthly_rent', amount: '', description: '', dueDate: '' });
      fetchAccountingData();
    } catch (error) {
      console.error('Error adding charge:', error);
      alert('Error adding charge. Please try again.');
    }
  };

  const handleRecordPayment = async () => {
    if (!newPayment.amount) {
      alert('Please enter payment amount');
      return;
    }

    try {
      const { data, error } = await supabase.rpc('record_payment', {
        p_lease_id: leaseId,
        p_amount: parseFloat(newPayment.amount),
        p_payment_method: newPayment.method,
        p_reference: newPayment.reference || null,
        p_notes: newPayment.notes || null
      });

      if (error) throw error;

      alert('Payment recorded successfully!');
      setShowRecordPayment(false);
      setNewPayment({ amount: '', method: 'bank_transfer', reference: '', notes: '' });
      fetchAccountingData();
    } catch (error) {
      console.error('Error recording payment:', error);
      alert('Error recording payment. Please try again.');
    }
  };

  const createInvoiceFromPending = async () => {
    const pendingTransactions = transactions.filter(t => t.status === 'pending');
    if (pendingTransactions.length === 0) {
      alert('No pending charges to invoice');
      return;
    }

    try {
      const { data, error } = await supabase.rpc('create_invoice', {
        p_lease_id: leaseId,
        p_transaction_ids: pendingTransactions.map(t => t.id)
      });

      if (error) throw error;

      alert(`Invoice created successfully! Invoice ID: ${data}`);
      fetchAccountingData();
    } catch (error) {
      console.error('Error creating invoice:', error);
      alert('Error creating invoice. Please try again.');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AE', {
      style: 'currency',
      currency: 'AED',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const getTransactionIcon = (type: string) => {
    const icons = {
      monthly_rent: Car,
      security_deposit: DollarSign,
      salik_fee: Receipt,
      excess_mileage: Car,
      late_fee: AlertTriangle,
      traffic_fine: AlertCircle,
      payment: CreditCard,
      refund: Banknote,
      adjustment: FileText
    };
    return icons[type as keyof typeof icons] || FileText;
  };

  const getStatusColor = (status: string) => {
    const colors = {
      draft: 'text-gray-400 bg-gray-400/10',
      pending: 'text-yellow-400 bg-yellow-400/10',
      invoiced: 'text-blue-400 bg-blue-400/10',
      paid: 'text-green-400 bg-green-400/10',
      overdue: 'text-red-400 bg-red-400/10',
      cancelled: 'text-gray-400 bg-gray-400/10'
    };
    return colors[status as keyof typeof colors] || 'text-gray-400 bg-gray-400/10';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 rounded-2xl shadow-2xl border border-neutral-400/20 w-full max-w-6xl h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-neutral-400/20">
          <div>
            <h2 className="text-2xl font-bold text-white">💰 Accounting</h2>
            <p className="text-neutral-400">{customerName}</p>
          </div>
          
          {/* Balance Overview */}
          {balance && (
            <div className="flex items-center gap-6">
              <div className="text-right">
                <p className="text-sm text-neutral-400">Current Balance</p>
                <p className={`text-xl font-bold ${balance.current_balance > 0 ? 'text-red-400' : 'text-green-400'}`}>
                  {formatCurrency(balance.current_balance)}
                </p>
              </div>
              {balance.overdue_amount > 0 && (
                <div className="text-right">
                  <p className="text-sm text-red-400">Overdue</p>
                  <p className="text-lg font-bold text-red-400">
                    {formatCurrency(balance.overdue_amount)}
                  </p>
                </div>
              )}
            </div>
          )}
          
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X size={24} className="text-white" />
          </button>
        </div>

        {/* Quick Actions */}
        <div className="p-6 border-b border-neutral-400/20 bg-white/5">
          <div className="flex gap-4">
            <button
              onClick={() => setShowAddCharge(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:shadow-lg transition-all"
            >
              <Plus size={16} />
              Add Charge
            </button>
            
            <button
              onClick={() => setShowRecordPayment(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:shadow-lg transition-all"
            >
              <CreditCard size={16} />
              Record Payment
            </button>
            
            <button
              onClick={createInvoiceFromPending}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all"
            >
              <FileText size={16} />
              Create Invoice
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-neutral-400/20">
          {[
            { key: 'overview', label: '📊 Overview', icon: DollarSign },
            { key: 'charges', label: '📝 Charges', icon: FileText },
            { key: 'payments', label: '💳 Payments', icon: CreditCard },
            { key: 'invoices', label: '🧾 Invoices', icon: Receipt }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors ${
                activeTab === tab.key
                  ? 'text-white border-b-2 border-blue-400 bg-white/5'
                  : 'text-neutral-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            </div>
          ) : (
            <>
              {/* Overview Tab */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {/* Balance Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                      <div className="flex items-center gap-3">
                        <DollarSign className="text-blue-400" size={24} />
                        <div>
                          <p className="text-sm text-neutral-400">Total Balance</p>
                          <p className={`text-xl font-bold ${(balance?.current_balance || 0) > 0 ? 'text-red-400' : 'text-green-400'}`}>
                            {formatCurrency(balance?.current_balance || 0)}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                      <div className="flex items-center gap-3">
                        <AlertTriangle className="text-red-400" size={24} />
                        <div>
                          <p className="text-sm text-neutral-400">Overdue</p>
                          <p className="text-xl font-bold text-red-400">
                            {formatCurrency(balance?.overdue_amount || 0)}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                      <div className="flex items-center gap-3">
                        <Clock className="text-yellow-400" size={24} />
                        <div>
                          <p className="text-sm text-neutral-400">Overdue Items</p>
                          <p className="text-xl font-bold text-yellow-400">
                            {balance?.overdue_count || 0}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Recent Transactions */}
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-4">Recent Transactions</h3>
                    <div className="space-y-2">
                      {transactions.slice(0, 5).map(transaction => {
                        const Icon = getTransactionIcon(transaction.transaction_type);
                        return (
                          <div key={transaction.id} className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
                            <div className="flex items-center gap-3">
                              <Icon size={20} className="text-white/60" />
                              <div>
                                <p className="text-white font-medium">{transaction.description}</p>
                                <p className="text-sm text-neutral-400">
                                  {new Date(transaction.transaction_date).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className={`font-bold ${transaction.total_amount < 0 ? 'text-green-400' : 'text-white'}`}>
                                {formatCurrency(transaction.total_amount)}
                              </p>
                              <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(transaction.status)}`}>
                                {transaction.status.toUpperCase()}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Other tabs would go here... */}
              {activeTab === 'charges' && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">All Charges</h3>
                  {/* Charges list implementation */}
                </div>
              )}
            </>
          )}
        </div>

        {/* Add Charge Modal */}
        {showAddCharge && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-neutral-800 rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-bold text-white mb-4">Add New Charge</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-neutral-400 mb-2">Charge Type</label>
                  <select
                    value={newCharge.type}
                    onChange={(e) => setNewCharge(prev => ({ ...prev, type: e.target.value as any }))}
                    className="w-full p-3 bg-neutral-700 border border-neutral-600 rounded-lg text-white"
                  >
                    <option value="monthly_rent">Monthly Rent</option>
                    <option value="salik_fee">Salik Fee</option>
                    <option value="excess_mileage">Excess Mileage</option>
                    <option value="late_fee">Late Fee</option>
                    <option value="traffic_fine">Traffic Fine</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm text-neutral-400 mb-2">Amount (AED)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newCharge.amount}
                    onChange={(e) => setNewCharge(prev => ({ ...prev, amount: e.target.value }))}
                    className="w-full p-3 bg-neutral-700 border border-neutral-600 rounded-lg text-white"
                    placeholder="0.00"
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-neutral-400 mb-2">Description</label>
                  <input
                    type="text"
                    value={newCharge.description}
                    onChange={(e) => setNewCharge(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full p-3 bg-neutral-700 border border-neutral-600 rounded-lg text-white"
                    placeholder="Enter description..."
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-neutral-400 mb-2">Due Date (Optional)</label>
                  <input
                    type="date"
                    value={newCharge.dueDate}
                    onChange={(e) => setNewCharge(prev => ({ ...prev, dueDate: e.target.value }))}
                    className="w-full p-3 bg-neutral-700 border border-neutral-600 rounded-lg text-white"
                  />
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleAddCharge}
                  className="flex-1 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Add Charge
                </button>
                <button
                  onClick={() => setShowAddCharge(false)}
                  className="flex-1 py-3 bg-neutral-600 text-white rounded-lg hover:bg-neutral-700 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Record Payment Modal */}
        {showRecordPayment && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-neutral-800 rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-bold text-white mb-4">Record Payment</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-neutral-400 mb-2">Payment Amount (AED)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newPayment.amount}
                    onChange={(e) => setNewPayment(prev => ({ ...prev, amount: e.target.value }))}
                    className="w-full p-3 bg-neutral-700 border border-neutral-600 rounded-lg text-white"
                    placeholder="0.00"
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-neutral-400 mb-2">Payment Method</label>
                  <select
                    value={newPayment.method}
                    onChange={(e) => setNewPayment(prev => ({ ...prev, method: e.target.value }))}
                    className="w-full p-3 bg-neutral-700 border border-neutral-600 rounded-lg text-white"
                  >
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                    <option value="cheque">Cheque</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm text-neutral-400 mb-2">Reference Number</label>
                  <input
                    type="text"
                    value={newPayment.reference}
                    onChange={(e) => setNewPayment(prev => ({ ...prev, reference: e.target.value }))}
                    className="w-full p-3 bg-neutral-700 border border-neutral-600 rounded-lg text-white"
                    placeholder="Transaction reference..."
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-neutral-400 mb-2">Notes</label>
                  <textarea
                    value={newPayment.notes}
                    onChange={(e) => setNewPayment(prev => ({ ...prev, notes: e.target.value }))}
                    className="w-full p-3 bg-neutral-700 border border-neutral-600 rounded-lg text-white"
                    rows={3}
                    placeholder="Additional notes..."
                  />
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleRecordPayment}
                  className="flex-1 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                >
                  Record Payment
                </button>
                <button
                  onClick={() => setShowRecordPayment(false)}
                  className="flex-1 py-3 bg-neutral-600 text-white rounded-lg hover:bg-neutral-700 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
