import React, { useState, useEffect } from "react";
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { supabase } from "@/lib/supabaseClient";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (customer: any) => void;
  mode?: 'create' | 'edit';
  existingCustomer?: any; // For edit mode
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

export default function LeasingAppointmentModal({ 
  isOpen, 
  onClose, 
  onCreated, 
  mode = 'create', 
  existingCustomer 
}: Props) {
  // Form state - exact same as UV CRM
  const [customerName, setCustomerName] = useState(existingCustomer?.customer_name || "");
  const [customerEmail, setCustomerEmail] = useState(existingCustomer?.customer_email || "");
  const [countryCode, setCountryCode] = useState("+971");
  const [phoneNumber, setPhoneNumber] = useState(existingCustomer?.customer_phone?.replace("+971", "").trim() || "");
  const [appointmentDate, setAppointmentDate] = useState<Date | null>(
    existingCustomer?.appointment_date ? new Date(existingCustomer.appointment_date) : null
  );
  const [appointmentTime, setAppointmentTime] = useState(existingCustomer?.appointment_time || "");
  const [notes, setNotes] = useState(existingCustomer?.notes || "");
  
  // UI state
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const customerData = {
        customer_name: customerName.toUpperCase(),
        customer_email: customerEmail,
        customer_phone: `${countryCode} ${phoneNumber}`,
        appointment_date: appointmentDate ? appointmentDate.toISOString().split('T')[0] : null,
        appointment_time: appointmentTime,
        notes: notes,
        lease_status: 'appointments',
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
        console.error('Error saving customer:', result.error);
        alert('Failed to save customer. Please try again.');
        return;
      }

      console.log('Customer saved successfully:', result.data);
      onCreated(result.data);
      onClose();
      
      // Reset form
      setCustomerName("");
      setCustomerEmail("");
      setCountryCode("+971");
      setPhoneNumber("");
      setAppointmentDate(null);
      setAppointmentTime("");
      setNotes("");

    } catch (error) {
      console.error('Error saving customer:', error);
      alert('Failed to save customer. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <style jsx global>{`
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
      `}</style>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-black border border-white/20 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white">
                {mode === 'edit' ? 'Edit Appointment' : 'New Leasing Appointment'}
              </h2>
              <p className="text-xs text-white/60">
                {mode === 'edit' 
                  ? 'Update customer information and appointment details' 
                  : 'Create a new leasing appointment'
                }
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white/60 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 p-6">
          {/* Main Form */}
          <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-y-auto pr-1">
            
            {/* Customer Information */}
            <div className="bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-white/10 mb-4">
              <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Customer Information
              </h3>
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
                    className="w-full px-3 py-3 text-base rounded-lg bg-black/20 border border-white/10 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/30 transition-all uppercase h-12"
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
                      className="flex-1 px-3 py-3 text-base rounded-lg bg-black/20 border border-white/10 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/30 transition-all uppercase h-12"
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
                    className="w-full px-3 py-3 text-base rounded-lg bg-black/20 border border-white/10 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/30 transition-all h-12"
                    placeholder="customer@example.com"
                    autoComplete="off"
                  />
                </div>

              </div>
            </div>

            {/* Appointment Details */}
            <div className="bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-white/10 mb-4">
              <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Appointment Details
              </h3>
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
                      popperPlacement="top-start"
                      className="w-full px-3 py-3 text-base rounded-lg bg-black/20 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/30 transition-all h-12"
                      wrapperClassName="w-full"
                      minDate={new Date()}
                      required
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
                      onChange={e => setAppointmentTime(e.target.value)}
                      className="w-full px-3 py-3 text-base rounded-lg bg-black/20 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/30 transition-all appearance-none h-12"
                      style={{ backgroundImage: 'none' }}
                      required
                    >
                      <option value="">Select time</option>
                      {timeSlots.map(slot => (
                        <option key={slot.value} value={slot.value}>
                          {slot.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>


            {/* Notes */}
            <div className="bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-white/10 mb-6">
              <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Notes
              </h3>
              <div>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full px-3 py-3 text-base rounded-lg bg-black/20 border border-white/10 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/30 transition-all resize-none"
                  placeholder="Add any additional notes about the customer or appointment..."
                  rows={4}
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-6 border-t border-white/10">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-all h-12"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-3 bg-gradient-to-br from-gray-200 via-gray-100 to-gray-400 text-black font-medium rounded-lg hover:shadow-lg transition-all h-12"
              >
                {saving ? 'Saving...' : mode === 'edit' ? 'Update Appointment' : 'Create Appointment'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
    </>
  );
}