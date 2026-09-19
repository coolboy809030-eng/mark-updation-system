export type EntryType = 'marks' | 'attendance';

export type ExamType = 'HY' | 'AN' | 'BOTH';

export type SegmentType = 'PT-1' | 'PT-2' | 'HY' | 'PT-3' | 'PT-4' | 'AE';

export type ClassLevel =
  | 'Nursery'
  | 'LKG'
  | 'UKG'
  | '1'
  | '2'
  | '3'
  | '4'
  | '5'
  | '6'
  | '7'
  | '8'
  | '9'
  | '10';

export interface Student {
  urn?: string; // Canonical permanent student identity (Column B)
  roll: string | number;
  name: string;
  fatherName?: string;
  optionalSubject?: string; // 'Sanskrit' | 'Urdu' | etc.
  photoUrl?: string;
  admNo?: string; // Backward compatibility alias
}

export interface StudentEntryState {
  roll: string | number;
  value: string; // number string or 'A' / 'AB'
  isAbsent: boolean;
  isValid: boolean;
}

export interface SheetSubmissionRecord {
  urn?: string; // Canonical permanent student identity (Column B)
  admNo?: string; // Backward compatibility alias
  roll: string | number;
  name: string;
  class: string;
  subject: string;
  examType: string;
  segment: string;
  type: string;
  value: number | string;
  date?: string;
  section?: string;
  attendanceStatus?: 'Present' | 'Absent';
}

export interface SubmissionResponse {
  status: 'success' | 'error';
  message?: string;
  saved?: number;
  updated?: number;
  newEntries?: number;
}

export interface AppSettings {
  googleSheetApiUrl: string;
  lockPassword: string;
  studentsPerPage: number;
  isOfflineDemo: boolean;
}

export interface TeacherAccount {
  id: string;              // unique internal UUID / key
  teacherId: string;       // unique stable ID: "TCH-2026-001", "TCH-2026-002", etc.
  teacherName: string;     // display name
  contact?: string;        // phone / email (optional)
  active: boolean;         // true = Active, false = Inactive
  password?: string;       // teacher password or PIN (default: "123456")
  mustChangePassword?: boolean; // true if teacher needs to set new password after admin reset
  resetRequested?: boolean;     // true if teacher submitted a forgot password request
  resetRequestedAt?: string;    // ISO timestamp of forgot password request
  resetRequestNote?: string;    // optional note from teacher
  credentialRef?: string;  // reference placeholder for future authentication credentials
  createdAt: string;       // ISO timestamp
  updatedAt: string;       // ISO timestamp
  lastLoginAt?: string | null;
}

export interface PasswordResetRequest {
  id: string;
  teacherId: string;
  teacherName: string;
  contact?: string;
  requestedAt: string;
  note?: string;
  status: 'PENDING' | 'RESOLVED' | 'DISMISSED';
  resolvedAt?: string;
}

export interface TeacherAllotment {
  id: string;
  teacherId?: string;      // stable teacher ID reference (TCH-2026-XXX)
  teacherName: string;     // display name (synchronized with TeacherAccount)
  classLevel: ClassLevel;  // assigned class
  sections?: string[];     // assigned sections, e.g. ['A'], ['B'], or ['A', 'B']. Default: ['A']
  subjects: string[];      // explicitly authorized subjects from Central Subject Master
  active?: boolean;        // assignment active flag (defaults to true)
  createdAt?: string;      // ISO timestamp
  updatedAt?: string;      // ISO timestamp
}

export type SegmentLockMap = Record<string, boolean>;
