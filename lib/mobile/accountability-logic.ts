/**
 * Rapor layanan desa (akuntabilitas): murni, tanpa DB. Dipakai dashboard kades (mobile), dashboard wilayah (web)
 * dan halaman rapor publik (opt-in). Prinsip: angka hanya tampil bila sampelnya cukup agar tidak menyesatkan;
 * selebihnya `null` dan UI menulis "belum cukup data".
 */

export const MIN_MAIL_SAMPLE = 5;
export const MIN_REPORT_SAMPLE = 5;
export const MIN_FEEDBACK_SAMPLE = 3;
export const REPORT_RESPONSE_SLA_HOURS = 72;
export const MAIL_SLA_HOURS = 48;
const HOUR = 3600 * 1000;

export type MailRow = { status: string; channel: string; requestDate: Date; processedDate: Date | null };
export type ReportRow = { status: string; createdAt: Date; firstResponseAt: Date | null; resolvedFeedback: string | null };

export type Accountability = {
  mail: {
    total: number; viaApp: number; viaAppPercent: number | null;
    processed: number; medianHours: number | null; withinSlaPercent: number | null;
    pending: number; oldestPendingHours: number | null;
  };
  reports: {
    total: number; eligible: number; respondedInTime: number; respondedInTimePercent: number | null;
    done: number; resolvedYes: number; resolvedNo: number; resolvedPercent: number | null;
  };
  activation: { residents: number; accounts: number; percent: number | null };
};

const pct = (n: number, d: number): number => Math.round((n / d) * 100);

export function median(xs: number[]): number | null {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
}

/** Jam, satu desimal. */
const hours = (ms: number) => Math.round((ms / HOUR) * 10) / 10;

export function computeAccountability(input: {
  mail: MailRow[]; reports: ReportRow[]; aliveResidents: number; activeAccounts: number; now: Date;
}): Accountability {
  const nowMs = input.now.getTime();

  // Surat: "diproses" = sudah disetujui/ditolak desa (ada processedDate setelah requestDate).
  const durations: number[] = [];
  let pending = 0;
  let oldestPendingMs: number | null = null;
  for (const m of input.mail) {
    if (m.status === "pending") {
      pending += 1;
      const age = nowMs - m.requestDate.getTime();
      if (age >= 0 && (oldestPendingMs === null || age > oldestPendingMs)) oldestPendingMs = age;
    } else if (m.processedDate && m.processedDate.getTime() >= m.requestDate.getTime()) {
      durations.push(m.processedDate.getTime() - m.requestDate.getTime());
    }
  }
  const viaApp = input.mail.filter((m) => m.channel === "mobile").length;
  const mailEnough = durations.length >= MIN_MAIL_SAMPLE;
  const withinSla = durations.filter((d) => d <= MAIL_SLA_HOURS * HOUR).length;

  // Pengaduan: yang dihitung untuk SLA hanya yang sudah lewat batas waktu atau sudah ditanggapi (yang baru masuk belum "terlambat").
  const slaMs = REPORT_RESPONSE_SLA_HOURS * HOUR;
  const eligible = input.reports.filter((r) => r.firstResponseAt !== null || nowMs - r.createdAt.getTime() >= slaMs);
  const inTime = eligible.filter((r) => r.firstResponseAt !== null && r.firstResponseAt.getTime() - r.createdAt.getTime() <= slaMs).length;
  const yes = input.reports.filter((r) => r.resolvedFeedback === "RESOLVED").length;
  const no = input.reports.filter((r) => r.resolvedFeedback === "NOT_RESOLVED").length;

  return {
    mail: {
      total: input.mail.length, viaApp, viaAppPercent: input.mail.length >= MIN_MAIL_SAMPLE ? pct(viaApp, input.mail.length) : null,
      processed: durations.length, medianHours: mailEnough ? hours(median(durations)!) : null,
      withinSlaPercent: mailEnough ? pct(withinSla, durations.length) : null,
      pending, oldestPendingHours: oldestPendingMs === null ? null : hours(oldestPendingMs),
    },
    reports: {
      total: input.reports.length, eligible: eligible.length, respondedInTime: inTime,
      respondedInTimePercent: eligible.length >= MIN_REPORT_SAMPLE ? pct(inTime, eligible.length) : null,
      done: input.reports.filter((r) => r.status === "DONE").length,
      resolvedYes: yes, resolvedNo: no,
      resolvedPercent: yes + no >= MIN_FEEDBACK_SAMPLE ? pct(yes, yes + no) : null,
    },
    activation: {
      residents: input.aliveResidents, accounts: input.activeAccounts,
      percent: input.aliveResidents > 0 ? Math.min(100, pct(input.activeAccounts, input.aliveResidents)) : null,
    },
  };
}

/** Bagi baris ke dua jendela berurutan [now-2w, now-w) dan [now-w, now] untuk membandingkan periode. */
export function splitWindows<T>(rows: T[], dateOf: (r: T) => Date, now: Date, windowDays: number): { current: T[]; previous: T[] } {
  const w = windowDays * 24 * HOUR;
  const t = now.getTime();
  const current: T[] = [];
  const previous: T[] = [];
  for (const r of rows) {
    const age = t - dateOf(r).getTime();
    if (age < 0) continue;
    if (age <= w) current.push(r);
    else if (age <= 2 * w) previous.push(r);
  }
  return { current, previous };
}

export type Trend = "better" | "worse" | "same" | "unknown";

/** `higherIsBetter=false` untuk durasi (lebih kecil lebih baik). Selisih kecil (<5%/<1 poin) dianggap sama. */
export function trendOf(now: number | null, before: number | null, higherIsBetter: boolean): Trend {
  if (now === null || before === null) return "unknown";
  const diff = now - before;
  const tolerance = Math.max(1, Math.abs(before) * 0.05);
  if (Math.abs(diff) < tolerance) return "same";
  return (diff > 0) === higherIsBetter ? "better" : "worse";
}
