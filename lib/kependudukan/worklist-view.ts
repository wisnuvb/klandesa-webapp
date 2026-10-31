/**
 * Bentuk respons API "Perbaikan Data KK" (murni): memilih halaman, menerapkan filter, dan melengkapi tiap temuan dengan
 * data orang yang dibutuhkan layar. Tidak pernah memuat NIK.
 */
import { buildWorklist, type WorkKind, type WorklistResident } from "./worklist";
import type { KualitasResponse, PersonView, SuggestionView, WorkItemView } from "./labels";

export const KUALITAS_MAX_LIMIT = 100;

export interface KualitasRow extends WorklistResident {
  kk: string | null;
}

export interface KualitasOptions {
  kind?: WorkKind;
  /** true: hanya temuan yang saran terbaiknya yakin dan bisa diterapkan (dasar tombol massal). */
  onlyConfident?: boolean;
  page?: number;
  limit?: number;
  now?: Date;
}

export function buildKualitasResponse(rows: readonly KualitasRow[], opts: KualitasOptions = {}): KualitasResponse {
  const page = Math.max(1, Math.floor(opts.page ?? 1));
  const limit = Math.min(KUALITAS_MAX_LIMIT, Math.max(1, Math.floor(opts.limit ?? 20)));
  const worklist = buildWorklist(rows, opts.now);

  const byKind = opts.kind ? worklist.items.filter((i) => i.kind === opts.kind) : worklist.items;
  const filtered = opts.onlyConfident
    ? byKind.filter((i) => i.suggestions[0]?.confidence === "TINGGI" && i.suggestions[0].type !== "KEEP_HEAD")
    : byKind;
  const pageItems = filtered.slice((page - 1) * limit, page * limit);

  const byId = new Map(rows.map((r) => [r.id, r]));
  const person = (id: number): PersonView => {
    const r = byId.get(id)!;
    return {
      id: r.id,
      name: r.name,
      gender: r.gender,
      familyRole: r.familyRole,
      kk: r.kk,
      birthDate: r.birthDate ? r.birthDate.toISOString().slice(0, 10) : "1900-01-01",
      rt: r.rt,
      rw: r.rw,
      status: !r.isAlive ? "meninggal" : r.moveDate ? "pindah" : "aktif",
    };
  };

  const membersByKk = new Map<string, number[]>();
  for (const r of rows) {
    const k = (r.kk ?? "").replace(/\D/g, "");
    if (k.length === 16) membersByKk.set(k, [...(membersByKk.get(k) ?? []), r.id]);
  }
  const preview = (kk: string) => {
    const ids = membersByKk.get(kk) ?? [];
    const members = ids.map((id) => byId.get(id)!);
    const head = members.find((m) => m.familyRole === "Kepala Keluarga" && m.isAlive && !m.moveDate);
    return { last4: kk.slice(-4), memberCount: ids.length, headName: head?.name ?? null, memberNames: members.slice(0, 4).map((m) => m.name) };
  };

  const items: WorkItemView[] = pageItems.map((i) => ({
    id: i.id,
    kind: i.kind,
    kk: i.kk,
    residents: i.residentIds.map(person),
    members: i.kk ? (membersByKk.get(i.kk) ?? []).map(person) : undefined,
    suggestions: i.suggestions.map((s) => ({
      ...s,
      person: person(s.residentId),
      targetKk: s.type === "SET_KK" ? preview(s.kk) : undefined,
    })) as SuggestionView[],
  }));

  return { counts: worklist.counts, total: filtered.length, page, limit, items };
}
