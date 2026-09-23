/**
 * Central browser API service. Every portal request goes through here →
 * /api/gas (server proxy) → Google Apps Script. Components never call fetch
 * directly.
 */
import type {
  Achievement, Certificate, EventDetail, EventSummary, Membership, Notification, Page, Payment, Plan, Registration, Row, SessionUser,
  StudentDashboard, StudentProfile, StudentResult,
} from './types';

export class ApiError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

const FRIENDLY = 'Something went wrong. Please try again.';

async function post<T>(url: string, body: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), credentials: 'same-origin' });
  } catch {
    throw new ApiError('NETWORK', 'Unable to reach the server. Check your connection and try again.');
  }
  const json = await res.json().catch(() => null);
  if (!json) throw new ApiError('BAD_RESPONSE', FRIENDLY);
  if (!json.success) {
    if (json.error === 'UNAUTHORIZED' && typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('sa:unauthorized'));
    throw new ApiError(json.error || 'ERROR', json.message || FRIENDLY);
  }
  return json.data as T;
}

export function call<T = unknown>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
  return post<T>('/api/gas', { action, payload });
}

export type FilePayload = { name: string; mimeType: string; base64: string };
export type Paged<T> = Page<T> & { summary?: Record<string, number>; facets?: Record<string, string[]>; columns?: string[]; primaryKey?: string };

type StartPayment =
  | { gateway: 'NONE'; status: 'SUCCESS'; payment: Payment }
  | { gateway: 'MANUAL'; instructions: string; amount: number; currency: string; reference: string; payment: Payment }
  | { gateway: 'RAZORPAY'; keyId: string; orderId: string; amount: number; currency: string; name: string; description: string;
      prefill: { name: string; email: string }; payment: Payment };

