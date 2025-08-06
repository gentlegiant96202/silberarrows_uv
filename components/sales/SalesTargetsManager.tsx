"use client";
import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Clock, 
  Target,
  Plus, 
  Edit3, 
  Trash2, 
  Check, 
  X,
  Save
} from 'lucide-react';
import type { SalesMonthlyTarget } from '@/types/sales';

interface SalesTargetsManagerProps {
  onRefresh: () => Promise<void>;
  loading?: boolean;
  error?: string | null;
  targets: SalesMonthlyTarget[];
}

interface TargetFormData {
  year: number;
  month: number;
  gross_profit_year_target: number;
  gross_profit_month_target: number;
  number_of_working_days: number;
}

const MONTHS = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' }
];

export default function SalesTargetsManager({ 
  onRefresh, 
  loading = false, 
  error = null, 
  targets = [] 
}: SalesTargetsManagerProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<TargetFormData>({
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    gross_profit_year_target: 0,
    gross_profit_month_target: 0,
    number_of_working_days: 22
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const { supabase } = await import('@/lib/supabaseClient');
      
      const targetData = {
        ...formData
      };

      if (editingId) {
        // Update existing target
        const { error } = await supabase
          .from('sales_monthly_targets')
          .update({
            gross_profit_year_target: targetData.gross_profit_year_target,
            gross_profit_month_target: targetData.gross_profit_month_target,
            number_of_working_days: targetData.number_of_working_days
          })
          .eq('id', editingId);

        if (error) throw error;
      } else {
        // Insert new target
        const { error } = await supabase
          .from('sales_monthly_targets')
          .insert([targetData]);

        if (error) throw error;
      }

      await onRefresh();
      setShowAddForm(false);
      setEditingId(null);
      resetForm();
    } catch (err) {
      console.error('Error saving target:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (target: SalesMonthlyTarget) => {
    setFormData({
      year: target.year,
      month: target.month,
      gross_profit_year_target: target.gross_profit_year_target,
      gross_profit_month_target: target.gross_profit_month_target,
      number_of_working_days: target.number_of_working_days
    });
    setEditingId(target.id || null);
    setShowAddForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this target?')) return;

    try {
      const { supabase } = await import('@/lib/supabaseClient');
      const { error } = await supabase
        .from('sales_monthly_targets')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await onRefresh();
    } catch (err) {
      console.error('Error deleting target:', err);
    }
  };

  const resetForm = () => {
    setFormData({
      year: new Date().getFullYear(),
      month: new Date().getMonth() + 1,
      gross_profit_year_target: 0,
      gross_profit_month_target: 0,
      number_of_working_days: 22
    });
  };

  const cancelEdit = () => {
    setShowAddForm(false);
    setEditingId(null);
    resetForm();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AE', {
      style: 'currency',
      currency: 'AED',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getMonthName = (month: number) => {
    return MONTHS.find(m => m.value === month)?.label || month.toString();
  };

  // Sort targets by year and month (most recent first)
  const sortedTargets = targets.sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    return b.month - a.month;
  });

  return (
    <div className="w-full backdrop-blur-md bg-gradient-to-br from-gray-900/90 via-black/80 to-gray-800/90 rounded-xl border border-gray-500/30 shadow-2xl">
      {/* Header */}
      <div className="p-4 border-b border-gray-500/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-gray-600 via-gray-500 to-gray-700 flex items-center justify-center shadow-lg">
              <Target className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Sales Targets Management</h2>
              <p className="text-gray-400 text-sm">Set monthly targets for sales department performance</p>
            </div>
          </div>
          
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 bg-gradient-to-r from-gray-600 to-gray-700 text-white shadow-md hover:from-gray-500 hover:to-gray-600"
          >
            <Plus className="w-4 h-4" />
            <span>Add Target</span>
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Add/Edit Form */}
      {showAddForm && (
        <div className="p-4 border-b border-gray-400/30 bg-gradient-to-r from-gray-600/20 via-gray-500/20 to-gray-600/20 backdrop-blur-sm">
          <h3 className="text-lg font-semibold text-white mb-2">
            {editingId ? 'Edit Target' : 'Add New Target'}
          </h3>
          <p className="text-sm text-gray-400 mb-4">
            💡 Set gross profit targets for both year and month to track sales performance.
          </p>
          
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Year</label>
              <input
                type="number"
                value={formData.year}
                onChange={(e) => setFormData(prev => ({ ...prev, year: parseInt(e.target.value) }))}
                className="w-full px-3 py-2 bg-black/40 border border-gray-500/30 rounded-lg text-white text-sm focus:ring-2 focus:ring-green-400 focus:border-transparent"
                min="2020"
                max="2030"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Month</label>
              <select
                value={formData.month}
                onChange={(e) => setFormData(prev => ({ ...prev, month: parseInt(e.target.value) }))}
                className="w-full px-3 py-2 bg-black/40 border border-gray-500/30 rounded-lg text-white text-sm focus:ring-2 focus:ring-green-400 focus:border-transparent"
                required
              >
                {MONTHS.map(month => (
                  <option key={month.value} value={month.value}>{month.label}</option>
                ))}
              </select>
            </div>
            
                         <div>
               <label className="block text-sm font-medium text-gray-300 mb-1">Gross Profit Year Target (AED)</label>
               <input
                 type="number"
                 value={formData.gross_profit_year_target}
                 onChange={(e) => setFormData(prev => ({ ...prev, gross_profit_year_target: parseFloat(e.target.value) || 0 }))}
                 className="w-full px-3 py-2 bg-black/40 border border-gray-500/30 rounded-lg text-white text-sm focus:ring-2 focus:ring-green-400 focus:border-transparent"
                 step="0.01"
                 min="0"
                 required
               />
             </div>
             
             <div>
               <label className="block text-sm font-medium text-gray-300 mb-1">Gross Profit Month Target (AED)</label>
               <input
                 type="number"
                 value={formData.gross_profit_month_target}
                 onChange={(e) => setFormData(prev => ({ ...prev, gross_profit_month_target: parseFloat(e.target.value) || 0 }))}
                 className="w-full px-3 py-2 bg-black/40 border border-gray-500/30 rounded-lg text-white text-sm focus:ring-2 focus:ring-green-400 focus:border-transparent"
                 step="0.01"
                 min="0"
                 required
               />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Working Days</label>
              <input
                type="number"
                value={formData.number_of_working_days}
                onChange={(e) => setFormData(prev => ({ ...prev, number_of_working_days: parseInt(e.target.value) || 0 }))}
                className="w-full px-3 py-2 bg-black/40 border border-gray-500/30 rounded-lg text-white text-sm focus:ring-2 focus:ring-green-400 focus:border-transparent"
                min="1"
                max="31"
                required
              />
            </div>
            
            <div className="md:col-span-5 flex items-center space-x-3 pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 bg-gradient-to-r from-gray-600 to-gray-700 text-white shadow-md hover:from-gray-500 hover:to-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-4 h-4" />
                <span>{submitting ? 'Saving...' : editingId ? 'Update' : 'Save'}</span>
              </button>
              
              <button
                type="button"
                onClick={cancelEdit}
                className="flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 text-gray-400 hover:text-white hover:bg-gray-800/50"
              >
                <X className="w-4 h-4" />
                <span>Cancel</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Targets List */}
      <div className="backdrop-blur-md bg-gradient-to-br from-gray-900/90 via-black/80 to-gray-800/90 rounded-xl border border-gray-500/30 shadow-2xl overflow-hidden">
        <div className="overflow-x-auto max-w-full">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gradient-to-r from-gray-600/30 via-gray-500/30 to-gray-600/30 backdrop-blur-sm border-b border-gray-400/30">
                <th className="sticky left-0 bg-gradient-to-r from-gray-700/60 to-gray-600/60 backdrop-blur-sm px-3 py-4 text-left text-gray-100 font-semibold border-r border-gray-400/30">
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-gray-300" />
                    <span>Period</span>
                  </div>
                </th>
                <th className="px-3 py-4 text-center text-gray-100 font-semibold border-r border-gray-400/20">
                  <div className="flex items-center justify-center space-x-2">
                    <Target className="w-4 h-4 text-gray-300" />
                    <span className="text-gray-200">Year Target</span>
                  </div>
                </th>
                <th className="px-3 py-4 text-center text-gray-100 font-semibold border-r border-gray-400/20">
                  <div className="flex items-center justify-center space-x-2">
                    <Target className="w-4 h-4 text-gray-300" />
                    <span className="text-gray-200">Month Target</span>
                  </div>
                </th>
                <th className="px-3 py-4 text-center text-gray-100 font-semibold border-r border-gray-400/20">
                  <div className="flex items-center justify-center space-x-2">
                    <Clock className="w-4 h-4 text-gray-300" />
                    <span className="text-gray-200">Working Days</span>
                  </div>
                </th>
                <th className="px-3 py-4 text-center text-gray-100 font-semibold">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-white/60">
                    Loading targets...
                  </td>
                </tr>
              ) : sortedTargets.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-white/60">
                    No targets set yet. Click "Add Target" to get started.
                  </td>
                </tr>
              ) : (
                sortedTargets.map((target, index) => (
                  <tr 
                    key={target.id} 
                    className={`border-b border-gray-400/10 hover:bg-gray-300/5 backdrop-blur-sm transition-colors ${
                      index % 2 === 0 ? 'bg-black/5' : 'bg-gray-900/10'
                    }`}
                  >
                    <td className="sticky left-0 bg-gradient-to-r from-gray-700/60 to-gray-600/60 backdrop-blur-sm px-3 py-3 border-r border-gray-400/30">
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4 text-gray-300" />
                        <span className="text-gray-100 font-medium">
                          {getMonthName(target.month)} {target.year}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-center border-r border-gray-400/10">
                      <span className="text-gray-200 font-mono">
                        {formatCurrency(target.gross_profit_year_target)}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center border-r border-gray-400/10">
                      <span className="text-gray-200 font-mono">
                        {formatCurrency(target.gross_profit_month_target)}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center border-r border-gray-400/10">
                      <span className="text-gray-200 font-mono">
                        {target.number_of_working_days}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-center space-x-2">
                        <button
                          onClick={() => handleEdit(target)}
                          className="p-1 text-gray-400 hover:text-white hover:bg-gray-800/50 transition-all duration-200 rounded"
                          title="Edit"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => target.id && handleDelete(target.id)}
                          className="p-1 text-red-400 hover:text-red-300 hover:bg-red-900/20 transition-all duration-200 rounded"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
} 