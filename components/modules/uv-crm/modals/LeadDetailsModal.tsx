"use client";
import React, { useState, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { supabase } from '@/lib/supabaseClient';
import dayjs from 'dayjs';
import MatchingCarsList from '@/components/modules/uv-crm/components/MatchingCarsList';
import NotesTimeline, { NoteItem } from '@/components/shared/NotesTimeline';
import { useModulePermissions } from '@/lib/useModulePermissions';

interface Lead {
  id: string;
  status: string;
  full_name: string;
  phone_number: string;
  country_code: string;
  model_of_interest: string;
  max_age: string;
  payment_type: string;
  monthly_budget: number;
  total_budget: number;
  appointment_date: string;
  time_slot: string;
  notes: string;
  timeline_notes?: any[];
  created_at: string;
  updated_at: string;
  inventory_car_id?: string;
}

interface InventoryCar { id:string; stock_number:string; model_year:number; vehicle_model:string; advertised_price_aed:number; colour:string; }

interface LeadDetailsModalProps {
  mode: 'create' | 'edit';
  lead?: Lead; // Required for edit, optional for create
  onClose: () => void;
  onCreated?: (lead: Lead) => void; // For create mode
  onUpdated?: (lead: Lead) => void; // For edit mode
  onDeleted?: (leadId: string) => void; // For edit mode
  initialSelectedCarId?: string; // For create mode - preserve car selection
  onInventoryCarSelected?: (carId: string) => void; // Callback when car is selected
  isConverting?: boolean; // True when converting from new_lead to appointment
}

const models = [
  { id: "1", name: "A" }, { id: "2", name: "SLK" }, { id: "3", name: "C" }, { id: "4", name: "CLA" },
  { id: "5", name: "CLK" }, { id: "6", name: "E" }, { id: "7", name: "CLS" }, { id: "8", name: "S" },
  { id: "9", name: "CL" }, { id: "10", name: "G" }, { id: "11", name: "GLA" }, { id: "12", name: "GLB" },
  { id: "13", name: "GLK" }, { id: "14", name: "GLC" }, { id: "15", name: "ML" }, { id: "16", name: "GLE" },
  { id: "17", name: "GL" }, { id: "18", name: "GLS" }, { id: "19", name: "V" }, { id: "20", name: "SLC" },
  { id: "21", name: "SL" }, { id: "22", name: "SLS" }, { id: "23", name: "AMG GT 2-DR" },
  { id: "24", name: "AMG GT 4-DR" }, { id: "25", name: "SLR" }, { id: "26", name: "Maybach" }, { id: "27", name: "CLE" }
];

const statusOptions = [
  { value: 'new_lead', label: 'New Lead' },
  { value: 'new_customer', label: 'New Appointment' },
  { value: 'negotiation', label: 'Negotiation' },
  { value: 'won', label: 'Won' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'lost', label: 'Lost' },
];

const generateTimeSlots = () => {
  const slots = [];
  for (let hour = 8; hour <= 20; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      const time24 = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      const hour12 = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayTime = `${hour12}:${minute.toString().padStart(2, '0')} ${ampm}`;
      slots.push({ value: time24, label: displayTime });
      if (hour === 20 && minute === 0) break;
    }
  }
  return slots;
};

// Icon components
const UserIcon = () => <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>;
const PhoneIcon = () => <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>;
const StatusIcon = () => <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const CarIcon = () => <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 13l2-5h14l2 5M5 13v5a1 1 0 001 1h1a1 1 0 001-1v-1h8v1a1 1 0 001 1h1a1 1 0 001-1v-5"/></svg>;
const CalendarIcon = () => <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>;
const ClockIcon = () => <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const CurrencyIcon = () => <span className="w-3.5 h-3.5 font-bold text-[10px] flex items-center justify-center">د.إ</span>;

// Unified editable field component - looks like text, editable on focus
const EditableField = ({ 
  label, 
  children,
  className = "",
  noFlex = false
}: { 
  label: string; 
  children: React.ReactNode;
  className?: string;
  noFlex?: boolean;
}) => (
  <div className={`${noFlex ? '' : 'flex-1'} min-w-0 ${className}`}>
    <span className="text-[10px] font-medium text-white/50 uppercase tracking-wide block mb-1">{label}</span>
    {children}
  </div>
);

