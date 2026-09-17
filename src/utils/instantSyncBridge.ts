import { FullStudentExamRecord } from '../types/resultTypes';
import { SheetSubmissionRecord } from '../types';
import { getInitialClassExamRecords } from '../data/mockResultData';
import { getStudentURN, normalizeURN } from './studentIdentity';
import { formatDisplayTime } from './dateFormatter';

export interface SyncStatusInfo {
  state: 'idle' | 'syncing' | 'synced' | 'offline_saved' | 'error';
  lastSyncedTime: string | null;
  message: string;
  pendingCount: number;
}

type SyncListener = (status: SyncStatusInfo) => void;

class InstantSyncBridge {
  private listeners: Set<SyncListener> = new Set();
  private pendingQueue: Array<{
    scriptUrl: string;
    payload: any;
    className: string;
    onSuccess?: (msg: string) => void;
    onError?: (err: string) => void;
  }> = [];
  private isProcessingQueue = false;
  private readonly requestTimeoutMs = 15000;
  private currentStatus: SyncStatusInfo = {
    state: 'idle',
    lastSyncedTime: null,
    message: 'सिस्टम तैयार है (Ready)',
    pendingCount: 0
  };

  constructor() {
    // Listen for storage events across tabs or iframes
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e) => {
        if (e.key && e.key.startsWith('pis_exam_results_')) {
          const className = e.key.replace('pis_exam_results_', '').replace('_2025', '');
          this.emitLocalSync(className);
        }
      });
    }
  }

  public subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    listener(this.currentStatus);
    return () => this.listeners.delete(listener);
  }

  private notify(update: Partial<SyncStatusInfo>) {
    this.currentStatus = { ...this.currentStatus, ...update };
    this.listeners.forEach((fn) => fn(this.currentStatus));
  }

  public getStatus(): SyncStatusInfo {
    return this.currentStatus;
  }

  public retryPendingSync() {
    this.processQueue();
  }

  /**
   * Emit local instant event to all listening components
   */
  public emitLocalSync(className: string) {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('pis_instant_sync', {
          detail: { className, timestamp: Date.now() }
        })
      );
    }
  }

  /**
   * Load current exam records for class from localStorage or default
   */
  public getClassRecords(className: string): FullStudentExamRecord[] {
    const cacheKey = `pis_exam_results_${className}_2025`;
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to parse cached exam records for class', className, e);
    }

    // Default fallback
    const defaults = getInitialClassExamRecords(className as any).map((st) => {
      const urn = getStudentURN(st);
      const savedPhoto = urn ? localStorage.getItem(`pis_photo_${urn}`) : '';
      return savedPhoto ? { ...st, photoUrl: savedPhoto } : st;
    });

    try {
      localStorage.setItem(cacheKey, JSON.stringify(defaults));
    } catch {}

    return defaults;
  }

  /**
   * Instantly save a single mark into the master exam records (0ms lag)
   * Authoritative URN is the ONLY identity for student mutation.
   * If authoritative URN is missing or student is not found by URN, does not mutate.
   */
  public saveSingleMarkInstant(
    className: string,
    rollOrIdentifier: string | number,
    subject: string,
    segment: string,
    val: string | number,
    entryType: 'marks' | 'attendance' = 'marks',
    explicitUrn?: string
  ) {
    if (!className) return;
    const records = this.getClassRecords(className);
    const targetUrn = normalizeURN(explicitUrn || rollOrIdentifier);

    if (!targetUrn) {
      console.warn(`[Identity Enforcer] Blocked single mark mutation: Missing authoritative URN for identifier: "${rollOrIdentifier}"`);
      return;
    }

    let updated = false;
    const nextRecords = records.map((st) => {
      const stUrn = getStudentURN(st);
      // Authoritative URN ONLY - Never fallback to roll
      const isUrnMatch = Boolean(stUrn && targetUrn === stUrn);

      if (isUrnMatch) {
        updated = true;
        const newRawMarks = { ...(st.rawMarks || {}) };

        if (entryType === 'attendance') {
          const attVal = val === '' ? undefined : val;
          if (segment === 'AE' || segment === 'Attendance-AE') {
            st.attendanceAE = attVal ? String(attVal) : undefined;
          } else {
            st.attendanceHY = attVal ? String(attVal) : undefined;
          }
        } else {
          // Standard subject marks
          const parsedVal = val === 'AB' ? 'AB' : val === '' ? undefined : Number(val);
          const keys = [
            `${subject} ${segment}`,
            `${subject}-${segment}`,
            segment === 'HY' || segment === 'AE' ? `${subject}-${segment}-WRT` : null,
            segment === 'HY' || segment === 'AE' ? `${subject} ${segment}-WRT` : null
          ].filter(Boolean) as string[];

          keys.forEach((k) => {
            if (parsedVal === undefined) {
              delete newRawMarks[k];
            } else {
              newRawMarks[k] = parsedVal;
            }
          });
        }

        return {
          ...st,
          rawMarks: newRawMarks
        };
      }
      return st;
    });

    if (updated) {
      const cacheKey = `pis_exam_results_${className}_2025`;
      try {
        localStorage.setItem(cacheKey, JSON.stringify(nextRecords));
      } catch (e) {
        console.warn('LocalStorage quota or write error', e);
      }
      this.emitLocalSync(className);
    }
  }

  /**
   * Instantly save a batch of records (e.g. whole class or subject) into master records
   * Uses authoritative URN as the ONLY identity. Never mutates by roll.
   */
  public saveBatchMarksInstant(className: string, recordsToSubmit: SheetSubmissionRecord[]) {
    if (!className || recordsToSubmit.length === 0) return;

    const currentRecords = this.getClassRecords(className);
    const urnMap = new Map<string, SheetSubmissionRecord[]>();

    recordsToSubmit.forEach((rec) => {
      const urn = getStudentURN(rec);
      if (urn) {
        const list = urnMap.get(urn) || [];
        list.push(rec);
        urnMap.set(urn, list);
      } else {
        console.warn(`[Identity Enforcer] Batch submission record skipped: Missing authoritative URN for Roll ${rec.roll} (${rec.name})`);
      }
    });

    const nextRecords = currentRecords.map((st) => {
      const stUrn = getStudentURN(st);
      // Authoritative URN ONLY - Never fallback to roll
      if (!stUrn) return st;

      const submissions = urnMap.get(stUrn);
      if (!submissions || submissions.length === 0) return st;

      const newRawMarks = { ...(st.rawMarks || {}) };
      let newAttHY = st.attendanceHY;
      let newAttAE = st.attendanceAE;

      submissions.forEach((rec) => {
        if (rec.type === 'Attendance' || rec.segment === 'Attendance') {
          if (rec.examType === 'AE') {
            newAttAE = String(rec.value);
          } else {
            newAttHY = String(rec.value);
          }
        } else {
          const val = rec.value;
          const subject = rec.subject;
          const segment = rec.segment;
          const type = rec.type;

          const keys = [
            `${subject} ${segment}`,
            `${subject}-${segment}`,
            `${subject} ${type}`,
            `${subject}-${type}`
          ];

          keys.forEach((k) => {
            newRawMarks[k] = val;
          });
        }
      });

      return {
        ...st,
        rawMarks: newRawMarks,
        attendanceHY: newAttHY,
        attendanceAE: newAttAE
      };
    });

    const cacheKey = `pis_exam_results_${className}_2025`;
    try {
      localStorage.setItem(cacheKey, JSON.stringify(nextRecords));
    } catch (e) {
      console.warn('LocalStorage quota or write error in batch', e);
    }

    this.emitLocalSync(className);
  }

  /**
   * Extract existing marks for a given class, subject and segment to prefill Mark Entry table.
   * Returns values keyed by both authoritative URN and roll for seamless compatibility.
   */
  public extractExistingMarks(
    className: string,
    subject: string,
    segment: string,
    entryType: 'marks' | 'attendance' = 'marks',
    examType: 'HY' | 'AN' | 'BOTH' = 'HY'
  ): Record<string, string> {
    const result: Record<string, string> = {};
    if (!className) return result;

    const records = this.getClassRecords(className);
    records.forEach((st) => {
      const rollStr = String(st.roll).trim();
      const urn = getStudentURN(st);
      let markFound: string | undefined;

      if (entryType === 'attendance') {
        const att = examType === 'AN' || segment === 'AE' ? st.attendanceAE : st.attendanceHY;
        if (att !== undefined && att !== null) {
          // If in format "95/110", extract presented days "95"
          const match = String(att).split('/')[0];
          markFound = match ? match.trim() : String(att);
        }
      } else {
        // Look for mark in rawMarks
        const possibleKeys = [
          `${subject} ${segment}`,
          `${subject}-${segment}`,
          `${subject}-${segment}-WRT`,
          `${subject} ${segment}-WRT`,
          `${subject}_${segment}`,
          `${subject}_${segment}_WRT`
        ];

        for (const k of possibleKeys) {
          if (st.rawMarks && st.rawMarks[k] !== undefined && st.rawMarks[k] !== '') {
            markFound = String(st.rawMarks[k]);
            break;
          }
        }
      }

      if (markFound !== undefined) {
        if (urn) {
          result[urn] = markFound;
        }
        result[rollStr] = markFound;
      }
    });

    return result;
  }

  /**
   * Queue background non-blocking sync to Google Sheets (Optimistic UI)
   */
  public queueSheetSync(
    scriptUrl: string,
    payload: any,
    className: string,
    onSuccess?: (msg: string) => void,
    onError?: (err: string) => void
  ) {
    if (!scriptUrl || scriptUrl.includes('PASTE_YOUR')) {
      this.notify({
        state: 'offline_saved',
        message: 'स्थानीय रूप से सुरक्षित (ऑफ़लाइन / बिना Google Sheet)',
        pendingCount: 0
      });
      if (onSuccess) onSuccess('स्थानीय रूप से सुरक्षित (Local Session)');
      return;
    }

    const operationKey = this.getOperationKey(scriptUrl, payload, className);
    const alreadyQueued = this.pendingQueue.some(item =>
      this.getOperationKey(item.scriptUrl, item.payload, item.className) === operationKey
    );
    if (alreadyQueued) return;

    this.pendingQueue.push({ scriptUrl, payload, className, onSuccess, onError });
    this.notify({
      state: 'syncing',
      message: 'क्लाउड पर भेजा जा रहा है...',
      pendingCount: this.pendingQueue.length
    });

    this.processQueue();
  }

  private getOperationKey(scriptUrl: string, payload: any, className: string): string {
    let serializedPayload = '';
    try {
      serializedPayload = JSON.stringify(payload);
    } catch {
      serializedPayload = String(payload);
    }
    return `${className}|${scriptUrl}|${serializedPayload}`;
  }

  private async processQueue() {
    if (this.isProcessingQueue || this.pendingQueue.length === 0) return;
    this.isProcessingQueue = true;

    const item = this.pendingQueue[0];
    if (!item) {
      this.isProcessingQueue = false;
      return;
    }

    try {
      this.notify({
        state: 'syncing',
        message: `Google Sheet से सिंक हो रहा है (कक्षा ${item.className})...`,
        pendingCount: this.pendingQueue.length
      });

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.requestTimeoutMs);
      let response: Response;
      try {
        response = await fetch(item.scriptUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(item.payload),
          signal: controller.signal
        });
      } finally {
        clearTimeout(timeoutId);
      }

      if (!response.ok) {
        throw new Error(`Google Sheet request failed (${response.status})`);
      }

      let data: any;
      try {
        data = await response.json();
      } catch {
        throw new Error('Google Sheet returned an invalid JSON response');
      }

      if (!data || typeof data !== 'object') {
        throw new Error('Google Sheet returned an empty response');
      }
      if (data.status !== undefined && data.status !== 'success') {
        throw new Error(data.message || 'Google Sheet rejected the update');
      }
      if (data.success !== undefined && data.success !== true) {
        throw new Error(data.message || 'Google Sheet rejected the update');
      }

      this.pendingQueue.shift();

      const nowStr = formatDisplayTime(new Date());

      this.notify({
        state: 'synced',
        lastSyncedTime: nowStr,
        message: `✅ Google Sheet सिंक सफल (${nowStr})`,
        pendingCount: this.pendingQueue.length
      });

      try {
        if (item.onSuccess) {
          item.onSuccess(data.message || 'Google Sheet पर सफलतापूर्वक अपडेट हो गया!');
        }
      } catch (callbackError) {
        console.warn('Sync success callback warning:', callbackError);
      }
    } catch (err: any) {
      const failedItem = this.pendingQueue.shift();
      if (failedItem) this.pendingQueue.push(failedItem);

      console.warn('Background sync warning:', err);
      this.notify({
        state: 'error',
        message: `सिंक एरर: ${err?.name === 'AbortError' ? 'अनुरोध समय समाप्त' : err?.message || 'इंटरनेट या URL जांचें'}. डेटा स्थानीय रूप से सुरक्षित है।`,
        pendingCount: this.pendingQueue.length
      });
      if (item.onError) {
        item.onError(err?.name === 'AbortError' ? 'Google Sheet sync timed out' : err?.message || 'Network error during Google Sheet sync');
      }
    } finally {
      this.isProcessingQueue = false;
      if (this.pendingQueue.length > 0 && this.currentStatus.state !== 'error') {
        setTimeout(() => this.processQueue(), 500);
      }
    }
  }
}

export const instantSyncBridge = new InstantSyncBridge();
