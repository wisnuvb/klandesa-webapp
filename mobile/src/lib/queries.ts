import { QueryClient, useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api, post } from './api';
import type { EmbedProvider } from './embed';

export const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false } },
});

export type Step = { key: 'sent' | 'rt' | 'review' | 'done'; label: string; state: 'done' | 'current' | 'todo' | 'failed'; at: string | null };
export type Stage = 'sent' | 'approved' | 'ready' | 'rejected' | 'working' | 'done';

export type Home = {
  village: { id: number; name: string; logoUrl: string | null; phone: string | null; address: string | null; email: string | null };
  unreadNotifications: number;
  activeRequests: { id: number; kind: 'mail' | 'report'; type: string; forName: string; stage: Stage; title: string; steps: Step['state'][]; updatedAt: string }[];
  announcements: { id: number; title: string; excerpt: string; category: string; imageUrl: string | null; pinned: boolean; publishedAt: string }[];
};
export type Service = { id: number; name: string; description: string; category: string; popular: boolean };
export type RequestRow = { id: number; number: string; type: string; forName: string; status: string; stage: Stage; title: string; createdAt: string };
export type RequestDetail = {
  id: number; number: string; type: string; forName: string; purpose: string; onBehalf: boolean; createdAt: string;
  stage: Stage; title: string; next: string; steps: Step[]; estimate: string | null; canDownload: boolean; canRetry: boolean; templateId: number | null;
};
export type Family = { me: number; members: { id: number; name: string; relation: string; nikMasked: string; birthDate: string; canActFor: boolean }[] };
export type NotificationRow = { id: number; type: string; title: string; body: string | null; deepLink: string | null; read: boolean; createdAt: string };

export type ReportRow = { id: number; title: string; category: string; status: string; stage: Stage; stageTitle: string; steps: Step['state'][]; createdAt: string; thumb: string | null };
export type ReportDetail = {
  id: number; title: string; category: string; content: string; photos: string[]; locationNote: string | null; hasLocation: boolean;
  isPublic: boolean; isAnonymous: boolean; createdAt: string; stage: Stage; stageTitle: string; next: string;
  steps: { key: string; label: string; state: Step['state'] }[]; feedback: string | null; canGiveFeedback: boolean;
  responses: { id: number; by: string; role: string; text: string; at: string }[];
};
export type ReportInput = {
  category: string; content: string; photos: string[]; isAnonymous: boolean; isPublic: boolean;
  location?: { lat: number; lng: number }; locationNote?: string;
};

export const useHome = () => useQuery({ queryKey: ['home'], queryFn: () => api<Home>('/home'), refetchInterval: 60_000 });
export const useServices = () => useQuery({ queryKey: ['mail-services'], queryFn: () => api<{ items: Service[] }>('/mail/services'), staleTime: 5 * 60_000 });
export const useRequests = () => useQuery({ queryKey: ['mail-requests'], queryFn: () => api<{ items: RequestRow[] }>('/mail/requests') });
export const useRequest = (id: number) => useQuery({ queryKey: ['mail-request', id], queryFn: () => api<RequestDetail>(`/mail/requests/${id}`), enabled: Number.isInteger(id) });
export const useFamily = () => useQuery({ queryKey: ['family'], queryFn: () => api<Family>('/me/family'), staleTime: 10 * 60_000 });
export const useNotifications = () => useQuery({ queryKey: ['notifications'], queryFn: () => api<{ items: NotificationRow[] }>('/notifications') });
export const useAnnouncement = (id: number) =>
  useQuery({ queryKey: ['announcement', id], queryFn: () => api<{ id: number; title: string; content: string; category: string; imageUrl: string | null; publishedAt: string }>(`/announcements/${id}`), enabled: Number.isInteger(id) });

export function useCreateRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (b: { templateId: number; purpose: string; forResidentId?: number }) => post<{ id: number; number: string }>('/mail/requests', b),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['mail-requests'] });
      void qc.invalidateQueries({ queryKey: ['home'] });
    },
  });
}