// Always-editable input styles - dark background like dropdowns
const editableInputClass = `
  w-full px-3 py-2 text-sm font-medium text-white
  bg-black/40 border border-white/10 rounded-lg
  hover:bg-black/50 hover:border-white/20
  focus:bg-black/60 focus:border-white/30 focus:ring-1 focus:ring-white/20
  focus:outline-none transition-all duration-150
  placeholder-white/40
`.replace(/\s+/g, ' ').trim();

const editableSelectClass = `
  w-full px-3 py-2 text-sm font-medium text-white
  bg-black/40 border border-white/10 rounded-lg
  hover:bg-black/50 hover:border-white/20
  focus:bg-black/60 focus:border-white/30 focus:ring-1 focus:ring-white/20
  focus:outline-none transition-all duration-150
  appearance-none cursor-pointer
`.replace(/\s+/g, ' ').trim();

// Static display for non-editable values
const StaticValue = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`px-2 py-1.5 text-sm font-medium text-white/60 ${className}`}>{children}</div>
);

// Default empty lead for create mode
const emptyLead: Lead = {
  id: '',
  status: 'new_lead',
  full_name: '',
  phone_number: '',
  country_code: '+971',
  model_of_interest: '',
  max_age: '1yr',
  payment_type: 'monthly',
  monthly_budget: 0,
  total_budget: 0,
  appointment_date: '',
  time_slot: '',
  notes: '',
  timeline_notes: [],
  created_at: '',
  updated_at: '',
  inventory_car_id: '',
};

