import { TeacherAccount, TeacherAllotment } from '../types';

/**
 * MODULE 3A — TEACHER ACCOUNT FOUNDATION
 *
 * Separates:
 * - Teacher Account (identity, stable ID, credentials reference, active status)
 * from:
 * - Teacher Permission & Allotment (what classes, sections, and subjects the teacher teaches)
 *
 * Authoritative Storage Keys:
 * - Accounts: `pis_teacher_accounts_v1`
 * - Allotments: `pis_teacher_allotments_v1`
 */

export const TEACHER_ACCOUNTS_STORAGE_KEY = 'pis_teacher_accounts_v1';
export const TEACHER_ALLOTMENTS_STORAGE_KEY = 'pis_teacher_allotments_v1';

/**
 * Generates next unique Teacher ID in the standard format:
 * "TCH-2026-001", "TCH-2026-002", etc.
 *
 * Guaranteed NOT to depend on teacher name, class, subject, or roll number.
 */
export function generateNextTeacherId(existingAccounts: TeacherAccount[], year = 2026): string {
  let maxSeq = 0;
  const prefix = `TCH-${year}-`;

  for (const acc of existingAccounts) {
    if (!acc.teacherId) continue;
    const clean = acc.teacherId.trim().toUpperCase();
    // Matches TCH-YYYY-NNN or TCH-NNN
    const match = clean.match(/^TCH-(?:\d{4}-)?(\d+)$/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > maxSeq) {
        maxSeq = num;
      }
    }
  }

  const nextSeq = maxSeq + 1;
  return `${prefix}${String(nextSeq).padStart(3, '0')}`;
}

/**
 * Validates that candidate Teacher ID is unique among all existing accounts
 * (case-insensitive, ignoring the account currently being edited).
 */
export function isTeacherIdUnique(
  candidateId: string,
  existingAccounts: TeacherAccount[],
  excludeAccountId?: string
): boolean {
  if (!candidateId || !candidateId.trim()) return false;
  const cleanCandidate = candidateId.trim().toUpperCase();

  return !existingAccounts.some(acc => {
    if (excludeAccountId && acc.id === excludeAccountId) return false;
    return acc.teacherId.trim().toUpperCase() === cleanCandidate;
  });
}

/**
 * Checks if a teacher account is considered currently active and valid.
 * Inactive teachers must NOT be treated as active valid accounts.
 */
export function isTeacherAccountActive(account: TeacherAccount | undefined | null): boolean {
  if (!account) return false;
  return Boolean(account.active);
}

/**
 * Safely loads Teacher Accounts from `pis_teacher_accounts_v1`.
 *
 * Backward Compatibility & Migration:
 * If no accounts exist yet, but existing allotments are found in `pis_teacher_allotments_v1`,
 * this function automatically derives corresponding initial TeacherAccount records
 * (with unique TCH-2026-NNN IDs) without breaking any existing assignment data.
 */
export function loadTeacherAccounts(): TeacherAccount[] {
  let accounts: TeacherAccount[] = [];

  try {
    const raw = localStorage.getItem(TEACHER_ACCOUNTS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        accounts = parsed;
      }
    }
  } catch (err) {
    console.error('Failed to load teacher accounts from localStorage', err);
  }

  // If accounts already exist, return them
  if (accounts.length > 0) {
    return accounts;
  }

  // Backward-compatibility: Check if legacy allotments exist without an account store
  try {
    const legacyAllotmentsRaw = localStorage.getItem(TEACHER_ALLOTMENTS_STORAGE_KEY);
    if (legacyAllotmentsRaw) {
      const legacyAllotments = JSON.parse(legacyAllotmentsRaw);
      if (Array.isArray(legacyAllotments) && legacyAllotments.length > 0) {
        const uniqueNames = Array.from(new Set(
          legacyAllotments.map((a: any) => (a.teacherName || '').trim()).filter(Boolean)
        ));

        const migratedAccounts: TeacherAccount[] = uniqueNames.map((name, idx) => ({
          id: `tch_acc_${Date.now()}_${idx}`,
          teacherId: `TCH-2026-${String(idx + 1).padStart(3, '0')}`,
          teacherName: name,
          active: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          lastLoginAt: null
        }));

        if (migratedAccounts.length > 0) {
          saveTeacherAccounts(migratedAccounts);
          accounts = migratedAccounts;

          // Also link existing allotments with their new teacherId
          const updatedAllotments = legacyAllotments.map((allot: any) => {
            const matchAcc = migratedAccounts.find(m => m.teacherName.toLowerCase() === (allot.teacherName || '').trim().toLowerCase());
            return {
              ...allot,
              teacherId: allot.teacherId || matchAcc?.teacherId
            };
          });
          localStorage.setItem(TEACHER_ALLOTMENTS_STORAGE_KEY, JSON.stringify(updatedAllotments));
        }
      }
    }
  } catch (migrErr) {
    console.warn('Teacher legacy allotment migration notice:', migrErr);
  }

  return accounts;
}

