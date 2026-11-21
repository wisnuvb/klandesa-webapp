export type AdminAspiration = {
  id: string;
  code: string;
  status: "PENDING" | "PUBLISHED" | "REJECTED" | "HIDDEN" | "REMOVED";
  category: string;
  title: string;
  body: string;
  locationNote: string | null;
  photoKeys: string[];
  photos: string[];
  noindex: boolean;
  progress: string;
  createdAt: string;
  publishedAt: string | null;
  moderationNote: string | null;
  rejectReason: string | null;
  manualArea: boolean;
  openFlags: number;
  replies: number;
  reporter: { name: string | null; phone: string | null; email: string | null };
  area: { slug: string; name: string; district: string; regency: string; province: string; claimed: boolean };
};

export type AspirationPage = { items: AdminAspiration[]; total: number; page: number; pageSize: number; counts: Record<string, number> };

export type AdminClaim = {
  id: number;
  position: string;
  contactPhone: string | null;
  evidenceNote: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "REVOKED";
  reviewNote: string | null;
  reviewedAt: string | null;
  createdAt: string;
  area: { slug: string; name: string; district: string; regency: string; province: string; claimedByOther: boolean };
  village: { id: number; name: string; district: string; regency: string; province: string; email: string | null; phone: string | null; subscriptionStatus: string };
  user: { name: string | null; email: string | null; role: string };
  matchScore: number;
};
export type ClaimPage = { items: AdminClaim[]; total: number; page: number; pageSize: number; pending: number };

export type AdminFlag = {
  id: string;
  reason: string;
  detail: string | null;
  source: "PUBLIC" | "VILLAGE";
  contact: string | null;
  status: "OPEN" | "ACTIONED" | "DISMISSED";
  createdAt: string;
  handledAt: string | null;
  handleNote: string | null;
  aspiration: { id: string; code: string; slug: string; title: string; status: string; area: string };
};
export type FlagPage = { items: AdminFlag[]; total: number; page: number; pageSize: number; open: number };

export type ModerationAction = "publish" | "reject" | "hide" | "remove" | "reopen" | "noindex" | "index" | "edit";

/** Salinan aturan perpindahan di lib/aspirasi/moderation.ts (berkas itu memuat Prisma, tak boleh diimpor klien). Server tetap penentu (409). */
const ALLOWED: Record<ModerationAction, string[]> = {
  publish: ["PENDING", "HIDDEN"],
  reject: ["PENDING"],
  hide: ["PUBLISHED"],
  remove: ["PENDING", "PUBLISHED", "HIDDEN", "REJECTED"],
  reopen: ["REJECTED"],
  noindex: ["PUBLISHED", "HIDDEN"],
  index: ["PUBLISHED", "HIDDEN"],
  edit: ["PENDING", "PUBLISHED", "HIDDEN"],
};
export const canDo = (status: string, action: ModerationAction): boolean => ALLOWED[action].includes(status);
