import { TeacherAccount, TeacherAllotment, PasswordResetRequest } from '../types';

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
export const TEACHER_SESSION_STORAGE_KEY = 'pis_teacher_auth_session_v1';
export const TEACHER_RESET_REQUESTS_KEY = 'pis_teacher_reset_requests_v1';
export const DEFAULT_TEACHER_PASSWORD = '123456';

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

  // Deduplicate accounts by teacherId or id and ensure default password
  const seenAccKeys = new Set<string>();
  const dedupedAccounts: TeacherAccount[] = [];
  for (const acc of accounts) {
    const rawKey = (acc.teacherId || acc.id || '').trim().toUpperCase();
    if (!rawKey || !seenAccKeys.has(rawKey)) {
      if (rawKey) seenAccKeys.add(rawKey);
      dedupedAccounts.push({
        ...acc,
        password: (acc.password && acc.password.trim()) ? acc.password.trim() : DEFAULT_TEACHER_PASSWORD,
        mustChangePassword: acc.mustChangePassword ?? false,
        resetRequested: acc.resetRequested ?? false
      });
    }
  }

  return dedupedAccounts;
}

/**
 * Saves Teacher Accounts to `TEACHER_ACCOUNTS_STORAGE_KEY`.
 * Emits window event for cross-component reactive updates.
 */
