"use client";
import React, { useState, useEffect, useRef } from 'react';
import { 
  Calendar, 
  DollarSign, 
  Clock, 
  FileText, 
  Calculator, 
  Plus, 
  Edit3, 
  Trash2, 
  Check, 
  X, 
  RefreshCw,
  Upload,
  Download,
  AlertCircle,
  Target
} from 'lucide-react';
import type { ServiceInputFormData, DailyServiceMetrics, ServiceMonthlyTarget } from '@/types/service';
import { INPUT_METRICS, INDIVIDUAL_METRICS, CALCULATED_METRICS, formatServiceValue, METRIC_DEFINITIONS } from '@/types/service';

interface ServiceDataGridProps {
  metrics: DailyServiceMetrics[];
  targets: ServiceMonthlyTarget[];
  onSubmit: (data: ServiceInputFormData) => Promise<boolean>;
  onRefresh: () => Promise<void>;
  onDelete?: (date: string) => Promise<boolean>;
  loading?: boolean;
  submitting?: boolean;
  error?: string | null;
}

interface GridRow extends Partial<DailyServiceMetrics> {
  id: string;
  isNew?: boolean;
  isEditing?: boolean;
  hasChanges?: boolean;
  
  // Target fields for display
  net_sales_target?: number;
  labour_sales_target?: number;
  number_of_working_days?: number;
}

interface EditingCell {
  rowId: string;
  field: string;
}

interface CSVRow {
  date: string;
  working_days_elapsed: number;
  current_net_sales: number;
  current_net_labor_sales: number;
  number_of_invoices: number;
  current_marketing_spend: number;
  daniel_total_sales: number;
  essrar_total_sales: number;
  lucy_total_sales: number;
  notes?: string;
}

