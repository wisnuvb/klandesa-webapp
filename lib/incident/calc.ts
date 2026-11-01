/** Logika murni kejadian: siklus status bergerbang, tindakan izin yang dibutuhkan, penyamaran data, dan temuan. Aman untuk klien. */
import { DOMAIN_DEFS, DOMAIN_RESOURCE, type Domain, type EventStatus, type Severity } from "./catalog";

/** Perpindahan status yang sah. CLOSED dan CANCELLED final kecuali CLOSED yang dibuka kembali oleh yang berwenang. */
export const TRANSITIONS: Record<EventStatus, EventStatus[]> = {
  OPEN: ["RESPONDING", "CANCELLED"],
  RESPONDING: ["RESOLVED"],
  RESOLVED: ["CLOSED", "RESPONDING"],
  CLOSED: ["RESPONDING"],
  CANCELLED: [],
};

export const canTransition = (from: EventStatus, to: EventStatus): boolean => TRANSITIONS[from].includes(to);

/** Hanya kejadian yang masih berjalan boleh diubah isiannya atau ditambah tindakan/distribusi. */
export const isEditable = (s: EventStatus): boolean => s === "OPEN" || s === "RESPONDING" || s === "RESOLVED";

/** Tahap lain bagi respons/logistik: boleh dicatat selama kejadian belum ditutup/dibatalkan. */
export const acceptsChildren = isEditable;

/** Aksi izin untuk perpindahan: menutup dan membuka kembali kejadian ditutup = "approve"; selebihnya "update". */
export function transitionAction(from: EventStatus, to: EventStatus): "approve" | "update" {
  return to === "CLOSED" || from === "CLOSED" ? "approve" : "update";
}

export interface GateFacts {
  from: EventStatus;
  to: EventStatus;
  severity: Severity;
  responseCount: number;
  supraReported: boolean;
  /** Catatan/alasan yang diisi operator pada permintaan ini */
  note: string | null;
  /** Ringkasan penyelesaian yang sudah tersimpan pada kejadian */
  resolutionNote: string | null;
}

const MIN_NOTE = 5;

/**
 * Gerbang perpindahan. Mengembalikan pesan galat (bahasa Indonesia) atau null bila lolos.
 * Gerbang adalah kebijakan aplikasi (bukan angka hukum):
 *  - selesai ditangani: minimal satu tindakan tercatat + ringkasan penyelesaian;
 *  - ditutup: bila berat/sangat berat dan belum dilaporkan ke supra-desa, wajib alasan;
 *  - dibatalkan / dibuka kembali: wajib alasan.
 */
export function transitionGate(f: GateFacts): string | null {
  if (!canTransition(f.from, f.to)) return `Kejadian berstatus "${LABEL[f.from]}" tidak dapat langsung diubah menjadi "${LABEL[f.to]}".`;
  const note = (f.note ?? "").trim();
  if (f.to === "CANCELLED" && note.length < MIN_NOTE) return "Tulis alasan pembatalan (minimal 5 karakter).";
  if (f.to === "RESPONDING" && (f.from === "RESOLVED" || f.from === "CLOSED") && note.length < MIN_NOTE) return "Tulis alasan membuka kembali penanganan (minimal 5 karakter).";
  if (f.to === "RESOLVED") {
    if (f.responseCount < 1) return "Catat minimal satu tindakan penanganan sebelum menandai selesai ditangani.";
    if ((f.resolutionNote ?? "").trim().length < MIN_NOTE && note.length < MIN_NOTE) return "Tulis ringkasan penyelesaian (minimal 5 karakter).";
  }
  if (f.to === "CLOSED" && (f.severity === "HIGH" || f.severity === "CRITICAL") && !f.supraReported && note.length < MIN_NOTE) {
    return "Kejadian berat/sangat berat belum dicatat dilaporkan ke supra-desa. Catat pelaporannya, atau tulis alasan mengapa tidak dilaporkan.";
  }
  return null;
}

const LABEL: Record<EventStatus, string> = { OPEN: "Dilaporkan", RESPONDING: "Ditangani", RESOLVED: "Selesai ditangani", CLOSED: "Ditutup", CANCELLED: "Dibatalkan" };

/** Kunci anti-ganda distribusi: huruf kecil, spasi dirapikan, maks 100 karakter. */
export const normalizeItemKey = (item: string): string => item.replace(/\s+/g, " ").trim().toLowerCase().slice(0, 100);

