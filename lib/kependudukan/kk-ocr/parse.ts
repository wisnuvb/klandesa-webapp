/**
 * Penguraian teks hasil OCR foto Kartu Keluarga menjadi DRAF isian keluarga (murni, tanpa jaringan/DOM).
 * Draf selalu diperiksa operator di wizard; tiap isian yang meragukan diberi tanda di `flags`.
 * Prinsip: NIK adalah jangkar. Baris tabel anggota ditemukan lewat NIK 16 digit; tanggal lahir dan jenis kelamin
 * dilengkapi dari NIK bila OCR gagal membacanya, dan ketidakcocokan keduanya ditandai (bukan ditimpa diam-diam).
 */
import { parseNikInfo, toIsoDate } from "../../residents-import/nik-date";
import { normalizeRow } from "../../residents-import/normalize";
import type { OcrLine } from "./lines";

export type DraftField = "kk" | "name" | "nik" | "gender" | "birthplace" | "birthDate" | "religion" | "education" | "occupation" | "maritalStatus" | "familyRole" | "fatherName" | "motherName";

export interface KkDraftMember {
  /** Nomor urut pada KK, bila terbaca. */
  rowNo: number | null;
  name: string;
  nik: string;
  gender: string;
  birthplace: string;
  /** yyyy-mm-dd */
  birthDate: string;
  religion: string;
  education: string;
  occupation: string;
  bloodType: string;
  maritalStatus: string;
  familyRole: string;
  nationality: string;
  fatherName: string;
  motherName: string;
  /** Isian yang meragukan → alasannya. */
  flags: Partial<Record<DraftField, string>>;
}

export interface KkDraft {
  kk: string;
  address: string;
  rt: string;
  rw: string;
  hamlet: string;
  members: KkDraftMember[];
  /** Hal umum yang perlu dibaca operator (mis. jumlah baris tabel tidak sama). */
  notes: string[];
  /** Isian header yang meragukan. */
  headerFlags: Partial<Record<"kk" | "address" | "rt" | "rw", string>>;
}

// ---------- Pembantu teks ----------

const CONFUSABLE_DIGIT: Record<string, string> = { O: "0", o: "0", Q: "0", D: "0", I: "1", l: "1", "|": "1", "!": "1", Z: "2", S: "5", B: "8" };

/** Huruf yang sering tertukar dengan angka → angka. Hanya dipakai pada potongan yang memang diharapkan angka. */
export function fixDigits(s: string): string {
  return s.replace(/[OoQDIl|!ZSB]/g, (c) => CONFUSABLE_DIGIT[c] ?? c).replace(/\s+/g, "");
}

const NIK_RUN = /(?<![0-9A-Za-z])(?:[0-9OoQDIl|!SZB] ?){13,17}[0-9OoQDIl|!SZB](?![0-9A-Za-z])/g;

interface NikHit {
  index: number;
  length: number;
  value: string;
}

/** Deret 14–18 karakter yang sebagian besar angka (OCR kerap menyisipkan spasi atau menukar O/0, I/1). */
function findNiks(line: string): NikHit[] {
  const hits: NikHit[] = [];
  for (const m of line.matchAll(NIK_RUN)) {
    const realDigits = (m[0].match(/\d/g) ?? []).length;
    if (realDigits < 8) continue; // sisanya huruf yang menyerupai angka (O, I, S, B …)
    hits.push({ index: m.index ?? 0, length: m[0].length, value: fixDigits(m[0]) });
  }
  return hits;
}

const lettersOnly = (s: string) => s.toUpperCase().replace(/[^A-Z]/g, "");

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = tmp;
    }
  }
  return prev[b.length];
}

/** Kandidat terdekat menurut jarak sunting pada huruf saja; null bila terlalu jauh. */
function closest(text: string, candidates: readonly string[], maxRatio = 0.25): { value: string; dist: number } | null {
  const t = lettersOnly(text);
  if (!t) return null;
  let best: { value: string; dist: number } | null = null;
  for (const c of candidates) {
    const cl = lettersOnly(c);
    const d = levenshtein(t, cl);
    if (d <= Math.max(1, Math.floor(cl.length * maxRatio)) && (!best || d < best.dist)) best = { value: c, dist: d };
  }
  return best;
}

