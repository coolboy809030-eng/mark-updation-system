export type ExamType = 'PT-1' | 'PT-2' | 'PT-3' | 'PT-4' | 'HY' | 'AE' | 'BOTH';

export interface SubjectResult {
  subject: string;
  pt1Raw: string | number;
  pt2Raw: string | number;
  wrtRaw: string | number;
  ptConverted: number; // Max 10
  portfolio: number;   // Max 5
  subEnrichment: number; // Max 5
  written: number;     // Max 80
  total: number;       // Max 100
  grade: string;
  isAbsent: boolean;
}

export interface DualExamSubjectResult {
  subject: string;
  hyResult: SubjectResult;
  aeResult: SubjectResult;
  grandTotal: number; // Max 200
  grandPercentage: number;
  grandGrade: string;
}

export interface StudentResultSummary {
  totalObtained: number;
  maxMarks: number;
  percentage: number;
  grade: string;
  resultStatus: 'PASS' | 'COMPARTMENT' | 'ESSENTIAL REPEAT';
  motivationalComment: string;
  workingDays: number;
  presentDays: number;
  attendancePercent: number;
  rank?: number;
}

export interface FullStudentExamRecord {
  urn?: string; // Canonical permanent student identity (Column B)
  admNo: string; // Backward compatibility alias
  roll: number;
  name: string;
  fatherName: string;
  motherName: string;
  dob: string;
  mobile: string;
  studentClass: string;
  section: string;
  optionalSubject?: string; // 'Urdu' | 'Sanskrit'
  photoUrl?: string;
  // Raw marks dictionary e.g. "English PT-1": 18, "Math-HY-WRT": 72, "Attendance HY": "95/100"
  rawMarks: Record<string, string | number>;
  attendanceHY?: string;
  attendanceAE?: string;
}

export type ResultViewMode = 
  | 'report_card' 
  | 'bulk_cards' 
  | 'tabulation_sheet' 
  | 'dashboard' 
  | 'admin_portal'
  | 'admit_card'
  | 'student_management'
  | 'marks_audit';

export interface SystemControlConfig {
  marksEntryStatus: 'ON' | 'OFF';
  marksEntryDeadline: string; // e.g. "2026-03-25T23:59"
  workingDaysHY: number;
  workingDaysAE: number;
  academicSession?: string; // e.g. "2025-26", "2026-27"
}

export interface ExamScheduleItem {
  subject: string;
  date: string; // YYYY-MM-DD
  day: string;  // Monday, Tuesday, etc.
  time: string; // e.g. "09:00 AM - 12:00 PM"
  room?: string;
}

export type ClassSubjectAllotmentMap = Record<import('../types').ClassLevel, string[]>;
