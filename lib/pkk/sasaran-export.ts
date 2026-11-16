import { toCsv } from "@/lib/custom-data/schema";
import { slugifyFile } from "@/lib/statistics/export";
import { SASARAN_COLUMNS, SASARAN_STATUS_LABEL, type SasaranReport, type SasaranStatus } from "./sasaran";

type Cell = string | number;

const STATUS_NOTE: Record<SasaranStatus, string> = {
  aktif: "Yang dihitung: warga hidup yang belum tercatat pindah.",
  pindah: "Yang dihitung: warga hidup yang sudah tercatat pindah dari desa (bukan sasaran posyandu desa ini).",
  semua: "Yang dihitung: warga hidup, termasuk yang sudah tercatat pindah.",
};

export const sasaranNotes = (status: SasaranStatus): readonly string[] => [
  "Kelompok usia (Balita, Prasekolah, Sekolah & remaja, Dewasa, Lansia) saling lepas dan jumlahnya sama dengan Jumlah warga.",
  "Ibu hamil, PUS, dan WUS ikut dihitung juga di kelompok usia, jadi jangan dijumlahkan dengan kolom lain.",
  "WUS: perempuan 15–49 tahun. PUS: WUS yang berstatus kawin. Balita: 0–59 bulan. Prasekolah: 5 tahun (60–71 bulan).",
  `${STATUS_NOTE[status]} Dihitung dari data kependudukan, jadi hanya akurat bila tanggal lahir, status kawin, dan RT terisi.`,
];

/** Lembar rekap (judul, tabel, total, catatan) sebagai baris-baris datar untuk Excel dan CSV. Angka saja, tanpa identitas. */
export function buildSasaranSheet(report: SasaranReport, villageName: string, generatedAt: Date, status: SasaranStatus = "aktif"): Cell[][] {
  const header: Cell[] = ["RT / RW", "Jumlah warga", ...SASARAN_COLUMNS.map((c) => c.label)];
  const line = (label: string, c: SasaranReport["totals"]): Cell[] => [label, c.total, ...SASARAN_COLUMNS.map((col) => c[col.key])];
  const aoa: Cell[][] = [
    header,
    ...report.rows.map((r) => line(r.label, r)),
    line("Total", report.totals),
    [],
    [`Data sasaran posyandu per RT, ${villageName}. Status warga: ${SASARAN_STATUS_LABEL[status]}`],
    [`Dihitung pada ${generatedAt.toLocaleString("id-ID", { dateStyle: "long", timeStyle: "short", timeZone: "Asia/Jakarta" })}`],
    ...sasaranNotes(status).map((n) => [n]),
  ];
  if (report.usiaTidakValid > 0) aoa.push([`${report.usiaTidakValid} warga bertanggal lahir tidak valid, tidak masuk kelompok usia.`]);
  return aoa;
}

export function sasaranCsv(sheet: Cell[][]): string {
  return toCsv(sheet[0].map(String), sheet.slice(1));
}

export function sasaranFileName(villageName: string, ext: "xlsx" | "csv", date: Date, status: SasaranStatus = "aktif"): string {
  const suffix = status === "aktif" ? "" : `-${status}`;
  return `data-sasaran-posyandu-${slugifyFile(villageName)}${suffix}-${date.toISOString().slice(0, 10)}.${ext}`;
}
