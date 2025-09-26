"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onUpdated: (customer: any) => void;
  customer: any;
}

interface AvailableVehicle {
  id: string;
  stock_number: string;
  plate_number?: string;
  model: string;
  model_year: number;
  exterior_color?: string;
  daily_rate_customer?: number;
  current_parking_location?: string;
  acquired_cost?: number;
}

export default function ContractsDraftedModal({ isOpen, onClose, onUpdated, customer }: Props) {
  const [availableVehicles, setAvailableVehicles] = useState<AvailableVehicle[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Contract details
  const [monthlyRate, setMonthlyRate] = useState("");
  const [securityDeposit, setSecurityDeposit] = useState("");
  const [leaseTerm, setLeaseTerm] = useState("24");
  const [leaseToOwn, setLeaseToOwn] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [notes, setNotes] = useState("");

  // Load available vehicles (status = 'marketing')
  useEffect(() => {
    if (isOpen) {
      loadAvailableVehicles();
    }
  }, [isOpen]);

  const loadAvailableVehicles = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('leasing_inventory')
        .select('id, stock_number, plate_number, model, model_year, exterior_color, daily_rate_customer, current_parking_location, acquired_cost')
        .eq('status', 'marketing')
        .order('model_year', { ascending: false });

      if (error) {
        console.error('Error loading available vehicles:', error);
        return;
      }

      setAvailableVehicles(data || []);
    } catch (error) {
      console.error('Exception loading vehicles:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVehicleSelect = (vehicleId: string) => {
    setSelectedVehicleId(vehicleId);
    
    // Auto-populate lease terms from selected vehicle
    const vehicle = availableVehicles.find(v => v.id === vehicleId);
    if (vehicle) {
      if (vehicle.daily_rate_customer) {
        const monthlyFromDaily = vehicle.daily_rate_customer * 30;
        setMonthlyRate(monthlyFromDaily.toFixed(2));
        setSecurityDeposit((monthlyFromDaily * 3).toFixed(2)); // 3 months security
      }
    }
  };

  const handleCreateContract = async () => {
    if (!selectedVehicleId || !monthlyRate || !securityDeposit || !leaseTerm || !startDate) {
      alert('Please fill in all required fields');
      return;
    }

    setSaving(true);
    try {
      // Calculate end date
      const start = new Date(startDate);
      const end = new Date(start);
      end.setMonth(end.getMonth() + parseInt(leaseTerm));

      // Update customer record
      const { error: customerError } = await supabase
        .from('leasing_customers')
        .update({
          lease_status: 'active_leases',
          selected_vehicle_id: selectedVehicleId,
          monthly_payment: parseFloat(monthlyRate),
          security_deposit: parseFloat(securityDeposit),
          lease_term_months: parseInt(leaseTerm),
          lease_start_date: startDate,
          lease_end_date: end.toISOString().split('T')[0],
          lease_to_own_option: leaseToOwn,
          notes: notes,
          updated_at: new Date().toISOString()
        })
        .eq('id', customer.id);

      if (customerError) {
        console.error('Error updating customer:', customerError);
        alert('Failed to update customer. Please try again.');
        return;
      }


      console.log('✅ Lease contract created successfully');
      
      // Return updated customer data
      const updatedCustomer = {
        ...customer,
        lease_status: 'active_leases',
        selected_vehicle_id: selectedVehicleId,
        monthly_payment: parseFloat(monthlyRate),
        lease_start_date: startDate,
        lease_end_date: end.toISOString().split('T')[0]
      };
      
      onUpdated(updatedCustomer);
      onClose();

    } catch (error) {
      console.error('Error creating contract:', error);
      alert('Failed to create contract. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-black border border-white/20 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-white">
                Create Lease Contract
              </h2>
              <p className="text-sm text-white/60 mt-1">
                {customer.customer_name} - Select vehicle and set lease terms
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

        <div className="p-6 overflow-y-auto max-h-[70vh]">
          {/* Vehicle Selection */}
          <div className="bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-white/10 mb-6">
            <h3 className="text-lg font-semibold text-white mb-4">Select Vehicle</h3>
            
            {loading ? (
              <div className="text-center py-8">
                <div className="text-white/60">Loading available vehicles...</div>
              </div>
            ) : availableVehicles.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-white/60">No vehicles available for lease</div>
                <p className="text-white/40 text-sm mt-2">Add vehicles to MARKETING column in inventory</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {availableVehicles.map((vehicle) => (
                  <div
                    key={vehicle.id}
                    onClick={() => handleVehicleSelect(vehicle.id)}
                    className={`p-4 rounded-lg border cursor-pointer transition-all ${
                      selectedVehicleId === vehicle.id
                        ? 'bg-white/10 border-white/30 ring-2 ring-gray-300/60'
                        : 'bg-white/5 border-white/10 hover:bg-white/8 hover:border-white/20'
                    }`}
                  >
                    <div className="text-white font-medium">
                      {vehicle.stock_number} - {vehicle.model_year} {vehicle.model}
                    </div>
                    <div className="text-white/70 text-sm">
                      {vehicle.exterior_color} • {vehicle.plate_number}
                    </div>
                    <div className="text-white/60 text-sm">
                      Location: {vehicle.current_parking_location || 'Not set'}
                    </div>
                    {vehicle.daily_rate_customer && (
                      <div className="text-white/80 text-sm mt-2">
                        AED {vehicle.daily_rate_customer}/day • AED {(vehicle.daily_rate_customer * 30).toFixed(0)}/month
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Lease Terms */}
          {selectedVehicleId && (
            <div className="bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-white/10">
              <h3 className="text-lg font-semibold text-white mb-4">Lease Terms</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-white/80 text-sm font-medium mb-2">Monthly Rate (AED)</label>
                  <input
                    type="number"
                    value={monthlyRate}
                    onChange={(e) => setMonthlyRate(e.target.value)}
                    className="w-full px-3 py-3 rounded-lg bg-black/20 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/30 transition-all h-12"
                    placeholder="3000"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-white/80 text-sm font-medium mb-2">Security Deposit (AED)</label>
                  <input
                    type="number"
                    value={securityDeposit}
                    onChange={(e) => setSecurityDeposit(e.target.value)}
                    className="w-full px-3 py-3 rounded-lg bg-black/20 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/30 transition-all h-12"
                    placeholder="9000"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-white/80 text-sm font-medium mb-2">Lease Term (Months)</label>
                  <select
                    value={leaseTerm}
                    onChange={(e) => setLeaseTerm(e.target.value)}
                    className="w-full px-3 py-3 rounded-lg bg-black/20 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/30 transition-all h-12"
                  >
                    <option value="12">12 Months</option>
                    <option value="24">24 Months</option>
                    <option value="36">36 Months</option>
                    <option value="48">48 Months</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-white/80 text-sm font-medium mb-2">Lease Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-3 rounded-lg bg-black/20 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/30 transition-all h-12"
                    min={new Date().toISOString().split('T')[0]}
                    required
                  />
                </div>
              </div>
              
              <div className="mt-4">
                <label className="flex items-center gap-2 text-white/80">
                  <input
                    type="checkbox"
                    checked={leaseToOwn}
                    onChange={(e) => setLeaseToOwn(e.target.checked)}
                    className="rounded border-white/20 bg-black/20 text-white focus:ring-white/30"
                  />
                  Lease-to-Own Option
                </label>
              </div>
              
              <div className="mt-4">
                <label className="block text-white/80 text-sm font-medium mb-2">Contract Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-3 rounded-lg bg-black/20 border border-white/10 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/30 transition-all resize-none"
                  placeholder="Any special terms or notes for this lease contract..."
                  rows={3}
                />
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="p-6 border-t border-white/10 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-3 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleCreateContract}
            disabled={saving || !selectedVehicleId}
            className="px-6 py-3 bg-gradient-to-br from-gray-200 via-gray-100 to-gray-400 text-black font-medium rounded-lg hover:shadow-lg transition-all disabled:opacity-50"
          >
            {saving ? 'Creating Contract...' : 'Create Lease Contract'}
          </button>
        </div>
      </div>
    </div>
  );
}
