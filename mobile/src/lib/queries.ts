import { QueryClient, useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api, post } from './api';

export const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false } },
});

export type Step = { key: 'sent' | 'review' | 'done'; label: string; state: 'done' | 'current' | 'todo' | 'failed'; at: string | null };
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

export const useHome = () => useQuery({ queryKey: ['home'], queryFn: () => api<Home>('/home') });
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
  letterIssued: boolean; canDecide: boolean;
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
  mode: 'post' | 'pre'; termsAccepted: boolean; muted: boolean; mutedUntil: string | null; me: { name: string; rt: string | null };
  rules: string[]; limits: { postChars: number; commentChars: number; photos: number };
  categories: string[]; reportReasons: string[];
};
export type SocialPost = {
  id: number; author: { type: string; id: number; name: string; rt: string | null; mine: boolean }; content: string; category: string;
  photos: string[]; youtube: { id: string; title: string | null; thumb: string; url: string } | null;
  likes: number; comments: number; liked: boolean; saved: boolean; mine: boolean; canEdit: boolean; pending: boolean; createdAt: string; editedAt: string | null;
};
export type FeedPage = { items: SocialPost[]; official: { id: number; title: string; excerpt: string; category: string; publishedAt: string }[]; nextCursor: string | null };
export type SocialComment = { id: number; author: { type: string; id: number; name: string; mine: boolean }; content: string; createdAt: string };
export type FeedFilter = 'all' | 'rt' | 'kegiatan' | 'usaha' | 'foto' | 'saved';

export const useSocialConfig = () => useQuery({ queryKey: ['social-config'], queryFn: () => api<SocialConfig>('/social/config'), retry: false, staleTime: 60_000 });

export function useFeed(filter: FeedFilter, q: string, enabled = true) {
  return useInfiniteQuery({
    enabled,
    queryKey: ['social-feed', filter, q],
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) =>
      api<FeedPage>(`/social/feed?filter=${filter}${q ? `&q=${encodeURIComponent(q)}` : ''}${pageParam ? `&cursor=${pageParam}` : ''}`),
    getNextPageParam: (last) => last.nextCursor,
  });
}
export const useSocialPost = (id: number) => useQuery({ queryKey: ['social-post', id], queryFn: () => api<SocialPost>(`/social/posts/${id}`), enabled: Number.isInteger(id) });
export const useSocialComments = (id: number) => useQuery({ queryKey: ['social-comments', id], queryFn: () => api<{ items: SocialComment[] }>(`/social/posts/${id}/comments`), enabled: Number.isInteger(id) });
export const useBlocks = () => useQuery({ queryKey: ['social-blocks'], queryFn: () => api<{ items: { accountType: string; accountId: number; name: string }[] }>('/social/blocks') });

export function useInvalidateSocial() {
  const qc = useQueryClient();
  return () => { void qc.invalidateQueries({ queryKey: ['social-feed'] }); void qc.invalidateQueries({ queryKey: ['social-post'] }); void qc.invalidateQueries({ queryKey: ['social-comments'] }); };
}

// Moderasi (perangkat desa)
export type ModItem = {
  kind: 'post' | 'comment'; id: number; status: string; author: string; authorId: number; authorRt: string | null; category: string; content: string;
  photos: string[]; youtubeThumb: string | null; reports: number; reasons: string[]; createdAt: string; postId?: number;
};
export const useModQueue = () => useQuery({ queryKey: ['mod-queue'], queryFn: () => api<{ mode: string; pending: ModItem[]; flagged: ModItem[] }>('/staff/social/queue') });
export const useSocialSettings = () => useQuery({ queryKey: ['mod-settings'], queryFn: () => api<{ mode: 'off' | 'post' | 'pre'; bannedWords: string[] }>('/staff/social/settings') });
