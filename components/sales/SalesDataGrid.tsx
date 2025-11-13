"use client";
import React, { useState, useEffect, useRef } from 'react';
import { 
  Calendar, 
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
  Target,
  TrendingUp,
  Package,
  ShoppingCart
} from 'lucide-react';
import type { SalesInputFormData, DailySalesMetrics, SalesMonthlyTarget } from '@/types/sales';
import { INPUT_METRICS, CALCULATED_METRICS, formatSalesValue, METRIC_DEFINITIONS } from '@/types/sales';

interface SalesDataGridProps {
  metrics: DailySalesMetrics[];
  targets: SalesMonthlyTarget[];
  onSubmit: (data: SalesInputFormData) => Promise<boolean>;
  onRefresh: () => Promise<void>;
  onDelete?: (date: string) => Promise<boolean>;
  loading?: boolean;
  submitting?: boolean;
  error?: string | null;
}

interface GridRow extends Partial<DailySalesMetrics> {
  id: string;
  isNew?: boolean;
  isEditing?: boolean;
  hasChanges?: boolean;
  
  // Target fields for display
  gross_profit_year_target?: number;
  gross_profit_month_target?: number;
  number_of_working_days?: number;
}

interface EditingCell {
  rowId: string;
  field: string;
}

interface CSVRow {
  date: string;
  working_days_elapsed: number;
  gross_sales_year_actual: number;
  cost_of_sales_year_actual: number;
  gross_sales_month_actual: number;
  cost_of_sales_month_actual: number;
  marketing_spend_month: number;
  units_disposed_month: number;
  units_sold_stock_month: number;
  units_sold_consignment_month: number;
  notes?: string;
}

export default function SalesDataGrid({
  metrics,
  targets,
  onSubmit,
  onRefresh,
  onDelete,
  loading = false,
  submitting = false,
  error = null
}: SalesDataGridProps) {
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
        row.gross_profit_year_target = monthlyTarget.gross_profit_year_target;
        row.gross_profit_month_target = monthlyTarget.gross_profit_month_target;
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
    { key: 'gross_sales_year_actual', icon: TrendingUp, width: 'w-32' },
    { key: 'cost_of_sales_year_actual', icon: Calculator, width: 'w-32' },
    { key: 'gross_sales_month_actual', icon: TrendingUp, width: 'w-32' },
    { key: 'cost_of_sales_month_actual', icon: Calculator, width: 'w-32' },
    { key: 'marketing_spend_month', icon: Calculator, width: 'w-32' },
    { key: 'units_disposed_month', icon: Package, width: 'w-28' },
    { key: 'units_sold_stock_month', icon: ShoppingCart, width: 'w-28' },
    { key: 'units_sold_consignment_month', icon: ShoppingCart, width: 'w-28' }
  ];

  // Calculated metrics configuration
  const calculatedColumns = [
    { key: 'gross_profit_year_actual', icon: TrendingUp, width: 'w-32' },
    { key: 'gross_profit_year_achieved_percentage', icon: Target, width: 'w-28' },
    { key: 'gross_profit_month_actual', icon: TrendingUp, width: 'w-32' },
    { key: 'gross_profit_month_achieved_percentage', icon: Target, width: 'w-28' },
    { key: 'total_units_sold_month', icon: Package, width: 'w-28' },
    { key: 'average_gross_profit_per_car_month', icon: Calculator, width: 'w-32' },
    { key: 'marketing_rate_against_gross_profit', icon: Target, width: 'w-28' }
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
      gross_sales_year_actual: 0,
      cost_of_sales_year_actual: 0,
      gross_sales_month_actual: 0,
      cost_of_sales_month_actual: 0,
      marketing_spend_month: 0,
      units_disposed_month: 0,
      units_sold_stock_month: 0,
      units_sold_consignment_month: 0,
      // Initialize calculated metrics to 0
      gross_profit_year_actual: 0,
      gross_profit_year_achieved_percentage: 0,
      gross_profit_month_actual: 0,
      gross_profit_month_achieved_percentage: 0,
      total_units_sold_month: 0,
      average_gross_profit_per_car_month: 0,
      marketing_rate_against_gross_profit: 0
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
          const numValue = field === 'working_days_elapsed' || field.includes('units') ? 
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
      const formData: SalesInputFormData = {
        date: row.metric_date,
        working_days_elapsed: row.working_days_elapsed || 0,
        gross_sales_year_actual: row.gross_sales_year_actual || 0,
        cost_of_sales_year_actual: row.cost_of_sales_year_actual || 0,
        gross_sales_month_actual: row.gross_sales_month_actual || 0,
        cost_of_sales_month_actual: row.cost_of_sales_month_actual || 0,
        marketing_spend_month: row.marketing_spend_month || 0,
        units_disposed_month: row.units_disposed_month || 0,
        units_sold_stock_month: row.units_sold_stock_month || 0,
        units_sold_consignment_month: row.units_sold_consignment_month || 0,
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
    
    return formatSalesValue(value, definition.type);
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
                    <th key={col.key} className={`px-2 py-2 text-xs text-white/90 font-medium ${col.width} ${col.key === 'gross_profit_year_actual' ? 'border-l border-white/10' : ''}`}>
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
              {rows.map((row, index) => (
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
                    <td key={col.key} className={`text-center ${col.key === 'gross_profit_year_actual' ? 'border-l border-white/10' : ''}`}>
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
                    No sales data found. Click "Add Entry" to get started.
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
          <p className="mt-2 text-sm text-white/60">Loading sales data...</p>
        </div>
      )}
    </div>
  );
} 