"use client";

import { useState, useEffect } from 'react';
import { 
  X, FileText, CreditCard, Building2, FolderOpen, 
  Plus, Download, Trash2, Check,
  Receipt, ArrowDownCircle, ArrowUpCircle,
  Upload, ExternalLink, RefreshCw
} from 'lucide-react';

interface Deal {
  id: string;
  lead_id: string;
  deal_number: string;
  invoice_number?: string;
  invoice_url?: string;
  status: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  customer_id_type?: string;
  customer_id_number?: string;
  vehicle_id?: string;
  vehicle_stock_number?: string;
  vehicle_year?: number;
  vehicle_model?: string;
  vehicle_colour?: string;
  vehicle_chassis?: string;
  vehicle_price?: number;
  invoice_total: number;
  total_paid: number;
  total_credits: number;
  total_refunds: number;
  balance_due: number;
  created_at: string;
}

interface Charge {
  id: string;
  deal_id: string;
  charge_type: string;
  description?: string;
  amount: number;
  created_at: string;
}

interface Transaction {
  id: string;
  deal_id: string;
  transaction_type: string;
  amount: number;
  payment_method?: string;
  reference_number?: string;
  reason?: string;
  document_number: string;
  document_url?: string;
  allocated_invoice_id?: string;
  created_at: string;
}

interface Invoice {
  id: string;
  deal_id: string;
  invoice_number: string;
  invoice_url?: string;
  total_amount: number;
  status: 'active' | 'voided';
  allocated_amount: number;
  invoice_balance: number;
  created_at: string;
  voided_at?: string;
}

interface FinanceApplication {
  id: string;
  deal_id: string;
  bank_name: string;
  loan_amount?: number;
  application_date?: string;
  application_ref?: string;
  status: string;
  notes?: string;
  documents: FinanceDocument[];
  created_at: string;
}

interface FinanceDocument {
  id: string;
  finance_id: string;
  document_type: string;
  file_url: string;
  file_name: string;
  uploaded_at: string;
}

interface Props {
  leadId: string;
  customerName: string;
  customerPhone: string;
  vehicleId?: string;
  dealId?: string;
  onClose: () => void;
}

const chargeTypeLabels: Record<string, string> = {
  'vehicle_price': 'Vehicle Sale Price',
  'rta_fee': 'RTA Transfer Fee',
  'insurance': 'Vehicle Insurance',
  'extended_warranty': 'Extended Warranty',
  'servicecare_standard': 'ServiceCare Standard',
  'servicecare_premium': 'ServiceCare Premium',
  'ceramic_coating': 'Ceramic Coating',
  'window_tints': 'Window Tinting',
  'other': 'Other'
};

const chargeTypes = [
  { value: 'vehicle_price', label: 'Vehicle Sale Price' },
  { value: 'rta_fee', label: 'RTA Transfer Fee' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'extended_warranty', label: 'Extended Warranty' },
  { value: 'servicecare_standard', label: 'ServiceCare Standard' },
  { value: 'servicecare_premium', label: 'ServiceCare Premium' },
  { value: 'ceramic_coating', label: 'Ceramic Coating' },
  { value: 'window_tints', label: 'Window Tints' },
  { value: 'other', label: 'Other' }
];

const paymentMethods = [
  { value: 'cash', label: 'Cash' },
  { value: 'card', label: 'Card' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'cheque', label: 'Cheque' }
];

const banks = [
  'Emirates NBD',
  'ADCB',
  'FAB (First Abu Dhabi Bank)',
  'Mashreq Bank',
  'Dubai Islamic Bank',
  'ENBD Islamic',
  'RAK Bank',
  'CBD (Commercial Bank of Dubai)',
  'ADIB (Abu Dhabi Islamic Bank)',
  'Other'
];

