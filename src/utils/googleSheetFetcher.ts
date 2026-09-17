/**
 * Google Sheet & Apps Script Fetcher & Diagnostic Utility
 * Handles:
 * 1. Google Apps Script Web App endpoints (doGet with action=getFullResults)
 * 2. Auto-fixing /dev URLs to /exec
 * 3. Direct Google Spreadsheet URL parsing via Google Visualization API (GViz / CSV) for public sheets
 * 4. Deep diagnostics to pinpoint why data fetching fails (CORS, permissions, bad URL, missing sheet tab, etc.)
 */

import { FullStudentExamRecord } from '../types/resultTypes';
import { detectStudentOptionalSubject } from './studentSubjectDetector';
import { normalizeURN, getIdentityDiagnostics } from './studentIdentity';

export type GoogleUrlType = 'apps_script' | 'spreadsheet' | 'invalid';

export interface DiagnosticCheck {
  id: string;
  name: string;
  status: 'pending' | 'success' | 'warning' | 'error';
  message: string;
  details?: string;
}

export interface DiagnosticReport {
  overallSuccess: boolean;
  urlType: GoogleUrlType;
  normalizedUrl: string;
  checks: DiagnosticCheck[];
  suggestedFixes: string[];
  rawResponsePreview?: string;
  studentCountFound?: number;
}

/**
 * Identify URL type and normalize it (e.g. converting /dev to /exec)
 */
export function analyzeGoogleUrl(rawUrl: string): {
  type: GoogleUrlType;
  normalizedUrl: string;
  warning?: string;
  sheetId?: string;
} {
  const url = (rawUrl || '').trim();
  if (!url) {
    return { type: 'invalid', normalizedUrl: '' };
  }

  // 1. Google Apps Script
  if (url.includes('script.google.com/macros/s/')) {
    if (url.endsWith('/dev')) {
      const fixed = url.replace(/\/dev(\?.*)?$/, '/exec$1');
      return {
        type: 'apps_script',
        normalizedUrl: fixed,
        warning: 'URL had "/dev" at the end. Development URLs require Google account sign-in and will fail with CORS. Automatically converted to "/exec".'
      };
    }
    return { type: 'apps_script', normalizedUrl: url };
  }

  // 2. Google Spreadsheet
  const sheetMatch = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (sheetMatch && sheetMatch[1]) {
    return {
      type: 'spreadsheet',
      normalizedUrl: url,
      sheetId: sheetMatch[1],
      warning: 'This is a Google Spreadsheet link, not a Web App script URL. We will attempt direct reading via Google Sheet API/GViz.'
    };
  }

  // Other generic URLs
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return { type: 'apps_script', normalizedUrl: url };
  }

  return { type: 'invalid', normalizedUrl: url };
}

/**
 * Fetch class results from configured Google endpoint (Apps Script or Spreadsheet)
 */
export async function fetchClassResultsFromGoogle(
  url: string,
  targetClass: string
): Promise<{ success: boolean; students: FullStudentExamRecord[]; source: string; message?: string }> {
  const analysis = analyzeGoogleUrl(url);

  if (analysis.type === 'invalid' || !analysis.normalizedUrl) {
    throw new Error('Google Sheet URL is empty or invalid. Please configure a valid URL.');
  }

  // Case A: Google Apps Script Web App
  if (analysis.type === 'apps_script') {
    return await fetchFromAppsScript(analysis.normalizedUrl, targetClass);
  }

  // Case B: Direct Google Spreadsheet
  if (analysis.type === 'spreadsheet' && analysis.sheetId) {
    return await fetchFromSpreadsheetDirect(analysis.sheetId, targetClass);
  }

  throw new Error('Unsupported URL format.');
}

/**
 * Fetch from Google Apps Script Web App
 */
