import type { TransaksiKasItem } from "./types";

const STATUS_LABEL: Record<string, string> = {
  verified: "Terverifikasi",
  approved: "Disetujui",
  pending: "Menunggu",
  rejected: "Ditolak",
};

/** Escape CSV + netralkan awalan rumus (=, +, -, @) agar tidak dieksekusi Excel. */
function csvCell(value: string | number): string {
  let text = String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export function downloadBukuKasCsv(rows: TransaksiKasItem[], year: string) {
  const header = ["Tanggal", "Kode", "No. Bukti", "Uraian", "Jenis", "Jumlah", "Saldo", "Status"];
  const lines = [header, ...rows
    .slice()
    .reverse() // kronologis, seperti buku kas
    .map((t) => [
      t.tanggal.slice(0, 10),
      t.kode,
      t.referensi,
      t.uraian,
      t.jenis === "masuk" ? "Pemasukan" : "Pengeluaran",
      t.jumlah,
      t.saldo,
      STATUS_LABEL[t.status] ?? t.status,
    ])].map((r) => r.map(csvCell).join(","));

  // BOM agar Excel membaca UTF-8
  const blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `buku-kas-${year}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
