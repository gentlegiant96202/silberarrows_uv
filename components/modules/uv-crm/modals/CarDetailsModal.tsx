"use client";

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import MediaUploader from '@/components/modules/uv-crm/components/MediaUploader';
import DocUploader from '@/components/modules/uv-crm/components/DocUploader';
import { useAuth } from '@/components/shared/AuthProvider';
import { useUserRole } from '@/lib/useUserRole';
import { createClient } from '@supabase/supabase-js';
import { createPortal } from 'react-dom';

interface CarInfo {
  id: string;
  stock_number: string;
  model_year: number;
  vehicle_model: string;
  model_family: string | null;
  colour: string;
  interior_colour: string | null;
  chassis_number: string;
  advertised_price_aed: number;
  cost_price_aed: number | null;
  current_mileage_km: number | null;
  current_warranty: string | null;
  current_service: string | null;
  regional_specification: string | null;
  engine: string | null;
  transmission: string | null;
  horsepower_hp: number | null;
  torque_nm: number | null;
  cubic_capacity_cc: number | null;
  number_of_keys: number | null;
  ownership_type: string;
  status: string;
  sale_status: string;
  description: string | null;
  key_equipment: string | null;
  vehicle_details_pdf_url: string | null;
  fuel_level_nm: number | null;
  car_location: string | null;
  fuel_level: number | null;
  stock_age_days: number | null;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
}

interface Props {
  car: CarInfo;
  onClose: () => void;
  onDeleted: (id:string)=>void;
  onSaved?: (updated: CarInfo) => void;
}