const clean = (s: string) => s.replace(/\s+/g, " ").replace(/^[\s:;.,|_-]+|[\s:;|_]+$/g, "").trim();
/** Nama/tempat: huruf, spasi, titik, koma, apostrof, tanda hubung. */
const nameOf = (s: string) => clean(s.replace(/[^A-Za-z.,'’\- ]/g, " ")).replace(/\s+/g, " ").toUpperCase();

// ---------- Kosakata KK ----------

const RELIGIONS = ["ISLAM", "KRISTEN", "KATOLIK", "KATHOLIK", "HINDU", "BUDDHA", "BUDHA", "KONGHUCU", "KHONGHUCU", "KEPERCAYAAN"];
const EDUCATIONS = [
  "TIDAK/BELUM SEKOLAH",
  "BELUM TAMAT SD/SEDERAJAT",
  "TAMAT SD/SEDERAJAT",
  "SLTP/SEDERAJAT",
  "SLTA/SEDERAJAT",
  "DIPLOMA I/II",
  "AKADEMI/DIPLOMA III/S. MUDA",
  "DIPLOMA IV/STRATA I",
  "STRATA II",
  "STRATA III",
];
const ROLES = ["KEPALA KELUARGA", "SUAMI", "ISTRI", "ANAK", "MENANTU", "CUCU", "ORANG TUA", "MERTUA", "FAMILI LAIN", "PEMBANTU", "LAINNYA"];
const MARITALS = ["BELUM KAWIN", "KAWIN TERCATAT", "KAWIN BELUM TERCATAT", "CERAI HIDUP", "CERAI MATI", "KAWIN"];

const MARITAL_RE = /B[E3]LUM\s*K[A4]W[I1]N|K[A4]W[I1]N\s*(?:BELUM\s*)?TERC[A4]T[A4]T|C[E3]R[A4][I1]\s*H[I1]DUP|C[E3]R[A4][I1]\s*M[A4]T[I1]|K[A4]W[I1]N/i;
const ROLE_RE = /K[E3]P[A4]L[A4]\s*K[E3]LU[A4]RG[A4]|[I1]ST[R]?[I1]|SU[A4]M[I1]|[A4]N[A4]K|M[E3]N[A4]NTU|CUCU|OR[A4]NG\s*TU[A4]|M[E3]RT[U]?[A4]|F[A4]M[I1]L[I1]\s*L[A4][I1]N|P[E3]MB[A4]NTU|L[A4][I1]NNY[A4]/i;
const NATIONALITY_RE = /\b(WN[I1l]|WN[A4])\b/i;
const DATE_RE = /([0-9OoIl]{1,2})\s*[-/.]\s*([0-9OoIl]{1,2})\s*[-/.]\s*([0-9OoIlSB]{4})/;
const GENDER_RE = /LAK[I1l]\s*[-]?\s*LAK[I1l]|LAK[I1l]\S*|P[E3]R[E3]M\S*|P[E3]R[E3]\S*|WAN[I1]TA/i;

// ---------- Penguraian ----------

const pad2 = (s: string) => s.replace(/^0+(?=\d)/, "").padStart(2, "0");

function parseIsoFromMatch(m: RegExpMatchArray): string {
  const d = Number(fixDigits(m[1]));
  const mo = Number(fixDigits(m[2]));
  const y = Number(fixDigits(m[3]));
  if (!Number.isFinite(d) || !Number.isFinite(mo) || !Number.isFinite(y)) return "";
  return toIsoDate(y, mo, d) ?? "";
}

interface MemberLine {
  lineIndex: number;
  member: KkDraftMember;
}

function parseMemberLine(line: string, nik: NikHit): KkDraftMember {
  const flags: KkDraftMember["flags"] = {};
  const left = line.slice(0, nik.index);
  const right = line.slice(nik.index + nik.length);

  let rowNo: number | null = null;
  let namePart = left;
  const rn = left.match(/^\s*(\d{1,2}|[|!l])[.\s]+(?=\S)/);
  if (rn) {
    rowNo = /\d/.test(rn[1]) ? Number(rn[1]) : null;
    namePart = left.slice(rn[0].length);
  }
  // Serpihan satu huruf di depan nama (bayangan/garis tabel) dibuang; "I" tetap karena awalan nama Bali ("I Wayan").
  const name = nameOf(namePart).replace(/^(?:[A-HJ-Z]\s+)+(?=[A-Z]{2,})/, "");

  let rest = right;
  let gender = "";
  const g = rest.match(GENDER_RE);
  if (g && g.index !== undefined) {
    gender = /^L/i.test(g[0]) ? "Laki-laki" : "Perempuan";
    rest = rest.slice(g.index + g[0].length);
  }
  let birthDate = "";
  let birthplace = "";
  const dm = rest.match(DATE_RE);
  if (dm && dm.index !== undefined) {
    birthDate = parseIsoFromMatch(dm);
    birthplace = nameOf(rest.slice(0, dm.index));
    rest = rest.slice(dm.index + dm[0].length);
  } else {
    birthplace = "";
  }

  // Agama = kata pertama yang cocok daftar (toleran salah baca).
  let religion = "";
  const words = clean(rest).split(" ").filter(Boolean);
  if (words.length) {
    const hit = closest(words[0], RELIGIONS, 0.3);
    if (hit) {
      religion = hit.value;
      words.shift();
    }
  }

  // Golongan darah = kolom terakhir bila hanya satu simbol golongan.
  let bloodType = "";
  const last = words[words.length - 1];
  if (last && /^(A|B|AB|O)[+-]?$|^-$/i.test(last)) {
    bloodType = /^-$/.test(last) ? "" : last.toUpperCase();
    words.pop();
  }

  // Pendidikan = awalan terpanjang yang cocok daftar; sisanya pekerjaan.
  let education = "";
  let bestK = 0;
  let bestD = Infinity;
  for (const e of EDUCATIONS) {
    const el = lettersOnly(e);
    for (let k = 1; k <= Math.min(5, words.length); k++) {
      const d = levenshtein(lettersOnly(words.slice(0, k).join(" ")), el);
      if (d <= Math.max(2, Math.floor(el.length * 0.2)) && (d < bestD || (d === bestD && k > bestK))) {
        bestD = d;
        bestK = k;
        education = e;
      }
    }
  }
  if (bestK) words.splice(0, bestK);
  const occupation = clean(words.join(" ").replace(/[^A-Za-z/.\- ]/g, " ")).toUpperCase();

  // Peta ke kosakata aplikasi lewat normalizer impor (sinonim sudah dikuatkan di sana).
  const norm = normalizeRow({ name: name || "X", id_number: nik.value, religion_id: religion, education_id: education, job_id: occupation, gender });
  const v = norm.values;
  const jobWarn = norm.issues.some((i) => i.field === "job_id" && i.level !== "fixed");

  const info = parseNikInfo(nik.value);
  if (nik.value.length !== 16) flags.nik = `NIK terbaca ${nik.value.length} digit, seharusnya 16.`;
  else if (!info.birthDate) flags.nik = "NIK tidak sah; kemungkinan ada angka yang salah baca.";

  let finalGender = v.gender || gender;
  if (info.gender) {
    if (!finalGender) finalGender = info.gender;
    else if (finalGender !== info.gender) flags.gender = "Jenis kelamin di KK berbeda dengan yang tersirat di NIK.";
  }
  let finalBirth = birthDate;
  if (info.birthDate) {
    if (!finalBirth) finalBirth = info.birthDate;
    else if (finalBirth !== info.birthDate) flags.birthDate = "Tanggal lahir di KK berbeda dengan yang tersirat di NIK.";
  }
  if (!finalBirth) flags.birthDate = "Tanggal lahir tidak terbaca.";
  if (name.length < 3) flags.name = "Nama tidak terbaca jelas.";
  if (!religion) flags.religion = "Agama tidak terbaca.";
  if (occupation && jobWarn) flags.occupation = "Pekerjaan tidak dikenali; pilih dari daftar.";

  return {
    rowNo,
    name,
    nik: nik.value,
    gender: finalGender,
    birthplace,
    birthDate: finalBirth,
    religion: v.religion_id || "",
    education: v.education_id || "",
    occupation: jobWarn ? "" : v.job_id || "",
    bloodType,
    maritalStatus: "",
    familyRole: "",
    nationality: "WNI",
    fatherName: "",
    motherName: "",
    flags,
  };
}

interface RelationRow {
  rowNo: number | null;
  marital: string;
  role: string;
  nationality: string;
  fatherName: string;
  motherName: string;
  parentsAmbiguous: boolean;
}

function parseRelationLine(line: string): RelationRow | null {
  const mm = line.match(MARITAL_RE);
  const rm = line.match(ROLE_RE);
  if (!mm || !rm || mm.index === undefined || rm.index === undefined) return null;
  if (/\d{14}/.test(line.replace(/\s/g, ""))) return null; // baris tabel pertama, bukan kedua

  const rn = line.match(/^\s*(\d{1,2})[.\s]+(?=\S)/);
  const rowNo = rn ? Number(rn[1]) : null;
  const marital = closest(mm[0], MARITALS, 0.3)?.value ?? "";
  const role = closest(rm[0], ROLES, 0.3)?.value ?? "";

  const after = line.slice(Math.max(mm.index + mm[0].length, rm.index + rm[0].length));
  const nm = after.match(NATIONALITY_RE);
  const nationality = nm ? (/WNA|WN4/i.test(nm[1]) ? "WNA" : "WNI") : "WNI";
  const tail = nm && nm.index !== undefined ? after.slice(nm.index + nm[0].length) : after;

  // Nama ayah/ibu = segmen tersisa setelah membuang tanda "-" dan nomor dokumen.
  const segments = tail
    .split(/\s{2,}/)
    .map((s) => nameOf(s.replace(/\b\d[\d./-]*\b/g, " ")))
    .map((s) => s.replace(/(^|\s)-+(?=\s|$)/g, " ").replace(/\s+/g, " ").trim())
    .filter((s) => s.length >= 2);
  let father = "";
  let mother = "";
  let ambiguous = false;
  if (segments.length >= 2) {
    father = segments[segments.length - 2];
    mother = segments[segments.length - 1];
  } else if (segments.length === 1) {
    const w = segments[0].split(" ");
    if (w.length === 2) {
      [father, mother] = w;
      ambiguous = true;
    } else {
      father = segments[0];
      ambiguous = true;
    }
  }
  return { rowNo, marital, role, nationality, fatherName: father, motherName: mother, parentsAmbiguous: ambiguous };
}

const MARITAL_APP: Record<string, string> = {
  "BELUM KAWIN": "Belum Menikah",
  "KAWIN TERCATAT": "Menikah",
  "KAWIN BELUM TERCATAT": "Menikah",
  KAWIN: "Menikah",
  "CERAI HIDUP": "Cerai Hidup",
  "CERAI MATI": "Cerai Mati",
};
const ROLE_APP: Record<string, string> = {
  "KEPALA KELUARGA": "Kepala Keluarga",
  SUAMI: "Suami",
  ISTRI: "Istri",
  ANAK: "Anak",
  MENANTU: "Menantu",
  CUCU: "Cucu",
  "ORANG TUA": "Orang Tua",
  MERTUA: "Mertua",
  "FAMILI LAIN": "Famili Lain",
  PEMBANTU: "Pembantu",
  LAINNYA: "Lainnya",
};

const padRtRw = (s: string) => (s ? pad2(s) : "");

function parseHeader(lines: readonly string[], firstMemberIndex: number, kkHit: { value: string } | null) {
  const head = lines.slice(0, firstMemberIndex < 0 ? lines.length : firstMemberIndex);
  let address = "";
  let rt = "";
  let rw = "";
  let hamlet = "";
  for (const raw of head) {
    const am = raw.match(/\bAlamat\b\s*[:;.]?\s*(.*)/i);
    if (am && !address) {
      address = clean(am[1].split(/\s{2,}|\b(?:Desa|Kelurahan|Kecamatan|Kode\s*Pos|Provinsi|Kabupaten)\b/i)[0]).replace(/\bRT\s*\/?\s*RW.*$/i, "").trim();
    }
    const rtrw = raw.match(/RT\s*\/\s*RW\s*[:;.]?\s*([0-9OoIl]{1,3})\s*[/\\-]\s*([0-9OoIl]{1,3})/i);
    if (rtrw && !rt) {
      rt = padRtRw(fixDigits(rtrw[1]));
      rw = padRtRw(fixDigits(rtrw[2]));
    }
  }
  const dusun = address.match(/\b(?:DUSUN|DSN\.?|DUKUH)\s+([A-Za-z ]{2,40}?)(?=\s*(?:RT|RW|,|$))/i);
  if (dusun) hamlet = nameOf(dusun[1]).replace(/\b(\w)(\w*)/g, (_, a: string, b: string) => a + b.toLowerCase());
  return { address: address.toUpperCase(), rt, rw, hamlet, kk: kkHit?.value ?? "" };
}

/** Uraikan baris-baris hasil OCR menjadi draf keluarga. */
export function parseKkText(input: readonly OcrLine[]): KkDraft {
  const lines = input.map((l) => l.text.replace(/\t/g, "  ").trimEnd()).filter((l) => l.trim() !== "");
  const notes: string[] = [];

  const memberLines: MemberLine[] = [];
  let kkHit: NikHit | null = null;
  let kkLineIndex = -1;
  const seen = new Set<string>();

  lines.forEach((line, i) => {
    const hits = findNiks(line);
    if (hits.length === 0) return;
    const looksLikeMember = GENDER_RE.test(line) || DATE_RE.test(line);
    if (!looksLikeMember && !kkHit) {
      kkHit = hits[0];
      kkLineIndex = i;
      return;
    }
    if (!looksLikeMember) return;
    const member = parseMemberLine(line, hits[0]);
    if (seen.has(member.nik)) member.flags.nik = "NIK sama dengan anggota lain pada foto ini.";
    seen.add(member.nik);
    memberLines.push({ lineIndex: i, member });
  });

  // Tabel kedua (status perkawinan, hubungan, nama orang tua): cocokkan menurut nomor urut, atau urutan bila nomor tak terbaca.
  const firstMember = memberLines[0]?.lineIndex ?? -1;
  const relations: RelationRow[] = [];
  lines.forEach((line, i) => {
    if (i <= firstMember) return;
    const r = parseRelationLine(line);
    if (r) relations.push(r);
  });

  const members = memberLines.map((m) => m.member);
  members.forEach((m, idx) => {
    // Cocokkan menurut nomor urut; tanpa nomor, urutan baris hanya dipercaya bila jumlah kedua tabel sama (jika tidak, salah pasang lebih buruk daripada kosong).
    const rel = relations.find((r) => r.rowNo != null && r.rowNo === m.rowNo) ?? (relations.length === members.length ? relations[idx] : undefined);
    if (!rel) {
      m.flags.maritalStatus = "Status perkawinan tidak terbaca.";
      m.flags.familyRole = "Hubungan dalam KK tidak terbaca.";
      return;
    }
    m.maritalStatus = MARITAL_APP[rel.marital] ?? "";
    m.familyRole = ROLE_APP[rel.role] ?? "";
    m.nationality = rel.nationality;
    m.fatherName = rel.fatherName;
    m.motherName = rel.motherName;
    if (!m.maritalStatus) m.flags.maritalStatus = "Status perkawinan tidak terbaca.";
    if (!m.familyRole) m.flags.familyRole = "Hubungan dalam KK tidak terbaca.";
    if (rel.parentsAmbiguous) m.flags.fatherName = "Nama ayah dan ibu mungkin tertukar atau tergabung; periksa.";
  });

  if (members.length === 0) notes.push("Tidak ada anggota yang terbaca. Pastikan foto KK lurus, terang, dan tabel anggota terlihat utuh.");
  if (members.length > 0 && relations.length !== members.length) {
    notes.push(`Tabel anggota terbaca ${members.length} baris, tabel hubungan keluarga ${relations.length} baris. Periksa jumlah anggota dan hubungan tiap orang.`);
  }
  if (members.length > 0 && !members.some((m) => m.familyRole === "Kepala Keluarga")) notes.push("Kepala keluarga belum terbaca; pilih hubungannya secara manual.");

  const header = parseHeader(lines, firstMember, kkHit);
  const headerFlags: KkDraft["headerFlags"] = {};
  if (!header.kk) headerFlags.kk = "Nomor KK tidak terbaca.";
  else if (header.kk.length !== 16) headerFlags.kk = `Nomor KK terbaca ${header.kk.length} digit, seharusnya 16.`;
  if (header.kk.length === 16 && members.length >= 2) {
    // Enam digit pertama KK (kode wilayah) biasanya sama dengan NIK sebagian besar anggota; beda = kemungkinan salah baca.
    const counts = new Map<string, number>();
    for (const m of members) if (m.nik.length === 16) counts.set(m.nik.slice(0, 6), (counts.get(m.nik.slice(0, 6)) ?? 0) + 1);
    const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
    if (top && top[1] >= 2 && top[0] !== header.kk.slice(0, 6) && !headerFlags.kk) headerFlags.kk = "Awalan nomor KK berbeda dari NIK sebagian besar anggota; kemungkinan ada angka yang salah baca.";
  }
  if (!header.address) headerFlags.address = "Alamat tidak terbaca.";
  if (kkLineIndex < 0 && members.length > 0) notes.push("Nomor KK tidak ditemukan di foto.");

  return { ...header, members, notes, headerFlags };
}