/**
 * Saves Teacher Accounts to `TEACHER_ACCOUNTS_STORAGE_KEY`.
 * Emits window event for cross-component reactive updates.
 */
export function saveTeacherAccounts(accounts: TeacherAccount[]): void {
  try {
    localStorage.setItem(TEACHER_ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('teacher_accounts_updated', {
        detail: { accounts }
      }));
    }
  } catch (err) {
    console.error('Failed to save teacher accounts', err);
  }
}

/**
 * Safely loads Teacher Allotments from `pis_teacher_allotments_v1`.
 * Ensures backward-compatibility: defaults missing sections to ['A']
 * and missing active to true.
 */
export function loadTeacherAllotments(): TeacherAllotment[] {
  try {
    const raw = localStorage.getItem(TEACHER_ALLOTMENTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.map((allot: any) => ({
      ...allot,
      sections: (allot.sections && Array.isArray(allot.sections) && allot.sections.length > 0)
        ? allot.sections
        : ['A'],
      active: allot.active !== false
    }));
  } catch (err) {
    console.error('Failed to load teacher allotments from localStorage', err);
    return [];
  }
}

/**
 * Safely saves Teacher Allotments to `pis_teacher_allotments_v1`.
 */
export function saveTeacherAllotments(allotments: TeacherAllotment[]): void {
  try {
    localStorage.setItem(TEACHER_ALLOTMENTS_STORAGE_KEY, JSON.stringify(allotments));
  } catch (err) {
    console.error('Failed to save teacher allotments', err);
  }
}

/**
 * Helper to safely synchronize allotments with teacher accounts.
 * When teacher display name is updated in account, or allotment lacks teacherId,
 * updates reference without breaking classes or subjects.
 */
export function syncAllotmentsWithTeacherAccounts(
  allotments: TeacherAllotment[],
  accounts: TeacherAccount[]
): TeacherAllotment[] {
  const accountMapByTchId = new Map<string, TeacherAccount>();
  const accountMapByName = new Map<string, TeacherAccount>();

  accounts.forEach(acc => {
    accountMapByTchId.set(acc.teacherId.toUpperCase(), acc);
    accountMapByName.set(acc.teacherName.trim().toLowerCase(), acc);
  });

  return allotments.map(allot => {
    if (allot.teacherId && accountMapByTchId.has(allot.teacherId.toUpperCase())) {
      const acc = accountMapByTchId.get(allot.teacherId.toUpperCase())!;
      return {
        ...allot,
        teacherName: acc.teacherName // keep display name synchronized
      };
    }

    // Attempt name match if teacherId is missing
    const byName = accountMapByName.get(allot.teacherName.trim().toLowerCase());
    if (byName) {
      return {
        ...allot,
        teacherId: byName.teacherId
      };
    }

    return allot;
  });
}

/**
 * MODULE 3B — TEACHER PERMISSION FOUNDATION
 *
 * Permission Model:
 * Teacher ID -> Class -> Section -> Subject
 *
 * A teacher is granted access only to the exact (Class, Section, Subject)
 * tuples explicitly alloted by Admin.
 */

export interface TeacherPermissionTuple {
  teacherId: string;
  teacherName: string;
  classLevel: string;
  section: string;
  subject: string;
  active: boolean;
}

/**
 * Checks if adding candidate subjects for a specific (teacherId, classLevel, section)
 * would create a duplicate permission.
 * Returns the list of duplicate subjects found, or empty array if none.
 */
export function findDuplicateTeacherPermissions(
  allotments: TeacherAllotment[],
  candidateTeacherId: string,
  candidateClass: string,
  candidateSections: string[],
  candidateSubjects: string[],
  excludeAllotmentId?: string
): { section: string; subject: string }[] {
  const duplicates: { section: string; subject: string }[] = [];
  const cleanId = candidateTeacherId.trim().toUpperCase();

  const otherAllotments = allotments.filter(a => !excludeAllotmentId || a.id !== excludeAllotmentId);

  for (const allot of otherAllotments) {
    const allotTchId = (allot.teacherId || '').trim().toUpperCase();
    if (allotTchId !== cleanId) continue;
    if (allot.classLevel !== candidateClass) continue;

    const allotSections = (allot.sections && allot.sections.length > 0)
      ? allot.sections
      : ['A'];

    for (const sec of candidateSections) {
      if (allotSections.includes(sec)) {
        for (const sub of candidateSubjects) {
          if (allot.subjects.includes(sub)) {
            duplicates.push({ section: sec, subject: sub });
          }
        }
      }
    }
  }

  return duplicates;
}

/**
 * Resolves effective permission for a teacher to access a specific Class, Section, and Subject.
 * Used as foundation by Mark Entry and future modules.
 *
 * @param allotments - All active allotments in system
 * @param teacherId - Stable Teacher ID (e.g. "TCH-2026-001")
 * @param classLevel - Target class (e.g. "8")
 * @param section - Target section (e.g. "A")
 * @param subject - Target subject (e.g. "Mathematics")
 * @returns boolean indicating whether teacher has authorized permission
 */
export function hasTeacherPermission(
  allotments: TeacherAllotment[],
  teacherId: string,
  classLevel: string,
  section: string,
  subject: string
): boolean {
  if (!teacherId || !classLevel || !subject) return false;
  const cleanId = teacherId.trim().toUpperCase();
  const targetSec = (section || 'A').trim().toUpperCase();

  return allotments.some(allot => {
    // If allotment is explicitly marked inactive, ignore
    if (allot.active === false) return false;

    const allotTchId = (allot.teacherId || '').trim().toUpperCase();
    if (allotTchId !== cleanId) return false;
    if (allot.classLevel !== classLevel) return false;

    const sections = (allot.sections && allot.sections.length > 0)
      ? allot.sections.map(s => s.toUpperCase())
      : ['A'];

    if (!sections.includes(targetSec)) return false;

    return allot.subjects.includes(subject);
  });
}

/**
 * Returns list of distinct classes authorized for a specific Teacher ID.
 */
export function getTeacherAuthorizedClasses(
  allotments: TeacherAllotment[],
  teacherId: string
): string[] {
  if (!teacherId) return [];
  const cleanId = teacherId.trim().toUpperCase();

  const classes = new Set<string>();
  for (const allot of allotments) {
    if (allot.active === false) continue;
    if ((allot.teacherId || '').trim().toUpperCase() === cleanId) {
      classes.add(allot.classLevel);
    }
  }
  return Array.from(classes);
}

/**
 * Returns list of distinct sections authorized for a Teacher ID within a given Class.
 */
export function getTeacherAuthorizedSections(
  allotments: TeacherAllotment[],
  teacherId: string,
  classLevel: string
): string[] {
  if (!teacherId || !classLevel) return [];
  const cleanId = teacherId.trim().toUpperCase();

  const sections = new Set<string>();
  for (const allot of allotments) {
    if (allot.active === false) continue;
    if ((allot.teacherId || '').trim().toUpperCase() === cleanId && allot.classLevel === classLevel) {
      const secList = (allot.sections && allot.sections.length > 0) ? allot.sections : ['A'];
      secList.forEach(s => sections.add(s));
    }
  }
  return Array.from(sections);
}

/**
 * Returns list of distinct subjects authorized for a Teacher ID within a given Class and Section.
 */
export function getTeacherAuthorizedSubjects(
  allotments: TeacherAllotment[],
  teacherId: string,
  classLevel: string,
  section?: string
): string[] {
  if (!teacherId || !classLevel) return [];
  const cleanId = teacherId.trim().toUpperCase();
  const targetSec = (section || 'A').trim().toUpperCase();

  const subjects = new Set<string>();
  for (const allot of allotments) {
    if (allot.active === false) continue;
    if ((allot.teacherId || '').trim().toUpperCase() === cleanId && allot.classLevel === classLevel) {
      const secList = (allot.sections && allot.sections.length > 0)
        ? allot.sections.map(s => s.toUpperCase())
        : ['A'];
      if (secList.includes(targetSec)) {
        allot.subjects.forEach(sub => subjects.add(sub));
      }
    }
  }
  return Array.from(subjects);
}