async function fetchFromAppsScript(
  scriptUrl: string,
  targetClass: string
): Promise<{ success: boolean; students: FullStudentExamRecord[]; source: string; message?: string }> {
  const cleanUrl = scriptUrl.replace(/\/dev$/, '/exec');
  const separator = cleanUrl.includes('?') ? '&' : '?';
  const fetchUrl = `${cleanUrl}${separator}action=getFullResults&class=${encodeURIComponent(targetClass)}&t=${Date.now()}`;

  let resp: Response;
  try {
    resp = await fetch(fetchUrl, {
      method: 'GET',
      mode: 'cors',
      credentials: 'omit',
      headers: {
        'Accept': 'application/json'
      }
    });
  } catch (netErr: any) {
    // Check if it is likely a CORS or network error caused by Google Auth redirect
    throw new Error(
      `CORS / Network Error: Could not connect to Google Apps Script.\n\n` +
      `Common Cause: The Web App deployment setting "Who has access" is likely set to "Only myself".\n` +
      `Fix: In Google Apps Script -> Deploy -> Manage deployments -> Edit -> Set "Who has access" to "Anyone" -> Deploy a new version.`
    );
  }

  if (!resp.ok) {
    throw new Error(`Server returned HTTP ${resp.status}: ${resp.statusText}`);
  }

  const text = await resp.text();
  
  // Check if response is HTML login page (happens when "Who has access" is not "Anyone")
  if (text.trim().startsWith('<!DOCTYPE') || text.includes('accounts.google.com') || text.includes('Sign in - Google Accounts')) {
    throw new Error(
      `Google Authentication Required: The script returned a Google login page instead of JSON data.\n\n` +
      `Cause: In Google Apps Script, "Who has access" is not set to "Anyone".\n` +
      `Fix: Open Google Apps Script -> Click "Deploy" -> "Manage deployments" -> Click Edit (pencil icon) -> Under "Who has access", select "Anyone" -> Click "Deploy".`
    );
  }

  let data: any;
  try {
    data = JSON.parse(text);
  } catch (parseErr) {
    throw new Error(`Invalid JSON received from Apps Script. Response preview: ${text.slice(0, 200)}...`);
  }

  if (!data || !data.success || !Array.isArray(data.students)) {
    const errorMsg = data?.message || 'Script did not return student records for this class.';
    throw new Error(`Google Apps Script Error: ${errorMsg}`);
  }

  const students: FullStudentExamRecord[] = data.students.map((st: any, idx: number) => {
    const roll = typeof st.roll === 'number' ? st.roll : parseInt(st.roll, 10) || (idx + 1);
    const rawUrn = st.urn ?? st.admNo ?? st['Admission No'] ?? st['Admission Number'] ?? st['Adm No'] ?? st['URN'] ?? '';
    const canonicalUrn = normalizeURN(rawUrn);
    
    // Auto-identify optional language with robust intelligence
    const finalOpted = detectStudentOptionalSubject(st);

    // Photo extraction
    const rawPhoto = (
      st.photoUrl || 
      st.photo || 
      st.Photo || 
      st['Photo URL'] || 
      st['Photo Link'] || 
      st['Student Photo'] || 
      st['Drive Link'] || 
      ''
    );
    const photo = String(rawPhoto || '').trim();
    const savedLocalPhoto = canonicalUrn
      ? localStorage.getItem(`pis_photo_${canonicalUrn}`) || ''
      : '';

    return {
      roll,
      urn: canonicalUrn,
      admNo: canonicalUrn,
      name: String(st.name || `Student ${roll}`).trim(),
      fatherName: String(st.fatherName || 'GUARDIAN').trim(),
      motherName: String(st.motherName || 'MOTHER').trim(),
      dob: String(st.dob || '15/07/2014').trim(),
      studentClass: String(st.studentClass || targetClass).trim(),
      section: String(st.section || 'A').trim(),
      mobile: String(st.mobile || '9835100000').trim(),
      optionalSubject: finalOpted,
      photoUrl: photo || savedLocalPhoto || '',
      attendanceHY: String(st.attendanceHY || '95/110'),
      attendanceAE: String(st.attendanceAE || '102/115'),
      rawMarks: st.rawMarks || {}
    };
  });

  return {
    success: true,
    students,
    source: 'Google Apps Script Web App',
    message: `Successfully loaded ${students.length} students from Google Sheet for Class ${targetClass}.`
  };
}

/**
 * Direct fallback fetching from a public Google Spreadsheet using Google Visualization API (GViz)
 */
