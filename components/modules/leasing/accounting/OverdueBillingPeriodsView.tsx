"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { 
  Calendar, 
  FileText, 
  Plus,
  Clock,
  CheckCircle,
  AlertTriangle,
  DirhamSign
} from "lucide-react";
import { DirhamSign } from "new-dirham-symbol";

//  Types (matching existing functionality exactly)
interface LeaseAccountingRecord {
  id: string;
  lease_id: string;
  billing_period: string;
  charge_type: 'rental' | 'salik' | 'mileage' | 'late_fee' | 'fine' | 'refund';
  quantity: number | null;
  unit_price: number | null;
  total_amount: number;
  comment: string | null;
  invoice_id: string | null;
  invoice_number: string | null;
  payment_id: string | null;
  status: 'pending' | 'invoiced' | 'paid' | 'overdue';
  vat_applicable: boolean;
  account_closed: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
  version: number;
  documents: any;
}

interface BillingPeriod {
  period: string;
  period_start: string;
  period_end: string;
  charges: LeaseAccountingRecord[];
  total_amount: number;
  has_invoice: boolean;
  invoice_id?: string;
  invoice_number?: string;
  status: 'upcoming' | 'active' | 'pending_invoice' | 'invoiced' | 'paid' | 'overdue';
}

interface Props {
  leaseId: string;
  leaseStartDate: string;
  leaseEndDate?: string;
  leaseTermMonths?: number;
  records: LeaseAccountingRecord[];
  onGenerateInvoice: (billingPeriod: string, charges: LeaseAccountingRecord[]) => void;
  onAddChargeForPeriod: (billingPeriod: string) => void;
}

