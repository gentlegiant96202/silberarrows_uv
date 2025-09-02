"use client";

import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import MediaUploader from '@/components/modules/uv-crm/components/MediaUploader';
import DocUploader from '@/components/modules/uv-crm/components/DocUploader';
import { useAuth } from '@/components/shared/AuthProvider';
import { useUserRole } from '@/lib/useUserRole';
import { useModulePermissions } from '@/lib/useModulePermissions';
import { createPortal } from 'react-dom';
import { Instagram, X } from 'lucide-react';

export interface CarInfo {
  id: string;
  stock_number: string;
  model_year: number;
  vehicle_model: string;
  model_family: string | null;
  colour: string;
  interior_colour: string | null;
  chassis_number: string;
  advertised_price_aed: number;
  monthly_0_down_aed?: number | null;
  monthly_20_down_aed?: number | null;
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
  body_style: string | null;
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
  // Consignment-specific fields
  registration_expiry_date: string | null;
  insurance_expiry_date: string | null;
  service_records_acquired: boolean | null;
  owners_manual_acquired: boolean | null;
  spare_tyre_tools_acquired: boolean | null;
  fire_extinguisher_acquired: boolean | null;
  website_url: string | null;
}

interface Props {
  car: CarInfo;
  onClose: () => void;
  onDeleted: (id:string)=>void;
  onSaved?: (updated: CarInfo) => void;
}

interface MediaItem {
  id: string;
  url: string;
  kind: string;
  sort_order: number;
  is_primary: boolean;
}

