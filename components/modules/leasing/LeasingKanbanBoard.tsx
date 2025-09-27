"use client";
import { useState, useEffect, useRef } from 'react';
import { Calendar, FileText, CheckCircle, AlertTriangle, Archive, Filter, X, Users, DollarSign, Receipt } from 'lucide-react';
import LeasingAppointmentModal from './modals/LeasingAppointmentModal';
import LeasingContractModal from './modals/LeasingContractModal';
import { LeaseAccountingDashboard, AccountingButton } from './accounting';
import { useSearchStore } from '@/lib/searchStore';
import { useModulePermissions } from '@/lib/useModulePermissions';
import { useUserRole } from '@/lib/useUserRole';
import { supabase } from '@/lib/supabaseClient';

interface Lease {
  id: string;
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  monthly_payment?: number;
  lease_term_months?: number;
  lease_start_date?: string;
  lease_end_date?: string;
  status: LeaseStatus;
  lease_status?: LeaseStatus; // For database compatibility
  appointment_date?: string;
  appointment_time?: string;
  lease_to_own_option?: boolean;
  buyout_price?: number;
  excess_mileage_charges?: number;
  selected_vehicle_id?: string; // Vehicle linked to this customer
  
  // Vehicle data copied from inventory when selected
  vehicle_model_year?: number;
  vehicle_model?: string;
  vehicle_exterior_colour?: string;
  vehicle_interior_colour?: string;
  vehicle_monthly_lease_rate?: number;
  vehicle_security_deposit?: number;
  vehicle_buyout_price?: number;
  
  created_at: string;
  updated_at: string;
  notes?: string;
}

type LeaseStatus = 'prospects' | 'appointments' | 'contracts_drafted' | 'active_leases' | 'overdue_ending_soon' | 'closed_returned' | 'archived';

const columns = [
  {
    key: "prospects",
    title: "PROSPECTS",
    icon: <Users className="w-4 h-4" />
  },
  {
    key: "appointments",
    title: "APPOINTMENTS",
    icon: <Calendar className="w-4 h-4" />
  },
  { 
    key: "contracts_drafted", 
    title: "CONTRACTS DRAFTED", 
    icon: <FileText className="w-4 h-4" />
  },
  { 
    key: "active_leases", 
    title: "ACTIVE LEASES", 
    icon: <CheckCircle className="w-4 h-4" />
  },
  { 
    key: "overdue_ending_soon", 
    title: "OVERDUE / ENDING SOON", 
    icon: <AlertTriangle className="w-4 h-4" />
  },
  { 
    key: "closed_returned", 
    title: "CLOSED / RETURNED", 
    icon: <Archive className="w-4 h-4" />
  },
  { 
    key: "archived", 
    title: "ARCHIVED", 
    icon: <Archive className="w-4 h-4" />
  },
] as const;

type ColKey = (typeof columns)[number]['key'];

