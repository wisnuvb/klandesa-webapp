import { randomInt } from "node:crypto";
import { Prisma, type PrismaClient } from "@prisma/client";
import { hashPassword } from "@/lib/auth";
import { ROLE_LABELS } from "@/lib/rbac/labels";
import {
  VILLAGE_ROLES,
  isVillageRole,
  parsePermissionOverrides,
  type PermissionOverrides,
  type VillageRole,
} from "@/lib/permissions/client";

type Db = PrismaClient | Prisma.TransactionClient;

export type Fail = { ok: false; status: number; error: string };
export type Ok<T> = { ok: true; data: T };
export type Result<T> = Ok<T> | Fail;
const fail = (status: number, error: string): Fail => ({ ok: false, status, error });

/** Peran bawaan akun baru: staf. Izin tambahan diberikan admin per akun di halaman Akses Pengguna. */
export const DEFAULT_NEW_ACCOUNT_ROLE: VillageRole = "staff";

// Tanpa 0/O/1/l/I agar mudah dibaca dan disalin dari layar.
const PASSWORD_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

export function generateTempPassword(length = 12): string {
  let out = "";
  for (let i = 0; i < length; i += 1) out += PASSWORD_ALPHABET[randomInt(PASSWORD_ALPHABET.length)];
  return out;
}

export function normalizeAccountEmail(raw: unknown): string | null {
  const email = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  if (email.length > 255) return null;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) ? email : null;
}

export function validateNewPassword(raw: unknown): string | null {
  const pw = typeof raw === "string" ? raw : "";
  if (pw.length < 8) return "Kata sandi minimal 8 karakter.";
  if (pw.length > 128) return "Kata sandi terlalu panjang.";
  if (!/[A-Za-z]/.test(pw) || !/[0-9]/.test(pw)) return "Kata sandi harus memuat huruf dan angka.";
  return null;
}

/** Role dari klien: hanya role desa yang dikenal. Mengembalikan null bila tidak valid. */
export function parseRoleInput(raw: unknown): VillageRole | null {
  return typeof raw === "string" && isVillageRole(raw) ? raw : null;
}

/**
 * Email sudah dipakai di salah satu lane akun mana pun? Login mencari `users` lebih dulu dan portal mitra otomatis
 * terhubung lewat email yang sama (resolveLinkedPartnerIdForVillageEmail), jadi akun desa baru TIDAK boleh memakai
 * email milik mitra, pemilik kode referral, admin platform, atau akun regional: bisa mengambil alih portal mitra
 * atau mengunci pemilik aslinya dari login. Email tidak diverifikasi, jadi bentrok harus ditolak.
 */
export async function isEmailTakenAnywhere(db: Db, email: string): Promise<boolean> {
  const [user, partner, platform, regional, referral] = await Promise.all([
    db.user.findUnique({ where: { email }, select: { id: true } }),
    db.partner.findUnique({ where: { email }, select: { id: true } }),
    db.platformUser.findUnique({ where: { email }, select: { id: true } }),
    db.regionalUser.findUnique({ where: { email }, select: { id: true } }),
    db.referralCode.findFirst({ where: { ownerEmail: email }, select: { id: true } }),
  ]);
  return Boolean(user || partner || platform || regional || referral);
}

export const ACCOUNT_SELECT = {
  id: true,
  name: true,
  email: true,
  phone: true,
  role: true,
  isActive: true,
  lastLogin: true,
  createdAt: true,
  permissionOverrides: true,
  officialProfile: { select: { id: true, name: true, status: true, position: { select: { name: true } } } },
} satisfies Prisma.UserSelect;

export type AccountRow = Prisma.UserGetPayload<{ select: typeof ACCOUNT_SELECT }>;

export function serializeAccount(row: AccountRow, selfId: number) {
  const role = isVillageRole(row.role) ? row.role : null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    role: row.role,
    roleKnown: role !== null,
    roleLabel: role ? ROLE_LABELS[role] : row.role,
    isActive: row.isActive,
    lastLogin: row.lastLogin?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    overrides: parsePermissionOverrides(row.permissionOverrides),
    official: row.officialProfile
      ? { id: row.officialProfile.id, name: row.officialProfile.name, status: row.officialProfile.status, positionName: row.officialProfile.position?.name ?? null }
      : null,
    isSelf: row.id === selfId,
  };
}

