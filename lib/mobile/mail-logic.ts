/** Logika murni layanan surat untuk warga (tanpa DB) agar mudah dites. Lihat docs/MOBILE_V2_PRODUCT_SPEC.md §4.3. */

export type StepState = "done" | "current" | "todo" | "failed";
export type MailStage = "sent" | "approved" | "ready" | "rejected";

export type MailStep = { key: "sent" | "rt" | "review" | "done"; label: string; state: StepState; at: string | null };

export type MailRequestView = {
  stage: MailStage;
  title: string;
  /** Kalimat "langkah berikutnya" untuk warga */
  next: string;
  steps: MailStep[];
};

type MailRow = {
  status: string;
  requestDate: Date;
  processedDate: Date | null;
  notes: string | null;
  rejectionReason: string | null;
  /** Tahap pengantar RT (null = tidak ada tahap RT). */
  rtStatus?: string | null;
  rtDecidedAt?: Date | null;
};

const iso = (d: Date | null | undefined) => (d ? d.toISOString() : null);

/**
 * Status DB (pending/approved/rejected) → bahasa warga. `letterReady` = surat sudah diterbitkan
 * (MailService selesai) sehingga bisa diunduh; bila belum, "disetujui" berarti diproses/ambil di kantor desa.
 */
function describeBase(row: MailRow, letterReady: boolean): MailRequestView {
  const sent: MailStep = { key: "sent", label: "Terkirim", state: "done", at: iso(row.requestDate) };

  if (row.status === "rejected") {
    return {
      stage: "rejected",
      title: "Perlu diperbaiki",
      next: row.rejectionReason
        ? `Alasan dari desa: ${row.rejectionReason}. Perbaiki lalu kirim lagi.`
        : "Permohonan belum bisa diproses. Perbaiki lalu kirim lagi, atau hubungi kantor desa.",
      steps: [
        sent,
        { key: "review", label: "Diperiksa desa", state: "failed", at: iso(row.processedDate) },
        { key: "done", label: "Selesai", state: "todo", at: null },
      ],
    };
  }

  if (row.status === "approved") {
    const ready = letterReady;
    return {
      stage: ready ? "ready" : "approved",
      title: ready ? "Surat sudah jadi" : "Disetujui desa",
      next: ready
        ? "Surat bisa diunduh sekarang. Simpan atau bagikan sesuai keperluan."
        : row.notes
          ? `Disetujui. Catatan desa: ${row.notes}`
          : "Disetujui. Surat sedang disiapkan atau bisa diambil di kantor desa pada jam layanan (bawa KTP).",
      steps: [
        sent,
        { key: "review", label: "Diperiksa desa", state: "done", at: iso(row.processedDate) },
        { key: "done", label: "Selesai", state: ready ? "done" : "current", at: ready ? iso(row.processedDate) : null },
      ],
    };
  }

  return {
    stage: "sent",
    title: "Menunggu desa memeriksa",
    next: "Perangkat desa akan memeriksa permohonan Anda. Kami kabari lewat notifikasi bila ada perkembangan.",
    steps: [
      sent,
      { key: "review", label: "Diperiksa desa", state: "current", at: null },
      { key: "done", label: "Selesai", state: "todo", at: null },
    ],
  };
}

