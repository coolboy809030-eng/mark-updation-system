import { TeacherAccount, TeacherAllotment, ClassLevel } from '../types';
import { SystemControlConfig, ClassSubjectAllotmentMap } from '../types/resultTypes';
import {
  saveTeacherAccounts,
  loadTeacherAccounts,
  saveTeacherAllotments,
  loadTeacherAllotments
} from '../utils/teacherAccount';
import {
  saveCanonicalCurriculum,
  loadCanonicalCurriculum
} from '../utils/subjectCurriculum';
import { getEffectiveGasUrl } from '../config/appConfig';
import { MASTER_ADMIN_PIN } from '../data/schoolConfig';

export const SYSTEM_CONFIG_STORAGE_KEY = 'pis_system_control_config_v1';
export const SEGMENT_LOCKS_STORAGE_KEY = 'pis_segment_locks_v1';
export const ADMIN_PIN_STORAGE_KEY = 'pis_admin_master_pin_v1';

export interface SchoolConfigResult {
  success: boolean;
  systemConfig: SystemControlConfig;
  subjectAllotments: ClassSubjectAllotmentMap;
  segmentLocks: Record<string, boolean>;
  teacherAccounts: TeacherAccount[];
  teacherAllotments: TeacherAllotment[];
  message: string;
  source: 'cloud_sheet' | 'local_cache' | 'offline_fallback';
}

/**
 * Fetch unified school configuration from Google Sheet (_SYSTEM_CONFIG & _TEACHERS)
 * Provides cross-device synchronization and eliminates the LocalStorage Trap.
 */
export async function fetchSchoolConfigFromGAS(
  providedUrl?: string
): Promise<SchoolConfigResult> {
  const scriptUrl = getEffectiveGasUrl(providedUrl);

  const localDefaults = getFallbackLocalConfig();

  if (!scriptUrl || scriptUrl.includes('PASTE_YOUR')) {
    return {
      success: false,
      ...localDefaults,
      message: 'Google Sheet Web App URL not configured; using local offline cache.',
      source: 'offline_fallback'
    };
  }

  try {
    const urlWithParams = `${scriptUrl}?action=getSchoolConfig&timestamp=${Date.now()}`;
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

    if (data && (data.status === 'success' || data.success)) {
      // 1. System Config
      let resolvedSystemConfig = localDefaults.systemConfig;
      if (data.systemConfig && typeof data.systemConfig === 'object') {
        const cloudPin = typeof data.systemConfig.adminPin === 'string' && data.systemConfig.adminPin.trim()
          ? data.systemConfig.adminPin.trim()
          : (data.adminPin && typeof data.adminPin === 'string' ? data.adminPin.trim() : resolvedSystemConfig.adminPin);

        resolvedSystemConfig = {
          marksEntryStatus: data.systemConfig.marksEntryStatus === 'OFF' ? 'OFF' : 'ON',
          marksEntryDeadline: data.systemConfig.marksEntryDeadline || resolvedSystemConfig.marksEntryDeadline,
          workingDaysHY: typeof data.systemConfig.workingDaysHY === 'number' ? data.systemConfig.workingDaysHY : (parseInt(data.systemConfig.workingDaysHY) || 110),
          workingDaysAE: typeof data.systemConfig.workingDaysAE === 'number' ? data.systemConfig.workingDaysAE : (parseInt(data.systemConfig.workingDaysAE) || 115),
          academicSession: data.systemConfig.academicSession || '2025-2026',
          adminPin: cloudPin || MASTER_ADMIN_PIN
        };
        try {
          localStorage.setItem(SYSTEM_CONFIG_STORAGE_KEY, JSON.stringify(resolvedSystemConfig));
          if (cloudPin) {
            localStorage.setItem(ADMIN_PIN_STORAGE_KEY, cloudPin);
          }
        } catch {}
      }

      // 2. Subject Allotments (Curriculum)
      let resolvedSubjectAllotments = localDefaults.subjectAllotments;
      if (data.subjectAllotments && typeof data.subjectAllotments === 'object' && Object.keys(data.subjectAllotments).length > 0) {
        resolvedSubjectAllotments = data.subjectAllotments;
        saveCanonicalCurriculum(resolvedSubjectAllotments);
      }

      // 3. Segment Locks
      let resolvedSegmentLocks = localDefaults.segmentLocks;
      if (data.segmentLocks && typeof data.segmentLocks === 'object') {
        resolvedSegmentLocks = data.segmentLocks;
        try {
          localStorage.setItem(SEGMENT_LOCKS_STORAGE_KEY, JSON.stringify(resolvedSegmentLocks));
        } catch {}
      }

      // 4. Teacher Accounts
      let resolvedAccounts = localDefaults.teacherAccounts;
      const rawAccounts = data.teacherAccounts || data.accounts;
      if (Array.isArray(rawAccounts) && rawAccounts.length > 0) {
        resolvedAccounts = rawAccounts;
        saveTeacherAccounts(resolvedAccounts);
      }

      // 5. Teacher Allotments
      let resolvedAllotments = localDefaults.teacherAllotments;
      const rawAllotments = data.teacherAllotments || data.allotments;
      if (Array.isArray(rawAllotments) && rawAllotments.length > 0) {
        resolvedAllotments = rawAllotments;
        saveTeacherAllotments(resolvedAllotments);
      }

      return {
        success: true,
        systemConfig: resolvedSystemConfig,
        subjectAllotments: resolvedSubjectAllotments,
        segmentLocks: resolvedSegmentLocks,
        teacherAccounts: resolvedAccounts,
        teacherAllotments: resolvedAllotments,
        message: 'Successfully synced system controls, curriculum, and teacher registry from Google Sheet.',
        source: 'cloud_sheet'
      };
    }

    // Fallback if data structure is unexpected
    return {
      success: true,
      ...localDefaults,
      message: 'Cloud sheet response parsed; using combined cache.',
      source: 'local_cache'
    };
  } catch (err: any) {
    console.warn('[SchoolConfigSync] Notice:', err?.message);
    return {
      success: false,
      ...localDefaults,
      message: `Cloud sync notice: ${err?.message || 'Network unavailable'}. Using local storage.`,
      source: 'offline_fallback'
    };
  }
}

