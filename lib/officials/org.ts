/**
 * Struktur organisasi pemerintah desa untuk bagan hirarki (Permendagri 84/2015 + Peraturan Bupati).
 *
 * Murni (tanpa React/Prisma) supaya bisa dites dan dipakai server maupun klien.
 *
 * Dasar: semua perangkat adalah pembantu Kepala Desa (Pasal 2 ayat 3). Kaur membantu Sekdes (Pasal 8),
 * Kasi dan Kepala Dusun membantu Kepala Desa langsung (Pasal 9, 10). Peraturan Bupati boleh mengatur
 * lebih lanjut (Pasal 15), mis. Kasi "melalui Sekdes", sehingga garis komando mengikuti data dan
 * pengaturan per desa, bukan bentuk yang dikunci.
 */

// ---------------------------------------------------------------------------
// Unit & peran

export const ORG_UNITS = ["LEADER", "SECRETARIAT", "TECHNICAL", "REGIONAL", "OTHER"] as const;
export type OrgUnit = (typeof ORG_UNITS)[number];

export const ORG_UNIT_LABELS: Record<OrgUnit, string> = {
  LEADER: "Kepala Desa",
  SECRETARIAT: "Sekretariat Desa",
  TECHNICAL: "Pelaksana Teknis",
  REGIONAL: "Pelaksana Kewilayahan",
  OTHER: "Lainnya",
};

export function isOrgUnit(value: unknown): value is OrgUnit {
  return typeof value === "string" && (ORG_UNITS as readonly string[]).includes(value);
}

export type OrgRole = "kades" | "sekdes" | "kaur" | "kasi" | "kadus" | "staf" | "lain";

/** Nama jabatan untuk pengelompokan (satu per peran), mis. di pita bagan. */
export const ORG_ROLE_LABELS: Record<OrgRole, string> = {
  kades: "Kepala Desa",
  sekdes: "Sekretaris Desa",
  kaur: "Kepala Urusan",
  kasi: "Kepala Seksi",
  kadus: "Kepala Dusun",
  staf: "Staf",
  lain: "Lainnya",
};

export type OrgPosition = { name: string; level: number; unit?: string | null };

