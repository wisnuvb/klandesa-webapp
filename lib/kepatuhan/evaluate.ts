/** Menurunkan register kepatuhan satu desa dari fakta yang sudah dimuat. Murni (tanpa Prisma). */
import { DONE_LABEL, GROUP_ORDER, SOURCE_LABEL, resolveItems, type DeriveKey, type EntryRow, type GroupKey, type ResolvedItem, type VillageScope } from "./catalog";
import { computeDue, dueNoteFor, mergeEvidence, statusOf, type Evidence, type Events, type Iso, type RegistryRow } from "./calc";

export interface ReportFact {
  /** DRAFT | DISERAHKAN */
  status: string;
  submittedOn: Iso | null;
}

/** Fakta satu desa untuk satu tahun anggaran, semuanya dibaca dari modul lain tanpa mengubahnya. */
export interface YearFacts {
  /** APB Desa awal (versi 0) */
  apbdes: { exists: boolean; enactedOn: Iso | null };
  rkpdes: { exists: boolean; enactedOn: Iso | null; usulanOn: Iso | null };
  lppd: ReportFact | null;
  lkppd: ReportFact | null;
  dd: { focusOn: Iso | null; prevOn: Iso | null; stage1On: Iso | null; publishedOn: Iso | null };
  records: Record<string, { status: string; sentOn: Iso | null; referenceNo: string | null; note: string | null; archiveId: string | null }>;
}

export const EMPTY_FACTS: YearFacts = {
  apbdes: { exists: false, enactedOn: null },
  rkpdes: { exists: false, enactedOn: null, usulanOn: null },
  lppd: null,
  lkppd: null,
  dd: { focusOn: null, prevOn: null, stage1On: null, publishedOn: null },
  records: {},
};

const sys = (state: Evidence["state"], sentOn: Iso | null): Evidence => ({ state, sentOn, source: "SISTEM" });
const fromReport = (r: ReportFact | null): Evidence | null => (!r ? null : r.status === "DISERAHKAN" ? sys("TERKIRIM", r.submittedOn) : sys("DRAF", null));
const fromDate = (d: Iso | null): Evidence | null => (d ? sys("TERKIRIM", d) : null);

/** Bukti otomatis dari data sistem untuk butir yang punya padanan di modul lain. */
export function autoEvidence(derive: DeriveKey | null, f: YearFacts): Evidence | null {
  switch (derive) {
    case "APBDES":
      return f.apbdes.enactedOn ? sys("TERKIRIM", f.apbdes.enactedOn) : f.apbdes.exists ? sys("DRAF", null) : null;
    case "RKPDES_PERDES":
      return f.rkpdes.enactedOn ? sys("TERKIRIM", f.rkpdes.enactedOn) : f.rkpdes.exists ? sys("DRAF", null) : null;
    case "RKPDES_USULAN":
      return fromDate(f.rkpdes.usulanOn);
    case "LPPD_TAHUN":
      return fromReport(f.lppd);
    case "LKPPD":
      return fromReport(f.lkppd);
    case "DD_FOKUS":
      return fromDate(f.dd.focusOn);
    case "DD_TAHAP1":
      return fromDate(f.dd.prevOn);
    case "DD_TAHAP2":
      return fromDate(f.dd.stage1On);
    case "DD_PUBLIKASI":
      return fromDate(f.dd.publishedOn);
    default:
      return null;
  }
}

export function eventsOf(f: YearFacts): Events {
  return { RKPDES_ENACTED: f.rkpdes.enactedOn, APBDES_ENACTED: f.apbdes.enactedOn };
}

export function toRow(item: ResolvedItem, f: YearFacts, year: number, today: Iso): RegistryRow {
  const { due, reason } = computeDue(item.rule, year, eventsOf(f));
  const rec = f.records[item.key] ?? null;
  const manual: Evidence | null = rec ? { state: rec.status === "TERKIRIM" ? "TERKIRIM" : rec.status === "DRAF" ? "DRAF" : "BELUM", sentOn: rec.sentOn, source: "CATATAN" } : null;
  const evidence = mergeEvidence(autoEvidence(item.derive, f), manual);
  const st = statusOf({ due, today, evidence, binding: item.binding });
  return {
    key: item.key,
    title: item.title,
    recipient: item.recipient,
    group: item.group,
    doneLabel: DONE_LABEL[item.done],
    basis: item.basis,
    verification: item.verification,
    note: item.note,
    source: SOURCE_LABEL[item.source],
    provisional: item.provisional,
    binding: item.binding,
    custom: item.custom,
    hint: item.hint,
    bundle: item.bundle,
    rule: item.rule,
    due,
    dueNote: dueNoteFor(item, reason),
    status: st.status,
    late: st.late,
    daysLeft: st.daysLeft,
    soon: st.soon,
    sentOn: evidence.sentOn,
    evidenceSource: evidence.source,
    record: rec,
    autoDerived: item.derive !== null,
    disabled: item.disabled,
    override: item.override,
  };
}

/** Register satu desa: butir terurut menurut kelompok lalu tenggat (tanpa tanggal di akhir). */
export function evaluateVillage(args: { year: number; today: Iso; scope: VillageScope; entries: EntryRow[]; facts: YearFacts }): RegistryRow[] {
  const items = resolveItems({ year: args.year, village: args.scope, entries: args.entries });
  const rows = items.map((it) => toRow(it, args.facts, args.year, args.today));
  const gi = (g: string) => GROUP_ORDER.indexOf(g as GroupKey);
  return rows.sort((a, b) => gi(a.group) - gi(b.group) || (a.due ?? "9999").localeCompare(b.due ?? "9999") || a.key.localeCompare(b.key));
}
