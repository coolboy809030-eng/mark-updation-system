import { getStudentURN } from './studentIdentity';

export type AttendanceStatus = 'Present' | 'Absent';

export interface AttendanceRecord {
  id: string;
  urn: string;
  className: string;
  section: string;
  date: string;
  status: AttendanceStatus;
  createdAt: string;
  updatedAt: string;
  teacherId?: string;
  teacherName?: string;
}

export const ATTENDANCE_STORAGE_KEY = 'pis_attendance_records_v1';

const readRecords = (): AttendanceRecord[] => {
  try {
    const raw = localStorage.getItem(ATTENDANCE_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeRecords = (records: AttendanceRecord[]) => {
  try {
    localStorage.setItem(ATTENDANCE_STORAGE_KEY, JSON.stringify(records));
  } catch {
    // Attendance must remain usable if metadata storage is unavailable.
  }
};

const recordKey = (record: Pick<AttendanceRecord, 'urn' | 'className' | 'section' | 'date'>) =>
  `${record.urn}|${record.className}|${record.section}|${record.date}`;

export const loadAttendanceRecords = (
  className: string,
  section: string,
  date: string
): AttendanceRecord[] => readRecords().filter(record =>
  record.className === className && record.section === section && record.date === date
);

export const loadAttendanceValues = (
  className: string,
  section: string,
  date: string
): Record<string, AttendanceStatus> => {
  const values: Record<string, AttendanceStatus> = {};
  loadAttendanceRecords(className, section, date).forEach(record => {
    values[record.urn] = record.status;
  });
  return values;
};

export const saveAttendanceRecord = (
  input: Omit<AttendanceRecord, 'id' | 'createdAt' | 'updatedAt'>
): AttendanceRecord => {
  const records = readRecords();
  const now = new Date().toISOString();
  const key = recordKey(input);
  const existing = records.find(record => recordKey(record) === key);
  const next: AttendanceRecord = existing
    ? { ...existing, ...input, updatedAt: now }
    : { ...input, id: `att_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, createdAt: now, updatedAt: now };
  const nextRecords = existing
    ? records.map(record => record.id === existing.id ? next : record)
    : [...records, next];
  writeRecords(nextRecords);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('attendance_records_updated', { detail: next }));
  }
  return next;
};

export const getAttendanceCounts = (
  students: Array<{ urn?: string; admNo?: string }>,
  values: Record<string, AttendanceStatus>
) => {
  const total = students.length;
  const present = students.filter(student => {
    const urn = getStudentURN(student);
    return Boolean(urn && values[urn] === 'Present');
  }).length;
  const absent = students.filter(student => {
    const urn = getStudentURN(student);
    return Boolean(urn && values[urn] === 'Absent');
  }).length;
  return { total, present, absent, notMarked: total - present - absent };
};

export const calculateAttendancePercentage = (presentDays: number, recordedWorkingDays: number): number => {
  if (recordedWorkingDays <= 0) return 0;
  return Math.min(100, Math.round((presentDays / recordedWorkingDays) * 100));
};