/** Banyaknya admin aktif di desa selain `exceptUserId`. Dipakai agar desa tidak kehilangan admin terakhirnya. */
export async function countOtherActiveAdmins(db: Db, villageId: number, exceptUserId: number): Promise<number> {
  return db.user.count({ where: { villageId, role: "admin", isActive: true, id: { not: exceptUserId } } });
}

export type CreateAccountInput = {
  villageId: number;
  officialId: number;
  email: unknown;
  role?: unknown;
  overrides?: unknown;
};

/** Buat akun login untuk perangkat desa yang sudah ada dan tautkan. Kata sandi sementara dikembalikan SEKALI. */
export async function createOfficialAccount(
  db: PrismaClient,
  input: CreateAccountInput,
): Promise<Result<{ userId: number; email: string; role: VillageRole; tempPassword: string }>> {
  const email = normalizeAccountEmail(input.email);
  if (!email) return fail(400, "Email akun tidak valid.");
  const role = input.role == null || input.role === "" ? DEFAULT_NEW_ACCOUNT_ROLE : parseRoleInput(input.role);
  if (!role) return fail(400, "Peran tidak dikenal.");

  const official = await db.official.findFirst({
    where: { id: input.officialId, villageId: input.villageId },
    select: { id: true, name: true, phone: true, userId: true },
  });
  if (!official) return fail(404, "Perangkat desa tidak ditemukan.");
  if (official.userId) return fail(409, "Perangkat ini sudah punya akun login.");

  if (await isEmailTakenAnywhere(db, email)) return fail(409, "Email ini sudah dipakai akun lain.");

  const tempPassword = generateTempPassword();
  const password = await hashPassword(tempPassword);
  const overrides = role === "admin" ? undefined : parsePermissionOverrides(input.overrides);
  const hasOverrides = overrides && (overrides.grant || overrides.deny);

  class AlreadyLinked extends Error {}
  try {
    const userId = await db.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          villageId: input.villageId,
          email,
          password,
          name: official.name,
          phone: official.phone,
          role,
          isActive: true,
          permissionOverrides: hasOverrides ? (overrides as unknown as Prisma.InputJsonValue) : undefined,
        },
        select: { id: true },
      });
      // Penautan atomik: dua admin menekan tombol bersamaan -> hanya satu yang menang, yang kalah ter-rollback.
      const linked = await tx.official.updateMany({ where: { id: official.id, userId: null }, data: { userId: user.id } });
      if (linked.count !== 1) throw new AlreadyLinked();
      return user.id;
    });
    return { ok: true, data: { userId, email, role, tempPassword } };
  } catch (e) {
    if (e instanceof AlreadyLinked) return fail(409, "Perangkat ini sudah punya akun login.");
    if ((e as { code?: string }).code === "P2002") return fail(409, "Email ini sudah dipakai akun lain.");
    throw e;
  }
}

export type UpdateAccountInput = {
  villageId: number;
  actorUserId: number;
  targetUserId: number;
  role?: unknown;
  permissionOverrides?: unknown;
  isActive?: unknown;
  resetPassword?: unknown;
};

export type UpdateAccountResult = { before: { role: string; isActive: boolean; overrides: PermissionOverrides }; tempPassword?: string };

