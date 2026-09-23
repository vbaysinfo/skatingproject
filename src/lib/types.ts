/** Shapes returned by the Apps Script API (see apps-script/src). */

export type ApiSuccess<T> = { success: true; data: T; message?: string };
export type ApiFailure = { success: false; error: string; message: string; status?: number };
export type ApiResult<T> = ApiSuccess<T> | ApiFailure;

export type Page<T> = { items: T[]; page: number; pageSize: number; total: number; totalPages: number };

export type Settings = Record<string, string> & {
  SITE_NAME: string;
  SITE_LOGO: string;
  TIMEZONE: string;
  DEFAULT_CURRENCY: string;
  PAYMENT_GATEWAY: string;
  GOOGLE_CLIENT_ID: string;
};

export type Lifecycle = 'UPCOMING' | 'ONGOING' | 'PAST' | 'CANCELLED';
export type RegistrationState = 'OPEN' | 'NOT_OPEN' | 'CLOSED' | 'FULL' | 'CANCELLED';

export type EventCategory = {
  id: string; name: string; ageGroup: string; gender: string; raceType: string; distance: string; entryFee: number;
  maxParticipants: number; registrationCount: number; registrationState: RegistrationState;
};

export type EventSummary = {
  id: string; code: string; name: string; slug: string; type: string; posterUrl: string; startDate: string; endDate: string;
  registrationStart: string; registrationDeadline: string; venue: string; city: string; state: string; entryFee: number; currency: string;
  maxParticipants: number; registrationCount: number; lifecycle: Lifecycle; registrationState: RegistrationState; daysUntilStart: number | null;
  featured: boolean; resultsPublished: boolean; galleryCount: number; certificatesAvailable: boolean; organizer: string; excerpt: string;
  isRegistered?: boolean;
};

export type ScheduleItem = { date?: string; time?: string; title: string };

export type EventDetail = EventSummary & {
  description: string; contact: string; rulesUrl: string; rulesText: string; schedule: ScheduleItem[]; mapUrl: string; updatedAt: string;
  categories: EventCategory[]; sponsors: Sponsor[]; gallery: GalleryItem[];
};

export type EventPage = Page<EventSummary> & { facets: { states: string[]; cities: string[] } };

export type Program = {
  id: string; name: string; type: string; slug: string; shortDescription: string; imageUrl: string; duration: string; eligibility: string;
  fee: number; certification: string; location: string; registrationStatus: string; featured: boolean; displayOrder: number;
  fullDescription?: string; schedule?: string; gallery?: GalleryItem[]; related?: Program[];
};

export type Certification = {
  id: string; name: string; type: string; level: string; eligibility: string; duration: string; assessment: string; fee: number;
  certificateType: string; description: string;
};

export type GalleryItem = {
  id: string; title: string; category: string; description: string; thumbUrl: string; imageUrl: string; eventId: string; programId: string;
  featured: boolean;
};

export type Video = {
  id: string; title: string; category: string; description: string; provider: 'YOUTUBE' | 'DRIVE' | 'LINK'; embedUrl: string; thumbnailUrl: string;
  featured: boolean;
};

export type Plan = {
  id: string; name: string; type: string; description: string; durationMonths: number; fee: number; benefits: string[]; eligibility: string;
  featured: boolean;
};

export type Announcement = {
  id: string; title: string; description: string; imageUrl: string; publishDate: string; expiryDate: string; priority: string; linkUrl: string;
};

export type Sponsor = { id: string; name: string; logoUrl: string; websiteUrl: string; description: string; tier: string; showOnHome: boolean };

export type HomeStats = {
  totalStudents: number; activeMembers: number; totalEvents: number; completedEvents: number; programs: number; certificates: number;
};