const financeStatuses = [
  { value: 'documents_ready', label: 'Documents Ready' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'under_review', label: 'Under Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'payment_received', label: 'Payment Received' },
  { value: 'rejected', label: 'Rejected' }
];

const financeDocTypes = [
  { value: 'eid_front', label: 'Emirates ID (Front)' },
  { value: 'eid_back', label: 'Emirates ID (Back)' },
  { value: 'passport', label: 'Passport' },
  { value: 'visa', label: 'UAE Visa' },
  { value: 'salary_certificate', label: 'Salary Certificate' },
  { value: 'bank_statements', label: 'Bank Statements (3 months)' },
  { value: 'trade_license', label: 'Trade License' },
  { value: 'vehicle_quotation', label: 'Vehicle Quotation' },
  { value: 'other', label: 'Other Document' }
];

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-AE', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

const formatDate = (dateString: string) => {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

// Input styles matching LeadDetailsModal
const inputClass = `
  w-full px-3 py-2 text-sm font-medium text-white
  bg-black/40 border border-white/10 rounded-lg
  hover:bg-black/50 hover:border-white/20
  focus:bg-black/60 focus:border-white/30 focus:ring-1 focus:ring-white/20
  focus:outline-none transition-all duration-150
  placeholder-white/40
`.replace(/\s+/g, ' ').trim();

const selectClass = `
  w-full px-3 py-2 text-sm font-medium text-white
  bg-black/40 border border-white/10 rounded-lg
  hover:bg-black/50 hover:border-white/20
  focus:bg-black/60 focus:border-white/30 focus:ring-1 focus:ring-white/20
  focus:outline-none transition-all duration-150
  appearance-none cursor-pointer
`.replace(/\s+/g, ' ').trim();

// Icons
const UserIcon = () => <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>;
const CarIcon = () => <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 13l2-5h14l2 5M5 13v5a1 1 0 001 1h1a1 1 0 001-1v-1h8v1a1 1 0 001 1h1a1 1 0 001-1v-5"/></svg>;
const CurrencyIcon = () => <span className="w-3.5 h-3.5 font-bold text-[10px] flex items-center justify-center">د.إ</span>;

export default function UVAccountingDashboard({
  leadId,
  customerName,
  customerPhone,
  vehicleId,
  dealId: propDealId,
  onClose
}: Props) {
  const [activeTab, setActiveTab] = useState<'summary' | 'charges' | 'transactions' | 'finance' | 'documents'>('summary');
  const [loading, setLoading] = useState(true);
  const [deal, setDeal] = useState<Deal | null>(null);
  const [charges, setCharges] = useState<Charge[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [financeApps, setFinanceApps] = useState<FinanceApplication[]>([]);
  
  // Form states
  const [showAddCharge, setShowAddCharge] = useState(false);
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [showAddFinance, setShowAddFinance] = useState(false);
  const [transactionType, setTransactionType] = useState<'deposit' | 'payment' | 'credit_note' | 'refund'>('payment');
  
  // Charge form
  const [chargeForm, setChargeForm] = useState({
    charge_type: 'vehicle_price',
    description: '',
    amount: ''
  });
  
  // Transaction form
  const [transactionForm, setTransactionForm] = useState({
    amount: '',
    payment_method: 'cash',
    reference_number: '',
    reason: ''
  });
  
  // Finance form
  const [financeForm, setFinanceForm] = useState({
    bank_name: banks[0],
    loan_amount: '',
    application_ref: '',
    notes: ''
  });
  
  const [saving, setSaving] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState<string | null>(null);

  const [dealExists, setDealExists] = useState<boolean | null>(null); // null = loading, true = exists, false = no deal
  const [creating, setCreating] = useState(false);
  
  // Invoice allocation state
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [activeInvoice, setActiveInvoice] = useState<Invoice | null>(null);
  const [allocatingPayment, setAllocatingPayment] = useState<string | null>(null);

  // Check if deal exists for this lead (don't auto-create)
  useEffect(() => {
    checkForExistingDeal();
  }, [leadId]);

  const checkForExistingDeal = async () => {
    setLoading(true);
    try {
      // Check if deal exists (GET request, doesn't create)
      const response = await fetch(`/api/uv-accounting/deals?lead_id=${leadId}`);
      
      if (!response.ok) throw new Error('Failed to check deal');
      
      const data = await response.json();
      
      if (data.deal) {
        // Deal exists - load all data
        setDeal(data.deal);
        setCharges(data.charges || []);
        setTransactions(data.transactions || []);
        setFinanceApps(data.finance || []);
        setDealExists(true);
        
        // Also fetch invoices
        fetchInvoices(data.deal.id);
      } else {
        // No deal yet
        setDealExists(false);
      }
    } catch (error) {
      console.error('Error checking deal:', error);
      setDealExists(false);
    } finally {
      setLoading(false);
    }
  };

  // Manually create deal when user clicks button
  const handleCreateDeal = async () => {
    setCreating(true);
    try {
      const response = await fetch('/api/uv-accounting/deals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead_id: leadId,
          customer_name: customerName,
          customer_phone: customerPhone,
          vehicle_id: vehicleId || null
        })
      });

      if (!response.ok) throw new Error('Failed to create deal');
      
      const data = await response.json();
      
      setDeal(data.deal);
      setCharges(data.charges || []);
      setTransactions(data.transactions || []);
      setFinanceApps(data.finance || []);
      setDealExists(true);
      
      // Fetch invoices for new deal
      if (data.deal?.id) {
        fetchInvoices(data.deal.id);
      }
    } catch (error) {
      console.error('Error creating deal:', error);
      alert('Failed to create deal');
    } finally {
      setCreating(false);
    }
  };

  const fetchDealData = async (id: string) => {
    try {
      const response = await fetch(`/api/uv-accounting/deals/${id}`);
      if (!response.ok) throw new Error('Failed to fetch deal');
      
      const data = await response.json();
      setDeal(data.deal);
      setCharges(data.charges || []);
      setTransactions(data.transactions || []);
      setFinanceApps(data.finance || []);
      
      // Also fetch invoices
      fetchInvoices(id);
    } catch (error) {
      console.error('Error fetching deal data:', error);
    }
  };

  const fetchInvoices = async (dealId: string) => {
    try {
      const response = await fetch(`/api/uv-accounting/invoices?deal_id=${dealId}`);
      if (!response.ok) return;
      
      const data = await response.json();
      setInvoices(data.invoices || []);
      setActiveInvoice(data.activeInvoice || null);
    } catch (error) {
      console.error('Error fetching invoices:', error);
    }
  };

  const handleAllocatePayment = async (transactionId: string, invoiceId: string | null) => {
    setAllocatingPayment(transactionId);
    try {
      const response = await fetch('/api/uv-accounting/transactions/allocate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transaction_id: transactionId,
          invoice_id: invoiceId
        })
      });

      if (!response.ok) throw new Error('Failed to allocate payment');
      
      refreshData();
    } catch (error) {
      console.error('Error allocating payment:', error);
      alert('Failed to allocate payment');
    } finally {
      setAllocatingPayment(null);
    }
  };

  const refreshData = () => {
    if (deal?.id) {
      fetchDealData(deal.id);
    }
  };

  // Add charge
  const handleAddCharge = async () => {
    if (!deal || !chargeForm.amount) return;
    setSaving(true);
    try {
      const response = await fetch('/api/uv-accounting/charges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deal_id: deal.id,
          charge_type: chargeForm.charge_type,
          description: chargeForm.description || null,
          amount: parseFloat(chargeForm.amount)
        })
      });

      if (!response.ok) throw new Error('Failed to add charge');
      
      setShowAddCharge(false);
      setChargeForm({ charge_type: 'vehicle_price', description: '', amount: '' });
      refreshData();
    } catch (error) {
      console.error('Error adding charge:', error);
      alert('Failed to add charge');
    } finally {
      setSaving(false);
    }
  };

  // Delete charge
  const handleDeleteCharge = async (chargeId: string) => {
    if (!confirm('Delete this charge?')) return;
    try {
      const response = await fetch(`/api/uv-accounting/charges/${chargeId}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete charge');
      refreshData();
    } catch (error) {
      console.error('Error deleting charge:', error);
      alert('Failed to delete charge');
    }
  };

  // Add transaction
  const handleAddTransaction = async () => {
    if (!deal || !transactionForm.amount) return;
    setSaving(true);
    try {
      const response = await fetch('/api/uv-accounting/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deal_id: deal.id,
          transaction_type: transactionType,
          amount: parseFloat(transactionForm.amount),
          payment_method: transactionType !== 'credit_note' ? transactionForm.payment_method : null,
          reference_number: transactionForm.reference_number || null,
          reason: transactionType === 'credit_note' ? transactionForm.reason : null
        })
      });

      if (!response.ok) throw new Error('Failed to add transaction');
      
      const { transaction } = await response.json();
      
      // Generate document
      if (transaction) {
        await generateDocument(transaction.id, transactionType);
      }
      
      setShowAddTransaction(false);
      setTransactionForm({ amount: '', payment_method: 'cash', reference_number: '', reason: '' });
      refreshData();
    } catch (error) {
      console.error('Error adding transaction:', error);
      alert('Failed to add transaction');
    } finally {
      setSaving(false);
    }
  };

  // Generate document
  const generateDocument = async (transactionId: string, type: string) => {
    setGeneratingPdf(transactionId);
    try {
      let endpoint = '';
      if (type === 'deposit' || type === 'payment') {
        endpoint = '/api/uv-accounting/documents/generate-receipt';
      } else if (type === 'credit_note') {
        endpoint = '/api/uv-accounting/documents/generate-credit-note';
      } else if (type === 'refund') {
        endpoint = '/api/uv-accounting/documents/generate-refund-voucher';
      }

      if (endpoint) {
        await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transaction_id: transactionId })
        });
      }
    } catch (error) {
      console.error('Error generating document:', error);
    } finally {
      setGeneratingPdf(null);
    }
  };

  // Generate invoice
  const handleGenerateInvoice = async () => {
    if (!deal) return;
    setGeneratingPdf('invoice');
    try {
      const response = await fetch('/api/uv-accounting/documents/generate-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deal_id: deal.id })
      });

      if (!response.ok) throw new Error('Failed to generate invoice');
      
      const { pdfUrl } = await response.json();
      if (pdfUrl) {
        window.open(pdfUrl, '_blank');
      }
    } catch (error) {
      console.error('Error generating invoice:', error);
      alert('Failed to generate invoice');
    } finally {
      setGeneratingPdf(null);
    }
  };

  // Generate SOA
  const handleGenerateSOA = async () => {
    if (!deal) return;
    setGeneratingPdf('soa');
    try {
      const response = await fetch('/api/uv-accounting/documents/generate-soa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deal_id: deal.id })
      });

      if (!response.ok) throw new Error('Failed to generate SOA');
      
      const { pdfUrl } = await response.json();
      if (pdfUrl) {
        window.open(pdfUrl, '_blank');
      }
    } catch (error) {
      console.error('Error generating SOA:', error);
      alert('Failed to generate SOA');
    } finally {
      setGeneratingPdf(null);
    }
  };

  // Add finance application
  const handleAddFinance = async () => {
    if (!deal || !financeForm.bank_name) return;
    setSaving(true);
    try {
      const response = await fetch('/api/uv-accounting/finance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deal_id: deal.id,
          bank_name: financeForm.bank_name,
          loan_amount: financeForm.loan_amount ? parseFloat(financeForm.loan_amount) : null,
          application_ref: financeForm.application_ref || null,
          notes: financeForm.notes || null
        })
      });

      if (!response.ok) throw new Error('Failed to create finance application');
      
      setShowAddFinance(false);
      setFinanceForm({ bank_name: banks[0], loan_amount: '', application_ref: '', notes: '' });
      refreshData();
    } catch (error) {
      console.error('Error creating finance application:', error);
      alert('Failed to create finance application');
    } finally {
      setSaving(false);
    }
  };

  // Update finance status
  const handleUpdateFinanceStatus = async (financeId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/uv-accounting/finance/${financeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      if (!response.ok) throw new Error('Failed to update status');
      refreshData();
    } catch (error) {
      console.error('Error updating finance status:', error);
    }
  };

  const statusColors: Record<string, string> = {
    'pending': 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    'partial': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    'paid': 'bg-green-500/20 text-green-400 border-green-500/30',
    'cancelled': 'bg-red-500/20 text-red-400 border-red-500/30'
  };

  const tabs = [
    { id: 'summary', label: 'Summary', icon: FileText },
    { id: 'charges', label: 'Charges', icon: Receipt },
    { id: 'transactions', label: 'Transactions', icon: CreditCard },
    { id: 'finance', label: 'Finance', icon: Building2 },
    { id: 'documents', label: 'Documents', icon: FolderOpen }
  ] as const;

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
        <div className="bg-zinc-900/95 border border-white/10 rounded-xl p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-3"></div>
          <p className="text-white/50 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  // No deal exists yet - show create deal UI
  if (dealExists === false) {
    return (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-150" onClick={onClose}>
        <div 
          className="bg-zinc-900/95 border border-white/10 rounded-xl shadow-2xl overflow-hidden w-full max-w-lg animate-in zoom-in-95 duration-200"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center border border-white/10">
                <UserIcon />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">{customerName}</h2>
                <p className="text-xs text-white/50">{customerPhone}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 text-white/50 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4">
              <Receipt className="w-8 h-8 text-white/30" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">No Customer Record</h3>
            <p className="text-sm text-white/50 mb-6 max-w-sm mx-auto">
              Create a customer record to start tracking charges, payments, and generate invoices.
            </p>
            <button
              onClick={handleCreateDeal}
              disabled={creating}
              className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium rounded-lg bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30 disabled:opacity-50 transition-all"
            >
              {creating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Create Customer Record
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-150" onClick={onClose}>
      <div 
        className="bg-zinc-900/95 border border-white/10 rounded-xl shadow-2xl overflow-hidden w-full max-w-5xl h-[85vh] flex flex-col animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header - Customer focused */}
        <div className="px-5 py-4 border-b border-white/10 flex-shrink-0">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-white/15 to-white/5 flex items-center justify-center border border-white/20 text-lg font-bold text-white">
                {customerName.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-semibold text-white truncate">
                  {customerName}
                </h2>
                <p className="text-sm text-white/70 truncate flex items-center gap-1.5">
                  <CarIcon /> {deal?.vehicle_year} {deal?.vehicle_model || 'No vehicle linked'}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-white/10 text-white/60 border border-white/10">
                    {deal?.deal_number}
                  </span>
                  {deal && (
                    <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${statusColors[deal.status] || statusColors.pending}`}>
                      {deal.status.toUpperCase()}
                    </span>
                  )}
                  {deal?.invoice_number && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-blue-500/20 text-blue-400 border border-blue-500/30">
                      {deal.invoice_number}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 text-white/50 hover:text-white hover:bg-white/10 rounded-lg transition-colors ml-4">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tabs - styled like section headers */}
        <div className="px-5 py-3 border-b border-white/10 flex gap-1 overflow-x-auto flex-shrink-0">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                  activeTab === tab.id 
                    ? 'bg-white/10 text-white border border-white/20' 
                    : 'text-white/50 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* Summary Tab */}
          {activeTab === 'summary' && deal && (
            <div className="space-y-4">
              {/* Balance Card */}
              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <h3 className="text-[10px] font-semibold text-white/40 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <CurrencyIcon /> Account Balance
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-[10px] text-white/40 uppercase tracking-wide mb-1">Invoice Total</p>
                    <p className="text-xl font-bold text-white">{formatCurrency(deal.invoice_total)} <span className="text-xs font-normal text-white/40">AED</span></p>
                  </div>
                  <div>
                    <p className="text-[10px] text-white/40 uppercase tracking-wide mb-1">Total Paid</p>
                    <p className="text-xl font-bold text-green-400">{formatCurrency(deal.total_paid)} <span className="text-xs font-normal text-green-400/50">AED</span></p>
                  </div>
                  <div>
                    <p className="text-[10px] text-white/40 uppercase tracking-wide mb-1">Credits</p>
                    <p className="text-xl font-bold text-amber-400">{formatCurrency(deal.total_credits)} <span className="text-xs font-normal text-amber-400/50">AED</span></p>
                  </div>
                  <div>
                    <p className="text-[10px] text-white/40 uppercase tracking-wide mb-1">Balance Due</p>
                    <p className={`text-xl font-bold ${deal.balance_due > 0 ? 'text-red-400' : 'text-green-400'}`}>
                      {formatCurrency(Math.max(deal.balance_due, 0))} <span className="text-xs font-normal opacity-50">AED</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Customer & Vehicle Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <h3 className="text-[10px] font-semibold text-white/40 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <UserIcon /> Customer Details
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-white/40">Name</span>
                      <span className="text-white font-medium">{deal.customer_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/40">Phone</span>
                      <span className="text-white">{deal.customer_phone}</span>
                    </div>
                    {deal.customer_email && (
                      <div className="flex justify-between">
                        <span className="text-white/40">Email</span>
                        <span className="text-white">{deal.customer_email}</span>
                      </div>
                    )}
                    {deal.customer_id_type && (
                      <div className="flex justify-between">
                        <span className="text-white/40">{deal.customer_id_type}</span>
                        <span className="text-white">{deal.customer_id_number}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <h3 className="text-[10px] font-semibold text-white/40 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <CarIcon /> Vehicle Details
                  </h3>
                  <div className="space-y-2 text-sm">
                    {deal.vehicle_model ? (
                      <>
                        <div className="flex justify-between">
                          <span className="text-white/40">Model</span>
                          <span className="text-white font-medium">{deal.vehicle_year} {deal.vehicle_model}</span>
                        </div>
                        {deal.vehicle_colour && (
                          <div className="flex justify-between">
                            <span className="text-white/40">Colour</span>
                            <span className="text-white">{deal.vehicle_colour}</span>
                          </div>
                        )}
                        {deal.vehicle_chassis && (
                          <div className="flex justify-between">
                            <span className="text-white/40">Chassis</span>
                            <span className="text-white font-mono text-xs">{deal.vehicle_chassis}</span>
                          </div>
                        )}
                        {deal.vehicle_stock_number && (
                          <div className="flex justify-between">
                            <span className="text-white/40">Stock #</span>
                            <span className="text-white">{deal.vehicle_stock_number}</span>
                          </div>
                        )}
                      </>
                    ) : (
                      <p className="text-white/30 italic">No vehicle linked</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Charges Tab */}
          {activeTab === 'charges' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-semibold text-white/40 uppercase tracking-widest flex items-center gap-2">
                  <Receipt className="w-3.5 h-3.5" /> Invoice Line Items
                </h3>
                <div className="flex gap-2">
                  {deal?.invoice_number ? (
                    <a
                      href={deal.invoice_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-500/20 border border-blue-500/30 text-blue-400 hover:bg-blue-500/30 transition-all"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      View Invoice ({deal.invoice_number})
                    </a>
                  ) : (
                    <button
                      onClick={handleGenerateInvoice}
                      disabled={charges.length === 0 || generatingPdf === 'invoice'}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-green-500/20 border border-green-500/30 text-green-400 hover:bg-green-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      {generatingPdf === 'invoice' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
                      Create Invoice
                    </button>
                  )}
                  <button
                    onClick={() => setShowAddCharge(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-white/10 border border-white/20 text-white hover:bg-white/15 transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Charge
                  </button>
                </div>
              </div>

              {showAddCharge && (
                <div className="bg-white/5 rounded-xl p-4 border border-white/10 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-[10px] font-medium text-white/50 uppercase tracking-wide block mb-1">Charge Type</label>
                      <select
                        value={chargeForm.charge_type}
                        onChange={e => setChargeForm(f => ({ ...f, charge_type: e.target.value }))}
                        className={selectClass}
                      >
                        {chargeTypes.map(ct => (
                          <option key={ct.value} value={ct.value}>{ct.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-medium text-white/50 uppercase tracking-wide block mb-1">Amount (AED)</label>
                      <input
                        type="number"
                        value={chargeForm.amount}
                        onChange={e => setChargeForm(f => ({ ...f, amount: e.target.value }))}
                        placeholder="0"
                        className={inputClass}
                      />
                    </div>
                    {chargeForm.charge_type === 'other' && (
                      <div>
                        <label className="text-[10px] font-medium text-white/50 uppercase tracking-wide block mb-1">Description</label>
                        <input
                          type="text"
                          value={chargeForm.description}
                          onChange={e => setChargeForm(f => ({ ...f, description: e.target.value }))}
                          placeholder="Describe the charge"
                          className={inputClass}
                        />
                      </div>
                    )}
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setShowAddCharge(false)}
                      className="px-3 py-1.5 text-xs text-white/50 hover:text-white transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddCharge}
                      disabled={!chargeForm.amount || saving}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30 disabled:opacity-50 transition-all"
                    >
                      {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                      Add Charge
                    </button>
                  </div>
                </div>
              )}

              {/* Charges List */}
              <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
                {charges.length === 0 ? (
                  <div className="text-center py-8 text-white/30">
                    <Receipt className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No charges added yet</p>
                  </div>
                ) : (
                  <div className="divide-y divide-white/5">
                    {charges.map(charge => (
                      <div key={charge.id} className="flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-all">
                        <div>
                          <p className="text-sm text-white font-medium">
                            {charge.charge_type === 'other' && charge.description 
                              ? charge.description 
                              : chargeTypeLabels[charge.charge_type] || charge.charge_type}
                          </p>
                          <p className="text-[10px] text-white/40">{formatDate(charge.created_at)}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-white font-semibold">{formatCurrency(charge.amount)} AED</span>
                          <button
                            onClick={() => handleDeleteCharge(charge.id)}
                            className="p-1.5 text-white/30 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Total */}
                {charges.length > 0 && (
                  <div className="px-4 py-3 bg-white/5 border-t border-white/10 flex justify-between items-center">
                    <span className="text-xs text-white/50 uppercase tracking-wide">Invoice Total</span>
                    <span className="text-lg text-white font-bold">{formatCurrency(deal?.invoice_total || 0)} AED</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Transactions Tab */}
          {activeTab === 'transactions' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-semibold text-white/40 uppercase tracking-widest flex items-center gap-2">
                  <CreditCard className="w-3.5 h-3.5" /> Payment History
                </h3>
                <button
                  onClick={() => setShowAddTransaction(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-white/10 border border-white/20 text-white hover:bg-white/15 transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Transaction
                </button>
              </div>

              {showAddTransaction && (
                <div className="bg-white/5 rounded-xl p-4 border border-white/10 space-y-4">
                  <div className="flex gap-2 mb-4">
                    {(['deposit', 'payment', 'credit_note', 'refund'] as const).map(type => (
                      <button
                        key={type}
                        onClick={() => setTransactionType(type)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${
                          transactionType === type 
                            ? 'bg-white/10 border-white/30 text-white' 
                            : 'bg-transparent border-white/10 text-white/50 hover:bg-white/5 hover:text-white/70'
                        }`}
                      >
                        {type === 'credit_note' ? 'Credit Note' : type.charAt(0).toUpperCase() + type.slice(1)}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-[10px] font-medium text-white/50 uppercase tracking-wide block mb-1">Amount (AED)</label>
                      <input
                        type="number"
                        value={transactionForm.amount}
                        onChange={e => setTransactionForm(f => ({ ...f, amount: e.target.value }))}
                        placeholder="0"
                        className={inputClass}
                      />
                    </div>
                    
                    {transactionType !== 'credit_note' && (
                      <>
                        <div>
                          <label className="text-[10px] font-medium text-white/50 uppercase tracking-wide block mb-1">Payment Method</label>
                          <select
                            value={transactionForm.payment_method}
                            onChange={e => setTransactionForm(f => ({ ...f, payment_method: e.target.value }))}
                            className={selectClass}
                          >
                            {paymentMethods.map(pm => (
                              <option key={pm.value} value={pm.value}>{pm.label}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] font-medium text-white/50 uppercase tracking-wide block mb-1">Reference (optional)</label>
                          <input
                            type="text"
                            value={transactionForm.reference_number}
                            onChange={e => setTransactionForm(f => ({ ...f, reference_number: e.target.value }))}
                            placeholder="Cheque # / Transfer ref"
                            className={inputClass}
                          />
                        </div>
                      </>
                    )}
                    
                    {transactionType === 'credit_note' && (
                      <div className="md:col-span-2">
                        <label className="text-[10px] font-medium text-white/50 uppercase tracking-wide block mb-1">Reason (required)</label>
                        <input
                          type="text"
                          value={transactionForm.reason}
                          onChange={e => setTransactionForm(f => ({ ...f, reason: e.target.value }))}
                          placeholder="e.g., Loyalty discount, Price adjustment"
                          className={inputClass}
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setShowAddTransaction(false)}
                      className="px-3 py-1.5 text-xs text-white/50 hover:text-white transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddTransaction}
                      disabled={!transactionForm.amount || (transactionType === 'credit_note' && !transactionForm.reason) || saving}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30 disabled:opacity-50 transition-all"
                    >
                      {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                      Add {transactionType === 'credit_note' ? 'Credit Note' : transactionType.charAt(0).toUpperCase() + transactionType.slice(1)}
                    </button>
                  </div>
                </div>
              )}

              {/* Unallocated Payments Section */}
              {activeInvoice && transactions.filter(tx => 
                ['deposit', 'payment'].includes(tx.transaction_type) && !tx.allocated_invoice_id
              ).length > 0 && (
                <div className="bg-amber-500/10 rounded-xl border border-amber-500/20 p-4">
                  <h4 className="text-xs font-semibold text-amber-400 uppercase tracking-wide mb-3 flex items-center gap-2">
                    <ArrowDownCircle className="w-3.5 h-3.5" />
                    Unallocated Payments
                  </h4>
                  <div className="space-y-2">
                    {transactions
                      .filter(tx => ['deposit', 'payment'].includes(tx.transaction_type) && !tx.allocated_invoice_id)
                      .map(tx => (
                        <div key={tx.id} className="flex items-center justify-between bg-black/20 rounded-lg px-3 py-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-white">{tx.document_number}</span>
                            <span className="text-sm font-semibold text-green-400">{formatCurrency(tx.amount)} AED</span>
                          </div>
                          <button
                            onClick={() => handleAllocatePayment(tx.id, activeInvoice.id)}
                            disabled={allocatingPayment === tx.id}
                            className="flex items-center gap-1.5 px-2 py-1 text-[10px] font-medium rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30 disabled:opacity-50 transition-all"
                          >
                            {allocatingPayment === tx.id ? (
                              <RefreshCw className="w-3 h-3 animate-spin" />
                            ) : (
                              <>
                                <Check className="w-3 h-3" />
                                Allocate to {activeInvoice.invoice_number}
                              </>
                            )}
                          </button>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Transactions List */}
              <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
                {transactions.length === 0 ? (
                  <div className="text-center py-8 text-white/30">
                    <CreditCard className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No transactions recorded</p>
                  </div>
                ) : (
                  <div className="divide-y divide-white/5">
                    {transactions.map(tx => {
                      const isPayment = ['deposit', 'payment'].includes(tx.transaction_type);
                      const isAllocated = isPayment && tx.allocated_invoice_id;
                      const allocatedInvoice = isAllocated ? invoices.find(i => i.id === tx.allocated_invoice_id) : null;
                      
                      return (
                        <div key={tx.id} className="flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-all">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                              tx.transaction_type === 'refund' 
                                ? 'bg-red-500/20 text-red-400'
                                : tx.transaction_type === 'credit_note'
                                ? 'bg-amber-500/20 text-amber-400'
                                : 'bg-green-500/20 text-green-400'
                            }`}>
                              {tx.transaction_type === 'refund' ? <ArrowUpCircle className="w-4 h-4" /> :
                               tx.transaction_type === 'credit_note' ? <FileText className="w-4 h-4" /> :
                               <ArrowDownCircle className="w-4 h-4" />}
                            </div>
                            <div>
                              <p className="text-sm text-white font-medium">
                                {tx.document_number}
                                {tx.payment_method && <span className="text-white/40 ml-2">({tx.payment_method})</span>}
                              </p>
                              <p className="text-[10px] text-white/40">
                                {formatDate(tx.created_at)}
                                {tx.reference_number && <span> • Ref: {tx.reference_number}</span>}
                                {tx.reason && <span> • {tx.reason}</span>}
                                {isPayment && (
                                  <span className={`ml-2 ${isAllocated ? 'text-green-400' : 'text-amber-400'}`}>
                                    • {isAllocated ? `→ ${allocatedInvoice?.invoice_number}` : 'Unallocated'}
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className={`text-sm font-semibold ${
                              tx.transaction_type === 'refund' 
                                ? 'text-red-400' 
                                : tx.transaction_type === 'credit_note'
                                ? 'text-amber-400'
                                : 'text-green-400'
                            }`}>
                              {tx.transaction_type === 'refund' ? '+' : '-'}{formatCurrency(tx.amount)} AED
                            </span>
                            {tx.document_url && (
                              <a
                                href={tx.document_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 text-white/30 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-all"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Balance Summary */}
              {deal && (
                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-white/40">Charges Total</span>
                      <span className="text-white">{formatCurrency(deal.invoice_total)} AED</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/40">Total Paid</span>
                      <span className="text-green-400">-{formatCurrency(deal.total_paid)} AED</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/40">Credit Notes</span>
                      <span className="text-amber-400">-{formatCurrency(deal.total_credits)} AED</span>
                    </div>
                    {deal.total_refunds > 0 && (
                      <div className="flex justify-between">
                        <span className="text-white/40">Refunds</span>
                        <span className="text-red-400">+{formatCurrency(deal.total_refunds)} AED</span>
                      </div>
                    )}
                    <div className="flex justify-between pt-2 border-t border-white/10 mt-2">
                      <span className="text-white font-medium">Balance Due</span>
                      <span className={`font-bold ${deal.balance_due > 0 ? 'text-red-400' : 'text-green-400'}`}>
                        {formatCurrency(Math.max(deal.balance_due, 0))} AED
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Active Invoice Status */}
              {activeInvoice && (
                <div className="bg-blue-500/10 rounded-xl p-4 border border-blue-500/20">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-semibold text-blue-400 uppercase tracking-wide">Active Invoice</h4>
                    <a href={activeInvoice.invoice_url || '#'} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:underline flex items-center gap-1">
                      {activeInvoice.invoice_number} <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-white/40">Invoice Total</span>
                      <span className="text-white">{formatCurrency(activeInvoice.total_amount)} AED</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/40">Allocated</span>
                      <span className="text-green-400">-{formatCurrency(activeInvoice.allocated_amount)} AED</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/40">Invoice Balance</span>
                      <span className={`font-medium ${activeInvoice.invoice_balance > 0 ? 'text-amber-400' : 'text-green-400'}`}>
                        {formatCurrency(activeInvoice.invoice_balance)} AED
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Voided Invoices */}
              {invoices.filter(i => i.status === 'voided').length > 0 && (
                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <h4 className="text-xs font-semibold text-white/40 uppercase tracking-wide mb-2">Previous Invoices (Voided)</h4>
                  <div className="space-y-1">
                    {invoices.filter(i => i.status === 'voided').map(inv => (
                      <div key={inv.id} className="flex items-center justify-between text-sm">
                        <span className="text-white/50 line-through">{inv.invoice_number}</span>
                        <span className="text-red-400/50 text-xs">Voided {inv.voided_at ? formatDate(inv.voided_at) : ''}</span>
                        {inv.invoice_url && (
                          <a href={inv.invoice_url} target="_blank" rel="noopener noreferrer" className="text-white/30 hover:text-white/50">
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Finance Tab */}
          {activeTab === 'finance' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-semibold text-white/40 uppercase tracking-widest flex items-center gap-2">
                  <Building2 className="w-3.5 h-3.5" /> Bank Finance Applications
                </h3>
                <button
                  onClick={() => setShowAddFinance(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-white/10 border border-white/20 text-white hover:bg-white/15 transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  New Application
                </button>
              </div>

              {showAddFinance && (
                <div className="bg-white/5 rounded-xl p-4 border border-white/10 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-medium text-white/50 uppercase tracking-wide block mb-1">Bank</label>
                      <select
                        value={financeForm.bank_name}
                        onChange={e => setFinanceForm(f => ({ ...f, bank_name: e.target.value }))}
                        className={selectClass}
                      >
                        {banks.map(bank => (
                          <option key={bank} value={bank}>{bank}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-medium text-white/50 uppercase tracking-wide block mb-1">Loan Amount (AED)</label>
                      <input
                        type="number"
                        value={financeForm.loan_amount}
                        onChange={e => setFinanceForm(f => ({ ...f, loan_amount: e.target.value }))}
                        placeholder="0"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-medium text-white/50 uppercase tracking-wide block mb-1">Application Reference</label>
                      <input
                        type="text"
                        value={financeForm.application_ref}
                        onChange={e => setFinanceForm(f => ({ ...f, application_ref: e.target.value }))}
                        placeholder="Bank reference number"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-medium text-white/50 uppercase tracking-wide block mb-1">Notes</label>
                      <input
                        type="text"
                        value={financeForm.notes}
                        onChange={e => setFinanceForm(f => ({ ...f, notes: e.target.value }))}
                        placeholder="Additional notes"
                        className={inputClass}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setShowAddFinance(false)}
                      className="px-3 py-1.5 text-xs text-white/50 hover:text-white transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddFinance}
                      disabled={saving}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30 disabled:opacity-50 transition-all"
                    >
                      {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                      Create Application
                    </button>
                  </div>
                </div>
              )}

              {/* Finance Applications List */}
              {financeApps.length === 0 ? (
                <div className="bg-white/5 rounded-xl border border-white/10 text-center py-8 text-white/30">
                  <Building2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No finance applications</p>
                </div>
              ) : (
                financeApps.map(app => (
                  <div key={app.id} className="bg-white/5 rounded-xl p-4 border border-white/10 space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="text-white font-semibold">{app.bank_name}</h4>
                        <p className="text-[10px] text-white/40">
                          {app.loan_amount && <span>Loan: {formatCurrency(app.loan_amount)} AED</span>}
                          {app.application_ref && <span> • Ref: {app.application_ref}</span>}
                        </p>
                      </div>
                      <select
                        value={app.status}
                        onChange={e => handleUpdateFinanceStatus(app.id, e.target.value)}
                        className={`${selectClass} w-auto text-xs ${
                          app.status === 'approved' || app.status === 'payment_received' 
                            ? '!border-green-500/30 !text-green-400' 
                            : app.status === 'rejected'
                            ? '!border-red-500/30 !text-red-400'
                            : ''
                        }`}
                      >
                        {financeStatuses.map(s => (
                          <option key={s.value} value={s.value}>{s.label}</option>
                        ))}
                      </select>
                    </div>

                    {/* Document Upload Section */}
                    <div>
                      <p className="text-[10px] text-white/40 uppercase tracking-wide mb-2">Required Documents</p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {financeDocTypes.slice(0, 8).map(docType => {
                          const doc = app.documents?.find(d => d.document_type === docType.value);
                          return (
                            <div
                              key={docType.value}
                              className={`p-2 rounded-lg border text-center text-[10px] ${
                                doc 
                                  ? 'bg-green-500/10 border-green-500/30 text-green-400' 
                                  : 'bg-white/5 border-white/10 text-white/40'
                              }`}
                            >
                              {doc ? (
                                <a 
                                  href={doc.file_url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="flex flex-col items-center gap-1 hover:text-green-300"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span className="truncate w-full">{docType.label}</span>
                                </a>
                              ) : (
                                <div className="flex flex-col items-center gap-1">
                                  <Upload className="w-3.5 h-3.5" />
                                  <span className="truncate w-full">{docType.label}</span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {app.notes && (
                      <p className="text-white/40 text-xs italic">{app.notes}</p>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* Documents Tab */}
          {activeTab === 'documents' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-semibold text-white/40 uppercase tracking-widest flex items-center gap-2">
                  <FolderOpen className="w-3.5 h-3.5" /> Generated Documents
                </h3>
                <button
                  onClick={handleGenerateSOA}
                  disabled={generatingPdf === 'soa'}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 hover:text-white disabled:opacity-50 transition-all"
                >
                  {generatingPdf === 'soa' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                  Statement of Account
                </button>
              </div>

              <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
                {/* Invoice */}
                {deal?.invoice_number ? (
                  <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 hover:bg-white/5 transition-all">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-sm text-white font-medium">{deal.invoice_number}</p>
                        <p className="text-[10px] text-white/40">Invoice • {formatCurrency(deal?.invoice_total || 0)} AED</p>
                      </div>
                    </div>
                    <a
                      href={deal.invoice_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-white/50 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      View
                    </a>
                  </div>
                ) : charges.length > 0 ? (
                  <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 hover:bg-white/5 transition-all">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-white/10 text-white/40 flex items-center justify-center">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-sm text-white/60">Invoice not created</p>
                        <p className="text-[10px] text-white/40">{charges.length} charge{charges.length > 1 ? 's' : ''} • {formatCurrency(deal?.invoice_total || 0)} AED</p>
                      </div>
                    </div>
                    <button
                      onClick={handleGenerateInvoice}
                      disabled={generatingPdf === 'invoice'}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-green-500/20 border border-green-500/30 text-green-400 hover:bg-green-500/30 transition-all"
                    >
                      {generatingPdf === 'invoice' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
                      Create Invoice
                    </button>
                  </div>
                ) : null}

                {/* Transaction Documents */}
                {transactions.filter(tx => tx.document_url).map(tx => (
                  <div key={tx.id} className="flex items-center justify-between px-4 py-3 border-b border-white/5 hover:bg-white/5 transition-all">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        tx.transaction_type === 'credit_note' 
                          ? 'bg-amber-500/20 text-amber-400'
                          : tx.transaction_type === 'refund'
                          ? 'bg-red-500/20 text-red-400'
                          : 'bg-green-500/20 text-green-400'
                      }`}>
                        <Receipt className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-sm text-white font-medium">{tx.document_number}</p>
                        <p className="text-[10px] text-white/40">
                          {tx.transaction_type === 'credit_note' ? 'Credit Note' : 
                           tx.transaction_type === 'refund' ? 'Refund Voucher' : 'Receipt'} • {formatDate(tx.created_at)}
                        </p>
                      </div>
                    </div>
                    <a
                      href={tx.document_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-white/50 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      View
                    </a>
                  </div>
                ))}

                {transactions.filter(tx => tx.document_url).length === 0 && charges.length === 0 && (
                  <div className="text-center py-8 text-white/30">
                    <FolderOpen className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No documents generated yet</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
