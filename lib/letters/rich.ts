/**
 * Teks berformat untuk isian surat jenis `richtext` — himpunan markdown yang SENGAJA kecil dan aman. Murni (tanpa React/DOM).
 *
 * Yang didukung:
 *   - Paragraf dipisah baris kosong; baris baru di dalam paragraf = pindah baris.
 *   - Daftar bernomor ("1. ", "2) ") dan daftar berpoin ("- ", "* ", "• "); baris lanjutan menempel ke butir di atasnya.
 *   - **tebal**, *miring*, dan <u>garis bawah</u>.
 *   - Daftar kecil tag HTML yang lazim ditempel dari Word/AI diterjemahkan ke hal di atas: <br>, <p>, <b>/<strong>, <i>/<em>, <u>,
 *     <ul>/<ol>/<li>. Tag lain TIDAK diproses (tampil sebagai teks apa adanya).
 * Yang TIDAK didukung (sengaja): HTML mentah, tautan, gambar, judul, tabel. Hasil parse hanya berupa data; renderer memakai elemen React,
 * jadi tidak ada jalan bagi HTML/skrip untuk masuk ke surat (dokumen surat v2 memang melarangnya).
 */

export const RICH_MAX_LENGTH = 5_000;

export type RichRun = { text: string; bold?: boolean; italic?: boolean; underline?: boolean };
/** Satu baris tampilan = rangkaian run; baris-baris dalam satu paragraf/butir dipisah pindah-baris. */
export type RichLines = RichRun[][];
export type RichBlock =
  | { type: "p"; lines: RichLines }
  | { type: "ol"; start: number; items: RichLines[] }
  | { type: "ul"; items: RichLines[] };

const ORDERED = /^\s*(\d{1,3})[.)]\s+(.*)$/;
const BULLET = /^\s*[-*•]\s+(.*)$/;

/** **tebal** lalu *miring*; isi penanda tidak boleh diawali/diakhiri spasi supaya "2 * 3 * 4" tetap polos. */
const INLINE = /\*\*(?!\s)(.+?)(?<!\s)\*\*|\*(?!\s)(.+?)(?<!\s)\*|<u>\s*(.+?)\s*<\/u>/gi;

export function parseInline(line: string): RichRun[] {
  const out: RichRun[] = [];
  let last = 0;
  for (const m of line.matchAll(INLINE)) {
    const at = m.index ?? 0;
    if (at > last) out.push({ text: line.slice(last, at) });
    if (m[1] !== undefined) {
      // Di dalam **tebal** masih boleh ada *miring*.
      for (const r of parseInline(m[1])) out.push({ ...r, bold: true });
    } else if (m[2] !== undefined) {
      out.push({ text: m[2], italic: true });
    } else {
      for (const r of parseInline(m[3])) out.push({ ...r, underline: true });
    }
    last = at + m[0].length;
  }
  if (last < line.length) out.push({ text: line.slice(last) });
  return out.length ? out : [{ text: "" }];
}

/**
 * Terjemahkan himpunan tag HTML yang diizinkan menjadi penanda markdown/baris baru SEBELUM parse. Hasilnya tetap teks;
 * tag di luar daftar dibiarkan (nanti dirender sebagai teks biasa oleh React, jadi tidak ada jalan masuk bagi HTML/skrip).
 */
export function normalizeRichTags(src: string): string {
  if (!src.includes("<")) return src;
  const lists: Array<{ ordered: boolean; n: number }> = [];
  return src
    .replace(/<\/?(ul|ol|li)\b[^>]*>/gi, (tag, name: string) => {
      const closing = tag[1] === "/";
      const n = name.toLowerCase();
      if (n === "li") {
        if (closing) return "";
        const top = lists[lists.length - 1];
        if (!top) return "\n- ";
        top.n += 1;
        return top.ordered ? `\n${top.n}. ` : "\n- ";
      }
      if (closing) {
        lists.pop();
        return "\n\n";
      }
      lists.push({ ordered: n === "ol", n: 0 });
      return "\n\n";
    })
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/?p\b[^>]*>/gi, "\n\n")
    .replace(/<(?:b|strong)\b[^>]*>\s*/gi, "**")
    .replace(/\s*<\/(?:b|strong)>/gi, "**")
    .replace(/<(?:i|em)\b[^>]*>\s*/gi, "*")
    .replace(/\s*<\/(?:i|em)>/gi, "*");
}

export function parseRich(src: string): RichBlock[] {
  const lines = normalizeRichTags(src).replace(/\r\n?/g, "\n").split("\n");
  const blocks: RichBlock[] = [];
  let para: RichLines | null = null;
  let list: Extract<RichBlock, { type: "ol" | "ul" }> | null = null;

  const flush = () => {
    if (para && para.length) blocks.push({ type: "p", lines: para });
    para = null;
    list = null;
  };

  for (const raw of lines) {
    const line = raw.replace(/\s+$/, "");
    if (line.trim() === "") {
      flush();
      continue;
    }
    const ol = ORDERED.exec(line);
    const ul = ol ? null : BULLET.exec(line);
    if (ol || ul) {
      const kind = ol ? "ol" : "ul";
      if (!list || list.type !== kind) {
        flush();
        list = kind === "ol" ? { type: "ol", start: Number(ol![1]), items: [] } : { type: "ul", items: [] };
        blocks.push(list);
      }
      list.items.push([parseInline((ol ? ol[2] : ul![1]).trim())]);
      continue;
    }
    if (list) {
      // Baris lanjutan butir daftar: menempel ke butir terakhir sebagai baris baru.
      list.items[list.items.length - 1].push(parseInline(line.trim()));
      continue;
    }
    (para ??= []).push(parseInline(line.trim()));
  }
  flush();
  return blocks;
}

const runsToText = (runs: RichRun[]) => runs.map((r) => r.text).join("");
const linesToText = (lines: RichLines) => lines.map(runsToText).join("\n");

/** Teks polos tanpa penanda (untuk ringkasan, verifikasi, dan tempat yang tidak bisa menampilkan format). Daftar tetap bernomor/berpoin. */
export function richToPlain(src: string): string {
  const parts = parseRich(src).map((b) => {
    if (b.type === "p") return linesToText(b.lines);
    return b.items
      .map((item, i) => `${b.type === "ol" ? `${b.start + i}.` : "•"} ${linesToText(item)}`)
      .join("\n");
  });
  return parts.join("\n\n");
}
