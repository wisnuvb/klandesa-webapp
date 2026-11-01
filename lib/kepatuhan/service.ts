import { Prisma, type PrismaClient } from "@prisma/client";
import { fail, invalid, isoDay, type Result } from "@/lib/form-input";
import { parseWilayahSettings } from "@/lib/village/wilayah-settings";
import { DEFAULT_ITEMS, GROUP_LABEL, ITEM_KEYS, codeKey, describeRule, normKey, resolveItems, type EntryRow, type VillageScope } from "./catalog";
import { tally, wibToday, type Iso, type RegistryRow, type Tally } from "./calc";
import { EMPTY_FACTS, evaluateVillage, type YearFacts } from "./evaluate";
import { LIMITS, YEAR_MAX, YEAR_MIN, parseCatalogEntry, parseRecord, type CatalogInput } from "./schema";

type Db = Prisma.TransactionClient;
const ok = <T>(data: T): { ok: true; data: T } => ({ ok: true, data });
const validYear = (y: number): boolean => Number.isInteger(y) && y >= YEAR_MIN && y <= YEAR_MAX;
const CHUNK = 250;

// ---------------------------------------------------------------------------------------------
// Pemuatan data (hanya membaca modul lain)

export interface VillageKeys extends VillageScope {
  villageId: number;
  name: string;
}

export async function loadScopes(db: Db, villageIds: number[]): Promise<Map<number, VillageKeys>> {
  const out = new Map<number, VillageKeys>();
  if (!villageIds.length) return out;
  const [villages, bumdes] = await Promise.all([
    db.village.findMany({ where: { id: { in: villageIds } }, select: { id: true, name: true, regency: true, province: true, settings: true } }),
    db.bumdes.findMany({ where: { villageId: { in: villageIds } }, select: { villageId: true } }),
  ]);
  const has = new Set(bumdes.map((b) => b.villageId));
  for (const v of villages) out.set(v.id, { villageId: v.id, name: v.name, regencyKey: normKey(v.regency), provinceKey: normKey(v.province), regencyCode: parseWilayahSettings(v.settings).kode_kab_kota, hasBumdes: has.has(v.id) });
  return out;
}

/** Hanya kolom yang dibutuhkan UI dan evaluasi; kolom internal (penyunting, cap waktu) sengaja tidak ikut. */
const toRow = (e: Omit<EntryRow, "scope"> & { scope: string }): EntryRow => ({
  scope: e.scope === "REGENCY" ? "REGENCY" : "GLOBAL",
  regencyKey: e.regencyKey,
  provinceKey: e.provinceKey,
  itemKey: e.itemKey,
  fromYear: e.fromYear,
  disabled: e.disabled,
  title: e.title,
  recipient: e.recipient,
  ruleKind: e.ruleKind,
  yearOffset: e.yearOffset,
  month: e.month,
  day: e.day,
  event: e.event,
  amount: e.amount,
  unit: e.unit,
  verification: e.verification,
  basis: e.basis,
  note: e.note,
});

/** Kunci penimpaan yang mungkin berlaku bagi desa-desa ini: teks kabupaten dan kunci kode (bila desa punya kode). */
export function lookupKeys(scopes: Iterable<VillageScope>): string[] {
  const keys = new Set<string>();
  for (const sc of scopes) {
    if (sc.regencyKey) keys.add(sc.regencyKey);
    if (sc.regencyCode) keys.add(codeKey(sc.regencyCode));
  }
  return [...keys];
}

/** Penimpaan katalog yang relevan: semua GLOBAL ditambah REGENCY untuk kabupaten yang disebut. */
export async function loadEntries(db: Db, regencyKeys: string[]): Promise<EntryRow[]> {
  const keys = [...new Set(regencyKeys.filter(Boolean))];
  const rows = await db.complianceCatalogEntry.findMany({ where: { OR: [{ scope: "GLOBAL" }, ...(keys.length ? [{ scope: "REGENCY", regencyKey: { in: keys } }] : [])] }, take: 5000 });
  return rows.map((r) => toRow(r));
}

