'use client';
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useUserRole } from '@/lib/useUserRole';
import { FileText, Download, Eye, Filter, Search, Calendar, Shield } from 'lucide-react';
import { FilePlus2, Loader2 } from 'lucide-react';

interface ReservationInvoice {
  id: string;
  document_type: 'reservation' | 'invoice';
  document_number: string | null;
  original_reservation_number: string | null;
  customer_name: string;
  vehicle_make_model: string;
  invoice_total: number;
  document_date: string;
  sales_executive: string;
  pdf_url: string | null; // Legacy column
  reservation_pdf_url: string | null;
  invoice_pdf_url: string | null;
  signed_pdf_url: string | null;
  signing_status: string | null;
  docusign_envelope_id: string | null;
  created_at: string;
}

interface FilterState {
  month: string | 'all';
  year: string | 'all';
  type: 'all' | 'reservation' | 'invoice';
  search: string;
}

export default function ReservationsInvoicesGrid() {
  const [data, setData] = useState<ReservationInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [taxLoadingId, setTaxLoadingId] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    month: 'all', // Default to all months
    year: 'all', // Default to all years
    type: 'invoice', // Default to invoices only
    search: ''
  });
  
  const { role, isLoading: roleLoading } = useUserRole();

  const months = [
    { value: 'all', label: 'All Months' },
    { value: '1', label: 'January' },
    { value: '2', label: 'February' },
    { value: '3', label: 'March' },
    { value: '4', label: 'April' },
    { value: '5', label: 'May' },
    { value: '6', label: 'June' },
    { value: '7', label: 'July' },
    { value: '8', label: 'August' },
    { value: '9', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' }
  ];

  const years = [
    { value: 'all', label: 'All Years' },
    ...Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i).map(year => ({ 
      value: year.toString(), 
      label: year.toString() 
    }))
  ];

  const fetchData = async () => {
    try {
      setLoading(true);
      console.log('🔍 Fetching reservations and invoices with filters:', filters);

      let query = supabase
        .from('vehicle_reservations')
        .select(`
          id,
          document_type,
          document_number,
          original_reservation_number,
          customer_name,
          vehicle_make_model,
          invoice_total,
          document_date,
          sales_executive,
          pdf_url,
          reservation_pdf_url,
          invoice_pdf_url,
          signed_pdf_url,
          signing_status,
          docusign_envelope_id,
          created_at
        `)
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters.type !== 'all') {
        query = query.eq('document_type', filters.type);
      }

      // Apply month/year filter (only if not "all")
      if (filters.month !== 'all' && filters.year !== 'all') {
        // Both month and year specified
        const startOfMonth = `${filters.year}-${filters.month.padStart(2, '0')}-01`;
        const nextMonth = parseInt(filters.month) === 12 
          ? `${parseInt(filters.year) + 1}-01-01`
          : `${filters.year}-${(parseInt(filters.month) + 1).toString().padStart(2, '0')}-01`;
        
        query = query.gte('document_date', startOfMonth);
        query = query.lt('document_date', nextMonth);
      } else if (filters.year !== 'all' && filters.month === 'all') {
        // Only year specified, show entire year
        const startOfYear = `${filters.year}-01-01`;
        const nextYear = `${parseInt(filters.year) + 1}-01-01`;
        
        query = query.gte('document_date', startOfYear);
        query = query.lt('document_date', nextYear);
      } else if (filters.month !== 'all' && filters.year === 'all') {
        // Only month specified across all years - filter by month number
        // This is more complex as we need to match month across all years
        // For now, we'll handle this in post-processing
      }
      // If both are "all", no date filtering is applied

      const { data: reservationsData, error } = await query;

      if (error) {
        console.error('Error fetching data:', error);
        return;
      }

      let filteredData = reservationsData || [];

      // Apply month-only filter if year is "all" but month is specified
      if (filters.month !== 'all' && filters.year === 'all') {
        filteredData = filteredData.filter(item => {
          const itemDate = new Date(item.document_date);
          const itemMonth = (itemDate.getMonth() + 1).toString();
          return itemMonth === filters.month;
        });
      }

      // Apply search filter
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        filteredData = filteredData.filter(item => 
          item.customer_name.toLowerCase().includes(searchTerm) ||
          item.vehicle_make_model.toLowerCase().includes(searchTerm) ||
          item.sales_executive.toLowerCase().includes(searchTerm) ||
          (item.document_number && item.document_number.toLowerCase().includes(searchTerm))
        );
      }

      console.log('📊 Fetched data:', { total: filteredData.length, filters });
      setData(filteredData);
    } catch (error) {
      console.error('Error fetching reservations/invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filters]);

  // Real-time subscription for document updates (including DocuSign status changes)
  useEffect(() => {
    console.log('🔄 Setting up real-time subscription for vehicle_reservations...');
    
    const subscription = supabase
      .channel('vehicle_reservations_updates')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'vehicle_reservations'
      }, (payload) => {
        console.log('📡 Real-time update received:', payload);
        
        // Check if the updated record matches current filters
        const updatedRecord = payload.new;
        const currentMonth = parseInt(filters.month);
        const currentYear = parseInt(filters.year);
        const recordDate = new Date(updatedRecord.document_date);
        
        if (recordDate.getMonth() + 1 === currentMonth && 
            recordDate.getFullYear() === currentYear &&
            (filters.type === 'all' || updatedRecord.document_type === filters.type)) {
          
          console.log('📊 Updated record matches filters, refreshing data...');
          fetchData();
        }
      })
      .subscribe();

    return () => {
      console.log('🔄 Cleaning up real-time subscription...');
      supabase.removeChannel(subscription);
    };
  }, [filters]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AE', {
      style: 'currency',
      currency: 'AED',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const handleViewPDF = async (pdfUrl: string) => {
    try {
      console.log('🔍 Attempting to view PDF:', pdfUrl);
      
      // Extract domain to determine PDF service
      const urlMatch = pdfUrl.match(/https?:\/\/([^\/]+)/);
      const domain = urlMatch ? urlMatch[1] : '';
      console.log('🌐 PDF domain:', domain);
      
      // Check if this is a Supabase storage URL
      const isSupabaseStorage = /\/storage\/v1\/object\//.test(pdfUrl);
       
      if (isSupabaseStorage) {
        console.log('📁 Supabase storage detected - opening directly');
        window.open(pdfUrl, '_blank');
        return;
      } else {
        console.log('🌐 External URL detected - opening directly');
        try {
          window.open(pdfUrl, '_blank');
        } catch (openErr) {
          console.log('🔄 Fallback to fetch→blob');
          const response = await fetch(pdfUrl);
          if (!response.ok) {
            throw new Error(`External PDF access failed: ${response.status} - ${response.statusText}`);
          }
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          window.open(url, '_blank');
          setTimeout(() => window.URL.revokeObjectURL(url), 2000);
        }
      }
      
    } catch (error) {
      console.error('❌ Error viewing PDF:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Full error details:', error);
      
      alert(`Unable to view PDF: ${errorMessage}\n\nThe PDF download should still work. If this continues, please contact support.`);
    }
  };

  const handleDownloadPDF = async (pdfUrl: string, documentNumber: string | null, customerName: string) => {
    try {
      const response = await fetch(pdfUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      const fileName = documentNumber 
        ? `${documentNumber}-${customerName.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`
        : `Reservation-${customerName.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
      
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading PDF:', error);
    }
  };

  const handleGenerateTaxInvoice = async (row: ReservationInvoice) => {
    setTaxLoadingId(row.id);
    try {
      // Fetch full reservation details to pass to generator
      const { data: reservations, error: fetchError } = await supabase
        .from('vehicle_reservations')
        .select('*')
        .eq('id', row.id)
        .single();

      if (fetchError || !reservations) {
        console.error('Failed to fetch reservation for tax invoice:', fetchError);
        setTaxLoadingId(null);
        return;
      }

      // Prepare payload for existing endpoint
      const payload = {
        mode: 'invoice',
        leadId: reservations.lead_id,
        reservationId: row.id,
        formData: {
          // The API merges and uses only referenced fields, so we pass what's needed
          ...reservations,
          invoiceTotal: reservations.invoice_total,
          rtaFees: reservations.rta_fees,
          addOnsTotal: reservations.add_ons_total,
          vehicleSalePrice: reservations.vehicle_sale_price,
          date: reservations.document_date,
          customerName: reservations.customer_name,
          contactNo: reservations.contact_no,
          emailAddress: reservations.email_address,
          customerIdType: reservations.customer_id_type,
          customerIdNumber: reservations.customer_id_number,
          salesExecutive: reservations.sales_executive,
          makeModel: reservations.vehicle_make_model,
          modelYear: reservations.model_year,
          exteriorColour: reservations.vehicle_exterior_colour || reservations.vehicle_colour,
          interiorColour: reservations.vehicle_interior_colour,
          chassisNo: reservations.chassis_no,
          mileage: reservations.vehicle_mileage,
          manufacturerWarranty: reservations.manufacturer_warranty,
          manufacturerWarrantyExpiryDate: reservations.manufacturer_warranty_expiry_date,
          manufacturerWarrantyExpiryMileage: reservations.manufacturer_warranty_expiry_mileage,
          dealerServicePackage: reservations.dealer_service_package,
          dealerServicePackageExpiryDate: reservations.dealer_service_package_expiry_date,
          dealerServicePackageExpiryMileage: reservations.dealer_service_package_expiry_mileage,
          hasPartExchange: reservations.has_part_exchange,
          partExchangeMakeModel: reservations.part_exchange_make_model,
          partExchangeModelYear: reservations.part_exchange_model_year,
          partExchangeChassisNo: reservations.part_exchange_chassis_no,
          partExchangeExteriorColour: reservations.part_exchange_exterior_colour,
          partExchangeEngineNo: reservations.part_exchange_engine_no,
          partExchangeMileage: reservations.part_exchange_mileage,
          partExchangeValue: reservations.part_exchange_value,
        },
        taxInvoice: true,
      } as any;

      const res = await fetch('/api/generate-vehicle-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.text();
        console.error('Tax invoice generation failed:', err);
        setTaxLoadingId(null);
        return;
      }

      const result = await res.json();
      if (result?.pdfUrl) {
        // Force download the generated PDF
        try {
          const response = await fetch(result.pdfUrl);
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);

          const baseName = row.document_number
            ? `${row.document_number}-TAX-${row.customer_name.replace(/[^a-zA-Z0-9]/g, '_')}`
            : `Invoice-TAX-${row.customer_name.replace(/[^a-zA-Z0-9]/g, '_')}`;

          const link = document.createElement('a');
          link.href = url;
          link.download = `${baseName}.pdf`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
        } catch (e) {
          console.error('Failed to download generated tax invoice:', e);
          // Fallback: open in a tab if download fails
          window.open(result.pdfUrl, '_blank');
        }
      }
      // Optionally refresh data to reflect any updates
      fetchData();
    } catch (e) {
      console.error('Error generating tax invoice:', e);
    } finally {
      setTaxLoadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Reservations & Invoices</h1>
          <p className="text-sm text-white/60">Track all reservation forms and invoices</p>
          {role && (
            <div className="flex items-center gap-2 mt-1">
              <Shield className="w-3 h-3 text-brand" />
              <span className="text-xs text-brand font-medium">
                Access: {role.charAt(0).toUpperCase() + role.slice(1)} Role
              </span>
            </div>
          )}
        </div>
        <div className="text-sm text-white/60">
          Total: {data.length} records
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white/5 backdrop-blur border border-white/10 rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          {/* Month Filter */}
          <div>
            <label className="block text-xs font-medium text-white/70 mb-1">Month</label>
            <select
              value={filters.month}
              onChange={(e) => setFilters(prev => ({ ...prev, month: e.target.value }))}
              className="w-full h-[42px] px-3 py-2 bg-white/10 border border-white/20 rounded text-white text-sm"
            >
              {months.map(month => (
                <option key={month.value} value={month.value} className="bg-gray-900">
                  {month.label}
                </option>
              ))}
            </select>
          </div>

          {/* Year Filter */}
          <div>
            <label className="block text-xs font-medium text-white/70 mb-1">Year</label>
            <select
              value={filters.year}
              onChange={(e) => setFilters(prev => ({ ...prev, year: e.target.value }))}
              className="w-full h-[42px] px-3 py-2 bg-white/10 border border-white/20 rounded text-white text-sm"
            >
              {years.map(year => (
                <option key={year.value} value={year.value} className="bg-gray-900">
                  {year.label}
                </option>
              ))}
            </select>
          </div>

          {/* Type Filter */}
          <div>
            <label className="block text-xs font-medium text-white/70 mb-1">Type</label>
            <select
              value={filters.type}
              onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value as FilterState['type'] }))}
              className="w-full h-[42px] px-3 py-2 bg-white/10 border border-white/20 rounded text-white text-sm"
            >
              <option value="all" className="bg-gray-900">All Documents</option>
              <option value="reservation" className="bg-gray-900">Reservations Only</option>
              <option value="invoice" className="bg-gray-900">Invoices Only</option>
            </select>
          </div>

          {/* Search */}
          <div>
            <label className="block text-xs font-medium text-white/70 mb-1">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-white/40" />
              <input
                type="text"
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                placeholder="Customer, vehicle, sales rep..."
                className="w-full h-[42px] pl-10 pr-3 py-2 bg-white/10 border border-white/20 rounded text-white text-sm placeholder-white/40"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white/5 backdrop-blur border border-white/10 rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-white/20 border-t-white/60 mx-auto mb-4"></div>
            <p className="text-white/60">Loading accounting records...</p>
          </div>
        ) : data.length === 0 ? (
          <div className="p-8 text-center">
            <FileText className="w-12 h-12 text-white/20 mx-auto mb-4" />
            <p className="text-white/60">No records found for the selected filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="px-4 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                    Document #
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                    Vehicle
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-white/70 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                    Sales Rep
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-white/70 uppercase tracking-wider">
                    PDF
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {data.map((item) => (
                  <tr key={item.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3">
                      {item.document_number ? (
                        <span className="px-2 py-1 bg-brand/20 border border-brand/40 rounded text-brand text-xs font-mono font-bold">
                          {item.document_number}
                        </span>
                      ) : (
                        <span className="text-white/40 text-xs">No number</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        item.document_type === 'invoice'
                          ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                          : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                      }`}>
                        {item.document_type === 'invoice' ? 'Invoice' : 'Reservation'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-white text-sm">
                      {item.customer_name}
                    </td>
                    <td className="px-4 py-3 text-white/80 text-sm">
                      {item.vehicle_make_model}
                    </td>
                    <td className="px-4 py-3 text-right text-white text-sm font-medium">
                      {formatCurrency(item.invoice_total)}
                    </td>
                    <td className="px-4 py-3 text-white/80 text-sm">
                      {formatDate(item.document_date)}
                    </td>
                    <td className="px-4 py-3 text-white/80 text-sm">
                      {item.sales_executive}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {item.reservation_pdf_url || item.invoice_pdf_url || item.pdf_url ? (
                        <div className="flex items-center justify-center gap-2">
                          {item.document_type === 'invoice' && (
                            <button
                              onClick={() => handleGenerateTaxInvoice(item)}
                              disabled={taxLoadingId === item.id}
                              className={`p-1.5 border rounded transition-colors ${
                                taxLoadingId === item.id
                                  ? 'bg-green-500/10 border-green-500/20 cursor-not-allowed'
                                  : 'bg-green-500/10 hover:bg-green-500/20 border-green-500/30'
                              }`}
                              title="Generate Tax Invoice"
                            >
                              {taxLoadingId === item.id ? (
                                <Loader2 className="w-4 h-4 text-green-400 animate-spin" />
                              ) : (
                                <FilePlus2 className="w-4 h-4 text-green-400" />
                              )}
                            </button>
                          )}
                          
                          {/* Reservation PDF - Always show if available */}
                          {(item.reservation_pdf_url || (item.document_type === 'reservation' && item.pdf_url)) && (
                            <>
                              <button
                                onClick={() => handleViewPDF(item.reservation_pdf_url || item.pdf_url!)}
                                className="p-1.5 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-400/30 rounded transition-colors"
                                title={`View Reservation PDF ${item.original_reservation_number || item.document_number}`}
                              >
                                <FileText className="w-4 h-4 text-blue-300" />
                              </button>
                              <button
                                onClick={() => handleDownloadPDF(item.reservation_pdf_url || item.pdf_url!, item.original_reservation_number || item.document_number, item.customer_name)}
                                className="p-1.5 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-400/30 rounded transition-colors"
                                title={`Download Reservation PDF ${item.original_reservation_number || item.document_number}`}
                              >
                                <Download className="w-4 h-4 text-blue-300" />
                              </button>
                            </>
                          )}
                          
                          {/* Invoice PDF - Only show for invoices */}
                          {(item.invoice_pdf_url || (item.document_type === 'invoice' && item.pdf_url)) && (
                            <>
                              {(item.reservation_pdf_url || (item.document_type === 'reservation' && item.pdf_url)) && <div className="w-px h-6 bg-white/20 mx-1"></div>}
                              <button
                                onClick={() => handleViewPDF(item.invoice_pdf_url || item.pdf_url!)}
                                className="p-1.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded transition-colors"
                                title={`View Invoice PDF ${item.document_number}`}
                              >
                                <Eye className="w-4 h-4 text-white/70" />
                              </button>
                              <button
                                onClick={() => handleDownloadPDF(item.invoice_pdf_url || item.pdf_url!, item.document_number, item.customer_name)}
                            className="p-1.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded transition-colors"
                                title={`Download Invoice PDF ${item.document_number}`}
                          >
                            <Download className="w-4 h-4 text-white/70" />
                          </button>
                            </>
                          )}
                        </div>
                      ) : (
                        <span className="text-white/40 text-xs">No PDF</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="bg-white/5 backdrop-blur border border-white/10 rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-white">
              {data.filter(item => item.document_type === 'reservation').length}
            </p>
            <p className="text-sm text-white/60">Reservations</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-white">
              {data.filter(item => item.document_type === 'invoice').length}
            </p>
            <p className="text-sm text-white/60">Invoices</p>
          </div>
        </div>
      </div>

    </div>
  );
}
