/**
 * Ukur mutu OCR foto Kartu Keluarga di komputer Anda (foto TIDAK dikirim ke mana pun).
 *
 *   node --import tsx scripts/kk-ocr-eval.ts <foto.jpg|folder> [--truth kebenaran.json] [--show-text]
 *
 * Tanpa --truth: mencetak draf hasil baca (NIK disamarkan) dan semua tanda "periksa".
 * Dengan --truth: berkas JSON { "nama-foto.jpg": { "kk": "...", "members": [{ "nik": "...", "name": "...", "birthDate": "yyyy-mm-dd", "gender": "...", "familyRole": "..." }] } }
 * lalu mencetak persentase isian yang benar per kolom. Pra-pemrosesan di sini memakai sharp; di peramban memakai canvas
 * dengan langkah yang setara, sehingga angkanya perkiraan, bukan jaminan.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve, basename } from "node:path";
import sharp from "sharp";
import { createWorker, PSM } from "tesseract.js";
import { parseKkText, type KkDraft } from "../lib/kependudukan/kk-ocr/parse";
import { pageToLines } from "../lib/kependudukan/kk-ocr/page";
import { prepareForOcr } from "../lib/kependudukan/kk-ocr/image-ops";

const args = process.argv.slice(2);
const flag = (n: string) => args.includes(n);
const opt = (n: string) => (args.includes(n) ? args[args.indexOf(n) + 1] : undefined);
const target = args.find((a) => !a.startsWith("--") && a !== opt("--truth"));
if (!target) {
  console.error("Pemakaian: node --import tsx scripts/kk-ocr-eval.ts <foto|folder> [--truth berkas.json] [--show-text]");
  process.exit(1);
}

const mask = (nik: string) => (nik.length >= 6 ? `${nik.slice(0, 4)}…${nik.slice(-2)}` : nik);

async function prepare(file: string): Promise<Buffer> {
  // Langkah yang sama dengan peramban: ukur ke sisi panjang ±3000, abu-abu, luruskan, ratakan bayangan, regangkan kontras.
  const base = sharp(file).rotate();
  const meta = await base.metadata();
  const long = Math.max(meta.width ?? 0, meta.height ?? 0);
  const scale = long < 2400 || long > 3400 ? 3000 / long : 1;
  const resized = scale === 1 ? base : base.resize({ width: Math.round((meta.width ?? 0) * scale) });
  const { data, info } = await resized.greyscale().raw().toBuffer({ resolveWithObject: true });
  const { gray, skew } = prepareForOcr({ data: new Uint8ClampedArray(data), width: info.width, height: info.height });
  if (flag("--show-text")) console.log(`  (kemiringan dikoreksi ${skew}°)`);
  return sharp(Buffer.from(gray.data), { raw: { width: gray.width, height: gray.height, channels: 1 } }).png().toBuffer();
}

const files = statSync(target).isDirectory()
  ? readdirSync(target).filter((f) => /\.(jpe?g|png|webp)$/i.test(f)).map((f) => join(target, f))
  : [resolve(target)];

const truth: Record<string, { kk?: string; members?: Array<Record<string, string>> }> = opt("--truth") ? JSON.parse(readFileSync(opt("--truth")!, "utf8")) : {};
const score: Record<string, [number, number]> = {};
const bump = (k: string, ok: boolean) => {
  const s = (score[k] ??= [0, 0]);
  s[1] += 1;
  if (ok) s[0] += 1;
};

async function main() {
  const worker = await createWorker("ind", 1, { langPath: resolve("public/ocr"), gzip: false, cachePath: resolve(".ocr-cache"), logger: () => undefined });
  await worker.setParameters({ tessedit_pageseg_mode: PSM.SINGLE_BLOCK, preserve_interword_spaces: "1", user_defined_dpi: "300" });
  for (const file of files) {
    const t0 = Date.now();
    const { data } = await worker.recognize(await prepare(file), {}, { blocks: true, text: true });
    const lines = pageToLines(data as never);
    const draft: KkDraft = parseKkText(lines);
    console.log(`\n=== ${basename(file)} (${((Date.now() - t0) / 1000).toFixed(1)} dtk, ${lines.length} baris) ===`);
    if (flag("--show-text")) console.log(lines.map((l) => l.text).join("\n"));
    console.log(`KK ${draft.kk ? mask(draft.kk) : "(kosong)"} | ${draft.address || "(alamat kosong)"} RT ${draft.rt || "-"}/RW ${draft.rw || "-"}`);
    for (const m of draft.members) {
      console.log(`  ${m.rowNo ?? "?"}. ${m.name} | ${mask(m.nik)} | ${m.gender} | ${m.birthplace} ${m.birthDate} | ${m.religion} | ${m.education} | ${m.occupation} | ${m.maritalStatus} | ${m.familyRole} | ayah ${m.fatherName || "-"} / ibu ${m.motherName || "-"}`);
      for (const [k, v] of Object.entries(m.flags)) console.log(`       ! ${k}: ${v}`);
    }
    for (const n of draft.notes) console.log(`  * ${n}`);

    const gt = truth[basename(file)];
    if (gt) {
      bump("KK", draft.kk === gt.kk);
      for (const g of gt.members ?? []) {
        const m = draft.members.find((x) => x.nik === g.nik) ?? draft.members.find((x) => x.name === g.name);
        bump("anggota ditemukan", Boolean(m));
        for (const k of ["nik", "name", "gender", "birthDate", "birthplace", "religion", "familyRole", "maritalStatus", "fatherName", "motherName"] as const) {
          if (g[k] !== undefined) bump(k, m?.[k] === g[k]);
        }
      }
      bump("jumlah anggota tepat", draft.members.length === (gt.members?.length ?? -1));
    }
  }
  await worker.terminate();
  if (Object.keys(score).length) {
    console.log("\n--- Ketepatan (benar/total) ---");
    for (const [k, [ok, total]] of Object.entries(score)) console.log(`${k.padEnd(22)} ${ok}/${total}  ${((ok / total) * 100).toFixed(0)}%`);
  }
}
void main();