const fkey = (villageId: number, year: number) => `${villageId}:${year}`;

/** Fakta modul lain untuk banyak desa dan tahun sekaligus (kueri berkelompok, tanpa N+1). */
export async function loadFacts(db: Db, villageIds: number[], years: number[]): Promise<Map<string, YearFacts>> {
  const out = new Map<string, YearFacts>();
  if (!villageIds.length || !years.length) return out;
  const get = (v: number, y: number): YearFacts => {
    let f = out.get(fkey(v, y));
    if (!f) {
      f = { ...EMPTY_FACTS, apbdes: { ...EMPTY_FACTS.apbdes }, rkpdes: { ...EMPTY_FACTS.rkpdes }, dd: { ...EMPTY_FACTS.dd }, records: {} };
      out.set(fkey(v, y), f);
    }
    return f;
  };
  for (const v of villageIds) for (const y of years) get(v, y);
  const inV = { in: villageIds };
  const inY = { in: years };
  const [docs, rkps, reports, dds, pubs, recs] = await Promise.all([
    db.apbdesDocument.findMany({ where: { villageId: inV, year: inY, version: 0 }, select: { villageId: true, year: true, status: true, regulationDate: true } }),
    db.rkpdesDocument.findMany({ where: { villageId: inV, year: inY, revision: 0 }, select: { villageId: true, year: true, usulanSubmittedAt: true, legalDocument: { select: { enactedAt: true, status: true } } } }),
    db.villageReport.findMany({ where: { villageId: inV, year: inY, kind: { in: ["LPPD_TAHUN", "LKPPD"] } }, select: { villageId: true, year: true, kind: true, status: true, submittedAt: true } }),
    db.ddYearSetting.findMany({ where: { villageId: inV, year: inY }, select: { villageId: true, year: true, focusReportedOn: true, prevYearReportedOn: true, stage1ReportedOn: true } }),
    db.ddPublication.groupBy({ by: ["villageId", "year"], where: { villageId: inV, year: inY }, _min: { publishedOn: true } }),
    db.complianceReportRecord.findMany({ where: { villageId: inV, year: inY } }),
  ]);
  for (const d of docs) {
    const f = get(d.villageId, d.year);
    f.apbdes = { exists: true, enactedOn: d.status === "DITETAPKAN" ? isoDay(d.regulationDate) : null };
  }
  for (const r of rkps) {
    const f = get(r.villageId, r.year);
    const lawful = r.legalDocument && r.legalDocument.status === "BERLAKU" ? isoDay(r.legalDocument.enactedAt) : null;
    f.rkpdes = { exists: true, enactedOn: lawful, usulanOn: isoDay(r.usulanSubmittedAt) };
  }
  for (const r of reports) {
    const f = get(r.villageId, r.year);
    const fact = { status: r.status, submittedOn: isoDay(r.submittedAt) };
    if (r.kind === "LPPD_TAHUN") f.lppd = fact;
    else f.lkppd = fact;
  }
  for (const d of dds) {
    const f = get(d.villageId, d.year);
    f.dd.focusOn = isoDay(d.focusReportedOn);
    f.dd.prevOn = isoDay(d.prevYearReportedOn);
    f.dd.stage1On = isoDay(d.stage1ReportedOn);
  }
  for (const p of pubs) get(p.villageId, p.year).dd.publishedOn = isoDay(p._min.publishedOn);
  for (const r of recs) get(r.villageId, r.year).records[r.itemKey] = { status: r.status, sentOn: isoDay(r.sentOn), referenceNo: r.referenceNo, note: r.note, archiveId: r.archiveId === null ? null : r.archiveId.toString() };
  return out;
}

// ---------------------------------------------------------------------------------------------
// Register satu desa

export interface UpcomingItem {
  year: number;
  key: string;
  title: string;
  due: Iso;
  daysLeft: number;
  status: string;
}

