import type { AspirationProgress, ReplyKind } from "@/lib/aspirasi/catalog";

export type VillageReply = { id: string; kind: ReplyKind; body: string; authorLabel: string; createdAt: string; mine: boolean };

export type VillageAspiration = {
  code: string;
  slug: string;
  category: string;
  title: string;
  body: string;
  locationNote: string | null;
  photos: string[];
  progress: AspirationProgress;
  publishedAt: string | null;
  openFlags: number;
  replies: VillageReply[];
};

export type ClaimState = {
  id: number;
  status: "PENDING" | "APPROVED" | "REJECTED" | "REVOKED";
  reviewNote: string | null;
  createdAt: string;
  area: { slug: string; name: string; district: string; regency: string };
} | null;

export type VillageArea = { slug: string; name: string; district: string; regency: string; province: string; claimedAt: string | null } | null;

export type DashboardData = {
  can: { read: boolean; create: boolean; update: boolean; delete: boolean };
  village: { name: string; district: string; regency: string; province: string };
  area: VillageArea;
  claim: ClaimState;
  total: number;
  counts: Record<string, number>;
  items: VillageAspiration[];
};

/** Alamat halaman publik laporan (sama dengan aspirationPath di lib/aspirasi/slug.ts, yang tidak boleh diimpor klien). */
export const publicPath = (a: { slug: string; code: string }) => `/aspirasi/laporan/${a.slug}-${a.code}`;
export const publicAreaPath = (slug: string) => `/aspirasi/desa/${slug}`;
