"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import LeasingChassisInput from '@/components/modules/leasing/components/LeasingChassisInput';
import LeasingDocUploader from '@/components/modules/leasing/components/LeasingDocUploader';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (vehicle: any) => void;
  mode?: 'create' | 'edit';
  existingVehicle?: any;
}

interface MediaItem {
  id: string;
  url: string;
  kind: string;
  sort_order: number;
  is_primary: boolean;
  filename?: string;
  created_at?: string;
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
  // Standardized field styling classes
  const fieldClass = "w-full px-4 py-4 rounded-lg bg-black/20 border border-white/10 text-white text-lg focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/40 appearance-none [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]";
  const labelClass = "block text-white/80 text-lg font-semibold mb-3";
  const compactLabelClass = "block text-white/80 text-base font-medium mb-2";
  const compactFieldClass = "w-full px-3 py-3 rounded-lg bg-black/20 border border-white/10 text-white text-base focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/40 appearance-none [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]";
  
  // Read-only field styling for view mode
  const readonlyFieldClass = "w-full px-4 py-4 rounded-lg bg-black/20 border border-white/10 text-white text-lg cursor-default appearance-none disabled:bg-black/20 disabled:text-white disabled:opacity-100";
  const readonlyCompactFieldClass = "w-full px-3 py-3 rounded-lg bg-black/20 border border-white/10 text-white text-base cursor-default appearance-none disabled:bg-black/20 disabled:text-white disabled:opacity-100";

  const [form, setForm] = useState({
    // Basic vehicle info
    stock_number: existingVehicle?.stock_number || "",
    plate_number: existingVehicle?.plate_number || "",
    chassis_number: existingVehicle?.chassis_number || "",
    engine_number: existingVehicle?.engine_number || "",
    purchase_date: existingVehicle?.purchase_date || "",
    
    // Vehicle details
    model_year: existingVehicle?.model_year?.toString() || "",
    vehicle_model: existingVehicle?.vehicle_model || "",
    model_family: existingVehicle?.model_family || "",
    category: existingVehicle?.category || "A CLASS",
    colour: existingVehicle?.colour || "",
    interior_colour: existingVehicle?.interior_colour || "",
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
    mylocator_mileage: existingVehicle?.mylocator_mileage?.toString() || "",
    
    // Service tracking
    first_service_date: existingVehicle?.first_service_date || "",
    second_service_date: existingVehicle?.second_service_date || "",
    last_service_date: existingVehicle?.last_service_date || "",
    next_service_due: existingVehicle?.next_service_due || "",
    
    // Financial tracking
    acquired_cost: existingVehicle?.acquired_cost?.toString() || "",
    monthly_depreciation: existingVehicle?.monthly_depreciation?.toString() || "",
    excess_usage_depreciation: existingVehicle?.excess_usage_depreciation?.toString() || "0",
    accumulated_depreciation: existingVehicle?.accumulated_depreciation?.toString() || "0",
    carrying_value: existingVehicle?.carrying_value?.toString() || "",
    buyout_price: existingVehicle?.buyout_price?.toString() || "",
    excess_mileage_charges: existingVehicle?.excess_mileage_charges?.toString() || "",
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
    description: existingVehicle?.description || "",
    key_equipment: existingVehicle?.key_equipment || "",
    remarks: existingVehicle?.remarks || "",
    insurance_expiry_date: existingVehicle?.insurance_expiry_date || "",
  });

  const [saving, setSaving] = useState(false);
  const [savedVehicle, setSavedVehicle] = useState<any>(null);
  const [step, setStep] = useState(0);
  const [activeTab, setActiveTab] = useState<string>('chassis');
  const [editing, setEditing] = useState(false);