export async function updateAccount(db: PrismaClient, input: UpdateAccountInput): Promise<Result<UpdateAccountResult>> {
  const target = await db.user.findFirst({
    where: { id: input.targetUserId, villageId: input.villageId },
    select: { id: true, role: true, isActive: true, permissionOverrides: true },
  });
  if (!target) return fail(404, "Akun tidak ditemukan.");
  const isSelf = target.id === input.actorUserId;

  const data: Prisma.UserUpdateInput = {};
  let nextRole = target.role;
  let nextActive = target.isActive;

  if (input.role !== undefined) {
    const role = parseRoleInput(input.role);
    if (!role) return fail(400, "Peran tidak dikenal.");
    if (isSelf && role !== target.role) return fail(400, "Anda tidak dapat mengubah peran akun Anda sendiri.");
    data.role = role;
    nextRole = role;
    // Penyesuaian milik role lama tidak relevan lagi: mulai dari bawaan role baru, kecuali klien mengirim yang baru.
    if (role !== target.role && input.permissionOverrides === undefined) data.permissionOverrides = Prisma.DbNull;
  }

  if (input.permissionOverrides !== undefined) {
    if (isSelf) return fail(400, "Anda tidak dapat menyesuaikan izin akun Anda sendiri.");
    const parsed = parsePermissionOverrides(input.permissionOverrides);
    data.permissionOverrides = nextRole === "admin" || !(parsed.grant || parsed.deny) ? Prisma.DbNull : (parsed as unknown as Prisma.InputJsonValue);
  }

  if (input.isActive !== undefined) {
    if (typeof input.isActive !== "boolean") return fail(400, "Status akun tidak valid.");
    if (isSelf && !input.isActive) return fail(400, "Anda tidak dapat menonaktifkan akun Anda sendiri.");
    data.isActive = input.isActive;
    nextActive = input.isActive;
  }

  let tempPassword: string | undefined;
  if (input.resetPassword === true) {
    if (isSelf) return fail(400, "Ubah kata sandi Anda sendiri lewat halaman Profil.");
    tempPassword = generateTempPassword();
    data.password = await hashPassword(tempPassword);
  }

  if (Object.keys(data).length === 0) return fail(400, "Tidak ada perubahan.");

  const before = { role: target.role, isActive: target.isActive, overrides: parsePermissionOverrides(target.permissionOverrides) };
  const losesAdmin = target.role === "admin" && target.isActive && (nextRole !== "admin" || !nextActive);

  // Desa tidak boleh kehilangan admin aktif terakhirnya (diturunkan perannya atau dinonaktifkan). Hitung-lalu-tulis harus
  // atomik: tanpa kunci, dua admin yang saling menurunkan bersamaan sama-sama melihat "masih ada admin lain" dan keduanya lolos.
  // Baris admin desa dikunci (FOR UPDATE) agar permintaan serupa berjalan bergiliran.
  const outcome = await db.$transaction(async (tx) => {
    if (losesAdmin) {
      await tx.$queryRaw`SELECT id FROM users WHERE villageId = ${input.villageId} AND role = 'admin' FOR UPDATE`;
      if ((await countOtherActiveAdmins(tx, input.villageId, target.id)) === 0) return "last-admin" as const;
    }
    await tx.user.update({ where: { id: target.id }, data });
    if (data.password !== undefined) {
      // Sandi diganti admin = sesi seluler lama dicabut (refresh token yang dicuri tidak boleh tetap hidup).
      await tx.mobileSession.updateMany({ where: { accountType: "staff", accountId: target.id, revokedAt: null }, data: { revokedAt: new Date() } });
    }
    return "ok" as const;
  });
  if (outcome === "last-admin") {
    return fail(409, "Desa harus punya minimal satu Admin aktif. Jadikan akun lain Admin terlebih dulu.");
  }
  return { ok: true, data: { before, tempPassword } };
}

export const ASSIGNABLE_ROLES = VILLAGE_ROLES;

/**
 * Perangkat berhenti/dihapus -> akun loginnya ikut dinonaktifkan agar tidak ada akses tersisa.
 * Akun Admin tidak disentuh otomatis (bisa jadi satu-satunya admin); admin menanganinya di Akses Pengguna.
 * Mengembalikan true bila ada akun yang dinonaktifkan.
 */
export async function deactivateLinkedAccount(db: Db, villageId: number, userId: number | null | undefined): Promise<boolean> {
  if (!userId) return false;
  const r = await db.user.updateMany({ where: { id: userId, villageId, role: { not: "admin" }, isActive: true }, data: { isActive: false } });
  return r.count > 0;
}
