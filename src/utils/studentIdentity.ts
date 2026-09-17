/**
 * Centralized Student Identity Utility (Module 1 - URN Foundation)
 * 
 * CANONICAL RULE:
 * - Google Sheet Column B value = Authoritative URN = Permanent Student Identity
 * - Roll, Name, Class, and Section are contextual/mutable academic placement data.
 * - Under migration compatibility, student.urn represents the canonical URN,
 *   and student.admNo remains as a backward-compatible alias.
 * - NEVER synthesize or guess identity from roll, name, or class when URN is missing.
 */

export interface StudentIdentityLike {
  urn?: string | null;
  admNo?: string | null;
  roll?: string | number | null;
  name?: string | null;
  studentClass?: string | null;
  section?: string | null;
  [key: string]: any;
}

export interface DuplicateURNDiagnostic {
  urn: string;
  count: number;
  students: Array<{
    roll: string | number;
    name: string;
    studentClass?: string;
    index: number;
  }>;
}

export interface MissingURNDiagnostic {
  index: number;
  roll: string | number;
  name: string;
  studentClass?: string;
}

export interface IdentityDiagnosticReport {
  isValid: boolean;
  totalStudents: number;
  missingURNCount: number;
  duplicateURNCount: number;
  missingURNs: MissingURNDiagnostic[];
  duplicateURNs: DuplicateURNDiagnostic[];
  warnings: string[];
}

/**
 * Normalizes a URN value conservatively:
 * - Converts to string
 * - Trims leading and trailing whitespace
 * - Preserves leading zeroes (e.g., '00125' remains '00125')
 * - Avoids numeric parsing or casing modifications
 * - Returns empty string for null, undefined, or empty inputs
 */
export function normalizeURN(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  const str = String(value).trim();
  // Filter out literal placeholder tokens
  if (str === '' || str === 'undefined' || str === 'null' || str === 'NaN') {
    return '';
  }
  return str;
}

/**
 * Canonical accessor for a student's permanent URN.
 * 
 * Rules:
 * 1. Checks `student.urn` first (normalized).
 * 2. Falls back to `student.admNo` (normalized) for backward compatibility.
 * 3. Checks standard Column B headers if raw object is passed.
 * 4. NEVER falls back to roll, name, or synthetic class-roll strings.
 * 5. Returns empty string `""` if URN is missing.
 */
export function getStudentURN(student: StudentIdentityLike | null | undefined): string {
  if (!student || typeof student !== 'object') {
    return '';
  }

  // 1. Primary canonical field
  if (student.urn !== undefined && student.urn !== null) {
    const norm = normalizeURN(student.urn);
    if (norm) return norm;
  }

  // 2. Migration compatibility alias (admNo)
  if (student.admNo !== undefined && student.admNo !== null) {
    const norm = normalizeURN(student.admNo);
    if (norm) return norm;
  }

  // 3. Raw header compatibility (if student object came directly from Sheet/JSON)
  const rawCandidate = 
    student['Admission No'] ?? 
    student['Admission Number'] ?? 
    student['AdmissionNo'] ?? 
    student['Adm No'] ?? 
    student['AdmNo'] ?? 
    student['URN'] ?? 
    student['urn_id'];

  if (rawCandidate !== undefined && rawCandidate !== null) {
    const norm = normalizeURN(rawCandidate);
    if (norm) return norm;
  }

  // URN is missing. DO NOT synthesize from roll/name!
  return '';
}

/**
 * Checks whether a student has a non-empty, valid URN.
 */
export function hasValidURN(student: StudentIdentityLike | null | undefined): boolean {
  return getStudentURN(student).length > 0;
}

/**
 * Compares two student objects by their authoritative URN.
 * Returns true ONLY if both students have non-empty URNs and they match.
 * Returns false if either student lacks a URN (never assume two missing-URN students are the same).
 */
export function isSameStudent(
  a: StudentIdentityLike | null | undefined,
  b: StudentIdentityLike | null | undefined
): boolean {
  const urnA = getStudentURN(a);
  const urnB = getStudentURN(b);
  if (!urnA || !urnB) {
    return false;
  }
  return urnA === urnB;
}

/**
 * Identifies duplicate URNs in a collection of student records.
 * Returns a diagnostic report for any URN shared by more than one student.
 */