export function useMarkRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (b: { ids?: number[]; all?: boolean }) => post<void>('/notifications/read', b),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['notifications'] });
      void qc.invalidateQueries({ queryKey: ['home'] });
    },
  });
}

export const useReports = () => useQuery({ queryKey: ['reports'], queryFn: () => api<{ items: ReportRow[] }>('/reports') });
export const useReport = (id: number) => useQuery({ queryKey: ['report', id], queryFn: () => api<ReportDetail>(`/reports/${id}`), enabled: Number.isInteger(id) });

export function useCreateReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (b: ReportInput) => post<{ id: number }>('/reports', b),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['reports'] });
      void qc.invalidateQueries({ queryKey: ['home'] });
    },
  });
}

export function useReportFeedback(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (resolved: boolean) => post<void>(`/reports/${id}/feedback`, { resolved }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['report', id] });
      void qc.invalidateQueries({ queryKey: ['reports'] });
      void qc.invalidateQueries({ queryKey: ['home'] });
    },
  });
}

export const deleteAccount = (password: string) => api<void>('/me', { method: 'DELETE', body: JSON.stringify({ password }) });

// ── Perangkat desa ──────────────────────────────────────────────────────────
export type StaffSummary = {
  village: { name: string; logoUrl: string | null } | null; userName: string; role: string; unreadNotifications: number;
  permissions: { mail: boolean; reports: boolean; signups: boolean };
  counts: { pendingMail: number | null; newReports: number | null; processingReports: number | null; pendingSignups: number | null };
  oldestPendingMailHours: number | null;
};
export type StaffMailRow = { id: number; number: string; type: string; name: string; nikMasked: string; purpose: string; channel: string; onBehalf: boolean; status: string; createdAt: string; processedAt: string | null };
export type StaffMailDetail = StaffMailRow & {
  note: string | null; notes: string | null; rejectionReason: string | null;
  purpose: string; resident: { address: string; rt: string | null; rw: string | null; hamlet: string | null; birthDate: string; birthplace: string; occupation: string | null } | null;
  letterIssued: boolean; canDecide: boolean; waitingRt?: boolean;
};
export type StaffReportRow = { id: number; title: string; category: string; status: string; stage: Stage; reporter: string; photos: number; thumb: string | null; createdAt: string; source: 'mobile' | 'web' };
export type StaffReportDetail = {
  id: number; title: string; category: string; content: string; photos: string[]; reporter: string; reporterNikMasked: string | null;
  reporterWantsAnonymous: boolean; isPublic: boolean; resident: { rt: string | null; rw: string | null; hamlet: string | null; address: string } | null;
  location: { lat: number; lng: number } | null; locationNote: string | null; createdAt: string; status: string; stage: Stage; stageTitle: string;
  feedback: string | null; actions: string[]; canRespond: boolean; responses: { id: number; by: string; role: string; text: string; at: string }[];
};
export type PendingSignup = { id: number; username: string; createdAt: string; name: string; nikMasked: string; rt: string | null; rw: string | null; address: string };

export const useStaffSummary = () => useQuery({ queryKey: ['staff-summary'], queryFn: () => api<StaffSummary>('/staff/summary'), refetchInterval: 60_000 });
export const useStaffMail = (scope: 'pending' | 'done') => useQuery({ queryKey: ['staff-mail', scope], queryFn: () => api<{ items: StaffMailRow[] }>(`/staff/mail?scope=${scope}`) });
export const useStaffMailDetail = (id: number) => useQuery({ queryKey: ['staff-mail-detail', id], queryFn: () => api<StaffMailDetail>(`/staff/mail/${id}`), enabled: Number.isInteger(id) });
export const useStaffReports = (scope: 'open' | 'closed') => useQuery({ queryKey: ['staff-reports', scope], queryFn: () => api<{ items: StaffReportRow[] }>(`/staff/reports?scope=${scope}`) });
export const useStaffReportDetail = (id: number) => useQuery({ queryKey: ['staff-report-detail', id], queryFn: () => api<StaffReportDetail>(`/staff/reports/${id}`), enabled: Number.isInteger(id) });
export const useStaffSignups = () => useQuery({ queryKey: ['staff-signups'], queryFn: () => api<{ items: PendingSignup[] }>('/staff/citizen-accounts') });

