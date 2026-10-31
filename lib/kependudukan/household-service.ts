/** Ganti Kepala Keluarga. Kolom `familyRole` tetap sumber kebenaran; rumah tangga dihitung ulang setelahnya. Jalankan di dalam transaksi. */
import { KK_HEAD_ROLE } from "./household";
import { FAMILY_ROLES } from "./mutasi-labels";
import { fail, type ServiceResult } from "./mutation-service";
import { syncResidents, type Db } from "./sync";

export interface ChangeHeadArgs {
  villageId: number;
  householdId: number;
  newHeadId: number;
  /** Hubungan baru bagi Kepala Keluarga lama (dan kepala lain yang masih aktif). Wajib bila ada. */
  otherHeadsRole?: string;
}

export async function changeHead(db: Db, a: ChangeHeadArgs): Promise<ServiceResult<{ changed: number }>> {
  const household = await db.household.findFirst({ where: { id: a.householdId, villageId: a.villageId }, select: { id: true, kkNumber: true } });
  if (!household) return fail(404, "Keluarga tidak ditemukan.");

  const members = await db.resident.findMany({
    where: { villageId: a.villageId, householdId: household.id },
    select: { id: true, name: true, familyRole: true, isAlive: true, moveDate: true },
  });
  const active = (m: { isAlive: boolean; moveDate: Date | null }) => m.isAlive && !m.moveDate;
  const target = members.find((m) => m.id === a.newHeadId);
  if (!target) return fail(404, "Warga itu bukan anggota keluarga ini.");
  if (!active(target)) return fail(422, "Warga yang sudah meninggal atau pindah tidak bisa menjadi Kepala Keluarga.");

  const others = members.filter((m) => m.id !== target.id && active(m) && m.familyRole === KK_HEAD_ROLE);
  if (target.familyRole === KK_HEAD_ROLE && others.length === 0) return fail(409, `${target.name} sudah menjadi Kepala Keluarga.`);

  const role = a.otherHeadsRole?.trim();
  if (others.length > 0) {
    if (!role || role === KK_HEAD_ROLE || !(FAMILY_ROLES as readonly string[]).includes(role)) {
      return fail(422, `Pilih hubungan keluarga yang baru untuk ${others.map((o) => o.name).join(", ")}.`);
    }
    await db.resident.updateMany({ where: { villageId: a.villageId, id: { in: others.map((o) => o.id) } }, data: { familyRole: role } });
  }
  await db.resident.update({ where: { id: target.id }, data: { familyRole: KK_HEAD_ROLE } });
  await syncResidents(db, a.villageId, [target.id, ...others.map((o) => o.id)], [household.kkNumber]);
  return { ok: true, data: { changed: 1 + others.length } };
}
