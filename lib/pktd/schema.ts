import { cleanText as text, isRecord, parseIsoDate, type Parsed } from "@/lib/form-input";
import { toCents } from "@/lib/coop/loan-math";
import { isKegiatanCode } from "@/lib/apbdes/catalog";
import { LIMITS, isPriority, isTask, type Priority, type Task } from "./catalog";

const has = (b: Record<string, unknown>, k: string) => Object.prototype.hasOwnProperty.call(b, k);
const blank = (v: unknown) => v === undefined || v === null || v === "";
const MAX_CENTS = 99_999_999_999_999n;
const posInt = (v: unknown): number | null => {
  const n = Number(v);
  return Number.isInteger(n) && n >= 1 && n <= 2_000_000_000 ? n : null;
};
function money(v: unknown): { value: bigint | null; bad: boolean } {
  if (blank(v)) return { value: null, bad: false };
  const c = typeof v === "string" || typeof v === "number" ? toCents(v) : null;
  return c === null || c > MAX_CENTS ? { value: null, bad: true } : { value: c, bad: false };
}

export interface ActivityCreate {
  year: number;
  title: string;
  activityCode: string | null;
  location: string | null;
  startDate: Date | null;
  endDate: Date | null;
  costCents: bigint;
  plannedWageCents: bigint;
}
export function parseActivityCreate(body: unknown): Parsed<ActivityCreate> {
  const fe: Record<string, string> = {};
  if (!isRecord(body)) return { ok: false, errors: ["Data tidak valid."], fieldErrors: {} };
  const year = Number(body.year);
  if (!Number.isInteger(year) || year < 2000 || year > 2100) fe.year = "Isi tahun antara 2000 dan 2100.";
  const title = text(body.title, 200);
  if (title.bad || title.tooLong || !title.value) fe.title = "Nama kegiatan wajib diisi (maks. 200 karakter).";
  const code = typeof body.activityCode === "string" ? body.activityCode.trim() : "";
  if (code && !isKegiatanCode(code)) fe.activityCode = "Kode kegiatan tidak dikenal.";
  const loc = text(body.location, 200);
  if (loc.bad || loc.tooLong) fe.location = "Lokasi maksimal 200 karakter.";
  const dates = (["startDate", "endDate"] as const).map((k) => {
    if (blank(body[k])) return null;
    const d = parseIsoDate(body[k]);
    if (!d) fe[k] = "Tanggal tidak valid.";
    return d;
  });
  if (dates[0] && dates[1] && dates[1] < dates[0]) fe.endDate = "Tanggal selesai tidak boleh sebelum tanggal mulai.";
  const cost = money(body.cost);
  if (cost.bad || cost.value === null || cost.value <= 0n) fe.cost = "Total biaya kegiatan harus angka rupiah lebih dari nol.";
  const wage = money(body.plannedWage);
  if (wage.bad) fe.plannedWage = "Rencana upah harus angka rupiah.";
  if (cost.value !== null && wage.value !== null && wage.value > cost.value) fe.plannedWage = "Rencana upah tidak boleh melebihi total biaya.";
  if (Object.keys(fe).length) return { ok: false, errors: Object.values(fe), fieldErrors: fe };
  return { ok: true, value: { year, title: title.value!, activityCode: code || null, location: loc.value, startDate: dates[0] ?? null, endDate: dates[1] ?? null, costCents: cost.value!, plannedWageCents: wage.value ?? 0n } };
}

export interface ActivityPatch {
  title?: string;
  activityCode?: string | null;
  location?: string | null;
  startDate?: Date | null;
  endDate?: Date | null;
  costCents?: bigint;
  plannedWageCents?: bigint;
  wageMinCents?: bigint | null;
  wageMaxCents?: bigint | null;
  wageBasis?: string | null;
  status?: "AKTIF" | "SELESAI";
  note?: string | null;
}
export function parseActivityPatch(body: unknown): Parsed<ActivityPatch> {
  const fe: Record<string, string> = {};
  if (!isRecord(body)) return { ok: false, errors: ["Data tidak valid."], fieldErrors: {} };
  const out: ActivityPatch = {};
  const str = (k: "title" | "location" | "wageBasis" | "note", max: number, label: string, required = false) => {
    if (!has(body, k)) return;
    const t = text(body[k], max);
    if (t.bad || t.tooLong || (required && !t.value)) fe[k] = `${label} ${required ? "wajib diisi " : ""}(maks. ${max} karakter).`;
    else (out as Record<string, unknown>)[k] = t.value;
  };
  str("title", 200, "Nama kegiatan", true);
  str("location", 200, "Lokasi");
  str("wageBasis", 200, "Dasar penetapan batas upah");
  str("note", 500, "Catatan");
  if (has(body, "activityCode")) {
    const c = typeof body.activityCode === "string" ? body.activityCode.trim() : "";
    if (c && !isKegiatanCode(c)) fe.activityCode = "Kode kegiatan tidak dikenal.";
    else out.activityCode = c || null;
  }
  for (const k of ["startDate", "endDate"] as const) {
    if (has(body, k)) {
      if (blank(body[k])) out[k] = null;
      else {
        const d = parseIsoDate(body[k]);
        if (!d) fe[k] = "Tanggal tidak valid.";
        else out[k] = d;
      }
    }
  }
  if (has(body, "cost")) {
    const m = money(body.cost);
    if (m.bad || m.value === null || m.value <= 0n) fe.cost = "Total biaya harus angka rupiah lebih dari nol.";
    else out.costCents = m.value;
  }
  if (has(body, "plannedWage")) {
    const m = money(body.plannedWage);
    if (m.bad) fe.plannedWage = "Rencana upah harus angka rupiah.";
    else out.plannedWageCents = m.value ?? 0n;
  }
  for (const [src, dst, label] of [["wageMin", "wageMinCents", "Batas bawah upah"], ["wageMax", "wageMaxCents", "Batas atas upah"]] as const) {
    if (has(body, src)) {
      const m = money(body[src]);
      if (m.bad || (m.value !== null && m.value <= 0n)) fe[src] = `${label} harus angka rupiah lebih dari nol.`;
      else out[dst] = m.value;
    }
  }
  if (out.wageMinCents != null && out.wageMaxCents != null && out.wageMaxCents < out.wageMinCents) fe.wageMax = "Batas atas tidak boleh di bawah batas bawah.";
  if (has(body, "status")) {
    if (body.status === "AKTIF" || body.status === "SELESAI") out.status = body.status;
    else fe.status = "Status tidak valid.";
  }
  if (Object.keys(fe).length) return { ok: false, errors: Object.values(fe), fieldErrors: fe };
  return { ok: true, value: out };
}

