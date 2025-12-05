"use client";
import { useState } from 'react';
import { createPortal } from 'react-dom';

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

// Icons
const UserIcon = () => <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>;
const PhoneIcon = () => <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>;
const CarIcon = () => <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>;
const WarningIcon = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>;
const NoteIcon = () => <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>;

export default function LostReasonModal({ lead, onClose, onConfirm, isLoading = false }: LostReasonModalProps) {
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReason) return;
    onConfirm(selectedReason, notes.trim() || undefined);
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isLoading) {
      onClose();
    }
  };

  const modalContent = (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-150"
      onClick={handleOverlayClick}
    >
      <div className="bg-zinc-900/95 border border-white/10 rounded-xl shadow-2xl w-full max-w-md animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500/30 to-red-500/10 flex items-center justify-center border border-red-500/20">
              <span className="text-red-400 font-semibold text-sm">
                {lead.full_name?.charAt(0) || '?'}
              </span>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Mark as Lost</h2>
              <p className="text-xs text-white/50">{lead.full_name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          
          {/* Lead Info */}
          <div className="bg-white/5 rounded-xl p-4 border border-white/10">
            <h3 className="text-[10px] font-semibold text-white/40 uppercase tracking-widest mb-3 flex items-center gap-2">
              <UserIcon /> Lead Details
            </h3>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <span className="text-[10px] font-medium text-white/50 uppercase tracking-wide block mb-1">Customer</span>
                <p className="text-sm text-white font-medium truncate">{lead.full_name}</p>
              </div>
              <div>
                <span className="text-[10px] font-medium text-white/50 uppercase tracking-wide block mb-1">Phone</span>
                <p className="text-sm text-white/80">{lead.country_code} {lead.phone_number}</p>
              </div>
              <div>
                <span className="text-[10px] font-medium text-white/50 uppercase tracking-wide block mb-1">Interest</span>
                <p className="text-sm text-white/80">{lead.model_of_interest || '—'}</p>
              </div>
            </div>
          </div>

          {/* Lost Reason Selection */}
          <div className="bg-white/5 rounded-xl p-4 border border-white/10">
            <h3 className="text-[10px] font-semibold text-white/40 uppercase tracking-widest mb-3 flex items-center gap-2">
              <WarningIcon /> Reason <span className="text-red-400">*</span>
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {LOST_REASONS.map((reason) => (
                <label
                  key={reason}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-all text-sm ${
                    selectedReason === reason
                      ? 'bg-red-500/20 border border-red-500/40 text-white'
                      : 'bg-black/40 border border-white/10 text-white/70 hover:bg-black/60 hover:border-white/20'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
                    selectedReason === reason
                      ? 'border-red-400 bg-red-500/30'
                      : 'border-white/30'
                  }`}>
                    {selectedReason === reason && (
                      <div className="w-2 h-2 bg-red-400 rounded-full" />
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
                  <span className="font-medium">{reason}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Additional Notes */}
          <div className="bg-white/5 rounded-xl p-4 border border-white/10">
            <h3 className="text-[10px] font-semibold text-white/40 uppercase tracking-widest mb-3 flex items-center gap-2">
              <NoteIcon /> Additional Notes
            </h3>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isLoading}
              placeholder="Any additional context about why this lead was lost..."
              className="w-full px-3 py-2.5 text-sm rounded-lg bg-black/40 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-white/30 focus:border-white/20 transition-all resize-none"
              rows={3}
              maxLength={500}
            />
            <p className="text-[10px] text-white/30 mt-1.5 text-right">{notes.length}/500</p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-white/10 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!selectedReason || isLoading}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              selectedReason && !isLoading
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-white/5 text-white/30 cursor-not-allowed'
            }`}
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </span>
            ) : (
              'Mark as Lost'
            )}
          </button>
        </div>
      </div>
    </div>
  );

  return typeof window !== 'undefined' ? createPortal(modalContent, document.body) : null;
}
