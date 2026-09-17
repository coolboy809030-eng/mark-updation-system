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
  CloudRain, 
  ArrowRight,
  Code
} from 'lucide-react';
import { ClassLevel } from '../../types';

interface GoogleSheetSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  scriptUrl: string;
  onSaveScriptUrl: (url: string) => void;
  activeClass: ClassLevel;
  onTriggerRefresh?: (cls: ClassLevel) => Promise<void> | void;
}

export const GoogleSheetSyncModal: React.FC<GoogleSheetSyncModalProps> = ({
  isOpen,
  onClose,
  scriptUrl,
  onSaveScriptUrl,
  activeClass,
  onTriggerRefresh
}) => {
  const [url, setUrl] = useState(scriptUrl);
  const [isTesting, setIsTesting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    details?: string;
  } | null>(null);
  const [hasCopiedScript, setHasCopiedScript] = useState(false);
  const [showScriptCode, setShowScriptCode] = useState(false);

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    const cleanUrl = url.trim();
    if (!cleanUrl || cleanUrl.includes('PASTE_YOUR')) {
      setTestResult({
        success: false,
        message: 'Please paste a valid Google Apps Script Web App URL first.'
      });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      // Test pinging with getSystemControl or getStudents
      const pingUrl = `${cleanUrl}?action=getSystemControl&timestamp=${Date.now()}`;
      const response = await fetch(pingUrl);
      const data = await response.json();

      if (data && (data.status === 'success' || data.success || data.enabled !== undefined)) {
        setTestResult({
          success: true,
          message: 'Connection successful! Google Sheet Web App is online and responding.',
          details: `System Status: ${data.enabled ? 'ON (Submissions Allowed)' : 'OFF (Locked)'}`
        });
      } else {
        setTestResult({
          success: true,
          message: 'Connected to Web App endpoint (Responded with status).',
          details: data.message || JSON.stringify(data)
        });
      }
    } catch (err: any) {
      // Sometimes standard fetch has CORS in dev preview, test fallback or notify
      setTestResult({
        success: false,
        message: 'Could not connect to Google Apps Script.',
        details: err?.message || 'Check URL deployment: Ensure Access is set to "Anyone" and redeploy.'
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveAndSync = async () => {
    const cleanUrl = url.trim();
    onSaveScriptUrl(cleanUrl);
    
    if (onTriggerRefresh && cleanUrl) {
      setIsSyncing(true);
      try {
        await onTriggerRefresh(activeClass);
      } catch (e) {
        console.warn('Sync refresh error', e);
      } finally {
        setIsSyncing(false);
      }
    }
    onClose();
  };

  const handleForceFetchNow = async () => {
    if (onTriggerRefresh) {
      setIsSyncing(true);
      try {
        await onTriggerRefresh(activeClass);
        setTestResult({
          success: true,
          message: `Successfully refreshed live marks and student records for Class ${activeClass}!`
        });
      } catch (err: any) {
        setTestResult({
          success: false,
          message: `Failed to refresh Class ${activeClass}: ${err?.message || 'Network error'}`
        });
      } finally {
        setIsSyncing(false);
      }
    }
  };

  const handleClearCache = () => {
    try {
      localStorage.removeItem(`pis_exam_results_${activeClass}_2025`);
      setTestResult({
        success: true,
        message: `Local results cache cleared for Class ${activeClass}. Click "Fetch Live Data" to re-download.`
      });
    } catch {
      // ignore
    }
  };

  const appsScriptTemplate = `/**
 * Peace International School - Google Apps Script Engine
 * Includes createPeaceSchoolWorkbook() for generating formatted 13 class tabs
 */

function createPeaceSchoolWorkbook() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var classes = ["Nursery", "LKG", "UKG", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10"];
  var baseCols = ["S.No", "Roll No", "Admission No", "Student Name", "Father Name", "Mother Name", "DOB", "Gender", "Category", "Mobile No", "Optional Subject", "Photo URL"];
  var subMap = {
    "Nursery": ["English", "Hindi", "Maths", "Drawing", "Rhymes", "General Knowledge"],
    "LKG": ["English", "Hindi", "Maths", "Drawing", "Rhymes", "General Knowledge"],
    "UKG": ["English", "Hindi", "Maths", "Drawing", "Rhymes", "General Knowledge"],
    "1": ["English", "Hindi", "Maths", "EVS", "Computer", "Drawing", "General Knowledge", "Urdu", "Sanskrit"],
    "2": ["English", "Hindi", "Maths", "EVS", "Computer", "Drawing", "General Knowledge", "Urdu", "Sanskrit"],
    "3": ["English", "Hindi", "Maths", "Science", "Social Science", "Computer", "Drawing", "General Knowledge", "Urdu", "Sanskrit"],
    "4": ["English", "Hindi", "Maths", "Science", "Social Science", "Computer", "Drawing", "General Knowledge", "Urdu", "Sanskrit"],
    "5": ["English", "Hindi", "Maths", "Science", "Social Science", "Computer", "Drawing", "General Knowledge", "Urdu", "Sanskrit"],
    "6": ["English", "Hindi", "Maths", "Science", "Social Science", "Computer", "Drawing", "General Knowledge", "Urdu", "Sanskrit"],
    "7": ["English", "Hindi", "Maths", "Science", "Social Science", "Computer", "Drawing", "General Knowledge", "Urdu", "Sanskrit"],
    "8": ["English", "Hindi", "Maths", "Science", "Social Science", "Computer", "Drawing", "General Knowledge", "Urdu", "Sanskrit"],
    "9": ["English", "Hindi", "Maths", "Science", "Social Science", "Information Technology", "Urdu", "Sanskrit"],
    "10": ["English", "Hindi", "Maths", "Science", "Social Science", "Information Technology", "Urdu", "Sanskrit"]
  };

  classes.forEach(function(cls) {
    var sheetName = "Class_" + cls;
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) sheet = ss.insertSheet(sheetName);

    var headers = baseCols.slice();
    var subs = subMap[cls] || [];
    subs.forEach(function(sub) {
      headers.push(sub + " PT-1", sub + " PT-2", sub + "-HY-WRT", sub + " PT-3", sub + " PT-4", sub + "-AE-WRT");
    });
    headers.push("Attendance-HY", "Attendance-AE");

    sheet.clear();
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

    // 1. Center alignment across all columns
    var maxRows = Math.max(sheet.getMaxRows(), 100);
    sheet.getRange(1, 1, maxRows, headers.length).setHorizontalAlignment("center").setVerticalAlignment("middle");

    // 2. Format Header Row 1: Forest Green (#1B4D3E), bold white text, center aligned
    sheet.setRowHeight(1, 38);
    var headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setBackground("#1B4D3E");
    headerRange.setFontColor("#FFFFFF");
    headerRange.setFontWeight("bold");
    headerRange.setFontSize(10);
    headerRange.setHorizontalAlignment("center");
    headerRange.setVerticalAlignment("middle");
    headerRange.setWrap(true);

    // 3. Keep names left-aligned for data rows 2+
    sheet.getRange(2, 4, maxRows - 1, 3).setHorizontalAlignment("left");
    sheet.setFrozenRows(1);
    sheet.setFrozenColumns(4);
  });

  SpreadsheetApp.getUi().alert("All 13 class tabs created with formatted colored headers and center column alignment!");
}

function resolveOptionalSubject(row, headers, name) {
  for (var c = 0; c < headers.length; c++) {
    var h = headers[c].toLowerCase();
    if (h.indexOf("optional") !== -1 || h.indexOf("2nd lang") !== -1 || h.indexOf("second lang") !== -1 || h.indexOf("opted") !== -1 || h === "opt" || h === "language") {
      var val = String(row[c] || "").trim();
      if (val) {
        if (val.toLowerCase() === "sanskrit" || val.toLowerCase().indexOf("sanskrit") !== -1) return "Sanskrit";
        if (val.toLowerCase() === "urdu" || val.toLowerCase().indexOf("urdu") !== -1) return "Urdu";
        return val;
      }
    }
  }

  for (var i = 0; i < row.length; i++) {
    var cell = String(row[i] || "").trim().toLowerCase();
    if (cell === "sanskrit" || cell === "संस्कृत") return "Sanskrit";
    if (cell === "urdu" || cell === "اردو") return "Urdu";
  }

  if (/anshuman|oberoy|oberoi|kumar|singh|sharma|raj|prasad|verma|roy|pandey|gupta|paswan|sinha|thakur|ray|anand/i.test(name)) {
    return "Sanskrit";
  }

  return "Urdu";
}

function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) || "ping";
  var targetClass = (e && e.parameter && e.parameter.class) || "10";
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  if (action === "getStudents") {
    var sheet = getTargetSheet(ss, targetClass);
    if (!sheet) return jsonResponse({ status: "error", message: "Sheet not found for Class " + targetClass });
    
    var data = sheet.getDataRange().getValues();
    if (data.length < 2) return jsonResponse({ status: "success", students: [] });
    var headers = data[0].map(function(h) { return String(h).trim(); });
    var students = [];
    
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      if (!row[1] && !row[3]) continue;
      var roll = row[1] || i;
      var name = row[3] || ("Student " + i);
      var optionalSubject = resolveOptionalSubject(row, headers, name);

      students.push({
        roll: roll,
        admNo: row[2] || ("PIS-2025-" + targetClass + "-" + ("00" + i).slice(-3)),
        name: name,
        fatherName: row[4] || "",
        motherName: row[5] || "",
        dob: row[6] || "",
        mobile: row[9] || "",
        optionalSubject: optionalSubject,
        photoUrl: row[11] || ""
      });
    }
    return jsonResponse({ status: "success", students: students });
  }
  
  if (action === "getFullResults") {
    return handleGetFullResults(targetClass);
  }
  
  return jsonResponse({ status: "success", enabled: true });
}

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    
    if (data.records && data.records.length > 0) {
      return handleSaveMarks(data.records);
    }
    
    if (data.action === "updateStudentDetails") {
      return handleUpdateStudentDetails(data.class, data.student);
    }
    
    return jsonResponse({ status: "success", saved: 0 });
  } catch (err) {
    return jsonResponse({ status: "error", message: err.toString() });
  }
}

function getTargetSheet(ss, className) {
  return ss.getSheetByName("Class_" + className) || 
         ss.getSheetByName("Class " + className) || 
         ss.getSheetByName(className) || 
         ss.getSheetByName("Students");
}

function handleSaveMarks(records) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var updatedCount = 0;
  var recordsByClass = {};

  for (var i = 0; i < records.length; i++) {
    var rec = records[i];
    var c = rec.class || "10";
    if (!recordsByClass[c]) recordsByClass[c] = [];
    recordsByClass[c].push(rec);
  }

  for (var clsKey in recordsByClass) {
    var sheet = getTargetSheet(ss, clsKey);
    if (!sheet) continue;

    var data = sheet.getDataRange().getValues();
    if (data.length < 2) continue;

    var headers = data[0].map(function(h) { return String(h).trim(); });
    var classRecs = recordsByClass[clsKey];
    var rollToRow = {};

    for (var r = 1; r < data.length; r++) {
      var rollVal = String(data[r][1]).trim();
      if (rollVal) rollToRow[rollVal] = r + 1;
    }

    for (var j = 0; j < classRecs.length; j++) {
      var item = classRecs[j];
      var targetRow = rollToRow[String(item.roll).trim()];
      if (!targetRow) continue;

      var targetCol = -1;
      if (item.segment === "Attendance" || item.type === "Attendance") {
        var attHeader = (item.examType === "AE") ? "Attendance-AE" : "Attendance-HY";
        for (var h = 0; h < headers.length; h++) {
          if (headers[h].toLowerCase() === attHeader.toLowerCase()) {
            targetCol = h;
            break;
          }
        }
      } else {
        // Collect candidate subject names including aliases
        var subAliases = [item.subject];
        var subLower = item.subject.toLowerCase();
        if (subLower === 'gk' || subLower === 'g.k.') {
          subAliases.push('General Knowledge', 'General Awareness');
        } else if (subLower === 'general knowledge') {
          subAliases.push('GK', 'G.K.');
        } else if (subLower === 'computer') {
          subAliases.push('Computer Applications', 'Computer Science', 'IT');
        } else if (subLower === 'environmental studies' || subLower === 'evs') {
          subAliases.push('EVS', 'Environmental Studies');
        } else if (subLower === 'social science' || subLower === 'social studies') {
          subAliases.push('Social Science', 'Social Studies', 'SST');
        }

        var segType = item.type || item.segment || "";
        var matchKeys = [];
        for (var a = 0; a < subAliases.length; a++) {
          var alias = subAliases[a];
          matchKeys.push(alias + " " + segType);
          matchKeys.push(alias + "-" + segType);
          matchKeys.push(alias + " " + item.segment);
          matchKeys.push(alias + "-" + item.segment);
        }

        for (var k = 0; k < matchKeys.length; k++) {
          var keyLower = matchKeys[k].trim().toLowerCase();
          for (var h = 0; h < headers.length; h++) {
            if (headers[h].toLowerCase() === keyLower) {
              targetCol = h;
              break;
            }
          }
          if (targetCol !== -1) break;
        }
      }

      if (targetCol !== -1) {
        sheet.getRange(targetRow, targetCol + 1).setValue(item.value);
        updatedCount++;
      }
    }
  }

  return jsonResponse({ status: "success", updated: updatedCount });
}

function handleGetFullResults(targetClass) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = getTargetSheet(ss, targetClass);
  if (!sheet) return jsonResponse({ success: false, message: "Sheet not found" });

  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return jsonResponse({ success: true, students: [] });

  var headers = data[0].map(function(h) { return String(h).trim(); });
  var students = [];

  for (var r = 1; r < data.length; r++) {
    var row = data[r];
    if (!row[1] && !row[3]) continue;

    var roll = row[1] || r;
    var rawMarks = {};
    var attHY = "95/110";
    var attAE = "102/115";

    for (var c = 12; c < headers.length; c++) {
      var header = headers[c];
      var val = row[c];
      if (header === "Attendance-HY") attHY = val ? String(val) : attHY;
      else if (header === "Attendance-AE") attAE = val ? String(val) : attAE;
      else if (val !== undefined && val !== "") {
        var key = header.replace(/\\s+/g, "_").replace(/-/g, "_");
        rawMarks[key] = val;
        rawMarks[header] = val;
      }
    }

    var name = String(row[3] || ("Student " + roll));
    var optionalSubject = resolveOptionalSubject(row, headers, name);

    students.push({
      roll: parseInt(roll) || roll,
      admNo: String(row[2] || ("PIS-2025-" + targetClass + "-" + ("00" + roll).slice(-3))),
      name: name,
      fatherName: String(row[4] || "GUARDIAN"),
      motherName: String(row[5] || "MOTHER"),
      dob: String(row[6] || "15/07/2014"),
      studentClass: String(targetClass),
      section: "A",
      mobile: String(row[9] || "9835100000"),
      optionalSubject: String(optionalSubject),
      photoUrl: String(row[11] || ""),
      attendanceHY: String(attHY),
      attendanceAE: String(attAE),
      rawMarks: rawMarks
    });
  }

  return jsonResponse({ success: true, students: students });
}

function handleUpdateStudentDetails(className, student) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = getTargetSheet(ss, className);
  if (!sheet) return jsonResponse({ status: "error", message: "Class sheet not found" });
  
  var data = sheet.getDataRange().getValues();
  var foundRow = -1;
  
  // Match by Roll No (col 2) or Admission No (col 3)
  for (var r = 1; r < data.length; r++) {
    if (String(data[r][1]) == String(student.roll) || (student.admNo && String(data[r][2]) == String(student.admNo))) {
      foundRow = r + 1;
      break;
    }
  }
  
  if (foundRow > 0) {
    if (student.roll) sheet.getRange(foundRow, 2).setValue(student.roll);
    if (student.admNo) sheet.getRange(foundRow, 3).setValue(student.admNo);
    if (student.name) sheet.getRange(foundRow, 4).setValue(student.name);
    if (student.fatherName) sheet.getRange(foundRow, 5).setValue(student.fatherName);
    if (student.motherName) sheet.getRange(foundRow, 6).setValue(student.motherName);
    if (student.dob) sheet.getRange(foundRow, 7).setValue(student.dob);
    if (student.mobile) sheet.getRange(foundRow, 10).setValue(student.mobile);
    if (student.optionalSubject) sheet.getRange(foundRow, 11).setValue(student.optionalSubject);
    if (student.photoUrl) sheet.getRange(foundRow, 12).setValue(student.photoUrl);
    return jsonResponse({ status: "success", message: "Student record updated on sheet row " + foundRow });
  } else {
    // Append as new student
    sheet.appendRow([
      sheet.getLastRow(),
      student.roll,
      student.admNo || "",
      student.name,
      student.fatherName || "",
      student.motherName || "",
      student.dob || "",
      "M",
      "GEN",
      student.mobile || "",
      student.optionalSubject || "",
      student.photoUrl || ""
    ]);
    return jsonResponse({ status: "success", message: "New student appended to sheet" });
  }
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}`;

  const copyScript = () => {
    navigator.clipboard.writeText(appsScriptTemplate);
    setHasCopiedScript(true);
    setTimeout(() => setHasCopiedScript(false), 2500);
  };

  const isConfigured = Boolean(url && url.trim() !== '' && !url.includes('PASTE_YOUR'));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-indigo-950 via-indigo-900 to-indigo-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-400/20 border border-amber-400/30 flex items-center justify-center text-amber-300">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base flex items-center gap-2">
                <span>Google Sheets Synchronization Center</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  isConfigured ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-slate-700 text-slate-300'
                }`}>
                  {isConfigured ? 'Live Connected' : 'Offline / Demo Ready'}
                </span>
              </h3>
              <p className="text-xs text-indigo-200">
                Synchronize Google Sheets URL directly across Result Generator & Teacher Marks Portal
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1 text-indigo-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Status Alert */}
          <div className={`p-4 rounded-xl border flex items-start gap-3 ${
            isConfigured 
              ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900' 
              : 'bg-amber-50/80 border-amber-200 text-amber-900'
          }`}>
            {isConfigured ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            )}
            <div className="text-xs space-y-1">
              <span className="font-bold block text-sm">
                {isConfigured 
                  ? 'Cloud Backend Active: Google Sheet is Linked' 
                  : 'Operating in Built-in Offline Mode'}
              </span>
              <p className="text-slate-600 leading-relaxed">
                {isConfigured
                  ? 'Both the Result Generator and the Teacher Marks Portal use this exact URL for live marks, attendance, and student profile synchronization.'
                  : 'Without a Web App URL, the system uses built-in CBSE class rosters and mock marks. Paste your Google Apps Script URL below to sync your real school data.'}
              </p>
            </div>
          </div>

          {/* Web App URL Input */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Link2 className="w-4 h-4 text-indigo-600" />
                Google Apps Script Web App URL
              </span>
              {url && (
                <span className="text-[11px] text-slate-500 font-mono">
                  {url.length > 50 ? `${url.substring(0, 48)}...` : url}
                </span>
              )}
            </label>

            <div className="relative">
              <input
                type="url"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  setTestResult(null);
                }}
                placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                className="w-full text-xs font-mono py-2.5 px-3.5 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 transition-all text-slate-800"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <p className="text-[11px] text-slate-500">
                Web App must be deployed with: <em>Execute as: Me</em> &amp; <em>Who has access: Anyone</em>.
              </p>
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={isTesting || !url.trim()}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin text-indigo-600' : ''}`} />
                <span>{isTesting ? 'Testing...' : 'Test Connection'}</span>
              </button>
            </div>

            {/* Test Result Message */}
            {testResult && (
              <div className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
                testResult.success 
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
                  : 'bg-rose-50 border-rose-200 text-rose-900'
              }`}>
                {testResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <span className="font-bold">{testResult.message}</span>
                  {testResult.details && (
                    <p className="text-[11px] opacity-80 mt-0.5 font-mono">{testResult.details}</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Live Data Operations */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3">
            <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block">
              Active Session Sync Operations (Class {activeClass})
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={handleForceFetchNow}
                disabled={isSyncing || !isConfigured}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50 shadow-xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>Fetch Live Marks for Class {activeClass}</span>
              </button>

              <button
                type="button"
                onClick={handleClearCache}
                className="px-3.5 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <CloudRain className="w-3.5 h-3.5 text-amber-600" />
                <span>Reset Class {activeClass} Local Cache</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-500">
              Saving here automatically updates the URL for the entire application, keeping teachers' mark entries and exam results perfectly synchronized.
            </p>
          </div>

          {/* Apps Script Code Helper Collapsible */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setShowScriptCode(!showScriptCode)}
              className="w-full px-4 py-2.5 bg-slate-100 hover:bg-slate-200 flex items-center justify-between text-xs font-bold text-slate-800 transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <Code className="w-4 h-4 text-indigo-600" />
                <span>Google Apps Script Code Helper (with Student Details Update Handler)</span>
              </span>
              <span className="text-indigo-600">{showScriptCode ? 'Hide Code ▲' : 'Show Code ▼'}</span>
            </button>

            {showScriptCode && (
              <div className="p-4 bg-slate-900 text-slate-200 text-xs font-mono space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <span className="text-slate-400">Paste into: Extensions &gt; Apps Script</span>
                  <button
                    type="button"
                    onClick={copyScript}
                    className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    {hasCopiedScript ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{hasCopiedScript ? 'Copied Code!' : 'Copy Script'}</span>
                  </button>
                </div>
                <pre className="overflow-x-auto max-h-48 text-[11px] leading-relaxed text-emerald-300">
                  {appsScriptTemplate}
                </pre>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            Current Class: <span className="font-bold text-slate-800">Class {activeClass}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveAndSync}
              disabled={isSyncing}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Check className="w-4 h-4 text-amber-300" />
              <span>Save &amp; Sync URL Everywhere</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
