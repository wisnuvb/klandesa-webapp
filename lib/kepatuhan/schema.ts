/** Validasi masukan kalender kepatuhan. Murni (tanpa Prisma), aman untuk klien. */
import { cleanText, isRecord, parseIsoDate, future, type Parsed } from "@/lib/form-input";
import { isBuiltinKey, isCustomKey, isEventKey, isVerification, validMonthDay, type EntryRow, type Verification } from "./catalog";

export const LIMITS = { reference: 150, note: 500, title: 200, recipient: 200, basis: 300, entriesPerRegency: 300 } as const;
export const YEAR_MIN = 2000;
export const YEAR_MAX = 2100;

/** Bilangan bulat dari angka JSON atau string digit murni; selain itu null (tanpa pembulatan diam-diam). */
export function intOf(v: unknown): number | null {
  if (typeof v === "number") return Number.isSafeInteger(v) ? v : null;
  if (typeof v === "string" && /^-?\d{1,9}$/.test(v.trim())) return Number(v.trim());
  return null;
}

export interface RecordInput {
  itemKey: string;
  status: "DRAF" | "TERKIRIM";
  sentOn: Date | null;
  referenceNo: string | null;
  note: string | null;
  archiveId: bigint | null;
}

export function parseRecord(raw: unknown, now: Date = new Date()): Parsed<RecordInput> {
  const errors: string[] = [];
  const fe: Record<string, string> = {};
  const bad = (k: string, m: string) => {
    fe[k] = m;
    errors.push(m);
  };
  if (!isRecord(raw)) return { ok: false, errors: ["Isian tidak terbaca."], fieldErrors: {} };
  const itemKey = typeof raw.itemKey === "string" ? raw.itemKey.trim() : "";
  if (!itemKey || itemKey.length > 40 || !/^[A-Z0-9_-]+$/.test(itemKey)) bad("itemKey", "Butir laporan tidak dikenal");
  const status = raw.status === "DRAF" || raw.status === "TERKIRIM" ? raw.status : null;
  if (!status) bad("status", "Pilih status Draf atau Terkirim");
  let sentOn: Date | null = null;
  if (status === "TERKIRIM") {
    sentOn = parseIsoDate(raw.sentOn);
    if (!sentOn) bad("sentOn", "Isi tanggal pengiriman yang sah");
    else if (future(sentOn, now)) bad("sentOn", "Tanggal pengiriman tidak boleh di masa depan");
  }
  const ref = cleanText(raw.referenceNo, LIMITS.reference);
  if (ref.bad || ref.tooLong) bad("referenceNo", `Nomor bukti maksimal ${LIMITS.reference} karakter`);
  const note = cleanText(raw.note, LIMITS.note);
  if (note.bad || note.tooLong) bad("note", `Catatan maksimal ${LIMITS.note} karakter`);
  let archiveId: bigint | null = null;
  if (raw.archiveId !== undefined && raw.archiveId !== null && raw.archiveId !== "") {
    const s = typeof raw.archiveId === "number" ? String(raw.archiveId) : raw.archiveId;
    if (typeof s !== "string" || !/^\d{1,15}$/.test(s) || s === "0") bad("archiveId", "Berkas bukti tidak valid");
    else archiveId = BigInt(s);
  }
  if (errors.length || !status) return { ok: false, errors, fieldErrors: fe };
  return { ok: true, value: { itemKey, status, sentOn, referenceNo: ref.value, note: note.value, archiveId } };
}

export type CatalogInput = Omit<EntryRow, "scope" | "regencyKey" | "provinceKey">;

/**
 * Validasi penimpaan katalog. `allowV`: hanya admin platform yang boleh menandai V (dibaca dari teks resmi); akun kabupaten
 * hanya K (ketetapan kabupaten) atau R. Baris yang tidak dimatikan wajib menyebut dasar (nomor peraturan/pasal).
 */
