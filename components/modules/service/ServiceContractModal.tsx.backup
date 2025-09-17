"use client";
import { useState } from 'react';
import { X, FileText, User, Building, Car, Calendar, Save } from 'lucide-react';

interface ServiceContractModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ServiceContractData) => void;
}

export interface ServiceContractData {
  referenceNo: string;
  serviceType: 'standard' | 'premium';
  // Customer Information
  ownerName: string;
  mobileNo: string;
  email: string;
  // Dealer Information (pre-filled)
  dealerName: string;
  dealerPhone: string;
  dealerEmail: string;
  // Vehicle Information
  vin: string;
  make: string;
  model: string;
  modelYear: string;
  currentOdometer: string;
  // Duration
  startDate: string;
  endDate: string;
  cutOffKm: string;
  // Financial Information
  invoiceAmount: string;
}

export default function ServiceContractModal({ isOpen, onClose, onSubmit }: ServiceContractModalProps) {
  // Generate reference number (SC + 5 random digits)
  const generateReferenceNo = () => {
    const randomNumber = Math.floor(10000 + Math.random() * 90000);
    return `SC${randomNumber}`;
  };

  const [formData, setFormData] = useState<ServiceContractData>({
    referenceNo: generateReferenceNo(),
    serviceType: 'standard',
    // Customer Information
    ownerName: '',
    mobileNo: '',
    email: '',
    // Dealer Information (pre-filled)
    dealerName: 'SilberArrows',
    dealerPhone: '+971 4 380 5515',
    dealerEmail: 'service@silberarrows.com',
    // Vehicle Information
    vin: '',
    make: '',
    model: '',
    modelYear: '',
    currentOdometer: '',
    // Duration
    startDate: '',
    endDate: '',
    cutOffKm: '',
    // Financial Information
    invoiceAmount: ''
  });

  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await onSubmit(formData);
      onClose();
      // Reset form
      setFormData({
        ...formData,
        referenceNo: generateReferenceNo(),
        serviceType: 'standard',
        ownerName: '',
        mobileNo: '',
        email: '',
        vin: '',
        make: '',
        model: '',
        modelYear: '',
        currentOdometer: '',
        startDate: '',
        endDate: '',
        cutOffKm: '',
        invoiceAmount: ''
      });
    } catch (error) {
      console.error('Error creating contract:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof ServiceContractData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-2">
      <div className="bg-gradient-to-br from-black/60 via-black/40 to-black/60 backdrop-blur-2xl border-2 border-white/20 shadow-2xl rounded-2xl p-6 w-full max-w-xl md:max-w-3xl lg:max-w-5xl text-xs relative max-h-[95vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-2xl leading-none text-white/70 hover:text-white transition-colors duration-200"
        >
          ×
        </button>
        
        <div className="flex items-start justify-between mb-6 pr-8 gap-4 flex-wrap">
          <div className="flex flex-col">
            <h2 className="text-xl font-bold text-white">New ServiceCare Agreement</h2>
            <div className="text-white/70 text-sm mt-2">
              <span className="text-white/50">Reference:</span> <span className="font-mono font-semibold">{formData.referenceNo}</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          <div className="flex flex-col gap-6 max-h-[75vh] overflow-y-auto space-y-6 uppercase">
            
            {/* CUSTOMER INFORMATION */}
            <div className="border border-white/15 rounded-md p-4 bg-white/5">
              <h3 className="text-white text-[13px] font-bold mb-4 uppercase tracking-wide">Customer Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-white/60 text-[11px] font-medium uppercase tracking-wide">Owner's Name *</label>
                  <input
                    type="text"
                    value={formData.ownerName}
                    onChange={(e) => setFormData({ ...formData, ownerName: e.target.value.toUpperCase() })}
                    className="w-full px-4 py-2 bg-black/40 border border-white/20 rounded-full text-white text-xs placeholder:text-white/40 focus:outline-none focus:border-silver-400 focus:ring-2 focus:ring-silver-400/20 transition-all duration-200"
                    placeholder="Enter customer name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-white/60 text-[11px] font-medium uppercase tracking-wide">Mobile Number *</label>
                  <input
                    type="tel"
                    value={formData.mobileNo}
                    onChange={(e) => setFormData({ ...formData, mobileNo: e.target.value })}
                    className="w-full px-4 py-2 bg-black/40 border border-white/20 rounded-full text-white text-xs placeholder:text-white/40 focus:outline-none focus:border-silver-400 focus:ring-2 focus:ring-silver-400/20 transition-all duration-200"
                    placeholder="Enter mobile number"
                    required
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="block text-white/60 text-[11px] font-medium uppercase tracking-wide">Email Address *</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-2 bg-black/40 border border-white/20 rounded-full text-white text-xs placeholder:text-white/40 focus:outline-none focus:border-silver-400 focus:ring-2 focus:ring-silver-400/20 transition-all duration-200"
                    placeholder="Enter email address"
                    required
                  />
                </div>
              </div>
            </div>

            {/* SERVICE TYPE */}
            <div className="border border-white/15 rounded-md p-4 bg-white/5">
              <h3 className="text-white text-[13px] font-bold mb-4 uppercase tracking-wide">Service Type</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-white/60 text-[11px] font-medium uppercase tracking-wide">Contract Type *</label>
                  <select
                    value={formData.serviceType}
                    onChange={(e) => setFormData({ ...formData, serviceType: e.target.value as 'standard' | 'premium' })}
                    className="w-full px-4 py-2 bg-black/40 border border-white/20 rounded-full text-white text-xs focus:outline-none focus:border-silver-400 focus:ring-2 focus:ring-silver-400/20 transition-all duration-200"
                    required
                  >
                    <option value="standard">Standard (2 Years)</option>
                    <option value="premium">Premium (4 Years)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="block text-white/60 text-[11px] font-medium uppercase tracking-wide">Coverage Period</label>
                  <div className="flex items-center px-4 py-2 bg-black/20 border border-white/10 rounded-full text-white/70 text-xs">
                    {formData.serviceType === 'standard' ? '24 Months Coverage' : '48 Months Coverage'}
                  </div>
                </div>
              </div>
            </div>

            {/* DEALER INFORMATION */}
            <div className="border border-white/15 rounded-md p-4 bg-white/5">
              <h3 className="text-white text-[13px] font-bold mb-4 uppercase tracking-wide">Dealer Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-white/60 text-[11px] font-medium uppercase tracking-wide">Dealer Name</label>
                  <input
                    type="text"
                    value={formData.dealerName}
                    onChange={(e) => setFormData({ ...formData, dealerName: e.target.value })}
                    className="w-full px-4 py-2 bg-black/40 border border-white/20 rounded-full text-white text-xs placeholder:text-white/40 focus:outline-none focus:border-silver-400 focus:ring-2 focus:ring-silver-400/20 transition-all duration-200"
                    placeholder="Enter dealer name"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-white/60 text-[11px] font-medium uppercase tracking-wide">Phone Number</label>
                  <input
                    type="tel"
                    value={formData.dealerPhone}
                    onChange={(e) => setFormData({ ...formData, dealerPhone: e.target.value })}
                    className="w-full px-4 py-2 bg-black/40 border border-white/20 rounded-full text-white text-xs placeholder:text-white/40 focus:outline-none focus:border-silver-400 focus:ring-2 focus:ring-silver-400/20 transition-all duration-200"
                    placeholder="Enter phone number"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="block text-white/60 text-[11px] font-medium uppercase tracking-wide">Email Address</label>
                  <input
                    type="email"
                    value={formData.dealerEmail}
                    onChange={(e) => setFormData({ ...formData, dealerEmail: e.target.value })}
                    className="w-full px-4 py-2 bg-black/40 border border-white/20 rounded-full text-white text-xs placeholder:text-white/40 focus:outline-none focus:border-silver-400 focus:ring-2 focus:ring-silver-400/20 transition-all duration-200"
                    placeholder="Enter email address"
                  />
                </div>
              </div>
            </div>

            {/* VEHICLE INFORMATION */}
            <div className="border border-white/15 rounded-md p-4 bg-white/5">
              <h3 className="text-white text-[13px] font-bold mb-4 uppercase tracking-wide">Vehicle Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2 md:col-span-2">
                  <label className="block text-white/60 text-[11px] font-medium uppercase tracking-wide">VIN Number *</label>
                  <input
                    type="text"
                    value={formData.vin}
                    onChange={(e) => setFormData({ ...formData, vin: e.target.value.toUpperCase() })}
                    className="w-full px-4 py-2 bg-black/40 border border-white/20 rounded-full text-white text-xs placeholder:text-white/40 focus:outline-none focus:border-silver-400 focus:ring-2 focus:ring-silver-400/20 transition-all duration-200 font-mono"
                    placeholder="Enter VIN number"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-white/60 text-[11px] font-medium uppercase tracking-wide">Make *</label>
                  <input
                    type="text"
                    value={formData.make}
                    onChange={(e) => setFormData({ ...formData, make: e.target.value.toUpperCase() })}
                    className="w-full px-4 py-2 bg-black/40 border border-white/20 rounded-full text-white text-xs placeholder:text-white/40 focus:outline-none focus:border-silver-400 focus:ring-2 focus:ring-silver-400/20 transition-all duration-200"
                    placeholder="Make"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-white/60 text-[11px] font-medium uppercase tracking-wide">Model *</label>
                  <input
                    type="text"
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value.toUpperCase() })}
                    className="w-full px-4 py-2 bg-black/40 border border-white/20 rounded-full text-white text-xs placeholder:text-white/40 focus:outline-none focus:border-silver-400 focus:ring-2 focus:ring-silver-400/20 transition-all duration-200"
                    placeholder="Model"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-white/60 text-[11px] font-medium uppercase tracking-wide">Model Year *</label>
                  <input
                    type="number"
                    min="1980"
                    max="2030"
                    value={formData.modelYear}
                    onChange={(e) => setFormData({ ...formData, modelYear: e.target.value.toUpperCase() })}
                    className="w-full px-4 py-2 bg-black/40 border border-white/20 rounded-full text-white text-xs placeholder:text-white/40 focus:outline-none focus:border-silver-400 focus:ring-2 focus:ring-silver-400/20 transition-all duration-200"
                    placeholder="Year"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-white/60 text-[11px] font-medium uppercase tracking-wide">Current Odometer *</label>
                  <input
                    type="text"
                    value={formData.currentOdometer}
                    onChange={(e) => setFormData({ ...formData, currentOdometer: e.target.value })}
                    className="w-full px-4 py-2 bg-black/40 border border-white/20 rounded-full text-white text-xs placeholder:text-white/40 focus:outline-none focus:border-silver-400 focus:ring-2 focus:ring-silver-400/20 transition-all duration-200"
                    placeholder="Enter current KM"
                    required
                  />
                </div>
              </div>
            </div>

            {/* DURATION OF AGREEMENT */}
            <div className="border border-white/15 rounded-md p-4 bg-white/5">
              <h3 className="text-white text-[13px] font-bold mb-4 uppercase tracking-wide">Contract Period</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-white/60 text-[11px] font-medium uppercase tracking-wide">Start Date *</label>
                  <div className="relative">
                    <input
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      className="w-full px-4 py-2 bg-black/40 border border-white/20 rounded-full text-white text-xs focus:outline-none focus:border-silver-400 focus:ring-2 focus:ring-silver-400/20 transition-all duration-200 [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:opacity-70 hover:[&::-webkit-calendar-picker-indicator]:opacity-100"
                      required
                    />
                    {formData.startDate && (
                      <div className="absolute right-12 top-1/2 transform -translate-y-1/2 text-white/60 text-xs pointer-events-none">
                        {formatDateToDisplay(formData.startDate)}
                      </div>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block text-white/60 text-[11px] font-medium uppercase tracking-wide">End Date *</label>
                  <div className="relative">
                    <input
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      className="w-full px-4 py-2 bg-black/40 border border-white/20 rounded-full text-white text-xs focus:outline-none focus:border-silver-400 focus:ring-2 focus:ring-silver-400/20 transition-all duration-200 [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:opacity-70 hover:[&::-webkit-calendar-picker-indicator]:opacity-100"
                      required
                    />
                    {formData.endDate && (
                      <div className="absolute right-12 top-1/2 transform -translate-y-1/2 text-white/60 text-xs pointer-events-none">
                        {formatDateToDisplay(formData.endDate)}
                      </div>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block text-white/60 text-[11px] font-medium uppercase tracking-wide">Cut-off KM *</label>
                  <input
                    type="text"
                    value={formData.cutOffKm}
                    onChange={(e) => setFormData({ ...formData, cutOffKm: e.target.value })}
                    className="w-full px-4 py-2 bg-black/40 border border-white/20 rounded-full text-white text-xs placeholder:text-white/40 focus:outline-none focus:border-silver-400 focus:ring-2 focus:ring-silver-400/20 transition-all duration-200"
                    placeholder="Enter cut-off KM"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-white/60 text-[11px] font-medium uppercase tracking-wide">Invoice Amount *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.invoiceAmount}
                    onChange={(e) => setFormData({ ...formData, invoiceAmount: e.target.value })}
                    className="w-full px-4 py-2 bg-black/40 border border-white/20 rounded-full text-white text-xs placeholder:text-white/40 focus:outline-none focus:border-silver-400 focus:ring-2 focus:ring-silver-400/20 transition-all duration-200"
                    placeholder="Enter amount (AED)"
                    required
                  />
                </div>
              </div>
              <div className="mt-4 p-3 bg-gradient-to-r from-amber-900/40 to-black/10 border border-amber-500/20 rounded-xl">
                <p className="text-amber-400 text-xs font-semibold">
                  <strong>Note:</strong> Agreement expires whichever comes first, date or kilometers.
                </p>
              </div>
            </div>

          </div>

          {/* Footer with action buttons - Fixed outside scrollable area */}
          <div className="flex items-center justify-end gap-4 pt-6 border-t border-white/15 mt-6 flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 bg-black/30 backdrop-blur border border-white/20 rounded-full text-white text-sm font-semibold hover:bg-black/50 hover:border-white/30 transition-all duration-200 shadow-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-gradient-to-r from-white to-gray-200 rounded-full text-black text-sm font-bold hover:from-gray-100 hover:to-white transition-all duration-200 shadow-lg disabled:opacity-40 disabled:cursor-not-allowed border border-white/30"
            >
              {loading ? 'Creating...' : 'Create Contract'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
} 