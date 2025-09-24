"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import ChassisInput from '@/components/modules/uv-crm/components/ChassisInput';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (vehicle: any) => void;
  mode?: 'create' | 'edit';
  existingVehicle?: any;
}

const VIN_API_URL = process.env.NEXT_PUBLIC_VIN_API_URL!;
const VIN_API_USER = process.env.NEXT_PUBLIC_VIN_API_USER!;
const VIN_API_PASS = process.env.NEXT_PUBLIC_VIN_API_PASS!;

function firstDesc(obj: any) {
  if (!obj) return '';
  const val = Array.isArray(obj) ? obj[0] : typeof obj === 'object' ? Object.values(obj)[0] : null;
  return val?.description || val?.translation?.translation_en || '';
}

export default function AddVehicleModal({ isOpen, onClose, onCreated, mode = 'create', existingVehicle }: Props) {
  // Standardized field styling classes (exact same as UV CRM)
  const fieldClass = "w-full px-4 py-4 rounded-lg bg-black/20 border border-white/10 text-white text-lg focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/40 appearance-none [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]";
  const labelClass = "block text-white/80 text-lg font-semibold mb-3";
  const compactLabelClass = "block text-white/80 text-base font-medium mb-2";
  const compactFieldClass = "w-full px-3 py-3 rounded-lg bg-black/20 border border-white/10 text-white text-base focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/40 appearance-none [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]";

  const [form, setForm] = useState({
    // Basic vehicle info
    stock_number: existingVehicle?.stock_number || "",
    plate_number: existingVehicle?.plate_number || "",
    chassis_number: existingVehicle?.vin_number || "",
    chassis_short: existingVehicle?.chassis_short || "",
    engine_number: existingVehicle?.engine_number || "",
    purchase_date: existingVehicle?.purchase_date || "",
    
    // Vehicle details
    model_year: existingVehicle?.model_year?.toString() || "",
    vehicle_model: existingVehicle?.model || "",
    model_family: existingVehicle?.model || "",
    category: existingVehicle?.category || "A CLASS",
    colour: existingVehicle?.exterior_color || "",
    interior_colour: existingVehicle?.interior_color || "",
    body_style: existingVehicle?.body_style || "",
    
    // Current status
    current_customer_name: existingVehicle?.current_customer_name || "",
    current_parking_location: existingVehicle?.current_parking_location || "Main Showroom",
    
    // Lease dates
    release_date_out: existingVehicle?.release_date_out || "",
    expected_return_date: existingVehicle?.expected_return_date || "",
    
    // Lease terms
    lease_to_own_option: existingVehicle?.lease_to_own_option || false,
    daily_rate_customer: existingVehicle?.daily_rate_customer?.toString() || "",
    daily_rate_vehicle: existingVehicle?.daily_rate_vehicle?.toString() || "",
    planned_lease_pricing: existingVehicle?.planned_lease_pricing?.toString() || "",
    monthly_lease_rate: existingVehicle?.monthly_lease_rate?.toString() || "",
    security_deposit: existingVehicle?.security_deposit?.toString() || "",
    lease_term_months: existingVehicle?.lease_term_months?.toString() || "",
    max_mileage_per_year: existingVehicle?.max_mileage_per_year?.toString() || "",
    condition: existingVehicle?.condition || "",
    condition_notes: existingVehicle?.condition_notes || "",
    
    // Mileage tracking
    current_mileage_km: existingVehicle?.current_mileage_km?.toString() || "",
    excess_mileage_whole_lease: existingVehicle?.excess_mileage_whole_lease?.toString() || "0",
    excess_mileage_previous_billing: existingVehicle?.excess_mileage_previous_billing?.toString() || "0",
    mylocator_mileage: existingVehicle?.mylocator_mileage?.toString() || "",
    
    // Service tracking
    first_service_date: existingVehicle?.first_service_date || "",
    second_service_date: existingVehicle?.second_service_date || "",
    last_service_date: existingVehicle?.last_service_date || "",
    next_service_due: existingVehicle?.next_service_due || "",
    
    // Financial tracking
    acquired_cost: existingVehicle?.acquired_cost?.toString() || "",
    acquisition_cost: existingVehicle?.acquisition_cost?.toString() || "",
    monthly_depreciation: existingVehicle?.monthly_depreciation?.toString() || "",
    excess_usage_depreciation: existingVehicle?.excess_usage_depreciation?.toString() || "0",
    accumulated_depreciation: existingVehicle?.accumulated_depreciation?.toString() || "0",
    carrying_value: existingVehicle?.carrying_value?.toString() || "",
    buyout_price: existingVehicle?.buyout_price?.toString() || "",
    current_market_value: existingVehicle?.current_market_value?.toString() || "",
    unrealized_gain_loss: existingVehicle?.unrealized_gain_loss?.toString() || "0",
    
    // Compliance
    warranty_expiry_date: existingVehicle?.warranty_expiry_date || "",
    registration_date: existingVehicle?.registration_date || "",
    months_registered: existingVehicle?.months_registered?.toString() || "",
    
    // Technical specs
    regional_specification: "GCC",
    engine: existingVehicle?.engine_type || "",
    transmission: existingVehicle?.transmission || "Automatic",
    fuel_type: existingVehicle?.fuel_type || "Petrol",
    horsepower_hp: existingVehicle?.horsepower_hp?.toString() || "",
    torque_nm: existingVehicle?.torque_nm?.toString() || "",
    cubic_capacity_cc: existingVehicle?.cubic_capacity_cc?.toString() || "",
    
    // Operational
    location: existingVehicle?.location || "",
    parking_spot: existingVehicle?.parking_spot || "",
    
    // Notes
    description: existingVehicle?.notes || "",
    key_equipment: existingVehicle?.key_equipment || "",
    remarks: existingVehicle?.remarks || "",
  });

  const [saving, setSaving] = useState(false);
  const [savedVehicle, setSavedVehicle] = useState<any>(null);
  const [step, setStep] = useState(0);
  const [activeTab, setActiveTab] = useState<string>('chassis');

  // Map tabs to steps for navigation (expanded for comprehensive data)
  const tabToStep = { chassis: 0, vehicle: 1, pricing: 2, specs: 3, financial: 4, service: 5, details: 6 };
  const stepToTab = ['chassis', 'vehicle', 'pricing', 'specs', 'financial', 'service', 'details'];
  const currentStep = tabToStep[activeTab as keyof typeof tabToStep];
  const [processing, setProcessing] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  // Mercedes-Benz models for dropdown (exact same as UV CRM)
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

  const totalSteps = 7;

  const validateStep = (): string[] => {
    const missing: string[] = [];
    const add = (cond: boolean, label: string) => { if (!cond) missing.push(label); };

    if (step === 0) {
      add(!!form.chassis_number, 'Chassis #');
    }

    if (step === 1) {
      add(!!form.stock_number, 'Stock Number');
      add(!!form.model_year, 'Model Year');
      add(!!form.vehicle_model, 'Vehicle Model');
      add(!!form.model_family, 'Model Family');
      add(!!form.colour, 'Colour');
      add(!!form.interior_colour, 'Interior Colour');
    }

    if (step === 2) {
      add(!!form.regional_specification, 'Regional Specification');
      add(!!form.current_mileage_km, 'Mileage');
      add(!!form.monthly_lease_rate, 'Monthly Lease Rate');
      add(!!form.security_deposit, 'Security Deposit');
    }

    return missing;
  };

  const handleChange = (e: any) => {
    const { name, value, type, checked } = e.target;
    let processedValue = type === 'checkbox' ? checked : value;
    
    // Auto-generate stock number from chassis (last 6 characters)
    if (name === 'chassis_number' && typeof processedValue === 'string') {
      const clean = processedValue.trim();
      if (clean.length >= 6) {
        setForm(prev => ({ ...prev, stock_number: clean.slice(-6) }));
      } else {
        setForm(prev => ({ ...prev, stock_number: '' }));
      }
    }
    
    setForm((prev) => ({ ...prev, [name]: processedValue }));
  };

  // VIN API lookup (exact same as UV CRM)
  const lookupVIN = async (vin: string) => {
    if (!vin || vin.length !== 17) {
      console.log('VIN length not 17, skipping lookup');
      return;
    }
    
    console.log('🔍 Looking up VIN:', vin);
    setProcessing(true);
    setErrors([]);
    
    try {
      const response = await fetch(`${VIN_API_URL}/vehicle/${vin}`, {
        headers: {
          'Authorization': 'Basic ' + btoa(`${VIN_API_USER}:${VIN_API_PASS}`)
        }
      });
      
      console.log('VIN API response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.log('VIN API error response:', errorText);
        
        if (response.status === 404) {
          setErrors(['VIN not found in database. You can continue manually.']);
        } else if (response.status === 400) {
          setErrors(['Invalid VIN format. Please check the VIN and try again.']);
        } else {
          setErrors([`VIN API error (${response.status}). You can continue manually.`]);
        }
        setProcessing(false);
        return;
      }
      
      const json = await response.json();
      console.log('VIN API response data:', json);
      
      const map = json.data?.vehicle?.stream_map || {};
      
      if (!map || Object.keys(map).length === 0) {
        setErrors(['No vehicle data found for this VIN. You can continue manually.']);
        setProcessing(false);
        return;
      }
      
      // Auto-populate fields from VIN data (same as UV CRM)
      const modelDesc = firstDesc(map.model_name?.stream_result)?.toUpperCase();
      const year = map.production_date?.stream_result?.substring(0, 4) || '';
      const displacement = parseFloat(map.displacement?.stream_result || '');
      const cc = isFinite(displacement) ? String(Math.round(displacement * 1000)) : '';
      const colorDesc = firstDesc(map.color_code?.stream_result)?.toUpperCase();
      const interiorDesc = firstDesc(map.interior_code?.stream_result)?.toUpperCase();

      const updates: any = {};
      if (modelDesc) updates.vehicle_model = modelDesc;
      if (year) updates.model_year = year;
      if (colorDesc) updates.colour = colorDesc;
      if (interiorDesc) updates.interior_colour = interiorDesc;
      if (cc) updates.cubic_capacity_cc = cc;
      
      if (Object.keys(updates).length > 0) {
        setForm(prev => ({ ...prev, ...updates }));
        console.log('✅ VIN lookup successful:', updates);
        
        // Auto-advance to next step immediately after successful VIN lookup
        const newStep = step + 1;
        setStep(newStep);
        setActiveTab(stepToTab[newStep]);
        setErrors([]); // Clear any previous errors
      } else {
        setErrors(['VIN found but no usable data. You can continue manually.']);
      }
      
    } catch (error) {
      console.error('VIN lookup error:', error);
      setErrors(['Failed to lookup VIN. Network error or invalid response.']);
    } finally {
      setProcessing(false);
    }
  };

  const handleSubmit = async () => {
    const validationErrors = validateStep();
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }
    
    setSaving(true);

    try {
      const vehicleData = {
        stock_number: form.stock_number.toUpperCase(),
        vin_number: form.chassis_number.toUpperCase(),
        make: "Mercedes-Benz",
        model: form.model_family,
        model_year: parseInt(form.model_year),
        body_style: form.body_style,
        exterior_color: form.colour,
        interior_color: form.interior_colour,
        engine_type: form.engine,
        transmission: form.transmission,
        fuel_type: form.fuel_type,
        mileage_km: form.current_mileage_km ? parseInt(form.current_mileage_km) : null,
        monthly_lease_rate: form.monthly_lease_rate ? parseFloat(form.monthly_lease_rate) : null,
        security_deposit: form.security_deposit ? parseFloat(form.security_deposit) : null,
        lease_term_months: parseInt(form.lease_term_months),
        max_mileage_per_year: parseInt(form.max_mileage_per_year),
        condition: form.condition,
        condition_notes: form.condition_notes,
        acquisition_cost: form.acquisition_cost ? parseFloat(form.acquisition_cost) : null,
        location: form.location,
        parking_spot: form.parking_spot,
        notes: form.description,
        status: 'available',
        available_from: new Date().toISOString().split('T')[0],
        updated_at: new Date().toISOString()
      };

      let result;
      if (mode === 'edit' && existingVehicle) {
        result = await supabase
          .from('leasing_inventory')
          .update(vehicleData)
          .eq('id', existingVehicle.id)
          .select()
          .single();
      } else {
        result = await supabase
          .from('leasing_inventory')
          .insert({
            ...vehicleData,
            created_at: new Date().toISOString()
          })
          .select()
          .single();
      }

      if (result.error) {
        console.error('Error saving vehicle:', result.error);
        setErrors(['Failed to save vehicle. Please try again.']);
        return;
      }

      console.log('Vehicle saved successfully:', result.data);
      setSavedVehicle(result.data);
      onCreated(result.data);
      onClose();

    } catch (error) {
      console.error('Error saving vehicle:', error);
      setErrors(['Failed to save vehicle. Please try again.']);
    } finally {
      setSaving(false);
    }
  };

  const nextStep = () => {
    const validationErrors = validateStep();
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }
    setErrors([]);
    
    if (step < totalSteps - 1) {
      const newStep = step + 1;
      setStep(newStep);
      setActiveTab(stepToTab[newStep]);
    }
  };

  const prevStep = () => {
    if (step > 0) {
      const newStep = step - 1;
      setStep(newStep);
      setActiveTab(stepToTab[newStep]);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-2">
      <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-lg p-6 w-[896px] max-w-[98vw] h-[85vh] flex flex-col text-sm relative overflow-hidden shadow-2xl">
        {processing && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-50 rounded-lg">
            <svg className="animate-spin h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
            </svg>
          </div>
        )}
        
        <button onClick={onClose} className="absolute top-2 right-2 text-xl leading-none text-white/70 hover:text-white">×</button>
        <h2 className="text-base font-semibold text-white mb-1">{mode === 'edit' ? 'Edit Vehicle' : 'Add New Vehicle'}</h2>
        
        {errors.length > 0 && (
          <div className="mb-3 bg-red-600/80 text-white text-xs p-2 rounded">
            <p className="font-semibold mb-1">Please complete:</p>
            <ul className="list-disc list-inside space-y-0.5">
              {errors.map(e => <li key={e}>{e}</li>)}
            </ul>
          </div>
        )}
        
        {!savedVehicle ? (
          <>
          {/* Tab Navigation - scrollable for many tabs */}
          <div className="border-b border-white/20 mb-6">
            <nav className="flex space-x-3 overflow-x-auto pb-2 custom-scrollbar" aria-label="Tabs">
              {[
                { id: 'chassis', label: 'Chassis', step: 0 },
                { id: 'vehicle', label: 'Vehicle Info', step: 1 },
                { id: 'pricing', label: 'Pricing', step: 2 },
                { id: 'specs', label: 'Specifications', step: 3 },
                { id: 'financial', label: 'Financial', step: 4 },
                { id: 'service', label: 'Service', step: 5 },
                { id: 'details', label: 'Details', step: 6 }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative whitespace-nowrap py-2.5 px-4 font-semibold text-[13px] md:text-sm uppercase tracking-wide rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400/50 focus:ring-offset-2 focus:ring-offset-black/40 flex-shrink-0 ${
                    activeTab === tab.id
                      ? 'bg-gradient-to-b from-white/15 to-white/5 text-white border border-white/20'
                      : 'text-white/70 hover:text-white/90 hover:bg-white/5 border border-transparent'
                  }`}
                  type="button"
                  aria-current={activeTab === tab.id ? 'page' : undefined}
                >
                  <span className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[11px] font-bold">
                      {tab.step + 1}
                    </span>
                    {tab.label}
                  </span>
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="flex-1 min-h-0 overflow-y-auto">
            <div className="w-full max-w-4xl mx-auto py-8">
              <form onSubmit={(e) => { e.preventDefault(); }} className="space-y-6">
            
            {/* Chassis Tab - exact same as UV CRM */}
            {activeTab === 'chassis' && (
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-8 min-h-[500px] flex flex-col justify-center">
                <div className="text-center space-y-12">
                  <div className="space-y-6">
                    <h3 className="text-white text-4xl font-bold">Vehicle Identification</h3>
                    <p className="text-white/70 text-2xl">Enter the 17-character VIN to get started</p>
                  </div>
                  
                  <div className="space-y-8">
                    <label className="block text-white/80 text-3xl font-semibold">Chassis Number (VIN)</label>
                    <div className="w-full flex justify-center px-4">
                      <ChassisInput 
                        value={form.chassis_number} 
                        onChange={(val) => {
                          handleChange({
                            target: { name: 'chassis_number', value: val }
                          } as any);
                          if (val.length === 17) {
                            lookupVIN(val);
                          }
                        }} 
                      />
                    </div>
                    <p className="text-white/50 text-lg max-w-2xl mx-auto">
                      The VIN will automatically populate vehicle details in the next steps
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Vehicle Info Tab - exact same as UV CRM */}
            {activeTab === 'vehicle' && (
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-8 min-h-[500px] space-y-8 flex flex-col justify-center">
              <div className="text-center">
                <h3 className="text-white text-4xl font-bold mb-6">Vehicle Information</h3>
                <p className="text-white/70 text-xl mb-8">Complete the vehicle details below</p>
              </div>
              <div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className={labelClass}>Stock Number</label>
                    <input
                      name="stock_number"
                      value={form.stock_number}
                      onChange={handleChange}
                      className={fieldClass}
                      style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)' }}
                      required
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Model Year</label>
                    <input
                      type="number"
                      name="model_year"
                      value={form.model_year}
                      onChange={handleChange}
                      className={fieldClass}
                      style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)' }}
                      min="2015"
                      max="2025"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className={labelClass}>Model Family</label>
                    <select
                      name="model_family"
                      value={form.model_family}
                      onChange={handleChange}
                      className={fieldClass}
                      style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)' }}
                      required
                    >
                      <option value="">Choose model...</option>
                      {models.map(m => (
                        <option key={m.id} value={m.name}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Vehicle Model</label>
                    <input
                      name="vehicle_model"
                      value={form.vehicle_model}
                      onChange={handleChange}
                      className={fieldClass}
                      style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)' }}
                      placeholder="C-Class"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className={labelClass}>Exterior Colour</label>
                    <input
                      name="colour"
                      value={form.colour}
                      onChange={handleChange}
                      className={fieldClass}
                      style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)' }}
                      placeholder="Obsidian Black"
                      required
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Interior Colour</label>
                    <input
                      name="interior_colour"
                      value={form.interior_colour}
                      onChange={handleChange}
                      className={fieldClass}
                      style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)' }}
                      placeholder="Black Leather"
                      required
                    />
                  </div>
                </div>
              </div>
            </div>
            )}

            {/* Pricing Tab - exact same as UV CRM */}
            {activeTab === 'pricing' && (
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-8 space-y-6 min-h-[500px] flex flex-col justify-center">
                <div className="text-center mb-6">
                  <h2 className="text-4xl font-bold text-white mb-4">Leasing Pricing</h2>
                  <p className="text-xl text-white/60">Set the leasing rates and terms</p>
                </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className={labelClass}>Monthly Lease Rate (AED)</label>
                  <input
                    type="number"
                    name="monthly_lease_rate"
                    value={form.monthly_lease_rate}
                    onChange={handleChange}
                    className={fieldClass}
                    style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)' }}
                    placeholder="2500"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>
                <div>
                  <label className={labelClass}>Security Deposit (AED)</label>
                  <input
                    type="number"
                    name="security_deposit"
                    value={form.security_deposit}
                    onChange={handleChange}
                    className={fieldClass}
                    style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)' }}
                    placeholder="7500"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div>
                  <label className={labelClass}>Current Mileage (KM)</label>
                  <input
                    type="number"
                    name="current_mileage_km"
                    value={form.current_mileage_km}
                    onChange={handleChange}
                    className={fieldClass}
                    style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)' }}
                    placeholder="5000"
                    min="0"
                    required
                  />
                </div>
                <div>
                  <label className={labelClass}>Regional Specification</label>
                  <select
                    name="regional_specification"
                    value={form.regional_specification}
                    onChange={handleChange}
                    className={fieldClass}
                    style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)' }}
                    required
                  >
                    <option value="GCC">GCC</option>
                    <option value="European">European</option>
                    <option value="American">American</option>
                    <option value="Japanese">Japanese</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Acquisition Cost (AED)</label>
                  <input
                    type="number"
                    name="acquisition_cost"
                    value={form.acquisition_cost}
                    onChange={handleChange}
                    className={fieldClass}
                    style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)' }}
                    placeholder="180000"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>
              </div>
            )}

            {/* Specifications Tab - exact same as UV CRM */}
            {activeTab === 'specs' && (
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-8 space-y-6 min-h-[500px] flex flex-col justify-center">
                <div className="text-center mb-6">
                  <h2 className="text-4xl font-bold text-white mb-4">Specifications</h2>
                  <p className="text-xl text-white/60">Enter the technical specifications for this vehicle</p>
                </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className={labelClass}>Body Style</label>
                  <select
                    name="body_style"
                    value={form.body_style}
                    onChange={handleChange}
                    className={fieldClass}
                    style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)' }}
                  >
                    <option value="">Select...</option>
                    <option value="Coupe">Coupe</option>
                    <option value="Convertible">Convertible</option>
                    <option value="Estate">Estate</option>
                    <option value="Hatchback">Hatchback</option>
                    <option value="Saloon">Saloon</option>
                    <option value="SUV">SUV</option>
                  </select>
                </div>
                
                {[
                  { label: "Engine", name: "engine" },
                  { label: "Transmission", name: "transmission" },
                  { label: "Horsepower (hp)", name: "horsepower_hp", type: "number" },
                  { label: "Torque (Nm)", name: "torque_nm", type: "number" },
                  { label: "Cubic Capacity (cc)", name: "cubic_capacity_cc", type: "number" },
                ].map((f) => (
                  <div key={f.name}>
                    <label className={labelClass}>{f.label}</label>
                    <input
                      type={f.type || 'text'}
                      name={f.name}
                      value={(form as any)[f.name]}
                      onChange={handleChange}
                      className={fieldClass}
                      style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)' }}
                    />
                  </div>
                ))}
              </div>
              </div>
            )}

            {/* Financial Tab - NEW */}
            {activeTab === 'financial' && (
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-8 space-y-6 min-h-[500px] flex flex-col justify-center">
                <div className="text-center mb-6">
                  <h2 className="text-4xl font-bold text-white mb-4">Financial Tracking</h2>
                  <p className="text-xl text-white/60">Set acquisition costs and financial parameters</p>
                </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div>
                  <label className={labelClass}>Acquired Cost (AED)</label>
                  <input
                    type="number"
                    name="acquired_cost"
                    value={form.acquired_cost}
                    onChange={handleChange}
                    className={fieldClass}
                    style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)' }}
                    placeholder="180000"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className={labelClass}>Monthly Depreciation (AED)</label>
                  <input
                    type="number"
                    name="monthly_depreciation"
                    value={form.monthly_depreciation}
                    onChange={handleChange}
                    className={fieldClass}
                    style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)' }}
                    placeholder="2000"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className={labelClass}>Current Market Value (AED)</label>
                  <input
                    type="number"
                    name="current_market_value"
                    value={form.current_market_value}
                    onChange={handleChange}
                    className={fieldClass}
                    style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)' }}
                    placeholder="150000"
                    step="0.01"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className={labelClass}>Buyout Price (AED)</label>
                  <input
                    type="number"
                    name="buyout_price"
                    value={form.buyout_price}
                    onChange={handleChange}
                    className={fieldClass}
                    style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)' }}
                    placeholder="120000"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className={labelClass}>Planned Lease Pricing (AED)</label>
                  <input
                    type="number"
                    name="planned_lease_pricing"
                    value={form.planned_lease_pricing}
                    onChange={handleChange}
                    className={fieldClass}
                    style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)' }}
                    placeholder="72000"
                    step="0.01"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className={labelClass}>Daily Rate Customer (AED)</label>
                  <input
                    type="number"
                    name="daily_rate_customer"
                    value={form.daily_rate_customer}
                    onChange={handleChange}
                    className={fieldClass}
                    style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)' }}
                    placeholder="150"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className={labelClass}>Daily Rate Vehicle (AED)</label>
                  <input
                    type="number"
                    name="daily_rate_vehicle"
                    value={form.daily_rate_vehicle}
                    onChange={handleChange}
                    className={fieldClass}
                    style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)' }}
                    placeholder="150"
                    step="0.01"
                  />
                </div>
              </div>
              </div>
            )}

            {/* Service Tab - NEW */}
            {activeTab === 'service' && (
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-8 space-y-6 min-h-[500px] flex flex-col justify-center">
                <div className="text-center mb-6">
                  <h2 className="text-4xl font-bold text-white mb-4">Service & Mileage</h2>
                  <p className="text-xl text-white/60">Track service history and mileage readings</p>
                </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className={labelClass}>Current Mileage (KM)</label>
                  <input
                    type="number"
                    name="current_mileage_km"
                    value={form.current_mileage_km}
                    onChange={handleChange}
                    className={fieldClass}
                    style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)' }}
                    placeholder="25000"
                  />
                </div>
                <div>
                  <label className={labelClass}>MyLocator Mileage (KM)</label>
                  <input
                    type="number"
                    name="mylocator_mileage"
                    value={form.mylocator_mileage}
                    onChange={handleChange}
                    className={fieldClass}
                    style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)' }}
                    placeholder="25500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className={labelClass}>First Service Date</label>
                  <input
                    type="date"
                    name="first_service_date"
                    value={form.first_service_date}
                    onChange={handleChange}
                    className={fieldClass}
                    style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)' }}
                  />
                </div>
                <div>
                  <label className={labelClass}>Second Service Date</label>
                  <input
                    type="date"
                    name="second_service_date"
                    value={form.second_service_date}
                    onChange={handleChange}
                    className={fieldClass}
                    style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)' }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div>
                  <label className={labelClass}>Excess Mileage (Whole Lease)</label>
                  <input
                    type="number"
                    name="excess_mileage_whole_lease"
                    value={form.excess_mileage_whole_lease}
                    onChange={handleChange}
                    className={fieldClass}
                    style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)' }}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className={labelClass}>Excess Mileage (Previous Billing)</label>
                  <input
                    type="number"
                    name="excess_mileage_previous_billing"
                    value={form.excess_mileage_previous_billing}
                    onChange={handleChange}
                    className={fieldClass}
                    style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)' }}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className={labelClass}>Current Parking Location</label>
                  <select
                    name="current_parking_location"
                    value={form.current_parking_location}
                    onChange={handleChange}
                    className={fieldClass}
                    style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)' }}
                  >
                    <option value="Main Showroom">Main Showroom</option>
                    <option value="YARD">YARD</option>
                    <option value="CAR PARK">CAR PARK</option>
                    <option value="SHOWROOM 2">SHOWROOM 2</option>
                    <option value="Service Center">Service Center</option>
                    <option value="STONES">STONES</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className={labelClass}>Warranty Expiry Date</label>
                  <input
                    type="date"
                    name="warranty_expiry_date"
                    value={form.warranty_expiry_date}
                    onChange={handleChange}
                    className={fieldClass}
                    style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)' }}
                  />
                </div>
                <div>
                  <label className={labelClass}>Registration Date</label>
                  <input
                    type="date"
                    name="registration_date"
                    value={form.registration_date}
                    onChange={handleChange}
                    className={fieldClass}
                    style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)' }}
                  />
                </div>
              </div>
              </div>
            )}

            {/* Details Tab - exact same as UV CRM */}
            {activeTab === 'details' && (
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-8 space-y-6 min-h-[500px] flex flex-col justify-center">
                <div className="text-center mb-8 mt-8">
                  <h2 className="text-4xl font-bold text-white mb-4">Vehicle Details</h2>
                  <p className="text-xl text-white/60">Add key equipment and description for this vehicle</p>
                </div>
              <div className="space-y-8">
                <div>
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-2xl font-bold text-white">Key Equipment</h3>
                  </div>
                  <textarea
                    name="key_equipment"
                    value={form.key_equipment}
                    onChange={handleChange}
                    className={fieldClass}
                    style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)' }}
                    rows={8}
                    required
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-2xl font-bold text-white">Description</h3>
                  </div>
                  <textarea
                    name="description"
                    value={form.description}
                    onChange={handleChange}
                    className={fieldClass}
                    style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)' }}
                    rows={8}
                    placeholder="Enter vehicle description..."
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  <div>
                    <label className={labelClass}>Plate Number</label>
                    <input
                      name="plate_number"
                      value={form.plate_number}
                      onChange={handleChange}
                      className={fieldClass}
                      style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)' }}
                      placeholder="50/28578"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Engine Number</label>
                    <input
                      name="engine_number"
                      value={form.engine_number}
                      onChange={handleChange}
                      className={fieldClass}
                      style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)' }}
                      placeholder="28291481004341"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Purchase Date</label>
                    <input
                      type="date"
                      name="purchase_date"
                      value={form.purchase_date}
                      onChange={handleChange}
                      className={fieldClass}
                      style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)' }}
                    />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Remarks</label>
                  <textarea
                    name="remarks"
                    value={form.remarks}
                    onChange={handleChange}
                    className={fieldClass}
                    style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)' }}
                    rows={4}
                    placeholder="Special notes, accidents, renewals, repossessions, etc..."
                  />
                </div>
              </div>
              </div>
            )}

              </form>
            </div>
          </div>

          {/* Bottom Navigation - exact same as UV CRM */}
          <div className="border-t border-white/20 pt-4 flex justify-between items-center">
            <div className="flex gap-3">
              {step > 0 && (
                <button
                  type="button"
                  onClick={prevStep}
                  className="px-4 py-2 text-white/70 hover:text-white hover:bg-white/10 rounded transition-colors"
                >
                  ← Previous
                </button>
              )}
            </div>

            <div className="text-white/50 text-xs">
              Step {step + 1} of {totalSteps}
            </div>

            <div className="flex gap-3">
              {step < totalSteps - 1 ? (
                <button
                  type="button"
                  onClick={nextStep}
                  className="px-4 py-2 bg-gradient-to-br from-gray-200 via-gray-100 to-gray-400 text-black font-medium rounded hover:shadow-lg transition-all"
                >
                  Next →
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={saving}
                  className="px-4 py-2 bg-gradient-to-br from-gray-200 via-gray-100 to-gray-400 text-black font-medium rounded hover:shadow-lg transition-all"
                >
                  {saving ? 'Saving...' : mode === 'edit' ? 'Update Vehicle' : 'Add Vehicle'}
                </button>
              )}
            </div>
          </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="text-6xl mb-4">✅</div>
              <h3 className="text-2xl font-semibold text-white mb-2">Vehicle Added Successfully!</h3>
              <p className="text-white/70 mb-6">
                {savedVehicle.stock_number} has been added to the leasing inventory
              </p>
              <button
                onClick={onClose}
                className="px-6 py-3 bg-gradient-to-br from-gray-200 via-gray-100 to-gray-400 text-black font-medium rounded-lg hover:shadow-lg transition-all"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}