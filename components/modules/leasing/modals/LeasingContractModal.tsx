"use client";
import { useState, useEffect, useRef, useMemo } from "react";
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
  const fieldClass = "w-full px-3 py-2.5 rounded-lg bg-neutral-800/60 border border-white/15 text-white text-sm focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/30 transition-all appearance-none [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield] [&:autofill]:bg-neutral-800/60 [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:opacity-70";
  const labelClass = "block text-white/70 text-xs font-medium mb-1.5";
  const compactLabelClass = "block text-white/70 text-xs font-medium mb-1.5";
  const compactFieldClass = "w-full px-3 py-3 rounded-lg bg-neutral-800/60 border border-white/15 text-white text-sm focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/30 transition-all appearance-none [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield] [&:autofill]:bg-neutral-800/60";

  // Tab state
  const [activeTab, setActiveTab] = useState<string>('personal');
  const hasInitializedRef = useRef(false);
  
  // Reset initialization when modal closes
  useEffect(() => {
    if (!isOpen) {
      hasInitializedRef.current = false;
    }
  }, [isOpen]);
  
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
    monthly_mileage: existingCustomer?.monthly_mileage?.toString() || "2000",
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
  const [uploadingField, setUploadingField] = useState<string | null>(null);
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
  const [existingPdfUrl, setExistingPdfUrl] = useState<string | null>(null);

  // Tab configuration with error checking
  const getTabErrors = (tabId: string) => {
    const tabFieldMap: Record<string, string[]> = {
      personal: ['customer_name', 'customer_email', 'customer_phone', 'emirates_id_number', 'address_line_1', 'city', 'emirate'],
      documents: ['emirates_id_front_url', 'emirates_id_back_url', 'passport_front_url', 'visa_copy_url', 'address_proof_url', 'driving_license_front_url', 'driving_license_back_url'],
      pricing: ['selected_vehicle_id', 'monthly_payment', 'security_deposit', 'monthly_mileage', 'lease_term_months', 'lease_start_date', 'lease_end_date', 'buyout_price'],
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

  const emailValid = (val: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());
  const isPositiveNumber = (val?: string) => !!val && !isNaN(Number(val)) && Number(val) > 0;
  const isNonNegativeNumber = (val?: string) => val !== undefined && val !== "" && !isNaN(Number(val)) && Number(val) >= 0;
  const isDateRangeValid = () => {
    if (!contractInfo.lease_start_date || !contractInfo.lease_end_date) return false;
    return new Date(contractInfo.lease_end_date) > new Date(contractInfo.lease_start_date);
  };

  const isPersonalComplete = () =>
    personalInfo.customer_name.trim() &&
    emailValid(personalInfo.customer_email || "") &&
    personalInfo.customer_phone.trim() &&
    personalInfo.emirates_id_number.trim() &&
    addressInfo.address_line_1.trim() &&
    addressInfo.city.trim() &&
    addressInfo.emirate;

  const isDocumentsComplete = () =>
    documentFields
      .filter(f => f.required)
      .every(f => documentUrls[f.key as keyof typeof documentUrls]);

  const isPricingComplete = () =>
    contractInfo.selected_vehicle_id &&
    isPositiveNumber(contractInfo.monthly_payment) &&
    isNonNegativeNumber(contractInfo.security_deposit) &&
    isPositiveNumber(contractInfo.monthly_mileage) &&
    contractInfo.lease_term_months &&
    contractInfo.lease_start_date &&
    contractInfo.lease_end_date &&
    isDateRangeValid() &&
    (!contractInfo.lease_to_own_option || isPositiveNumber(contractInfo.buyout_price));

  const isContractComplete = () =>
    !!generatedContract || (isPersonalComplete() && isDocumentsComplete() && isPricingComplete());

  const tabCompletion = useMemo(() => ({
    personal: Boolean(isPersonalComplete()),
    documents: Boolean(isDocumentsComplete()),
    pricing: Boolean(isPricingComplete()),
    contract: Boolean(isContractComplete())
  }), [
    personalInfo,
    addressInfo,
    documentUrls,
    contractInfo,
    generatedContract
  ]);

  const completionPct = useMemo(() => {
    const done = Object.values(tabCompletion).filter(Boolean).length;
    return Math.round((done / Object.keys(tabCompletion).length) * 100);
  }, [tabCompletion]);

  const Tick = ({ valid }: { valid: boolean }) => (
    <span className={`ml-1 text-[11px] ${valid ? 'text-green-400' : 'text-white/20'}`}>{valid ? '✓' : ''}</span>
  );

  // Update form when existingCustomer changes
  useEffect(() => {
    if (existingCustomer && !hasInitializedRef.current) {
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
        monthly_mileage: existingCustomer.monthly_mileage?.toString() || "2000",
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

      // Load existing PDF URL if available
      if (existingCustomer.lease_agreement_pdf_url) {
        setExistingPdfUrl(existingCustomer.lease_agreement_pdf_url);
        // Set generated contract state to show the existing document
        setGeneratedContract({
          filename: `lease-agreement-${existingCustomer.customer_name?.replace(/\s+/g, '-') || 'customer'}.pdf`,
          url: existingCustomer.lease_agreement_pdf_url,
          generatedAt: 'Previously generated'
        });
      }
      
      hasInitializedRef.current = true;
    } else if (existingCustomer && hasInitializedRef.current) {
      // Update only the form data without resetting tab
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
        monthly_mileage: existingCustomer.monthly_mileage?.toString() || "2000",
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
      } else {
        // Don't clear selectedVehicle if the ID is missing - might be temporary
      }

      // Load existing PDF URL if available
      if (existingCustomer.lease_agreement_pdf_url) {
        setExistingPdfUrl(existingCustomer.lease_agreement_pdf_url);
        setGeneratedContract({
          filename: `lease-agreement-${existingCustomer.customer_name?.replace(/\s+/g, '-') || 'customer'}.pdf`,
          url: existingCustomer.lease_agreement_pdf_url,
          generatedAt: 'Previously generated'
        });
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
    if (!contractInfo.monthly_mileage) {
      newErrors['monthly_mileage'] = 'Monthly mileage is required';
    } else if (parseFloat(contractInfo.monthly_mileage) <= 0) {
      newErrors['monthly_mileage'] = 'Monthly mileage must be greater than 0';
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
      }
    } catch (error) {
    }
  };

  // Handle contract generation
  const handleGenerateLeaseAgreement = async () => {
    setGeneratingAgreement(true);
    setAgreementStatusMsg('');
    
    try {
             // Prepare contract data for PDF generation
             const contractData = {
               // Customer Information
               customer_id: existingCustomer?.id, // Add customer ID for database storage
               customer_name: personalInfo.customer_name,
               customer_email: personalInfo.customer_email,
               customer_phone: personalInfo.customer_phone,
               emirates_id_number: personalInfo.emirates_id_number,

               // Address Information
               address_line_1: addressInfo.address_line_1,
               address_line_2: addressInfo.address_line_2,
               city: addressInfo.city,
               emirate: addressInfo.emirate,

               // Vehicle Information
               vehicle_make: selectedVehicle?.make || 'Mercedes-Benz',
               vehicle_model: selectedVehicle?.vehicle_model || 'Vehicle',
               vehicle_model_year: selectedVehicle?.model_year,
               vehicle_stock_number: selectedVehicle?.stock_number,
               vehicle_exterior_colour: selectedVehicle?.colour,
               vehicle_interior_colour: selectedVehicle?.interior_colour,

               // Contract Terms
               monthly_payment: contractInfo.monthly_payment ? parseFloat(contractInfo.monthly_payment) : 0,
               security_deposit: contractInfo.security_deposit ? parseFloat(contractInfo.security_deposit) : 0,
               monthly_mileage: contractInfo.monthly_mileage ? parseInt(contractInfo.monthly_mileage) : 2000,
               lease_term_months: contractInfo.lease_term_months ? parseInt(contractInfo.lease_term_months) : 0,
               lease_start_date: contractInfo.lease_start_date,
               lease_end_date: contractInfo.lease_end_date,
               lease_to_own_option: contractInfo.lease_to_own_option,
               buyout_price: contractInfo.buyout_price ? parseFloat(contractInfo.buyout_price) : 0,
               excess_mileage_charges: contractInfo.excess_mileage_charges ? parseFloat(contractInfo.excess_mileage_charges) : 0,

               // Additional Information
               notes: notes
             };
      // Call the PDF generation API
      const response = await fetch('/api/generate-lease-agreement', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(contractData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate PDF');
      }
      
      const result = await response.json();
      // Set generated contract details
      const filename = result.fileName || `Lease_Agreement_${personalInfo.customer_name?.replace(/\s+/g, '_')}_${new Date().getTime()}.pdf`;
      const generatedAt = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      
      setGeneratedContract({
        filename,
        url: result.pdfUrl,
        generatedAt
      });
      
      setAgreementStatusMsg('Lease agreement generated successfully!');
      
      // Auto-download the PDF
      const link = document.createElement('a');
      link.href = result.pdfUrl;
      link.download = filename;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
           } catch (error: any) {
             setAgreementStatusMsg(`Failed to generate agreement: ${error.message || 'Please try again.'}`);
    } finally {
      setGeneratingAgreement(false);
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form before submission
    if (!validateForm()) {
      // Find the first tab with errors and switch to it
      const errorKeys = Object.keys(errors);
      if (errorKeys.length > 0) {
        const firstError = errorKeys[0];
        if (['customer_name', 'customer_email', 'customer_phone', 'emirates_id_number'].includes(firstError)) {
          setActiveTab('personal');
        } else if (firstError.includes('_url')) {
          setActiveTab('documents');
        } else if (['selected_vehicle_id', 'monthly_payment', 'security_deposit', 'monthly_mileage', 'lease_term_months', 'lease_start_date', 'lease_end_date', 'buyout_price'].includes(firstError)) {
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
        monthly_mileage: contractInfo.monthly_mileage ? parseInt(contractInfo.monthly_mileage) : null,
        excess_mileage_charges: contractInfo.excess_mileage_charges ? parseFloat(contractInfo.excess_mileage_charges) : null,
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
        alert(`Error saving contract: ${result.error.message || 'Unknown error'}. Please check the console for details.`);
        return;
      }
      setLoading(false);
      onCreated(result.data);
      onClose(); // Close modal after successful save

    } catch (error) {
      alert('Error saving contract. Please try again.');
      setLoading(false);
    }
  };


  // Handle file upload (placeholder for now)
  const handleFileUpload = async (field: string, file: File) => {
    setUploading(true);
    setUploadingField(field);
    try {
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
      setUploadingField(null);
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

  useEffect(() => {
    if (showErrors) {
      setShowErrors(false);
    }
  }, [personalInfo, addressInfo, documentUrls, contractInfo, showErrors]);

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
            <div className="grid grid-cols-4 gap-1 bg-white/5 backdrop-blur-sm p-1 rounded-lg border border-white/10 mb-3">
            {tabs.map((tab) => {
              const hasErrors = showErrors && getTabErrors(tab.id);
              const completed = tabCompletion[tab.id as keyof typeof tabCompletion];
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                    className={`relative w-full py-3.5 px-3 font-semibold text-sm uppercase tracking-wide rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-white/30 focus:ring-offset-2 focus:ring-offset-black/40 ${
                    activeTab === tab.id
                      ? 'bg-gradient-to-br from-gray-200 via-gray-100 to-gray-400 text-black border border-white/30'
                      : hasErrors
                      ? 'text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-red-400/30'
                      : 'text-white/70 hover:text-white/90 hover:bg-white/10 border border-transparent'
                  }`}
                  type="button"
                  aria-current={activeTab === tab.id ? 'page' : undefined}
                >
                    {completed && <span className="absolute top-2 right-2 text-green-400 text-xs">✓</span>}
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
          <div className="flex items-center gap-2 mb-4">
            <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden border border-white/10">
              <div
                className="h-full bg-gradient-to-r from-green-400 via-emerald-400 to-green-500 transition-all duration-300"
                style={{ width: `${completionPct}%` }}
              />
            </div>
            <span className="text-[11px] text-white/70">{completionPct}% complete</span>
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
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 min-h-[420px]">
                {/* Left Column - Personal Information */}
                <div className="bg-neutral-900/50 backdrop-blur-md rounded-xl p-6 border border-white/10 flex flex-col">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-white/10 text-white/80">
                        <User size={16} />
                      </div>
                      Personal Information
                    </h3>
                    <div className="text-[10px] text-white/60 bg-white/10 px-2 py-0.5 rounded-full">
                      Required
                    </div>
                  </div>

                  <div className="space-y-5 flex-1">
                    {/* Customer Name */}
                    <div>
                      <label className={compactLabelClass}>
                        Customer Name * <Tick valid={!!personalInfo.customer_name.trim()} />
                      </label>
                      <input
                        type="text"
                        value={personalInfo.customer_name}
                        onChange={(e) => setPersonalInfo(prev => ({ ...prev, customer_name: e.target.value }))}
                        className={`${compactFieldClass} ${errors.customer_name ? 'border-red-400 focus:border-red-400 focus:ring-red-400/30' : ''}`}
                        required
                      />
                      <ErrorMessage field="customer_name" />
                    </div>

                    {/* Email */}
                    <div>
                      <label className={compactLabelClass}>
                        Email Address * <Tick valid={emailValid(personalInfo.customer_email || "")} />
                      </label>
                      <input
                        type="email"
                        value={personalInfo.customer_email}
                        onChange={(e) => setPersonalInfo(prev => ({ ...prev, customer_email: e.target.value }))}
                        className={`${compactFieldClass} ${errors.customer_email ? 'border-red-400 focus:border-red-400 focus:ring-red-400/30' : ''}`}
                        required
                      />
                      <ErrorMessage field="customer_email" />
                    </div>

                    {/* Phone */}
                    <div>
                      <label className={compactLabelClass}>
                        Phone Number * <Tick valid={!!personalInfo.customer_phone.trim()} />
                      </label>
                      <input
                        type="tel"
                        value={personalInfo.customer_phone}
                        onChange={(e) => setPersonalInfo(prev => ({ ...prev, customer_phone: e.target.value }))}
                        className={`${compactFieldClass} ${errors.customer_phone ? 'border-red-400 focus:border-red-400 focus:ring-red-400/30' : ''}`}
                        required
                      />
                      <ErrorMessage field="customer_phone" />
                    </div>

                    {/* Emirates ID */}
                    <div>
                      <label className={compactLabelClass}>
                        Emirates ID Number <Tick valid={!!personalInfo.emirates_id_number.trim()} />
                      </label>
                      <input
                        type="text"
                        value={personalInfo.emirates_id_number}
                        onChange={(e) => setPersonalInfo(prev => ({ ...prev, emirates_id_number: e.target.value }))}
                        className={compactFieldClass}
                        placeholder="784-XXXX-XXXXXXX-X"
                      />
                    </div>
                  </div>
                </div>

                {/* Right Column - Address Information */}
                <div className="bg-neutral-900/50 backdrop-blur-md rounded-xl p-6 border border-white/10 flex flex-col">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-white/10 text-white/80">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </div>
                      Address Information
                    </h3>
                    <div className="text-[10px] text-white/60 bg-white/10 px-2 py-0.5 rounded-full">
                      Required
                    </div>
                  </div>

                  <div className="space-y-5 flex-1">
                    {/* Address Line 1 */}
                    <div>
                      <label className={compactLabelClass}>
                        Address Line 1 <Tick valid={!!addressInfo.address_line_1.trim()} />
                      </label>
                      <input
                        type="text"
                        value={addressInfo.address_line_1}
                        onChange={(e) => setAddressInfo(prev => ({ ...prev, address_line_1: e.target.value }))}
                        className={compactFieldClass}
                        placeholder="Building name, street name"
                      />
                    </div>

                    {/* Address Line 2 */}
                    <div>
                      <label className={compactLabelClass}>Address Line 2</label>
                      <input
                        type="text"
                        value={addressInfo.address_line_2}
                        onChange={(e) => setAddressInfo(prev => ({ ...prev, address_line_2: e.target.value }))}
                        className={compactFieldClass}
                        placeholder="Apartment, suite, unit"
                      />
                    </div>

                    {/* City */}
                    <div>
                      <label className={compactLabelClass}>
                        City <Tick valid={!!addressInfo.city.trim()} />
                      </label>
                      <input
                        type="text"
                        value={addressInfo.city}
                        onChange={(e) => setAddressInfo(prev => ({ ...prev, city: e.target.value }))}
                        className={compactFieldClass}
                      />
                    </div>

                    {/* Emirate */}
                    <div>
                      <label className={compactLabelClass}>
                        Emirate <Tick valid={!!addressInfo.emirate} />
                      </label>
                      <select
                        value={addressInfo.emirate}
                        onChange={(e) => setAddressInfo(prev => ({ ...prev, emirate: e.target.value }))}
                        className={compactFieldClass}
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



            {/* Documents Tab */}
            {activeTab === 'documents' && (
              <div className="space-y-4">
                {/* Document Upload Sections - Two Column Layout */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {documentFields.map((field) => {
                  const isUploaded = documentUrls[field.key as keyof typeof documentUrls];
                  
                  return (
                    <div key={field.key} className="border border-white/20 rounded-md p-3 bg-white/8">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-semibold text-white flex items-center gap-1">
                          {field.label}
                          {field.required && <span className="text-red-400 ml-1">*</span>}
                          <Tick valid={field.required ? !!isUploaded : !!isUploaded} />
                        </h4>
                        {isUploaded ? (
                          <div className="flex items-center gap-2 text-xs">
                            <button
                              type="button"
                              onClick={() => {
                                const url = documentUrls[field.key as keyof typeof documentUrls];
                                if (url) window.open(url, '_blank');
                              }}
                              className="px-2 py-1 bg-white/10 hover:bg-white/20 text-white rounded transition-colors"
                            >
                              View
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const url = documentUrls[field.key as keyof typeof documentUrls];
                                if (url) {
                                  const a = document.createElement('a');
                                  a.href = url;
                                  a.download = `${field.label.replace(/\s+/g, '_')}.pdf`;
                                  a.click();
                                }
                              }}
                              className="px-2 py-1 bg-white/10 hover:bg-white/20 text-white rounded transition-colors"
                            >
                              Download
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm('Delete this document?')) {
                                  setDocumentUrls(prev => ({
                                    ...prev,
                                    [field.key]: ''
                                  }));
                                }
                              }}
                              className="px-2 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-200 rounded transition-colors"
                            >
                              Delete
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => document.getElementById(`upload-${field.key}`)?.click()}
                            disabled={uploadingField === field.key}
                            className="text-sm bg-white/10 hover:bg-white/20 text-white px-3 py-1.25 h-9 min-w-[150px] rounded transition-colors disabled:opacity-50"
                          >
                            {uploadingField === field.key ? 'Uploading…' : 'Upload'}
                          </button>
                        )}
                      </div>
                      
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
                <div className="border border-white/20 rounded-md p-3 bg-white/8">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-white">Other Documents</h4>
                    <button
                      type="button"
                      onClick={() => document.getElementById('upload-other-documents')?.click()}
                      disabled={uploadingField === 'other-documents'}
                      className="text-sm bg-white/10 hover:bg-white/20 text-white px-3 py-1.25 h-9 min-w-[150px] rounded transition-colors disabled:opacity-50"
                    >
                      {uploadingField === 'other-documents' ? 'Uploading…' : 'Upload'}
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
                          setUploadingField('other-documents');
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
                          setTimeout(() => setUploadingField(null), 300);
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
              <div className="space-y-4">
                {/* Top Row - Vehicle Details (Full Width) */}
                <div className="bg-neutral-900/50 backdrop-blur-md rounded-xl p-4 border border-white/10">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-white/10 text-white/80">
                        <Car size={16} />
                      </div>
                      Selected Vehicle
                    </h3>
                  </div>
                  {selectedVehicle ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                      <div className="text-center">
                        <span className="text-white/50 text-[10px] uppercase tracking-wide block mb-1">Make & Model</span>
                        <span className="text-white font-medium text-sm">{selectedVehicle.make} {selectedVehicle.vehicle_model}</span>
                      </div>
                      <div className="text-center">
                        <span className="text-white/50 text-[10px] uppercase tracking-wide block mb-1">Year</span>
                        <span className="text-white font-medium text-sm">{selectedVehicle.model_year}</span>
                      </div>
                      <div className="text-center">
                        <span className="text-white/50 text-[10px] uppercase tracking-wide block mb-1">Stock #</span>
                        <span className="text-white font-medium text-sm">{selectedVehicle.stock_number}</span>
                      </div>
                      <div className="text-center">
                        <span className="text-white/50 text-[10px] uppercase tracking-wide block mb-1">Exterior</span>
                        <span className="text-white font-medium text-sm">{selectedVehicle.colour || '—'}</span>
                      </div>
                      <div className="text-center">
                        <span className="text-white/50 text-[10px] uppercase tracking-wide block mb-1">Interior</span>
                        <span className="text-white font-medium text-sm">{selectedVehicle.interior_colour || '—'}</span>
                      </div>
                      <div className="text-center">
                        <span className="text-white/50 text-[10px] uppercase tracking-wide block mb-1">Mileage Rate</span>
                        <span className="text-white font-medium text-sm">
                          {selectedVehicle.excess_mileage_charges ? `AED ${parseFloat(selectedVehicle.excess_mileage_charges.toString()).toFixed(2)}/km` : '—'}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center text-white/40 text-sm py-4">No vehicle selected</div>
                  )}
                </div>

                {/* Bottom Row - Two Columns */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Left Column - Inventory Pricing (Reference) */}
                  <div className="bg-neutral-900/50 backdrop-blur-md rounded-xl p-4 border border-white/10 flex flex-col">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-white/10 text-white/80">
                          <DollarSign size={16} />
                        </div>
                        Inventory Pricing
                      </h3>
                      <div className="text-[10px] text-white/50 bg-white/10 px-2 py-0.5 rounded-full">Reference</div>
                    </div>
                    {selectedVehicle ? (
                      <div className="flex-1 flex flex-col justify-between space-y-3">
                        <div className="flex justify-between items-center py-3.5 bg-neutral-800/40 rounded-lg px-4">
                          <span className="text-white/60 text-sm">Monthly Rate</span>
                          <span className="text-white font-bold text-lg">
                            {selectedVehicle.monthly_lease_rate ? `AED ${parseFloat(selectedVehicle.monthly_lease_rate.toString()).toLocaleString()}` : '—'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-3.5 bg-neutral-800/40 rounded-lg px-4">
                          <span className="text-white/60 text-sm">Security Deposit</span>
                          <span className="text-white font-bold text-lg">
                            {selectedVehicle.security_deposit ? `AED ${parseFloat(selectedVehicle.security_deposit.toString()).toLocaleString()}` : '—'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-3.5 bg-neutral-800/40 rounded-lg px-4">
                          <span className="text-white/60 text-sm">Buyout Price</span>
                          <span className="text-white font-bold text-lg">
                            {selectedVehicle.buyout_price ? `AED ${parseFloat(selectedVehicle.buyout_price.toString()).toLocaleString()}` : '—'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-3.5 bg-neutral-800/40 rounded-lg px-4">
                          <span className="text-white/60 text-sm">Excess Mileage</span>
                          <span className="text-white font-bold text-lg">
                            {selectedVehicle.excess_mileage_charges ? `AED ${parseFloat(selectedVehicle.excess_mileage_charges.toString()).toFixed(2)}/km` : '—'}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1 flex items-center justify-center text-white/40 text-sm">No vehicle selected</div>
                    )}
                  </div>

                  {/* Right Column - Contract Terms (Editable) */}
                  <div className="bg-neutral-900/50 backdrop-blur-md rounded-xl p-4 border border-white/10 flex flex-col">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-white/10 text-white/80">
                          <FileText size={16} />
                        </div>
                        Contract Terms
                      </h3>
                      <div className="text-[10px] text-white/50 bg-white/10 px-2 py-0.5 rounded-full">Editable</div>
                    </div>
                    <div className="flex-1 flex flex-col justify-between space-y-3">
                      {/* Monthly Payment & Security Deposit - Side by side */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className={compactLabelClass}>
                            Monthly Payment (AED) <Tick valid={isPositiveNumber(contractInfo.monthly_payment)} />
                          </label>
                          <input
                            type="number"
                            value={contractInfo.monthly_payment}
                            onChange={(e) => setContractInfo(prev => ({ ...prev, monthly_payment: e.target.value }))}
                            className={compactFieldClass}
                            min="0"
                            step="0.01"
                            placeholder={selectedVehicle?.monthly_lease_rate ? `${selectedVehicle.monthly_lease_rate}` : "Amount"}
                          />
                        </div>
                        <div>
                          <label className={compactLabelClass}>
                            Security Deposit (AED) <Tick valid={isNonNegativeNumber(contractInfo.security_deposit)} />
                          </label>
                          <input
                            type="number"
                            value={contractInfo.security_deposit}
                            onChange={(e) => setContractInfo(prev => ({ ...prev, security_deposit: e.target.value }))}
                            className={compactFieldClass}
                            min="0"
                            step="0.01"
                            placeholder={selectedVehicle?.security_deposit ? `${selectedVehicle.security_deposit}` : "Amount"}
                          />
                        </div>
                      </div>

                      {/* Lease Term, Monthly Mileage, Excess Mileage - Inline */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className={compactLabelClass}>
                            Lease Term <Tick valid={!!contractInfo.lease_term_months} />
                          </label>
                          <select
                            value={contractInfo.lease_term_months}
                            onChange={(e) => setContractInfo(prev => ({ ...prev, lease_term_months: e.target.value }))}
                            className={compactFieldClass}
                          >
                            <option value="" className="bg-gray-800 text-white">Select</option>
                            <option value="12" className="bg-gray-800 text-white">12 mo</option>
                            <option value="24" className="bg-gray-800 text-white">24 mo</option>
                            <option value="36" className="bg-gray-800 text-white">36 mo</option>
                            <option value="48" className="bg-gray-800 text-white">48 mo</option>
                          </select>
                        </div>
                        <div>
                          <label className={compactLabelClass}>
                            Monthly Mileage (KM) <Tick valid={isPositiveNumber(contractInfo.monthly_mileage)} />
                          </label>
                          <input
                            type="number"
                            value={contractInfo.monthly_mileage}
                            onChange={(e) => setContractInfo(prev => ({ ...prev, monthly_mileage: e.target.value }))}
                            className={compactFieldClass}
                            min="0"
                            step="1"
                            placeholder="2000"
                          />
                          <ErrorMessage field="monthly_mileage" />
                        </div>
                        <div>
                          <label className={compactLabelClass}>
                            Excess Mileage (AED/km) <Tick valid={!!contractInfo.excess_mileage_charges} />
                          </label>
                          <input
                            type="number"
                            value={contractInfo.excess_mileage_charges}
                            onChange={(e) => setContractInfo(prev => ({ ...prev, excess_mileage_charges: e.target.value }))}
                            className={compactFieldClass}
                            min="0"
                            step="0.01"
                            placeholder="AED/km"
                          />
                        </div>
                      </div>

                      {/* Dates - Side by side */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className={compactLabelClass}>
                            Start Date <Tick valid={!!contractInfo.lease_start_date} />
                          </label>
                          <input
                            type="date"
                            value={contractInfo.lease_start_date}
                            onChange={(e) => setContractInfo(prev => ({ ...prev, lease_start_date: e.target.value }))}
                            className={compactFieldClass}
                          />
                        </div>
                        <div>
                          <label className={compactLabelClass}>
                            End Date <Tick valid={!!contractInfo.lease_end_date && isDateRangeValid()} />
                          </label>
                          <input
                            type="date"
                            value={contractInfo.lease_end_date}
                            onChange={(e) => setContractInfo(prev => ({ ...prev, lease_end_date: e.target.value }))}
                            className={compactFieldClass}
                          />
                        </div>
                      </div>

                      {/* Lease to Own & Buyout - Inline */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex items-center justify-between py-2.5 bg-neutral-800/40 rounded-lg px-4">
                          <label htmlFor="lease_to_own" className="text-white/80 text-sm">Lease-to-Own</label>
                          <input
                            type="checkbox"
                            id="lease_to_own"
                            checked={contractInfo.lease_to_own_option}
                            onChange={(e) => setContractInfo(prev => ({ ...prev, lease_to_own_option: e.target.checked }))}
                            className="w-5 h-5 rounded border-white/20 bg-neutral-700 text-green-500 focus:ring-white/30"
                          />
                        </div>
                        <div>
                          <label className={compactLabelClass}>
                            Buyout Price (AED) {contractInfo.lease_to_own_option && '*'} <Tick valid={!contractInfo.lease_to_own_option || isPositiveNumber(contractInfo.buyout_price)} />
                          </label>
                          <input
                            type="number"
                            value={contractInfo.buyout_price}
                            onChange={(e) => setContractInfo(prev => ({ ...prev, buyout_price: e.target.value }))}
                            className={compactFieldClass + (!contractInfo.lease_to_own_option ? ' opacity-50' : '')}
                            min="0"
                            step="0.01"
                            placeholder={selectedVehicle?.buyout_price ? `${selectedVehicle.buyout_price}` : "Buyout price"}
                            disabled={!contractInfo.lease_to_own_option}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Contract Tab */}
            {activeTab === 'contract' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Left Column - Customer & Vehicle Summary */}
                <div className="bg-neutral-900/50 backdrop-blur-md rounded-xl p-4 border border-white/10">
                  {/* Customer Info */}
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-white/10 text-white/80">
                        <User size={16} />
                      </div>
                      Customer
                    </h3>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    <div className="py-2 bg-neutral-800/40 rounded-lg px-3">
                      <span className="text-white/50 text-[10px] uppercase block">Name</span>
                      <span className="text-white text-xs font-medium">{personalInfo.customer_name || '—'}</span>
                    </div>
                    <div className="py-2 bg-neutral-800/40 rounded-lg px-3">
                      <span className="text-white/50 text-[10px] uppercase block">Phone</span>
                      <span className="text-white text-xs font-medium">{personalInfo.customer_phone || '—'}</span>
                    </div>
                    <div className="py-2 bg-neutral-800/40 rounded-lg px-3">
                      <span className="text-white/50 text-[10px] uppercase block">Email</span>
                      <span className="text-white text-xs font-medium truncate">{personalInfo.customer_email || '—'}</span>
                    </div>
                    <div className="py-2 bg-neutral-800/40 rounded-lg px-3">
                      <span className="text-white/50 text-[10px] uppercase block">Emirates ID</span>
                      <span className="text-white text-xs font-medium">{personalInfo.emirates_id_number || '—'}</span>
                    </div>
                    <div className="col-span-2 py-2 bg-neutral-800/40 rounded-lg px-3">
                      <span className="text-white/50 text-[10px] uppercase block">Address</span>
                      <span className="text-white text-xs font-medium">
                        {addressInfo.address_line_1 ? 
                          `${addressInfo.address_line_1}${addressInfo.city ? ', ' + addressInfo.city : ''}${addressInfo.emirate ? ', ' + addressInfo.emirate : ''}` 
                          : '—'}
                      </span>
                    </div>
                  </div>

                  {/* Vehicle Info */}
                  <div className="pt-4 border-t border-white/10">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-white/10 text-white/80">
                          <Car size={16} />
                        </div>
                        Vehicle
                      </h3>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="py-2 bg-neutral-800/40 rounded-lg px-3">
                        <span className="text-white/50 text-[10px] uppercase block">Make & Model</span>
                        <span className="text-white text-xs font-medium">
                          {selectedVehicle ? `${selectedVehicle.make} ${selectedVehicle.vehicle_model}` : '—'}
                        </span>
                      </div>
                      <div className="py-2 bg-neutral-800/40 rounded-lg px-3">
                        <span className="text-white/50 text-[10px] uppercase block">Year</span>
                        <span className="text-white text-xs font-medium">{selectedVehicle?.model_year || '—'}</span>
                      </div>
                      <div className="py-2 bg-neutral-800/40 rounded-lg px-3">
                        <span className="text-white/50 text-[10px] uppercase block">Stock #</span>
                        <span className="text-white text-xs font-medium">{selectedVehicle?.stock_number || '—'}</span>
                      </div>
                      <div className="py-2 bg-neutral-800/40 rounded-lg px-3">
                        <span className="text-white/50 text-[10px] uppercase block">Colors</span>
                        <span className="text-white text-xs font-medium">{selectedVehicle?.colour || '—'} / {selectedVehicle?.interior_colour || '—'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column - Contract Terms & Agreement */}
                <div className="bg-neutral-900/50 backdrop-blur-md rounded-xl p-4 border border-white/10 flex flex-col">
                  {/* Contract Terms */}
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-white/10 text-white/80">
                        <DollarSign size={16} />
                      </div>
                      Contract Terms
                    </h3>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    <div className="py-2.5 bg-neutral-800/40 rounded-lg px-3">
                      <span className="text-white/50 text-[10px] uppercase block">Monthly Payment</span>
                      <span className="text-white text-sm font-bold">
                        AED {contractInfo.monthly_payment ? parseFloat(contractInfo.monthly_payment).toLocaleString() : '0'}
                      </span>
                    </div>
                    <div className="py-2.5 bg-neutral-800/40 rounded-lg px-3">
                      <span className="text-white/50 text-[10px] uppercase block">Security Deposit</span>
                      <span className="text-white text-sm font-bold">
                        AED {contractInfo.security_deposit ? parseFloat(contractInfo.security_deposit).toLocaleString() : '0'}
                      </span>
                    </div>
                    <div className="col-span-2 grid grid-cols-3 gap-2">
                      <div className="py-2 bg-neutral-800/40 rounded-lg px-3">
                        <span className="text-white/50 text-[10px] uppercase block">Lease Term</span>
                        <span className="text-white text-xs font-medium">{contractInfo.lease_term_months || '0'} months</span>
                      </div>
                      <div className="py-2 bg-neutral-800/40 rounded-lg px-3">
                        <span className="text-white/50 text-[10px] uppercase block">Monthly Mileage</span>
                        <span className="text-white text-xs font-medium">{contractInfo.monthly_mileage || '—'} KM</span>
                      </div>
                      <div className="py-2 bg-neutral-800/40 rounded-lg px-3">
                        <span className="text-white/50 text-[10px] uppercase block">Excess Mileage</span>
                        <span className="text-white text-xs font-medium">
                          {contractInfo.excess_mileage_charges ? `AED ${parseFloat(contractInfo.excess_mileage_charges).toFixed(2)}/km` : '—'}
                        </span>
                      </div>
                    </div>
                    <div className="py-2 bg-neutral-800/40 rounded-lg px-3">
                      <span className="text-white/50 text-[10px] uppercase block">Start Date</span>
                      <span className="text-white text-xs font-medium">{contractInfo.lease_start_date || '—'}</span>
                    </div>
                    <div className="py-2 bg-neutral-800/40 rounded-lg px-3">
                      <span className="text-white/50 text-[10px] uppercase block">End Date</span>
                      <span className="text-white text-xs font-medium">{contractInfo.lease_end_date || '—'}</span>
                    </div>
                    {contractInfo.lease_to_own_option && (
                      <>
                        <div className="py-2 bg-green-900/30 rounded-lg px-3 border border-green-500/20">
                          <span className="text-green-400/70 text-[10px] uppercase block">Lease-to-Own</span>
                          <span className="text-green-400 text-xs font-medium">Yes</span>
                        </div>
                        <div className="py-2.5 bg-neutral-800/40 rounded-lg px-3">
                          <span className="text-white/50 text-[10px] uppercase block">Buyout Price</span>
                          <span className="text-white text-sm font-bold">
                            AED {contractInfo.buyout_price ? parseFloat(contractInfo.buyout_price).toLocaleString() : '0'}
                          </span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Lease Agreement Section */}
                  <div className="pt-4 border-t border-white/10 flex-1 flex flex-col">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-white/10 text-white/80">
                          <FileText size={16} />
                        </div>
                        Lease Agreement
                      </h3>
                      {generatedContract && (
                        <span className="text-[10px] text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full">Ready</span>
                      )}
                    </div>

                    <div className="flex-1 flex flex-col justify-center space-y-2">
                      {/* Generate / Regenerate Button */}
                      <button
                        type="button"
                        onClick={handleGenerateLeaseAgreement}
                        disabled={generatingAgreement}
                        className="w-full px-4 py-2.5 bg-gradient-to-r from-neutral-600 to-neutral-700 hover:from-neutral-500 hover:to-neutral-600 disabled:from-neutral-700 disabled:to-neutral-800 text-white font-medium rounded-lg transition-all duration-200 flex items-center justify-center gap-2 border border-neutral-400/30 disabled:cursor-not-allowed text-xs"
                      >
                        {generatingAgreement ? (
                          <>
                            <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            Generating...
                          </>
                        ) : (
                          <>
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            {generatedContract ? 'Regenerate Agreement' : 'Generate Agreement'}
                          </>
                        )}
                      </button>

                      {/* Document Actions - Only show when generated */}
                      {generatedContract && (
                        <>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => window.open(generatedContract.url, '_blank')}
                              className="px-3 py-2 bg-neutral-800/60 hover:bg-neutral-700/60 text-white border border-white/10 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                              View
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const link = document.createElement('a');
                                link.href = generatedContract.url;
                                link.download = generatedContract.filename;
                                link.target = '_blank';
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                              }}
                              className="px-3 py-2 bg-neutral-800/60 hover:bg-neutral-700/60 text-white border border-white/10 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              Download
                            </button>
                          </div>
                          
                          {/* Send for Signing Button */}
                          <button
                            type="button"
                            onClick={() => {
                              if (!personalInfo.customer_email) {
                                alert('Please add customer email address before sending for signing.');
                                return;
                              }
                              alert('Send for signing functionality will be implemented with DocuSign integration.');
                            }}
                            className="w-full px-4 py-2.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-medium rounded-lg transition-all duration-200 flex items-center justify-center gap-2 border border-amber-500/30 text-xs"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            Send for Signing
                          </button>
                        </>
                      )}

                      {agreementStatusMsg && (
                        <div className="p-2 bg-green-500/10 border border-green-400/30 rounded-lg">
                          <p className="text-green-400 text-xs text-center">{agreementStatusMsg}</p>
                        </div>
                      )}
                    </div>
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