export function saveTeacherAccounts(accounts: TeacherAccount[]): void {
  try {
    const seenAccKeys = new Set<string>();
    const dedupedAccounts: TeacherAccount[] = [];
    for (const acc of accounts) {
      const rawKey = (acc.teacherId || acc.id || '').trim().toUpperCase();
      if (!rawKey || !seenAccKeys.has(rawKey)) {
        if (rawKey) seenAccKeys.add(rawKey);
        dedupedAccounts.push(acc);
      }
    }

    localStorage.setItem(TEACHER_ACCOUNTS_STORAGE_KEY, JSON.stringify(dedupedAccounts));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('teacher_accounts_updated', {
        detail: { accounts: dedupedAccounts }
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

    const seenAllotIds = new Set<string>();
    return parsed.map((allot: any, idx: number) => {
      let uniqueId = allot.id ? String(allot.id) : `allot_${idx}`;
      if (seenAllotIds.has(uniqueId)) {
        uniqueId = `${uniqueId}_${idx}`;
      }
      seenAllotIds.add(uniqueId);

      return {
        ...allot,
        id: uniqueId,
        sections: (allot.sections && Array.isArray(allot.sections) && allot.sections.length > 0)
          ? allot.sections
          : ['A'],
        active: allot.active !== false
      };
    });
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
    const seenAllotIds = new Set<string>();
    const safeAllotments = (allotments || []).map((allot, idx) => {
      let uniqueId = allot.id ? String(allot.id) : `allot_${idx}`;
      if (seenAllotIds.has(uniqueId)) {
        uniqueId = `${uniqueId}_${idx}`;
      }
      seenAllotIds.add(uniqueId);
      return {
        ...allot,
        id: uniqueId
      };
    });
    localStorage.setItem(TEACHER_ALLOTMENTS_STORAGE_KEY, JSON.stringify(safeAllotments));
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

/**
 * ============================================================
 * MODULE 3D — TEACHER CREDENTIAL AUTHENTICATION & LOCKING SYSTEM
 * ============================================================
 */

/**
 * Verifies teacher login credentials (by Teacher ID or Contact Number).
 */
export function verifyTeacherLogin(
  teacherIdOrContact: string,
  passwordInput: string
): { success: boolean; teacher?: TeacherAccount; error?: string } {
  if (!teacherIdOrContact || !teacherIdOrContact.trim()) {
    return { success: false, error: 'कृपया अपना Teacher ID या मोबाइल नंबर दर्ज करें।' };
  }
  if (!passwordInput || !passwordInput.trim()) {
    return { success: false, error: 'कृपया पासवर्ड या पिन दर्ज करें।' };
  }

  const accounts = loadTeacherAccounts();
  const cleanInput = teacherIdOrContact.trim().toUpperCase();
  const cleanDigits = teacherIdOrContact.replace(/\D/g, '');

  const matched = accounts.find(acc => {
    const accTId = (acc.teacherId || '').trim().toUpperCase();
    if (accTId === cleanInput) return true;

    if (acc.contact) {
      const accContactDigits = acc.contact.replace(/\D/g, '');
      if (cleanDigits.length >= 10 && accContactDigits.endsWith(cleanDigits)) return true;
    }
    return false;
  });

  if (!matched) {
    return {
      success: false,
      error: `शिक्षक खाता "${teacherIdOrContact}" नहीं मिला। कृपया अपना सही Teacher ID (उदा. TCH-2026-001) या पंजीकृत मोबाइल नंबर जांचें।`
    };
  }

  if (matched.active === false) {
    return {
      success: false,
      error: 'यह शिक्षक खाता वर्तमान में निष्क्रिय (Inactive) है। कृपया स्कूल एडमिन से संपर्क करें।'
    };
  }

  const expectedPassword = (matched.password && matched.password.trim())
    ? matched.password.trim()
    : DEFAULT_TEACHER_PASSWORD;

  if (passwordInput.trim() !== expectedPassword) {
    return {
      success: false,
      error: 'गलत पासवर्ड / पिन! यदि आप पासवर्ड भूल गए हैं, तो "Forgot Password" पर क्लिक करके एडमिन को रीसेट अनुरोध भेजें।'
    };
  }

  // Update last login timestamp
  const updatedAccount: TeacherAccount = {
    ...matched,
    lastLoginAt: new Date().toISOString()
  };

  const updatedList = accounts.map(a => a.id === matched.id ? updatedAccount : a);
  saveTeacherAccounts(updatedList);
  setTeacherSession(updatedAccount);

  return {
    success: true,
    teacher: updatedAccount
  };
}

/**
 * Gets currently logged in teacher from session.
 */
export function getTeacherSession(): TeacherAccount | null {
  try {
    const raw = sessionStorage.getItem(TEACHER_SESSION_STORAGE_KEY) || localStorage.getItem(TEACHER_SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.teacherId) return null;

    // Refresh from accounts store to get latest active status & password flag
    const accounts = loadTeacherAccounts();
    const fresh = accounts.find(a => (a.teacherId || '').toUpperCase() === (parsed.teacherId || '').toUpperCase());
    if (fresh) {
      if (fresh.active === false) {
        clearTeacherSession();
        return null;
      }
      return fresh;
    }
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Saves current teacher session.
 */
export function setTeacherSession(account: TeacherAccount | null): void {
  try {
    if (!account) {
      sessionStorage.removeItem(TEACHER_SESSION_STORAGE_KEY);
      localStorage.removeItem(TEACHER_SESSION_STORAGE_KEY);
    } else {
      const serialized = JSON.stringify(account);
      sessionStorage.setItem(TEACHER_SESSION_STORAGE_KEY, serialized);
      localStorage.setItem(TEACHER_SESSION_STORAGE_KEY, serialized);
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('teacher_session_changed', {
        detail: { teacher: account }
      }));
    }
  } catch (err) {
    console.error('Failed to set teacher session', err);
  }
}

/**
 * Clears teacher session (logout).
 */
export function clearTeacherSession(): void {
  setTeacherSession(null);
}

/**
 * Checks if teacher is currently authenticated.
 */
export function isTeacherAuthenticated(): boolean {
  const sess = getTeacherSession();
  return Boolean(sess && sess.teacherId && sess.active !== false);
}

/**
 * Teacher updates their own password (e.g., on first login or voluntarily).
 */
export function updateTeacherPassword(
  teacherId: string,
  newPassword: string
): { success: boolean; message: string; teacher?: TeacherAccount } {
  if (!teacherId || !teacherId.trim()) {
    return { success: false, message: 'अमान्य शिक्षक आईडी।' };
  }
  if (!newPassword || newPassword.trim().length < 4) {
    return { success: false, message: 'नया पासवर्ड कम से कम 4 अक्षरों या अंकों का होना चाहिए।' };
  }

  const cleanId = teacherId.trim().toUpperCase();
  const accounts = loadTeacherAccounts();
  const idx = accounts.findIndex(a => (a.teacherId || '').trim().toUpperCase() === cleanId);

  if (idx === -1) {
    return { success: false, message: `शिक्षक आईडी ${teacherId} नहीं मिला।` };
  }

  const updatedTeacher: TeacherAccount = {
    ...accounts[idx],
    password: newPassword.trim(),
    mustChangePassword: false,
    resetRequested: false,
    resetRequestedAt: undefined,
    resetRequestNote: undefined,
    updatedAt: new Date().toISOString()
  };

  accounts[idx] = updatedTeacher;
  saveTeacherAccounts(accounts);
  setTeacherSession(updatedTeacher);

  // Mark any pending reset requests for this teacher as RESOLVED
  const requests = loadPasswordResetRequests();
  const updatedReqs = requests.map(r => {
    if (r.teacherId.toUpperCase() === cleanId && r.status === 'PENDING') {
      return { ...r, status: 'RESOLVED' as const, resolvedAt: new Date().toISOString() };
    }
    return r;
  });
  savePasswordResetRequests(updatedReqs);

  return {
    success: true,
    message: 'नया पासवर्ड सफलतापूर्वक सहेजा गया और सक्रिय किया गया!',
    teacher: updatedTeacher
  };
}

/**
 * Admin resets a teacher's password to default PIN (e.g., 123456).
 * Sets mustChangePassword: true so teacher is prompted to create a new one on login.
 */
export function adminResetTeacherPassword(
  teacherId: string,
  customDefaultPin: string = DEFAULT_TEACHER_PASSWORD
): { success: boolean; message: string; defaultPin: string; teacher?: TeacherAccount } {
  if (!teacherId || !teacherId.trim()) {
    return { success: false, message: 'अमान्य शिक्षक आईडी।', defaultPin: customDefaultPin };
  }

  const cleanId = teacherId.trim().toUpperCase();
  const accounts = loadTeacherAccounts();
  const idx = accounts.findIndex(a => (a.teacherId || '').trim().toUpperCase() === cleanId);

  if (idx === -1) {
    return { success: false, message: `शिक्षक खाता ${teacherId} नहीं मिला।`, defaultPin: customDefaultPin };
  }

  const effectivePin = (customDefaultPin && customDefaultPin.trim())
    ? customDefaultPin.trim()
    : DEFAULT_TEACHER_PASSWORD;

  const updatedTeacher: TeacherAccount = {
    ...accounts[idx],
    password: effectivePin,
    mustChangePassword: true, // Force teacher to set new password on next login
    resetRequested: false,
    updatedAt: new Date().toISOString()
  };

  accounts[idx] = updatedTeacher;
  saveTeacherAccounts(accounts);

  // If teacher is currently logged in locally, update their session
  const currentSession = getTeacherSession();
  if (currentSession && (currentSession.teacherId || '').toUpperCase() === cleanId) {
    setTeacherSession(updatedTeacher);
  }

  // Resolve pending reset requests
  const requests = loadPasswordResetRequests();
  const updatedReqs = requests.map(r => {
    if (r.teacherId.toUpperCase() === cleanId && r.status === 'PENDING') {
      return { ...r, status: 'RESOLVED' as const, resolvedAt: new Date().toISOString() };
    }
    return r;
  });
  savePasswordResetRequests(updatedReqs);

  return {
    success: true,
    message: `शिक्षक ${updatedTeacher.teacherName} का पासवर्ड डिफ़ॉल्ट "${effectivePin}" पर रीसेट कर दिया गया है।`,
    defaultPin: effectivePin,
    teacher: updatedTeacher
  };
}

/**
 * Teacher requests a password reset from Admin.
 */
export function requestTeacherPasswordReset(
  teacherIdOrContact: string,
  note?: string
): { success: boolean; message: string; teacherId?: string } {
  if (!teacherIdOrContact || !teacherIdOrContact.trim()) {
    return { success: false, message: 'कृपया अपना Teacher ID या मोबाइल नंबर दर्ज करें।' };
  }

  const accounts = loadTeacherAccounts();
  const cleanInput = teacherIdOrContact.trim().toUpperCase();
  const cleanDigits = teacherIdOrContact.replace(/\D/g, '');

  const matched = accounts.find(acc => {
    const accTId = (acc.teacherId || '').trim().toUpperCase();
    if (accTId === cleanInput) return true;
    if (acc.contact) {
      const accContactDigits = acc.contact.replace(/\D/g, '');
      if (cleanDigits.length >= 10 && accContactDigits.endsWith(cleanDigits)) return true;
    }
    return false;
  });

  if (!matched) {
    return {
      success: false,
      message: `शिक्षक खाता "${teacherIdOrContact}" नहीं मिला। कृपया सही Teacher ID (उदा. TCH-2026-001) या स्कूल में पंजीकृत नंबर जांचें।`
    };
  }

  // Update account with resetRequested flag
  const updatedAccounts = accounts.map(a => {
    if (a.id === matched.id) {
      return {
        ...a,
        resetRequested: true,
        resetRequestedAt: new Date().toISOString(),
        resetRequestNote: note || 'शिक्षक द्वारा पासवर्ड रीसेट का अनुरोध किया गया।'
      };
    }
    return a;
  });
  saveTeacherAccounts(updatedAccounts);

  // Add to Password Reset Requests queue
  const requests = loadPasswordResetRequests();
  const newRequest: PasswordResetRequest = {
    id: `req_pwd_${Date.now()}_${matched.teacherId}`,
    teacherId: matched.teacherId,
    teacherName: matched.teacherName,
    contact: matched.contact,
    requestedAt: new Date().toISOString(),
    note: note || 'शिक्षक द्वारा पासवर्ड रीसेट का अनुरोध।',
    status: 'PENDING'
  };

  savePasswordResetRequests([newRequest, ...requests]);

  return {
    success: true,
    teacherId: matched.teacherId,
    message: `पासवर्ड रीसेट अनुरोध दर्ज कर लिया गया है! एडमिन द्वारा आपका पासवर्ड डिफ़ॉल्ट (${DEFAULT_TEACHER_PASSWORD}) पर रीसेट किया जाएगा। कृपया एडमिन से संपर्क करें।`
  };
}

/**
 * Loads all password reset requests.
 */
export function loadPasswordResetRequests(): PasswordResetRequest[] {
  try {
    const raw = localStorage.getItem(TEACHER_RESET_REQUESTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Saves password reset requests to localStorage.
 */
export function savePasswordResetRequests(requests: PasswordResetRequest[]): void {
  try {
    localStorage.setItem(TEACHER_RESET_REQUESTS_KEY, JSON.stringify(requests));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('teacher_reset_requests_updated', {
        detail: { requests }
      }));
    }
  } catch (err) {
    console.error('Failed to save password reset requests', err);
  }
}

/**
 * Gets a teacher account by their teacherId.
 */
export function getTeacherById(teacherId: string): TeacherAccount | null {
  if (!teacherId) return null;
  const accounts = loadTeacherAccounts();
  const cleanId = teacherId.trim().toUpperCase();
  return accounts.find(a => (a.teacherId || '').trim().toUpperCase() === cleanId) || null;
}

/**
 * Gets all pending password reset requests.
 */
export function getPendingPasswordResetRequests(): PasswordResetRequest[] {
  return loadPasswordResetRequests().filter(r => r.status === 'PENDING');
}

/**
 * Dismisses a password reset request without resetting.
 */
export function dismissPasswordResetRequest(requestId: string): void {
  const requests = loadPasswordResetRequests();
  const updated = requests.map(r => r.id === requestId ? { ...r, status: 'DISMISSED' as const } : r);
  savePasswordResetRequests(updated);
}