async function fetchFromSpreadsheetDirect(
  sheetId: string,
  targetClass: string
): Promise<{ success: boolean; students: FullStudentExamRecord[]; source: string; message?: string }> {
  // Candidate sheet tab names to try
  const sheetNames = [`Class_${targetClass}`, `Class ${targetClass}`, targetClass, `Students`];
  let lastError = '';

  for (const sheetName of sheetNames) {
    try {
      const gvizUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetName)}&t=${Date.now()}`;
      const res = await fetch(gvizUrl);
      if (!res.ok) continue;

      const text = await res.text();
      // GViz returns /*O_o*/\ngoogle.visualization.Query.setResponse({...});
      const match = text.match(/google\.visualization\.Query\.setResponse\(([\s\S]+)\);/);
      if (!match || !match[1]) continue;

      const gvizData = JSON.parse(match[1]);
      if (gvizData.status === 'error') {
        lastError = gvizData.errors?.[0]?.message || 'Sheet tab error';
        continue;
      }

      const table = gvizData.table;
      if (!table || !table.rows || table.rows.length === 0) continue;

      const cols = (table.cols || []).map((c: any) => (c?.label || '').trim());
      const students: FullStudentExamRecord[] = [];

      // Find Adm No / URN column and Optional column dynamically if labeled in headers
      let admColIdx = -1;
      let optColIdx = -1;
      for (let c = 0; c < cols.length; c++) {
        const h = (cols[c] || '').toLowerCase();
        if (admColIdx === -1 && (h.includes('adm') || h.includes('urn') || h.includes('reg') || h.includes('admission') || h === 'id')) {
          admColIdx = c;
        }
        if (optColIdx === -1 && (h.includes('optional') || h.includes('2nd lang') || h.includes('second lang') || h.includes('opted') || h === 'opt' || h === 'language')) {
          optColIdx = c;
        }
      }

      for (let r = 0; r < table.rows.length; r++) {
        const row = table.rows[r]?.c || [];
        const getVal = (colIndex: number) => {
          if (!row[colIndex]) return '';
          const v = row[colIndex].v;
          const f = row[colIndex].f;
          return f !== undefined ? f : (v !== null && v !== undefined ? v : '');
        };

        // Standard column layout:
        // Col 0: S.No, Col 1: Roll, Col 2: Adm No, Col 3: Name, Col 4: Father, Col 5: Mother, Col 6: DOB, Col 9: Mobile, Col 10: Optional, Col 11: Photo
        const rollVal = getVal(1) || (r + 1);
        const nameVal = getVal(3);
        const rawAdmVal = admColIdx !== -1 ? getVal(admColIdx) : getVal(2);
        if (!nameVal && !rawAdmVal) continue; // skip blank row

        const rollNum = parseInt(String(rollVal), 10) || (r + 1);
        const canonicalUrn = normalizeURN(rawAdmVal);

        // Extract raw marks for any subject headers from Col 12 onward
        const rawMarks: Record<string, any> = {};
        let attHY = '95/110';
        let attAE = '102/115';

        for (let c = 12; c < cols.length; c++) {
          const header = cols[c];
          if (!header) continue;
          const val = getVal(c);
          if (header === 'Attendance-HY') attHY = String(val || attHY);
          else if (header === 'Attendance-AE') attAE = String(val || attAE);
          else if (val !== '' && val !== undefined) {
            rawMarks[header] = val;
            const normalizedKey = header.replace(/\s+/g, '_').replace(/-/g, '_');
            rawMarks[normalizedKey] = val;
          }
        }

        // Optional subject strictly from explicit designated column (no guessing, no name inference)
        const rawOptSub = optColIdx !== -1 ? String(getVal(optColIdx) || '').trim() : String(getVal(10) || '').trim();

        const finalOptSub = detectStudentOptionalSubject({
          optionalSubject: rawOptSub
        });

        const sheetPhoto = String(getVal(11) || '').trim();
        const savedLocalPhoto = canonicalUrn ? localStorage.getItem(`pis_photo_${canonicalUrn}`) || '' : '';

        students.push({
          roll: rollNum,
          urn: canonicalUrn,
          admNo: canonicalUrn,
          name: String(nameVal || `Student ${rollNum}`).trim(),
          fatherName: String(getVal(4) || 'GUARDIAN').trim(),
          motherName: String(getVal(5) || 'MOTHER').trim(),
          dob: String(getVal(6) || '15/07/2014').trim(),
          studentClass: targetClass,
          section: 'A',
          mobile: String(getVal(9) || '9835100000').trim(),
          optionalSubject: finalOptSub,
          photoUrl: sheetPhoto || savedLocalPhoto || '',
          attendanceHY: attHY,
          attendanceAE: attAE,
          rawMarks
        });
      }

      if (students.length > 0) {
        return {
          success: true,
          students,
          source: `Google Spreadsheet Tab "${sheetName}" (Direct GViz API)`,
          message: `Loaded ${students.length} students directly from Google Spreadsheet.`
        };
      }
    } catch (e: any) {
      lastError = e.message;
    }
  }

  throw new Error(
    `Could not read data directly from Google Spreadsheet.\n\n` +
    `Causes & Solutions:\n` +
    `1. The Google Sheet must be shared as "Anyone with the link can view".\n` +
    `2. A tab named "Class_${targetClass}" or "Class ${targetClass}" must exist in the spreadsheet.\n` +
    `3. Or deploy the Google Apps Script Web App URL instead for full read/write integration.\n` +
    (lastError ? `Details: ${lastError}` : '')
  );
}

/**
 * Deep diagnostic test for user's configured Google Sheet or Apps Script URL
 */
export async function runGoogleSheetDiagnostic(
  rawUrl: string,
  targetClass = '5'
): Promise<DiagnosticReport> {
  const analysis = analyzeGoogleUrl(rawUrl);
  const checks: DiagnosticCheck[] = [];
  const suggestedFixes: string[] = [];
  let rawPreview = '';
  let countFound = 0;

  // Check 1: URL Syntax & Format
  if (analysis.type === 'invalid') {
    checks.push({
      id: 'url_format',
      name: 'URL Format Validation',
      status: 'error',
      message: 'Empty or unrecognized URL.',
      details: 'Please provide either a Google Apps Script Web App URL (script.google.com/macros/s/.../exec) or a Google Spreadsheet URL (docs.google.com/spreadsheets/d/...)'
    });
    suggestedFixes.push('Paste a valid Google Apps Script Web App URL or Google Spreadsheet link.');
    return {
      overallSuccess: false,
      urlType: analysis.type,
      normalizedUrl: rawUrl,
      checks,
      suggestedFixes
    };
  }

  if (analysis.warning) {
    checks.push({
      id: 'url_format',
      name: 'URL Format Validation',
      status: 'warning',
      message: 'URL normalized automatically',
      details: analysis.warning
    });
  } else {
    checks.push({
      id: 'url_format',
      name: 'URL Format Validation',
      status: 'success',
      message: `Valid ${analysis.type === 'apps_script' ? 'Google Apps Script Web App' : 'Google Spreadsheet'} URL format detected.`
    });
  }

  let retrievedStudents: FullStudentExamRecord[] = [];

  // Check 2: Endpoint Reachability & Ping
  if (analysis.type === 'apps_script') {
    try {
      const pingUrl = `${analysis.normalizedUrl}?action=getSystemControl&t=${Date.now()}`;
      const pingRes = await fetch(pingUrl, {
        method: 'GET',
        mode: 'cors',
        headers: { 'Accept': 'application/json' }
      });

      if (!pingRes.ok) {
        checks.push({
          id: 'server_reach',
          name: 'Server Reachability (HTTP Status)',
          status: 'error',
          message: `Server returned error status ${pingRes.status} (${pingRes.statusText})`
        });
        suggestedFixes.push('Verify that the Google Apps Script project is not deleted or restricted.');
      } else {
        const text = await pingRes.text();
        rawPreview = text.slice(0, 300);

        // Check 3: Google Auth Redirect Check
        if (text.includes('accounts.google.com') || text.includes('<!DOCTYPE') || text.includes('ServiceLogin')) {
          checks.push({
            id: 'auth_access',
            name: 'Web App Permissions & Authorization',
            status: 'error',
            message: 'Web App requires Google Account Sign-In ("Who has access" is NOT "Anyone")',
            details: 'The web browser was redirected to accounts.google.com. This causes CORS blocks and prevents the web app from fetching student marks.'
          });
          suggestedFixes.push('Open your Google Sheet -> Extensions -> Apps Script.');
          suggestedFixes.push('Click "Deploy" (blue button at top right) -> "Manage deployments".');
          suggestedFixes.push('Click the Edit (pencil) icon next to the active deployment.');
          suggestedFixes.push('Under "Who has access", select "Anyone" (महत्वपूर्ण: "Anyone" चुनना अनिवार्य है).');
          suggestedFixes.push('Click "Deploy" and copy the fresh Web App URL.');
        } else {
          checks.push({
            id: 'auth_access',
            name: 'Web App Permissions & Authorization',
            status: 'success',
            message: 'Public access verified (No Google Account login barrier).'
          });

          // Check 4: Data Extraction Test
          try {
            const data = JSON.parse(text);
            checks.push({
              id: 'json_valid',
              name: 'JSON Protocol & Payload Check',
              status: 'success',
              message: 'Google Apps Script is responding with valid JSON.',
              details: `Response: ${JSON.stringify(data).slice(0, 100)}...`
            });
          } catch {
            checks.push({
              id: 'json_valid',
              name: 'JSON Protocol & Payload Check',
              status: 'warning',
              message: 'Endpoint returned plain text instead of JSON.',
              details: `Preview: ${rawPreview}`
            });
          }
        }
      }
    } catch (fetchErr: any) {
      checks.push({
        id: 'server_reach',
        name: 'Server Reachability & CORS Check',
        status: 'error',
        message: 'Browser fetch failed (CORS Block / Network Error)',
        details: fetchErr?.message || 'Check deployment settings'
      });
      suggestedFixes.push('Make sure "Who has access" is set to "Anyone" in Google Apps Script Deploy settings.');
      suggestedFixes.push('Make sure you are using the Web App URL (/exec), NOT the test URL (/dev).');
    }

    // Check 5: Class Student Data Check
    try {
      const dataRes = await fetchClassResultsFromGoogle(analysis.normalizedUrl, targetClass);
      countFound = dataRes.students.length;
      retrievedStudents = dataRes.students;
      checks.push({
        id: 'class_data',
        name: `Class ${targetClass} Student Data Test`,
        status: 'success',
        message: `Successfully retrieved ${countFound} student records!`,
        details: dataRes.source
      });
    } catch (classErr: any) {
      checks.push({
        id: 'class_data',
        name: `Class ${targetClass} Student Data Test`,
        status: 'warning',
        message: `Could not load Class ${targetClass} data: ${classErr.message}`
      });
      suggestedFixes.push(`Ensure a sheet tab named "Class_${targetClass}" exists in your Google Sheet.`);
    }
  } else if (analysis.type === 'spreadsheet') {
    // Test direct Google Spreadsheet
    try {
      const dataRes = await fetchFromSpreadsheetDirect(analysis.sheetId!, targetClass);
      countFound = dataRes.students.length;
      retrievedStudents = dataRes.students;
      checks.push({
        id: 'sheet_access',
        name: 'Public Spreadsheet Accessibility (GViz)',
        status: 'success',
        message: `Direct read successful! Found ${countFound} students.`,
        details: dataRes.source
      });
    } catch (sheetErr: any) {
      checks.push({
        id: 'sheet_access',
        name: 'Public Spreadsheet Accessibility (GViz)',
        status: 'error',
        message: 'Could not read directly from Google Spreadsheet.',
        details: sheetErr.message
      });
      suggestedFixes.push('Open the Google Sheet -> Click "Share" (top right) -> Change General Access to "Anyone with the link can view".');
      suggestedFixes.push(`Make sure a sheet tab named "Class_${targetClass}" exists in the workbook.`);
      suggestedFixes.push('Or deploy Google Apps Script Web App for full two-way read and write support.');
    }
  }

  // Check: Authoritative Student Identity (Column B URN) Verification
  if (retrievedStudents.length > 0) {
    const idDiag = getIdentityDiagnostics(retrievedStudents);
    if (!idDiag.isValid) {
      checks.push({
        id: 'identity_integrity',
        name: 'Student Identity (Column B URN) Verification',
        status: idDiag.duplicateURNCount > 0 ? 'error' : 'warning',
        message: idDiag.duplicateURNCount > 0
          ? `Duplicate URN conflict detected (${idDiag.duplicateURNCount} conflict(s))!`
          : `Missing URN detected for ${idDiag.missingURNCount} student(s).`,
        details: idDiag.warnings.join(' | ')
      });
      if (idDiag.missingURNCount > 0) {
        suggestedFixes.push('Populate permanent URNs in Column B (Admission No.) for all students.');
      }
      if (idDiag.duplicateURNCount > 0) {
        suggestedFixes.push('Resolve duplicate URNs in Column B so every student has a unique reference number.');
      }
    } else {
      checks.push({
        id: 'identity_integrity',
        name: 'Student Identity (Column B URN) Verification',
        status: 'success',
        message: `All ${retrievedStudents.length} students have valid, unique authoritative URNs in Column B.`
      });
    }
  }

  const overallSuccess = checks.every(c => c.status === 'success' || c.status === 'warning');

  return {
    overallSuccess,
    urlType: analysis.type,
    normalizedUrl: analysis.normalizedUrl,
    checks,
    suggestedFixes,
    rawResponsePreview: rawPreview,
    studentCountFound: countFound
  };
}
