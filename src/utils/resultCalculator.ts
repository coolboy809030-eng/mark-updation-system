import { FullStudentExamRecord, SubjectResult, DualExamSubjectResult, StudentResultSummary, ExamType } from '../types/resultTypes';
import { detectStudentOptionalSubject } from './studentSubjectDetector';
import { getStudentEvaluationCurriculum, expandSubjectAliases } from './subjectCurriculum';

export function isAbsent(val: string | number | undefined | null): boolean {
  if (val === undefined || val === null) return false;
  const str = String(val).trim().toUpperCase();
  return str === 'AB' || str === 'ABSENT' || str === 'A' || str === '-';
}

export function numOrZero(val: string | number | undefined | null): number {
  if (val === undefined || val === null) return 0;
  if (isAbsent(val)) return 0;
  const num = parseFloat(String(val));
  return isNaN(num) ? 0 : Math.max(0, num);
}

export function getGrade(pct: number): string {
  if (isNaN(pct) || pct < 0) return 'E';
  if (pct >= 91) return 'A1';
  if (pct >= 81) return 'A2';
  if (pct >= 71) return 'B1';
  if (pct >= 61) return 'B2';
  if (pct >= 51) return 'C1';
  if (pct >= 41) return 'C2';
  if (pct >= 33) return 'D';
  return 'E';
}

export function getMotivationalComment(pct: number): string {
  if (pct >= 90) return 'Outstanding academic excellence! Displays exemplary discipline, dedication, and leadership.';
  if (pct >= 80) return 'Excellent performance with strong conceptual understanding and active classroom participation.';
  if (pct >= 70) return 'Very good progress. Maintaining consistent study habits will yield even greater results.';
  if (pct >= 60) return 'Good effort shown. Encouraged to focus on deeper revision and self-practice.';
  if (pct >= 50) return 'Satisfactory performance. Requires more focused attention in core subjects.';
  if (pct >= 33) return 'Passed. Needs regular homework adherence and structured remedial reinforcement.';
  return 'Needs significant improvement. Close parent-teacher collaboration and remedial support recommended.';
}

/**
 * Maps short or abbreviated subject names to their official full titles on report cards
 * e.g. Gk -> General Knowledge, EVS -> Environmental Studies, SST -> Social Studies
 */
export function getFullSubjectName(subject: string): string {
  if (!subject) return '';
  const trimmed = subject.trim();
  const lower = trimmed.toLowerCase();

  if (lower === 'gk' || lower === 'g.k.' || lower === 'g.k') {
    return 'General Knowledge';
  }
  if (lower === 'evs' || lower === 'e.v.s.' || lower === 'e.v.s') {
    return 'Environmental Studies';
  }
  if (lower === 'sst' || lower === 's.st' || lower === 's.st.' || lower === 'soc sci' || lower === 'social sci') {
    return 'Social Studies';
  }
  if (lower === 'math' || lower === 'maths') {
    return 'Mathematics';
  }
  if (lower === 'eng') {
    return 'English';
  }
  if (lower === 'hin') {
    return 'Hindi';
  }
  if (lower === 'comp') {
    return 'Computer';
  }
  if (lower === 'sci') {
    return 'Science';
  }
  if (lower === 'draw') {
    return 'Drawing';
  }
  return trimmed;
}

/**
 * Calculates or retrieves the active Academic Session dynamically.
 * Instead of hardcoding 2025-26, it adapts to the current year or user config.
 */
export function getAcademicSession(configuredSession?: string): string {
  if (configuredSession && configuredSession.trim()) {
    const clean = configuredSession.trim();
    return clean.toLowerCase().startsWith('session') ? clean : `Session ${clean}`;
  }

  try {
    const saved = localStorage.getItem('school_academic_session');
    if (saved && saved.trim()) {
      const clean = saved.trim();
      return clean.toLowerCase().startsWith('session') ? clean : `Session ${clean}`;
    }
  } catch {
    // ignore
  }

  // Calculate dynamically: Academic year runs April (month 3) to March
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0 = Jan, 3 = April
  const startYear = month >= 3 ? year : year - 1;
  const endYearShort = (startYear + 1) % 100;
  const endYearStr = endYearShort < 10 ? `0${endYearShort}` : `${endYearShort}`;
  return `Session ${startYear}-${endYearStr}`;
}

