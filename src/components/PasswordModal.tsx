import React, { useState } from 'react';
import { Lock, AlertTriangle, X } from 'lucide-react';
import { MASTER_ADMIN_PIN } from '../data/schoolConfig';

interface PasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (enteredPin: string) => void;
  expectedPin: string;
  recordCount: number;
  isLastCandidate: boolean;
}

export const PasswordModal: React.FC<PasswordModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  expectedPin,
  recordCount,
  isLastCandidate
}) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPin = pin.trim();
    const expected = (expectedPin || '').trim() || MASTER_ADMIN_PIN;
    if (cleanPin !== expected && cleanPin !== MASTER_ADMIN_PIN) {
      setError('❌ Incorrect Security PIN. Please contact the Examination Incharge for authorization.');
      return;
    }
    setError('');
    onConfirm(cleanPin);
    setPin('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 text-amber-600 mb-3">
          <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-lg">
              {isLastCandidate ? 'Final Candidate Lock Confirmation' : 'Confirm Submission'}
            </h3>
            <p className="text-xs text-slate-500">Security Verification Required</p>
          </div>
        </div>

        {isLastCandidate && (
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 mb-4">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Last Candidate Detected:</span> This batch includes the
              final student of this class/segment. Please enter the security PIN to confirm and lock this
              entry to PIS Data Base.
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
              Enter Security PIN
            </label>
            <input
              type="password"
              maxLength={8}
              autoFocus
              value={pin}
              onChange={(e) => {
                setPin(e.target.value);
                setError('');
              }}
              placeholder="••••"
              className="w-full text-center tracking-widest text-2xl font-bold bg-slate-50 border-2 border-slate-300 rounded-xl px-4 py-3 focus:bg-white focus:outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10 transition-all font-mono"
            />
          </div>

          {error && (
            <p className="text-xs text-rose-600 font-semibold text-center bg-rose-50 border border-rose-200 p-2 rounded-lg">
              {error}
            </p>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!pin}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#1B4D3E] to-[#24664f] hover:from-[#163f33] hover:to-[#1d5340] text-white text-sm font-bold shadow-md shadow-emerald-950/15 disabled:opacity-50 transition-all"
            >
              Confirm & Submit ({recordCount} records)
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
