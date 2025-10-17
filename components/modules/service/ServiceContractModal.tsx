"use client";
import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, FileText, User, Building, Car, Calendar, Save, Search, RefreshCw, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/components/shared/AuthProvider';

// Global CSS override for consistent input styling
const inputOverrideStyles = `
  .service-contract-modal input[type="text"], 
  .service-contract-modal input[type="email"], 
  .service-contract-modal input[type="tel"], 
  .service-contract-modal input[type="number"],
  .service-contract-modal select {
    background: rgba(255, 255, 255, 0.1) !important;
    background-color: rgba(255, 255, 255, 0.1) !important;
    background-image: none !important;
    border: 1px solid rgba(255, 255, 255, 0.2) !important;
    border-color: rgba(255, 255, 255, 0.2) !important;
    color: white !important;
    opacity: 1 !important;
    filter: none !important;
    -webkit-filter: none !important;
    -webkit-appearance: none !important;
    appearance: none !important;
  }
  
  .service-contract-modal input[type="text"]:focus, 
  .service-contract-modal input[type="email"]:focus, 
  .service-contract-modal input[type="tel"]:focus, 
  .service-contract-modal input[type="number"]:focus,
  .service-contract-modal select:focus {
    background: rgba(255, 255, 255, 0.1) !important;
    background-color: rgba(255, 255, 255, 0.1) !important;
    background-image: none !important;
    border: 1px solid rgba(255, 255, 255, 0.4) !important;
    border-color: rgba(255, 255, 255, 0.4) !important;
    color: white !important;
    opacity: 1 !important;
    filter: none !important;
    -webkit-filter: none !important;
  }
  
  .service-contract-modal input[type="text"]:-webkit-autofill,
  .service-contract-modal input[type="email"]:-webkit-autofill,
  .service-contract-modal input[type="tel"]:-webkit-autofill,
  .service-contract-modal input[type="number"]:-webkit-autofill {
    background: rgba(255, 255, 255, 0.1) !important;
    background-color: rgba(255, 255, 255, 0.1) !important;
    background-image: none !important;
    color: white !important;
    opacity: 1 !important;
    -webkit-box-shadow: inset 0 0 0 1000px rgba(255, 255, 255, 0.1) !important;
    box-shadow: inset 0 0 0 1000px rgba(255, 255, 255, 0.1) !important;
  }
`;

interface ServiceContractModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ServiceContractData) => void;
  contractType?: 'service' | 'warranty';
  hideAutoPopulate?: boolean;
  prefilledData?: {
    make?: string;
    model?: string;
    variant?: string;
    year?: string;
    serviceType?: 'standard' | 'premium';
    invoiceAmount?: number;
    dealerName?: string;
    dealerPhone?: string;
    dealerEmail?: string;
    salesExecutive?: string;
  };
}

export interface ServiceContractData {
  referenceNo: string;
  serviceType: 'standard' | 'premium';
  
  // Customer Information (enhanced with VehicleDocument fields)
  ownerName: string;
  mobileNo: string;
  email: string;
  customerIdType: 'EID' | 'Passport';
  customerIdNumber: string;
  salesExecutive: string;
  
  // Dealer Information (pre-filled)
  dealerName: string;
  dealerPhone: string;
  dealerEmail: string;
  
  // Vehicle Information (enhanced with VehicleDocument fields)
  vin: string;
  make: string;
  model: string;
  modelYear: string;
  currentOdometer: string;
  exteriorColour: string;
  interiorColour: string;
  
  // Contract Duration
  startDate: string;
  endDate: string;
  cutOffKm: string;
  
  // Financial Information
  invoiceAmount: string;
  
  // Notes
  notes: string;
  
  // Optional relationship link
  reservationId?: string;
}

