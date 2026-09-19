import React from 'react';
import { SCHOOL_NAME, ACADEMIC_SESSION } from '../data/schoolConfig';
import { SCHOOL_LOGO_BASE64 } from '../data/logoData';
import { Wifi, WifiOff, Settings, Database, Sparkles, Shield, PanelLeft, UserCheck, KeyRound, LogIn, LogOut } from 'lucide-react';
import { SyncStatusBar } from './common/SyncStatusBar';
import { TeacherAccount } from '../types';

interface HeaderProps {
  isOnline: boolean;
  isSheetConfigured: boolean;
  onOpenSettings: () => void;
  onOpenGuide: () => void;
  entryType: 'marks' | 'attendance' | null;
  onOpenAdminLogin?: () => void;
  isAdminSessionActive?: boolean;
  onSwitchToResultGenerator?: () => void;
  isSystemLocked?: boolean;
  isTeacherPortal?: boolean;
  authenticatedTeacher?: TeacherAccount | null;
  onOpenTeacherLogin?: () => void;
  onOpenTeacherChangePassword?: () => void;
  onTeacherLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  isOnline,
  isSheetConfigured,
  onOpenSettings,
  onOpenGuide,
  entryType,
  onOpenAdminLogin,
  isAdminSessionActive,
  onSwitchToResultGenerator,
  isSystemLocked,
  isTeacherPortal,
  authenticatedTeacher,
  onOpenTeacherLogin,
  onOpenTeacherChangePassword,
  onTeacherLogout
}) => {
  return (
    <header className="bg-gradient-to-r from-[#0F172A] via-[#1E293B] to-[#0F172A] border-b border-slate-800 text-white shadow-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          
          {/* School Brand & Title */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-white p-1 border border-[#D4AF37]/50 flex items-center justify-center shadow-inner shrink-0">
              <img 
                src={SCHOOL_LOGO_BASE64} 
                alt="School Logo" 
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg sm:text-xl font-bold tracking-tight font-serif text-white">
                  {SCHOOL_NAME}
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#D4AF37] text-slate-950 shadow-xs">
                  {ACADEMIC_SESSION}
                </span>
                {isTeacherPortal && (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    Teacher Portal
                  </span>
                )}
                {isSystemLocked && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500 text-white shadow-sm">
                    🔒 Submissions Locked
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 font-medium flex flex-wrap items-center gap-2">
                <span>Academic Hero</span>
                <span>•</span>
                <span className="text-[#D4AF37] font-semibold">Teacher Marks Portal</span>
                {entryType && (
                  <>
                    <span>•</span>
                    <span className="capitalize font-semibold text-white bg-slate-800 border border-slate-700 px-2 py-0.5 rounded text-[11px]">
                      {entryType === 'marks' ? '📊 Marks Mode' : '📋 Attendance Mode'}
                    </span>
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Indicators & Actions */}
          <div className="w-full sm:w-auto flex items-center justify-end gap-2 flex-wrap self-end sm:self-auto">
            {/* Realtime Instant & Cloud Sync Indicator */}
            <SyncStatusBar isSheetConfigured={isSheetConfigured} />

            {/* Online Indicator (Distinct Green that clearly pops against dark slate) */}
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold backdrop-blur-sm border transition-all ${
                isOnline
                  ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300 shadow-xs'
                  : 'bg-rose-950/80 border-rose-500 text-rose-300 shadow-xs'
              }`}
              title={isOnline ? 'Network online - ready to sync' : 'Network offline - local mode'}
            >
              {isOnline ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="hidden sm:inline">Online</span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-rose-400" />
                  <WifiOff className="w-3.5 h-3.5 text-rose-400" />
                  <span>Offline</span>
                </>
              )}
            </div>

            {/* Teacher Auth State in Header */}
            {isTeacherPortal && (
              <>
                {authenticatedTeacher ? (
                  <div className="flex items-center gap-1.5 bg-emerald-950/80 border border-emerald-500/50 rounded-xl px-2.5 py-1 text-xs text-emerald-200">
                    <UserCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="font-bold truncate max-w-[120px] sm:max-w-[160px]">
                      {authenticatedTeacher.teacherName}
                    </span>
                    <button
                      type="button"
                      onClick={onOpenTeacherChangePassword}
                      className="p-1 text-emerald-300 hover:text-white hover:bg-emerald-800/60 rounded-md transition-colors cursor-pointer"
                      title="पासवर्ड बदलें (Change Password)"
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={onTeacherLogout}
                      className="p-1 text-rose-300 hover:text-rose-100 hover:bg-rose-900/60 rounded-md transition-colors cursor-pointer"
                      title="लॉगआउट करें (Logout)"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={onOpenTeacherLogin}
                    className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
                    title="शिक्षक लॉगिन करें (Teacher Login)"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>शिक्षक लॉगिन</span>
                  </button>
                )}
              </>
            )}

            {/* PIS Data Base Status Badge & Settings (Visible ONLY to Admin when NOT in teacher portal) */}
            {isAdminSessionActive && !isTeacherPortal && (
              <>
                <button
                  onClick={onOpenSettings}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                    isSheetConfigured
                      ? 'bg-amber-400/15 border-amber-300/40 text-amber-300 hover:bg-amber-400/25'
                      : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                  }`}
                  title="PIS Data Base Status (Admin Only)"
                >
                  <Database className="w-3.5 h-3.5 text-[#D4AF37]" />
                  <span>{isSheetConfigured ? 'PIS Data Base Connected' : 'PIS Data Base (Local)'}</span>
                </button>

                <button
                  onClick={onOpenSettings}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 transition-colors cursor-pointer"
                  title="Configure PIS Data Base & Admin Settings (Admin Only)"
                >
                  <Settings className="w-4 h-4 text-slate-300" />
                </button>
              </>
            )}

            {/* Guide / Evaluation Rules Button */}
            <button
              onClick={onOpenGuide}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer"
              title="View system evaluation rules & shortcuts"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>Rules</span>
            </button>

            {/* Admin Controls (Visible ONLY when Admin Session is Authenticated and NOT in teacher portal) */}
            {isAdminSessionActive && !isTeacherPortal && (
              <>
                {onSwitchToResultGenerator && (
                  <button
                    id="btn-header-switch-result-gen"
                    onClick={onSwitchToResultGenerator}
                    className="px-3 py-1 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
                    title="रिजल्ट जनरेटर पोर्टल और नेविगेशन पैनल पर जाएं"
                  >
                    <PanelLeft className="w-3.5 h-3.5 text-slate-950" />
                    <span>Result Portal</span>
                  </button>
                )}

                <button
                  onClick={onOpenSettings}
                  className="px-3 py-1 rounded-lg bg-amber-400/20 hover:bg-amber-400/30 border border-amber-400/40 text-amber-300 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                  title="Admin Control Active - Click to configure locks and database"
                >
                  <Shield className="w-3.5 h-3.5 text-[#D4AF37]" />
                  <span>Admin Controls</span>
                </button>
              </>
            )}
          </div>

        </div>
      </div>
    </header>
  );
};
