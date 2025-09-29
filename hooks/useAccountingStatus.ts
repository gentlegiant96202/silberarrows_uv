import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { getAccountingStatus } from '@/components/modules/leasing/accounting/IFRSAccountingDashboard';

interface AccountingStatus {
  status: string;
  color: string;
  description: string;
  loading: boolean;
  refresh: () => void;
  currentBillingPeriod: {
    startDate: string;
    endDate: string;
    periodKey: string;
  } | null;
}

export function useAccountingStatus(leaseId: string, leaseStartDate: string): AccountingStatus {
  const [status, setStatus] = useState<AccountingStatus>({
    status: "Loading...",
    color: "gray",
    description: "Checking accounting status...",
    loading: true,
    refresh: () => {},
    currentBillingPeriod: null
  });

  useEffect(() => {
    if (!leaseId || !leaseStartDate) {
      setStatus({
        status: "No Data",
        color: "gray",
        description: "No lease data available",
        loading: false,
        refresh: () => {},
        currentBillingPeriod: null
      });
      return;
    }

    const fetchAccountingStatus = async () => {
      try {
        // Calculate current billing period
        const today = new Date();
        const leaseStart = new Date(leaseStartDate);
        
        // Calculate current billing period (monthly from lease start)
        const monthsSinceStart = (today.getFullYear() - leaseStart.getFullYear()) * 12 + 
                                (today.getMonth() - leaseStart.getMonth());
        const currentPeriodStart = new Date(leaseStart.getFullYear(), leaseStart.getMonth() + monthsSinceStart, leaseStart.getDate());
        const currentPeriodEnd = new Date(leaseStart.getFullYear(), leaseStart.getMonth() + monthsSinceStart + 1, leaseStart.getDate() - 1);
        
        const currentPeriodKey = currentPeriodStart.toISOString().split('T')[0];
        
        const currentBillingPeriod = {
          startDate: currentPeriodStart.toISOString().split('T')[0],
          endDate: currentPeriodEnd.toISOString().split('T')[0],
          periodKey: currentPeriodKey
        };

        console.log('📅 Billing Period Calculation:', {
          leaseStartDate,
          today: today.toISOString().split('T')[0],
          monthsSinceStart,
          currentPeriodStart: currentPeriodStart.toISOString().split('T')[0],
          currentPeriodEnd: currentPeriodEnd.toISOString().split('T')[0],
          currentBillingPeriod
        });

        // Fetch accounting records
        const { data: records, error: recordsError } = await supabase
          .from('ifrs_lease_accounting')
          .select('*')
          .eq('lease_id', leaseId)
          .is('deleted_at', null);

        if (recordsError) throw recordsError;

        // Fetch invoices (grouped by invoice_id)
        const { data: invoiceData, error: invoiceError } = await supabase
          .from('ifrs_lease_accounting')
          .select('*')
          .eq('lease_id', leaseId)
          .not('invoice_id', 'is', null)
          .is('deleted_at', null);

        if (invoiceError) throw invoiceError;

        // Group by invoice_id to create invoice objects
        const invoiceGroups: { [key: string]: any } = {};
        
        invoiceData?.forEach(record => {
          if (record.invoice_id) {
            if (!invoiceGroups[record.invoice_id]) {
              invoiceGroups[record.invoice_id] = {
                invoice_id: record.invoice_id,
                invoice_number: record.invoice_number,
                billing_period: record.billing_period,
                created_at: record.created_at,
                charges: [],
                total_amount: 0,
                is_paid: false
              };
            }
            
            invoiceGroups[record.invoice_id].charges.push(record);
            invoiceGroups[record.invoice_id].total_amount += record.total_amount;
          }
        });

        // Check payment status for each invoice
        const invoiceIds = Object.keys(invoiceGroups);
        if (invoiceIds.length > 0) {
          const { data: paymentData, error: paymentError } = await supabase
            .from('ifrs_payment_applications')
            .select('invoice_id, applied_amount')
            .in('invoice_id', invoiceIds);

          if (!paymentError && paymentData) {
            // Calculate payment status for each invoice
            Object.values(invoiceGroups).forEach((invoice: any) => {
              const totalPaid = paymentData
                .filter(payment => payment.invoice_id === invoice.invoice_id)
                .reduce((sum, payment) => sum + payment.applied_amount, 0);
              
              invoice.is_paid = totalPaid >= invoice.total_amount - 0.01; // Allow for small rounding differences
            });
          }
        }

        const invoices = Object.values(invoiceGroups);
        
        // Get the accounting status
        const accountingStatus = getAccountingStatus(records || [], invoices, leaseStartDate);
        
        setStatus({
          ...accountingStatus,
          loading: false,
          refresh: fetchAccountingStatus,
          currentBillingPeriod
        });

      } catch (error) {
        console.error('Error fetching accounting status:', error);
        setStatus({
          status: "Error",
          color: "red",
          description: "Failed to load accounting status",
          loading: false,
          refresh: fetchAccountingStatus,
          currentBillingPeriod: null
        });
      }
    };

    fetchAccountingStatus();

    // Set up real-time subscriptions for accounting data changes
    const accountingChannel = supabase
      .channel(`accounting-${leaseId}`)
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'ifrs_lease_accounting',
          filter: `lease_id=eq.${leaseId}`
        }, 
        () => {
          console.log('Accounting data changed, refreshing status...');
          fetchAccountingStatus();
        }
      )
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'ifrs_payment_applications'
        }, 
        () => {
          console.log('Payment applications changed, refreshing status...');
          fetchAccountingStatus();
        }
      )
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(accountingChannel);
    };
  }, [leaseId, leaseStartDate]);

  return status;
}
