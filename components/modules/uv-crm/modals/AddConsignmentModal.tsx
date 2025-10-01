import React, { useState } from "react";
import { Car, Phone, MapPin, DollarSign, ExternalLink, Save, X } from "lucide-react";

interface Consignment {
  id: string;
  status: string;
  phone_number: string;
  vehicle_model: string;
  asking_price: number;
  listing_url: string;
  notes?: string;
  archived: boolean;
  created_at: string;
  updated_at: string;
  // Negotiation fields
  vehicle_make?: string;
  vehicle_year?: number;
  mileage?: number;
  vin?: string;
  direct_purchase_price?: number;
  consignment_price?: number;
  negotiation_notes?: string;
}

interface Props {
  onClose: () => void;
  onAdd: (consignmentData: Omit<Consignment, 'id' | 'created_at' | 'updated_at'>) => void;
}

const statusOptions = [
  { value: 'new_lead', label: 'New Lead' },
  { value: 'negotiation', label: 'Negotiation' },
  { value: 'preinspection', label: 'Pre-Inspection' },
  { value: 'consigned', label: 'Consigned / Purchased' },
  { value: 'lost', label: 'Lost' },
];

export default function AddConsignmentModal({ onClose, onAdd }: Props) {
  const [saving, setSaving] = useState(false);
  
  // Form fields
  const [status, setStatus] = useState('new_lead');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [askingPrice, setAskingPrice] = useState('');
  const [listingUrl, setListingUrl] = useState('');
  const [notes, setNotes] = useState('');

  const handleSave = async () => {
    if (!vehicleModel.trim()) {
      alert('Vehicle model is required');
      return;
    }

    setSaving(true);
    try {
      const consignmentData = {
        status,
        phone_number: phoneNumber.trim() || '',
        vehicle_model: vehicleModel.trim(),
        asking_price: askingPrice ? parseInt(askingPrice.replace(/[^0-9]/g, ''), 10) : 0,
        listing_url: listingUrl.trim() || '',
        notes: notes.trim() || '',
        archived: false,
      };

      onAdd(consignmentData);
    } catch (error) {
      console.error('Error preparing consignment data:', error);
      alert('Error preparing consignment data. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-2">
      <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-lg p-4 w-full max-w-2xl text-xs relative max-h-[95vh] overflow-y-auto shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-xl leading-none text-white/70 hover:text-white transition-colors"
        >
          ×
        </button>
        
        {/* Header */}
        <div className="mb-4">
          <h2 className="text-base font-semibold text-white mb-0.5">Add New Consignment</h2>
          <p className="text-xs text-white/60">
            Enter the consignment details below
          </p>
        </div>

        <div className="space-y-4">
          {/* Status */}
          <div className="bg-white/5 backdrop-blur-sm rounded-lg p-3 border border-white/10">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-white flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-current"></div>
                Status
              </label>
            </div>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs rounded bg-black/20 border border-white/10 text-white focus:outline-none focus:ring-1 focus:ring-white/30 focus:border-white/30 transition-all appearance-none"
            >
              {statusOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Contact Information */}
          <div className="bg-white/5 backdrop-blur-sm rounded-lg p-3 border border-white/10">
            <h3 className="text-xs font-medium text-white mb-2 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5" />
              Contact Information
            </h3>
            <div className="space-y-2">
              <div>
                <label className="block text-xs text-white/70 mb-1">Phone Number</label>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs rounded bg-black/20 border border-white/10 text-white placeholder-white/50 focus:outline-none focus:ring-1 focus:ring-white/30 focus:border-white/30 transition-all"
                  placeholder="Phone number"
                />
              </div>
            </div>
          </div>

          {/* Vehicle Information */}
          <div className="bg-white/5 backdrop-blur-sm rounded-lg p-3 border border-white/10">
            <h3 className="text-xs font-medium text-white mb-2 flex items-center gap-1.5">
              <Car className="w-3.5 h-3.5" />
              Vehicle Information
            </h3>
            <div className="space-y-2">
              <div>
                <label className="block text-xs text-white/70 mb-1">Vehicle Model *</label>
                <input
                  type="text"
                  value={vehicleModel}
                  onChange={(e) => setVehicleModel(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs rounded bg-black/20 border border-white/10 text-white placeholder-white/50 focus:outline-none focus:ring-1 focus:ring-white/30 focus:border-white/30 transition-all"
                  placeholder="Vehicle model"
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-white/70 mb-1">Asking Price</label>
                <input
                  type="text"
                  value={askingPrice}
                  onChange={(e) => setAskingPrice(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs rounded bg-black/20 border border-white/10 text-white placeholder-white/50 focus:outline-none focus:ring-1 focus:ring-white/30 focus:border-white/30 transition-all"
                  placeholder="Asking price in AED"
                />
              </div>
            </div>
          </div>

          {/* Listing URL */}
          <div className="bg-white/5 backdrop-blur-sm rounded-lg p-3 border border-white/10">
            <h3 className="text-xs font-medium text-white mb-2 flex items-center gap-1.5">
              <ExternalLink className="w-3.5 h-3.5" />
              Listing URL
            </h3>
            <input
              type="url"
              value={listingUrl}
              onChange={(e) => setListingUrl(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs rounded bg-black/20 border border-white/10 text-white placeholder-white/50 focus:outline-none focus:ring-1 focus:ring-white/30 focus:border-white/30 transition-all"
              placeholder="Listing URL"
            />
          </div>

          {/* Notes */}
          <div className="bg-white/5 backdrop-blur-sm rounded-lg p-3 border border-white/10">
            <h3 className="text-xs font-medium text-white mb-2 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" />
              Notes
            </h3>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs rounded bg-black/20 border border-white/10 text-white placeholder-white/50 focus:outline-none focus:ring-1 focus:ring-white/30 focus:border-white/30 transition-all resize-none"
              placeholder="Additional notes..."
              rows={3}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            className="flex items-center gap-1 px-3 py-1.5 rounded bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-colors text-xs"
          >
            <X className="w-3 h-3" />
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !vehicleModel.trim()}
            className="flex items-center gap-1 px-3 py-1.5 rounded bg-green-500/20 hover:bg-green-500/30 text-green-300 hover:text-green-200 transition-colors text-xs disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-3 h-3" />
            {saving ? 'Adding...' : 'Add Consignment'}
          </button>
        </div>
      </div>
    </div>
  );
}
