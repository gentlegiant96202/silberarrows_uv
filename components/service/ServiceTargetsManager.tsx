"use client";
import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  DollarSign, 
  Clock, 
  Target,
  Plus, 
  Edit3, 
  Trash2, 
  Check, 
  X,
  Save
} from 'lucide-react';
import type { ServiceMonthlyTarget } from '@/types/service';

interface ServiceTargetsManagerProps {
  onRefresh: () => Promise<void>;
  loading?: boolean;
  error?: string | null;
  targets: ServiceMonthlyTarget[];
}

interface TargetFormData {
  year: number;
  month: number;
  net_sales_target: number;
  labour_sales_target: number;
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

export default function ServiceTargetsManager({ 
  onRefresh, 
  loading = false, 
  error = null, 
  targets = [] 
}: ServiceTargetsManagerProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<TargetFormData>({
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    net_sales_target: 0,
    labour_sales_target: 0,
    number_of_working_days: 22
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const { supabase } = await import('@/lib/supabaseClient');
      
      // Calculate derived fields
      const targetData = {
        ...formData,
        net_sales_112_percent: formData.net_sales_target * 1.12, // 112% stretch target
        daily_cumulative_target: formData.net_sales_target / formData.number_of_working_days // Daily pace needed
      };

      if (editingId) {
        // Update existing target
        const { error } = await supabase
          .from('service_monthly_targets')
          .update({
            net_sales_target: targetData.net_sales_target,
            net_sales_112_percent: targetData.net_sales_112_percent,
            daily_cumulative_target: targetData.daily_cumulative_target,
            labour_sales_target: targetData.labour_sales_target,
            number_of_working_days: targetData.number_of_working_days
          })
          .eq('id', editingId);

        if (error) throw error;
      } else {
        // Insert new target
        const { error } = await supabase
          .from('service_monthly_targets')
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

  const handleEdit = (target: ServiceMonthlyTarget) => {
    setFormData({
      year: target.year,
      month: target.month,
      net_sales_target: target.net_sales_target,
      labour_sales_target: target.labour_sales_target,
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
        .from('service_monthly_targets')
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
      net_sales_target: 0,
      labour_sales_target: 0,
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
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-gray-400 via-gray-300 to-gray-500 flex items-center justify-center shadow-lg">
              <Target className="w-5 h-5 text-black" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Service Targets Management</h2>
              <p className="text-gray-400 text-sm">Set monthly targets for service department performance</p>
            </div>
          </div>
          
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-gray-400 via-gray-300 to-gray-500 text-black rounded-lg hover:from-gray-300 hover:to-gray-400 transition-all shadow-md transform hover:scale-105 font-semibold"
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
        <div className="p-4 border-b border-gray-500/20 bg-gradient-to-r from-gray-800/30 to-gray-700/30">
          <h3 className="text-lg font-semibold text-white mb-2">
            {editingId ? 'Edit Target' : 'Add New Target'}
          </h3>
          <p className="text-sm text-gray-400 mb-4">
            💡 The 112% stretch target and daily pace will be calculated automatically based on your inputs.
          </p>
          
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Year</label>
              <input
                type="number"
                value={formData.year}
                onChange={(e) => setFormData(prev => ({ ...prev, year: parseInt(e.target.value) }))}
                className="w-full px-3 py-2 bg-black/40 border border-gray-500/30 rounded-lg text-white text-sm focus:ring-2 focus:ring-gray-400 focus:border-transparent"
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
                className="w-full px-3 py-2 bg-black/40 border border-gray-500/30 rounded-lg text-white text-sm focus:ring-2 focus:ring-gray-400 focus:border-transparent"
                required
              >
                {MONTHS.map(month => (
                  <option key={month.value} value={month.value}>{month.label}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Net Sales Target (AED)</label>
              <input
                type="number"
                value={formData.net_sales_target}
                onChange={(e) => setFormData(prev => ({ ...prev, net_sales_target: parseFloat(e.target.value) || 0 }))}
                className="w-full px-3 py-2 bg-black/40 border border-gray-500/30 rounded-lg text-white text-sm focus:ring-2 focus:ring-gray-400 focus:border-transparent"
                step="1000"
                min="0"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Labour Sales Target (AED)</label>
              <input
                type="number"
                value={formData.labour_sales_target}
                onChange={(e) => setFormData(prev => ({ ...prev, labour_sales_target: parseFloat(e.target.value) || 0 }))}
                className="w-full px-3 py-2 bg-black/40 border border-gray-500/30 rounded-lg text-white text-sm focus:ring-2 focus:ring-gray-400 focus:border-transparent"
                step="1000"
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
                className="w-full px-3 py-2 bg-black/40 border border-gray-500/30 rounded-lg text-white text-sm focus:ring-2 focus:ring-gray-400 focus:border-transparent"
                min="1"
                max="31"
                required
              />
            </div>
            
            <div className="md:col-span-5 flex items-center space-x-3 pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-green-400 to-green-500 hover:from-green-300 hover:to-green-400 text-white rounded-lg transition-all shadow-md transform hover:scale-105 disabled:opacity-50 font-semibold"
              >
                <Save className="w-4 h-4" />
                <span>{submitting ? 'Saving...' : editingId ? 'Update' : 'Save'}</span>
              </button>
              
              <button
                type="button"
                onClick={cancelEdit}
                className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-400 hover:to-gray-500 text-white rounded-lg transition-all shadow-md transform hover:scale-105 font-semibold"
              >
                <X className="w-4 h-4" />
                <span>Cancel</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Targets List */}
      <div className="p-4">
        {loading ? (
          <div className="text-center py-8 text-gray-400">Loading targets...</div>
        ) : sortedTargets.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <Target className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No targets set yet. Add your first target to get started.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
                             <thead>
                 <tr className="bg-gradient-to-r from-gray-700/40 to-gray-600/40 border-b border-gray-500/20">
                   <th className="text-left p-3 text-gray-300 font-semibold">Period</th>
                   <th className="text-right p-3 text-gray-300 font-semibold">Net Sales Target</th>
                   <th className="text-right p-3 text-gray-300 font-semibold text-xs">112% Stretch</th>
                   <th className="text-right p-3 text-gray-300 font-semibold text-xs">Daily Pace</th>
                   <th className="text-right p-3 text-gray-300 font-semibold">Labour Target</th>
                   <th className="text-center p-3 text-gray-300 font-semibold">Working Days</th>
                   <th className="text-center p-3 text-gray-300 font-semibold">Actions</th>
                 </tr>
               </thead>
              <tbody>
                {sortedTargets.map((target, index) => (
                  <tr 
                    key={target.id} 
                    className={`border-b border-gray-500/10 transition-all hover:bg-gray-700/20 ${
                      index % 2 === 0 ? 'bg-gray-800/20' : 'bg-gray-700/10'
                    }`}
                  >
                    <td className="p-3">
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className="text-white font-medium">
                          {getMonthName(target.month)} {target.year}
                        </span>
                      </div>
                    </td>
                                         <td className="p-3 text-right">
                       <div className="flex items-center justify-end space-x-2">
                         <DollarSign className="w-4 h-4 text-green-400" />
                         <span className="text-green-300 font-mono">
                           {formatCurrency(target.net_sales_target)}
                         </span>
                       </div>
                     </td>
                     <td className="p-3 text-right">
                       <div className="flex items-center justify-end space-x-2">
                         <DollarSign className="w-4 h-4 text-yellow-400" />
                         <span className="text-yellow-300 font-mono text-sm">
                           {formatCurrency(target.net_sales_112_percent || target.net_sales_target * 1.12)}
                         </span>
                       </div>
                     </td>
                     <td className="p-3 text-right">
                       <div className="flex items-center justify-end space-x-2">
                         <DollarSign className="w-4 h-4 text-orange-400" />
                         <span className="text-orange-300 font-mono text-sm">
                           {formatCurrency(target.daily_cumulative_target || target.net_sales_target / target.number_of_working_days)}
                         </span>
                       </div>
                     </td>
                     <td className="p-3 text-right">
                       <div className="flex items-center justify-end space-x-2">
                         <DollarSign className="w-4 h-4 text-blue-400" />
                         <span className="text-blue-300 font-mono">
                           {formatCurrency(target.labour_sales_target)}
                         </span>
                       </div>
                     </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <Clock className="w-4 h-4 text-purple-400" />
                        <span className="text-purple-300 font-mono">
                          {target.number_of_working_days}
                        </span>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center justify-center space-x-2">
                        <button
                          onClick={() => handleEdit(target)}
                          className="w-8 h-8 rounded-lg bg-gradient-to-br from-gray-500 to-gray-600 hover:from-gray-400 hover:to-gray-500 text-white flex items-center justify-center transition-all shadow-md transform hover:scale-105"
                        >
                          <Edit3 className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => target.id && handleDelete(target.id)}
                          className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-400 to-red-500 hover:from-red-300 hover:to-red-400 text-white flex items-center justify-center transition-all shadow-md transform hover:scale-105"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
} 