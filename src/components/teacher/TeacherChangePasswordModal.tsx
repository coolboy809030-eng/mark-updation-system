import React, { useState } from 'react';
import {
  KeyRound,
  Lock,
  X,
  AlertCircle,
  Eye,
  EyeOff,
  Save,
  CloudUpload
} from 'lucide-react';
import { TeacherAccount } from '../../types';
import { updateTeacherPassword } from '../../utils/teacherAccount';
import { updateTeacherPasswordInGAS } from '../../services/teacherSyncService';

interface TeacherChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  teacher: TeacherAccount;
  onSuccess: (updatedTeacher: TeacherAccount) => void;
  gasUrl?: string;
  isForcedChange?: boolean;
}

export const TeacherChangePasswordModal: React.FC<TeacherChangePasswordModalProps> = ({
  isOpen,
  onClose,
  teacher,
  onSuccess,
  gasUrl,
  isForcedChange = false
}) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cleanPass = newPassword.trim();
    const cleanConfirm = confirmPassword.trim();

    if (!cleanPass) {
      setError('कृपया नया पासवर्ड दर्ज करें।');
      return;
    }

    if (cleanPass.length < 4) {
      setError('पासवर्ड कम से कम 4 अक्षरों या अंकों का होना चाहिए।');
      return;
    }

    if (cleanPass !== cleanConfirm) {
      setError('पासवर्ड और पुष्टि पासवर्ड मेल नहीं खाते।');
      return;
    }

    setIsSubmitting(true);
    setSyncStatus('पासवर्ड स्थानीय रूप से सहेजा जा रहा है...');

    try {
      // 1. Update in local storage
      const localResult = updateTeacherPassword(teacher.teacherId, cleanPass);
      if (!localResult.success || !localResult.teacher) {
        setError(localResult.message);
        setIsSubmitting(false);
        setSyncStatus(null);
        return;
      }

      // 2. Synchronize to Google Sheet _TEACHERS tab
      setSyncStatus('Google Sheet (_TEACHERS) में नया पासवर्ड सिंक हो रहा है...');
      const gasResult = await updateTeacherPasswordInGAS(teacher.teacherId, cleanPass, gasUrl);

      setIsSubmitting(false);
      setSyncStatus(gasResult.message || 'Google Sheet में सफलतापूर्वक सहेजा गया!');

      setTimeout(() => {
        onSuccess(localResult.teacher!);
        onClose();
      }, 1000);
    } catch (err: any) {
      setIsSubmitting(false);
      setSyncStatus(null);
      setError(err?.message || 'पासवर्ड सहेजने में त्रुटि हुई।');
    }
  };

  return (
    <div
      id="teacher-change-password-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-emerald-800 to-teal-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-xl border border-white/20">
              <KeyRound className="w-6 h-6 text-emerald-300" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-wide">
                {isForcedChange ? 'नया व्यक्तिगत पासवर्ड सेट करें' : 'पासवर्ड बदलें'}
              </h3>
              <p className="text-xs text-emerald-200 font-medium">
                {teacher.teacherName} ({teacher.teacherId})
              </p>
            </div>
          </div>
          {!isForcedChange && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-emerald-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="बंद करें"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">
          {isForcedChange && (
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-amber-950">सुरक्षा चेतावनी (Password Update Required)</p>
                <p className="mt-0.5 text-amber-800 leading-relaxed font-medium">
                  एडमिन द्वारा आपका पासवर्ड रीसेट किया गया था या आप डिफ़ॉल्ट पिन का उपयोग कर रहे थे। पोर्टल आगे इस्तेमाल करने के लिए कृपया अपना नया सुरक्षित पासवर्ड बनाएं।
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <p className="font-semibold">{error}</p>
            </div>
          )}

          {syncStatus && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
              <CloudUpload className="w-4 h-4 text-emerald-600 animate-pulse" />
              <span className="font-medium">{syncStatus}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* New Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-emerald-700" />
                <span>नया पासवर्ड (New Password) *</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    if (error) setError('');
                  }}
                  placeholder="कम से कम 4 अक्षर या अंक"
                  autoFocus
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 pr-10 text-sm font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 transition-all placeholder:text-slate-400 placeholder:font-normal"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-1"
                  title={showPassword ? 'पासवर्ड छुपाएं' : 'पासवर्ड दिखाएं'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-emerald-700" />
                <span>नए पासवर्ड की पुष्टि करें (Confirm Password) *</span>
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (error) setError('');
                }}
                placeholder="पुनः वही पासवर्ड दर्ज करें"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 transition-all placeholder:text-slate-400 placeholder:font-normal"
              />
            </div>

            <p className="text-[11px] text-slate-500">
              * यह पासवर्ड गूगल शीट के <code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-slate-800">_TEACHERS</code> टैब में स्वचालित रूप से अपडेट हो जाएगा।
            </p>

            {/* Actions */}
            <div className="pt-2 flex items-center justify-end gap-3">
              {!isForcedChange && (
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  रद्द करें
                </button>
              )}
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-700 to-teal-800 hover:from-emerald-800 hover:to-teal-900 text-white text-xs font-bold shadow-md shadow-emerald-900/10 flex items-center gap-2 cursor-pointer transition-all disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{isSubmitting ? 'सहेज रहे हैं...' : 'नया पासवर्ड सहेजें (Save)'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
