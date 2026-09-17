const ADMIN_SESSION_KEY = 'pis_admin_session_auth_v1';
const ADMIN_SESSION_TTL_MS = 8 * 60 * 60 * 1000;

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

export { ADMIN_SESSION_KEY, ADMIN_SESSION_TTL_MS };
