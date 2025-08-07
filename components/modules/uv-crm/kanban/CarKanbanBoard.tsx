"use client";
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import AddCarModal from '@/components/modules/uv-crm/modals/AddCarModal';
import CarDetailsModal from '@/components/modules/uv-crm/modals/CarDetailsModal';
import PriceDropModal from '@/components/modules/uv-crm/modals/PriceDropModal';
import { useAuth } from '@/components/shared/AuthProvider';
import { useSearchStore } from '@/lib/searchStore';
import { useUserRole } from '@/lib/useUserRole'; // 🆕 NEW ROLE SYSTEM
import { useModulePermissions } from '@/lib/useModulePermissions';
import { Check, Tag } from 'lucide-react';

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
}

export default function CarKanbanBoard() {
  const [cars, setCars] = useState<Car[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [selected, setSelected] = useState<Car | null>(null);
  const [selectedCarFull, setSelectedCarFull] = useState<any | null>(null);
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  
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

  const columns = [
    { key: 'marketing',   title: 'MARKETING' },
    { key: 'qc_ceo',      title: 'QC CHECK CEO' },
    { key: 'inventory',   title: 'INVENTORY' },
    { key: 'reserved',    title: 'RESERVED' },
    { key: 'sold',        title: 'SOLD' },
    { key: 'returned',    title: 'RETURNED' },
  ] as const;

  type ColKey = (typeof columns)[number]['key'];

  // Use new role system
  const { user } = useAuth();
  const { isAdmin } = useUserRole();
  const { canEdit: canEditCars, canCreate: canCreateCars } = useModulePermissions('inventory');
  

  const load = async () => {
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
      (mediaRows||[]).forEach((m:any)=>{ map[m.car_id] = m.url; });
      console.log('🖼️ CarKanbanBoard: Loaded', mediaRows?.length || 0, 'primary thumbnails');
      setThumbs(map);
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
    } else {
      await supabase.from('cars').update({ status: col, sale_status: 'available' }).eq('id', id);
    }

    // reload cars to refresh thumbnails
    load();
  };

  const onDragOver = (e: React.DragEvent) => e.preventDefault();

  const cleanModel = (model:string) => model.replace(/^(MERCEDES[\s-]*BENZ\s+)/i, '');

  useEffect(() => {
    load();

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
      
      // Force immediate reload
      setTimeout(() => {
        console.log('🔄 CarKanbanBoard: Force reloading after primary photo change...');
        load();
      }, 100);
    };
    
    window.addEventListener('primaryPhotoChanged', handlePrimaryPhotoChange);

    return () => { 
      supabase.removeChannel(carsChannel);
      window.removeEventListener('primaryPhotoChanged', handlePrimaryPhotoChange);
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
    const { data } = await supabase
      .from('cars')
      .select('*')
      .eq('id', carId)
      .single();
    return data;
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

  return (
    <div className="px-4" style={{ height: 'calc(100vh - 72px)' }}>
      <div className={`flex gap-3 pb-4 w-full h-full ${inventoryExpanded ? 'overflow-hidden' : ''}`}>
        {columns.map(col => {
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
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-white/10 text-white/70 text-[10px] font-medium">
                      {list.length}
                    </span>
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
                              className="w-3 h-3 rounded text-blue-500 focus:ring-1 focus:ring-blue-500"
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
                              className="w-3 h-3 rounded text-blue-500 focus:ring-1 focus:ring-blue-500"
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
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
                    {list.map(c => (
                      <div
                        key={c.id}
                        draggable={canEditCars}
                        onDragStart={onDragStart(c)}
                        onClick={async () => {
                          setSelected(c);
                          const fullData = await loadFullCarData(c.id);
                          setSelectedCarFull(fullData);
                        }}
                        className={`bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 backdrop-blur-sm transition-all duration-200 rounded-lg shadow-sm p-2 text-xs select-none cursor-pointer group ${canEditCars ? 'cursor-move' : ''} ${getStockAgeColor(c.stock_age_days)}`}
                      >
                        {/* thumbnail */}
                        <div className="w-full h-20 bg-white/10 rounded overflow-hidden mb-2">
                          {thumbs[c.id] ? (
                            <img src={thumbs[c.id]} className="w-full h-full object-cover" loading="lazy" />
                          ) : null}
                        </div>
                        <div className="space-y-1">
                          <div className="text-[10px] font-semibold text-white leading-tight truncate">{highlight(c.stock_number)}</div>
                          <div className="text-[9px] text-white/60 leading-tight line-clamp-2">{highlight(c.model_year+' '+cleanModel(c.vehicle_model))}</div>
                          <div className="text-white font-semibold text-[9px] flex items-center gap-0.5">
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
                              className="w-full mt-1 bg-gradient-to-r from-gray-800/80 to-black/60 hover:from-gray-700/90 hover:to-black/70 border border-white/20 text-white text-[8px] px-1.5 py-0.5 rounded transition-all duration-200 flex items-center justify-center gap-1 backdrop-blur-sm hover:backdrop-blur-md"
                              title="Create price drop marketing task"
                            >
                              <Tag className="w-2 h-2" />
                              <span className="font-medium">Price Drop</span>
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
                        setSelectedCarFull(fullData);
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
                        <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-white/50">
                          <svg className="w-2 h-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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