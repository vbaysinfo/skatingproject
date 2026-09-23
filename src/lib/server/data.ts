import 'server-only';
import { cache } from 'react';
import { callGas, gasData } from './gas';
import type {
  Announcement, ApiResult, Certification, EventDetail, EventPage, GalleryItem, HomeData, HomeStats, Page, Plan, Program, RankingRow,
  ResultGroup, Settings, Sponsor, Video, EventSummary,
} from '@/lib/types';

/**
 * Public data access for server components. Each function makes ONE cached
 * GET to Apps Script (which itself batch-reads the sheets and caches with
 * CacheService). Requests are de-duplicated per render with React cache().
 */

export const DEFAULT_SETTINGS: Settings = {
  SITE_NAME: 'Skating Association',
  SITE_SHORT_NAME: 'SKATE',
  SITE_TAGLINE: 'Official governing body for roller skating',
  SITE_LOGO: '',
  TIMEZONE: process.env.ASSOCIATION_TIMEZONE || 'Asia/Kolkata',
  DEFAULT_CURRENCY: 'INR',
  PAYMENT_GATEWAY: 'MANUAL',
  GOOGLE_CLIENT_ID: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '',
};

export const getSettings = cache(async (): Promise<Settings> => {
  const s = await gasData<Settings>('getSettings');
  return s ? { ...DEFAULT_SETTINGS, ...s, GOOGLE_CLIENT_ID: s.GOOGLE_CLIENT_ID || DEFAULT_SETTINGS.GOOGLE_CLIENT_ID } : DEFAULT_SETTINGS;
});

export const getHome = cache(() => gasData<HomeData>('getHome'));
export const getAbout = cache(() =>
  gasData<{ intro: string; full: string; vision: string; mission: string; image: string; stats: HomeStats; sponsors: Sponsor[] }>('getAbout'));
export const getPage = cache((page: 'privacy' | 'terms') => gasData<{ title: string; content: string }>('getPage', { page }));

export type EventQuery = { tab?: string; type?: string; state?: string; city?: string; q?: string; page?: number; month?: string; pageSize?: number };

export const getEvents = cache((q: EventQuery) => {
  const payload: Record<string, unknown> = {};
  Object.entries(q).forEach(([k, v]) => { if (v !== undefined && v !== '' && v !== null) payload[k] = v; });
  return gasData<EventPage>('getEvents', payload);
});

/** Returns the event, null if it does not exist, or undefined when the API failed. */
export const getEvent = cache(async (slug: string): Promise<EventDetail | null | undefined> => {
  const r: ApiResult<EventDetail> = await callGas<EventDetail>('getEvent', { slug }, { cacheable: true });
  if (r.success) return r.data;
  return r.error === 'NOT_FOUND' ? null : undefined;
});

export const getEventResults = cache((slug: string) =>
  gasData<{ event: EventSummary; categories: ResultGroup[] }>('getEventResults', { slug }));

export const getPrograms = cache((type?: string) =>
  gasData<{ items: Program[]; certifications: Certification[] }>('getPrograms', type ? { type } : {}));

export const getProgram = cache(async (slug: string): Promise<Program | null | undefined> => {
  const r = await callGas<Program>('getProgram', { slug }, { cacheable: true });
  if (r.success) return r.data;
  return r.error === 'NOT_FOUND' ? null : undefined;
});

export const getGallery = cache((category?: string, page?: number) =>
  gasData<Page<GalleryItem> & { categories: string[] }>('getGallery', { ...(category ? { category } : {}), ...(page ? { page } : {}) }));

export const getVideos = cache((category?: string) => gasData<{ items: Video[]; categories: string[] }>('getVideos', category ? { category } : {}));
export const getPlans = cache(() => gasData<Plan[]>('getMembershipPlans'));
export const getAnnouncements = cache(() => gasData<Announcement[]>('getAnnouncements'));

export const getRankings = cache((q: Record<string, string | number | undefined>) => {
  const payload: Record<string, unknown> = {};
  Object.entries(q).forEach(([k, v]) => { if (v !== undefined && v !== '') payload[k] = v; });
  return gasData<Page<RankingRow> & { facets: { years: string[]; categories: string[]; ageGroups: string[]; genders: string[]; cities: string[] } }>(
    'getRankings', payload);
});

export const verifyMembership = cache((id: string) =>
  gasData<{ found: boolean; name?: string; membershipType?: string; memberId?: string; validFrom?: string; validUntil?: string; status?: string; valid?: boolean }>(
    'verifyMembership', { id }));

export const verifyCertificate = cache((id: string) =>
  gasData<{ found: boolean; certificateNumber?: string; studentName?: string; event?: string; certification?: string; achievement?: string;
    certificateType?: string; issueDate?: string; expiryDate?: string; status?: string; valid?: boolean }>('verifyCertificate', { id }));