export const api = {
  /* ---------- Auth ---------- */
  login: (email: string, password: string) => post<{ user: SessionUser }>('/api/auth/login', { email, password }),
  adminLogin: (email: string, password: string) => post<{ user: SessionUser }>('/api/auth/admin-login', { email, password }),
  register: (data: Record<string, unknown>) => post<{ user: SessionUser }>('/api/auth/register', data),
  googleLogin: (credential: string, portal: 'student' | 'admin') => post<{ user: SessionUser }>('/api/auth/google', { credential, portal }),
  logout: () => post<{ loggedOut: boolean }>('/api/auth/logout', {}),
  me: () => call<SessionUser>('me'),
  completeProfile: (data: Record<string, unknown>) => call<SessionUser>('completeProfile', data),
  changePassword: (currentPassword: string, newPassword: string) => call('changePassword', { currentPassword, newPassword }),

  /* ---------- Public (client-side) ---------- */
  getEvent: (slug: string) => call<EventDetail>('getEvent', { slug }),
  getPlans: () => call<Plan[]>('getMembershipPlans'),
  submitContact: (data: Record<string, unknown>) => call<{ submitted: boolean; reference?: string }>('submitContact', data),

  /* ---------- Student ---------- */
  getStudentDashboard: () => call<StudentDashboard>('getStudentDashboard'),
  getStudentProfile: () => call<StudentProfile>('getStudentProfile'),
  updateStudentProfile: (data: Record<string, unknown>) => call<StudentProfile>('updateStudentProfile', data),
  getStudentMembership: () => call<{ memberships: Membership[]; plans: Plan[]; student: StudentProfile }>('getStudentMembership'),
  getStudentEvents: () => call<{ upcoming: EventSummary[]; registered: Registration[]; past: Registration[] }>('getStudentEvents'),
  getStudentRegistrations: () => call<{ events: Registration[]; programs: { id: string; programName: string; programSlug: string; status: string; paymentId: string; date: string }[] }>('getStudentRegistrations'),
  getRegistration: (registrationId: string) => call<Registration>('getStudentRegistrations', { registrationId }),
  registerEvent: (eventId: string, categoryId: string, acceptTerms: boolean) =>
    call<{ registration: Registration; payment: Payment; nextStep: 'PAYMENT' | 'CONFIRMED' }>('registerForEvent', { eventId, categoryId, acceptTerms }),
  cancelRegistration: (registrationId: string) => call('cancelMyRegistration', { registrationId }),
  getStudentResults: () => call<StudentResult[]>('getStudentResults'),
  getStudentCertificates: () => call<Certificate[]>('getStudentCertificates'),
  getStudentAchievements: () => call<Achievement[]>('getStudentAchievements'),
  getStudentPayments: () => call<Payment[]>('getStudentPayments'),
  getNotifications: (page = 1) => call<Page<Notification>>('getNotifications', { page }),
  markNotificationRead: (notificationId?: string) => call('markNotificationRead', notificationId ? { notificationId } : { all: true }),
  getMyDocuments: () => call<{ id: string; type: string; fileName: string; mimeType: string; status: string; createdAt: string }[]>('getMyDocuments'),
  uploadDocument: (documentType: string, file: FilePayload) => call('uploadMyDocument', { documentType, file }),
  downloadDocument: (documentId: string) => call<{ fileName: string; mimeType: string; base64: string }>('downloadDocument', { documentId }),
  applyMembership: (planId: string, acceptTerms: boolean, documents: { type: string; file: FilePayload }[]) =>
    call<{ membership: Membership; payment: Payment; nextStep: string }>('applyMembership', { planId, acceptTerms, documents }),
  registerProgram: (programId: string) => call<{ registration: { id: string; programName: string; status: string }; payment: Payment; nextStep: string }>('registerForProgram', { programId }),
  startPayment: (paymentId: string) => call<StartPayment>('startPayment', { paymentId }),
  verifyPayment: (data: Record<string, unknown>) => call<{ status: string; payment: Payment }>('verifyPayment', data),
  submitPaymentReference: (paymentId: string, reference: string) => call<{ submitted: boolean; payment: Payment }>('submitPaymentReference', { paymentId, reference }),

  /* ---------- Admin ---------- */
  admin: {
    call: <T = unknown>(action: string, payload: Record<string, unknown> = {}) => call<T>('admin.' + action, payload),
    dashboard: <T>() => call<T>('admin.getAdminDashboard'),
    list: (entity: string, params: Record<string, unknown> = {}) => call<Paged<Row>>('admin.list', { entity, ...params }),
    get: (entity: string, id: string) => call<Row>('admin.get', { entity, id }),
    save: (entity: string, data: Record<string, unknown>, id?: string, updatedAt?: string) => call<Row>('admin.save', { entity, data, id, updatedAt }),
    setStatus: (entity: string, id: string, status: string) => call<Row>('admin.setStatus', { entity, id, status }),
    remove: (entity: string, id: string, permanent = false) => call<{ deleted: boolean; archived: boolean }>('admin.delete', { entity, id, permanent }),
    bulkStatus: (entity: string, ids: string[], status: string) => call('admin.bulkStatus', { entity, ids, status }),
    upload: (target: string, file: FilePayload, extra: Record<string, unknown> = {}) =>
      call<{ url: string; viewUrl?: string; fileId?: string; record?: Row }>('admin.upload', { target, file, ...extra }),
    export: (params: Record<string, unknown>) =>
      call<{ filename: string; mimeType?: string; content?: string; url?: string; xlsxUrl?: string; rows: number }>('admin.export', params),
  },
};

/** Triggers a browser download of text content (CSV with BOM so Excel detects UTF-8). */
export function downloadText(filename: string, content: string, mime = 'text/csv') {
  const blob = new Blob([mime === 'text/csv' ? '﻿' + content : content], { type: mime + ';charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadBase64(filename: string, base64: string, mime: string) {
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const url = URL.createObjectURL(new Blob([bytes], { type: mime }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
