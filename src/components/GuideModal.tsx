import React from 'react';
import { Sparkles, X, Check, BookOpen, Calendar, Key, Keyboard } from 'lucide-react';

interface GuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GuideModal: React.FC<GuideModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full p-6 border border-slate-200 relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5 pb-3 border-b border-slate-100">
          <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-700">
            <Sparkles className="w-6 h-6 text-[#D4AF37]" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-lg">System Rules & Marking Guidelines</h3>
            <p className="text-xs text-slate-500">Peace International School Standard Evaluation Policy</p>
          </div>
        </div>

        <div className="space-y-4 text-sm text-slate-700">
          {/* Section 1: Marks Structure */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <h4 className="font-bold text-emerald-900 flex items-center gap-2 mb-2 text-xs uppercase tracking-wide">
              <BookOpen className="w-4 h-4 text-emerald-700" />
              <span>Marks Breakdown & Limits</span>
            </h4>
            <ul className="space-y-1.5 text-xs text-slate-600">
              <li className="flex items-start gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-700 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>Periodic Tests (PT-1, PT-2, PT-3, PT-4):</strong> Entered out of <strong>20 marks max</strong>. The system auto-converts this to 10 marks for report cards.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-700 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>Term Written Exams (HY & AE):</strong> Entered out of <strong>80 marks max</strong>.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-700 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>Portfolio (PF) & Subject Enrichment (SE):</strong> Both are calculated automatically from the average of preceding PTs (5 marks each). Total = PT(10) + PF(5) + SE(5) + Written(80) = 100.
                </span>
              </li>
            </ul>
          </div>

          {/* Section 2: Attendance Rules */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <h4 className="font-bold text-amber-900 flex items-center gap-2 mb-2 text-xs uppercase tracking-wide">
              <Calendar className="w-4 h-4 text-amber-600" />
              <span>Attendance Calculation</span>
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              In <strong>Attendance Mode</strong>, specify the <em>Total Working Days</em> (e.g. 110 days for Term 1). For each student, enter their <em>Present Days</em>. The system automatically computes their live attendance percentage. Present days cannot exceed working days.
            </p>
          </div>

          {/* Section 3: Absent Entry & Shortcuts */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <h4 className="font-bold text-slate-900 flex items-center gap-2 mb-2 text-xs uppercase tracking-wide">
              <Keyboard className="w-4 h-4 text-emerald-700" />
              <span>Absent Marking & Fast Entry</span>
            </h4>
            <ul className="space-y-1.5 text-xs text-slate-600">
              <li className="flex items-start gap-2">
                <span className="font-mono font-bold text-slate-800 bg-slate-200 px-1 rounded text-[10px]">A / AB</span>
                <span>Type <strong>'A'</strong> or <strong>'AB'</strong> in the input (or click the quick <strong>AB</strong> button) to mark a student absent.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-mono font-bold text-slate-800 bg-slate-200 px-1 rounded text-[10px]">Enter / ↓</span>
                <span>Press <strong>Enter</strong> or <strong>Down Arrow</strong> to instantly jump to the next student's input without touching your mouse.</span>
              </li>
            </ul>
          </div>

          {/* Section 4: Security PIN */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <h4 className="font-bold text-slate-900 flex items-center gap-2 mb-2 text-xs uppercase tracking-wide">
              <Key className="w-4 h-4 text-[#D4AF37]" />
              <span>Final Candidate PIN</span>
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              When submitting the final student of a class or segment, the system prompts for a security PIN configured by the Examination Authority to confirm that entries are final and prevent incomplete accidental commits.
            </p>
          </div>
        </div>

        <div className="mt-5 pt-3 border-t border-slate-100 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[#1B4D3E] hover:bg-[#153e32] text-white text-xs font-bold transition-colors"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
};