/** Setelah aksi staf, segarkan semua daftar & ringkasan terkait. */
export function useInvalidateStaff() {
  const qc = useQueryClient();
  return () => {
    for (const k of ['staff-summary', 'staff-mail', 'staff-mail-detail', 'staff-reports', 'staff-report-detail', 'staff-signups']) {
      void qc.invalidateQueries({ queryKey: [k] });
    }
  };
}

// ── Absensi, pengumuman, cari warga (perangkat desa) ───────────────────────
export type AttendanceToday = {
  linked: boolean; linkHint: string | null; me: { name: string; position: string | null } | null;
  today: { checkInAt: string; status: string; statusLabel: string; method: string | null } | null;
  methods: { qr: boolean; gps: boolean; gpsInactiveReason: string | null; radiusMeters: number | null };
  shift: { name: string; start: string; end: string; tolerance: number } | null;
  team: { id: number; name: string; position: string | null; status: string; statusLabel: string; checkInAt: string | null }[];
};
export type AttendanceHistory = {
  month: string; linked: boolean; summary: { present: number; late: number; leave: number; total: number };
  items: { date: string; checkInAt: string | null; status: string; statusLabel: string; method: string | null }[];
};
export type StaffAnnouncement = { id: number; title: string; excerpt: string; category: string; pinned: boolean; active: boolean; publishedAt: string; views: number };
export type ResidentHit = { id: number; name: string; nikMasked: string; gender: string; age: number; rt: string | null; rw: string | null; hamlet: string | null; relation: string; alive: boolean; hasApp: boolean };
export type ResidentDetail = {
  id: number; name: string; nikMasked: string; kkMasked: string | null; gender: string; age: number; birthplace: string; birthDate: string; religion: string;
  maritalStatus: string; relation: string; address: string; rt: string | null; rw: string | null; hamlet: string | null; occupation: string | null; education: string | null;
  phone: string | null; alive: boolean; moved: boolean; app: { status: string; lastLoginAt: string | null } | null;
  family: { id: number; name: string; relation: string; age: number }[]; canManageAccess: boolean;
};

export const useAttendanceToday = () => useQuery({ queryKey: ['att-today'], queryFn: () => api<AttendanceToday>('/staff/attendance/today') });
export const useAttendanceHistory = (month: string) => useQuery({ queryKey: ['att-history', month], queryFn: () => api<AttendanceHistory>(`/staff/attendance/history?month=${month}`) });
export const useStaffAnnouncements = () => useQuery({ queryKey: ['staff-announcements'], queryFn: () => api<{ categories: string[]; items: StaffAnnouncement[] }>('/staff/announcements') });
export const useResidentSearch = (q: string) =>
  useQuery({ queryKey: ['resident-search', q], queryFn: () => api<{ items: ResidentHit[]; hint?: string }>(`/staff/residents?q=${encodeURIComponent(q)}`), enabled: q.trim().length >= 3, staleTime: 15_000 });
export const useResidentDetail = (id: number) => useQuery({ queryKey: ['resident', id], queryFn: () => api<ResidentDetail>(`/staff/residents/${id}`), enabled: Number.isInteger(id), staleTime: 15_000 });

// ── Warga (sosial desa) ─────────────────────────────────────────────────────

