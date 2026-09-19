import React, { useState } from 'react';
import {
  KeyRound,
  X,
  AlertCircle,
  CheckCircle2,
  Send,
  ArrowLeft,
  HelpCircle,
  MessageCircle
} from 'lucide-react';
import { requestTeacherPasswordReset } from '../../utils/teacherAccount';

interface TeacherForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBackToLogin: () => void;
}

export const TeacherForgotPasswordModal: React.FC<TeacherForgotPasswordModalProps> = ({
  isOpen,
  onClose,
  onBackToLogin
}) => {
  const [identifier, setIdentifier] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!identifier.trim()) {
      setError('कृपया अपना Teacher ID (उदा. TCH-2026-001) या पंजीकृत मोबाइल नंबर दर्ज करें।');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = requestTeacherPasswordReset(identifier.trim(), note.trim());
      if (!result.success) {
        setError(result.message);
        setIsSubmitting(false);
        return;
      }

      setSuccessMessage(result.message);
      setIsSubmitting(false);
    } catch (err: any) {
      setError(err?.message || 'अनुरोध दर्ज करने में त्रुटि हुई।');
      setIsSubmitting(false);
    }
  };

  return (
    <div
      id="teacher-forgot-password-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-amber-700 to-amber-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-xl border border-white/20">
              <KeyRound className="w-6 h-6 text-amber-300" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-wide">
                पासवर्ड रीसेट अनुरोध
              </h3>
              <p className="text-xs text-amber-200 font-medium">
                Reset Password via Admin Approval
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-amber-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="बंद करें"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {successMessage ? (
            <div className="space-y-4 py-2">
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="space-y-2">
                  <p className="font-bold text-sm text-emerald-950">
                    अनुरोध सफलतापूर्वक दर्ज किया गया!
                  </p>
                  <p className="text-emerald-800 leading-relaxed">
                    {successMessage}
                  </p>
                  <p className="text-[11px] text-emerald-700 font-medium">
                    जैसे ही एडमिन आपका पासवर्ड डिफ़ॉल्ट (123456) पर रीसेट करेंगे, आप लॉगिन करके अपना नया पासवर्ड सेट कर सकेंगे।
                  </p>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={onBackToLogin}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>लॉगिन पेज पर लौटें</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold cursor-pointer transition-colors"
                >
                  समझ गया / ठीक है
                </button>
              </div>
            </div>
          ) : (
            <>
              {error && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <p className="font-semibold">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
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
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-700/20 focus:border-amber-700 transition-all placeholder:text-slate-400 placeholder:font-normal"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                    <span>संदेश / टिप्पणी (वैकल्पिक)</span>
                  </label>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={2}
                    placeholder="उदा. कृपया मेरा पासवर्ड डिफ़ॉल्ट 123456 पर रीसेट कर दें।"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-700/20 focus:border-amber-700 transition-all placeholder:text-slate-400 resize-none"
                  />
                </div>

                <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl flex items-start gap-2.5">
                  <HelpCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-amber-900 leading-relaxed font-medium">
                    अनुरोध भेजने के बाद स्कूल एडमिन पोर्टल पर आपका अनुरोध प्राप्त करेंगे और आपका पासवर्ड डिफ़ॉल्ट पिन पर रीसेट कर देंगे।
                  </p>
                </div>

                <div className="pt-2 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={onBackToLogin}
                    className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>लॉगिन पर वापस</span>
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-700 to-amber-800 hover:from-amber-800 hover:to-amber-900 text-white text-xs font-bold shadow-md shadow-amber-900/10 flex items-center gap-2 cursor-pointer transition-all disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isSubmitting ? 'भेज रहे हैं...' : 'अनुरोध भेजें'}</span>
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
