import type { ReportView, SectionView, StatementsView } from "./service";

/** Sel CSV aman: kutip, dan awalan apostrof untuk sel yang diawali = + - @ (injeksi rumus spreadsheet). */
export function csvCell(v: string): string {
  const s = /^[=+\-@\t\r]/.test(v) ? `'${v}` : v;
  return /[",\n\r;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
const row = (...c: string[]) => c.map(csvCell).join(",");

function sectionRows(s: SectionView, out: string[]) {
  out.push(row(s.label, "", ""));
  for (const l of s.lines) out.push(row(l.code, l.name, l.amount));
  out.push(row("", `Jumlah ${s.label.toLowerCase()}`, s.total));
}

/** Neraca dan laba rugi satu entitas (jumlah dalam rupiah, titik desimal) untuk lampiran pendaftaran/pelaporan. */
export function reportCsv(r: ReportView, e: StatementsView): string {
  const out: string[] = [];
  out.push(row("Laporan keuangan BUM Desa", r.kindLabel, r.range.label));
  out.push(row("Entitas", e.name, ""));
  out.push(row("", "", ""));
  out.push(row("LAPORAN POSISI KEUANGAN (NERACA)", `per ${e.neraca.asOf}`, ""));
  sectionRows(e.neraca.aset, out);
  sectionRows(e.neraca.kewajiban, out);
  sectionRows(e.neraca.ekuitas, out);
  out.push(row("", "Jumlah aset", e.neraca.totalAset));
  out.push(row("", "Jumlah kewajiban dan ekuitas", e.neraca.totalKewajibanEkuitas));
  out.push(row("", e.neraca.balanced ? "Seimbang" : "TIDAK SEIMBANG", e.neraca.difference));
  out.push(row("", "", ""));
  out.push(row("LAPORAN LABA RUGI", e.labaRugi.period, ""));
  sectionRows(e.labaRugi.pendapatan, out);
  sectionRows(e.labaRugi.hpp, out);
  out.push(row("", "Laba kotor", e.labaRugi.labaKotor));
  sectionRows(e.labaRugi.beban, out);
  out.push(row("", "Laba usaha", e.labaRugi.labaUsaha));
  sectionRows(e.labaRugi.pendapatanLain, out);
  sectionRows(e.labaRugi.bebanLain, out);
  out.push(row("", "Laba sebelum pajak", e.labaRugi.labaSebelumPajak));
  sectionRows(e.labaRugi.bebanPajak, out);
  out.push(row("", "Laba (rugi) bersih", e.labaRugi.labaBersih));
  return "﻿" + out.join("\r\n") + "\r\n";
}
