export type MarkStatus =
  | 'Pending'
  | 'Entered'
  | 'Updated'
  | 'Sync Pending'
  | 'Cloud Synced'
  | 'Locked';

interface MarkStatusRecord {
  status: MarkStatus;
  value: string;
  previousValue?: string;
  updatedAt: string;
}

const MARKS_STATUS_STORAGE_KEY = 'pis_marks_status_v1';

const getStatusKey = (
  className: string,
  subject: string,
  segment: string,
  entryType: string,
  urn: string,
  scope = ''
) => [className, subject, segment, entryType, urn, scope].map(part => encodeURIComponent(part)).join('|');

const readStatusStore = (): Record<string, MarkStatusRecord> => {
  try {
    const saved = localStorage.getItem(MARKS_STATUS_STORAGE_KEY);
    if (!saved) return {};
    const parsed = JSON.parse(saved);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

const writeStatusStore = (store: Record<string, MarkStatusRecord>) => {
  try {
    localStorage.setItem(MARKS_STATUS_STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Status metadata must never block the existing mark save.
  }
};

export const getMarkStatus = (
  className: string,
  subject: string,
  segment: string,
  entryType: string,
  urn: string,
  value: string,
  scope = ''
): MarkStatus => {
  if (!value) return 'Pending';

  const record = readStatusStore()[getStatusKey(className, subject, segment, entryType, urn, scope)];
  return record && record.value === value ? record.status : 'Entered';
};

export const saveMarkStatus = (
  className: string,
  subject: string,
  segment: string,
  entryType: string,
  urn: string,
  value: string,
  previousValue: string,
  status: MarkStatus,
  scope = ''
) => {
  if (!className || !urn) return;

  const store = readStatusStore();
  store[getStatusKey(className, subject, segment, entryType, urn, scope)] = {
    status,
    value,
    previousValue: previousValue || undefined,
    updatedAt: new Date().toISOString()
  };
  writeStatusStore(store);
};

export const getMarkStatuses = (
  className: string,
  subject: string,
  segment: string,
  entryType: string,
  values: Record<string, string>,
  scope = ''
): Record<string, MarkStatus> => {
  const statuses: Record<string, MarkStatus> = {};
  Object.entries(values).forEach(([urn, value]) => {
    statuses[urn] = getMarkStatus(className, subject, segment, entryType, urn, value, scope);
  });
  return statuses;
};