export default function BillingPeriodsView({ 
  leaseId, 
  leaseStartDate, 
  leaseEndDate,
  leaseTermMonths,
  records, 
  onGenerateInvoice,
  onAddChargeForPeriod 
}: Props) {
  const [billingPeriods, setBillingPeriods] = useState<BillingPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [additionalPeriods, setAdditionalPeriods] = useState(0);

  useEffect(() => {
    generateBillingPeriods();
  }, [leaseStartDate, leaseEndDate, leaseTermMonths, records, additionalPeriods]);

  const generateBillingPeriods = () => {
    if (!leaseStartDate) return;
    
    const startDate = new Date(leaseStartDate);
    const endDate = leaseEndDate ? new Date(leaseEndDate) : null;
    const today = new Date();
    const periods: BillingPeriod[] = [];
    
    // Calculate number of periods to generate (exactly like existing)
    let numberOfPeriods: number;
    if (endDate) {
      // Calculate months from lease start to end date, plus 3 month buffer
      const monthsDiff = (endDate.getFullYear() - startDate.getFullYear()) * 12 + 
                        (endDate.getMonth() - startDate.getMonth()) + 3;
      numberOfPeriods = Math.max(12, monthsDiff);
    } else if (leaseTermMonths) {
      // Use lease term + 3 month buffer
      numberOfPeriods = leaseTermMonths + 3;
    } else {
      // Default to 18 months
      numberOfPeriods = 18;
    }
    
    // Add any additional periods requested by user
    numberOfPeriods += additionalPeriods;
    
    // Generate billing periods starting from lease start date
    for (let i = 0; i < numberOfPeriods; i++) {
      const periodStart = new Date(startDate);
      periodStart.setMonth(startDate.getMonth() + i);
      
      const periodEnd = new Date(periodStart);
      periodEnd.setMonth(periodEnd.getMonth() + 1);
      periodEnd.setDate(periodEnd.getDate() - 1);
      
      const periodKey = periodStart.toISOString().split('T')[0];
      const periodCharges = records.filter(record => 
        record.billing_period === periodKey
      );

      const totalAmount = periodCharges.reduce((sum, charge) => sum + charge.total_amount, 0);
      const hasInvoice = periodCharges.some(charge => charge.invoice_id);
      const invoiceId = periodCharges.find(charge => charge.invoice_id)?.invoice_id || undefined;
      const invoiceNumber = periodCharges.find(charge => charge.invoice_number)?.invoice_number || undefined;

      // Determine period status (exactly like existing)
      let status: BillingPeriod['status'] = 'upcoming';
      
      if (periodEnd < today) {
        // Past period
        if (periodCharges.length === 0) {
          status = 'pending_invoice'; // No charges recorded
        } else if (!hasInvoice) {
          status = 'pending_invoice'; // Has charges but no invoice
        } else if (periodCharges.every(charge => charge.status === 'paid')) {
          status = 'paid';
        } else if (periodCharges.some(charge => charge.status === 'overdue')) {
          status = 'overdue';
        } else {
          status = 'invoiced';
        }
      } else if (periodStart <= today && periodEnd >= today) {
        // Current period
        status = 'active';
      } else {
        // Future period
        status = 'upcoming';
      }

      periods.push({
        period: periodKey,
        period_start: periodStart.toISOString().split('T')[0],
        period_end: periodEnd.toISOString().split('T')[0],
        charges: periodCharges,
        total_amount: totalAmount,
        has_invoice: hasInvoice,
        invoice_id: invoiceId,
        invoice_number: invoiceNumber,
        status
      });
    }
    
    setBillingPeriods(periods.sort((a, b) => new Date(b.period).getTime() - new Date(a.period).getTime()));
    setLoading(false);
  };

  const addMorePeriods = (months: number = 6) => {
    setAdditionalPeriods(prev => prev + months);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AE', {
      style: 'currency',
      currency: 'AED',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatDateRange = (startDate: string, endDate: string) => {
    const start = new Date(startDate).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short'
    });
    const end = new Date(endDate).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
    return `${start} - ${end}`;
  };

  const getStatusConfig = (status: BillingPeriod['status']) => {
    const configs = {
      upcoming: {
        color: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
        icon: Clock,
        label: 'Upcoming'
      },
      active: {
        color: 'text-green-400 bg-green-400/10 border-green-400/20',
        icon: Calendar,
        label: 'Active Period'
      },
      pending_invoice: {
        color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
        icon: AlertTriangle,
        label: 'Pending Invoice'
      },
      invoiced: {
        color: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
        icon: FileText,
        label: 'Invoiced'
      },
      paid: {
        color: 'text-green-400 bg-green-400/10 border-green-400/20',
        icon: CheckCircle,
        label: 'Paid'
      },
      overdue: {
        color: 'text-red-400 bg-red-400/10 border-red-400/20',
        icon: AlertTriangle,
        label: 'Overdue'
      }
    };
    return configs[status];
  };

  const getChargeTypeLabel = (type: string) => {
    const labels = {
      rental: 'Monthly Rental',
      salik: 'Salik Fee',
      mileage: 'Excess Mileage',
      late_fee: 'Late Fee',
      fine: 'Traffic Fine',
      refund: 'Refund/Credit'
    };
    return labels[type as keyof typeof labels] || type;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white/60"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Extend Button */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-white"> Billing Periods</h3>
          <p className="text-white/60 text-sm">
            {leaseEndDate ? (
              <>Lease ends: {new Date(leaseEndDate).toLocaleDateString('en-GB')}</>
            ) : leaseTermMonths ? (
              <>{leaseTermMonths} month lease</>
            ) : (
              'Ongoing lease'
            )}
            {additionalPeriods > 0 && (
              <> • {additionalPeriods} additional periods</>
            )}
          </p>
        </div>
        <button
          onClick={() => addMorePeriods(6)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-br from-blue-500 via-blue-400 to-blue-600 text-white font-medium rounded-lg hover:shadow-lg transition-all"
          title="Add 6 more billing periods"
        >
          <Plus size={16} />
          Extend Periods
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {[
          {
            label: 'Active Period',
            value: billingPeriods.filter(p => p.status === 'active').length,
            color: 'text-green-400'
          },
          {
            label: 'Pending Invoices',
            value: billingPeriods.filter(p => p.status === 'pending_invoice').length,
            color: 'text-yellow-400'
          },
          {
            label: 'Outstanding',
            value: formatCurrency(
              billingPeriods
                .filter(p => p.status === 'invoiced' || p.status === 'overdue')
                .reduce((sum, p) => sum + p.total_amount, 0)
            ),
            color: 'text-blue-400'
          },
          {
            label: 'Overdue',
            value: billingPeriods.filter(p => p.status === 'overdue').length,
            color: 'text-red-400'
          }
        ].map((stat, index) => (
          <div key={index} className="bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-white/10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/60 text-sm">{stat.label}</p>
                <p className={`text-lg font-semibold ${stat.color}`}>{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Billing Periods List */}
      <div className="space-y-3">
        {billingPeriods.map((period) => {
          const statusConfig = getStatusConfig(period.status);
          const StatusIcon = statusConfig.icon;

          return (
            <div key={period.period} className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10 hover:bg-white/10 transition-all">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {/* Period Header */}
                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex items-center gap-2">
                      <Calendar size={20} className="text-white/60" />
                      <h3 className="text-lg font-semibold text-white">
                        {formatDateRange(period.period_start, period.period_end)}
                      </h3>
                    </div>
                    
                    <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border ${statusConfig.color}`}>
                      <StatusIcon size={12} />
                      {statusConfig.label}
                    </div>

                    {period.total_amount > 0 && (
                      <div className="text-white font-semibold">
                        {formatCurrency(period.total_amount)}
                      </div>
                    )}

                    {/* Show Invoice Number if available */}
                    {period.invoice_number && (
                      <div className="text-blue-400 font-medium text-sm bg-blue-400/10 px-2 py-1 rounded">
                        {period.invoice_number}
                      </div>
                    )}
                  </div>

                  {/* Charges List */}
                  {period.charges.length > 0 ? (
                    <div className="space-y-2 mb-4">
                      {period.charges.map((charge) => (
                        <div key={charge.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                          <div className="flex items-center gap-3">
                            <DirhamSign size={16} className="text-white/60" />
                            <div>
                              <span className="text-white text-sm font-medium">
                                {getChargeTypeLabel(charge.charge_type)}
                              </span>
                              {charge.comment && (
                                <p className="text-white/50 text-xs mt-1">{charge.comment}</p>
                              )}
                              {charge.invoice_number && (
                                <p className="text-blue-400 text-xs mt-1 font-medium">{charge.invoice_number}</p>
                              )}
                            </div>
                          </div>
                          
                          <div className="text-right">
                            <div className={`text-white font-medium text-sm ${
                              charge.charge_type === 'refund' || charge.total_amount < 0 
                                ? 'text-green-400' 
                                : charge.comment?.startsWith('PAYMENT') 
                                  ? 'text-green-400' 
                                  : 'text-white'
                            }`}>
                              {(charge.charge_type === 'refund' || charge.total_amount < 0) && '🔄 '}
                              {charge.comment?.startsWith('PAYMENT') && '💳 '}
                              {formatCurrency(charge.total_amount)}
                            </div>
                            <div className={`text-xs px-2 py-1 rounded-full ${
                              charge.status === 'pending' ? 'text-yellow-400 bg-yellow-400/10' :
                              charge.status === 'invoiced' ? 'text-blue-400 bg-blue-400/10' :
                              charge.status === 'paid' ? 'text-green-400 bg-green-400/10' :
                              'text-red-400 bg-red-400/10'
                            }`}>
                              {charge.status.toUpperCase()}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 mb-4">
                      <p className="text-white/40 text-sm">No charges recorded for this period</p>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    <button
                      onClick={() => onAddChargeForPeriod(period.period)}
                      className="flex items-center gap-2 px-4 py-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-all border border-white/10 text-sm"
                    >
                      <Plus size={14} />
                      Add Charge
                    </button>

                    {period.charges.length > 0 && !period.has_invoice && (
                      <button
                        onClick={() => onGenerateInvoice(period.period, period.charges)}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-br from-gray-200 via-gray-100 to-gray-400 text-black font-medium rounded-lg hover:shadow-lg transition-all text-sm"
                      >
                        <FileText size={14} />
                        Generate Invoice
                      </button>
                    )}

                    {period.has_invoice && (
                      <button
                        className="flex items-center gap-2 px-4 py-2 text-blue-400 hover:text-blue-300 hover:bg-blue-400/10 rounded-lg transition-all border border-blue-400/20 text-sm"
                        title={`View Invoice ${period.invoice_number || period.invoice_id}`}
                      >
                        <FileText size={14} />
                        View Invoice {period.invoice_number && `(${period.invoice_number})`}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