/**
 * Save System Control, Subject Allotments, and Segment Locks to Google Sheet
 */
export async function saveSchoolConfigToGAS(
  config: Partial<SystemControlConfig>,
  subjectAllotments?: ClassSubjectAllotmentMap,
  segmentLocks?: Record<string, boolean>,
  providedUrl?: string
): Promise<{ success: boolean; message: string }> {
  const scriptUrl = getEffectiveGasUrl(providedUrl);
  if (!scriptUrl || scriptUrl.includes('PASTE_YOUR')) {
    return {
      success: false,
      message: 'No Google Sheet API URL configured.'
    };
  }

  try {
    const response = await fetch(scriptUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify({
        action: 'saveSchoolConfig',
        config,
        subjectAllotments,
        segmentLocks,
        timestamp: new Date().toISOString()
      })
    });

    const data = await response.json();
    if (data && (data.status === 'success' || data.success)) {
      return {
        success: true,
        message: data.message || 'School configuration synced to Google Sheet (_SYSTEM_CONFIG).'
      };
    }

    return {
      success: false,
      message: data?.message || 'Google Sheet returned an error while saving configuration.'
    };
  } catch (err: any) {
    console.error('[SchoolConfigSync] Error:', err);
    return {
      success: false,
      message: `Failed to save configuration to Google Sheet: ${err?.message || 'Network error'}`
    };
  }
}

/**
 * Helper to get local fallback configuration from localStorage
 */
export function getFallbackLocalConfig(): {
  systemConfig: SystemControlConfig;
  subjectAllotments: ClassSubjectAllotmentMap;
  segmentLocks: Record<string, boolean>;
  teacherAccounts: TeacherAccount[];
  teacherAllotments: TeacherAllotment[];
} {
  // System Config
  let localPin = MASTER_ADMIN_PIN;
  try {
    const savedPin = localStorage.getItem(ADMIN_PIN_STORAGE_KEY);
    if (savedPin && savedPin.trim()) {
      localPin = savedPin.trim();
    }
  } catch {}

  let systemConfig: SystemControlConfig = {
    marksEntryStatus: 'ON',
    marksEntryDeadline: '2026-12-31T23:59',
    workingDaysHY: 110,
    workingDaysAE: 115,
    academicSession: '2025-2026',
    adminPin: localPin
  };
  try {
    const savedSys = localStorage.getItem(SYSTEM_CONFIG_STORAGE_KEY);
    if (savedSys) {
      const parsed = JSON.parse(savedSys);
      systemConfig = { ...systemConfig, ...parsed, adminPin: parsed.adminPin || localPin };
    }
  } catch {}

  // Subject Allotments
  const loadedCurriculum = loadCanonicalCurriculum();

  // Segment Locks
  let segmentLocks: Record<string, boolean> = {};
  try {
    const savedLocks = localStorage.getItem(SEGMENT_LOCKS_STORAGE_KEY);
    if (savedLocks) segmentLocks = JSON.parse(savedLocks);
  } catch {}

  // Teacher Registry
  const teacherAccounts = loadTeacherAccounts();
  const teacherAllotments = loadTeacherAllotments();

  return {
    systemConfig,
    subjectAllotments: loadedCurriculum.curriculum,
    segmentLocks,
    teacherAccounts,
    teacherAllotments
  };
}
