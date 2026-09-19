import { TeacherAccount, TeacherAllotment } from '../types';
import {
  TEACHER_ACCOUNTS_STORAGE_KEY,
  TEACHER_ALLOTMENTS_STORAGE_KEY,
  saveTeacherAccounts,
  loadTeacherAccounts,
  loadTeacherAllotments
} from '../utils/teacherAccount';
import { getEffectiveGasUrl } from '../config/appConfig';

export interface TeacherSyncResult {
  success: boolean;
  accounts: TeacherAccount[];
  allotments: TeacherAllotment[];
  message: string;
  source: 'cloud_sheet' | 'local_cache' | 'offline_fallback';
}

/**
 * Fetch Teacher Registry from Google Sheet "_TEACHERS" tab via GAS
 * Ensures cross-device consistency for all teacher allotments.
 */
export async function fetchTeacherRegistryFromGAS(
  providedUrl?: string
): Promise<TeacherSyncResult> {
  const scriptUrl = getEffectiveGasUrl(providedUrl);

  try {
    const urlWithParams = `${scriptUrl}?action=getTeachers&timestamp=${Date.now()}`;
    const response = await fetch(urlWithParams, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP Error ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    if (data && data.status === 'success' && (Array.isArray(data.accounts) || Array.isArray(data.allotments))) {
      const accounts: TeacherAccount[] = Array.isArray(data.accounts) ? data.accounts : [];
      const allotments: TeacherAllotment[] = Array.isArray(data.allotments) ? data.allotments : [];

      // Update local storage cache
      if (accounts.length > 0) {
        saveTeacherAccounts(accounts);
      }
      if (allotments.length > 0) {
        try {
          localStorage.setItem(TEACHER_ALLOTMENTS_STORAGE_KEY, JSON.stringify(allotments));
        } catch {
          // ignore cache error
        }
      }

      return {
        success: true,
        accounts: accounts.length > 0 ? accounts : loadTeacherAccounts(),
        allotments: allotments.length > 0 ? allotments : loadTeacherAllotments(),
        message: `Successfully synced ${accounts.length} teachers and ${allotments.length} allotments from Google Sheet (_TEACHERS).`,
        source: 'cloud_sheet'
      };
    }

    // Sheet is active but no teachers in registry yet: return local cache
    return {
      success: true,
      accounts: loadTeacherAccounts(),
      allotments: loadTeacherAllotments(),
      message: 'No entries found in _TEACHERS tab; using local teacher cache.',
      source: 'local_cache'
    };
  } catch (err: any) {
    console.warn('[TeacherSync] Google Sheet fetch notice:', err?.message);
    return {
      success: false,
      accounts: loadTeacherAccounts(),
      allotments: loadTeacherAllotments(),
      message: `Cloud sync unavailable (${err?.message || 'Network error'}); using cached local allotments.`,
      source: 'offline_fallback'
    };
  }
}

/**
 * Save Teacher Registry to Google Sheet "_TEACHERS" tab via GAS
 */
export async function saveTeacherRegistryToGAS(
  accounts: TeacherAccount[],
  allotments: TeacherAllotment[],
  providedUrl?: string
): Promise<{ success: boolean; message: string }> {
  const scriptUrl = getEffectiveGasUrl(providedUrl);

  try {
    // Note: Google Apps Script Web Apps require text/plain to avoid CORS OPTIONS preflight failures in browsers
    const response = await fetch(scriptUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify({
        action: 'saveTeachers',
        accounts,
        allotments,
        timestamp: new Date().toISOString()
      })
    });

    const data = await response.json();
    if (data && (data.status === 'success' || data.success)) {
      return {
        success: true,
        message: data.message || 'Saved successfully to Google Sheet (_TEACHERS) registry.'
      };
    }

    return {
      success: false,
      message: data?.message || 'Google Sheet returned an error while saving teachers.'
    };
  } catch (err: any) {
    console.error('[TeacherSync] Failed to save teachers to Google Sheet:', err);
    return {
      success: false,
      message: `Could not save to Google Sheet: ${err?.message || 'Network error'}. Cached locally.`
    };
  }
}

/**
 * Updates a single Teacher's password in Google Sheet "_TEACHERS" tab via GAS
 * Ensures seamless updates directly into the Google Sheet without requiring sheet redesign.
 */
export async function updateTeacherPasswordInGAS(
  teacherId: string,
  newPassword: string,
  providedUrl?: string
): Promise<{ success: boolean; message: string }> {
  const scriptUrl = getEffectiveGasUrl(providedUrl);

  try {
    const response = await fetch(scriptUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify({
        action: 'updateTeacherPassword',
        teacherId: teacherId.trim().toUpperCase(),
        newPassword: newPassword.trim(),
        timestamp: new Date().toISOString()
      })
    });

    const data = await response.json();
    if (data && (data.status === 'success' || data.success)) {
      return {
        success: true,
        message: data.message || `Password for ${teacherId} synchronized to Google Sheet.`
      };
    }

    // Fallback: full save
    const fullSave = await saveTeacherRegistryToGAS(loadTeacherAccounts(), loadTeacherAllotments(), providedUrl);
    return fullSave;
  } catch (err: any) {
    console.warn('[TeacherSync] Password sync notice:', err?.message);
    // Fallback to full save
    try {
      return await saveTeacherRegistryToGAS(loadTeacherAccounts(), loadTeacherAllotments(), providedUrl);
    } catch {
      return {
        success: true,
        message: 'Password saved locally. Will sync to Google Sheet when online.'
      };
    }
  }
}

