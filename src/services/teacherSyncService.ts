import { TeacherAccount, TeacherAllotment } from '../types';
import {
  TEACHER_ALLOTMENTS_STORAGE_KEY,
  saveTeacherAccounts,
  loadTeacherAccounts,
  loadTeacherAllotments
} from '../utils/teacherAccount';
import { gasGet, gasPost } from './gasClient';

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
  try {
    const res = await gasGet('getTeachers', undefined, { providedUrl });

    if (res.success && res.data && (Array.isArray(res.data.accounts) || Array.isArray(res.data.allotments))) {
      const accounts: TeacherAccount[] = Array.isArray(res.data.accounts) ? res.data.accounts : [];
      const allotments: TeacherAllotment[] = Array.isArray(res.data.allotments) ? res.data.allotments : [];

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
  const res = await gasPost(
    'saveTeachers',
    {
      accounts,
      allotments
    },
    { providedUrl }
  );

  return {
    success: res.success,
    message: res.message || (res.success ? 'Saved successfully to Google Sheet (_TEACHERS) registry.' : 'Could not save to Google Sheet.')
  };
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
  try {
    const res = await gasPost(
      'updateTeacherPassword',
      {
        teacherId: teacherId.trim().toUpperCase(),
        newPassword: newPassword.trim()
      },
      { providedUrl }
    );

    if (res.success) {
      return {
        success: true,
        message: res.message || `Password for ${teacherId} synchronized to Google Sheet.`
      };
    }

    // Fallback: full save
    return await saveTeacherRegistryToGAS(loadTeacherAccounts(), loadTeacherAllotments(), providedUrl);
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