function norm(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

const RE_SEKDES = /\b(sekretaris desa|sekdes|sekretaris kampung|sekretaris nagari|sekretaris kalurahan)\b/;
const RE_KAUR = /\b(kaur|kepala urusan|kaur\.)\b/;
const RE_KASI = /\b(kasi|kepala seksi)\b/;
const RE_KADUS = /\b(kadus|kepala dusun|dusun|kepala dukuh|dukuh|kepala jaga|kepala wilayah|kewilayahan|kepala banjar|kelian)\b/;
const RE_KADES = /\b(kepala desa|kades|lurah|petinggi|kuwu|perbekel|kepala kampung|wali nagari|kepala pemerintah)\b/;
const RE_STAF = /\bstaf\b|\bstaff\b/;

/** Menyimpulkan unit dari nama + level jabatan bila admin belum menetapkannya. */
export function inferOrgUnit(name: string, level: number): OrgUnit {
  const n = norm(name);
  if (RE_SEKDES.test(n) || RE_KAUR.test(n)) return "SECRETARIAT";
  if (RE_KASI.test(n)) return "TECHNICAL";
  if (RE_KADUS.test(n)) return "REGIONAL";
  if (RE_KADES.test(n)) return "LEADER";
  if (level === 1) return "LEADER";
  if (level === 2) return "SECRETARIAT";
  if (level === 4) return "REGIONAL";
  return "OTHER";
}

export function resolveOrgUnit(position: OrgPosition | null | undefined): OrgUnit {
  if (!position) return "OTHER";
  if (isOrgUnit(position.unit)) return position.unit;
  return inferOrgUnit(position.name, position.level);
}

export function resolveOrgRole(position: OrgPosition | null | undefined): OrgRole {
  if (!position) return "lain";
  const unit = resolveOrgUnit(position);
  const n = norm(position.name);
  switch (unit) {
    case "LEADER":
      return "kades";
    case "SECRETARIAT":
      if (RE_SEKDES.test(n) || (position.level <= 2 && !RE_KAUR.test(n))) return "sekdes";
      if (RE_STAF.test(n) || position.level >= 5) return "staf";
      return "kaur";
    case "TECHNICAL":
      return position.level >= 5 || RE_STAF.test(n) ? "staf" : "kasi";
    case "REGIONAL":
      return position.level >= 5 || RE_STAF.test(n) ? "staf" : "kadus";
    default:
      return position.level >= 5 || RE_STAF.test(n) ? "staf" : "lain";
  }
}

// ---------------------------------------------------------------------------
// Pengaturan per desa (Village.settings.orgChart)

export type OrgSettings = {
  /** Kasi melapor langsung ke Kades (Permendagri) atau melalui Sekdes (sebagian Perbup). */
  reporting: "direct" | "via_sekdes";
  /** Sekdes otomatis ditampilkan mengoordinasikan Kasi dan Kepala Dusun (garis putus-putus). */
  coordination: boolean;
};

export const DEFAULT_ORG_SETTINGS: OrgSettings = { reporting: "direct", coordination: false };

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function readOrgSettings(settings: unknown): OrgSettings {
  const raw = isRecord(settings) && isRecord(settings.orgChart) ? settings.orgChart : {};
  return {
    reporting: raw.reporting === "via_sekdes" ? "via_sekdes" : "direct",
    coordination: raw.coordination === true,
  };
}

/** Menggabungkan perubahan ke JSON settings desa tanpa menyentuh kunci lain. */
export function mergeOrgSettings(settings: unknown, patch: Partial<OrgSettings>): Record<string, unknown> {
  const base = isRecord(settings) ? settings : {};
  const next = { ...readOrgSettings(settings), ...patch };
  return { ...base, orgChart: { reporting: next.reporting, coordination: next.coordination } };
}

export function parseOrgSettingsPatch(body: unknown): { ok: true; patch: Partial<OrgSettings> } | { ok: false; error: string } {
  if (!isRecord(body)) return { ok: false, error: "Pengaturan tidak valid" };
  const patch: Partial<OrgSettings> = {};
  if ("reporting" in body) {
    if (body.reporting !== "direct" && body.reporting !== "via_sekdes") return { ok: false, error: "Jalur pelaporan Kasi tidak valid" };
    patch.reporting = body.reporting;
  }
  if ("coordination" in body) {
    if (typeof body.coordination !== "boolean") return { ok: false, error: "Pengaturan koordinasi tidak valid" };
    patch.coordination = body.coordination;
  }
  if (Object.keys(patch).length === 0) return { ok: false, error: "Tidak ada yang diubah" };
  return { ok: true, patch };
}

// ---------------------------------------------------------------------------
// Siklus atasan

/** Apakah menetapkan `newSupervisorId` sebagai atasan `officialId` membuat lingkaran? */
export function createsSupervisorCycle(
  supervisorOf: ReadonlyMap<number, number | null>,
  officialId: number,
  newSupervisorId: number | null,
): boolean {
  if (newSupervisorId === null) return false;
  let cursor: number | null = newSupervisorId;
  const seen = new Set<number>();
  while (cursor !== null) {
    if (cursor === officialId) return true;
    if (seen.has(cursor)) return false; // lingkaran lain yang tidak melibatkan officialId
    seen.add(cursor);
    cursor = supervisorOf.get(cursor) ?? null;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Pohon bagan

export type OrgPerson = {
  id: number;
  name: string;
  status: string;
  supervisorId?: number | null;
  coordinatorId?: number | null;
  position: OrgPosition | null;
};

export type OrgNode<T extends OrgPerson = OrgPerson> = {
  person: T;
  role: OrgRole;
  unit: OrgUnit;
  children: OrgNode<T>[];
};

export type OrgAnomaly = {
  id: string;
  severity: "warn" | "info";
  message: string;
  officialIds: number[];
};

export type OrgLink = { from: number; to: number; derived: boolean };

export type OrgTree<T extends OrgPerson = OrgPerson> = {
  /** Akar utama (Kepala Desa). Bila tidak ada Kades, semua yang tanpa atasan. */
  roots: OrgNode<T>[];
  /** Perangkat tanpa atasan yang valid, padahal sudah ada Kepala Desa. */
  orphans: OrgNode<T>[];
  links: OrgLink[];
  anomalies: OrgAnomaly[];
  /** Banyaknya perangkat yang tampil di bagan. */
  count: number;
};

const ROLE_ORDER: Record<OrgRole, number> = { kades: 0, sekdes: 1, kasi: 2, kadus: 3, kaur: 4, staf: 5, lain: 6 };

/** Urutan baku di Permendagri: seksi (pemerintahan, kesejahteraan, pelayanan), urusan (umum, keuangan, perencanaan). */
function subOrder(role: OrgRole, name: string): number {
  const n = norm(name);
  if (role === "kasi") {
    if (n.includes("pemerintahan")) return 0;
    if (n.includes("kesejahteraan")) return 1;
    if (n.includes("pelayanan")) return 2;
  }
  if (role === "kaur") {
    if (n.includes("tata usaha") || n.includes("umum")) return 0;
    if (n.includes("keuangan")) return 1;
    if (n.includes("perencanaan")) return 2;
  }
  return 9;
}

function compareNodes<T extends OrgPerson>(a: OrgNode<T>, b: OrgNode<T>): number {
  return (
    ROLE_ORDER[a.role] - ROLE_ORDER[b.role] ||
    subOrder(a.role, a.person.position?.name ?? "") - subOrder(b.role, b.person.position?.name ?? "") ||
    (a.person.position?.level ?? 9) - (b.person.position?.level ?? 9) ||
    // "Kepala Dusun I, II, III": urut menurut nomor di nama jabatan, baru nama orang.
    (a.person.position?.name ?? "").localeCompare(b.person.position?.name ?? "", "id", { numeric: true }) ||
    a.person.name.localeCompare(b.person.name, "id")
  );
}

export function isActiveStatus(status: string | null | undefined): boolean {
  return (status ?? "").toLowerCase() === "active";
}

export type BuildOptions = {
  /** Tampilkan perangkat nonaktif/pensiun (default: hanya aktif). */
  showInactive?: boolean;
  settings?: OrgSettings;
};

export function buildOrgTree<T extends OrgPerson>(people: readonly T[], options: BuildOptions = {}): OrgTree<T> {
  const settings = options.settings ?? DEFAULT_ORG_SETTINGS;
  const all = new Map(people.map((p) => [p.id, p]));
  const shown = people.filter((p) => options.showInactive || isActiveStatus(p.status));
  const shownIds = new Set(shown.map((p) => p.id));
  const anomalies: OrgAnomaly[] = [];

  const nodes = new Map<number, OrgNode<T>>(
    shown.map((p) => [p.id, { person: p, role: resolveOrgRole(p.position), unit: resolveOrgUnit(p.position), children: [] }]),
  );
  const label = (id: number) => {
    const p = all.get(id);
    return p ? `${p.name}${p.position ? ` (${p.position.name})` : ""}` : `#${id}`;
  };

  // 1) Atasan efektif; putus siklus di anggota berperingkat tertinggi (level terkecil, lalu id terkecil).
  const effective = new Map<number, number | null>();
  for (const p of shown) {
    const s = p.supervisorId ?? null;
    effective.set(p.id, s !== null && s !== p.id && shownIds.has(s) ? s : null);
  }
  const cut = new Set<number>();
  const visited = new Set<number>();
  for (const p of shown) {
    if (visited.has(p.id)) continue;
    const path: number[] = [];
    const onPath = new Map<number, number>();
    let cursor: number | null = p.id;
    while (cursor !== null && !visited.has(cursor) && !onPath.has(cursor)) {
      onPath.set(cursor, path.length);
      path.push(cursor);
      cursor = effective.get(cursor) ?? null;
    }
    if (cursor !== null && onPath.has(cursor)) {
      const cycle = path.slice(onPath.get(cursor));
      const head = [...cycle].sort(
        (a, b) => (all.get(a)!.position?.level ?? 9) - (all.get(b)!.position?.level ?? 9) || a - b,
      )[0];
      cut.add(head);
      anomalies.push({
        id: `cycle:${cycle.slice().sort((a, b) => a - b).join(",")}`,
        severity: "warn",
        message: `${cycle.map(label).join(" dan ")} saling menjadi atasan. Bagan memutus di ${label(head)}; perbaiki atasannya di Edit Perangkat.`,
        officialIds: cycle,
      });
    }
    for (const id of path) visited.add(id);
  }

  // 2) Susun pohon.
  const roots: OrgNode<T>[] = [];
  for (const p of shown) {
    const node = nodes.get(p.id)!;
    const sup = cut.has(p.id) ? null : (effective.get(p.id) ?? null);
    if (sup !== null) nodes.get(sup)!.children.push(node);
    else roots.push(node);
  }
  const sortDeep = (list: OrgNode<T>[]) => {
    list.sort(compareNodes);
    for (const n of list) sortDeep(n.children);
  };
  sortDeep(roots);

  const kades = roots.filter((n) => n.role === "kades");
  const mainRoots = kades.length > 0 ? kades : roots;
  const orphans = kades.length > 0 ? roots.filter((n) => n.role !== "kades") : [];

  // 3) Temuan kerapian.
  if (shown.length > 0 && kades.length === 0 && ![...nodes.values()].some((n) => n.role === "kades")) {
    anomalies.push({ id: "no-kades", severity: "info", message: "Belum ada perangkat berjabatan Kepala Desa; bagan ditampilkan tanpa puncak.", officialIds: [] });
  }
  if (kades.length > 1) {
    anomalies.push({ id: "many-kades", severity: "warn", message: `Ada ${kades.length} perangkat berjabatan Kepala Desa tanpa atasan.`, officialIds: kades.map((n) => n.person.id) });
  }
  for (const o of orphans) {
    const raw = o.person.supervisorId ?? null;
    const supInactive = raw !== null && all.has(raw) && !shownIds.has(raw);
    anomalies.push({
      id: `orphan:${o.person.id}`,
      severity: "warn",
      message: supInactive
        ? `${label(o.person.id)} melapor ke ${label(raw!)} yang sudah tidak aktif. Pilih atasan baru.`
        : `${label(o.person.id)} belum punya atasan, jadi belum terhubung ke bagan.`,
      officialIds: [o.person.id],
    });
  }

  const sekdesNodes = [...nodes.values()].filter((n) => n.role === "sekdes");
  const sekdes = sekdesNodes.length === 1 ? sekdesNodes[0] : null;
  const supervisorRole = (n: OrgNode<T>) => {
    const s = effective.get(n.person.id) ?? null;
    return s === null || cut.has(n.person.id) ? null : (nodes.get(s)?.role ?? null);
  };
  for (const n of nodes.values()) {
    const sr = supervisorRole(n);
    if (sr === null) continue;
    if (n.role === "kaur" && sr !== "sekdes") {
      anomalies.push({ id: `kaur:${n.person.id}`, severity: "warn", message: `${label(n.person.id)} seharusnya melapor ke Sekretaris Desa, tetapi atasannya ${ORG_ROLE_LABELS[sr].toLowerCase()}.`, officialIds: [n.person.id] });
    } else if (n.role === "kadus" && sr !== "kades") {
      anomalies.push({ id: `kadus:${n.person.id}`, severity: "warn", message: `${label(n.person.id)} seharusnya melapor ke Kepala Desa, tetapi atasannya ${ORG_ROLE_LABELS[sr].toLowerCase()}.`, officialIds: [n.person.id] });
    } else if (n.role === "kasi") {
      const expected = settings.reporting === "via_sekdes" && sekdes ? "sekdes" : "kades";
      if (sr !== expected && (sr === "kades" || sr === "sekdes")) {
        anomalies.push({
          id: `kasi:${n.person.id}`,
          severity: "info",
          message: `${label(n.person.id)} melapor ke ${ORG_ROLE_LABELS[sr]}, padahal pengaturan desa: ${expected === "kades" ? "Kasi langsung ke Kepala Desa" : "Kasi melalui Sekretaris Desa"}. Samakan atasannya atau ubah pengaturan bagan.`,
          officialIds: [n.person.id],
        });
      }
    } else if (n.role === "sekdes" && sr !== "kades") {
      anomalies.push({ id: `sekdes:${n.person.id}`, severity: "warn", message: `${label(n.person.id)} seharusnya melapor ke Kepala Desa, tetapi atasannya ${ORG_ROLE_LABELS[sr].toLowerCase()}.`, officialIds: [n.person.id] });
    }
  }

  // 3b) Atasan jabatan dari satu peran terpecah (sebagian ke Kades, sebagian ke Sekdes).
  const kasiNodes = [...nodes.values()].filter((n) => n.role === "kasi");
  const kasiRoles = new Set(kasiNodes.map(supervisorRole).filter((r) => r === "kades" || r === "sekdes"));
  if (kasiRoles.size > 1) {
    anomalies.push({
      id: "kasi-split",
      severity: "warn",
      message: "Atasan para Kepala Seksi tidak seragam (sebagian ke Kepala Desa, sebagian ke Sekretaris Desa).",
      officialIds: kasiNodes.map((n) => n.person.id),
    });
  }

  // 4) Garis koordinasi: eksplisit (coordinatorId) + turunan (pengaturan desa).
  const links: OrgLink[] = [];
  const explicit = new Set<number>();
  for (const n of nodes.values()) {
    const c = n.person.coordinatorId ?? null;
    if (c === null || c === n.person.id || !shownIds.has(c)) continue;
    if (c === (effective.get(n.person.id) ?? null)) continue; // sama dengan atasan: sudah terwakili garis komando
    explicit.add(n.person.id);
    links.push({ from: c, to: n.person.id, derived: false });
  }
  if (settings.coordination && sekdes) {
    for (const n of nodes.values()) {
      if (explicit.has(n.person.id)) continue;
      if (n.role !== "kasi" && n.role !== "kadus") continue;
      if ((effective.get(n.person.id) ?? null) === sekdes.person.id) continue;
      links.push({ from: sekdes.person.id, to: n.person.id, derived: true });
    }
  }

  anomalies.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === "warn" ? -1 : 1));
  return { roots: mainRoots, orphans, links, anomalies, count: shown.length };
}

// ---------------------------------------------------------------------------
// Pengelompokan anak untuk tata letak bagan

export type OrgGroupItem<T extends OrgPerson = OrgPerson> =
  | { kind: "node"; node: OrgNode<T> }
  | { kind: "band"; role: OrgRole; unit: OrgUnit; nodes: OrgNode<T>[] };

/**
 * Anak yang punya bawahan tampil sebagai cabang sendiri. Anak "daun" bertipe Kaur/Kasi/Kadus
 * dikumpulkan per peran menjadi satu pita bertumpuk vertikal (rapi, tidak melebar). Daun lain
 * (staf, dll.) dikumpulkan hanya bila ada dua atau lebih.
 */
export function groupChildren<T extends OrgPerson>(children: readonly OrgNode<T>[]): OrgGroupItem<T>[] {
  const out: OrgGroupItem<T>[] = [];
  const bands = new Map<OrgRole, OrgNode<T>[]>();
  const leaves = children.filter((c) => c.children.length === 0);
  for (const c of children) {
    if (c.children.length > 0) {
      out.push({ kind: "node", node: c });
      continue;
    }
    const sameRole = leaves.filter((l) => l.role === c.role).length;
    const bandable = c.role === "kaur" || c.role === "kasi" || c.role === "kadus" || sameRole >= 2;
    if (!bandable) {
      out.push({ kind: "node", node: c });
      continue;
    }
    const list = bands.get(c.role);
    if (list) {
      list.push(c);
    } else {
      const created = [c];
      bands.set(c.role, created);
      out.push({ kind: "band", role: c.role, unit: c.unit, nodes: created });
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Kandidat atasan / koordinator (saran di formulir; server hanya menjaga siklus)

export type OrgCandidate = OrgPerson & { id: number };

/**
 * Atasan yang masuk akal untuk sebuah jabatan. Kadus -> Kades; Kaur -> Sekdes; Kasi -> Kades atau
 * Sekdes menurut pengaturan desa; Sekdes -> Kades. Bila aturan tidak menemukan siapa pun (mis. belum
 * ada Sekdes), kembali ke aturan lama: jabatan dengan level lebih kecil. Atasan yang sedang terpasang
 * selalu ikut agar tidak hilang saat mengedit.
 */
export function supervisorCandidates<T extends OrgCandidate>(args: {
  position: OrgPosition | null | undefined;
  officials: readonly T[];
  selfId?: number | null;
  settings?: OrgSettings;
  currentSupervisorId?: number | null;
}): T[] {
  const { position, officials, selfId = null, currentSupervisorId = null } = args;
  const settings = args.settings ?? DEFAULT_ORG_SETTINGS;
  const role = resolveOrgRole(position);
  const level = position?.level ?? 5;
  const pool = officials.filter((o) => o.id !== selfId && (isActiveStatus(o.status) || o.id === currentSupervisorId));
  const roleOf = (o: T) => resolveOrgRole(o.position);

  let wanted: OrgRole[] | null = null;
  if (role === "kadus" || role === "sekdes") wanted = ["kades"];
  else if (role === "kaur") wanted = ["sekdes"];
  else if (role === "kasi") wanted = settings.reporting === "via_sekdes" ? ["sekdes", "kades"] : ["kades", "sekdes"];
  else if (role === "kades") return [];

  let list: T[] = [];
  if (wanted) {
    for (const w of wanted) {
      list = pool.filter((o) => roleOf(o) === w);
      if (list.length > 0) break;
    }
  }
  if (list.length === 0) list = pool.filter((o) => (o.position?.level ?? 5) < level);
  if (currentSupervisorId !== null && !list.some((o) => o.id === currentSupervisorId)) {
    const current = officials.find((o) => o.id === currentSupervisorId);
    if (current) list = [...list, current];
  }
  return list.sort((a, b) => (a.position?.level ?? 9) - (b.position?.level ?? 9) || a.name.localeCompare(b.name, "id"));
}

/** Koordinator: perangkat aktif berjabatan lebih tinggi (level lebih kecil) selain diri sendiri. */
export function coordinatorCandidates<T extends OrgCandidate>(args: {
  position: OrgPosition | null | undefined;
  officials: readonly T[];
  selfId?: number | null;
  currentCoordinatorId?: number | null;
}): T[] {
  const level = args.position?.level ?? 5;
  const list = args.officials.filter(
    (o) => o.id !== (args.selfId ?? null) && (o.id === args.currentCoordinatorId || (isActiveStatus(o.status) && (o.position?.level ?? 5) < level)),
  );
  return list.sort((a, b) => (a.position?.level ?? 9) - (b.position?.level ?? 9) || a.name.localeCompare(b.name, "id"));
}
