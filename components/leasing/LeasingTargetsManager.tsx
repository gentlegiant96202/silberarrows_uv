"use client";
import React, { useState } from 'react';
import { 
  Calendar, 
  Clock, 
  Target,
  Plus, 
  Edit3, 
  Trash2, 
  X,
  Save
} from 'lucide-react';
import type { LeasingMonthlyTarget } from '@/types/leasing';

interface LeasingTargetsManagerProps {
  onRefresh: () => Promise<void>;
  loading?: boolean;
  error?: string | null;
  targets: LeasingMonthlyTarget[];
}

interface TargetFormData {
  year: number;
  month: number;
  a_class_sales_target: number;
  others_sales_target: number;
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

export default function LeasingTargetsManager({ 
  onRefresh, 
  loading = false, 
  error = null, 
  targets = [] 
}: LeasingTargetsManagerProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<TargetFormData>({
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    a_class_sales_target: 100000,
    others_sales_target: 25000,
    number_of_working_days: 25
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const { supabase } = await import('@/lib/supabaseClient');
      
      // Only include non-generated columns
      // total_target and total_target_112_percent are GENERATED columns computed by DB
      const targetData = {
        year: formData.year,
        month: formData.month,
        a_class_sales_target: formData.a_class_sales_target,
        others_sales_target: formData.others_sales_target,
        number_of_working_days: formData.number_of_working_days
      };

      if (editingId) {
        // Update existing target
        const { error } = await supabase
          .from('leasing_monthly_targets')
          .update({
            a_class_sales_target: targetData.a_class_sales_target,
            others_sales_target: targetData.others_sales_target,
            number_of_working_days: targetData.number_of_working_days
          })
          .eq('id', editingId);

        if (error) throw error;
      } else {
        // Insert new target
        const { error } = await supabase
          .from('leasing_monthly_targets')
          .insert([targetData]);

        if (error) throw error;
      }

      await onRefresh();
      setShowAddForm(false);
      setEditingId(null);
      resetForm();
    } catch (err) {
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (target: LeasingMonthlyTarget) => {
    setFormData({
      year: target.year,
      month: target.month,
      a_class_sales_target: target.a_class_sales_target,
      others_sales_target: target.others_sales_target,
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
        .from('leasing_monthly_targets')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await onRefresh();
    } catch (err) {
    }
  };

  const resetForm = () => {
    setFormData({
      year: new Date().getFullYear(),
      month: new Date().getMonth() + 1,
      a_class_sales_target: 100000,
      others_sales_target: 25000,
      number_of_working_days: 25
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
  const sortedTargets = [...targets].sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    return b.month - a.month;
  });

  return (
    <div className="w-full backdrop-blur-md bg-black/90 rounded-xl border border-white/10 shadow-2xl">
      {/* Header */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-gray-200 via-gray-100 to-gray-400 flex items-center justify-center shadow-lg">
              <Target className="w-5 h-5 text-black" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Leasing Targets Management</h2>
              <p className="text-white/60 text-sm">Set monthly targets for leasing department performance</p>
            </div>
          </div>
          
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 bg-gradient-to-br from-gray-200 via-gray-100 to-gray-400 text-black shadow-lg hover:shadow-xl"
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
        <div className="p-4 border-b border-white/10 bg-white/5 backdrop-blur-sm">
          <h3 className="text-lg font-semibold text-white mb-2">
            {editingId ? 'Edit Target' : 'Add New Target'}
          </h3>
          <p className="text-sm text-white/60 mb-4">
            💡 Set A CLASS and OTHERS sales targets. Total target and 112% stretch will be calculated automatically.
          </p>
          
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-white mb-1">Year</label>
              <input
                type="number"
                value={formData.year}
                onChange={(e) => setFormData(prev => ({ ...prev, year: parseInt(e.target.value) }))}
                className="w-full px-3 py-2 bg-black/60 border border-white/20 rounded-lg text-white text-sm focus:ring-2 focus:ring-white/40 focus:border-transparent"
                min="2020"
                max="2030"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-white mb-1">Month</label>
              <select
                value={formData.month}
                onChange={(e) => setFormData(prev => ({ ...prev, month: parseInt(e.target.value) }))}
                className="w-full px-3 py-2 bg-black/60 border border-white/20 rounded-lg text-white text-sm focus:ring-2 focus:ring-white/40 focus:border-transparent"
                required
              >
                {MONTHS.map(month => (
                  <option key={month.value} value={month.value} className="bg-gray-800 text-white">{month.label}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-white mb-1">A CLASS Target (AED)</label>
              <input
                type="number"
                value={formData.a_class_sales_target}
                onChange={(e) => setFormData(prev => ({ ...prev, a_class_sales_target: parseFloat(e.target.value) || 0 }))}
                className="w-full px-3 py-2 bg-black/60 border border-white/20 rounded-lg text-white text-sm focus:ring-2 focus:ring-white/40 focus:border-transparent"
                step="0.01"
                min="0"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-white mb-1">OTHERS Target (AED)</label>
              <input
                type="number"
                value={formData.others_sales_target}
                onChange={(e) => setFormData(prev => ({ ...prev, others_sales_target: parseFloat(e.target.value) || 0 }))}
                className="w-full px-3 py-2 bg-black/60 border border-white/20 rounded-lg text-white text-sm focus:ring-2 focus:ring-white/40 focus:border-transparent"
                step="0.01"
                min="0"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-white mb-1">Working Days</label>
              <input
                type="number"
                value={formData.number_of_working_days}
                onChange={(e) => setFormData(prev => ({ ...prev, number_of_working_days: parseInt(e.target.value) || 0 }))}
                className="w-full px-3 py-2 bg-black/60 border border-white/20 rounded-lg text-white text-sm focus:ring-2 focus:ring-white/40 focus:border-transparent"
                min="1"
                max="31"
                required
              />
            </div>
            
            <div className="md:col-span-5 flex items-center space-x-3 pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 bg-gradient-to-br from-gray-200 via-gray-100 to-gray-400 text-black shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-4 h-4" />
                <span>{submitting ? 'Saving...' : editingId ? 'Update' : 'Save'}</span>
              </button>
              
              <button
                type="button"
                onClick={cancelEdit}
                className="flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 bg-black/40 backdrop-blur-sm border border-white/10 text-white/70 hover:text-white hover:bg-white/10"
              >
                <X className="w-4 h-4" />
                <span>Cancel</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Targets List */}
      <div className="backdrop-blur-md bg-black/90 rounded-xl border border-white/10 shadow-2xl overflow-hidden">
        <div className="overflow-x-auto max-w-full">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gradient-to-r from-white/5 via-white/10 to-white/5 border-b border-white/10">
                <th className="sticky left-0 bg-gradient-to-r from-white/10 to-white/5 backdrop-blur-sm px-3 py-4 text-left text-white font-semibold border-r border-white/10">
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4" />
                    <span>Period</span>
                  </div>
                </th>
                <th className="px-3 py-4 text-center text-white font-semibold border-r border-white/10">
                  <div className="flex items-center justify-center space-x-2">
                    <Target className="w-4 h-4" />
                    <span>A CLASS Target</span>
                  </div>
                </th>
                <th className="px-3 py-4 text-center text-white font-semibold border-r border-white/10">
                  <div className="flex items-center justify-center space-x-2">
                    <Target className="w-4 h-4" />
                    <span>OTHERS Target</span>
                  </div>
                </th>
                <th className="px-3 py-4 text-center text-white font-semibold border-r border-white/10">
                  <div className="flex items-center justify-center space-x-2">
                    <Target className="w-4 h-4" />
                    <span>Total Target</span>
                  </div>
                </th>
                <th className="px-3 py-4 text-center text-white font-semibold border-r border-white/10">
                  <div className="flex items-center justify-center space-x-2">
                    <Target className="w-4 h-4" />
                    <span>112% Stretch</span>
                  </div>
                </th>
                <th className="px-3 py-4 text-center text-white font-semibold border-r border-white/10">
                  <div className="flex items-center justify-center space-x-2">
                    <Clock className="w-4 h-4" />
                    <span>Working Days</span>
                  </div>
                </th>
                <th className="px-3 py-4 text-center text-white font-semibold">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-white/60">
                    Loading targets...
                  </td>
                </tr>
              ) : sortedTargets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-white/60">
                    No targets set yet. Click "Add Target" to get started.
                  </td>
                </tr>
              ) : (
                sortedTargets.map((target) => (
                  <tr 
                    key={target.id} 
                    className="border-b border-white/10 hover:bg-white/5 backdrop-blur-sm transition-colors"
                  >
                    <td className="sticky left-0 bg-white/5 backdrop-blur-sm px-3 py-3 border-r border-white/10">
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4 text-white/90" />
                        <span className="text-white/90 font-medium">
                          {getMonthName(target.month)} {target.year}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-center border-r border-white/10">
                      <span className="text-white/90 font-mono">
                        {formatCurrency(target.a_class_sales_target)}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center border-r border-white/10">
                      <span className="text-white/90 font-mono">
                        {formatCurrency(target.others_sales_target)}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center border-r border-white/10">
                      <span className="text-white/90 font-mono">
                        {formatCurrency(target.total_target)}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center border-r border-white/10">
                      <span className="text-white/90 font-mono">
                        {formatCurrency(target.total_target_112_percent)}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center border-r border-white/10">
                      <span className="text-white/90 font-mono">
                        {target.number_of_working_days}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-center space-x-2">
                        <button
                          onClick={() => handleEdit(target)}
                          className="p-1 text-white/60 hover:text-white hover:bg-white/10 transition-all duration-200 rounded"
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

