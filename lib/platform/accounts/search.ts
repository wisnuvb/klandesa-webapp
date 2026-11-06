import type { Prisma, PrismaClient } from "@prisma/client";
import { maskEmail, maskNik, maskPhone } from "./mask";
import { PAGE_SIZE, type AccountSearch, type ResidentSearch } from "./validate";

/** Pencarian lintas desa untuk Pusat Akun. Selalu berbatas (PAGE_SIZE), data pribadi tersamar. */

export type StaffRow = {
  kind: "staff";
  id: number;
  name: string;
  emailMasked: string;
  role: string;
  village: { id: number; code: string; name: string };
  status: "active" | "inactive";
  lastLogin: string | null;
};
export type CitizenRow = {
  kind: "citizen";
  id: number;
  name: string;
  username: string;
  village: { id: number; code: string; name: string };
  /** active | inactive (dibekukan/dihapus) | pending */
  status: "active" | "inactive" | "pending";
  locked: boolean;
  lastLogin: string | null;
};
export type AccountRow = StaffRow | CitizenRow;
export type AccountSearchResult = { rows: AccountRow[]; total: number; page: number; pageSize: number };

/** Alamat email LENGKAP (bukan potongan): hanya ini yang boleh dicocokkan ke kolom email asli. */
export const isFullEmail = (q: string) => q.length <= 255 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(q);

/**
 * Email di respons hanya tersamar. Pencocokan awalan pada email asli (b, bu, bud...) + filter desa akan memulihkan email utuh
 * karakter demi karakter, jadi email hanya dicocokkan PERSIS bila `q` adalah alamat lengkap; awalan hanya untuk nama & kode desa.
 */
function staffWhere(s: AccountSearch): Prisma.UserWhereInput | null {
  if (s.status === "pending" || s.status === "locked") return null; // konsep ini hanya ada untuk akun warga
  const and: Prisma.UserWhereInput[] = [];
  if (s.villageId) and.push({ villageId: s.villageId });
  if (s.status) and.push({ isActive: s.status === "active" });
  if (s.q) {
    and.push({
      OR: [
        ...(isFullEmail(s.q) ? [{ email: s.q }] : []),
        { name: { startsWith: s.q } },
        { village: { code: { startsWith: s.q } } },
        { village: { name: { startsWith: s.q } } },
      ],
    });
  }
  return and.length ? { AND: and } : {};
}

function citizenWhere(s: AccountSearch, now: Date): Prisma.CitizenAccountWhereInput {
  const and: Prisma.CitizenAccountWhereInput[] = [];
  if (s.villageId) and.push({ villageId: s.villageId });
  if (s.status === "active") and.push({ status: "ACTIVE", deletedAt: null });
  if (s.status === "inactive") and.push({ OR: [{ status: "SUSPENDED" }, { deletedAt: { not: null } }] });
  if (s.status === "pending") and.push({ status: "PENDING_VERIFY", deletedAt: null });
  if (s.status === "locked") and.push({ lockedUntil: { gt: now }, deletedAt: null });
  if (s.q) {
    and.push({
      OR: [
        { username: { startsWith: s.q } },
        { resident: { name: { startsWith: s.q } } },
        { village: { code: { startsWith: s.q } } },
        { village: { name: { startsWith: s.q } } },
      ],
    });
  }
  return and.length ? { AND: and } : {};
}

const villageSel = { select: { id: true, code: true, name: true } } as const;

export async function searchAccounts(db: PrismaClient, s: AccountSearch, now = new Date()): Promise<AccountSearchResult> {
  const sw = s.type === "citizen" ? null : staffWhere(s);
  const cw = s.type === "staff" ? null : citizenWhere(s, now);
  const [sc, cc] = await Promise.all([sw ? db.user.count({ where: sw }) : 0, cw ? db.citizenAccount.count({ where: cw }) : 0]);

  // Daftar gabungan = semua staf lalu semua warga; potong jendela [offset, offset+PAGE_SIZE) lintas dua tabel.
  const offset = (s.page - 1) * PAGE_SIZE;
  const staffSkip = Math.min(offset, sc);
  const staffTake = Math.max(0, Math.min(PAGE_SIZE, sc - staffSkip));
  const citizenSkip = Math.max(0, offset - sc);
  const citizenTake = Math.max(0, Math.min(PAGE_SIZE - staffTake, cc - citizenSkip));

  const [staff, citizens] = await Promise.all([
    sw && staffTake > 0
      ? db.user.findMany({
          where: sw, orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: staffSkip, take: staffTake,
          select: { id: true, name: true, email: true, role: true, isActive: true, lastLogin: true, village: villageSel },
        })
      : [],
    cw && citizenTake > 0
      ? db.citizenAccount.findMany({
          where: cw, orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: citizenSkip, take: citizenTake,
          select: {
            id: true, username: true, status: true, deletedAt: true, lockedUntil: true, lastLoginAt: true,
            resident: { select: { name: true } }, village: villageSel,
          },
        })
      : [],
  ]);

  const rows: AccountRow[] = [
    ...staff.map((u): StaffRow => ({
      kind: "staff", id: u.id, name: u.name, emailMasked: maskEmail(u.email), role: u.role, village: u.village,
      status: u.isActive ? "active" : "inactive", lastLogin: u.lastLogin?.toISOString() ?? null,
    })),
    ...citizens.map((c): CitizenRow => ({
      kind: "citizen", id: c.id, name: c.resident.name, username: c.username, village: c.village,
      status: c.deletedAt || c.status === "SUSPENDED" ? "inactive" : c.status === "PENDING_VERIFY" ? "pending" : "active",
      locked: Boolean(c.lockedUntil && c.lockedUntil > now && !c.deletedAt),
      lastLogin: c.lastLoginAt?.toISOString() ?? null,
    })),
  ];
  return { rows, total: sc + cc, page: s.page, pageSize: PAGE_SIZE };
}

// ───────────────────────────── Warga (baca-saja) ─────────────────────────────

export type ResidentRow = {
  id: number;
  name: string;
  nikMasked: string;
  phoneMasked: string;
  gender: string;
  isAlive: boolean;
  village: { id: number; code: string; name: string };
  hasCitizenAccount: boolean;
};

const RESIDENT_LIMIT = 25;

export async function searchResidents(db: PrismaClient, s: ResidentSearch): Promise<ResidentRow[]> {
  const where: Prisma.ResidentWhereInput = {
    ...(s.villageId ? { villageId: s.villageId } : {}),
    ...(s.mode === "nik" ? { nik: s.q } : { name: { startsWith: s.q } }),
  };
  const rows = await db.resident.findMany({
    where, take: RESIDENT_LIMIT, orderBy: [{ name: "asc" }, { id: "asc" }],
    select: {
      id: true, name: true, nik: true, phone: true, gender: true, isAlive: true,
      village: villageSel, citizenAccount: { select: { id: true } },
    },
  });
  return rows.map((r) => ({
    id: r.id, name: r.name, nikMasked: maskNik(r.nik), phoneMasked: maskPhone(r.phone), gender: String(r.gender),
    isAlive: r.isAlive, village: r.village, hasCitizenAccount: Boolean(r.citizenAccount),
  }));
}