export type SocialConfig = {
  mode: 'post' | 'pre'; feed: { forYou: boolean; learn: boolean }; termsAccepted: boolean; muted: boolean; mutedUntil: string | null; me: { type: 'citizen' | 'staff'; name: string; rt: string | null };
  rules: string[]; limits: { postChars: number; commentChars: number; photos: number };
  categories: string[]; reportReasons: string[];
};
export type SocialPost = {
  id: number; author: { type: string; id: number; name: string; rt: string | null; mine: boolean }; content: string; category: string;
  photos: string[]; link: { provider: EmbedProvider; url: string; title: string | null; thumb: string | null } | null;
  likes: number; comments: number; liked: boolean; saved: boolean; mine: boolean; canEdit: boolean; pending: boolean; createdAt: string; editedAt: string | null;
  /** Alasan tampil di "Untuk Anda" dalam bahasa awam; null bila tidak ada alasan yang cukup kuat. */
  why?: { kind: 'author' | 'category' | 'tag' | 'rt' | 'explore'; label: string } | null;
};
export type FeedPage = { ranked?: boolean; items: SocialPost[]; official: { id: number; title: string; excerpt: string; category: string; publishedAt: string }[]; nextCursor: string | null };
export type SocialComment = { id: number; author: { type: string; id: number; name: string; mine: boolean }; content: string; likes: number; liked: boolean; createdAt: string };
export type FeedFilter = 'all' | 'rt' | 'kegiatan' | 'usaha' | 'foto' | 'saved';
export type FeedSort = 'foryou' | 'latest';

export const useSocialConfig = () => useQuery({ queryKey: ['social-config'], queryFn: () => api<SocialConfig>('/social/config'), retry: false, staleTime: 60_000 });

export function useFeed(filter: FeedFilter, q: string, sort: FeedSort, enabled = true) {
  return useInfiniteQuery({
    enabled,
    queryKey: ['social-feed', filter, q, sort],
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) =>
      api<FeedPage>(`/social/feed?filter=${filter}${sort === 'foryou' ? '&sort=foryou' : ''}${q ? `&q=${encodeURIComponent(q)}` : ''}${pageParam ? `&cursor=${pageParam}` : ''}`),
    getNextPageParam: (last) => last.nextCursor,
  });
}
export const useSocialPost = (id: number) => useQuery({ queryKey: ['social-post', id], queryFn: () => api<SocialPost>(`/social/posts/${id}`), enabled: Number.isInteger(id) });
export const useSocialComments = (id: number) => useQuery({ queryKey: ['social-comments', id], queryFn: () => api<{ items: SocialComment[] }>(`/social/posts/${id}/comments`), enabled: Number.isInteger(id) });
export type InterestItem = { label: string; kind: 'category' | 'author' | 'tag' | 'rt' | 'format'; strength: 1 | 2 | 3 };
export const useSocialInterests = () => useQuery({ queryKey: ['social-interests'], queryFn: () => api<{ learning: boolean; forYou: boolean; items: InterestItem[] }>('/social/interests') });
export const useBlocks = () => useQuery({ queryKey: ['social-blocks'], queryFn: () => api<{ items: { accountType: string; accountId: number; name: string }[] }>('/social/blocks') });

export type AuthorPage = { author: { type: string; id: number; name: string | null; rt: string | null; mine: boolean; postsCount: number }; items: SocialPost[]; nextCursor: string | null };
export function useAuthorPosts(type: string, id: number, enabled = true) {
  return useInfiniteQuery({
    enabled: enabled && Number.isInteger(id),
    queryKey: ['author-posts', type, id],
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => api<AuthorPage>(`/social/authors/${type === 'staff' ? 'staff' : 'citizen'}/${id}${pageParam ? `?cursor=${pageParam}` : ''}`),
    getNextPageParam: (last) => last.nextCursor,
  });
}

export function useInvalidateSocial() {
  const qc = useQueryClient();
  return () => { void qc.invalidateQueries({ queryKey: ['social-feed'] }); void qc.invalidateQueries({ queryKey: ['social-post'] }); void qc.invalidateQueries({ queryKey: ['social-comments'] }); };
}

