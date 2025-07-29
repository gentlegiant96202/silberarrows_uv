"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import DocUploader from "@/components/modules/uv-crm/components/DocUploader";
import ChassisInput from '@/components/modules/uv-crm/components/ChassisInput';

interface Props {
  onClose: () => void;
  onCreated: (car: any) => void;
}

const VIN_API_URL = process.env.NEXT_PUBLIC_VIN_API_URL!;
const VIN_API_USER = process.env.NEXT_PUBLIC_VIN_API_USER!;
const VIN_API_PASS = process.env.NEXT_PUBLIC_VIN_API_PASS!;

function firstDesc(obj: any) {
  if (!obj) return '';
  const val = Array.isArray(obj) ? obj[0] : typeof obj === 'object' ? Object.values(obj)[0] : null;
  return val?.description || val?.translation?.translation_en || '';
}

export default function AddCarModal({ onClose, onCreated }: Props) {
  const [form, setForm] = useState({
    stock_number: "",
    model_year: "",
    vehicle_model: "",
    model_family: "",
    colour: "",
    interior_colour: "",
    chassis_number: "",
    cost_price_aed: "",
    advertised_price_aed: "",
    current_mileage_km: "",
    current_warranty: "",
    current_service: "",
    regional_specification: "",
    engine: "",
    transmission: "",
    horsepower_hp: "",
    torque_nm: "",
    cubic_capacity_cc: "",
    number_of_keys: "",
    ownership_type: "stock" as "stock" | "consignment",
    customer_name: "",
    customer_email: "",
    customer_phone: "",
    description: "",
    key_equipment: "",
    warranty_package_type: "silberarrows" as "dealer" | "silberarrows",
    warranty_expiry_date: "",
    service_package_type: "silberarrows" as "dealer" | "silberarrows",
    service_expiry_date: "",
    warranty_km_limit: "",
    service_km_limit: "",
  });

  const [saving, setSaving] = useState(false);
  const [savedCar, setSavedCar] = useState<any>(null);
  const [docs, setDocs] = useState<any[]>([]);
  const [step, setStep] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  // Mercedes-Benz models for dropdown
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

  // Derived monthly payments
  const price = parseFloat(form.advertised_price_aed || '0');
  const monthlyPayments = price > 0 ? (() => {
    const principal0 = price; // 0% down
    const principal20 = price * 0.8; // 20% down
    const r = 0.03 / 12;
    const n = 60;
    const calc = (p: number) => Math.round(p * r / (1 - Math.pow(1 + r, -n)));
    return {
      zero: calc(principal0),
      twenty: calc(principal20)
    };
  })() : null;

  const totalSteps = 5;

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
      add(!!form.advertised_price_aed, 'Advertised Price');

      if (form.ownership_type === 'consignment') {
        add(!!form.customer_name, 'Customer Name');
        add(!!form.customer_phone, 'Customer Phone');
        const emailOk = /.+@.+\..+/.test(form.customer_email);
        if (!emailOk) missing.push('Valid Customer Email');
      }

      if (form.warranty_package_type === 'dealer') {
        add(!!form.warranty_expiry_date, 'Warranty Expiry Date');
        add(!!form.warranty_km_limit, 'Warranty KM Limit');
      }
      if (form.service_package_type === 'dealer') {
        add(!!form.service_expiry_date, 'Service Expiry Date');
        add(!!form.service_km_limit, 'Service KM Limit');
      }
    }

    if (step === 4) {
      add(!!form.key_equipment, 'Key Equipment');
    }

    return missing;
  };

  const handleNext = async () => {
    if (processing) return;
    const missing = validateStep();
    if (missing.length) {
      setErrors(missing);
      return;
    } else {
      setErrors([]);
    }
    setProcessing(true);
    
    try {
      if (step === 0) {
        // Call VIN API
        try {
          const res = await fetch(`${VIN_API_URL}/vehicle/${form.chassis_number}`, {
            headers: {
              'Authorization': 'Basic ' + btoa(`${VIN_API_USER}:${VIN_API_PASS}`)
            }
          });
          
          if (res.ok) {
            const json = await res.json();
            const map = json.data?.vehicle?.stream_map || {};
            const modelDesc = firstDesc(map.model_name?.stream_result)?.toUpperCase();
            const year = map.production_date?.stream_result?.substring(0, 4) || '';
            const displacement = parseFloat(map.displacement?.stream_result || '');
            const cc = isFinite(displacement) ? String(Math.round(displacement * 1000)) : '';
            const colorDesc = firstDesc(map.color_code?.stream_result)?.toUpperCase();
            const interiorDesc = firstDesc(map.interior_code?.stream_result)?.toUpperCase();

            // Options list
            const optsObj = map.options?.stream_result || {};
            const optionDescsArr = Object.values(optsObj).map((o: any) => String(o.description).toUpperCase()).filter(Boolean);
            const optionDescs = Array.from(new Set(optionDescsArr));
            const optionsText = optionDescs.length ? optionDescs.map(d => `- ${d}`).join('\n') : '';

            setForm(prev => ({
              ...prev,
              vehicle_model: modelDesc || prev.vehicle_model,
              model_year: year || prev.model_year,
              cubic_capacity_cc: cc || prev.cubic_capacity_cc,
              colour: colorDesc || prev.colour,
              interior_colour: interiorDesc || prev.interior_colour,
              key_equipment: optionsText || prev.key_equipment,
              description: ''
            }));

            // GPT enrichment
            try {
              const enr = await fetch('/api/enrich-vin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(json)
              });
              const enrJson = await enr.json();
              if (enrJson.success) {
                const d = enrJson.data;
                const tidy = (s: string) => {
                  if (!s) return '';
                  const lower = s.toLowerCase();
                  return lower.charAt(0).toUpperCase() + lower.slice(1);
                };
                const toNumberStr = (v: any) => {
                  const m = String(v || '').match(/\d+/);
                  return m ? m[0] : '';
                };

                const hpRaw = d.horsepower_hp ?? d.horsepower ?? d.hp ?? d.horsepowerHp;
                const tqRaw = d.torque_nm ?? d.torque ?? d.nm ?? d.torqueNm;

                setForm(prev => ({
                  ...prev,
                  engine: d.engine || prev.engine,
                  transmission: d.transmission || prev.transmission,
                  horsepower_hp: toNumberStr(hpRaw) || prev.horsepower_hp,
                  torque_nm: toNumberStr(tqRaw) || prev.torque_nm,
                  description: d.description ? tidy(d.description) : prev.description
                }));
              }
            } catch (e) {
              console.error('enrich error', e);
            }
          }
        } catch (e) {
          console.error(e);
        }
      }
      setStep((s) => s + 1);
    } finally {
      setProcessing(false);
    }
  };

  const handleBack = () => setStep((s) => s - 1);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const upperCaseFields = ['chassis_number', 'stock_number', 'vehicle_model', 'model_family', 'colour', 'interior_colour', 'key_equipment'];
    const numericFields = ['cost_price_aed', 'advertised_price_aed', 'warranty_km_limit', 'service_km_limit', 'current_mileage_km', 'number_of_keys'];
    
    let processedValue: string = value;
    if (upperCaseFields.includes(name)) {
      processedValue = value.toUpperCase();
    }
    if (numericFields.includes(name)) {
      processedValue = value.replace(/[^0-9]/g, '');
    }
    
    setForm((prev) => {
      const updated: any = { ...prev, [name]: processedValue };
      if (name === 'chassis_number') {
        const clean = processedValue.trim();
        if (clean.length >= 6) {
          updated.stock_number = clean.slice(-6);
        } else {
          updated.stock_number = '';
        }
      }
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.stock_number || !form.model_year || !form.vehicle_model || !form.model_family || !form.colour || !form.chassis_number || !form.advertised_price_aed) return;
    
    // Check character limits
    if (form.description.length > 1700 || form.key_equipment.length > 1800) {
      alert('Please check character limits: Description max 1700, Key Equipment max 1800');
      return;
    }
    
    setSaving(true);
    const { data, error } = await supabase.from("cars").insert([
      {
        stock_number: form.stock_number.trim(),
        model_year: parseInt(form.model_year),
        vehicle_model: form.vehicle_model.trim(),
        model_family: form.model_family.trim(),
        colour: form.colour.trim(),
        interior_colour: form.interior_colour.trim(),
        chassis_number: form.chassis_number.trim(),
        cost_price_aed: form.cost_price_aed ? parseInt(form.cost_price_aed) : null,
        advertised_price_aed: parseInt(form.advertised_price_aed),
        current_mileage_km: form.current_mileage_km ? parseInt(form.current_mileage_km) : null,
        current_warranty: form.warranty_package_type === 'dealer'
          ? `Dealer warranty until ${form.warranty_expiry_date} or ${form.warranty_km_limit} km`
          : 'SilberArrows warranty available',
        current_service: form.service_package_type === 'dealer'
          ? `Dealer service package until ${form.service_expiry_date} or ${form.service_km_limit} km`
          : 'SilberArrows service package available',
        regional_specification: form.regional_specification || null,
        engine: form.engine || null,
        transmission: form.transmission || null,
        horsepower_hp: form.horsepower_hp ? parseInt(form.horsepower_hp) : null,
        torque_nm: form.torque_nm ? parseInt(form.torque_nm) : null,
        cubic_capacity_cc: form.cubic_capacity_cc ? parseInt(form.cubic_capacity_cc) : null,
        number_of_keys: form.number_of_keys ? parseInt(form.number_of_keys) : null,
        monthly_0_down_aed: monthlyPayments?.zero || null,
        monthly_20_down_aed: monthlyPayments?.twenty || null,
        customer_name: form.ownership_type === 'consignment' ? form.customer_name.trim() : null,
        customer_email: form.ownership_type === 'consignment' ? form.customer_email.trim() : null,
        customer_phone: form.ownership_type === 'consignment' ? form.customer_phone.trim() : null,
        ownership_type: form.ownership_type,
        key_equipment: form.key_equipment.trim(),
        description: form.description.trim(),
        status: "marketing",
        sale_status: "available",
        created_by: (await supabase.auth.getUser()).data.user?.id,
      },
    ]).select().single();
    
    setSaving(false);
    if (error) {
      alert(error.message);
      return;
    }
    setSavedCar(data);
    const { data: docRows } = await supabase.from('car_media').select('*').eq('car_id', data.id).eq('kind', 'document');
    setDocs(docRows || []);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-2">
      <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-lg p-4 w-full max-w-md text-xs relative max-h-[95vh] overflow-y-auto shadow-2xl">
        {processing && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-50 rounded-lg">
            <svg className="animate-spin h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
            </svg>
          </div>
        )}
        
        <button onClick={onClose} className="absolute top-2 right-2 text-xl leading-none text-white/70 hover:text-white">×</button>
        <h2 className="text-base font-semibold text-white mb-1">Add New Car</h2>
        
        {errors.length > 0 && (
          <div className="mb-3 bg-red-600/80 text-white text-xs p-2 rounded">
            <p className="font-semibold mb-1">Please complete:</p>
            <ul className="list-disc list-inside space-y-0.5">
              {errors.map(e => <li key={e}>{e}</li>)}
            </ul>
          </div>
        )}
        
        <p className="text-white/60 text-xs mb-3">Step {step + 1} of {totalSteps}</p>

        {!savedCar ? (
          <>
          {/* Prevent implicit submits; we call handleSubmit manually */}
          <form onSubmit={(e) => { e.preventDefault(); }} className="space-y-4">
            {/* Step 0: Chassis */}
            {step === 0 && (
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-2.5">
                <h3 className="text-white/80 text-xs font-semibold mb-2">Chassis # (VIN)</h3>
                <ChassisInput value={form.chassis_number} onChange={(val) => {
                  handleChange({
                    target: { name: 'chassis_number', value: val }
                  } as any);
                }} />
              </div>
            )}

            {/* Step 1: Vehicle Information */}
            {step === 1 && (
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-2.5 space-y-4">
              <div>
                <h3 className="text-white/80 text-xs font-semibold mb-2">Vehicle Information</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { label: "Stock Number", name: "stock_number", readOnly: true, placeholder: "Auto generated" },
                    { label: "Model Year", name: "model_year", type: "number" },
                    { label: "Vehicle Model", name: "vehicle_model" },
                  ].map((f) => (
                    <div key={f.name}>
                      <label className="block text-white/70 mb-0.5">{f.label}</label>
                      <input
                        name={f.name}
                        type={(f as any).type || "text"}
                        value={(form as any)[f.name]}
                        onChange={handleChange}
                        className="w-full px-2 py-1 rounded bg-black/20 border border-white/10 text-white"
                        required={f.name !== 'stock_number'}
                        readOnly={(f as any).readOnly}
                        placeholder={(f as any).placeholder}
                      />
                    </div>
                  ))}
                    
                    {/* Model Family Dropdown */}
                    <div>
                      <label className="block text-white/70 mb-0.5">Model Family</label>
                      <select
                        name="model_family"
                        value={form.model_family}
                        onChange={handleChange}
                        className="w-full px-2 py-1 rounded bg-black/20 border border-white/10 text-white"
                        required
                      >
                        <option value="">Select Model Family...</option>
                        {models.map(m => (
                          <option key={m.id} value={m.name}>
                            {m.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {[
                      { label: "Colour", name: "colour" },
                      { label: "Interior Colour", name: "interior_colour" },
                    ].map((f) => (
                      <div key={f.name}>
                        <label className="block text-white/70 mb-0.5">{f.label}</label>
                        <input
                          name={f.name}
                          type="text"
                          value={(form as any)[f.name]}
                          onChange={handleChange}
                          className="w-full px-2 py-1 rounded bg-black/20 border border-white/10 text-white"
                          required
                        />
                      </div>
                    ))}
                  </div>
              </div>
            </div>
            )}

            {/* Step 2: Pricing & Condition */}
            {step === 2 && (
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-2.5">
              <h3 className="text-white/80 text-xs font-semibold mb-2">Pricing & Condition</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Ownership Type */}
                <div>
                  <label className="block text-white/70 mb-0.5">Ownership Type</label>
                  <select
                    name="ownership_type"
                    value={form.ownership_type}
                    onChange={handleChange}
                    className="w-full px-2 py-1 rounded bg-black/20 border border-white/10 text-white"
                  >
                    <option value="stock">Stock</option>
                    <option value="consignment">Consignment</option>
                  </select>
                </div>

                {/* Regional Specification */}
                <div>
                  <label className="block text-white/60 mb-0.5">Regional Specification</label>
                  <select
                    name="regional_specification"
                    value={form.regional_specification}
                    onChange={handleChange}
                    className="w-full px-2 py-1 rounded bg-black/20 border border-white/10 text-white"
                    required
                  >
                    <option value="">Select...</option>
                    <option value="GCC SPECIFICATION">GCC Specification</option>
                    <option value="EUROPEAN SPECIFICATION">European Specification</option>
                    <option value="JAPANESE SPECIFICATION">Japanese Specification</option>
                    <option value="CANADIAN SPECIFICATION">Canadian Specification</option>
                  </select>
                </div>

                {/* Mileage */}
                <div>
                  <label className="block text-white/60 mb-0.5">Mileage (KM)</label>
                  <input
                    name="current_mileage_km"
                    value={form.current_mileage_km}
                    onChange={handleChange}
                    inputMode="numeric"
                    className="w-full px-2 py-1 rounded bg-black/20 border border-white/10 text-white"
                    required
                  />
                </div>

                {/* Number of Keys */}
                <div>
                  <label className="block text-white/60 mb-0.5">Number of Keys</label>
                  <input
                    type="number"
                    name="number_of_keys"
                    value={form.number_of_keys}
                    onChange={handleChange}
                    className="w-full px-2 py-1 rounded bg-black/20 border border-white/10 text-white"
                  />
                </div>

                {/* Warranty Package */}
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-white/60 mb-0.5">Warranty Package</label>
                  <select
                    name="warranty_package_type"
                    value={form.warranty_package_type}
                    onChange={handleChange}
                    className="w-full px-2 py-1 rounded bg-black/20 border border-white/10 text-white"
                    required
                  >
                    <option value="silberarrows">SilberArrows</option>
                    <option value="dealer">Dealer</option>
                  </select>
                  {form.warranty_package_type === 'dealer' && (
                    <div className="mt-1 grid grid-cols-2 gap-1.5">
                      <input
                        type="date"
                        name="warranty_expiry_date"
                        value={form.warranty_expiry_date}
                        onChange={handleChange}
                        className="w-full px-2 py-1 rounded bg-black/20 border border-white/10 text-white"
                      />
                      <input
                        type="text"
                        name="warranty_km_limit"
                        value={form.warranty_km_limit}
                        onChange={handleChange}
                        inputMode="numeric"
                        placeholder="KM limit"
                        className="w-full px-2 py-1 rounded bg-black/20 border border-white/10 text-white"
                      />
                    </div>
                  )}
                </div>

                {/* Service Package */}
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-white/60 mb-0.5">Service Package</label>
                  <select
                    name="service_package_type"
                    value={form.service_package_type}
                    onChange={handleChange}
                    className="w-full px-2 py-1 rounded bg-black/20 border border-white/10 text-white"
                    required
                  >
                    <option value="silberarrows">SilberArrows</option>
                    <option value="dealer">Dealer</option>
                  </select>
                  {form.service_package_type === 'dealer' && (
                    <div className="mt-1 grid grid-cols-2 gap-1.5">
                      <input
                        type="date"
                        name="service_expiry_date"
                        value={form.service_expiry_date}
                        onChange={handleChange}
                        className="w-full px-2 py-1 rounded bg-black/20 border border-white/10 text-white"
                      />
                      <input
                        type="text"
                        name="service_km_limit"
                        value={form.service_km_limit}
                        onChange={handleChange}
                        inputMode="numeric"
                        placeholder="KM limit"
                        className="w-full px-2 py-1 rounded bg-black/20 border border-white/10 text-white"
                      />
                    </div>
                  )}
                </div>

                {/* Cost & Advertised Price */}
                <div>
                  <label className="block text-white/60 mb-0.5">Cost Price (AED)</label>
                  <input
                    name="cost_price_aed"
                    value={form.cost_price_aed}
                    onChange={handleChange}
                    inputMode="numeric"
                    className="w-full px-2 py-1 rounded bg-black/20 border border-white/10 text-white"
                  />
                </div>

                <div>
                  <label className="block text-white/60 mb-0.5">Advertised Price (AED)</label>
                  <input
                    name="advertised_price_aed"
                    value={form.advertised_price_aed}
                    onChange={handleChange}
                    inputMode="numeric"
                    className="w-full px-2 py-1 rounded bg-black/20 border border-white/10 text-white"
                    required
                  />
                  {monthlyPayments && (
                    <div className="mt-1 text-[10px] text-white/70 space-y-0.5">
                      <p>0% Down: AED {monthlyPayments.zero.toLocaleString()}/mo</p>
                      <p>20% Down: AED {monthlyPayments.twenty.toLocaleString()}/mo</p>
                    </div>
                  )}
                </div>

                  {/* Consignment Customer Details */}
                {form.ownership_type === 'consignment' && (
                  <>
                    <div className="col-span-2 sm:col-span-1">
                      <label className="block text-white/60 mb-0.5">Customer Name</label>
                      <input
                        name="customer_name"
                        value={form.customer_name}
                        onChange={handleChange}
                        className="w-full px-2 py-1 rounded bg-black/20 border border-white/10 text-white"
                        required
                      />
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <label className="block text-white/60 mb-0.5">Customer Phone</label>
                      <input
                        name="customer_phone"
                        value={form.customer_phone}
                        onChange={handleChange}
                        className="w-full px-2 py-1 rounded bg-black/20 border border-white/10 text-white"
                        required
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-white/60 mb-0.5">Customer Email</label>
                      <input
                        name="customer_email"
                        type="email"
                        value={form.customer_email}
                        onChange={handleChange}
                        className="w-full px-2 py-1 rounded bg-black/20 border border-white/10 text-white"
                        required
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
            )}

            {/* Step 3: Specifications */}
            {step === 3 && (
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-2.5">
              <h3 className="text-white/80 text-xs font-semibold mb-2">Specifications</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { label: "Engine", name: "engine" },
                  { label: "Transmission", name: "transmission" },
                  { label: "Horsepower (hp)", name: "horsepower_hp", type: "number" },
                  { label: "Torque (Nm)", name: "torque_nm", type: "number" },
                  { label: "Cubic Capacity (cc)", name: "cubic_capacity_cc", type: "number" },
                ].map((f) => (
                  <div key={f.name}>
                    <label className="block text-white/60 mb-0.5">{f.label}</label>
                    <input
                      type={f.type || 'text'}
                      name={f.name}
                      value={(form as any)[f.name]}
                      onChange={handleChange}
                      className="w-full px-2 py-1 rounded bg-black/20 border border-white/10 text-white"
                    />
                  </div>
                ))}
              </div>
            </div>
            )}

            {/* Step 4: Key Equipment & Description */}
            {step === 4 && (
             <>
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-2.5">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-white/80 text-xs font-semibold">Key Equipment</h3>
                  <span className={`text-xs ${form.key_equipment.length > 1800 ? 'text-red-400' : 'text-white/60'}`}>
                    {form.key_equipment.length}/1800
                  </span>
                </div>
                <textarea
                  name="key_equipment"
                  value={form.key_equipment}
                  onChange={handleChange}
                  className={`w-full px-2 py-1 rounded bg-black/20 border text-white resize-y min-h-[100px] ${
                    form.key_equipment.length > 1800 ? 'border-red-400' : 'border-white/10'
                  }`}
                  rows={4}
                  required
                  maxLength={1800}
                />
                {form.key_equipment.length > 1800 && (
                  <p className="text-red-400 text-xs mt-1">Key equipment must be 1800 characters or less</p>
                )}
              </div>

              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-2.5">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-white/80 text-xs font-semibold">Description</h3>
                  <span className={`text-xs ${form.description.length > 1700 ? 'text-red-400' : 'text-white/60'}`}>
                    {form.description.length}/1700
                  </span>
                </div>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  className={`w-full px-2 py-1 rounded bg-black/20 border text-white resize-y min-h-[100px] ${
                    form.description.length > 1700 ? 'border-red-400' : 'border-white/10'
                  }`}
                  rows={3}
                  maxLength={1700}
                />
                {form.description.length > 1700 && (
                  <p className="text-red-400 text-xs mt-1">Description must be 1700 characters or less</p>
                )}
              </div>
             </>
            )}

            {/* Navigation Buttons */}
            <div className="flex gap-2 justify-between">
              {step > 0 && (
                <button
                  type="button"
                  onClick={handleBack}
                  className="flex-1 py-2 rounded bg-white/10 hover:bg-white/20 text-white text-xs"
                >
                  Back
                </button>
              )}
              
              {step < totalSteps - 1 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={processing}
                  className={`flex-1 py-2 rounded bg-brand hover:bg-brand/90 disabled:opacity-50 text-white text-xs ${
                    step === 0 ? 'w-full' : ''
                  }`}
                >
                  {processing ? 'Processing...' : 'Next'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit as any}
                  disabled={saving}
                  className="flex-1 py-2 rounded bg-brand hover:bg-brand/90 disabled:opacity-50 text-white text-xs"
                >
                  {saving ? 'Creating...' : 'Create Car'}
                </button>
              )}
            </div>
          </form>
          </>
        ) : (
          <div className="space-y-4">
            <h3 className="text-white/80 text-xs font-semibold">Upload Pre-UVC Documents (PDF)</h3>
            <DocUploader carId={savedCar.id} onUploaded={async () => {
              const { data: docRows } = await supabase.from('car_media').select('*').eq('car_id', savedCar.id).eq('kind', 'document');
              setDocs(docRows || []);
            }} />

            {docs.length > 0 && (
              <ul className="list-disc list-inside text-white/70 text-xs space-y-1">
                {docs.map(d => (
                  <li key={d.id}>
                    <a href={d.url} target="_blank" className="underline">
                      Document {d.id.slice(0, 4)}
                    </a>
                  </li>
                ))}
              </ul>
            )}

            <button
              type="button"
              onClick={() => {
                onCreated(savedCar);
                onClose();
              }}
              className="w-full py-2 rounded bg-brand hover:bg-brand/90 disabled:opacity-50 text-white text-xs"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
} 