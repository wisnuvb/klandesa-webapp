/**
 * Daftar KK (/data-kk) di sisi server: SATU agregasi `GROUP BY kk` menjawab daftar, filter, urutan, lencana, komposisi,
 * dan ringkasan, tanpa query per baris. Filter/urut/paging dikerjakan di SQL, jadi biaya per permintaan tetap satu
 * pemindaian indeks (villageId, kk) milik desa itu, berapa pun halaman yang diminta.
 * Semua nilai dari pengguna dikirim sebagai parameter terikat; satu-satunya teks SQL dinamis berasal dari daftar putih tetap.
 */
import { Prisma, type PrismaClient } from "@prisma/client";
import { KK_HEAD_ROLE } from "./household";
import {
  compareUnits,
  KK_AGE,
  normalizeUnit,
  parseKkKey,
  type KkAggRow,
  type KkQuery,
  type KkSortKey,
  type KkSummary,
} from "./kk-list";

type Db = Pick<PrismaClient, "$queryRaw" | "resident">;

/** Akhir hari ini dikurangi `years` tahun: orang berusia >= `years` lahir pada atau sebelum tanggal ini (sama dengan calculateAge). */
const endOfDayYearsAgo = (now: Date, years: number) => new Date(now.getFullYear() - years, now.getMonth(), now.getDate(), 23, 59, 59, 999);

const ACTIVE = Prisma.sql`(r.isAlive = 1 AND r.moveDate IS NULL)`;
const IS_HEAD = Prisma.sql`(r.familyRole = ${KK_HEAD_ROLE})`;

/** Jumlah baris yang memenuhi syarat; SUM kosong/NULL menjadi 0 dan hasilnya bilangan bulat (bukan DECIMAL). */
const count = (cond: Prisma.Sql) => Prisma.sql`COALESCE(CAST(SUM(${cond}) AS SIGNED), 0)`;

/** Nilai wakil KK: kepala aktif, lalu kepala mana pun, lalu anggota aktif, lalu siapa saja. */
const rep = (col: string) => {
  const c = Prisma.raw(`r.${col}`);
  return Prisma.sql`COALESCE(MIN(CASE WHEN ${ACTIVE} AND ${IS_HEAD} THEN ${c} END), MIN(CASE WHEN ${IS_HEAD} THEN ${c} END), MIN(CASE WHEN ${ACTIVE} THEN ${c} END), MIN(${c}))`;
};

/** Teks LIKE aman: karakter khusus dilolos dengan '|' (dipasangkan dengan ESCAPE '|'). */
const likeTerm = (q: string) => `%${q.replace(/[|%_]/g, (m) => `|${m}`)}%`;

/** Padanan SQL `normalizeUnit` ("01" = "1", "-" dan kosong = kosong). */
const unitSql = (col: string) => {
  const t = Prisma.sql`TRIM(COALESCE(${Prisma.raw(col)}, ''))`;
  return Prisma.sql`(CASE WHEN ${t} IN ('', '-') THEN '' WHEN TRIM(LEADING '0' FROM ${t}) = '' THEN '0' ELSE TRIM(LEADING '0' FROM ${t}) END)`;
};

/** Agregasi per KK untuk satu desa. `search` menyaring KK yang punya anggota cocok, tetapi hitungan memakai SELURUH anggota KK. */
function aggregateSql(villageId: number, now: Date, search: string): Prisma.Sql {
  const balitaAfter = endOfDayYearsAgo(now, KK_AGE.balitaUnder);
  const lansiaBefore = endOfDayYearsAgo(now, KK_AGE.lansiaFrom);
  const dewasaBefore = endOfDayYearsAgo(now, KK_AGE.dewasaFrom);
  const searchSql = search
    ? Prisma.sql`AND r.kk IN (
        SELECT m.kk FROM residents m
        WHERE m.villageId = ${villageId} AND m.kk IS NOT NULL
          AND (m.kk LIKE ${likeTerm(search)} ESCAPE '|' OR m.name LIKE ${likeTerm(search)} ESCAPE '|'
            OR m.nik LIKE ${likeTerm(search)} ESCAPE '|' OR m.address LIKE ${likeTerm(search)} ESCAPE '|')
      )`
    : Prisma.empty;
  return Prisma.sql`
    SELECT
      r.kk AS kk,
      MIN(r.id) AS ref,
      ${count(ACTIVE)} AS activeCount,
      ${count(Prisma.sql`NOT ${ACTIVE}`)} AS inactiveCount,
      ${count(Prisma.sql`${ACTIVE} AND ${IS_HEAD}`)} AS headCount,
      ${count(Prisma.sql`${ACTIVE} AND r.nik NOT REGEXP '^[0-9]{16}$'`)} AS badNik,
      ${count(Prisma.sql`${ACTIVE} AND r.birthDate > ${balitaAfter}`)} AS balita,
      ${count(Prisma.sql`${ACTIVE} AND r.birthDate <= ${lansiaBefore}`)} AS lansia,
      ${count(Prisma.sql`${ACTIVE} AND r.birthDate <= ${dewasaBefore}`)} AS dewasa,
      ${count(Prisma.sql`${ACTIVE} AND r.isPregnant = 1`)} AS hamil,
      ${count(Prisma.sql`${ACTIVE} AND r.isDisability = 1`)} AS disabilitas,
      ${count(Prisma.sql`${ACTIVE} AND r.isStunting = 1`)} AS stunting,
      ${rep("name")} AS headName,
      ${rep("address")} AS address,
      ${rep("rt")} AS rt,
      ${rep("rw")} AS rw,
      ${rep("hamlet")} AS hamlet
    FROM residents r
    WHERE r.villageId = ${villageId} AND r.kk IS NOT NULL AND r.kk <> '' ${searchSql}
    GROUP BY r.kk`;
}