export interface RegistryView {
  year: number;
  today: Iso;
  village: { name: string; regencyKey: string };
  rows: (RegistryRow & { archive: { id: string; title: string } | null })[];
  tally: Tally;
  groups: { key: string; label: string }[];
  upcoming: UpcomingItem[];
  /** Berapa butir memakai aturan tahun sebelumnya secara sementara */
  provisionalCount: number;
  catalogYearsKnown: number[];
}

export async function getRegistry(db: Db, args: { villageId: number; year: number; today?: Iso }): Promise<Result<RegistryView>> {
  if (!validYear(args.year)) return fail(400, "Tahun tidak valid.");
  const today = args.today ?? wibToday();
  const scopes = await loadScopes(db, [args.villageId]);
  const sc = scopes.get(args.villageId);
  if (!sc) return fail(404, "Desa tidak ditemukan.");
  const todayYear = Number(today.slice(0, 4));
  const years = [...new Set([args.year, todayYear - 1, todayYear, todayYear + 1])].filter(validYear);
  const [entries, facts] = await Promise.all([loadEntries(db, lookupKeys([sc])), loadFacts(db, [args.villageId], years)]);
  const evalYear = (y: number) => evaluateVillage({ year: y, today, scope: sc, entries, facts: facts.get(fkey(args.villageId, y)) ?? EMPTY_FACTS });
  const rows = evalYear(args.year);

  const archiveIds = [...new Set(rows.flatMap((r) => (r.record?.archiveId ? [BigInt(r.record.archiveId)] : [])))];
  const archives = archiveIds.length ? await db.digitalArchive.findMany({ where: { id: { in: archiveIds }, villageId: args.villageId }, select: { id: true, title: true } }) : [];
  const aMap = new Map(archives.map((a) => [a.id.toString(), a.title]));

  const upcoming: UpcomingItem[] = [];
  for (const y of years) {
    if (y < todayYear - 1 || y > todayYear + 1) continue;
    for (const r of y === args.year ? rows : evalYear(y)) {
      if (!r.binding || r.due === null || r.daysLeft === null) continue;
      if (r.status === "TERKIRIM" || r.status === "TERLAMBAT" || r.daysLeft > 60) continue;
      upcoming.push({ year: y, key: r.key, title: r.title, due: r.due, daysLeft: r.daysLeft, status: r.status });
    }
  }
  upcoming.sort((a, b) => a.due.localeCompare(b.due));
  const present = new Set(rows.map((r) => r.group));
  return ok<RegistryView>({
    year: args.year,
    today,
    village: { name: sc.name, regencyKey: sc.regencyKey },
    rows: rows.map((r) => ({ ...r, archive: r.record?.archiveId ? { id: r.record.archiveId, title: aMap.get(r.record.archiveId) ?? "(berkas sudah dihapus)" } : null })),
    tally: tally(rows),
    groups: (Object.keys(GROUP_LABEL) as (keyof typeof GROUP_LABEL)[]).filter((g) => present.has(g)).map((g) => ({ key: g, label: GROUP_LABEL[g] })),
    upcoming: upcoming.slice(0, 8),
    provisionalCount: rows.filter((r) => r.provisional).length,
    catalogYearsKnown: [...new Set(DEFAULT_ITEMS.flatMap((i) => i.versions.map((v) => v.fromYear)).filter((y) => y > 2000))].sort(),
  });
}

/** Butir yang berlaku untuk desa pada tahun itu (dipakai untuk memeriksa kunci butir pada tulis). */
async function applicableKeys(db: Db, villageId: number, year: number): Promise<Set<string> | null> {
  const sc = (await loadScopes(db, [villageId])).get(villageId);
  if (!sc) return null;
  const entries = await loadEntries(db, lookupKeys([sc]));
  return new Set(resolveItems({ year, village: sc, entries }).filter((i) => !i.disabled).map((i) => i.key));
}

// ---------------------------------------------------------------------------------------------
// Catatan pengiriman

