import { MASTER_ADMIN_PIN } from '../data/schoolConfig';

const ADMIN_SESSION_KEY = 'pis_admin_session_auth_v1';
const ADMIN_SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const FAILED_ATTEMPTS_KEY = 'pis_admin_failed_attempts';

export function createAdminSession(): void {
  try {
    const payload = {
      authenticated: true,
      createdAt: Date.now(),
      expiresAt: Date.now() + ADMIN_SESSION_TTL_MS
    };

    sessionStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(payload));
  } catch {
    // ignore storage failure; browser local session is still the current admin boundary
  }
}

export function clearAdminSession(): void {
  try {
    sessionStorage.removeItem(ADMIN_SESSION_KEY);
  } catch {
    // ignore
  }
}

export function validateAdminSession(): boolean {
  try {
    const raw = sessionStorage.getItem(ADMIN_SESSION_KEY);
    if (!raw) return false;

    const parsed = JSON.parse(raw);
    if (!parsed || parsed.authenticated !== true) {
      clearAdminSession();
      return false;
    }

    const expiresAt = Number(parsed.expiresAt || 0);
    if (!expiresAt || Date.now() > expiresAt) {
      clearAdminSession();
      return false;
    }

    return true;
  } catch {
    clearAdminSession();
    return false;
  }
}

export function isAdminAuthenticated(): boolean {
  return validateAdminSession();
}

export function getAdminFailedAttempts(): number {
  try {
    return parseInt(sessionStorage.getItem(FAILED_ATTEMPTS_KEY) || '0', 10);
  } catch {
    return 0;
  }
}

export function incrementAdminFailedAttempts(): number {
  const next = getAdminFailedAttempts() + 1;
  try {
    sessionStorage.setItem(FAILED_ATTEMPTS_KEY, String(next));
  } catch {
    // ignore
  }
  return next;
}

export function resetAdminFailedAttempts(): void {
  try {
    sessionStorage.removeItem(FAILED_ATTEMPTS_KEY);
  } catch {
    // ignore
  }
}

export function verifyAdminPin(enteredPin: string, storedAdminPin?: string): boolean {
  const cleanEntered = (enteredPin || '').trim();
  const cleanStored = (storedAdminPin || '').trim() || MASTER_ADMIN_PIN;
  return cleanEntered === cleanStored || cleanEntered === MASTER_ADMIN_PIN;
}

export { ADMIN_SESSION_KEY, ADMIN_SESSION_TTL_MS, FAILED_ATTEMPTS_KEY };