export default function CarDetailsModal({ car, onClose, onDeleted, onSaved }: Props) {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [localCar, setLocalCar] = useState<CarInfo>(car);
  const [pdfUrl, setPdfUrl] = useState<string | null>(car.vehicle_details_pdf_url || null);
  const [generating, setGenerating] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string>('');
  const [generatingAgreement, setGeneratingAgreement] = useState(false);
  const [agreementStatusMsg, setAgreementStatusMsg] = useState<string>('');
  const [activeTab, setActiveTab] = useState<string>('basic');
  const { user } = useAuth();
  // Monthly payment (UI-only) state with override flags
  const [monthlyZero, setMonthlyZero] = useState<string>('');
  const [monthlyTwenty, setMonthlyTwenty] = useState<string>('');
  const [monthlyZeroOverridden, setMonthlyZeroOverridden] = useState<boolean>(false);
  const [monthlyTwentyOverridden, setMonthlyTwentyOverridden] = useState<boolean>(false);
  const [isCashOnly, setIsCashOnly] = useState<boolean>(false);

  const computeMonthly = (advertisedPrice: number, downPercent: number): number => {
    const price = (advertisedPrice || 0) * (1 - downPercent);
    if (!price) return 0;
    const monthlyRate = 0.03 / 12;
    const months = 60;
    const payment = Math.round(price * monthlyRate / (1 - Math.pow(1 + monthlyRate, -months)));
    return payment;
  };

  const formatMonthly = (amount: number): string => `AED ${amount.toLocaleString()}/MO`;

  useEffect(() => {
    const p = localCar.advertised_price_aed || 0;
    if (!isCashOnly && !monthlyZeroOverridden) setMonthlyZero(formatMonthly(computeMonthly(p, 0)));
    if (!isCashOnly && !monthlyTwentyOverridden) setMonthlyTwenty(formatMonthly(computeMonthly(p, 0.2)));
  }, [localCar.advertised_price_aed, monthlyZeroOverridden, monthlyTwentyOverridden, isCashOnly]);

  // Auto-resize helpers for large textareas so the whole tab scrolls instead of each field
  const descRef = useRef<HTMLTextAreaElement | null>(null);
  const keyEqRef = useRef<HTMLTextAreaElement | null>(null);
  const applyAutoResize = (el: HTMLTextAreaElement | null) => {
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  };
  // Defer auto-resize effect until after 'editing' is declared below
  useEffect(() => {
    if (activeTab !== 'description') return;
    applyAutoResize(descRef.current);
    applyAutoResize(keyEqRef.current);
  }, [activeTab, localCar.description, localCar.key_equipment]);

  // Loading states for media operations
  const [mediaLoading, setMediaLoading] = useState(false);
  const [reorderLoading, setReorderLoading] = useState(false);
  
  // Function to get original full-resolution image URL (avoid proxy for fullscreen)
  const getOriginalImageUrl = (url: string) => {
    try {
      // If this is a proxied URL, extract the original Supabase URL
      if (url.startsWith('/api/storage-proxy?url=')) {
        const qs = url.split('?')[1] || '';
        const original = new URLSearchParams(qs).get('url') || url;
        return original.split('?')[0];
      }
      // If already a direct Supabase URL, strip any transforms/queries
      if (url.includes('.supabase.co')) {
        return url.split('?')[0];
      }
      return url;
    } catch {
      return url;
    }
  };

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
  const { canEdit: canEditInventory, canDelete: canDeleteInventory } = useModulePermissions('inventory');
  const [expanded, setExpanded] = useState<{[key:string]:boolean}>({});
  const canEdit = canEditInventory && ['new_listing','marketing','qc_ceo'].includes(car.status);
  const [editing, setEditing] = useState(false);
  // Drag and drop state for reordering
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const toggleExpand = (label:string)=> setExpanded(p=>({...p,[label]:!p[label]}));

  // Unified function to refetch media from database
  const refetchMedia = async () => {
    setMediaLoading(true);
    try {
      const { data, error } = await supabase
        .from('car_media')
        .select('*')
        .eq('car_id', car.id)
        .order('sort_order', { ascending: true })
        .order('created_at');
      
      if (error) {
        console.error('Supabase error fetching media:', error);
        setMedia([]);
      } else {
        // Fix storage URLs for custom domain
        const fixedData = data?.map(m => ({
          ...m,
          url: m.url && m.url.includes('.supabase.co/storage/') 
            ? `/api/storage-proxy?url=${encodeURIComponent(m.url)}`
            : m.url
        })) || [];
        
        console.log('Fetched media for car:', car.id, 'Count:', fixedData.length);
        const primaryPhoto = fixedData.find(m => m.kind === 'photo' && m.is_primary);
        console.log('🎯 Primary photo found:', primaryPhoto ? 'Yes' : 'No', primaryPhoto?.id);
        setMedia(fixedData);
      }
    } catch (error) {
      console.error('Failed to refetch media:', error);
      setMedia([]);
    } finally {
      setMediaLoading(false);
    }
  };

  useEffect(() => {
    refetchMedia();
  }, [car.id]);

  useEffect(()=>{ setLocalCar(car); },[car]);

  // Initialize monthly values from DB when car changes
  useEffect(()=>{
    const zero = car.monthly_0_down_aed;
    const twenty = car.monthly_20_down_aed;
    
    // Check if both are null (cash only)
    const cashOnly = zero === null && twenty === null;
    setIsCashOnly(cashOnly);
    
    if (cashOnly) {
      setMonthlyZero('');
      setMonthlyTwenty('');
      setMonthlyZeroOverridden(false);
      setMonthlyTwentyOverridden(false);
    } else {
      if (typeof zero === 'number' && zero > 0) {
        setMonthlyZero(formatMonthly(zero));
        setMonthlyZeroOverridden(true);
      } else {
        setMonthlyZero('');
        setMonthlyZeroOverridden(false);
      }
      if (typeof twenty === 'number' && twenty > 0) {
        setMonthlyTwenty(formatMonthly(twenty));
        setMonthlyTwentyOverridden(true);
      } else {
        setMonthlyTwenty('');
        setMonthlyTwentyOverridden(false);
      }
    }
  },[car.monthly_0_down_aed, car.monthly_20_down_aed]);

  const docs = media.filter((m:any)=>m.kind==='document');
  
  // Primary-first display logic: show primary photo first, then sort by sort_order
  const gallery = media
    .filter((m:any)=>m.kind==='photo' || m.kind==='video')
    .sort((a, b) => {
      // Primary photos come first
      if (a.is_primary && !b.is_primary) return -1;
      if (!a.is_primary && b.is_primary) return 1;
      
      // Then sort by sort_order
      const aOrder = a.sort_order ?? 999999;
      const bOrder = b.sort_order ?? 999999;
      return aOrder - bOrder;
    });

  // Social Media content
  const socialMedia = media
    .filter((m:any)=>m.kind==='social_media')
    .sort((a, b) => {
      const aOrder = a.sort_order ?? 999999;
      const bOrder = b.sort_order ?? 999999;
      return aOrder - bOrder;
    });

  // Catalog content  
  const catalog = media
    .filter((m:any)=>m.kind==='catalog')
    .sort((a, b) => {
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

  // Display formatting helper for Basic Info rows
  const renderDisplayValue = (row: { label: string; field?: keyof CarInfo }, rawValue: any) => {
    const value = rawValue ?? '—';
    const enumFields = new Set<keyof CarInfo>([
      'ownership_type',
      'regional_specification',
      'sale_status',
      'status',
    ]);

    if (row.field && enumFields.has(row.field) && value !== '—') {
      return (
        <span className="inline-block px-2 py-0.5 rounded-full border border-white/20 bg-white/10 text-white/90 text-[12px]">
          {String(value).toUpperCase()}
        </span>
      );
    }

    if (row.label === 'Mileage' && typeof localCar.current_mileage_km === 'number') {
      return <span>{localCar.current_mileage_km.toLocaleString()} km</span>;
    }

    if (row.label === 'Advertised' || row.label === 'Cost') {
      const numeric = Number(String(value).replace(/[^0-9.]/g, '') || 0);
      return <span>AED {numeric.toLocaleString()}</span>;
    }

    if (row.label === 'Stock #') {
      return <span className="font-mono tracking-wide">{String(value).toUpperCase()}</span>;
    }

    return <span>{typeof value === 'number' ? String(value) : String(value).toUpperCase()}</span>;
  };

  // Function to move photos to specific position (for drag & drop)
  const movePhotoToPosition = async (fromIndex: number, toIndex: number) => {
    if (!canEditInventory || !editing || reorderLoading) return;
    if (fromIndex === toIndex || toIndex < 0 || toIndex >= gallery.length) return;
    
    setReorderLoading(true);
    
    // Optimistic update: show change immediately
    const newGallery = [...gallery];
    const [movedItem] = newGallery.splice(fromIndex, 1);
    newGallery.splice(toIndex, 0, movedItem);
    
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

  // Function to set a photo as primary
  const handleSetPrimary = async (mediaId: string) => {
    if (!canEditInventory || mediaLoading || reorderLoading) return;
    
    setMediaLoading(true);
    
    try {
      console.log('🔄 Setting photo as primary:', mediaId);
      
      const response = await fetch('/api/set-primary-photo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ mediaId }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to set primary photo');
      }
      
      console.log('✅ API call successful, refetching media...');
      
      // First refetch media to get updated order and primary status
      await refetchMedia();
      
      // Dispatch event to notify other components immediately
      console.log('🔄 Dispatching primary photo change event for car:', car.id);
      window.dispatchEvent(new CustomEvent('primaryPhotoChanged', { 
        detail: { carId: car.id, mediaId } 
      }));
      
      // Also dispatch a delayed event as backup
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('primaryPhotoChanged', { 
          detail: { carId: car.id, mediaId } 
        }));
        console.log('🔄 Backup primary photo change event dispatched');
      }, 1000);
      
    } catch (error) {
      console.error('Failed to set primary photo:', error);
      alert('Failed to set primary photo. Please try again.');
    } finally {
      setMediaLoading(false);
    }
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    if (!editing || reorderLoading) return;
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || !editing) return;
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || !editing) return;
    
    movePhotoToPosition(draggedIndex, dropIndex);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
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
        let message = 'Failed to generate PDF';
        try {
          const errJson = await response.json();
          message = errJson?.error || JSON.stringify(errJson);
        } catch {
          try {
            message = await response.text();
          } catch {}
        }
        setStatusMsg(message);
        throw new Error(message);
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

  const handleGenerateConsignmentAgreement = async () => {
    try {
      console.log('[Consignment] Agreement generation started');
      setGeneratingAgreement(true);
      setAgreementStatusMsg('Generating consignment agreement...');
      
      const response = await fetch('/api/generate-consignment-agreement', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          car: localCar
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate consignment agreement');
      }
      
      const result = await response.json();
      
      // Log generation stats
      if (result.pdfStats) {
        console.log('📊 Consignment Agreement Results:', result.pdfStats);
      }
      
      // Convert base64 to blob and trigger download
      const pdfBlob = new Blob([
        Uint8Array.from(atob(result.pdfData), c => c.charCodeAt(0))
      ], { type: 'application/pdf' });
      
      // Create download link
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = result.fileName || `Consignment_Agreement_${localCar.stock_number}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      setAgreementStatusMsg('Consignment agreement downloaded successfully! Please send to customer for signing.');
      
      // Auto-clear status message after 5 seconds
      setTimeout(() => {
        setAgreementStatusMsg('');
      }, 5000);
      
    } catch (e: any) {
      console.error('[Consignment] Error:', e);
      alert(e.message || 'Failed to generate consignment agreement');
      setAgreementStatusMsg('Generation failed - please try again');
    } finally {
      setGeneratingAgreement(false);
      console.log('[Consignment] Agreement generation finished');
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
        { label: 'Body Style', value: localCar.body_style || '—', field:'body_style' },
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
        { label: 'Payment Options', value: isCashOnly ? 'CASH ONLY' : 'FINANCING AVAILABLE', field: undefined },
        { label: 'Monthly (0% Down)', value: isCashOnly ? '—' : (monthlyZero || '—'), field: undefined },
        { label: 'Monthly (20% Down)', value: isCashOnly ? '—' : (monthlyTwenty || '—'), field: undefined },
        { label: 'Status', value: localCar.status, field:'status' },
        { label: 'Sale', value: localCar.sale_status, field:'sale_status' },
      ],
    },
  ];

  // Add consignment-specific group if it's a consignment car
  if (localCar.ownership_type === 'consignment') {
    groups.push({
      heading: 'Consignment Details',
      rows: [
        { 
          label: 'Customer Name', 
          value: localCar.customer_name || '—', 
          field: 'customer_name' 
        },
        { 
          label: 'Customer Email', 
          value: localCar.customer_email || '—', 
          field: 'customer_email' 
        },
        { 
          label: 'Customer Phone', 
          value: localCar.customer_phone || '—', 
          field: 'customer_phone' 
        },
        { 
          label: 'Registration Expiry', 
          value: localCar.registration_expiry_date 
            ? new Date(localCar.registration_expiry_date).toLocaleDateString('en-GB', {
                day: '2-digit',
                month: '2-digit', 
                year: 'numeric'
              }) 
            : '—', 
          field: 'registration_expiry_date' 
        },
        { 
          label: 'Insurance Expiry', 
          value: localCar.insurance_expiry_date 
            ? new Date(localCar.insurance_expiry_date).toLocaleDateString('en-GB', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
              }) 
            : '—', 
          field: 'insurance_expiry_date' 
        },
      ],
    });

    groups.push({
      heading: 'Handover Checklist',
      rows: [
        { 
          label: 'Service Records', 
          value: localCar.service_records_acquired ? '✅ Acquired' : '☐ Not acquired', 
          field: 'service_records_acquired' 
        },
        { 
          label: 'Owner\'s Manual', 
          value: localCar.owners_manual_acquired ? '✅ Acquired' : '☐ Not acquired', 
          field: 'owners_manual_acquired' 
        },
        { 
          label: 'Spare Tyre & Tools', 
          value: localCar.spare_tyre_tools_acquired ? '✅ Acquired' : '☐ Not acquired', 
          field: 'spare_tyre_tools_acquired' 
        },
        { 
          label: 'Fire Extinguisher', 
          value: localCar.fire_extinguisher_acquired ? '✅ Acquired' : '☐ Not acquired', 
          field: 'fire_extinguisher_acquired' 
        },
      ],
    });
  }

  const locations = ['SHOWROOM','YARD','STONE','CAR PARK','SHOWROOM 2','NOT ON SITE','GARGASH','IN SERVICE'];
  const fuelOptions = [0,25,50,75,100];

  const handleFieldChange = (field:keyof CarInfo,value:any)=>{
    setLocalCar(prev=>({...prev,[field]:value}));
  };

  const handleCashOnlyToggle = (cashOnly: boolean) => {
    setIsCashOnly(cashOnly);
    if (cashOnly) {
      // Clear monthly payments when switching to cash only
      setMonthlyZero('');
      setMonthlyTwenty('');
      setMonthlyZeroOverridden(false);
      setMonthlyTwentyOverridden(false);
    } else {
      // Recalculate when switching back to financing
      const p = localCar.advertised_price_aed || 0;
      setMonthlyZero(formatMonthly(computeMonthly(p, 0)));
      setMonthlyTwenty(formatMonthly(computeMonthly(p, 0.2)));
      setMonthlyZeroOverridden(false);
      setMonthlyTwentyOverridden(false);
    }
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
    
    // Before saving, ensure website_url is lowercase
    if (localCar.website_url) {
      localCar.website_url = localCar.website_url.toLowerCase();
    }

    // Parse monthly strings -> integers (AED)
    const parseMonthly = (s: string): number | null => {
      if (!s) return null;
      const n = Number(String(s).replace(/[^0-9]/g, ''));
      return Number.isFinite(n) && n > 0 ? n : null;
    };

    const monthly0 = isCashOnly ? null : (monthlyZeroOverridden ? parseMonthly(monthlyZero) : null);
    const monthly20 = isCashOnly ? null : (monthlyTwentyOverridden ? parseMonthly(monthlyTwenty) : null);
    const payload = {
      ...localCar,
      monthly_0_down_aed: monthly0,
      monthly_20_down_aed: monthly20,
    } as Partial<CarInfo>;
 
    const { error, data } = await supabase.from('cars').update(payload).eq('id', car.id).select().single();
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
    if (reorderLoading || mediaLoading) return;
    
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



  // lightbox state
  const [showGallery, setShowGallery] = useState(false);
  const [galleryIdx, setGalleryIdx] = useState(0);

  // close on Esc
  const escListener = useCallback((e:KeyboardEvent)=>{
    if(e.key==='Escape') setShowGallery(false);
  },[]);

  useEffect(()=>{
    if(showGallery){
      window.addEventListener('keydown', escListener);
    } else {
      window.removeEventListener('keydown', escListener);
    }
    return ()=>window.removeEventListener('keydown', escListener);
  },[showGallery, escListener]);

  // Removed moveItem helper function - no longer needed with arrow buttons

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-2"
      role="dialog"
      aria-modal="true"
      aria-labelledby="car-details-title"
    >
      <div 
        className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-lg p-6 w-[896px] max-w-[98vw] h-[85vh] flex flex-col text-sm relative overflow-hidden shadow-2xl focus:outline-none focus:ring-2 focus:ring-gray-400/50"
        tabIndex={-1}
      >
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-xl leading-none text-white/70 hover:text-white"
          aria-label="Close car details modal"
        >
          ×
        </button>
        <div className="flex items-start justify-between mb-4 pr-6 gap-4 flex-wrap">
          <div className="flex flex-col">
            <h2 id="car-details-title" className="text-lg font-semibold text-white flex items-center gap-2">
              <span className="text-2xl md:text-3xl font-bold uppercase tracking-wide">Vehicle Details</span>
              {localCar.chassis_number && (
                <span className="text-base md:text-lg font-medium text-white/70 ml-2 flex items-center gap-2 uppercase">
                  – Chassis: <span className="font-mono tracking-wide text-white/80">{localCar.chassis_number}</span>
                </span>
              )}
            </h2>
            {localCar.stock_age_days !== null && (
              <div className="text-white/70 text-sm mt-1">
                <span className="text-white/50">Stock Age:</span> {localCar.stock_age_days} days
              </div>
            )}
          </div>
          <div className="flex gap-1.5 mt-0.5">
            {canDeleteInventory && ['new_listing','marketing','qc_ceo'].includes(car.status) && (
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

        {/* Tab Navigation */}
        <div className="border-b border-white/20 mb-6">
          <nav className="flex space-x-3" aria-label="Tabs">
            {[
              { id: 'basic', label: 'Basic Info', step: 1 },
              { id: 'description', label: 'Description', step: 2 },
              { id: 'media', label: 'Media', step: 3 },
              { id: 'documents', label: 'Vehicle Documents', step: 4 }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative whitespace-nowrap py-2.5 px-4 font-semibold text-[13px] md:text-sm uppercase tracking-wide rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400/50 focus:ring-offset-2 focus:ring-offset-black/40 ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-b from-white/15 to-white/5 text-white border border-white/20'
                    : 'text-white/70 hover:text-white/90 hover:bg-white/5 border border-transparent'
                }`}
                aria-current={activeTab === tab.id ? 'page' : undefined}
              >
                <span className="mr-2 inline-flex items-center justify-center w-5 h-5 text-[11px] rounded-full bg-gradient-to-b from-white/60 to-white/20 text-black/80 font-semibold">{tab.step}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          
          {/* Basic Info Tab (includes Mechanical/Condition/Pricing) */}
          {activeTab === 'basic' && (
            <div className="space-y-6 text-base">
              {groups.filter(g => ['Basic Info','Mechanical','Condition','Pricing'].includes(g.heading)).map(g=> (
                <div key={g.heading} className="border border-white/15 rounded-md p-5 bg-white/5">
                  <h3 className="text-white text-sm font-bold mb-4 uppercase tracking-wide">{g.heading}</h3>
                  <dl className={'grid grid-cols-1 gap-y-4'}>
                  {g.rows.map(r=> {
                    const val = r.value ?? '—';
                    return (
                        <div key={r.label} className={'grid grid-cols-[240px_minmax(0,1fr)] items-start gap-4'}>
                          <dt className={'text-white/80 text-[14px] md:text-[15px] tracking-wide self-center'}>
                            {r.label}
                          </dt>
                          <dd className={'text-white text-[16px] leading-[1.35] text-left whitespace-normal break-words'}>
                          {r.label === 'Payment Options' ? (
                            editing ? (
                              <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => handleCashOnlyToggle(false)}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 border ${
                                      !isCashOnly 
                                        ? 'bg-gradient-to-r from-gray-300 to-gray-500 text-black border-gray-400 shadow-lg' 
                                        : 'bg-black/40 text-white/70 border-white/20 hover:bg-white/10 hover:text-white'
                                    }`}
                                  >
                                    💳 Financing
                                  </button>
                                  <button
                                    onClick={() => handleCashOnlyToggle(true)}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 border ${
                                      isCashOnly 
                                        ? 'bg-gradient-to-r from-gray-300 to-gray-500 text-black border-gray-400 shadow-lg' 
                                        : 'bg-black/40 text-white/70 border-white/20 hover:bg-white/10 hover:text-white'
                                    }`}
                                  >
                                    💰 Cash Only
                                  </button>
                                </div>
                                <div className="text-xs text-white/60">
                                  {isCashOnly ? 'No financing available' : 'Financing options available'}
                                </div>
                              </div>
                            ) : (
                              <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg font-medium text-[15px] ${
                                isCashOnly 
                                  ? 'bg-gradient-to-r from-orange-500/20 to-red-500/20 text-orange-300 border border-orange-500/30' 
                                  : 'bg-gradient-to-r from-green-500/20 to-blue-500/20 text-green-300 border border-green-500/30'
                              }`}>
                                {isCashOnly ? '💰 CASH ONLY' : '💳 FINANCING AVAILABLE'}
                              </span>
                            )
                          ) : r.label === 'Monthly (0% Down)' ? (
                            editing && !isCashOnly ? (
                              <input
                                type="text"
                                className="bg-black/40 border border-white/20 px-3 py-2 text-left w-full text-[15px] rounded focus:outline-none focus:ring-2 focus:ring-gray-400/50 focus:border-gray-400/50"
                                value={monthlyZero}
                                onChange={e=>{ setMonthlyZero(e.target.value); setMonthlyZeroOverridden(true); }}
                              />
                            ) : (
                              <span className={isCashOnly ? "text-white/40" : ""}>{isCashOnly ? '—' : monthlyZero}</span>
                            )
                          ) : r.label === 'Monthly (20% Down)' ? (
                            editing && !isCashOnly ? (
                              <input
                                type="text"
                                className="bg-black/40 border border-white/20 px-3 py-2 text-left w-full text-[15px] rounded focus:outline-none focus:ring-2 focus:ring-gray-400/50 focus:border-gray-400/50"
                                value={monthlyTwenty}
                                onChange={e=>{ setMonthlyTwenty(e.target.value); setMonthlyTwentyOverridden(true); }}
                              />
                            ) : (
                              <span className={isCashOnly ? "text-white/40" : ""}>{isCashOnly ? '—' : monthlyTwenty}</span>
                            )
                          ) : editing && r.field ? (
                            r.field === 'model_family' ? (
                              <select 
                                  className={'bg-black/40 border border-white/20 px-3 py-2 text-left w-full text-white text-[15px] rounded focus:outline-none focus:ring-2 focus:ring-gray-400/50 focus:border-gray-400/50'} 
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
                            ) : r.field === 'body_style' ? (
                              <select 
                                  className={'bg-black/40 border border-white/20 px-3 py-2 text-left w-full text-white text-[15px] rounded focus:outline-none focus:ring-2 focus:ring-gray-400/50 focus:border-gray-400/50'} 
                                value={(localCar[r.field]??'') as any} 
                                onChange={e=>handleFieldChange(r.field!, e.target.value)}
                              >
                                <option value="">Select...</option>
                                <option value="Coupe">Coupe</option>
                                <option value="Convertible">Convertible</option>
                                <option value="Estate">Estate</option>
                                <option value="Hatchback">Hatchback</option>
                                <option value="Saloon">Saloon</option>
                                <option value="SUV">SUV</option>
                              </select>
                            ) : (
                              <input 
                                type="text" 
                                className={'bg-black/40 border border-white/20 px-3 py-2 text-left w-full uppercase text-[15px] rounded focus:outline-none focus:ring-2 focus:ring-gray-400/50 focus:border-gray-400/50'} 
                                value={(localCar[r.field]??'') as any} 
                                onChange={e=>handleFieldChange(r.field!, e.target.value.toUpperCase())} 
                              />
                              )
                          ) : (
                            renderDisplayValue({ label: r.label, field: r.field as any }, val)
                          )}
                        </dd>
                      </div>
                    );
                  })}
                </dl>
              </div>
            ))}

              {/* Consignment Details - Only for consignment cars */}
            {localCar.ownership_type === 'consignment' && (
                <div className="border border-white/15 rounded-md p-4 bg-white/5">
                  <h3 className="text-white text-sm font-bold mb-3 uppercase tracking-wide">Consignment Details</h3>
                  <dl className="grid grid-cols-1 gap-y-4">
                    <div className="grid grid-cols-[240px_minmax(0,1fr)] items-start gap-4">
                      <dt className="text-white/70 text-[13px] tracking-wide self-center">Customer Name</dt>
                      <dd className="text-white text-[16px] leading-[1.35] text-left whitespace-normal break-words">
                        {editing && canEdit ? (
                          <input
                            type="text"
                            className="bg-black/40 border border-white/20 px-3 py-2 text-left w-full text-[15px] rounded focus:outline-none focus:ring-2 focus:ring-gray-400/50 focus:border-gray-400/50"
                            value={localCar.customer_name ?? ''}
                            onChange={e=>handleFieldChange('customer_name', e.target.value)}
                          />
                        ) : (
                          localCar.customer_name ?? '—'
                        )}
                      </dd>
                    </div>
                    <div className="grid grid-cols-[240px_minmax(0,1fr)] items-start gap-4">
                      <dt className="text-white/70 text-[13px] tracking-wide self-center">Customer Phone</dt>
                      <dd className="text-white text-[16px] leading-[1.35] text-left whitespace-normal break-words">
                        {editing && canEdit ? (
                          <input
                            type="text"
                            className="bg-black/40 border border-white/20 px-3 py-2 text-left w-full text-[15px] rounded focus:outline-none focus:ring-2 focus:ring-gray-400/50 focus:border-gray-400/50"
                            value={localCar.customer_phone ?? ''}
                            onChange={e=>handleFieldChange('customer_phone', e.target.value)}
                          />
                        ) : (
                          localCar.customer_phone ?? '—'
                        )}
                      </dd>
                    </div>
                    <div className="grid grid-cols-[240px_minmax(0,1fr)] items-start gap-4">
                      <dt className="text-white/70 text-[13px] tracking-wide self-center">Customer Email</dt>
                      <dd className="text-white text-[16px] leading-[1.35] text-left whitespace-normal break-words">
                        {editing && canEdit ? (
                          <input
                            type="email"
                            className="bg-black/40 border border-white/20 px-3 py-2 text-left w-full text-[15px] rounded focus:outline-none focus:ring-2 focus:ring-gray-400/50 focus:border-gray-400/50"
                            value={localCar.customer_email ?? ''}
                            onChange={e=>handleFieldChange('customer_email', e.target.value)}
                          />
                        ) : (
                          localCar.customer_email ?? '—'
                        )}
                      </dd>
                    </div>
                  </dl>
                </div>
              )}
          </div>
          )}

          {/* Description Tab */}
          {activeTab === 'description' && (
            <div className="space-y-6">
            {/* Description */}
              <div className="border border-white/15 rounded-md p-4 bg-white/5">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-white text-sm font-bold uppercase tracking-wide">Description</h3>
                {editing && (
                    <span className={`text-sm ${(localCar.description || '').length > 1700 ? 'text-red-400' : 'text-white/60'}`}>
                    {(localCar.description || '').length}/1700
                  </span>
                )}
              </div>
                {editing && canEdit ? (
                <>
                  <textarea 
                      ref={descRef}
                      onInput={(e)=>applyAutoResize(e.currentTarget)}
                      className={`w-full bg-black/40 border p-3 text-sm leading-normal text-white resize-none focus:outline-none focus:ring-2 focus:ring-gray-400/50 ${
                        (localCar.description || '').length > 1700 ? 'border-red-400 focus:border-red-400' : 'border-white/20 focus:border-gray-400/50'
                    }`} 
                    value={localCar.description||''} 
                      onChange={e=>handleFieldChange('description', e.target.value)}
                      placeholder="Enter vehicle description..."
                      style={{height: 'auto', minHeight: '200px', overflow: 'hidden'}}
                      rows={8}
                  />
                  {(localCar.description || '').length > 1700 && (
                      <p className="text-red-400 text-sm mt-2">Description must be 1700 characters or less</p>
                  )}
                </>
                ) : (
                  <div className="text-white/80 text-sm leading-relaxed whitespace-pre-wrap">
                    {localCar.description || 'No description available'}
                </div>
              )}
            </div>

            {/* Key Equipment */}
              <div className="border border-white/15 rounded-md p-4 bg-white/5">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-white text-sm font-bold uppercase tracking-wide">Key Equipment</h3>
                {editing && (
                    <span className={`text-sm ${(localCar.key_equipment || '').length > 1800 ? 'text-red-400' : 'text-white/60'}`}>
                    {(localCar.key_equipment || '').length}/1800
                  </span>
                )}
              </div>
                {editing && canEdit ? (
                <>
                  <textarea 
                      ref={keyEqRef}
                      onInput={(e)=>applyAutoResize(e.currentTarget)}
                      className={`w-full bg-black/40 border p-3 text-sm text-white resize-none focus:outline-none focus:ring-2 focus:ring-gray-400/50 ${
                        (localCar.key_equipment || '').length > 1800 ? 'border-red-400 focus:border-red-400' : 'border-white/20 focus:border-gray-400/50'
                    }`} 
                    value={localCar.key_equipment||''} 
                      onChange={e=>handleFieldChange('key_equipment', e.target.value)}
                      placeholder="Enter key equipment and features..."
                      style={{height:'auto', minHeight: '250px', overflow: 'hidden'}}
                      rows={10}
                  />
                  {(localCar.key_equipment || '').length > 1800 && (
                      <p className="text-red-400 text-sm mt-2">Key equipment must be 1800 characters or less</p>
                  )}
                </>
                ) : (
                  <div className="text-white/80 text-sm leading-relaxed whitespace-pre-wrap">
                    {localCar.key_equipment || 'No key equipment listed'}
                </div>
              )}
              </div>

              {/* Website URL */}
              <div className="border border-white/15 rounded-md p-4 bg-white/5">
                <h3 className="text-white text-sm font-bold mb-3 uppercase tracking-wide">Website URL</h3>
                {editing && canEdit ? (
                  <input
                    type="url"
                    className="w-full bg-black/40 border border-white/20 rounded px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-gray-400/50 focus:border-gray-400/50"
                    value={(localCar.website_url || '').toLowerCase()}
                    placeholder="https://yourwebsite.com/car/123"
                    onChange={e=>handleFieldChange('website_url', e.target.value.toLowerCase())}
                  />
                ) : (
                  <div className="text-white/80 text-sm">
                    {localCar.website_url ? (
                      <a href={localCar.website_url} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white underline">
                        {localCar.website_url}
                      </a>
                    ) : (
                      'No website URL set'
                  )}
                </div>
                )}
              </div>
            </div>
          )}

          {/* Media Tab */}
          {activeTab === 'media' && (
            <div className="space-y-6">
              {/* Photo Gallery */}
              {gallery.length > 0 && (
                <div className="border border-white/15 rounded-md p-4 bg-white/5">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-semibold text-white">
                      Photo Gallery ({gallery.length})
                  </h4>
                    {editing && (
                      <span className="text-sm text-white/60">Drag to reorder</span>
                    )}
                </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    {gallery.map((item, i) => (
                      <div
                        key={item.id}
                        className={`relative group ${editing ? 'cursor-move' : 'cursor-pointer'}`}
                        draggable={editing}
                        onDragStart={(e)=>handleDragStart(e,i)}
                        onDragOver={(e)=>handleDragOver(e,i)}
                      onDragLeave={handleDragLeave}
                        onDrop={(e)=>handleDrop(e,i)}
                      onDragEnd={handleDragEnd}
                    >
                        <div className="aspect-square bg-white/10 rounded overflow-hidden">
                          <img 
                            src={item.url} 
                            className="w-full h-full object-contain bg-black/40 cursor-pointer hover:opacity-80 transition-opacity" 
                            onClick={() => {setShowGallery(true); setGalleryIdx(i);}}
                            loading="lazy"
                          />
                            </div>
                        {item.is_primary && (
                          <div className="absolute top-1 left-1 bg-green-500 text-white text-xs px-1.5 py-0.5 rounded">
                            Primary
                          </div>
                        )}
                        {editing && (
                          <div className="absolute inset-0 hidden group-hover:flex items-start justify-between p-1">
                            <div>
                              {!item.is_primary && (
                        <button 
                                  onClick={() => handleSetPrimary(item.id)}
                                  className="bg-black/70 text-white text-xs px-1.5 py-0.5 rounded hover:bg-black/90"
                                  title="Set as primary"
                                >
                                  ★
                        </button>
                              )}
                            </div>
                          <button
                              onClick={() => handleDeleteMedia(item.id)}
                              className="bg-red-500/70 text-white text-xs px-1.5 py-0.5 rounded hover:bg-red-500/90"
                              title="Delete"
                            >
                              ×
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

              {/* Social Media Images */}
            {socialMedia.length > 0 && (
                <div className="border border-white/15 rounded-md p-4 bg-white/5">
                  <h4 className="text-sm font-semibold text-white mb-4">
                    Social Media Images ({socialMedia.length})
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {socialMedia.map((item) => (
                      <div key={item.id} className="relative group">
                        <div className="aspect-square bg-white/10 rounded overflow-hidden">
                          <img 
                            src={item.url} 
                            className="w-full h-full object-cover" 
                            loading="lazy"
                          />
                        </div>
                        {editing && (
                  <button 
                            onClick={() => handleDeleteMedia(item.id)}
                            className="absolute top-1 right-1 bg-red-500/70 text-white text-xs px-1.5 py-0.5 rounded hover:bg-red-500/90"
                            title="Delete"
                  >
                            ×
                  </button>
                        )}
                </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Catalog Images */}
              {catalog.length > 0 && (
                <div className="border border-white/15 rounded-md p-4 bg-white/5">
                  <h4 className="text-sm font-semibold text-white mb-4">
                    Catalog Images ({catalog.length})
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {catalog.map((item) => (
                      <div key={item.id} className="relative group">
                        <div className="aspect-square bg-white/10 rounded overflow-hidden">
                          <img 
                            src={item.url} 
                            className="w-full h-full object-cover" 
                            loading="lazy"
                          />
                        </div>
                        {editing && (
                      <button 
                            onClick={() => handleDeleteMedia(item.id)}
                            className="absolute top-1 right-1 bg-red-500/70 text-white text-xs px-1.5 py-0.5 rounded hover:bg-red-500/90"
                            title="Delete"
                          >
                            ×
                      </button>
                        )}
                    </div>
                  ))}
                </div>
              </div>
            )}

              {/* Media Upload Sections - Only show in edit mode */}
              {editing && canEdit && (
                <div className="space-y-4">
                  <div className="border border-white/15 rounded-md p-4 bg-white/5">
                    <h4 className="text-sm font-semibold text-white/70 mb-3">Upload Photo Gallery</h4>
                <MediaUploader 
                  carId={car.id} 
                      onUploaded={()=>refetchMedia()}
                      mediaKind="photo"
                      acceptedFormats="image/*"
                    />
                  </div>
                  
                  <div className="border border-white/15 rounded-md p-4 bg-white/5">
                    <h4 className="text-sm font-semibold text-white/70 mb-3">Upload Social Media Images</h4>
                    <MediaUploader 
                      carId={car.id} 
                      onUploaded={()=>refetchMedia()}
                      mediaKind="social_media"
                      acceptedFormats="image/*"
                    />
                  </div>
                  
                  <div className="border border-white/15 rounded-md p-4 bg-white/5">
                    <h4 className="text-sm font-semibold text-white/70 mb-3">Upload Catalog Image</h4>
                    <MediaUploader 
                      carId={car.id} 
                      onUploaded={()=>refetchMedia()}
                  mediaKind="catalog"
                  acceptedFormats="image/*"
                />
                  </div>
                </div>
              )}
              </div>
            )}

          {/* Documents Tab */}
          {activeTab === 'documents' && (
            <div className="space-y-6">
              {/* Document Upload */}
              <div className="border border-white/15 rounded-md p-4 bg-white/5">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-semibold text-white">Vehicle Documents</h4>
                  <DocUploader
                    carId={car.id}
                    variant="button"
                    buttonLabel="Upload"
                    onUploaded={async ()=>{
                      const { data: docRows } = await supabase.from('car_media').select('*').eq('car_id', car.id).order('created_at');
                      if(docRows) setMedia(docRows);
                    }}
                  />
                </div>
                
                {docs.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <h5 className="text-sm font-medium text-white/80">Uploaded Documents</h5>
                    {docs.map(doc => (
                      <div key={doc.id} className="flex items-center justify-between p-2 bg-black/30 rounded">
                        <span className="text-sm text-white/80">Document</span>
                        <div className="flex gap-2">
                          <a 
                            href={doc.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-sm text-gray-400 hover:text-white underline"
                          >
                            View
                          </a>
                          <a
                            href={`${doc.url}${doc.url.includes('?') ? '&' : '?'}download`}
                            download
                            className="text-sm text-gray-400 hover:text-white underline"
                          >
                            Download
                          </a>
                          {editing && (
                      <button 
                              onClick={() => handleDeleteMedia(doc.id)}
                              className="text-sm text-red-400 hover:text-red-300"
                      >
                              Delete
                      </button>
                          )}
                        </div>
                    </div>
                  ))}
              </div>
            )}
              </div>

              {/* Vehicle PDF */}
              <div className="border border-white/15 rounded-md p-4 bg-white/5">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-semibold text-white">Vehicle PDF</h4>
                  {canEdit && (car.status==='marketing' || car.status==='qc_ceo') && (
                    <button 
                      onClick={handleGeneratePdf} 
                      disabled={generating}
                      className="text-sm bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 h-9 min-w-[160px] rounded transition-colors disabled:opacity-50"
                    >
                      {generating ? (pdfUrl ? 'Regenerating…' : 'Generating…') : (pdfUrl ? 'Regenerate' : 'Generate')}
                    </button>
                  )}
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2 bg-black/30 rounded">
                    <span className="text-sm text-white/80">Vehicle Details PDF</span>
                    <div className="flex gap-2">
                      {pdfUrl && (
                        <>
                          <a
                            href={pdfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-gray-400 hover:text-white underline"
                          >
                            View
                          </a>
                          <a
                            href={`${pdfUrl}${pdfUrl.includes('?') ? '&' : '?'}download`}
                            download
                            className="text-sm text-gray-400 hover:text-white underline"
                          >
                            Download
                          </a>
                        </>
                      )}
                    </div>
                  </div>
                  {!pdfUrl && (
                    <p className="text-white/60 text-sm">No PDF generated yet</p>
                  )}
                  {statusMsg && (
                    <p className="text-sm text-white/70">{statusMsg}</p>
                  )}
                </div>
            </div>

              {/* Consignment Agreement - Only for consignment cars */}
              {localCar.ownership_type === 'consignment' && (
                <div className="border border-white/15 rounded-md p-4 bg-white/5">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-semibold text-white">Consignment Agreement</h4>
                  <button 
                    onClick={handleGenerateConsignmentAgreement} 
                      disabled={generatingAgreement}
                      className="text-sm bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 h-9 min-w-[160px] rounded transition-colors disabled:opacity-50"
                    >
                      {generatingAgreement ? 'Generating…' : 'Generate Agreement'}
                  </button>
                  </div>
                  {agreementStatusMsg && (
                    <p className="text-sm text-white/70">{agreementStatusMsg}</p>
                  )}
                    </div>
                  )}
              </div>
            )}

        </div>

        {/* Gallery Modal */}
        {showGallery && gallery.length > 0 && (
          createPortal(
            <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-[60] p-6">
              <div className="relative w-[90vw] h-[90vh] max-w-[1600px] max-h-[90vh] flex items-center justify-center">
                {/* Close */}
                <button
                  onClick={() => setShowGallery(false)}
                  className="absolute top-4 right-4 text-white/90 hover:text-white bg-white/10 rounded-full px-3 py-1"
                  aria-label="Close"
                >
                  Close
                </button>
                {/* Download current */}
                <a
                  href={`${getOriginalImageUrl(gallery[galleryIdx].url)}?download`}
                  className="absolute top-4 left-4 text-white/90 hover:text-white bg-white/10 rounded-full px-3 py-1"
                >
                  Download
                </a>
                {/* Media */}
                {gallery[galleryIdx] && (
                  <img 
                    src={getOriginalImageUrl(gallery[galleryIdx].url)} 
                    className="max-w-full max-h-full object-contain"
                    alt="Gallery image"
                  />
                )}
                {/* Arrows */}
                {gallery.length > 1 && (
                  <>
                    <button
                      onClick={() => setGalleryIdx(prev => prev > 0 ? prev - 1 : gallery.length - 1)}
                      className="absolute left-2 md:left-6 top-1/2 -translate-y-1/2 text-white/80 hover:text-white bg-white/20 hover:bg-white/30 rounded-full px-3 py-2 text-xl"
                      aria-label="Prev"
                    >
                      ‹
                    </button>
                    <button
                      onClick={() => setGalleryIdx(prev => prev < gallery.length - 1 ? prev + 1 : 0)}
                      className="absolute right-2 md:right-6 top-1/2 -translate-y-1/2 text-white/80 hover:text-white bg-white/20 hover:bg-white/30 rounded-full px-3 py-2 text-xl"
                      aria-label="Next"
                    >
                      ›
                    </button>
                  </>
                )}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/80 text-sm">
                  {galleryIdx + 1} / {gallery.length}
          </div>
        </div>
            </div>, document.body)
        )}
      </div>
    </div>
  );
} 
