"use client";
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, AlertTriangle } from 'lucide-react';

interface Lead {
  id: string;
  full_name: string;
  phone_number: string;
  country_code: string;
  model_of_interest: string;
}

interface LostReasonModalProps {
  lead: Lead;
  onClose: () => void;
  onConfirm: (reason: string, notes?: string) => void;
  isLoading?: boolean;
}

const LOST_REASONS = [
  'Price',
  'Availability', 
  'Timeline',
  'Finance Approval',
  'Customer Service',
  'No Response'
] as const;

export default function LostReasonModal({ lead, onClose, onConfirm, isLoading = false }: LostReasonModalProps) {
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReason) return;
    
    onConfirm(selectedReason, notes.trim() || undefined);
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const modalContent = (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-2"
      onClick={handleOverlayClick}
    >
      <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-lg p-4 w-full max-w-md text-xs relative max-h-[90vh] overflow-visible shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-lg leading-none text-white/70 hover:text-white transition-colors z-10"
          disabled={isLoading}
        >
          ×
        </button>
        
        {/* Header */}
        <div className="mb-3 pr-8">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h2 className="text-base font-semibold text-white mb-0.5">
                Mark Lead as Lost
              </h2>
              <p className="text-xs text-white/60">
                Please provide a reason for losing this lead
              </p>
            </div>
          </div>
        </div>

        {/* Lead Context */}
        <div className="bg-white/5 backdrop-blur-sm rounded-lg p-2.5 border border-white/10 mb-3">
          <div className="space-y-1.5">
            <div>
              <label className="block text-xs font-medium text-white mb-1 flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Customer
              </label>
              <p className="text-xs text-white/80">{lead.full_name}</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-white mb-1 flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                Phone
              </label>
              <p className="text-xs text-white/80">{lead.country_code} {lead.phone_number}</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-white mb-1 flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                Model Interest
              </label>
              <p className="text-xs text-white/80">{lead.model_of_interest}</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Lost Reason Selection */}
          <div className="bg-white/5 backdrop-blur-sm rounded-lg p-2.5 border border-white/10">
            <label className="block text-xs font-medium text-white mb-2 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
              Reason for Lost Sale <span className="text-red-400">*</span>
            </label>
            <div className="space-y-1.5">
              {LOST_REASONS.map((reason) => (
                <label
                  key={reason}
                  className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-all text-xs ${
                    selectedReason === reason
                      ? 'bg-white/10 border border-white/20 text-white'
                      : 'bg-black/20 border border-white/5 text-white/80 hover:bg-white/5'
                  }`}
                >
                  <div className={`w-3 h-3 rounded-full border flex items-center justify-center transition-all ${
                    selectedReason === reason
                      ? 'border-red-400 bg-red-500/20'
                      : 'border-white/40 bg-transparent hover:border-white/60'
                  }`}>
                    {selectedReason === reason && (
                      <div className="w-1.5 h-1.5 bg-red-400 rounded-full" />
                    )}
                  </div>
                  <input
                    type="radio"
                    name="lostReason"
                    value={reason}
                    checked={selectedReason === reason}
                    onChange={(e) => setSelectedReason(e.target.value)}
                    className="sr-only"
                    disabled={isLoading}
                  />
                  <span>{reason}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Additional Notes */}
          <div className="bg-white/5 backdrop-blur-sm rounded-lg p-2.5 border border-white/10">
            <label className="block text-xs font-medium text-white mb-2 flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Additional Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isLoading}
              placeholder="Any additional context about why this lead was lost..."
              className="w-full px-2.5 py-1.5 text-xs rounded bg-black/20 border border-white/10 text-white placeholder-white/50 focus:outline-none focus:ring-1 focus:ring-white/30 focus:border-white/30 transition-all resize-none"
              rows={3}
              maxLength={500}
            />
            <p className="text-xs text-white/40 mt-1">{notes.length}/500</p>
          </div>

          {/* Actions */}
          <div className="flex gap-1.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-2 py-1 bg-white/5 hover:bg-white/10 backdrop-blur-sm border border-white/10 text-white text-xs rounded transition-all"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!selectedReason || isLoading}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                selectedReason && !isLoading
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-gray-600/50 text-gray-400 cursor-not-allowed'
              }`}
            >
              {isLoading ? 'Marking as Lost...' : 'Mark as Lost'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return typeof window !== 'undefined' ? createPortal(modalContent, document.body) : null;
} 