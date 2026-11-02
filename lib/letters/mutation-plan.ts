/**
 * Surat pindah/datang → pengajuan mutasi di Buku Mutasi. Murni (tanpa DB, aman dipakai di klien untuk teks).
 *
 * Penerbitan surat TIDAK mengubah data warga. Ia hanya mengajukan mutasi berstatus PENDING; operator
 * tetap menyetujuinya di Buku Mutasi. Jenis mutasi ditentukan dari `catalogKey` template (bukan dari nama).
 */
import type { MutationInput, NewResidentData } from "../kependudukan/mutation";
import { parseNikInfo } from "../residents-import/nik-date";
import type { LetterValues } from "./values";

export type LetterMutationKind = "MOVE_OUT" | "MOVE_IN";

/** Katalog bawaan yang punya arti kependudukan. Template desa yang menggantikan entri katalog mewarisi kuncinya. */
export const LETTER_MUTATION_CATALOG: Readonly<Record<string, LetterMutationKind>> = {
  cat_kep_sk_pindah: "MOVE_OUT",
  cat_kep_sk_datang: "MOVE_IN",
  cat_kep_skpwni: "MOVE_IN",
};

export function mutationKindOfTemplate(t: { catalogKey?: string | null; inheritsCatalogKey?: string | null }): LetterMutationKind | null {
  for (const key of [t.catalogKey, t.inheritsCatalogKey]) {
    if (key && Object.prototype.hasOwnProperty.call(LETTER_MUTATION_CATALOG, key)) return LETTER_MUTATION_CATALOG[key];
  }
  return null;
}

/** Hasil yang dikirim ke klien bersama respons penerbitan. */
export type LetterMutationOutcome = {
  kind: LetterMutationKind;
  /** Pengajuan yang berhasil dibuat (PENDING). */
  created: Array<{ id: string; name: string }>;
  /** Alasan (bahasa awam) untuk yang tidak dibuat; surat tetap terbit. */
  skipped: string[];
};

export type PlanInput = {
  people: Record<string, { residentId?: number }>;
  groups: Record<string, Array<{ residentId?: number }>>;
};

export type Proposal = { name: string; input: MutationInput };
export type MutationPlan = { proposals: Proposal[]; skipped: string[] };

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const str = (v: string | undefined | null) => (v ?? "").trim();

const isFuture = (iso: string, now: Date) => new Date(`${iso}T00:00:00.000Z`).getTime() > now.getTime();

function followersOf(input: PlanInput, values: Pick<LetterValues, "groups">) {
  const inputs = input.groups.pengikut ?? [];
  const rows = values.groups.pengikut ?? [];
  return inputs.map((r, i) => ({ residentId: r.residentId, name: str(rows[i]?.nama) }));
}

/** Warga baru dari isian pemohon; NIK/tanggal lahir/jenis kelamin yang kosong dilengkapi dari NIK bila bisa. */
export function newResidentFromPerson(p: LetterValues["people"][string]): NewResidentData {
  const nik = str(p.nik);
  const info = parseNikInfo(nik);
  const gender = /^(l|laki)/i.test(str(p.jenis_kelamin)) ? "Laki-laki" : /^(p|perempuan)/i.test(str(p.jenis_kelamin)) ? "Perempuan" : info.gender ?? undefined;
  const ttl = str(p.ttl);
  const out: NewResidentData = {
    name: str(p.nama) || undefined,
    nik: nik || undefined,
    gender,
    birthplace: str(p.tempat_lahir) || (ttl.includes(",") ? ttl.split(",")[0].trim() : "") || undefined,
    birthDate: ISO.test(str(p.tanggal_lahir)) ? str(p.tanggal_lahir) : info.birthDate ?? undefined,
    kk: str(p.kk) || undefined,
    familyRole: str(p.hubungan_keluarga) || undefined,
    fatherName: str(p.nama_ayah) || undefined,
    motherName: str(p.nama_ibu) || undefined,
    rt: str(p.rt) || undefined,
    rw: str(p.rw) || undefined,
    hamlet: str(p.dusun) || undefined,
    address: str(p.alamat) || undefined,
    religion: str(p.agama) || undefined,
    maritalStatus: str(p.status_perkawinan) || undefined,
  };
  for (const k of Object.keys(out) as Array<keyof NewResidentData>) if (out[k] === undefined) delete out[k];
  return out;
}

const PINDAH_DI_BUKU = "Catat di Buku Mutasi bila warga sudah benar-benar pindah.";