export interface WorkerInput {
  residentId: number | null;
  name: string | null;
  gender: "L" | "P" | null;
  priority: Priority;
}
export function parseWorker(body: unknown): Parsed<WorkerInput> {
  const fe: Record<string, string> = {};
  if (!isRecord(body)) return { ok: false, errors: ["Data tidak valid."], fieldErrors: {} };
  const residentId = blank(body.residentId) ? null : posInt(body.residentId);
  if (!blank(body.residentId) && !residentId) fe.residentId = "Warga tidak valid.";
  const name = text(body.name, 255);
  if (name.bad || name.tooLong) fe.name = "Nama maksimal 255 karakter.";
  if (!residentId && !name.value) fe.name = "Pilih warga atau isi nama pekerja.";
  const gender = body.gender === "L" || body.gender === "P" ? body.gender : null;
  if (!blank(body.gender) && !gender) fe.gender = "Jenis kelamin tidak valid.";
  if (!isPriority(body.priority)) fe.priority = "Pilih kelompok pekerja.";
  if (Object.keys(fe).length) return { ok: false, errors: Object.values(fe), fieldErrors: fe };
  return { ok: true, value: { residentId, name: name.value, gender, priority: body.priority as Priority } };
}

export interface DaysInput {
  workDate: Date;
  task: Task;
  wageCents: bigint;
  workerIds: number[];
  paid: boolean;
  note: string | null;
}
export function parseDays(body: unknown): Parsed<DaysInput> {
  const fe: Record<string, string> = {};
  if (!isRecord(body)) return { ok: false, errors: ["Data tidak valid."], fieldErrors: {} };
  const workDate = parseIsoDate(body.workDate);
  if (!workDate) fe.workDate = "Isi tanggal kerja yang valid.";
  const task = isTask(body.task) ? body.task : null;
  if (!task) fe.task = "Pilih jenis pekerjaan.";
  const wage = money(body.wage);
  if (wage.bad || wage.value === null || wage.value <= 0n) fe.wage = "Upah harian harus angka rupiah lebih dari nol.";
  const ids = Array.isArray(body.workerIds) ? [...new Set(body.workerIds.map(Number))].filter((n) => Number.isInteger(n) && n >= 1 && n <= 2_000_000_000) : [];
  if (!ids.length) fe.workerIds = "Pilih paling sedikit satu pekerja.";
  if (ids.length > LIMITS.entriesPerRequest) fe.workerIds = `Paling banyak ${LIMITS.entriesPerRequest} pekerja sekali catat.`;
  const note = text(body.note, 200);
  if (note.bad || note.tooLong) fe.note = "Catatan maksimal 200 karakter.";
  if (Object.keys(fe).length) return { ok: false, errors: Object.values(fe), fieldErrors: fe };
  return { ok: true, value: { workDate: workDate!, task: task!, wageCents: wage.value!, workerIds: ids, paid: body.paid === true, note: note.value } };
}

export function parsePay(body: unknown): Parsed<{ workDate: Date; paidOn: Date }> {
  const fe: Record<string, string> = {};
  if (!isRecord(body)) return { ok: false, errors: ["Data tidak valid."], fieldErrors: {} };
  const workDate = parseIsoDate(body.workDate);
  if (!workDate) fe.workDate = "Tanggal kerja tidak valid.";
  const paidOn = parseIsoDate(body.paidOn);
  if (!paidOn) fe.paidOn = "Tanggal pembayaran tidak valid.";
  if (workDate && paidOn && paidOn < workDate) fe.paidOn = "Pembayaran tidak boleh sebelum tanggal kerja.";
  if (Object.keys(fe).length) return { ok: false, errors: Object.values(fe), fieldErrors: fe };
  return { ok: true, value: { workDate: workDate!, paidOn: paidOn! } };
}
