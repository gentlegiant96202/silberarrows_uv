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
  
  // Customer Information (enhanced with VehicleDocument fields)
  ownerName: string;
  mobileNo: string;
  email: string;
  customerIdType: 'EID' | 'Passport';
  customerIdNumber: string;
  
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
  vehicleColour: string;
  
  // Contract Duration
  startDate: string;
  endDate: string;
  cutOffKm: string;
  
  // Financial Information
  invoiceAmount: string;
  
  // Optional relationship link
  reservationId?: string;
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
    customerIdType: 'EID',
    customerIdNumber: '',
    
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
    vehicleColour: '',
    
    // Contract Duration
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
        customerIdType: 'EID',
        customerIdNumber: '',
        vin: '',
        make: '',
        model: '',
        modelYear: '',
        currentOdometer: '',
        vehicleColour: '',
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-black/60 via-black/40 to-black/60 backdrop-blur-2xl border-2 border-white/20 shadow-2xl rounded-2xl p-6 w-full max-w-xl md:max-w-3xl lg:max-w-5xl relative max-h-[95vh] overflow-hidden">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-2xl leading-none text-white/70 hover:text-white transition-colors duration-200"
        >
          ×
        </button>
        
        <div className="flex items-start justify-between mb-6 pr-8 gap-4 flex-wrap">
          <div className="flex flex-col">
            <h2 className="text-2xl font-bold text-white">New ServiceCare Agreement</h2>
            <div className="text-white/70 text-sm mt-2">
              <span className="text-white/50">Reference:</span> <span className="font-mono font-semibold">{formData.referenceNo}</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          <div className="flex flex-col gap-4 max-h-[75vh] overflow-y-auto space-y-4">
            
            {/* CUSTOMER INFORMATION */}
            <div className="bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-white/10">
              <h3 className="text-sm font-medium text-white mb-4 flex items-center gap-2">
                <User className="h-4 w-4" />
                Customer Information
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-white/80 mb-2">Customer Name *</label>
                  <input
                    type="text"
                    value={formData.ownerName}
                    onChange={(e) => handleInputChange('ownerName', e.target.value.toUpperCase())}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/40"
                    placeholder="Enter customer name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-white/80 mb-2">Mobile Number *</label>
                  <input
                    type="tel"
                    value={formData.mobileNo}
                    onChange={(e) => handleInputChange('mobileNo', e.target.value)}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/40"
                    placeholder="Enter mobile number"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-white/80 mb-2">Email Address *</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/40"
                    placeholder="Enter email address"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-white/80 mb-2">ID Type *</label>
                  <select
                    value={formData.customerIdType}
                    onChange={(e) => handleInputChange('customerIdType', e.target.value)}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/40"
                    required
                  >
                    <option value="EID">Emirates ID</option>
                    <option value="Passport">Passport</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-white/80 mb-2">ID Number *</label>
                  <input
                    type="text"
                    value={formData.customerIdNumber}
                    onChange={(e) => handleInputChange('customerIdNumber', e.target.value)}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/40"
                    placeholder="Enter ID number"
                    required
                  />
                </div>
              </div>
            </div>

            {/* VEHICLE INFORMATION */}
            <div className="bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-white/10">
              <h3 className="text-sm font-medium text-white mb-4 flex items-center gap-2">
                <Car className="h-4 w-4" />
                Vehicle Information
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-white/80 mb-2">VIN Number *</label>
                  <input
                    type="text"
                    value={formData.vin}
                    onChange={(e) => handleInputChange('vin', e.target.value.toUpperCase())}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/40 font-mono"
                    placeholder="Enter VIN number"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-white/80 mb-2">Make *</label>
                  <input
                    type="text"
                    value={formData.make}
                    onChange={(e) => handleInputChange('make', e.target.value.toUpperCase())}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/40"
                    placeholder="Vehicle make"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-white/80 mb-2">Model *</label>
                  <input
                    type="text"
                    value={formData.model}
                    onChange={(e) => handleInputChange('model', e.target.value.toUpperCase())}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/40"
                    placeholder="Vehicle model"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-white/80 mb-2">Model Year *</label>
                  <input
                    type="number"
                    min="1980"
                    max="2030"
                    value={formData.modelYear}
                    onChange={(e) => handleInputChange('modelYear', e.target.value)}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/40"
                    placeholder="Year"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-white/80 mb-2">Vehicle Colour *</label>
                  <input
                    type="text"
                    value={formData.vehicleColour}
                    onChange={(e) => handleInputChange('vehicleColour', e.target.value)}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/40"
                    placeholder="Vehicle color"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-white/80 mb-2">Current Odometer *</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.currentOdometer}
                    onChange={(e) => handleInputChange('currentOdometer', e.target.value)}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/40"
                    placeholder="Current KM"
                    required
                  />
                </div>
              </div>
            </div>

            {/* SERVICE COVERAGE */}
            <div className="bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-white/10">
              <h3 className="text-sm font-medium text-white mb-4 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Service Coverage
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-white/80 mb-2">Service Type *</label>
                  <select
                    value={formData.serviceType}
                    onChange={(e) => {
                      const type = e.target.value as 'standard' | 'premium';
                      setFormData(prev => ({
                        ...prev,
                        serviceType: type,
                        // Auto-set end date based on service type
                        endDate: prev.startDate ? new Date(new Date(prev.startDate).setFullYear(
                          new Date(prev.startDate).getFullYear() + (type === 'premium' ? 4 : 2)
                        )).toISOString().split('T')[0] : ''
                      }));
                    }}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/40"
                    required
                  >
                    <option value="standard">Standard (24 Months)</option>
                    <option value="premium">Premium (48 Months)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-white/80 mb-2">Coverage Period</label>
                  <div className="flex items-center px-4 py-3 bg-black/20 border border-white/10 rounded-lg text-white/70 text-sm">
                    {formData.serviceType === 'standard' ? '24 Months Coverage' : '48 Months Coverage'}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-white/80 mb-2">Cut-off Kilometers *</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.cutOffKm}
                    onChange={(e) => handleInputChange('cutOffKm', e.target.value)}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/40"
                    placeholder="Maximum KM coverage"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-white/80 mb-2">Contract Amount *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.invoiceAmount}
                    onChange={(e) => handleInputChange('invoiceAmount', e.target.value)}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/40"
                    placeholder="Amount (AED)"
                    required
                  />
                </div>
              </div>
            </div>

            {/* CONTRACT PERIOD */}
            <div className="bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-white/10">
              <h3 className="text-sm font-medium text-white mb-4 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Contract Period
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-white/80 mb-2">Start Date *</label>
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
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/40 [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:opacity-70 hover:[&::-webkit-calendar-picker-indicator]:opacity-100"
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
                  <label className="block text-xs font-medium text-white/80 mb-2">End Date *</label>
                  <div className="relative">
                    <input
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => handleInputChange('endDate', e.target.value)}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/40 [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:opacity-70 hover:[&::-webkit-calendar-picker-indicator]:opacity-100"
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

            {/* DEALER INFORMATION */}
            <div className="bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-white/10">
              <h3 className="text-sm font-medium text-white mb-4 flex items-center gap-2">
                <Building className="h-4 w-4" />
                Dealer Information
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-white/80 mb-2">Dealer Name</label>
                  <input
                    type="text"
                    value={formData.dealerName}
                    onChange={(e) => handleInputChange('dealerName', e.target.value)}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/40"
                    placeholder="Enter dealer name"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-white/80 mb-2">Phone Number</label>
                  <input
                    type="tel"
                    value={formData.dealerPhone}
                    onChange={(e) => handleInputChange('dealerPhone', e.target.value)}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/40"
                    placeholder="Enter phone number"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-white/80 mb-2">Email Address</label>
                  <input
                    type="email"
                    value={formData.dealerEmail}
                    onChange={(e) => handleInputChange('dealerEmail', e.target.value)}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/40"
                    placeholder="Enter email address"
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
                  Create ServiceCare Contract
                </>
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}