/** Lapisan kedua: kolom RT/RW yang sudah dinormalkan, supaya filter dan urutan memakai nilai yang sama. */
const withUnits = (agg: Prisma.Sql) =>
  Prisma.sql`SELECT a.*, ${unitSql("a.rt")} AS rtN, ${unitSql("a.rw")} AS rwN FROM (${agg}) a`;

/** Syarat "perlu perhatian". HARUS sama dengan `kkFlags`/`needsAttention` di kk-list.ts. */
const ATTENTION = Prisma.sql`((b.activeCount > 0 AND b.headCount <> 1) OR b.badNik > 0)`;
const ELDER_ALONE = Prisma.sql`(b.activeCount = 1 AND b.lansia = 1)`;
const NO_ADULT = Prisma.sql`(b.activeCount > 0 AND b.dewasa = 0)`;

function filterSql(q: KkQuery): Prisma.Sql {
  const conds: Prisma.Sql[] = [];
  if (q.dusun) conds.push(Prisma.sql`LOWER(TRIM(COALESCE(b.hamlet, ''))) = ${q.dusun.toLowerCase()}`);
  if (q.rw) conds.push(Prisma.sql`b.rwN = ${normalizeUnit(q.rw) || q.rw}`);
  if (q.rt) conds.push(Prisma.sql`b.rtN = ${normalizeUnit(q.rt) || q.rt}`);
  if (q.size === "1") conds.push(Prisma.sql`b.activeCount = 1`);
  if (q.size === "2-4") conds.push(Prisma.sql`b.activeCount BETWEEN 2 AND 4`);
  if (q.size === "5+") conds.push(Prisma.sql`b.activeCount >= 5`);
  if (q.has) conds.push(Prisma.sql`${Prisma.raw(`b.${q.has}`)} > 0`);
  if (q.preset === "perhatian") conds.push(ATTENTION);
  if (q.preset === "lansia_sendiri") conds.push(ELDER_ALONE);
  if (q.preset === "tanpa_dewasa") conds.push(NO_ADULT);
  return conds.length ? Prisma.sql`WHERE ${Prisma.join(conds, " AND ")}` : Prisma.empty;
}

/** Ekspresi urut per kunci (teks tetap dari daftar putih, bukan masukan pengguna). RT/RW diurutkan sebagai angka alami. */
const SORT_SQL: Record<KkSortKey, (dir: "ASC" | "DESC") => string> = {
  family_card_number: (d) => `b.kk ${d}`,
  kepalaKeluarga: (d) => `b.headName ${d}`,
  alamat: (d) => `b.address ${d}`,
  rt_rw: (d) => `CHAR_LENGTH(b.rwN) ${d}, b.rwN ${d}, CHAR_LENGTH(b.rtN) ${d}, b.rtN ${d}`,
  hamlet: (d) => `b.hamlet ${d}`,
  jumlahAnggota: (d) => `b.activeCount ${d}`,
};

type RawRow = Record<keyof KkAggRow, unknown>;
const num = (v: unknown) => Number(v ?? 0);
const str = (v: unknown) => (v == null ? "" : String(v));
function toAgg(r: RawRow): KkAggRow {
  return {
    kk: str(r.kk),
    ref: num(r.ref),
    activeCount: num(r.activeCount),
    inactiveCount: num(r.inactiveCount),
    headCount: num(r.headCount),
    badNik: num(r.badNik),
    balita: num(r.balita),
    lansia: num(r.lansia),
    dewasa: num(r.dewasa),
    hamil: num(r.hamil),
    disabilitas: num(r.disabilitas),
    stunting: num(r.stunting),
    headName: str(r.headName),
    address: str(r.address),
    rt: str(r.rt),
    rw: str(r.rw),
    hamlet: str(r.hamlet),
  };
}

