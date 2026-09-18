import { FullStudentExamRecord } from '../types/resultTypes';
import { instantSyncBridge } from './instantSyncBridge';

export interface MarksAuditRecord {
  id: string;
  urn: string;
  admNo?: string;
  roll: number | string;
  studentName: string;
  className: string;
  section?: string;
  subject: string;
  segment: string;
  mark: string | number;
  teacherId?: string;
  teacherName?: string;
  action: 'SAVED' | 'UPDATED' | 'CLOUD_SYNCED' | 'PRE_EXISTING' | 'SUBMITTED';
  status: string;
  savedAt?: string; // ISO string if available from session/log
  isPreExistingSheetData?: boolean;
}

const MARKS_AUDIT_STORAGE_KEY = 'pis_marks_audit_records_v1';

/**
 * Reads locally persisted audit entries from portal submissions
 */
export function getStoredAuditRecords(): MarksAuditRecord[] {
  try {
    const raw = localStorage.getItem(MARKS_AUDIT_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn('Failed to parse audit records from storage:', err);
    return [];
  }
}

/**
 * Appends new audit records upon confirmed submission/save
 */
export function recordMarksAudit(records: MarksAuditRecord[]): void {
  if (!records || records.length === 0) return;
  try {
    const existing = getStoredAuditRecords();
    // Keep up to latest 5000 audit records
    const combined = [...records, ...existing].slice(0, 5000);
    localStorage.setItem(MARKS_AUDIT_STORAGE_KEY, JSON.stringify(combined));
  } catch (err) {
    console.warn('Failed to persist marks audit record:', err);
  }
}

/**
 * Builds the comprehensive audit dataset for the given class and student records.
 * Matches existing raw marks against audit logs if present;
 * for pre-existing Google Sheet records where historical timestamps are absent,
 * faithfully flags them as pre-existing without fabricating false dates.
 */
export function buildClassMarksAuditRecords(
  className: string,
  classStudents: FullStudentExamRecord[]
): MarksAuditRecord[] {
  const storedAudits = getStoredAuditRecords();
  
  // Index stored audits by composite key: className|subject|segment|urn
  const auditMap = new Map<string, MarksAuditRecord>();
  storedAudits.forEach(record => {
    const key = `${record.className}|${record.subject.toUpperCase()}|${record.segment.toUpperCase()}|${record.urn}`;
    if (!auditMap.has(key)) {
      auditMap.set(key, record);
    }
  });

  const results: MarksAuditRecord[] = [];

  classStudents.forEach(st => {
    const urn = st.urn || st.admNo || `ROLL_${st.roll}`;
    const rawMarks = st.rawMarks || {};

    Object.entries(rawMarks).forEach(([markKey, rawVal]) => {
      if (rawVal === undefined || rawVal === null || String(rawVal).trim() === '') {
        return;
      }

      // Parse subject and segment from markKey e.g. "English PT-1" or "Math-HY-WRT"
      let subject = markKey;
      let segment = 'General';

      if (markKey.includes(' ')) {
        const parts = markKey.split(' ');
        subject = parts.slice(0, -1).join(' ');
        segment = parts[parts.length - 1];
      } else if (markKey.includes('-')) {
        const parts = markKey.split('-');
        subject = parts[0];
        segment = parts.slice(1).join('-');
      }

      const lookupKey = `${className}|${subject.toUpperCase()}|${segment.toUpperCase()}|${urn}`;
      const matchedAudit = auditMap.get(lookupKey);

      if (matchedAudit) {
        results.push({
          ...matchedAudit,
          mark: rawVal,
          studentName: st.name,
          roll: st.roll,
          admNo: st.admNo,
          section: st.section || matchedAudit.section || 'A'
        });
      } else {
        // Pre-existing Sheet Record: Genuine data from Google Sheet without historical timestamp
        results.push({
          id: `audit_sheet_${className}_${urn}_${markKey}`,
          urn,
          admNo: st.admNo,
          roll: st.roll,
          studentName: st.name,
          className,
          section: st.section || 'A',
          subject,
          segment,
          mark: rawVal,
          teacherId: '— (Unrecorded in Sheet)',
          teacherName: '— (Sheet Master)',
          action: 'PRE_EXISTING',
          status: 'Pre-existing in Sheet',
          savedAt: undefined, // Explicitly undefined: DO NOT FABRICATE HISTORICAL DATES
          isPreExistingSheetData: true
        });
      }
    });

    // Check Attendance HY & AE
    if (st.attendanceHY) {
      const key = `${className}|ATTENDANCE|HY|${urn}`;
      const matched = auditMap.get(key);
      results.push({
        id: matched?.id || `audit_att_hy_${urn}`,
        urn,
        admNo: st.admNo,
        roll: st.roll,
        studentName: st.name,
        className,
        section: st.section || 'A',
        subject: 'Attendance',
        segment: 'HY',
        mark: st.attendanceHY,
        teacherId: matched?.teacherId || '— (Unrecorded in Sheet)',
        teacherName: matched?.teacherName || '— (Sheet Master)',
        action: matched?.action || 'PRE_EXISTING',
        status: matched?.status || 'Pre-existing in Sheet',
        savedAt: matched?.savedAt,
        isPreExistingSheetData: !matched?.savedAt
      });
    }

    if (st.attendanceAE) {
      const key = `${className}|ATTENDANCE|AE|${urn}`;
      const matched = auditMap.get(key);
      results.push({
        id: matched?.id || `audit_att_ae_${urn}`,
        urn,
        admNo: st.admNo,
        roll: st.roll,
        studentName: st.name,
        className,
        section: st.section || 'A',
        subject: 'Attendance',
        segment: 'AE',
        mark: st.attendanceAE,
        teacherId: matched?.teacherId || '— (Unrecorded in Sheet)',
        teacherName: matched?.teacherName || '— (Sheet Master)',
        action: matched?.action || 'PRE_EXISTING',
        status: matched?.status || 'Pre-existing in Sheet',
        savedAt: matched?.savedAt,
        isPreExistingSheetData: !matched?.savedAt
      });
    }
  });

  return results;
}
