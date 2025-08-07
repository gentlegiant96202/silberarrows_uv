'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

interface CarRow {
  id:string;
  stock_number:string;
  vehicle_model:string;
  model_year:number;
  colour:string;
  advertised_price_aed:number;
  thumbnail_url?:string;
}

export default function MatchingCarsList({ model }: { model: string }) {
  const [cars, setCars] = useState<CarRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [thumbs,setThumbs] = useState<Record<string,string>>({});

  useEffect(() => {
    if(!model) { setCars([]); return; }
    setLoading(true);

    const fetchCars = async () => {
      // Simple filter by model_family - much cleaner than text matching
      const { data, error } = await supabase
      .from('cars')
      .select('*')
      .eq('status', 'inventory')
        .eq('sale_status', 'available')
        .eq('model_family', model)
        .order('advertised_price_aed', { ascending: true })
        .limit(6);

      if (error) {
        console.error('[MatchingCarsList] Supabase error:', error.message);
        setCars([]);
      } else {
        setCars(data ?? []);

        // fetch thumbs
        const ids = (data ?? []).map(c=>c.id);
        if(ids.length){
          const { data: mediaRows } = await supabase
            .from('car_media')
            .select('car_id,url')
            .eq('is_primary', true)
            .eq('kind','photo')
            .in('car_id', ids);
          const map:Record<string,string> = {};
          (mediaRows||[]).forEach((m:any)=>{ map[m.car_id]=m.url; });
          setThumbs(map);
        }
      }
      setLoading(false);
    };

    fetchCars();

    // Listen for custom primary photo change events
    const handlePrimaryPhotoChange = () => {
      console.log('Primary photo changed event received in MatchingCarsList, reloading thumbnails...');
      fetchCars();
    };
    
    window.addEventListener('primaryPhotoChanged', handlePrimaryPhotoChange);

    return () => { 
      window.removeEventListener('primaryPhotoChanged', handlePrimaryPhotoChange);
    };
  }, [model]);

  if(!model){
    return (
      <div className="border border-white/15 rounded-md p-3 bg-white/5 mt-4 sm:mt-0 h-full flex flex-col">
        <h3 className="text-white text-[12px] font-bold mb-2 uppercase tracking-wide sticky top-0 bg-white/5">Matching Inventory</h3>
        <p className="text-white/60 text-xs">Select a model to view inventory.</p>
      </div>
    );
  }

  return (
    <div className="border border-white/15 rounded-md p-3 bg-white/5 mt-4 sm:mt-0 h-full flex flex-col">
      <h3 className="text-white text-[12px] font-bold mb-2 uppercase tracking-wide sticky top-0 bg-white/5">Matching Inventory</h3>
      {loading? <p className="text-white/60 text-xs">Loading…</p> : (
        cars.length===0? <p className="text-white/60 text-xs">No in-stock cars for this model.</p> : (
          <ul className="space-y-2 flex-1 overflow-y-auto pr-1">
            {cars.map(c=>(
              <li key={c.id} draggable onDragStart={(e)=>e.dataTransfer.setData('text/plain',c.id)} className="bg-white/5 border border-white/10 rounded-lg p-1.5 text-xs text-white flex items-center gap-2 min-w-0 cursor-move">
                {/* thumb */}
                <div className="w-16 h-12 bg-white/10 flex-shrink-0 rounded overflow-hidden">
                  {thumbs[c.id]? <img src={thumbs[c.id]} className="w-full h-full object-cover" loading="lazy"/>:null}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] font-semibold leading-tight break-words max-h-8 overflow-hidden">{c.stock_number}</div>
                  <div className="text-[9px] text-white/60 leading-tight break-words max-h-8 overflow-hidden">{c.model_year} {c.vehicle_model}</div>
                  <div className="text-[10px] font-semibold text-white mt-0.5 whitespace-nowrap truncate"><span className="font-bold">AED</span> {c.advertised_price_aed.toLocaleString()}</div>
                </div>
              </li>
            ))}
          </ul>
        )
      )}
    </div>
  );
} 