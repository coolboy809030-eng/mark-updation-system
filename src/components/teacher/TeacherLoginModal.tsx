import React, { useState } from 'react';
import {
  UserCheck,
  Lock,
  KeyRound,
  X,
  AlertCircle,
  Eye,
  EyeOff,
  LogIn,
  HelpCircle,
  ShieldAlert
} from 'lucide-react';
import { TeacherAccount } from '../../types';
import {
  verifyTeacherLogin,
  DEFAULT_TEACHER_PASSWORD
} from '../../utils/teacherAccount';

interface TeacherLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (teacher: TeacherAccount) => void;
  onOpenForgotPassword: () => void;
  teacherAccounts?: TeacherAccount[];
}

export const TeacherLoginModal: React.FC<TeacherLoginModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onOpenForgotPassword,
  teacherAccounts = []
}) => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!identifier.trim()) {
      setError('कृपया अपना Teacher ID (उदा. TCH-2026-001) या मोबाइल नंबर दर्ज करें।');
      return;
    }

    if (!password.trim()) {
      setError('कृपया अपना पासवर्ड या पिन दर्ज करें।');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = verifyTeacherLogin(identifier.trim(), password.trim());
      if (!result.success || !result.teacher) {
        setError(result.error || 'अमान्य क्रेडेंशियल्स।');
        setIsSubmitting(false);
        return;
      }

      // Success
      setIsSubmitting(false);
      onSuccess(result.teacher);
    } catch (err: any) {
      setError(err?.message || 'लॉगिन करने में त्रुटि हुई।');
      setIsSubmitting(false);
    }
  };

  return (
    <div
      id="teacher-login-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Top Header Banner */}
        <div className="px-6 py-5 bg-gradient-to-r from-emerald-800 to-teal-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-xl border border-white/20">
              <UserCheck className="w-6 h-6 text-emerald-300" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-wide">
                शिक्षक पोर्टल लॉगिन
              </h3>
              <p className="text-xs text-emerald-200 font-medium">
                Teacher Marks & Attendance Access
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-emerald-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="बंद करें"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold">{error}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Teacher ID or Mobile */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-emerald-700" />
                <span>Teacher ID / पंजीकृत मोबाइल नंबर *</span>
              </label>
              <input
                type="text"
                value={identifier}
                onChange={(e) => {
                  setIdentifier(e.target.value);
                  if (error) setError('');
                }}
                placeholder="उदा. TCH-2026-001 या 9835100001"
                autoFocus
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 transition-all placeholder:text-slate-400 placeholder:font-normal"
              />
            </div>

            {/* Password / PIN */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-emerald-700" />
                  <span>पासवर्ड / पिन *</span>
                </label>
                <button
                  type="button"
                  onClick={onOpenForgotPassword}
                  className="text-xs text-emerald-700 hover:text-emerald-900 font-semibold cursor-pointer transition-colors"
                >
                  पासवर्ड भूल गए?
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError('');
                  }}
                  placeholder="अपना पासवर्ड या डिफ़ॉल्ट पिन दर्ज करें"
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

            {/* Quick Helper Note */}
            <div className="p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-xl flex items-start gap-2.5">
              <HelpCircle className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
              <p className="text-[11px] text-emerald-900 leading-relaxed font-medium">
                पहली बार लॉगिन कर रहे हैं? एडमिन द्वारा दिया गया डिफ़ॉल्ट पासवर्ड{' '}
                <span className="font-mono font-bold bg-white px-1.5 py-0.5 rounded border border-emerald-300 text-emerald-800">
                  {DEFAULT_TEACHER_PASSWORD}
                </span>{' '}
                दर्ज करें। लॉगिन के बाद आप अपना व्यक्तिगत नया पासवर्ड सेट कर सकते हैं।
              </p>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                रद्द करें
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-700 to-teal-800 hover:from-emerald-800 hover:to-teal-900 text-white text-xs font-bold shadow-md shadow-emerald-900/10 flex items-center gap-2 cursor-pointer transition-all disabled:opacity-50"
              >
                <LogIn className="w-4 h-4" />
                <span>{isSubmitting ? 'जाँच रहे हैं...' : 'लॉगिन करें (Login)'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
