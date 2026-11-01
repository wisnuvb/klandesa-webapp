/**
 * Bahan cetak gabungan satu laporan wajib. Hanya MENYUSUN data (tabel dan dokumen) dari modul yang sudah ada; pencetakan
 * dilakukan peramban lewat halaman cetak (tidak ada render PDF di server). Tidak ada ZIP: proyek belum punya pola/berkas
 * pustaka untuk itu, dan lampiran yang bukan data sistem hanya didaftar sebagai daftar periksa.
 */
import type { Prisma } from "@prisma/client";
import { fail, type Result } from "@/lib/form-input";
import { buildReport } from "@/lib/apbdes/report-data";
import { loadMoreReport } from "@/lib/apbdes/report-more";
import type { ReportTable } from "@/lib/apbdes/tables";
import { fmt } from "@/lib/apbdes/tables";
import { getOverview, publicList } from "@/lib/dana-desa/service";
import type { Block } from "@/lib/laporan-desa/document";
import { loadDocument } from "@/lib/laporan-desa/service";
import { DEFAULT_ITEMS, type BundleKey } from "./catalog";
import { wibToday, type Iso } from "./calc";

type Db = Prisma.TransactionClient;

export type BundlePart =
  | { type: "table"; table: ReportTable }
  | { type: "document"; title: string; blocks: Block[]; signer: { role: string; name: string | null }; status: string }
  | { type: "text"; title: string; lines: string[] }
  | { type: "link"; title: string; href: string; note: string };

export interface Bundle {
  itemKey: string;
  title: string;
  year: number;
  villageName: string;
  parts: BundlePart[];
  /** Lampiran yang harus disiapkan sendiri (bukan data sistem) */
  attachments: string[];
  warnings: string[];
}

const COVER = "Surat pengantar bertanda tangan Kepala Desa";

const rupiahCents = (v: string): string => fmt(BigInt(Math.round(Number(v) * 100)));

async function villageName(db: Db, villageId: number): Promise<string> {
  const v = await db.village.findUnique({ where: { id: villageId }, select: { name: true } });
  return v?.name ?? "";
}

const tbl = (r: Result<ReportTable>, parts: BundlePart[], warnings: string[]) => {
  if (r.ok) parts.push({ type: "table", table: r.data });
  else warnings.push(r.errors[0] ?? "Sebagian bahan tidak dapat disusun.");
};