export function parseCatalogEntry(raw: unknown, opts: { allowV: boolean; allowCustom: boolean }): Parsed<CatalogInput> {
  const errors: string[] = [];
  const fe: Record<string, string> = {};
  const bad = (k: string, m: string) => {
    fe[k] = m;
    errors.push(m);
  };
  if (!isRecord(raw)) return { ok: false, errors: ["Isian tidak terbaca."], fieldErrors: {} };
  const itemKey = typeof raw.itemKey === "string" ? raw.itemKey.trim() : "";
  const custom = isCustomKey(itemKey);
  if (!isBuiltinKey(itemKey) && !(opts.allowCustom && custom)) bad("itemKey", opts.allowCustom ? "Butir tidak dikenal. Butir tambahan memakai kode KAB- diikuti huruf besar/angka (maks. 30)." : "Butir tidak dikenal");
  const fromYear = intOf(raw.fromYear);
  if (fromYear === null || fromYear < YEAR_MIN || fromYear > YEAR_MAX) bad("fromYear", `Tahun mulai berlaku ${YEAR_MIN}-${YEAR_MAX}`);
  if (raw.disabled !== undefined && typeof raw.disabled !== "boolean") bad("disabled", "Pilihan mematikan tidak valid");
  const disabled = raw.disabled === true;
  const title = cleanText(raw.title, LIMITS.title);
  if (title.bad || title.tooLong) bad("title", `Judul maksimal ${LIMITS.title} karakter`);
  const recipient = cleanText(raw.recipient, LIMITS.recipient);
  if (recipient.bad || recipient.tooLong) bad("recipient", `Penerima maksimal ${LIMITS.recipient} karakter`);
  const basis = cleanText(raw.basis, LIMITS.basis);
  if (basis.bad || basis.tooLong) bad("basis", `Dasar maksimal ${LIMITS.basis} karakter`);
  const note = cleanText(raw.note, LIMITS.note);
  if (note.bad || note.tooLong) bad("note", `Catatan maksimal ${LIMITS.note} karakter`);

  const base: CatalogInput = { itemKey, fromYear: fromYear ?? 0, disabled, title: title.value, recipient: recipient.value, ruleKind: null, yearOffset: null, month: null, day: null, event: null, amount: null, unit: null, verification: "K", basis: basis.value, note: note.value };
  // Dasar (rujukan/alasan) wajib untuk SEMUA penimpaan, termasuk mematikan butir: perubahan tenggat nasional harus bisa ditelusuri
  // dan ditampilkan kepada desa.
  if (!basis.value) bad("basis", disabled ? "Sebutkan alasan dan rujukan mematikan butir ini (nomor peraturan bupati/pasal)" : "Sebutkan dasarnya (nomor peraturan bupati/pasal)");
  if (disabled) {
    if (custom && !title.value) bad("title", "Isi judul butir");
    return errors.length ? { ok: false, errors, fieldErrors: fe } : { ok: true, value: { ...base, title: null, recipient: null } };
  }

  if (custom && !title.value) bad("title", "Butir tambahan wajib diberi judul");
  const v = raw.verification === undefined ? "K" : raw.verification;
  if (!isVerification(v)) bad("verification", "Label verifikasi tidak valid");
  else if (v === "V" && !opts.allowV) bad("verification", "Label V (dibaca dari teks resmi) hanya untuk admin platform; pakai K untuk ketetapan kabupaten");
  // Akun kabupaten tidak boleh menurunkan butir bawaan menjadi "hanya informasi" (R): itu mematikan kewajiban tanpa jejak jelas.
  else if (v === "R" && !opts.allowV && !custom) bad("verification", "Label R hanya untuk butir tambahan kabupaten. Untuk butir bawaan pakai K, atau matikan butir dengan menyebut alasannya");
  else base.verification = v as Verification;

  const kind = raw.ruleKind;
  if (kind === "NONE") base.ruleKind = "NONE";
  else if (kind === "FIXED") {
    base.ruleKind = "FIXED";
    const yo = intOf(raw.yearOffset);
    const m = intOf(raw.month);
    const d = intOf(raw.day);
    if (yo !== -1 && yo !== 0 && yo !== 1) bad("yearOffset", "Pilih tahun tenggat: sebelum, sama, atau sesudah tahun anggaran");
    else base.yearOffset = yo;
    if (m === null || d === null || !validMonthDay(m, d)) bad("day", "Tanggal tenggat tidak ada di kalender");
    else {
      base.month = m;
      base.day = d;
    }
  } else if (kind === "AFTER_EVENT") {
    base.ruleKind = "AFTER_EVENT";
    if (!isEventKey(raw.event)) bad("event", "Pilih peristiwa pemicu");
    else base.event = raw.event;
    const a = intOf(raw.amount);
    if (a === null || a < 0 || a > 366) bad("amount", "Jumlah 0-366");
    else base.amount = a;
    if (raw.unit !== "MONTH" && raw.unit !== "WORKDAY") bad("unit", "Pilih satuan bulan atau hari kerja");
    else base.unit = raw.unit;
  } else bad("ruleKind", "Pilih jenis tenggat");
  return errors.length ? { ok: false, errors, fieldErrors: fe } : { ok: true, value: base };
}