export async function saveRecord(db: PrismaClient, args: { villageId: number; year: number; userId: number | null; input: unknown; now?: Date }): Promise<Result<{ itemKey: string; status: string }>> {
  if (!validYear(args.year)) return fail(400, "Tahun tidak valid.");
  const p = parseRecord(args.input, args.now);
  if (!p.ok) return invalid(p);
  const v = p.value;
  const keys = await applicableKeys(db, args.villageId, args.year);
  if (!keys) return fail(404, "Desa tidak ditemukan.");
  if (!keys.has(v.itemKey)) return invalid({ errors: ["Butir laporan ini tidak berlaku untuk desa pada tahun tersebut."], fieldErrors: { itemKey: "Butir tidak berlaku" } });
  if (v.archiveId !== null) {
    const a = await db.digitalArchive.findFirst({ where: { id: v.archiveId, villageId: args.villageId }, select: { id: true } });
    if (!a) return invalid({ errors: ["Berkas bukti tidak ditemukan di Arsip Digital desa ini."], fieldErrors: { archiveId: "Berkas tidak ditemukan" } });
  }
  const data = { status: v.status, sentOn: v.status === "TERKIRIM" ? v.sentOn : null, referenceNo: v.referenceNo, note: v.note, archiveId: v.archiveId, updatedById: args.userId };
  const where = { villageId_year_itemKey: { villageId: args.villageId, year: args.year, itemKey: v.itemKey } };
  const run = () => db.complianceReportRecord.upsert({ where, create: { villageId: args.villageId, year: args.year, itemKey: v.itemKey, ...data }, update: data });
  try {
    await run();
  } catch (e) {
    // Dua simpan serentak untuk butir yang sama: yang kalah mengulang sebagai pembaruan.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") await run();
    else throw e;
  }
  return ok({ itemKey: v.itemKey, status: v.status });
}

export async function clearRecord(db: PrismaClient, args: { villageId: number; year: number; itemKey: string }): Promise<Result<{ itemKey: string }>> {
  if (!validYear(args.year)) return fail(400, "Tahun tidak valid.");
  if (!ITEM_KEYS.includes(args.itemKey) && !/^KAB-[A-Z0-9_]{1,30}$/.test(args.itemKey)) return fail(400, "Butir laporan tidak dikenal.");
  const r = await db.complianceReportRecord.deleteMany({ where: { villageId: args.villageId, year: args.year, itemKey: args.itemKey } });
  return r.count ? ok({ itemKey: args.itemKey }) : fail(404, "Catatan tidak ditemukan.");
}

/** Berkas Arsip Digital milik desa untuk dipilih sebagai bukti (judul/nama berkas, terbaru dulu, maks. 20). */
export async function searchArchives(db: Db, args: { villageId: number; q: string }): Promise<{ id: string; title: string; fileName: string; year: number | null }[]> {
  const q = args.q.trim().slice(0, 80);
  const rows = await db.digitalArchive.findMany({
    where: { villageId: args.villageId, ...(q ? { OR: [{ title: { contains: q } }, { fileName: { contains: q } }] } : {}) },
    orderBy: { id: "desc" },
    take: 20,
    select: { id: true, title: true, fileName: true, year: true },
  });
  return rows.map((r) => ({ id: r.id.toString(), title: r.title, fileName: r.fileName, year: r.year }));
}

// ---------------------------------------------------------------------------------------------
// Katalog (data): daftar, simpan, hapus

export interface CatalogView {
  builtin: { key: string; title: string; group: string; verification: string; versions: { fromYear: number; rule: string; basis: string; verification: string; perYear: boolean }[] }[];
  global: (EntryRow & { id: number })[];
  regency: (EntryRow & { id: number })[];
}

