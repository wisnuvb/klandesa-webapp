/**
 * Teks dan aturan formulir Buku Mutasi (murni, aman di klien). Bahasa awam untuk operator desa.
 * `buildSubmitBody` mengubah isian formulir menjadi badan permintaan POST /api/kependudukan/mutasi
 * dan memeriksa yang bisa diperiksa di layar sebelum dikirim; pemeriksaan penuh tetap di server.
 */
import { MUTATION_LABEL, type MutationType } from "./mutation";

export type MutasiStatus = "PENDING" | "APPLIED" | "REJECTED" | "CANCELLED";

export const MUTASI_TYPES: readonly MutationType[] = ["BIRTH", "DEATH", "MOVE_OUT", "MOVE_IN", "KK_CHANGE"];

export const STATUS_META: Record<MutasiStatus, { label: string; hint: string }> = {
  PENDING: { label: "Menunggu keputusan", hint: "Belum mengubah data warga." },
  APPLIED: { label: "Sudah diterapkan", hint: "Data warga sudah diperbarui." },
  REJECTED: { label: "Ditolak", hint: "Tidak mengubah data warga." },
  CANCELLED: { label: "Dibatalkan", hint: "Dibatalkan oleh pengaju." },
};

export const TYPE_META: Record<MutationType, { title: string; help: string }> = {
  BIRTH: { title: MUTATION_LABEL.BIRTH, help: "Mencatat bayi baru lahir. NIK boleh menyusul: diisi saat disetujui, setelah akta atau NIK terbit." },
  DEATH: { title: MUTATION_LABEL.DEATH, help: "Warga ditandai meninggal. Akun aplikasinya otomatis dinonaktifkan." },
  MOVE_OUT: { title: MUTATION_LABEL.MOVE_OUT, help: "Warga pindah ke luar desa. Akun aplikasinya otomatis dinonaktifkan." },
  MOVE_IN: { title: MUTATION_LABEL.MOVE_IN, help: "Warga baru datang dari luar desa, atau warga yang pernah pindah kembali ke desa." },
  KK_CHANGE: { title: MUTATION_LABEL.KK_CHANGE, help: "Memindahkan satu warga ke KK lain, misalnya setelah menikah atau pisah KK." },
};

export const FAMILY_ROLES = ["Kepala Keluarga", "Istri", "Anak", "Menantu", "Cucu", "Orang Tua", "Mertua", "Famili Lain", "Pembantu", "Lainnya"] as const;

export interface ResidentPick {
  id: number;
  name: string;
  /** Hanya 4 digit terakhir yang ditampilkan di layar. */
  nikLast4: string;
  kkLast4: string | null;
  rt: string | null;
  rw: string | null;
  status: "aktif" | "meninggal" | "pindah";
}

export interface MutasiForm {
  type: MutationType;
  effectiveDate: string;
  resident: ResidentPick | null;
  // kematian
  cause: string;
  certificateNumber: string;
  // pindah keluar
  destination: string;
  reason: string;
  // datang
  origin: string;
  /** Datang: warga lama yang kembali (true) atau warga baru. */
  returning: boolean;
  // ganti KK
  toKk: string;
  newFamilyRole: string;
  // warga baru (kelahiran / datang baru)
  name: string;
  gender: "" | "Laki-laki" | "Perempuan";
  birthplace: string;
  birthDate: string;
  nik: string;
  kk: string;
  familyRole: string;
  motherNik: string;
  religion: string;
  address: string;
}

export const emptyForm = (type: MutationType = "DEATH"): MutasiForm => ({
  type,
  effectiveDate: "",
  resident: null,
  cause: "",
  certificateNumber: "",
  destination: "",
  reason: "",
  origin: "",
  returning: true,
  toKk: "",
  newFamilyRole: "",
  name: "",
  gender: "",
  birthplace: "",
  birthDate: "",
  nik: "",
  kk: "",
  familyRole: "Anak",
  motherNik: "",
  religion: "",
  address: "",
});

const digits = (s: string) => s.replace(/\D/g, "");
const t = (s: string) => s.trim();
const put = <T extends Record<string, unknown>>(o: T, k: string, v: string) => {
  if (v) (o as Record<string, unknown>)[k] = v;
};

export type BuildResult = { ok: true; body: Record<string, unknown> } | { ok: false; errors: string[] };

/** Apakah jenis ini memakai warga yang sudah ada (bukan membuat warga baru). */
export function usesExistingResident(f: Pick<MutasiForm, "type" | "returning">): boolean {
  return f.type === "DEATH" || f.type === "MOVE_OUT" || f.type === "KK_CHANGE" || (f.type === "MOVE_IN" && f.returning);
}