export type HomeData = {
  settings: Settings;
  hero: { title: string; subtitle: string; image: string; video: string };
  about: { intro: string; vision: string; mission: string; image: string };
  stats: HomeStats;
  upcomingEvents: EventSummary[];
  programs: Program[];
  gallery: GalleryItem[];
  videos: Video[];
  announcements: Announcement[];
  sponsors: Sponsor[];
  plans: Plan[];
};

export type SessionUser = {
  userId: string; email: string; role: 'STUDENT' | 'ADMIN'; name: string; studentId: string; photoUrl: string; needsProfile: boolean;
};

export type StudentProfile = {
  id: string; userId: string; firstName: string; lastName: string; fullName: string; dob: string; age: number | null; gender: string;
  parentName: string; parentMobile: string; email: string; school: string; className: string; address: string; city: string; state: string;
  pincode: string; academy: string; academyId: string; experienceLevel: string; photoUrl: string; status: string;
  emergencyContactName: string; emergencyContactPhone: string; termsAcceptedAt: string; guardianConsentName: string; guardianConsentAt: string;
  createdAt: string; updatedAt: string;
};

export type Membership = {
  id: string; membershipNumber: string; planId: string; planName: string; planType: string; startDate: string; expiryDate: string;
  status: string; paymentId: string; cardUrl: string; verifyUrl: string; approvedDate: string; remarks: string; createdAt: string; fee: number;
};

export type Registration = {
  id: string; registrationNumber: string; eventId: string; eventName: string; eventSlug: string; eventStart: string; eventEnd: string; venue: string;
  city: string; lifecycle: Lifecycle | ''; categoryId: string; categoryName: string; raceType: string; distance: string; ageGroup: string;
  bibNumber: string; heat: string; lane: string; amount: number; paymentId: string; paymentStatus: string; status: string; registrationDate: string;
  result: { time: string; position: number | null; status: string; points: number } | null;
  payment?: Payment | null; student?: { name: string; id: string; email: string };
};

export type Payment = {
  id: string; amount: number; currency: string; type: string; gateway: string; status: string; transactionId: string; date: string; remarks: string;
  eventId: string; membershipId: string; programId: string; registrationId: string; createdAt: string;
};

export type StudentResult = {
  id: string; eventId: string; eventName: string; eventSlug: string; eventDate: string; categoryId: string; categoryName: string; raceType: string;
  distance: string; bib: string; heat: string; lane: string; time: string; position: number | null; points: number; status: string;
};

export type Certificate = {
  id: string; certificateNumber: string; studentId: string; eventId: string; eventName: string; certificationId: string; certificationName: string;
  type: string; position: number | null; title: string; issueDate: string; expiryDate: string; certificateUrl: string; verificationCode: string;
  status: string; verifyUrl: string;
};

export type Achievement = {
  id: string; type: string; title: string; description: string; position: string; date: string; imageUrl: string; eventId: string; eventName: string;
};

export type Notification = { id: string; title: string; message: string; type: string; relatedId: string; read: boolean; createdAt: string };

export type StudentDashboard = {
  student: StudentProfile;
  membership: Membership | null;
  stats: {
    upcomingEvents: number; registeredEvents: number; certificates: number; achievements: number;
    medals: { gold: number; silver: number; bronze: number }; unreadNotifications: number;
  };
  personalBests: { race: string; time: string; eventName: string }[];
  upcomingRegistrations: Registration[];
  openEvents: EventSummary[];
  recentActivity: { type: string; title: string; date: string }[];
};

export type RankingRow = {
  position: number; studentName: string; academy: string; city: string; points: number; events: number; gold: number; silver: number; bronze: number;
  bestPosition: number | null;
};

export type ResultGroup = {
  categoryId: string; categoryName: string; ageGroup: string; gender: string; raceType: string; distance: string;
  results: { studentName: string; academy: string; city: string; bib: string; heat: string; lane: string; time: string; position: number | null; points: number; status: string }[];
};

/** Admin endpoints return raw sheet rows keyed by column name. */
export type Row = Record<string, string | number | boolean | null | undefined> & { [key: string]: unknown };