export interface KkPage {
  rows: KkAggRow[];
  total: number;
}

/** Satu halaman daftar KK sesuai filter/urutan, ditambah total (dua query: halaman dan hitungan, keduanya satu agregasi). */
export async function listKk(db: Db, args: { villageId: number; query: KkQuery; now?: Date }): Promise<KkPage> {
  const { villageId, query: q } = args;
  const now = args.now ?? new Date();
  const base = Prisma.sql`SELECT b.* FROM (${withUnits(aggregateSql(villageId, now, q.search))}) b ${filterSql(q)}`;
  const dir = q.sortOrder === "desc" ? "DESC" : "ASC";
  const order = Prisma.raw(`${SORT_SQL[q.sortKey](dir)}, b.kk ASC`);
  const offset = (q.page - 1) * q.pageSize;
  const [rows, totals] = await Promise.all([
    db.$queryRaw<RawRow[]>`SELECT * FROM (${base}) b ORDER BY ${order} LIMIT ${q.pageSize} OFFSET ${offset}`,
    db.$queryRaw<{ total: unknown }[]>`SELECT COUNT(*) AS total FROM (${base}) c`,
  ]);
  return { rows: rows.map(toAgg), total: num(totals[0]?.total) };
}

/** Angka ringkasan desa + pilihan dropdown wilayah. Dua query kecil. */
export async function summarizeKk(db: Db, args: { villageId: number; now?: Date }): Promise<KkSummary> {
  const { villageId } = args;
  const now = args.now ?? new Date();
  const b = Prisma.sql`SELECT b.* FROM (${withUnits(aggregateSql(villageId, now, ""))}) b`;
  const [sums, areas] = await Promise.all([
    db.$queryRaw<Record<string, unknown>[]>`
      SELECT COUNT(*) AS totalKk,
             COALESCE(CAST(SUM(b.activeCount) AS SIGNED), 0) AS totalJiwa,
             COALESCE(CAST(SUM(b.activeCount > 0) AS SIGNED), 0) AS kkAktif,
             COALESCE(CAST(SUM(${ATTENTION}) AS SIGNED), 0) AS perhatian,
             COALESCE(CAST(SUM(${ELDER_ALONE}) AS SIGNED), 0) AS lansiaSendiri,
             COALESCE(CAST(SUM(${NO_ADULT}) AS SIGNED), 0) AS tanpaDewasa
      FROM (${b}) b`,
    db.resident.groupBy({ by: ["hamlet", "rw", "rt"], where: { villageId, kk: { not: null } } }),
  ]);
  const s = sums[0] ?? {};
  const totalJiwa = num(s.totalJiwa);
  const kkAktif = num(s.kkAktif);

  const dusun = new Map<string, string>();
  const rw = new Set<string>();
  const rt = new Set<string>();
  for (const a of areas) {
    const d = (a.hamlet ?? "").replace(/\s+/g, " ").trim();
    if (d && d !== "-" && !dusun.has(d.toLowerCase())) dusun.set(d.toLowerCase(), d);
    const w = normalizeUnit(a.rw);
    if (w) rw.add(w);
    const t = normalizeUnit(a.rt);
    if (t) rt.add(t);
  }
  return {
    totalKk: num(s.totalKk),
    totalJiwa,
    rataRataAnggota: kkAktif > 0 ? Math.round((totalJiwa / kkAktif) * 10) / 10 : 0,
    perhatian: num(s.perhatian),
    lansiaSendiri: num(s.lansiaSendiri),
    tanpaDewasa: num(s.tanpaDewasa),
    wilayah: {
      dusun: [...dusun.values()].sort((x, y) => x.localeCompare(y, "id")),
      rw: [...rw].sort(compareUnits),
      rt: [...rt].sort(compareUnits),
    },
  };
}

/** Terjemahkan pegangan di URL (id anggota atau nomor KK) menjadi nomor KK desa ini; null bila tidak ada. */
export async function resolveKkKey(db: Pick<PrismaClient, "resident">, villageId: number, raw: string): Promise<string | null> {
  const key = parseKkKey(raw);
  if (!key) return null;
  if (key.type === "kk") return key.kk;
  const r = await db.resident.findFirst({ where: { id: key.id, villageId }, select: { kk: true } });
  return r?.kk ? r.kk : null;
}
