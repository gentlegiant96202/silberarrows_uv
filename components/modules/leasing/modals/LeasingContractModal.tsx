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
  monthly_lease_rate?: number;
  security_deposit?: number;
  buyout_price?: number;
  excess_mileage_charges?: number;
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
    emirates_id_number: existingCustomer?.emirates_id_number || ""
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
    buyout_price: existingCustomer?.buyout_price?.toString() || "",
    excess_mileage_charges: existingCustomer?.excess_mileage_charges?.toString() || ""
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
  
  // Contract generation states
  const [generatingAgreement, setGeneratingAgreement] = useState(false);
  const [agreementStatusMsg, setAgreementStatusMsg] = useState('');
  const [generatedContract, setGeneratedContract] = useState<{
    filename: string;
    url: string;
    generatedAt: string;
  } | null>(null);

  // Tab configuration with error checking
  const getTabErrors = (tabId: string) => {
    const tabFieldMap: Record<string, string[]> = {
      personal: ['customer_name', 'customer_email', 'customer_phone', 'emirates_id_number', 'address_line_1', 'city', 'emirate'],
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
        emirates_id_number: existingCustomer.emirates_id_number || ""
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
        buyout_price: existingCustomer.buyout_price?.toString() || "",
        excess_mileage_charges: existingCustomer.excess_mileage_charges?.toString() || ""
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
    if (!personalInfo.emirates_id_number.trim()) {
      newErrors['emirates_id_number'] = 'Emirates ID number is required';
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
          engine_type: data.engine || data.engine_type || 'Unknown Engine'
        };
        setSelectedVehicle(transformedVehicle);
        
        // Auto-populate pricing fields from vehicle data if they're empty
        setContractInfo(prev => ({
          ...prev,
          monthly_payment: prev.monthly_payment || data.monthly_lease_rate?.toString() || "",
          security_deposit: prev.security_deposit || data.security_deposit?.toString() || "",
          buyout_price: prev.buyout_price || data.buyout_price?.toString() || "",
          excess_mileage_charges: prev.excess_mileage_charges || data.excess_mileage_charges?.toString() || ""
        }));
        
        console.log('✅ Vehicle loaded and pricing auto-populated:', {
          monthly_lease_rate: data.monthly_lease_rate,
          security_deposit: data.security_deposit,
          buyout_price: data.buyout_price,
          excess_mileage_charges: data.excess_mileage_charges
        });
      }
    } catch (error) {
      console.error('❌ Error in fetchSelectedVehicle:', error);
    }
  };

  // Handle contract generation
  const handleGenerateLeaseAgreement = async () => {
    setGeneratingAgreement(true);
    setAgreementStatusMsg('');
    
    try {
      // Simulate PDF generation process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Create a mock PDF blob and URL
      const pdfContent = `Lease Agreement - ${personalInfo.customer_name}`;
      const blob = new Blob([pdfContent], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      
      // Set generated contract details
      const filename = `Lease_Agreement_${personalInfo.customer_name?.replace(/\s+/g, '_')}_${new Date().getTime()}.pdf`;
      const generatedAt = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      
      setGeneratedContract({
        filename,
        url,
        generatedAt
      });
      
      setAgreementStatusMsg('Lease agreement generated successfully!');
      
      // Auto-download the PDF
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
    } catch (error) {
      console.error('Error generating agreement:', error);
      setAgreementStatusMsg('Failed to generate agreement. Please try again.');
    } finally {
      setGeneratingAgreement(false);
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
        if (['customer_name', 'customer_email', 'customer_phone', 'emirates_id_number'].includes(firstError)) {
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
        emirates_id_number: personalInfo.emirates_id_number || null,
        
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
        
        // Copy vehicle data from inventory when vehicle is selected
        vehicle_model_year: selectedVehicle?.model_year || null,
        vehicle_model: selectedVehicle?.vehicle_model || null,
        vehicle_exterior_colour: selectedVehicle?.colour || null,
        vehicle_interior_colour: selectedVehicle?.interior_colour || null,
        vehicle_monthly_lease_rate: selectedVehicle?.monthly_lease_rate || null,
        vehicle_security_deposit: selectedVehicle?.security_deposit || null,
        vehicle_buyout_price: selectedVehicle?.buyout_price || null,
        
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
                  <div className="bg-gradient-to-br from-black/40 via-neutral-900/30 to-black/50 backdrop-blur-sm border border-neutral-400/20 rounded-xl p-6 mb-6 shadow-lg">
                    <div className="mb-6">
                      <h4 className="text-xl font-bold text-white flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-gradient-to-br from-neutral-700/50 to-neutral-800/50 backdrop-blur-sm border border-neutral-400/20">
                          <svg className="w-5 h-5 text-neutral-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                        </div>
                        Selected Vehicle Details
                      </h4>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {/* Vehicle Information Cards */}
                      <div className="bg-gradient-to-br from-neutral-800/40 to-neutral-900/40 rounded-lg p-4 border border-neutral-400/20 backdrop-blur-sm">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-2 h-2 rounded-full bg-neutral-400"></div>
                          <span className="text-neutral-400 text-xs uppercase tracking-wider font-medium">Make & Model</span>
                        </div>
                        <p className="text-white font-semibold text-lg">{selectedVehicle.make} {selectedVehicle.vehicle_model}</p>
                      </div>
                      
                      <div className="bg-gradient-to-br from-neutral-800/40 to-neutral-900/40 rounded-lg p-4 border border-neutral-400/20 backdrop-blur-sm">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-2 h-2 rounded-full bg-neutral-400"></div>
                          <span className="text-neutral-400 text-xs uppercase tracking-wider font-medium">Year</span>
                        </div>
                        <p className="text-white font-semibold text-lg">{selectedVehicle.model_year}</p>
                      </div>
                      
                      <div className="bg-gradient-to-br from-neutral-800/40 to-neutral-900/40 rounded-lg p-4 border border-neutral-400/20 backdrop-blur-sm">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-2 h-2 rounded-full bg-neutral-400"></div>
                          <span className="text-neutral-400 text-xs uppercase tracking-wider font-medium">Stock Number</span>
                        </div>
                        <p className="text-white font-semibold text-lg">{selectedVehicle.stock_number}</p>
                      </div>
                      
                      <div className="bg-gradient-to-br from-neutral-800/40 to-neutral-900/40 rounded-lg p-4 border border-neutral-400/20 backdrop-blur-sm">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-2 h-2 rounded-full bg-neutral-400"></div>
                          <span className="text-neutral-400 text-xs uppercase tracking-wider font-medium">Exterior Color</span>
                        </div>
                        <p className="text-white font-semibold text-lg">{selectedVehicle.colour || 'Not specified'}</p>
                      </div>
                      
                      <div className="bg-gradient-to-br from-neutral-800/40 to-neutral-900/40 rounded-lg p-4 border border-neutral-400/20 backdrop-blur-sm">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-2 h-2 rounded-full bg-neutral-400"></div>
                          <span className="text-neutral-400 text-xs uppercase tracking-wider font-medium">Interior Color</span>
                        </div>
                        <p className="text-white font-semibold text-lg">{selectedVehicle.interior_colour || 'Not specified'}</p>
                      </div>
                      
                      <div className="bg-gradient-to-br from-neutral-800/40 to-neutral-900/40 rounded-lg p-4 border border-neutral-400/20 backdrop-blur-sm">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-2 h-2 rounded-full bg-neutral-400"></div>
                          <span className="text-neutral-400 text-xs uppercase tracking-wider font-medium">Excess Mileage Charges</span>
                        </div>
                        <p className="text-white font-bold text-lg">
                          {selectedVehicle.excess_mileage_charges ? `AED ${parseFloat(selectedVehicle.excess_mileage_charges.toString()).toFixed(2)}/km` : 'Not set'}
                        </p>
                      </div>
                    </div>
                    
                    {/* Pricing Information Section */}
                    <div className="mt-6 pt-6 border-t border-neutral-400/20">
                      <h5 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-neutral-400"></div>
                        Inventory Pricing
                      </h5>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-gradient-to-br from-neutral-700/30 to-neutral-800/30 rounded-lg p-4 border border-neutral-400/30 backdrop-blur-sm">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-neutral-300 text-sm font-medium">Monthly Lease Rate</span>
                            <div className="w-1 h-1 rounded-full bg-neutral-400"></div>
                          </div>
                          <p className="text-white font-bold text-xl">
                            {selectedVehicle.monthly_lease_rate ? `AED ${parseFloat(selectedVehicle.monthly_lease_rate.toString()).toLocaleString()}` : 'Not set'}
                          </p>
                        </div>
                        
                        <div className="bg-gradient-to-br from-neutral-700/30 to-neutral-800/30 rounded-lg p-4 border border-neutral-400/30 backdrop-blur-sm">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-neutral-300 text-sm font-medium">Security Deposit</span>
                            <div className="w-1 h-1 rounded-full bg-neutral-400"></div>
                          </div>
                          <p className="text-white font-bold text-xl">
                            {selectedVehicle.security_deposit ? `AED ${parseFloat(selectedVehicle.security_deposit.toString()).toLocaleString()}` : 'Not set'}
                          </p>
                        </div>
                        
                        <div className="bg-gradient-to-br from-neutral-700/30 to-neutral-800/30 rounded-lg p-4 border border-neutral-400/30 backdrop-blur-sm">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-neutral-300 text-sm font-medium">Buyout Price</span>
                            <div className="w-1 h-1 rounded-full bg-neutral-400"></div>
                          </div>
                          <p className="text-white font-bold text-xl">
                            {selectedVehicle.buyout_price ? `AED ${parseFloat(selectedVehicle.buyout_price.toString()).toLocaleString()}` : 'Not set'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Monthly Payment */}
                  <div>
                    <label className={labelClass}>
                      Monthly Payment (AED)
                      {selectedVehicle?.monthly_lease_rate && contractInfo.monthly_payment === selectedVehicle.monthly_lease_rate.toString() && (
                        <span className="ml-2 px-2 py-0.5 bg-gradient-to-r from-neutral-600/30 to-neutral-700/30 text-neutral-300 text-xs rounded-full border border-neutral-400/20">
                          From Vehicle
                        </span>
                      )}
                    </label>
                    <input
                      type="number"
                      value={contractInfo.monthly_payment}
                      onChange={(e) => setContractInfo(prev => ({ ...prev, monthly_payment: e.target.value }))}
                      className={fieldClass}
                      min="0"
                      step="0.01"
                      placeholder={selectedVehicle?.monthly_lease_rate ? `Suggested: ${selectedVehicle.monthly_lease_rate}` : "Enter amount"}
                    />
                  </div>

                  {/* Security Deposit */}
                  <div>
                    <label className={labelClass}>
                      Security Deposit (AED)
                      {selectedVehicle?.security_deposit && contractInfo.security_deposit === selectedVehicle.security_deposit.toString() && (
                        <span className="ml-2 px-2 py-0.5 bg-gradient-to-r from-neutral-600/30 to-neutral-700/30 text-neutral-300 text-xs rounded-full border border-neutral-400/20">
                          From Vehicle
                        </span>
                      )}
                    </label>
                    <input
                      type="number"
                      value={contractInfo.security_deposit}
                      onChange={(e) => setContractInfo(prev => ({ ...prev, security_deposit: e.target.value }))}
                      className={fieldClass}
                      min="0"
                      step="0.01"
                      placeholder={selectedVehicle?.security_deposit ? `Suggested: ${selectedVehicle.security_deposit}` : "Enter amount"}
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

                  {/* Excess Mileage Charges */}
                  <div>
                    <label className={labelClass}>
                      Excess Mileage Charges (AED per km)
                      {selectedVehicle?.excess_mileage_charges && contractInfo.excess_mileage_charges === selectedVehicle.excess_mileage_charges.toString() && (
                        <span className="ml-2 px-2 py-0.5 bg-gradient-to-r from-neutral-600/30 to-neutral-700/30 text-neutral-300 text-xs rounded-full border border-neutral-400/20">
                          From Vehicle
                        </span>
                      )}
                    </label>
                    <input
                      type="number"
                      value={contractInfo.excess_mileage_charges}
                      onChange={(e) => setContractInfo(prev => ({ ...prev, excess_mileage_charges: e.target.value }))}
                      className={fieldClass}
                      min="0"
                      step="0.01"
                      placeholder={selectedVehicle?.excess_mileage_charges ? `Suggested: ${selectedVehicle.excess_mileage_charges}` : "Enter rate per km"}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Charge per kilometer when customer exceeds mileage limit
                      {selectedVehicle?.excess_mileage_charges && (
                        <span className="ml-2 text-orange-400">
                          (Vehicle suggests: AED {parseFloat(selectedVehicle.excess_mileage_charges.toString()).toFixed(2)}/km)
                        </span>
                      )}
                    </p>
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
                      <label className={labelClass}>
                        Buyout Price (AED) *
                        {selectedVehicle?.buyout_price && contractInfo.buyout_price === selectedVehicle.buyout_price.toString() && (
                          <span className="ml-2 px-2 py-0.5 bg-gradient-to-r from-neutral-600/30 to-neutral-700/30 text-neutral-300 text-xs rounded-full border border-neutral-400/20">
                            From Vehicle
                          </span>
                        )}
                      </label>
                      <input
                        type="number"
                        value={contractInfo.buyout_price}
                        onChange={(e) => setContractInfo(prev => ({ ...prev, buyout_price: e.target.value }))}
                        className={fieldClass}
                        min="0"
                        step="0.01"
                        placeholder={selectedVehicle?.buyout_price ? `Suggested: ${selectedVehicle.buyout_price}` : "Enter buyout price for lease-to-own"}
                        required={contractInfo.lease_to_own_option}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Price customer will pay to own the vehicle at lease end
                        {selectedVehicle?.buyout_price && (
                          <span className="ml-2 text-purple-400">
                            (Vehicle suggests: AED {parseFloat(selectedVehicle.buyout_price.toString()).toLocaleString()})
                          </span>
                        )}
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
                </div>

                {!generatedContract ? (
                  <div className="bg-gradient-to-br from-black/40 via-neutral-900/30 to-black/50 backdrop-blur-sm border border-neutral-400/20 rounded-xl p-6 shadow-lg">
                    <div className="mb-6">
                      <h4 className="text-xl font-bold text-white mb-2">Lease Agreement</h4>
                      <p className="text-neutral-300 text-sm">
                        Generate a comprehensive lease agreement document for this customer.
                      </p>
                    </div>

                    {/* Contract Summary */}
                    <div className="bg-gradient-to-br from-neutral-800/40 to-neutral-900/40 rounded-lg p-6 border border-neutral-400/20 backdrop-blur-sm mb-6">
                      <h5 className="text-white font-semibold mb-4 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-neutral-400"></div>
                        Contract Summary
                      </h5>
                      
                      {/* Customer Information */}
                      <div className="mb-6">
                        <h6 className="text-neutral-300 font-medium mb-3 text-sm uppercase tracking-wide">Customer Information</h6>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-neutral-400">Full Name:</span>
                            <p className="text-white font-medium">{personalInfo.customer_name || 'Not specified'}</p>
                          </div>
                          <div>
                            <span className="text-neutral-400">Email:</span>
                            <p className="text-white font-medium">{personalInfo.customer_email || 'Not specified'}</p>
                          </div>
                          <div>
                            <span className="text-neutral-400">Phone:</span>
                            <p className="text-white font-medium">{personalInfo.customer_phone || 'Not specified'}</p>
                          </div>
                          <div>
                            <span className="text-neutral-400">Emirates ID:</span>
                            <p className="text-white font-medium">{personalInfo.emirates_id_number || 'Not specified'}</p>
                          </div>
                          <div>
                            <span className="text-neutral-400">Address:</span>
                            <p className="text-white font-medium">
                              {addressInfo.address_line_1 ? 
                                `${addressInfo.address_line_1}${addressInfo.address_line_2 ? ', ' + addressInfo.address_line_2 : ''}${addressInfo.city ? ', ' + addressInfo.city : ''}${addressInfo.emirate ? ', ' + addressInfo.emirate : ''}` 
                                : 'Not specified'}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Vehicle Information */}
                      <div className="mb-6 pt-4 border-t border-neutral-400/20">
                        <h6 className="text-neutral-300 font-medium mb-3 text-sm uppercase tracking-wide">Vehicle Information</h6>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-neutral-400">Vehicle:</span>
                            <p className="text-white font-medium">
                              {selectedVehicle ? `${selectedVehicle.make} ${selectedVehicle.vehicle_model} (${selectedVehicle.model_year})` : 'No vehicle selected'}
                            </p>
                          </div>
                          <div>
                            <span className="text-neutral-400">Stock Number:</span>
                            <p className="text-white font-medium">{selectedVehicle?.stock_number || 'N/A'}</p>
                          </div>
                          <div>
                            <span className="text-neutral-400">Exterior Color:</span>
                            <p className="text-white font-medium">{selectedVehicle?.colour || 'Not specified'}</p>
                          </div>
                          <div>
                            <span className="text-neutral-400">Interior Color:</span>
                            <p className="text-white font-medium">{selectedVehicle?.interior_colour || 'Not specified'}</p>
                          </div>
                        </div>
                      </div>

                      {/* Contract Terms */}
                      <div className="pt-4 border-t border-neutral-400/20">
                        <h6 className="text-neutral-300 font-medium mb-3 text-sm uppercase tracking-wide">Contract Terms</h6>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-neutral-400">Monthly Payment:</span>
                            <p className="text-white font-bold text-base">AED {contractInfo.monthly_payment ? parseFloat(contractInfo.monthly_payment).toLocaleString() : '0'}</p>
                          </div>
                          <div>
                            <span className="text-neutral-400">Security Deposit:</span>
                            <p className="text-white font-bold text-base">AED {contractInfo.security_deposit ? parseFloat(contractInfo.security_deposit).toLocaleString() : '0'}</p>
                          </div>
                          <div>
                            <span className="text-neutral-400">Lease Term:</span>
                            <p className="text-white font-medium">{contractInfo.lease_term_months || '0'} months</p>
                          </div>
                          <div>
                            <span className="text-neutral-400">Lease Start Date:</span>
                            <p className="text-white font-medium">{contractInfo.lease_start_date || 'Not set'}</p>
                          </div>
                          <div>
                            <span className="text-neutral-400">Lease End Date:</span>
                            <p className="text-white font-medium">{contractInfo.lease_end_date || 'Not set'}</p>
                          </div>
                          <div>
                            <span className="text-neutral-400">Excess Mileage Charges:</span>
                            <p className="text-white font-medium">
                              {contractInfo.excess_mileage_charges ? `AED ${parseFloat(contractInfo.excess_mileage_charges).toFixed(2)}/km` : 'Not set'}
                            </p>
                          </div>
                          {contractInfo.lease_to_own_option && (
                            <>
                              <div>
                                <span className="text-neutral-400">Lease-to-Own:</span>
                                <p className="text-green-400 font-medium">Yes</p>
                              </div>
                              <div>
                                <span className="text-neutral-400">Buyout Price:</span>
                                <p className="text-white font-bold text-base">AED {contractInfo.buyout_price ? parseFloat(contractInfo.buyout_price).toLocaleString() : '0'}</p>
                              </div>
                            </>
                          )}
                        </div>
                        
                        
                        {/* Additional Notes */}
                        {notes && (
                          <div className="mt-4 pt-4 border-t border-neutral-400/20">
                            <div>
                              <span className="text-neutral-400 text-sm">Additional Notes:</span>
                              <p className="text-white font-medium text-sm mt-1 bg-neutral-800/30 rounded p-2 border border-neutral-400/20">
                                {notes}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Generate Button */}
                    <div className="flex justify-center">
                      <button
                        onClick={handleGenerateLeaseAgreement}
                        disabled={generatingAgreement}
                        className="px-8 py-3 bg-gradient-to-r from-neutral-600 to-neutral-700 hover:from-neutral-500 hover:to-neutral-600 disabled:from-neutral-700 disabled:to-neutral-800 text-white font-semibold rounded-lg transition-all duration-200 flex items-center gap-3 border border-neutral-400/30 shadow-lg hover:shadow-xl disabled:cursor-not-allowed"
                      >
                        {generatingAgreement ? (
                          <>
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            Generating Agreement...
                          </>
                        ) : (
                          <>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Generate Lease Agreement
                          </>
                        )}
                      </button>
                    </div>

                    {agreementStatusMsg && (
                      <div className="mt-4 p-3 bg-green-500/10 border border-green-400/30 rounded-lg">
                        <p className="text-green-400 text-sm text-center">{agreementStatusMsg}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-gradient-to-br from-black/40 via-neutral-900/30 to-black/50 backdrop-blur-sm border border-neutral-400/20 rounded-xl p-6 shadow-lg">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-xl font-bold text-white flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-400"></div>
                        Generated Agreement
                      </h4>
                      <span className="px-3 py-1 bg-green-500/20 text-green-400 text-xs rounded-full border border-green-400/30">
                        Ready
                      </span>
                    </div>

                    <div className="bg-gradient-to-br from-neutral-800/40 to-neutral-900/40 rounded-lg p-4 border border-neutral-400/20 backdrop-blur-sm mb-6">
                      <div className="flex items-center gap-3 mb-3">
                        <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <div>
                          <h5 className="text-white font-semibold">{generatedContract.filename}</h5>
                          <p className="text-neutral-400 text-sm">Generated on {generatedContract.generatedAt}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={() => window.open(generatedContract.url, '_blank')}
                        className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-medium rounded-lg transition-all duration-200 flex items-center justify-center gap-2 border border-blue-400/30"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        View
                      </button>
                      <button
                        onClick={() => setGeneratedContract(null)}
                        className="flex-1 px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-medium rounded-lg transition-all duration-200 flex items-center justify-center gap-2 border border-red-400/30"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Delete
                      </button>
                      <button
                        onClick={() => {
                          // TODO: Implement send for signing functionality
                          alert('Send for signing functionality will be implemented next');
                        }}
                        className="flex-1 px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white font-medium rounded-lg transition-all duration-200 flex items-center justify-center gap-2 border border-green-400/30"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                        Send for Signing
                      </button>
                    </div>
                  </div>
                )}
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
