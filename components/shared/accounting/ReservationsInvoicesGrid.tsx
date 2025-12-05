'use client';
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useUserRole } from '@/lib/useUserRole';
import { FileText, Search, Shield, Users, ChevronRight, Download, Receipt, AlertTriangle } from 'lucide-react';
import AccountSummaryModal from '@/components/modules/uv-crm/modals/AccountSummaryModal';

interface CustomerAccount {
  id: string;
  lead_id: string;
  customer_number: string | null;
  customer_name: string;
  contact_no: string;
  email_address: string;
  vehicle_make_model: string;
  model_year: number;
  document_type: 'reservation' | 'invoice';
  document_number: string | null;
  document_status: string;
  invoice_total: number;
  created_at: string;
  // Balance data
  total_charges: number;
  total_paid: number;
  balance_due: number;
}

interface ReceiptData {
  id: string;
  lead_id: string;
  receipt_number: string | null;
  payment_date: string;
  payment_method: string;
  amount: number;
  reference_number: string | null;
  receipt_url: string | null;
  created_at: string;
  // Joined data
  customer_name: string;
  customer_number: string | null;
  vehicle_make_model: string;
  // Allocation data
  allocated_amount: number;
  unallocated_amount: number;
  allocations: Array<{
    reservation_id: string;
    allocated_amount: number;
    document_number: string | null;
  }>;
}

interface ReservationOption {
  id: string;
  document_number: string | null;
  customer_name: string;
  vehicle_make_model: string;
  balance_due: number;
}

interface Lead {
  id: string;
  full_name: string;
  phone_number: string;
  country_code?: string;
  model_of_interest: string;
  inventory_car_id?: string;
}

interface InvoiceData {
  id: string;
  deal_id: string;
  invoice_number: string | null;
  invoice_date: string;
  status: 'pending' | 'partial' | 'paid' | 'reversed';
  subtotal: number;
  vat_amount: number;
  total_amount: number;
  paid_amount: number;
  balance_due: number;
  invoice_pdf_url: string | null;
  created_at: string;
  // Joined data
  customer_name: string;
  customer_number: string | null;
  deal_number: string | null;
  vehicle_make_model: string;
}

interface FilterState {
  fromDate: string;
  toDate: string;
  search: string;
  status: string;
}

type TabType = 'accounts' | 'invoices' | 'unallocated' | 'receipts';

