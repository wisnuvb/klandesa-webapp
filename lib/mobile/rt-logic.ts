/**
 * Logika murni peran RT: normalisasi kode RT/RW, pencocokan cakupan, dan aturan tahap pengantar RT.
 * Aturan akses di sini dipakai route /api/mobile/v1/rt/* dan dites sebagai matriks (tests/mobile-rt.test.ts).
 */

/** "RT 03", "003", "3" → "3". Kosong / bukan angka / "0" → null (tidak punya RT). */
export function normalizeRtCode(raw: unknown): string | null {
  if (typeof raw !== "string" && typeof raw !== "number") return null;
  const digits = String(raw).replace(/\D/g, "").replace(/^0+/, "");
  return digits && digits.length <= 4 ? digits : null;
}

/** Varian penulisan yang mungkin tersimpan di data warga, untuk query SQL awal (dipersempit ulang dengan residentInScope). */
export function rtCodeVariants(code: string): string[] {
  return [...new Set([code, code.padStart(2, "0"), code.padStart(3, "0"), code.padStart(4, "0")])];
}

export type RtScope = { rt: string; rw: string | null };

/**
 * Warga ada dalam cakupan RT bila RT sama. Bila penugasan menyebut RW, RW warga harus sama pula
 * (RT 01 di RW 01 berbeda dengan RT 01 di RW 02); warga tanpa RW tidak masuk cakupan ber-RW.
 */
export function residentInScope(resident: { rt: unknown; rw: unknown }, scope: RtScope): boolean {
  const rt = normalizeRtCode(resident.rt);
  if (!rt || rt !== scope.rt) return false;
  if (scope.rw == null) return true;
  return normalizeRtCode(resident.rw) === scope.rw;
}

export type RtRequestSnapshot = { villageId: number; rtStatus: string | null; applicantRt: string | null; applicantRw: string | null };

/** Boleh melihat/memutus permohonan: desa sama, tahap RT aktif (rtStatus bukan null), dan pemohon dalam cakupan. */
export function canRtAccessRequest(
  actor: { villageId: number; scope: RtScope; residentId: number },
  r: RtRequestSnapshot & { requesterResidentId: number | null },
): boolean {
  if (r.villageId !== actor.villageId || r.rtStatus == null) return false;
  if (r.requesterResidentId === actor.residentId) return false; // tidak menyetujui permohonan sendiri
  return residentInScope({ rt: r.applicantRt, rw: r.applicantRw }, actor.scope);
}

export function canRtDecide(r: { rtStatus: string | null; status: string }): boolean {
  return r.rtStatus === "pending" && r.status === "pending";
}

/**
 * Tahap RT dipakai hanya bila: desa menyalakannya, pemohon punya RT, ada petugas RT aktif untuk cakupan itu,
 * dan pemohon sendiri bukan petugas RT-nya (agar tidak menyetujui dirinya sendiri / permohonan tidak macet).
 */
export function shouldRequireRt(opts: {
  villageEnabled: boolean;
  applicant: { rt: unknown; rw: unknown };
  requesterResidentId: number;
  activeRts: { residentId: number; rt: string | null; rw: string | null }[];
}): boolean {
  if (!opts.villageEnabled) return false;
  const matches = opts.activeRts.filter((a) => a.rt && residentInScope(opts.applicant, { rt: a.rt, rw: a.rw }));
  if (matches.length === 0) return false;
  return !matches.some((a) => a.residentId === opts.requesterResidentId);
}

/** Petugas RT yang cakupannya memuat warga ini (untuk notifikasi). */
export function rtOfficersFor(
  applicant: { rt: unknown; rw: unknown },
  activeRts: { residentId: number; rt: string | null; rw: string | null }[],
): number[] {
  return activeRts.filter((a) => a.rt && residentInScope(applicant, { rt: a.rt, rw: a.rw })).map((a) => a.residentId);
}

/** Pengaturan desa: Village.settings.mobile.mail.rtApproval (default mati, aman untuk desa yang belum menyiapkan RT). */
export function readRtApproval(settings: unknown): boolean {
  const asRec = (v: unknown): Record<string, unknown> => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
  return asRec(asRec(asRec(settings).mobile).mail).rtApproval === true;
}

export function mergeRtApproval(settings: unknown, on: boolean): Record<string, unknown> {
  const asRec = (v: unknown): Record<string, unknown> => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
  const root = { ...asRec(settings) };
  const mobile = { ...asRec(root.mobile) };
  const mail = { ...asRec(mobile.mail), rtApproval: on };
  mobile.mail = mail;
  root.mobile = mobile;
  return root;
}