// Moderasi (perangkat desa)
export type ModItem = {
  kind: 'post' | 'comment'; id: number; status: string; author: string; authorId: number; authorRt: string | null; category: string; content: string;
  photos: string[]; youtubeThumb: string | null; link: { provider: string; url: string } | null; reports: number; reasons: string[]; createdAt: string; postId?: number;
};
export const useModQueue = () => useQuery({ queryKey: ['mod-queue'], queryFn: () => api<{ mode: string; pending: ModItem[]; flagged: ModItem[] }>('/staff/social/queue') });
export const useSocialSettings = () => useQuery({ queryKey: ['mod-settings'], queryFn: () => api<{ mode: 'off' | 'post' | 'pre'; bannedWords: string[]; feed: 'auto' | 'on' | 'off' }>('/staff/social/settings') });

export type VillageProfile = {
  village: { name: string; district: string; regency: string; province: string; address: string; postalCode: string | null; phone: string | null; email: string | null; website: string | null; logoUrl: string | null };
  serviceHours: string | null;
  emergencyContacts: { label: string; phone: string }[];
  budgetPublic: boolean;
  officials: { id: number; name: string; position: string; photoUrl: string | null }[];
};
export type BudgetSummaryResponse = {
  enabled: boolean;
  year: number | null;
  years: number[];
  summary: { totalBudget: number; totalRealized: number; percent: number; categories: { name: string; budget: number; realized: number; percent: number }[] } | null;
};
export type BenefitsMine = {
  entries: { id: number; programName: string; periodLabel: string | null; status: string; summary: string }[];
  disclaimers: string[];
  nationalResources: { title: string; description: string; href: string }[];
};

export const useVillageProfile = () => useQuery({ queryKey: ['village-profile'], queryFn: () => api<VillageProfile>('/village/profile'), staleTime: 10 * 60_000 });
export const useBudgetSummary = (year?: number) =>
  useQuery({ queryKey: ['budget-summary', year ?? 'latest'], queryFn: () => api<BudgetSummaryResponse>(`/village/budget-summary${year ? `?year=${year}` : ''}`), staleTime: 10 * 60_000 });
export const useBenefits = () => useQuery({ queryKey: ['benefits-mine'], queryFn: () => api<BenefitsMine>('/benefits/mine'), staleTime: 5 * 60_000 });

export type VillageInfoSettings = { budgetPublic: boolean; scorecardPublic: boolean; emergencyContacts: { label: string; phone: string }[]; serviceHours: string | null; rtApproval: boolean };
export const useVillageInfoSettings = () => useQuery({ queryKey: ['village-info-settings'], queryFn: () => api<VillageInfoSettings>('/staff/village-info') });

export type DataChangeRow = {
  id: number; forName: string; field: string; fieldLabel: string; newValue: string | null;
  status: 'pending' | 'approved' | 'rejected'; statusLabel: string; applied: boolean; reviewNote: string | null; createdAt: string;
};
export const useDataChanges = () => useQuery({ queryKey: ['data-changes'], queryFn: () => api<{ items: DataChangeRow[] }>('/me/data-changes') });
export function useCreateDataChange() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (b: { residentId: number; field: string; value: string; note?: string }) => post<{ id: number }>('/me/data-changes', b),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['data-changes'] }),
  });
}

export type StaffDataChange = {
  id: number; residentName: string; nikMasked: string | null; field: string; fieldLabel: string; oldValue: string | null; newValue: string | null;
  note: string | null; autoApply: boolean; status: string; reviewNote: string | null; applied: boolean; createdAt: string;
};
export const useStaffDataChanges = (scope: 'pending' | 'done') =>
  useQuery({ queryKey: ['staff-data-changes', scope], queryFn: () => api<{ items: StaffDataChange[] }>(`/staff/data-changes?scope=${scope}`) });


export type MeRole = { role: 'rt'; rt: string; rw: string | null };
export const useMe = () => useQuery({ queryKey: ['me'], queryFn: () => api<{ roles: MeRole[] }>('/me'), staleTime: 5 * 60_000 });
export const useRtRole = () => useMe().data?.roles.find((r) => r.role === 'rt') ?? null;

