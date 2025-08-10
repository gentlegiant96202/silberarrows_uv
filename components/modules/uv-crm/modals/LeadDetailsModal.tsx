"use client";
import React, { useState, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { supabase } from '@/lib/supabaseClient';
import dayjs from 'dayjs';
import DocUploader from '@/components/modules/uv-crm/components/DocUploader';
import MatchingCarsList from '@/components/modules/uv-crm/components/MatchingCarsList';
import NotesTimeline, { NoteItem } from '@/components/shared/NotesTimeline';

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
  timeline_notes?: any[]; // New timeline notes field
  created_at: string;
  updated_at: string;
  inventory_car_id?: string;
}

interface InventoryCar { id:string; stock_number:string; model_year:number; vehicle_model:string; advertised_price_aed:number; colour:string; }

interface LeadDetailsModalProps {
  lead: Lead;
  onClose: () => void;
  onUpdated: (lead: Lead) => void;
  onDeleted: (leadId: string) => void;
}

// Mercedes-Benz models (hardcoded to match NewAppointmentModal)
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

const statusOptions = [
  { value: 'new_lead', label: 'New Lead' },
  { value: 'new_appointment', label: 'New Appointment' },
  { value: 'negotiation', label: 'Negotiation' },
  { value: 'won', label: 'Won' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'lost', label: 'Lost' },
];

// Generate 15-minute time slots from 8:00 AM to 8:00 PM
const generateTimeSlots = () => {
  const slots = [];
  for (let hour = 8; hour <= 20; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      const time24 = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      
      // Convert to 12-hour format for display
      const hour12 = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayTime = `${hour12}:${minute.toString().padStart(2, '0')} ${ampm}`;
      
      slots.push({ value: time24, label: displayTime });
      
      // Stop at 8:00 PM (don't add 8:15 PM, 8:30 PM, etc.)
      if (hour === 20 && minute === 0) break;
    }
  }
  return slots;
};