export default function ReservationsInvoicesGrid() {
  const [activeTab, setActiveTab] = useState<TabType>('accounts');
  const [data, setData] = useState<CustomerAccount[]>([]);
  const [invoices, setInvoices] = useState<InvoiceData[]>([]);
  const [unallocatedPayments, setUnallocatedPayments] = useState<ReceiptData[]>([]);
  const [receipts, setReceipts] = useState<ReceiptData[]>([]);
  const [loading, setLoading] = useState(true);
  const { role } = useUserRole();

  // Get first day of current month and today for default date range
  const getDefaultFromDate = () => {
    const now = new Date();
    return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-01`;
  };

  const getDefaultToDate = () => {
    return new Date().toISOString().split('T')[0];
  };

  const [filters, setFilters] = useState<FilterState>({
    fromDate: getDefaultFromDate(),
    toDate: getDefaultToDate(),
    search: '',
    status: ''
  });
  
  // Modal state
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerAccount | null>(null);
  const [showModal, setShowModal] = useState(false);
  
  // Allocation modal state
  const [showAllocationModal, setShowAllocationModal] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<ReceiptData | null>(null);
  const [reservationOptions, setReservationOptions] = useState<ReservationOption[]>([]);
  const [selectedReservationId, setSelectedReservationId] = useState<string>('');
  const [allocationAmount, setAllocationAmount] = useState<number>(0);
  const [allocating, setAllocating] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Query vehicle_reservations with date range on created_at
      let query = supabase
        .from('vehicle_reservations')
        .select(`
          id,
          lead_id,
          customer_number,
          customer_name,
          contact_no,
          email_address,
          vehicle_make_model,
          model_year,
          document_type,
          document_number,
          document_status,
          invoice_total,
          created_at
        `)
        .order('created_at', { ascending: false });

      // Apply date range filter on created_at
      if (filters.fromDate) {
        query = query.gte('created_at', `${filters.fromDate}T00:00:00`);
      }
      if (filters.toDate) {
        query = query.lte('created_at', `${filters.toDate}T23:59:59`);
      }

      const { data: reservationsData, error } = await query;

      if (error) {
        console.error('Error fetching data:', error);
        return;
      }

      let customers = reservationsData || [];

      // Group by lead_id to get unique customers (keep the latest record per customer)
      const customerMap = new Map<string, typeof customers[0]>();
      customers.forEach(customer => {
        const existing = customerMap.get(customer.lead_id);
        if (!existing || new Date(customer.created_at) > new Date(existing.created_at)) {
          customerMap.set(customer.lead_id, customer);
        }
      });
      
      // Convert to CustomerAccount with default balance values
      let customersWithBalance: CustomerAccount[] = Array.from(customerMap.values()).map(c => ({
        ...c,
        total_charges: c.invoice_total || 0,
        total_paid: 0,
        balance_due: c.invoice_total || 0
      }));

      // Fetch balance data for each customer
      const leadIds = customersWithBalance.map(c => c.lead_id).filter(Boolean);
      
      if (leadIds.length > 0) {
        // Get reservations to map lead_id to reservation_id
        const { data: reservations } = await supabase
          .from('vehicle_reservations')
          .select('id, lead_id')
          .in('lead_id', leadIds);

        const reservationIds = reservations?.map(r => r.id) || [];

        // Get charges totals
        const { data: chargesData } = await supabase
          .from('uv_charges')
          .select('reservation_id, unit_price, quantity')
          .in('reservation_id', reservationIds);

        // Get payments
        const { data: paymentsData } = await supabase
          .from('uv_payments')
          .select('lead_id, amount')
          .in('lead_id', leadIds);

        // Calculate totals per lead
        const leadTotals: Record<string, { charges: number; paid: number }> = {};

        reservations?.forEach(res => {
          const leadCharges = chargesData?.filter(c => c.reservation_id === res.id) || [];
          const total = leadCharges.reduce((sum, c) => sum + (c.unit_price * (c.quantity || 1)), 0);
          if (!leadTotals[res.lead_id]) {
            leadTotals[res.lead_id] = { charges: 0, paid: 0 };
          }
          leadTotals[res.lead_id].charges += total;
        });

        paymentsData?.forEach(p => {
          if (!leadTotals[p.lead_id]) {
            leadTotals[p.lead_id] = { charges: 0, paid: 0 };
          }
          // Only count positive payments (not refunds) for "paid" amount
          // Refunds (negative amounts) reduce the paid total
          const amount = p.amount || 0;
          if (amount > 0) {
            leadTotals[p.lead_id].paid += amount;
          } else {
            // Refunds reduce total paid (add negative to subtract)
            leadTotals[p.lead_id].paid += amount;
          }
        });

        // Update balance data for customers
        customersWithBalance = customersWithBalance.map(customer => ({
          ...customer,
          total_charges: leadTotals[customer.lead_id]?.charges || customer.invoice_total || 0,
          total_paid: leadTotals[customer.lead_id]?.paid || 0,
          balance_due: (leadTotals[customer.lead_id]?.charges || customer.invoice_total || 0) - (leadTotals[customer.lead_id]?.paid || 0)
        }));
      }

      // Apply search filter
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        customersWithBalance = customersWithBalance.filter(item =>
          item.customer_name?.toLowerCase().includes(searchTerm) ||
          item.vehicle_make_model?.toLowerCase().includes(searchTerm) ||
          item.customer_number?.toLowerCase().includes(searchTerm) ||
          item.contact_no?.toLowerCase().includes(searchTerm)
        );
      }

      setData(customersWithBalance);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchReceipts = async () => {
    try {
      setLoading(true);

      // Query uv_payments with date range - order by receipt number descending for chronological display
      let query = supabase
        .from('uv_payments')
        .select(`
          id,
          lead_id,
          receipt_number,
          payment_date,
          payment_method,
          amount,
          reference_number,
          receipt_url,
          created_at
        `)
        .order('receipt_number', { ascending: false });

      // Apply date range filter
      if (filters.fromDate) {
        query = query.gte('payment_date', filters.fromDate);
      }
      if (filters.toDate) {
        query = query.lte('payment_date', filters.toDate);
      }

      const { data: paymentsData, error } = await query;

      if (error) {
        console.error('Error fetching receipts:', error);
        return;
      }

      // Get allocations for these payments
      const paymentIds = (paymentsData || []).map(p => p.id);
      let allocationsMap = new Map<string, Array<{ reservation_id: string; allocated_amount: number; document_number: string | null }>>();
      
      if (paymentIds.length > 0) {
        try {
          const { data: allocations, error: allocError } = await supabase
            .from('uv_payment_allocations')
            .select('payment_id, reservation_id, allocated_amount')
            .in('payment_id', paymentIds);
          
          if (!allocError && allocations) {
            // Get document numbers for allocated reservations
            const reservationIds = [...new Set(allocations.map(a => a.reservation_id))];
            const { data: reservationDocs } = await supabase
              .from('vehicle_reservations')
              .select('id, document_number')
              .in('id', reservationIds);
            
            const docMap = new Map<string, string | null>();
            reservationDocs?.forEach(r => docMap.set(r.id, r.document_number));
            
            allocations.forEach(a => {
              const existing = allocationsMap.get(a.payment_id) || [];
              existing.push({
                reservation_id: a.reservation_id,
                allocated_amount: a.allocated_amount,
                document_number: docMap.get(a.reservation_id) || null
              });
              allocationsMap.set(a.payment_id, existing);
            });
          }
        } catch (allocErr) {
          // Table might not exist yet - continue without allocations
          console.log('Allocations table not available:', allocErr);
        }
      }

      // Initialize with default customer fields and allocation data
      let receiptsWithCustomer: ReceiptData[] = (paymentsData || []).map(p => {
        const allocs = allocationsMap.get(p.id) || [];
        // Calculate total allocated from allocations
        const totalAllocated = allocs.reduce((sum, a) => sum + (a.allocated_amount || 0), 0);
        return {
          ...p,
          customer_name: 'Unknown',
          customer_number: null,
          vehicle_make_model: '',
          allocated_amount: totalAllocated,
          unallocated_amount: p.amount - totalAllocated,
          allocations: allocs
        };
      });

      // Get customer info from vehicle_reservations
      const leadIds = receiptsWithCustomer.map(r => r.lead_id).filter(Boolean);
      
      if (leadIds.length > 0) {
        const { data: reservations } = await supabase
          .from('vehicle_reservations')
          .select('lead_id, customer_name, customer_number, vehicle_make_model')
          .in('lead_id', leadIds);

        // Map customer info to receipts
        const customerMap = new Map<string, { customer_name: string; customer_number: string | null; vehicle_make_model: string }>();
        reservations?.forEach(r => {
          if (!customerMap.has(r.lead_id)) {
            customerMap.set(r.lead_id, {
              customer_name: r.customer_name,
              customer_number: r.customer_number,
              vehicle_make_model: r.vehicle_make_model
            });
          }
        });

        receiptsWithCustomer = receiptsWithCustomer.map(receipt => ({
          ...receipt,
          customer_name: customerMap.get(receipt.lead_id)?.customer_name || 'Unknown',
          customer_number: customerMap.get(receipt.lead_id)?.customer_number || null,
          vehicle_make_model: customerMap.get(receipt.lead_id)?.vehicle_make_model || ''
        }));
      }

      // Apply search filter
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        receiptsWithCustomer = receiptsWithCustomer.filter(item =>
          item.customer_name?.toLowerCase().includes(searchTerm) ||
          item.receipt_number?.toLowerCase().includes(searchTerm) ||
          item.customer_number?.toLowerCase().includes(searchTerm) ||
          item.payment_method?.toLowerCase().includes(searchTerm)
        );
      }

      setReceipts(receiptsWithCustomer);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchInvoices = async () => {
    try {
      setLoading(true);

      // Query invoices table with joins to vehicle_reservations for customer info
      let query = supabase
        .from('invoices')
        .select(`
          id,
          deal_id,
          invoice_number,
          invoice_date,
          status,
          subtotal,
          vat_amount,
          total_amount,
          paid_amount,
          invoice_pdf_url,
          created_at
        `)
        .order('created_at', { ascending: false });

      // Apply date range filter
      if (filters.fromDate) {
        query = query.gte('invoice_date', filters.fromDate);
      }
      if (filters.toDate) {
        query = query.lte('invoice_date', filters.toDate);
      }

      // Apply status filter
      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      const { data: invoicesData, error } = await query;

      if (error) {
        console.error('Error fetching invoices:', error);
        return;
      }

      // Get customer info from vehicle_reservations
      const dealIds = (invoicesData || []).map(inv => inv.deal_id).filter(Boolean);
      
      let invoicesWithCustomer: InvoiceData[] = (invoicesData || []).map(inv => ({
        ...inv,
        balance_due: (inv.total_amount || 0) - (inv.paid_amount || 0),
        customer_name: 'Unknown',
        customer_number: null,
        deal_number: null,
        vehicle_make_model: ''
      }));

      if (dealIds.length > 0) {
        const { data: reservations } = await supabase
          .from('vehicle_reservations')
          .select('id, customer_name, customer_number, deal_number, document_number, vehicle_make_model')
          .in('id', dealIds);

        // Map customer info to invoices
        const dealMap = new Map<string, { customer_name: string; customer_number: string | null; deal_number: string | null; vehicle_make_model: string }>();
        reservations?.forEach(r => {
          dealMap.set(r.id, {
            customer_name: r.customer_name,
            customer_number: r.customer_number,
            deal_number: r.deal_number || r.document_number,
            vehicle_make_model: r.vehicle_make_model
          });
        });

        invoicesWithCustomer = invoicesWithCustomer.map(inv => ({
          ...inv,
          customer_name: dealMap.get(inv.deal_id)?.customer_name || 'Unknown',
          customer_number: dealMap.get(inv.deal_id)?.customer_number || null,
          deal_number: dealMap.get(inv.deal_id)?.deal_number || null,
          vehicle_make_model: dealMap.get(inv.deal_id)?.vehicle_make_model || ''
        }));
      }

      // Apply search filter
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        invoicesWithCustomer = invoicesWithCustomer.filter(item =>
          item.customer_name?.toLowerCase().includes(searchTerm) ||
          item.invoice_number?.toLowerCase().includes(searchTerm) ||
          item.customer_number?.toLowerCase().includes(searchTerm) ||
          item.deal_number?.toLowerCase().includes(searchTerm) ||
          item.vehicle_make_model?.toLowerCase().includes(searchTerm)
        );
      }

      setInvoices(invoicesWithCustomer);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUnallocatedPayments = async () => {
    try {
      setLoading(true);

      // Query all payments
      const { data: paymentsData, error } = await supabase
        .from('uv_payments')
        .select(`
          id,
          lead_id,
          receipt_number,
          payment_date,
          payment_method,
          amount,
          reference_number,
          receipt_url,
          created_at
        `)
        .gt('amount', 0) // Only positive payments (not refunds)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching payments:', error);
        return;
      }

      // Get allocations for these payments
      const paymentIds = (paymentsData || []).map(p => p.id);
      let allocationsMap = new Map<string, number>();
      
      if (paymentIds.length > 0) {
        try {
          const { data: allocations } = await supabase
            .from('uv_payment_allocations')
            .select('payment_id, allocated_amount')
            .in('payment_id', paymentIds);
          
          if (allocations) {
            allocations.forEach(a => {
              const existing = allocationsMap.get(a.payment_id) || 0;
              allocationsMap.set(a.payment_id, existing + (a.allocated_amount || 0));
            });
          }
        } catch (allocErr) {
          console.log('Allocations table not available:', allocErr);
        }
      }

      // Filter to only unallocated payments
      let unallocated: ReceiptData[] = (paymentsData || [])
        .map(p => {
          const totalAllocated = allocationsMap.get(p.id) || 0;
          const unallocatedAmount = p.amount - totalAllocated;
          return {
            ...p,
            customer_name: 'Unknown',
            customer_number: null,
            vehicle_make_model: '',
            allocated_amount: totalAllocated,
            unallocated_amount: unallocatedAmount,
            allocations: []
          };
        })
        .filter(p => p.unallocated_amount > 0); // Only show payments with unallocated amounts

      // Get customer info from vehicle_reservations
      const leadIds = unallocated.map(r => r.lead_id).filter(Boolean);
      
      if (leadIds.length > 0) {
        const { data: reservations } = await supabase
          .from('vehicle_reservations')
          .select('lead_id, customer_name, customer_number, vehicle_make_model')
          .in('lead_id', leadIds);

        const customerMap = new Map<string, { customer_name: string; customer_number: string | null; vehicle_make_model: string }>();
        reservations?.forEach(r => {
          if (!customerMap.has(r.lead_id)) {
            customerMap.set(r.lead_id, {
              customer_name: r.customer_name,
              customer_number: r.customer_number,
              vehicle_make_model: r.vehicle_make_model
            });
          }
        });

        unallocated = unallocated.map(receipt => ({
          ...receipt,
          customer_name: customerMap.get(receipt.lead_id)?.customer_name || 'Unknown',
          customer_number: customerMap.get(receipt.lead_id)?.customer_number || null,
          vehicle_make_model: customerMap.get(receipt.lead_id)?.vehicle_make_model || ''
        }));
      }

      // Apply search filter
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        unallocated = unallocated.filter(item =>
          item.customer_name?.toLowerCase().includes(searchTerm) ||
          item.receipt_number?.toLowerCase().includes(searchTerm) ||
          item.customer_number?.toLowerCase().includes(searchTerm)
        );
      }

      setUnallocatedPayments(unallocated);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Always fetch unallocated count for badge
  useEffect(() => {
    fetchUnallocatedPayments();
  }, []);

  useEffect(() => {
    if (activeTab === 'accounts') {
      fetchData();
    } else if (activeTab === 'invoices') {
      fetchInvoices();
    } else if (activeTab === 'unallocated') {
      fetchUnallocatedPayments();
    } else {
      fetchReceipts();
    }
  }, [filters.fromDate, filters.toDate, filters.status, activeTab]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (activeTab === 'accounts') {
        fetchData();
      } else if (activeTab === 'invoices') {
        fetchInvoices();
      } else if (activeTab === 'unallocated') {
        fetchUnallocatedPayments();
      } else {
        fetchReceipts();
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [filters.search]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AE', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(Math.abs(amount));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  // Open allocation modal
  const openAllocationModal = async (receipt: ReceiptData) => {
    console.log('Opening allocation modal for receipt:', receipt.id);
    
    // Show modal immediately
    setSelectedReceipt(receipt);
    setAllocationAmount(receipt.amount); // Use full amount since unallocated might be 0
    setSelectedReservationId('');
    setShowAllocationModal(true);
    
    // Fetch reservations for this customer (same lead_id)
    try {
      const { data: reservations, error } = await supabase
        .from('vehicle_reservations')
        .select('id, document_number, customer_name, vehicle_make_model')
        .eq('lead_id', receipt.lead_id)
        .order('created_at', { ascending: false });
      
      console.log('Found reservations:', reservations, error);
      
      if (error) {
        console.error('Error fetching reservations:', error);
        setReservationOptions([]);
        return;
      }
      
      // Calculate balance due for each reservation
      const reservationsWithBalance: ReservationOption[] = [];
      
      for (const res of reservations || []) {
        // Get total charges
        const { data: charges } = await supabase
          .from('uv_charges')
          .select('total_amount')
          .eq('reservation_id', res.id);
        
        // Get allocated payments
        const { data: allocations } = await supabase
          .from('uv_payment_allocations')
          .select('allocated_amount')
          .eq('reservation_id', res.id);
        
        const totalCharges = (charges || []).reduce((sum, c) => sum + (c.total_amount || 0), 0);
        const totalAllocated = (allocations || []).reduce((sum, a) => sum + (a.allocated_amount || 0), 0);
        const balanceDue = totalCharges - totalAllocated;
        
        reservationsWithBalance.push({
          ...res,
          balance_due: balanceDue
        });
      }
      
      console.log('Reservations with balance:', reservationsWithBalance);
      setReservationOptions(reservationsWithBalance);
    } catch (err) {
      console.error('Error fetching reservations:', err);
      setReservationOptions([]);
    }
  };

  // Handle allocation
  const handleAllocate = async () => {
    if (!selectedReceipt || !selectedReservationId || allocationAmount <= 0) return;
    
    setAllocating(true);
    try {
      // Check if allocation already exists
      const { data: existing } = await supabase
        .from('uv_payment_allocations')
        .select('id, allocated_amount')
        .eq('payment_id', selectedReceipt.id)
        .eq('reservation_id', selectedReservationId)
        .maybeSingle();
      
      if (existing) {
        // Update existing allocation
        const { error } = await supabase
          .from('uv_payment_allocations')
          .update({ allocated_amount: existing.allocated_amount + allocationAmount })
          .eq('id', existing.id);
        
        if (error) throw error;
      } else {
        // Create new allocation
        const { error } = await supabase
          .from('uv_payment_allocations')
          .insert({
            payment_id: selectedReceipt.id,
            reservation_id: selectedReservationId,
            allocated_amount: allocationAmount
          });
        
        if (error) throw error;
      }
      
      // Refresh receipts
      await fetchReceipts();
      setShowAllocationModal(false);
    } catch (err) {
      console.error('Error allocating payment:', err);
      alert('Failed to allocate payment. Make sure the uv_payment_allocations table exists.');
    } finally {
      setAllocating(false);
    }
  };

  const formatPaymentMethod = (method: string) => {
    const methods: Record<string, string> = {
      'cash': 'Cash',
      'bank_transfer': 'Bank Transfer',
      'cheque': 'Cheque',
      'credit_card': 'Credit Card',
      'part_exchange': 'Part Exchange',
      'finance': 'Finance',
      'refund': 'Refund'
    };
    return methods[method] || method;
  };

  const handleRowClick = (customer: CustomerAccount) => {
    setSelectedCustomer(customer);
    setShowModal(true);
  };

  const handleModalClose = () => {
    setShowModal(false);
    setSelectedCustomer(null);
    // Refresh data in case changes were made
    if (activeTab === 'accounts') {
      fetchData();
    } else {
      fetchReceipts();
    }
  };

  // Create lead object for modal
  const getLeadForModal = (customer: CustomerAccount): Lead => ({
    id: customer.lead_id,
    full_name: customer.customer_name,
    phone_number: customer.contact_no || '',
    model_of_interest: customer.vehicle_make_model || ''
  });

  // Calculate summary stats for accounts
  const totalCharges = data.reduce((sum, c) => sum + (c.total_charges || 0), 0);
  const totalPaid = data.reduce((sum, c) => sum + (c.total_paid || 0), 0);
  const totalBalance = data.reduce((sum, c) => sum + (c.balance_due || 0), 0);
  const paidCount = data.filter(c => c.balance_due <= 0 && c.total_charges > 0).length;
  const partialCount = data.filter(c => c.balance_due > 0 && c.total_paid > 0).length;
  const unpaidCount = data.filter(c => c.balance_due > 0 && c.total_paid === 0).length;

  // Calculate summary stats for receipts
  const totalReceiptsAmount = receipts.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
  const receiptsWithPdf = receipts.filter(r => r.receipt_url).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">
            {activeTab === 'accounts' ? 'Customer Accounts' : activeTab === 'invoices' ? 'Invoices' : activeTab === 'unallocated' ? 'Unallocated Payments' : 'Payment Receipts'}
          </h1>
          <p className="text-sm text-white/60">
            {activeTab === 'accounts' 
              ? 'View and manage customer account balances' 
              : activeTab === 'invoices'
                ? 'View all invoices chronologically'
                : activeTab === 'unallocated'
                  ? 'Payments that need to be allocated to an invoice'
                  : 'View and download payment receipts'}
          </p>
          {role && (
            <div className="flex items-center gap-2 mt-1">
              <Shield className="w-3 h-3 text-brand" />
              <span className="text-xs text-brand font-medium">
                Access: {role.charAt(0).toUpperCase() + role.slice(1)} Role
              </span>
            </div>
          )}
        </div>
        <div className="text-sm text-white/60">
          Total: {activeTab === 'accounts' ? `${data.length} customers` : activeTab === 'invoices' ? `${invoices.length} invoices` : activeTab === 'unallocated' ? `${unallocatedPayments.length} payments` : `${receipts.length} receipts`}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-1.5 inline-flex gap-1">
        <button
          onClick={() => setActiveTab('accounts')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            activeTab === 'accounts'
              ? 'bg-brand text-white shadow-lg shadow-brand/25'
              : 'text-white/50 hover:text-white hover:bg-white/5'
          }`}
        >
          <Users className="w-4 h-4" />
          Customer Accounts
        </button>
        <button
          onClick={() => setActiveTab('invoices')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            activeTab === 'invoices'
              ? 'bg-brand text-white shadow-lg shadow-brand/25'
              : 'text-white/50 hover:text-white hover:bg-white/5'
          }`}
        >
          <Receipt className="w-4 h-4" />
          Invoices
        </button>
        <button
          onClick={() => setActiveTab('unallocated')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all relative ${
            activeTab === 'unallocated'
              ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/25'
              : unallocatedPayments.length > 0
                ? 'text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 border border-amber-500/30'
                : 'text-white/50 hover:text-white hover:bg-white/5'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          Unallocated
          {unallocatedPayments.length > 0 && (
            <span className={`px-1.5 py-0.5 text-xs font-bold rounded-full ${
              activeTab === 'unallocated' ? 'bg-white/20 text-white' : 'bg-amber-500 text-white'
            }`}>
              {unallocatedPayments.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('receipts')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            activeTab === 'receipts'
              ? 'bg-brand text-white shadow-lg shadow-brand/25'
              : 'text-white/50 hover:text-white hover:bg-white/5'
          }`}
        >
          <FileText className="w-4 h-4" />
          Receipts
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white/5 backdrop-blur border border-white/10 rounded-lg p-4">
        <div className={`grid grid-cols-1 gap-4 items-end ${activeTab === 'invoices' ? 'md:grid-cols-4' : 'md:grid-cols-3'}`}>
          {/* From Date */}
          <div>
            <label className="block text-xs font-medium text-white/70 mb-1">From Date</label>
            <input
              type="date"
              value={filters.fromDate}
              onChange={(e) => setFilters(prev => ({ ...prev, fromDate: e.target.value }))}
              className="w-full h-[42px] px-3 py-2 bg-white/10 border border-white/20 rounded text-white text-sm [color-scheme:dark]"
            />
          </div>

          {/* To Date */}
          <div>
            <label className="block text-xs font-medium text-white/70 mb-1">To Date</label>
            <input
              type="date"
              value={filters.toDate}
              onChange={(e) => setFilters(prev => ({ ...prev, toDate: e.target.value }))}
              className="w-full h-[42px] px-3 py-2 bg-white/10 border border-white/20 rounded text-white text-sm [color-scheme:dark]"
            />
          </div>

          {/* Status Filter - Only show for Invoices tab */}
          {activeTab === 'invoices' && (
            <div>
              <label className="block text-xs font-medium text-white/70 mb-1">Status</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                className="w-full h-[42px] px-3 py-2 bg-white/10 border border-white/20 rounded text-white text-sm"
              >
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="partial">Partial</option>
                <option value="paid">Paid</option>
                <option value="reversed">Reversed</option>
              </select>
            </div>
          )}

          {/* Search */}
          <div>
            <label className="block text-xs font-medium text-white/70 mb-1">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-white/40" />
              <input
                type="text"
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                placeholder={activeTab === 'accounts' ? "Customer name, ID, phone..." : activeTab === 'invoices' ? "Invoice #, customer, deal #..." : "Receipt #, customer name..."}
                className="w-full h-[42px] pl-10 pr-3 py-2 bg-white/10 border border-white/20 rounded text-white text-sm placeholder-white/40"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Customer Accounts Table */}
      {activeTab === 'accounts' && (
        <>
          <div className="bg-white/5 backdrop-blur border border-white/10 rounded-lg overflow-hidden">
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-white/20 border-t-white/60 mx-auto mb-4"></div>
                <p className="text-white/60">Loading customer accounts...</p>
              </div>
            ) : data.length === 0 ? (
              <div className="p-8 text-center">
                <Users className="w-12 h-12 text-white/20 mx-auto mb-4" />
                <p className="text-white/60">No customers found for the selected date range</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="px-4 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">Customer ID</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">Customer Name</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">Vehicle</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-white/70 uppercase tracking-wider">Total Charges</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-white/70 uppercase tracking-wider">Paid</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-white/70 uppercase tracking-wider">Balance</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-white/70 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">Created</th>
                      <th className="px-4 py-3 w-8"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {data.map((item) => {
                      const isPaid = item.balance_due <= 0 && item.total_charges > 0;
                      const isPartial = item.balance_due > 0 && item.total_paid > 0;
                      
                      return (
                        <tr 
                          key={item.id} 
                          onClick={() => handleRowClick(item)}
                          className="hover:bg-white/5 transition-colors cursor-pointer group"
                        >
                          <td className="px-4 py-3">
                            {item.customer_number ? (
                              <span className="px-2 py-1 bg-brand/20 border border-brand/40 rounded text-brand text-xs font-mono font-bold">
                                {item.customer_number}
                              </span>
                            ) : (
                              <span className="text-white/40 text-xs">No ID</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div>
                              <div className="text-white text-sm font-medium">{item.customer_name}</div>
                              {item.contact_no && (
                                <div className="text-white/50 text-xs">{item.contact_no}</div>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-white/80 text-sm">
                            {item.vehicle_make_model} {item.model_year > 0 && item.model_year}
                          </td>
                          <td className="px-4 py-3 text-right text-white text-sm">
                            AED {formatCurrency(item.total_charges || 0)}
                          </td>
                          <td className="px-4 py-3 text-right text-emerald-400 text-sm">
                            AED {formatCurrency(item.total_paid || 0)}
                          </td>
                          <td className={`px-4 py-3 text-right text-sm font-semibold ${
                            isPaid ? 'text-emerald-400' : 'text-amber-400'
                          }`}>
                            AED {formatCurrency(Math.abs(item.balance_due || 0))}
                            {item.balance_due < 0 && ' CR'}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              item.document_status === 'reversed'
                                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                : isPaid
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                  : isPartial
                                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                    : 'bg-red-500/20 text-red-400 border border-red-500/30'
                            }`}>
                              {item.document_status === 'reversed' ? 'Reversed' : isPaid ? 'Paid' : isPartial ? 'Partial' : 'Unpaid'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-white/60 text-sm">
                            {formatDate(item.created_at)}
                          </td>
                          <td className="px-4 py-3">
                            <ChevronRight className="w-4 h-4 text-white/30 group-hover:text-white/60 transition-colors" />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Summary for Accounts */}
          <div className="bg-white/5 backdrop-blur border border-white/10 rounded-lg p-4">
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-white">{data.length}</p>
                <p className="text-sm text-white/60">Customers</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-white">AED {formatCurrency(totalCharges)}</p>
                <p className="text-sm text-white/60">Total Charges</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-emerald-400">AED {formatCurrency(totalPaid)}</p>
                <p className="text-sm text-white/60">Total Paid</p>
              </div>
              <div>
                <p className={`text-2xl font-bold ${totalBalance > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                  AED {formatCurrency(Math.abs(totalBalance))}
                </p>
                <p className="text-sm text-white/60">Outstanding</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-emerald-400">{paidCount}</p>
                <p className="text-sm text-white/60">Paid</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-400">{partialCount + unpaidCount}</p>
                <p className="text-sm text-white/60">Outstanding</p>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Invoices Table */}
      {activeTab === 'invoices' && (
        <>
          <div className="bg-white/5 backdrop-blur border border-white/10 rounded-lg overflow-hidden">
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-white/20 border-t-white/60 mx-auto mb-4"></div>
                <p className="text-white/60">Loading invoices...</p>
              </div>
            ) : invoices.length === 0 ? (
              <div className="p-8 text-center">
                <Receipt className="w-12 h-12 text-white/20 mx-auto mb-4" />
                <p className="text-white/60">No invoices found for the selected filters</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="px-4 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">Invoice #</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">Customer</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">Vehicle</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-white/70 uppercase tracking-wider">Total</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-white/70 uppercase tracking-wider">Paid</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-white/70 uppercase tracking-wider">Balance</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-white/70 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-white/70 uppercase tracking-wider">PDF</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {invoices.map((invoice) => (
                      <tr key={invoice.id} className="hover:bg-white/5 transition-colors">
                        <td className="px-4 py-3">
                          {invoice.invoice_number ? (
                            <span className={`px-2 py-1 rounded text-xs font-mono font-bold ${
                              invoice.status === 'reversed'
                                ? 'bg-red-500/20 border border-red-500/40 text-red-400'
                                : 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-400'
                            }`}>
                              {invoice.invoice_number}
                            </span>
                          ) : (
                            <span className="text-white/40 text-xs">Pending</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-white/80 text-sm">
                          {formatDate(invoice.invoice_date)}
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            <div className="text-white text-sm font-medium">{invoice.customer_name}</div>
                            {invoice.customer_number && (
                              <div className="text-brand text-xs font-mono">{invoice.customer_number}</div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-white/60 text-sm">
                          {invoice.vehicle_make_model || '-'}
                        </td>
                        <td className="px-4 py-3 text-right text-white text-sm">
                          AED {formatCurrency(invoice.total_amount || 0)}
                        </td>
                        <td className="px-4 py-3 text-right text-emerald-400 text-sm">
                          AED {formatCurrency(invoice.paid_amount || 0)}
                        </td>
                        <td className={`px-4 py-3 text-right text-sm font-semibold ${
                          invoice.balance_due <= 0 ? 'text-emerald-400' : 'text-amber-400'
                        }`}>
                          AED {formatCurrency(Math.abs(invoice.balance_due || 0))}
                          {invoice.balance_due < 0 && ' CR'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            invoice.status === 'reversed'
                              ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                              : invoice.status === 'paid'
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : invoice.status === 'partial'
                                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                  : 'bg-white/10 text-white/60 border border-white/20'
                          }`}>
                            {invoice.status === 'reversed' ? 'Reversed' : invoice.status === 'paid' ? 'Paid' : invoice.status === 'partial' ? 'Partial' : 'Pending'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {invoice.invoice_pdf_url ? (
                            <button
                              onClick={() => window.open(invoice.invoice_pdf_url!, '_blank')}
                              className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white/60 hover:text-white transition-colors"
                              title="View Invoice PDF"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                          ) : (
                            <span className="text-white/30 text-xs">No PDF</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Summary for Invoices */}
          <div className="bg-white/5 backdrop-blur border border-white/10 rounded-lg p-4">
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-white">{invoices.length}</p>
                <p className="text-sm text-white/60">Total Invoices</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-white">AED {formatCurrency(invoices.reduce((sum, i) => sum + (i.total_amount || 0), 0))}</p>
                <p className="text-sm text-white/60">Total Amount</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-emerald-400">AED {formatCurrency(invoices.reduce((sum, i) => sum + (i.paid_amount || 0), 0))}</p>
                <p className="text-sm text-white/60">Total Paid</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-400">AED {formatCurrency(invoices.reduce((sum, i) => sum + (i.balance_due || 0), 0))}</p>
                <p className="text-sm text-white/60">Outstanding</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-emerald-400">{invoices.filter(i => i.status === 'paid').length}</p>
                <p className="text-sm text-white/60">Paid</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-red-400">{invoices.filter(i => i.status === 'reversed').length}</p>
                <p className="text-sm text-white/60">Reversed</p>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Unallocated Payments Tab */}
      {activeTab === 'unallocated' && (
        <>
          {/* Prominent Warning Banner */}
          {unallocatedPayments.length > 0 && (
            <div className="bg-amber-500/20 border-2 border-amber-500/50 rounded-lg p-4 flex items-center gap-4">
              <div className="flex-shrink-0">
                <AlertTriangle className="w-10 h-10 text-amber-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-amber-400">
                  {unallocatedPayments.length} Payment{unallocatedPayments.length !== 1 ? 's' : ''} Require Allocation
                </h3>
                <p className="text-white/70 text-sm">
                  Total unallocated amount: <span className="font-bold text-amber-400">AED {formatCurrency(unallocatedPayments.reduce((sum, p) => sum + p.unallocated_amount, 0))}</span>
                </p>
                <p className="text-white/50 text-xs mt-1">
                  These payments need to be linked to an invoice. Open the customer account to allocate.
                </p>
              </div>
            </div>
          )}

          <div className="bg-white/5 backdrop-blur border border-white/10 rounded-lg overflow-hidden">
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-white/20 border-t-white/60 mx-auto mb-4"></div>
                <p className="text-white/60">Loading unallocated payments...</p>
              </div>
            ) : unallocatedPayments.length === 0 ? (
              <div className="p-8 text-center">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-emerald-400 font-semibold text-lg">All payments allocated!</p>
                <p className="text-white/50 text-sm mt-1">No unallocated payments at this time</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10 bg-amber-500/5">
                      <th className="px-4 py-3 text-left text-xs font-medium text-amber-400 uppercase tracking-wider">Receipt #</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-amber-400 uppercase tracking-wider">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-amber-400 uppercase tracking-wider">Customer</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-amber-400 uppercase tracking-wider">Method</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-amber-400 uppercase tracking-wider">Total Amount</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-amber-400 uppercase tracking-wider">Allocated</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-amber-400 uppercase tracking-wider">Unallocated</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-amber-400 uppercase tracking-wider">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {unallocatedPayments.map((payment) => (
                      <tr key={payment.id} className="hover:bg-amber-500/5 transition-colors">
                        <td className="px-4 py-3">
                          {payment.receipt_number ? (
                            <span className="px-2 py-1 bg-amber-500/20 border border-amber-500/40 rounded text-amber-400 text-xs font-mono font-bold">
                              {payment.receipt_number}
                            </span>
                          ) : (
                            <span className="text-white/40 text-xs">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-white/80 text-sm">
                          {formatDate(payment.payment_date)}
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            <div className="text-white text-sm font-medium">{payment.customer_name}</div>
                            {payment.customer_number && (
                              <div className="text-brand text-xs font-mono">{payment.customer_number}</div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-white/60 text-sm capitalize">
                          {payment.payment_method?.replace(/_/g, ' ') || '-'}
                        </td>
                        <td className="px-4 py-3 text-right text-white text-sm">
                          AED {formatCurrency(payment.amount)}
                        </td>
                        <td className="px-4 py-3 text-right text-emerald-400 text-sm">
                          AED {formatCurrency(payment.allocated_amount)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="px-2 py-1 bg-amber-500/20 border border-amber-500/40 rounded text-amber-400 text-sm font-bold">
                            AED {formatCurrency(payment.unallocated_amount)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => {
                              // Find customer account and open modal
                              const account = data.find(d => d.lead_id === payment.lead_id);
                              if (account) {
                                setSelectedCustomer(account);
                              } else {
                                // Create a minimal account to open modal
                                const minimalAccount: CustomerAccount = {
                                  id: '',
                                  lead_id: payment.lead_id,
                                  customer_number: payment.customer_number,
                                  customer_name: payment.customer_name,
                                  contact_no: '',
                                  email_address: '',
                                  vehicle_make_model: payment.vehicle_make_model || '',
                                  model_year: 0,
                                  document_type: 'reservation',
                                  document_number: null,
                                  document_status: '',
                                  invoice_total: 0,
                                  created_at: '',
                                  total_charges: 0,
                                  total_paid: 0,
                                  balance_due: 0
                                };
                                setSelectedCustomer(minimalAccount);
                              }
                            }}
                            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded transition-colors"
                          >
                            Allocate
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Summary for Unallocated Payments */}
          <div className="bg-amber-500/10 backdrop-blur border border-amber-500/30 rounded-lg p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-amber-400">{unallocatedPayments.length}</p>
                <p className="text-sm text-white/60">Unallocated Payments</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-white">AED {formatCurrency(unallocatedPayments.reduce((sum, p) => sum + p.amount, 0))}</p>
                <p className="text-sm text-white/60">Total Amount</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-emerald-400">AED {formatCurrency(unallocatedPayments.reduce((sum, p) => sum + p.allocated_amount, 0))}</p>
                <p className="text-sm text-white/60">Allocated</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-400">AED {formatCurrency(unallocatedPayments.reduce((sum, p) => sum + p.unallocated_amount, 0))}</p>
                <p className="text-sm text-white/60">Needs Allocation</p>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Receipts Table */}
      {activeTab === 'receipts' && (
        <>
          <div className="bg-white/5 backdrop-blur border border-white/10 rounded-lg overflow-hidden">
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-white/20 border-t-white/60 mx-auto mb-4"></div>
                <p className="text-white/60">Loading receipts...</p>
              </div>
            ) : receipts.length === 0 ? (
              <div className="p-8 text-center">
                <FileText className="w-12 h-12 text-white/20 mx-auto mb-4" />
                <p className="text-white/60">No receipts found for the selected date range</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="px-4 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">Receipt #</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">Customer</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">Vehicle</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">Method</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-white/70 uppercase tracking-wider">Amount</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-white/70 uppercase tracking-wider">Allocated To</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-white/70 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {receipts.map((receipt) => (
                      <tr key={receipt.id} className="hover:bg-white/5 transition-colors">
                        <td className="px-4 py-3">
                          {receipt.receipt_number ? (
                            <span className="px-2 py-1 bg-white/10 border border-white/20 rounded text-white text-xs font-mono">
                              {receipt.receipt_number}
                            </span>
                          ) : (
                            <span className="text-white/40 text-xs">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-white/80 text-sm">
                          {formatDate(receipt.payment_date)}
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            <div className="text-white text-sm font-medium">{receipt.customer_name || 'Unknown'}</div>
                            {receipt.customer_number && (
                              <div className="text-brand text-xs font-mono">{receipt.customer_number}</div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-white/60 text-sm">
                          {receipt.vehicle_make_model || '-'}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            receipt.payment_method === 'refund' || receipt.amount < 0
                              ? 'bg-red-500/20 text-red-400'
                              : 'bg-white/10 text-white/80'
                          }`}>
                            {formatPaymentMethod(receipt.payment_method)}
                          </span>
                        </td>
                        <td className={`px-4 py-3 text-right text-sm font-semibold ${
                          receipt.amount < 0 ? 'text-red-400' : 'text-emerald-400'
                        }`}>
                          {receipt.amount < 0 ? '-' : ''}AED {formatCurrency(receipt.amount)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {receipt.allocations && receipt.allocations.length > 0 ? (
                            <div className="flex flex-col gap-1 items-center">
                              {receipt.allocated_amount >= receipt.amount ? (
                                <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded text-xs font-medium">
                                  Fully Allocated
                                </span>
                              ) : (
                                <span className="px-2 py-1 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded text-xs font-medium">
                                  Partial
                                </span>
                              )}
                              <div className="text-[10px] text-white/50 mt-1">
                                {receipt.allocations.map((alloc, idx) => (
                                  <div key={idx}>{alloc.document_number || 'RES'}: {formatCurrency(alloc.allocated_amount)}</div>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <span className="px-2 py-1 bg-red-500/20 text-red-400 border border-red-500/30 rounded text-xs font-medium">
                              Not Allocated
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openAllocationModal(receipt);
                                }}
                                className="px-3 py-1.5 bg-brand/20 hover:bg-brand/30 rounded-lg text-brand text-xs font-medium transition-colors flex items-center gap-1"
                                title="Allocate to Reservation"
                              >
                                Allocate <ChevronRight className="w-3 h-3" />
                              </button>
                            {receipt.receipt_url ? (
                              <button
                                onClick={() => window.open(receipt.receipt_url!, '_blank')}
                                className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white/60 hover:text-white transition-colors"
                                title="Download Receipt"
                              >
                                <Download className="w-4 h-4" />
                              </button>
                            ) : (
                              <button
                                onClick={async () => {
                                  try {
                                    const res = await fetch('/api/generate-receipt', {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({
                                        paymentId: receipt.id,
                                        customerName: receipt.customer_name,
                                        vehicleInfo: receipt.vehicle_make_model,
                                      })
                                    });
                                    if (res.ok) {
                                      const data = await res.json();
                                      if (data.receiptUrl) {
                                        window.open(data.receiptUrl, '_blank');
                                        fetchReceipts(); // Refresh to show the new PDF
                                      }
                                    } else {
                                      alert('Failed to generate receipt');
                                    }
                                  } catch (e) {
                                    console.error(e);
                                    alert('Failed to generate receipt');
                                  }
                                }}
                                className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white/60 hover:text-white transition-colors"
                                title="Generate Receipt PDF"
                              >
                                <FileText className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Summary for Receipts */}
          <div className="bg-white/5 backdrop-blur border border-white/10 rounded-lg p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-white">{receipts.length}</p>
                <p className="text-sm text-white/60">Total Receipts</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-emerald-400">AED {formatCurrency(totalReceiptsAmount)}</p>
                <p className="text-sm text-white/60">Total Amount</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-brand">{receiptsWithPdf}</p>
                <p className="text-sm text-white/60">With PDF</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-white/50">{receipts.length - receiptsWithPdf}</p>
                <p className="text-sm text-white/60">No PDF</p>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Account Summary Modal */}
      {showModal && selectedCustomer && (
        <AccountSummaryModal
          isOpen={showModal}
          mode={selectedCustomer.document_type}
          lead={getLeadForModal(selectedCustomer)}
          onClose={handleModalClose}
        />
      )}

      {/* Allocation Modal */}
      {showAllocationModal && selectedReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowAllocationModal(false)} />
          <div className="relative bg-[#111] border border-white/20 rounded-xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="text-xl font-semibold text-white mb-4">Allocate Payment</h3>
            
            {/* Receipt Info */}
            <div className="bg-white/5 rounded-lg p-4 mb-4">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-white/60">Receipt #</span>
                <span className="text-white font-mono">{selectedReceipt.receipt_number || '-'}</span>
              </div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-white/60">Total Amount</span>
                <span className="text-emerald-400 font-semibold">AED {formatCurrency(selectedReceipt.amount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/60">Available to Allocate</span>
                <span className="text-amber-400 font-semibold">AED {formatCurrency(selectedReceipt.unallocated_amount)}</span>
              </div>
            </div>

            {/* Reservation Selection */}
            <div className="mb-4">
              <label className="block text-sm text-white/70 mb-2">Select Reservation</label>
              <select
                value={selectedReservationId}
                onChange={(e) => setSelectedReservationId(e.target.value)}
                className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-brand"
              >
                <option value="">-- Select a reservation --</option>
                {reservationOptions.map((res) => (
                  <option key={res.id} value={res.id}>
                    {res.document_number || 'No Doc #'} - {res.vehicle_make_model} (Balance: AED {formatCurrency(res.balance_due)})
                  </option>
                ))}
              </select>
            </div>

            {/* Allocation Amount */}
            <div className="mb-6">
              <label className="block text-sm text-white/70 mb-2">Amount to Allocate</label>
              <div className="flex items-center gap-2">
                <span className="text-white/60">AED</span>
                <input
                  type="number"
                  value={allocationAmount}
                  onChange={(e) => setAllocationAmount(Math.min(selectedReceipt.unallocated_amount, Math.max(0, Number(e.target.value))))}
                  max={selectedReceipt.unallocated_amount}
                  min={0}
                  className="flex-1 bg-white/5 border border-white/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-brand"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowAllocationModal(false)}
                className="flex-1 px-4 py-3 bg-white/10 hover:bg-white/20 rounded-lg text-white/80 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAllocate}
                disabled={!selectedReservationId || allocationAmount <= 0 || allocating}
                className="flex-1 px-4 py-3 bg-brand hover:bg-brand/80 rounded-lg text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {allocating ? 'Allocating...' : 'Allocate Payment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