export type RtRequestRow = { id: number; type: string; name: string; nikMasked: string; purpose: string; onBehalf: boolean; rtStatus: string; createdAt: string; decidedAt: string | null };
export type RtRequestDetail = {
  id: number; type: string; name: string; nikMasked: string; purpose: string; note: string | null; onBehalf: boolean; createdAt: string;
  rtStatus: string; rtNote: string | null; decidedAt: string | null; canDecide: boolean;
  resident: { address: string; birthDate: string; occupation: string | null; familyRole: string } | null;
};
export type RtResident = { id: number; name: string; nikMasked: string; familyRole: string; birthDate: string; gender: string; kkMasked: string | null };

export const useRtSummary = (enabled = true) => useQuery({ queryKey: ['rt-summary'], queryFn: () => api<{ name: string; rt: string; rw: string | null; pendingRequests: number }>('/rt/summary'), enabled, refetchInterval: 120_000 });
export const useRtRequests = (scope: 'pending' | 'done') => useQuery({ queryKey: ['rt-requests', scope], queryFn: () => api<{ items: RtRequestRow[] }>(`/rt/requests?scope=${scope}`) });
export const useRtRequest = (id: number) => useQuery({ queryKey: ['rt-request', id], queryFn: () => api<RtRequestDetail>(`/rt/requests/${id}`), enabled: Number.isInteger(id) });
export const useRtResidents = (q: string) => useQuery({ queryKey: ['rt-residents', q], queryFn: () => api<{ items: RtResident[]; capped: boolean }>(`/rt/residents?q=${encodeURIComponent(q)}`), staleTime: 30_000 });

export type RtAssignment = { id: number; residentId: number; name: string; nikMasked: string | null; rt: string | null; rw: string | null; hasAccount: boolean };
export const useRtAssignments = () => useQuery({ queryKey: ['rt-assignments'], queryFn: () => api<{ items: RtAssignment[] }>('/staff/rt-assignments') });


export type Trend = 'better' | 'worse' | 'same' | 'unknown';
export type Accountability = {
  mail: { total: number; viaApp: number; viaAppPercent: number | null; processed: number; medianHours: number | null; withinSlaPercent: number | null; pending: number; oldestPendingHours: number | null };
  reports: { total: number; eligible: number; respondedInTime: number; respondedInTimePercent: number | null; done: number; resolvedYes: number; resolvedNo: number; resolvedPercent: number | null };
  activation: { residents: number; accounts: number; percent: number | null };
};
export type AccountabilityResponse = {
  windowDays: number; current: Accountability; previous: Accountability;
  trends: { mailMedianHours: Trend; mailWithinSla: Trend; reportsInTime: Trend; reportsResolved: Trend };
};
export const useAccountability = () => useQuery({ queryKey: ['accountability'], queryFn: () => api<AccountabilityResponse>('/staff/accountability'), staleTime: 5 * 60_000 });

