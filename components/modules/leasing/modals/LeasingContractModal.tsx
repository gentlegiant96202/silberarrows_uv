"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { X, User, MapPin, Briefcase, FileText, Car, Upload, Calendar, DollarSign } from "lucide-react";

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
  const fieldClass = "w-full px-4 py-4 rounded-lg bg-black/20 border border-white/10 text-white text-lg focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/40 appearance-none [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]";
  const labelClass = "block text-gray-300 text-lg font-semibold mb-3";
  const compactLabelClass = "block text-gray-300 text-base font-medium mb-2";
  const compactFieldClass = "w-full px-3 py-3 rounded-lg bg-black/20 border border-white/10 text-white text-base focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/40 appearance-none [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]";

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

  const [employmentInfo, setEmploymentInfo] = useState({
    employer_name: existingCustomer?.employer_name || "",
    employment_type: existingCustomer?.employment_type || "",
    monthly_salary: existingCustomer?.monthly_salary?.toString() || "",
    years_in_uae: existingCustomer?.years_in_uae?.toString() || ""
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
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showErrors, setShowErrors] = useState(false);

  // Tab configuration with error checking
  const getTabErrors = (tabId: string) => {
    const tabFieldMap: Record<string, string[]> = {
      personal: ['customer_name', 'customer_email', 'customer_phone', 'date_of_birth', 'emirates_id_number', 'passport_number', 'visa_number'],
      address: ['address_line_1', 'city', 'emirate'],
      employment: ['employer_name', 'employment_type', 'monthly_salary', 'years_in_uae'],
      documents: ['emirates_id_front_url', 'emirates_id_back_url', 'passport_front_url', 'visa_copy_url', 'address_proof_url', 'driving_license_front_url', 'driving_license_back_url'],
      contract: ['selected_vehicle_id', 'monthly_payment', 'security_deposit', 'lease_term_months', 'lease_start_date', 'lease_end_date', 'buyout_price']
    };
    
    return tabFieldMap[tabId]?.some(field => errors[field]) || false;
  };

  const tabs = [
    { id: 'personal', label: 'Personal', icon: User },
    { id: 'address', label: 'Address', icon: MapPin },
    { id: 'employment', label: 'Employment', icon: Briefcase },
    { id: 'documents', label: 'Documents', icon: FileText },
    { id: 'contract', label: 'Contract', icon: Car }
  ];

  // Employment type options
  const employmentTypes = [
    { value: '', label: 'Select employment type' },
    { value: 'full_time', label: 'Full Time' },
    { value: 'part_time', label: 'Part Time' },
    { value: 'contract', label: 'Contract' },
    { value: 'freelance', label: 'Freelance' },
    { value: 'self_employed', label: 'Self Employed' },
    { value: 'unemployed', label: 'Unemployed' }
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

      setEmploymentInfo({
        employer_name: existingCustomer.employer_name || "",
        employment_type: existingCustomer.employment_type || "",
        monthly_salary: existingCustomer.monthly_salary?.toString() || "",
        years_in_uae: existingCustomer.years_in_uae?.toString() || ""
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

    // Employment Information Validation
    if (!employmentInfo.employer_name.trim()) {
      newErrors['employer_name'] = 'Employer name is required';
    }
    if (!employmentInfo.employment_type) {
      newErrors['employment_type'] = 'Employment type is required';
    }
    if (!employmentInfo.monthly_salary) {
      newErrors['monthly_salary'] = 'Monthly salary is required';
    } else if (parseFloat(employmentInfo.monthly_salary) <= 0) {
      newErrors['monthly_salary'] = 'Monthly salary must be greater than 0';
    }
    if (!employmentInfo.years_in_uae) {
      newErrors['years_in_uae'] = 'Years in UAE is required';
    } else if (parseInt(employmentInfo.years_in_uae) < 0) {
      newErrors['years_in_uae'] = 'Years in UAE cannot be negative';
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
        } else if (['address_line_1', 'city', 'emirate'].includes(firstError)) {
          setActiveTab('address');
        } else if (['employer_name', 'employment_type', 'monthly_salary', 'years_in_uae'].includes(firstError)) {
          setActiveTab('employment');
        } else if (firstError.includes('_url')) {
          setActiveTab('documents');
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
      console.log('Employment Info:', employmentInfo);
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
        
        // Employment info
        employer_name: employmentInfo.employer_name || null,
        employment_type: employmentInfo.employment_type || null,
        monthly_salary: employmentInfo.monthly_salary ? parseFloat(employmentInfo.monthly_salary) : null,
        years_in_uae: employmentInfo.years_in_uae ? parseInt(employmentInfo.years_in_uae) : null,
        
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

      // Handle vehicle status updates based on contract changes
      if (!result.error) {
        const oldVehicleId = existingCustomer?.selected_vehicle_id;
        const newVehicleId = contractData.selected_vehicle_id;

        // If vehicle selection changed, update both old and new vehicles
        if (oldVehicleId !== newVehicleId) {
          // Release old vehicle back to inventory (if it exists)
          if (oldVehicleId) {
            console.log('🔄 Releasing old vehicle back to inventory:', oldVehicleId);
            await updateVehicleStatus(oldVehicleId, 'inventory');
          }

          // Reserve new vehicle (if selected)
          if (newVehicleId) {
            console.log('🔒 Reserving new vehicle:', newVehicleId);
            await updateVehicleStatus(newVehicleId, 'reserved');
          }
        } else if (newVehicleId && mode === 'create') {
          // For new contracts, just reserve the selected vehicle
          console.log('🔒 Reserving vehicle for new contract:', newVehicleId);
          await updateVehicleStatus(newVehicleId, 'reserved');
        }
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

  // Handle vehicle status updates
  const updateVehicleStatus = async (vehicleId: string, newStatus: 'inventory' | 'reserved' | 'leased') => {
    if (!vehicleId) return;
    
    console.log(`🚗 Updating vehicle ${vehicleId} status to: ${newStatus}`);
    
    const { error } = await supabase
      .from('leasing_inventory')
      .update({ 
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', vehicleId);

    if (error) {
      console.error(`⚠️ Failed to update vehicle status to ${newStatus}:`, error);
    } else {
      console.log(`✅ Vehicle status updated to ${newStatus}`);
    }
  };

  // Handle file upload (placeholder for now)
  const handleFileUpload = async (field: string, file: File) => {
    console.log(`📎 File upload for ${field}:`, file.name);
    // TODO: Implement actual file upload to Supabase Storage
    // For now, just set a placeholder URL
    setDocumentUrls(prev => ({
      ...prev,
      [field]: `placeholder-url-for-${file.name}`
    }));
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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-black rounded-xl shadow-2xl w-full max-w-6xl h-[85vh] flex flex-col border border-white/20 shadow-white/10" style={{ boxShadow: '0 0 50px rgba(255, 255, 255, 0.1), 0 0 100px rgba(255, 255, 255, 0.05)' }}>
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-bold text-white">
              {mode === 'edit' ? 'Edit Contract Details' : 'New Contract Details'}
            </h2>
            {existingCustomer?.customer_name && (
              <span className="text-white/60">- {existingCustomer.customer_name}</span>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              type="button"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="px-6 py-2 bg-gradient-to-br from-gray-200 via-gray-100 to-gray-400 text-black font-semibold rounded-lg hover:shadow-lg transition-all disabled:opacity-50"
              type="button"
            >
              {loading ? 'Saving...' : mode === 'edit' ? 'Update Contract' : 'Save Contract'}
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex-shrink-0 px-6 pt-4">
          <div className="flex space-x-1 bg-black/40 p-1 rounded-lg border border-white/20 overflow-x-auto">
            {tabs.map((tab) => {
              const IconComponent = tab.icon;
              const hasErrors = showErrors && getTabErrors(tab.id);
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative whitespace-nowrap py-2.5 px-4 font-semibold text-[13px] md:text-sm uppercase tracking-wide rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400/50 focus:ring-offset-2 focus:ring-offset-black/40 flex-shrink-0 ${
                    activeTab === tab.id
                      ? 'bg-gradient-to-br from-gray-200 via-gray-100 to-gray-400 text-black border border-white/30'
                      : hasErrors
                      ? 'text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-red-400/30'
                      : 'text-white/70 hover:text-white/90 hover:bg-white/10 border border-transparent'
                  }`}
                  type="button"
                  aria-current={activeTab === tab.id ? 'page' : undefined}
                >
                  <span className="flex items-center gap-2">
                    <IconComponent size={16} />
                    {tab.label}
                    {hasErrors && (
                      <span className="text-red-400 text-xs">⚠</span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6">
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
              <div className="bg-black/20 backdrop-blur-sm border border-white/20 rounded-lg p-6 space-y-6">
                <div className="text-center mb-6">
                  <User className="mx-auto mb-3 text-gray-400" size={32} />
                  <h3 className="text-xl font-semibold text-white mb-2">Personal Information</h3>
                  <p className="text-gray-400">Basic customer details and identification</p>
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
              </div>
            )}

            {/* Address Tab */}
            {activeTab === 'address' && (
              <div className="bg-black/20 backdrop-blur-sm border border-white/20 rounded-lg p-6 space-y-6">
                <div className="text-center mb-6">
                  <MapPin className="mx-auto mb-3 text-gray-400" size={32} />
                  <h3 className="text-xl font-semibold text-white mb-2">Address Information</h3>
                  <p className="text-gray-400">Current residential address details</p>
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
            )}

            {/* Employment Tab */}
            {activeTab === 'employment' && (
              <div className="bg-black/20 backdrop-blur-sm border border-white/20 rounded-lg p-6 space-y-6">
                <div className="text-center mb-6">
                  <Briefcase className="mx-auto mb-3 text-gray-400" size={32} />
                  <h3 className="text-xl font-semibold text-white mb-2">Employment Information</h3>
                  <p className="text-gray-400">Work details and income information</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Employer Name */}
                  <div>
                    <label className={labelClass}>Employer Name</label>
                    <input
                      type="text"
                      value={employmentInfo.employer_name}
                      onChange={(e) => setEmploymentInfo(prev => ({ ...prev, employer_name: e.target.value }))}
                      className={fieldClass}
                    />
                  </div>

                  {/* Employment Type */}
                  <div>
                    <label className={labelClass}>Employment Type</label>
                    <select
                      value={employmentInfo.employment_type}
                      onChange={(e) => setEmploymentInfo(prev => ({ ...prev, employment_type: e.target.value }))}
                      className={fieldClass}
                    >
                      {employmentTypes.map(type => (
                        <option key={type.value} value={type.value} className="bg-gray-800 text-white">
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Monthly Salary */}
                  <div>
                    <label className={labelClass}>Monthly Salary (AED)</label>
                    <input
                      type="number"
                      value={employmentInfo.monthly_salary}
                      onChange={(e) => setEmploymentInfo(prev => ({ ...prev, monthly_salary: e.target.value }))}
                      className={fieldClass}
                      min="0"
                      step="0.01"
                    />
                  </div>

                  {/* Years in UAE */}
                  <div>
                    <label className={labelClass}>Years in UAE</label>
                    <input
                      type="number"
                      value={employmentInfo.years_in_uae}
                      onChange={(e) => setEmploymentInfo(prev => ({ ...prev, years_in_uae: e.target.value }))}
                      className={fieldClass}
                      min="0"
                      max="50"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Documents Tab */}
            {activeTab === 'documents' && (
              <div className="bg-black/20 backdrop-blur-sm border border-white/20 rounded-lg p-6 space-y-6">
                <div className="text-center mb-6">
                  <FileText className="mx-auto mb-3 text-gray-400" size={32} />
                  <h3 className="text-xl font-semibold text-white mb-2">Document Uploads</h3>
                  <p className="text-gray-400">Upload required identification and proof documents</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {documentFields.map((field) => (
                    <div key={field.key} className="space-y-3">
                      <label className={compactLabelClass}>
                        {field.label} {field.required && <span className="text-red-400">*</span>}
                      </label>
                      
                      <div className="border-2 border-dashed border-gray-600 rounded-lg p-4 text-center hover:border-gray-400 transition-colors">
                        <Upload className="mx-auto mb-2 text-gray-400" size={24} />
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              handleFileUpload(field.key, file);
                            }
                          }}
                          className="hidden"
                          id={`upload-${field.key}`}
                        />
                        <label
                          htmlFor={`upload-${field.key}`}
                          className="cursor-pointer text-gray-400 hover:text-white transition-colors"
                        >
                          {documentUrls[field.key as keyof typeof documentUrls] 
                            ? 'File uploaded ✓' 
                            : 'Click to upload or drag file here'
                          }
                        </label>
                        <p className="text-xs text-gray-500 mt-1">PNG, JPG, PDF up to 10MB</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Contract Tab */}
            {activeTab === 'contract' && (
              <div className="bg-black/20 backdrop-blur-sm border border-white/20 rounded-lg p-6 space-y-6">
                <div className="text-center mb-6">
                  <Car className="mx-auto mb-3 text-gray-400" size={32} />
                  <h3 className="text-xl font-semibold text-white mb-2">Contract Details</h3>
                  <p className="text-gray-400">Vehicle selection and lease terms</p>
                </div>

                {/* Selected Vehicle Display */}
                {selectedVehicle && (
                  <div className="bg-black/40 border border-white/20 rounded-lg p-4 mb-6">
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
                      className="w-5 h-5 rounded border-white/20 bg-black/20 text-white focus:ring-white/30"
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

          </form>
        </div>
      </div>
    </div>
  );
}