/** "3374012345671234" → "••••••••••••1234". Hanya 4 digit terakhir. */
export const maskKk = (kk: string | null | undefined): string => (kk ? `${"•".repeat(Math.max(0, kk.length - 4))}${kk.slice(-4)}` : "-");

/** "Sutarno Hadi" → "S******* H***". Menyisakan huruf pertama tiap kata. */
export const maskName = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => (w.length <= 1 ? w : `${[...w][0]}${"*".repeat(Math.min(6, [...w].length - 1))}`))
    .join(" ");

export interface IncidentFinding {
  level: "WARN" | "INFO";
  code: string;
  message: string;
}

export interface FindingFacts {
  domain: Domain;
  kind: string;
  severity: Severity;
  status: EventStatus;
  occurredAt: Date;
  supraReportedAt: Date | null;
  responseCount: number;
  now: Date;
}

const H = 3_600_000;

/**
 * Temuan operasional (batas jam adalah kebijakan aplikasi, bukan aturan hukum):
 *  - belum ada tindakan setelah 6 jam; berat/sangat berat belum dilaporkan ke supra-desa setelah 24 jam.
 * Untuk bencana alam, pengingat bahwa pengecualian Dana Desa PMK 7/2026 berlaku untuk bencana TA 2025 saja [V Pasal 20(7), 48].
 */
export function incidentFindings(f: FindingFacts): IncidentFinding[] {
  const out: IncidentFinding[] = [];
  const age = f.now.getTime() - f.occurredAt.getTime();
  if (!acceptsChildren(f.status) || f.status === "RESOLVED") return out;
  if (f.responseCount === 0 && age > 6 * H) out.push({ level: "WARN", code: "NO_RESPONSE", message: "Belum ada tindakan tercatat lebih dari 6 jam sejak kejadian." });
  if ((f.severity === "HIGH" || f.severity === "CRITICAL") && !f.supraReportedAt && age > 24 * H) {
    out.push({ level: "WARN", code: "NOT_REPORTED", message: "Kejadian berat/sangat berat belum dicatat dilaporkan ke supra-desa lebih dari 24 jam." });
  }
  if (f.domain === "BENCANA" && DOMAIN_DEFS.BENCANA.kinds[f.kind]?.category === "ALAM") {
    out.push(
      f.occurredAt.getUTCFullYear() === 2025
        ? { level: "INFO", code: "DD_EXCEPTION_2025", message: "Bencana alam tahun anggaran 2025 dapat memakai pengecualian Dana Desa PMK 7/2026 (Pasal 20 ayat 7; Pasal 48 dan 59 untuk syarat penyaluran). Bupati/wali kota yang memverifikasi kejadian dan mengajukan permohonan; catat laporan ke supra-desa di sini." }
        : { level: "INFO", code: "DD_EXCEPTION_SCOPE", message: "Pengecualian Dana Desa dalam PMK 7/2026 (Pasal 20 ayat 7, Pasal 48, Pasal 59) hanya mengatur bencana alam yang terjadi pada tahun anggaran 2025. Untuk kejadian di luar itu, tanyakan ketentuan yang berlaku ke DPMD/kabupaten." },
    );
  }
  return out;
}

/** Izin "baca rinci" = aksi export pada resource domain (nama penerima per KK, dst.). */
export const DETAIL_ACTION = "export" as const;

/** Nama resource izin domain (mis. "bencana"). */
export const resourceOf = (domain: Domain): string => DOMAIN_RESOURCE[domain];

/** Ringkasan dampak untuk tampilan satu baris. */
export function impactSummary(i: { deathCount: number | null; missingCount: number | null; injuredCount: number | null; displacedCount: number | null; affectedHouseholds: number | null; damagedHouses: number | null }): string {
  const parts: string[] = [];
  if (i.deathCount) parts.push(`${i.deathCount} meninggal`);
  if (i.missingCount) parts.push(`${i.missingCount} hilang`);
  if (i.injuredCount) parts.push(`${i.injuredCount} luka`);
  if (i.displacedCount) parts.push(`${i.displacedCount} mengungsi`);
  if (i.affectedHouseholds) parts.push(`${i.affectedHouseholds} KK terdampak`);
  if (i.damagedHouses) parts.push(`${i.damagedHouses} rumah rusak`);
  return parts.join(" · ");
}
