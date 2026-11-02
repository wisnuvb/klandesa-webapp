/**
 * Tabel laporan LAMPID untuk layar cetak, Excel, dan CSV. Satu sumber tabel supaya angkanya sama di semuanya.
 * NIK tidak pernah ditulis penuh; hanya 4 digit akhir sebagai pembeda sesama nama.
 */
import { slugifyFile, safeSheetName, type Cell, type SheetRows, type StatTable } from "@/lib/statistics/export";
import { toCsv } from "@/lib/custom-data/schema";
import {
  LAMPID_KINDS,
  LAMPID_LABEL,
  monthLabel,
  tallyTotal,
  type LampidKind,
  type LampidReport,
  type Tally,
} from "./lampid";

const lp = (t: Tally) => ({ l: t.wniL + t.wnaL, p: t.wniP + t.wnaP, wna: t.wnaL + t.wnaP + t.wnaX });

/** Ringkasan awal → akhir bulan. */
export function summaryTable(r: LampidReport): StatTable {
  const { totals: t } = r;
  const row = (label: string, tally: Tally): Cell[] => {
    const v = lp(tally);
    return [label, v.l, v.p, tallyTotal(tally), v.wna];
  };
  return {
    sheet: "Ringkasan",
    title: "Ringkasan",
    columns: ["Keterangan", "Laki-laki", "Perempuan", "Jumlah", "Di antaranya WNA"],
    numeric: [1, 2, 3, 4],
    rows: [
      row("Penduduk awal bulan", t.awal),
      row("(+) Lahir", t.lahir),
      row("(−) Mati", t.mati),
      row("(−) Pindah", t.pindah),
      row("(+) Datang", t.datang),
      row("Penduduk akhir bulan", t.akhir),
    ],
    note: "Penduduk akhir = awal + lahir − mati − pindah + datang. Angka awal dihitung mundur dari data penduduk saat ini.",
  };
}

/** Rincian per wilayah. */
export function regionTable(r: LampidReport): StatTable {
  const sum = (key: keyof (typeof r.lines)[number]) => r.lines.reduce((s, l) => s + (l[key] as number), 0);
  return {
    sheet: r.group === "dusun" ? "Per Dusun" : "Per RW-RT",
    title: r.group === "dusun" ? "Rincian per dusun" : "Rincian per RW/RT",
    columns: [r.group === "dusun" ? "Dusun" : "Wilayah", "Awal", "Lahir", "Mati", "Pindah", "Datang", "Akhir"],
    numeric: [1, 2, 3, 4, 5, 6],
    rows: r.lines.map((l) => [l.region, l.awal, l.lahir, l.mati, l.pindah, l.datang, l.akhir]),
    total: ["Jumlah", sum("awal"), sum("lahir"), sum("mati"), sum("pindah"), sum("datang"), sum("akhir")],
  };
}

/** Rincian jenis kelamin dan kewarganegaraan (bentuk formulir pelaporan penduduk). */
export function genderNationalityTable(r: LampidReport): StatTable {
  const t = r.totals;
  const rows: Array<[string, Tally]> = [
    ["Penduduk awal bulan", t.awal],
    ["Lahir", t.lahir],
    ["Mati", t.mati],
    ["Pindah", t.pindah],
    ["Datang", t.datang],
    ["Penduduk akhir bulan", t.akhir],
  ];
  const hasUnknown = rows.some(([, x]) => x.wniX !== 0 || x.wnaX !== 0);
  const columns = ["Keterangan", "WNI L", "WNI P", "WNA L", "WNA P", ...(hasUnknown ? ["JK belum diisi"] : []), "Jumlah"];
  return {
    sheet: "Rincian WNI-WNA",
    title: "Rincian menurut jenis kelamin dan kewarganegaraan",
    columns,
    numeric: columns.map((_, i) => i).slice(1),
    rows: rows.map(([label, x]) => [label, x.wniL, x.wniP, x.wnaL, x.wnaP, ...(hasUnknown ? [x.wniX + x.wnaX] : []), tallyTotal(x)]),
  };
}

/** Daftar nama per kategori. */
export function listTable(r: LampidReport, kind: LampidKind): StatTable {
  const items = r.list[kind];
  const wna = items.some((i) => i.foreign);
  return {
    sheet: `Daftar ${LAMPID_LABEL[kind]}`,
    title: `Daftar ${LAMPID_LABEL[kind]} (${items.length})`,
    columns: ["Tanggal", "Nama", "NIK", "JK", "Wilayah", "Keterangan"],
    numeric: [],
    rows: items.map((i) => [i.date, `${i.name}${i.foreign ? " (WNA)" : ""}`, i.nikLast4 ? `••••${i.nikLast4}` : "-", i.gender, i.region, i.note]),
    note: items.length === 0 ? "Tidak ada kejadian pada bulan ini." : wna ? "WNA = warga negara asing." : undefined,
  };
}

export function buildLampidTables(r: LampidReport): StatTable[] {
  return [summaryTable(r), regionTable(r), genderNationalityTable(r), ...LAMPID_KINDS.map((k) => listTable(r, k))];
}

export function lampidFileName(villageName: string, month: string, ext: "xlsx" | "csv"): string {
  return `lampid-${slugifyFile(villageName)}-${month}.${ext}`;
}

export function buildLampidSheets(r: LampidReport, villageName: string, generatedLabel: string): SheetRows[] {
  const banner = (title: string): Cell[][] => [[title], [`${villageName} · ${monthLabel(r.month)} · ${generatedLabel}`], []];
  const used = new Set<string>();
  return buildLampidTables(r).map((t) => {
    let name = safeSheetName(t.sheet);
    for (let i = 2; used.has(name); i++) name = safeSheetName(`${t.sheet} ${i}`);
    used.add(name);
    const width = (c: number) => Math.min(48, Math.max(String(t.columns[c]).length, ...t.rows.map((row) => String(row[c] ?? "").length)) + 2);
    return {
      name,
      rows: [...banner(`Laporan LAMPID — ${t.title}`), t.columns, ...t.rows, ...(t.total ? [t.total] : []), ...(t.note ? [[], [t.note]] : [])],
      widths: t.columns.map((_, c) => Math.max(c === 0 ? 14 : 8, width(c))),
    };
  });
}

/** CSV datar: satu baris per kejadian (mudah disaring/diolah di Excel). Ringkasan dan rincian ada di berkas Excel. */
export function buildLampidCsv(r: LampidReport): string {
  const rows: Cell[][] = [];
  for (const kind of LAMPID_KINDS) {
    for (const i of r.list[kind]) {
      rows.push([LAMPID_LABEL[kind], i.date, i.name, i.nikLast4 ? `••••${i.nikLast4}` : "", i.gender, i.foreign ? "WNA" : "WNI", i.region, i.note]);
    }
  }
  return toCsv(["Kategori", "Tanggal", "Nama", "NIK", "JK", "Kewarganegaraan", "Wilayah", "Keterangan"], rows);
}
