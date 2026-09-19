import React, { useState } from 'react';
import { SystemControlConfig } from '../../types/resultTypes';
import { Shield, Save, X, ToggleLeft, ToggleRight, Calendar, Check, KeyRound } from 'lucide-react';
import { MASTER_ADMIN_PIN } from '../../data/schoolConfig';
import { createPresetDeadline } from '../../utils/dateFormatter';
import {
  verifyAdminPin,
  getAdminFailedAttempts,
  incrementAdminFailedAttempts,
  resetAdminFailedAttempts
} from '../../utils/adminSession';

interface AdminSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: SystemControlConfig;
  onSaveConfig: (newConfig: SystemControlConfig) => void;
  scriptUrl: string;
  onSaveScriptUrl: (url: string) => void;
  onOpenSubjectAllotment?: () => void;
  adminPin?: string;
  onChangeAdminPin?: (newPin: string) => void;
}

export const AdminSettingsModal: React.FC<AdminSettingsModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
  scriptUrl,
  onSaveScriptUrl,
  onOpenSubjectAllotment,
  adminPin = MASTER_ADMIN_PIN,
  onChangeAdminPin
}) => {
  const [pin, setPin] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState('');
  const [failedAttempts, setFailedAttempts] = useState<number>(() => getAdminFailedAttempts());

  // Password Change in Admin Settings
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [confirmAdminPassword, setConfirmAdminPassword] = useState('');
  const [pwdStatus, setPwdStatus] = useState<string | null>(null);

  const [entryStatus, setEntryStatus] = useState<'ON' | 'OFF'>(config.marksEntryStatus);
  const [deadline, setDeadline] = useState(config.marksEntryDeadline);
  const [hyDays, setHyDays] = useState(config.workingDaysHY);
  const [aeDays, setAeDays] = useState(config.workingDaysAE);
  const [url, setUrl] = useState(scriptUrl);
  const [saveSuccess, setSaveSuccess] = useState(false);

  if (!isOpen) return null;

  const handleVerifyPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (verifyAdminPin(pin, adminPin)) {
      setIsAuthenticated(true);
      setAuthError('');
      setFailedAttempts(0);
      resetAdminFailedAttempts();
    } else {
      const nextCount = incrementAdminFailedAttempts();
      setFailedAttempts(nextCount);

      if (nextCount > 3) {
        setAuthError('Your Mark Entry Power can be locked');
      } else {
        setAuthError(`Incorrect PIN. Only authorized Examination Incharge / Admin can access. (Attempt ${nextCount}/3)`);
      }
    }
  };

  const handleUpdatePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (newAdminPassword.length < 4) {
      setPwdStatus('❌ Password must be at least 4 characters long.');
      return;
    }
    if (newAdminPassword !== confirmAdminPassword) {
      setPwdStatus('❌ New password and confirmation do not match.');
      return;
    }
    if (onChangeAdminPin) {
      onChangeAdminPin(newAdminPassword);
    }
    setPwdStatus('✅ Admin Password changed successfully!');
    setNewAdminPassword('');
    setConfirmAdminPassword('');
    setTimeout(() => {
      setShowPasswordChange(false);
      setPwdStatus(null);
    }, 1200);
  };

  const handleSave = () => {
    onSaveConfig({
      marksEntryStatus: entryStatus,
      marksEntryDeadline: deadline,
      workingDaysHY: hyDays,
      workingDaysAE: aeDays
    });
    onSaveScriptUrl(url);
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      onClose();
    }, 800);
  };

  const setPresetDeadline = (days: number) => {
    setDeadline(createPresetDeadline(days));
  };

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in"
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div 
        className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-slate-200 overflow-hidden my-auto text-left"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 bg-indigo-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Shield className="w-5 h-5 text-indigo-400" />
            <h3 className="font-bold text-base">Examination Authority & Admin Panel</h3>
          </div>
          <button 
            onClick={onClose}
            className="p-1 hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {!isAuthenticated ? (
          /* Authentication Screen */
          <form onSubmit={handleVerifyPin} className="p-6 space-y-4">
            <div className="text-center py-2">
              <div className="w-12 h-12 bg-indigo-50 text-indigo-700 rounded-full flex items-center justify-center mx-auto mb-2 border border-indigo-200">
                <KeyRound className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-slate-900 text-sm">Enter Admin Security Password</h4>
              <p className="text-xs text-slate-500 mt-1">
                Enter your exam controller password to configure school deadlines and system governance.
              </p>
            </div>

            {/* Teacher Warning when 3+ failed attempts */}
            {failedAttempts > 3 && (
              <div className="p-3.5 rounded-xl bg-rose-50 border-2 border-rose-500 text-rose-900 space-y-1 animate-pulse">
                <p className="text-xs font-black text-rose-700 tracking-wide uppercase">
                  &ldquo;Your Mark Entry Power can be locked&rdquo;
                </p>
                <p className="text-[11px] text-rose-800">
                  Multiple unauthorized password attempts detected. If you are a teacher, please return to your Marks Portal.
                </p>
              </div>
            )}

            <div>
              <input
                type="password"
                maxLength={16}
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="••••••••"
                autoFocus
                className="w-full text-center tracking-widest text-xl font-mono py-2.5 px-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600"
              />
              {authError && failedAttempts <= 3 && (
                <p className="text-xs text-rose-600 font-medium mt-1.5 text-center">{authError}</p>
              )}
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                Verify & Unlock Settings
              </button>
            </div>
          </form>
        ) : (
          /* Settings Form */
          <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
            {/* Change Admin Password Section */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-indigo-600" />
                  <span className="text-xs font-bold text-slate-800">Admin Password Management</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPasswordChange(!showPasswordChange)}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-800 underline cursor-pointer"
                >
                  {showPasswordChange ? 'Cancel' : 'Change Password'}
                </button>
              </div>

              {showPasswordChange && (
                <form onSubmit={handleUpdatePassword} className="pt-2 space-y-2.5 border-t border-slate-200">
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="password"
                      placeholder="New Admin Password"
                      value={newAdminPassword}
                      onChange={(e) => setNewAdminPassword(e.target.value)}
                      className="text-xs py-1.5 px-2.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-600"
                    />
                    <input
                      type="password"
                      placeholder="Confirm New Password"
                      value={confirmAdminPassword}
                      onChange={(e) => setConfirmAdminPassword(e.target.value)}
                      className="text-xs py-1.5 px-2.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-600"
                    />
                  </div>
                  {pwdStatus && (
                    <p className="text-xs font-semibold text-slate-700">{pwdStatus}</p>
                  )}
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg cursor-pointer transition-colors"
                    >
                      Update Password
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Toggle Status */}
            <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <span className="text-xs font-bold text-slate-900 block">Marks Entry Portal Lock</span>
                <span className="text-[11px] text-slate-500">
                  {entryStatus === 'ON' ? 'Teachers can submit and edit marks' : 'Portal is frozen; teachers cannot submit'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setEntryStatus(entryStatus === 'ON' ? 'OFF' : 'ON')}
                className="flex items-center gap-1.5 cursor-pointer"
              >
                {entryStatus === 'ON' ? (
                  <ToggleRight className="w-9 h-9 text-emerald-600" />
                ) : (
                  <ToggleLeft className="w-9 h-9 text-slate-400" />
                )}
                <span className={`text-xs font-bold ${entryStatus === 'ON' ? 'text-emerald-700' : 'text-slate-500'}`}>
                  {entryStatus}
                </span>
              </button>
            </div>

            {/* Deadline Setting */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-indigo-600" /> Marks Submission Deadline
              </label>
              <input
                type="datetime-local"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full text-xs font-mono py-2 px-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
              />
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setPresetDeadline(3)}
                  className="px-2.5 py-1 text-[11px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors cursor-pointer"
                >
                  +3 Days
                </button>
                <button
                  type="button"
                  onClick={() => setPresetDeadline(7)}
                  className="px-2.5 py-1 text-[11px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors cursor-pointer"
                >
                  +7 Days
                </button>
                <button
                  type="button"
                  onClick={() => setDeadline('')}
                  className="px-2.5 py-1 text-[11px] font-medium text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                >
                  Clear Deadline
                </button>
              </div>
            </div>

            {/* Working Days Config */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-800 block mb-1">
                  Term 1 Working Days
                </label>
                <input
                  type="number"
                  min={1}
                  max={300}
                  value={hyDays}
                  onChange={(e) => setHyDays(parseInt(e.target.value) || 110)}
                  className="w-full text-xs font-mono py-2 px-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-800 block mb-1">
                  Term 2 Working Days
                </label>
                <input
                  type="number"
                  min={1}
                  max={300}
                  value={aeDays}
                  onChange={(e) => setAeDays(parseInt(e.target.value) || 115)}
                  className="w-full text-xs font-mono py-2 px-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>
            </div>

            {/* PIS Data Base Web App URL */}
            <div>
              <label className="text-xs font-bold text-slate-800 block mb-1">
                PIS Data Base Link / API URL
              </label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://script.google.com/macros/s/.../exec"
                className="w-full text-xs font-mono py-2 px-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Leave blank to operate in local demo mode with built-in class rosters and marks.
              </span>
            </div>

            {/* Class Subject Allotment Link */}
            {onOpenSubjectAllotment && (
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex items-center justify-between gap-3">
                <div>
                  <span className="font-bold text-xs text-amber-950 block">Class Subject Allotment & Marks Control</span>
                  <p className="text-[11px] text-amber-800 mt-0.5">
                    Configure which subjects are allotted to each class for teacher marks entry & admit cards.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenSubjectAllotment();
                  }}
                  className="px-3 py-1.5 bg-[#1b4332] text-white text-xs font-bold rounded-lg hover:bg-[#143326] cursor-pointer shrink-0 transition-colors shadow-2xs"
                >
                  Manage Allotments &rarr;
                </button>
              </div>
            )}

            {/* Submit Buttons */}
            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {saveSuccess ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                {saveSuccess ? 'Saved Successfully!' : 'Save System Settings'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
