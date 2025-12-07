"use client";
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';

// ===== TYPES =====
export interface AccountingStatus {
  leadId: string;
  hasSalesOrder: boolean;
  salesOrderId?: string;
  salesOrderNumber?: string;
  salesOrderStatus?: 'draft' | 'invoiced' | 'lost';
  hasInvoice: boolean;
  invoiceId?: string;
  invoiceNumber?: string;
  invoiceStatus?: 'pending' | 'partial' | 'paid' | 'reversed';
  totalAmount: number;
  paidAmount: number;
  balanceDue: number;
}

export type AccountingStatusMap = Map<string, AccountingStatus>;

// ===== HOOK =====
export function useAccountingStatus(leadIds: string[]) {
  const [statusMap, setStatusMap] = useState<AccountingStatusMap>(new Map());
  const [loading, setLoading] = useState(true);

  // Fetch accounting status for given lead IDs
  const fetchStatus = useCallback(async (ids: string[]) => {
    if (ids.length === 0) {
      setLoading(false);
      return;
    }

    try {
      // Fetch sales orders with their latest invoice status
      const { data: salesOrders, error: soError } = await supabase
        .from('uv_sales_orders')
        .select(`
          id,
          order_number,
          status,
          lead_id,
          uv_invoices (
            id,
            invoice_number,
            status,
            total_amount,
            paid_amount,
            balance_due
          )
        `)
        .in('lead_id', ids);

      if (soError) throw soError;

      // Build the status map
      const newMap = new Map<string, AccountingStatus>();

      // Initialize all leads with empty status
      ids.forEach(leadId => {
        newMap.set(leadId, {
          leadId,
          hasSalesOrder: false,
          hasInvoice: false,
          totalAmount: 0,
          paidAmount: 0,
          balanceDue: 0
        });
      });

      // Update with actual data
      (salesOrders || []).forEach((so: any) => {
        // Find the active (non-reversed) invoice, or the latest one
        const invoices = so.uv_invoices || [];
        const activeInvoice = invoices.find((inv: any) => inv.status !== 'reversed') || invoices[0];

        newMap.set(so.lead_id, {
          leadId: so.lead_id,
          hasSalesOrder: true,
          salesOrderId: so.id,
          salesOrderNumber: so.order_number,
          salesOrderStatus: so.status,
          hasInvoice: !!activeInvoice,
          invoiceId: activeInvoice?.id,
          invoiceNumber: activeInvoice?.invoice_number,
          invoiceStatus: activeInvoice?.status,
          totalAmount: activeInvoice?.total_amount || 0,
          paidAmount: activeInvoice?.paid_amount || 0,
          balanceDue: activeInvoice?.balance_due || 0
        });
      });

      setStatusMap(newMap);
    } catch (error) {
      console.error('Error fetching accounting status:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchStatus(leadIds);
  }, [leadIds.join(',')]); // Re-fetch when lead IDs change

  // Real-time subscription for sales orders
  useEffect(() => {
    if (leadIds.length === 0) return;

    const salesOrderChannel = supabase
      .channel('accounting-sales-orders')
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'uv_sales_orders',
          filter: `lead_id=in.(${leadIds.join(',')})`
        },
        (payload: any) => {
          console.log('Sales Order change:', payload);
          // Refetch status for the affected lead
          const leadId = payload.new?.lead_id || payload.old?.lead_id;
          if (leadId) {
            fetchStatus([leadId]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(salesOrderChannel);
    };
  }, [leadIds.join(','), fetchStatus]);

  // Real-time subscription for invoices
  useEffect(() => {
    if (leadIds.length === 0) return;

    // We need to get the sales order IDs first to filter invoices
    const invoiceChannel = supabase
      .channel('accounting-invoices')
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'uv_invoices'
        },
        async (payload: any) => {
          console.log('Invoice change:', payload);
          // Get the sales order to find the lead_id
          const salesOrderId = payload.new?.sales_order_id || payload.old?.sales_order_id;
          if (salesOrderId) {
            const { data: so } = await supabase
              .from('uv_sales_orders')
              .select('lead_id')
              .eq('id', salesOrderId)
              .single();
            
            if (so && leadIds.includes(so.lead_id)) {
              fetchStatus([so.lead_id]);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(invoiceChannel);
    };
  }, [leadIds.join(','), fetchStatus]);

  // Real-time subscription for payments (affects invoice paid_amount)
  useEffect(() => {
    if (leadIds.length === 0) return;

    const paymentChannel = supabase
      .channel('accounting-payments')
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'uv_payments',
          filter: `lead_id=in.(${leadIds.join(',')})`
        },
        (payload: any) => {
          console.log('Payment change:', payload);
          const leadId = payload.new?.lead_id || payload.old?.lead_id;
          if (leadId) {
            fetchStatus([leadId]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(paymentChannel);
    };
  }, [leadIds.join(','), fetchStatus]);

  // Helper to get status for a specific lead
  const getStatus = useCallback((leadId: string): AccountingStatus | undefined => {
    return statusMap.get(leadId);
  }, [statusMap]);

  // Helper to get badge info for a lead
  const getBadgeInfo = useCallback((leadId: string): { 
    color: string; 
    label: string; 
    icon: 'none' | 'draft' | 'pending' | 'partial' | 'paid' | 'reversed';
  } => {
    const status = statusMap.get(leadId);
    
    if (!status?.hasSalesOrder) {
      return { color: 'bg-white/20', label: 'No SO', icon: 'none' };
    }
    
    if (!status.hasInvoice) {
      return { color: 'bg-blue-500/30', label: 'Draft', icon: 'draft' };
    }
    
    switch (status.invoiceStatus) {
      case 'paid':
        return { color: 'bg-green-500/30', label: 'Paid', icon: 'paid' };
      case 'partial':
        return { color: 'bg-yellow-500/30', label: 'Partial', icon: 'partial' };
      case 'pending':
        return { color: 'bg-orange-500/30', label: 'Pending', icon: 'pending' };
      case 'reversed':
        return { color: 'bg-red-500/30', label: 'Reversed', icon: 'reversed' };
      default:
        return { color: 'bg-white/20', label: 'Unknown', icon: 'none' };
    }
  }, [statusMap]);

  return {
    statusMap,
    loading,
    getStatus,
    getBadgeInfo,
    refetch: () => fetchStatus(leadIds)
  };
}
