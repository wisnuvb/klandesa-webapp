/** Template unduhan (opsional) + laporan baris bermasalah. Dibangun dari registry field. */
import * as XLSX from "xlsx";
import { FIELDS } from "./fields";
import { CODES, OPTIONS } from "./vocab";

const TEXT_FORMAT_FIELDS = new Set(["id_number", "family_card_number", "father_nik", "mother_nik", "phone_number", "rt", "rw", "temp_rt", "temp_id_number"]);

export function buildTemplateWorkbook(): XLSX.WorkBook {
  const fields = FIELDS.filter((f) => !f.virtual);
  const header = fields.map((f) => f.label);
  const example = fields.map((f) => f.example);
  const ws = XLSX.utils.aoa_to_sheet([header, example]);
  ws["!cols"] = fields.map((f) => ({ wch: Math.max(14, f.label.length + 2) }));
  // Kolom identitas diformat Teks agar NIK/KK 16 digit tidak berubah menjadi 3.5E+15 saat diketik.
  const blankRows = 300;
  fields.forEach((f, c) => {
    if (!TEXT_FORMAT_FIELDS.has(f.id)) return;
    for (let r = 1; r <= blankRows; r++) {
      const ref = XLSX.utils.encode_cell({ r, c });
      const existing = ws[ref];
      ws[ref] = { t: "s", v: existing?.v ?? "", z: "@" };
    }
  });
  ws["!ref"] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: blankRows, c: fields.length - 1 } });

  const guide: string[][] = [
    ["Panduan pengisian"],
    ["Template ini opsional. Sistem juga bisa membaca Excel milik desa dengan susunan kolom sendiri."],
    ["Baris 2 adalah contoh; hapus sebelum mengunggah. Kolom wajib: Nama Lengkap, NIK (16 digit), Jenis Kelamin, Tanggal Lahir."],
    ["Bila Jenis Kelamin / Tanggal Lahir kosong, sistem mengisinya dari NIK."],
    ["Isi Nama Ibu dan No. KK selengkapnya: warga mendaftar di aplikasi mobile dengan NIK + tanggal lahir + nama ibu kandung, atau memakai kode aktivasi per KK."],
    [],
    ["Nilai baku", "Pilihan (boleh juga kode angka Dukcapil di dalam kurung)"],
  ];
  const list = (label: string, items: readonly string[], coded = true) =>
    guide.push([label, items.map((v, i) => (coded ? `${v} (${i + 1})` : v)).join("; ")]);
  list("Jenis Kelamin", OPTIONS.gender);
  list("Agama", CODES.religion);
  list("Status Perkawinan", CODES.marital);
  list("Status Hubungan KK", CODES.familyRole);
  list("Pendidikan", CODES.education);
  list("Golongan Darah", CODES.blood);
  guide.push(["Pekerjaan", `Lihat daftar baku (${OPTIONS.job.length} pilihan), mis. ${OPTIONS.job.slice(0, 6).join("; ")}, ...`]);
  guide.push(["Kewarganegaraan", "WNI; WNA"]);
  guide.push(["Kolom Ya/Tidak", "Y atau N"]);
  const wsGuide = XLSX.utils.aoa_to_sheet(guide);
  wsGuide["!cols"] = [{ wch: 24 }, { wch: 110 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Data Warga");
  XLSX.utils.book_append_sheet(wb, wsGuide, "Panduan");
  return wb;
}

export interface ReportLine {
  sheet: string;
  row: number;
  nik: string;
  name: string;
  level: "Ditolak" | "Perlu perhatian";
  message: string;
}

export function buildReportWorkbook(lines: ReportLine[]): XLSX.WorkBook {
  const rows = [
    ["Sheet", "Baris Excel", "NIK", "Nama", "Status", "Masalah"],
    ...lines.map((l) => [l.sheet, l.row, l.nik, l.name, l.level, l.message]),
  ];
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!cols"] = [{ wch: 18 }, { wch: 12 }, { wch: 20 }, { wch: 32 }, { wch: 16 }, { wch: 90 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Laporan Impor");
  return wb;
}