/** Sisipkan langkah "Pengantar RT" bila permohonan melewati RT. Penolakan RT tampil sebagai langkah RT yang gagal. */
export function describeMailRequest(row: MailRow, letterReady: boolean): MailRequestView {
  const base = describeBase(row, letterReady);
  if (row.rtStatus == null) return base;
  const [sent, ...rest] = base.steps;

  if (row.rtStatus === "pending" && row.status === "pending") {
    return {
      stage: "sent",
      title: "Menunggu Pak/Bu RT",
      next: "Permohonan Anda sedang menunggu pengantar dari Ketua RT. Setelah itu baru diperiksa desa.",
      steps: [sent, { key: "rt", label: "Pengantar RT", state: "current", at: null }, { key: "review", label: "Diperiksa desa", state: "todo", at: null }, rest[rest.length - 1]],
    };
  }
  if (row.rtStatus === "rejected") {
    return {
      ...base,
      next: row.rejectionReason ? `${row.rejectionReason}. Perbaiki lalu kirim lagi, atau temui Ketua RT.` : base.next,
      steps: [
        sent,
        { key: "rt", label: "Pengantar RT", state: "failed", at: iso(row.rtDecidedAt ?? row.processedDate) },
        { key: "review", label: "Diperiksa desa", state: "todo", at: null },
        rest[rest.length - 1],
      ],
    };
  }
  return { ...base, steps: [sent, { key: "rt", label: "Pengantar RT", state: "done", at: iso(row.rtDecidedAt) }, ...rest] };
}

export type ServiceInput = { id: number; name: string; category: string };

// Urutan awal untuk desa baru (belum cukup data): jenis surat yang umum diminta warga.
const DEFAULT_POPULAR_HINTS = ["domisili", "tidak mampu", "skck", "usaha", "belum menikah", "kelahiran", "kematian", "ktp", "pengantar"];

export const MIN_REQUESTS_FOR_STATS = 20;

/**
 * Pilih "Paling sering diajukan". Cukup data (>= 20 permohonan) → 5 teratas menurut jumlah;
 * kalau tidak → tebak dari daftar baku berdasarkan kata kunci pada nama surat.
 */
export function pickPopular(
  services: ServiceInput[],
  countsByName: Map<string, number>,
  totalRequests: number,
  limit = 5,
): number[] {
  if (totalRequests >= MIN_REQUESTS_FOR_STATS) {
    return services
      .map((s) => ({ id: s.id, n: countsByName.get(s.name.toLowerCase()) ?? 0 }))
      .filter((x) => x.n > 0)
      .sort((a, b) => b.n - a.n || a.id - b.id)
      .slice(0, limit)
      .map((x) => x.id);
  }
  const picked: number[] = [];
  for (const hint of DEFAULT_POPULAR_HINTS) {
    const hit = services.find((s) => !picked.includes(s.id) && s.name.toLowerCase().includes(hint));
    if (hit) picked.push(hit.id);
    if (picked.length >= limit) break;
  }
  return picked;
}

/** Median jam proses dari daftar durasi (ms); null bila data < 5 agar tidak menjanjikan angka palsu. */
export function medianProcessHours(durationsMs: number[]): number | null {
  const xs = durationsMs.filter((d) => d > 0).sort((a, b) => a - b);
  if (xs.length < 5) return null;
  const mid = Math.floor(xs.length / 2);
  const med = xs.length % 2 ? xs[mid]! : (xs[mid - 1]! + xs[mid]!) / 2;
  return Math.max(1, Math.round(med / 3_600_000));
}

/** Teks perkiraan untuk warga: "biasanya selesai ≤ 1 hari kerja". */
export function formatEstimate(hours: number | null): string | null {
  if (hours == null) return null;
  if (hours < 24) return "Biasanya selesai dalam beberapa jam";
  const days = Math.ceil(hours / 24);
  return `Biasanya selesai dalam ${days} hari`;
}

export function excerpt(text: string, max = 140): string {
  const t = text.replace(/\s+/g, " ").trim();
  return t.length <= max ? t : `${t.slice(0, max - 1).trimEnd()}…`;
}

/** Kepala keluarga boleh mengajukan atas nama anggota KK-nya; selain itu hanya diri sendiri. */
export function canActForMember(requesterFamilyRole: string | null | undefined): boolean {
  return /kepala/i.test(requesterFamilyRole ?? "");
}

export function maskNik(nik: string): string {
  return nik.length >= 8 ? `${nik.slice(0, 4)}••••••••${nik.slice(-4)}` : "••••";
}
