export type CorrectionRequestStatus = 'Pending' | 'Approved' | 'Rejected' | 'Completed';

export interface CorrectionRequest {
  id: string;
  teacherId: string;
  teacherName: string;
  urn: string;
  className: string;
  section: string;
  subject: string;
  segment: string;
  oldValue: string;
  requestedValue: string;
  reason: string;
  status: CorrectionRequestStatus;
  createdAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  completedAt?: string;
}

export const CORRECTION_REQUESTS_STORAGE_KEY = 'pis_marks_correction_requests_v1';

export const loadCorrectionRequests = (): CorrectionRequest[] => {
  try {
    const raw = localStorage.getItem(CORRECTION_REQUESTS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const saveCorrectionRequests = (requests: CorrectionRequest[]) => {
  try {
    localStorage.setItem(CORRECTION_REQUESTS_STORAGE_KEY, JSON.stringify(requests));
    window.dispatchEvent(new CustomEvent('correction_requests_updated'));
  } catch {
    // Correction history must not crash mark entry.
  }
};

export const createCorrectionRequest = (
  request: Omit<CorrectionRequest, 'id' | 'status' | 'createdAt'>
): CorrectionRequest => ({
  ...request,
  id: `corr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
  status: 'Pending',
  createdAt: new Date().toISOString()
});

export const matchesCorrectionScope = (
  request: CorrectionRequest,
  scope: Omit<CorrectionRequest, 'id' | 'status' | 'createdAt' | 'reviewedAt' | 'reviewedBy' | 'completedAt' | 'reason'>
) => request.teacherId === scope.teacherId &&
  request.urn === scope.urn &&
  request.className === scope.className &&
  request.section === scope.section &&
  request.subject === scope.subject &&
  request.segment === scope.segment;

export const findApprovedCorrection = (
  requests: CorrectionRequest[],
  scope: Parameters<typeof matchesCorrectionScope>[1],
  requestedValue: string,
  oldValue: string
) => requests.find(request =>
  request.status === 'Approved' &&
  request.oldValue === oldValue &&
  request.requestedValue === requestedValue &&
  matchesCorrectionScope(request, scope)
);