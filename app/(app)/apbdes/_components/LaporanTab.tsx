"use client";

import { useState } from "react";
import Link from "next/link";
import { FileText } from "lucide-react";
import { SektoralSection } from "./SektoralSection";
import { MONTHS, SELECT_CLASS, type Overview } from "./shared";

const REPORTS = [
  { kind: "bku", title: "Buku Kas Umum", ref: "Lampiran P", text: "Seluruh penerimaan dan pengeluaran dengan saldo berjalan. Ditutup tiap akhir bulan.", monthly: true },
  { kind: "bank", title: "Buku Pembantu Bank", ref: "Lampiran Q.1", text: "Setoran, bunga, penarikan, pajak, dan biaya administrasi pada rekening kas desa.", monthly: true },
  { kind: "pajak", title: "Buku Kas Pembantu Pajak", ref: "Lampiran Q.2", text: "Pajak yang dipotong dan yang sudah disetor, beserta saldonya.", monthly: false },
  { kind: "semester1", title: "Laporan Pelaksanaan APB Desa Semester Pertama", ref: "Lampiran S", text: "Anggaran dan realisasi sampai 30 Juni, bertingkat bidang, kegiatan, dan rekening.", monthly: false },
  { kind: "realisasi", title: "Laporan Realisasi APB Desa", ref: "Lampiran T.2.a", text: "Ringkasan pendapatan, belanja per bidang, pembiayaan, dan SiLPA tahun berjalan.", monthly: false },
  { kind: "rincian", title: "Rincian Realisasi APB Desa", ref: "Format Lampiran S", text: "Anggaran dibanding realisasi bertingkat sampai akhir tahun.", monthly: false },
  { kind: "publik", title: "Informasi untuk Masyarakat", ref: "Pasal 72", text: "Realisasi APB Desa, realisasi kegiatan, kegiatan belum selesai, sisa anggaran, dan alamat pengaduan untuk papan informasi desa.", monthly: false },
  { kind: "kegiatan-t3", title: "Laporan Realisasi Kegiatan (akhir tahun)", ref: "Lampiran T.3", text: "Rencana dan realisasi volume output, anggaran, capaian, dan sumber dana (Dana Desa, ADD, lainnya) tiap kegiatan.", monthly: false },
  { kind: "kegiatan-t3&semester=1", title: "Laporan Realisasi Kegiatan (semester pertama)", ref: "Lampiran T.3", text: "Sama seperti di atas untuk 1 Januari - 30 Juni; dilampirkan pada laporan semester pertama (Pasal 68).", monthly: false },
  { kind: "calk", title: "Catatan atas Laporan Keuangan", ref: "Lampiran T.2.b", text: "Informasi umum, dasar penyajian, rekonsiliasi SiLPA dan kas, serta rincian pos pendapatan, belanja, dan pembiayaan.", monthly: false },
  { kind: "sektoral", title: "Program Sektoral, Daerah, dan Lainnya", ref: "Lampiran T.4", text: "Program yang masuk ke desa di luar APB Desa. Isi daftarnya di bagian bawah halaman ini.", monthly: false },
  { kind: "kegiatan", title: "Rekap Realisasi per Kegiatan", ref: "Pengganti ringkas laporan realisasi kegiatan", text: "Anggaran, realisasi, sisa, dan persen tiap kegiatan menurut jenis belanja.", monthly: false },
] as const;

export function LaporanTab({ o }: { o: Overview }) {
  const [month, setMonth] = useState(new Date().getUTCFullYear() === o.year ? new Date().getUTCMonth() + 1 : 12);
  const monthly = (k: string) => (REPORTS.find((r) => r.kind === k)?.monthly ? `&month=${month}` : "");
  return (
    <div className="space-y-5">
      <div className="space-y-1 rounded-lg border bg-card p-4 text-sm">
        <h2 className="font-semibold">Tenggat laporan (Permendagri 20/2018)</h2>
        <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
          <li>Buku kas ditutup tiap akhir bulan dan dilaporkan Kaur Keuangan ke Sekretaris Desa paling lambat tanggal 10 bulan berikutnya (Pasal 63 dan 67).</li>
          <li>Laporan semester pertama: {o.deadlines.semesterOne}.</li>
          <li>Laporan pertanggungjawaban realisasi APB Desa: {o.deadlines.accountability}.</li>
          <li>Laporan semester dan akhir tahun juga diinformasikan kepada masyarakat: realisasi APB Desa, realisasi kegiatan, kegiatan yang belum selesai atau tidak terlaksana, sisa anggaran, dan alamat pengaduan (Pasal 72).</li>
        </ul>
      </div>
      <div className="w-48">
        <label htmlFor="lp-month" className="mb-1.5 block text-sm font-medium">Bulan (untuk buku kas dan bank)</label>
        <select id="lp-month" className={SELECT_CLASS} value={month} onChange={(e) => setMonth(Number(e.target.value))}>
          {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
        </select>
      </div>
      <ul className="grid gap-3 md:grid-cols-2">
        {REPORTS.map((r) => (
          <li key={r.kind} className="flex flex-col justify-between gap-3 rounded-lg border bg-card p-4">
            <div className="space-y-1">
              <h3 className="font-semibold">{r.title}</h3>
              <p className="text-xs text-muted-foreground">{r.ref}</p>
              <p className="text-sm">{r.text}</p>
            </div>
            <Link href={`/apbdes/cetak?kind=${r.kind}&year=${o.year}${monthly(r.kind)}`} className="inline-flex min-h-11 w-fit items-center gap-2 rounded-md border px-3 text-sm font-medium hover:bg-accent">
              <FileText aria-hidden="true" className="size-4" />
              Buka laporan
            </Link>
          </li>
        ))}
      </ul>
      <p className="text-sm text-muted-foreground">Laporan pertanggungjawaban realisasi APB Desa (Pasal 70) terdiri atas laporan keuangan (Laporan Realisasi dan Catatan atas Laporan Keuangan), laporan realisasi kegiatan, dan daftar program sektoral/daerah. Ketiganya tersedia di atas. Catatan bagian 19 pada CaLK diisi manual setelah dicetak.</p>
      <SektoralSection o={o} />
    </div>
  );
}
