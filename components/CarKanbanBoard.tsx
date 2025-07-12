"use client";
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import AddCarModal from '@/components/AddCarModal';
import CarDetailsModal from '@/components/CarDetailsModal';
import { useAuth } from '@/components/AuthProvider';
import { useSearchStore } from '@/lib/searchStore';

interface Car {
  id: string;
  stock_number: string;
  model_year: number;
  vehicle_model: string;
  colour: string;
  advertised_price_aed: number;
  status: string;
  sale_status: string;
}

export default function CarKanbanBoard() {
  const [cars, setCars] = useState<Car[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [selected, setSelected] = useState<Car | null>(null);
  const [thumbs, setThumbs] = useState<Record<string, string>>({});

  const columns = [
    { key: 'marketing',   title: 'MARKETING' },
    { key: 'qc_ceo',      title: 'QC CHECK CEO' },
    { key: 'inventory',   title: 'INVENTORY' },
    { key: 'reserved',    title: 'RESERVED' },
    { key: 'sold',        title: 'SOLD' },
    { key: 'returned',    title: 'RETURNED' },
  ] as const;

  type ColKey = (typeof columns)[number]['key'];

  const { user } = useAuth();
  const meta:any = user?.user_metadata || {};
  const appMeta:any = (user as any)?.app_metadata || {};
  const hasAdmin = (val:any)=> typeof val==='string' && val.toLowerCase()==='admin';
  const arrayHasAdmin = (arr:any)=> Array.isArray(arr) && arr.map((r:any)=>String(r).toLowerCase()).includes('admin');
  const isAdmin = hasAdmin(meta.role) || hasAdmin(appMeta.role) || arrayHasAdmin(meta.roles) || arrayHasAdmin(appMeta.roles);

  const load = async () => {
    const { data } = await supabase
      .from('cars')
      .select('*')
      .order('created_at', { ascending: false });
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
      setThumbs(map);
    }
  };

  // drag helpers
  const onDragStart = (car: Car) => (e: React.DragEvent) => {
    // Normal users may only move cards that are in NEW LISTING or MARKETING
    const canMove = isAdmin;
    if (!canMove) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData('text/plain', car.id);
  };

  const onDrop = (col: ColKey) => async (e: React.DragEvent) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain');
    if (!id) return;

    // Permission checks for non-admin users
    if (!isAdmin) return; // non-admins cannot drop

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

    const channel = supabase
      .channel('cars-stream')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cars' },
        (payload: any) => {
          setCars(prev => {
            if (payload.eventType === 'INSERT') {
              return [payload.new as Car, ...prev];
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

    return () => { supabase.removeChannel(channel); };
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
  }

  return (
    <div className="px-4" style={{ height: 'calc(100vh - 72px)' }}>
      <div className="flex gap-3 pb-4 w-full h-full overflow-x-auto">
        {columns.map(col => {
          const listAll = cars.filter(c=> match(c.stock_number) || match(c.vehicle_model));
          const list = listAll.filter(c => {
            if (col.key === 'marketing' || col.key === 'qc_ceo') {
              return c.status === col.key;
            }
            if (col.key === 'inventory') {
              return c.status === 'inventory' && c.sale_status === 'available';
            }
            if (col.key === 'reserved') {
              return c.sale_status === 'reserved';
            }
            if (col.key === 'sold') {
              return c.sale_status === 'sold';
            }
            if (col.key === 'returned') {
              return c.sale_status === 'returned';
            }
            return false;
          });
          return (
            <div
              key={col.key}
              className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-3 w-80 min-w-0 flex flex-col"
              onDragOver={onDragOver}
              onDrop={onDrop(col.key as ColKey)}
            >
              <div className="mb-3 px-1 flex items-center justify-between">
                <h3 className="text-xs font-medium text-white">{col.title}</h3>
                {col.key === 'marketing' ? (
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

              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {list.map(c => (
                  <div
                    key={c.id}
                    draggable={isAdmin || ['marketing','qc_ceo'].includes(c.status)}
                    onDragStart={onDragStart(c)}
                    onClick={() => setSelected(c)}
                    className="w-full bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 backdrop-blur-sm transition-all duration-200 rounded-lg shadow-sm p-1.5 text-xs select-none cursor-pointer group"
                  >
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
                      </div>
                      <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-white/50">
                        <svg className="w-2 h-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                ))}
                {list.length === 0 && (
                  <p className="text-center text-white/40 text-[10px]">No cars</p>
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
            setCars((prev) => [newCar, ...prev]);
          }}
        />
      )}

      {selected && (
        <CarDetailsModal
          car={selected as any}
          onClose={() => setSelected(null)}
          onDeleted={(id)=>{
            setSelected(null);
            setCars(prev=>prev.filter(c=>c.id!==id));
          }}
          onSaved={(updated)=>{
            setCars(prev=>prev.map(c=>c.id===updated.id? updated as any: c));
            setSelected(updated as any);
          }}
        />
      )}
    </div>
  );
} 