/**
 * Model data panduan halaman. Murni (tanpa React) supaya isi panduan bisa diuji dan ditambah tanpa menyentuh komponen.
 * Satu panduan = satu halaman. Tampilan: components/app/guide/PageGuide.tsx.
 */

export type GuideBlock =
  /** Langkah bernomor */
  | { type: "steps"; title?: string; items: { title: string; body: string }[] }
  /** Daftar centang (tips, aturan praktis) */
  | { type: "list"; title?: string; items: string[] }
  /** Dua kolom berdampingan, mis. "terisi otomatis" vs "Anda yang menulis" */
  | { type: "split"; left: { title: string; items: string[]; empty?: string }; right: { title: string; items: string[]; empty?: string } }
  /** Kartu perbandingan; `highlight` menandai yang sedang dibuka */
  | { type: "cards"; title?: string; items: { title: string; body: string; badge?: string; highlight?: boolean; facts?: { label: string; value: string }[] }[] }
  /** Istilah dan artinya */
  | { type: "glossary"; title?: string; items: { term: string; meaning: string }[] }
  /** Catatan kecil di akhir tab, mis. dasar hukum */
  | { type: "note"; text: string };

export interface GuideTab {
  id: string;
  /** Pendek (maks ±16 huruf): tab dipakai di layar ponsel */
  label: string;
  blocks: GuideBlock[];
}

export interface PageGuide {
  /** Slug unik per halaman; dipakai untuk kunci "sudah dilihat" dan tautan di /bantuan */
  id: string;
  /** Judul modal */
  title: string;
  /** Satu kalimat di bawah judul modal */
  description: string;
  /** Teks tombol; bawaan "Panduan" */
  buttonLabel?: string;
  /** Kalimat ajakan di banner pengunjung pertama (tanpa judul) */
  bannerText?: string;
  /** 2–4 tab. Lebih dari itu: pecah panduan atau pindah ke halaman /bantuan */
  tabs: GuideTab[];
}

/** Petunjuk satu kolom: tip awam (selalu tampil) dan contoh (tertutup sampai dibuka). Contoh tidak pernah disalin otomatis ke kolom. */
export interface FieldHelp {
  tip: string;
  example?: string;
  /** Rujukan pasal/dasar hukum, tampil kecil di dalam contoh. Hanya isi bila terverifikasi. */
  ref?: string;
}

/** Entri katalog /bantuan: panduan halaman mana, di mana. */
export interface GuideEntry {
  guide: PageGuide;
  /** Rute halaman, mis. "/apbdes" */
  href: string;
  /** Satu kalimat untuk kartu di /bantuan */
  summary: string;
}

/** Kesalahan isi panduan (kosong = sehat). Dipakai tes tiap panduan. */
export function validateGuide(g: PageGuide): string[] {
  const errs: string[] = [];
  if (!/^[a-z0-9-]+$/.test(g.id)) errs.push(`id tidak valid: ${g.id}`);
  if (!g.title.trim() || !g.description.trim()) errs.push(`${g.id}: judul/deskripsi kosong`);
  if (g.tabs.length < 1 || g.tabs.length > 4) errs.push(`${g.id}: jumlah tab harus 1–4`);
  const ids = new Set<string>();
  for (const t of g.tabs) {
    if (ids.has(t.id)) errs.push(`${g.id}: id tab ganda ${t.id}`);
    ids.add(t.id);
    if (!t.label.trim() || t.label.length > 18) errs.push(`${g.id}/${t.id}: label tab kosong atau lebih dari 18 huruf`);
    if (t.blocks.length === 0) errs.push(`${g.id}/${t.id}: tab kosong`);
    for (const b of t.blocks) {
      if (b.type === "steps" && b.items.some((i) => !i.title.trim() || !i.body.trim())) errs.push(`${g.id}/${t.id}: langkah kosong`);
      if (b.type === "list" && b.items.some((i) => !i.trim())) errs.push(`${g.id}/${t.id}: butir kosong`);
      if (b.type === "glossary" && b.items.some((i) => !i.term.trim() || !i.meaning.trim())) errs.push(`${g.id}/${t.id}: istilah kosong`);
    }
  }
  return errs;
}

export function validateFieldHelp(label: string, h: FieldHelp): string[] {
  const errs: string[] = [];
  if (h.tip.trim().length < 15) errs.push(`${label}: tip terlalu pendek`);
  if (h.example !== undefined && h.example.trim().length < 15) errs.push(`${label}: contoh terlalu pendek`);
  return errs;
}
