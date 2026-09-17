import { checkDuplicateURNs, getStudentURN, normalizeURN, StudentIdentityLike } from './studentIdentity';

export type PhotoDiagnostic = 'PHOTO_AVAILABLE' | 'PHOTO_MISSING' | 'PHOTO_URL_INVALID' | 'URN_MISSING' | 'DUPLICATE_URN';

export interface StudentPhotoMapping {
  url: string;
  diagnostic: PhotoDiagnostic;
  urn: string;
}

export const formatPhotoUrl = (url?: string): string => {
  if (!url || !url.trim()) return '';
  let clean = url.trim();

  const formulaMatch = clean.match(/=IMAGE\s*\(\s*["']([^"']+)["']\s*\)/i);
  if (formulaMatch?.[1]) clean = formulaMatch[1].trim();

  const driveMatch = clean.match(/\/file\/d\/([a-zA-Z0-9_-]+)/i) ||
    clean.match(/[?&]id=([a-zA-Z0-9_-]+)/i) ||
    clean.match(/\/d\/([a-zA-Z0-9_-]+)/i);

  if (driveMatch?.[1]) return `https://lh3.googleusercontent.com/d/${driveMatch[1]}`;
  if (/^[a-zA-Z0-9_-]{25,45}$/.test(clean) && !clean.startsWith('http')) {
    return `https://lh3.googleusercontent.com/d/${clean}`;
  }
  return clean;
};

const isValidPhotoSource = (value: string): boolean => {
  if (!value) return false;
  if (/=IMAGE\s*\(/i.test(value)) return Boolean(value.match(/=IMAGE\s*\(\s*["']([^"']+)["']\s*\)/i));
  return /^https?:\/\//i.test(value) || /^data:image\//i.test(value) || /^[a-zA-Z0-9_-]{25,45}$/.test(value);
};

export const getStudentPhotoUrl = (
  student: StudentIdentityLike | null | undefined,
  roster: StudentIdentityLike[] = []
): StudentPhotoMapping => {
  const urn = normalizeURN(getStudentURN(student));
  if (!urn) return { url: '', diagnostic: 'URN_MISSING', urn: '' };
  if (checkDuplicateURNs(roster).some(entry => entry.urn === urn)) {
    return { url: '', diagnostic: 'DUPLICATE_URN', urn };
  }

  const explicit = normalizeURN(student?.['photoUrl']);
  let source = isValidPhotoSource(explicit) ? explicit : '';

  if (!source && typeof window !== 'undefined') {
    try {
      const cached = localStorage.getItem(`pis_photo_${urn}`) || '';
      source = isValidPhotoSource(cached) ? cached.trim() : '';
    } catch {
      // Local photo cache is optional.
    }
  }

  if (!source) {
    return {
      url: '',
      diagnostic: explicit ? 'PHOTO_URL_INVALID' : 'PHOTO_MISSING',
      urn
    };
  }

  return { url: formatPhotoUrl(source), diagnostic: 'PHOTO_AVAILABLE', urn };
};

export const validateStudentPhotoMapping = (student: StudentIdentityLike | null | undefined): PhotoDiagnostic =>
  getStudentPhotoUrl(student).diagnostic;
