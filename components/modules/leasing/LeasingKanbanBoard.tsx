"use client";
import { useState, useEffect, useRef } from 'react';
import { Calendar, FileText, CheckCircle, AlertTriangle, Archive, Filter, X } from 'lucide-react';
import LeasingAppointmentModal from './modals/LeasingAppointmentModal';
import ContractsDraftedModal from './modals/ContractsDraftedModal';
import { useSearchStore } from '@/lib/searchStore';
import { useModulePermissions } from '@/lib/useModulePermissions';
import { useUserRole } from '@/lib/useUserRole';
import { supabase } from '@/lib/supabaseClient';

interface Lease {
  id: string;
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  vehicle_make?: string;
  vehicle_model?: string;
  vehicle_year?: number;
  monthly_payment?: number;
  lease_term_months?: number;
  start_date?: string;
  end_date?: string;
  status: LeaseStatus;
  lease_status?: LeaseStatus; // For database compatibility
  employment_type?: string;
  created_at: string;
  updated_at: string;
  notes?: string;
}

type LeaseStatus = 'appointments' | 'contracts_drafted' | 'active_leases' | 'overdue_ending_soon' | 'closed_returned' | 'archived';

const columns = [
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
  const [selectedLease, setSelectedLease] = useState<Lease | null>(null);
  const [editingLease, setEditingLease] = useState<Lease | null>(null);
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
    appointments: true,
    contracts_drafted: true,
    active_leases: true,
    overdue_ending_soon: true,
    closed_returned: true,
    archived: true
  });
  const [columnData, setColumnData] = useState<Record<ColKey, Lease[]>>({
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
        { key: 'appointments', delay: 0, statusFilter: 'appointments' },
        { key: 'contracts_drafted', delay: 80, statusFilter: 'contracts_drafted' },
        { key: 'active_leases', delay: 160, statusFilter: 'active_leases' },
        { key: 'overdue_ending_soon', delay: 240, statusFilter: 'overdue_ending_soon' },
        { key: 'closed_returned', delay: 320, statusFilter: 'closed_returned' },
        { key: 'archived', delay: 400, statusFilter: 'archived' }
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
            
            setColumnData(prev => ({ ...prev, [key]: data || [] }));
            setColumnLoading(prev => ({ ...prev, [key]: false }));
            
            // Update main leases array
            setLeases(prev => {
              const filtered = prev.filter(l => l.status !== statusFilter);
              return [...filtered, ...(data || [])];
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
            const newCustomer = payload.new;
            setColumnData(prev => ({
              ...prev,
              [newCustomer.lease_status as ColKey]: [...(prev[newCustomer.lease_status as ColKey] || []), newCustomer]
            }));
            setLeases(prev => [...prev, newCustomer]);
          } else if (payload.eventType === 'UPDATE') {
            const updatedCustomer = payload.new;
            const oldCustomer = payload.old;
            
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
            const deletedCustomer = payload.old;
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

  // Mock data for initial implementation (fallback)
  const loadMockData = () => {
    const mockLeases: Lease[] = [
      {
        id: '1',
        customer_name: 'Ahmed Al-Rashid',
        customer_email: 'ahmed@example.com',
        customer_phone: '+971 50 123 4567',
        vehicle_make: 'Mercedes-Benz',
        vehicle_model: 'C-Class',
        vehicle_year: 2024,
        monthly_payment: 2500,
        lease_term_months: 36,
        status: 'appointments',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        notes: 'Initial consultation scheduled'
      },
      {
        id: '2',
        customer_name: 'Sarah Johnson',
        customer_email: 'sarah@example.com',
        customer_phone: '+971 55 987 6543',
        vehicle_make: 'Mercedes-Benz',
        vehicle_model: 'E-Class',
        vehicle_year: 2024,
        monthly_payment: 3200,
        lease_term_months: 24,
        status: 'contracts_drafted',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        notes: 'Contract ready for review'
      },
      {
        id: '3',
        customer_name: 'Mohammed Hassan',
        customer_email: 'mohammed@example.com',
        customer_phone: '+971 52 456 7890',
        vehicle_make: 'Mercedes-Benz',
        vehicle_model: 'GLC',
        vehicle_year: 2023,
        monthly_payment: 2800,
        lease_term_months: 48,
        start_date: '2024-01-15',
        end_date: '2028-01-15',
        status: 'active_leases',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        notes: 'Active lease, payments up to date'
      },
      {
        id: '4',
        customer_name: 'Fatima Al-Zahra',
        customer_email: 'fatima@example.com',
        customer_phone: '+971 56 789 0123',
        vehicle_make: 'Mercedes-Benz',
        vehicle_model: 'A-Class',
        vehicle_year: 2022,
        monthly_payment: 1800,
        lease_term_months: 24,
        start_date: '2022-06-01',
        end_date: '2024-06-01',
        status: 'archived',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        notes: 'Lease completed successfully, vehicle returned'
      }
    ];

    // Simulate loading delay
    setTimeout(() => {
      setLeases(mockLeases);
      
      // Group leases by status
      const grouped = mockLeases.reduce((acc, lease) => {
        if (!acc[lease.status]) acc[lease.status] = [];
        acc[lease.status].push(lease);
        return acc;
      }, {} as Record<ColKey, Lease[]>);

      setColumnData({
        appointments: grouped.appointments || [],
        contracts_drafted: grouped.contracts_drafted || [],
        active_leases: grouped.active_leases || [],
        overdue_ending_soon: grouped.overdue_ending_soon || [],
        closed_returned: grouped.closed_returned || [],
        archived: grouped.archived || []
      });

      setColumnLoading({
        appointments: false,
        contracts_drafted: false,
        active_leases: false,
        overdue_ending_soon: false,
        closed_returned: false,
        archived: false
      });

      setLoading(false);
    }, 1000);
  };

  // Call mock data if no real data loaded
  if (!hasFetchedLeases.current) {
    loadMockData();
  }

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
    if (!customerId) return;
    
    const customerToMove = leases.find(l => l.id === customerId);
    if (!customerToMove) return;
    
    if (customerToMove.status === targetStatus) return;

    try {
      // Update in database
      const { error } = await supabase
        .from('leasing_customers')
        .update({ 
          lease_status: targetStatus as LeaseStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', customerId);

      if (error) {
        console.error('❌ Error updating customer status:', error);
        alert('Failed to update customer status. Please try again.');
        return;
      }

      console.log(`✅ Customer ${customerId} moved to ${targetStatus}`);
      
      // Optimistic update (real-time subscription will also update)
      const updatedCustomer = { ...customerToMove, status: targetStatus as LeaseStatus };
      
      setColumnData(prev => ({
        ...prev,
        [customerToMove.status]: prev[customerToMove.status].filter(l => l.id !== customerId),
        [targetStatus]: [...prev[targetStatus], updatedCustomer]
      }));

      setLeases(prev => prev.map(l => l.id === customerId ? updatedCustomer : l));

    } catch (error) {
      console.error("❌ Exception updating customer:", error);
      alert('Failed to update customer status. Please try again.');
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

  const handleCardClick = (lease: Lease, e: React.MouseEvent) => {
    if (lease.status === 'appointments') {
      // Open appointment modal for editing
      setEditingLease(lease);
      setShowAppointmentModal(true);
    } else if (lease.status === 'contracts_drafted') {
      // Open contracts modal for vehicle selection
      setContractsCustomer(lease);
      setShowContractsModal(true);
    } else {
      // Open general modal for other stages
      setSelectedLease(lease);
      setShowModal(true);
    }
  };

  const handleAppointmentCreated = (newCustomer: any) => {
    // Add new customer to appointments column
    setColumnData(prev => ({
      ...prev,
      appointments: [...prev.appointments, newCustomer]
    }));
    setLeases(prev => [...prev, newCustomer]);
  };

  const handleAppointmentUpdated = (updatedCustomer: any) => {
    // Update customer in appointments column
    setColumnData(prev => ({
      ...prev,
      appointments: prev.appointments.map(lease => 
        lease.id === updatedCustomer.id ? updatedCustomer : lease
      )
    }));
    setLeases(prev => prev.map(lease => 
      lease.id === updatedCustomer.id ? updatedCustomer : lease
    ));
    setEditingLease(null);
  };

  const handleContractCreated = (updatedCustomer: any) => {
    // Move customer from contracts_drafted to active_leases
    setColumnData(prev => ({
      ...prev,
      contracts_drafted: prev.contracts_drafted.filter(lease => 
        lease.id !== updatedCustomer.id
      ),
      active_leases: [...prev.active_leases, updatedCustomer]
    }));
    setLeases(prev => prev.map(lease => 
      lease.id === updatedCustomer.id ? updatedCustomer : lease
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

      // Employment type filter
      if (filters.employmentType.length > 0) {
        if (!customer.employment_type || !filters.employmentType.includes(customer.employment_type)) {
          return false;
        }
      }

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
                {col.key === 'appointments' ? (
                <button
                  onClick={() => setShowAppointmentModal(true)}
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
            <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar">
              {columnLoading[col.key] ? (
                // Show skeleton while column is loading
                <div className="space-y-2">
                  {Array.from({ length: col.key === 'appointments' ? 2 : 1 }).map((_, i) => (
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
                  key={`${lease.id}-${col.key}`}
                  draggable
                  onDragStart={onDragStart(lease)}
                  onDragEnd={onDragEnd}
                  onClick={(e) => handleCardClick(lease, e)}
                  className={`animate-fadeIn ${(()=>{
                    const base = 'backdrop-blur-sm transition-all duration-200 rounded-lg shadow-sm p-1.5 text-xs select-none cursor-pointer group ';
                    
                    // Special styling for appointments column
                    if (col.key === 'appointments') {
                      return base + 'bg-blue-500/10 border-blue-400/20 hover:bg-blue-500/15 hover:border-blue-400/30';
                    }
                    
                    return base + 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20';
                  })()}`}
                >
                  <div className="flex items-start justify-between mb-1">
                    <div className="text-xs font-medium text-white group-hover:text-white/90 transition-colors">
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
                  
                  <div className="space-y-0.5">
                    <div className="text-xs text-white/70 flex items-center gap-1">
                      <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      {highlight(lease.customer_phone || '')}
                      <span className="text-white/50">·</span>
                    </div>
                    
                    <div className="text-xs text-white/70 flex items-center gap-1">
                      <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      {lease.vehicle_year} {lease.vehicle_make} {lease.vehicle_model}
                    </div>
                    
                    <div className="text-xs text-white/70 flex items-center gap-1">
                      <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                      </svg>
                      {formatCurrency(lease.monthly_payment)}/mo
                    </div>
                    
                    {lease.notes && (
                      <div className="text-xs text-white/50 mt-1 italic">
                        {highlight(lease.notes)}
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
        }}
        onCreated={editingLease ? handleAppointmentUpdated : handleAppointmentCreated}
        mode={editingLease ? 'edit' : 'create'}
        existingCustomer={editingLease}
      />

      {/* Contracts Drafted Modal */}
      <ContractsDraftedModal
        isOpen={showContractsModal}
        onClose={() => {
          setShowContractsModal(false);
          setContractsCustomer(null);
        }}
        onUpdated={handleContractCreated}
        customer={contractsCustomer}
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
            
            <div className="mt-6 flex justify-end">
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
    </div>
  );
}