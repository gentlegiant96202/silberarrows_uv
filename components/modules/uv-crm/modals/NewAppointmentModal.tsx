import React, { useState, useEffect } from "react";
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { supabase } from "@/lib/supabaseClient";
import MatchingCarsList from "@/components/modules/uv-crm/components/MatchingCarsList";
import NotesTimeline, { NoteItem } from '@/components/shared/NotesTimeline';
import dayjs from 'dayjs';

interface Props {
  onClose: () => void;
  onCreated: (lead: any) => void;
  mode?: 'create_lead' | 'convert_appointment';
  existingLead?: any; // For convert mode
  initialSelectedCarId?: string; // Preserve selected car across modal instances
  onInventoryCarSelected?: (carId: string) => void; // Callback to update parent state
}

interface InventoryCar {
  id:string;
  stock_number:string;
  model_year:number;
  vehicle_model:string;
  advertised_price_aed:number;
  colour:string;
}

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

export default function NewAppointmentModal({ onClose, onCreated, mode = 'create_lead', existingLead, initialSelectedCarId = "", onInventoryCarSelected }: Props) {
  const [fullName, setFullName] = useState(existingLead?.full_name || "");
  const [countryCode, setCountryCode] = useState(existingLead?.country_code || "+971");
  const [phoneNumber, setPhoneNumber] = useState(existingLead?.phone_number || "");
  const [modelOfInterest, setModelOfInterest] = useState<string>(existingLead?.model_of_interest || "");
  const [maxAge, setMaxAge] = useState(existingLead?.max_age || "1yr");
  const [paymentType, setPaymentType] = useState<"monthly" | "cash">(existingLead?.payment_type || "monthly");
  const [monthlyBudget, setMonthlyBudget] = useState(existingLead?.monthly_budget?.toString() || '');
  const [totalBudget, setTotalBudget] = useState(existingLead?.total_budget?.toString() || '');
  const [notesArray, setNotesArray] = useState<NoteItem[]>(existingLead?.timeline_notes || []);
  const [appointmentDate, setAppointmentDate] = useState<Date|null>(existingLead?.appointment_date ? new Date(existingLead.appointment_date) : null);
  const [timeSlot, setTimeSlot] = useState(existingLead?.time_slot || "");
  const [saving, setSaving] = useState(false);

  // inventory car picker
  const [inventoryCars,setInventoryCars] = useState<InventoryCar[]>([]);
  const [thumbs, setThumbs] = useState<Record<string,string>>({});
  const [showCarPicker, setShowCarPicker] = useState(false);
  
  // Determine initial car selection: prioritize existingLead data, then parent state
  const getInitialCarId = () => {
    if (mode === 'convert_appointment' && existingLead?.inventory_car_id) {
      return existingLead.inventory_car_id;
    }
    return initialSelectedCarId || "";
  };
  
  const [selectedCarId,setSelectedCarId] = useState<string>(getInitialCarId());

  // Update parent state when car selection changes
  const handleCarSelection = (carId: string) => {
    setSelectedCarId(carId);
    onInventoryCarSelected?.(carId);
  };

  // Sync local state when initial value changes (when switching between modal instances)
  useEffect(() => {
    const newCarId = getInitialCarId();
    setSelectedCarId(newCarId);
  }, [initialSelectedCarId, existingLead?.inventory_car_id, mode]);

  useEffect(()=>{
    // load cars currently in inventory & available
    async function loadCars(){
      const { data } = await supabase.from('cars').select('id,stock_number,model_year,vehicle_model,advertised_price_aed,colour').eq('status','inventory').eq('sale_status','available').order('advertised_price_aed', { ascending: true });
      setInventoryCars(data as any[]||[]);
      
      // Fetch thumbnails for the cars
      const ids = (data || []).map((c: any) => c.id);
      if (ids.length) {
        const { data: mediaRows } = await supabase
          .from('car_media')
          .select('car_id,url')
          .eq('is_primary', true)
          .eq('kind', 'photo')
          .in('car_id', ids);
        const map: Record<string,string> = {};
        (mediaRows || []).forEach((m: any) => { map[m.car_id] = m.url; });
        setThumbs(map);
      }
    }
    loadCars();

    // Listen for custom primary photo change events
    const handlePrimaryPhotoChange = () => {
      loadCars();
    };
    
    window.addEventListener('primaryPhotoChanged', handlePrimaryPhotoChange);

    return () => { 
      window.removeEventListener('primaryPhotoChanged', handlePrimaryPhotoChange);
    };
  },[]);

  const timeSlots = generateTimeSlots();

  // Mercedes-Benz models from database
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

  async function createLead(e: React.FormEvent) {
    e.preventDefault();
    
    // Basic validation for all modes
    if (!fullName.trim() || !phoneNumber.trim() || !modelOfInterest || (paymentType === 'monthly' && Number(monthlyBudget) <= 0) || (paymentType === 'cash' && Number(totalBudget) <= 0)) return;
    
    // Additional validation for convert_appointment mode
    if (mode === 'convert_appointment' && (!appointmentDate || !timeSlot)) {
      alert('Please select both date and time slot to schedule the appointment.');
      return;
    }
    
    setSaving(true);
    
    // Create lead object matching database schema
    const leadData = {
      full_name: fullName.trim(),
      country_code: countryCode,
      phone_number: phoneNumber.trim(),
      status: mode === 'create_lead' ? "new_lead" : "new_customer", // new_lead vs new_customer (appointment)
      model_of_interest: modelOfInterest,
      max_age: maxAge,
      payment_type: paymentType,
      monthly_budget: paymentType === 'monthly' ? Number(monthlyBudget) || 0 : 0,
      total_budget: paymentType === 'cash' ? Number(totalBudget) || 0 : 0,
      appointment_date: (mode === 'convert_appointment' && appointmentDate) ? dayjs(appointmentDate).format('YYYY-MM-DD') : null,
      time_slot: (mode === 'convert_appointment') ? timeSlot : null,
      timeline_notes: notesArray,
      inventory_car_id: selectedCarId||null,
    };
    
    try {
      if (mode === 'convert_appointment' && existingLead) {
        // Update existing lead to appointment
        const { data, error } = await supabase
          .from('leads')
          .update(leadData)
          .eq('id', existingLead.id)
          .select();
        
        if (error) {
          alert('Error converting lead: ' + error.message);
          setSaving(false);
          return;
        }
        
        if (data && data[0]) {
          onCreated(data[0]);
        }
      } else {
        // Create new lead
        const { data, error } = await supabase
          .from('leads')
          .insert([leadData])
          .select();
        
        if (error) {
          alert('Error creating lead: ' + error.message);
          setSaving(false);
          return;
        }
        
        if (data && data[0]) {
          onCreated(data[0]);
        }
      }
      
      onClose();
    } catch (error) {
      alert('Error processing lead. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-2">
      <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-lg p-4 w-full max-w-3xl text-xs relative max-h-[95vh] overflow-y-auto shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-xl leading-none text-white/70 hover:text-white transition-colors"
        >
          ×
        </button>
        
        {/* Header */}
        <div className="mb-3">
          <h2 className="text-base font-semibold text-white mb-0.5">
            {mode === 'create_lead' ? 'New Lead' : 'Schedule Appointment'}
          </h2>
          <p className="text-xs text-white/60">
            {mode === 'create_lead' 
              ? 'Create a new lead (appointment can be scheduled later)' 
              : 'Add appointment date and time to convert lead'
            }
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          {/* Lead form */}
          <form onSubmit={createLead} className="flex-1 flex flex-col overflow-y-auto pr-1">
          {/* Customer Information */}
          <div className="bg-white/5 backdrop-blur-sm rounded-lg p-2.5 border border-white/10 mb-3">
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
                  value={fullName}
                    onChange={e => setFullName(e.target.value.toUpperCase())}
                    className="w-full px-2.5 py-1.5 text-base rounded bg-black/20 border border-white/10 text-white placeholder-white/50 focus:outline-none focus:ring-1 focus:ring-white/30 focus:border-white/30 transition-all uppercase"
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
                  <input
                    value={countryCode}
                    onChange={e => setCountryCode(e.target.value)}
                    className="px-2.5 py-1.5 text-base rounded bg-black/20 border border-white/10 text-white focus:outline-none focus:ring-1 focus:ring-white/30 focus:border-white/30 transition-all font-mono w-20"
                    placeholder="+971"
                    required
                  />
                  <input
                    value={phoneNumber}
                      onChange={e => setPhoneNumber(e.target.value.toUpperCase())}
                      className="flex-1 px-2.5 py-1.5 text-base rounded bg-black/20 border border-white/10 text-white placeholder-white/50 focus:outline-none focus:ring-1 focus:ring-white/30 focus:border-white/30 transition-all uppercase"
                    placeholder="Phone number"
                    required
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Vehicle & Budget */}
          <div className="bg-white/5 backdrop-blur-sm rounded-lg p-2.5 border border-white/10 mb-3">
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
                  value={modelOfInterest}
                  onChange={e => setModelOfInterest(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-base rounded bg-black/20 border border-white/10 text-white focus:outline-none focus:ring-1 focus:ring-white/30 focus:border-white/30 transition-all appearance-none"
                  style={{ backgroundImage: 'none' }}
                  required
                >
                  <option value="" disabled>Choose your model...</option>
                  {models.map(m => (
                    <option key={m.id} value={m.name}>
                      {m.name}
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
                            onClick={()=>{handleCarSelection(car.id); setShowCarPicker(false);}} 
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
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const id = e.dataTransfer.getData('text/plain');
                      if (id) handleCarSelection(id);
                    }}
                    onTouchEnd={(e) => {
                      // Prevent default touch behaviors that might interfere
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    className={`relative w-full h-12 flex items-center justify-start px-2 gap-2 rounded-lg border-2 border-dashed ${selectedCarId? 'border-green-500':'border-white/20'} bg-black/20 text-[10px] text-white/60 cursor-pointer transition-colors hover:border-white/30 touch-manipulation`}
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
                          onClick={(e)=>{ e.stopPropagation(); handleCarSelection(''); }} 
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

                {/* Max Age & Payment Type in row */}
              <div className="grid grid-cols-2 gap-1.5">
                <div>
                  <label className="block text-xs font-medium text-white mb-1 flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Max Age
                  </label>
                  <select
                    value={maxAge}
                    onChange={e => setMaxAge(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-base rounded bg-black/20 border border-white/10 text-white focus:outline-none focus:ring-1 focus:ring-white/30 focus:border-white/30 transition-all appearance-none"
                    style={{ backgroundImage: 'none' }}
                    required
                  >
                    {[1,2,3,4,5,6,7,8,9,10].map(y => (
                      <option key={y} value={`${y}yr${y>1?'s':''}`}>{y}yr{y>1?'s':''}</option>
                    ))}
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
                    value={paymentType}
                    onChange={e => setPaymentType(e.target.value as "monthly" | "cash")}
                    className="w-full px-2.5 py-1.5 text-base rounded bg-black/20 border border-white/10 text-white focus:outline-none focus:ring-1 focus:ring-white/30 focus:border-white/30 transition-all appearance-none"
                    style={{ backgroundImage: 'none' }}
                  >
                    <option value="monthly">Monthly</option>
                    <option value="cash">Cash</option>
                  </select>
                </div>
              </div>

              {/* Budget Inputs - Show different fields based on payment type */}
              {paymentType === 'monthly' ? (
                <div>
                  <label className="block text-xs font-medium text-white mb-1 flex items-center gap-1.5">
                    <span className="w-3.5 h-3.5 text-white font-bold text-xs flex items-center justify-center">د.إ</span>
                    Monthly Budget (AED)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={monthlyBudget}
                    onChange={e => setMonthlyBudget(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-base rounded bg-black/20 border border-white/10 text-white placeholder-white/50 focus:outline-none focus:ring-1 focus:ring-white/30 focus:border-white/30 transition-all"
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
                    min={0}
                    value={totalBudget}
                    onChange={e => setTotalBudget(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-base rounded bg-black/20 border border-white/10 text-white placeholder-white/50 focus:outline-none focus:ring-1 focus:ring-white/30 focus:border-white/30 transition-all"
                    placeholder="Enter total budget in AED"
                    required
                  />
                </div>
              )}
            </div>
          </div>

          {/* Appointment Details - Only show in convert_appointment mode */}
          {mode === 'convert_appointment' && (
            <div className="bg-white/5 backdrop-blur-sm rounded-lg p-2.5 border border-white/10 mb-3">
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
                      selected={appointmentDate}
                      onChange={(d)=>setAppointmentDate(d as Date)}
                      dateFormat="dd/MM/yyyy"
                      popperPlacement="top-start"
                      className="w-full px-2.5 py-1.5 text-xs rounded bg-black/20 border border-white/10 text-white focus:outline-none focus:ring-1 focus:ring-white/30 focus:border-white/30 transition-all"
                      wrapperClassName="w-full"
                      required
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
                      value={timeSlot}
                      onChange={e => setTimeSlot(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-base rounded bg-black/20 border border-white/10 text-white focus:outline-none focus:ring-1 focus:ring-white/30 focus:border-white/30 transition-all appearance-none"
                      style={{ backgroundImage: 'none' }}
                      required
                    >
                      <option value="">Select time</option>
                      {timeSlots.map(slot => (
                        <option key={slot.value} value={slot.value}>
                          {slot.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Notes textarea removed */}
              </div>
            </div>
          )}

          {/* Spacer to push button down */}
          <div className="flex-1"></div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={saving}
            className="w-full py-2 px-3 rounded bg-brand hover:bg-brand/90 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-white text-xs transition-all duration-200 flex items-center justify-center gap-1.5"
          >
            {saving ? (
              <>
                <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {mode === 'create_lead' ? 'Creating...' : 'Scheduling...'}
              </>
            ) : (
              mode === 'create_lead' ? 'Create Lead' : 'Schedule Appointment'
            )}
          </button>
        </form>

          {/* Right column with inventory & timeline */}
          <div className="w-full sm:w-72 flex-shrink-0 flex flex-col gap-3 pr-1">
            {/* Matching inventory */}
            <div className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 overflow-hidden h-[260px]">
              <div className="h-full overflow-y-auto p-1.5">
                <MatchingCarsList model={modelOfInterest} />
              </div>
            </div>

            {/* Timeline */}
            <div className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 overflow-hidden h-[260px]">
              <div className="p-2.5 border-b border-white/10 flex-shrink-0">
                <h3 className="text-xs font-semibold text-white">Timeline</h3>
              </div>
              <div className="p-2.5 overflow-y-auto scrollbar-hide" style={{ height: 'calc(100% - 40px)' }}>
                <NotesTimeline notes={notesArray} canEdit={true} onAdded={n=>setNotesArray(prev=>[n,...prev])} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 