export default function LeadDetailsModal({ 
  mode, 
  lead: propLead, 
  onClose, 
  onCreated, 
  onUpdated, 
  onDeleted,
  initialSelectedCarId = '',
  onInventoryCarSelected,
  isConverting = false
}: LeadDetailsModalProps) {
  const isCreateMode = mode === 'create';
  const lead = propLead || emptyLead;
  
  const [loading, setLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const { canEdit: permCanEdit, canDelete, isLoading: permLoading } = useModulePermissions('uv_crm');
  
  // Always allow editing while permissions are loading to prevent layout shift
  // Once loaded, use actual permission
  const canEdit = permLoading ? true : permCanEdit;
  
  const [formData, setFormData] = useState({
    full_name: lead.full_name,
    country_code: lead.country_code || '+971',
    phone_number: lead.phone_number,
    model_of_interest: lead.model_of_interest,
    max_age: lead.max_age || '1yr',
    payment_type: lead.payment_type || 'monthly',
    monthly_budget: lead.monthly_budget?.toString() || '',
    total_budget: lead.total_budget?.toString() || '',
    appointment_date: lead.appointment_date || '',
    time_slot: lead.time_slot ? lead.time_slot.slice(0,5) : '',
    status: lead.status || 'new_lead',
  });

  const timeSlots = generateTimeSlots();
  const [inventoryCars,setInventoryCars] = useState<InventoryCar[]>([]);
  const [thumbs,setThumbs] = useState<Record<string,string>>({});
  const [selectedCarId,setSelectedCarId] = useState<string>(
    isCreateMode ? (initialSelectedCarId || '') : (lead.inventory_car_id || '')
  );
  const [notesArray, setNotesArray] = useState<NoteItem[]>([]);
  const [savingNote, setSavingNote] = useState(false);
  const [showCarPicker,setShowCarPicker] = useState(false);

  // Update parent when car selection changes (for create mode)
  useEffect(() => {
    if (isCreateMode && onInventoryCarSelected) {
      onInventoryCarSelected(selectedCarId);
    }
  }, [selectedCarId, isCreateMode, onInventoryCarSelected]);

  // Track changes (only in edit mode)
  useEffect(() => {
    if (isCreateMode) {
      // In create mode, always show save button if required fields are filled
      const requiredFilled = formData.full_name.trim() && formData.phone_number.trim() && formData.model_of_interest;
      const budgetValid = formData.payment_type === 'monthly' 
        ? Number(formData.monthly_budget) > 0 
        : Number(formData.total_budget) > 0;
      setHasChanges(!!requiredFilled && budgetValid);
    } else {
      const changed = 
        formData.full_name !== lead.full_name ||
        formData.country_code !== (lead.country_code || '+971') ||
        formData.phone_number !== lead.phone_number ||
        formData.model_of_interest !== lead.model_of_interest ||
        formData.max_age !== lead.max_age ||
        formData.payment_type !== lead.payment_type ||
        formData.monthly_budget !== (lead.monthly_budget?.toString() || '') ||
        formData.total_budget !== (lead.total_budget?.toString() || '') ||
        formData.appointment_date !== (lead.appointment_date || '') ||
        formData.time_slot !== (lead.time_slot ? lead.time_slot.slice(0,5) : '') ||
        formData.status !== lead.status ||
        selectedCarId !== (lead.inventory_car_id || '');
      setHasChanges(changed);
    }
  }, [formData, selectedCarId, lead, isCreateMode]);

  useEffect(() => {
    if (!isCreateMode && lead.timeline_notes && Array.isArray(lead.timeline_notes)) {
      const formattedNotes = lead.timeline_notes.map((note: any) => ({
        ts: note.ts || note.timestamp || new Date().toISOString(),
        text: note.text || '',
        user: note.user || note.author || 'System'
      }));
      setNotesArray(formattedNotes);
    } else {
      setNotesArray([]);
    }
  }, [lead.id, lead.timeline_notes, lead.status, isCreateMode]);

  useEffect(()=>{
    async function loadCars(){
      const { data } = await supabase.from('cars').select('id,stock_number,model_year,vehicle_model,advertised_price_aed,colour').eq('status','inventory').eq('sale_status','available').order('advertised_price_aed', { ascending: true });
      setInventoryCars(data as any[]||[]);
      const ids = (data||[]).map((c:any)=>c.id);
      if(ids.length){
        const { data: mediaRows } = await supabase.from('car_media').select('car_id,url').eq('is_primary',true).eq('kind','photo').in('car_id',ids);
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
    loadCars();
    const handlePrimaryPhotoChange = () => loadCars();
    window.addEventListener('primaryPhotoChanged', handlePrimaryPhotoChange);
    return () => window.removeEventListener('primaryPhotoChanged', handlePrimaryPhotoChange);
  },[]);

  const handleCreate = async () => {
    setLoading(true);
    try {
      const leadData = {
        full_name: formData.full_name.trim(),
        country_code: formData.country_code,
        phone_number: formData.phone_number.trim(),
        status: formData.status,
        model_of_interest: formData.model_of_interest,
        max_age: formData.max_age,
        payment_type: formData.payment_type,
        monthly_budget: formData.payment_type === 'monthly' ? parseInt(formData.monthly_budget) || 0 : 0,
        total_budget: formData.payment_type === 'cash' ? parseInt(formData.total_budget) || 0 : 0,
        appointment_date: formData.appointment_date || null,
        time_slot: formData.time_slot || null,
        timeline_notes: notesArray,
        inventory_car_id: selectedCarId || null,
      };

      const { data, error } = await supabase
        .from('leads')
        .insert([leadData])
        .select()
        .single();
      
      if (error) throw error;
      onCreated?.(data);
      onClose();
    } catch (error: any) {
      alert('Error creating lead: ' + (error?.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!hasChanges || isCreateMode) return;
    setLoading(true);
    try {
      // When converting to appointment, auto-set status to new_customer if date/time is set
      let finalStatus = formData.status;
      if (isConverting && formData.appointment_date && formData.time_slot) {
        finalStatus = 'new_customer';
      }
      
      const { data, error } = await supabase
        .from('leads')
        .update({
          full_name: formData.full_name.trim(),
          country_code: formData.country_code,
          phone_number: formData.phone_number.trim(),
          model_of_interest: formData.model_of_interest,
          max_age: formData.max_age,
          payment_type: formData.payment_type,
          monthly_budget: formData.payment_type === 'monthly' ? parseInt(formData.monthly_budget) || 0 : 0,
          total_budget: formData.payment_type === 'cash' ? parseInt(formData.total_budget) || 0 : 0,
          appointment_date: formData.appointment_date || null,
          time_slot: formData.time_slot || null,
          status: finalStatus,
          inventory_car_id: selectedCarId||null,
        })
        .eq('id', lead.id)
        .select()
        .single();
      if (error) throw error;
      onUpdated?.(data);
      setHasChanges(false);
      // Close modal after successful conversion
      if (isConverting) {
        onClose();
      }
    } catch (error) {
      alert('Error updating lead. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this lead?')) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('leads').delete().eq('id', lead.id);
      if (error) throw error;
      onDeleted?.(lead.id);
    } catch (error) {
      alert('Error deleting lead. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleNoteAdded = async (note: NoteItem) => {
    const updatedNotes = [note, ...notesArray];
    setNotesArray(updatedNotes);
    
    // In create mode, just update local state (will be saved with lead)
    if (isCreateMode) return;
    
    // In edit mode, save immediately
    setSavingNote(true);
    try {
      const { data, error } = await supabase
        .from('leads')
        .update({ timeline_notes: updatedNotes, updated_at: new Date().toISOString() })
        .eq('id', lead.id)
        .select()
        .single();
      if (error) throw error;
      onUpdated?.(data);
    } catch (error: any) {
      setNotesArray(notesArray);
      alert(`Failed to save note: ${error?.message || 'Unknown error'}`);
    } finally {
      setSavingNote(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const upper = ['full_name','model_of_interest','max_age','country_code','phone_number'].includes(name) ? value.toUpperCase() : value;
    setFormData(prev => ({ ...prev, [name]: upper }));
  };


  const linkedCar = inventoryCars.find(c => c.id === selectedCarId);

  // Validation for create mode
  const isFormValid = formData.full_name.trim() && 
    formData.phone_number.trim() && 
    formData.model_of_interest &&
    (formData.payment_type === 'monthly' ? Number(formData.monthly_budget) > 0 : Number(formData.total_budget) > 0);

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
      <div className="bg-zinc-900/95 border border-white/10 rounded-xl shadow-2xl overflow-hidden w-full max-w-4xl h-[85vh] flex flex-col animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand/30 to-brand/10 flex items-center justify-center border border-brand/20">
              <span className="text-brand font-semibold text-sm">
                {isCreateMode ? '+' : (formData.full_name?.charAt(0) || '?')}
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-white">
                  {isCreateMode ? 'New Lead' : (formData.full_name || lead.full_name)}
                </h2>
                {!isCreateMode && hasChanges && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse">
                    Unsaved
                  </span>
                )}
              </div>
              <p className="text-xs text-white/50 flex items-center gap-1.5">
                {isCreateMode ? (
                  'Fill in the details below'
                ) : (
                  <><PhoneIcon /> {formData.country_code} {formData.phone_number}</>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Create Button */}
            {isCreateMode && canEdit && (
              <button 
                onClick={handleCreate} 
                disabled={loading || !isFormValid} 
                className="px-4 py-1.5 bg-brand hover:bg-brand/90 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating...' : 'Create Lead'}
              </button>
            )}
            
            {/* Save Changes Button - only in edit mode */}
            {!isCreateMode && canEdit && hasChanges && (
              <button 
                onClick={handleSave} 
                disabled={loading} 
                className="px-3 py-1.5 bg-brand hover:bg-brand/90 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            )}
            
            {/* Delete Button - only in edit mode */}
            {!isCreateMode && canDelete && (
              <button 
                onClick={handleDelete} 
                disabled={loading} 
                className="px-3 py-1.5 bg-white/5 hover:bg-red-500/20 hover:text-red-400 border border-white/10 text-white/70 text-xs rounded-lg transition-colors"
              >
                Delete
              </button>
            )}
            
            <button onClick={onClose} className="ml-2 p-1.5 text-white/50 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Lead Details */}
          <div className="flex-1 flex">
            {/* Main Form/Details */}
            <div className="flex-1 p-5 flex flex-col gap-4 overflow-hidden">
                
                {/* Section 1: Customer Details */}
                <div className={`bg-white/5 rounded-xl p-4 border border-white/10 ${isCreateMode ? 'flex-[1.2]' : 'flex-[1]'} min-h-[140px] overflow-hidden`}>
                  <h3 className="text-[10px] font-semibold text-white/40 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <UserIcon /> Customer Details
                    {/* Show status badge for create mode */}
                    {isCreateMode && (
                      <span className="ml-auto px-2 py-0.5 rounded-full text-[10px] font-medium bg-brand/20 text-brand border border-brand/30">
                        New Lead
                      </span>
                    )}
                  </h3>
                  
                  {/* Vertical stacked layout for all modes */}
                  <div className="space-y-3">
                    {/* Full Name - full width */}
                    <EditableField label="Full Name">
                      {canEdit ? (
                        <input 
                          name="full_name" 
                          value={formData.full_name} 
                          onChange={handleChange} 
                          className={`${editableInputClass} uppercase`} 
                          placeholder="Enter customer name..."
                        />
                      ) : (
                        <StaticValue>{lead.full_name || '—'}</StaticValue>
                      )}
                    </EditableField>
                    
                    {/* Country Code + Phone Number + Status - side by side */}
                    <div className="flex gap-2 items-end flex-wrap">
                      <EditableField label="Code" className="w-[70px] flex-shrink-0" noFlex>
                        {canEdit ? (
                          <input 
                            name="country_code" 
                            value={formData.country_code} 
                            onChange={handleChange} 
                            className={`${editableInputClass} font-mono text-center`} 
                          />
                        ) : (
                          <StaticValue>{lead.country_code || '—'}</StaticValue>
                        )}
                      </EditableField>
                      
                      <EditableField label="Phone Number" className="flex-1 min-w-[120px]">
                        {canEdit ? (
                          <input 
                            name="phone_number" 
                            value={formData.phone_number} 
                            onChange={handleChange} 
                            className={editableInputClass} 
                            placeholder="Phone number..."
                          />
                        ) : (
                          <StaticValue>{lead.phone_number || '—'}</StaticValue>
                        )}
                      </EditableField>
                      
                      {/* Status - only show in edit mode */}
                      {!isCreateMode && (
                        <EditableField label="Status" className="w-[140px] flex-shrink-0" noFlex>
                          {canEdit ? (
                            <div className="relative">
                              <select 
                                name="status" 
                                value={formData.status} 
                                onChange={handleChange} 
                                className={editableSelectClass}
                              >
                                {statusOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                              </select>
                              <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-white/40">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                              </div>
                            </div>
                          ) : (
                            <StaticValue>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-brand/20 text-brand">
                                {statusOptions.find(s => s.value === lead.status)?.label || lead.status}
                              </span>
                            </StaticValue>
                          )}
                        </EditableField>
                      )}
                    </div>
                  </div>
                </div>

                {/* Section 2: Vehicle Interest */}
                <div className={`bg-white/5 rounded-xl p-4 border border-white/10 ${isCreateMode ? 'flex-[1.6]' : 'flex-[1.4]'} min-h-[160px]`}>
                  <h3 className="text-[10px] font-semibold text-white/40 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <CarIcon /> Vehicle Interest
                  </h3>
                  
                  {/* Compact 2-column layout */}
                  <div className="space-y-3 mb-4">
                    {/* Row 1: Model of Interest + Max Age */}
                    <div className="grid grid-cols-2 gap-4">
                      <EditableField label="Model of Interest">
                        {canEdit ? (
                          <div className="relative">
                            <select 
                              name="model_of_interest" 
                              value={formData.model_of_interest} 
                              onChange={handleChange} 
                              className={editableSelectClass}
                            >
                              <option value="">Select model...</option>
                              {models.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
                            </select>
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-white/40">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                            </div>
                          </div>
                        ) : (
                          <StaticValue>{lead.model_of_interest || '—'}</StaticValue>
                        )}
                      </EditableField>
                      
                      <EditableField label="Max Age">
                        {canEdit ? (
                          <div className="relative">
                            <select 
                              name="max_age" 
                              value={formData.max_age} 
                              onChange={handleChange} 
                              className={editableSelectClass}
                            >
                              {[1,2,3,4,5,6,7,8,9,10].map(y => <option key={y} value={`${y}yr${y>1?'s':''}`}>{y}yr{y>1?'s':''}</option>)}
                            </select>
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-white/40">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                            </div>
                          </div>
                        ) : (
                          <StaticValue>{lead.max_age || '—'}</StaticValue>
                        )}
                      </EditableField>
                    </div>
                    
                    {/* Row 2: Payment Type + Budget */}
                    <div className="grid grid-cols-2 gap-4">
                      <EditableField label="Payment Type">
                        {canEdit ? (
                          <div className="relative">
                            <select 
                              name="payment_type" 
                              value={formData.payment_type} 
                              onChange={handleChange} 
                              className={editableSelectClass}
                            >
                              <option value="monthly">Monthly</option>
                              <option value="cash">Cash</option>
                            </select>
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-white/40">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                            </div>
                          </div>
                        ) : (
                          <StaticValue className="capitalize">{lead.payment_type || '—'}</StaticValue>
                        )}
                      </EditableField>
                      
                      <EditableField label={formData.payment_type === 'monthly' ? 'Budget/mo' : 'Total Budget'}>
                        {canEdit ? (
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 text-xs">AED</span>
                            <input 
                              type="number" 
                              name={formData.payment_type === 'monthly' ? 'monthly_budget' : 'total_budget'} 
                              value={formData.payment_type === 'monthly' ? formData.monthly_budget : formData.total_budget} 
                              onChange={handleChange} 
                              className={`${editableInputClass} pl-11 text-emerald-400`}
                              placeholder="0"
                            />
                          </div>
                        ) : (
                          <StaticValue className="text-emerald-400">
                            {lead.payment_type === 'monthly' 
                              ? (lead.monthly_budget ? `AED ${lead.monthly_budget.toLocaleString()}/mo` : 'Not set')
                              : (lead.total_budget ? `AED ${lead.total_budget.toLocaleString()}` : 'Not set')
                            }
                          </StaticValue>
                        )}
                      </EditableField>
                    </div>
                  </div>
                  
                  {/* Inventory Car */}
                  <div>
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className="text-white/50"><CarIcon /></span>
                      <span className="text-[10px] font-medium text-white/50 uppercase tracking-wide">Linked Vehicle</span>
                      {canEdit && <span className="text-[10px] text-white/30">(drag from matching or click to select)</span>}
                    </div>
                    
                    {canEdit && showCarPicker && (
                      <div className="mb-3 bg-black/40 border border-white/10 rounded-lg p-3 max-h-48 overflow-y-auto">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-xs font-medium text-white">Select Vehicle</span>
                          <button onClick={() => setShowCarPicker(false)} className="text-white/50 hover:text-white">×</button>
                        </div>
                        <div className="space-y-1.5">
                          {inventoryCars.map(car => (
                            <div key={car.id} onClick={() => { setSelectedCarId(car.id); setShowCarPicker(false); }} className="flex items-center gap-2 p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg cursor-pointer transition-colors">
                              <div className="w-14 h-10 bg-black/40 rounded overflow-hidden flex-shrink-0">
                                {thumbs[car.id] && <img src={thumbs[car.id]} className="w-full h-full object-cover" alt="" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-xs font-semibold text-white truncate">{car.stock_number}</div>
                                <div className="text-[10px] text-white/60">{car.model_year} {car.vehicle_model}</div>
                              </div>
                              <div className="text-xs font-semibold text-emerald-400">AED {car.advertised_price_aed?.toLocaleString()}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <div
                      onDragOver={canEdit ? (e) => { e.preventDefault(); } : undefined}
                      onDrop={canEdit ? (e) => { e.preventDefault(); const id = e.dataTransfer.getData('text/plain'); if (id) setSelectedCarId(id); } : undefined}
                      onClick={canEdit && !selectedCarId ? () => setShowCarPicker(!showCarPicker) : undefined}
                      className={`flex items-center h-16 px-4 gap-4 rounded-lg border-2 border-dashed transition-all ${
                        linkedCar ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-white/20 bg-white/5'
                      } ${canEdit && !selectedCarId ? 'cursor-pointer hover:border-white/30 hover:bg-white/10' : ''}`}
                    >
                      {linkedCar ? (
                        <>
                          <div className="w-14 h-12 bg-black/40 rounded overflow-hidden flex-shrink-0">
                            {thumbs[linkedCar.id] && <img src={thumbs[linkedCar.id]} className="w-full h-full object-cover" alt="" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold text-white">{linkedCar.stock_number}</div>
                            <div className="text-xs text-white/60">{linkedCar.model_year} {linkedCar.vehicle_model}</div>
                          </div>
                          <div className="text-sm font-semibold text-emerald-400">AED {linkedCar.advertised_price_aed?.toLocaleString()}</div>
                          {canEdit && (
                            <button type="button" onClick={(e) => { e.stopPropagation(); setSelectedCarId(''); }} className="p-1 text-white/50 hover:text-white hover:bg-white/10 rounded transition-colors">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                          )}
                        </>
                      ) : (
                        <span className="text-sm text-white/40">{canEdit ? 'Drag a car here or click to select' : 'Not linked to inventory'}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Appointment placeholder for new_lead status */}
                {!isCreateMode && !isConverting && formData.status === 'new_lead' && (
                  <div className="bg-white/5 rounded-xl p-4 border border-white/10 border-dashed flex-[0.5] min-h-[80px]">
                    <div className="h-full flex flex-col items-center justify-center text-center">
                      <CalendarIcon />
                      <p className="text-sm text-white/40 mt-2">Appointment Scheduling</p>
                      <p className="text-xs text-white/30 mt-1">
                        Drag this lead to <span className="text-brand font-medium">New Appointment</span> column<br />
                        to set date and time
                      </p>
                    </div>
                  </div>
                )}

                {/* Section 3: Appointment - Show when converting OR not new_lead */}
                {!isCreateMode && (isConverting || formData.status !== 'new_lead') && (
                  <div className="bg-white/5 rounded-xl p-4 border border-white/10 flex-[0.5] min-h-[80px]">
                    <h3 className="text-[10px] font-semibold text-white/40 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <CalendarIcon /> Appointment
                    </h3>
                    <div className="grid grid-cols-3 gap-4">
                      <EditableField label="Date">
                        {canEdit ? (
                          <DatePicker
                            selected={formData.appointment_date ? new Date(formData.appointment_date) : null}
                            onChange={(d) => handleChange({target:{name:'appointment_date',value:d ? dayjs(d as Date).format('YYYY-MM-DD') : ''}} as any)}
                            dateFormat="dd/MM/yyyy"
                            popperPlacement="top-start"
                            className={editableInputClass}
                            wrapperClassName="w-full"
                            placeholderText="Select date..."
                            isClearable
                          />
                        ) : (
                          <StaticValue>
                            {lead.appointment_date ? dayjs(lead.appointment_date).format('DD MMM YYYY') : 'Not set'}
                          </StaticValue>
                        )}
                      </EditableField>
                      
                      <EditableField label="Time">
                        {canEdit ? (
                          <div className="relative">
                            <select 
                              name="time_slot" 
                              value={formData.time_slot} 
                              onChange={handleChange} 
                              className={editableSelectClass}
                            >
                              <option value="">Not set</option>
                              {timeSlots.map(slot => <option key={slot.value} value={slot.value}>{slot.label}</option>)}
                            </select>
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-white/40">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                            </div>
                          </div>
                        ) : (
                          <StaticValue>
                            {lead.time_slot ? (() => {
                              const [hour, minute] = lead.time_slot.split(':').map(Number);
                              if (isNaN(hour) || isNaN(minute)) return lead.time_slot;
                              const hour12 = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
                              const ampm = hour >= 12 ? 'PM' : 'AM';
                              return `${hour12}:${minute.toString().padStart(2, '0')} ${ampm}`;
                            })() : 'Not set'}
                          </StaticValue>
                        )}
                      </EditableField>
                      
                      <EditableField label="Created">
                        <StaticValue className="text-white/50">
                          {dayjs(lead.created_at).format('DD MMM YYYY')}
                        </StaticValue>
                      </EditableField>
                    </div>
                  </div>
                )}
            </div>

            {/* Right Side Panels */}
            <div className="w-72 flex-shrink-0 p-4 pl-0 flex flex-col gap-4 overflow-hidden">
              {/* Matching Inventory */}
              <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden flex-1 flex flex-col min-h-[200px]">
                <div className="px-4 py-3 border-b border-white/10 flex-shrink-0">
                  <h3 className="text-[10px] font-semibold text-white/60 uppercase tracking-widest flex items-center gap-2">
                    <CarIcon /> Matching Inventory
                  </h3>
                </div>
                <div className="flex-1 overflow-y-auto p-2">
                  <MatchingCarsList model={formData.model_of_interest} />
                </div>
              </div>

              {/* Timeline */}
              <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden flex-1 flex flex-col min-h-[200px]">
                <div className="px-4 py-3 border-b border-white/10 flex-shrink-0">
                  <h3 className="text-[10px] font-semibold text-white/60 uppercase tracking-widest flex items-center gap-2">
                    <ClockIcon /> Timeline
                    {savingNote && <span className="text-[10px] text-brand animate-pulse ml-auto">Saving...</span>}
                  </h3>
                </div>
                <div className="flex-1 overflow-y-auto p-2">
                  <NotesTimeline notes={notesArray} canEdit={true} onAdded={handleNoteAdded} />
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