export default function LeasingKanbanBoard() {
  const [leases, setLeases] = useState<Lease[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [showContractsModal, setShowContractsModal] = useState(false);
  const [showAccountingModal, setShowAccountingModal] = useState(false);
  const [accountingCustomer, setAccountingCustomer] = useState<Lease | null>(null);
  const [selectedLease, setSelectedLease] = useState<Lease | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<any>(null);
  const [editingLease, setEditingLease] = useState<Lease | null>(null);
  const [forceShowAppointmentFields, setForceShowAppointmentFields] = useState(false);
  const [modalTargetColumn, setModalTargetColumn] = useState<'prospects' | 'appointments'>('prospects');
  const [contractsCustomer, setContractsCustomer] = useState<Lease | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [hovered, setHovered] = useState<ColKey | null>(null);
  
  // Archive state
  const [showArchived, setShowArchived] = useState(false);
  
  // Filter state (like UV CRM inventory filters)
  const [showFilters, setShowFilters] = useState(false);
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [filters, setFilters] = useState({
    status: [] as string[], // ['appointments', 'contracts_drafted', etc.]
    employmentType: [] as string[], // ['government', 'private', 'self_employed']
    customerName: '' as string
  });
  
  // Permissions and role (like UV CRM)
  const { canEdit } = useModulePermissions('leasing');
  const { isAdmin } = useUserRole();
  
  // Search functionality (like UV CRM)
  const { query } = useSearchStore();
  const upperQuery = query.toUpperCase();
  const match = (text?: string) =>
    query ? String(text || "").toUpperCase().includes(upperQuery) : true;
  const highlight = (text: string): React.ReactNode => {
    if (!query) return text;
    const idx = text.toUpperCase().indexOf(upperQuery);
    if (idx === -1) return text;
    return (
      <span>
        {text.slice(0, idx)}
        <span className="bg-yellow-300 text-black">
          {text.slice(idx, idx + query.length)}
        </span>
        {text.slice(idx + query.length)}
      </span>
    );
  };
  
  // Column-by-column optimistic loading states
  const [columnLoading, setColumnLoading] = useState<Record<ColKey, boolean>>({
    prospects: true,
    appointments: true,
    contracts_drafted: true,
    active_leases: true,
    overdue_ending_soon: true,
    closed_returned: true,
    archived: true
  });
  const [columnData, setColumnData] = useState<Record<ColKey, Lease[]>>({
    prospects: [],
    appointments: [],
    contracts_drafted: [],
    active_leases: [],
    overdue_ending_soon: [],
    closed_returned: [],
    archived: []
  });
  const hasFetchedLeases = useRef(false);

  // Progressive column loading (like UV CRM)
  useEffect(() => {
    if (!hasFetchedLeases.current) {
      console.log('🏢 Leasing: Starting optimistic column loading...');
      
      // Define loading priority (left to right column order)
      const columnPriorities: { key: ColKey; delay: number; statusFilter: string }[] = [
        { key: 'prospects', delay: 0, statusFilter: 'prospects' },
        { key: 'appointments', delay: 80, statusFilter: 'appointments' },
        { key: 'contracts_drafted', delay: 160, statusFilter: 'contracts_drafted' },
        { key: 'active_leases', delay: 240, statusFilter: 'active_leases' },
        { key: 'overdue_ending_soon', delay: 320, statusFilter: 'overdue_ending_soon' },
        { key: 'closed_returned', delay: 400, statusFilter: 'closed_returned' },
        { key: 'archived', delay: 480, statusFilter: 'archived' }
      ];

      // Load each column progressively
      columnPriorities.forEach(({ key, delay, statusFilter }) => {
        setTimeout(async () => {
          console.log(`🏢 Loading ${key} column...`);
          
          try {
            const { data, error } = await supabase
              .from('leasing_customers')
              .select('*')
              .eq('lease_status', statusFilter)
              .order('created_at', { ascending: false });

            if (error) {
              console.error(`❌ Error loading ${key}:`, error);
              setColumnLoading(prev => ({ ...prev, [key]: false }));
              return;
            }

            console.log(`✅ Loaded ${key}: ${data?.length || 0} customers`);
            
            // Normalize data: ensure status field matches lease_status from database
            const normalizedData = (data || []).map(customer => ({
              ...customer,
              status: customer.lease_status || customer.status
            }));
            
            setColumnData(prev => ({ ...prev, [key]: normalizedData }));
            setColumnLoading(prev => ({ ...prev, [key]: false }));
            
            // Update main leases array
            setLeases(prev => {
              const filtered = prev.filter(l => l.status !== statusFilter);
              return [...filtered, ...normalizedData];
            });

          } catch (error) {
            console.error(`❌ Exception loading ${key}:`, error);
            setColumnLoading(prev => ({ ...prev, [key]: false }));
          }
        }, delay);
      });

      hasFetchedLeases.current = true;
      setLoading(false);
    }

    // Real-time updates (like UV CRM)
    const leasingChannel = supabase
      .channel('leasing_customers_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'leasing_customers' },
        (payload: any) => {
          console.log('🔄 Leasing customer change detected:', payload);
          
          if (payload.eventType === 'INSERT') {
            const newCustomer = { ...payload.new, status: payload.new.lease_status || payload.new.status };
            setColumnData(prev => ({
              ...prev,
              [newCustomer.lease_status as ColKey]: [...(prev[newCustomer.lease_status as ColKey] || []), newCustomer]
            }));
            setLeases(prev => [...prev, newCustomer]);
          } else if (payload.eventType === 'UPDATE') {
            const updatedCustomer = { ...payload.new, status: payload.new.lease_status || payload.new.status };
            const oldCustomer = { ...payload.old, status: payload.old.lease_status || payload.old.status };
            
            // Update in all relevant places
            setColumnData(prev => {
              const newData = { ...prev };
              
              // Remove from old status column
              if (oldCustomer.lease_status !== updatedCustomer.lease_status) {
                newData[oldCustomer.lease_status as ColKey] = (newData[oldCustomer.lease_status as ColKey] || [])
                  .filter((c: any) => c.id !== updatedCustomer.id);
              }
              
              // Add/update in new status column
              const targetColumn = newData[updatedCustomer.lease_status as ColKey] || [];
              const existingIndex = targetColumn.findIndex((c: any) => c.id === updatedCustomer.id);
              
              if (existingIndex >= 0) {
                targetColumn[existingIndex] = updatedCustomer;
              } else {
                targetColumn.push(updatedCustomer);
              }
              
              newData[updatedCustomer.lease_status as ColKey] = targetColumn;
              return newData;
            });
            
            setLeases(prev => prev.map(c => c.id === updatedCustomer.id ? updatedCustomer : c));
          } else if (payload.eventType === 'DELETE') {
            const deletedCustomer = { ...payload.old, status: payload.old.lease_status || payload.old.status };
            setColumnData(prev => ({
              ...prev,
              [deletedCustomer.lease_status as ColKey]: (prev[deletedCustomer.lease_status as ColKey] || [])
                .filter((c: any) => c.id !== deletedCustomer.id)
            }));
            setLeases(prev => prev.filter(c => c.id !== deletedCustomer.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(leasingChannel);
      hasFetchedLeases.current = false;
    };
  }, []);


  const onDragStart = (lease: Lease) => (e: React.DragEvent) => {
    e.dataTransfer.setData("text/plain", lease.id);
    setIsDragging(true);
  };

  const onDragEnd = () => {
    setIsDragging(false);
  };


  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const onDrop = (targetStatus: ColKey) => async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    setHovered(null);

    const customerId = e.dataTransfer.getData("text/plain");
    console.log('🗂️ Drop event:', { targetStatus, customerId, availableTypes: e.dataTransfer.types });

    if (!customerId) {
      console.error('❌ No customer ID found in drag data');
      return;
    }

    const customerToMove = leases.find(l => l.id === customerId);
    if (!customerToMove) {
      console.error('❌ Customer not found in leases:', { 
        customerId, 
        availableLeases: leases.length,
        leaseIds: leases.map(l => l.id)
      });
      return;
    }

    console.log('📋 Moving customer:', { 
      customerToMove, 
      targetStatus,
      currentStatus: customerToMove.status,
      currentLeaseStatus: customerToMove.lease_status 
    });

    if (customerToMove.status === targetStatus) {
      console.log('⚠️ Customer already in target column');
      return;
    }

    // Special case: Moving from prospects to appointments should open appointment modal
    if (customerToMove.status === 'prospects' && targetStatus === 'appointments') {
      console.log('📅 Opening appointment modal for prospect → appointment move');
      setEditingLease(customerToMove);
      setForceShowAppointmentFields(true); // Force show appointment fields
      setShowAppointmentModal(true);
      return; // Don't update status yet, let the modal handle it
    }

    // Special case: Moving TO active_leases should auto-open accounting module
    if (targetStatus === 'active_leases') {
      console.log('💰 Auto-opening accounting module for move to active leases');
      
      // First update the status in database
      try {
        const updateData = {
          lease_status: targetStatus as LeaseStatus,
          updated_at: new Date().toISOString()
        };
        
        const { data, error } = await supabase
          .from('leasing_customers')
          .update(updateData)
          .eq('id', customerId)
          .select();

        if (error) {
          console.error('❌ Error updating customer to active lease:', error);
          alert(`Failed to update customer status: ${error.message}`);
          return;
        }

        // Update local state
        const updatedCustomer = { ...customerToMove, status: targetStatus as LeaseStatus, lease_status: targetStatus as LeaseStatus };
        
        setColumnData(prev => {
          // Check if the customer is already in the target column to prevent duplicates
          const isAlreadyInTarget = prev[targetStatus].some(l => l.id === customerId);
          
          return {
            ...prev,
            [customerToMove.status]: prev[customerToMove.status].filter(l => l.id !== customerId),
            [targetStatus]: isAlreadyInTarget 
              ? prev[targetStatus].map(l => l.id === customerId ? updatedCustomer : l)
              : [...prev[targetStatus], updatedCustomer]
          };
        });

        setLeases(prev => prev.map(l => l.id === customerId ? updatedCustomer : l));

        // Auto-open accounting module
        setAccountingCustomer(updatedCustomer);
        setShowAccountingModal(true);
        
        return; // Exit early since we handled everything
        
      } catch (error) {
        console.error('❌ Exception updating to active lease:', error);
        alert('Failed to update customer status.');
        return;
      }
    }

    try {
      // Debug logging
      console.log('🔄 Attempting to move customer:', {
        id: customerId,
        from: customerToMove.status,
        to: targetStatus,
        targetType: typeof targetStatus,
        customerData: {
          name: customerToMove.customer_name,
          phone: customerToMove.customer_phone,
          email: customerToMove.customer_email,
          hasRequiredFields: !!(customerToMove.customer_name && customerToMove.customer_phone)
        }
      });

      // Update in database
      const updateData = {
          lease_status: targetStatus as LeaseStatus,
          updated_at: new Date().toISOString()
      };
      
      console.log('📝 Update payload:', updateData);
      
      const { data, error } = await supabase
        .from('leasing_customers')
        .update(updateData)
        .eq('id', customerId)
        .select();

      if (error) {
        console.error('❌ Error updating customer status:', {
          error: error,
          targetStatus: targetStatus,
          customerId: customerId,
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          fullError: JSON.stringify(error, null, 2)
        });
        alert(`Failed to update customer status: ${error.message || 'Unknown error'}. Code: ${error.code}. Please check console for details.`);
        return;
      }

      console.log('✅ Customer updated successfully:', data);

      
      // Optimistic update (real-time subscription will also update)
      const updatedCustomer = { ...customerToMove, status: targetStatus as LeaseStatus, lease_status: targetStatus as LeaseStatus };

      console.log('🔄 Performing optimistic update:', {
        fromColumn: customerToMove.status,
        toColumn: targetStatus,
        removedFrom: customerToMove.status,
        addedTo: targetStatus
      });

      setColumnData(prev => {
        // Check if the customer is already in the target column to prevent duplicates
        const isAlreadyInTarget = prev[targetStatus].some(l => l.id === customerId);
        
        const newData = {
          ...prev,
          [customerToMove.status]: prev[customerToMove.status].filter(l => l.id !== customerId),
          [targetStatus]: isAlreadyInTarget 
            ? prev[targetStatus].map(l => l.id === customerId ? updatedCustomer : l)
            : [...prev[targetStatus], updatedCustomer]
        };

        console.log('📊 Column data updated:', {
          fromColumnCount: prev[customerToMove.status]?.length || 0,
          toColumnCount: newData[targetStatus]?.length || 0
        });

        return newData;
      });

      setLeases(prev => prev.map(l => l.id === customerId ? updatedCustomer : l));

    } catch (error) {
      console.error("❌ Exception updating customer:", {
        error: error,
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      alert('Failed to update customer status. Please check console for details.');
    }
  };

  const formatCurrency = (amount?: number) => {
    if (!amount) return "Not set";
    return `AED ${amount.toLocaleString()}`;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Not set";
    return new Date(dateString).toLocaleDateString('en-GB');
  };

  const handleCardClick = async (lease: Lease, e: React.MouseEvent) => {
    console.log('🎯 Card clicked - Customer data:', {
      lease,
      customerName: lease.customer_name,
      customerEmail: lease.customer_email,
      customerPhone: lease.customer_phone,
      appointmentDate: lease.appointment_date,
      appointmentTime: lease.appointment_time,
      notes: lease.notes,
      status: lease.status
    });
    
    if (lease.status === 'prospects') {
      // Open appointment modal for editing prospects
      setModalTargetColumn('prospects');
      setEditingLease(lease);
      setForceShowAppointmentFields(false); // Reset force flag for prospect editing
      setShowAppointmentModal(true);
    } else if (lease.status === 'appointments') {
      // Open appointment modal for editing
      setModalTargetColumn('appointments');
      setEditingLease(lease);
      setForceShowAppointmentFields(false); // Reset force flag for appointment editing
      setShowAppointmentModal(true);
    } else if (lease.status === 'contracts_drafted') {
      // Open contracts modal for vehicle selection
      setContractsCustomer(lease);
      setShowContractsModal(true);
    } else if (lease.status === 'active_leases') {
      // Open accounting module for active leases
      console.log('💰 Opening accounting module for active lease click');
      setAccountingCustomer(lease);
      setShowAccountingModal(true);
    } else {
      // Open general modal for other stages
      setSelectedLease(lease);
      setShowModal(true);
    }
  };

  const handleAppointmentCreated = (newCustomer: any) => {
    // Normalize customer data and add to appropriate column
    const normalizedCustomer = { ...newCustomer, status: newCustomer.lease_status || newCustomer.status };
    const targetColumn = (normalizedCustomer.lease_status || 'prospects') as ColKey;
    setColumnData(prev => ({
      ...prev,
      [targetColumn]: [...prev[targetColumn], normalizedCustomer]
    }));
    setLeases(prev => [...prev, normalizedCustomer]);
  };

  const handleAppointmentUpdated = (updatedCustomer: any) => {
    // Normalize customer data and update in appropriate column
    const normalizedCustomer = { ...updatedCustomer, status: updatedCustomer.lease_status || updatedCustomer.status };
    const targetColumn = normalizedCustomer.lease_status || normalizedCustomer.status;
    setColumnData(prev => {
      const newData = { ...prev };
      
      // Remove from all columns first (in case status changed)
      Object.keys(newData).forEach(column => {
        newData[column as ColKey] = newData[column as ColKey].filter(lease => 
          lease.id !== normalizedCustomer.id
        );
      });
      
      // Add to target column
      newData[targetColumn as ColKey] = [...newData[targetColumn as ColKey], normalizedCustomer];
      
      return newData;
    });
    setLeases(prev => prev.map(lease => 
      lease.id === normalizedCustomer.id ? normalizedCustomer : lease
    ));
    setEditingLease(null);
  };

  const handleContractCreated = (updatedCustomer: any) => {
    console.log('📋 Contract created/updated:', updatedCustomer);
    
    // Normalize the customer data to ensure status consistency
    const normalizedCustomer = {
      ...updatedCustomer,
      status: updatedCustomer.lease_status || updatedCustomer.status || 'contracts_drafted'
    };

    console.log('📊 Normalized customer status:', normalizedCustomer.status);

    if (normalizedCustomer.status === 'contracts_drafted') {
      // Update or add to contracts_drafted column
      setColumnData(prev => {
        const existingIndex = prev.contracts_drafted.findIndex(lease => lease.id === normalizedCustomer.id);
        
        if (existingIndex >= 0) {
          // Update existing customer in contracts_drafted
          const updatedContracts = [...prev.contracts_drafted];
          updatedContracts[existingIndex] = normalizedCustomer;
          return {
      ...prev,
            contracts_drafted: updatedContracts
          };
        } else {
          // Add new customer to contracts_drafted (remove from other columns if exists)
          return {
            ...prev,
            prospects: prev.prospects.filter(lease => lease.id !== normalizedCustomer.id),
            appointments: prev.appointments.filter(lease => lease.id !== normalizedCustomer.id),
            contracts_drafted: [...prev.contracts_drafted, normalizedCustomer],
            active_leases: prev.active_leases.filter(lease => lease.id !== normalizedCustomer.id),
            overdue_ending_soon: prev.overdue_ending_soon.filter(lease => lease.id !== normalizedCustomer.id),
            closed_returned: prev.closed_returned.filter(lease => lease.id !== normalizedCustomer.id)
          };
        }
      });
    } else {
      // Handle other statuses if needed
      console.log('⚠️ Unexpected status for contract creation:', normalizedCustomer.status);
    }

    // Update the main leases array
    setLeases(prev => prev.map(lease => 
      lease.id === normalizedCustomer.id ? normalizedCustomer : lease
    ));
    setContractsCustomer(null);
  };

  // Filter helper functions (like UV CRM)
  const getActiveFilterCount = () => {
    return filters.status.length + filters.employmentType.length + (filters.customerName ? 1 : 0);
  };

  const applyFilters = (customers: Lease[]) => {
    return customers.filter(customer => {
      // Status filter
      if (filters.status.length > 0) {
        if (!filters.status.includes(customer.status)) {
          return false;
        }
      }

      // Employment type filter - removed as field no longer exists
      // if (filters.employmentType.length > 0) {
      //   if (!customer.employment_type || !filters.employmentType.includes(customer.employment_type)) {
      //     return false;
      //   }
      // }

      // Customer name filter
      if (filters.customerName && filters.customerName !== '') {
        if (!customer.customer_name.toLowerCase().includes(filters.customerName.toLowerCase())) {
          return false;
        }
      }

      return true;
    });
  };

  // Apply search filter (like UV CRM)
  const applySearchFilter = (customers: Lease[]) => {
    if (!query) return customers;
    
    return customers.filter(customer =>
      match(customer.customer_name) ||
      match(customer.customer_email) ||
      match(customer.customer_phone) ||
      match(customer.notes)
    );
  };

  return (
    <div className="fixed inset-0 top-[72px] px-4" style={{ height: 'calc(100vh - 72px)' }}>
      <div className="flex gap-3 pb-4 w-full h-full overflow-hidden">
        {columns
          .filter(col => showArchived || col.key !== 'archived')
          .map(col => {
          // Apply search filter
          const columnCustomers = columnData[col.key] || [];
          const filteredCustomers = applySearchFilter(columnCustomers);

          return (
            <div
              key={col.key}
              className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-3 flex flex-col flex-1 min-w-0 transition-all duration-300"
              onDragOver={onDragOver}
              onDrop={onDrop(col.key)}
            >
            <div className="mb-3 px-1 flex items-center justify-between relative sticky top-0 z-10 bg-black/50 backdrop-blur-sm pb-2 pt-1">
              <div className="flex items-center gap-2">
                {col.icon}
                <h3 className="text-xs font-medium text-white whitespace-nowrap">
                  {col.title}
                </h3>
                {col.key === 'prospects' ? (
                <button
                  onClick={() => {
                    setModalTargetColumn('prospects');
                    setShowAppointmentModal(true);
                  }}
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold transition-colors shadow-sm bg-gradient-to-br from-gray-200 via-gray-100 to-gray-400 text-black hover:brightness-110"
                  title="Add new prospect"
                >
                  {columnData[col.key].length}
                  <span className="ml-1 text-[12px] leading-none">＋</span>
                </button>
                ) : col.key === 'appointments' ? (
                <button
                  onClick={() => {
                    setModalTargetColumn('appointments');
                    setShowAppointmentModal(true);
                  }}
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold transition-colors shadow-sm bg-gradient-to-br from-gray-200 via-gray-400 to-gray-200 text-black hover:brightness-110"
                  title="Add new appointment"
                >
                  {columnData[col.key].length}
                  <span className="ml-1 text-[12px] leading-none">＋</span>
                </button>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-white/10 text-white/70 text-[10px] font-medium">
                    {columnLoading[col.key] ? '--' : columnData[col.key].length}
                  </span>
              )}
              </div>
              
              {/* Archive Toggle Button - Only show on CLOSED / RETURNED column */}
              {col.key === 'closed_returned' && (
                <button
                  onClick={() => setShowArchived(!showArchived)}
                  className={`
                    inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[8px] font-medium transition-all duration-200
                    ${showArchived 
                      ? 'bg-gray-600 text-white shadow-lg' 
                      : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white'
                    }
                    backdrop-blur-sm border border-white/20 hover:border-white/30
                  `}
                  title={showArchived ? 'Hide archived leases' : 'Show archived leases'}
                >
                  <Archive className="w-2.5 h-2.5" />
                  {showArchived ? 'Hide' : 'Show'} Archive
                </button>
              )}
            </div>
            <div className="flex-1 overflow-y-auto space-y-1.5 custom-scrollbar">
              {columnLoading[col.key] ? (
                // Show skeleton while column is loading
                <div className="space-y-2">
                  {Array.from({ length: col.key === 'prospects' || col.key === 'appointments' ? 2 : 1 }).map((_, i) => (
                    <div key={i} className="backdrop-blur-sm transition-all duration-200 rounded-lg shadow-sm p-1.5 text-xs bg-white/5 border border-white/10 animate-pulse">
                      <div className="flex items-start justify-between mb-1">
                        <div className="h-3 bg-white/10 rounded w-3/4"></div>
                        <div className="w-2.5 h-2.5 bg-white/10 rounded"></div>
                      </div>
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1">
                          <div className="w-2.5 h-2.5 bg-white/10 rounded"></div>
                          <div className="h-2 bg-white/10 rounded w-1/2"></div>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-2.5 h-2.5 bg-white/10 rounded"></div>
                          <div className="h-2 bg-white/10 rounded w-2/3"></div>
                        </div>
                        <div className="h-2 bg-white/10 rounded w-1/4 mt-1"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                // Show filtered data
                filteredCustomers.map(lease => (
                <div
                  key={`${lease.id}-${col.key}-${lease.updated_at || lease.created_at}`}
                  draggable
                  onDragStart={onDragStart(lease)}
                  onDragEnd={onDragEnd}
                  onClick={(e) => handleCardClick(lease, e)}
                  className={`animate-fadeIn ${(()=>{
                    const base = 'backdrop-blur-sm transition-all duration-200 rounded-lg shadow-sm text-xs select-none cursor-pointer group ';
                    
                    // Compact padding for prospects and appointments
                    const padding = (col.key === 'prospects' || col.key === 'appointments') ? 'p-2' : 'p-1.5';
                    
                    // Special styling for prospects and appointments columns
                    if (col.key === 'prospects') {
                      return base + padding + ' bg-green-500/10 border-green-400/20 hover:bg-green-500/15 hover:border-green-400/30';
                    }

                    if (col.key === 'appointments') {
                      return base + padding + ' bg-blue-500/10 border-blue-400/20 hover:bg-blue-500/15 hover:border-blue-400/30';
                    }
                    
                    return base + 'p-1.5 bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20';
                  })()}`}
                >
                  <div className="flex items-start justify-between mb-1.5">
                    <div className="text-sm font-medium text-white group-hover:text-white/90 transition-colors leading-tight">
                      {highlight(lease.customer_name)}
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {/* Archive Button - For closed/returned leases */}
                      {lease.status === 'closed_returned' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation(); // Prevent card click
                            // Handle archive action here
                            const updatedLease = { ...lease, status: 'archived' as LeaseStatus };
                            setColumnData(prev => ({
                              ...prev,
                              [lease.status]: prev[lease.status].filter(l => l.id !== lease.id),
                              archived: [...prev.archived, updatedLease]
                            }));
                            setLeases(prev => prev.map(l => l.id === lease.id ? updatedLease : l));
                          }}
                          className="
                            p-0.5 rounded-full transition-all duration-200 
                            bg-black/50 backdrop-blur-sm text-white/70 hover:text-white hover:bg-gray-700/70
                            hover:shadow-lg hover:scale-110
                            focus:outline-none focus:ring-2 focus:ring-gray-400/50
                          "
                          title="Archive lease"
                        >
                          <Archive className="w-2.5 h-2.5" />
                        </button>
                      )}
                      <svg className="w-2.5 h-2.5 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    {lease.customer_phone && (
                      <div className="text-xs text-white/70 flex items-center gap-1.5 leading-tight">
                        <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                        <span className="truncate">{highlight(lease.customer_phone)}</span>
                    </div>
                    )}
                    
                    {(lease.vehicle_model_year || lease.vehicle_model || lease.selected_vehicle_id) && (
                      <div className="text-xs text-white/70 flex items-center gap-1.5 leading-tight">
                        <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                        <span className="truncate">
                          {lease.vehicle_model_year && lease.vehicle_model ? 
                            `${lease.vehicle_model_year} ${lease.vehicle_model}` : 
                            'Vehicle Selected'
                          }
                        </span>
                    </div>
                    )}
                    
                    {lease.monthly_payment && (
                      <div className="text-xs text-white/70 flex items-center gap-1.5 leading-tight">
                        <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                      </svg>
                        <span>{formatCurrency(lease.monthly_payment)}/mo</span>
                    </div>
                    )}
                    
                    {lease.notes && (
                      <div className="text-xs text-white/50 italic leading-tight line-clamp-2">
                        {highlight(lease.notes)}
                      </div>
                    )}

                    {/* Accounting Button for Active Leases */}
                    {lease.status === 'active_leases' && (
                      <div className="mt-2 pt-2 border-t border-white/10">
                        <AccountingButton
                          leaseId={lease.id}
                          leaseStartDate={lease.lease_start_date || lease.created_at}
                          customerName={lease.customer_name}
                          className="w-full text-xs py-1.5"
                        />
                      </div>
                    )}
                    
                  </div>
                </div>
                ))
              )}
            </div>
          </div>
          );
        })}
      </div>

      {/* Appointment Modal */}
      <LeasingAppointmentModal
        isOpen={showAppointmentModal}
        onClose={() => {
          setShowAppointmentModal(false);
          setEditingLease(null);
          setForceShowAppointmentFields(false); // Reset force flag
        }}
        onCreated={editingLease ? handleAppointmentUpdated : handleAppointmentCreated}
        mode={editingLease ? 'edit' : 'create'}
        existingCustomer={editingLease}
        forceShowAppointmentFields={forceShowAppointmentFields}
        targetColumn={modalTargetColumn}
      />

      {/* Contracts Drafted Modal */}
      <LeasingContractModal
        isOpen={showContractsModal}
        onClose={() => {
          setShowContractsModal(false);
          setContractsCustomer(null);
        }}
        onCreated={handleContractCreated}
        mode={contractsCustomer ? 'edit' : 'create'}
        existingCustomer={contractsCustomer}
      />


      {/* General Modal for other stages - placeholder */}
      {showModal && selectedLease && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-gray-900 via-black to-gray-900 border border-white/20 rounded-xl p-6 max-w-md w-full">
            <h3 className="text-white font-semibold text-lg mb-4">
              {selectedLease.customer_name}
            </h3>
            <div className="space-y-2 text-sm">
              <div className="text-white/70">
                <strong>Status:</strong> {selectedLease.status.replace('_', ' ').toUpperCase()}
              </div>
              {selectedLease.customer_phone && (
                <div className="text-white/70">
                  <strong>Phone:</strong> {selectedLease.customer_phone}
                </div>
              )}
              {selectedLease.customer_email && (
                <div className="text-white/70">
                  <strong>Email:</strong> {selectedLease.customer_email}
                </div>
              )}
              {selectedLease.notes && (
                <div className="text-white/70">
                  <strong>Notes:</strong> {selectedLease.notes}
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-gradient-to-br from-gray-200 via-gray-100 to-gray-400 text-black rounded-lg font-medium text-sm hover:shadow-lg transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Accounting Modal for Active Leases */}
      {showAccountingModal && accountingCustomer && (
        <LeaseAccountingDashboard
          leaseId={accountingCustomer.id}
          leaseStartDate={accountingCustomer.lease_start_date || accountingCustomer.created_at}
          customerName={accountingCustomer.customer_name}
          onClose={() => {
            setShowAccountingModal(false);
            setAccountingCustomer(null);
          }}
        />
      )}
    </div>
  );
}