function planMoveOut(input: PlanInput, values: LetterValues, now: Date): MutationPlan {
  const plan: MutationPlan = { proposals: [], skipped: [] };
  const date = str(values.fields.tanggal_pindah);
  const destination = str(values.fields.alamat_tujuan);
  const reason = str(values.fields.alasan_pindah);

  if (!ISO.test(date)) return { proposals: [], skipped: ["Tanggal pindah belum diisi, jadi pengajuan mutasi tidak dibuat."] };
  if (isFuture(date, now)) {
    return { proposals: [], skipped: [`Tanggal pindah di surat masih di masa depan (belum tiba), jadi pengajuan mutasi belum dibuat. ${PINDAH_DI_BUKU}`] };
  }
  if (!destination) return { proposals: [], skipped: ["Alamat tujuan belum diisi, jadi pengajuan mutasi tidak dibuat."] };

  const seen = new Set<number>();
  const add = (residentId: number, name: string) => {
    if (seen.has(residentId)) return;
    seen.add(residentId);
    plan.proposals.push({ name: name || "Warga", input: { type: "MOVE_OUT", effectiveDate: date, residentId, details: { destination, ...(reason ? { reason } : {}) } } });
  };

  const applicant = input.people.pemohon?.residentId;
  if (applicant != null) add(applicant, str(values.people.pemohon?.nama));
  else plan.skipped.push("Pemohon tidak dipilih dari Data Warga (diisi manual), jadi tidak ada warga yang bisa diajukan pindah. Pilih pemohon dari Data Warga atau catat di Buku Mutasi.");

  let manualFollowers = 0;
  for (const f of followersOf(input, values)) {
    if (f.residentId != null) add(f.residentId, f.name);
    else if (f.name) manualFollowers += 1;
  }
  if (manualFollowers > 0) plan.skipped.push(`${manualFollowers} anggota keluarga yang ikut pindah diisi manual, jadi tidak diajukan otomatis. Catat di Buku Mutasi.`);
  return plan;
}

function planMoveIn(input: PlanInput, values: LetterValues, now: Date): MutationPlan {
  const status = str(values.fields.status_tinggal);
  if (/sementara/i.test(status)) {
    return { proposals: [], skipped: ["Status tinggal sementara bukan pindah menetap, jadi tidak dicatat sebagai mutasi penduduk."] };
  }
  const date = str(values.fields.tanggal_datang);
  const origin = str(values.fields.daerah_asal) || str(values.fields.alamat_asal);
  if (!ISO.test(date)) return { proposals: [], skipped: ["Tanggal datang belum diisi, jadi pengajuan mutasi tidak dibuat."] };
  if (isFuture(date, now)) return { proposals: [], skipped: ["Tanggal datang di surat masih di masa depan (belum tiba), jadi pengajuan mutasi belum dibuat. Catat di Buku Mutasi saat warga sudah datang."] };
  if (!origin) return { proposals: [], skipped: ["Daerah asal belum diisi, jadi pengajuan mutasi tidak dibuat."] };

  const plan: MutationPlan = { proposals: [], skipped: [] };
  const person = values.people.pemohon ?? {};
  const residentId = input.people.pemohon?.residentId;
  if (residentId != null) {
    plan.proposals.push({ name: str(person.nama) || "Warga", input: { type: "MOVE_IN", effectiveDate: date, residentId, details: { origin } } });
  } else {
    // Pendatang baru: butuh data lengkap (NIK, tempat/tanggal lahir, KK tujuan). Yang kurang → dijelaskan, surat tetap terbit.
    const nr = newResidentFromPerson(person);
    const missing: string[] = [];
    if (!/^\d{16}$/.test(nr.nik ?? "")) missing.push("NIK 16 digit");
    if (!nr.birthplace || !nr.birthDate) missing.push("tempat dan tanggal lahir");
    if (!nr.gender) missing.push("jenis kelamin");
    if (!nr.kk) missing.push("nomor KK tujuan di desa ini");
    if (missing.length > 0) {
      plan.skipped.push(`Data pendatang belum lengkap (${missing.join(", ")}), jadi pengajuan mutasi tidak dibuat. Lengkapi lewat Buku Mutasi → Datang.`);
    } else {
      plan.proposals.push({ name: nr.name ?? "Warga", input: { type: "MOVE_IN", effectiveDate: date, residentId: null, details: { origin, newResident: nr } } });
    }
  }
  const followers = followersOf(input, values).filter((f) => f.name || f.residentId != null);
  if (followers.length > 0) plan.skipped.push("Anggota keluarga yang ikut datang tidak diajukan otomatis (data lahir dan KK mereka tidak ada di surat). Catat satu per satu di Buku Mutasi → Datang.");
  return plan;
}

export function planLetterMutations(args: { kind: LetterMutationKind; input: PlanInput; values: LetterValues; now?: Date }): MutationPlan {
  const now = args.now ?? new Date();
  return args.kind === "MOVE_OUT" ? planMoveOut(args.input, args.values, now) : planMoveIn(args.input, args.values, now);
}

/** Ringkasan untuk panel sukses: judul + butir; `tone` menentukan ikon/warna, tidak hanya warna. */
export type OutcomeSummary = { tone: "success" | "info"; title: string; lines: string[]; showLink: boolean };

export function describeMutationOutcome(o: LetterMutationOutcome): OutcomeSummary {
  const verb = o.kind === "MOVE_OUT" ? "pindah keluar" : "datang";
  if (o.created.length > 0) {
    const names = o.created.map((c) => c.name).join(", ");
    return {
      tone: "success",
      title: `Pengajuan mutasi ${verb} sudah dibuat (${o.created.length})`,
      lines: [`Atas nama: ${names}. Data warga belum berubah sampai disetujui di Buku Mutasi.`, ...o.skipped],
      showLink: true,
    };
  }
  return {
    tone: "info",
    title: `Data warga belum diperbarui (mutasi ${verb} belum diajukan)`,
    lines: o.skipped.length ? o.skipped : ["Catat mutasinya di Buku Mutasi."],
    showLink: true,
  };
}
