"use client";
import { useState, useEffect, useRef } from 'react';
import { Car, Package, CheckCircle, Wrench, RotateCcw, Archive, Filter, X, LayoutGrid, Table } from 'lucide-react';
import AddVehicleModal from './modals/AddVehicleModal';
import { useSearchStore } from '@/lib/searchStore';
import { useModulePermissions } from '@/lib/useModulePermissions';
import { useUserRole } from '@/lib/useUserRole';
import { supabase } from '@/lib/supabaseClient';

interface LeasingVehicle {
  id: string;
  stock_number: string;
  plate_number?: string;
  vin_number?: string;
  chassis_short?: string;
  engine_number?: string;
  purchase_date?: string;
  make: string;
  model: string;
  model_year: number;
  category?: string;
  body_style?: string;
  exterior_color?: string;
  interior_color?: string;
  engine_type?: string;
  transmission?: string;
  fuel_type?: string;
  current_mileage_km?: number;
  mylocator_mileage?: number;
  excess_mileage_whole_lease?: number;
  excess_mileage_previous_billing?: number;
  monthly_lease_rate?: number;
  security_deposit?: number;
  lease_term_months?: number;
  max_mileage_per_year?: number;
  condition?: string;
  condition_notes?: string;
  first_service_date?: string;
  second_service_date?: string;
  last_service_date?: string;
  next_service_due?: string;
  status: VehicleStatus;
  in_out_status?: string;
  current_customer_name?: string;
  current_customer_id?: string;
  current_parking_location?: string;
  release_date_out?: string;
  expected_return_date?: string;
  in_out_days?: number;
  in_out_months?: number;
  lease_to_own_option?: boolean;
  daily_rate_customer?: number;
  daily_rate_vehicle?: number;
  planned_lease_pricing?: number;
  acquired_cost?: number;
  monthly_depreciation?: number;
  excess_usage_depreciation?: number;
  accumulated_depreciation?: number;
  carrying_value?: number;
  buyout_price?: number;
  current_market_value?: number;
  unrealized_gain_loss?: number;
  warranty_expiry_date?: string;
  registration_date?: string;
  months_registered?: number;
  location?: string;
  parking_spot?: string;
  assigned_to?: string;
  notes?: string;
  remarks?: string;
  created_at: string;
  updated_at: string;
}

type VehicleStatus = 'marketing' | 'reserved' | 'leased' | 'maintenance' | 'returned' | 'archived' | 'available';
type ViewMode = 'kanban' | 'table';

const columns = [
  { 
    key: "marketing", 
    title: "MARKETING", 
    icon: <Package className="w-4 h-4" />
  },
  { 
    key: "reserved", 
    title: "RESERVED", 
    icon: <CheckCircle className="w-4 h-4" />
  },
  { 
    key: "leased", 
    title: "LEASED", 
    icon: <Car className="w-4 h-4" />
  },
  { 
    key: "maintenance", 
    title: "MAINTENANCE", 
    icon: <Wrench className="w-4 h-4" />
  },
  { 
    key: "returned", 
    title: "RETURNED", 
    icon: <RotateCcw className="w-4 h-4" />
  },
  { 
    key: "archived", 
    title: "ARCHIVED", 
    icon: <Archive className="w-4 h-4" />
  },
] as const;

type ColKey = (typeof columns)[number]['key'];