export function buildSubmitBody(f: MutasiForm): BuildResult {
  const errors: string[] = [];
  if (!f.effectiveDate) errors.push("Isi tanggal kejadian.");
  const existing = usesExistingResident(f);
  if (existing && !f.resident) errors.push("Pilih warganya.");

  const details: Record<string, unknown> = {};
  switch (f.type) {
    case "DEATH":
      put(details, "cause", t(f.cause));
      put(details, "certificateNumber", t(f.certificateNumber));
      break;
    case "MOVE_OUT":
      if (!t(f.destination)) errors.push("Isi tujuan pindah.");
      put(details, "destination", t(f.destination));
      put(details, "reason", t(f.reason));
      break;
    case "KK_CHANGE":
      if (digits(f.toKk).length !== 16) errors.push("Nomor KK tujuan harus 16 angka.");
      if (!f.newFamilyRole) errors.push("Pilih hubungan dalam KK yang baru.");
      put(details, "toKk", digits(f.toKk));
      put(details, "newFamilyRole", f.newFamilyRole);
      break;
    case "MOVE_IN":
    case "BIRTH": {
      if (f.type === "MOVE_IN") {
        if (!t(f.origin)) errors.push("Isi asal daerah.");
        put(details, "origin", t(f.origin));
      }
      if (!existing) {
        if (!t(f.name)) errors.push("Isi nama.");
        if (!f.gender) errors.push("Pilih jenis kelamin.");
        if (!t(f.birthplace)) errors.push("Isi tempat lahir.");
        const birthDate = f.type === "BIRTH" ? f.effectiveDate : f.birthDate;
        if (f.type === "MOVE_IN" && !f.birthDate) errors.push("Isi tanggal lahir.");
        const nik = digits(f.nik);
        if (f.type === "MOVE_IN" && nik.length !== 16) errors.push("NIK harus 16 angka.");
        if (f.type === "BIRTH" && nik && nik.length !== 16) errors.push("NIK harus 16 angka, atau kosongkan dulu.");
        const kk = digits(f.kk);
        const mother = digits(f.motherNik);
        if (kk && kk.length !== 16) errors.push("Nomor KK harus 16 angka.");
        if (f.type === "BIRTH" && !kk && mother.length !== 16) errors.push("Isi nomor KK, atau NIK ibu (16 angka) agar bayi masuk KK yang tepat.");
        if (f.type === "MOVE_IN" && !kk) errors.push("Isi nomor KK tujuan.");
        const nr: Record<string, unknown> = {};
        put(nr, "name", t(f.name));
        put(nr, "gender", f.gender);
        put(nr, "birthplace", t(f.birthplace));
        put(nr, "birthDate", birthDate);
        put(nr, "nik", nik);
        put(nr, "kk", kk);
        put(nr, "familyRole", f.familyRole);
        put(nr, "motherNik", mother);
        put(nr, "religion", t(f.religion));
        put(nr, "address", t(f.address));
        details.newResident = nr;
      }
      break;
    }
  }

  if (errors.length) return { ok: false, errors };
  return {
    ok: true,
    body: { type: f.type, effectiveDate: f.effectiveDate, residentId: existing ? f.resident!.id : null, details },
  };
}

export interface MutasiItemView {
  id: string;
  type: MutationType;
  status: MutasiStatus;
  source: string;
  effectiveDate: string;
  residentId: number | null;
  residentName: string | null;
  residentNikLast4: string | null;
  rt: string | null;
  rw: string | null;
  householdKk: string | null;
  details: {
    cause?: string;
    destination?: string;
    reason?: string;
    origin?: string;
    toKk?: string;
    newFamilyRole?: string;
    newResident?: { name?: string };
  } | null;
  requestedBy: string | null;
  decidedBy: string | null;
  decidedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
}

const DATE_FMT = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
export const formatTanggal = (iso: string) => {
  const d = new Date(`${iso}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? iso : DATE_FMT.format(d);
};

/** Satu kalimat ringkas yang bisa dibaca sekilas: "Budi pindah ke Surabaya". */
export function describeMutation(m: MutasiItemView): string {
  const who = m.residentName ?? m.details?.newResident?.name ?? "Warga";
  const d = m.details ?? {};
  switch (m.type) {
    case "BIRTH":
      return `Bayi ${who} lahir`;
    case "DEATH":
      return `${who} meninggal${d.cause ? ` (${d.cause})` : ""}`;
    case "MOVE_OUT":
      return `${who} pindah${d.destination ? ` ke ${d.destination}` : ""}`;
    case "MOVE_IN":
      return `${who} datang${d.origin ? ` dari ${d.origin}` : ""}`;
    case "KK_CHANGE":
      return `${who} pindah KK${d.toKk ? ` ke KK berakhiran ${d.toKk.slice(-4)}` : ""}`;
  }
}

/** Jenis yang memerlukan NIK warga baru saat disetujui. */
export function needsNikOnApprove(m: Pick<MutasiItemView, "type" | "residentId">): boolean {
  return (m.type === "BIRTH" || m.type === "MOVE_IN") && m.residentId == null;
}