// ── Iuran & kas ─────────────────────────────────────────────────────────────
export type FeeScope = 'rt' | 'desa';
export type FeeStatus = 'paid' | 'partial' | 'claimed' | 'waived' | 'overdue' | 'unpaid';
export type MyCharge = {
  id: number; scheduleName: string; categoryLabel: string; scope: string; period: string; amount: number; confirmed: number; pending: number;
  outstanding: number; status: FeeStatus; statusLabel: string; dueDate: string; waivedReason: string | null; payInfo: string | null; payQrUrl: string | null;
};
export type MyFees = { items: MyCharge[]; outstanding: number; hint?: string };
export type FeeSummary = {
  period: string;
  summary: { charges: number; billed: number; collected: number; outstanding: number; waived: number; paid: number; partial: number; claimed: number; overdue: number; unpaid: number; waivedCount: number; collectionPercent: number | null };
  balance: { income: number; expense: number; balance: number };
  pendingClaims: number;
};
export type OfficerCharge = {
  id: number; scheduleId: number; scheduleName: string; headName: string; amount: number; confirmed: number; pending: number; outstanding: number;
  status: FeeStatus; statusLabel: string; dueDate: string; waivedReason: string | null;
};
export type PendingClaim = { id: number; scheduleName: string; headName: string; period: string; chargeAmount: number; amount: number; method: string; proofUrl: string | null; note: string | null; createdAt: string };
export type FeeScheduleRow = {
  id: number; name: string; category: string; categoryLabel: string; amount: number; recurrence: 'monthly' | 'once'; startPeriod: string; endPeriod: string | null;
  dueDay: number; payInfo: string | null; payQrUrl: string | null; isActive: boolean;
};
export type CashRow = { id: number; type: 'in' | 'out'; amount: number; category: string; description: string; entryDate: string; receiptUrl: string | null };
export type RtKas = {
  available: boolean; rt?: string; rw?: string | null; period?: string; collectionPercent?: number | null; billed?: number; collected?: number;
  balance?: number; income?: number; expense?: number; expenses?: { id: number; amount: number; description: string; entryDate: string; hasReceipt: boolean }[];
};

export const useMyFees = () => useQuery({ queryKey: ['my-fees'], queryFn: () => api<MyFees>('/me/fees') });
export const useRtKas = () => useQuery({ queryKey: ['rt-kas'], queryFn: () => api<RtKas>('/me/fees/kas'), staleTime: 60_000 });
export function useClaimPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (b: { id: number; method: string; amount?: number; proofUrl?: string; note?: string }) => { const { id, ...rest } = b; return post<{ id: number }>(`/me/fees/${id}/claim`, rest); },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['my-fees'] }),
  });
}
export const useFeeSummary = (scope: FeeScope, period: string) => useQuery({ queryKey: ['fee-summary', scope, period], queryFn: () => api<FeeSummary>(`/fees/summary?scope=${scope}&period=${period}`) });
export const useFeeCharges = (scope: FeeScope, period: string) => useQuery({ queryKey: ['fee-charges', scope, period], queryFn: () => api<{ period: string; items: OfficerCharge[] }>(`/fees/charges?scope=${scope}&period=${period}`) });
export const useFeeClaims = (scope: FeeScope) => useQuery({ queryKey: ['fee-claims', scope], queryFn: () => api<{ items: PendingClaim[] }>(`/fees/payments?scope=${scope}`) });
export const useFeeSchedules = (scope: FeeScope) => useQuery({ queryKey: ['fee-schedules', scope], queryFn: () => api<{ items: FeeScheduleRow[] }>(`/fees/schedules?scope=${scope}`) });
export const useCashBook = (scope: FeeScope) => useQuery({ queryKey: ['fee-cash', scope], queryFn: () => api<{ items: CashRow[] }>(`/fees/cash?scope=${scope}`) });
export function useInvalidateFees() {
  const qc = useQueryClient();
  return () => Promise.all(['fee-summary', 'fee-charges', 'fee-claims', 'fee-schedules', 'fee-cash', 'my-fees'].map((k) => qc.invalidateQueries({ queryKey: [k] })));
}

/** Pengukuran Warga untuk perangkat desa (docs/SOCIAL_FEED_RANKING.md). */
export type CohortStats = { readers: number; seenPerReader: number; openRate: number; reactionsPerReader: number; sharesPerReader: number; hideRate: number };
export type FeedMetrics = {
  days: number; readers: number; cohorts: { forYou: CohortStats; holdout: CohortStats };
  tabs: { forYou: { seen: number; openRate: number }; latest: { seen: number; openRate: number } };
  fairness: { posts: number; authors: number; postsWithReaction: number; postsNeverSeen: number; top3AuthorShare: number };
  reportRate: number; notes: string[];
};
export const useFeedMetrics = (days = 14) => useQuery({ queryKey: ['feed-metrics', days], queryFn: () => api<FeedMetrics>(`/staff/social/metrics?days=${days}`) });
