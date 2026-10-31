/**
 * Ubah nama / gabungkan unit wilayah (dusun, RW, RT). Karena kolom lama `residents.hamlet/rw/rt` adalah sumber kebenaran,
 * perubahan dilakukan dengan menulis ulang kolom itu untuk anggota unit, lalu rekonsiliasi desa membentuk ulang unit/rumah tangga.
 * Jika nama baru sudah ada, kedua unit otomatis menyatu. Jalankan di dalam transaksi (batas waktu panjang).
 */
import { canonicalWilayahToken } from "./wilayah";
import { fail, type ServiceResult } from "./mutation-service";
import { reconcileVillage, type Db } from "./sync";

export async function rewriteWilayah(db: Db, a: { villageId: number; unitId: number; newName: string }): Promise<ServiceResult<{ moved: number; merged: boolean }>> {
  const unit = await db.wilayahUnit.findFirst({ where: { id: a.unitId, villageId: a.villageId, isActive: true }, include: { parent: { select: { canonicalKey: true } } } });
  if (!unit) return fail(404, "Wilayah tidak ditemukan.");

  const name = a.newName.trim().replace(/\s+/g, " ");
  const token = canonicalWilayahToken(name);
  if (!name || !token) return fail(422, "Nama wilayah wajib diisi.");
  const max = unit.type === "dusun" ? 100 : 10;
  if (name.length > max) return fail(422, `Nama ${unit.type === "dusun" ? "dusun" : unit.type.toUpperCase()} maksimal ${max} karakter.`);

  const parentToken = unit.parent?.canonicalKey.replace(/^rw:/, "") ?? "";
  const targetKey = unit.type === "dusun" ? `dusun:${token}` : unit.type === "rw" ? `rw:${token}` : `rt:${parentToken}|${token}`;
  const target = await db.wilayahUnit.findFirst({ where: { villageId: a.villageId, canonicalKey: targetKey }, select: { id: true } });
  const merged = target != null && target.id !== unit.id;

  const children = unit.type === "rw" ? await db.wilayahUnit.findMany({ where: { villageId: a.villageId, parentId: unit.id }, select: { id: true } }) : [];
  const areaIds = [unit.id, ...children.map((c) => c.id)];

  let moved = 0;
  if (unit.type === "dusun") {
    moved = (await db.resident.updateMany({ where: { villageId: a.villageId, dusunUnitId: unit.id }, data: { hamlet: name } })).count;
  } else if (unit.type === "rw") {
    moved = (await db.resident.updateMany({ where: { villageId: a.villageId, wilayahUnitId: { in: areaIds } }, data: { rw: name } })).count;
  } else {
    moved = (await db.resident.updateMany({ where: { villageId: a.villageId, wilayahUnitId: unit.id }, data: { rt: name } })).count;
  }

  await reconcileVillage(db, a.villageId);

  // Buang unit lama yang sudah kosong (RT dulu, baru RW: induk dilindungi RESTRICT).
  const empty = { areaResidents: { none: {} }, dusunResidents: { none: {} }, areaHouseholds: { none: {} }, dusunHouseholds: { none: {} } };
  if (children.length) await db.wilayahUnit.deleteMany({ where: { villageId: a.villageId, id: { in: children.map((c) => c.id) }, ...empty } });
  await db.wilayahUnit.deleteMany({ where: { villageId: a.villageId, id: unit.id, children: { none: {} }, ...empty } });

  return { ok: true, data: { moved, merged } };
}
