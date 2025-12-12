"use client";
import React, { useState, useEffect, useRef } from 'react';
import { 
  Calendar, 
  Clock, 
  FileText, 
  Calculator, 
  Plus, 
  Trash2, 
  Check, 
  X, 
  RefreshCw,
  AlertCircle,
  Target,
  TrendingUp,
  Car,
  Banknote,
  Upload,
  Download
} from 'lucide-react';
import type { LeasingInputFormData, DailyLeasingMetrics, LeasingMonthlyTarget } from '@/types/leasing';
import { INPUT_METRICS, CALCULATED_METRICS, formatLeasingValue, METRIC_DEFINITIONS } from '@/types/leasing';

interface LeasingDataGridProps {
  metrics: DailyLeasingMetrics[];
  targets: LeasingMonthlyTarget[];
  onSubmit: (data: LeasingInputFormData) => Promise<boolean>;
  onRefresh: () => Promise<void>;
  onDelete?: (date: string) => Promise<boolean>;
  loading?: boolean;
  submitting?: boolean;
  error?: string | null;
}

interface GridRow extends Partial<DailyLeasingMetrics> {
  id: string;
  isNew?: boolean;
  isEditing?: boolean;
  hasChanges?: boolean;
  
  // Target fields for display
  a_class_sales_target?: number;
  others_sales_target?: number;
  total_target?: number;
  number_of_working_days?: number;
}

interface EditingCell {
  rowId: string;
  field: string;
}

interface CSVRow {
  date: string;
  working_days_elapsed: number;
  current_a_class_sales: number;
  current_others_sales: number;
  number_of_invoices: number;
  excess_mileage: number;
  traffic_fines: number;
  salik: number;
  current_marketing_spend: number;
  notes?: string;
}