export async function listCatalog(db: Db, args: { regencyKey: string; provinceKey: string }): Promise<CatalogView> {
  const rows = await db.complianceCatalogEntry.findMany({
    where: { OR: [{ scope: "GLOBAL" }, ...(args.regencyKey ? [{ scope: "REGENCY", regencyKey: args.regencyKey, provinceKey: { in: ["", args.provinceKey] } }] : [])] },
    orderBy: [{ itemKey: "asc" }, { fromYear: "asc" }],
    take: 1000,
  });
  return {
    builtin: DEFAULT_ITEMS.map((i) => ({
      key: i.key,
      title: i.title,
      group: GROUP_LABEL[i.group],
      verification: i.versions[0]?.verification ?? "R",
      versions: i.versions.map((v) => ({ fromYear: v.fromYear, rule: describeRule(v.rule), basis: v.basis, verification: v.verification, perYear: Boolean(v.perYear) })),
    })),
    global: rows.filter((r) => r.scope === "GLOBAL").map((r) => ({ ...toRow(r), id: r.id })),
    // Lapis platform ditampilkan tanpa wilayah; kunci wilayah dan siapa penyuntingnya bukan urusan akun regional.
    regency: rows.filter((r) => r.scope === "REGENCY").map((r) => ({ ...toRow(r), id: r.id })),
  };
}

export interface EditorRef {
  regionalUserId?: number;
  label?: string;
}

export async function saveCatalogEntry(
  db: PrismaClient,
  args: { scope: "GLOBAL" | "REGENCY"; regencyKey: string; provinceKey: string; editor: EditorRef; input: unknown },
): Promise<Result<{ id: number; itemKey: string; fromYear: number }>> {
  if (args.scope === "REGENCY" && !args.regencyKey) return fail(400, "Kabupaten tidak diketahui dari akun ini.");
  if (args.scope === "GLOBAL" && (args.regencyKey || args.provinceKey)) return fail(400, "Penimpaan global tidak memakai wilayah.");
  const p = parseCatalogEntry(args.input, { allowV: args.scope === "GLOBAL", allowCustom: args.scope === "REGENCY" });
  if (!p.ok) return invalid(p);
  const v = p.value;
  const key = { scope: args.scope, regencyKey: args.regencyKey, provinceKey: args.provinceKey, itemKey: v.itemKey, fromYear: v.fromYear };
  const exists = await db.complianceCatalogEntry.findUnique({ where: { scope_regencyKey_provinceKey_itemKey_fromYear: key }, select: { id: true } });
  if (!exists && args.scope === "REGENCY" && (await db.complianceCatalogEntry.count({ where: { scope: "REGENCY", regencyKey: args.regencyKey } })) >= LIMITS.entriesPerRegency) return fail(409, `Penimpaan maksimal ${LIMITS.entriesPerRegency} baris per kabupaten.`);
  const data = { ...v, updatedByRegionalId: args.editor.regionalUserId ?? null, updatedByLabel: args.editor.label?.slice(0, 120) ?? null };
  try {
    const row = await db.complianceCatalogEntry.upsert({ where: { scope_regencyKey_provinceKey_itemKey_fromYear: key }, create: { ...key, ...data }, update: data, select: { id: true } });
    return ok({ id: row.id, itemKey: v.itemKey, fromYear: v.fromYear });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return fail(409, "Baris yang sama baru saja disimpan; muat ulang lalu coba lagi.");
    throw e;
  }
}

export async function deleteCatalogEntry(db: PrismaClient, args: { scope: "GLOBAL" | "REGENCY"; regencyKey: string; provinceKey: string; id: number }): Promise<Result<{ id: number }>> {
  if (!Number.isInteger(args.id) || args.id <= 0) return fail(400, "Baris tidak valid.");
  // Hanya baris milik cakupan yang sama: kabupaten lain atau lapis lain tak bisa dihapus lewat id tebakan.
  const r = await db.complianceCatalogEntry.deleteMany({ where: { id: args.id, scope: args.scope, regencyKey: args.regencyKey, provinceKey: args.provinceKey } });
  return r.count ? ok({ id: args.id }) : fail(404, "Baris tidak ditemukan.");
}