export function checkDuplicateURNs(students: StudentIdentityLike[]): DuplicateURNDiagnostic[] {
  if (!Array.isArray(students) || students.length === 0) {
    return [];
  }

  const urnMap = new Map<string, Array<{ roll: string | number; name: string; studentClass?: string; index: number }>>();

  students.forEach((st, idx) => {
    const urn = getStudentURN(st);
    if (!urn) return; // Handled by findMissingURNs

    const entry = {
      roll: st.roll ?? (idx + 1),
      name: st.name || `Student ${idx + 1}`,
      studentClass: st.studentClass || undefined,
      index: idx
    };

    const existing = urnMap.get(urn);
    if (existing) {
      existing.push(entry);
    } else {
      urnMap.set(urn, [entry]);
    }
  });

  const duplicates: DuplicateURNDiagnostic[] = [];
  urnMap.forEach((matchedStudents, urn) => {
    if (matchedStudents.length > 1) {
      duplicates.push({
        urn,
        count: matchedStudents.length,
        students: matchedStudents
      });
    }
  });

  return duplicates;
}

/**
 * Identifies student records that lack an authoritative URN in Column B / admNo.
 */
export function findMissingURNs(students: StudentIdentityLike[]): MissingURNDiagnostic[] {
  if (!Array.isArray(students) || students.length === 0) {
    return [];
  }

  const missing: MissingURNDiagnostic[] = [];

  students.forEach((st, idx) => {
    if (!hasValidURN(st)) {
      missing.push({
        index: idx,
        roll: st.roll ?? (idx + 1),
        name: st.name || `Student ${idx + 1}`,
        studentClass: st.studentClass || undefined
      });
    }
  });

  return missing;
}

/**
 * Comprehensive diagnostic check of a student roster's identity integrity.
 */
export function getIdentityDiagnostics(students: StudentIdentityLike[]): IdentityDiagnosticReport {
  const duplicates = checkDuplicateURNs(students);
  const missing = findMissingURNs(students);
  const warnings: string[] = [];

  if (missing.length > 0) {
    warnings.push(
      `⚠️ URN missing for ${missing.length} student(s). (e.g. Roll ${missing[0].roll}: ${missing[0].name}). Permanent identity cannot be established without Column B URN.`
    );
  }

  if (duplicates.length > 0) {
    duplicates.forEach((d) => {
      const names = d.students.map((s) => `Roll ${s.roll} (${s.name})`).join(', ');
      warnings.push(
        `🚨 Duplicate URN detected: "${d.urn}" is shared by ${d.count} students: ${names}. Records must not be merged automatically.`
      );
    });
  }

  return {
    isValid: duplicates.length === 0 && missing.length === 0,
    totalStudents: students.length,
    missingURNCount: missing.length,
    duplicateURNCount: duplicates.length,
    missingURNs: missing,
    duplicateURNs: duplicates,
    warnings
  };
}

/**
 * Safely migrates existing localStorage draft marks (which were keyed by roll)
 * to URN-keyed entries without destroying or guessing ambiguous records.
 * 
 * Rules:
 * - If key already matches a student's URN: keep it intact.
 * - If key matches a student's roll:
 *     - Only migrate if exactly ONE student in the class has that roll and has a valid URN.
 *     - Retain the roll key as well for zero-breakage backward compatibility.
 * - If key does not match any current student or is ambiguous, retain without modification.
 */
export function migrateDraftValuesToURN(
  draftValues: Record<string, string>,
  students: StudentIdentityLike[]
): {
  migratedValues: Record<string, string>;
  migratedCount: number;
  unmappedCount: number;
} {
  const migratedValues: Record<string, string> = { ...draftValues };
  let migratedCount = 0;
  let unmappedCount = 0;

  if (!draftValues || typeof draftValues !== 'object' || !Array.isArray(students) || students.length === 0) {
    return { migratedValues, migratedCount: 0, unmappedCount: 0 };
  }

  // Build unambiguous roll-to-student lookup map
  const rollToStudentsMap = new Map<string, StudentIdentityLike[]>();
  students.forEach((st) => {
    const r = String(st.roll ?? '').trim();
    if (r) {
      const list = rollToStudentsMap.get(r) || [];
      list.push(st);
      rollToStudentsMap.set(r, list);
    }
  });

  Object.entries(draftValues).forEach(([key, val]) => {
    const trimmedKey = String(key).trim();
    
    // Check if key is already a student's URN
    const isAlreadyURN = students.some((st) => getStudentURN(st) === trimmedKey);
    if (isAlreadyURN) {
      return;
    }

    // Check if key is a roll
    const matched = rollToStudentsMap.get(trimmedKey);
    if (matched && matched.length === 1) {
      const student = matched[0];
      const urn = getStudentURN(student);
      if (urn) {
        migratedValues[urn] = val;
        // Keep migratedValues[trimmedKey] = val for backward compatibility
        migratedCount++;
        return;
      }
    }

    unmappedCount++;
  });

  return {
    migratedValues,
    migratedCount,
    unmappedCount
  };
}
