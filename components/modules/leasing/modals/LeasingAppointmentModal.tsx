import React, { useState, useEffect } from "react";
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { supabase } from "@/lib/supabaseClient";

// Types for inventory (matching actual table structure)
interface InventoryVehicle {
  id: string;
  stock_number: string;
  make?: string;
  vehicle_model?: string;
  model_family?: string;
  model_year: number;
  body_style?: string;
  colour?: string; // exterior color
  interior_colour?: string;
  current_mileage_km?: number;
  monthly_lease_rate?: number;
  security_deposit?: number;
  buyout_price?: number;
  excess_mileage_charges?: number;
  status?: string;
  condition?: string;
  engine?: string;
  transmission?: string;
  fuel_type?: string;
  // Computed fields for display
  model?: string; // Will be derived from vehicle_model
  exterior_color?: string; // Will be derived from colour
  interior_color?: string; // Will be derived from interior_colour
  mileage_km?: number; // Will be derived from current_mileage_km
  engine_type?: string; // Will be derived from engine
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (customer: any) => void;
  mode?: 'create' | 'edit';
  existingCustomer?: any; // For edit mode
  forceShowAppointmentFields?: boolean; // Force show appointment fields (for prospect → appointment moves)
  targetColumn?: 'prospects' | 'appointments'; // Which column this modal was opened from
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

const timeSlots = generateTimeSlots();

// Debug: Log time slots to verify format (remove this in production)

export default function LeasingAppointmentModal({ 
  isOpen, 
  onClose, 
  onCreated, 
  mode = 'create', 
  existingCustomer,
  forceShowAppointmentFields = false,
  targetColumn
}: Props) {
  // Debug existing customer data
  // Form state - exact same as UV CRM
  const [customerName, setCustomerName] = useState(existingCustomer?.customer_name || "");
  const [customerEmail, setCustomerEmail] = useState(existingCustomer?.customer_email || "");
  const [countryCode, setCountryCode] = useState("+971");
  const [phoneNumber, setPhoneNumber] = useState(
    existingCustomer?.customer_phone ? 
      existingCustomer.customer_phone.replace("+971", "").replace(/\s+/g, "").trim() : 
      ""
  );
  const [appointmentDate, setAppointmentDate] = useState<Date | null>(
    existingCustomer?.appointment_date ? new Date(existingCustomer.appointment_date) : null
  );
  const [appointmentTime, setAppointmentTime] = useState(
    existingCustomer?.appointment_time ? 
      existingCustomer.appointment_time.substring(0, 5) : // Convert "08:00:00" to "08:00"
      ""
  );
  const [notes, setNotes] = useState(existingCustomer?.notes || "");
  
  // Inventory state
  const [inventory, setInventory] = useState<InventoryVehicle[]>([]);
  const [filteredInventory, setFilteredInventory] = useState<InventoryVehicle[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<InventoryVehicle | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [makeFilter, setMakeFilter] = useState("");
  const [yearFilter, setYearFilter] = useState("");
  const [loadingInventory, setLoadingInventory] = useState(false);
  
  // Drag and drop state
  const [isDragging, setIsDragging] = useState(false);
  const [draggedVehicle, setDraggedVehicle] = useState<InventoryVehicle | null>(null);
  
  // UI state
  const [saving, setSaving] = useState(false);

  // Update form fields when existingCustomer changes
  useEffect(() => {
    if (existingCustomer && mode === 'edit') {
      setCustomerName(existingCustomer.customer_name || "");
      setCustomerEmail(existingCustomer.customer_email || "");
      setPhoneNumber(
        existingCustomer.customer_phone ? 
          existingCustomer.customer_phone.replace("+971", "").replace(/\s+/g, "").trim() : 
          ""
      );
      setAppointmentDate(
        existingCustomer.appointment_date ? new Date(existingCustomer.appointment_date) : null
      );
      setAppointmentTime(
        existingCustomer.appointment_time ? 
          existingCustomer.appointment_time.substring(0, 5) : // Convert "08:00:00" to "08:00"
          ""
      );
      setNotes(existingCustomer.notes || "");
    } else if (mode === 'create') {
      // Reset form for create mode
      setCustomerName("");
      setCustomerEmail("");
      setPhoneNumber("");
      setAppointmentDate(null);
      setAppointmentTime("");
      setNotes("");
    }
  }, [existingCustomer, mode]);

  // Fetch inventory data
  const fetchInventory = async () => {
    setLoadingInventory(true);
    try {
      // Get only cars with 'inventory' status for appointment selection
      const { data, error } = await supabase
        .from('leasing_inventory')
        .select('*') // Get all columns to see what's available
        .eq('status', 'inventory') // Only show inventory status cars
        .order('created_at', { ascending: false })
        .limit(50); // Get up to 50 records

      if (error) {
        // Set some mock data for now so the UI still works
        const mockData = [
          {
            id: 'mock-1',
            stock_number: 'MOCK001',
            make: 'Mercedes-Benz',
            model: 'C-Class',
            model_year: 2024,
            body_style: 'Sedan',
            exterior_color: 'Black',
            interior_color: 'Black Leather',
            mileage_km: 5000,
            monthly_lease_rate: 2500,
            status: 'available' as const,
            condition: 'excellent' as const,
            engine_type: '2.0L Turbo',
            transmission: 'Automatic',
            fuel_type: 'Petrol'
          },
          {
            id: 'mock-2',
            stock_number: 'MOCK002',
            make: 'BMW',
            model: '320i',
            model_year: 2023,
            body_style: 'Sedan',
            exterior_color: 'White',
            interior_color: 'Black Leather',
            mileage_km: 12000,
            monthly_lease_rate: 2400,
            status: 'available' as const,
            condition: 'good' as const,
            engine_type: '2.0L Turbo',
            transmission: 'Automatic',
            fuel_type: 'Petrol'
          }
        ];
        setInventory(mockData);
        setFilteredInventory(mockData);
        return;
      }
      // Transform data to match our interface
      const transformedData = data?.map((car: any) => ({
        ...car,
        // Map actual column names to expected interface
        model: car.vehicle_model || car.model || car.model_family || 'Unknown Model',
        exterior_color: car.colour || car.exterior_color || 'Unknown Color',
        interior_color: car.interior_colour || car.interior_color || 'Unknown Interior',
        mileage_km: car.current_mileage_km || car.mileage_km || 0,
        engine_type: car.engine || car.engine_type || 'Unknown Engine',
        make: car.make || 'Mercedes-Benz' // Default to Mercedes if not specified
      })) || [];
      
      // All cars are already filtered to 'inventory' status from the query
      setInventory(transformedData);
      setFilteredInventory(transformedData);
    } catch (error) {
    } finally {
      setLoadingInventory(false);
    }
  };

  // Filter inventory based on search and filters
  useEffect(() => {
    let filtered = inventory;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(vehicle =>
        vehicle.make?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vehicle.model?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vehicle.stock_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vehicle.exterior_color?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Make filter
    if (makeFilter) {
      filtered = filtered.filter(vehicle => vehicle.make === makeFilter);
    }

    // Year filter
    if (yearFilter) {
      filtered = filtered.filter(vehicle => vehicle.model_year?.toString() === yearFilter);
    }

    // Status filter removed - all cars are already 'inventory' status

    setFilteredInventory(filtered);
  }, [inventory, searchTerm, makeFilter, yearFilter]);

  // Fetch inventory when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchInventory();
    }
  }, [isOpen]);

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, vehicle: InventoryVehicle) => {
    setDraggedVehicle(vehicle);
    setIsDragging(true);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', vehicle.id);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    setDraggedVehicle(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (draggedVehicle) {
      setSelectedVehicle(draggedVehicle);
    }
    
    setIsDragging(false);
    setDraggedVehicle(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      // Validate and format appointment time
      const formattedTime = appointmentTime && appointmentTime.trim() !== '' ? appointmentTime.trim() : null;
      
      // Determine status based on appointment details and current context
      const hasAppointmentDetails = appointmentDate && formattedTime;
      
      // If editing a prospect or creating from prospects column, keep as prospects unless appointment details are provided
      // If editing an appointment or creating from appointments column, require appointment details
      let leaseStatus: 'prospects' | 'appointments';
      
      if (mode === 'edit' && existingCustomer?.status === 'prospects') {
        // Editing a prospect - only move to appointments if forceShowAppointmentFields is true (dragged from prospects to appointments)
        leaseStatus = forceShowAppointmentFields ? 'appointments' : 'prospects';
      } else if (mode === 'edit' && existingCustomer?.status === 'appointments') {
        // Editing an appointment - keep as appointment even if details are removed (they can manually move back)
        leaseStatus = 'appointments';
      } else {
        // Creating new - determine by appointment details
        leaseStatus = hasAppointmentDetails ? 'appointments' : 'prospects';
      }
      
      const customerData = {
        customer_name: customerName.toUpperCase(),
        customer_email: customerEmail,
        customer_phone: `${countryCode} ${phoneNumber}`,
        appointment_date: appointmentDate ? appointmentDate.toISOString().split('T')[0] : null,
        appointment_time: formattedTime,
        notes: notes,
        lease_status: leaseStatus,
        selected_vehicle_id: selectedVehicle?.id || null,
        
        // Copy vehicle data from inventory when vehicle is selected
        vehicle_model_year: selectedVehicle?.model_year || null,
        vehicle_model: selectedVehicle?.vehicle_model || null,
        vehicle_exterior_colour: selectedVehicle?.colour || null,
        vehicle_interior_colour: selectedVehicle?.interior_colour || null,
        vehicle_monthly_lease_rate: selectedVehicle?.monthly_lease_rate || null,
        vehicle_security_deposit: selectedVehicle?.security_deposit || null,
        vehicle_buyout_price: selectedVehicle?.buyout_price || null,
        excess_mileage_charges: selectedVehicle?.excess_mileage_charges || null,
        
        updated_at: new Date().toISOString()
      };
      let result;
      if (mode === 'edit' && existingCustomer) {
        // Update existing customer
        result = await supabase
          .from('leasing_customers')
          .update(customerData)
          .eq('id', existingCustomer.id)
          .select()
          .single();
      } else {
        // Create new customer
        result = await supabase
          .from('leasing_customers')
          .insert({
            ...customerData,
            created_at: new Date().toISOString()
          })
          .select()
          .single();
      }

      if (result.error) {
        alert(`Failed to save customer: ${result.error.message || 'Unknown error'}`);
        return;
      }
      onCreated(result.data);
      onClose();
      
      // Reset form only in create mode
      if (mode === 'create') {
      setCustomerName("");
      setCustomerEmail("");
      setCountryCode("+971");
      setPhoneNumber("");
      setAppointmentDate(null);
      setAppointmentTime("");
      setNotes("");
      }

    } catch (error) {
      alert('Failed to save customer. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <style jsx global>{`
        /* Universal placeholder styling for ALL form fields */
        input::placeholder,
        input::-webkit-input-placeholder,
        input::-moz-placeholder,
        input:-ms-input-placeholder,
        textarea::placeholder,
        textarea::-webkit-input-placeholder,
        textarea::-moz-placeholder,
        textarea:-ms-input-placeholder,
        select option[value=""] {
          color: #9ca3af !important;
          opacity: 1 !important;
        }
        
        /* DatePicker specific targeting */
        .datepicker-placeholder::placeholder,
        .datepicker-placeholder::-webkit-input-placeholder,
        .datepicker-placeholder::-moz-placeholder,
        .datepicker-placeholder:-ms-input-placeholder,
        .react-datepicker__input-container input::placeholder,
        .react-datepicker__input-container input::-webkit-input-placeholder,
        .react-datepicker__input-container input::-moz-placeholder,
        .react-datepicker__input-container input:-ms-input-placeholder {
          color: #9ca3af !important;
          opacity: 1 !important;
        }
        
        /* Select dropdown placeholder option styling */
        select option[value=""]:first-child {
          color: #9ca3af !important;
        }
        /* Override browser autofill styling */
        input:-webkit-autofill,
        input:-webkit-autofill:hover,
        input:-webkit-autofill:focus,
        input:-webkit-autofill:active {
          -webkit-box-shadow: 0 0 0 30px rgba(0, 0, 0, 0.2) inset !important;
          -webkit-text-fill-color: white !important;
          background-color: rgba(0, 0, 0, 0.2) !important;
        }
        /* Ensure all inputs have consistent styling */
        input[type="email"],
        input[type="text"],
        input[type="tel"] {
          background-color: rgba(0, 0, 0, 0.2) !important;
          color: white !important;
        }
        /* Date picker consistent styling */
        .react-datepicker__input-container input {
          background-color: rgba(0, 0, 0, 0.2) !important;
          color: white !important;
        }
        /* Consistent focus styling for all form elements */
        input:focus,
        textarea:focus,
        select:focus {
          outline: none !important;
          box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.3) !important;
          border-color: rgba(255, 255, 255, 0.3) !important;
        }
        /* Ensure all form elements have same base styling */
        input,
        textarea,
        select {
          background-color: rgba(0, 0, 0, 0.2) !important;
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
          color: white !important;
        }
        
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
      `}</style>
      <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
        <div className="bg-black/40 backdrop-blur-xl rounded-2xl max-w-7xl w-full h-[85vh] overflow-hidden flex flex-col border border-white/10 shadow-2xl" style={{ boxShadow: '0 0 60px rgba(255, 255, 255, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.1)' }}>
        {/* Enhanced Header with Status Badge and Progress */}
        <div className="p-4 border-b border-white/5 bg-gradient-to-r from-white/5 to-white/10 backdrop-blur-sm">
          {/* Top Row: Status Badge and Progress */}
          <div className="flex items-center justify-between mb-3">
            {/* Status Badge */}
            <div className="px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wide border bg-white/10 backdrop-blur-sm border-white/20 text-gray-200">
              {existingCustomer?.status === 'prospects' ? '● Prospect' : 
               existingCustomer?.status === 'appointments' ? '● Appointment' : 
               '● New Customer'}
            </div>
            
            {/* Progress Indicator */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-white/50 uppercase tracking-wide">Progress</span>
              <div className="flex items-center gap-1">
                <div className={`w-2 h-2 rounded-full ${
                  existingCustomer?.status ? 'bg-white/60' : 'bg-white/60'
                }`} />
                <div className={`w-6 h-0.5 ${
                  existingCustomer?.status === 'appointments' || existingCustomer?.status === 'contracts_drafted' || existingCustomer?.status === 'active_leases'
                    ? 'bg-white/60' : 'bg-white/20'
                }`} />
                <div className={`w-2 h-2 rounded-full ${
                  existingCustomer?.status === 'appointments' || existingCustomer?.status === 'contracts_drafted' || existingCustomer?.status === 'active_leases'
                    ? 'bg-white/60' : 'bg-white/20'
                }`} />
                <div className={`w-6 h-0.5 ${
                  existingCustomer?.status === 'contracts_drafted' || existingCustomer?.status === 'active_leases'
                    ? 'bg-white/60' : 'bg-white/20'
                }`} />
                <div className={`w-2 h-2 rounded-full ${
                  existingCustomer?.status === 'contracts_drafted' || existingCustomer?.status === 'active_leases'
                    ? 'bg-white/60' : 'bg-white/20'
                }`} />
                <div className={`w-6 h-0.5 ${
                  existingCustomer?.status === 'active_leases' ? 'bg-white/60' : 'bg-white/20'
                }`} />
                <div className={`w-2 h-2 rounded-full ${
                  existingCustomer?.status === 'active_leases' ? 'bg-white/60' : 'bg-white/20'
                }`} />
              </div>
            </div>
          </div>
          
          {/* Title Row */}
          <div>
            <h2 className="text-xl font-semibold text-white">
              {mode === 'edit' 
                ? (existingCustomer?.status === 'prospects' ? 'Edit Prospect' : 'Edit Appointment')
                : 'New Leasing Customer'
              }
              {existingCustomer?.customer_name && (
                <span className="text-white/60 font-normal"> - {existingCustomer.customer_name}</span>
              )}
            </h2>
            <p className="text-sm text-white/60 mt-1">
              {mode === 'edit' 
                ? (existingCustomer?.status === 'prospects' 
                    ? 'Update prospect details and manage vehicle interest' 
                    : 'Update customer and appointment information')
                : 'Add customer details and optionally schedule an appointment'
              }
            </p>
          </div>
          
          {/* Stage Labels */}
          <div className="flex items-center justify-between mt-3 text-xs text-white/40">
            <span className={existingCustomer?.status === 'prospects' || !existingCustomer?.status ? 'text-white/80' : ''}>
              Prospect
            </span>
            <span className={existingCustomer?.status === 'appointments' ? 'text-white/80' : ''}>
              Appointment
            </span>
            <span className={existingCustomer?.status === 'contracts_drafted' ? 'text-white/80' : ''}>
              Contract
            </span>
            <span className={existingCustomer?.status === 'active_leases' ? 'text-white/80' : ''}>
              Active Lease
            </span>
          </div>
        </div>
        
        {/* Action Buttons Bar */}
        <div className="px-4 py-3 border-b border-white/5 bg-white/5 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-sm text-white/60">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {mode === 'edit' ? 'Editing customer information' : 'Creating new customer record'}
            </div>
            
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-all border border-white/10"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="leasing-form"
                disabled={saving}
                className="px-6 py-2 font-medium rounded-lg hover:shadow-lg transition-all bg-gradient-to-br from-gray-200 via-gray-100 to-gray-400 text-black"
              >
                {saving ? 'Saving...' : mode === 'edit' ? 'Update Customer' : 'Create Customer'}
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-1 min-h-0">
          {/* Left Column - Customer Form */}
          <div className="flex-1 p-4 overflow-y-auto border-r border-white/10 max-h-full flex flex-col">
            <form id="leasing-form" onSubmit={handleSubmit} className="space-y-3 flex-1 flex flex-col">
            
            {/* Customer Information */}
            <div className="bg-white/5 backdrop-blur-md rounded-xl p-4 border border-white/10 mb-3 shadow-lg" style={{ boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.1)' }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold text-white flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-white/10 backdrop-blur-sm text-white/80">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  Customer Information
                </h3>
                <div className="text-xs text-white/70 bg-white/10 backdrop-blur-sm px-2 py-1 rounded-full">
                  Required
                </div>
              </div>
              <div className="space-y-4">
                {/* Customer Name */}
                <div>
                  <label className="block text-xs font-medium text-white mb-1 flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Full Name
                  </label>
                  <input
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value.toUpperCase())}
                    className="w-full px-3 py-3 text-base rounded-lg bg-black/20 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/30 transition-all uppercase h-12"
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
                  <div className="flex gap-2">
                    <input
                      value={countryCode}
                      onChange={e => setCountryCode(e.target.value)}
                      className="px-3 py-3 text-base rounded-lg bg-black/20 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/30 transition-all font-mono w-24 h-12"
                      placeholder="+971"
                      required
                    />
                    <input
                      value={phoneNumber}
                      onChange={e => setPhoneNumber(e.target.value.toUpperCase())}
                      className="flex-1 px-3 py-3 text-base rounded-lg bg-black/20 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/30 transition-all uppercase h-12"
                      placeholder="Phone number"
                      required
                    />
                  </div>
                </div>

                {/* Customer Email */}
                <div>
                  <label className="block text-xs font-medium text-white mb-1 flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                    </svg>
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={e => setCustomerEmail(e.target.value)}
                    className="w-full px-3 py-3 text-base rounded-lg bg-black/20 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/30 transition-all h-12"
                    placeholder="customer@example.com"
                    autoComplete="off"
                  />
                </div>

              </div>
            </div>

            {/* Appointment Details - Show for appointments column or when forced */}
            {forceShowAppointmentFields || 
             (mode === 'edit' && existingCustomer?.status === 'appointments') || 
             (mode === 'create' && targetColumn === 'appointments') ? (
            <div className="bg-white/5 backdrop-blur-md rounded-xl p-4 border border-white/10 mb-3 shadow-lg" style={{ boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.1)' }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold text-white flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-white/10 backdrop-blur-sm text-white/80">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  Appointment Details
                </h3>
                <div className="text-xs text-white/70 bg-white/10 backdrop-blur-sm px-2 py-1 rounded-full">
                  Schedule
                </div>
              </div>
              <div className="space-y-4">
                {/* Date and Time */}
                <div className="grid grid-cols-2 gap-3">
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
                      placeholderText="Select date"
                      popperPlacement="top-start"
                      className="w-full px-3 py-3 text-base rounded-lg bg-black/20 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/30 transition-all h-12 datepicker-placeholder"
                      wrapperClassName="w-full"
                      minDate={new Date()}
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
                      value={appointmentTime}
                      onChange={e => {
                        setAppointmentTime(e.target.value);
                      }}
                      className="w-full px-3 py-3 text-base rounded-lg bg-black/20 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/30 transition-all appearance-none h-12"
                      style={{ backgroundImage: 'none' }}
                    >
                      <option value="" style={{ backgroundColor: '#1f2937', color: '#9ca3af' }}>Select time</option>
                      {timeSlots.map(slot => (
                        <option key={slot.value} value={slot.value} style={{ backgroundColor: '#1f2937', color: 'white' }}>
                          {slot.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
            ) : null}

            {/* Selected Car Drop Zone */}
            <div className="bg-white/5 backdrop-blur-md rounded-xl p-4 border border-white/10 mb-3 shadow-lg" style={{ boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.1)' }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold text-white flex items-center gap-2">
                  <div className={`p-1.5 rounded-lg ${
                    selectedVehicle 
                      ? 'bg-white/15 backdrop-blur-sm text-white/90'
                      : 'bg-white/10 backdrop-blur-sm text-white/80'
                  }`}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  Vehicle Selection
                </h3>
                <div className={`text-xs px-2 py-1 rounded-full ${
                  selectedVehicle 
                    ? 'text-white/90 bg-white/15 backdrop-blur-sm'
                    : 'text-white/70 bg-white/10 backdrop-blur-sm'
                }`}>
                  {selectedVehicle ? 'Selected' : 'Optional'}
                </div>
              </div>
              
              {/* Drop Zone */}
              {selectedVehicle ? (
                <div className="border-2 border-solid border-white/30 rounded-lg p-3 bg-white/10 min-h-[100px] flex flex-col justify-between">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="text-white font-medium text-sm truncate">
                        {selectedVehicle.model_year} {selectedVehicle.make} {selectedVehicle.model}
                      </h4>
                      <p className="text-white/60 text-xs truncate">
                        {selectedVehicle.body_style} • {selectedVehicle.exterior_color} • {selectedVehicle.mileage_km?.toLocaleString() || 'N/A'} km
                      </p>
                    </div>
                    <div className="text-right ml-2 flex-shrink-0">
                      <p className="text-white text-xs font-medium">
                        AED {selectedVehicle.monthly_lease_rate?.toLocaleString() || 'N/A'}/mo
                      </p>
                      <button
                        onClick={() => setSelectedVehicle(null)}
                        className="text-white/60 hover:text-white/80 text-xs mt-1"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                  <div className="text-white/50 text-xs truncate">
                    Stock: {selectedVehicle.stock_number}
                    {selectedVehicle.engine_type && (
                      <span className="ml-2">
                        {selectedVehicle.engine_type} • {selectedVehicle.transmission}
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div 
                  className={`border-2 border-dashed rounded-lg p-3 text-center transition-all min-h-[100px] flex items-center justify-center ${
                    isDragging 
                      ? 'border-white/60 bg-white/15' 
                      : 'border-white/20 bg-white/5 hover:border-white/40'
                  }`}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                >
                  <div className="flex flex-col items-center gap-2">
                    <svg className="w-8 h-8 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    <div>
                      <p className="text-white/60 text-sm font-medium">
                        {isDragging ? 'Drop vehicle here' : 'Drag a vehicle here'}
                      </p>
                      <p className="text-white/40 text-xs">
                        {isDragging ? 'Release to select' : 'Or click from the list on the right'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="bg-white/5 backdrop-blur-md rounded-xl p-4 border border-white/10 shadow-lg flex-1 flex flex-col" style={{ boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.1)' }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold text-white flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-white/10 backdrop-blur-sm text-white/80">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </div>
                  Additional Notes
                </h3>
                <div className="text-xs text-white/70 bg-white/10 backdrop-blur-sm px-2 py-1 rounded-full">
                  Optional
                </div>
              </div>
              <div className="flex-1 flex flex-col">
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full px-3 py-3 text-base rounded-lg bg-black/20 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/30 transition-all resize-none flex-1 min-h-[80px]"
                  placeholder="Add any additional notes about the customer or appointment..."
                />
              </div>
            </div>

          </form>
          </div>

          {/* Right Column - Car Inventory */}
          <div className="w-96 p-4 bg-white/5 backdrop-blur-sm overflow-y-auto border-l border-white/5 max-h-full">
            <div className="mb-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-white/10 backdrop-blur-sm text-white/80">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  Available Inventory
                </h3>
                <div className="text-xs text-white/70 bg-white/10 backdrop-blur-sm px-2 py-1 rounded-full">
                  {filteredInventory.length} Vehicles
                </div>
              </div>
              <p className="text-sm text-white/60 mb-3">
                Drag a vehicle to the left panel or click to select
              </p>
            </div>

            {/* Search and Filters */}
            <div className="mb-4 space-y-3">
              <input
                type="text"
                placeholder="Search cars..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg bg-black/20 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/30 transition-all"
              />
              
              <div className="grid grid-cols-2 gap-2">
                <select 
                  value={makeFilter}
                  onChange={(e) => setMakeFilter(e.target.value)}
                  className="px-3 py-2 text-sm rounded-lg bg-black/20 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/30 transition-all"
                >
                  <option value="">All Makes</option>
                  {Array.from(new Set(inventory.map(v => v.make))).map(make => (
                    <option key={make} value={make}>{make}</option>
                  ))}
                </select>
                
                <select 
                  value={yearFilter}
                  onChange={(e) => setYearFilter(e.target.value)}
                  className="px-3 py-2 text-sm rounded-lg bg-black/20 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/30 transition-all"
                >
                  <option value="">All Years</option>
                  {Array.from(new Set(inventory.map(v => v.model_year))).sort((a, b) => b - a).map(year => (
                    <option key={year} value={year.toString()}>{year}</option>
                  ))}
                </select>
              </div>
              
              <div className="px-3 py-2 text-sm rounded-lg bg-black/20 border border-white/10 text-white/60 text-center">
                Inventory Only
              </div>
            </div>

            {/* Car List */}
            <div className="space-y-3">
              {loadingInventory ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-white/60 text-sm">Loading vehicles...</div>
                </div>
              ) : filteredInventory.length === 0 ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-white/60 text-sm">No vehicles found</div>
                </div>
              ) : (
                filteredInventory.map((vehicle) => (
                  <div 
                    key={vehicle.id}
                    draggable
                    className={`bg-white/10 rounded-lg p-3 border border-white/10 cursor-grab hover:bg-white/15 transition-all ${
                      draggedVehicle?.id === vehicle.id ? 'opacity-50' : ''
                    }`}
                    onClick={() => setSelectedVehicle(vehicle)}
                    onDragStart={(e) => handleDragStart(e, vehicle)}
                    onDragEnd={handleDragEnd}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="text-white font-medium text-sm">
                          {vehicle.model_year} {vehicle.make} {vehicle.model}
                        </h4>
                        <p className="text-white/60 text-xs">
                          {vehicle.body_style} • {vehicle.exterior_color} • {vehicle.mileage_km?.toLocaleString() || 'N/A'} km
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-white text-sm font-medium">
                          AED {vehicle.monthly_lease_rate?.toLocaleString() || 'N/A'}/mo
                        </p>
                        <span className="inline-block px-2 py-1 text-xs rounded bg-white/20 text-white/70">
                          Inventory
                        </span>
                      </div>
                    </div>
                    <div className="text-white/50 text-xs">
                      Stock: {vehicle.stock_number}
                    </div>
                    {vehicle.engine_type && (
                      <div className="text-white/40 text-xs mt-1">
                        {vehicle.engine_type} • {vehicle.transmission} • {vehicle.fuel_type}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
        </div>
      </div>
    </>
  );
}