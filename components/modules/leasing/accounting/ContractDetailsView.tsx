"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { FileText, User, Car, Calendar, DollarSign } from "lucide-react";

interface CustomerData {
  id: string;
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  emirates_id_number?: string;
  address_line_1?: string;
  address_line_2?: string;
  city?: string;
  emirate?: string;
  lease_status?: string;
  appointment_date?: string;
  appointment_time?: string;
  notes?: string;
  selected_vehicle_id?: string;
  monthly_payment?: number;
  security_deposit?: number;
  lease_term_months?: number;
  lease_start_date?: string;
  lease_end_date?: string;
  lease_to_own_option?: boolean;
  buyout_price?: number;
  excess_mileage_charges?: number;
  vehicle_model_year?: number;
  vehicle_model?: string;
  vehicle_exterior_colour?: string;
  vehicle_interior_colour?: string;
  vehicle_monthly_lease_rate?: number;
  vehicle_security_deposit?: number;
  vehicle_buyout_price?: number;
  created_at: string;
  updated_at: string;
  // Note: Removed date_of_birth, passport_number, visa_number as per previous cleanup
}

interface Props {
  leaseId: string;
  customerName: string;
}

export default function ContractDetailsView({ leaseId, customerName }: Props) {
  const [customerData, setCustomerData] = useState<CustomerData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCustomerData();
  }, [leaseId]);

  const fetchCustomerData = async () => {
    try {
      const { data, error } = await supabase
        .from('leasing_customers')
        .select('*')
        .eq('id', leaseId)
        .single();

      if (error) throw error;
      setCustomerData(data);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    );
  }

  if (!customerData) {
    return (
      <div className="text-center py-8">
        <p className="text-white/60">No contract details found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Customer Information */}
      <div className="bg-gradient-to-br from-neutral-800/40 to-neutral-900/40 rounded-lg p-6 border border-neutral-400/20 backdrop-blur-sm">
        <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
          <User className="w-5 h-5" />
          Customer Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-neutral-400">Name:</span>
            <p className="text-white font-medium">{customerData.customer_name}</p>
          </div>
          <div>
            <span className="text-neutral-400">Email:</span>
            <p className="text-white font-medium">{customerData.customer_email || 'Not provided'}</p>
          </div>
          <div>
            <span className="text-neutral-400">Phone:</span>
            <p className="text-white font-medium">{customerData.customer_phone || 'Not provided'}</p>
          </div>
          <div>
            <span className="text-neutral-400">Emirates ID:</span>
            <p className="text-white font-medium">{customerData.emirates_id_number || 'Not provided'}</p>
          </div>
          <div className="md:col-span-2">
            <span className="text-neutral-400">Address:</span>
            <p className="text-white font-medium">
              {customerData.address_line_1 ? 
                `${customerData.address_line_1}${customerData.address_line_2 ? ', ' + customerData.address_line_2 : ''}${customerData.city ? ', ' + customerData.city : ''}${customerData.emirate ? ', ' + customerData.emirate : ''}` 
                : 'Not provided'}
            </p>
          </div>
        </div>
      </div>

      {/* Vehicle Information */}
      <div className="bg-gradient-to-br from-neutral-800/40 to-neutral-900/40 rounded-lg p-6 border border-neutral-400/20 backdrop-blur-sm">
        <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
          <Car className="w-5 h-5" />
          Vehicle Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-neutral-400">Vehicle:</span>
            <p className="text-white font-medium">
              {customerData.vehicle_model_year && customerData.vehicle_model ? 
                `${customerData.vehicle_model_year} ${customerData.vehicle_model}` : 
                'Not specified'}
            </p>
          </div>
          <div>
            <span className="text-neutral-400">Exterior Color:</span>
            <p className="text-white font-medium">{customerData.vehicle_exterior_colour || 'Not specified'}</p>
          </div>
          <div>
            <span className="text-neutral-400">Interior Color:</span>
            <p className="text-white font-medium">{customerData.vehicle_interior_colour || 'Not specified'}</p>
          </div>
        </div>
      </div>

      {/* Contract Terms */}
      <div className="bg-gradient-to-br from-neutral-800/40 to-neutral-900/40 rounded-lg p-6 border border-neutral-400/20 backdrop-blur-sm">
        <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Contract Terms
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-neutral-400">Monthly Payment:</span>
            <p className="text-white font-bold text-base">
              AED {customerData.monthly_payment ? customerData.monthly_payment.toLocaleString() : '0'}
            </p>
          </div>
          <div>
            <span className="text-neutral-400">Security Deposit:</span>
            <p className="text-white font-bold text-base">
              AED {customerData.security_deposit ? customerData.security_deposit.toLocaleString() : '0'}
            </p>
          </div>
          <div>
            <span className="text-neutral-400">Lease Term:</span>
            <p className="text-white font-medium">{customerData.lease_term_months || '0'} months</p>
          </div>
          <div>
            <span className="text-neutral-400">Start Date:</span>
            <p className="text-white font-medium">{customerData.lease_start_date || 'Not set'}</p>
          </div>
          <div>
            <span className="text-neutral-400">End Date:</span>
            <p className="text-white font-medium">{customerData.lease_end_date || 'Not set'}</p>
          </div>
          <div>
            <span className="text-neutral-400">Excess Mileage:</span>
            <p className="text-white font-medium">
              {customerData.excess_mileage_charges ? `AED ${customerData.excess_mileage_charges}/km` : 'Not set'}
            </p>
          </div>
          {customerData.lease_to_own_option && (
            <>
              <div>
                <span className="text-neutral-400">Lease-to-Own:</span>
                <p className="text-green-400 font-medium">Yes</p>
              </div>
              <div>
                <span className="text-neutral-400">Buyout Price:</span>
                <p className="text-white font-bold text-base">
                  AED {customerData.buyout_price ? customerData.buyout_price.toLocaleString() : '0'}
                </p>
              </div>
            </>
          )}
        </div>

        {/* Total Contract Value */}
        {customerData.monthly_payment && customerData.lease_term_months && (
          <div className="mt-6 pt-4 border-t border-neutral-400/20">
            <div className="bg-gradient-to-r from-neutral-700/30 to-neutral-600/30 rounded-lg p-4 border border-neutral-400/30">
              <div className="flex justify-between items-center">
                <span className="text-neutral-300 font-medium">Total Contract Value:</span>
                <p className="text-white font-bold text-xl">
                  AED {(customerData.monthly_payment * customerData.lease_term_months).toLocaleString()}
                </p>
              </div>
              <p className="text-neutral-400 text-sm mt-1">
                ({customerData.monthly_payment.toLocaleString()} × {customerData.lease_term_months} months)
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Additional Notes */}
      {customerData.notes && (
        <div className="bg-gradient-to-br from-neutral-800/40 to-neutral-900/40 rounded-lg p-6 border border-neutral-400/20 backdrop-blur-sm">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Additional Notes
          </h3>
          <p className="text-white text-sm bg-neutral-800/30 rounded p-3 border border-neutral-400/20">
            {customerData.notes}
          </p>
        </div>
      )}
    </div>
  );
}