import { requireVillageApiContext } from "@/lib/api-village-context";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auditWeb } from "@/lib/audit/web-audit";
import type { Prisma } from "@prisma/client";
import { recordLegacyMutations, runKependudukanSync, syncResidents } from "@/lib/kependudukan/sync";
import { suspendCitizenAccounts } from "@/lib/mobile/citizen-status";
import { isVillageSubscriptionActive, subscriptionBlockedResponse } from "@/lib/subscription";
import { normalizeRow, rowHasError, toDbRecord, type DbRecord } from "@/lib/residents-import/normalize";
import { buildUpdate, deactivatesAccount, runPool, type ImportMode } from "@/lib/residents-import/server-helpers";
import type { FieldId } from "@/lib/residents-import/fields";

// Route config for large payloads
export const maxDuration = 300; // 5 minutes
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Klien mengirim per-potongan; batas ini melindungi server dari satu request raksasa. */
const MAX_ROWS_PER_REQUEST = 5000;
const CHUNK_SIZE = 1000;
const TRANSACTION_TIMEOUT = 300_000;
/** UPDATE dijalankan paralel lewat pool koneksi Prisma (bukan satu per satu di dalam transaksi). */
const UPDATE_CONCURRENCY = 8;

const MODES: ImportMode[] = ["skip", "fill", "overwrite", "status"];

interface IncomingRow {
  ref: number;
  values: Partial<Record<FieldId, unknown>>;
}

interface Rejected {
  ref: number;
  errors: string[];
}