export default function LeasingInventoryBoard() {
  const [vehicles, setVehicles] = useState<LeasingVehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showAddVehicleModal, setShowAddVehicleModal] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<LeasingVehicle | null>(null);
  const [editingVehicle, setEditingVehicle] = useState<LeasingVehicle | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [hovered, setHovered] = useState<ColKey | null>(null);
  
  // Archive state
  const [showArchived, setShowArchived] = useState(false);
  
  // View toggle state
  const [viewMode, setViewMode] = useState<ViewMode>('kanban');
  
  // Filter state (like UV CRM inventory filters)
  const [showFilters, setShowFilters] = useState(false);
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [filters, setFilters] = useState({
    make: [] as string[],
    model: [] as string[],
    year: [] as string[],
    condition: [] as string[],
    location: '' as string
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
    marketing: true,
    reserved: true,
    leased: true,
    maintenance: true,
    returned: true,
    archived: true
  });
  const [columnData, setColumnData] = useState<Record<ColKey, LeasingVehicle[]>>({
    marketing: [],
    reserved: [],
    leased: [],
    maintenance: [],
    returned: [],
    archived: []
  });
  const hasFetchedVehicles = useRef(false);

  // Progressive column loading (like UV CRM)
  useEffect(() => {
    if (!hasFetchedVehicles.current) {
      console.log('🚗 Leasing Inventory: Starting optimistic column loading...');
      
      // Define loading priority (left to right column order)
      const columnPriorities: { key: ColKey; delay: number; statusFilter: string }[] = [
        { key: 'marketing', delay: 0, statusFilter: 'marketing' },
        { key: 'reserved', delay: 80, statusFilter: 'reserved' },
        { key: 'leased', delay: 160, statusFilter: 'leased' },
        { key: 'maintenance', delay: 240, statusFilter: 'maintenance' },
        { key: 'returned', delay: 320, statusFilter: 'returned' },
        { key: 'archived', delay: 400, statusFilter: 'archived' }
      ];

      // Load each column progressively
      columnPriorities.forEach(({ key, delay, statusFilter }) => {
        setTimeout(async () => {
          console.log(`🚗 Loading ${key} column...`);
          
          try {
            const { data, error } = await supabase
              .from('leasing_inventory')
              .select('*')
              .eq('status', statusFilter)
              .order('created_at', { ascending: false });

            if (error) {
              console.error(`❌ Error loading ${key}:`, error);
              setColumnLoading(prev => ({ ...prev, [key]: false }));
              return;
            }

            console.log(`✅ Loaded ${key}: ${data?.length || 0} vehicles`);
            
            setColumnData(prev => ({ ...prev, [key]: data || [] }));
            setColumnLoading(prev => ({ ...prev, [key]: false }));
            
            // Update main vehicles array
            setVehicles(prev => {
              const filtered = prev.filter(v => v.status !== statusFilter);
              return [...filtered, ...(data || [])];
            });

          } catch (error) {
            console.error(`❌ Exception loading ${key}:`, error);
            setColumnLoading(prev => ({ ...prev, [key]: false }));
          }
        }, delay);
      });

      hasFetchedVehicles.current = true;
      setLoading(false);
    }

    // Real-time updates (like UV CRM)
    const inventoryChannel = supabase
      .channel('leasing_inventory_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'leasing_inventory' },
        (payload: any) => {
          console.log('🔄 Leasing inventory change detected:', payload);
          
          if (payload.eventType === 'INSERT') {
            const newVehicle = payload.new;
            setColumnData(prev => ({
              ...prev,
              [newVehicle.status as ColKey]: [...(prev[newVehicle.status as ColKey] || []), newVehicle]
            }));
            setVehicles(prev => [...prev, newVehicle]);
          } else if (payload.eventType === 'UPDATE') {
            const updatedVehicle = payload.new;
            const oldVehicle = payload.old;
            
            // Update in all relevant places
            setColumnData(prev => {
              const newData = { ...prev };
              
              // Remove from old status column
              if (oldVehicle.status !== updatedVehicle.status) {
                newData[oldVehicle.status as ColKey] = (newData[oldVehicle.status as ColKey] || [])
                  .filter((v: any) => v.id !== updatedVehicle.id);
              }
              
              // Add/update in new status column
              const targetColumn = newData[updatedVehicle.status as ColKey] || [];
              const existingIndex = targetColumn.findIndex((v: any) => v.id === updatedVehicle.id);
              
              if (existingIndex >= 0) {
                targetColumn[existingIndex] = updatedVehicle;
              } else {
                targetColumn.push(updatedVehicle);
              }
              
              newData[updatedVehicle.status as ColKey] = targetColumn;
              return newData;
            });
            
            setVehicles(prev => prev.map(v => v.id === updatedVehicle.id ? updatedVehicle : v));
          } else if (payload.eventType === 'DELETE') {
            const deletedVehicle = payload.old;
            setColumnData(prev => ({
              ...prev,
              [deletedVehicle.status as ColKey]: (prev[deletedVehicle.status as ColKey] || [])
                .filter((v: any) => v.id !== deletedVehicle.id)
            }));
            setVehicles(prev => prev.filter(v => v.id !== deletedVehicle.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(inventoryChannel);
      hasFetchedVehicles.current = false;
    };
  }, []);

  const onDragStart = (vehicle: LeasingVehicle) => (e: React.DragEvent) => {
    e.dataTransfer.setData("text/plain", vehicle.id);
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
    
    const vehicleId = e.dataTransfer.getData("text/plain");
    if (!vehicleId) return;
    
    const vehicleToMove = vehicles.find(v => v.id === vehicleId);
    if (!vehicleToMove) return;
    
    if (vehicleToMove.status === targetStatus) return;

    try {
      // Update in database
      const { error } = await supabase
        .from('leasing_inventory')
        .update({ 
          status: targetStatus as VehicleStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', vehicleId);

      if (error) {
        console.error('❌ Error updating vehicle status:', error);
        alert('Failed to update vehicle status. Please try again.');
        return;
      }

      console.log(`✅ Vehicle ${vehicleId} moved to ${targetStatus}`);
      
      // Optimistic update
      const updatedVehicle = { ...vehicleToMove, status: targetStatus as VehicleStatus };
      
      setColumnData(prev => ({
        ...prev,
        [vehicleToMove.status]: prev[vehicleToMove.status].filter(v => v.id !== vehicleId),
        [targetStatus]: [...prev[targetStatus], updatedVehicle]
      }));

      setVehicles(prev => prev.map(v => v.id === vehicleId ? updatedVehicle : v));

    } catch (error) {
      console.error("❌ Exception updating vehicle:", error);
      alert('Failed to update vehicle status. Please try again.');
    }
  };

  // Archive a returned vehicle via click (not drag/drop)
  const archiveVehicle = async (vehicle: LeasingVehicle) => {
    if (vehicle.status === 'archived') return;
    try {
      const { error } = await supabase
        .from('leasing_inventory')
        .update({ 
          status: 'archived' as VehicleStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', vehicle.id);

      if (error) {
        console.error('❌ Error archiving vehicle:', error);
        alert('Failed to archive vehicle. Please try again.');
        return;
      }

      const updatedVehicle = { ...vehicle, status: 'archived' as VehicleStatus };

      setColumnData(prev => ({
        ...prev,
        [vehicle.status]: prev[vehicle.status as ColKey].filter(v => v.id !== vehicle.id),
        archived: [...prev.archived, updatedVehicle]
      }));

      setVehicles(prev => prev.map(v => v.id === vehicle.id ? updatedVehicle : v));
    } catch (err) {
      console.error('❌ Exception archiving vehicle:', err);
      alert('Failed to archive vehicle. Please try again.');
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

  const handleCardClick = (vehicle: LeasingVehicle, e: React.MouseEvent) => {
    // Always open the comprehensive AddVehicleModal for viewing/editing
    setEditingVehicle(vehicle);
    setShowAddVehicleModal(true);
  };

  const handleVehicleCreated = (newVehicle: any) => {
    // Add new vehicle to marketing column
    setColumnData(prev => ({
      ...prev,
      marketing: [...prev.marketing, newVehicle]
    }));
    setVehicles(prev => [...prev, newVehicle]);
  };

  const handleVehicleUpdated = (updatedVehicle: any) => {
    // Update vehicle in all columns (since it could be in any column)
    setColumnData(prev => {
      const newData = { ...prev };
      
      // Find which column the vehicle is currently in and update it
      Object.keys(newData).forEach(columnKey => {
        newData[columnKey as ColKey] = newData[columnKey as ColKey].map(vehicle => 
          vehicle.id === updatedVehicle.id ? updatedVehicle : vehicle
        );
      });
      
      return newData;
    });
    
    setVehicles(prev => prev.map(vehicle => 
      vehicle.id === updatedVehicle.id ? updatedVehicle : vehicle
    ));
    setEditingVehicle(null);
  };

  // Apply search filter (like UV CRM)
  const applySearchFilter = (vehicles: LeasingVehicle[]) => {
    if (!query) return vehicles;
    
    return vehicles.filter(vehicle =>
      match(vehicle.stock_number) ||
      match(vehicle.make) ||
      match(vehicle.model) ||
      match(vehicle.exterior_color) ||
      match(vehicle.location) ||
      match(vehicle.notes)
    );
  };

  // Get all vehicles for table view
  const getAllVehicles = () => {
    const allVehicles = Object.values(columnData).flat();
    return applySearchFilter(allVehicles);
  };

  const renderTableView = () => (
    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-4 h-full overflow-hidden flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-semibold text-white">Vehicle Inventory Table</h3>
          <button
            onClick={() => setShowAddVehicleModal(true)}
            className="px-4 py-2 bg-gradient-to-br from-gray-200 via-gray-100 to-gray-400 text-black font-medium rounded-lg hover:shadow-lg transition-all text-sm"
          >
            + Add Vehicle
          </button>
        </div>
        
        {/* View Toggle - Same position as in kanban */}
        <div className="flex bg-white/10 rounded p-0.5 border border-white/20">
          <button
            onClick={() => setViewMode('kanban')}
            className={
              viewMode === 'kanban'
                ? 'p-1 rounded transition-all bg-gradient-to-br from-gray-200 via-gray-100 to-gray-400 text-black'
                : 'p-1 rounded transition-all text-white/60 hover:text-white hover:bg-white/10'
            }
            title="Kanban view"
          >
            <LayoutGrid className="w-3 h-3" />
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={
              viewMode === 'table'
                ? 'p-1 rounded transition-all bg-gradient-to-br from-gray-200 via-gray-100 to-gray-400 text-black'
                : 'p-1 rounded transition-all text-white/60 hover:text-white hover:bg-white/10'
            }
            title="Table view"
          >
            <Table className="w-3 h-3" />
          </button>
        </div>
      </div>
      
      <div className="flex-1 overflow-auto custom-scrollbar">
        <table className="w-full text-sm text-white">
          <thead className="sticky top-0 bg-black/80 backdrop-blur-sm border-b border-white/20">
            <tr>
              <th className="text-left p-3 font-medium text-white/80">Stock #</th>
              <th className="text-left p-3 font-medium text-white/80">Plate #</th>
              <th className="text-left p-3 font-medium text-white/80">Vehicle</th>
              <th className="text-left p-3 font-medium text-white/80">Customer</th>
              <th className="text-left p-3 font-medium text-white/80">Status</th>
              <th className="text-left p-3 font-medium text-white/80">Location</th>
              <th className="text-left p-3 font-medium text-white/80">Daily Rate</th>
              <th className="text-left p-3 font-medium text-white/80">Mileage</th>
              <th className="text-left p-3 font-medium text-white/80">Market Value</th>
              <th className="text-left p-3 font-medium text-white/80">Actions</th>
            </tr>
          </thead>
          <tbody>
            {getAllVehicles().map((vehicle) => (
              <tr 
                key={vehicle.id}
                className="border-b border-white/10 hover:bg-white/5 transition-colors cursor-pointer"
                onClick={() => handleCardClick(vehicle, {} as any)}
              >
                <td className="p-3 text-white font-medium">{highlight(vehicle.stock_number)}</td>
                <td className="p-3 text-white/70">{vehicle.plate_number || '-'}</td>
                <td className="p-3">
                  <div className="text-white">{vehicle.model_year} {vehicle.make}</div>
                  <div className="text-white/60 text-xs">{highlight(vehicle.model)} • {vehicle.exterior_color}</div>
                </td>
                <td className="p-3 text-white/70">{highlight(vehicle.current_customer_name || '-')}</td>
                <td className="p-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    vehicle.status === 'available' ? 'bg-green-500/20 text-green-300' :
                    vehicle.status === 'reserved' ? 'bg-yellow-500/20 text-yellow-300' :
                    vehicle.status === 'leased' ? 'bg-blue-500/20 text-blue-300' :
                    vehicle.status === 'returned' ? 'bg-orange-500/20 text-orange-300' :
                    vehicle.status === 'maintenance' ? 'bg-red-500/20 text-red-300' :
                    'bg-gray-500/20 text-gray-300'
                  }`}>
                    {vehicle.status.toUpperCase()}
                  </span>
                </td>
                <td className="p-3 text-white/70">{highlight(vehicle.current_parking_location || '-')}</td>
                <td className="p-3 text-white/70">
                  {vehicle.daily_rate_customer ? `AED ${vehicle.daily_rate_customer}` : '-'}
                </td>
                <td className="p-3 text-white/70">
                  {vehicle.current_mileage_km ? `${vehicle.current_mileage_km.toLocaleString()} km` : '-'}
                </td>
                <td className="p-3 text-white/70">
                  {vehicle.current_market_value ? formatCurrency(vehicle.current_market_value) : '-'}
                </td>
                <td className="p-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCardClick(vehicle, e);
                    }}
                    className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white/70 hover:text-white rounded text-xs transition-colors"
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {getAllVehicles().length === 0 && (
          <div className="text-center py-12">
            <div className="text-white/40 text-lg mb-2">No vehicles found</div>
            <p className="text-white/30 text-sm">Add vehicles to see them in the table</p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 top-[72px] px-4" style={{ height: 'calc(100vh - 72px)' }}>
      {/* Render based on view mode */}
      {viewMode === 'table' ? renderTableView() : (
      <div className="flex gap-3 pb-4 w-full h-full overflow-hidden">
        {columns
          .filter(col => showArchived || col.key !== 'archived')
          .map(col => {
          // Apply search filter
          const columnVehicles = columnData[col.key] || [];
          const filteredVehicles = applySearchFilter(columnVehicles);

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
                {col.key === 'marketing' ? (
                  <button
                    onClick={() => setShowAddVehicleModal(true)}
                    className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold transition-colors shadow-sm bg-gradient-to-br from-gray-200 via-gray-400 to-gray-200 text-black hover:brightness-110"
                    title="Add new vehicle to marketing"
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
              
              {/* View Toggle - Only in MARKETING column, positioned on the right */}
              {col.key === 'marketing' && (
                <div className="flex bg-white/10 rounded p-0.5 border border-white/20">
                  <button
                    onClick={() => setViewMode('kanban')}
                    className={`p-1 rounded transition-all ${
                      viewMode === 'kanban'
                        ? 'bg-gradient-to-br from-gray-200 via-gray-100 to-gray-400 text-black'
                        : 'text-white/60 hover:text-white hover:bg-white/10'
                    }`}
                    title="Kanban view"
                  >
                    <LayoutGrid className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => setViewMode('table')}
                    className={
                      viewMode !== 'kanban'
                        ? 'p-1 rounded transition-all bg-gradient-to-br from-gray-200 via-gray-100 to-gray-400 text-black'
                        : 'p-1 rounded transition-all text-white/60 hover:text-white hover:bg-white/10'
                    }
                    title="Table view"
                  >
                    <Table className="w-3 h-3" />
                  </button>
                </div>
              )}
              
              {/* Archive Toggle Button - Only show on RETURNED column */}
              {col.key === 'returned' && (
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
                  title={showArchived ? 'Hide archived vehicles' : 'Show archived vehicles'}
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
                  {Array.from({ length: col.key === 'marketing' ? 3 : 2 }).map((_, i) => (
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
                filteredVehicles.map(vehicle => (
                <div
                  key={`${vehicle.id}-${col.key}`}
                  draggable
                  onDragStart={onDragStart(vehicle)}
                  onDragEnd={onDragEnd}
                  onClick={(e) => handleCardClick(vehicle, e)}
                  className={`animate-fadeIn ${(()=>{
                    const base = 'backdrop-blur-sm transition-all duration-200 rounded-lg shadow-sm p-1.5 text-xs select-none cursor-pointer group ';
                    
                    // Special styling for marketing column
                    if (col.key === 'marketing') {
                      return base + 'bg-green-500/10 border-green-400/20 hover:bg-green-500/15 hover:border-green-400/30';
                    }
                    
                    return base + 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20';
                  })()}`}
                >
                  <div className="flex items-start justify-between mb-1">
                    <div className="text-xs font-medium text-white group-hover:text-white/90 transition-colors">
                      {highlight(vehicle.stock_number)} - {highlight(`${vehicle.model_year} ${vehicle.make} ${vehicle.model}`)}
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {/* Archive Button - For returned vehicles */}
                      {vehicle.status === 'returned' && canEdit && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            archiveVehicle(vehicle);
                          }}
                          className="
                            p-0.5 rounded-full transition-all duration-200 
                            bg-black/50 backdrop-blur-sm text-white/70 hover:text-white hover:bg-gray-700/70
                            hover:shadow-lg hover:scale-110
                            focus:outline-none focus:ring-2 focus:ring-gray-400/50
                          "
                          title="Archive vehicle"
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
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m-9 0h10m-9 0a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V6a2 2 0 00-2-2" />
                      </svg>
                      {highlight(vehicle.exterior_color || 'Color not set')}
                      <span className="text-white/50">·</span>
                    </div>
                    
                    <div className="text-xs text-white/70 flex items-center gap-1">
                      <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                      </svg>
                      {formatCurrency(vehicle.monthly_lease_rate)}/mo
                    </div>
                    
                    <div className="text-xs text-white/70 flex items-center gap-1">
                      <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      </svg>
                      {highlight(vehicle.location || 'Location not set')}
                    </div>
                    
                    {vehicle.current_mileage_km && (
                      <div className="text-xs text-white/60">
                        {vehicle.current_mileage_km.toLocaleString()} km
                      </div>
                    )}
                    
                    {vehicle.notes && (
                      <div className="text-xs text-white/50 mt-1 italic">
                        {highlight(vehicle.notes)}
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
      )}

      {/* Add/Edit Vehicle Modal */}
      <AddVehicleModal
        isOpen={showAddVehicleModal}
        onClose={() => {
          setShowAddVehicleModal(false);
          setEditingVehicle(null);
        }}
        onCreated={editingVehicle ? handleVehicleUpdated : handleVehicleCreated}
        mode={editingVehicle ? 'edit' : 'create'}
        existingVehicle={editingVehicle}
      />

    </div>
  );
}