export default function ServiceContractModal({ isOpen, onClose, onSubmit, contractType = 'service', hideAutoPopulate = false, prefilledData }: ServiceContractModalProps) {
  const { user } = useAuth();
  
  // Generate reference number (SC for service, EW for warranty + 5 random digits)
  const generateReferenceNo = () => {
    const randomNumber = Math.floor(10000 + Math.random() * 90000);
    const prefix = contractType === 'warranty' ? 'EW' : 'SC';
    return `${prefix}${randomNumber}`;
  };

  // Auto-populate states
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState<any>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Initialize form data with smart defaults
  const getSmartDefaults = () => {
    const today = new Date();
    const startDate = today.toISOString().split('T')[0];
    
    // Calculate end date based on contract type
    let endDate: string;
    if (contractType === 'warranty') {
      // Warranty is ALWAYS 1 year (12 months) for both standard and premium
      const warrantyEndDate = new Date(today);
      warrantyEndDate.setFullYear(warrantyEndDate.getFullYear() + 1);
      endDate = warrantyEndDate.toISOString().split('T')[0];
    } else {
      // Service: 2 years for standard, but will be updated when serviceType changes
      const serviceEndDate = new Date(today);
      serviceEndDate.setFullYear(serviceEndDate.getFullYear() + 2);
      endDate = serviceEndDate.toISOString().split('T')[0];
    }
    
    return {
      referenceNo: generateReferenceNo(),
      serviceType: (prefilledData?.serviceType || 'standard') as 'standard' | 'premium',
      
      // Customer Information
      ownerName: '',
      mobileNo: '',
      email: '',
      customerIdType: 'EID' as 'EID' | 'Passport',
      customerIdNumber: '',
      salesExecutive: prefilledData?.salesExecutive || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Current User',
      
      // Dealer Information
      dealerName: prefilledData?.dealerName || 'SilberArrows',
      dealerPhone: prefilledData?.dealerPhone || '+971 4 380 5515',
      dealerEmail: prefilledData?.dealerEmail || 'service@silberarrows.com',
      
      // Vehicle Information
      vin: '',
      make: prefilledData?.make || 'Mercedes-Benz',
      model: prefilledData?.variant || '',
      modelYear: prefilledData?.year && prefilledData.year !== 'N/A' ? prefilledData.year : '',
      currentOdometer: '',
      exteriorColour: '',
      interiorColour: '',
      
      // Contract Duration (smart defaults)
      startDate: startDate,
      endDate: endDate,
      cutOffKm: '0', // Will be calculated when current mileage is entered
      
      // Financial Information
      invoiceAmount: prefilledData?.invoiceAmount ? prefilledData.invoiceAmount.toString() : '',
      
      // Notes
      notes: ''
    };
  };

  const [formData, setFormData] = useState<ServiceContractData>(getSmartDefaults());

  const [loading, setLoading] = useState(false);

  // Regenerate reference number when contractType changes
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      referenceNo: generateReferenceNo()
    }));
  }, [contractType]);

  // Initialize dealer information and sales executive when prefilledData changes or on mount
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      dealerName: prefilledData?.dealerName || 'SilberArrows',
      dealerPhone: prefilledData?.dealerPhone || '+971 4 380 5515',
      dealerEmail: prefilledData?.dealerEmail || 'service@silberarrows.com',
      salesExecutive: prefilledData?.salesExecutive || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Current User'
    }));
  }, [prefilledData, user]);

  // Search reservations function
  const searchReservations = async (query: string) => {
    if (!query || query.length < 2) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    setSearchLoading(true);
    try {
      const response = await fetch(`/api/vehicle-reservations/search?q=${encodeURIComponent(query)}&limit=10`);
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.reservations || []);
        setShowResults(true);
      }
    } catch (error) {
      console.error('Error searching reservations:', error);
    } finally {
      setSearchLoading(false);
    }
  };

  // Handle search input with debounce
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    searchTimeoutRef.current = setTimeout(() => {
      searchReservations(value);
    }, 300);
  };

  // Auto-populate form from reservation data
  const populateFromReservation = async (reservation: any) => {
    try {
      // Fetch full reservation details
      const response = await fetch('/api/vehicle-reservations/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reservationId: reservation.id })
      });

      if (response.ok) {
        const { reservation: fullReservation } = await response.json();
        
        // Calculate cut-off KM based on current mileage
        const currentMileage = parseInt(fullReservation.vehicle_mileage?.toString() || '0') || 0;
        let calculatedCutOffKm = '0';
        
        if (contractType === 'warranty') {
          // Warranty: Current Mileage + 20,000 KM
          calculatedCutOffKm = (currentMileage + 20000).toString();
        } else {
          // Service: Current Mileage + (30K for Standard, 60K for Premium)
          const additionalKm = formData.serviceType === 'premium' ? 60000 : 30000;
          calculatedCutOffKm = (currentMileage + additionalKm).toString();
        }
        
        // Map reservation fields to service contract fields
        const populatedData: ServiceContractData = {
          ...formData,
          // Customer Information
          ownerName: fullReservation.customer_name || '',
          mobileNo: fullReservation.contact_no || '',
          email: fullReservation.email_address || '',
          customerIdType: fullReservation.customer_id_type || 'EID',
          customerIdNumber: fullReservation.customer_id_number || '',
          
          // Vehicle Information
          vin: fullReservation.chassis_no || '',
          make: fullReservation.vehicle_make_model?.split(' ')[0] || '',
          model: fullReservation.vehicle_make_model?.split(' ').slice(1).join(' ') || '',
          modelYear: fullReservation.model_year?.toString() || '',
          currentOdometer: fullReservation.vehicle_mileage?.toString() || '',
          exteriorColour: fullReservation.vehicle_exterior_colour || fullReservation.vehicle_colour || '',
          interiorColour: fullReservation.vehicle_interior_colour || '',
          
          // Contract Duration - Calculate cut-off KM
          cutOffKm: calculatedCutOffKm,
          
          // Financial Information - Extract specific add-on amount based on contract type
          invoiceAmount: contractType === 'warranty' 
            ? fullReservation.extended_warranty_price?.toString() || ''
            : fullReservation.service_care_price?.toString() || '',
          
          // Link to reservation
          reservationId: fullReservation.id
        };

        setFormData(populatedData);
        setSelectedReservation(fullReservation);
        setSearchQuery(`${fullReservation.customer_name} - ${fullReservation.vehicle_make_model}`);
        setShowResults(false);
      }
    } catch (error) {
      console.error('Error populating from reservation:', error);
    }
  };

  // Clear auto-populated data
  const clearAutoPopulation = () => {
    setFormData(getSmartDefaults());
    setSelectedReservation(null);
    setSearchQuery('');
    setSearchResults([]);
    setShowResults(false);
  };

  // Close search results when clicking outside and handle repositioning
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Check if click is outside both the search input and the dropdown
      if (searchInputRef.current && !searchInputRef.current.contains(event.target as Node)) {
        // Also check if the click is not on the dropdown itself
        const dropdownElement = document.querySelector('[data-dropdown="search-results"]');
        if (!dropdownElement || !dropdownElement.contains(event.target as Node)) {
          setShowResults(false);
        }
      }
    };

    const handleScroll = () => {
      if (showResults) {
        // Force re-render to update dropdown position
        setShowResults(false);
        setTimeout(() => setShowResults(true), 0);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleScroll);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleScroll);
    };
  }, [showResults]);

  // Validate form before submission
  const validateForm = (): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];

    // Customer Information (Required 1-5)
    if (!formData.ownerName?.trim()) errors.push('Customer Name is required');
    if (!formData.mobileNo?.trim()) errors.push('Mobile Number is required');
    if (!formData.email?.trim()) errors.push('Email Address is required');
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) errors.push('Invalid email format');
    if (!formData.customerIdType?.trim()) errors.push('ID Type is required');
    if (!formData.customerIdNumber?.trim()) errors.push('ID Number is required');

    // Vehicle Information (Required 6-12)
    if (!formData.vin?.trim()) errors.push('VIN Number is required');
    if (!formData.make?.trim()) errors.push('Vehicle Make is required');
    if (!formData.model?.trim()) errors.push('Vehicle Model is required');
    if (!formData.modelYear?.trim()) errors.push('Model Year is required');
    if (!formData.exteriorColour?.trim()) errors.push('Exterior Colour is required');
    if (!formData.interiorColour?.trim()) errors.push('Interior Colour is required');
    if (!formData.currentOdometer?.trim()) errors.push('Current Odometer is required');

    // Contract Details (Required 13-14)
    if (!formData.serviceType?.trim()) errors.push('Service Type is required');
    if (!formData.invoiceAmount?.trim() || parseFloat(formData.invoiceAmount) <= 0) {
      errors.push('Invoice Amount is required and must be greater than 0');
    }

    return { isValid: errors.length === 0, errors };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    const validation = validateForm();
    if (!validation.isValid) {
      alert('Please fill in all required fields:\n\n' + validation.errors.join('\n'));
      return;
    }
    
    setLoading(true);
    
    try {
      await onSubmit(formData);
      onClose();
      // Reset form with smart defaults
      setFormData(getSmartDefaults());
    } catch (error) {
      console.error('Error creating contract:', error);
      alert('Failed to create contract. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof ServiceContractData, value: string) => {
    setFormData(prev => {
      const updated = {
        ...prev,
        [field]: value
      };
      
      // Recalculate cut-off KM when current odometer changes
      if (field === 'currentOdometer' && value) {
        const currentMileage = parseInt(value) || 0;
        if (contractType === 'warranty') {
          // Warranty: Current Mileage + 20,000 KM
          updated.cutOffKm = (currentMileage + 20000).toString();
        } else {
          // Service: Current Mileage + (30K for Standard, 60K for Premium)
          const additionalKm = updated.serviceType === 'premium' ? 60000 : 30000;
          updated.cutOffKm = (currentMileage + additionalKm).toString();
        }
      }
      
      // Recalculate end date and cut-off KM when service type changes
      // NOTE: For warranty contracts, both Standard and Premium are identical (1 year, +20K KM),
      // so we don't need to recalculate when switching between them
      if (field === 'serviceType' && value && contractType === 'service') {
        const currentMileage = parseInt(prev.currentOdometer || '0') || 0;
        const startDate = prev.startDate;
        
        // Service: Extract months and KM from the service type string
        const monthsMatch = value.match(/\((\d+)\s+Months?\s*\/\s*([0-9,]+)\s*KM\)/);
        if (monthsMatch && startDate) {
          const months = parseInt(monthsMatch[1]);
          const kmValue = parseInt(monthsMatch[2].replace(/,/g, ''));
          
          const newEndDate = new Date(startDate);
          newEndDate.setMonth(newEndDate.getMonth() + months);
          updated.endDate = newEndDate.toISOString().split('T')[0];
          updated.cutOffKm = (currentMileage + kmValue).toString();
        }
      }
      
      return updated;
    });
  };

  // Handle mobile number lookup and auto-population

  // Date formatting function for display
  const formatDateToDisplay = (isoDate: string): string => {
    if (!isoDate) return '';
    const date = new Date(isoDate);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Inject global CSS override */}
      <style dangerouslySetInnerHTML={{ __html: inputOverrideStyles }} />
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="service-contract-modal bg-gradient-to-br from-black/60 via-black/40 to-black/60 backdrop-blur-2xl border-2 border-white/20 shadow-2xl rounded-2xl p-6 w-full max-w-xl md:max-w-3xl lg:max-w-5xl relative max-h-[85vh] overflow-hidden">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-2xl leading-none text-white/70 hover:text-white transition-colors duration-200"
        >
          ×
        </button>
        
        <div className="flex items-start justify-between mb-6 pr-8 gap-4 flex-wrap">
          <div className="flex flex-col">
            <h2 className="text-2xl font-bold text-white">
              {contractType === 'warranty' ? 'New Warranty Agreement' : 'New ServiceCare Agreement'}
            </h2>
            <div className="text-white/70 text-sm mt-2">
              <span className="text-white/50">Reference:</span> <span className="font-mono font-semibold">{formData.referenceNo}</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          <div className="flex flex-col gap-6 max-h-[65vh] overflow-y-auto space-y-6 relative">
            
            
            {/* STEP 1: AUTO-POPULATE FROM RESERVATION */}
            {!hideAutoPopulate && (
            <div className="bg-blue-500/10 backdrop-blur-sm rounded-lg p-6 border border-blue-500/20">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center border border-blue-500/30">
                  <span className="text-blue-300 text-sm font-bold">1</span>
                </div>
                <h3 className="text-lg font-medium text-blue-300 flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  Auto Populate (Only for UV)
                  <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded-full border border-blue-500/30">
                    {contractType === 'warranty' ? 'Warranty Add-On' : 'Service Care Add-On'}
                  </span>
                  {selectedReservation && (
                    <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full border border-green-500/30">
                      Populated
                    </span>
                  )}
                </h3>
              </div>
              
              <div className="space-y-3">
                <div className="relative" ref={searchInputRef}>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-white/40" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => handleSearchChange(e.target.value)}
                      placeholder="Search by customer name, mobile number, email, or vehicle..."
                      className="w-full pl-10 pr-12 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/40"
                    />
                    {searchLoading && (
                      <div className="absolute right-3 top-3">
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/20 border-t-white/60"></div>
                      </div>
                    )}
                  </div>
                </div>
                
                {selectedReservation && (
                  <div className="flex items-center justify-between p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-green-400" />
                      <span className="text-green-300 text-sm">
                        Data populated from: <strong>{selectedReservation.customer_name}</strong> - {selectedReservation.vehicle_make_model}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={clearAutoPopulation}
                      className="flex items-center gap-1 px-3 py-1 bg-white/10 hover:bg-white/20 border border-white/20 rounded text-white/80 hover:text-white text-xs transition-colors"
                    >
                      <RefreshCw className="h-3 w-3" />
                      Clear
                    </button>
                  </div>
                )}
              </div>
            </div>
            )}
            
            {/* STEP 2: CUSTOMER INFORMATION */}
            <div className="bg-white/5 backdrop-blur-sm rounded-lg p-6 border border-white/10">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center border border-white/30">
                  <span className="text-white text-sm font-bold">{hideAutoPopulate ? '1' : '2'}</span>
                </div>
                <h3 className="text-lg font-medium text-white flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Customer Information
                </h3>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    Sales Executive
                  </label>
                  <input
                    type="text"
                    value={formData.salesExecutive}
                    onChange={(e) => handleInputChange('salesExecutive', e.target.value)}
                    className="w-full h-[42px] px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/40 [&:-webkit-autofill]:bg-white/10 [&:-webkit-autofill]:shadow-[inset_0_0_0px_1000px_rgba(255,255,255,0.1)] [&:-webkit-autofill]:text-white"
                    placeholder="Enter sales executive name"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    Customer Name *
                    <span className="ml-2 text-xs text-amber-400">(Required 1)</span>
                  </label>
                  <input
                    type="text"
                    value={formData.ownerName}
                    onChange={(e) => handleInputChange('ownerName', e.target.value.toUpperCase())}
                    className="w-full h-[42px] px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/40 [&:-webkit-autofill]:bg-white/10 [&:-webkit-autofill]:shadow-[inset_0_0_0px_1000px_rgba(255,255,255,0.1)] [&:-webkit-autofill]:text-white"
                    placeholder="Enter customer name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    Mobile Number *
                    <span className="ml-2 text-xs text-amber-400">(Required 2)</span>
                  </label>
                  <input
                    type="tel"
                    value={formData.mobileNo}
                    onChange={(e) => handleInputChange('mobileNo', e.target.value)}
                    autoComplete="tel"
                    className="w-full h-[42px] px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/40 [&:-webkit-autofill]:bg-white/10 [&:-webkit-autofill]:text-white [&:-webkit-autofill]:shadow-[inset_0_0_0px_1000px_rgba(255,255,255,0.1)]"
                    placeholder="Mobile number"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    Email Address *
                    <span className="ml-2 text-xs text-amber-400">(Required 3)</span>
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className="w-full h-[42px] px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/40 [&:-webkit-autofill]:bg-white/10 [&:-webkit-autofill]:shadow-[inset_0_0_0px_1000px_rgba(255,255,255,0.1)] [&:-webkit-autofill]:text-white"
                    placeholder="Enter email address"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    ID Type *
                    <span className="ml-2 text-xs text-amber-400">(Required 4)</span>
                  </label>
                  <select
                    value={formData.customerIdType}
                    onChange={(e) => handleInputChange('customerIdType', e.target.value)}
                    className="w-full h-[42px] px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/40 [&:-webkit-autofill]:bg-white/10 [&:-webkit-autofill]:shadow-[inset_0_0_0px_1000px_rgba(255,255,255,0.1)] [&:-webkit-autofill]:text-white overflow-hidden text-ellipsis"
                    style={{ lineHeight: '1.2' }}
                    required
                  >
                    <option value="EID" className="bg-gray-900">Emirates ID</option>
                    <option value="Passport" className="bg-gray-900">Passport</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    ID Number *
                    <span className="ml-2 text-xs text-amber-400">(Required 5)</span>
                  </label>
                  <input
                    type="text"
                    value={formData.customerIdNumber}
                    onChange={(e) => handleInputChange('customerIdNumber', e.target.value)}
                    className="w-full h-[42px] px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/40 [&:-webkit-autofill]:bg-white/10 [&:-webkit-autofill]:shadow-[inset_0_0_0px_1000px_rgba(255,255,255,0.1)] [&:-webkit-autofill]:text-white"
                    placeholder="Enter ID number"
                    required
                  />
                </div>
              </div>
            </div>

            {/* STEP 3: VEHICLE INFORMATION */}
            <div className="bg-white/5 backdrop-blur-sm rounded-lg p-6 border border-white/10">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center border border-white/30">
                  <span className="text-white text-sm font-bold">{hideAutoPopulate ? '2' : '3'}</span>
                </div>
                <h3 className="text-lg font-medium text-white flex items-center gap-2">
                  <Car className="h-5 w-5" />
                  Vehicle Information
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    VIN Number *
                    <span className="ml-2 text-xs text-amber-400">(Required 6)</span>
                  </label>
                  <input
                    type="text"
                    value={formData.vin}
                    onChange={(e) => handleInputChange('vin', e.target.value.toUpperCase())}
                    className="w-full h-[42px] px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/40 font-mono [&:-webkit-autofill]:bg-white/10 [&:-webkit-autofill]:shadow-[inset_0_0_0px_1000px_rgba(255,255,255,0.1)] [&:-webkit-autofill]:text-white"
                    placeholder="Enter VIN number"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    Make *
                    {prefilledData?.make ? (
                      <span className="ml-2 text-xs text-green-400">(Locked)</span>
                    ) : (
                      <span className="ml-2 text-xs text-amber-400">(Required 7)</span>
                    )}
                  </label>
                  <input
                    type="text"
                    value={formData.make}
                    onChange={(e) => handleInputChange('make', e.target.value.toUpperCase())}
                    disabled={prefilledData?.make !== undefined}
                    className={`w-full h-[42px] px-4 py-3 border rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/40 [&:-webkit-autofill]:bg-white/10 [&:-webkit-autofill]:shadow-[inset_0_0_0px_1000px_rgba(255,255,255,0.1)] [&:-webkit-autofill]:text-white ${
                      prefilledData?.make !== undefined 
                        ? 'bg-white/5 border-white/10 cursor-not-allowed opacity-60' 
                        : 'bg-white/10 border-white/20'
                    }`}
                    placeholder="Vehicle make"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    Model *
                    {prefilledData?.model ? (
                      <span className="ml-2 text-xs text-green-400">(Locked)</span>
                    ) : (
                      <span className="ml-2 text-xs text-amber-400">(Required 8)</span>
                    )}
                  </label>
                  <input
                    type="text"
                    value={formData.model}
                    onChange={(e) => handleInputChange('model', e.target.value.toUpperCase())}
                    disabled={prefilledData?.model !== undefined}
                    className={`w-full h-[42px] px-4 py-3 border rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/40 [&:-webkit-autofill]:bg-white/10 [&:-webkit-autofill]:shadow-[inset_0_0_0px_1000px_rgba(255,255,255,0.1)] [&:-webkit-autofill]:text-white ${
                      prefilledData?.model !== undefined 
                        ? 'bg-white/5 border-white/10 cursor-not-allowed opacity-60' 
                        : 'bg-white/10 border-white/20'
                    }`}
                    placeholder="Vehicle model"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    Model Year *
                    <span className="ml-2 text-xs text-amber-400">(Required 9)</span>
                  </label>
                  <input
                    type="number"
                    min="1980"
                    max="2030"
                    value={formData.modelYear}
                    onChange={(e) => handleInputChange('modelYear', e.target.value)}
                    className="w-full h-[42px] px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/40 [&:-webkit-autofill]:shadow-[inset_0_0_0px_1000px_rgba(255,255,255,0.1)] [&:-webkit-autofill]:bg-white/10 [&:-webkit-autofill]:text-white"
                    placeholder="Year"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    Exterior Colour *
                    <span className="ml-2 text-xs text-amber-400">(Required 10)</span>
                  </label>
                  <input
                    type="text"
                    value={formData.exteriorColour}
                    onChange={(e) => handleInputChange('exteriorColour', e.target.value)}
                    className="w-full h-[42px] px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/40 [&:-webkit-autofill]:bg-white/10 [&:-webkit-autofill]:shadow-[inset_0_0_0px_1000px_rgba(255,255,255,0.1)] [&:-webkit-autofill]:text-white"
                    placeholder="Exterior color"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    Interior Colour *
                    <span className="ml-2 text-xs text-amber-400">(Required 11)</span>
                  </label>
                  <input
                    type="text"
                    value={formData.interiorColour}
                    onChange={(e) => handleInputChange('interiorColour', e.target.value)}
                    className="w-full h-[42px] px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/40 [&:-webkit-autofill]:bg-white/10 [&:-webkit-autofill]:shadow-[inset_0_0_0px_1000px_rgba(255,255,255,0.1)] [&:-webkit-autofill]:text-white"
                    placeholder="Interior color"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    Current Odometer *
                    <span className="ml-2 text-xs text-amber-400">(Required 12)</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.currentOdometer}
                    onChange={(e) => handleInputChange('currentOdometer', e.target.value)}
                    className="w-full h-[42px] px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/40 [&:-webkit-autofill]:shadow-[inset_0_0_0px_1000px_rgba(255,255,255,0.1)] [&:-webkit-autofill]:bg-white/10 [&:-webkit-autofill]:text-white"
                    placeholder="Current KM"
                    required
                  />
                </div>
              </div>
            </div>

            {/* STEP 4: SERVICE COVERAGE */}
            <div className="bg-white/5 backdrop-blur-sm rounded-lg p-6 border border-white/10">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center border border-white/30">
                  <span className="text-white text-sm font-bold">{hideAutoPopulate ? '3' : '4'}</span>
                </div>
                <h3 className="text-lg font-medium text-white flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  {contractType === 'warranty' ? 'Warranty Coverage' : 'Service Coverage'}
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    {contractType === 'warranty' ? 'Warranty Type *' : 'Service Type *'}
                    {prefilledData?.serviceType !== undefined ? (
                      <span className="ml-2 text-xs text-green-400">(Locked)</span>
                    ) : (
                      <span className="ml-2 text-xs text-amber-400">(Required 13)</span>
                    )}
                  </label>
                  <select
                    value={formData.serviceType}
                    onChange={(e) => {
                      const type = e.target.value as 'standard' | 'premium';
                      
                      setFormData(prev => {
                        const currentMileage = parseInt(prev.currentOdometer) || 0;
                        const today = new Date();
                        const startDate = today.toISOString().split('T')[0];
                        let endDate: string;
                        let cutOffKm: string;
                        
                        if (contractType === 'warranty') {
                          // Warranty is ALWAYS 1 year (12 months) for BOTH standard and premium
                          const warrantyEndDate = new Date(today);
                          warrantyEndDate.setFullYear(warrantyEndDate.getFullYear() + 1);
                          endDate = warrantyEndDate.toISOString().split('T')[0];
                          
                          // Warranty cut-off: ALWAYS Current Mileage + 20,000 KM for both types
                          cutOffKm = (currentMileage + 20000).toString();
                        } else {
                          // Service contract periods: 2 years (standard) or 4 years (premium)
                          const serviceEndDate = new Date(today);
                          serviceEndDate.setFullYear(serviceEndDate.getFullYear() + (type === 'premium' ? 4 : 2));
                          endDate = serviceEndDate.toISOString().split('T')[0];
                          
                          // Service cut-off: Current Mileage + (30K for Standard, 60K for Premium)
                          cutOffKm = (currentMileage + (type === 'premium' ? 60000 : 30000)).toString();
                        }
                        
                        return {
                          ...prev,
                          serviceType: type,
                          startDate: startDate,
                          endDate: endDate,
                          cutOffKm: cutOffKm
                        };
                      });
                    }}
                    disabled={prefilledData?.serviceType !== undefined}
                    className={`w-full h-[42px] px-4 py-3 border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/40 overflow-hidden text-ellipsis ${
                      prefilledData?.serviceType !== undefined 
                        ? 'bg-white/5 border-white/10 cursor-not-allowed opacity-60' 
                        : 'bg-white/10 border-white/20'
                    }`}
                    style={{ lineHeight: '1.2' }}
                    required
                  >
                    {contractType === 'warranty' ? (
                      <>
                        <option value="standard">Standard Warranty (12 Months / +20K KM)</option>
                        <option value="premium">Premium Warranty (12 Months / +20K KM)</option>
                      </>
                    ) : (
                      <>
                        <option value="standard">Standard (24 Months)</option>
                        <option value="premium">Premium (48 Months)</option>
                      </>
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">Coverage Period</label>
                  <div className="flex items-center px-4 py-3 bg-black/20 border border-white/10 rounded-lg text-white/70 text-sm">
                    {contractType === 'warranty' 
                      ? '12 Months Warranty'
                      : (formData.serviceType === 'standard' ? '24 Months Coverage' : '48 Months Coverage')
                    }
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    Cut-off Kilometers *
                    <span className="ml-2 text-xs text-green-400">(Locked)</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.cutOffKm}
                    onChange={(e) => handleInputChange('cutOffKm', e.target.value)}
                    disabled
                    className="w-full h-[42px] px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/50 cursor-not-allowed opacity-60"
                    placeholder="Maximum KM coverage"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    Contract Amount *
                    {prefilledData?.invoiceAmount !== undefined ? (
                      <span className="ml-2 text-xs text-green-400">(Locked)</span>
                    ) : (
                      <span className="ml-2 text-xs text-amber-400">(Required 14)</span>
                    )}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.invoiceAmount}
                    onChange={(e) => handleInputChange('invoiceAmount', e.target.value)}
                    disabled={prefilledData?.invoiceAmount !== undefined}
                    className={`w-full h-[42px] px-4 py-3 border rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/40 [&:-webkit-autofill]:shadow-[inset_0_0_0px_1000px_rgba(255,255,255,0.1)] ${
                      prefilledData?.invoiceAmount !== undefined 
                        ? 'bg-white/5 border-white/10 cursor-not-allowed opacity-60' 
                        : 'bg-white/10 border-white/20'
                    }`}
                    placeholder="Amount (AED)"
                    required
                  />
                </div>
              </div>
            </div>

            {/* STEP 5: CONTRACT PERIOD */}
            <div className="bg-white/5 backdrop-blur-sm rounded-lg p-6 border border-white/10">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center border border-white/30">
                  <span className="text-white text-sm font-bold">{hideAutoPopulate ? '4' : '5'}</span>
                </div>
                <h3 className="text-lg font-medium text-white flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Contract Period
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    Start Date *
                    <span className="ml-2 text-xs text-green-400">(Locked)</span>
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => {
                        const startDate = e.target.value;
                        const endDate = startDate ? new Date(new Date(startDate).setFullYear(
                          new Date(startDate).getFullYear() + (formData.serviceType === 'premium' ? 4 : 2)
                        )).toISOString().split('T')[0] : '';
                        
                        setFormData(prev => ({
                          ...prev,
                          startDate,
                          endDate
                        }));
                      }}
                      disabled
                      className="w-full h-[42px] px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white cursor-not-allowed opacity-60 [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:opacity-70"
                      required
                    />
                    {formData.startDate && (
                      <div className="absolute right-12 top-1/2 transform -translate-y-1/2 text-white/60 text-xs pointer-events-none">
                        {formatDateToDisplay(formData.startDate)}
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    End Date *
                    <span className="ml-2 text-xs text-green-400">(Locked)</span>
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => handleInputChange('endDate', e.target.value)}
                      disabled
                      className="w-full h-[42px] px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white cursor-not-allowed opacity-60 [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:opacity-70"
                      required
                    />
                    {formData.endDate && (
                      <div className="absolute right-12 top-1/2 transform -translate-y-1/2 text-white/60 text-xs pointer-events-none">
                        {formatDateToDisplay(formData.endDate)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="mt-4 p-3 bg-gradient-to-r from-amber-900/40 to-black/10 border border-amber-500/20 rounded-xl">
                <p className="text-amber-400 text-xs font-semibold">
                  <strong>Note:</strong> Agreement expires whichever comes first, date or kilometers.
                </p>
              </div>
            </div>

            {/* STEP 6: NOTES */}
            <div className="bg-white/5 backdrop-blur-sm rounded-lg p-6 border border-white/10">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center border border-white/30">
                  <span className="text-white text-sm font-bold">6</span>
                </div>
                <h3 className="text-lg font-medium text-white flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Additional Notes
                </h3>
              </div>
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">Contract Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/40 resize-none"
                  placeholder="Add any additional notes or special terms for this contract..."
                  rows={4}
                />
                <p className="text-white/50 text-xs mt-2">These notes will appear on the contract PDF and be stored with the contract record.</p>
              </div>
            </div>

            {/* DEALER INFORMATION */}
            <div className="bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-white/10">
              <h3 className="text-sm font-medium text-white mb-4 flex items-center gap-2">
                <Building className="h-4 w-4" />
                Dealer Information
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    Dealer Name *
                    <span className="ml-2 text-xs text-green-400">(Locked)</span>
                  </label>
                  <input
                    type="text"
                    value={formData.dealerName}
                    onChange={(e) => handleInputChange('dealerName', e.target.value)}
                    disabled
                    className="w-full h-[42px] px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white cursor-not-allowed opacity-60"
                    placeholder="Enter dealer name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    Phone Number *
                    <span className="ml-2 text-xs text-green-400">(Locked)</span>
                  </label>
                  <input
                    type="tel"
                    value={formData.dealerPhone}
                    onChange={(e) => handleInputChange('dealerPhone', e.target.value)}
                    disabled
                    className="w-full h-[42px] px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white cursor-not-allowed opacity-60"
                    placeholder="Enter phone number"
                    required
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    Email Address *
                    <span className="ml-2 text-xs text-green-400">(Locked)</span>
                  </label>
                  <input
                    type="email"
                    value={formData.dealerEmail}
                    onChange={(e) => handleInputChange('dealerEmail', e.target.value)}
                    disabled
                    className="w-full h-[42px] px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white cursor-not-allowed opacity-60"
                    placeholder="Enter email address"
                    required
                  />
                </div>
              </div>
            </div>

          </div>

          {/* Footer with action buttons */}
          <div className="flex items-center justify-end gap-4 pt-6 border-t border-white/15 mt-6 flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 bg-white/5 hover:bg-white/10 backdrop-blur-sm border border-white/10 text-white text-sm rounded transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-gradient-to-r from-white to-gray-200 rounded text-black text-sm font-bold hover:from-gray-100 hover:to-white transition-all duration-200 shadow-lg disabled:opacity-40 disabled:cursor-not-allowed border border-white/30 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin w-4 h-4 border border-black/30 border-t-black rounded-full"></div>
                  Creating...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  {contractType === 'warranty' ? 'Create Warranty Contract' : 'Create ServiceCare Contract'}
                </>
              )}
            </button>
          </div>

        </form>
      </div>
      
      {/* Portal Dropdown - Rendered outside modal */}
      {showResults && typeof window !== 'undefined' && createPortal(
        <div 
          data-dropdown="search-results"
          className="fixed z-[99999] bg-black/95 backdrop-blur-md border border-white/20 rounded-lg shadow-2xl max-h-60 overflow-y-auto"
          style={{
            top: searchInputRef.current ? 
              searchInputRef.current.getBoundingClientRect().bottom + 4 + 'px' : 
              '0px',
            left: searchInputRef.current ? 
              searchInputRef.current.getBoundingClientRect().left + 'px' : 
              '0px',
            width: searchInputRef.current ? 
              searchInputRef.current.getBoundingClientRect().width + 'px' : 
              'auto'
          }}
        >
          {searchResults.length > 0 ? (
            searchResults.map((reservation) => (
              <button
                key={reservation.id}
                type="button"
                onClick={() => populateFromReservation(reservation)}
                className="w-full text-left p-3 hover:bg-white/10 border-b border-white/10 last:border-b-0 transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-medium text-white text-sm">{reservation.customer_name}</div>
                    <div className="text-white/60 text-xs">{reservation.vehicle_make_model}</div>
                                <div className="text-white/40 text-xs">
                                  {reservation.contact_no} • {reservation.email_address}
                                </div>
                                <div className="text-white/40 text-xs">
                                  {contractType === 'warranty' ? 'Warranty' : 'Service'}: AED {
                                    contractType === 'warranty' 
                                      ? (reservation.extended_warranty_price || 0)
                                      : (reservation.service_care_price || 0)
                                  }
                                </div>
                    <div className="text-white/40 text-xs">
                      {reservation.document_number || reservation.original_reservation_number} • 
                      {new Date(reservation.document_date).toLocaleDateString()}
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    reservation.document_type === 'invoice'
                      ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                      : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  }`}>
                    {reservation.document_type}
                  </span>
                </div>
              </button>
            ))
          ) : (
            <div className="p-3 text-center text-white/60 text-sm">
              {searchQuery.length < 2 ? 'Type at least 2 characters to search' : 'No reservations found'}
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
    </>
  );
}