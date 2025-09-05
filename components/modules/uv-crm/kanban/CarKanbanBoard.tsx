"use client";
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import AddCarModal from '@/components/modules/uv-crm/modals/AddCarModal';
import CarDetailsModal, { type CarInfo } from '@/components/modules/uv-crm/modals/CarDetailsModal';
import PriceDropModal from '@/components/modules/uv-crm/modals/PriceDropModal';
import { useAuth } from '@/components/shared/AuthProvider';
import { useSearchStore } from '@/lib/searchStore';
import { useUserRole } from '@/lib/useUserRole'; // 🆕 NEW ROLE SYSTEM
import { useModulePermissions } from '@/lib/useModulePermissions';
import { Check, Tag, Archive } from 'lucide-react';

// Skeleton Components
const SkeletonCarCard = ({ isExpanded = false }: { isExpanded?: boolean }) => {
  if (isExpanded) {
    // Grid layout skeleton (expanded inventory view)
    return (
      <div className="bg-white/5 border border-white/10 backdrop-blur-sm rounded-lg shadow-sm p-3 text-xs animate-pulse">
        {/* Thumbnail skeleton */}
        <div className="w-full h-36 bg-white/10 rounded mb-3"></div>
        <div className="space-y-2">
          {/* Stock number */}
          <div className="h-3 bg-white/10 rounded w-3/4"></div>
          {/* Model year + model */}
          <div className="h-2 bg-white/10 rounded w-full"></div>
          <div className="h-2 bg-white/10 rounded w-2/3"></div>
          {/* Price */}
          <div className="h-2 bg-white/10 rounded w-1/2"></div>
          {/* Button */}
          <div className="h-6 bg-white/10 rounded w-full mt-2"></div>
        </div>
      </div>
    );
  }

  // Normal vertical list layout skeleton
  return (
    <div className="w-full bg-white/5 border border-white/10 backdrop-blur-sm rounded-lg shadow-sm p-1.5 text-xs animate-pulse">
      <div className="flex items-center gap-2 min-w-0">
        {/* Thumbnail skeleton */}
        <div className="w-16 h-12 bg-white/10 flex-shrink-0 rounded"></div>
        <div className="min-w-0 flex-1">
          {/* Stock number */}
          <div className="h-3 bg-white/10 rounded w-2/3 mb-1"></div>
          {/* Model info */}
          <div className="h-2 bg-white/10 rounded w-full mb-1"></div>
          {/* Price */}
          <div className="h-2 bg-white/10 rounded w-1/2"></div>
        </div>
      </div>
    </div>
  );
};

const SkeletonColumn = ({ title, isInventory = false, isExpanded = false }: { 
  title: string; 
  isInventory?: boolean; 
  isExpanded?: boolean; 
}) => (
  <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-3 flex flex-col flex-1 min-w-0">
    <div className="mb-3 px-1">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1">
          <h3 className="text-xs font-medium text-white">{title}</h3>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-white/10 text-white/70 text-[10px] font-medium animate-pulse">
            --
          </span>
        </div>
        {isInventory ? (
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 bg-white/10 rounded animate-pulse"></div>
            <div className="h-4 w-4 bg-white/10 rounded animate-pulse"></div>
          </div>
        ) : (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-white/10 text-white/70 text-[10px] font-medium">0</span>
        )}
      </div>
      
      {isInventory && (
        <div className="space-y-2">
          <div className="h-4 bg-white/10 rounded w-20 animate-pulse"></div>
          <div className="h-6 bg-white/10 rounded w-full animate-pulse"></div>
        </div>
      )}
    </div>
    
    <div className="flex-1 overflow-y-auto space-y-2">
      {isExpanded && isInventory ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <SkeletonCarCard key={i} isExpanded={true} />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCarCard key={i} isExpanded={false} />
          ))}
        </div>
      )}
    </div>
  </div>
);

interface Car {
  id: string;
  stock_number: string;
  model_year: number;
  vehicle_model: string;
  colour: string;
  advertised_price_aed: number;
  status: string;
  sale_status: string;
  stock_age_days: number | null;
  ownership_type: string;
  customer_name?: string | null;
  customer_email?: string | null;
  customer_phone?: string | null;
  vehicle_details_pdf_url?: string | null;
  archived_at?: string | null; // When the car was archived
  // Vehicle history disclosure fields
  customer_disclosed_accident?: boolean | null;
  customer_disclosed_flood_damage?: boolean | null;
  damage_disclosure_details?: string | null;
}