export function getStudentSubjects(
  student: { 
    optionalSubject?: string; 
    optional_subject?: string;
    optional?: string;
    name?: string; 
    studentClass?: string;
    class?: string;
    rawMarks?: Record<string, string | number> 
  },
  classSubjects: string[]
): string[] {
  const cls = (student as any)?.studentClass || (student as any)?.class;
  return getStudentEvaluationCurriculum(student, classSubjects, cls).subjects;
}

export function getRawValue(rawMarks: Record<string, string | number>, possibleKeys: string[]): string | number {
  if (!rawMarks) return 0;

  // Expand possibleKeys for aliases like Gk <-> General Knowledge <-> GK, Computer, EVS, etc.
  const expandedKeys = new Set<string>();
  for (const k of possibleKeys) {
    expandedKeys.add(k);

    // Expand if key has a subject name prefix before exam segment suffix
    const match = k.match(/^([A-Za-z\s.&]+?)(\s*[-_ ]\s*(?:PT-?[1-4]|HY(?:-WRT)?|AE(?:-WRT)?|Attendance.*))$/i);
    if (match) {
      const subName = match[1].trim();
      const suffix = match[2];
      const aliases = expandSubjectAliases(subName);
      for (const al of aliases) {
        expandedKeys.add(`${al}${suffix}`);
        const cleanSuffix = suffix.trim().replace(/^[-_ ]+/, '');
        expandedKeys.add(`${al} ${cleanSuffix}`);
        expandedKeys.add(`${al}-${cleanSuffix}`);
      }
    }
  }

  for (const k of expandedKeys) {
    if (rawMarks[k] !== undefined) return rawMarks[k];
    // Also try case-insensitive check
    const matched = Object.keys(rawMarks).find(rk => rk.trim().toLowerCase() === k.trim().toLowerCase());
    if (matched && rawMarks[matched] !== undefined) return rawMarks[matched];
  }
  return 0;
}

export function computeSubjectResult(
  student: FullStudentExamRecord,
  subject: string,
  exam: 'HY' | 'AE'
): SubjectResult {
  const pt1Key = exam === 'HY' ? `${subject} PT-1` : `${subject} PT-3`;
  const pt2Key = exam === 'HY' ? `${subject} PT-2` : `${subject} PT-4`;
  const wrtKeys = [
    `${subject}-${exam}-WRT`,
    `${subject} ${exam}-WRT`,
    `${subject}_${exam}_WRT`,
    `${subject}-${exam}`,
    `${subject} ${exam}`
  ];

  const pt1Raw = getRawValue(student.rawMarks, [pt1Key]);
  const pt2Raw = getRawValue(student.rawMarks, [pt2Key]);
  const wrtRaw = getRawValue(student.rawMarks, wrtKeys);

  const wrtAbsent = isAbsent(wrtRaw);
  const pt1Absent = isAbsent(pt1Raw);
  const pt2Absent = isAbsent(pt2Raw);

  const wrt = numOrZero(wrtRaw);
  const pt1 = pt1Absent ? 0 : numOrZero(pt1Raw);
  const pt2 = pt2Absent ? 0 : numOrZero(pt2Raw);

  // CBSE conversion formula:
  // Avg of two PTs out of 20
  const ptAvg20 = Math.round((pt1 + pt2) / 2);
  // Converted PT out of 10
  const ptConverted = Math.round(ptAvg20 / 2);
  // Portfolio & Subject Enrichment out of 5 each derived from internal scale
  const pfSeValue = Math.round(ptConverted / 2);
  const total = wrtAbsent ? 0 : Math.min(100, ptConverted + pfSeValue + pfSeValue + wrt);
  const grade = wrtAbsent ? 'AB' : getGrade(total);

  return {
    subject,
    pt1Raw: pt1Absent ? 'AB' : pt1Raw,
    pt2Raw: pt2Absent ? 'AB' : pt2Raw,
    wrtRaw: wrtAbsent ? 'AB' : wrtRaw,
    ptConverted,
    portfolio: pfSeValue,
    subEnrichment: pfSeValue,
    written: wrt,
    total,
    grade,
    isAbsent: wrtAbsent && pt1Absent && pt2Absent
  };
}

export function computeDualExamSubjectResult(
  student: FullStudentExamRecord,
  subject: string
): DualExamSubjectResult {
  const hyResult = computeSubjectResult(student, subject, 'HY');
  const aeResult = computeSubjectResult(student, subject, 'AE');

  const grandTotal = hyResult.total + aeResult.total;
  const grandPercentage = Math.round((grandTotal / 200) * 100);
  const grandGrade = getGrade(grandPercentage);

  return {
    subject,
    hyResult,
    aeResult,
    grandTotal,
    grandPercentage,
    grandGrade
  };
}