  // Media state
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedMediaIds, setSelectedMediaIds] = useState<Set<string>>(new Set());
  const [showGallery, setShowGallery] = useState(false);
  const [galleryIdx, setGalleryIdx] = useState(0);
  const [downloadingGallery, setDownloadingGallery] = useState(false);
  const [downloadingSocial, setDownloadingSocial] = useState(false);
  const [downloadingCatalog, setDownloadingCatalog] = useState(false);
  const [reorderLoading, setReorderLoading] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Documents state
  const [docs, setDocs] = useState<MediaItem[]>([]);
  
  // PDF generation state
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string>('');

  // Determine if we're in view mode (edit mode but not editing)
  const isViewMode = mode === 'edit' && existingVehicle && !editing;
  
  // Get the appropriate field class based on mode
  const getFieldClass = (compact = false) => {
    if (isViewMode) {
      return compact ? readonlyCompactFieldClass : readonlyFieldClass;
    }
    return compact ? compactFieldClass : fieldClass;
  };

  // Conditional onChange handler
  const handleChangeConditional = (e: any) => {
    if (!isViewMode) {
      handleChange(e);
    }
  };

  // Map tabs to steps for navigation (expanded for comprehensive data)
  const tabToStep = { chassis: 0, media: 1, details: 2, pricing: 3, service: 4, documents: 5 };
  const stepToTab = ['chassis', 'media', 'details', 'pricing', 'service', 'documents'];
  const currentStep = tabToStep[activeTab as keyof typeof tabToStep];
  
  const [processing, setProcessing] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  // Sync form when existingVehicle or mode changes (for edit mode ONLY)
  useEffect(() => {
    console.log('🔄 useEffect triggered - isOpen:', isOpen, 'mode:', mode, 'existingVehicle:', !!existingVehicle);
    if (isOpen && mode === 'edit' && existingVehicle) {
      console.log('🔍 Loading existing vehicle data for ID:', existingVehicle.id);
      console.log('🔍 Full existingVehicle object:', existingVehicle);
      console.log('🔍 Specific fields:', {
        vehicle_model: existingVehicle.vehicle_model,
        model_family: existingVehicle.model_family,
        colour: existingVehicle.colour,
        interior_colour: existingVehicle.interior_colour,
        chassis_number: existingVehicle.chassis_number,
        description: existingVehicle.description
      });
      
      const newForm = {
        // Basic vehicle info
        stock_number: existingVehicle.stock_number || "",
        plate_number: existingVehicle.plate_number || "",
        chassis_number: existingVehicle.chassis_number || "",
        engine_number: existingVehicle.engine_number || "",
        purchase_date: existingVehicle.purchase_date || "",
        
        // Vehicle details
        model_year: existingVehicle.model_year?.toString() || "",
        vehicle_model: existingVehicle.vehicle_model || "",
        model_family: existingVehicle.model_family || "",
        category: existingVehicle.category || "A CLASS",
        colour: existingVehicle.colour || "",
        interior_colour: existingVehicle.interior_colour || "",
        body_style: existingVehicle.body_style || "",
        
        // Current status
        current_customer_name: existingVehicle.current_customer_name || "",
        current_parking_location: existingVehicle.current_parking_location || "Main Showroom",
        
        // Lease dates
        release_date_out: existingVehicle.release_date_out || "",
        expected_return_date: existingVehicle.expected_return_date || "",
        
        // Lease terms
        lease_to_own_option: existingVehicle.lease_to_own_option || false,
        daily_rate_customer: existingVehicle.daily_rate_customer?.toString() || "",
        daily_rate_vehicle: existingVehicle.daily_rate_vehicle?.toString() || "",
        planned_lease_pricing: existingVehicle.planned_lease_pricing?.toString() || "",
        monthly_lease_rate: existingVehicle.monthly_lease_rate?.toString() || "",
        security_deposit: existingVehicle.security_deposit?.toString() || "",
        lease_term_months: existingVehicle.lease_term_months?.toString() || "",
        max_mileage_per_year: existingVehicle.max_mileage_per_year?.toString() || "",
        condition: existingVehicle.condition || "",
        condition_notes: existingVehicle.condition_notes || "",
        
        // Mileage tracking
        current_mileage_km: existingVehicle.current_mileage_km?.toString() || "",
        mylocator_mileage: existingVehicle.mylocator_mileage?.toString() || "",
        
        // Service tracking
        first_service_date: existingVehicle.first_service_date || "",
        second_service_date: existingVehicle.second_service_date || "",
        last_service_date: existingVehicle.last_service_date || "",
        next_service_due: existingVehicle.next_service_due || "",
        
        // Financial tracking
        acquired_cost: existingVehicle.acquired_cost?.toString() || "",
        monthly_depreciation: existingVehicle.monthly_depreciation?.toString() || "",
        excess_usage_depreciation: existingVehicle.excess_usage_depreciation?.toString() || "0",
        accumulated_depreciation: existingVehicle.accumulated_depreciation?.toString() || "0",
        carrying_value: existingVehicle.carrying_value?.toString() || "",
        buyout_price: existingVehicle.buyout_price?.toString() || "",
        excess_mileage_charges: existingVehicle.excess_mileage_charges?.toString() || "",
        current_market_value: existingVehicle.current_market_value?.toString() || "",
        unrealized_gain_loss: existingVehicle.unrealized_gain_loss?.toString() || "0",
        
        // Compliance
        warranty_expiry_date: existingVehicle.warranty_expiry_date || "",
        registration_date: existingVehicle.registration_date || "",
        months_registered: existingVehicle.months_registered?.toString() || "",
        
        // Technical specs
        regional_specification: "GCC",
        engine: existingVehicle.engine_type || "",
        transmission: existingVehicle.transmission || "Automatic",
        fuel_type: existingVehicle.fuel_type || "Petrol",
        horsepower_hp: existingVehicle.horsepower_hp?.toString() || "",
        torque_nm: existingVehicle.torque_nm?.toString() || "",
        cubic_capacity_cc: existingVehicle.cubic_capacity_cc?.toString() || "",
        
        // Operational
        location: existingVehicle.location || "",
        parking_spot: existingVehicle.parking_spot || "",
        
        // Notes
        description: existingVehicle.description || "",
        key_equipment: existingVehicle.key_equipment || "",
        remarks: existingVehicle.remarks || "",
        insurance_expiry_date: existingVehicle.insurance_expiry_date || "",
      };
      
      console.log('🔍 Setting form state to:', {
        vehicle_model: newForm.vehicle_model,
        model_family: newForm.model_family,
        colour: newForm.colour,
        interior_colour: newForm.interior_colour,
        chassis_number: newForm.chassis_number,
        description: newForm.description
      });
      
      setForm(newForm);
    }
  }, [isOpen, mode, existingVehicle]);

  // Clear success/error state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setSavedVehicle(null);
      setErrors([]);
      setEditing(false); // Reset to view mode when modal opens
      
      // Reset form for create mode
      if (mode === 'create') {
        console.log('🆕 Resetting form for create mode');
        setForm({
          // Basic vehicle info
          stock_number: "",
          plate_number: "",
          chassis_number: "",
          engine_number: "",
          purchase_date: "",
          
          // Vehicle details
          model_year: "",
          vehicle_model: "",
          model_family: "",
          category: "A CLASS",
          colour: "",
          interior_colour: "",
          body_style: "",
          
          // Current status
          current_customer_name: "",
          current_parking_location: "Main Showroom",
          
          // Lease dates
          release_date_out: "",
          expected_return_date: "",
          
          // Lease terms
          lease_to_own_option: false,
          daily_rate_customer: "",
          daily_rate_vehicle: "",
          planned_lease_pricing: "",
          monthly_lease_rate: "",
          security_deposit: "",
          lease_term_months: "",
          max_mileage_per_year: "",
          condition: "",
          condition_notes: "",
          
          // Mileage tracking
          current_mileage_km: "",
          mylocator_mileage: "",
          
          // Service tracking
          first_service_date: "",
          second_service_date: "",
          last_service_date: "",
          next_service_due: "",
          
          // Financial tracking
          acquired_cost: "",
          monthly_depreciation: "",
          excess_usage_depreciation: "0",
          accumulated_depreciation: "0",
          carrying_value: "",
          buyout_price: "",
          excess_mileage_charges: "",
          current_market_value: "",
          unrealized_gain_loss: "0",
          
          // Compliance
          warranty_expiry_date: "",
          registration_date: "",
          months_registered: "",
          
          // Technical specs
          regional_specification: "GCC",
          engine: "",
          transmission: "Automatic",
          fuel_type: "Petrol",
          horsepower_hp: "",
          torque_nm: "",
          cubic_capacity_cc: "",
          
          // Operational
          location: "",
          parking_spot: "",
          
          // Notes
          description: "",
          key_equipment: "",
          remarks: "",
          insurance_expiry_date: "",
        });
      }
    }
  }, [isOpen, mode]);

  // Load media when modal opens in edit mode
  useEffect(() => {
    if (!isOpen) {
      setMedia([]);
      return;
    }
    const id = savedVehicle?.id || existingVehicle?.id;
    if (mode === 'edit' && id) {
      refetchMedia();
    }
  }, [isOpen, mode, savedVehicle?.id, existingVehicle?.id]);

  // Load documents when savedVehicle or existingVehicle changes
  useEffect(() => {
    if (savedVehicle?.id || existingVehicle?.id) {
      refetchDocs();
    }
  }, [savedVehicle?.id, existingVehicle?.id]);

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

  const totalSteps = 6;

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
      add(!!form.regional_specification, 'Regional Specification');
      add(!!form.current_mileage_km, 'Current Mileage');
    }

    if (step === 2) {
      // Details tab - no required fields
    }

    if (step === 3) {
      add(!!form.monthly_lease_rate, 'Monthly Lease Rate');
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

  const handleSave = async () => {
    console.log('💾 Save button clicked - mode:', mode, 'existingVehicle:', !!existingVehicle);
    if (mode !== 'edit' || !existingVehicle) {
      console.log('❌ Save blocked - mode:', mode, 'existingVehicle:', !!existingVehicle);
      return;
    }
    
    console.log('💾 Starting save process...', {
      excess_mileage_charges: form.excess_mileage_charges,
      monthly_lease_rate: form.monthly_lease_rate,
      security_deposit: form.security_deposit,
      buyout_price: form.buyout_price
    });
    setSaving(true);
    setErrors([]);

    try {
      const vehicleData = {
        // ===== CHASSIS TAB FIELDS =====
        stock_number: form.stock_number.toUpperCase(),
        chassis_number: form.chassis_number.toUpperCase(),
        model_year: form.model_year ? parseInt(form.model_year) : null,
        model_family: form.model_family,
        vehicle_model: form.vehicle_model,
        colour: form.colour,
        interior_colour: form.interior_colour,
        plate_number: form.plate_number || null,
        engine_number: form.engine_number || null,
        regional_specification: form.regional_specification || 'GCC',
        current_mileage_km: form.current_mileage_km ? parseInt(form.current_mileage_km) : null,
        body_style: form.body_style || null,
        category: form.category,
        cubic_capacity_cc: form.cubic_capacity_cc ? parseInt(form.cubic_capacity_cc) : null,
        horsepower_hp: form.horsepower_hp ? parseInt(form.horsepower_hp) : null,
        torque_nm: form.torque_nm ? parseInt(form.torque_nm) : null,
        fuel_type: form.fuel_type || 'Petrol',
        current_parking_location: form.current_parking_location || 'Main Showroom',
        
        // ===== PRICING TAB FIELDS =====
        monthly_lease_rate: form.monthly_lease_rate ? parseFloat(form.monthly_lease_rate) : null,
        security_deposit: form.security_deposit ? parseFloat(form.security_deposit) : null,
        buyout_price: form.buyout_price ? parseFloat(form.buyout_price) : null,
        excess_mileage_charges: form.excess_mileage_charges ? parseFloat(form.excess_mileage_charges) : null,
        purchase_date: form.purchase_date || null,
        acquired_cost: form.acquired_cost ? parseFloat(form.acquired_cost) : null,
        monthly_depreciation: form.monthly_depreciation ? parseFloat(form.monthly_depreciation) : null,
        
        // ===== SERVICE TAB FIELDS =====
        insurance_expiry_date: form.insurance_expiry_date || null,
        first_service_date: form.first_service_date || null,
        second_service_date: form.second_service_date || null,
        warranty_expiry_date: form.warranty_expiry_date || null,
        registration_date: form.registration_date || null,
        
        // ===== DETAILS TAB FIELDS =====
        key_equipment: form.key_equipment || null,
        description: form.description || null,
        
        // ===== SYSTEM FIELDS =====
        make: 'Mercedes-Benz',
        status: 'marketing',
        condition: 'good',
      };

      const { data, error } = await supabase
        .from('leasing_inventory')
        .update(vehicleData)
        .eq('id', existingVehicle.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating vehicle:', error);
        setErrors([`Error updating vehicle: ${error.message}`]);
        return;
      }

      // Update the existing vehicle data
      const updatedVehicle = { ...existingVehicle, ...data };
      console.log('✅ Vehicle saved successfully, calling onCreated callback');
      onCreated(updatedVehicle);
      console.log('🔄 Setting editing to false');
      setEditing(false);
      
    } catch (error) {
      console.error('Error saving vehicle:', error);
      setErrors([`Error saving vehicle: ${error instanceof Error ? error.message : 'Unknown error'}`]);
    } finally {
      setSaving(false);
    }
  };

  // Documents functions
  const refetchDocs = async () => {
    const vehicleId = savedVehicle?.id || existingVehicle?.id;
    if (!vehicleId) return;
    try {
      const { data } = await supabase
        .from('leasing_inventory')
        .select('documents')
        .eq('id', vehicleId)
        .single();
      setDocs(data?.documents || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
    }
  };

  const handleDeleteDocument = async (doc: MediaItem) => {
    try {
      const vehicleId = savedVehicle?.id || existingVehicle?.id;
      if (!vehicleId) return;

      // Remove document from JSON array
      const { data: vehicle } = await supabase
        .from('leasing_inventory')
        .select('documents')
        .eq('id', vehicleId)
        .single();

      const currentDocs = vehicle?.documents || [];
      const updatedDocs = currentDocs.filter((d: any) => d.id !== doc.id);

      const { error: dbError } = await supabase
        .from('leasing_inventory')
        .update({ documents: updatedDocs })
        .eq('id', vehicleId);

      if (dbError) {
        console.error('Error deleting document from database:', dbError);
        alert('Error deleting document from database');
        return;
      }

      // Delete from storage
      const path = doc.url.split('/').slice(-2).join('/'); // Extract path from URL
      const { error: storageError } = await supabase.storage
        .from('leasing')
        .remove([path]);

      if (storageError) {
        console.error('Error deleting document from storage:', storageError);
        // Don't show error to user since DB deletion succeeded
      }

      // Refresh documents list
      await refetchDocs();
    } catch (error) {
      console.error('Error deleting document:', error);
      alert('Error deleting document');
    }
  };

  // PDF generation functions
  const handleGeneratePdf = async () => {
    const vehicleId = savedVehicle?.id || existingVehicle?.id;
    if (!vehicleId) return;

    setGenerating(true);
    setStatusMsg('Generating PDF...');

    try {
      const response = await fetch('/api/generate-vehicle-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          vehicleId: vehicleId,
          vehicleData: savedVehicle || existingVehicle
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }

      const { pdfUrl: generatedPdfUrl } = await response.json();
      setPdfUrl(generatedPdfUrl);
      setStatusMsg('PDF generated successfully!');
      
      // Clear status message after 3 seconds
      setTimeout(() => setStatusMsg(''), 3000);
    } catch (error) {
      console.error('Error generating PDF:', error);
      setStatusMsg('Error generating PDF. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const handleDeleteVehiclePDF = async () => {
    if (!pdfUrl) return;

    try {
      // Delete from storage
      const path = pdfUrl.split('/').slice(-2).join('/');
      const { error } = await supabase.storage
        .from('leasing')
        .remove([path]);

      if (error) {
        console.error('Error deleting PDF from storage:', error);
        alert('Error deleting PDF from storage');
        return;
      }

      setPdfUrl(null);
      setStatusMsg('PDF deleted successfully');
      
      // Clear status message after 3 seconds
      setTimeout(() => setStatusMsg(''), 3000);
    } catch (error) {
      console.error('Error deleting PDF:', error);
      alert('Error deleting PDF');
    }
  };

  // Media functions
  const refetchMedia = async () => {
    if (!existingVehicle?.id) return;
    
    setMediaLoading(true);
    try {
      console.log('📸 Fetching media for vehicle ID:', existingVehicle.id);
      const { data, error } = await supabase
        .from('leasing_inventory')
        .select('photos, social_media_images, catalog_images')
        .eq('id', existingVehicle.id)
        .single();
      
      console.log('📸 Raw media data from database:', data);
      console.log('📸 Database error (if any):', error);
      
      if (error) {
        console.error('Supabase error fetching media:', error);
        setMedia([]);
      } else {
        // Combine all media types with kind property
        const allMedia = [
          ...(data?.photos || []).map((item: any) => ({ ...item, kind: 'photo' })),
          ...(data?.social_media_images || []).map((item: any) => ({ ...item, kind: 'social_media' })),
          ...(data?.catalog_images || []).map((item: any) => ({ ...item, kind: 'catalog' }))
        ];

        // Fix storage URLs for custom domain
        const fixedData = allMedia.map(m => ({
          ...m,
          url: m.url && m.url.includes('.supabase.co/storage/') 
            ? `/api/storage-proxy?url=${encodeURIComponent(m.url)}`
            : m.url
        }));
        
        setMedia(fixedData);
      }
    } catch (error) {
      console.error('Failed to refetch media:', error);
      setMedia([]);
    } finally {
      setMediaLoading(false);
    }
  };

  const handleDeleteMedia = async (item: MediaItem) => {
    if (!confirm('Are you sure you want to delete this media item?')) return;
    
    setMediaLoading(true);
    try {
      // Delete from storage
      const path = item.url.split('/').slice(-2).join('/');
      await supabase.storage.from('leasing').remove([path]);
      
      // Remove from JSON array in vehicle record
      const vehicleId = existingVehicle?.id;
      if (!vehicleId) return;

      const { data: vehicle } = await supabase
        .from('leasing_inventory')
        .select('photos, social_media_images, catalog_images')
        .eq('id', vehicleId)
        .single();

      let updatedField = '';
      let currentItems: any[] = [];
      
      if (item.kind === 'photo') {
        updatedField = 'photos';
        currentItems = vehicle?.photos || [];
      } else if (item.kind === 'social_media') {
        updatedField = 'social_media_images';
        currentItems = vehicle?.social_media_images || [];
      } else if (item.kind === 'catalog') {
        updatedField = 'catalog_images';
        currentItems = vehicle?.catalog_images || [];
      }

      const updatedItems = currentItems.filter((i: any) => i.id !== item.id);

      const { error } = await supabase
        .from('leasing_inventory')
        .update({ [updatedField]: updatedItems })
        .eq('id', vehicleId);
      
      if (error) throw error;
      
      // Update local state
      setMedia(prev => prev.filter(m => m.id !== item.id));
    } catch (error) {
      console.error('Error deleting media:', error);
      alert('Failed to delete media item');
    } finally {
      setMediaLoading(false);
    }
  };

  const handleSetPrimary = async (mediaId: string) => {
    if (!existingVehicle?.id) return;
    
    setMediaLoading(true);
    try {
      const vehicleId = existingVehicle?.id;
      if (!vehicleId) return;

      // Get current photos
      const { data: vehicle } = await supabase
        .from('leasing_inventory')
        .select('photos')
        .eq('id', vehicleId)
        .single();

      const currentPhotos = vehicle?.photos || [];
      
      // Update all photos to remove primary, then set the selected one as primary
      const updatedPhotos = currentPhotos.map((photo: any) => ({
        ...photo,
        is_primary: photo.id === mediaId
      }));

      const { error } = await supabase
        .from('leasing_inventory')
        .update({ photos: updatedPhotos })
        .eq('id', vehicleId);
      
      if (error) throw error;
      
      // Update local state
      setMedia(prev => prev.map(m => ({
        ...m,
        is_primary: m.id === mediaId && m.kind === 'photo'
      })));
    } catch (error) {
      console.error('Error setting primary:', error);
      alert('Failed to set primary photo');
    } finally {
      setMediaLoading(false);
    }
  };

  const toggleMediaSelection = (mediaId: string) => {
    setSelectedMediaIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(mediaId)) {
        newSet.delete(mediaId);
      } else {
        newSet.add(mediaId);
      }
      return newSet;
    });
  };

  const selectAllMedia = () => {
    const gallery = media.filter(m => m.kind === 'photo');
    setSelectedMediaIds(new Set(gallery.map(m => m.id)));
  };

  const deselectAllMedia = () => {
    setSelectedMediaIds(new Set());
  };

  const handleDeleteSelectedMedia = async () => {
    if (selectedMediaIds.size === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedMediaIds.size} media items?`)) return;
    
    setMediaLoading(true);
    try {
      const selectedItems = media.filter(m => selectedMediaIds.has(m.id));
      
      for (const item of selectedItems) {
        // Delete from storage
        const path = item.url.split('/').slice(-2).join('/');
        await supabase.storage.from('leasing').remove([path]);
        
        // Remove from JSON array in vehicle record
        const vehicleId = existingVehicle?.id;
        if (!vehicleId) continue;

        const { data: vehicle } = await supabase
          .from('leasing_inventory')
          .select('photos, social_media_images, catalog_images')
          .eq('id', vehicleId)
          .single();

        let updatedField = '';
        let currentItems: any[] = [];
        
        if (item.kind === 'photo') {
          updatedField = 'photos';
          currentItems = vehicle?.photos || [];
        } else if (item.kind === 'social_media') {
          updatedField = 'social_media_images';
          currentItems = vehicle?.social_media_images || [];
        } else if (item.kind === 'catalog') {
          updatedField = 'catalog_images';
          currentItems = vehicle?.catalog_images || [];
        }

        const updatedItems = currentItems.filter((i: any) => i.id !== item.id);

        await supabase
          .from('leasing_inventory')
          .update({ [updatedField]: updatedItems })
          .eq('id', vehicleId);
      }
      
      // Update local state
      setMedia(prev => prev.filter(m => !selectedMediaIds.has(m.id)));
      setSelectedMediaIds(new Set());
      setIsSelectionMode(false);
    } catch (error) {
      console.error('Error deleting selected media:', error);
      alert('Failed to delete selected media items');
    } finally {
      setMediaLoading(false);
    }
  };

  // Derived media arrays
  const gallery = media
    .filter((m: any) => m.kind === 'photo' || m.kind === 'video')
    .sort((a, b) => {
      // Primary photos come first
      if (a.is_primary && !b.is_primary) return -1;
      if (!a.is_primary && b.is_primary) return 1;
      // Then sort by sort_order
      const aOrder = a.sort_order ?? 999999;
      const bOrder = b.sort_order ?? 999999;
      return aOrder - bOrder;
    });
  
  // console.log('📸 Current gallery derived from media:', gallery.map(g => ({ id: g.id, sort_order: g.sort_order })));

  const socialMedia = media
    .filter((m: any) => m.kind === 'social_media')
    .sort((a, b) => {
      const aOrder = a.sort_order ?? 999999;
      const bOrder = b.sort_order ?? 999999;
      return aOrder - bOrder;
    });

  const catalog = media
    .filter((m: any) => m.kind === 'catalog')
    .sort((a, b) => {
      const aOrder = a.sort_order ?? 999999;
      const bOrder = b.sort_order ?? 999999;
      return aOrder - bOrder;
    });

  // Download all function
  const downloadAll = async (items: any[], zipName: string = 'leasing_media.zip', setLoading?: (loading: boolean) => void) => {
    if (items.length === 0) return;

    // Set loading state if provided
    if (setLoading) setLoading(true);

    try {
      // Import JSZip dynamically
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();

      // Download each image and add to zip
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        try {
          const response = await fetch(item.url);
          const blob = await response.blob();
          const filename = item.filename || `image_${i + 1}.jpg`;
          zip.file(filename, blob);
        } catch (error) {
          console.error(`Failed to download ${item.url}:`, error);
        }
      }

      // Generate and download the zip
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = zipName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error creating zip:', error);
      alert('Failed to create zip file');
    } finally {
      if (setLoading) setLoading(false);
    }
  };

  // Drag and drop functions
  const handleDragStart = (e: React.DragEvent, index: number) => {
    console.log('🔄 Drag start - editing:', editing, 'reorderLoading:', reorderLoading, 'index:', index);
    if (!editing || reorderLoading) {
      console.log('❌ Drag blocked - editing:', editing, 'reorderLoading:', reorderLoading);
      return;
    }
    console.log('✅ Drag started for index:', index);
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
    console.log('🔄 Drop - draggedIndex:', draggedIndex, 'dropIndex:', dropIndex, 'editing:', editing);
    if (draggedIndex === null || !editing) {
      console.log('❌ Drop blocked - draggedIndex:', draggedIndex, 'editing:', editing);
      return;
    }
    
    console.log('✅ Moving photo from', draggedIndex, 'to', dropIndex);
    movePhotoToPosition(draggedIndex, dropIndex);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // Move photo to position function
  const movePhotoToPosition = async (fromIndex: number, toIndex: number) => {
    console.log('📸 movePhotoToPosition called:', { fromIndex, toIndex, galleryLength: gallery.length, editing, reorderLoading });
    if (!editing || reorderLoading) return;
    if (fromIndex === toIndex || toIndex < 0 || toIndex >= gallery.length) return;
    
    setReorderLoading(true);
    console.log('📸 Starting photo reorder...');
    
    // Optimistic update: show change immediately
    const newGallery = [...gallery];
    const [movedItem] = newGallery.splice(fromIndex, 1);
    newGallery.splice(toIndex, 0, movedItem);
    
    // Update sort_order values in the optimistic update
    const newGalleryWithUpdatedOrder = newGallery.map((item, index) => ({
      ...item,
      sort_order: index
    }));
    
    console.log('📸 Optimistic update - old gallery:', gallery.map(g => g.id));
    console.log('📸 Optimistic update - new gallery:', newGalleryWithUpdatedOrder.map(g => g.id));
    
    const docs = media.filter(m => m.kind === 'document');
    const nonGalleryMedia = media.filter(m => m.kind !== 'photo' && m.kind !== 'video');
    const optimisticMedia = [...docs, ...nonGalleryMedia, ...newGalleryWithUpdatedOrder];
    setMedia(optimisticMedia);
    
    console.log('📸 Updated media state with new order and sort_order values');
    
    try {
      // Update sort orders in JSON array
      const vehicleId = existingVehicle?.id;
      if (!vehicleId) return;

      const { data: vehicle } = await supabase
        .from('leasing_inventory')
        .select('photos, social_media_images, catalog_images')
        .eq('id', vehicleId)
        .single();

      // Update sort orders for each media type
      const updatedPhotos = (vehicle?.photos || []).map((photo: any) => {
        const newIndex = newGallery.findIndex(item => item.id === photo.id);
        return newIndex >= 0 ? { ...photo, sort_order: newIndex } : photo;
      });

      const updatedSocial = (vehicle?.social_media_images || []).map((social: any) => {
        const newIndex = newGallery.findIndex(item => item.id === social.id);
        return newIndex >= 0 ? { ...social, sort_order: newIndex } : social;
      });

      const updatedCatalog = (vehicle?.catalog_images || []).map((catalog: any) => {
        const newIndex = newGallery.findIndex(item => item.id === catalog.id);
        return newIndex >= 0 ? { ...catalog, sort_order: newIndex } : catalog;
      });

      await supabase
        .from('leasing_inventory')
        .update({ 
          photos: updatedPhotos,
          social_media_images: updatedSocial,
          catalog_images: updatedCatalog
        })
        .eq('id', vehicleId);
      
      console.log('✅ Photo reorder completed successfully');
    } catch (error) {
      console.error('❌ Error updating sort order:', error);
      // Revert optimistic update on error
      refetchMedia();
    } finally {
      setReorderLoading(false);
      console.log('📸 Reorder loading finished');
    }
  };

  // Get original image URL
  const getOriginalImageUrl = (url: string) => {
    if (url.includes('/api/storage-proxy')) {
      const urlParam = new URLSearchParams(url.split('?')[1]).get('url');
      return urlParam || url;
    }
    return url;
  };

  // VIN API lookup
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
      
      // Auto-populate fields from VIN data
      const modelDesc = firstDesc(map.model_name?.stream_result)?.toUpperCase();
      const year = map.production_date?.stream_result?.substring(0, 4) || '';
      const displacement = parseFloat(map.displacement?.stream_result || '');
      const cc = isFinite(displacement) ? String(Math.round(displacement * 1000)) : '';
      const colorDesc = firstDesc(map.color_code?.stream_result)?.toUpperCase();
      const interiorDesc = firstDesc(map.interior_code?.stream_result)?.toUpperCase();

      // Options list for key equipment
      const optsObj = map.options?.stream_result || {};
      const optionDescsArr = Object.values(optsObj).map((o: any) => String(o.description).toUpperCase()).filter(Boolean);
      const optionDescs = Array.from(new Set(optionDescsArr));
      const optionsText = optionDescs.length ? optionDescs.map(d => `- ${d}`).join('\n') : '';

      const updates: any = {};
      if (modelDesc) updates.vehicle_model = modelDesc;
      if (year) updates.model_year = year;
      if (colorDesc) updates.colour = colorDesc;
      if (interiorDesc) updates.interior_colour = interiorDesc;
      if (cc) updates.cubic_capacity_cc = cc;
      if (optionsText) updates.key_equipment = optionsText;
      
      if (Object.keys(updates).length > 0) {
        setForm(prev => ({ ...prev, ...updates }));
        console.log('✅ VIN lookup successful:', updates);
        
        // Stay on current tab after successful VIN lookup
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
    console.log('🚀 handleSubmit called - mode:', mode, 'existingVehicle:', !!existingVehicle);
    const validationErrors = validateStep();
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }
    
    setSaving(true);

    try {
      const vehicleData = {
        // ===== CHASSIS TAB FIELDS =====
        stock_number: form.stock_number.toUpperCase(),
        chassis_number: form.chassis_number.toUpperCase(),
        model_year: form.model_year ? parseInt(form.model_year) : null,
        model_family: form.model_family,
        vehicle_model: form.vehicle_model,
        colour: form.colour,
        interior_colour: form.interior_colour,
        plate_number: form.plate_number || null,
        engine_number: form.engine_number || null,
        regional_specification: form.regional_specification || 'GCC',
        current_mileage_km: form.current_mileage_km ? parseInt(form.current_mileage_km) : null,
        body_style: form.body_style || null,
        category: form.category,
        cubic_capacity_cc: form.cubic_capacity_cc ? parseInt(form.cubic_capacity_cc) : null,
        horsepower_hp: form.horsepower_hp ? parseInt(form.horsepower_hp) : null,
        torque_nm: form.torque_nm ? parseInt(form.torque_nm) : null,
        fuel_type: form.fuel_type || 'Petrol',
        current_parking_location: form.current_parking_location || 'Main Showroom',
        
        // ===== PRICING TAB FIELDS =====
        monthly_lease_rate: form.monthly_lease_rate ? parseFloat(form.monthly_lease_rate) : null,
        security_deposit: form.security_deposit ? parseFloat(form.security_deposit) : null,
        buyout_price: form.buyout_price ? parseFloat(form.buyout_price) : null,
        excess_mileage_charges: form.excess_mileage_charges ? parseFloat(form.excess_mileage_charges) : null,
        purchase_date: form.purchase_date || null,
        acquired_cost: form.acquired_cost ? parseFloat(form.acquired_cost) : null,
        monthly_depreciation: form.monthly_depreciation ? parseFloat(form.monthly_depreciation) : null,
        
        // ===== SERVICE TAB FIELDS =====
        insurance_expiry_date: form.insurance_expiry_date || null,
        first_service_date: form.first_service_date || null,
        second_service_date: form.second_service_date || null,
        warranty_expiry_date: form.warranty_expiry_date || null,
        registration_date: form.registration_date || null,
        
        // ===== DETAILS TAB FIELDS =====
        key_equipment: form.key_equipment || null,
        description: form.description || null,
        
        // ===== SYSTEM FIELDS =====
        make: 'Mercedes-Benz',
        status: 'marketing',
        condition: 'good',
        
        // ===== AUDIT =====
        updated_at: new Date().toISOString(),
      } as any;

      console.log('🔍 Vehicle data being saved:', {
        excess_mileage_charges: vehicleData.excess_mileage_charges,
        form_excess_mileage: form.excess_mileage_charges,
        all_pricing_fields: {
          monthly_lease_rate: vehicleData.monthly_lease_rate,
          security_deposit: vehicleData.security_deposit,
          buyout_price: vehicleData.buyout_price,
          excess_mileage_charges: vehicleData.excess_mileage_charges
        }
      });

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
        console.error('❌ Database error saving vehicle:', result.error);
        setErrors([`Failed to save vehicle: ${result.error.message}`]);
        return;
      }

      console.log('✅ Vehicle saved successfully:', result.data);
      setSavedVehicle(result.data);
      // update existingVehicle-like reference so dependent effects pick up the id
      if (!existingVehicle?.id && result.data?.id) {
        // ensure docs/media hooks see an id immediately
        try { await refetchDocs(); } catch {}
      }
      onCreated(result.data);
      // Keep modal open; refresh media and exit editing mode
      try {
        await refetchMedia();
      } catch (e) {
        console.warn('⚠️ Media refresh after save failed:', e);
      }
      // ensure we stay on media tab and show latest
      setActiveTab('media');
      setEditing(false);

    } catch (error) {
      console.error('❌ Exception saving vehicle:', error);
      setErrors([`Failed to save vehicle: ${error instanceof Error ? error.message : 'Unknown error'}`]);
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
      <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-lg p-6 w-[950px] max-w-[98vw] h-[85vh] flex flex-col text-sm relative overflow-hidden shadow-2xl">
        {processing && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-50 rounded-lg">
            <svg className="animate-spin h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
            </svg>
          </div>
        )}
        
        <button onClick={onClose} className="absolute top-2 right-2 text-xl leading-none text-white/70 hover:text-white">×</button>
        
        {/* Header with inline buttons */}
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold text-white">{mode === 'edit' ? 'Edit Vehicle' : 'Add New Vehicle'}</h2>
            
            {/* Parking Location Selector - inline with heading */}
            <div className="flex items-center gap-2 text-sm text-white/80">
              <span>Parking Location:</span>
              <select
                name="current_parking_location"
                value={form.current_parking_location}
                onChange={handleChangeConditional}
                className="bg-black/50 border border-white/20 px-2 py-1 rounded text-white text-sm"
                disabled={isViewMode}
              >
                <option value="MAIN SHOWROOM">MAIN SHOWROOM</option>
                <option value="CAR PARK">CAR PARK</option>
                <option value="STONES">STONES</option>
                <option value="YARD">YARD</option>
                <option value="SHOWROOM 2">SHOWROOM 2</option>
                <option value="SERVICE CENTER">SERVICE CENTER</option>
              </select>
            </div>
          </div>
          
          {/* View/Edit Toggle for Edit Mode */}
          {mode === 'edit' && existingVehicle && (
            <div className="flex gap-2">
              {editing ? (
                <>
                  <button
                    onClick={() => {
                      console.log('🖱️ Save button clicked!');
                      handleSave();
                    }}
                    disabled={saving}
                    className="px-3 py-1.5 bg-green-500/20 hover:bg-green-500/30 text-green-300 hover:text-green-200 transition-colors text-sm rounded disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={() => {
                      setEditing(false);
                      // Reset form to original data
                      if (existingVehicle) {
                        setForm({
                          // Basic vehicle info
                          stock_number: existingVehicle.stock_number || "",
                            plate_number: existingVehicle.plate_number || "",
                            chassis_number: existingVehicle.chassis_number || "",
                            engine_number: existingVehicle.engine_number || "",
                            purchase_date: existingVehicle.purchase_date || "",
                            
                            // Vehicle details
                            model_year: existingVehicle.model_year?.toString() || "",
                            vehicle_model: existingVehicle.vehicle_model || "",
                            model_family: existingVehicle.model_family || "",
                            category: existingVehicle.category || "A CLASS",
                            colour: existingVehicle.colour || "",
                            interior_colour: existingVehicle.interior_colour || "",
                            body_style: existingVehicle.body_style || "",
                            
                            // Current status
                            current_customer_name: existingVehicle.current_customer_name || "",
                            current_parking_location: existingVehicle.current_parking_location || "Main Showroom",
                            
                            // Lease dates
                            release_date_out: existingVehicle.release_date_out || "",
                            expected_return_date: existingVehicle.expected_return_date || "",
                            
                            // Lease terms
                            lease_to_own_option: existingVehicle.lease_to_own_option || false,
                            daily_rate_customer: existingVehicle.daily_rate_customer?.toString() || "",
                            daily_rate_vehicle: existingVehicle.daily_rate_vehicle?.toString() || "",
                            planned_lease_pricing: existingVehicle.planned_lease_pricing?.toString() || "",
                            monthly_lease_rate: existingVehicle.monthly_lease_rate?.toString() || "",
                            security_deposit: existingVehicle.security_deposit?.toString() || "",
                            lease_term_months: existingVehicle.lease_term_months?.toString() || "",
                            max_mileage_per_year: existingVehicle.max_mileage_per_year?.toString() || "",
                            condition: existingVehicle.condition || "",
                            condition_notes: existingVehicle.condition_notes || "",
                            
                            // Mileage tracking
                            current_mileage_km: existingVehicle.current_mileage_km?.toString() || "",
                            mylocator_mileage: existingVehicle.mylocator_mileage?.toString() || "",
                            
                            // Service tracking
                            first_service_date: existingVehicle.first_service_date || "",
                            second_service_date: existingVehicle.second_service_date || "",
                            last_service_date: existingVehicle.last_service_date || "",
                            next_service_due: existingVehicle.next_service_due || "",
                            
                            // Financial
                            acquired_cost: existingVehicle.acquired_cost?.toString() || "",
                            monthly_depreciation: existingVehicle.monthly_depreciation?.toString() || "",
                            excess_usage_depreciation: existingVehicle.excess_usage_depreciation?.toString() || "",
                            accumulated_depreciation: existingVehicle.accumulated_depreciation?.toString() || "",
                            carrying_value: existingVehicle.carrying_value?.toString() || "",
                            buyout_price: existingVehicle.buyout_price?.toString() || "",
                            excess_mileage_charges: existingVehicle.excess_mileage_charges?.toString() || "",
                            current_market_value: existingVehicle.current_market_value?.toString() || "",
                            unrealized_gain_loss: existingVehicle.unrealized_gain_loss?.toString() || "",
                            
                            // Warranty and registration
                            warranty_expiry_date: existingVehicle.warranty_expiry_date || "",
                            registration_date: existingVehicle.registration_date || "",
                            months_registered: existingVehicle.months_registered?.toString() || "",
                            
                            // Additional details
                            regional_specification: existingVehicle.regional_specification || "",
                            location: existingVehicle.location || "",
                            parking_spot: existingVehicle.parking_spot || "",
                            description: existingVehicle.description || "",
                            remarks: existingVehicle.remarks || "",
                            key_equipment: existingVehicle.key_equipment || "",
                            insurance_expiry_date: existingVehicle.insurance_expiry_date || "",
                            
                            // Technical specs
                            engine: existingVehicle.engine || "",
                            transmission: existingVehicle.transmission || "",
                            fuel_type: existingVehicle.fuel_type || "",
                            horsepower_hp: existingVehicle.horsepower_hp?.toString() || "",
                            torque_nm: existingVehicle.torque_nm?.toString() || "",
                            cubic_capacity_cc: existingVehicle.cubic_capacity_cc?.toString() || "",
                          });
                        }
                      }}
                      className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-colors text-sm rounded"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setEditing(true)}
                    className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-colors text-sm rounded"
                  >
                    Edit
                  </button>
                )}
              </div>
            )}
        </div>
        
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
                { id: 'chassis', label: 'Vehicle Details', step: 0 },
                { id: 'media', label: 'Media', step: 1 },
                { id: 'details', label: 'Details', step: 2 },
                { id: 'pricing', label: 'Pricing', step: 3 },
                { id: 'service', label: 'Service', step: 4 },
                { id: 'documents', label: 'Documents', step: 5 }
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
            
            {/* Combined Chassis & Vehicle Info Tab */}
            {activeTab === 'chassis' && (
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-6 space-y-6">
                {/* Chassis Section - Compact */}
                <div className="text-center space-y-4">
                  <h3 className="text-white text-2xl font-bold">Vehicle Identification</h3>
                  <div className="space-y-4">
                    <label className="block text-white/80 text-lg font-semibold">Chassis Number (VIN)</label>
                    <div className="w-full flex justify-center px-4">
                      <LeasingChassisInput 
                        value={form.chassis_number} 
                        onChange={(val) => {
                          if (!isViewMode) {
                            handleChange({
                              target: { name: 'chassis_number', value: val }
                            } as any);
                            if (val.length === 17) {
                              lookupVIN(val);
                            }
                          }
                        }} 
                      />
                    </div>
                    <p className="text-white/50 text-sm max-w-2xl mx-auto">
                      The VIN will automatically populate vehicle details below
                    </p>
                  </div>
                </div>

                {/* Vehicle Info Section */}
                <div className="space-y-6">
                  <h3 className="text-white text-2xl font-bold text-center">Vehicle Information</h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={compactLabelClass}>Stock Number</label>
                      <input
                        name="stock_number"
                        value={form.stock_number}
                        onChange={handleChangeConditional}
                        className={compactFieldClass}
                        style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)' }}
                        required={!isViewMode}
                        readOnly={isViewMode}
                      />
                    </div>
                    <div>
                      <label className={compactLabelClass}>Model Year</label>
                      <input
                        type="number"
                        name="model_year"
                        value={form.model_year}
                        onChange={handleChangeConditional}
                        className={compactFieldClass}
                        style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)' }}
                        min="2015"
                        max="2025"
                        required={!isViewMode}
                        readOnly={isViewMode}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={compactLabelClass}>Model Family</label>
                      <select
                        name="model_family"
                        value={form.model_family}
                        onChange={handleChangeConditional}
                        className={compactFieldClass}
                        style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)' }}
                        required={!isViewMode}
                        disabled={isViewMode}
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
                      <label className={compactLabelClass}>Vehicle Model</label>
                      <input
                        name="vehicle_model"
                        value={form.vehicle_model}
                        onChange={handleChangeConditional}
                        className={compactFieldClass}
                        style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)' }}
                        placeholder="C-Class"
                        required={!isViewMode}
                        readOnly={isViewMode}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={compactLabelClass}>Exterior Colour</label>
                      <input
                        name="colour"
                        value={form.colour}
                        onChange={handleChangeConditional}
                        className={compactFieldClass}
                        style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)' }}
                        placeholder="Obsidian Black"
                        required={!isViewMode}
                        readOnly={isViewMode}
                      />
                    </div>
                    <div>
                      <label className={compactLabelClass}>Interior Colour</label>
                      <input
                        name="interior_colour"
                        value={form.interior_colour}
                        onChange={handleChangeConditional}
                        className={compactFieldClass}
                        style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)' }}
                        placeholder="Black Leather"
                        required={!isViewMode}
                        readOnly={isViewMode}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={compactLabelClass}>Plate Number</label>
                      <input
                        name="plate_number"
                        value={form.plate_number}
                        onChange={handleChangeConditional}
                        className={compactFieldClass}
                        style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)' }}
                        placeholder="ABC123"
                        readOnly={isViewMode}
                      />
                    </div>
                    <div>
                      <label className={compactLabelClass}>Engine Number</label>
                      <input
                        name="engine_number"
                        value={form.engine_number}
                        onChange={handleChangeConditional}
                        className={compactFieldClass}
                        style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)' }}
                        placeholder="Engine Number"
                        readOnly={isViewMode}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={compactLabelClass}>Regional Specification</label>
                      <input
                        name="regional_specification"
                        value={form.regional_specification}
                        onChange={handleChangeConditional}
                        className={compactFieldClass}
                        style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)' }}
                        placeholder="GCC"
                        readOnly={isViewMode}
                      />
                    </div>
                    <div>
                      <label className={compactLabelClass}>Current Mileage (KM)</label>
                      <input
                        type="number"
                        name="current_mileage_km"
                        value={form.current_mileage_km}
                        onChange={handleChangeConditional}
                        className={compactFieldClass}
                        style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)' }}
                        placeholder="50000"
                        min="0"
                        readOnly={isViewMode}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={compactLabelClass}>Body Style</label>
                      <input
                        name="body_style"
                        value={form.body_style}
                        onChange={handleChangeConditional}
                        className={compactFieldClass}
                        style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)' }}
                        placeholder="Sedan"
                        readOnly={isViewMode}
                      />
                    </div>
                    <div>
                      <label className={compactLabelClass}>Category</label>
                      <select
                        name="category"
                        value={form.category}
                        onChange={handleChangeConditional}
                        className={compactFieldClass}
                        style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)' }}
                        disabled={isViewMode}
                      >
                        <option value="A CLASS">A CLASS</option>
                        <option value="OTHERS">OTHERS</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={compactLabelClass}>Cubic Capacity (CC)</label>
                      <input
                        type="number"
                        name="cubic_capacity_cc"
                        value={form.cubic_capacity_cc}
                        onChange={handleChangeConditional}
                        className={compactFieldClass}
                        style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)' }}
                        placeholder="2000"
                        min="0"
                        readOnly={isViewMode}
                      />
                    </div>
                    <div>
                      <label className={compactLabelClass}>Horsepower (HP)</label>
                      <input
                        type="number"
                        name="horsepower_hp"
                        value={form.horsepower_hp}
                        onChange={handleChangeConditional}
                        className={compactFieldClass}
                        style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)' }}
                        placeholder="200"
                        min="0"
                        readOnly={isViewMode}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={compactLabelClass}>Torque (NM)</label>
                      <input
                        type="number"
                        name="torque_nm"
                        value={form.torque_nm}
                        onChange={handleChangeConditional}
                        className={compactFieldClass}
                        style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)' }}
                        placeholder="300"
                        min="0"
                        readOnly={isViewMode}
                      />
                    </div>
                    <div>
                      <label className={compactLabelClass}>Fuel Type</label>
                      <input
                        name="fuel_type"
                        value={form.fuel_type}
                        onChange={handleChangeConditional}
                        className={compactFieldClass}
                        style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)' }}
                        placeholder="Petrol"
                        readOnly={isViewMode}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}


            {/* Media Tab */}
            {activeTab === 'media' && (
              <div className="space-y-6">
                {/* Photo Gallery */}
                <div className="border border-white/15 rounded-md p-4 bg-white/5">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-semibold text-white">
                      Photo Gallery ({gallery.length})
                      {isSelectionMode && selectedMediaIds.size > 0 && (
                        <span className="ml-2 text-xs text-gray-300">
                          ({selectedMediaIds.size} selected)
                        </span>
                      )}
                    </h4>
                    <div className="flex items-center gap-3">
                      {!isViewMode && (
                        <>
                          {/* Upload Button */}
                          <div className="border-r border-white/20 pr-3">
                            <div className="relative">
                              <input
                                type="file"
                                multiple
                                accept="image/*"
                                onChange={async (e) => {
                                  const files = Array.from(e.target.files || []);
                                  if (!files.length) return;
                                  
                                  // Use existing MediaUploader logic inline
                                  setMediaLoading(true);
                                  console.log(`📤 Starting upload of ${files.length} photo(s)...`);
                                  for (let i = 0; i < files.length; i++) {
                                    const file = files[i];
                                    console.log(`📤 Uploading photo ${i + 1}/${files.length}: ${file.name}`);
                                    const ext = file.name.split('.').pop();
                                    const vehicleId = existingVehicle?.id || savedVehicle?.id;
                                    console.log('🔍 Upload check - vehicleId:', vehicleId, 'existingVehicle?.id:', existingVehicle?.id, 'savedVehicle?.id:', savedVehicle?.id);
                                    if (!vehicleId) {
                                      alert('Please save the vehicle first before uploading photos');
                                      setMediaLoading(false);
                                      return;
                                    }
                                    
                                    const path = `${vehicleId}/${crypto.randomUUID()}.${ext}`;
                                    
                                    const { error: upErr } = await supabase.storage
                                      .from('leasing')
                                      .upload(path, file, { contentType: file.type, cacheControl: '3600', upsert: false });
                                    
                                    if (upErr) continue;
                                    
                                    const { data: pub } = supabase.storage.from('leasing').getPublicUrl(path);
                                    // Get current photo count from JSON field
                                    const { data: vehicleData } = await supabase
                                      .from('leasing_inventory')
                                      .select('photos')
                                      .eq('id', vehicleId)
                                      .single();
                                    
                                    const photoCount = vehicleData?.photos?.length || 0;
                                    
                                    // Add photo to JSON array in vehicle record
                                    const photoObj = {
                                      id: crypto.randomUUID(),
                                      url: pub.publicUrl,
                                      filename: file.name,
                                      is_primary: (!photoCount || photoCount === 0),
                                      sort_order: (photoCount || 0),
                                      uploaded_at: new Date().toISOString()
                                    };

                                    const { data: vehicle } = await supabase
                                      .from('leasing_inventory')
                                      .select('photos')
                                      .eq('id', vehicleId)
                                      .single();

                                    const currentPhotos = vehicle?.photos || [];
                                    const updatedPhotos = [...currentPhotos, photoObj];

                                    await supabase
                                      .from('leasing_inventory')
                                      .update({ photos: updatedPhotos })
                                      .eq('id', vehicleId);
                                  }
                                  console.log(`✅ Completed upload of ${files.length} photo(s)`);
                                  setMediaLoading(false);
                                  refetchMedia();
                                  e.target.value = '';
                                }}
                                className="absolute inset-0 opacity-0 cursor-pointer"
                              />
                              <button 
                                disabled={mediaLoading}
                                className="px-3 py-1.5 bg-gradient-to-r from-green-500/20 to-green-600/20 hover:from-green-400/30 hover:to-green-500/30 border border-green-400/30 text-white text-xs rounded transition-all duration-200 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-w-[100px]"
                              >
                                {mediaLoading ? (
                                  <>
                                    <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin"></div>
                                    Uploading...
                                  </>
                                ) : (
                                  'Upload Photos'
                                )}
                              </button>
                            </div>
                          </div>
                          
                          {!isSelectionMode ? (
                            <button
                              onClick={() => setIsSelectionMode(true)}
                              className="px-3 py-1.5 bg-gradient-to-r from-blue-500/20 to-blue-600/20 hover:from-blue-400/30 hover:to-blue-500/30 border border-blue-400/30 text-white text-xs rounded transition-all duration-200 shadow-sm"
                            >
                              Select Multiple
                            </button>
                          ) : (
                            <>
                              <button
                                onClick={selectAllMedia}
                                className="px-2 py-1 bg-gradient-to-r from-green-500/20 to-green-600/20 hover:from-green-400/30 hover:to-green-500/30 border border-green-400/30 text-white text-xs rounded transition-all duration-200"
                              >
                                Select All
                              </button>
                              <button
                                onClick={deselectAllMedia}
                                className="px-2 py-1 bg-gradient-to-r from-gray-500/20 to-gray-600/20 hover:from-gray-400/30 hover:to-gray-500/30 border border-gray-400/30 text-white text-xs rounded transition-all duration-200"
                              >
                                Deselect All
                              </button>
                              {selectedMediaIds.size > 0 && (
                                <button
                                  onClick={handleDeleteSelectedMedia}
                                  disabled={mediaLoading}
                                  className="px-3 py-1.5 bg-gradient-to-r from-red-500/20 to-red-600/20 hover:from-red-400/30 hover:to-red-500/30 border border-red-400/30 text-white text-xs rounded transition-all duration-200 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                  {mediaLoading && (
                                    <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin"></div>
                                  )}
                                  Delete Selected ({selectedMediaIds.size})
                                </button>
                              )}
                              <button
                                onClick={() => {
                                  setIsSelectionMode(false);
                                  setSelectedMediaIds(new Set());
                                }}
                                className="px-2 py-1 bg-gradient-to-r from-gray-500/20 to-gray-600/20 hover:from-gray-400/30 hover:to-gray-500/30 border border-gray-400/30 text-white text-xs rounded transition-all duration-200"
                              >
                                Cancel
                              </button>
                            </>
                          )}
                        </>
                      )}
                      <button
                        onClick={() => downloadAll(gallery, `${existingVehicle?.stock_number || savedVehicle?.stock_number || 'vehicle'}_photos.zip`, setDownloadingGallery)}
                        disabled={downloadingGallery}
                        className="px-3 py-1.5 bg-gradient-to-r from-gray-400/20 to-gray-600/20 hover:from-gray-300/30 hover:to-gray-500/30 border border-gray-400/30 text-white text-xs rounded transition-all duration-200 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {downloadingGallery && (
                          <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin"></div>
                        )}
                        {downloadingGallery ? 'Creating ZIP...' : 'Download All'}
                      </button>
                      {!isViewMode && !isSelectionMode && (
                        <span className="text-sm text-white/60">
                          {reorderLoading ? 'Reordering...' : 'Drag to reorder'}
                        </span>
                      )}
                    </div>
                  </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                      {gallery.map((item, i) => (
                        <div
                          key={item.id}
                          className={`relative group ${
                            !isViewMode && !isSelectionMode ? 'cursor-move' : 'cursor-pointer'
                          } ${
                            isSelectionMode && selectedMediaIds.has(item.id) 
                              ? 'ring-2 ring-blue-400 ring-offset-2 ring-offset-black/40' 
                              : ''
                          }`}
                          draggable={!isViewMode && !isSelectionMode}
                          onDragStart={(e) => {
                            console.log('🔄 onDragStart called - isSelectionMode:', isSelectionMode, 'index:', i);
                            if (!isSelectionMode) handleDragStart(e, i);
                          }}
                          onDragOver={(e) => !isSelectionMode && handleDragOver(e, i)}
                          onDragLeave={!isSelectionMode ? handleDragLeave : undefined}
                          onDrop={(e) => !isSelectionMode && handleDrop(e, i)}
                          onDragEnd={!isSelectionMode ? handleDragEnd : undefined}
                      >
                          <div className="aspect-square bg-white/10 rounded overflow-hidden">
                            <img 
                              src={item.url} 
                              className="w-full h-full object-contain bg-black/40 cursor-pointer hover:opacity-80 transition-opacity" 
                              onClick={() => {
                                if (isSelectionMode) {
                                  toggleMediaSelection(item.id);
                                } else {
                                  setShowGallery(true); 
                                  setGalleryIdx(i);
                                }
                              }}
                              loading="lazy"
                            />
                          </div>
                          
                          {/* Selection checkbox */}
                          {isSelectionMode && (
                            <div className="absolute top-2 left-2 z-10">
                              <input
                                type="checkbox"
                                checked={selectedMediaIds.has(item.id)}
                                onChange={() => toggleMediaSelection(item.id)}
                                className="w-4 h-4 text-blue-600 bg-black/50 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                              />
                            </div>
                          )}
                          
                          {item.is_primary && (
                            <div className="absolute top-1 right-1 bg-green-500 text-white text-xs px-1.5 py-0.5 rounded">
                              Primary
                            </div>
                          )}
                          
                          {!isViewMode && !isSelectionMode && (
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
                                onClick={() => handleDeleteMedia(item)}
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
                  {gallery.length === 0 && !isViewMode && (
                    <div className="text-center py-8 text-white/60">
                      <p>No photos uploaded yet. Click "Upload Photos" to add images.</p>
                    </div>
                  )}
                </div>

                {/* Social Media Images */}
                <div className="border border-white/15 rounded-md p-4 bg-white/5">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-semibold text-white">
                      Social Media Images ({socialMedia.length})
                    </h4>
                    <div className="flex items-center gap-3">
                      {!isViewMode && (
                        <div className="border-r border-white/20 pr-3">
                          <div className="relative">
                            <input
                              type="file"
                              multiple
                              accept="image/*"
                              onChange={async (e) => {
                                const files = Array.from(e.target.files || []);
                                if (!files.length) return;
                                
                                setMediaLoading(true);
                                for (const file of files) {
                                  const ext = file.name.split('.').pop();
                                  const vehicleId = existingVehicle?.id || savedVehicle?.id;
                                  if (!vehicleId) {
                                    alert('Please save the vehicle first before uploading photos');
                                    setMediaLoading(false);
                                    return;
                                  }
                                  
                                  const path = `${vehicleId}/${crypto.randomUUID()}.${ext}`;
                                  
                                  const { error: upErr } = await supabase.storage
                                    .from('leasing')
                                    .upload(path, file, { contentType: file.type, cacheControl: '3600', upsert: false });
                                  
                                  if (upErr) continue;
                                  
                                  const { data: pub } = supabase.storage.from('leasing').getPublicUrl(path);
                                  
                                  // Add social media image to JSON array
                                  const socialObj = {
                                    id: crypto.randomUUID(),
                                    url: pub.publicUrl,
                                    filename: file.name,
                                    sort_order: 0,
                                    uploaded_at: new Date().toISOString()
                                  };

                                  const { data: vehicle } = await supabase
                                    .from('leasing_inventory')
                                    .select('social_media_images')
                                    .eq('id', vehicleId)
                                    .single();

                                  const currentSocial = vehicle?.social_media_images || [];
                                  const updatedSocial = [...currentSocial, socialObj];

                                  await supabase
                                    .from('leasing_inventory')
                                    .update({ social_media_images: updatedSocial })
                                    .eq('id', vehicleId);
                                }
                                setMediaLoading(false);
                                refetchMedia();
                                e.target.value = '';
                              }}
                              className="absolute inset-0 opacity-0 cursor-pointer"
                            />
                            <button 
                              disabled={mediaLoading}
                              className="px-3 py-1.5 bg-gradient-to-r from-green-500/20 to-green-600/20 hover:from-green-400/30 hover:to-green-500/30 border border-green-400/30 text-white text-xs rounded transition-all duration-200 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-w-[100px]"
                            >
                              {mediaLoading ? (
                                <>
                                  <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin"></div>
                                  Uploading...
                                </>
                              ) : (
                                'Upload Social'
                              )}
                            </button>
                          </div>
                        </div>
                      )}
                      <button
                        onClick={() => downloadAll(socialMedia, `${existingVehicle?.stock_number || savedVehicle?.stock_number || 'vehicle'}_social_media.zip`, setDownloadingSocial)}
                        disabled={downloadingSocial}
                        className="px-3 py-1.5 bg-gradient-to-r from-gray-400/20 to-gray-600/20 hover:from-gray-300/30 hover:to-gray-500/30 border border-gray-400/30 text-white text-xs rounded transition-all duration-200 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {downloadingSocial && (
                          <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin"></div>
                        )}
                        {downloadingSocial ? 'Creating ZIP...' : 'Download All'}
                      </button>
                    </div>
                  </div>
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
                          {!isViewMode && (
                    <button 
                              onClick={() => handleDeleteMedia(item)}
                              className="absolute top-1 right-1 bg-red-500/70 text-white text-xs px-1.5 py-0.5 rounded hover:bg-red-500/90"
                              title="Delete"
                    >
                              ×
                                          </button>
                          )}
                  </div>
                      ))}
                    </div>
                  {socialMedia.length === 0 && !isViewMode && (
                    <div className="text-center py-8 text-white/60">
                      <p>No social media images uploaded yet. Click "Upload Social" to add images.</p>
                    </div>
                  )}
                </div>

                {/* Catalog Images */}
                <div className="border border-white/15 rounded-md p-4 bg-white/5">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-semibold text-white">
                      Catalog Images ({catalog.length})
                    </h4>
                    <div className="flex items-center gap-3">
                      {!isViewMode && (
                        <div className="border-r border-white/20 pr-3">
                          <div className="relative">
                            <input
                              type="file"
                              multiple
                              accept="image/*"
                              onChange={async (e) => {
                                const files = Array.from(e.target.files || []);
                                if (!files.length) return;
                                
                                setMediaLoading(true);
                                for (const file of files) {
                                  const ext = file.name.split('.').pop();
                                  const vehicleId = existingVehicle?.id || savedVehicle?.id;
                                  if (!vehicleId) {
                                    alert('Please save the vehicle first before uploading photos');
                                    setMediaLoading(false);
                                    return;
                                  }
                                  
                                  const path = `${vehicleId}/${crypto.randomUUID()}.${ext}`;
                                  
                                  const { error: upErr } = await supabase.storage
                                    .from('leasing')
                                    .upload(path, file, { contentType: file.type, cacheControl: '3600', upsert: false });
                                  
                                  if (upErr) continue;
                                  
                                  const { data: pub } = supabase.storage.from('leasing').getPublicUrl(path);
                                  
                                  // Add catalog image to JSON array
                                  const catalogObj = {
                                    id: crypto.randomUUID(),
                                    url: pub.publicUrl,
                                    filename: file.name,
                                    sort_order: 0,
                                    uploaded_at: new Date().toISOString()
                                  };

                                  const { data: vehicle } = await supabase
                                    .from('leasing_inventory')
                                    .select('catalog_images')
                                    .eq('id', vehicleId)
                                    .single();

                                  const currentCatalog = vehicle?.catalog_images || [];
                                  const updatedCatalog = [...currentCatalog, catalogObj];

                                  await supabase
                                    .from('leasing_inventory')
                                    .update({ catalog_images: updatedCatalog })
                                    .eq('id', vehicleId);
                                }
                                setMediaLoading(false);
                                refetchMedia();
                                e.target.value = '';
                              }}
                              className="absolute inset-0 opacity-0 cursor-pointer"
                            />
                            <button 
                              disabled={mediaLoading}
                              className="px-3 py-1.5 bg-gradient-to-r from-green-500/20 to-green-600/20 hover:from-green-400/30 hover:to-green-500/30 border border-green-400/30 text-white text-xs rounded transition-all duration-200 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-w-[100px]"
                            >
                              {mediaLoading ? (
                                <>
                                  <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin"></div>
                                  Uploading...
                                </>
                              ) : (
                                'Upload Catalog'
                              )}
                            </button>
                          </div>
                        </div>
                      )}
                      <button
                        onClick={() => downloadAll(catalog, `${existingVehicle?.stock_number || savedVehicle?.stock_number || 'vehicle'}_catalog.zip`, setDownloadingCatalog)}
                        disabled={downloadingCatalog}
                        className="px-3 py-1.5 bg-gradient-to-r from-gray-400/20 to-gray-600/20 hover:from-gray-300/30 hover:to-gray-500/30 border border-gray-400/30 text-white text-xs rounded transition-all duration-200 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {downloadingCatalog && (
                          <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin"></div>
                        )}
                        {downloadingCatalog ? 'Creating ZIP...' : 'Download All'}
                      </button>
                    </div>
                  </div>
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
                          {!isViewMode && (
                    <button 
                              onClick={() => handleDeleteMedia(item)}
                              className="absolute top-1 right-1 bg-red-500/70 text-white text-xs px-1.5 py-0.5 rounded hover:bg-red-500/90"
                              title="Delete"
                    >
                              ×
                                          </button>
                          )}
                  </div>
                      ))}
                    </div>
                  {catalog.length === 0 && !isViewMode && (
                    <div className="text-center py-8 text-white/60">
                      <p>No catalog images uploaded yet. Click "Upload Catalog" to add images.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Pricing Tab */}
            {activeTab === 'pricing' && (
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-8 space-y-6 min-h-[500px] flex flex-col justify-center">
                <div className="text-center mb-6">
                  <h2 className="text-4xl font-bold text-white mb-4">Leasing Pricing</h2>
                  <p className="text-xl text-white/60">Set the leasing rates and terms</p>
                </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div>
                  <label className={labelClass}>Monthly Lease Rate (AED)</label>
                  <input
                    type="number"
                    name="monthly_lease_rate"
                    value={form.monthly_lease_rate}
                    onChange={handleChangeConditional}
                    className={getFieldClass()}
                      style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)' }}
                      placeholder="2500"
                      min="0"
                      step="0.01"
                      readOnly={isViewMode}
                    required
                  />
                </div>
                <div>
                  <label className={labelClass}>Security Deposit (AED)</label>
                  <input
                    type="number"
                    name="security_deposit"
                    value={form.security_deposit}
                    onChange={handleChangeConditional}
                    className={getFieldClass()}
                    style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)' }}
                    placeholder="7500"
                    min="0"
                    step="0.01"
                    readOnly={isViewMode}
                    required
                  />
                </div>
                <div>
                  <label className={labelClass}>Buyout Price (AED)</label>
                  <input
                    type="number"
                    name="buyout_price"
                    value={form.buyout_price}
                    onChange={handleChangeConditional}
                    className={getFieldClass()}
                    style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)' }}
                    placeholder="120000"
                    step="0.01"
                    readOnly={isViewMode}
                  />
                </div>
                <div>
                  <label className={labelClass}>Excess Mileage Charges (AED per km)</label>
                  <input
                    type="number"
                    name="excess_mileage_charges"
                    value={form.excess_mileage_charges}
                    onChange={handleChangeConditional}
                    className={getFieldClass()}
                    style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)' }}
                    placeholder="0.50"
                    min="0"
                    step="0.01"
                    readOnly={isViewMode}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Charge per kilometer when customer exceeds mileage limit
                  </p>
                </div>
              </div>

              {/* Financial Fields - Purchase Date, Acquired Cost, Monthly Depreciation */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div>
                  <label className={labelClass}>Purchase Date</label>
                  <input
                    type="date"
                    name="purchase_date"
                    value={form.purchase_date}
                    onChange={handleChangeConditional}
                    className={getFieldClass()}
                    style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)' }}
                    readOnly={isViewMode}
                  />
                </div>
                <div>
                  <label className={labelClass}>Acquired Cost (AED)</label>
                  <input
                    type="number"
                    name="acquired_cost"
                    value={form.acquired_cost}
                    onChange={handleChangeConditional}
                    className={getFieldClass()}
                    style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)' }}
                    placeholder="180000"
                    step="0.01"
                    readOnly={isViewMode}
                  />
                </div>
                <div>
                  <label className={labelClass}>Monthly Depreciation (%)</label>
                  <input
                    type="number"
                    name="monthly_depreciation"
                    value={form.monthly_depreciation}
                    onChange={handleChangeConditional}
                    className={getFieldClass()}
                    style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)' }}
                    placeholder="2.5"
                    step="0.01"
                    min="0"
                    max="100"
                    readOnly={isViewMode}
                  />
                </div>
              </div>

              </div>
            )}



            {/* Service Tab - NEW */}
            {activeTab === 'service' && (
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-8 space-y-6 min-h-[500px] flex flex-col justify-center">
                <div className="text-center mb-6">
                  <h2 className="text-4xl font-bold text-white mb-4">Service & Insurance</h2>
                  <p className="text-xl text-white/60">Track service history and insurance details</p>
                </div>

              <div className="grid grid-cols-1 gap-6">
                <div>
                  <label className={labelClass}>Insurance Expiry Date</label>
                  <input
                    type="date"
                    name="insurance_expiry_date"
                    value={form.insurance_expiry_date}
                    onChange={handleChangeConditional}
                    className={getFieldClass()}
                    style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)' }}
                    readOnly={isViewMode}
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
                    onChange={handleChangeConditional}
                    className={getFieldClass()}
                    style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)' }}
                    readOnly={isViewMode}
                  />
                </div>
                <div>
                  <label className={labelClass}>Second Service Date</label>
                  <input
                    type="date"
                    name="second_service_date"
                    value={form.second_service_date}
                    onChange={handleChangeConditional}
                    className={getFieldClass()}
                    style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)' }}
                    readOnly={isViewMode}
                  />
                </div>
              </div>


              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className={labelClass}>Warranty Expiry Date</label>
                  <input
                    type="date"
                    name="warranty_expiry_date"
                    value={form.warranty_expiry_date}
                    onChange={handleChangeConditional}
                    className={getFieldClass()}
                    style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)' }}
                    readOnly={isViewMode}
                  />
                </div>
                <div>
                  <label className={labelClass}>Registration Date</label>
                  <input
                    type="date"
                    name="registration_date"
                    value={form.registration_date}
                    onChange={handleChangeConditional}
                    className={getFieldClass()}
                    style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)' }}
                    readOnly={isViewMode}
                  />
                </div>
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
                  </div>
                  <textarea
                    name="key_equipment"
                    value={form.key_equipment}
                    onChange={handleChangeConditional}
                    className={getFieldClass()}
                    style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)' }}
                    rows={8}
                    required={!isViewMode}
                    readOnly={isViewMode}
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-2xl font-bold text-white">Description</h3>
                  </div>
                  <textarea
                    name="description"
                    value={form.description}
                    onChange={handleChangeConditional}
                    className={getFieldClass()}
                    style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)' }}
                    rows={8}
                    placeholder="Enter vehicle description..."
                    readOnly={isViewMode}
                  />
                </div>


              </div>
              </div>
            )}

            {/* Documents Tab */}
            {activeTab === 'documents' && (
              <div className="space-y-6">
                {/* Document Upload */}
                <div className="border border-white/15 rounded-md p-4 bg-white/5">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-semibold text-white">Vehicle Documents</h4>
                    {(savedVehicle?.id || existingVehicle?.id) && (
                      <LeasingDocUploader
                        vehicleId={savedVehicle?.id || existingVehicle?.id}
                        variant="button"
                        buttonLabel="Upload"
                        onUploaded={refetchDocs}
                      />
                    )}
                  </div>
                  
                  {docs.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <h5 className="text-sm font-medium text-white/80">Uploaded Documents</h5>
                      {docs.map(doc => (
                        <div key={doc.id} className="flex items-center justify-between p-2 bg-black/30 rounded">
                          <span className="text-sm text-white/80">{doc.filename || 'Document'}</span>
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
                            <button 
                              onClick={() => {
                                if (confirm('Are you sure you want to delete this document?')) {
                                  handleDeleteDocument(doc);
                                }
                              }}
                              className="text-sm text-red-400 hover:text-red-300"
                            >
                              Delete
                            </button>
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
                    {(savedVehicle?.id || existingVehicle?.id) && (
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
                            <button 
                              onClick={() => {
                                if (confirm('Are you sure you want to delete the vehicle PDF?')) {
                                  handleDeleteVehiclePDF();
                                }
                              }}
                              className="text-sm text-red-400 hover:text-red-300"
                            >
                              Delete
                            </button>
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
              </div>
            )}

              </form>
            </div>
          </div>

          {/* Bottom Navigation */}
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

        {/* Gallery Viewer Modal */}
        {showGallery && gallery.length > 0 && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-[60]">
            <div className="relative flex items-center justify-center">
              {/* Media Container with Overlays */}
              {gallery[galleryIdx] && (
                <div className="relative">
                  <img 
                    src={getOriginalImageUrl(gallery[galleryIdx].url)} 
                    className="max-w-[90vw] max-h-[90vh] object-contain"
                    alt="Gallery image"
                  />
                  
                  {/* Close - Top Right of Image */}
                  <button
                    onClick={() => setShowGallery(false)}
                    className="absolute top-4 right-4 text-white/90 hover:text-white bg-black/60 backdrop-blur-sm hover:bg-black/80 rounded-full px-4 py-2 transition-all duration-200 shadow-lg z-10"
                  >
                    ✕
                  </button>
                  
                  {/* Download - Top Left of Image */}
                  <a
                    href={`${getOriginalImageUrl(gallery[galleryIdx].url)}?download`}
                    className="absolute top-4 left-4 text-white/90 hover:text-white bg-black/60 backdrop-blur-sm hover:bg-black/80 rounded-full px-4 py-2 transition-all duration-200 shadow-lg z-10"
                  >
                    Download
                  </a>
                  
                  {/* Image Counter - Bottom Center */}
                  <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white/90 bg-black/60 backdrop-blur-sm rounded-full px-4 py-2 text-sm shadow-lg z-10">
                    {galleryIdx + 1} / {gallery.length}
                  </div>
                </div>
              )}
              
              {/* Navigation Arrows - Outside image but centered */}
              {gallery.length > 1 && (
                <>
                  <button
                    onClick={() => setGalleryIdx(prev => prev > 0 ? prev - 1 : gallery.length - 1)}
                    className="absolute left-4 text-white/80 hover:text-white bg-black/60 backdrop-blur-sm hover:bg-black/80 rounded-full px-4 py-3 text-xl transition-all duration-200 shadow-lg z-10"
                    aria-label="Prev"
                  >
                    ‹
                  </button>
                  <button
                    onClick={() => setGalleryIdx(prev => prev < gallery.length - 1 ? prev + 1 : 0)}
                    className="absolute right-4 text-white/80 hover:text-white bg-black/60 backdrop-blur-sm hover:bg-black/80 rounded-full px-4 py-3 text-xl transition-all duration-200 shadow-lg z-10"
                    aria-label="Next"
                  >
                    ›
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}