export default function LeadDetailsModal({ lead, onClose, onUpdated, onDeleted }: LeadDetailsModalProps) {
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    full_name: lead.full_name,
    country_code: lead.country_code || '+971',
    phone_number: lead.phone_number,
    model_of_interest: lead.model_of_interest,
    max_age: lead.max_age,
    payment_type: lead.payment_type,
    monthly_budget: lead.monthly_budget.toString(),
    total_budget: lead.total_budget.toString(),
    appointment_date: lead.appointment_date,
    time_slot: lead.time_slot ? lead.time_slot.slice(0,5) : '',
    status: lead.status,
  });

  const timeSlots = generateTimeSlots();

  const [inventoryCars,setInventoryCars] = useState<InventoryCar[]>([]);
  const [thumbs,setThumbs] = useState<Record<string,string>>({});
  const [selectedCarId,setSelectedCarId] = useState<string>(lead.inventory_car_id||'');

  // Timeline notes state - similar to ConsignmentDetailsModal
  const [notesArray, setNotesArray] = useState<NoteItem[]>([]);
  const [savingNote, setSavingNote] = useState(false);

  // Track if user manually selected a model from the fallback dropdown
  const [manualModelChosen,setManualModelChosen] = useState(false);

  // WhatsApp chat panel state
  const [showWhatsAppChat, setShowWhatsAppChat] = useState(false);

  // Unique list of models currently available in inventory (sorted)
  const uniqueInventoryModels = React.useMemo(()=>{
    const set = new Set<string>();
    inventoryCars.forEach(c=>set.add(c.vehicle_model));
    return Array.from(set).sort();
  },[inventoryCars]);

  // Helper to tokenize model names similar to MatchingCarsList logic
  const tokenizeModel = (modelStr:string)=>{
    const ignore = new Set(['DR','DOOR','DOORS']);
    return modelStr
      .toUpperCase()
      .split(/[\s-]+/)
      .filter(tok=>/^[A-Z]{2,}$/.test(tok)&&!ignore.has(tok));
  };

  // Determine if there are any inventory cars that strictly match every token
  const matchingCars = React.useMemo(()=>{
    if(!formData.model_of_interest) return [] as InventoryCar[];
    const tokens = tokenizeModel(formData.model_of_interest);
    if(tokens.length===0) return [] as InventoryCar[];
    return inventoryCars.filter(car=>tokens.every(tok=>car.vehicle_model.toUpperCase().includes(tok)));
  },[formData.model_of_interest,inventoryCars]);

  const [showCarPicker,setShowCarPicker] = useState(false);

  // Initialize timeline notes from lead data - refresh when lead changes
  useEffect(() => {
    if (lead.timeline_notes && Array.isArray(lead.timeline_notes)) {
      // timeline_notes is already a JSONB array, no need to parse
      const formattedNotes = lead.timeline_notes.map((note: any) => ({
        ts: note.ts || note.timestamp || new Date().toISOString(),
        text: note.text || '',
        user: note.user || note.author || 'System'
      }));
      setNotesArray(formattedNotes);
    } else {
      setNotesArray([]);
    }
  }, [lead.id, lead.timeline_notes, lead.status]); // React to lead changes including status

  useEffect(()=>{
    async function loadCars(){
              const { data } = await supabase.from('cars').select('id,stock_number,model_year,vehicle_model,advertised_price_aed,colour').eq('status','inventory').eq('sale_status','available').order('advertised_price_aed', { ascending: true });
      setInventoryCars(data as any[]||[]);
      const ids = (data||[]).map((c:any)=>c.id);
      if(ids.length){
        const { data: mediaRows } = await supabase.from('car_media').select('car_id,url').eq('is_primary',true).eq('kind','photo').in('car_id',ids);
        const map:Record<string,string> = {};
        (mediaRows||[]).forEach((m:any)=>{ map[m.car_id]=m.url; });
        setThumbs(map);
      }
    }
    loadCars();

    // Listen for custom primary photo change events
    const handlePrimaryPhotoChange = () => {
      console.log('Primary photo changed event received in LeadDetailsModal, reloading thumbnails...');
      loadCars();
    };
    
    window.addEventListener('primaryPhotoChanged', handlePrimaryPhotoChange);

    return () => { 
      window.removeEventListener('primaryPhotoChanged', handlePrimaryPhotoChange);
    };
  },[]);

  const handleUpdate = async (e?: React.FormEvent) => {
    if(e) e.preventDefault();
    setLoading(true);
    try {
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
          // Remove notes from update - timeline handles this separately
          status: formData.status,
          inventory_car_id: selectedCarId||null,
        })
        .eq('id', lead.id)
        .select()
        .single();

      if (error) throw error;
      
      onUpdated(data);
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating lead:', error);
      alert('Error updating lead. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this lead? This action cannot be undone.')) {
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('leads')
        .delete()
        .eq('id', lead.id);

      if (error) throw error;
      
      onDeleted(lead.id);
    } catch (error) {
      console.error('Error deleting lead:', error);
      alert('Error deleting lead. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Save notes immediately when timeline is updated - similar to ConsignmentDetailsModal
  const handleNoteAdded = async (note: NoteItem) => {
    const updatedNotes = [note, ...notesArray];
    setNotesArray(updatedNotes);
    setSavingNote(true);
    
    // Save to database immediately using timeline_notes JSONB column
    try {
      const { data, error } = await supabase
        .from('leads')
        .update({
          timeline_notes: updatedNotes,
          updated_at: new Date().toISOString()
        })
        .eq('id', lead.id)
        .select()
        .single();
      
      if (error) {
        console.error('Supabase error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        throw error;
      }
      
      // Update parent component with fresh data (parent will keep modal open)
      onUpdated(data);
      
    } catch (error: any) {
      console.error('Error saving note:', error);
      
      // Revert the state if save failed
      setNotesArray(notesArray);
      
      const errorMessage = error?.message || 'Unknown error occurred';
      alert(`Failed to save note: ${errorMessage}`);
    } finally {
      setSavingNote(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    // convert textual entries to uppercase except numbers/date/time
    const upper = ['full_name','model_of_interest','max_age','country_code','phone_number'].includes(name)
      ? value.toUpperCase()
      : value;
    setFormData(prev => ({ ...prev, [name]: upper }));
  };

  // No longer needed since we directly store model name

  const formatTimeForDisplay = (time24: string) => {
    if (!time24) return '';
    
    if (time24.includes('AM') || time24.includes('PM')) {
      return time24;
    }
    
    const [hour, minute] = time24.split(':').map(Number);
    if (isNaN(hour) || isNaN(minute)) return time24;
    
    const hour12 = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    const ampm = hour >= 12 ? 'PM' : 'AM';
    
    return `${hour12}:${minute.toString().padStart(2, '0')} ${ampm}`;
  };

  const formatBudget = (lead: Lead) => {
    if (lead.payment_type === 'monthly') {
      if (!lead.monthly_budget || lead.monthly_budget === 0) return "No monthly budget set";
      return `AED ${lead.monthly_budget.toLocaleString()}/mo`;
    } else {
      if (!lead.total_budget || lead.total_budget === 0) return "No total budget set";
      return `AED ${lead.total_budget.toLocaleString()}`;
    }
  };

  // Format phone number for WhatsApp chat URL
  const formatPhoneForWhatsApp = (phone: string) => {
    // Remove any spaces, dashes, or special characters except +
    return phone.replace(/[\s\-\(\)]/g, '');
  };

  // Generate WhatsApp chat URL with mobile parameters
  const whatsappChatUrl = `https://web.doubletick.io/conversations/97143805515/${formatPhoneForWhatsApp(lead.phone_number)}?mobile=true&view=compact`;

  // Toggle WhatsApp chat panel
  const toggleWhatsAppChat = () => {
    setShowWhatsAppChat(!showWhatsAppChat);
  };

  return (
    <>
      <style jsx>{`
        .chat-button-isolated {
          all: unset !important;
          box-sizing: border-box !important;
          display: inline-block !important;
          font-family: inherit !important;
        }
        .chat-button-isolated:focus,
        .chat-button-isolated:active,
        .chat-button-isolated:visited,
        .chat-button-isolated:target {
          background-color: ${showWhatsAppChat ? '#16a34a' : 'rgba(255, 255, 255, 0.05)'} !important;
          color: #ffffff !important;
          border: ${showWhatsAppChat ? '1px solid transparent' : '1px solid rgba(255, 255, 255, 0.1)'} !important;
          outline: none !important;
          box-shadow: none !important;
        }
      `}</style>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-2">
      <div className={`bg-black/40 backdrop-blur-xl border border-white/10 rounded-lg p-4 w-full text-xs relative max-h-[90vh] overflow-visible shadow-2xl transition-all duration-300 ${
        showWhatsAppChat ? 'max-w-[98vw] min-w-[98vw]' : 'max-w-3xl'
      }`}>
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-lg leading-none text-white/70 hover:text-white transition-colors z-10"
        >
          ×
        </button>
        
        {/* Header */}
        <div className="mb-3 pr-8">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h2 className="text-base font-semibold text-white mb-0.5">
                {isEditing ? 'Edit Lead' : 'Lead Details'}
              </h2>
              <p className="text-xs text-white/60">
                {isEditing ? 'Update lead information and appointment' : 'View and manage lead information'}
              </p>
            </div>
              <div className="flex gap-1.5 mt-1">
              {isEditing ? (
                <>
                  <button
                    onClick={handleUpdate}
                    className="px-2 py-1 bg-brand hover:bg-brand/90 focus:bg-brand/90 active:bg-brand text-white text-xs rounded transition-colors focus:outline-none focus:ring-2 focus:ring-brand/50"
                    disabled={loading}
                  >
                    Update
                  </button>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-2 py-1 bg-white/5 hover:bg-white/10 focus:bg-white/10 active:bg-white/15 backdrop-blur-sm border border-white/10 text-white text-xs rounded transition-all focus:outline-none focus:ring-2 focus:ring-white/20"
                    disabled={loading}
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                <button
                  type="button"
                  onClick={toggleWhatsAppChat}
                  className="chat-button-isolated"
                  style={{ 
                    padding: '4px 8px',
                    fontSize: '12px',
                    borderRadius: '4px',
                    transition: 'all 200ms',
                    cursor: 'pointer',
                    backgroundColor: showWhatsAppChat ? '#16a34a !important' : 'rgba(255, 255, 255, 0.05) !important',
                    color: showWhatsAppChat ? '#ffffff !important' : '#ffffff !important',
                    border: showWhatsAppChat ? '1px solid transparent !important' : '1px solid rgba(255, 255, 255, 0.1) !important',
                    backdropFilter: showWhatsAppChat ? 'none' : 'blur(12px)',
                    WebkitTapHighlightColor: 'transparent',
                    WebkitAppearance: 'none',
                    outline: 'none !important',
                    boxShadow: 'none !important',
                    position: 'relative',
                    zIndex: 9999
                  }}
                  onMouseEnter={(e) => {
                    const target = e.target as HTMLButtonElement;
                    target.style.backgroundColor = showWhatsAppChat ? '#15803d' : 'rgba(255, 255, 255, 0.1)';
                    if (!showWhatsAppChat) target.style.color = '#4ade80';
                  }}
                  onMouseLeave={(e) => {
                    const target = e.target as HTMLButtonElement;
                    target.style.backgroundColor = showWhatsAppChat ? '#16a34a' : 'rgba(255, 255, 255, 0.05)';
                    if (!showWhatsAppChat) target.style.color = '#ffffff';
                  }}
                  onFocus={(e) => {
                    const target = e.target as HTMLButtonElement;
                    target.style.backgroundColor = showWhatsAppChat ? '#15803d' : 'rgba(255, 255, 255, 0.1)';
                  }}
                  onBlur={(e) => {
                    const target = e.target as HTMLButtonElement;
                    target.style.backgroundColor = showWhatsAppChat ? '#16a34a' : 'rgba(255, 255, 255, 0.05)';
                  }}
                  title={showWhatsAppChat ? 'Hide WhatsApp Chat' : 'Show WhatsApp Chat'}
                >
                  💬 Chat
                </button>
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-2 py-1 bg-brand hover:bg-brand/90 focus:bg-brand/90 active:bg-brand text-white text-xs rounded transition-colors focus:outline-none focus:ring-2 focus:ring-brand/50"
                  disabled={loading}
                >
                  Edit
                </button>
                <button
                  onClick={handleDelete}
                  className="px-2 py-1 bg-white/5 hover:bg-white/10 focus:bg-white/10 active:bg-white/15 backdrop-blur-sm border border-white/10 text-white hover:text-white/80 focus:text-white/80 text-xs rounded transition-all focus:outline-none focus:ring-2 focus:ring-white/20"
                  disabled={loading}
                >
                  Delete
                </button>
                </>
              )}
              </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className={`flex gap-4 ${showWhatsAppChat ? 'h-[calc(90vh-120px)]' : ''}`}>
          {/* Left Panel - Lead Details */}
          <div className={`${showWhatsAppChat ? 'w-[736px] flex-shrink-0' : 'flex-1'} ${showWhatsAppChat ? 'overflow-y-auto' : ''}`}>
            {isEditing ? (
              <div className="flex flex-col sm:flex-row gap-4 sm:items-stretch">
            {/* Edit form */}
            <form onSubmit={handleUpdate} className="flex-1 flex flex-col space-y-3 overflow-y-auto pr-1">
            {/* Customer Information */}
            <div className="bg-white/5 backdrop-blur-sm rounded-lg p-2.5 border border-white/10">
              <div className="space-y-2.5">
                {/* Customer Name */}
                <div>
                  <label className="block text-xs font-medium text-white mb-1 flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Full Name
                  </label>
                  <input
                    name="full_name"
                    value={formData.full_name}
                    onChange={handleChange}
                      className="w-full px-2.5 py-1.5 text-xs rounded bg-black/20 border border-white/10 text-white placeholder-white/50 focus:outline-none focus:ring-1 focus:ring-white/30 focus:border-white/30 transition-all uppercase"
                    placeholder="Enter customer's full name"
                    required
                  />
                </div>

                {/* Customer Phone */}
                <div>
                  <label className="block text-xs font-medium text-white mb-1 flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    Phone Number
                  </label>
                  <div className="flex gap-1.5">
                    <select
                      name="country_code"
                      value={formData.country_code}
                      onChange={handleChange}
                      className="px-1.5 py-1.5 text-xs rounded bg-black/20 border border-white/10 text-white focus:outline-none focus:ring-1 focus:ring-white/30 focus:border-white/30 transition-all font-mono w-14 appearance-none"
                      style={{ backgroundImage: 'none' }}
                    >
                      {[
                        "+971","+91","+1","+44","+60","+61","+81","+49","+33","+966",
                        "+974","+973","+968","+965","+962","+63","+52","+7","+86","+82"
                      ].map(code => (
                        <option key={code} value={code}>{code}</option>
                      ))}
                    </select>
                    <input
                      name="phone_number"
                      value={formData.phone_number}
                      onChange={handleChange}
                        className="flex-1 px-2.5 py-1.5 text-xs rounded bg-black/20 border border-white/10 text-white placeholder-white/50 focus:outline-none focus:ring-1 focus:ring-white/30 focus:border-white/30 transition-all uppercase"
                      placeholder="Phone number"
                      required
                    />
                  </div>
                </div>

                {/* Status */}
                <div>
                  <label className="block text-xs font-medium text-white mb-1 flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Status
                  </label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    className="w-full px-2.5 py-1.5 text-xs rounded bg-black/20 border border-white/10 text-white focus:outline-none focus:ring-1 focus:ring-white/30 focus:border-white/30 transition-all appearance-none"
                    style={{ backgroundImage: 'none' }}
                  >
                    {statusOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Vehicle & Budget */}
            <div className="bg-white/5 backdrop-blur-sm rounded-lg p-2.5 border border-white/10">
              <div className="space-y-2.5">
                {/* Model of Interest */}
                <div>
                  <label className="block text-xs font-medium text-white mb-1 flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Model of Interest
                  </label>
                  <select
                    name="model_of_interest"
                    value={formData.model_of_interest}
                    onChange={handleChange}
                    className="w-full px-2.5 py-1.5 text-xs rounded bg-black/20 border border-white/10 text-white focus:outline-none focus:ring-1 focus:ring-white/30 focus:border-white/30 transition-all appearance-none"
                    style={{ backgroundImage: 'none' }}
                    required
                  >
                    <option value="">Choose model...</option>
                    {models.map(model => (
                      <option key={model.id} value={model.name}>
                        {model.name}
                      </option>
                    ))}
                  </select>
                </div>

                  {/* Inventory car drop zone with expanding section */}
                  <div>
                    <label className="block text-xs font-medium text-white mb-1 flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 13l2-5h14l2 5M5 13v5a1 1 0 001 1h1a1 1 0 001-1v-1h8v1a1 1 0 001 1h1a1 1 0 001-1v-5"/></svg>
                      Inventory Car <span className="text-white/40 font-normal">(drag or click)</span>
                    </label>
                    
                    {/* Expanding car picker section */}
                    {showCarPicker && (
                      <div className="mb-3 bg-black/30 border border-white/10 rounded-lg p-3 max-h-64 overflow-y-auto">
                        <div className="flex justify-between items-center mb-2">
                          <h4 className="text-xs font-semibold text-white">Select Inventory Car</h4>
                          <button 
                            onClick={() => setShowCarPicker(false)}
                            className="text-white/70 hover:text-white text-sm leading-none"
                          >
                            ×
                          </button>
                        </div>
                        <div className="space-y-2">
                          {inventoryCars.map(car=>(
                            <div 
                              key={car.id} 
                              onClick={()=>{setSelectedCarId(car.id); setShowCarPicker(false);}} 
                              className="bg-white/5 border border-white/10 rounded-lg p-2 text-xs text-white flex items-center gap-2 cursor-pointer hover:bg-white/10 transition-colors"
                            >
                              <div className="w-14 h-10 bg-white/10 flex-shrink-0 rounded overflow-hidden">
                                {thumbs[car.id] && <img src={thumbs[car.id]} className="w-full h-full object-cover"/>}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-[10px] font-semibold leading-tight truncate">
                                  {car.stock_number}
                                </div>
                                <div className="text-[9px] text-white/60 leading-tight truncate">
                                  {car.model_year} {car.vehicle_model}
                                </div>
                                <div className="text-[10px] font-semibold text-white mt-0.5">
                                  <span className="font-bold">AED</span> {car.advertised_price_aed?.toLocaleString()}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Drop zone */}
                    <div
                      onDragOver={(e)=>e.preventDefault()}
                      onDrop={(e)=>{ const id=e.dataTransfer.getData('text/plain'); if(id) setSelectedCarId(id);} }
                      className={`relative w-full h-12 flex items-center justify-start px-2 gap-2 rounded-lg border-2 border-dashed ${selectedCarId? 'border-green-500':'border-white/20'} bg-black/20 text-[10px] text-white/60 cursor-pointer transition-colors hover:border-white/30`}
                      onClick={()=>{
                        if(selectedCarId) return;
                        setShowCarPicker(!showCarPicker);
                      }}
                    >
                      {selectedCarId? (
                        <>
                          {(()=>{ 
                            const car = inventoryCars.find(c => c.id === selectedCarId); 
                            if (!car) return 'Selected'; 
                            return (
                              <div className="flex items-center gap-2">
                                <div className="w-12 h-10 bg-white/10 rounded overflow-hidden flex-shrink-0">
                                  {thumbs[selectedCarId] && <img src={thumbs[selectedCarId]} className="w-full h-full object-cover"/>}
                                </div>
                                <div className="text-[9px] leading-tight">
                                  {car.stock_number}<br/>
                                  {car.model_year} {car.vehicle_model}
                                </div>
                              </div>
                            );
                          })()}
                          <button 
                            type="button" 
                            onClick={(e)=>{ e.stopPropagation(); setSelectedCarId(''); }} 
                            className="absolute top-0.5 right-1 text-white/70 hover:text-white text-[10px] leading-none"
                          >
                            ×
                          </button>
                        </>
                      ) : (
                        <div className="flex items-center justify-between w-full">
                          <span>Drag a car here or click to select</span>
                          <svg 
                            className={`w-4 h-4 text-white/60 transition-transform ${showCarPicker ? 'rotate-180' : ''}`} 
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      )}
                    </div>
                  </div>

                {/* Year Range & Budget Type in row */}
                <div className="grid grid-cols-2 gap-1.5">
                  <div>
                    <label className="block text-xs font-medium text-white mb-1 flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Max Age
                    </label>
                    <select
                      name="max_age"
                      value={formData.max_age}
                      onChange={handleChange}
                      className="w-full px-2.5 py-1.5 text-xs rounded bg-black/20 border border-white/10 text-white focus:outline-none focus:ring-1 focus:ring-white/30 focus:border-white/30 transition-all appearance-none"
                      style={{ backgroundImage: 'none' }}
                      required
                    >
                      {[1,2,3,4,5,6,7,8,9,10].map(y => {
                        const label = `${y}yr${y>1 ? 's' : ''}`;
                        return (
                          <option key={y} value={label}>{label}</option>
                        );
                      })}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-white mb-1 flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                      </svg>
                      Payment
                    </label>
                    <select
                      name="payment_type"
                      value={formData.payment_type}
                      onChange={handleChange}
                      className="w-full px-2.5 py-1.5 text-xs rounded bg-black/20 border border-white/10 text-white focus:outline-none focus:ring-1 focus:ring-white/30 focus:border-white/30 transition-all appearance-none"
                      style={{ backgroundImage: 'none' }}
                    >
                      <option value="monthly">Monthly</option>
                      <option value="cash">Cash</option>
                    </select>
                  </div>
                </div>

                {/* Budget Inputs - Show different fields based on payment type */}
                {formData.payment_type === 'monthly' ? (
                  <div>
                    <label className="block text-xs font-medium text-white mb-1 flex items-center gap-1.5">
                      <span className="w-3.5 h-3.5 text-white font-bold text-xs flex items-center justify-center">د.إ</span>
                      Monthly Budget (AED)
                    </label>
                    <input
                      type="number"
                      name="monthly_budget"
                      min={1}
                      value={formData.monthly_budget}
                      onChange={handleChange}
                      className="w-full px-2.5 py-1.5 text-xs rounded bg-black/20 border border-white/10 text-white placeholder-white/50 focus:outline-none focus:ring-1 focus:ring-white/30 focus:border-white/30 transition-all"
                      placeholder="Enter monthly budget in AED"
                      required
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-medium text-white mb-1 flex items-center gap-1.5">
                      <span className="w-3.5 h-3.5 text-white font-bold text-xs flex items-center justify-center">د.إ</span>
                      Total Budget (AED)
                    </label>
                    <input
                      type="number"
                      name="total_budget"
                      min={1}
                      value={formData.total_budget}
                      onChange={handleChange}
                      className="w-full px-2.5 py-1.5 text-xs rounded bg-black/20 border border-white/10 text-white placeholder-white/50 focus:outline-none focus:ring-1 focus:ring-white/30 focus:border-white/30 transition-all"
                      placeholder="Enter total budget in AED"
                      required
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Appointment Details */}
            <div className="bg-white/5 backdrop-blur-sm rounded-lg p-2.5 border border-white/10">
              <div className="space-y-2.5">
                {/* Date and Time */}
                <div className="grid grid-cols-2 gap-1.5">
                  <div>
                    <label className="block text-xs font-medium text-white mb-1 flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Date
                    </label>
                    <DatePicker
                      selected={formData.appointment_date ? new Date(formData.appointment_date) : null}
                      onChange={(d)=>handleChange({target:{name:'appointment_date',value:dayjs(d as Date).format('YYYY-MM-DD')}} as any)}
                      dateFormat="dd/MM/yyyy"
                      popperPlacement="top-start"
                      className="w-full px-2.5 py-1.5 text-xs rounded bg-black/20 border border-white/10 text-white focus:outline-none focus:ring-1 focus:ring-white/30 focus:border-white/30 transition-all"
                      wrapperClassName="w-full"
                      required={formData.status === 'new_appointment'}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-white mb-1 flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Time Slot
                    </label>
                    <select
                      name="time_slot"
                      value={formData.time_slot}
                      onChange={handleChange}
                      className="w-full px-2.5 py-1.5 text-xs rounded bg-black/20 border border-white/10 text-white focus:outline-none focus:ring-1 focus:ring-white/30 focus:border-white/30 transition-all appearance-none"
                      style={{ backgroundImage: 'none' }}
                      required={formData.status === 'new_appointment'}
                    >
                      <option value="">No time set</option>
                      {timeSlots.map(slot => (
                        <option key={slot.value} value={slot.value}>
                          {slot.label}
                        </option>
                      ))}
                    </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Notes textarea removed; timeline used instead */}
            </form>

            {/* Timeline & Matching inventory column */}
            <div className="w-full sm:w-72 flex-shrink-0 flex flex-col gap-3 pr-1">
              {/* Matching inventory or fallback model chooser (edit mode only) */}
              <div className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 overflow-hidden flex-1">
                <div className="h-full overflow-y-auto p-1.5">
                  <MatchingCarsList model={isEditing ? formData.model_of_interest : lead.model_of_interest} />
                </div>
              </div>

              {/* Timeline panel */}
              <div className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 overflow-hidden flex-1">
                <div className="p-2.5 border-b border-white/10 flex-shrink-0">
                  <h3 className="text-xs font-semibold text-white flex items-center gap-1.5">
                    Timeline & Notes
                    {savingNote && (
                      <span className="text-[10px] text-blue-400 animate-pulse">Saving...</span>
                    )}
                  </h3>
                </div>
                <div className="p-2.5 overflow-y-auto scrollbar-hide" style={{ height: 'calc(100% - 40px)' }}>
                  <NotesTimeline 
                    notes={notesArray} 
                    canEdit={true} 
                    onAdded={handleNoteAdded} 
                  />
                </div>
              </div>
            </div>
            </div>
        ) : (
          <div className="flex flex-col sm:flex-row gap-4 sm:items-stretch">
            {/* Details Block */}
            <div className="flex-1 flex flex-col space-y-3 overflow-y-auto">
            {/* Customer Information - View Mode */}
            <div className="bg-white/5 backdrop-blur-sm rounded-lg p-2.5 border border-white/10">
              <div className="space-y-2.5">
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <svg className="w-3.5 h-3.5 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span className="text-xs font-medium text-white/60">Full Name</span>
                  </div>
                  <p className="text-sm text-white font-medium">{lead.full_name}</p>
                </div>

                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <svg className="w-3.5 h-3.5 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    <span className="text-xs font-medium text-white/60">Phone Number</span>
                  </div>
                  <p className="text-sm text-white">{lead.country_code} {lead.phone_number}</p>
                </div>

                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <svg className="w-3.5 h-3.5 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-xs font-medium text-white/60">Status</span>
                  </div>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-brand/20 text-brand">
                    {statusOptions.find(s => s.value === lead.status)?.label || lead.status}
                  </span>
                </div>
              </div>
            </div>

            {/* Vehicle & Budget - View Mode */}
            <div className="bg-white/5 backdrop-blur-sm rounded-lg p-2.5 border border-white/10">
              <div className="space-y-2.5">
                  {/* Model of Interest */}
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <svg className="w-3.5 h-3.5 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-xs font-medium text-white/60">Model of Interest</span>
                  </div>
                  <p className="text-sm text-white">{lead.model_of_interest}</p>
                </div>

                  {/* Inventory Car link */}
                  <div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <svg className="w-3.5 h-3.5 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 13l2-5h14l2 5M5 13v5a1 1 0 001 1h1a1 1 0 001-1v-1h8v1a1 1 0 001 1h1a1 1 0 001-1v-5"/></svg>
                      <span className="text-xs font-medium text-white/60">Inventory Car</span>
                    </div>
                    <div className={`w-full h-12 flex items-center justify-start px-2 gap-2 rounded border-2 border-dashed ${lead.inventory_car_id? 'border-green-500':'border-white/20'} bg-black/20 text-[10px] text-white/60`}>
                      {lead.inventory_car_id? (
                        (()=>{ const car=inventoryCars.find(c=>c.id===lead.inventory_car_id); if(!car) return 'Linked'; return (
                          <>
                            <div className="w-12 h-10 bg-white/10 rounded overflow-hidden flex-shrink-0">{thumbs[lead.inventory_car_id] && <img src={thumbs[lead.inventory_car_id]} className="w-full h-full object-cover"/>}</div>
                            <div className="text-[9px] leading-tight">{car.stock_number}<br/>{car.model_year} {car.vehicle_model}</div>
                          </>
                        );})()
                      ) : 'Not linked'}
                    </div>
                  </div>

                  {/* Year Range & Budget Type in row */}
                  <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <svg className="w-3.5 h-3.5 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="text-xs font-medium text-white/60">Max Age</span>
                    </div>
                    <p className="text-sm text-white">{lead.max_age}</p>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <svg className="w-3.5 h-3.5 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                      </svg>
                      <span className="text-xs font-medium text-white/60">Payment</span>
                    </div>
                    <p className="text-sm text-white capitalize">{lead.payment_type}</p>
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="w-3.5 h-3.5 text-white/60 font-bold text-xs flex items-center justify-center">د.إ</span>
                    <span className="text-xs font-medium text-white/60">Budget</span>
                  </div>
                  <p className="text-sm text-white">{formatBudget(lead)}</p>
                </div>
              </div>
            </div>

            {/* Appointment Details - View Mode */}
            <div className="bg-white/5 backdrop-blur-sm rounded-lg p-2.5 border border-white/10">
              <div className="space-y-2.5">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <svg className="w-3.5 h-3.5 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="text-xs font-medium text-white/60">Date</span>
                    </div>
                    <p className="text-sm text-white">{dayjs(lead.appointment_date).format('DD MMM YYYY')}</p>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <svg className="w-3.5 h-3.5 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-xs font-medium text-white/60">Time</span>
                    </div>
                    <p className="text-sm text-white">
                      {lead.time_slot ? formatTimeForDisplay(lead.time_slot) : 'No time set'}
                    </p>
                  </div>
                </div>

                  <div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <svg className="w-3.5 h-3.5 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-xs font-medium text-white/60">Created</span>
                    </div>
                    <p className="text-xs text-white/70">{dayjs(lead.created_at).format('DD MMM YYYY, HH:mm')}</p>
                  </div>
                </div>
              </div>

              {/* Notes moved to timeline */}
                  </div>

            {/* Timeline & Matching inventory on the right */}
            <div className="w-full sm:w-72 flex-shrink-0 flex flex-col gap-3 pr-1">
              {/* Matching inventory panel (view mode) */}
              <div className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 overflow-hidden flex-1">
                <div className="h-full overflow-y-auto p-1.5">
                  <MatchingCarsList model={lead.model_of_interest} />
                </div>
              </div>

              {/* Timeline panel */}
              <div className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 overflow-hidden flex-1">
                <div className="p-2.5 border-b border-white/10 flex-shrink-0">
                  <h3 className="text-xs font-semibold text-white flex items-center gap-1.5">
                    Timeline & Notes
                    {savingNote && (
                      <span className="text-[10px] text-blue-400 animate-pulse">Saving...</span>
                    )}
                  </h3>
                </div>
                <div className="p-2.5 overflow-y-auto scrollbar-hide" style={{ height: 'calc(100% - 40px)' }}>
                  <NotesTimeline 
                    notes={notesArray} 
                    canEdit={true} 
                    onAdded={handleNoteAdded} 
                  />
                </div>
              </div>
            </div>
          </div>
        )}
          </div>

          {/* Right Panel - WhatsApp Chat */}
          {showWhatsAppChat && (
            <div className="flex-[2] bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 overflow-hidden">
              <div className="bg-white/10 px-3 py-2 border-b border-white/10 flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs font-medium text-white">WhatsApp Chat</span>
                <span className="text-[10px] text-white/60 ml-auto">{formatPhoneForWhatsApp(lead.phone_number)}</span>
                
              </div>
                                            <div className="w-full" style={{ height: 'calc(100% - 48px)' }}>
                {/* Debug info display */}
                <div className="absolute top-2 left-2 z-10 bg-black/80 text-white text-[8px] px-1 py-0.5 rounded">
                  <div className="truncate">{whatsappChatUrl}</div>
                                     <div className="text-green-400">📐 75% scaled (134% content, 0.75 scale)</div>
                </div>
                
                <iframe
                  src={whatsappChatUrl}
                  className="w-full h-full bg-white border-0"
                  title="WhatsApp Chat"
                  allow="microphone; camera; geolocation"
                  sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
                  onLoad={() => {
                    console.log('WhatsApp iframe loaded - 75% scaled view');
                  }}
                  style={{
                    minHeight: '600px',
                    transform: 'scale(0.75)',
                    transformOrigin: 'top left',
                    width: '134%',
                    height: '134%'
                  }}
                />
                
                {/* Open in New Tab button */}
                <div className="absolute bottom-4 right-4 z-20">
                  <a
                    href={whatsappChatUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-gradient-to-br from-gray-300 via-gray-500 to-gray-700 hover:from-gray-200 hover:via-gray-400 hover:to-gray-600 text-white text-xs px-3 py-2 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2 backdrop-blur-sm border border-white/20"
                  >
                    🔗 <span>Open in New Tab</span>
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
    </>
  );
} 