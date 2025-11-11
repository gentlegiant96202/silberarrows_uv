"use client";
import React, { useState, useEffect, useRef } from 'react';
import {
  Upload,
  Download,
  RefreshCw,
  Receipt,
  AlertCircle,
  Filter,
  X,
  FileSpreadsheet,
  TrendingUp,
  Users,
  AlertTriangle,
  Calendar
} from 'lucide-react';
import DirhamIcon from '@/components/ui/DirhamIcon';
import type { ServiceReceivable, ReceivablesStats, ExcelParseResult } from '@/types/receivables';
import { parseReceivablesExcel, validateParsedData } from '@/lib/parsers/receivablesExcelParser';

interface ReceivablesManagerProps {
  onRefresh?: () => Promise<void>;
}

export default function ReceivablesManager({ onRefresh }: ReceivablesManagerProps) {
  const [receivables, setReceivables] = useState<ServiceReceivable[]>([]);
  const [stats, setStats] = useState<ReceivablesStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parseResult, setParseResult] = useState<ExcelParseResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [selectedAdvisor, setSelectedAdvisor] = useState<string>('all');
  const [selectedAgingBucket, setSelectedAgingBucket] = useState<string>('all');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch data on mount
  useEffect(() => {
    fetchReceivables();
    fetchStats();
  }, [selectedAdvisor, selectedAgingBucket]);

  const fetchReceivables = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams();
      if (selectedAdvisor !== 'all') params.set('advisor', selectedAdvisor);
      if (selectedAgingBucket !== 'all') params.set('aging_bucket', selectedAgingBucket);

      const response = await fetch(`/api/service/receivables?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch receivables');
      }

      setReceivables(data.receivables || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
      console.error('Error fetching receivables:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/service/receivables?stats=true');
      const data = await response.json();
      setStats(data);
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setError(null);

    // Parse file for preview
    try {
      const result = await parseReceivablesExcel(file);
      setParseResult(result);

      const validation = validateParsedData(result);
      if (!validation.valid) {
        setError(validation.errors.join('; '));
      }
    } catch (err) {
      setError('Failed to parse Excel file');
      console.error(err);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !parseResult) return;

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('replace_existing', 'true'); // Replace existing data

      const response = await fetch('/api/service/receivables/upload', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      // Success
      alert(`✅ Successfully imported ${data.records_imported} records from ${data.advisors_count} advisors`);
      setShowUploadModal(false);
      setSelectedFile(null);
      setParseResult(null);
      
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      // Refresh data
      await fetchReceivables();
      await fetchStats();
      if (onRefresh) await onRefresh();

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
      console.error('Upload error:', err);
    } finally {
      setUploading(false);
    }
  };

  const exportToCSV = () => {
    if (receivables.length === 0) return;

    const headers = [
      'Advisor',
      'Customer ID',
      'Customer Name',
      'Date',
      'Reference',
      'Type',
      'Invoice Amount',
      'Receipt Amount',
      'Balance',
      'Age (Days)',
      'Aging'
    ];

    const rows = receivables.map(r => [
      r.advisor_name,
      r.customer_id,
      r.customer_name,
      r.transaction_date,
      r.reference_number,
      r.transaction_type,
      r.invoice_amount.toFixed(2),
      r.receipt_amount.toFixed(2),
      r.balance.toFixed(2),
      r.age_days,
      r.aging_bucket || ''
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `receivables_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatCurrency = (amount: number) => {
    return `AED ${new Intl.NumberFormat('en-AE', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)}`;
  };

  const getAgingColor = (bucket?: string) => {
    switch (bucket) {
      case '0-30': return 'bg-gradient-to-br from-gray-600/40 to-gray-700/40 text-gray-200 border-gray-500/40';
      case '31-60': return 'bg-gradient-to-br from-gray-700/50 to-gray-800/50 text-gray-300 border-gray-500/50';
      case '61-90': return 'bg-gradient-to-br from-gray-800/60 to-gray-900/60 text-gray-300 border-gray-600/50';
      case '91+': return 'bg-gradient-to-br from-black/70 to-gray-900/70 text-white border-gray-700/60';
      default: return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    }
  };

  // Group transactions by customer (for statement of account view)
  const groupedByCustomer = receivables.reduce((acc, record) => {
    const key = `${record.advisor_name}-${record.customer_id}`;
    if (!acc[key]) {
      acc[key] = {
        advisor_name: record.advisor_name,
        customer_id: record.customer_id,
        customer_name: record.customer_name,
        transactions: []
      };
    }
    acc[key].transactions.push(record);
    return acc;
  }, {} as Record<string, { advisor_name: string; customer_id: string; customer_name: string; transactions: ServiceReceivable[] }>);

  // Sort transactions within each customer by date
  Object.values(groupedByCustomer).forEach(customer => {
    customer.transactions.sort((a, b) => 
      new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime()
    );
  });

  const customerGroups = Object.values(groupedByCustomer);

  // Get unique advisors for filter
  const uniqueAdvisors = Array.from(new Set(receivables.map(r => r.advisor_name))).sort();

  return (
    <div className="w-full space-y-4">
      {/* Header */}
      <div className="backdrop-blur-md bg-gradient-to-br from-gray-900/90 via-black/80 to-gray-800/90 rounded-xl border border-gray-500/30 shadow-2xl p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-gray-600 via-gray-500 to-gray-700 flex items-center justify-center shadow-lg">
              <Receipt className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Service Receivables</h2>
              <p className="text-gray-400 text-sm">Track accounts receivable by service advisor</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowUploadModal(true)}
              className="flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 bg-gradient-to-r from-gray-700 via-gray-600 to-gray-700 hover:from-gray-600 hover:via-gray-500 hover:to-gray-600 text-white shadow-lg border border-gray-500/30"
            >
              <Upload className="w-4 h-4" />
              <span>Upload Excel</span>
            </button>

            <button
              onClick={exportToCSV}
              disabled={receivables.length === 0}
              className="flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 bg-gradient-to-r from-gray-700 via-gray-600 to-gray-700 hover:from-gray-600 hover:via-gray-500 hover:to-gray-600 text-white shadow-lg border border-gray-500/30 disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={fetchReceivables}
              disabled={loading}
              className="flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-600 hover:to-gray-700 text-white shadow-md border border-gray-500/30"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="backdrop-blur-md bg-gradient-to-br from-gray-800/90 via-gray-700/80 to-gray-800/90 rounded-lg border border-gray-500/30 p-4 shadow-xl">
            <div className="flex items-center space-x-2 mb-2">
              <DirhamIcon className="w-5 h-5 text-gray-300" />
              <span className="text-xs font-medium text-gray-300 uppercase tracking-wider">Total Outstanding</span>
            </div>
            <div className="text-2xl font-bold text-white">{formatCurrency(stats.total_outstanding)}</div>
          </div>

          <div className="backdrop-blur-md bg-gradient-to-br from-gray-700/80 via-gray-600/70 to-gray-700/80 rounded-lg border border-gray-400/30 p-4 shadow-lg">
            <div className="flex items-center space-x-2 mb-2">
              <TrendingUp className="w-5 h-5 text-gray-200" />
              <span className="text-xs font-medium text-gray-200 uppercase tracking-wider">0-30 Days</span>
            </div>
            <div className="text-2xl font-bold text-white">{formatCurrency(stats.aging_breakdown.days_0_30)}</div>
          </div>

          <div className="backdrop-blur-md bg-gradient-to-br from-gray-700/80 via-gray-600/70 to-gray-700/80 rounded-lg border border-gray-400/30 p-4 shadow-lg">
            <div className="flex items-center space-x-2 mb-2">
              <Calendar className="w-5 h-5 text-gray-200" />
              <span className="text-xs font-medium text-gray-200 uppercase tracking-wider">31-60 Days</span>
            </div>
            <div className="text-2xl font-bold text-white">{formatCurrency(stats.aging_breakdown.days_31_60)}</div>
          </div>

          <div className="backdrop-blur-md bg-gradient-to-br from-gray-700/80 via-gray-600/70 to-gray-700/80 rounded-lg border border-gray-400/30 p-4 shadow-lg">
            <div className="flex items-center space-x-2 mb-2">
              <AlertCircle className="w-5 h-5 text-gray-200" />
              <span className="text-xs font-medium text-gray-200 uppercase tracking-wider">61-90 Days</span>
            </div>
            <div className="text-2xl font-bold text-white">{formatCurrency(stats.aging_breakdown.days_61_90)}</div>
          </div>

          <div className="backdrop-blur-md bg-gradient-to-br from-gray-800/90 via-gray-700/80 to-gray-800/90 rounded-lg border border-gray-500/30 p-4 shadow-xl">
            <div className="flex items-center space-x-2 mb-2">
              <AlertTriangle className="w-5 h-5 text-gray-300" />
              <span className="text-xs font-medium text-gray-300 uppercase tracking-wider">91+ Days (At Risk)</span>
            </div>
            <div className="text-2xl font-bold text-white">{formatCurrency(stats.aging_breakdown.days_91_plus)}</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="backdrop-blur-md bg-gradient-to-br from-gray-900/90 via-black/80 to-gray-800/90 rounded-xl border border-gray-500/30 p-4">
        <div className="flex items-center space-x-4">
          <Filter className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-300">Filters:</span>

          <select
            value={selectedAdvisor}
            onChange={(e) => setSelectedAdvisor(e.target.value)}
            className="px-3 py-1.5 bg-black/40 border border-gray-500/30 rounded-lg text-white text-sm focus:ring-2 focus:ring-gray-400"
          >
            <option value="all">All Advisors</option>
            {uniqueAdvisors.map(advisor => (
              <option key={advisor} value={advisor}>{advisor}</option>
            ))}
          </select>

          <select
            value={selectedAgingBucket}
            onChange={(e) => setSelectedAgingBucket(e.target.value)}
            className="px-3 py-1.5 bg-black/40 border border-gray-500/30 rounded-lg text-white text-sm focus:ring-2 focus:ring-gray-400"
          >
            <option value="all">All Aging</option>
            <option value="0-30">0-30 Days</option>
            <option value="31-60">31-60 Days</option>
            <option value="61-90">61-90 Days</option>
            <option value="91+">91+ Days</option>
          </select>

          {(selectedAdvisor !== 'all' || selectedAgingBucket !== 'all') && (
            <button
              onClick={() => {
                setSelectedAdvisor('all');
                setSelectedAgingBucket('all');
              }}
              className="flex items-center space-x-1 px-2 py-1 text-xs text-gray-400 hover:text-white"
            >
              <X className="w-3 h-3" />
              <span>Clear</span>
            </button>
          )}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="flex items-center space-x-2 p-3 bg-red-900/20 border border-red-600/50 rounded-lg text-red-400">
          <AlertCircle className="w-4 h-4" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* Data Table */}
      <div className="backdrop-blur-md bg-gradient-to-br from-gray-900/90 via-black/80 to-gray-800/90 rounded-xl border border-gray-500/30 shadow-2xl overflow-hidden">
        <div className="overflow-x-auto max-w-full">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gradient-to-r from-gray-600/30 via-gray-500/30 to-gray-600/30 backdrop-blur-sm border-b border-gray-400/30">
                <th className="px-3 py-4 text-left text-gray-100 font-semibold">Advisor</th>
                <th className="px-3 py-4 text-left text-gray-100 font-semibold">Customer</th>
                <th className="px-3 py-4 text-left text-gray-100 font-semibold">Date</th>
                <th className="px-3 py-4 text-left text-gray-100 font-semibold">Reference</th>
                <th className="px-3 py-4 text-right text-gray-100 font-semibold">Invoice</th>
                <th className="px-3 py-4 text-right text-gray-100 font-semibold">Receipt</th>
                <th className="px-3 py-4 text-right text-gray-100 font-semibold">Balance</th>
                <th className="px-3 py-4 text-center text-gray-100 font-semibold">Age</th>
                <th className="px-3 py-4 text-center text-gray-100 font-semibold">Aging</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-3 py-8 text-center text-white/60">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
                    Loading receivables...
                  </td>
                </tr>
              ) : customerGroups.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-3 py-8 text-center text-white/60">
                    No receivables data. Upload an Excel file to get started.
                  </td>
                </tr>
              ) : (
                customerGroups.map((customer, groupIndex) => {
                  const finalBalance = customer.transactions[customer.transactions.length - 1];
                  return (
                    <React.Fragment key={`${customer.advisor_name}-${customer.customer_id}`}>
                      {/* Customer Header Row */}
                      <tr className="bg-gradient-to-r from-gray-700/40 to-gray-600/40 border-t-2 border-gray-500/50">
                        <td className="px-3 py-3 font-bold text-white" colSpan={2}>
                          <div className="flex items-center space-x-3">
                            <span className="text-sm">{customer.advisor_name}</span>
                            <span className="text-gray-400">→</span>
                            <span className="text-base">{customer.customer_name}</span>
                            <span className="text-xs text-gray-400">(ID: {customer.customer_id})</span>
                          </div>
                        </td>
                        <td colSpan={5} className="px-3 py-3 text-right">
                          <span className="text-xs text-gray-300 mr-2">Final Balance:</span>
                          <span className="text-lg font-bold text-white">{formatCurrency(finalBalance.balance)}</span>
                        </td>
                        <td className="px-3 py-3 text-center text-gray-300 font-mono text-sm">
                          {finalBalance.age_days}d
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span className={`px-3 py-1 rounded-md border text-xs font-semibold ${getAgingColor(finalBalance.aging_bucket)}`}>
                            {finalBalance.aging_bucket}
                          </span>
                        </td>
                      </tr>
                      
                      {/* Transaction Rows */}
                      {customer.transactions.map((record, index) => {
                        const isLastTransaction = index === customer.transactions.length - 1;
                        return (
                          <tr
                            key={record.id}
                            className={`border-b border-gray-400/10 hover:bg-gray-300/5 transition-colors ${
                              isLastTransaction ? 'bg-blue-900/10 border-b-2 border-blue-500/30' : 'bg-black/5'
                            }`}
                          >
                            <td className="px-3 py-2 text-gray-400 text-xs pl-8">
                              {isLastTransaction && '→ '}
                            </td>
                            <td className="px-3 py-2 text-gray-400 text-xs">
                              {isLastTransaction ? (
                                <span className="text-blue-300 font-semibold">Final Balance</span>
                              ) : (
                                <span>Transaction {index + 1}</span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-gray-300 font-mono text-xs">
                              {new Date(record.transaction_date).toLocaleDateString('en-GB')}
                            </td>
                            <td className="px-3 py-2 text-gray-300 font-mono text-xs">{record.reference_number}</td>
                            <td className="px-3 py-2 text-right text-gray-300 font-mono text-xs">
                              {record.invoice_amount > 0 ? formatCurrency(record.invoice_amount) : '-'}
                            </td>
                            <td className="px-3 py-2 text-right text-gray-300 font-mono text-xs">
                              {record.receipt_amount > 0 ? formatCurrency(record.receipt_amount) : '-'}
                            </td>
                            <td className={`px-3 py-2 text-right font-mono text-sm ${
                              isLastTransaction ? 'text-white font-bold' : 
                              record.balance < 0 ? 'text-green-300' : 'text-gray-300'
                            }`}>
                              {formatCurrency(record.balance)}
                            </td>
                            <td className="px-3 py-2 text-center text-gray-400 font-mono text-xs">{record.age_days}d</td>
                            <td className="px-3 py-2 text-center">
                              <span className={`px-2 py-1 rounded-md border text-xs font-semibold ${
                                isLastTransaction 
                                  ? getAgingColor(record.aging_bucket)
                                  : 'bg-gray-800/20 text-gray-400 border-gray-600/30'
                              }`}>
                                {record.aging_bucket || '-'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-600 rounded-lg p-6 max-w-3xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white flex items-center space-x-2">
                <FileSpreadsheet className="w-5 h-5" />
                <span>Upload Receivables Excel</span>
              </h3>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Select Excel File
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileSelect}
                  className="block w-full text-sm text-gray-300 bg-gray-800 border border-gray-600 rounded-lg cursor-pointer focus:outline-none"
                />
                <p className="mt-1 text-xs text-gray-400">
                  Upload the accounts receivable report with multiple advisor sheets (DANIEL, ESSRAR, LUCY, etc.)
                </p>
              </div>

              {parseResult && parseResult.sheets.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-start space-x-2 p-3 bg-green-900/20 border border-green-600/50 rounded-lg text-green-400">
                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <div className="text-xs">
                      <p className="font-medium">File parsed successfully!</p>
                      <p className="text-green-400/80 mt-1">
                        Found {parseResult.sheets.length} advisor sheet(s) with {parseResult.total_records} transaction records.
                      </p>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-gray-300 mb-2">Preview</h4>
                    <div className="border border-gray-600 rounded-lg overflow-hidden">
                      <table className="w-full text-xs">
                        <thead className="bg-gray-800">
                          <tr>
                            <th className="px-2 py-1 text-left">Advisor</th>
                            <th className="px-2 py-1 text-left">Report Date</th>
                            <th className="px-2 py-1 text-right">Records</th>
                          </tr>
                        </thead>
                        <tbody>
                          {parseResult.sheets.map((sheet, index) => (
                            <tr key={index} className="border-t border-gray-700">
                              <td className="px-2 py-1 text-gray-200">{sheet.advisor_name}</td>
                              <td className="px-2 py-1 text-gray-200">{sheet.report_date}</td>
                              <td className="px-2 py-1 text-right text-gray-200">{sheet.transactions.length}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="flex items-start space-x-2 p-3 bg-yellow-900/20 border border-yellow-600/50 rounded-lg text-yellow-400">
                    <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <div className="text-xs">
                      <p className="font-medium">This will replace all existing receivables data</p>
                      <p className="text-yellow-400/80 mt-1">
                        All current receivables records will be deleted and replaced with the data from this file.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {error && (
                <div className="flex items-start space-x-2 p-3 bg-red-900/20 border border-red-600/50 rounded-lg text-red-400">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <div className="text-xs">
                    <p className="font-medium">Error</p>
                    <p className="text-red-400/80 mt-1">{error}</p>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end space-x-3 pt-4">
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpload}
                  disabled={!parseResult || parseResult.sheets.length === 0 || uploading || !!error}
                  className="px-4 py-2 bg-gradient-to-r from-gray-700 via-gray-600 to-gray-700 hover:from-gray-600 hover:via-gray-500 hover:to-gray-600 text-white rounded-lg shadow-lg border border-gray-500/30 disabled:opacity-50 flex items-center space-x-2"
                >
                  {uploading && <RefreshCw className="w-4 h-4 animate-spin" />}
                  <span>{uploading ? 'Uploading...' : 'Import Data'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

