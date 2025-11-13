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
      case '0-30': return 'bg-white/10 text-white/90 border-white/20';
      case '31-60': return 'bg-white/15 text-white/90 border-white/25';
      case '61-90': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40';
      case '91+': return 'bg-red-500/20 text-red-300 border-red-500/40';
      default: return 'bg-white/10 text-white/80 border-white/20';
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
      <div className="backdrop-blur-md bg-black/90 rounded-xl border border-white/10 shadow-2xl p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-gray-200 via-gray-100 to-gray-400 flex items-center justify-center shadow-lg">
              <Receipt className="w-5 h-5 text-black" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Service Receivables</h2>
              <p className="text-white/60 text-sm">Track accounts receivable by service advisor</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowUploadModal(true)}
              className="flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 bg-gradient-to-br from-gray-200 via-gray-100 to-gray-400 text-black shadow-lg hover:shadow-xl"
            >
              <Upload className="w-4 h-4" />
              <span>Upload Excel</span>
            </button>

            <button
              onClick={exportToCSV}
              disabled={receivables.length === 0}
              className="flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 bg-black/40 backdrop-blur-sm border border-white/10 text-white/70 hover:text-white hover:bg-white/10 disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={fetchReceivables}
              disabled={loading}
              className="flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 bg-black/40 backdrop-blur-sm border border-white/10 text-white/70 hover:text-white hover:bg-white/10 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="backdrop-blur-md bg-black/90 rounded-lg border border-white/10 p-4 shadow-xl">
            <div className="flex items-center space-x-2 mb-2">
              <DirhamIcon className="w-5 h-5 text-white/90" />
              <span className="text-xs font-medium text-white/70 uppercase tracking-wider">Total Outstanding</span>
            </div>
            <div className="text-2xl font-bold text-white">{formatCurrency(stats.total_outstanding)}</div>
          </div>

          <div className="backdrop-blur-md bg-black/90 rounded-lg border border-white/10 p-4 shadow-lg">
            <div className="flex items-center space-x-2 mb-2">
              <TrendingUp className="w-5 h-5 text-white/90" />
              <span className="text-xs font-medium text-white/70 uppercase tracking-wider">0-30 Days</span>
            </div>
            <div className="text-2xl font-bold text-white">{formatCurrency(stats.aging_breakdown.days_0_30)}</div>
          </div>

          <div className="backdrop-blur-md bg-black/90 rounded-lg border border-white/10 p-4 shadow-lg">
            <div className="flex items-center space-x-2 mb-2">
              <Calendar className="w-5 h-5 text-white/90" />
              <span className="text-xs font-medium text-white/70 uppercase tracking-wider">31-60 Days</span>
            </div>
            <div className="text-2xl font-bold text-white">{formatCurrency(stats.aging_breakdown.days_31_60)}</div>
          </div>

          <div className="backdrop-blur-md bg-black/90 rounded-lg border border-white/10 p-4 shadow-lg">
            <div className="flex items-center space-x-2 mb-2">
              <AlertCircle className="w-5 h-5 text-yellow-300" />
              <span className="text-xs font-medium text-white/70 uppercase tracking-wider">61-90 Days</span>
            </div>
            <div className="text-2xl font-bold text-white">{formatCurrency(stats.aging_breakdown.days_61_90)}</div>
          </div>

          <div className="backdrop-blur-md bg-black/90 rounded-lg border border-white/10 p-4 shadow-xl">
            <div className="flex items-center space-x-2 mb-2">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              <span className="text-xs font-medium text-white/70 uppercase tracking-wider">91+ Days (At Risk)</span>
            </div>
            <div className="text-2xl font-bold text-white">{formatCurrency(stats.aging_breakdown.days_91_plus)}</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="backdrop-blur-md bg-black/90 rounded-xl border border-white/10 p-4">
        <div className="flex items-center space-x-4">
          <Filter className="w-4 h-4 text-white/60" />
          <span className="text-sm font-medium text-white">Filters:</span>

          <select
            value={selectedAdvisor}
            onChange={(e) => setSelectedAdvisor(e.target.value)}
            className="px-3 py-1.5 bg-black/60 border border-white/20 rounded-lg text-white text-sm focus:ring-2 focus:ring-white/40"
          >
            <option value="all" className="bg-black text-white">All Advisors</option>
            {uniqueAdvisors.map(advisor => (
              <option key={advisor} value={advisor} className="bg-black text-white">{advisor}</option>
            ))}
          </select>

          <select
            value={selectedAgingBucket}
            onChange={(e) => setSelectedAgingBucket(e.target.value)}
            className="px-3 py-1.5 bg-black/60 border border-white/20 rounded-lg text-white text-sm focus:ring-2 focus:ring-white/40"
          >
            <option value="all" className="bg-black text-white">All Aging</option>
            <option value="0-30" className="bg-black text-white">0-30 Days</option>
            <option value="31-60" className="bg-black text-white">31-60 Days</option>
            <option value="61-90" className="bg-black text-white">61-90 Days</option>
            <option value="91+" className="bg-black text-white">91+ Days</option>
          </select>

          {(selectedAdvisor !== 'all' || selectedAgingBucket !== 'all') && (
            <button
              onClick={() => {
                setSelectedAdvisor('all');
                setSelectedAgingBucket('all');
              }}
              className="flex items-center space-x-1 px-2 py-1 text-xs text-white/60 hover:text-white"
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
      <div className="backdrop-blur-md bg-black/90 rounded-xl border border-white/10 shadow-2xl overflow-hidden">
        <div className="overflow-x-auto max-w-full">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gradient-to-r from-white/5 via-white/10 to-white/5 backdrop-blur-sm border-b border-white/10">
                <th className="px-3 py-4 text-left text-white font-semibold">Advisor</th>
                <th className="px-3 py-4 text-left text-white font-semibold">Customer</th>
                <th className="px-3 py-4 text-left text-white font-semibold">Date</th>
                <th className="px-3 py-4 text-left text-white font-semibold">Reference</th>
                <th className="px-3 py-4 text-right text-white font-semibold">Invoice</th>
                <th className="px-3 py-4 text-right text-white font-semibold">Receipt</th>
                <th className="px-3 py-4 text-right text-white font-semibold">Balance</th>
                <th className="px-3 py-4 text-center text-white font-semibold">Age</th>
                <th className="px-3 py-4 text-center text-white font-semibold">Aging</th>
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
                      <tr className="bg-white/10 border-t-2 border-white/20">
                        <td className="px-3 py-3 font-bold text-white" colSpan={2}>
                          <div className="flex items-center space-x-3">
                            <span className="text-sm">{customer.advisor_name}</span>
                            <span className="text-white/60">→</span>
                            <span className="text-base">{customer.customer_name}</span>
                            <span className="text-xs text-white/60">(ID: {customer.customer_id})</span>
                          </div>
                        </td>
                        <td colSpan={5} className="px-3 py-3 text-right">
                          <span className="text-xs text-white/70 mr-2">Final Balance:</span>
                          <span className="text-lg font-bold text-white">{formatCurrency(finalBalance.balance)}</span>
                        </td>
                        <td className="px-3 py-3 text-center text-white/90 font-mono text-sm">
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
                            className={`border-b border-white/10 hover:bg-white/5 transition-colors ${
                              isLastTransaction ? 'bg-white/5 border-b-2 border-white/20' : ''
                            }`}
                          >
                            <td className="px-3 py-2 text-white/60 text-xs pl-8">
                              {isLastTransaction && '→ '}
                            </td>
                            <td className="px-3 py-2 text-white/60 text-xs">
                              {isLastTransaction ? (
                                <span className="text-white font-semibold">Final Balance</span>
                              ) : (
                                <span>Transaction {index + 1}</span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-white/90 font-mono text-xs">
                              {new Date(record.transaction_date).toLocaleDateString('en-GB')}
                            </td>
                            <td className="px-3 py-2 text-white/90 font-mono text-xs">{record.reference_number}</td>
                            <td className="px-3 py-2 text-right text-white/90 font-mono text-xs">
                              {record.invoice_amount > 0 ? formatCurrency(record.invoice_amount) : '-'}
                            </td>
                            <td className="px-3 py-2 text-right text-white/90 font-mono text-xs">
                              {record.receipt_amount > 0 ? formatCurrency(record.receipt_amount) : '-'}
                            </td>
                            <td className={`px-3 py-2 text-right font-mono text-sm ${
                              isLastTransaction ? 'text-white font-bold' : 
                              record.balance < 0 ? 'text-green-300' : 'text-white/90'
                            }`}>
                              {formatCurrency(record.balance)}
                            </td>
                            <td className="px-3 py-2 text-center text-white/70 font-mono text-xs">{record.age_days}d</td>
                            <td className="px-3 py-2 text-center">
                              <span className={`px-2 py-1 rounded-md border text-xs font-semibold ${
                                isLastTransaction 
                                  ? getAgingColor(record.aging_bucket)
                                  : 'bg-white/5 text-white/60 border-white/20'
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
          <div className="bg-black/90 border border-white/10 rounded-lg p-6 max-w-3xl w-full mx-4 max-h-[80vh] overflow-y-auto backdrop-blur-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white flex items-center space-x-2">
                <FileSpreadsheet className="w-5 h-5" />
                <span>Upload Receivables Excel</span>
              </h3>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-white/60 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Select Excel File
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileSelect}
                  className="block w-full text-sm text-white bg-black/60 border border-white/20 rounded-lg cursor-pointer focus:outline-none"
                />
                <p className="mt-1 text-xs text-white/60">
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
                    <h4 className="text-sm font-medium text-white mb-2">Preview</h4>
                    <div className="border border-white/20 rounded-lg overflow-hidden">
                      <table className="w-full text-xs">
                        <thead className="bg-white/10">
                          <tr>
                            <th className="px-2 py-1 text-left text-white">Advisor</th>
                            <th className="px-2 py-1 text-left text-white">Report Date</th>
                            <th className="px-2 py-1 text-right text-white">Records</th>
                          </tr>
                        </thead>
                        <tbody>
                          {parseResult.sheets.map((sheet, index) => (
                            <tr key={index} className="border-t border-white/10">
                              <td className="px-2 py-1 text-white/90">{sheet.advisor_name}</td>
                              <td className="px-2 py-1 text-white/90">{sheet.report_date}</td>
                              <td className="px-2 py-1 text-right text-white/90">{sheet.transactions.length}</td>
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
                  className="px-4 py-2 text-white/70 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpload}
                  disabled={!parseResult || parseResult.sheets.length === 0 || uploading || !!error}
                  className="px-4 py-2 bg-gradient-to-br from-gray-200 via-gray-100 to-gray-400 text-black rounded-lg shadow-lg hover:shadow-xl disabled:opacity-50 flex items-center space-x-2"
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

