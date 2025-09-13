"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import DocUploader from "@/components/modules/uv-crm/components/DocUploader";
import ChassisInput from '@/components/modules/uv-crm/components/ChassisInput';
import DamageMarkingInterface from '@/components/modules/uv-crm/components/DamageMarkingInterface';

interface DamageMarker {
  id: string;
  x: number;        // Pixel coordinate (0-2029)
  y: number;        // Pixel coordinate (0-765)
  damageType: 'B' | 'BR' | 'C' | 'CR' | 'D' | 'F' | 'FI' | 'L' | 'M' | 'P' | 'PA' | 'PC' | 'R' | 'RU' | 'S' | 'ST';
  severity: 'minor' | 'moderate' | 'major';
  description: string;
}

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
  // Standardized field styling classes
  const fieldClass = "w-full px-4 py-4 rounded-lg bg-black/20 border border-white/10 text-white text-lg focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/40 appearance-none [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]";
  const labelClass = "block text-white/80 text-lg font-semibold mb-3";
  const compactLabelClass = "block text-white/80 text-base font-medium mb-2";
  const compactFieldClass = "w-full px-3 py-3 rounded-lg bg-black/20 border border-white/10 text-white text-base focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/40 appearance-none [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]";

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
    servicecare_2year_price: "",
    servicecare_4year_price: "",
    body_style: "",
    // Consignment-specific fields
    registration_expiry_date: "",
    insurance_expiry_date: "",
    service_records_acquired: false,
    owners_manual_acquired: false,
    spare_tyre_tools_acquired: false,
    fire_extinguisher_acquired: false,
    other_accessories_acquired: false,
    other_accessories_details: "",
    // Vehicle history disclosure fields
    customer_disclosed_accident: false,
    customer_disclosed_flood_damage: false,
    damage_disclosure_details: "",
    // Damage annotations
    damage_annotations: [] as DamageMarker[],
    // Visual inspection notes
    visual_inspection_notes: "",
  });

  const [saving, setSaving] = useState(false);
  const [savedCar, setSavedCar] = useState<any>(null);
  const [docs, setDocs] = useState<any[]>([]);
  const [step, setStep] = useState(0);
  const [activeTab, setActiveTab] = useState<string>('chassis');

  // Map tabs to steps for navigation
  const tabToStep = { chassis: 0, vehicle: 1, pricing: 2, specs: 3, details: 4 };
  const stepToTab = ['chassis', 'vehicle', 'pricing', 'specs', 'details'];
  const currentStep = tabToStep[activeTab as keyof typeof tabToStep];
  const [processing, setProcessing] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [generatingDescription, setGeneratingDescription] = useState(false);
  const [rawEquipmentData, setRawEquipmentData] = useState<any>(null);
  const [generatingEquipment, setGeneratingEquipment] = useState(false);

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
      add(!!form.cost_price_aed, 'Cost Price');
      add(!!form.warranty_package_type, 'Warranty Package Type');
      add(!!form.service_package_type, 'Service Package Type');
      add(!!form.number_of_keys, 'Number of Keys');

      if (form.ownership_type === 'consignment') {
        add(!!form.customer_name, 'Customer Name');
        add(!!form.customer_phone, 'Customer Phone');
        const emailOk = /.+@.+\..+/.test(form.customer_email);
        if (!emailOk) missing.push('Valid Customer Email');
        
        // Consignment-specific fields validation
        add(!!form.registration_expiry_date, 'Registration Expiry Date');
        add(!!form.insurance_expiry_date, 'Insurance Expiry Date');
        // Note: Checkboxes can be true (acquired) or false (not acquired) - no validation needed
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

    if (step === 3) {
      add(!!form.engine, 'Engine');
      add(!!form.transmission, 'Transmission');
      add(!!form.horsepower_hp, 'Horsepower');
      add(!!form.torque_nm, 'Torque');
      add(!!form.cubic_capacity_cc, 'Cubic Capacity');
      add(!!form.body_style, 'Body Style');
    }

    if (step === 4) {
      add(!!form.key_equipment, 'Key Equipment');
      add(!!form.description, 'Description');
    }

    return missing;
  };

  const validateAllTabs = (): string[] => {
    const missing: string[] = [];
    const add = (cond: boolean, label: string) => { if (!cond) missing.push(label); };

    // Chassis validation
    add(!!form.chassis_number, 'Chassis #');

    // Vehicle Info validation
    add(!!form.stock_number, 'Stock Number');
    add(!!form.model_year, 'Model Year');
    add(!!form.vehicle_model, 'Vehicle Model');
    add(!!form.model_family, 'Model Family');
    add(!!form.colour, 'Colour');
    add(!!form.interior_colour, 'Interior Colour');

    // Pricing validation
    add(!!form.regional_specification, 'Regional Specification');
    add(!!form.current_mileage_km, 'Mileage');
    add(!!form.advertised_price_aed, 'Advertised Price');
    add(!!form.cost_price_aed, 'Cost Price');
    add(!!form.warranty_package_type, 'Warranty Package Type');
    add(!!form.service_package_type, 'Service Package Type');
    add(!!form.number_of_keys, 'Number of Keys');

    if (form.ownership_type === 'consignment') {
      add(!!form.customer_name, 'Customer Name');
      add(!!form.customer_phone, 'Customer Phone');
      const emailOk = /.+@.+\..+/.test(form.customer_email);
      if (!emailOk) missing.push('Valid Customer Email');
      
      add(!!form.registration_expiry_date, 'Registration Expiry Date');
      add(!!form.insurance_expiry_date, 'Insurance Expiry Date');
    }

    if (form.warranty_package_type === 'dealer') {
      add(!!form.warranty_expiry_date, 'Warranty Expiry Date');
      add(!!form.warranty_km_limit, 'Warranty KM Limit');
    }
    if (form.service_package_type === 'dealer') {
      add(!!form.service_expiry_date, 'Service Expiry Date');
      add(!!form.service_km_limit, 'Service KM Limit');
    }

    // Specifications validation
    add(!!form.engine, 'Engine');
    add(!!form.transmission, 'Transmission');
    add(!!form.horsepower_hp, 'Horsepower');
    add(!!form.torque_nm, 'Torque');
    add(!!form.cubic_capacity_cc, 'Cubic Capacity');
    add(!!form.body_style, 'Body Style');

    // Details validation
    add(!!form.key_equipment, 'Key Equipment');
    add(!!form.description, 'Description');

    return missing;
  };

  const handleNext = async () => {
    if (processing) return;
    // Update step to match current tab for validation
    setStep(currentStep);
    const missing = validateStep();
    if (missing.length) {
      setErrors(missing);
      return;
    } else {
      setErrors([]);
    }
    setProcessing(true);
    
    try {
      if (currentStep === 0) {
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

            // Store raw equipment data for processing
            setRawEquipmentData(optsObj);

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

            // Engine/transmission enrichment (without description)
            try {
              const enr = await fetch('/api/enrich-vin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(json)
              });
              const enrJson = await enr.json();
              if (enrJson.success) {
                const d = enrJson.data;
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
                  torque_nm: toNumberStr(tqRaw) || prev.torque_nm
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
      // Move to next tab
      const nextStep = currentStep + 1;
      if (nextStep < stepToTab.length) {
        setActiveTab(stepToTab[nextStep]);
        setStep(nextStep);
      }
    } finally {
      setProcessing(false);
    }
  };

  const handleBack = () => {
    const prevStep = currentStep - 1;
    if (prevStep >= 0) {
      setActiveTab(stepToTab[prevStep]);
      setStep(prevStep);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const upperCaseFields = ['chassis_number', 'stock_number', 'vehicle_model', 'model_family', 'colour', 'interior_colour', 'key_equipment'];
    const numericFields = ['cost_price_aed', 'advertised_price_aed', 'warranty_km_limit', 'service_km_limit', 'current_mileage_km', 'number_of_keys', 'servicecare_2year_price', 'servicecare_4year_price'];
    const dateFields = ['registration_expiry_date', 'insurance_expiry_date', 'warranty_expiry_date', 'service_expiry_date'];
    
    let processedValue: string | boolean = value;
    
    // Handle checkbox inputs
    if (type === 'checkbox') {
      processedValue = (e.target as HTMLInputElement).checked;
    } else if (upperCaseFields.includes(name)) {
      processedValue = value.toUpperCase();
    } else if (numericFields.includes(name)) {
      processedValue = value.replace(/[^0-9]/g, '');
    } else if (dateFields.includes(name) && value) {
      // Ensure date is in yyyy-mm-dd format (HTML date input handles this automatically)
      processedValue = value;
    }
    
    setForm((prev) => {
      const updated: any = { ...prev, [name]: processedValue };
      if (name === 'chassis_number' && typeof processedValue === 'string') {
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

  const generateDescription = async () => {
    if (generatingDescription) return;
    setGeneratingDescription(true);
    
    try {
      const carData = {
        model_year: form.model_year,
        vehicle_model: form.vehicle_model,
        model_family: form.model_family,
        colour: form.colour,
        interior_colour: form.interior_colour,
        engine: form.engine,
        transmission: form.transmission,
        horsepower_hp: form.horsepower_hp,
        torque_nm: form.torque_nm,
        cubic_capacity_cc: form.cubic_capacity_cc,
        key_equipment: form.key_equipment
      };

      const response = await fetch('/api/generate-car-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(carData)
      });

      const result = await response.json();
      if (result.success && result.description) {
        setForm(prev => ({
          ...prev,
          description: result.description
        }));
      } else {
        alert('Failed to generate description. Please try again.');
      }
    } catch (error) {
      console.error('Error generating description:', error);
      alert('Failed to generate description. Please try again.');
    } finally {
      setGeneratingDescription(false);
    }
  };

  const generateKeyEquipment = async () => {
    if (generatingEquipment || !rawEquipmentData) return;
    setGeneratingEquipment(true);
    
    try {
      const response = await fetch('/api/process-key-equipment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawEquipment: rawEquipmentData })
      });

      const result = await response.json();
      if (result.success && result.equipment) {
        console.log(`Processed equipment: ${result.equipment.length} characters`);
        setForm(prev => ({
          ...prev,
          key_equipment: result.equipment
        }));
      } else {
        alert('Failed to process key equipment. Please try again.');
      }
    } catch (error) {
      console.error('Error processing key equipment:', error);
      alert('Failed to process key equipment. Please try again.');
    } finally {
      setGeneratingEquipment(false);
    }
  };

  // Helper function to ensure dates are in yyyy-mm-dd format
  const formatDateForDatabase = (dateString: string): string | null => {
    if (!dateString) return null;
    
    // If it's already in yyyy-mm-dd format, return as is
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      return dateString;
    }
    
    // If it's in dd/mm/yyyy format, convert to yyyy-mm-dd
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateString)) {
      const [day, month, year] = dateString.split('/');
      return `${year}-${month}-${day}`;
    }
    
    // Try to parse the date and format it
    try {
      const date = new Date(dateString);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0]; // Returns yyyy-mm-dd
      }
    } catch (e) {
      console.error('Date parsing error:', e);
    }
    
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.stock_number || !form.model_year || !form.vehicle_model || !form.model_family || !form.colour || !form.chassis_number || !form.advertised_price_aed) return;
    
    // Check character limits
    if (form.description.length > 1500 || form.key_equipment.length > 1800) {
      alert('Please check character limits: Description max 1500, Key Equipment max 1800');
      return;
    }
    
    setSaving(true);
    
    // Get current user for created_by field
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user?.id) {
      alert('Authentication error: Please log in again');
      setSaving(false);
      return;
    }
    
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
          : `SilberArrows ServiceCare available - 2yr: AED ${form.servicecare_2year_price || 'TBD'}, 4yr: AED ${form.servicecare_4year_price || 'TBD'}`,
        regional_specification: form.regional_specification || null,
        body_style: form.body_style || null,
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
        // Consignment-specific fields  
        registration_expiry_date: form.ownership_type === 'consignment' 
          ? formatDateForDatabase(form.registration_expiry_date) : null,
        insurance_expiry_date: form.ownership_type === 'consignment' 
          ? formatDateForDatabase(form.insurance_expiry_date) : null,
        service_records_acquired: form.ownership_type === 'consignment' ? form.service_records_acquired : null,
        owners_manual_acquired: form.ownership_type === 'consignment' ? form.owners_manual_acquired : null,
        spare_tyre_tools_acquired: form.ownership_type === 'consignment' ? form.spare_tyre_tools_acquired : null,
        fire_extinguisher_acquired: form.ownership_type === 'consignment' ? form.fire_extinguisher_acquired : null,
        other_accessories_acquired: form.ownership_type === 'consignment' ? form.other_accessories_acquired : null,
        other_accessories_details: form.ownership_type === 'consignment' ? form.other_accessories_details.trim() || null : null,
        // Vehicle history disclosure fields
        customer_disclosed_accident: form.ownership_type === 'consignment' ? form.customer_disclosed_accident : null,
        customer_disclosed_flood_damage: form.ownership_type === 'consignment' ? form.customer_disclosed_flood_damage : null,
        damage_disclosure_details: form.ownership_type === 'consignment' ? form.damage_disclosure_details.trim() || null : null,
        // Damage annotations
        damage_annotations: form.ownership_type === 'consignment' ? form.damage_annotations : null,
        // Visual inspection notes
        visual_inspection_notes: form.ownership_type === 'consignment' ? form.visual_inspection_notes.trim() || null : null,
        key_equipment: form.key_equipment.trim(),
        description: form.description.trim(),
        status: "marketing",
        sale_status: "available",
        created_by: userData.user.id,
      },
    ]).select().single();
    
    setSaving(false);
    if (error) {
      alert(error.message);
      return;
    }
    setSavedCar(data);
    
    // Generate damage report image if this is a consignment car with damage annotations
    if (form.ownership_type === 'consignment' && form.damage_annotations.length > 0) {
      try {
        console.log('🔧 Generating damage report image for new car:', data.id);
        const response = await fetch('/api/generate-damage-report-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            carId: data.id,
            damageAnnotations: form.damage_annotations,
            inspectionNotes: form.visual_inspection_notes
          })
        });

        const result = await response.json();
        if (result.success) {
          console.log('✅ Damage report image generated for new car:', result.imageUrl);
        } else {
          console.error('❌ Failed to generate damage report image:', result.error);
        }
      } catch (error) {
        console.error('❌ Error generating damage report image:', error);
      }
    }
    
    const { data: docRows } = await supabase.from('car_media').select('*').eq('car_id', data.id).eq('kind', 'document');
    setDocs(docRows || []);
  };

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
        <h2 className="text-base font-semibold text-white mb-1">Add New Car</h2>
        
        {errors.length > 0 && (
          <div className="mb-3 bg-red-600/80 text-white text-xs p-2 rounded">
            <p className="font-semibold mb-1">Please complete:</p>
            <ul className="list-disc list-inside space-y-0.5">
              {errors.map(e => <li key={e}>{e}</li>)}
            </ul>
          </div>
        )}
        
        {!savedCar ? (
          <>
          {/* Tab Navigation */}
          <div className="border-b border-white/20 mb-6">
            <nav className="flex space-x-3" aria-label="Tabs">
              {[
                { id: 'chassis', label: 'Chassis', step: 0 },
                { id: 'vehicle', label: 'Vehicle Info', step: 1 },
                { id: 'pricing', label: 'Pricing', step: 2 },
                { id: 'specs', label: 'Specifications', step: 3 },
                { id: 'details', label: 'Details', step: 4 }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative whitespace-nowrap py-2.5 px-4 font-semibold text-[13px] md:text-sm uppercase tracking-wide rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400/50 focus:ring-offset-2 focus:ring-offset-black/40 ${
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
              {/* Prevent implicit submits; we call handleSubmit manually */}
              <form onSubmit={(e) => { e.preventDefault(); }} className="space-y-6">
            {/* Chassis Tab */}
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
                      <ChassisInput value={form.chassis_number} onChange={(val) => {
                        handleChange({
                          target: { name: 'chassis_number', value: val }
                        } as any);
                      }} />
                    </div>
                    <p className="text-white/50 text-lg max-w-2xl mx-auto">
                      The VIN will automatically populate vehicle details in the next steps
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Vehicle Info Tab */}
            {activeTab === 'vehicle' && (
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-8 min-h-[500px] space-y-8 flex flex-col justify-center">
              <div className="text-center">
                <h3 className="text-white text-4xl font-bold mb-6">Vehicle Information</h3>
                <p className="text-white/70 text-xl mb-8">Complete the vehicle details below</p>
              </div>
              <div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {[
                    { label: "Stock Number", name: "stock_number", readOnly: true, placeholder: "Auto generated" },
                    { label: "Model Year", name: "model_year", type: "number" },
                    { label: "Vehicle Model", name: "vehicle_model" },
                  ].map((f) => (
                    <div key={f.name}>
                      <label className={labelClass}>{f.label}</label>
                      <input
                        name={f.name}
                        type={(f as any).type || "text"}
                        value={(form as any)[f.name]}
                        onChange={handleChange}
                        className={fieldClass}
                        style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)' }}
                        required={f.name !== 'stock_number'}
                        readOnly={(f as any).readOnly}
                        placeholder={(f as any).placeholder}
                      />
                    </div>
                  ))}
                    
                    {/* Model Family Dropdown */}
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
                        <label className={labelClass}>{f.label}</label>
                        <input
                          name={f.name}
                          type="text"
                          value={(form as any)[f.name]}
                          onChange={handleChange}
                          className={fieldClass}
                          style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)' }}
                          required
                        />
                      </div>
                    ))}
                  </div>
              </div>
            </div>
            )}

            {/* Pricing Tab */}
            {activeTab === 'pricing' && (
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-8 space-y-6 min-h-[500px]">
                <div className="text-center mb-6">
                  <h2 className="text-4xl font-bold text-white mb-4">Pricing & Condition</h2>
                  <p className="text-xl text-white/60">Set the pricing details and condition for this vehicle</p>
                </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Ownership Type */}
                <div>
                  <label className={compactLabelClass}>Ownership Type</label>
                  <select
                    name="ownership_type"
                    value={form.ownership_type}
                    onChange={handleChange}
                    className={compactFieldClass}
                    style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)' }}
                  >
                    <option value="stock">Stock</option>
                    <option value="consignment">Consignment</option>
                  </select>
                </div>

                {/* Regional Specification */}
                <div>
                  <label className={compactLabelClass}>Regional Specification</label>
                  <select
                    name="regional_specification"
                    value={form.regional_specification}
                    onChange={handleChange}
                    className={compactFieldClass}
                    style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)' }}
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
                  <label className={compactLabelClass}>Mileage (KM)</label>
                  <input
                    name="current_mileage_km"
                    value={form.current_mileage_km}
                    onChange={handleChange}
                    inputMode="numeric"
                    className={compactFieldClass}
                    style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)' }}
                    required
                  />
                </div>

                {/* Number of Keys */}
                <div>
                  <label className={compactLabelClass}>Number of Keys</label>
                  <input
                    type="number"
                    name="number_of_keys"
                    value={form.number_of_keys}
                    onChange={handleChange}
                    className={compactFieldClass}
                    style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)' }}
                  />
                </div>

                {/* Warranty Package */}
                <div className="col-span-2 sm:col-span-1">
                  <label className={compactLabelClass}>Warranty Package</label>
                  <select
                    name="warranty_package_type"
                    value={form.warranty_package_type}
                    onChange={handleChange}
                    className={compactFieldClass}
                    style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)' }}
                    required
                  >
                    <option value="silberarrows">SilberArrows</option>
                    <option value="dealer">Dealer</option>
                  </select>
                  {form.warranty_package_type === 'dealer' && (
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <input
                        type="date"
                        name="warranty_expiry_date"
                        value={form.warranty_expiry_date}
                        onChange={handleChange}
                        className={compactFieldClass}
                        style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)' }}
                      />
                      <input
                        type="text"
                        name="warranty_km_limit"
                        value={form.warranty_km_limit}
                        onChange={handleChange}
                        inputMode="numeric"
                        placeholder="KM limit"
                        className={compactFieldClass}
                        style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)' }}
                      />
                    </div>
                  )}
                </div>

                {/* Service Package */}
                <div className="col-span-2 sm:col-span-1">
                  <label className={compactLabelClass}>Service Package</label>
                  <select
                    name="service_package_type"
                    value={form.service_package_type}
                    onChange={handleChange}
                    className={compactFieldClass}
                    style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)' }}
                    required
                  >
                    <option value="silberarrows">SilberArrows</option>
                    <option value="dealer">Dealer</option>
                  </select>
                  {form.service_package_type === 'dealer' && (
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <input
                        type="date"
                        name="service_expiry_date"
                        value={form.service_expiry_date}
                        onChange={handleChange}
                        className={compactFieldClass}
                        style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)' }}
                      />
                      <input
                        type="text"
                        name="service_km_limit"
                        value={form.service_km_limit}
                        onChange={handleChange}
                        inputMode="numeric"
                        placeholder="KM limit"
                        className={compactFieldClass}
                        style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)' }}
                      />
                    </div>
                  )}
                  {form.service_package_type === 'silberarrows' && (
                    <div className="mt-3 grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-white/80 text-sm font-medium mb-2">ServiceCare 2 Year (AED)</label>
                        <input
                          type="text"
                          name="servicecare_2year_price"
                          value={form.servicecare_2year_price}
                          onChange={handleChange}
                          inputMode="numeric"
                          placeholder="2-year price"
                          className="w-full px-3 py-2 rounded-lg bg-black/20 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/40"
                          style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)' }}
                        />
                      </div>
                      <div>
                        <label className="block text-white/80 text-sm font-medium mb-2">ServiceCare 4 Year (AED)</label>
                        <input
                          type="text"
                          name="servicecare_4year_price"
                          value={form.servicecare_4year_price}
                          onChange={handleChange}
                          inputMode="numeric"
                          placeholder="4-year price"
                          className="w-full px-3 py-2 rounded-lg bg-black/20 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/40"
                          style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)' }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Cost & Advertised Price */}
                <div>
                  <label className={compactLabelClass}>Cost Price (AED)</label>
                  <input
                    name="cost_price_aed"
                    value={form.cost_price_aed}
                    onChange={handleChange}
                    inputMode="numeric"
                    className={compactFieldClass}
                    style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)' }}
                  />
                </div>

                <div>
                  <label className={compactLabelClass}>Advertised Price (AED)</label>
                  <input
                    name="advertised_price_aed"
                    value={form.advertised_price_aed}
                    onChange={handleChange}
                    inputMode="numeric"
                    className={compactFieldClass}
                    style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)' }}
                    required
                  />
                  {monthlyPayments && (
                    <div className="mt-1 text-xs text-white/70 space-y-0.5">
                      <p>0% Down: AED {monthlyPayments.zero.toLocaleString()}/mo</p>
                      <p>20% Down: AED {monthlyPayments.twenty.toLocaleString()}/mo</p>
                    </div>
                  )}
                </div>

                  {/* Consignment Customer Details */}
                {form.ownership_type === 'consignment' && (
                  <>
                    <div className="col-span-2 sm:col-span-1">
                      <label className={compactLabelClass}>Customer Name</label>
                      <input
                        name="customer_name"
                        value={form.customer_name}
                        onChange={handleChange}
                        className={compactFieldClass}
                        style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)' }}
                        required
                      />
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <label className={compactLabelClass}>Customer Phone</label>
                      <input
                        name="customer_phone"
                        value={form.customer_phone}
                        onChange={handleChange}
                        className={compactFieldClass}
                        style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)' }}
                        required
                      />
                    </div>
                    <div className="col-span-2">
                      <label className={compactLabelClass}>Customer Email</label>
                      <input
                        name="customer_email"
                        type="email"
                        value={form.customer_email}
                        onChange={handleChange}
                        className={compactFieldClass}
                        style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)' }}
                        required
                      />
                    </div>

                    {/* Consignment Additional Fields */}
                    <div className="col-span-2 sm:col-span-1">
                      <label className={compactLabelClass}>Registration Expiry</label>
                      <input
                        type="date"
                        name="registration_expiry_date"
                        value={form.registration_expiry_date}
                        onChange={handleChange}
                        className={compactFieldClass}
                        style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)' }}
                        required={form.ownership_type === 'consignment'}
                      />
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <label className={compactLabelClass}>Insurance Expiry</label>
                      <input
                        type="date"
                        name="insurance_expiry_date"
                        value={form.insurance_expiry_date}
                        onChange={handleChange}
                        className={compactFieldClass}
                        style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)' }}
                        required={form.ownership_type === 'consignment'}
                      />
                    </div>

                    {/* Vehicle History Disclosure */}
                    <div className="col-span-2">
                      <div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-4">
                        <h3 className="text-white/80 text-sm font-semibold mb-3">Customer Vehicle History Disclosure</h3>
                        <p className="text-white/60 text-xs mb-4">Based on your conversation with the consignment customer, please answer the following:</p>
                        
                        {/* Question 1: Accident History */}
                        <div className="space-y-2">
                          <label className="block text-white/70 text-xs font-medium">
                            Has the customer disclosed that the vehicle was ever involved in an accident or collision?
                          </label>
                          <div className="flex items-center space-x-6">
                            <label className="flex items-center space-x-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={form.customer_disclosed_accident}
                                onChange={(e) => setForm(prev => ({ 
                                  ...prev, 
                                  customer_disclosed_accident: e.target.checked,
                                  // Clear details if both questions become false
                                  damage_disclosure_details: (!e.target.checked && !prev.customer_disclosed_flood_damage) ? "" : prev.damage_disclosure_details
                                }))}
                                className="w-4 h-4 text-white bg-black/20 border border-white/20 rounded focus:ring-white/40 focus:ring-2"
                              />
                              <span className="text-white/70 text-xs">Yes</span>
                            </label>
                            <label className="flex items-center space-x-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={!form.customer_disclosed_accident}
                                onChange={(e) => setForm(prev => ({ 
                                  ...prev, 
                                  customer_disclosed_accident: !e.target.checked,
                                  // Clear details if both questions become false
                                  damage_disclosure_details: (e.target.checked && !prev.customer_disclosed_flood_damage) ? "" : prev.damage_disclosure_details
                                }))}
                                className="w-4 h-4 text-white bg-black/20 border border-white/20 rounded focus:ring-white/40 focus:ring-2"
                              />
                              <span className="text-white/70 text-xs">No</span>
                            </label>
                          </div>
                        </div>

                        {/* Question 2: Flood Damage */}
                        <div className="space-y-2">
                          <label className="block text-white/70 text-xs font-medium">
                            Has the customer disclosed that the vehicle sustained damage or was affected by flooding/water exposure?
                          </label>
                          <div className="flex items-center space-x-6">
                            <label className="flex items-center space-x-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={form.customer_disclosed_flood_damage}
                                onChange={(e) => setForm(prev => ({ 
                                  ...prev, 
                                  customer_disclosed_flood_damage: e.target.checked,
                                  // Clear details if both questions become false
                                  damage_disclosure_details: (!e.target.checked && !prev.customer_disclosed_accident) ? "" : prev.damage_disclosure_details
                                }))}
                                className="w-4 h-4 text-white bg-black/20 border border-white/20 rounded focus:ring-white/40 focus:ring-2"
                              />
                              <span className="text-white/70 text-xs">Yes</span>
                            </label>
                            <label className="flex items-center space-x-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={!form.customer_disclosed_flood_damage}
                                onChange={(e) => setForm(prev => ({ 
                                  ...prev, 
                                  customer_disclosed_flood_damage: !e.target.checked,
                                  // Clear details if both questions become false
                                  damage_disclosure_details: (e.target.checked && !prev.customer_disclosed_accident) ? "" : prev.damage_disclosure_details
                                }))}
                                className="w-4 h-4 text-white bg-black/20 border border-white/20 rounded focus:ring-white/40 focus:ring-2"
                              />
                              <span className="text-white/70 text-xs">No</span>
                            </label>
                          </div>
                        </div>

                        {/* Question 3: Details (Conditional) */}
                        {(form.customer_disclosed_accident || form.customer_disclosed_flood_damage) && (
                          <div className="space-y-2">
                            <label className="block text-white/70 text-xs font-medium">
                              If you answered 'Yes' to any of the above, please provide the details the customer shared:
                            </label>
                            <textarea
                              name="damage_disclosure_details"
                              value={form.damage_disclosure_details}
                              onChange={handleChange}
                              rows={3}
                              className={compactFieldClass}
                              style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)' }}
                              placeholder="Enter details about the accident or damage as disclosed by the customer..."
                            />
                          </div>
                        )}
                      </div>
                    </div>

                                         {/* Handover Checklist */}
                     <div className="col-span-2">
                       <label className="block text-white/60 mb-2 text-xs font-semibold">Handover Checklist (Check if acquired)</label>
                       <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                         {[
                           { label: "Service Records Acquired", name: "service_records_acquired" },
                           { label: "Owner's Manual Acquired", name: "owners_manual_acquired" },
                           { label: "Spare Tyre & Tools Acquired", name: "spare_tyre_tools_acquired" },
                           { label: "Fire Extinguisher Acquired", name: "fire_extinguisher_acquired" },
                           { label: "Other Accessories Acquired", name: "other_accessories_acquired" },
                         ].map((checkbox) => (
                           <div key={checkbox.name} className="flex items-center space-x-2">
                             <input
                               type="checkbox"
                               name={checkbox.name}
                               checked={(form as any)[checkbox.name]}
                               onChange={(e) => setForm(prev => ({ 
                                 ...prev, 
                                 [checkbox.name]: e.target.checked 
                               }))}
                               className="w-4 h-4 text-white bg-black/20 border border-white/20 rounded focus:ring-white/40 focus:ring-2"
                             />
                             <label className="text-white/70 text-xs">{checkbox.label}</label>
                           </div>
                         ))}
                       </div>
                       
                       {/* Other Accessories Details - Conditional Field */}
                       {form.other_accessories_acquired && (
                         <div className="mt-4">
                           <label className="block text-white/60 mb-2 text-xs font-semibold">Other Accessories Details</label>
                           <textarea
                             name="other_accessories_details"
                             value={form.other_accessories_details}
                             onChange={handleChange}
                             placeholder="Describe the other accessories acquired (e.g., car cover, floor mats, phone charger, etc.)"
                             className="w-full px-3 py-2 rounded-lg bg-black/20 border border-white/10 text-white text-xs placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/40 resize-y min-h-[60px]"
                             rows={3}
                           />
                         </div>
                       )}
                     </div>

                    {/* Pre-Used Vehicle Check */}
                    <div className="col-span-2">
                      <div className="bg-white/5 border border-white/10 rounded-lg p-6">
                        <h3 className="text-white/80 text-lg font-semibold mb-4">Pre-Used Vehicle Check</h3>
                        <p className="text-white/60 text-sm mb-6">Mark any existing damage on the vehicle diagram below. This will be included in the consignment agreement.</p>
                        
                        <DamageMarkingInterface
                          carId="temp-car-id" // Will be updated after car is saved
                          initialAnnotations={form.damage_annotations}
                          initialInspectionNotes={form.visual_inspection_notes}
                          onSave={(annotations, inspectionNotes) => {
                            setForm(prev => ({ 
                              ...prev, 
                              damage_annotations: annotations,
                              visual_inspection_notes: inspectionNotes
                            }));
                          }}
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
            )}

            {/* Specifications Tab */}
            {activeTab === 'specs' && (
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-8 space-y-6 min-h-[500px] flex flex-col justify-center">
                <div className="text-center mb-6">
                  <h2 className="text-4xl font-bold text-white mb-4">Specifications</h2>
                  <p className="text-xl text-white/60">Enter the technical specifications for this vehicle</p>
                </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Body Style Dropdown */}
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

            {/* Details Tab */}
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
                    <div className="flex items-center gap-4">
                      <button
                        type="button"
                        onClick={generateKeyEquipment}
                        disabled={generatingEquipment || !rawEquipmentData}
                        className="px-4 py-2 text-sm bg-green-600/20 hover:bg-green-600/30 disabled:opacity-50 disabled:cursor-not-allowed text-green-300 border border-green-500/30 rounded-lg transition-colors flex items-center gap-2"
                        title={!rawEquipmentData ? "VIN decode first to get equipment data" : "Process raw equipment data"}
                      >
                        {generatingEquipment ? (
                          <>
                            <div className="w-4 h-4 border border-green-300/30 border-t-green-300 rounded-full animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                            </svg>
                            Process
                          </>
                        )}
                      </button>
                      <span className={`text-sm ${form.key_equipment.length > 1800 ? 'text-red-400' : 'text-white/60'}`}>
                        {form.key_equipment.length}/1800
                      </span>
                    </div>
                  </div>
                  <textarea
                    name="key_equipment"
                    value={form.key_equipment}
                    onChange={handleChange}
                    className={`${fieldClass} resize-y min-h-[200px] ${
                      form.key_equipment.length > 1800 ? 'border-red-400' : ''
                    }`}
                    style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)' }}
                    rows={8}
                    required
                    maxLength={1800}
                  />
                  {form.key_equipment.length > 1800 && (
                    <p className="text-red-400 text-sm mt-2">Key equipment must be 1800 characters or less</p>
                  )}
                </div>

                <div>
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-2xl font-bold text-white">Description</h3>
                    <div className="flex items-center gap-4">
                      <button
                        type="button"
                        onClick={generateDescription}
                        disabled={generatingDescription || !form.model_year || !form.vehicle_model || !form.colour}
                        className="px-4 py-2 text-sm bg-blue-600/20 hover:bg-blue-600/30 disabled:opacity-50 disabled:cursor-not-allowed text-blue-300 border border-blue-500/30 rounded-lg transition-colors flex items-center gap-2"
                      >
                        {generatingDescription ? (
                          <>
                            <div className="w-4 h-4 border border-blue-300/30 border-t-blue-300 rounded-full animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            Generate
                          </>
                        )}
                      </button>
                      <span className={`text-sm ${form.description.length > 1500 ? 'text-red-400' : 'text-white/60'}`}>
                        {form.description.length}/1500
                      </span>
                    </div>
                  </div>
                  <textarea
                    name="description"
                    value={form.description}
                    onChange={handleChange}
                    className={`${fieldClass} resize-y min-h-[200px] ${
                      form.description.length > 1500 ? 'border-red-400' : ''
                    }`}
                    style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)' }}
                    rows={8}
                    maxLength={1500}
                  />
                  {form.description.length > 1500 && (
                    <p className="text-red-400 text-sm mt-2">Description must be 1500 characters or less</p>
                  )}
                </div>
              </div>
              </div>
            )}

          </form>
            </div>
          </div>

          {/* Navigation Buttons */}
          <div className="flex gap-2 justify-between pt-4 border-t border-white/10">
            {currentStep > 0 && (
              <button
                type="button"
                onClick={handleBack}
                className="flex-1 py-2 rounded bg-white/10 hover:bg-white/20 text-white text-xs"
              >
                Back
              </button>
            )}
            
            {currentStep < totalSteps - 1 ? (
              <button
                type="button"
                onClick={handleNext}
                disabled={processing}
                className={`flex-1 py-2 rounded bg-brand hover:bg-brand/90 disabled:opacity-50 text-white text-xs ${
                  currentStep === 0 ? 'w-full' : ''
                }`}
              >
                {processing ? 'Processing...' : 'Next'}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  const missing = validateAllTabs();
                  if (missing.length) {
                    setErrors(missing);
                    return;
                  }
                  setErrors([]);
                  handleSubmit({ preventDefault: () => {} } as React.FormEvent);
                }}
                disabled={saving}
                className="flex-1 py-2 rounded bg-brand hover:bg-brand/90 disabled:opacity-50 text-white text-xs"
              >
                {saving ? 'Creating...' : 'Create Car'}
              </button>
            )}
          </div>
          </>
        ) : (
          <>
            <div className="flex-1 min-h-0 overflow-y-auto">
              <div className="p-8">
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
                </div>
              </div>
            </div>

            {/* Navigation Buttons */}
            <div className="flex gap-2 justify-between pt-4 border-t border-white/10">
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
          </>
        )}
      </div>
    </div>
  );
} 