export async function POST(req: NextRequest) {
  try {
    const loaded = await requireVillageApiContext(req);
    if (!loaded.ok) return loaded.response;
    const { village } = loaded.ctx;

    if (!isVillageSubscriptionActive(village)) {
      return subscriptionBlockedResponse(village);
    }

    const body = await req.json();
    const mode: ImportMode = MODES.includes(body?.mode) ? body.mode : "skip";

    // Bentuk baru: { rows: [{ ref, values }] }. Bentuk lama: { residents: [{...field}] }.
    let rows: IncomingRow[] = [];
    if (Array.isArray(body?.rows)) {
      rows = body.rows.map((r: { ref?: number; values?: Record<string, unknown> }, i: number) => ({
        ref: Number.isInteger(r?.ref) ? (r.ref as number) : i + 1,
        values: (r?.values ?? {}) as Partial<Record<FieldId, unknown>>,
      }));
    } else if (Array.isArray(body?.residents)) {
      rows = body.residents.map((v: Record<string, unknown>, i: number) => ({ ref: i + 1, values: v ?? {} }));
    }

    if (rows.length === 0) {
      return NextResponse.json({ error: "Data warga harus diisi minimal 1 baris" }, { status: 400 });
    }
    if (rows.length > MAX_ROWS_PER_REQUEST) {
      return NextResponse.json(
        { error: `Maksimal ${MAX_ROWS_PER_REQUEST} baris per permintaan. Data Anda: ${rows.length}` },
        { status: 400 },
      );
    }

    // 1) Validasi ulang di server dengan aturan yang sama seperti preview di browser.
    const now = new Date();
    const rejected: Rejected[] = [];
    const valid: Array<{ ref: number; record: DbRecord; raw: Partial<Record<FieldId, unknown>> }> = [];
    const seenNik = new Set<string>();
    for (const row of rows) {
      const { values, issues } = normalizeRow(row.values, { now });
      if (rowHasError(issues)) {
        rejected.push({ ref: row.ref, errors: issues.filter((i) => i.level === "error").map((i) => i.message) });
        continue;
      }
      if (seenNik.has(values.id_number!)) {
        rejected.push({ ref: row.ref, errors: ["NIK ganda dalam file; baris ini dilewati"] });
        continue;
      }
      seenNik.add(values.id_number!);
      valid.push({ ref: row.ref, record: toDbRecord(values), raw: row.values });
    }

    // 2) Pisahkan yang baru dan yang sudah ada di desa ini.
    const niks = valid.map((v) => v.record.nik);
    // Mode "lewati" hanya butuh tahu NIK mana yang ada; mode lain butuh isi kolomnya untuk dibandingkan.
    const where = { villageId: village.id, nik: { in: niks } };
    const existingRows: Array<{ id: number; nik: string } & Record<string, unknown>> = niks.length
      ? mode === "skip"
        ? await prisma.resident.findMany({ where, select: { id: true, nik: true } })
        : ((await prisma.resident.findMany({ where })) as unknown as Array<{ id: number; nik: string } & Record<string, unknown>>)
      : [];
    const existingByNik = new Map(existingRows.map((e) => [e.nik, e]));

    const toCreate: Prisma.ResidentCreateManyInput[] = [];
    const toUpdate: Array<{ id: number; data: Record<string, unknown> }> = [];
    const toDeactivate: number[] = [];
    const updatedBefore = new Map<number, { id: number; nik: string } & Record<string, unknown>>();
    let skipped = 0;
    for (const v of valid) {
      const existing = existingByNik.get(v.record.nik);
      if (!existing) {
        // Mode "status" hanya memperbarui warga yang sudah ada; tidak menambah warga baru dari daftar meninggal/pindah.
        if (mode === "status") skipped++;
        else toCreate.push({ ...v.record, villageId: village.id });
      } else if (mode === "skip") {
        skipped++;
      } else {
        const data = buildUpdate(v.record, existing, mode, v.raw);
        if (Object.keys(data).length) {
          toUpdate.push({ id: existing.id, data });
          updatedBefore.set(existing.id, existing);
          if (deactivatesAccount(data)) toDeactivate.push(existing.id);
        } else skipped++;
      }
    }

    // 3) Tulis. Jumlah dihitung dari hasil basis data, bukan dari panjang potongan.
    const result = await prisma.$transaction(
      async (tx) => {
        let created = 0;
        for (let i = 0; i < toCreate.length; i += CHUNK_SIZE) {
          const r = await tx.resident.createMany({ data: toCreate.slice(i, i + CHUNK_SIZE), skipDuplicates: true });
          created += r.count;
        }

        return { created };
      },
      { maxWait: TRANSACTION_TIMEOUT, timeout: TRANSACTION_TIMEOUT },
    );

    // Pembaruan warga yang sudah ada: paralel lewat pool koneksi. Idempoten, jadi aman diulang bila terputus.
    let updated = 0;
    await runPool(toUpdate, UPDATE_CONCURRENCY, async (u) => {
      await prisma.resident.update({ where: { id: u.id }, data: u.data as Prisma.ResidentUpdateInput });
      updated++;
    });

    // Kependudukan v2 (hanya desa yang menyalakan bendera): mutasi dari impor status + sinkronisasi rumah tangga/wilayah.
    await runKependudukanSync(village, "bulk", async (db) => {
      if (mode === "status") {
        const snap = (r: Record<string, unknown>) => ({
          isAlive: r.isAlive as boolean,
          deathDate: (r.deathDate as Date | null) ?? null,
          moveDate: (r.moveDate as Date | null) ?? null,
          kk: (r.kk as string | null) ?? null,
          familyRole: String(r.familyRole ?? ""),
        });
        for (const u of toUpdate) {
          const before = updatedBefore.get(u.id);
          if (!before) continue;
          const identity = { id: u.id, name: String(before.name ?? ""), nik: before.nik, rt: (before.rt as string | null) ?? null, rw: (before.rw as string | null) ?? null };
          await recordLegacyMutations(db, village.id, loaded.ctx.userId, identity, snap(before), snap({ ...before, ...u.data }), new Date(), "import");
        }
      }
      const touched = await db.resident.findMany({ where: { villageId: village.id, nik: { in: niks } }, select: { id: true } });
      const oldKks = [...updatedBefore.values()].map((b) => b.kk as string | null);
      await syncResidents(db, village.id, touched.map((t) => t.id), oldKks);
    });

    // Warga yang kini berstatus meninggal/pindah: nonaktifkan akun mobilenya (mobile hanya memeriksa status akun).
    const accountsSuspended = await suspendCitizenAccounts(village.id, toDeactivate);

    // Duplikat yang lolos pemeriksaan awal tetapi dibuang oleh skipDuplicates (balapan antar-request)
    const raceSkipped = toCreate.length - result.created;

    await auditWeb(req, loaded.ctx, "bulk_import", "residents", "bulk", {
      mode,
      rows: rows.length,
      created: result.created,
      updated,
      skipped: skipped + raceSkipped,
      rejected: rejected.length,
      accountsSuspended,
    });

    return NextResponse.json(
      {
        success: true,
        message: `Berhasil: ${result.created} ditambahkan, ${updated} diperbarui, ${skipped + raceSkipped} dilewati, ${rejected.length} ditolak`,
        data: {
          residentsCreated: result.created,
          residentsUpdated: updated,
          skipped: skipped + raceSkipped,
          rejected,
          accountsSuspended,
        },
      },
      { status: 201 },
    );
  } catch (err: unknown) {
    console.error("POST /api/residents/bulk error:", err);
    const message = err instanceof Error ? err.message : "Gagal upload data";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
