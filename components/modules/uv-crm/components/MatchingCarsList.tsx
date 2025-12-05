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
      // Simple filter by model_family with proper permissions
      const { data, error } = await supabase
      .from('cars')
      .select('*')
      .eq('status', 'inventory')
        .eq('sale_status', 'available')
        .eq('model_family', model)
        .order('advertised_price_aed', { ascending: true })
        .limit(6);

      if (error) {
        setCars([]);
      } else {
        setCars(data ?? []);

        // fetch thumbs with storage proxy
        const ids = (data ?? []).map(c=>c.id);
        if(ids.length){
          const { data: mediaRows } = await supabase
            .from('car_media')
            .select('car_id,url')
            .eq('is_primary', true)
            .eq('kind','photo')
            .in('car_id', ids);
          const map:Record<string,string> = {};
          (mediaRows||[]).forEach((m:any)=>{ 
            let imageUrl = m.url;
            if (imageUrl && imageUrl.includes('.supabase.co/storage/')) {
              imageUrl = `/api/storage-proxy?url=${encodeURIComponent(m.url)}`;
            }
            map[m.car_id] = imageUrl;
          });
          setThumbs(map);
        }
      }
      setLoading(false);
    };

    fetchCars();

    // Listen for custom primary photo change events
    const handlePrimaryPhotoChange = () => {
      fetchCars();
    };
    
    window.addEventListener('primaryPhotoChanged', handlePrimaryPhotoChange);

    return () => { 
      window.removeEventListener('primaryPhotoChanged', handlePrimaryPhotoChange);
    };
  }, [model]);

  if(!model){
    return (
      <p className="text-white/50 text-xs text-center py-4">Select a model to view matching inventory</p>
    );
  }

  if(loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <div className="w-4 h-4 border-2 border-white/20 border-t-white/60 rounded-full animate-spin"></div>
        <span className="text-white/50 text-xs ml-2">Loading...</span>
      </div>
    );
  }

  if(cars.length === 0) {
    return (
      <p className="text-white/50 text-xs text-center py-4">No matching cars in stock</p>
    );
  }

  return (
    <ul className="space-y-1.5">
      {cars.map(c=>(
        <li 
          key={c.id} 
          draggable 
          onDragStart={(e)=>e.dataTransfer.setData('text/plain',c.id)} 
          className="bg-black/30 border border-white/10 rounded-lg p-1.5 text-xs text-white flex items-center gap-2 cursor-grab hover:bg-black/40 hover:border-white/20 transition-colors active:cursor-grabbing"
        >
          {/* thumb */}
          <div className="w-14 h-10 bg-black/40 flex-shrink-0 rounded overflow-hidden">
            {thumbs[c.id] ? <img src={thumbs[c.id]} className="w-full h-full object-cover" loading="lazy" alt="" /> : null}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-semibold leading-tight truncate">{c.stock_number}</div>
            <div className="text-[9px] text-white/50 leading-tight truncate">{c.model_year} {c.vehicle_model}</div>
            <div className="text-[10px] font-semibold text-emerald-400 mt-0.5">AED {c.advertised_price_aed?.toLocaleString()}</div>
          </div>
        </li>
      ))}
    </ul>
  );
}
