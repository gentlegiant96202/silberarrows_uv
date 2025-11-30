'use client';
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useUserRole } from '@/lib/useUserRole';
import { FileText, Search, Shield, Users, ChevronRight } from 'lucide-react';
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
  invoice_total: number;
  created_at: string;
  // Balance data
  total_charges: number;
  total_paid: number;
  balance_due: number;
}

interface Lead {
  id: string;
  full_name: string;
  phone_number: string;
  model_of_interest: string;
  inventory_car_id?: string;
}

interface FilterState {
  fromDate: string;
  toDate: string;
  search: string;
}

export default function ReservationsInvoicesGrid() {
  const [data, setData] = useState<CustomerAccount[]>([]);
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
    search: ''
  });
  
  // Modal state
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerAccount | null>(null);
  const [showModal, setShowModal] = useState(false);

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
          leadTotals[p.lead_id].paid += p.amount || 0;
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

  useEffect(() => {
    fetchData();
  }, [filters.fromDate, filters.toDate]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
          fetchData();
    }, 300);
    return () => clearTimeout(timer);
  }, [filters.search]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AE', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const handleRowClick = (customer: CustomerAccount) => {
    setSelectedCustomer(customer);
    setShowModal(true);
  };

  const handleModalClose = () => {
    setShowModal(false);
    setSelectedCustomer(null);
    // Refresh data in case changes were made
    fetchData();
  };

  // Create lead object for modal
  const getLeadForModal = (customer: CustomerAccount): Lead => ({
    id: customer.lead_id,
    full_name: customer.customer_name,
    phone_number: customer.contact_no || '',
    model_of_interest: customer.vehicle_make_model || ''
  });

  // Calculate summary stats
  const totalCharges = data.reduce((sum, c) => sum + (c.total_charges || 0), 0);
  const totalPaid = data.reduce((sum, c) => sum + (c.total_paid || 0), 0);
  const totalBalance = data.reduce((sum, c) => sum + (c.balance_due || 0), 0);
  const paidCount = data.filter(c => c.balance_due <= 0 && c.total_charges > 0).length;
  const partialCount = data.filter(c => c.balance_due > 0 && c.total_paid > 0).length;
  const unpaidCount = data.filter(c => c.balance_due > 0 && c.total_paid === 0).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Customer Accounts</h1>
          <p className="text-sm text-white/60">View and manage customer account balances</p>
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
          Total: {data.length} customers
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white/5 backdrop-blur border border-white/10 rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
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

          {/* Search */}
          <div>
            <label className="block text-xs font-medium text-white/70 mb-1">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-white/40" />
              <input
                type="text"
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                placeholder="Customer name, ID, phone..."
                className="w-full h-[42px] pl-10 pr-3 py-2 bg-white/10 border border-white/20 rounded text-white text-sm placeholder-white/40"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
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
                  <th className="px-4 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                    Customer ID
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                    Customer Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                    Vehicle
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-white/70 uppercase tracking-wider">
                    Total Charges
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-white/70 uppercase tracking-wider">
                    Paid
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-white/70 uppercase tracking-wider">
                    Balance
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-white/70 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                    Created
                  </th>
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
                          isPaid
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : isPartial
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            : 'bg-red-500/20 text-red-400 border border-red-500/30'
                        }`}>
                          {isPaid ? 'Paid' : isPartial ? 'Partial' : 'Unpaid'}
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

      {/* Summary */}
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

      {/* Account Summary Modal */}
      {showModal && selectedCustomer && (
        <AccountSummaryModal
          isOpen={showModal}
          mode={selectedCustomer.document_type}
          lead={getLeadForModal(selectedCustomer)}
          onClose={handleModalClose}
        />
      )}
    </div>
  );
}
