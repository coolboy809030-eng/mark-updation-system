import React, { useState } from 'react';
import { 
  Link2, 
  Copy, 
  Check, 
  RefreshCw, 
  Share2, 
  Lock, 
  Unlock, 
  Calendar, 
  ExternalLink, 
  X, 
  ShieldCheck, 
  Database, 
  Send,
  Sparkles,
  FileSpreadsheet
} from 'lucide-react';
import { SystemControlConfig } from '../../types/resultTypes';

interface TeacherLinkSyncHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  scriptUrl: string;
  systemConfig: SystemControlConfig;
  onUpdateSystemConfig: (cfg: SystemControlConfig) => void;
  onTriggerSync: () => Promise<void> | void;
  isSyncing: boolean;
  lastSyncedTime?: string | null;
  totalStudentsLoaded?: number;
  onOpenSheetStructure?: () => void;
}

export const TeacherLinkSyncHubModal: React.FC<TeacherLinkSyncHubModalProps> = ({
  isOpen,
  onClose,
  scriptUrl,
  systemConfig,
  onUpdateSystemConfig,
  onTriggerSync,
  isSyncing,
  lastSyncedTime,
  totalStudentsLoaded,
  onOpenSheetStructure
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState(false);

  if (!isOpen) return null;

  // Build the clean public URL for teachers
  const baseUrl = typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname}` : '';
  const teacherUrl = `${baseUrl}?portal=teacher`;

  const copyToClipboard = (text: string, isMsg = false) => {
    navigator.clipboard.writeText(text);
    if (isMsg) {
      setCopiedMessage(true);
      setTimeout(() => setCopiedMessage(false), 2500);
    } else {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const whatsappMessage = `*Peace International School*\n*Teacher Marks & Attendance Entry Portal*\n\nRespected Teachers, please use the link below to submit marks and attendance for your allotted classes and subjects.\n\n🔗 *Portal Link:* ${teacherUrl}\n\n⚠️ *Note:* All marks entered go directly into the school Google Sheet database. Please complete submissions before the deadline.`;

  const handleToggleEntryStatus = () => {
    const newStatus = systemConfig.marksEntryStatus === 'ON' ? 'OFF' : 'ON';
    onUpdateSystemConfig({
      ...systemConfig,
      marksEntryStatus: newStatus
    });
  };

  const handleDeadlineChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdateSystemConfig({
      ...systemConfig,
      marksEntryDeadline: e.target.value
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden relative max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-indigo-950 px-6 py-4 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-400 text-slate-950 font-black shadow-inner">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base tracking-tight">Teacher Link & Synchronization Hub</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  Two-Way Sync
                </span>
              </div>
              <p className="text-xs text-emerald-200">
                Teacher marks entry portal link and Google Sheet data synchronization
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-800">
          
          {/* Section 1: Teacher Link (To Publish & Share) */}
          <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Link2 className="w-4 h-4 text-emerald-800" />
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-950">
                  Public Teacher Portal Link (Share with Teachers)
                </span>
              </div>
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                Result Generator Hidden & Locked 🔒
              </span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Share this link with teachers via WhatsApp, SMS, or Email. Teachers can only enter marks and attendance for their allotted classes. <strong>Teachers will not have access to the Result Generator or confidential Tabulation Registers.</strong>
            </p>

            <div className="flex items-center gap-2">
              <div className="flex-1 bg-white border border-emerald-300 rounded-xl px-3 py-2.5 text-xs font-mono text-emerald-950 truncate shadow-2xs">
                {teacherUrl}
              </div>
              <button
                onClick={() => copyToClipboard(teacherUrl, false)}
                className={`px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer ${
                  copiedLink
                    ? 'bg-emerald-700 text-white'
                    : 'bg-emerald-800 hover:bg-emerald-900 text-white'
                }`}
              >
                {copiedLink ? <Check className="w-4 h-4 text-amber-300" /> : <Copy className="w-4 h-4" />}
                <span>{copiedLink ? 'Copied Link!' : 'Copy Link'}</span>
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <button
                type="button"
                onClick={() => copyToClipboard(whatsappMessage, true)}
                className="text-xs font-bold text-emerald-900 hover:text-emerald-950 flex items-center gap-1 hover:underline cursor-pointer"
              >
                <Send className="w-3.5 h-3.5 text-emerald-700" />
                <span>{copiedMessage ? '✓ WhatsApp Message Copied!' : 'Copy WhatsApp Announcement Text'}</span>
              </button>

              <a
                href={teacherUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-bold text-indigo-700 hover:text-indigo-900 flex items-center gap-1 hover:underline"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Test Link as Teacher (Open in New Tab)</span>
              </a>
            </div>
          </div>

          {/* Section 2: Synchronization Architecture Visualizer */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <Database className="w-4 h-4 text-indigo-700" />
              <span>How Data Synchronization Works (Data Flow Architecture)</span>
            </span>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 pt-1">
              {/* Step 1 */}
              <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black flex items-center justify-center">
                    1
                  </span>
                  <span className="text-[10px] font-bold text-emerald-700">Teacher Portal</span>
                </div>
                <h4 className="text-xs font-bold text-slate-900">Marks Entry</h4>
                <p className="text-[11px] text-slate-500 leading-snug">
                  Teachers open the portal link, enter subject marks or attendance, and submit records.
                </p>
              </div>

              {/* Step 2 */}
              <div className="p-3 bg-white rounded-xl border border-indigo-200 shadow-2xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-black flex items-center justify-center">
                    2
                  </span>
                  <span className="text-[10px] font-bold text-indigo-700">Google Sheet</span>
                </div>
                <h4 className="text-xs font-bold text-slate-900">Central Storage</h4>
                <p className="text-[11px] text-slate-500 leading-snug">
                  Marks are securely stored in your Google Sheet database in real time.
                </p>
              </div>

              {/* Step 3 */}
              <div className="p-3 bg-white rounded-xl border border-amber-300 shadow-2xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-black flex items-center justify-center">
                    3
                  </span>
                  <span className="text-[10px] font-bold text-amber-800">Result Generator</span>
                </div>
                <h4 className="text-xs font-bold text-slate-900">Private Admin</h4>
                <p className="text-[11px] text-slate-500 leading-snug">
                  Click 'Fetch Marks' in the Result Generator to compile results, ranks, and report cards.
                </p>
              </div>
            </div>
          </div>

          {/* Section 3: Live Sync Actions & Google Sheet Connection */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
                  Google Sheet Synchronization
                </span>
                <span className="text-xs text-slate-500">
                  {lastSyncedTime ? `Last Synced: ${lastSyncedTime}` : 'Ready to synchronize with Google Sheet'}
                  {totalStudentsLoaded ? ` • ${totalStudentsLoaded} candidates in active view` : ''}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {onOpenSheetStructure && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenSheetStructure();
                    }}
                    className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-xl text-xs font-bold shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer"
                    title="Open Google Sheet Column Structure & Template Center"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Sheet &amp; Excel Structure</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={onTriggerSync}
                  disabled={isSyncing}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>{isSyncing ? 'Syncing with Sheet...' : 'Fetch Latest Marks from Sheet'}</span>
                </button>
              </div>
            </div>

            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs text-slate-600">
              <div className="flex items-center gap-2 truncate pr-2">
                <Database className="w-4 h-4 text-emerald-700 shrink-0" />
                <span className="font-mono truncate text-[11px]">
                  {scriptUrl ? scriptUrl : 'No Google Apps Script Web App URL configured yet.'}
                </span>
              </div>
              {scriptUrl && (
                <a
                  href={scriptUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-bold text-emerald-800 hover:text-emerald-950 shrink-0 flex items-center gap-1 hover:underline"
                >
                  <span>Test Endpoint</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>

          {/* Section 4: Teacher Submission Control (Lock / Unlock & Deadline) */}
          <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-950 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-amber-700" />
                <span>Teacher Entry Lock & Deadline Control (Admin Management)</span>
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[11px] font-black ${
                systemConfig.marksEntryStatus === 'ON'
                  ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                  : 'bg-rose-100 text-rose-900 border border-rose-300'
              }`}>
                {systemConfig.marksEntryStatus === 'ON' ? 'PORTAL: OPEN' : 'PORTAL: LOCKED'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {/* Toggle Status */}
              <div className="p-3 bg-white rounded-xl border border-amber-200 shadow-2xs flex items-center justify-between">
                <div>
                  <h5 className="text-xs font-bold text-slate-900">Marks Entry Status</h5>
                  <p className="text-[11px] text-slate-500">
                    {systemConfig.marksEntryStatus === 'ON' 
                      ? 'Teachers can submit marks to Sheet' 
                      : 'Submissions are blocked for all teachers'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleToggleEntryStatus}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                    systemConfig.marksEntryStatus === 'ON'
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : 'bg-rose-600 hover:bg-rose-700 text-white'
                  }`}
                >
                  {systemConfig.marksEntryStatus === 'ON' ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                  <span>{systemConfig.marksEntryStatus === 'ON' ? 'OPEN' : 'LOCKED'}</span>
                </button>
              </div>

              {/* Deadline */}
              <div className="p-3 bg-white rounded-xl border border-amber-200 shadow-2xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <h5 className="text-xs font-bold text-slate-900 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-amber-700" />
                    <span>Submission Deadline</span>
                  </h5>
                  {systemConfig.marksEntryDeadline && (
                    <button
                      type="button"
                      onClick={() => onUpdateSystemConfig({ ...systemConfig, marksEntryDeadline: '' })}
                      className="text-[10px] font-bold text-slate-400 hover:text-rose-600 cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <input
                  type="datetime-local"
                  value={systemConfig.marksEntryDeadline || ''}
                  onChange={handleDeadlineChange}
                  className="w-full text-xs font-medium border border-slate-300 rounded-lg p-1.5 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono"
                />
              </div>

              {/* Total Working Days - Admin Authority */}
              <div className="p-3 bg-white rounded-xl border border-emerald-200 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <h5 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#1B4D3E]" />
                    <span>Total Working Days (Admin Decided)</span>
                  </h5>
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md">
                    Admin Only
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-snug">
                  टर्म 1 और टर्म 2 के कुल कार्य दिवस (Total Days) केवल एडमिन तय करेगा। शिक्षक मार्क अपडेशन पोर्टल में केवल उपस्थित दिन भरेंगे।
                </p>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <label className="text-[10px] font-bold text-slate-700 block mb-1">
                      Term 1
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={365}
                      value={systemConfig.workingDaysHY || 110}
                      onChange={(e) => onUpdateSystemConfig({ ...systemConfig, workingDaysHY: parseInt(e.target.value) || 110 })}
                      className="w-full text-xs font-black font-mono border border-slate-300 rounded-lg p-1.5 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600 text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-700 block mb-1">
                      Term 2
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={365}
                      value={systemConfig.workingDaysAE || 115}
                      onChange={(e) => onUpdateSystemConfig({ ...systemConfig, workingDaysAE: parseInt(e.target.value) || 115 })}
                      className="w-full text-xs font-black font-mono border border-slate-300 rounded-lg p-1.5 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600 text-slate-900"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-[11px] text-slate-500 font-medium">
            Peace International School &bull; Confidential Examination Authority
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-950 text-white text-xs font-bold transition-colors cursor-pointer"
          >
            Done / Close
          </button>
        </div>
      </div>
    </div>
  );
};
