import { QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api, post } from './api';

export const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false } },
});

export type Step = { key: 'sent' | 'review' | 'done'; label: string; state: 'done' | 'current' | 'todo' | 'failed'; at: string | null };
export type Stage = 'sent' | 'approved' | 'ready' | 'rejected';

export type Home = {
  village: { id: number; name: string; logoUrl: string | null };
  unreadNotifications: number;
  activeRequests: { id: number; kind: 'mail'; type: string; forName: string; stage: Stage; title: string; steps: Step['state'][]; updatedAt: string }[];
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
