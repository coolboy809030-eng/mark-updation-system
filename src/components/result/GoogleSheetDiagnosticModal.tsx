import React, { useState } from 'react';
import { 
  Database, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  ExternalLink, 
  Copy, 
  Check, 
  Link2, 
  HelpCircle,
  ArrowRight,
  ShieldAlert,
  Zap,
  Globe,
  FileSpreadsheet
} from 'lucide-react';
import { ClassLevel } from '../../types';
import { 
  runGoogleSheetDiagnostic, 
  DiagnosticReport, 
  analyzeGoogleUrl 
} from '../../utils/googleSheetFetcher';

interface GoogleSheetDiagnosticModalProps {
  isOpen: boolean;
  onClose: () => void;
  scriptUrl: string;
  onSaveScriptUrl: (url: string) => void;
  activeClass: ClassLevel;
  onForceSync: (cls: ClassLevel) => Promise<void> | void;
}

export const GoogleSheetDiagnosticModal: React.FC<GoogleSheetDiagnosticModalProps> = ({
  isOpen,
  onClose,
  scriptUrl,
  onSaveScriptUrl,
  activeClass,
  onForceSync
}) => {
  const [urlInput, setUrlInput] = useState(scriptUrl);
  const [isRunningTest, setIsRunningTest] = useState(false);
  const [diagnosticReport, setDiagnosticReport] = useState<DiagnosticReport | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [hasCopiedUrl, setHasCopiedUrl] = useState(false);

  if (!isOpen) return null;

  const urlAnalysis = analyzeGoogleUrl(urlInput);

  const handleRunDiagnostic = async () => {
    const clean = urlInput.trim();
    if (!clean) return;
    setIsRunningTest(true);
    setDiagnosticReport(null);
    try {
      const report = await runGoogleSheetDiagnostic(clean, activeClass);
      setDiagnosticReport(report);
      if (report.normalizedUrl !== urlInput) {
        setUrlInput(report.normalizedUrl);
        onSaveScriptUrl(report.normalizedUrl);
      }
    } catch (e: any) {
      // Diagnostic handled
    } finally {
      setIsRunningTest(false);
    }
  };

  const handleSaveAndForceSync = async () => {
    const clean = urlInput.trim();
    onSaveScriptUrl(clean);
    setIsSyncing(true);
    try {
      await onForceSync(activeClass);
      onClose();
    } catch (err) {
      // sync finished
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden my-auto">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-800 to-[#1B4D3E] text-white p-4 px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20 shadow-inner">
              <Database className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>Google Sheet Live Diagnostics &amp; Fixer</span>
                <span className="text-[10px] bg-amber-400 text-emerald-950 font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Troubleshooter
                </span>
              </h3>
              <p className="text-xs text-emerald-100/90">
                गूगल शीट से डेटा फेचिंग की समस्या की जांच व समाधान (Class {activeClass})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-white/80 hover:text-white p-1.5 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-slate-800 text-xs">
          
          {/* Why Data Fetching Might Fail Banner (In clear Hindi + English) */}
          <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-xl space-y-2">
            <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
              <span>गूगल शीट से डेटा फेच न होने के 3 सबसे मुख्य कारण:</span>
            </div>
            <ul className="list-disc pl-5 space-y-1 text-amber-900/90 text-[11px] leading-relaxed">
              <li>
                <strong>1. Apps Script में "Who has access" केवल "Only myself" रह जाना:</strong> यदि Google Apps Script में Access को <strong>"Anyone" (कोई भी)</strong> नहीं चुना गया है, तो ब्राउज़र सुरक्षा कारणों (CORS Policy) से डेटा ब्लॉक कर देता है।
              </li>
              <li>
                <strong>2. URL के अंत में <code>/dev</code> होना:</strong> डेवलपमेंट URL केवल लॉग-इन डेवलपर के लिए चलता है। लाइव फेच के लिए <strong><code>/exec</code></strong> होना चाहिए। (यह टूल इसे अपने आप ठीक कर देता है)।
              </li>
              <li>
                <strong>3. शीट लिंक बनाम स्क्रिप्ट URL:</strong> यदि आप सीधे Google Sheet का लिंक डाल रहे हैं, तो शीट को <strong>"Anyone with the link can view"</strong> शेयर होना आवश्यक है।
              </li>
            </ul>
          </div>

          {/* URL Input & Format Detection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Link2 className="w-3.5 h-3.5 text-emerald-700" />
                <span>Google Apps Script Web App URL या Google Sheet Link</span>
              </label>
              {urlAnalysis.type === 'apps_script' && (
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                  <Globe className="w-3 h-3" /> Apps Script Web App
                </span>
              )}
              {urlAnalysis.type === 'spreadsheet' && (
                <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                  <FileSpreadsheet className="w-3 h-3" /> Direct Google Sheet
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://script.google.com/macros/s/.../exec"
                className="flex-1 font-mono text-xs border border-slate-300 rounded-xl p-2.5 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 transition-all text-slate-800"
              />
              <button
                type="button"
                onClick={handleRunDiagnostic}
                disabled={isRunningTest || !urlInput.trim()}
                className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer shrink-0"
              >
                {isRunningTest ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Testing...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5 text-amber-300" />
                    <span>Run Diagnostic</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Diagnostic Report Section */}
          {diagnosticReport && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  {diagnosticReport.overallSuccess ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600" />
                  )}
                  <span>Diagnostic Results:</span>
                </span>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                  diagnosticReport.overallSuccess 
                    ? 'bg-emerald-100 text-emerald-800' 
                    : 'bg-rose-100 text-rose-800'
                }`}>
                  {diagnosticReport.overallSuccess 
                    ? 'Connection OK & Ready' 
                    : 'Issues Detected - Action Required'}
                </span>
              </div>

              {/* Checks list */}
              <div className="space-y-2">
                {diagnosticReport.checks.map(chk => (
                  <div 
                    key={chk.id}
                    className={`p-2.5 rounded-lg border text-[11px] ${
                      chk.status === 'success' 
                        ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                        : chk.status === 'warning'
                        ? 'bg-amber-50/70 border-amber-200 text-amber-950'
                        : 'bg-rose-50/70 border-rose-200 text-rose-950'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 font-bold">
                        {chk.status === 'success' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                        {chk.status === 'warning' && <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />}
                        {chk.status === 'error' && <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />}
                        <span>{chk.name}</span>
                      </div>
                      <span className="font-mono text-[10px] uppercase font-bold px-1.5 py-0.2 rounded bg-white/70">
                        {chk.status}
                      </span>
                    </div>
                    <p className="mt-1 font-medium">{chk.message}</p>
                    {chk.details && (
                      <p className="mt-1 font-mono text-[10px] text-slate-600 bg-white/60 p-1 rounded border border-slate-200 break-all">
                        {chk.details}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              {/* Actionable Fixes */}
              {diagnosticReport.suggestedFixes.length > 0 && (
                <div className="pt-2 border-t border-slate-200">
                  <h6 className="text-[11px] font-bold text-slate-800 mb-1">
                    समाधान के कदम (Recommended Steps):
                  </h6>
                  <ol className="list-decimal pl-5 space-y-1 text-[11px] text-slate-700">
                    {diagnosticReport.suggestedFixes.map((step, idx) => (
                      <li key={idx}><strong>{step}</strong></li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          )}

          {/* Quick Guide to Deploy Google Apps Script correctly */}
          <div className="border border-slate-200 rounded-xl p-3.5 bg-white space-y-2">
            <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-emerald-700" />
              <span>Google Apps Script को सही तरीके से डिप्लॉय करने की विधि:</span>
            </h4>
            <div className="text-[11px] text-slate-600 space-y-1.5 leading-relaxed">
              <p>1. अपनी Google Sheet खोलें &rarr; ऊपर मेनू में <strong>Extensions &rarr; Apps Script</strong> पर क्लिक करें।</p>
              <p>2. ऊपर नीले रंग के <strong>Deploy</strong> बटन पर क्लिक करें &rarr; <strong>New deployment</strong> चुनें।</p>
              <p>3. गियर आइकन पर क्लिक करके <strong>Web app</strong> चुनें।</p>
              <p>4. <span className="text-rose-700 font-bold">महत्वपूर्ण:</span> <strong>Who has access</strong> में <span className="underline font-bold text-emerald-700">"Anyone"</span> (कोई भी) चुनें। (अगर "Only myself" रहेगा तो फेचिंग नहीं होगी)।</p>
              <p>5. <strong>Deploy</strong> दबाएं और मिलने वाला <strong>Web app URL</strong> यहाँ पेस्ट करें।</p>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
          >
            Cancel / Close
          </button>
          
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSaveAndForceSync}
              disabled={isSyncing || !urlInput.trim()}
              className="px-5 py-2.5 bg-[#1B4D3E] hover:bg-[#153e32] disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
            >
              {isSyncing ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Fetching Data from Sheet...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-3.5 h-3.5 text-amber-300" />
                  <span>Save URL &amp; Force Sync Now</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
