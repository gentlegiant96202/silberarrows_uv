import React, { useState, useEffect } from "react";
import { Car, Calendar, Gauge, Hash, DollarSign, FileText, X, Save } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

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
  consignment: Consignment;
  onClose: () => void;
  onUpdate: (updatedConsignment: Consignment) => void;
}

const NegotiationModal = ({ consignment, onClose, onUpdate }: Props) => {
  const [vehicleMake, setVehicleMake] = useState(consignment.vehicle_make || '');
  const [vehicleYear, setVehicleYear] = useState(consignment.vehicle_year?.toString() || '');
  const [mileage, setMileage] = useState(consignment.mileage?.toString() || '');
  const [vin, setVin] = useState(consignment.vin || '');
  const [directPurchasePrice, setDirectPurchasePrice] = useState(consignment.direct_purchase_price?.toString() || '');
  const [consignmentPrice, setConsignmentPrice] = useState(consignment.consignment_price?.toString() || '');
  const [negotiationNotes, setNegotiationNotes] = useState(consignment.negotiation_notes || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updatedConsignment = {
        ...consignment,
        vehicle_make: vehicleMake.trim() || null,
        vehicle_year: vehicleYear ? parseInt(vehicleYear, 10) : null,
        mileage: mileage ? parseInt(mileage.replace(/[^0-9]/g, ''), 10) : null,
        vin: vin.trim() || null,
        direct_purchase_price: directPurchasePrice ? parseInt(directPurchasePrice.replace(/[^0-9]/g, ''), 10) : null,
        consignment_price: consignmentPrice ? parseInt(consignmentPrice.replace(/[^0-9]/g, ''), 10) : null,
        negotiation_notes: negotiationNotes.trim() || null,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('consignments')
        .update(updatedConsignment)
        .eq('id', consignment.id)
        .select()
        .single();

      if (error) throw error;

      onUpdate(data as Consignment);
      onClose();
    } catch (error) {
      console.error('Error updating negotiation details:', error);
      alert('Error updating negotiation details. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-2">
      <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-lg p-4 w-full max-w-3xl text-xs relative max-h-[95vh] overflow-y-auto shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-xl leading-none text-white/70 hover:text-white transition-colors"
        >
          ×
        </button>
        
        <div className="mb-4">
          <h2 className="text-base font-semibold text-white mb-0.5">Negotiation Details</h2>
          <p className="text-xs text-white/60">Enter detailed vehicle information and pricing options.</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Left Column - Vehicle Details */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
              <Car className="w-4 h-4" />
              Vehicle Information
            </h3>

            {/* Vehicle Make */}
            <div>
              <label className="block text-xs text-white/70 mb-1 flex items-center gap-1.5">
                <Car className="w-3.5 h-3.5" />
                Vehicle Make
              </label>
              <input
                type="text"
                value={vehicleMake}
                onChange={(e) => setVehicleMake(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs rounded bg-black/20 border border-white/10 text-white placeholder-white/50 focus:outline-none focus:ring-1 focus:ring-white/30 focus:border-white/30 transition-all"
                placeholder="e.g., Mercedes-Benz"
              />
            </div>

            {/* Vehicle Year */}
            <div>
              <label className="block text-xs text-white/70 mb-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                Vehicle Year
              </label>
              <input
                type="number"
                value={vehicleYear}
                onChange={(e) => setVehicleYear(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs rounded bg-black/20 border border-white/10 text-white placeholder-white/50 focus:outline-none focus:ring-1 focus:ring-white/30 focus:border-white/30 transition-all"
                placeholder="e.g., 2020"
                min="1900"
                max="2030"
              />
            </div>

            {/* Mileage */}
            <div>
              <label className="block text-xs text-white/70 mb-1 flex items-center gap-1.5">
                <Gauge className="w-3.5 h-3.5" />
                Mileage (km)
              </label>
              <input
                type="text"
                value={mileage}
                onChange={(e) => setMileage(e.target.value.replace(/[^0-9]/g, ''))}
                className="w-full px-2.5 py-1.5 text-xs rounded bg-black/20 border border-white/10 text-white placeholder-white/50 focus:outline-none focus:ring-1 focus:ring-white/30 focus:border-white/30 transition-all"
                placeholder="e.g., 50000"
              />
            </div>

            {/* VIN */}
            <div>
              <label className="block text-xs text-white/70 mb-1 flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5" />
                VIN Number
              </label>
              <input
                type="text"
                value={vin}
                onChange={(e) => setVin(e.target.value.toUpperCase())}
                className="w-full px-2.5 py-1.5 text-xs rounded bg-black/20 border border-white/10 text-white placeholder-white/50 focus:outline-none focus:ring-1 focus:ring-white/30 focus:border-white/30 transition-all"
                placeholder="e.g., WDB12345678901234"
                maxLength={17}
              />
            </div>
          </div>

          {/* Right Column - Pricing & Notes */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Pricing Options
            </h3>

            {/* Direct Purchase Price */}
            <div>
              <label className="block text-xs text-white/70 mb-1 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5" />
                Direct Purchase Price (AED)
              </label>
              <input
                type="text"
                value={directPurchasePrice}
                onChange={(e) => setDirectPurchasePrice(e.target.value.replace(/[^0-9]/g, ''))}
                className="w-full px-2.5 py-1.5 text-xs rounded bg-black/20 border border-white/10 text-white placeholder-white/50 focus:outline-none focus:ring-1 focus:ring-white/30 focus:border-white/30 transition-all"
                placeholder="e.g., 120000"
              />
            </div>

            {/* Consignment Price */}
            <div>
              <label className="block text-xs text-white/70 mb-1 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5" />
                Consignment Price (AED)
              </label>
              <input
                type="text"
                value={consignmentPrice}
                onChange={(e) => setConsignmentPrice(e.target.value.replace(/[^0-9]/g, ''))}
                className="w-full px-2.5 py-1.5 text-xs rounded bg-black/20 border border-white/10 text-white placeholder-white/50 focus:outline-none focus:ring-1 focus:ring-white/30 focus:border-white/30 transition-all"
                placeholder="e.g., 150000"
              />
            </div>

            {/* Negotiation Notes */}
            <div>
              <label className="block text-xs text-white/70 mb-1 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" />
                Negotiation Notes
              </label>
              <textarea
                value={negotiationNotes}
                onChange={(e) => setNegotiationNotes(e.target.value)}
                rows={4}
                className="w-full px-2.5 py-1.5 text-xs rounded bg-black/20 border border-white/10 text-white placeholder-white/50 focus:outline-none focus:ring-1 focus:ring-white/30 focus:border-white/30 transition-all"
                placeholder="Additional notes about the negotiation, conditions, etc..."
              ></textarea>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="flex items-center gap-1 px-3 py-1.5 rounded bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-colors text-xs"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1 px-3 py-1.5 rounded bg-green-500/20 hover:bg-green-500/30 text-green-300 hover:text-green-200 transition-colors text-xs disabled:opacity-50"
          >
            {saving ? 'Saving...' : <><Save className="w-3.5 h-3.5" /> Save Details</>}
          </button>
        </div>
      </div>
    </div>
  );
};

export default NegotiationModal;