export default function LeasingDataGrid({
  metrics,
  targets,
  onSubmit,
  onRefresh,
  onDelete,
  loading = false,
  submitting = false,
  error = null
}: LeasingDataGridProps) {
  const [rows, setRows] = useState<GridRow[]>([]);
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [savingRows, setSavingRows] = useState<Set<string>>(new Set());
  const [deletingRows, setDeletingRows] = useState<Set<string>>(new Set());
  const [showCSVImport, setShowCSVImport] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<CSVRow[]>([]);
  const [csvImporting, setCsvImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0, success: 0, error: 0 });
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Transform metrics to grid rows
  useEffect(() => {
    const gridRows: GridRow[] = metrics.map(metric => ({
      id: metric.metric_date,
      ...metric,
    }));

    // Add targets to each row
    gridRows.forEach(row => {
      const rowDate = new Date(row.metric_date!);
      const year = rowDate.getFullYear();
      const month = rowDate.getMonth() + 1;
      
      const monthlyTarget = targets.find(t => t.year === year && t.month === month);
      if (monthlyTarget) {
        row.a_class_sales_target = monthlyTarget.a_class_sales_target;
        row.others_sales_target = monthlyTarget.others_sales_target;
        row.total_target = monthlyTarget.total_target;
        row.number_of_working_days = monthlyTarget.number_of_working_days;
      }
    });

    // Sort by date (newest first)
    gridRows.sort((a, b) => new Date(b.metric_date!).getTime() - new Date(a.metric_date!).getTime());

    setRows(gridRows);
  }, [metrics, targets]);

  // Input metrics configuration
  const inputColumns = [
    { key: 'working_days_elapsed', icon: Clock, width: 'w-24' },
    { key: 'current_a_class_sales', icon: Car, width: 'w-32' },
    { key: 'current_others_sales', icon: Car, width: 'w-32' },
    { key: 'number_of_invoices', icon: FileText, width: 'w-24' },
    { key: 'excess_mileage', icon: Banknote, width: 'w-28' },
    { key: 'traffic_fines', icon: Banknote, width: 'w-28' },
    { key: 'salik', icon: Banknote, width: 'w-24' },
    { key: 'current_marketing_spend', icon: Calculator, width: 'w-32' }
  ];

  // Calculated metrics configuration
  const calculatedColumns = [
    { key: 'total_net_sales', icon: TrendingUp, width: 'w-32' },
    { key: 'current_net_sales_percentage', icon: Target, width: 'w-28' },
    { key: 'a_class_net_sales_percentage', icon: Target, width: 'w-28' },
    { key: 'others_net_sales_percentage', icon: Target, width: 'w-28' },
    { key: 'total_daily_average', icon: Calculator, width: 'w-32' },
    { key: 'estimated_net_sales', icon: TrendingUp, width: 'w-32' },
    { key: 'estimated_net_sales_percentage', icon: Target, width: 'w-28' }
  ];

  // Add new row
  const addNewRow = () => {
    const today = new Date().toISOString().split('T')[0];
    const newRow: GridRow = {
      id: `new-${Date.now()}`,
      metric_date: today,
      isNew: true,
      isEditing: true,
      // Initialize all input metrics to 0
      working_days_elapsed: 0,
      current_a_class_sales: 0,
      current_others_sales: 0,
      number_of_invoices: 0,
      excess_mileage: 0,
      traffic_fines: 0,
      salik: 0,
      current_marketing_spend: 0,
      // Initialize calculated metrics to 0
      total_net_sales: 0,
      current_net_sales_percentage: 0,
      remaining_a_class_sales: 0,
      remaining_others_sales: 0,
      a_class_net_sales_percentage: 0,
      others_net_sales_percentage: 0,
      total_daily_average: 0,
      estimated_net_sales: 0,
      estimated_net_sales_percentage: 0,
      daily_cumulative_target: 0
    };

    setRows(prev => [newRow, ...prev]);
    setEditingCell({ rowId: newRow.id, field: 'metric_date' });
  };

  // Handle cell edit
  const handleCellEdit = (rowId: string, field: string, value: string) => {
    setRows(prev => prev.map(row => {
      if (row.id === rowId) {
        const updatedRow = { ...row, hasChanges: true };
        
        if (field === 'metric_date') {
          updatedRow.metric_date = value;
        } else if (INPUT_METRICS.includes(field as any)) {
          const numValue = field === 'working_days_elapsed' || field === 'number_of_invoices' ? 
            parseInt(value) || 0 : parseFloat(value) || 0;
          (updatedRow as any)[field] = numValue;
        }
        
        return updatedRow;
      }
      return row;
    }));
  };

  // Save row
  const saveRow = async (row: GridRow) => {
    if (!row.metric_date) return;

    setSavingRows(prev => new Set([...prev, row.id]));

    try {
      const formData: LeasingInputFormData = {
        date: row.metric_date,
        working_days_elapsed: row.working_days_elapsed || 0,
        current_a_class_sales: row.current_a_class_sales || 0,
        current_others_sales: row.current_others_sales || 0,
        number_of_invoices: row.number_of_invoices || 0,
        excess_mileage: row.excess_mileage || 0,
        traffic_fines: row.traffic_fines || 0,
        salik: row.salik || 0,
        current_marketing_spend: row.current_marketing_spend || 0,
        notes: row.notes || ''
      };

      const success = await onSubmit(formData);
      
      if (success) {
        setRows(prev => prev.map(r => 
          r.id === row.id ? { ...r, isNew: false, isEditing: false, hasChanges: false } : r
        ));
        setEditingCell(null);
      }
    } catch (error) {
    } finally {
      setSavingRows(prev => {
        const newSet = new Set(prev);
        newSet.delete(row.id);
        return newSet;
      });
    }
  };

  // Delete row
  const deleteRow = async (row: GridRow) => {
    if (!row.metric_date || !onDelete) return;

    setDeletingRows(prev => new Set([...prev, row.id]));

    try {
      const success = await onDelete(row.metric_date);
      if (success) {
        setRows(prev => prev.filter(r => r.id !== row.id));
      }
    } catch (error) {
    } finally {
      setDeletingRows(prev => {
        const newSet = new Set(prev);
        newSet.delete(row.id);
        return newSet;
      });
    }
  };

  // Cancel row edit
  const cancelRowEdit = (row: GridRow) => {
    if (row.isNew) {
      setRows(prev => prev.filter(r => r.id !== row.id));
    } else {
      setRows(prev => prev.map(r => 
        r.id === row.id ? { ...r, isEditing: false, hasChanges: false } : r
      ));
    }
    setEditingCell(null);
  };

  // Render cell value
  const renderCellValue = (row: GridRow, field: string) => {
    const value = (row as any)[field];
    const definition = field in METRIC_DEFINITIONS ? METRIC_DEFINITIONS[field as keyof typeof METRIC_DEFINITIONS] : undefined;
    
    if (!definition) return value?.toString() || '';
    
    return formatLeasingValue(value, definition.type);
  };

  // Render editable cell
  const renderEditableCell = (row: GridRow, field: string) => {
    const isEditing = editingCell?.rowId === row.id && editingCell?.field === field;
    const value = (row as any)[field];
    const definition = field in METRIC_DEFINITIONS ? METRIC_DEFINITIONS[field as keyof typeof METRIC_DEFINITIONS] : undefined;
    const isInputField = INPUT_METRICS.includes(field as any) || field === 'metric_date';
    
    if (isEditing && isInputField) {
      return (
        <input
          ref={inputRef}
          type={field === 'metric_date' ? 'date' : 'number'}
          value={value || ''}
          onChange={(e) => handleCellEdit(row.id, field, e.target.value)}
          onBlur={() => setEditingCell(null)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              setEditingCell(null);
            } else if (e.key === 'Escape') {
              setEditingCell(null);
            }
          }}
          className="w-full px-2 py-1 text-xs bg-white/10 border border-white/20 rounded focus:border-gray-400 focus:outline-none"
          autoFocus
        />
      );
    }

    return (
      <div
        className={`px-2 py-1 text-xs ${isInputField ? 'cursor-pointer hover:bg-white/5' : 'text-white/60'} ${row.hasChanges && isInputField ? 'bg-yellow-500/20 border border-yellow-500/30' : ''}`}
        onClick={() => isInputField && setEditingCell({ rowId: row.id, field })}
      >
        {field === 'metric_date' ? value : renderCellValue(row, field)}
      </div>
    );
  };

  // Download sample CSV
  const downloadSampleCSV = () => {
    const headers = [
      'date',
      'working_days_elapsed',
      'current_a_class_sales',
      'current_others_sales',
      'number_of_invoices',
      'excess_mileage',
      'traffic_fines',
      'salik',
      'current_marketing_spend',
      'notes'
    ];

    const sampleData = [
      ['2025-01-31', '26', '63172', '24367', '29', '2591', '2250', '1800', '0', 'January final'],
      ['2025-02-28', '24', '85885', '19523', '17', '8334', '8400', '3415', '15747', 'February final'],
      ['2025-03-31', '25', '98023', '21629', '20', '12790', '9256', '4143', '11224', 'March final'],
      ['31/01/2025', '26', 'AED 63172', 'AED 24367', '29', 'AED 2591', 'AED 2250', 'AED 1800', 'AED 0', 'With AED prefix']
    ];

    const csvContent = [headers, ...sampleData]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', 'leasing_metrics_sample.csv');
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle file select
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setCsvFile(file);
      parseCSVFile(file);
    }
  };

  // Parse CSV file
  const parseCSVFile = async (file: File) => {
    try {
      let text = await file.text();
      
      // Remove BOM if present
      if (text.charCodeAt(0) === 0xFEFF) {
        text = text.slice(1);
      }
      
      // Handle different line endings
      const lines = text.split(/\r\n|\n|\r/).filter(line => line.trim());
      
      if (lines.length < 2) {
        alert('CSV file must have at least a header row and one data row');
        return;
      }

      // Parse CSV line with proper quote handling
      const parseCSVLine = (line: string): string[] => {
        const result: string[] = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          const nextChar = line[i + 1];
          
          if (char === '"') {
            if (inQuotes && nextChar === '"') {
              current += '"';
              i++;
            } else {
              inQuotes = !inQuotes;
            }
          } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
          } else {
            current += char;
          }
        }
        
        result.push(current.trim());
        return result;
      };

      const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().trim());
      const data: CSVRow[] = [];

      for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        
        // Skip empty lines
        if (values.every(v => !v)) continue;
        if (values.length === 0) continue;

        const row: any = {};
        headers.forEach((header, index) => {
          const value = values[index] || '';
          
          if (header === 'date') {
            if (value) {
              let dateStr = value;
              // Convert DD/MM/YYYY to YYYY-MM-DD
              if (value.includes('/')) {
                const parts = value.split('/');
                if (parts.length === 3) {
                  const [day, month, year] = parts;
                  dateStr = `${year.padStart(4, '20')}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                }
              }
              row.date = dateStr;
            }
          } else if (header === 'notes') {
            row.notes = value;
          } else {
            // Handle numeric values - remove AED, commas, currency symbols
            const cleanValue = value
              .replace(/AED/gi, '')
              .replace(/[,$£€¥\s]/g, '')
              .replace(/[a-zA-Z]/g, '')
              .trim();
            
            const numValue = parseFloat(cleanValue);
            if (!isNaN(numValue) && cleanValue !== '') {
              row[header] = numValue;
            } else if (value && value.trim() !== '') {
              row[header] = 0;
            }
          }
        });

        if (row.date) {
          data.push(row as CSVRow);
        }
      }

      if (data.length === 0) {
        alert('No valid data rows found in CSV. Please check the format and try again.');
        return;
      }

      setCsvData(data);
      alert(`Successfully parsed ${data.length} rows from CSV`);
    } catch (error) {
      alert('Error parsing CSV file. Please ensure it is properly formatted.');
    }
  };

  // Import CSV data using bulk endpoint for speed
  const importCSVData = async () => {
    if (!csvData.length) return;

    setCsvImporting(true);
    setImportProgress({ current: 0, total: csvData.length, success: 0, error: 0 });

    try {
      // Prepare all records for bulk insert
      const records = csvData.map(row => ({
        date: row.date,
        working_days_elapsed: row.working_days_elapsed || 0,
        current_a_class_sales: row.current_a_class_sales || 0,
        current_others_sales: row.current_others_sales || 0,
        number_of_invoices: row.number_of_invoices || 0,
        excess_mileage: row.excess_mileage || 0,
        traffic_fines: row.traffic_fines || 0,
        salik: row.salik || 0,
        current_marketing_spend: row.current_marketing_spend || 0,
        notes: row.notes || ''
      }));

      // Show that we're processing
      setImportProgress({ current: 0, total: csvData.length, success: 0, error: 0 });

      // Use bulk endpoint for faster import
      const response = await fetch('/api/leasing-metrics-bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setImportProgress({ 
          current: csvData.length, 
          total: csvData.length, 
          success: result.inserted || csvData.length, 
          error: 0 
        });
        
        // Small delay to show completion
        await new Promise(resolve => setTimeout(resolve, 500));
        
        setCsvImporting(false);
        setShowCSVImport(false);
        setCsvFile(null);
        setCsvData([]);
        setImportProgress({ current: 0, total: 0, success: 0, error: 0 });
        
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }

        alert(`Import completed: ${result.inserted || csvData.length} records imported successfully!`);
        await onRefresh();
      } else {
        throw new Error(result.error || 'Bulk import failed');
      }
    } catch (error) {
      // Fallback to row-by-row import if bulk fails
      console.log('Bulk import failed, falling back to row-by-row import...');
      
      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < csvData.length; i++) {
        const row = csvData[i];
        try {
          const formData: LeasingInputFormData = {
            date: row.date,
            working_days_elapsed: row.working_days_elapsed || 0,
            current_a_class_sales: row.current_a_class_sales || 0,
            current_others_sales: row.current_others_sales || 0,
            number_of_invoices: row.number_of_invoices || 0,
            excess_mileage: row.excess_mileage || 0,
            traffic_fines: row.traffic_fines || 0,
            salik: row.salik || 0,
            current_marketing_spend: row.current_marketing_spend || 0,
            notes: row.notes || ''
          };

          const success = await onSubmit(formData);
          if (success) {
            successCount++;
          } else {
            errorCount++;
          }
        } catch (err) {
          errorCount++;
        }
        
        setImportProgress({ 
          current: i + 1, 
          total: csvData.length, 
          success: successCount, 
          error: errorCount 
        });
      }

      setCsvImporting(false);
      setShowCSVImport(false);
      setCsvFile(null);
      setCsvData([]);
      setImportProgress({ current: 0, total: 0, success: 0, error: 0 });
      
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      alert(`Import completed: ${successCount} successful, ${errorCount} errors`);
      await onRefresh();
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={addNewRow}
            disabled={loading || submitting}
            className="flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 bg-gradient-to-br from-gray-200 via-gray-100 to-gray-400 text-black shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" />
            <span>Add Entry</span>
          </button>
          
          <button
            onClick={() => setShowCSVImport(true)}
            disabled={loading || submitting}
            className="flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 bg-black/40 backdrop-blur-sm border border-white/10 text-white/70 hover:text-white hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Upload className="w-4 h-4" />
            <span>Import CSV</span>
          </button>

          <button
            onClick={downloadSampleCSV}
            className="flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 bg-black/40 backdrop-blur-sm border border-white/10 text-white/70 hover:text-white hover:bg-white/10"
          >
            <Download className="w-4 h-4" />
            <span>Sample CSV</span>
          </button>
          
          <button
            onClick={onRefresh}
            disabled={loading || submitting}
            className="flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 bg-black/40 backdrop-blur-sm border border-white/10 text-white/70 hover:text-white hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        <div className="text-sm text-white/60">
          {metrics.length} records
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-300 text-sm">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* Data Grid */}
      <div className="backdrop-blur-md bg-black/90 rounded-xl border border-white/10 shadow-2xl overflow-hidden">
        <div className="overflow-x-auto max-w-full">
          <table className="min-w-[1400px] text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-gradient-to-r from-white/5 via-white/10 to-white/5">
                <th className="px-3 py-4 text-left text-white font-semibold w-32">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Date
                  </div>
                </th>
                
                {/* Input Metrics Headers */}
                <th className="px-2 py-4 text-center text-white font-semibold border-l border-white/10" colSpan={inputColumns.length}>
                  <div className="flex items-center justify-center gap-2">
                    <FileText className="w-4 h-4" />
                    Input Metrics (Manual Entry)
                  </div>
                </th>
                
                {/* Calculated Metrics Headers */}
                <th className="px-2 py-4 text-center text-white font-semibold border-l border-white/10" colSpan={calculatedColumns.length}>
                  <div className="flex items-center justify-center gap-2">
                    <Calculator className="w-4 h-4" />
                    Calculated Metrics (Auto-Computed)
                  </div>
                </th>
                
                <th className="px-3 py-4 text-center text-white font-semibold w-24">Actions</th>
              </tr>
              
              <tr className="border-b border-white/10 bg-white/5">
                <th className="px-3 py-3 text-xs text-white/70 font-medium">Entry Date</th>
                
                {/* Input Column Headers */}
                {inputColumns.map(col => {
                  const Icon = col.icon;
                  const definition = col.key in METRIC_DEFINITIONS ? METRIC_DEFINITIONS[col.key as keyof typeof METRIC_DEFINITIONS] : undefined;
                  return (
                    <th key={col.key} className={`px-2 py-2 text-xs text-white/90 font-medium ${col.width} ${col.key === 'working_days_elapsed' ? 'border-l border-white/10' : ''}`}>
                      <div className="flex flex-col items-center gap-1">
                        <Icon className="w-4 h-4" />
                        <span className="text-center leading-tight">{definition?.label}</span>
                      </div>
                    </th>
                  );
                })}
                
                {/* Calculated Column Headers */}
                {calculatedColumns.map(col => {
                  const Icon = col.icon;
                  const definition = col.key in METRIC_DEFINITIONS ? METRIC_DEFINITIONS[col.key as keyof typeof METRIC_DEFINITIONS] : undefined;
                  return (
                    <th key={col.key} className={`px-2 py-2 text-xs text-white/90 font-medium ${col.width} ${col.key === 'total_net_sales' ? 'border-l border-white/10' : ''}`}>
                      <div className="flex flex-col items-center gap-1">
                        <Icon className="w-4 h-4" />
                        <span className="text-center leading-tight">{definition?.label}</span>
                      </div>
                    </th>
                  );
                })}
                
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            
            <tbody>
              {rows.map((row) => (
                <tr 
                  key={row.id} 
                  className={`border-b border-white/10 hover:bg-white/5 backdrop-blur-sm ${row.isNew ? 'bg-white/10' : ''} ${row.hasChanges ? 'bg-amber-400/10' : ''}`}
                >
                  {/* Date Column */}
                  <td className="px-3 py-2 font-medium">
                    {renderEditableCell(row, 'metric_date')}
                  </td>
                  
                  {/* Input Metrics */}
                  {inputColumns.map(col => (
                    <td key={col.key} className={`text-center ${col.key === 'working_days_elapsed' ? 'border-l border-white/10' : ''}`}>
                      {renderEditableCell(row, col.key)}
                    </td>
                  ))}
                  
                  {/* Calculated Metrics */}
                  {calculatedColumns.map(col => (
                    <td key={col.key} className={`text-center ${col.key === 'total_net_sales' ? 'border-l border-white/10' : ''}`}>
                      {renderEditableCell(row, col.key)}
                    </td>
                  ))}
                  
                  {/* Actions */}
                  <td className="px-3 py-2">
                    <div className="flex items-center justify-center gap-1">
                      {(row.isNew || row.hasChanges) && (
                        <>
                          <button
                            onClick={() => saveRow(row)}
                            disabled={savingRows.has(row.id)}
                            className="p-1 text-green-400 hover:text-green-300 disabled:opacity-50"
                            title="Save"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => cancelRowEdit(row)}
                            className="p-1 text-red-400 hover:text-red-300"
                            title="Cancel"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      
                      {!row.isNew && !row.hasChanges && onDelete && (
                        <button
                          onClick={() => deleteRow(row)}
                          disabled={deletingRows.has(row.id)}
                          className="p-1 text-red-400 hover:text-red-300 disabled:opacity-50"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              
              {rows.length === 0 && !loading && (
                <tr>
                  <td colSpan={inputColumns.length + calculatedColumns.length + 2} className="px-3 py-8 text-center text-white/60">
                    No leasing data found. Click "Add Entry" or "Import CSV" to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {loading && (
        <div className="text-center py-4">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-white/60" />
          <p className="mt-2 text-sm text-white/60">Loading leasing data...</p>
        </div>
      )}

      {/* CSV Import Modal */}
      {showCSVImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-black/90 border border-white/10 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto backdrop-blur-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Import Leasing Data from CSV</h3>
              <button
                onClick={() => setShowCSVImport(false)}
                className="text-white/60 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Select CSV File
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  className="block w-full text-sm text-white bg-black/60 border border-white/20 rounded-lg cursor-pointer focus:outline-none"
                />
                <p className="mt-1 text-xs text-white/60">
                  CSV should have columns: date, working_days_elapsed, current_a_class_sales, current_others_sales, number_of_invoices, excess_mileage, traffic_fines, salik, current_marketing_spend, notes
                </p>
                <p className="mt-1 text-xs text-white/50">
                  Supports Google Sheets exports. Date formats: YYYY-MM-DD or DD/MM/YYYY. Currency values can include "AED", commas, or currency symbols (e.g., "AED 63,172" or "63172").
                </p>
              </div>

              {csvData.length > 0 && (
                <>
                  <div className="flex items-start space-x-2 p-3 bg-yellow-900/20 border border-yellow-600/50 rounded-lg text-yellow-400">
                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <div className="text-xs">
                      <p className="font-medium">Import will overwrite existing data</p>
                      <p className="text-yellow-400/80 mt-1">
                        If any dates in your CSV already have data in the system, they will be updated with the CSV values. This action cannot be undone.
                      </p>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-white mb-2">
                      Preview ({csvData.length} records)
                    </h4>
                    <div className="max-h-60 overflow-y-auto border border-white/10 rounded">
                      <table className="w-full text-xs">
                        <thead className="bg-white/5 sticky top-0">
                          <tr>
                            <th className="px-2 py-1 text-left">Date</th>
                            <th className="px-2 py-1 text-left">Days</th>
                            <th className="px-2 py-1 text-left">A CLASS</th>
                            <th className="px-2 py-1 text-left">OTHERS</th>
                            <th className="px-2 py-1 text-left">Invoices</th>
                            <th className="px-2 py-1 text-left">Mileage</th>
                            <th className="px-2 py-1 text-left">Fines</th>
                            <th className="px-2 py-1 text-left">Salik</th>
                            <th className="px-2 py-1 text-left">Marketing</th>
                          </tr>
                        </thead>
                        <tbody>
                          {csvData.slice(0, 15).map((row, index) => (
                            <tr key={index} className="border-t border-white/10">
                              <td className="px-2 py-1">{row.date}</td>
                              <td className="px-2 py-1">{row.working_days_elapsed}</td>
                              <td className="px-2 py-1">{row.current_a_class_sales?.toLocaleString()}</td>
                              <td className="px-2 py-1">{row.current_others_sales?.toLocaleString()}</td>
                              <td className="px-2 py-1">{row.number_of_invoices}</td>
                              <td className="px-2 py-1">{row.excess_mileage?.toLocaleString()}</td>
                              <td className="px-2 py-1">{row.traffic_fines?.toLocaleString()}</td>
                              <td className="px-2 py-1">{row.salik?.toLocaleString()}</td>
                              <td className="px-2 py-1">{row.current_marketing_spend?.toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {csvData.length > 15 && (
                        <div className="px-2 py-1 text-xs text-white/50 text-center bg-white/5">
                          ... and {csvData.length - 15} more rows
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* Progress indicator during import */}
              {csvImporting && importProgress.total > 0 && (
                <div className="space-y-2 p-3 bg-white/5 border border-white/10 rounded-lg">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white/80">
                      Importing row {importProgress.current} of {importProgress.total}
                    </span>
                    <span className="text-white/60">
                      {Math.round((importProgress.current / importProgress.total) * 100)}%
                    </span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-green-500 to-green-400 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs text-white/50">
                    <span className="text-green-400">✓ {importProgress.success} successful</span>
                    {importProgress.error > 0 && (
                      <span className="text-red-400">✗ {importProgress.error} errors</span>
                    )}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowCSVImport(false);
                    setCsvFile(null);
                    setCsvData([]);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  disabled={csvImporting}
                  className="px-4 py-2 text-white/70 hover:text-white transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={importCSVData}
                  disabled={!csvData.length || csvImporting}
                  className="px-4 py-2 bg-gradient-to-br from-gray-200 via-gray-100 to-gray-400 text-black rounded-lg disabled:opacity-50 flex items-center space-x-2 font-medium"
                >
                  {csvImporting && <RefreshCw className="w-4 h-4 animate-spin" />}
                  <span>{csvImporting ? `Importing ${importProgress.current}/${importProgress.total}...` : 'Import Data'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
