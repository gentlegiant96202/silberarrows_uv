'use client';
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useUserRole } from '@/lib/useUserRole';
import { FileText, Download, Eye, Filter, Search, Calendar, Shield } from 'lucide-react';

interface ReservationInvoice {
  id: string;
  document_type: 'reservation' | 'invoice';
  document_number: string | null;
  customer_name: string;
  vehicle_make_model: string;
  invoice_total: number;
  document_date: string;
  sales_executive: string;
  pdf_url: string | null;
  created_at: string;
}

interface FilterState {
  month: string;
  year: string;
  type: 'all' | 'reservation' | 'invoice';
  search: string;
}

export default function ReservationsInvoicesGrid() {
  const [data, setData] = useState<ReservationInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<FilterState>({
    month: new Date().getMonth() + 1 + '', // Current month
    year: new Date().getFullYear() + '', // Current year
    type: 'all',
    search: ''
  });
  
  const { role, isLoading: roleLoading } = useUserRole();

  const months = [
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

  const years = [2024, 2025, 2026, 2027].map(year => ({ 
    value: year.toString(), 
    label: year.toString() 
  }));

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
          customer_name,
          vehicle_make_model,
          invoice_total,
          document_date,
          sales_executive,
          pdf_url,
          created_at
        `)
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters.type !== 'all') {
        query = query.eq('document_type', filters.type);
      }

      // Apply month/year filter
      const startOfMonth = `${filters.year}-${filters.month.padStart(2, '0')}-01`;
      const nextMonth = parseInt(filters.month) === 12 
        ? `${parseInt(filters.year) + 1}-01-01`
        : `${filters.year}-${(parseInt(filters.month) + 1).toString().padStart(2, '0')}-01`;
      
      query = query.gte('document_date', startOfMonth);
      query = query.lt('document_date', nextMonth);

      const { data: reservationsData, error } = await query;

      if (error) {
        console.error('Error fetching data:', error);
        return;
      }

      let filteredData = reservationsData || [];

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

  const handleViewPDF = (pdfUrl: string) => {
    window.open(pdfUrl, '_blank');
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Month Filter */}
          <div>
            <label className="block text-xs font-medium text-white/70 mb-1">Month</label>
            <select
              value={filters.month}
              onChange={(e) => setFilters(prev => ({ ...prev, month: e.target.value }))}
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white text-sm"
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
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white text-sm"
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
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white text-sm"
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
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-white/40" />
              <input
                type="text"
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                placeholder="Customer, vehicle, sales rep..."
                className="w-full pl-10 pr-3 py-2 bg-white/10 border border-white/20 rounded text-white text-sm placeholder-white/40"
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
                      {item.pdf_url ? (
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleViewPDF(item.pdf_url!)}
                            className="p-1.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded transition-colors"
                            title="View PDF"
                          >
                            <Eye className="w-4 h-4 text-white/70" />
                          </button>
                          <button
                            onClick={() => handleDownloadPDF(item.pdf_url!, item.document_number, item.customer_name)}
                            className="p-1.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded transition-colors"
                            title="Download PDF"
                          >
                            <Download className="w-4 h-4 text-white/70" />
                          </button>
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
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
          <div>
            <p className="text-2xl font-bold text-white">
              {formatCurrency(data.reduce((sum, item) => sum + item.invoice_total, 0))}
            </p>
            <p className="text-sm text-white/60">Total Value</p>
          </div>
        </div>
      </div>
    </div>
  );
}
