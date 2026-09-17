export interface SchoolSignatures {
  principalSignUrl: string;       // Base64 data URL or image link
  controllerSignUrl: string;      // Base64 data URL or image link
  principalTitle?: string;
  controllerTitle?: string;
  updatedAt?: string;
}

const STORAGE_KEY = 'pis_school_official_signatures_v1';

export function getStoredSignatures(): SchoolSignatures {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        principalSignUrl: parsed.principalSignUrl || '',
        controllerSignUrl: parsed.controllerSignUrl || '',
        principalTitle: parsed.principalTitle || 'Principal / Headmaster',
        controllerTitle: parsed.controllerTitle || 'Controller of Examinations',
        updatedAt: parsed.updatedAt || ''
      };
    }
  } catch (e) {
    console.warn('Failed to load stored signatures', e);
  }
  return {
    principalSignUrl: '',
    controllerSignUrl: '',
    principalTitle: 'Principal / Headmaster',
    controllerTitle: 'Controller of Examinations',
    updatedAt: ''
  };
}

export function saveStoredSignatures(sigs: Partial<SchoolSignatures>): SchoolSignatures {
  const current = getStoredSignatures();
  const updated: SchoolSignatures = {
    ...current,
    ...sigs,
    updatedAt: new Date().toISOString()
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    // Dispatch custom event to notify all listening components
    window.dispatchEvent(new CustomEvent('school-signatures-updated', { detail: updated }));
  } catch (e) {
    console.error('Failed to save signatures to localStorage', e);
  }
  return updated;
}