// ---------------------------------------------------------------------------------------------
// Rekap wilayah (dasbor kabupaten)

export interface RecapVillage {
  villageId: number;
  name: string;
  district: string;
  /** Wilayah terdaftar pada profil desa (teks yang dapat diubah admin desa) dan dasar pencocokan penimpaan katalog */
  regency: string;
  province: string;
  matchedBy: "KODE" | "TEKS";
  tally: Tally;
  next: { key: string; title: string; due: Iso; daysLeft: number } | null;
  /** Status tiap butir yang berlaku untuk desa ini; butir tak berlaku tidak muncul */
  cells: Record<string, { status: string; late: boolean; due: Iso | null }>;
}

export interface Recap {
  year: number;
  today: Iso;
  items: { key: string; title: string; group: string; binding: boolean; verification: string }[];
  villages: RecapVillage[];
  totals: Tally & { villages: number; villagesWithOverdue: number };
}

/**
 * Rekap kepatuhan untuk daftar desa yang SUDAH dibatasi pemanggil (dari lingkup akun regional). Tidak ada kueri berdasarkan
 * nama wilayah di sini; `villageIds` adalah satu-satunya pintu masuk, jadi tidak ada jalan membaca desa di luar lingkup.
 */
export async function regionalRecap(db: Db, args: { villages: { id: number; name: string; district: string; regency?: string; province?: string }[]; year: number; today?: Iso }): Promise<Result<Recap>> {
  if (!validYear(args.year)) return fail(400, "Tahun tidak valid.");
  const today = args.today ?? wibToday();
  const out: RecapVillage[] = [];
  const itemMeta = new Map<string, Recap["items"][number]>();
  const total: Tally = { total: 0, terkirim: 0, terlambat: 0, segera: 0, draf: 0, belum: 0, terkirimTerlambat: 0 };
  for (let i = 0; i < args.villages.length; i += CHUNK) {
    const chunk = args.villages.slice(i, i + CHUNK);
    const ids = chunk.map((v) => v.id);
    const scopes = await loadScopes(db, ids);
    const entries = await loadEntries(db, lookupKeys(scopes.values()));
    const facts = await loadFacts(db, ids, [args.year]);
    for (const v of chunk) {
      const sc = scopes.get(v.id);
      if (!sc) continue;
      const rows = evaluateVillage({ year: args.year, today, scope: sc, entries, facts: facts.get(fkey(v.id, args.year)) ?? EMPTY_FACTS });
      const t = tally(rows);
      for (const k of Object.keys(total) as (keyof Tally)[]) total[k] += t[k];
      const cells: RecapVillage["cells"] = {};
      let next: RecapVillage["next"] = null;
      for (const r of rows) {
        if (r.disabled) continue;
        cells[r.key] = { status: r.status, late: r.late, due: r.due };
        if (!itemMeta.has(r.key)) itemMeta.set(r.key, { key: r.key, title: r.title, group: GROUP_LABEL[r.group as keyof typeof GROUP_LABEL] ?? r.group, binding: r.binding, verification: r.verification });
        if (r.binding && r.due && r.daysLeft !== null && r.daysLeft >= 0 && (r.status === "BELUM" || r.status === "DRAF") && (!next || r.due < next.due)) next = { key: r.key, title: r.title, due: r.due, daysLeft: r.daysLeft };
      }
      out.push({ villageId: v.id, name: v.name, district: v.district, regency: v.regency ?? "", province: v.province ?? "", matchedBy: sc.regencyCode ? "KODE" : "TEKS", tally: t, next, cells });
    }
  }
  out.sort((a, b) => b.tally.terlambat - a.tally.terlambat || a.name.localeCompare(b.name));
  return ok({
    year: args.year,
    today,
    items: [...itemMeta.values()],
    villages: out,
    totals: { ...total, villages: out.length, villagesWithOverdue: out.filter((v) => v.tally.terlambat > 0).length },
  });
}

export type { CatalogInput };