export function computeStudentSummary(
  student: FullStudentExamRecord,
  subjects: string[],
  examMode: ExamType,
  workingDaysHY: number = 110,
  workingDaysAE: number = 115
): StudentResultSummary {
  // Use strictly the student's active subjects (either Urdu OR Sanskrit, never both!)
  const activeSubjects = getStudentSubjects(student, subjects);
  let totalObtained = 0;
  let maxMarks = 0;

  if (examMode === 'BOTH') {
    activeSubjects.forEach(sub => {
      const dual = computeDualExamSubjectResult(student, sub);
      totalObtained += dual.grandTotal;
      maxMarks += 200;
    });
  } else if (examMode === 'HY' || examMode === 'AE') {
    activeSubjects.forEach(sub => {
      const res = computeSubjectResult(student, sub, examMode);
      totalObtained += res.total;
      maxMarks += 100;
    });
  } else {
    // Single PT: PT-1, PT-2, PT-3, PT-4
    activeSubjects.forEach(sub => {
      const raw = getRawValue(student.rawMarks, [`${sub} ${examMode}`, `${sub}-${examMode}`]);
      totalObtained += numOrZero(raw);
      maxMarks += 20;
    });
  }

  const percentage = maxMarks > 0 ? parseFloat(((totalObtained / maxMarks) * 100).toFixed(1)) : 0;
  const grade = getGrade(percentage);

  // Status
  let resultStatus: 'PASS' | 'COMPARTMENT' | 'ESSENTIAL REPEAT' = 'PASS';
  if (percentage < 33) {
    resultStatus = 'ESSENTIAL REPEAT';
  }

  // Attendance
  let workingDays = 100;
  let presentDays = 92;

  if (examMode === 'HY') {
    workingDays = workingDaysHY;
    if (student.attendanceHY) {
      const parts = student.attendanceHY.split('/');
      if (parts.length === 2) {
        presentDays = numOrZero(parts[0]);
        workingDays = numOrZero(parts[1]) || workingDaysHY;
      } else {
        presentDays = numOrZero(student.attendanceHY);
      }
    } else {
      presentDays = Math.round(workingDays * 0.92);
    }
  } else if (examMode === 'AE') {
    workingDays = workingDaysAE;
    if (student.attendanceAE) {
      const parts = student.attendanceAE.split('/');
      if (parts.length === 2) {
        presentDays = numOrZero(parts[0]);
        workingDays = numOrZero(parts[1]) || workingDaysAE;
      } else {
        presentDays = numOrZero(student.attendanceAE);
      }
    } else {
      presentDays = Math.round(workingDays * 0.91);
    }
  } else if (examMode === 'BOTH') {
    workingDays = workingDaysHY + workingDaysAE;
    let p1 = Math.round(workingDaysHY * 0.92);
    let p2 = Math.round(workingDaysAE * 0.91);
    if (student.attendanceHY) {
      const parts = student.attendanceHY.split('/');
      if (parts.length === 2) p1 = numOrZero(parts[0]);
    }
    if (student.attendanceAE) {
      const parts = student.attendanceAE.split('/');
      if (parts.length === 2) p2 = numOrZero(parts[0]);
    }
    presentDays = p1 + p2;
  }

  const attendancePercent = workingDays > 0 ? Math.min(100, Math.round((presentDays / workingDays) * 100)) : 0;

  return {
    totalObtained,
    maxMarks,
    percentage,
    grade,
    resultStatus,
    motivationalComment: getMotivationalComment(percentage),
    workingDays,
    presentDays,
    attendancePercent
  };
}

export function rankClassStudents(
  students: FullStudentExamRecord[],
  subjects: string[],
  examMode: ExamType,
  workingDaysHY: number,
  workingDaysAE: number
): Map<string, { summary: StudentResultSummary; rank: number }> {
  const summaries = students.map(st => {
    const summary = computeStudentSummary(st, subjects, examMode, workingDaysHY, workingDaysAE);
    return { admNo: st.admNo, summary };
  });

  // Sort descending by totalObtained
  summaries.sort((a, b) => b.summary.totalObtained - a.summary.totalObtained);

  const rankMap = new Map<string, { summary: StudentResultSummary; rank: number }>();
  summaries.forEach((item, index) => {
    item.summary.rank = index + 1;
    rankMap.set(item.admNo, { summary: item.summary, rank: index + 1 });
  });

  return rankMap;
}
