export type BackendActorType = 'teacher' | 'admin';

export interface BackendRequestContext {
  actorType: BackendActorType;
  action: string;
  requestId: string;
  timestamp: string;
  teacherId?: string;
  adminSession?: boolean;
  className?: string;
  section?: string;
  subject?: string;
  segment?: string;
  resourceType?: 'marks' | 'attendance' | 'student' | 'results';
  urns?: string[];
  isActiveTeacher?: boolean;
}

function safeUuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `req-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function createBackendRequestContext(options: {
  actorType: BackendActorType;
  action: string;
  teacherId?: string;
  adminSession?: boolean;
  className?: string;
  section?: string;
  subject?: string;
  segment?: string;
  resourceType?: 'marks' | 'attendance' | 'student' | 'results';
  urns?: string[];
  isActiveTeacher?: boolean;
}): BackendRequestContext {
  const teacherId = (options.teacherId || '').trim();

  return {
    actorType: options.actorType,
    action: options.action,
    requestId: safeUuid(),
    timestamp: new Date().toISOString(),
    teacherId: teacherId || undefined,
    adminSession: Boolean(options.adminSession),
    className: options.className,
    section: options.section,
    subject: options.subject,
    segment: options.segment,
    resourceType: options.resourceType,
    urns: Array.isArray(options.urns) ? options.urns.filter(Boolean) : [],
    isActiveTeacher: typeof options.isActiveTeacher === 'boolean' ? options.isActiveTeacher : Boolean(teacherId)
  };
}

export function validateTeacherRequestContext(context: Partial<BackendRequestContext> | null | undefined): boolean {
  if (!context) return false;
  if (context.actorType !== 'teacher') return false;
  const teacherId = (context.teacherId || '').trim();

  if (!teacherId) return false;
  if (context.isActiveTeacher === false) return false;
  if (!context.action) return false;
  return true;
}

export function validateProtectedStudentMutation(options: {
  teacherId?: string;
  isActiveTeacher?: boolean;
  className?: string;
  section?: string;
  subject?: string;
  segment?: string;
  urn?: string;
  urns?: string[];
  allowEmptyUrn?: boolean;
}): { valid: boolean; error?: string } {
  const teacherId = (options.teacherId || '').trim();
  if (!teacherId) {
    return { valid: false, error: 'Missing authenticated teacherId for protected mutation.' };
  }

  if (options.isActiveTeacher === false) {
    return { valid: false, error: 'Inactive teacher account is not authorized for protected mutation.' };
  }

  const urnList = Array.isArray(options.urns) ? options.urns.filter(Boolean) : [];
  const urn = (options.urn || '').trim();
  const hasUrn = Boolean(urn || urnList.length > 0);

  if (!hasUrn && !options.allowEmptyUrn) {
    return { valid: false, error: 'Protected mutation requires an authoritative URN.' };
  }

  if (urnList.length > 1 && !options.allowEmptyUrn) {
    const uniqueUrns = new Set(urnList);
    if (uniqueUrns.size !== urnList.length) {
      return { valid: false, error: 'Duplicate URNs detected in protected mutation payload.' };
    }
  }

  if (!options.className) {
    return { valid: false, error: 'Protected mutation requires a className.' };
  }

  if (!options.section) {
    return { valid: false, error: 'Protected mutation requires a section.' };
  }

  if (!options.subject && options.subject !== '') {
    return { valid: false, error: 'Protected mutation requires a subject.' };
  }

  if (!options.segment) {
    return { valid: false, error: 'Protected mutation requires a segment/term.' };
  }

  return { valid: true };
}

export function buildProtectedPayload<T extends Record<string, any>>(payload: T, context: BackendRequestContext): T & { auth: BackendRequestContext } {
  return {
    ...payload,
    auth: context
  };
}