export default function CarKanbanBoard() {
  const [cars, setCars] = useState<Car[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selected, setSelected] = useState<Car | null>(null);
  const [selectedCarFull, setSelectedCarFull] = useState<CarInfo | null>(null);
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const hasFetchedCars = useRef(false);
  
  // Progressive loading state for fade-in animation
  const [columnsVisible, setColumnsVisible] = useState(false);
  
  // Inventory filter state
  const [showInventoryFilters, setShowInventoryFilters] = useState(false);
  const [inventoryExpanded, setInventoryExpanded] = useState(false);
  const [inventoryFilters, setInventoryFilters] = useState({
    ownership: [] as string[], // ['stock', 'consignment']
    stockAge: [] as string[], // ['fresh', 'aging', 'old']
    model: '' as string
  });

  // Price Drop modal state
  const [showPriceDropModal, setShowPriceDropModal] = useState(false);
  const [selectedCarForPriceDrop, setSelectedCarForPriceDrop] = useState<Car | null>(null);

  // Archive state
  const [showArchived, setShowArchived] = useState(false);

  const columns = [
    { key: 'marketing',   title: 'QC CHECK CEO' },
    { key: 'qc_ceo',      title: 'MARKETING' },
    { key: 'inventory',   title: 'INVENTORY' },
    { key: 'reserved',    title: 'RESERVED' },
    { key: 'sold',        title: 'SOLD' },
    { key: 'returned',    title: 'RETURNED' },
    { key: 'archived',    title: 'ARCHIVED' },
  ] as const;

  type ColKey = (typeof columns)[number]['key'];

  // Use new role system
  const { user } = useAuth();
  const { isAdmin } = useUserRole();
  const { canEdit: canEditCars, canCreate: canCreateCars } = useModulePermissions('inventory');
  

  const load = async () => {
    try {
      console.log('🚗 CarKanbanBoard: Loading cars with proper permissions...');
      const { data } = await supabase
        .from('cars')
        .select('*')
        .order('updated_at', { ascending: false });
      const carRows = (data as any[] || []) as Car[];
      setCars(carRows);

      // fetch primary thumbnails for these cars
      const ids = carRows.map(c=>c.id);
      if(ids.length){
        const { data: mediaRows } = await supabase
          .from('car_media')
          .select('car_id,url')
          .eq('is_primary', true)
          .eq('kind', 'photo')
          .in('car_id', ids);
        const map: Record<string,string> = {};
        (mediaRows||[]).forEach((m:any)=>{ 
          // Use storage proxy for images
          let imageUrl = m.url;
          if (imageUrl && imageUrl.includes('.supabase.co/storage/')) {
            imageUrl = `/api/storage-proxy?url=${encodeURIComponent(m.url)}`;
          }
          map[m.car_id] = imageUrl; 
        });
        console.log('🖼️ CarKanbanBoard: Loaded', mediaRows?.length || 0, 'primary thumbnails');
        setThumbs(map);
      }
    } finally {
      setLoading(false);
    }
  };

  // drag helpers
  const onDragStart = (car: Car) => (e: React.DragEvent) => {
    // Only users with edit permission can drag cars
    if (!canEditCars) {
      e.preventDefault();
      if (process.env.NODE_ENV === 'development') {
        console.log('🚫 Drag prevented - no edit permission for UV CRM');
      }
      return;
    }
    if (process.env.NODE_ENV === 'development') {
      console.log('✅ Drag allowed - user has edit permission');
    }
    e.dataTransfer.setData('text/plain', car.id);
  };

  const onDrop = (col: ColKey) => async (e: React.DragEvent) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain');
    if (!id) return;

    // Permission checks for users without edit access
    if (!canEditCars) {
      if (process.env.NODE_ENV === 'development') {
        console.log('🚫 Drop prevented - no edit permission for UV CRM');
      }
      return; // users without edit permission cannot drop
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.log('✅ Drop allowed - user has edit permission');
    }

    // optimistic update
    setCars(prev => {
      const idx = prev.findIndex(c => c.id === id);
      if (idx === -1) return prev;

      let moved: Car = { ...prev[idx] } as Car;
      if (col === 'qc_ceo') {
        moved.status = 'qc_ceo';
      } else if (col === 'reserved') {
        moved.sale_status = 'reserved';
        moved.status = 'inventory';
      } else if (col === 'sold' || col === 'returned') {
        moved.sale_status = col as any;
        moved.status = 'inventory';
      } else if (col === 'archived') {
        moved.sale_status = 'archived';
        moved.status = 'inventory';
      } else {
        moved.status = col;
        moved.sale_status = 'available';
      }
      const rest = prev.filter(c => c.id !== id);
      return [moved, ...rest];
    });

    if (col === 'qc_ceo') {
      await supabase.from('cars').update({ status: 'qc_ceo' }).eq('id', id);
    } else if (col === 'reserved') {
      await supabase.from('cars').update({ sale_status: 'reserved', status: 'inventory' }).eq('id', id);
    } else if (col === 'sold' || col === 'returned') {
      await supabase.from('cars').update({ sale_status: col, status: 'inventory' }).eq('id', id);
    } else if (col === 'archived') {
      await supabase.from('cars').update({ 
        sale_status: 'archived', 
        status: 'inventory',
        archived_at: new Date().toISOString()
      }).eq('id', id);
    } else {
      await supabase.from('cars').update({ status: col, sale_status: 'available' }).eq('id', id);
    }

    // reload cars to refresh thumbnails
    load();
  };

  // Archive car function
  const handleArchiveCar = async (carId: string) => {
    try {
      const { error } = await supabase.from('cars').update({
        sale_status: 'archived',
        archived_at: new Date().toISOString(),
        // Keep status as 'inventory' since archived cars are still inventory items
        status: 'inventory'
      }).eq('id', carId);
      
      if (error) {
        console.error("❌ Failed to archive car:", error);
      } else {
        console.log("✅ Car archived successfully:", carId);
        // Reload cars to refresh the display
        load();
      }
    } catch (error) {
      console.error("❌ Error archiving car:", error);
    }
  };

  const onDragOver = (e: React.DragEvent) => e.preventDefault();

  const cleanModel = (model:string) => model.replace(/^(MERCEDES[\s-]*BENZ\s+)/i, '');

  useEffect(() => {
    if (!hasFetchedCars.current) {
      async function loadWithFadeIn() {
        await load();
        // Trigger fade-in animation immediately after data loads
        // RouteProtector handles the main transition timing
        setColumnsVisible(true);
        console.log('✅ Inventory: Cars loaded, columns visible');
      }
      loadWithFadeIn();
      hasFetchedCars.current = true;
    }

    const carsChannel = supabase
      .channel('cars-stream')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cars' },
        (payload: any) => {
          setCars(prev => {
            if (payload.eventType === 'INSERT') {
              const exists = prev.some(c => c.id === payload.new.id);
              return exists ? prev : [payload.new as Car, ...prev];
            }
            if (payload.eventType === 'UPDATE') {
              return prev.map(c => c.id === payload.new.id ? (payload.new as Car) : c);
            }
            if (payload.eventType === 'DELETE') {
              return prev.filter(c => c.id !== payload.old.id);
            }
            return prev;
          });
        }
      )
      .subscribe();

    // Listen for custom primary photo change events
    const handlePrimaryPhotoChange = (event: any) => {
      console.log('🔄 CarKanbanBoard: Primary photo changed event received, reloading thumbnails...', event.detail);
      
      // Use a ref to track if component is still mounted
      if (hasFetchedCars.current) {
        // Debounce the reload to prevent multiple rapid calls
        setTimeout(() => {
          if (hasFetchedCars.current) { // Check again after timeout
            console.log('🔄 CarKanbanBoard: Force reloading after primary photo change...');
            load();
          }
        }, 100);
      }
    };
    
    window.addEventListener('primaryPhotoChanged', handlePrimaryPhotoChange);

    return () => { 
      supabase.removeChannel(carsChannel);
      window.removeEventListener('primaryPhotoChanged', handlePrimaryPhotoChange);
      hasFetchedCars.current = false; // Mark component as unmounted
    };
  }, []);

  const { query } = useSearchStore();
  const match = (text:string)=> query? text.toUpperCase().includes(query): true;
  const highlight = (text:string)=>{
    if(!query) return text;
    const idx = text.toUpperCase().indexOf(query);
    if(idx===-1) return text;
    return (
      <span>
        {text.slice(0,idx)}<span className="bg-yellow-300 text-black">{text.slice(idx,idx+query.length)}</span>{text.slice(idx+query.length)}
      </span>
    );
  };

  const getStockAgeColor = (stockAgeDays: number | null) => {
    if (stockAgeDays === null) return '';
    if (stockAgeDays >= 90) return 'border-red-500/50 bg-red-500/10';
    if (stockAgeDays >= 60) return 'border-orange-500/50 bg-orange-500/10';
    return '';
  };

  const loadFullCarData = async (carId: string) => {
    try {
      const { data, error } = await supabase
        .from('cars')
        .select('*')
        .eq('id', carId)
        .single();
      
      if (error) {
        console.error('❌ Error loading full car data:', error);
        return null;
      }
      
      console.log('✅ Loaded full car data for:', carId, 'Fields:', Object.keys(data || {}));
      return data;
    } catch (error) {
      console.error('❌ Exception loading full car data:', error);
      return null;
    }
  };

  // Filter helper functions
  const getStockAgeCategory = (stockAgeDays: number | null) => {
    if (stockAgeDays === null) return 'unknown';
    if (stockAgeDays >= 90) return 'old';
    if (stockAgeDays >= 60) return 'aging';
    return 'fresh';
  };

  const getUniqueModels = (cars: Car[]) => {
    const models = cars
      .filter(c => c.status === 'inventory' && c.sale_status === 'available')
      .map(c => c.vehicle_model)
      .filter(Boolean);
    return Array.from(new Set(models)).sort();
  };

  const applyInventoryFilters = (cars: Car[]) => {
    return cars.filter(car => {
      // Ownership filter
      if (inventoryFilters.ownership.length > 0) {
        if (!inventoryFilters.ownership.includes(car.ownership_type)) {
          return false;
        }
      }

      // Stock age filter
      if (inventoryFilters.stockAge.length > 0) {
        const ageCategory = getStockAgeCategory(car.stock_age_days);
        if (!inventoryFilters.stockAge.includes(ageCategory)) {
          return false;
        }
      }

      // Model filter
      if (inventoryFilters.model && inventoryFilters.model !== '') {
        if (!car.vehicle_model.toLowerCase().includes(inventoryFilters.model.toLowerCase())) {
          return false;
        }
      }

      return true;
    });
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (inventoryFilters.ownership.length > 0) count++;
    if (inventoryFilters.stockAge.length > 0) count++;
    if (inventoryFilters.model && inventoryFilters.model !== '') count++;
    return count;
  };

  const clearAllFilters = () => {
    setInventoryFilters({
      ownership: [],
      stockAge: [],
      model: ''
    });
  };

  // RouteProtector handles skeleton loading, so we don't need internal skeleton
  // This prevents double fade-in glitching

  return (
    <div className="px-4" style={{ height: 'calc(100vh - 72px)' }}>
      <div className={`flex gap-3 pb-4 w-full h-full transition-all duration-700 ease-out transform ${
        columnsVisible 
          ? 'opacity-100 translate-y-0' 
          : 'opacity-0 translate-y-4'
      } ${inventoryExpanded ? 'overflow-hidden' : ''}`}>
        {columns
          .filter(col => showArchived || col.key !== 'archived')
          .map(col => {
          const listAll = cars.filter(c=> match(c.stock_number) || match(c.vehicle_model));
          let list = listAll.filter(c => {
            if (col.key === 'marketing' || col.key === 'qc_ceo') {
              return c.status === col.key;
            }
            if (col.key === 'inventory') {
              return c.status === 'inventory' && c.sale_status === 'available';
            }
            if (col.key === 'reserved') {
              return c.status === 'inventory' && c.sale_status === 'reserved';
            }
            if (col.key === 'sold') {
              return c.status === 'inventory' && c.sale_status === 'sold';
            }
            if (col.key === 'returned') {
              return c.status === 'inventory' && c.sale_status === 'returned';
            }
            if (col.key === 'archived') {
              return c.status === 'inventory' && c.sale_status === 'archived';
            }
            return false;
          });

          // Apply inventory filters only to inventory column
          if (col.key === 'inventory') {
            list = applyInventoryFilters(list);
          }

          // Hide non-inventory columns when expanded
          if (inventoryExpanded && col.key !== 'inventory') {
            return null;
          }

          return (
            <div
              key={col.key}
              className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-3 flex flex-col flex-1 min-w-0 transition-all duration-300"
              onDragOver={onDragOver}
              onDrop={onDrop(col.key)}
            >
              <div className="mb-3 px-1">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1">
                    <h3 className="text-xs font-medium text-white">{col.title}</h3>
                    {col.key === 'inventory' && getActiveFilterCount() > 0 && (
                      <span className="text-[9px] text-orange-400 font-medium">({getActiveFilterCount()})</span>
                    )}
                    {col.key === 'inventory' && (
                      <>
                        <button
                          onClick={() => setShowInventoryFilters(!showInventoryFilters)}
                          className="ml-1 text-white/60 hover:text-white transition-colors"
                          title="Filters"
                        >
                          <svg className={`w-3 h-3 transition-transform ${showInventoryFilters ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setInventoryExpanded(!inventoryExpanded)}
                          className="ml-1 text-white/60 hover:text-white transition-colors"
                          title={inventoryExpanded ? "Collapse" : "Expand"}
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            {inventoryExpanded ? (
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            ) : (
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            )}
                          </svg>
                        </button>
                      </>
                    )}
                  </div>
                  {col.key === 'marketing' && canCreateCars ? (
                    <button
                      onClick={() => setShowModal(true)}
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-gray-900 text-[10px] font-semibold ring-1 ring-white/20 shadow transition hover:brightness-110"
                      style={{
                        background:
                          'linear-gradient(135deg, #f3f4f6 0%, #d1d5db 15%, #ffffff 30%, #9ca3af 50%, #ffffff 70%, #d1d5db 85%, #f3f4f6 100%)'
                      }}
                    >
                      {list.length}
                      <span className="ml-1 text-[12px] leading-none">＋</span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-white/10 text-white/70 text-[10px] font-medium">
                        {list.length}
                      </span>
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
                          title={showArchived ? 'Hide archived cars' : 'Show archived cars'}
                        >
                          <Archive className="w-2.5 h-2.5" />
                          {showArchived ? 'Hide' : 'Show'} Archive
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Inventory Filter Panel */}
                {col.key === 'inventory' && showInventoryFilters && (
                  <div className="bg-black/40 border border-white/10 rounded-lg p-3 mb-2 space-y-3">
                    {/* Ownership Type Filter */}
                    <div>
                      <h4 className="text-[10px] font-medium text-white/80 mb-1">Ownership</h4>
                      <div className="space-y-1">
                        {['stock', 'consignment'].map(type => (
                          <label key={type} className="flex items-center gap-1.5 text-[9px] text-white/70 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={inventoryFilters.ownership.includes(type)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setInventoryFilters(prev => ({
                                    ...prev,
                                    ownership: [...prev.ownership, type]
                                  }));
                                } else {
                                  setInventoryFilters(prev => ({
                                    ...prev,
                                    ownership: prev.ownership.filter(t => t !== type)
                                  }));
                                }
                              }}
                              className="w-3 h-3 rounded text-gray-400 focus:ring-1 focus:ring-gray-400 accent-gray-400"
                            />
                            {type.charAt(0).toUpperCase() + type.slice(1)}
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Stock Age Filter */}
                    <div>
                      <h4 className="text-[10px] font-medium text-white/80 mb-1">Stock Age</h4>
                      <div className="space-y-1">
                        {[
                          { key: 'fresh', label: 'Fresh (0-59 days)' },
                          { key: 'aging', label: 'Aging (60-89 days)' },
                          { key: 'old', label: 'Old (90+ days)' }
                        ].map(age => (
                          <label key={age.key} className="flex items-center gap-1.5 text-[9px] text-white/70 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={inventoryFilters.stockAge.includes(age.key)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setInventoryFilters(prev => ({
                                    ...prev,
                                    stockAge: [...prev.stockAge, age.key]
                                  }));
                                } else {
                                  setInventoryFilters(prev => ({
                                    ...prev,
                                    stockAge: prev.stockAge.filter(a => a !== age.key)
                                  }));
                                }
                              }}
                              className="w-3 h-3 rounded text-gray-400 focus:ring-1 focus:ring-gray-400 accent-gray-400"
                            />
                            {age.label}
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Model Filter */}
                    <div>
                      <h4 className="text-[10px] font-medium text-white/80 mb-1">Model</h4>
                      <select
                        value={inventoryFilters.model}
                        onChange={(e) => setInventoryFilters(prev => ({ ...prev, model: e.target.value }))}
                        className="w-full bg-black/50 border border-white/20 rounded px-2 py-1 text-[9px] text-white"
                      >
                        <option value="">All Models</option>
                        {getUniqueModels(cars).map(model => (
                          <option key={model} value={model}>{model}</option>
                        ))}
                      </select>
                    </div>

                    {/* Clear Filters */}
                    {getActiveFilterCount() > 0 && (
                      <button
                        onClick={clearAllFilters}
                        className="w-full text-[9px] text-orange-400 hover:text-orange-300 transition-colors"
                      >
                        Clear All Filters
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar">
                {inventoryExpanded && col.key === 'inventory' ? (
                  // Grid layout for expanded inventory view
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                    {list.map(c => (
                      <div
                        key={c.id}
                        draggable={canEditCars}
                        onDragStart={onDragStart(c)}
                        onClick={async () => {
                          setSelected(c);
                          const fullData = await loadFullCarData(c.id);
                          if (fullData) {
                            setSelectedCarFull(fullData);
                          } else {
                            console.error('❌ CarKanbanBoard: Failed to load car details, modal will not open');
                            setSelected(null);
                          }
                        }}
                        className={`bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 backdrop-blur-sm transition-all duration-200 rounded-lg shadow-sm p-3 text-xs select-none cursor-pointer group ${canEditCars ? 'cursor-move' : ''} ${getStockAgeColor(c.stock_age_days)}`}
                      >
                        {/* thumbnail */}
                        <div className="w-full h-36 bg-white/10 rounded overflow-hidden mb-3">
                          {thumbs[c.id] ? (
                            <img src={thumbs[c.id]} className="w-full h-full object-cover" loading="lazy" />
                          ) : null}
                        </div>
                        <div className="space-y-2">
                          <div className="text-xs font-semibold text-white leading-tight truncate">{highlight(c.stock_number)}</div>
                          <div className="text-xs text-white/70 leading-tight line-clamp-2">{highlight(c.model_year+' '+cleanModel(c.vehicle_model))}</div>
                          <div className="text-white font-semibold text-sm flex items-center gap-1">
                            <span className="font-bold">AED</span> {c.advertised_price_aed.toLocaleString()}
                          </div>
                          {/* Price Drop Button - Expanded View */}
                          {col.key === 'inventory' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedCarForPriceDrop(c);
                                setShowPriceDropModal(true);
                              }}
                              className="w-full mt-2 bg-gradient-to-r from-gray-800/80 to-black/60 hover:from-gray-700/90 hover:to-black/70 border border-white/20 text-white text-xs px-2 py-1 rounded transition-all duration-200 flex items-center justify-center gap-1 backdrop-blur-sm hover:backdrop-blur-md"
                              title="Create price drop marketing task"
                            >
                              <Tag className="w-3 h-3" />
                              <span className="font-medium">Price Drop</span>
                            </button>
                          )}
                          {/* Archive Button - Expanded View */}
                          {(c.sale_status === 'sold' || c.sale_status === 'returned') && canEditCars && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleArchiveCar(c.id);
                              }}
                              className="w-full mt-2 bg-gradient-to-r from-gray-800/80 to-black/60 hover:from-gray-700/90 hover:to-black/70 border border-white/20 text-white text-xs px-2 py-1 rounded transition-all duration-200 flex items-center justify-center gap-1 backdrop-blur-sm hover:backdrop-blur-md"
                              title="Archive car"
                            >
                              <Archive className="w-3 h-3" />
                              <span className="font-medium">Archive</span>
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  // Normal vertical list layout - direct children without wrapper div
                  list.map(c => (
                    <div
                      key={c.id}
                      draggable={canEditCars}
                      onDragStart={onDragStart(c)}
                      onClick={async () => {
                        setSelected(c);
                        const fullData = await loadFullCarData(c.id);
                        if (fullData) {
                          setSelectedCarFull(fullData);
                        } else {
                          console.error('❌ CarKanbanBoard: Failed to load car details, modal will not open');
                          setSelected(null);
                        }
                      }}
                      className={`w-full bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 backdrop-blur-sm transition-all duration-200 rounded-lg shadow-sm p-1.5 text-xs select-none cursor-pointer group ${canEditCars ? 'cursor-move' : ''} ${getStockAgeColor(c.stock_age_days)} relative`}
                    >
                      {/* PDF Generated Checkmark - Top Right */}
                      {col.key === 'inventory' && c.vehicle_details_pdf_url && (
                        <div className="absolute top-0.5 right-0.5">
                          <Check className="w-2 h-2 text-green-400" strokeWidth={2} />
                        </div>
                      )}
                      
                      <div className="flex items-center gap-2 min-w-0">
                        {/* thumbnail */}
                        <div className="w-16 h-12 bg-white/10 flex-shrink-0 rounded overflow-hidden">
                          {thumbs[c.id]? (
                            <img src={thumbs[c.id]} className="w-full h-full object-cover" loading="lazy" />
                          ): null}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-[10px] font-semibold text-white leading-tight break-words max-h-8 overflow-hidden">{highlight(c.stock_number)}</div>
                          <div className="text-[9px] text-white/60 leading-tight break-words whitespace-normal max-h-8 overflow-hidden">{highlight(c.model_year+' '+cleanModel(c.vehicle_model))}</div>
                          <div className="text-white font-semibold text-[9px] flex items-center gap-0.5 mt-0.5 whitespace-nowrap truncate">
                            <span className="font-bold">AED</span> {c.advertised_price_aed.toLocaleString()}
                          </div>
                          {/* Price Drop Button - List View */}
                          {col.key === 'inventory' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedCarForPriceDrop(c);
                                setShowPriceDropModal(true);
                              }}
                              className="mt-1 bg-gradient-to-r from-gray-800/80 to-black/60 hover:from-gray-700/90 hover:to-black/70 border border-white/20 text-white text-[7px] px-1 py-0.5 rounded transition-all duration-200 flex items-center gap-1 backdrop-blur-sm hover:backdrop-blur-md"
                              title="Create price drop marketing task"
                            >
                              <Tag className="w-2 h-2" />
                              <span className="font-medium">Price Drop</span>
                            </button>
                          )}
                        </div>
                        <div className="flex-shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {/* Archive Button - For sold and returned cars */}
                          {(c.sale_status === 'sold' || c.sale_status === 'returned') && canEditCars && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation(); // Prevent card click
                                handleArchiveCar(c.id);
                              }}
                              className="
                                p-0.5 rounded-full transition-all duration-200 
                                bg-black/50 backdrop-blur-sm text-white/70 hover:text-white hover:bg-gray-700/70
                                hover:shadow-lg hover:scale-110
                                focus:outline-none focus:ring-2 focus:ring-gray-400/50
                              "
                              title="Archive car"
                            >
                              <Archive className="w-2.5 h-2.5" />
                            </button>
                          )}
                          <svg className="w-2 h-2 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  ))
                )}
                {list.length === 0 && (
                  <p className="text-center text-white/40 text-[10px] mt-4">No cars</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {showModal && (
        <AddCarModal
          onClose={() => setShowModal(false)}
          onCreated={(newCar) => {
            setShowModal(false);
            setCars((prev) => prev.some(c => c.id === newCar.id) ? prev : [newCar, ...prev]);
          }}
        />
      )}

      {selected && selectedCarFull && (
        <CarDetailsModal
          car={selectedCarFull}
          onClose={() => {
            setSelected(null);
            setSelectedCarFull(null);
          }}
          onDeleted={(id)=>{
            setSelected(null);
            setSelectedCarFull(null);
            setCars(prev=>prev.filter(c=>c.id!==id));
          }}
          onSaved={(updated)=>{
            setCars(prev=>prev.map(c=>c.id===updated.id? updated as any: c));
            setSelected(updated as any);
            setSelectedCarFull(updated);
          }}
        />
      )}

      {showPriceDropModal && selectedCarForPriceDrop && (
        <PriceDropModal
          car={selectedCarForPriceDrop}
          isOpen={showPriceDropModal}
          onClose={() => {
            setShowPriceDropModal(false);
            setSelectedCarForPriceDrop(null);
          }}
          onSuccess={() => {
            setShowPriceDropModal(false);
            setSelectedCarForPriceDrop(null);
            // Refresh the car data to show updated price
            window.dispatchEvent(new CustomEvent('priceUpdated'));
            console.log('Price drop task created successfully');
          }}
        />
      )}
    </div>
  );
} 