export default function ServiceDataGrid({
  metrics,
  targets,
  onSubmit,
  onRefresh,
  onDelete,
  loading = false,
  submitting = false,
  error = null
}: ServiceDataGridProps) {
  const [rows, setRows] = useState<GridRow[]>([]);
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [savingRows, setSavingRows] = useState<Set<string>>(new Set());
  const [deletingRows, setDeletingRows] = useState<Set<string>>(new Set());
  const [showCSVImport, setShowCSVImport] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<CSVRow[]>([]);
  const [csvImporting, setCsvImporting] = useState(false);
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
        row.net_sales_target = monthlyTarget.net_sales_target;
        row.labour_sales_target = monthlyTarget.labour_sales_target;
        row.number_of_working_days = monthlyTarget.number_of_working_days;
      }
    });

    // Sort by date descending
    gridRows.sort((a, b) => new Date(b.metric_date!).getTime() - new Date(a.metric_date!).getTime());
    setRows(gridRows);
  }, [metrics, targets]);

  // Focus input when editing starts
  useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingCell]);

  const addNewRow = () => {
    const newRow: GridRow = {
      id: `new-${Date.now()}`,
      metric_date: new Date().toISOString().split('T')[0],
      working_days_elapsed: 0,
      current_net_sales: 0,
      current_net_labor_sales: 0,
      number_of_invoices: 0,
      current_marketing_spend: 0,
      
      // Individual salesperson metrics (simplified)
      daniel_total_sales: 0,
      essrar_total_sales: 0,
      lucy_total_sales: 0,
      
      // Calculated metrics
      current_net_sales_percentage: 0,
      current_labour_sales_percentage: 0,
      remaining_net_sales: 0,
      remaining_labour_sales: 0,
      current_daily_average: 0,
      estimated_net_sales: 0,
      estimated_net_sales_percentage: 0,
      estimated_labor_sales: 0,
      estimated_labor_sales_percentage: 0,
      daily_average_needed: 0,
      
      notes: '',
      isNew: true,
      isEditing: true,
      hasChanges: true
    };

    setRows(prev => [newRow, ...prev]);
    setEditingCell({ rowId: newRow.id, field: 'metric_date' });
  };

  const startEdit = (rowId: string, field: string) => {
    // Only allow editing of input fields, individual metrics, and notes
    if (!INPUT_METRICS.includes(field as any) && 
        !INDIVIDUAL_METRICS.includes(field as any) && 
        field !== 'metric_date' && 
        field !== 'notes') return;
    
    setEditingCell({ rowId, field });
    setRows(prev => prev.map(row => 
      row.id === rowId ? { ...row, isEditing: true } : row
    ));
  };

  const cancelEdit = (rowId: string) => {
    setEditingCell(null);
    
    // If it's a new row, remove it
    setRows(prev => prev.filter(row => !(row.id === rowId && row.isNew)));
    
    // Mark row as not editing
    setRows(prev => prev.map(row => 
      row.id === rowId 
        ? { ...row, isEditing: false, hasChanges: false }
        : row
    ));
  };

  const updateCell = (rowId: string, field: string, value: string | number) => {
    setRows(prev => prev.map(row => 
      row.id === rowId 
        ? { 
            ...row, 
            [field]: value,
            hasChanges: true
          }
        : row
    ));
  };

  const saveRow = async (rowId: string) => {
    const row = rows.find(r => r.id === rowId);
    if (!row) return;

    setSavingRows(prev => new Set([...Array.from(prev), rowId]));

    try {
      const formData: ServiceInputFormData = {
        date: row.metric_date!,
        working_days_elapsed: row.working_days_elapsed || 0,
        current_net_sales: row.current_net_sales || 0,
        current_net_labor_sales: row.current_net_labor_sales || 0,
        number_of_invoices: row.number_of_invoices || 0,
        current_marketing_spend: row.current_marketing_spend || 0,
        
        // Individual salesperson data (simplified)
        daniel_total_sales: row.daniel_total_sales || 0,
        essrar_total_sales: row.essrar_total_sales || 0,
        lucy_total_sales: row.lucy_total_sales || 0,
        
        notes: row.notes || ''
      };

      const success = await onSubmit(formData);
      
      if (success) {
        setRows(prev => prev.map(r => 
          r.id === rowId 
            ? { 
                ...r, 
                isNew: false, 
                isEditing: false, 
                hasChanges: false,
                id: row.metric_date! // Update ID to date for existing rows
              }
            : r
        ));
        setEditingCell(null);
        await onRefresh();
      }
    } catch (error) {
      console.error('Failed to save row:', error);
    } finally {
      setSavingRows(prev => {
        const newSet = new Set(prev);
        newSet.delete(rowId);
        return newSet;
      });
    }
  };

  const deleteRow = async (rowId: string) => {
    if (!onDelete) {
      setRows(prev => prev.filter(row => row.id !== rowId));
      return;
    }
    
    const row = rows.find(r => r.id === rowId);
    if (!row) return;
    
    if (!confirm(`Are you sure you want to delete all data for ${new Date(row.metric_date!).toLocaleDateString()}? This action cannot be undone.`)) {
      return;
    }

    setDeletingRows(prev => new Set([...Array.from(prev), rowId]));

    try {
      // Always remove from local state first for immediate UI feedback
      setRows(prev => prev.filter(r => r.id !== rowId));
      
      // Only call API for rows that were actually saved to database
      if (!row.isNew) {
        const deleteResult = await onDelete(row.metric_date!);
        
        // Refresh data after successful deletion
        if (deleteResult) {
          await onRefresh();
        }
      }
    } catch (error) {
      console.error('Error deleting row:', error);
      // For saved rows that failed to delete, restore via refresh
      if (!row.isNew) {
        await onRefresh();
      }
    } finally {
      setDeletingRows(prev => {
        const newSet = new Set(Array.from(prev));
        newSet.delete(rowId);
        return newSet;
      });
    }
  };

  const getFieldIcon = (field: string) => {
    switch (field) {
      case 'working_days_elapsed':
      case 'number_of_working_days':
        return <Clock className="w-3 h-3" />;
      case 'current_net_sales':
      case 'current_net_labor_sales':
      case 'current_marketing_spend':
      case 'daniel_total_sales':
      case 'essrar_total_sales':
      case 'lucy_total_sales':
        return <DollarSign className="w-3 h-3" />;
      case 'number_of_invoices':
        return <FileText className="w-3 h-3" />;
      case 'metric_date':
        return <Calendar className="w-3 h-3" />;
      default:
        return <Calculator className="w-3 h-3" />;
    }
  };

  const downloadSampleCSV = () => {
    const headers = [
      'date',
      'working_days_elapsed',
      'current_net_sales',
      'current_net_labor_sales',
      'number_of_invoices',
      'current_marketing_spend',
      'daniel_total_sales',
      'essrar_total_sales',
      'lucy_total_sales',
      'notes'
    ];

    const sampleData = [
      ['2025-01-15', '10', '150000', '75000', '15', '5000', '50000', '40000', '30000', 'Sample entry'],
      ['2025-01-16', '11', '165,000', '82,500', '18', '5,200', '55,000', '44,000', '33,000', 'With commas'],
      ['15/01/2025', '12', 'AED 175000', 'AED 87500', '20', 'AED 5400', 'AED 58000', 'AED 47000', 'AED 35000', 'With AED prefix']
    ];

    const csvContent = [headers, ...sampleData]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', 'service_metrics_sample.csv');
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setCsvFile(file);
      parseCSVFile(file);
    }
  };

  const parseCSVFile = async (file: File) => {
    try {
      let text = await file.text();
      
      // Remove BOM if present (common in Excel/Google Sheets exports)
      if (text.charCodeAt(0) === 0xFEFF) {
        text = text.slice(1);
      }
      
      // Handle different line endings (CRLF, LF, CR)
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
              // Escaped quote
              current += '"';
              i++; // Skip next quote
            } else {
              // Toggle quote state
              inQuotes = !inQuotes;
            }
          } else if (char === ',' && !inQuotes) {
            // End of field
            result.push(current.trim());
            current = '';
          } else {
            current += char;
          }
        }
        
        // Add last field
        result.push(current.trim());
        return result;
      };

      const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().trim());
      const data: CSVRow[] = [];

      for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        
        // Skip empty lines
        if (values.every(v => !v)) continue;
        
        // Allow flexible column count (partial data is ok)
        if (values.length === 0) continue;

        const row: any = {};
        headers.forEach((header, index) => {
          const value = values[index] || '';
          
          if (header === 'date') {
            // Handle different date formats
            if (value) {
              // Try to parse date in various formats
              let dateStr = value;
              // Convert MM/DD/YYYY or DD/MM/YYYY to YYYY-MM-DD
              if (value.includes('/')) {
                const parts = value.split('/');
                if (parts.length === 3) {
                  // Assume DD/MM/YYYY format (more common internationally)
                  const [day, month, year] = parts;
                  dateStr = `${year.padStart(4, '0')}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                }
              }
              row.date = dateStr;
            }
          } else if (header === 'notes') {
            row.notes = value;
          } else {
            // Handle numeric values with better error handling
            // Remove currency symbols, text, commas, and spaces
            const cleanValue = value
              .replace(/AED/gi, '')           // Remove AED (case insensitive)
              .replace(/[,$£€¥\s]/g, '')      // Remove currency symbols, commas, and spaces
              .replace(/[a-zA-Z]/g, '')       // Remove any remaining letters
              .trim();
            
            const numValue = parseFloat(cleanValue);
            if (!isNaN(numValue) && cleanValue !== '') {
              row[header] = numValue;
            } else if (value && value.trim() !== '') {
              // If value exists but isn't a number, set to 0
              console.warn(`Could not parse numeric value for ${header}: "${value}" -> cleaned to "${cleanValue}"`);
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
      console.error('Error parsing CSV:', error);
      alert('Error parsing CSV file. Please ensure it is properly formatted.');
    }
  };

  const importCSVData = async () => {
    if (!csvData.length) return;

    setCsvImporting(true);
    let successCount = 0;
    let errorCount = 0;

    for (const row of csvData) {
      try {
        const formData: ServiceInputFormData = {
          date: row.date,
          working_days_elapsed: row.working_days_elapsed || 0,
          current_net_sales: row.current_net_sales || 0,
          current_net_labor_sales: row.current_net_labor_sales || 0,
          number_of_invoices: row.number_of_invoices || 0,
          current_marketing_spend: row.current_marketing_spend || 0,
          daniel_total_sales: row.daniel_total_sales || 0,
          essrar_total_sales: row.essrar_total_sales || 0,
          lucy_total_sales: row.lucy_total_sales || 0,
          notes: row.notes || ''
        };

        const success = await onSubmit(formData);
        if (success) {
          successCount++;
        } else {
          errorCount++;
        }
      } catch (error) {
        console.error('Error importing row:', row, error);
        errorCount++;
      }
    }

    setCsvImporting(false);
    setShowCSVImport(false);
    setCsvFile(null);
    setCsvData([]);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    alert(`Import completed: ${successCount} successful, ${errorCount} errors`);
    await onRefresh();
  };

  const renderCell = (row: GridRow, field: string, isEditable: boolean) => {
    const isEditing = editingCell?.rowId === row.id && editingCell?.field === field && isEditable;
    const value = row[field as keyof GridRow];
    const metricDef = METRIC_DEFINITIONS[field as keyof typeof METRIC_DEFINITIONS];

    if (isEditing) {
      // Convert value to appropriate input type
      const inputValue = field === 'metric_date' 
        ? (value as string || '') 
        : (typeof value === 'number' ? value : 0);

      return (
        <input
          ref={inputRef}
          type={field === 'metric_date' ? 'date' : metricDef?.type === 'count' || metricDef?.type === 'days' ? 'number' : 'number'}
          step={metricDef?.type === 'currency' ? '0.01' : '1'}
          max="999999999"
          value={inputValue}
          onChange={(e) => {
            const newValue = field === 'metric_date' ? e.target.value : parseFloat(e.target.value) || 0;
            updateCell(row.id, field, newValue);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              saveRow(row.id);
            } else if (e.key === 'Escape') {
              cancelEdit(row.id);
            }
          }}
          onBlur={() => saveRow(row.id)}
          className="w-full px-1 py-0.5 text-xs bg-gray-800 border border-gray-600 rounded focus:outline-none focus:border-blue-500 text-white"
        />
      );
    }

    const cellClasses = `
      px-2 py-1 text-xs whitespace-nowrap overflow-hidden text-ellipsis max-w-24
      ${isEditable ? 'cursor-pointer hover:bg-gray-700/50' : 'text-gray-400'}
      ${metricDef?.category === 'input' ? 'text-blue-300' : ''}
      ${metricDef?.category === 'individual' ? 'text-green-300' : ''}
      ${metricDef?.category === 'calculated' ? 'text-yellow-300' : ''}
      ${metricDef?.category === 'target' ? 'text-purple-300' : ''}
    `;

    // Special handling for date field
    const displayValue = field === 'metric_date' 
      ? (value ? new Date(value as string).toLocaleDateString('en-GB') : '-')
      : formatServiceValue(value as any, metricDef?.type || 'count');

    return (
      <div
        className={cellClasses}
        onClick={() => isEditable && startEdit(row.id, field)}
        title={`${metricDef?.name || field}: ${displayValue}`}
      >
        {displayValue}
      </div>
    );
  };

  const allColumns = [
    'metric_date',
    ...INPUT_METRICS,
    ...INDIVIDUAL_METRICS,
    'net_sales_target',
    'labour_sales_target',
    'number_of_working_days',
    'notes'
  ];

  return (
    <div className="space-y-4 -mx-4 px-4">
      {/* Header Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={addNewRow}
            disabled={loading || submitting}
            className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg font-medium transition-all duration-200 disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            <span>Add Entry</span>
          </button>

          <button
            onClick={() => setShowCSVImport(true)}
            disabled={loading || submitting}
            className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded-lg font-medium transition-all duration-200 disabled:opacity-50"
          >
            <Upload className="w-4 h-4" />
            <span>Import CSV</span>
          </button>

          <button
            onClick={downloadSampleCSV}
            className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white rounded-lg font-medium transition-all duration-200"
          >
            <Download className="w-4 h-4" />
            <span>Sample CSV</span>
          </button>
        </div>

        {loading && (
          <div className="flex items-center space-x-2 text-blue-400">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span className="text-sm">Loading...</span>
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center space-x-2 p-3 bg-red-900/20 border border-red-600/50 rounded-lg text-red-400">
          <AlertCircle className="w-4 h-4" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* Data Grid */}
      <div className="w-full overflow-hidden rounded-lg border border-gray-600/50 bg-gray-900/50 backdrop-blur-md">
        <div className="overflow-x-auto">
          <table className="w-full table-auto" style={{minWidth: '100%'}}>
            <thead>
              <tr className="border-b border-gray-600/50">
                <th className="px-3 py-3 text-left min-w-24">
                  <div className="flex items-center space-x-1 text-xs font-medium text-gray-300">
                    <Calendar className="w-3 h-3" />
                    <span>Date</span>
                  </div>
                </th>
                
                {/* Input Metrics */}
                <th colSpan={INPUT_METRICS.length} className="px-2 py-1 text-center text-xs font-medium text-blue-300 border-b border-gray-600/30">
                  Input Metrics
                </th>
                
                {/* Individual Salesperson Metrics */}
                <th colSpan={INDIVIDUAL_METRICS.length} className="px-2 py-1 text-center text-xs font-medium text-green-300 border-b border-gray-600/30">
                  Individual Sales
                </th>
                

                
                {/* Targets */}
                <th colSpan={3} className="px-2 py-1 text-center text-xs font-medium text-purple-300 border-b border-gray-600/30">
                  Targets
                </th>
                
                <th className="px-3 py-3 text-left min-w-32">
                  <span className="text-xs font-medium text-gray-300">Notes</span>
                </th>
                
                <th className="px-3 py-3 text-center min-w-20">
                  <span className="text-xs font-medium text-gray-300">Actions</span>
                </th>
              </tr>
              
              <tr className="border-b border-gray-600/50">
                <th></th>
                {INPUT_METRICS.map(field => (
                  <th key={field} className="px-3 py-2 text-left min-w-28">
                    <div className="flex items-center space-x-1 text-xs font-medium text-blue-300">
                      {getFieldIcon(field)}
                      <span className="truncate">{METRIC_DEFINITIONS[field]?.name || field}</span>
                    </div>
                  </th>
                ))}
                {INDIVIDUAL_METRICS.map(field => (
                  <th key={field} className="px-3 py-2 text-left min-w-24">
                    <div className="flex items-center space-x-1 text-xs font-medium text-green-300">
                      {getFieldIcon(field)}
                      <span className="truncate">{METRIC_DEFINITIONS[field]?.name || field}</span>
                    </div>
                  </th>
                ))}

                <th className="px-3 py-2 text-left min-w-24">
                  <div className="flex items-center space-x-1 text-xs font-medium text-purple-300">
                    <Target className="w-3 h-3" />
                    <span className="truncate">Net Target</span>
                  </div>
                </th>
                <th className="px-3 py-2 text-left min-w-24">
                  <div className="flex items-center space-x-1 text-xs font-medium text-purple-300">
                    <Target className="w-3 h-3" />
                    <span className="truncate">Labor Target</span>
                  </div>
                </th>
                <th className="px-3 py-2 text-left min-w-24">
                  <div className="flex items-center space-x-1 text-xs font-medium text-purple-300">
                    <Clock className="w-3 h-3" />
                    <span className="truncate">Work Days</span>
                  </div>
                </th>
                <th className="px-3 py-2 text-left min-w-32">
                  <span className="text-xs font-medium text-gray-300">Notes</span>
                </th>
                <th className="px-3 py-2 text-center min-w-20">
                  <span className="text-xs font-medium text-gray-300">Actions</span>
                </th>
              </tr>
            </thead>
            
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-gray-700/30 hover:bg-gray-800/30">
                  {allColumns.map(field => (
                    <td key={field}>
                      {renderCell(
                        row, 
                        field, 
                        (INPUT_METRICS.includes(field as any) || 
                         INDIVIDUAL_METRICS.includes(field as any) || 
                         field === 'metric_date' || 
                         field === 'notes') &&
                        !deletingRows.has(row.id)
                      )}
                    </td>
                  ))}
                  
                  <td className="px-2 py-1">
                    <div className="flex items-center space-x-1">
                      {row.hasChanges && (
                        <button
                          onClick={() => saveRow(row.id)}
                          disabled={savingRows.has(row.id)}
                          className="p-1 text-green-400 hover:text-green-300 disabled:opacity-50"
                          title="Save changes"
                        >
                          {savingRows.has(row.id) ? (
                            <RefreshCw className="w-3 h-3 animate-spin" />
                          ) : (
                            <Check className="w-3 h-3" />
                          )}
                        </button>
                      )}
                      
                      {row.isEditing && (
                        <button
                          onClick={() => cancelEdit(row.id)}
                          className="p-1 text-gray-400 hover:text-gray-300"
                          title="Cancel editing"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                      
                      <button
                        onClick={() => deleteRow(row.id)}
                        disabled={deletingRows.has(row.id)}
                        className="p-1 text-red-400 hover:text-red-300 disabled:opacity-50"
                        title="Delete row"
                      >
                        {deletingRows.has(row.id) ? (
                          <RefreshCw className="w-3 h-3 animate-spin" />
                        ) : (
                          <Trash2 className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              
              {rows.length === 0 && !loading && (
                <tr>
                  <td colSpan={allColumns.length + 1} className="px-4 py-8 text-center text-gray-400">
                    No data available. Click "Add Entry" to start.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CSV Import Modal */}
      {showCSVImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-600 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Import CSV Data</h3>
              <button
                onClick={() => setShowCSVImport(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Select CSV File
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  className="block w-full text-sm text-gray-300 bg-gray-800 border border-gray-600 rounded-lg cursor-pointer focus:outline-none"
                />
                <p className="mt-1 text-xs text-gray-400">
                  CSV should have columns: date, working_days_elapsed, current_net_sales, current_net_labor_sales, number_of_invoices, current_marketing_spend, daniel_total_sales, essrar_total_sales, lucy_total_sales, notes
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  Supports Google Sheets exports. Date formats: YYYY-MM-DD or DD/MM/YYYY. Currency values can include "AED", commas, or currency symbols (e.g., "AED 150,000" or "150000").
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
                    <h4 className="text-sm font-medium text-gray-300 mb-2">
                      Preview ({csvData.length} records)
                    </h4>
                    <div className="max-h-60 overflow-y-auto border border-gray-600 rounded">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-800">
                        <tr>
                          <th className="px-2 py-1 text-left">Date</th>
                          <th className="px-2 py-1 text-left">Days</th>
                          <th className="px-2 py-1 text-left">Net Sales</th>
                          <th className="px-2 py-1 text-left">Labor Sales</th>
                          <th className="px-2 py-1 text-left">Invoices</th>
                          <th className="px-2 py-1 text-left">Marketing</th>
                          <th className="px-2 py-1 text-left">Daniel</th>
                          <th className="px-2 py-1 text-left">Essrar</th>
                          <th className="px-2 py-1 text-left">Lucy</th>
                        </tr>
                      </thead>
                      <tbody>
                        {csvData.slice(0, 10).map((row, index) => (
                          <tr key={index} className="border-t border-gray-700">
                            <td className="px-2 py-1">{row.date}</td>
                            <td className="px-2 py-1">{row.working_days_elapsed}</td>
                            <td className="px-2 py-1">{row.current_net_sales}</td>
                            <td className="px-2 py-1">{row.current_net_labor_sales}</td>
                            <td className="px-2 py-1">{row.number_of_invoices}</td>
                            <td className="px-2 py-1">{row.current_marketing_spend}</td>
                            <td className="px-2 py-1">{row.daniel_total_sales}</td>
                            <td className="px-2 py-1">{row.essrar_total_sales}</td>
                            <td className="px-2 py-1">{row.lucy_total_sales}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  </div>
                </>
              )}

              <div className="flex items-center justify-end space-x-3">
                <button
                  onClick={() => setShowCSVImport(false)}
                  className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={importCSVData}
                  disabled={!csvData.length || csvImporting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 flex items-center space-x-2"
                >
                  {csvImporting && <RefreshCw className="w-4 h-4 animate-spin" />}
                  <span>{csvImporting ? 'Importing...' : 'Import Data'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 