export async function buildBundle(db: Db, args: { villageId: number; year: number; itemKey: string; today?: Iso }): Promise<Result<Bundle>> {
  const def = DEFAULT_ITEMS.find((i) => i.key === args.itemKey);
  if (!def || !def.bundle) return fail(404, "Butir ini tidak punya bahan cetak gabungan.");
  const { villageId, year } = args;
  const today = args.today ?? wibToday();
  const parts: BundlePart[] = [];
  const attachments: string[] = [];
  const warnings: string[] = [];
  const kind: BundleKey = def.bundle;

  switch (kind) {
    case "RINCIAN_APBDES":
      tbl(await buildReport(db, villageId, year, "rincian"), parts, warnings);
      attachments.push("Salinan Perdes tentang APB Desa dan Perkades tentang penjabaran APB Desa (bertanda tangan)", COVER);
      parts.push({ type: "link", title: "Kelola APB Desa", href: "/apbdes", note: "Perdes dan lampiran resmi diunggah atau dicetak dari modul APBDes." });
      break;
    case "SEMESTER1":
      tbl(await buildReport(db, villageId, year, "semester1"), parts, warnings);
      tbl(await loadMoreReport(db, villageId, year, "kegiatan-t3", { semester: true }), parts, warnings);
      attachments.push(COVER);
      break;
    case "LPJ":
      tbl(await buildReport(db, villageId, year, "realisasi"), parts, warnings);
      tbl(await loadMoreReport(db, villageId, year, "calk", {}), parts, warnings);
      tbl(await loadMoreReport(db, villageId, year, "kegiatan-t3", {}), parts, warnings);
      tbl(await loadMoreReport(db, villageId, year, "sektoral", {}), parts, warnings);
      attachments.push("Salinan Perdes tentang pertanggungjawaban realisasi APB Desa (bertanda tangan)", COVER);
      break;
    case "LPPD":
    case "LKPPD": {
      const r = await loadDocument(db, villageId, kind === "LPPD" ? "LPPD_TAHUN" : "LKPPD", year);
      if (r.ok) parts.push({ type: "document", title: r.data.title, blocks: r.data.blocks, signer: r.data.signer, status: r.data.status });
      else warnings.push(r.errors[0] ?? "Dokumen belum dapat disusun.");
      attachments.push(COVER);
      break;
    }
    case "INFORMASI":
      tbl(await buildReport(db, villageId, year, "publik"), parts, warnings);
      attachments.push("Foto atau bukti pengumuman di papan/media (tanggal dan tempat tercatat pada butir ini)");
      break;
    case "DD_KELUARAN": {
      const o = await getOverview(db, { villageId, year, today });
      if (!o.ok) warnings.push(o.errors[0] ?? "Data capaian keluaran tidak dapat dibaca.");
      else {
        const { rows, averagePct, filled, missing } = o.data.outputs;
        const f = (n: number | null) => (n === null ? "" : new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 }).format(n));
        const table: ReportTable = {
          kind: "dd-keluaran",
          title: `Laporan Realisasi Penyerapan dan Capaian Keluaran Dana Desa ${year}`,
          subtitle: [`Tahun anggaran ${year}`],
          columns: [{ label: "Bidang" }, { label: "Kegiatan" }, { label: "Uraian keluaran" }, { label: "Volume", num: true }, { label: "Satuan" }, { label: "Capaian (%)", num: true }],
          rows: rows.map((x) => ({ cells: [x.bidang, `${x.activityCode} ${x.name}`, x.outputName ?? "(belum diisi)", f(x.volume), x.unit ?? "", x.pct === null ? "" : f(x.pct)] })),
          notes: [
            averagePct === null ? "Belum ada kegiatan bersumber Dana Desa." : `Capaian keluaran desa = rata-rata persen capaian seluruh kegiatan: ${f(averagePct)}% (${filled} kegiatan terisi, ${missing} belum terisi dihitung 0%). PMK 7/2026 Pasal 25 ayat (5)-(6).`,
            "Format resmi dihasilkan dari aplikasi OM-SPAN TKD oleh kabupaten; tabel ini bahan isian dari data kegiatan desa.",
          ],
          signers: [],
        };
        parts.push({ type: "table", table });
      }
      attachments.push(COVER);
      break;
    }
    case "DD_FOKUS":
    case "DD_PUBLIKASI": {
      const l = await publicList(db, { villageId, year });
      if (!l.ok) warnings.push(l.errors[0] ?? "Daftar kegiatan tidak dapat dibaca.");
      else {
        parts.push({
          type: "table",
          table: {
            kind: "dd-publikasi",
            title: `Penggunaan Dana Desa Tahun ${year}`,
            subtitle: [l.data.label ? `Sumber: ${l.data.label}${l.data.status === "DITETAPKAN" ? "" : " (belum ditetapkan)"}` : "APB Desa belum ada"],
            columns: [{ label: "Kegiatan" }, { label: "Lokasi" }, { label: "Anggaran (Rp)", num: true }],
            rows: [...l.data.items.map((x) => ({ cells: [`${x.activityCode} ${x.name}`, x.location ?? "(belum diisi)", rupiahCents(x.amount)] })), { cells: ["Jumlah", "", rupiahCents(l.data.total)], bold: true }],
            notes: ["Memuat nama kegiatan, lokasi, dan besaran anggaran (Permendesa PDT 16/2025 Pasal 10 ayat 2)."],
            signers: [],
          },
        });
        if (!l.data.items.length) warnings.push("Belum ada kegiatan bersumber Dana Desa pada APB Desa tahun ini.");
      }
      parts.push({ type: "link", title: "Halaman publikasi siap cetak", href: `/dana-desa/publikasi?year=${year}`, note: "Format baliho/papan informasi desa." });
      if (kind === "DD_FOKUS") attachments.push("Salinan Perdes RKP Desa dan Perdes APB Desa (Permendesa 16/2025 Pasal 12 ayat 3)", "Dokumen digital dikirim lewat sistem informasi desa atau aplikasi kementerian (Pasal 12 ayat 2)");
      break;
    }
    case "RKPDES": {
      const d = await db.rkpdesDocument.findFirst({ where: { villageId, year, revision: 0 }, select: { id: true } });
      if (!d) warnings.push("Dokumen RKP Desa tahun ini belum dibuat di modul Perencanaan.");
      else {
        for (const [k, t] of [["rancangan", "Rancangan RKP Desa"], ["usulan", "Daftar usulan RKP Desa"], ["tim", "Lampiran tim penyusun"], ["pagu", "Pagu indikatif dan program masuk desa"]] as const) {
          parts.push({ type: "link", title: t, href: `/rkpdes/cetak?id=${d.id}&kind=${k}`, note: "Dicetak dari halaman cetak Perencanaan." });
        }
      }
      attachments.push("Salinan Perdes tentang RKP Desa dan berita acara Musrenbangdes (bertanda tangan)");
      break;
    }
    case "BUMDES":
      parts.push({ type: "link", title: "Data BUM Desa", href: "/bumdes", note: "Laporan keuangan dan transaksi BUM Desa dikelola di modul BUM Desa." });
      attachments.push("Laporan posisi keuangan dan laba rugi BUM Desa", "Berita acara penelaahan penasihat/pengawas atau Musyawarah Desa");
      break;
  }

  return { ok: true, data: { itemKey: def.key, title: def.title, year, villageName: await villageName(db, villageId), parts, attachments, warnings } };
}
