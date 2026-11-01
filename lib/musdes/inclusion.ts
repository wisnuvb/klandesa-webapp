import { FULL_REPRESENTATION_KINDS, INCLUSION_KINDS, KINDS, MUSRENBANG_UNSUR, UNSUR, type InclusionWarning, type MeetingKind, type Unsur } from "./catalog";

export interface AttendeeLite {
  unsur: string;
  gender: string | null;
  present: boolean;
}

/**
 * Keterwakilan peserta. Dihitung dari peserta yang HADIR bila musyawarah sudah terlaksana; sebelumnya dari seluruh undangan.
 * Permendesa PDT 16/2025 Pasal 9 ayat 2 (berpihak pada warga miskin, disabilitas, perempuan, anak, kelompok marginal)
 * dan Permendagri 114/2014 Pasal 46 ayat 2-3 (Pemerintah Desa, BPD, sepuluh unsur masyarakat).
 */
export function inclusionWarnings(kind: MeetingKind, attendees: readonly AttendeeLite[], opts: { onlyPresent: boolean }): InclusionWarning[] {
  if (!INCLUSION_KINDS.includes(kind)) return [];
  const list = opts.onlyPresent ? attendees.filter((a) => a.present) : attendees;
  const has = (u: Unsur) => list.some((a) => a.unsur === u);
  const out: InclusionWarning[] = [];
  const phase = opts.onlyPresent ? "yang hadir" : "yang diundang";

  if (KINDS[kind].organizer === "Badan Permusyawaratan Desa" && !has("BPD")) {
    out.push({ code: "NO_BPD", message: `Belum ada anggota BPD di antara peserta ${phase}; musyawarah ini diselenggarakan oleh BPD.` });
  }
  if (FULL_REPRESENTATION_KINDS.includes(kind) && !has("PEMERINTAH_DESA")) {
    out.push({ code: "NO_VILLAGE_GOV", message: `Belum ada unsur Pemerintah Desa di antara peserta ${phase} (Permendagri 114/2014 Pasal 46 ayat 2).` });
  }
  if (!list.some((a) => a.gender === "P" || a.unsur === "KELOMPOK_PEREMPUAN")) {
    out.push({ code: "NO_WOMEN", message: `Belum ada perempuan di antara peserta ${phase} (Permendesa PDT 16/2025 Pasal 9 ayat 2).` });
  }
  if (!has("KELOMPOK_MISKIN")) {
    out.push({ code: "NO_POOR", message: `Belum ada perwakilan masyarakat miskin di antara peserta ${phase}.` });
  }
  if (!has("DISABILITAS")) {
    out.push({ code: "NO_DISABLED", message: `Belum ada perwakilan penyandang disabilitas di antara peserta ${phase}.` });
  }
  if (!has("KELOMPOK_ANAK")) {
    out.push({ code: "NO_CHILD_GROUP", message: `Belum ada perwakilan kelompok pemerhati dan pelindungan anak di antara peserta ${phase}.` });
  }
  if (FULL_REPRESENTATION_KINDS.includes(kind)) {
    // Unsur yang sudah punya peringatan khusus di atas tidak diulang di daftar ini.
    const already = new Set<Unsur>();
    if (out.some((w) => w.code === "NO_POOR")) already.add("KELOMPOK_MISKIN");
    if (out.some((w) => w.code === "NO_CHILD_GROUP")) already.add("KELOMPOK_ANAK");
    if (out.some((w) => w.code === "NO_WOMEN")) already.add("KELOMPOK_PEREMPUAN");
    const rest = MUSRENBANG_UNSUR.filter((u) => !has(u) && !already.has(u));
    if (rest.length) {
      out.push({
        code: "MISSING_UNSUR",
        message: `Unsur masyarakat menurut Pasal 46 ayat 3 yang belum terwakili: ${rest.map((u) => UNSUR[u].replace(/^Perwakilan /, "").toLowerCase()).join(", ")}.`,
      });
    }
  }
  return out;
}