export default function CarDetailsModal({ car, onClose, onDeleted, onSaved }: Props) {
  const [media, setMedia] = useState<any[]>([]);
  const [localCar, setLocalCar] = useState<CarInfo>(car);
  const [pdfUrl, setPdfUrl] = useState<string | null>(car.vehicle_details_pdf_url || null);
  const [generating, setGenerating] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string>('');
  const { user } = useAuth();

  // Loading states for media operations
  const [mediaLoading, setMediaLoading] = useState(false);
  const [primaryLoading, setPrimaryLoading] = useState<string | null>(null); // ID of media being set as primary
  const [reorderLoading, setReorderLoading] = useState(false);

  // Mercedes-Benz models from appointment modal
  const models = [
    { id: "1", name: "A" },
    { id: "2", name: "SLK" },
    { id: "3", name: "C" },
    { id: "4", name: "CLA" },
    { id: "5", name: "CLK" },
    { id: "6", name: "E" },
    { id: "7", name: "CLS" },
    { id: "8", name: "S" },
    { id: "9", name: "CL" },
    { id: "10", name: "G" },
    { id: "11", name: "GLA" },
    { id: "12", name: "GLB" },
    { id: "13", name: "GLK" },
    { id: "14", name: "GLC" },
    { id: "15", name: "ML" },
    { id: "16", name: "GLE" },
    { id: "17", name: "GL" },
    { id: "18", name: "GLS" },
    { id: "19", name: "V" },
    { id: "20", name: "SLC" },
    { id: "21", name: "SL" },
    { id: "22", name: "SLS" },
    { id: "23", name: "AMG GT 2-DR" },
    { id: "24", name: "AMG GT 4-DR" },
    { id: "25", name: "SLR" },
    { id: "26", name: "Maybach" },
    { id: "27", name: "CLE" }
  ];
  // Use new role system
  const { isAdmin } = useUserRole();
  const [expanded, setExpanded] = useState<{[key:string]:boolean}>({});
  const canEdit = isAdmin && ['new_listing','marketing','qc_ceo'].includes(car.status);
  const [editing, setEditing] = useState(false);
  // Remove drag-related state
  // const [dragIdx, setDragIdx] = useState<number|null>(null);

  const toggleExpand = (label:string)=> setExpanded(p=>({...p,[label]:!p[label]}));

  // Unified function to refetch media from database
  const refetchMedia = async () => {
    setMediaLoading(true);
    try {
      const { data } = await supabase
        .from('car_media')
        .select('*')
        .eq('car_id', car.id)
        .order('sort_order', { ascending: true })
        .order('created_at');
      setMedia(data || []);
    } catch (error) {
      console.error('Failed to refetch media:', error);
    } finally {
      setMediaLoading(false);
    }
    };

  useEffect(() => {
    refetchMedia();
  }, [car.id]);

  useEffect(()=>{ setLocalCar(car); },[car]);

  const docs = media.filter((m:any)=>m.kind==='document');
  
  // Primary-first display logic: show primary photo first, then sort by sort_order
  const gallery = media
    .filter((m:any)=>m.kind!=='document')
    .sort((a, b) => {
      // Primary photos come first
      if (a.is_primary && !b.is_primary) return -1;
      if (!a.is_primary && b.is_primary) return 1;
      
      // Then sort by sort_order
      const aOrder = a.sort_order ?? 999999;
      const bOrder = b.sort_order ?? 999999;
      return aOrder - bOrder;
    });

  const downloadAll = async (items: any[], zipName: string = 'car_media.zip') => {
    if (items.length === 0) return;

    // Single file – direct download to avoid extra work
    if (items.length === 1) {
      const base = items[0].url;
      const dl = base.includes('?') ? `${base}&download` : `${base}?download`;
      const link = document.createElement('a');
      link.href = dl;
      link.download = '';
      document.body.appendChild(link);
      link.click();
      link.remove();
      return;
    }

    // Multiple files – package into ZIP
    try {
      // @ts-ignore – dynamic import, jszip type optional
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();

      // Fetch each file as blob and add to zip
      await Promise.all(items.map(async (it: any, idx: number) => {
        try {
          const base = it.url;
          const dl = base.includes('?') ? `${base}&download` : `${base}?download`;
          const res = await fetch(dl);
          const blob = await res.blob();
          const nameFromUrl = decodeURIComponent(base.split('/').pop() || `file_${idx}`);
          zip.file(nameFromUrl, blob);
        } catch (e) {
          console.error('Failed to fetch', it.url, e);
        }
      }));

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = zipName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (err) {
      console.error(err);
      alert('Failed to prepare ZIP file');
    }
  };

  // New function to move photos left/right one position at a time
  const movePhoto = async (currentIndex: number, direction: 'up' | 'down') => {
    if (!isAdmin || !editing || reorderLoading) return;
    
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= gallery.length) return;
    
    setReorderLoading(true);
    
    // Optimistic update: show change immediately
    const newGallery = [...gallery];
    const [movedItem] = newGallery.splice(currentIndex, 1);
    newGallery.splice(newIndex, 0, movedItem);
    
    const docs = media.filter(m => m.kind === 'document');
    const optimisticMedia = [...docs, ...newGallery];
    const previousMedia = [...media]; // Backup for rollback
    setMedia(optimisticMedia);
    
    try {
    // Update database with new sort orders for all gallery items
    await Promise.all(newGallery.map(async (item, index) => {
      await supabase
        .from('car_media')
        .update({ sort_order: index })
        .eq('id', item.id);
    }));
      
      // Refetch to ensure consistency
      await refetchMedia();
    } catch (error) {
      console.error('Failed to reorder media:', error);
      // Rollback on failure
      setMedia(previousMedia);
      alert('Failed to reorder media. Please try again.');
    } finally {
      setReorderLoading(false);
    }
  };

  const handleGeneratePdf = async ()=>{
    try{
      console.log('[PDF] Generating started');
      setGenerating(true);
      setStatusMsg('Building HTML content...');
      
      const response = await fetch('/api/generate-car-pdf-pdfshift', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          car: car,
          media: media
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate PDF');
      }
      
      setStatusMsg('Generating PDF...');
      const result = await response.json();
      
      // Log PDF stats
      if (result.pdfStats) {
        console.log('📊 PDF Generation Results:', result.pdfStats);
      }
      
      // Convert base64 to blob and upload to Supabase
      const pdfBlob = new Blob([
        Uint8Array.from(atob(result.pdfData), c => c.charCodeAt(0))
      ], { type: 'application/pdf' });
      
      // Delete old PDF if it exists
      if (car.vehicle_details_pdf_url) {
        setStatusMsg('Cleaning up old PDF...');
        try {
          const oldUrl = car.vehicle_details_pdf_url;
          const storagePrefix = '/car-media/';
          const storageIndex = oldUrl.indexOf(storagePrefix);
          
          if (storageIndex !== -1) {
            const oldPath = oldUrl.slice(storageIndex + storagePrefix.length);
            console.log('[PDF] Deleting old PDF:', oldPath);
            await supabase.storage.from('car-media').remove([oldPath]);
            console.log('[PDF] Old PDF deleted successfully');
          }
        } catch (deleteError) {
          console.warn('[PDF] Failed to delete old PDF:', deleteError);
          // Continue with upload even if deletion fails
        }
      }
      
      setStatusMsg('Uploading to Supabase...');
      const path = `${car.id}/vehicle-details-${Date.now()}.pdf`;
      const { error } = await supabase.storage.from('car-media').upload(path, pdfBlob, {
        upsert: true,
        contentType: 'application/pdf'
      });
      
      if (error) throw new Error(error.message);

      const { data } = supabase.storage.from('car-media').getPublicUrl(path);
      await supabase.from('cars').update({ vehicle_details_pdf_url: data.publicUrl }).eq('id', car.id);
      
      setPdfUrl(data.publicUrl);
      const sizeInfo = result.pdfStats 
        ? ` (${result.pdfStats.fileSizeMB}MB)`
        : '';
      setStatusMsg(`PDF generated successfully!${sizeInfo}`);
    }catch(e:any){
      console.error(e);
      alert(e.message||'Failed to create PDF');
      setStatusMsg('Generation failed - please try again');
    } finally {
      setGenerating(false);
      console.log('[PDF] Generating finished');
    }
  };

  const groups: { heading: string; rows: { label: string; value: any; field?: keyof CarInfo }[] }[] = [
    {
      heading: 'Basic Info',
      rows: [
        { label: 'Stock #', value: localCar.stock_number, field:'stock_number' },
        { label: 'Ownership', value: localCar.ownership_type, field:'ownership_type' },
        { label: 'Year', value: localCar.model_year, field:'model_year' },
        { label: 'Model', value: localCar.vehicle_model, field:'vehicle_model' },
        { label: 'Colour (Exterior)', value: localCar.colour, field:'colour' },
        { label: 'Interior', value: localCar.interior_colour || '—', field:'interior_colour' },
      ],
    },
    {
      heading: 'Mechanical',
      rows: [
        { label: 'Engine', value: localCar.engine || '—', field:'engine' },
        { label: 'Transmission', value: localCar.transmission || '—', field:'transmission' },
        { label: 'HP', value: localCar.horsepower_hp || '—', field:'horsepower_hp' },
        { label: 'Torque', value: localCar.torque_nm || '—', field:'torque_nm' },
        { label: 'CC', value: localCar.cubic_capacity_cc || '—', field:'cubic_capacity_cc' },
        { label: 'Model Family', value: localCar.model_family || '—', field:'model_family' },
      ],
    },
    {
      heading: 'Condition',
      rows: [
        { label: 'Mileage', value: localCar.current_mileage_km ? `${localCar.current_mileage_km.toLocaleString()} KM` : '—', field:'current_mileage_km' },
        { label: 'Warranty', value: localCar.current_warranty || '—', field:'current_warranty' },
        { label: 'Service', value: localCar.current_service || '—', field:'current_service' },
        { label: 'Keys', value: localCar.number_of_keys || '—', field:'number_of_keys' },
      ],
    },
    {
      heading: 'Pricing',
      rows: [
        { label: 'Advertised', value: `AED ${localCar.advertised_price_aed?.toLocaleString()}`, field:'advertised_price_aed' },
        { label: 'Cost', value: localCar.cost_price_aed ? `AED ${localCar.cost_price_aed.toLocaleString()}` : '—', field:'cost_price_aed' },
        { label: 'Monthly (0% Down)', value: (()=>{ const p=localCar.advertised_price_aed||0; if(!p) return '—'; const r=0.03/12; const n=60; const m=Math.round(p*r/(1-Math.pow(1+r,-n))); return `AED ${m.toLocaleString()}/mo`;})() },
        { label: 'Monthly (20% Down)', value: (()=>{ const p=localCar.advertised_price_aed||0; if(!p) return '—'; const principal=p*0.8; const r=0.03/12; const n=60; const m=Math.round(principal*r/(1-Math.pow(1+r,-n))); return `AED ${m.toLocaleString()}/mo`;})() },
        { label: 'Status', value: localCar.status, field:'status' },
        { label: 'Sale', value: localCar.sale_status, field:'sale_status' },
      ],
    },
  ];

  const locations = ['SHOWROOM','YARD','STONE','CAR PARK','SHOWROOM 2','NOT ON SITE','GARGASH'];
  const fuelOptions = [0,25,50,75,100];

  const handleFieldChange = (field:keyof CarInfo,value:any)=>{
    setLocalCar(prev=>({...prev,[field]:value}));
  };

  const handleSaveEdit = async ()=>{
    // Check character limits before saving
    if ((localCar.description || '').length > 1700) {
      alert('Description must be 1700 characters or less');
      return;
    }
    if ((localCar.key_equipment || '').length > 1800) {
      alert('Key equipment must be 1800 characters or less');
      return;
    }
    
    const { error, data } = await supabase.from('cars').update(localCar).eq('id', car.id).select().single();
    if(error){ alert(error.message); return; }
    setEditing(false);
    if(data && onSaved){ onSaved(data as CarInfo); }
  };

  const handleDelete = async ()=>{
    if(!confirm('Delete this car?')) return;
    const { error } = await supabase.from('cars').delete().eq('id', car.id);
    if(error){ alert(error.message); return; }
    onDeleted(car.id);
  };

  const handleDeleteMedia = async (m:any)=>{
    if(!confirm('Delete this media?')) return;
    if (primaryLoading || reorderLoading || mediaLoading) return;
    
    setMediaLoading(true);
    
    // Optimistic update: remove from UI immediately
    const previousMedia = [...media];
    const optimisticMedia = media.filter(item => item.id !== m.id);
    setMedia(optimisticMedia);
    
    try {
    // remove from DB
    await supabase.from('car_media').delete().eq('id', m.id);
    // remove file from storage if path exists
    try{
      const prefix = '/car-media/';
      const idx = m.url.indexOf(prefix);
      if(idx!==-1){
        const path = m.url.slice(idx + prefix.length);
        await supabase.storage.from('car-media').remove([path]);
      }
    }catch(e){}
      
      // Refetch to ensure consistency
      await refetchMedia();
    } catch (error) {
      console.error('Failed to delete media:', error);
      // Rollback on failure
      setMedia(previousMedia);
      alert('Failed to delete media. Please try again.');
    }
  };

  const handleMakePrimary = async (m:any)=>{
    if (primaryLoading || reorderLoading) return;
    
    setPrimaryLoading(m.id);
    
    // Optimistic update: show change immediately
    const previousMedia = [...media];
    const optimisticMedia = media.map(item => ({
      ...item,
      is_primary: item.id === m.id ? true : (item.kind === 'photo' ? false : item.is_primary)
    }));
    setMedia(optimisticMedia);
    
    try {
      // Clear existing primary photos
    await supabase.from('car_media').update({ is_primary:false }).eq('car_id', car.id).eq('kind','photo');
      // Set new primary
    await supabase.from('car_media').update({ is_primary:true }).eq('id', m.id);
      
      // Refetch to ensure consistency
      await refetchMedia();
    } catch (error) {
      console.error('Failed to set primary media:', error);
      // Rollback on failure
      setMedia(previousMedia);
      alert('Failed to set primary photo. Please try again.');
    } finally {
      setPrimaryLoading(null);
    }
  };

  // lightbox state
  const [showGallery, setShowGallery] = useState<number|null>(null); // index in gallery array

  // close on Esc
  const escListener = useCallback((e:KeyboardEvent)=>{
    if(e.key==='Escape') setShowGallery(null);
  },[]);

  useEffect(()=>{
    if(showGallery!==null){
      window.addEventListener('keydown', escListener);
    } else {
      window.removeEventListener('keydown', escListener);
    }
    return ()=>window.removeEventListener('keydown', escListener);
  },[showGallery, escListener]);

  // Removed moveItem helper function - no longer needed with arrow buttons

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-2">
      <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-lg p-4 w-full max-w-xl md:max-w-3xl lg:max-w-5xl text-xs relative max-h-[95vh] overflow-y-auto shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-xl leading-none text-white/70 hover:text-white"
        >
          ×
        </button>
        <div className="flex items-start justify-between mb-3 pr-6 gap-4 flex-wrap">
          <div className="flex flex-col">
            <h2 className="text-base font-semibold text-white">Vehicle Details</h2>
            {localCar.stock_age_days !== null && (
              <div className="text-white/70 text-xs mt-1">
                <span className="text-white/50">Stock Age:</span> {localCar.stock_age_days} days
              </div>
            )}
          </div>
          <div className="flex gap-1.5 mt-0.5">
            {isAdmin && canEdit && (
              <button onClick={handleDelete} className="px-2 py-1 bg-white/5 hover:bg-white/10 backdrop-blur-sm border border-white/10 text-white text-xs rounded transition-all">Delete</button>
            )}
            {canEdit && (
              editing? (
                <>
                  <button onClick={handleSaveEdit} className="px-2 py-1 bg-white/5 hover:bg-white/10 backdrop-blur-sm border border-white/10 text-white text-xs rounded transition-all">Save</button>
                  <button onClick={()=>{setEditing(false);setLocalCar(car);}} className="px-2 py-1 bg-white/5 hover:bg-white/10 backdrop-blur-sm border border-white/10 text-white text-xs rounded transition-all">Cancel</button>
                </>
              ) : (
                <button onClick={()=>setEditing(true)} className="px-2 py-1 bg-white/5 hover:bg-white/10 backdrop-blur-sm border border-white/10 text-white text-xs rounded transition-all">Edit</button>
              )
            )}
          </div>

          {/* Location & Fuel selectors when in inventory */}
          {(car.status==='inventory') && (
            <div className="flex gap-2 items-center text-[11px] text-white/80 flex-wrap">
              <label>
                Location:
                <select
                  value={localCar.car_location||''}
                  onChange={async e=>{
                    const loc = e.target.value;
                    setLocalCar(prev=>({...prev,car_location:loc}));
                    const { data:updated } = await supabase.from('cars').update({ car_location: loc }).eq('id', car.id).select().single();
                    if(updated && onSaved) onSaved(updated as CarInfo);
                  }}
                  className="bg-black/50 border border-white/20 ml-1 px-1 py-0.5 rounded text-white text-[11px]"
                >
                  <option value="" disabled>Select</option>
                  {locations.map(l=>(<option key={l} value={l}>{l}</option>))}
                </select>
              </label>
              <label>
                Fuel:
                <select
                  value={localCar.fuel_level??''}
                  onChange={async e=>{
                    const lvl = Number(e.target.value);
                    setLocalCar(prev=>({...prev,fuel_level:lvl}));
                    const { data:updatedFuel } = await supabase.from('cars').update({ fuel_level: lvl }).eq('id', car.id).select().single();
                    if(updatedFuel && onSaved) onSaved(updatedFuel as CarInfo);
                  }}
                  className="bg-black/50 border border-white/20 ml-1 px-1 py-0.5 rounded text-white text-[11px]"
                >
                  <option value="" disabled>Select</option>
                  {fuelOptions.map(f=>(<option key={f} value={f}>{f}%</option>))}
                </select>
              </label>
            </div>
          )}
        </div>
        <div className="flex flex-col gap-4 max-h-[75vh] overflow-y-auto">
          {/* SPECS */}
          <div className="space-y-4 uppercase">
            {groups.map(g=> (
              <div key={g.heading} className="border border-white/15 rounded-md p-3 bg-white/5">
                <h3 className="text-white text-[12px] font-bold mb-1 uppercase tracking-wide">{g.heading}</h3>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
                  {g.rows.map(r=> {
                    const val = r.value ?? '—';
                    const stringVal = String(val);
                    const needsToggle = (r.label==='Warranty' || r.label==='Service') && stringVal.length>40;
                    const isOpen = expanded[r.label];
                    const display = needsToggle?
                      (isOpen? (
                        <span>
                          {stringVal}
                          <button onClick={()=>toggleExpand(r.label)} className="ml-1 underline text-brand text-[10px]">Show less</button>
                        </span>
                      ) : (
                        <span>
                          {stringVal.slice(0,40)}…
                          <button onClick={()=>toggleExpand(r.label)} className="ml-1 underline text-brand text-[10px]">Read more</button>
                        </span>
                      ))
                    : val;
                    return (
                      <div key={r.label} className="flex items-start justify-between">
                        <dt className="text-white/60 text-[11px]">{r.label}</dt>
                        <dd className="text-white text-[11px] max-w-[60%] text-right whitespace-normal break-words">
                          {editing && r.field ? (
                            r.field === 'model_family' ? (
                              <select 
                                className="bg-black/40 border border-white/20 px-1 text-right w-full text-white text-[11px]" 
                                value={(localCar[r.field]??'') as any} 
                                onChange={e=>handleFieldChange(r.field!, e.target.value)}
                              >
                                <option value="">Select...</option>
                                {models.map(m => (
                                  <option key={m.id} value={m.name}>
                                    {m.name}
                                  </option>
                                ))}
                              </select>
                            ) : (
                            <input type="text" className="bg-black/40 border border-white/20 px-1 text-right w-full uppercase" value={(localCar[r.field]??'') as any} onChange={e=>handleFieldChange(r.field!, e.target.value.toUpperCase())} />
                            )
                          ) : (
                            display
                          )}
                        </dd>
                      </div>
                    );
                  })}
                </dl>
              </div>
            ))}

            {/* Vehicle Owner Details - Only for Consignment Cars */}
            {localCar.ownership_type === 'consignment' && (
              <div className="border border-white/15 rounded-md p-3 bg-white/5">
                <h3 className="text-white text-[12px] font-bold mb-1 uppercase tracking-wide">Vehicle Owner Details</h3>
                <dl className="grid grid-cols-1 gap-x-4 gap-y-2">
                  <div className="flex items-start justify-between">
                    <dt className="text-white/60 text-[11px]">Owner Name</dt>
                    <dd className="text-white text-[11px] max-w-[60%] text-right whitespace-normal break-words">
                      {editing ? (
                        <input 
                          type="text" 
                          className="bg-black/40 border border-white/20 px-1 text-right w-full" 
                          value={localCar.customer_name ?? ''} 
                          onChange={e=>handleFieldChange('customer_name', e.target.value)} 
                        />
                      ) : (
                        localCar.customer_name || '—'
                      )}
                    </dd>
                  </div>
                  <div className="flex items-start justify-between">
                    <dt className="text-white/60 text-[11px]">Phone Number</dt>
                    <dd className="text-white text-[11px] max-w-[60%] text-right whitespace-normal break-words">
                      {editing ? (
                        <input 
                          type="text" 
                          className="bg-black/40 border border-white/20 px-1 text-right w-full" 
                          value={localCar.customer_phone ?? ''} 
                          onChange={e=>handleFieldChange('customer_phone', e.target.value)} 
                        />
                      ) : (
                        localCar.customer_phone || '—'
                      )}
                    </dd>
                  </div>
                  <div className="flex items-start justify-between">
                    <dt className="text-white/60 text-[11px]">Email Address</dt>
                    <dd className="text-white text-[11px] max-w-[60%] text-right whitespace-normal break-words">
                      {editing ? (
                        <input 
                          type="email" 
                          className="bg-black/40 border border-white/20 px-1 text-right w-full" 
                          value={localCar.customer_email ?? ''} 
                          onChange={e=>handleFieldChange('customer_email', e.target.value)} 
                        />
                      ) : (
                        localCar.customer_email || '—'
                      )}
                    </dd>
                  </div>
                </dl>
              </div>
            )}

            {/* Removed description block from left column */}
          </div>

          {/* DESCRIPTION & KEY EQUIPMENT */}
          <div className="flex flex-col gap-2">
            {/* Description */}
            <div className="border border-white/15 rounded-md p-3 bg-white/5 flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="flex justify-between items-center mb-1 flex-shrink-0">
                <h3 className="text-white text-[12px] font-bold uppercase tracking-wide">Description</h3>
                {editing && (
                  <span className={`text-[10px] ${(localCar.description || '').length > 1700 ? 'text-red-400' : 'text-white/60'}`}>
                    {(localCar.description || '').length}/1700
                  </span>
                )}
              </div>
              {editing? (
                <>
                  <textarea 
                    className={`w-full bg-black/40 border p-1 text-[11px] leading-normal text-white resize-y min-h-[100px] ${
                      (localCar.description || '').length > 1700 ? 'border-red-400' : 'border-white/20'
                    }`} 
                    value={localCar.description||''} 
                    onChange={e=>handleFieldChange('description',e.target.value)} 
                    maxLength={1700}
                  />
                  {(localCar.description || '').length > 1700 && (
                    <p className="text-red-400 text-[10px] mt-1">Description must be 1700 characters or less</p>
                  )}
                </>
              ): (
                <div className="flex-1 overflow-y-auto">
                  <p className="text-white text-[11px] leading-normal whitespace-pre-wrap break-words">{localCar.description||'—'}</p>
                </div>
              )}
            </div>

            {/* Key Equipment */}
            <div className="border border-white/15 rounded-md p-3 bg-white/5 flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="flex justify-between items-center mb-1 flex-shrink-0">
                <h3 className="text-white text-[12px] font-bold uppercase tracking-wide">Key Equipment</h3>
                {editing && (
                  <span className={`text-[10px] ${(localCar.key_equipment || '').length > 1800 ? 'text-red-400' : 'text-white/60'}`}>
                    {(localCar.key_equipment || '').length}/1800
                  </span>
                )}
              </div>
              {editing? (
                <>
                  <textarea 
                    className={`w-full bg-black/40 border p-1 text-[10px] text-white resize-y min-h-[100px] ${
                      (localCar.key_equipment || '').length > 1800 ? 'border-red-400' : 'border-white/20'
                    }`} 
                    value={localCar.key_equipment||''} 
                    onChange={e=>handleFieldChange('key_equipment',e.target.value)} 
                    placeholder="Comma or newline separated" 
                    maxLength={1800}
                  />
                  {(localCar.key_equipment || '').length > 1800 && (
                    <p className="text-red-400 text-[10px] mt-1">Key equipment must be 1800 characters or less</p>
                  )}
                </>
              ): (
                <div className="flex-1 overflow-y-auto">
                  {localCar.key_equipment? (
                     <ul className="list-disc list-inside columns-2 text-white text-[11px] leading-normal whitespace-pre-wrap">
                       {localCar.key_equipment.split(/[\n,]+/).map((it,i)=><li key={i} className="break-inside-avoid">{it.trim()}</li>)}
                     </ul>
                   ) : '—'}
                </div>
              )}
              </div>

          </div>

          {/* DOCUMENTS & MEDIA */}
          <div className="space-y-4">
            {/* Documents Section */}
            <div className="space-y-2 border border-white/15 rounded-md p-3 bg-white/5">
              <DocUploader carId={car.id} onUploaded={async ()=>{
                const { data: docRows } = await supabase.from('car_media').select('*').eq('car_id', car.id).order('created_at');
                setMedia(docRows||[]);
              }} />
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-white/70">Documents ({docs.length})</h4>
                  {docs.length>0 && (
                    <button onClick={()=>downloadAll(docs, 'documents.zip')} className="text-[10px] underline text-white/60 hover:text-white">Download All</button>
                  )}
                </div>
                {docs.length>0 ? (
                  <ul className="list-disc list-inside text-white/80 text-xs max-h-24 overflow-y-auto pr-1">
                    {docs.map((d:any)=> (
                      <li key={d.id}><a href={d.url} target="_blank" rel="noopener noreferrer" className="underline hover:text-brand">{d.url.split('/').pop()}</a></li>
                    ))}
                  </ul>
                ): (
                  <p className="text-white/50 text-[11px]">No documents uploaded yet.</p>
                )}
              </div>
            </div>

            {isAdmin && car.status === 'marketing' && (
              <MediaUploader carId={car.id} onUploaded={refetchMedia} />
            )}

            {/* Media Section */}
            {gallery.length>0 && (
              <div className="space-y-2 border border-white/15 rounded-md p-3 bg-white/5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-white/70">
                    Pictures / Videos ({gallery.length})
                    {mediaLoading && <span className="ml-2 text-red-400">Loading...</span>}
                    {reorderLoading && <span className="ml-2 text-blue-400">Reordering...</span>}
                    {primaryLoading && <span className="ml-2 text-yellow-400">Setting Primary...</span>}
                  </h4>
                  <button 
                    onClick={()=>downloadAll(gallery, 'media.zip')} 
                    disabled={!!(mediaLoading || reorderLoading || primaryLoading)}
                    className="text-[10px] underline text-white/60 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Download All
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {gallery.map((m:any, i:number)=>(
                    <div
                      key={m.id}
                      className="relative group"
                    >
                      {m.kind==='photo' ? (
                        <img src={m.url} loading="lazy" className="w-full h-24 object-contain rounded bg-black" onClick={()=>setShowGallery(i)} />)
                        : (
                          <div className="relative" onClick={()=>setShowGallery(i)}>
                            <video src={m.url} preload="metadata" className="w-full h-24 object-contain rounded pointer-events-none bg-black" />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-white text-xl rounded">
                              ▶
                            </div>
                          </div>
                        )}
                      {/* overlay buttons - admin only */}
                      {isAdmin && (
                        <>
                          <button 
                            onClick={()=>handleDeleteMedia(m)} 
                            disabled={!!(mediaLoading || primaryLoading || reorderLoading)}
                            className="absolute top-0 right-0 text-[10px] bg-black/60 text-white px-1 hidden group-hover:block disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            {mediaLoading ? '...' : '×'}
                          </button>
                          {m.kind==='photo' && !m.is_primary && (
                            <button 
                              onClick={()=>handleMakePrimary(m)} 
                              disabled={!!(primaryLoading !== null || reorderLoading || mediaLoading)}
                              className="absolute bottom-0 left-0 text-[9px] bg-black/60 text-white px-1 hidden group-hover:block disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              {primaryLoading === m.id ? 'Setting...' : 'Primary'}
                            </button>
                          )}
                          {m.kind==='photo' && m.is_primary && (
                            <span className="absolute bottom-0 left-0 text-[9px] bg-green-600/80 text-white px-1 font-semibold">
                              PRIMARY
                            </span>
                          )}
                          {/* Arrow buttons for reordering - only show when editing */}
                          {editing && (
                            <>
                              {/* Left arrow - move photo left (up in order) */}
                              <button 
                                onClick={(e) => {e.stopPropagation(); movePhoto(i, 'up');}}
                                disabled={!!(i === 0 || reorderLoading || primaryLoading || mediaLoading)}
                                className="absolute left-1 top-1/2 -translate-y-1/2 w-6 h-6 bg-black/80 text-white flex items-center justify-center rounded-full text-[12px] hover:bg-black disabled:opacity-40 disabled:cursor-not-allowed hidden group-hover:block"
                                title="Move left"
                              >
                                {reorderLoading ? '...' : '←'}
                              </button>
                              {/* Right arrow - move photo right (down in order) */}
                              <button 
                                onClick={(e) => {e.stopPropagation(); movePhoto(i, 'down');}}
                                disabled={!!(i === gallery.length - 1 || reorderLoading || primaryLoading || mediaLoading)}
                                className="absolute right-1 top-1/2 -translate-y-1/2 w-6 h-6 bg-black/80 text-white flex items-center justify-center rounded-full text-[12px] hover:bg-black disabled:opacity-40 disabled:cursor-not-allowed hidden group-hover:block"
                                title="Move right"
                              >
                                {reorderLoading ? '...' : '→'}
                              </button>
                            </>
                          )}
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Vehicle Details PDF Section */}
            <div className="space-y-2 border border-white/15 rounded-md p-3 bg-white/5">
              <h4 className="text-xs font-semibold text-white/70">Vehicle Details PDF</h4>
              {pdfUrl ? (
                <div className="flex items-center gap-2">
                  <a href={pdfUrl + '?download'} download className="underline text-brand text-xs">Download PDF</a>
                  {isAdmin && (car.status==='marketing' || car.status==='qc_ceo') && (
                    <button onClick={handleGeneratePdf} disabled={generating} className="px-2 py-1 text-[10px] bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded disabled:opacity-40 flex items-center gap-1">
                      {generating && (<span className="animate-spin rounded-full h-3 w-3 border-t-2 border-b-2 border-white" />)}
                      {generating ? 'Regenerating…' : 'Regenerate'}
                    </button>
                  )}
                </div>
              ) : (
                isAdmin && (car.status==='marketing' || car.status==='qc_ceo') ? (
                  <button onClick={handleGeneratePdf} disabled={generating} className="px-2 py-1 text-[10px] bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded disabled:opacity-40 flex items-center gap-1">
                    {generating && (<span className="animate-spin rounded-full h-3 w-3 border-t-2 border-b-2 border-white" />)}
                    {generating ? 'Generating…' : 'Generate PDF'}
                  </button>
                ) : (
                  <p className="text-white/50 text-[11px]">PDF available only to admins in Marketing or QC stages.</p>
                )
              )}
              {statusMsg && <div className="text-[10px] text-white/50">{statusMsg}</div>}
            </div>

            {/* Lightbox viewer */}
            {showGallery!==null && gallery[showGallery] && createPortal(
              <div
                className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 select-none"
                onClick={(e)=>{ if(e.target===e.currentTarget) setShowGallery(null); }}
              >
                {/* Close */}
                <button
                  className="absolute top-3 right-4 w-8 h-8 flex items-center justify-center bg-white text-black rounded-full text-2xl font-bold hover:bg-white/90"
                  onClick={()=>setShowGallery(null)}
                  aria-label="Close"
                >
                  ×
                </button>

                {/* Prev */}
                {showGallery>0 && (
                  <button className="absolute left-2 md:left-6 text-white text-5xl md:text-6xl hover:text-brand transition" onClick={()=>setShowGallery(showGallery-1)} aria-label="Previous">‹</button>
                )}

                {/* Media */}
                <div className="w-screen h-screen flex items-center justify-center">
                  {gallery[showGallery].kind==='photo'? (
                    <img
                      src={gallery[showGallery].url}
                      className="object-contain"
                      style={{ maxHeight: '100vh', maxWidth: '100vw', width: 'auto', height: 'auto' }}
                    />
                  ):(
                    <video
                      src={gallery[showGallery].url}
                      controls
                      className="object-contain"
                      style={{ maxHeight: '100vh', maxWidth: '100vw', width: 'auto', height: 'auto' }}
                    />
                  )}
                </div>

                {/* Next */}
                {showGallery<gallery.length-1 && (
                  <button className="absolute right-2 md:right-6 text-white text-5xl md:text-6xl hover:text-brand transition" onClick={()=>setShowGallery(showGallery+1)} aria-label="Next">›</button>
                )}
              </div>, document.body)}
          </div>
        </div>
      </div>
    </div>
  );
} 