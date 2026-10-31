/**
 * SATU-SATUNYA tempat bentuk data /api/v1 ditentukan: kolom yang diambil dari DB (`*_SELECT`) dan bentuk keluarannya.
 * Kolom yang tidak ada di select tidak pernah keluar dari DB, jadi tidak bisa bocor lewat lupa menyamarkan.
 * Yang sengaja TIDAK dibuka: alamat, telepon, email, tanggal lahir lengkap, NIK/KK lengkap, NIK orang tua, agama, status
 * perkawinan, data kesehatan/disabilitas, penghasilan, desil, foto, dan tautan akun.
 */
import type { Prisma } from "@prisma/client";
import { ageYears, maskKk, maskNik } from "./mask";

export type ResidentStatus = "aktif" | "meninggal" | "pindah";

export const RESIDENT_SELECT = {
  id: true,
  name: true,
  nik: true,
  kk: true,
  gender: true,
  birthDate: true,
  familyRole: true,
  occupation: true,
  education: true,
  rt: true,
  rw: true,
  hamlet: true,
  isAlive: true,
  moveDate: true,
  householdId: true,
} satisfies Prisma.ResidentSelect;

type ResidentRow = Prisma.ResidentGetPayload<{ select: typeof RESIDENT_SELECT }>;

export const residentStatus = (r: { isAlive: boolean; moveDate: Date | null }): ResidentStatus => (!r.isAlive ? "meninggal" : r.moveDate ? "pindah" : "aktif");

export function residentView(r: ResidentRow, now: Date = new Date()) {
  return {
    id: r.id,
    name: r.name,
    nik: maskNik(r.nik),
    kk: maskKk(r.kk),
    gender: r.gender,
    birthYear: r.birthDate.getUTCFullYear(),
    age: ageYears(r.birthDate, now),
    familyRole: r.familyRole,
    occupation: r.occupation,
    education: r.education,
    rt: r.rt,
    rw: r.rw,
    hamlet: r.hamlet,
    status: residentStatus(r),
    householdId: r.householdId,
  };
}

export const HOUSEHOLD_SELECT = {
  id: true,
  kkNumber: true,
  status: true,
  rt: true,
  rw: true,
  hamlet: true,
  headResident: { select: { id: true, name: true } },
  _count: { select: { members: true } },
} satisfies Prisma.HouseholdSelect;

export function householdView(h: Prisma.HouseholdGetPayload<{ select: typeof HOUSEHOLD_SELECT }>) {
  return {
    id: h.id,
    kk: maskKk(h.kkNumber),
    status: h.status,
    head: h.headResident ? { id: h.headResident.id, name: h.headResident.name } : null,
    memberCount: h._count.members,
    rt: h.rt,
    rw: h.rw,
    hamlet: h.hamlet,
  };
}

export const MEMBER_SELECT = {
  id: true,
  name: true,
  nik: true,
  gender: true,
  birthDate: true,
  familyRole: true,
  isAlive: true,
  moveDate: true,
} satisfies Prisma.ResidentSelect;

export function memberView(m: Prisma.ResidentGetPayload<{ select: typeof MEMBER_SELECT }>, now: Date = new Date()) {
  return { id: m.id, name: m.name, nik: maskNik(m.nik), gender: m.gender, birthYear: m.birthDate.getUTCFullYear(), age: ageYears(m.birthDate, now), familyRole: m.familyRole, status: residentStatus(m) };
}

export const OFFICIAL_SELECT = {
  id: true,
  name: true,
  gender: true,
  startDate: true,
  endDate: true,
  status: true,
  education: true,
  photoUrl: true,
  position: { select: { name: true, level: true } },
} satisfies Prisma.OfficialSelect;

export function officialView(o: Prisma.OfficialGetPayload<{ select: typeof OFFICIAL_SELECT }>) {
  return {
    id: o.id,
    name: o.name,
    gender: o.gender,
    position: o.position.name,
    level: o.position.level,
    status: o.status,
    education: o.education,
    photoUrl: o.photoUrl,
    startDate: o.startDate.toISOString().slice(0, 10),
    endDate: o.endDate ? o.endDate.toISOString().slice(0, 10) : null,
  };
}

export const ANNOUNCEMENT_SELECT = {
  id: true,
  title: true,
  content: true,
  category: true,
  imageUrl: true,
  isPinned: true,
  publishDate: true,
  expiryDate: true,
} satisfies Prisma.AnnouncementSelect;

export function announcementView(a: Prisma.AnnouncementGetPayload<{ select: typeof ANNOUNCEMENT_SELECT }>) {
  return {
    id: a.id,
    title: a.title,
    content: a.content,
    category: a.category,
    imageUrl: a.imageUrl,
    isPinned: a.isPinned,
    publishDate: a.publishDate.toISOString(),
    expiryDate: a.expiryDate ? a.expiryDate.toISOString() : null,
  };
}

export const POTENTIAL_SELECT = {
  id: true,
  category: true,
  subCategory: true,
  name: true,
  description: true,
  location: true,
  involvedPeople: true,
  images: true,
  status: true,
} satisfies Prisma.PotentialSelect;

export function potentialView(p: Prisma.PotentialGetPayload<{ select: typeof POTENTIAL_SELECT }>) {
  return {
    id: p.id,
    category: p.category,
    subCategory: p.subCategory,
    name: p.name,
    description: p.description,
    location: p.location,
    involvedPeople: p.involvedPeople,
    images: Array.isArray(p.images) ? p.images.filter((x): x is string => typeof x === "string") : [],
    status: p.status,
  };
}

/** Filter status warga dari parameter ?status= (bawaan: aktif). Mengembalikan null bila nilai tak dikenal. */
export function residentStatusWhere(raw: string | null): Prisma.ResidentWhereInput | null {
  switch (raw ?? "aktif") {
    case "aktif":
      return { isAlive: true, moveDate: null };
    case "meninggal":
      return { isAlive: false };
    case "pindah":
      return { isAlive: true, moveDate: { not: null } };
    case "semua":
      return {};
    default:
      return null;
  }
}

export const AGE_BUCKETS = [
  { key: "0-4", min: 0, max: 4 },
  { key: "5-14", min: 5, max: 14 },
  { key: "15-24", min: 15, max: 24 },
  { key: "25-59", min: 25, max: 59 },
  { key: "60+", min: 60, max: Infinity },
] as const;

export function ageBuckets(birthDates: readonly Date[], now: Date = new Date()): Record<string, number> {
  const out: Record<string, number> = Object.fromEntries(AGE_BUCKETS.map((b) => [b.key, 0]));
  for (const d of birthDates) {
    const a = ageYears(d, now);
    const b = AGE_BUCKETS.find((x) => a >= x.min && a <= x.max);
    if (b) out[b.key] += 1;
  }
  return out;
}
