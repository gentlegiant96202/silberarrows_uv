"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { X, User, MapPin, FileText, Car, Upload, Calendar, DollarSign } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (customer: any) => void;
  mode?: 'create' | 'edit';
  existingCustomer?: any;
}

interface InventoryVehicle {
  id: string;
  stock_number: string;
  make?: string;
  vehicle_model?: string;
  model_family?: string;
  model_year: number;
  body_style?: string;
  colour?: string;
  interior_colour?: string;
  current_mileage_km?: number;
  monthly_lease_rate?: number;
  status?: string;
  condition?: string;
  engine?: string;
  transmission?: string;
  fuel_type?: string;
}

export default function LeasingContractModal({ isOpen, onClose, onCreated, mode = 'create', existingCustomer }: Props) {
  // Standardized field styling classes
  const fieldClass = "w-full px-4 py-4 rounded-lg bg-black/20 border border-white/10 text-white text-lg focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/30 transition-all appearance-none [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield] [&:autofill]:bg-black/20 [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:opacity-70";
  const labelClass = "block text-white/80 text-lg font-semibold mb-3";
  const compactLabelClass = "block text-white/80 text-base font-medium mb-2";
  const compactFieldClass = "w-full px-3 py-3 rounded-lg bg-black/20 border border-white/10 text-white text-base focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/30 transition-all appearance-none [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield] [&:autofill]:bg-black/20";

  // Tab state
  const [activeTab, setActiveTab] = useState<string>('personal');
  
  // Form state - organized by tabs
  const [personalInfo, setPersonalInfo] = useState({
    customer_name: existingCustomer?.customer_name || "",
    customer_email: existingCustomer?.customer_email || "",
    customer_phone: existingCustomer?.customer_phone || "",
    date_of_birth: existingCustomer?.date_of_birth || "",
    emirates_id_number: existingCustomer?.emirates_id_number || "",
    passport_number: existingCustomer?.passport_number || "",
    visa_number: existingCustomer?.visa_number || ""
  });

  const [addressInfo, setAddressInfo] = useState({
    address_line_1: existingCustomer?.address_line_1 || "",
    address_line_2: existingCustomer?.address_line_2 || "",
    city: existingCustomer?.city || "",
    emirate: existingCustomer?.emirate || ""
  });


  const [contractInfo, setContractInfo] = useState({
    selected_vehicle_id: existingCustomer?.selected_vehicle_id || "",
    monthly_payment: existingCustomer?.monthly_payment?.toString() || "",
    security_deposit: existingCustomer?.security_deposit?.toString() || "",
    lease_term_months: existingCustomer?.lease_term_months?.toString() || "",
    lease_start_date: existingCustomer?.lease_start_date || "",
    lease_end_date: existingCustomer?.lease_end_date || "",
    lease_to_own_option: existingCustomer?.lease_to_own_option || false,
    buyout_price: existingCustomer?.buyout_price?.toString() || ""
  });

  const [documentUrls, setDocumentUrls] = useState({
    emirates_id_front_url: existingCustomer?.emirates_id_front_url || "",
    emirates_id_back_url: existingCustomer?.emirates_id_back_url || "",
    passport_front_url: existingCustomer?.passport_front_url || "",
    passport_back_url: existingCustomer?.passport_back_url || "",
    visa_copy_url: existingCustomer?.visa_copy_url || "",
    address_proof_url: existingCustomer?.address_proof_url || "",
    driving_license_front_url: existingCustomer?.driving_license_front_url || "",
    driving_license_back_url: existingCustomer?.driving_license_back_url || ""
  });

  const [notes, setNotes] = useState(existingCustomer?.notes || "");
  const [selectedVehicle, setSelectedVehicle] = useState<InventoryVehicle | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showErrors, setShowErrors] = useState(false);

  // Tab configuration with error checking
  const getTabErrors = (tabId: string) => {
    const tabFieldMap: Record<string, string[]> = {
      personal: ['customer_name', 'customer_email', 'customer_phone', 'date_of_birth', 'emirates_id_number', 'passport_number', 'visa_number', 'address_line_1', 'city', 'emirate'],
      documents: ['emirates_id_front_url', 'emirates_id_back_url', 'passport_front_url', 'visa_copy_url', 'address_proof_url', 'driving_license_front_url', 'driving_license_back_url'],
      pricing: ['selected_vehicle_id', 'monthly_payment', 'security_deposit', 'lease_term_months', 'lease_start_date', 'lease_end_date', 'buyout_price'],
      contract: []
    };
    
    return tabFieldMap[tabId]?.some(field => errors[field]) || false;
  };

  const tabs = [
    { id: 'personal', label: 'Personal Information', number: 1 },
    { id: 'documents', label: 'Identity Documents', number: 2 },
    { id: 'pricing', label: 'Contract Pricing', number: 3 },
    { id: 'contract', label: 'Generate Contract', number: 4 }
  ];


  // Emirates options
  const emirates = [
    { value: '', label: 'Select emirate' },
    { value: 'Abu Dhabi', label: 'Abu Dhabi' },
    { value: 'Dubai', label: 'Dubai' },
    { value: 'Sharjah', label: 'Sharjah' },
    { value: 'Ajman', label: 'Ajman' },
    { value: 'Umm Al Quwain', label: 'Umm Al Quwain' },
    { value: 'Ras Al Khaimah', label: 'Ras Al Khaimah' },
    { value: 'Fujairah', label: 'Fujairah' }
  ];

  // Document upload fields configuration
  const documentFields = [
    { key: 'emirates_id_front_url', label: 'Emirates ID (Front)', required: true },
    { key: 'emirates_id_back_url', label: 'Emirates ID (Back)', required: true },
    { key: 'passport_front_url', label: 'Passport (Photo Page)', required: true },
    { key: 'passport_back_url', label: 'Passport (Back Page)', required: false },
    { key: 'visa_copy_url', label: 'UAE Visa Copy', required: true },
    { key: 'address_proof_url', label: 'Address Proof (DEWA/Etisalat)', required: true },
    { key: 'driving_license_front_url', label: 'Driving License (Front)', required: true },
    { key: 'driving_license_back_url', label: 'Driving License (Back)', required: true }
  ];

  // Update form when existingCustomer changes
  useEffect(() => {
    if (existingCustomer) {
      console.log('🔍 Contract Modal received existingCustomer:', existingCustomer);
      
      setPersonalInfo({
        customer_name: existingCustomer.customer_name || "",
        customer_email: existingCustomer.customer_email || "",
        customer_phone: existingCustomer.customer_phone || "",
        date_of_birth: existingCustomer.date_of_birth || "",
        emirates_id_number: existingCustomer.emirates_id_number || "",
        passport_number: existingCustomer.passport_number || "",
        visa_number: existingCustomer.visa_number || ""
      });

      setAddressInfo({
        address_line_1: existingCustomer.address_line_1 || "",
        address_line_2: existingCustomer.address_line_2 || "",
        city: existingCustomer.city || "",
        emirate: existingCustomer.emirate || ""
      });


      setContractInfo({
        selected_vehicle_id: existingCustomer.selected_vehicle_id || "",
        monthly_payment: existingCustomer.monthly_payment?.toString() || "",
        security_deposit: existingCustomer.security_deposit?.toString() || "",
        lease_term_months: existingCustomer.lease_term_months?.toString() || "",
        lease_start_date: existingCustomer.lease_start_date || "",
        lease_end_date: existingCustomer.lease_end_date || "",
        lease_to_own_option: existingCustomer.lease_to_own_option || false,
        buyout_price: existingCustomer.buyout_price?.toString() || ""
      });

      setDocumentUrls({
        emirates_id_front_url: existingCustomer.emirates_id_front_url || "",
        emirates_id_back_url: existingCustomer.emirates_id_back_url || "",
        passport_front_url: existingCustomer.passport_front_url || "",
        passport_back_url: existingCustomer.passport_back_url || "",
        visa_copy_url: existingCustomer.visa_copy_url || "",
        address_proof_url: existingCustomer.address_proof_url || "",
        driving_license_front_url: existingCustomer.driving_license_front_url || "",
        driving_license_back_url: existingCustomer.driving_license_back_url || ""
      });

      setNotes(existingCustomer.notes || "");

      // Load selected vehicle if ID exists
      if (existingCustomer.selected_vehicle_id) {
        fetchSelectedVehicle(existingCustomer.selected_vehicle_id);
      }
    }
  }, [existingCustomer]);

  // Validation function
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Personal Information Validation
    if (!personalInfo.customer_name.trim()) {
      newErrors['customer_name'] = 'Customer name is required';
    }
    if (!personalInfo.customer_email.trim()) {
      newErrors['customer_email'] = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(personalInfo.customer_email)) {
      newErrors['customer_email'] = 'Please enter a valid email address';
    }
    if (!personalInfo.customer_phone.trim()) {
      newErrors['customer_phone'] = 'Phone number is required';
    }
    if (!personalInfo.date_of_birth) {
      newErrors['date_of_birth'] = 'Date of birth is required';
    }
    if (!personalInfo.emirates_id_number.trim()) {
      newErrors['emirates_id_number'] = 'Emirates ID number is required';
    }
    if (!personalInfo.passport_number.trim()) {
      newErrors['passport_number'] = 'Passport number is required';
    }
    if (!personalInfo.visa_number.trim()) {
      newErrors['visa_number'] = 'UAE Visa number is required';
    }

    // Address Information Validation
    if (!addressInfo.address_line_1.trim()) {
      newErrors['address_line_1'] = 'Address line 1 is required';
    }
    if (!addressInfo.city.trim()) {
      newErrors['city'] = 'City is required';
    }
    if (!addressInfo.emirate) {
      newErrors['emirate'] = 'Emirate is required';
    }


    // Document Validation (Required documents)
    const requiredDocs = [
      { key: 'emirates_id_front_url', label: 'Emirates ID (Front)' },
      { key: 'emirates_id_back_url', label: 'Emirates ID (Back)' },
      { key: 'passport_front_url', label: 'Passport (Photo Page)' },
      { key: 'visa_copy_url', label: 'UAE Visa Copy' },
      { key: 'address_proof_url', label: 'Address Proof' },
      { key: 'driving_license_front_url', label: 'Driving License (Front)' },
      { key: 'driving_license_back_url', label: 'Driving License (Back)' }
    ];

    requiredDocs.forEach(doc => {
      if (!documentUrls[doc.key as keyof typeof documentUrls]) {
        newErrors[doc.key] = `${doc.label} is required`;
      }
    });

    // Contract Information Validation
    if (!contractInfo.selected_vehicle_id) {
      newErrors['selected_vehicle_id'] = 'Vehicle selection is required';
    }
    if (!contractInfo.monthly_payment) {
      newErrors['monthly_payment'] = 'Monthly payment is required';
    } else if (parseFloat(contractInfo.monthly_payment) <= 0) {
      newErrors['monthly_payment'] = 'Monthly payment must be greater than 0';
    }
    if (!contractInfo.security_deposit) {
      newErrors['security_deposit'] = 'Security deposit is required';
    } else if (parseFloat(contractInfo.security_deposit) < 0) {
      newErrors['security_deposit'] = 'Security deposit cannot be negative';
    }
    if (!contractInfo.lease_term_months) {
      newErrors['lease_term_months'] = 'Lease term is required';
    }
    if (!contractInfo.lease_start_date) {
      newErrors['lease_start_date'] = 'Lease start date is required';
    }
    if (!contractInfo.lease_end_date) {
      newErrors['lease_end_date'] = 'Lease end date is required';
    }

    // Validate lease dates
    if (contractInfo.lease_start_date && contractInfo.lease_end_date) {
      const startDate = new Date(contractInfo.lease_start_date);
      const endDate = new Date(contractInfo.lease_end_date);
      if (endDate <= startDate) {
        newErrors['lease_end_date'] = 'Lease end date must be after start date';
      }
    }

    // Buyout price validation (only if lease-to-own is selected)
    if (contractInfo.lease_to_own_option) {
      if (!contractInfo.buyout_price) {
        newErrors['buyout_price'] = 'Buyout price is required for lease-to-own option';
      } else if (parseFloat(contractInfo.buyout_price) <= 0) {
        newErrors['buyout_price'] = 'Buyout price must be greater than 0';
      }
    }

    setErrors(newErrors);
    setShowErrors(Object.keys(newErrors).length > 0);
    return Object.keys(newErrors).length === 0;
  };

  // Fetch selected vehicle details
  const fetchSelectedVehicle = async (vehicleId: string) => {
    try {
      const { data, error } = await supabase
        .from('leasing_inventory')
        .select('*')
        .eq('id', vehicleId)
        .single();

      if (error) {
        console.error('❌ Error fetching selected vehicle:', error);
        return;
      }

      if (data) {
        const transformedVehicle = {
          ...data,
          make: data.make || 'Mercedes-Benz',
          model: data.vehicle_model || data.model || data.model_family || 'Unknown Model',
          exterior_color: data.colour || data.exterior_color || 'Unknown Color',
          interior_color: data.interior_colour || data.interior_color || 'Unknown Interior',
          mileage_km: data.current_mileage_km || data.mileage_km || 0,
          engine_type: data.engine || data.engine_type || 'Unknown Engine'
        };
        setSelectedVehicle(transformedVehicle);
      }
    } catch (error) {
      console.error('❌ Error in fetchSelectedVehicle:', error);
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form before submission
    if (!validateForm()) {
      console.log('❌ Form validation failed:', errors);
      // Find the first tab with errors and switch to it
      const errorKeys = Object.keys(errors);
      if (errorKeys.length > 0) {
        const firstError = errorKeys[0];
        if (['customer_name', 'customer_email', 'customer_phone', 'date_of_birth', 'emirates_id_number', 'passport_number', 'visa_number'].includes(firstError)) {
          setActiveTab('personal');
        } else if (firstError.includes('_url')) {
          setActiveTab('documents');
        } else if (['selected_vehicle_id', 'monthly_payment', 'security_deposit', 'lease_term_months', 'lease_start_date', 'lease_end_date', 'buyout_price'].includes(firstError)) {
          setActiveTab('pricing');
        } else {
          setActiveTab('contract');
        }
      }
      return;
    }

    setLoading(true);
    setShowErrors(false);

    try {
      console.log('📝 Submitting contract data...');
      console.log('📊 Form data before processing:');
      console.log('Personal Info:', personalInfo);
      console.log('Address Info:', addressInfo);
      console.log('Contract Info:', contractInfo);
      console.log('Document URLs:', documentUrls);

      // Combine all form data - only include fields that exist in database
      const contractData: any = {
        // Personal info (core fields that should exist)
        customer_name: personalInfo.customer_name.toUpperCase(),
        customer_email: personalInfo.customer_email || null,
        customer_phone: personalInfo.customer_phone || null,
        date_of_birth: personalInfo.date_of_birth || null,
        emirates_id_number: personalInfo.emirates_id_number || null,
        passport_number: personalInfo.passport_number || null,
        visa_number: personalInfo.visa_number || null,
        
        // Address info
        address_line_1: addressInfo.address_line_1 || null,
        address_line_2: addressInfo.address_line_2 || null,
        city: addressInfo.city || null,
        emirate: addressInfo.emirate || null,
        
        
        // Contract info
        selected_vehicle_id: contractInfo.selected_vehicle_id || null,
        monthly_payment: contractInfo.monthly_payment ? parseFloat(contractInfo.monthly_payment) : null,
        security_deposit: contractInfo.security_deposit ? parseFloat(contractInfo.security_deposit) : null,
        lease_term_months: contractInfo.lease_term_months ? parseInt(contractInfo.lease_term_months) : null,
        lease_start_date: contractInfo.lease_start_date || null,
        lease_end_date: contractInfo.lease_end_date || null,
        lease_to_own_option: contractInfo.lease_to_own_option || false,
        
        // Document URLs
        emirates_id_front_url: documentUrls.emirates_id_front_url || null,
        emirates_id_back_url: documentUrls.emirates_id_back_url || null,
        passport_front_url: documentUrls.passport_front_url || null,
        passport_back_url: documentUrls.passport_back_url || null,
        visa_copy_url: documentUrls.visa_copy_url || null,
        address_proof_url: documentUrls.address_proof_url || null,
        driving_license_front_url: documentUrls.driving_license_front_url || null,
        driving_license_back_url: documentUrls.driving_license_back_url || null,
        
        // Status and metadata
        lease_status: 'contracts_drafted',
        notes: notes || null,
        updated_at: new Date().toISOString()
      };

      // Only add buyout_price if it exists (might not be in database yet)
      if (contractInfo.buyout_price && contractInfo.lease_to_own_option) {
        contractData.buyout_price = parseFloat(contractInfo.buyout_price);
      }

      console.log('📊 Contract data to save:', contractData);

      let result;
      if (mode === 'edit' && existingCustomer?.id) {
        // Update existing customer
        result = await supabase
          .from('leasing_customers')
          .update(contractData)
          .eq('id', existingCustomer.id)
          .select()
          .single();
      } else {
        // Create new customer
        result = await supabase
          .from('leasing_customers')
          .insert([contractData])
          .select()
          .single();
      }


      if (result.error) {
        console.error('❌ Error saving contract:', result.error);
        console.error('Error details:', {
          message: result.error.message,
          details: result.error.details,
          hint: result.error.hint,
          code: result.error.code
        });
        console.error('Contract data that failed:', contractData);
        alert(`Error saving contract: ${result.error.message || 'Unknown error'}. Please check the console for details.`);
        return;
      }

      console.log('✅ Contract saved successfully:', result.data);
      onCreated(result.data);
      onClose();

    } catch (error) {
      console.error('❌ Error in handleSubmit:', error);
      alert('Error saving contract. Please try again.');
    } finally {
      setLoading(false);
    }
  };


  // Handle file upload (placeholder for now)
  const handleFileUpload = async (field: string, file: File) => {
    setUploading(true);
    try {
      console.log(`📎 File upload for ${field}:`, file.name);
      // TODO: Implement actual file upload to Supabase Storage
      // Simulate upload delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      // For now, just set a placeholder URL
      setDocumentUrls(prev => ({
        ...prev,
        [field]: `placeholder-url-for-${file.name}`
      }));
    } finally {
      setUploading(false);
    }
  };

  // Helper component for error display
  const ErrorMessage = ({ field }: { field: string }) => {
    if (!showErrors || !errors[field]) return null;
    return (
      <p className="text-red-400 text-sm mt-1 flex items-center gap-1">
        <span className="text-red-400">⚠</span>
        {errors[field]}
      </p>
    );
  };

  if (!isOpen) return null;

  return (
    <>
      <style jsx global>{`
        /* Custom scrollbar styling for glassmorphism */
        .overflow-y-auto::-webkit-scrollbar {
          width: 6px;
        }
        .overflow-y-auto::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 3px;
        }
        .overflow-y-auto::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 3px;
        }
        .overflow-y-auto::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.3);
        }
        
        /* Force consistent input styling */
        input[type="date"], input[type="tel"], input[type="email"], input[type="text"], input[type="number"], select, textarea {
          background-color: rgba(0, 0, 0, 0.2) !important;
          color: white !important;
        }
        
        /* Date picker icon styling */
        input[type="date"]::-webkit-calendar-picker-indicator {
          filter: invert(1);
          opacity: 0.7;
        }
        
        /* Remove autofill styling */
        input:-webkit-autofill,
        input:-webkit-autofill:hover,
        input:-webkit-autofill:focus,
        input:-webkit-autofill:active {
          -webkit-box-shadow: 0 0 0 30px rgba(0, 0, 0, 0.2) inset !important;
          -webkit-text-fill-color: white !important;
        }
      `}</style>
      <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
        <div className="bg-black/40 backdrop-blur-xl rounded-2xl w-full max-w-6xl h-[85vh] flex flex-col border border-white/10 shadow-2xl" style={{ boxShadow: '0 0 60px rgba(255, 255, 255, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.1)' }}>
          
          {/* Enhanced Header with Status Badge and Progress */}
          <div className="p-4 border-b border-white/5 bg-gradient-to-r from-white/5 to-white/10 backdrop-blur-sm">
            {/* Top Row: Status Badge and Progress */}
            <div className="flex items-center justify-between mb-3">
              {/* Status Badge */}
              <div className="px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wide border bg-white/10 backdrop-blur-sm border-white/20 text-gray-200">
                ● Contract Details
              </div>
              
              {/* Progress Indicator */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-white/50 uppercase tracking-wide">Progress</span>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-white/60" />
                  <div className="w-6 h-0.5 bg-white/60" />
                  <div className="w-2 h-2 rounded-full bg-white/60" />
                  <div className="w-6 h-0.5 bg-white/60" />
                  <div className="w-2 h-2 rounded-full bg-white/60" />
                  <div className="w-6 h-0.5 bg-white/20" />
                  <div className="w-2 h-2 rounded-full bg-white/20" />
                </div>
              </div>
            </div>
            
            {/* Title Row */}
            <div>
              <h2 className="text-xl font-semibold text-white">
              {mode === 'edit' ? 'Edit Contract Details' : 'New Contract Details'}
            {existingCustomer?.customer_name && (
                  <span className="text-white/60 font-normal"> - {existingCustomer.customer_name}</span>
                )}
              </h2>
              <p className="text-sm text-white/60 mt-1">
                Complete customer information and contract details
              </p>
            </div>
            
            {/* Stage Labels */}
            <div className="flex items-center justify-between mt-3 text-xs text-white/40">
              <span className="text-white/80">Prospect</span>
              <span className="text-white/80">Appointment</span>
              <span className="text-white/80">Contract</span>
              <span>Active Lease</span>
            </div>
          </div>
          
          {/* Action Buttons Bar */}
          <div className="px-4 py-3 border-b border-white/5 bg-white/5 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-sm text-white/60">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                {mode === 'edit' ? 'Editing contract details' : 'Creating new contract'}
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
                  className="px-4 py-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-all border border-white/10"
              type="button"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
                  className="px-6 py-2 font-medium rounded-lg hover:shadow-lg transition-all bg-gradient-to-br from-gray-200 via-gray-100 to-gray-400 text-black disabled:opacity-50"
              type="button"
            >
              {loading ? 'Saving...' : mode === 'edit' ? 'Update Contract' : 'Save Contract'}
            </button>
              </div>
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto max-h-full">
          {/* Tab Navigation - Inside scrollable area */}
          <div className="sticky top-0 bg-black/40 backdrop-blur-xl z-10 pt-4 px-4">
            <div className="grid grid-cols-4 gap-1 bg-white/5 backdrop-blur-sm p-1 rounded-lg border border-white/10 mb-4">
            {tabs.map((tab) => {
              const hasErrors = showErrors && getTabErrors(tab.id);
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                    className={`relative w-full py-4 px-3 font-semibold text-sm uppercase tracking-wide rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-white/30 focus:ring-offset-2 focus:ring-offset-black/40 ${
                    activeTab === tab.id
                      ? 'bg-gradient-to-br from-gray-200 via-gray-100 to-gray-400 text-black border border-white/30'
                      : hasErrors
                      ? 'text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-red-400/30'
                      : 'text-white/70 hover:text-white/90 hover:bg-white/10 border border-transparent'
                  }`}
                  type="button"
                  aria-current={activeTab === tab.id ? 'page' : undefined}
                >
                    <span className="flex flex-col items-center gap-2">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold ${
                        activeTab === tab.id 
                          ? 'bg-black/20 text-black' 
                          : 'bg-white/20 text-white/80'
                      }`}>
                        {tab.number}
                      </span>
                      <span className="text-center leading-tight">
                    {tab.label}
                    {hasErrors && (
                          <span className="text-red-400 text-xs ml-1">⚠</span>
                    )}
                      </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

          <div className="px-4 pb-4">
          {/* Error Summary */}
          {showErrors && Object.keys(errors).length > 0 && (
            <div className="bg-red-500/10 border border-red-400/30 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-red-400 text-lg">⚠</span>
                <h4 className="text-red-400 font-semibold">Please fix the following errors:</h4>
              </div>
              <ul className="text-red-300 text-sm space-y-1 ml-6">
                {Object.entries(errors).slice(0, 5).map(([field, message]) => (
                  <li key={field} className="list-disc">{message}</li>
                ))}
                {Object.keys(errors).length > 5 && (
                  <li className="list-disc text-red-400">... and {Object.keys(errors).length - 5} more errors</li>
                )}
              </ul>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Personal Tab */}
            {activeTab === 'personal' && (
              <div className="bg-white/5 backdrop-blur-md rounded-xl p-4 border border-white/10 shadow-lg" style={{ boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.1)' }}>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-white/10 backdrop-blur-sm text-white/80">
                      <User size={20} />
                    </div>
                    Personal Information
                  </h3>
                  <div className="text-xs text-white/70 bg-white/10 backdrop-blur-sm px-2 py-1 rounded-full">
                    Required Fields
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Customer Name */}
                  <div>
                    <label className={labelClass}>Customer Name *</label>
                    <input
                      type="text"
                      value={personalInfo.customer_name}
                      onChange={(e) => setPersonalInfo(prev => ({ ...prev, customer_name: e.target.value }))}
                      className={`${fieldClass} ${errors.customer_name ? 'border-red-400 focus:border-red-400 focus:ring-red-400/30' : ''}`}
                      required
                    />
                    <ErrorMessage field="customer_name" />
                  </div>

                  {/* Email */}
                  <div>
                    <label className={labelClass}>Email Address *</label>
                    <input
                      type="email"
                      value={personalInfo.customer_email}
                      onChange={(e) => setPersonalInfo(prev => ({ ...prev, customer_email: e.target.value }))}
                      className={`${fieldClass} ${errors.customer_email ? 'border-red-400 focus:border-red-400 focus:ring-red-400/30' : ''}`}
                      required
                    />
                    <ErrorMessage field="customer_email" />
                  </div>

                  {/* Phone */}
                  <div>
                    <label className={labelClass}>Phone Number *</label>
                    <input
                      type="tel"
                      value={personalInfo.customer_phone}
                      onChange={(e) => setPersonalInfo(prev => ({ ...prev, customer_phone: e.target.value }))}
                      className={`${fieldClass} ${errors.customer_phone ? 'border-red-400 focus:border-red-400 focus:ring-red-400/30' : ''}`}
                      required
                    />
                    <ErrorMessage field="customer_phone" />
                  </div>

                  {/* Date of Birth */}
                  <div>
                    <label className={labelClass}>Date of Birth</label>
                    <input
                      type="date"
                      value={personalInfo.date_of_birth}
                      onChange={(e) => setPersonalInfo(prev => ({ ...prev, date_of_birth: e.target.value }))}
                      className={fieldClass}
                    />
                  </div>

                  {/* Emirates ID */}
                  <div>
                    <label className={labelClass}>Emirates ID Number</label>
                    <input
                      type="text"
                      value={personalInfo.emirates_id_number}
                      onChange={(e) => setPersonalInfo(prev => ({ ...prev, emirates_id_number: e.target.value }))}
                      className={fieldClass}
                      placeholder="784-XXXX-XXXXXXX-X"
                    />
                  </div>

                  {/* Passport Number */}
                  <div>
                    <label className={labelClass}>Passport Number</label>
                    <input
                      type="text"
                      value={personalInfo.passport_number}
                      onChange={(e) => setPersonalInfo(prev => ({ ...prev, passport_number: e.target.value }))}
                      className={fieldClass}
                    />
                  </div>

                  {/* Visa Number */}
                  <div className="md:col-span-2">
                    <label className={labelClass}>UAE Visa Number</label>
                    <input
                      type="text"
                      value={personalInfo.visa_number}
                      onChange={(e) => setPersonalInfo(prev => ({ ...prev, visa_number: e.target.value }))}
                      className={fieldClass}
                    />
                  </div>
                </div>

                {/* Address Information Section */}
                <div className="mt-8 pt-6 border-t border-white/10">
                  <div className="flex items-center justify-between mb-6">
                    <h4 className="text-lg font-semibold text-white flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-white/10 backdrop-blur-sm text-white/80">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </div>
                      Address Information
                    </h4>
                    <div className="text-xs text-white/70 bg-white/10 backdrop-blur-sm px-2 py-1 rounded-full">
                      Required
                    </div>
                </div>

                <div className="space-y-6">
                  {/* Address Line 1 */}
                  <div>
                    <label className={labelClass}>Address Line 1</label>
                    <input
                      type="text"
                      value={addressInfo.address_line_1}
                      onChange={(e) => setAddressInfo(prev => ({ ...prev, address_line_1: e.target.value }))}
                      className={fieldClass}
                      placeholder="Building name, street name"
                    />
                  </div>

                  {/* Address Line 2 */}
                  <div>
                    <label className={labelClass}>Address Line 2</label>
                    <input
                      type="text"
                      value={addressInfo.address_line_2}
                      onChange={(e) => setAddressInfo(prev => ({ ...prev, address_line_2: e.target.value }))}
                      className={fieldClass}
                      placeholder="Apartment, suite, unit, etc."
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* City */}
                    <div>
                      <label className={labelClass}>City</label>
                      <input
                        type="text"
                        value={addressInfo.city}
                        onChange={(e) => setAddressInfo(prev => ({ ...prev, city: e.target.value }))}
                        className={fieldClass}
                      />
                    </div>

                    {/* Emirate */}
                    <div>
                      <label className={labelClass}>Emirate</label>
                      <select
                        value={addressInfo.emirate}
                        onChange={(e) => setAddressInfo(prev => ({ ...prev, emirate: e.target.value }))}
                        className={fieldClass}
                      >
                        {emirates.map(emirate => (
                          <option key={emirate.value} value={emirate.value} className="bg-gray-800 text-white">
                            {emirate.label}
                          </option>
                        ))}
                      </select>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}



            {/* Documents Tab */}
            {activeTab === 'documents' && (
              <div className="space-y-6">
                {/* Document Upload Sections - Two Column Layout */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {documentFields.map((field) => {
                  const isUploaded = documentUrls[field.key as keyof typeof documentUrls];
                  
                  return (
                    <div key={field.key} className="border border-white/15 rounded-md p-4 bg-white/5">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-sm font-semibold text-white">
                          {field.label}
                          {field.required && <span className="text-red-400 ml-1">*</span>}
                        </h4>
                        <button
                          onClick={() => document.getElementById(`upload-${field.key}`)?.click()}
                          disabled={uploading}
                          className="text-sm bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 h-9 min-w-[160px] rounded transition-colors disabled:opacity-50"
                        >
                          {uploading ? 'Uploading…' : 'Upload'}
                        </button>
                      </div>
                      
                      {/* Uploaded Documents List */}
                      {isUploaded && (
                        <div className="mt-4 space-y-2">
                          <h5 className="text-sm font-medium text-white/80">Uploaded Documents</h5>
                          <div className="flex items-center justify-between p-2 bg-black/30 rounded">
                            <span className="text-sm text-white/80">{field.label.replace(/\s+/g, '_')}.pdf</span>
                            <div className="flex gap-2">
                              <button
                                onClick={() => {
                                  const url = documentUrls[field.key as keyof typeof documentUrls];
                                  if (url) window.open(url, '_blank');
                                }}
                                className="text-sm text-gray-400 hover:text-white underline"
                              >
                                View
                              </button>
                              <button
                                onClick={() => {
                                  const url = documentUrls[field.key as keyof typeof documentUrls];
                                  if (url) {
                                    const a = document.createElement('a');
                                    a.href = url;
                                    a.download = `${field.label.replace(/\s+/g, '_')}.pdf`;
                                    a.click();
                                  }
                                }}
                                className="text-sm text-gray-400 hover:text-white underline"
                              >
                                Download
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm('Are you sure you want to delete this document?')) {
                                    setDocumentUrls(prev => ({
                                      ...prev,
                                      [field.key]: ''
                                    }));
                                  }
                                }}
                                className="text-sm text-red-400 hover:text-red-300 underline"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* Hidden file input */}
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        multiple
                        onChange={(e) => {
                          const files = Array.from(e.target.files || []);
                          if (files.length > 0) {
                            // Handle multiple files - for now just use the first one
                            handleFileUpload(field.key, files[0]);
                          }
                        }}
                        className="hidden"
                        id={`upload-${field.key}`}
                      />
                    </div>
                  );
                  })}
                </div>

                {/* Other Documents Section */}
                <div className="border border-white/15 rounded-md p-4 bg-white/5">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-semibold text-white">Other Documents</h4>
                    <button
                      onClick={() => document.getElementById('upload-other-documents')?.click()}
                      disabled={uploading}
                      className="text-sm bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 h-9 min-w-[160px] rounded transition-colors disabled:opacity-50"
                    >
                      {uploading ? 'Uploading…' : 'Upload'}
                    </button>
                  </div>

                  {/* Uploaded Other Documents List */}
                  <div id="other-documents-list" className="mt-4 space-y-2 hidden">
                    <h5 className="text-sm font-medium text-white/80">Uploaded Documents</h5>
                    <div id="other-documents-items" className="space-y-2">
                      {/* Dynamic file items will be added here */}
                    </div>
                  </div>

                  {/* Hidden file input for other documents */}
                  <input
                    type="file"
                    accept="image/*,.pdf,.doc,.docx,.txt"
                    multiple
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []);
                      if (files.length > 0) {
                        const filesList = document.getElementById('other-documents-list');
                        const filesItems = document.getElementById('other-documents-items');
                        
                        // Show uploaded files list
                        if (filesList && filesItems) {
                          filesList.classList.remove('hidden');
                          
                          // Add file items
                          files.forEach((file, index) => {
                            const fileItem = document.createElement('div');
                            fileItem.className = 'flex items-center justify-between p-2 bg-black/30 rounded';
                            fileItem.innerHTML = `
                              <span class="text-sm text-white/80">${file.name}</span>
                              <div class="flex gap-2">
                                <button class="text-sm text-gray-400 hover:text-white underline" onclick="window.open('#', '_blank')">View</button>
                                <button class="text-sm text-gray-400 hover:text-white underline">Download</button>
                                <button class="text-sm text-red-400 hover:text-red-300 underline" onclick="this.parentElement.parentElement.remove()">Delete</button>
                              </div>
                            `;
                            filesItems.appendChild(fileItem);
                          });
                        }
                      }
                    }}
                    className="hidden"
                    id="upload-other-documents"
                  />
                </div>

                {/* Upload Instructions */}
                <div className="mt-6 p-4 bg-white/5 backdrop-blur-sm rounded-lg border border-white/10">
                  <div className="flex items-start gap-3">
                    <div className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400 flex-shrink-0">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-white font-medium text-sm mb-1">Document Requirements</h4>
                      <ul className="text-white/60 text-xs space-y-1">
                        <li>• All documents must be clear and readable</li>
                        <li>• Accepted formats: PNG, JPG, JPEG, PDF</li>
                        <li>• Maximum file size: 10MB per document</li>
                        <li>• Documents should be recent and valid</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Pricing Tab */}
            {activeTab === 'pricing' && (
              <div className="bg-white/5 backdrop-blur-md rounded-xl p-4 border border-white/10 shadow-lg" style={{ boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.1)' }}>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-white/10 backdrop-blur-sm text-white/80">
                      <DollarSign size={20} />
                    </div>
                    Contract Pricing
                  </h3>
                  <div className="text-xs text-white/70 bg-white/10 backdrop-blur-sm px-2 py-1 rounded-full">
                    Vehicle & Terms
                  </div>
                </div>

                {/* Selected Vehicle Display */}
                {selectedVehicle && (
                  <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg p-4 mb-6">
                    <h4 className="text-white font-semibold mb-3">Selected Vehicle</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-400">Make:</span>
                        <p className="text-white font-medium">{selectedVehicle.make}</p>
                      </div>
                      <div>
                        <span className="text-gray-400">Model:</span>
                        <p className="text-white font-medium">{selectedVehicle.vehicle_model}</p>
                      </div>
                      <div>
                        <span className="text-gray-400">Year:</span>
                        <p className="text-white font-medium">{selectedVehicle.model_year}</p>
                      </div>
                      <div>
                        <span className="text-gray-400">Stock #:</span>
                        <p className="text-white font-medium">{selectedVehicle.stock_number}</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Monthly Payment */}
                  <div>
                    <label className={labelClass}>Monthly Payment (AED)</label>
                    <input
                      type="number"
                      value={contractInfo.monthly_payment}
                      onChange={(e) => setContractInfo(prev => ({ ...prev, monthly_payment: e.target.value }))}
                      className={fieldClass}
                      min="0"
                      step="0.01"
                    />
                  </div>

                  {/* Security Deposit */}
                  <div>
                    <label className={labelClass}>Security Deposit (AED)</label>
                    <input
                      type="number"
                      value={contractInfo.security_deposit}
                      onChange={(e) => setContractInfo(prev => ({ ...prev, security_deposit: e.target.value }))}
                      className={fieldClass}
                      min="0"
                      step="0.01"
                    />
                  </div>

                  {/* Lease Term */}
                  <div>
                    <label className={labelClass}>Lease Term (Months)</label>
                    <select
                      value={contractInfo.lease_term_months}
                      onChange={(e) => setContractInfo(prev => ({ ...prev, lease_term_months: e.target.value }))}
                      className={fieldClass}
                    >
                      <option value="" className="bg-gray-800 text-white">Select term</option>
                      <option value="12" className="bg-gray-800 text-white">12 months</option>
                      <option value="24" className="bg-gray-800 text-white">24 months</option>
                      <option value="36" className="bg-gray-800 text-white">36 months</option>
                      <option value="48" className="bg-gray-800 text-white">48 months</option>
                    </select>
                  </div>

                  {/* Lease to Own Option */}
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="lease_to_own"
                      checked={contractInfo.lease_to_own_option}
                      onChange={(e) => setContractInfo(prev => ({ ...prev, lease_to_own_option: e.target.checked }))}
                      className="w-5 h-5 rounded border-white/10 bg-black/20 text-white focus:ring-white/30"
                    />
                    <label htmlFor="lease_to_own" className={labelClass + " mb-0"}>
                      Lease-to-Own Option
                    </label>
                  </div>

                  {/* Buyout Price - Only show when lease-to-own is selected */}
                  {contractInfo.lease_to_own_option && (
                    <div>
                      <label className={labelClass}>Buyout Price (AED) *</label>
                      <input
                        type="number"
                        value={contractInfo.buyout_price}
                        onChange={(e) => setContractInfo(prev => ({ ...prev, buyout_price: e.target.value }))}
                        className={fieldClass}
                        min="0"
                        step="0.01"
                        placeholder="Enter buyout price for lease-to-own"
                        required={contractInfo.lease_to_own_option}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Price customer will pay to own the vehicle at lease end
                      </p>
                    </div>
                  )}

                  {/* Lease Start Date */}
                  <div>
                    <label className={labelClass}>Lease Start Date</label>
                    <input
                      type="date"
                      value={contractInfo.lease_start_date}
                      onChange={(e) => setContractInfo(prev => ({ ...prev, lease_start_date: e.target.value }))}
                      className={fieldClass}
                    />
                  </div>

                  {/* Lease End Date */}
                  <div>
                    <label className={labelClass}>Lease End Date</label>
                    <input
                      type="date"
                      value={contractInfo.lease_end_date}
                      onChange={(e) => setContractInfo(prev => ({ ...prev, lease_end_date: e.target.value }))}
                      className={fieldClass}
                    />
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className={labelClass}>Additional Notes</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className={fieldClass + " min-h-[120px] resize-vertical"}
                    placeholder="Any additional notes or special terms..."
                  />
                </div>
              </div>
            )}

            {/* Contract Tab */}
            {activeTab === 'contract' && (
              <div className="bg-white/5 backdrop-blur-md rounded-xl p-4 border border-white/10 shadow-lg" style={{ boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.1)' }}>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-white/10 backdrop-blur-sm text-white/80">
                      <Car size={20} />
                    </div>
                    Generate Contract
                  </h3>
                  <div className="text-xs text-white/70 bg-white/10 backdrop-blur-sm px-2 py-1 rounded-full">
                    Coming Soon
                  </div>
                </div>

                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center">
                      <Car className="w-8 h-8 text-white/60" />
                    </div>
                    <h4 className="text-lg font-semibold text-white mb-2">Generate Contract</h4>
                    <p className="text-white/60 text-sm max-w-md">
                      This section will contain contract generation, digital signing, and document management features.
                    </p>
                  </div>
                </div>
              </div>
            )}

          </form>
        </div>
      </div>
      
      {/* Fixed Navigation Buttons at Bottom */}
      <div className="fixed bottom-0 left-0 right-0 z-60 px-4 py-4 bg-black/80 backdrop-blur-md border-t border-white/10">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <button
            onClick={() => {
              const currentIndex = tabs.findIndex(tab => tab.id === activeTab);
              if (currentIndex > 0) {
                setActiveTab(tabs[currentIndex - 1].id);
              }
            }}
            disabled={activeTab === tabs[0].id}
            className="px-6 py-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-all border border-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
            type="button"
          >
            Previous
          </button>

          <div className="flex items-center gap-2 text-xs text-white/50">
            <span>Step {tabs.findIndex(tab => tab.id === activeTab) + 1} of {tabs.length}</span>
          </div>

          <button
            onClick={() => {
              const currentIndex = tabs.findIndex(tab => tab.id === activeTab);
              if (currentIndex < tabs.length - 1) {
                setActiveTab(tabs[currentIndex + 1].id);
              } else {
                // On last tab, trigger save
                handleSubmit(new Event('submit') as any);
              }
            }}
            className="px-6 py-2 font-medium rounded-lg hover:shadow-lg transition-all bg-gradient-to-br from-gray-200 via-gray-100 to-gray-400 text-black"
            type="button"
          >
            {activeTab === tabs[tabs.length - 1].id ? 'Save Contract' : 'Next'}
          </button>
        </div>
      </div>
    </div>
      </div>
      </>
  );
}
