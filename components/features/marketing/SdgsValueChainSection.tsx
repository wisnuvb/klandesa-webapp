import Link from "next/link";
import { ArrowRight, CalendarCheck, Scale } from "lucide-react";

/**
 * Siklus tahunan desa. Tiap langkah menunjuk modul yang sudah ada (lihat docs/PHASE*.md);
 * tenggat hanya dicantumkan bila dihitung di aplikasi (RKP Desa, LPPD/LKPPD).
 * Nama berkas dipertahankan (sebelumnya "rantai SDGs") agar impor di LandingHome tidak berubah.
 */
const STEPS = [
  {
    title: "Musyawarah & RKP Desa",
    deadline: "Musdes ≤ 30 Jun · Perdes RKP Desa ≤ 30 Sep",
    body: "Jadwal dan berita acara Musyawarah Desa, lalu siklus RKP Desa dengan tahapan dan tenggat yang dihitung otomatis. RPJM Desa 8 tahun punya tahapannya sendiri.",
    modules: ["Musyawarah Desa", "RKP Desa", "RPJM Desa"],
    href: "/platform#kelompok-perencanaan",
  },
  {
    title: "APB Desa & DPA",
    body: "APB Desa awal dan perubahan terkunci setelah ditetapkan. DPA disiapkan dari RKP Desa, dengan pemeriksaan keselarasan kegiatan.",
    modules: ["APBDes & Buku Kas", "Aset Desa"],
    href: "/platform#kelompok-keuangan",
  },
  {
    title: "SPP & Buku Kas Umum",
    body: "Belanja diajukan lewat SPP dan dicatat di Buku Kas Umum. Belanja tidak bisa melebihi pagu, dan bulan yang sudah ditutup terkunci.",
    modules: ["SPP & panjar", "Buku Kas Umum", "Penutupan bulan"],
    href: "/platform#kelompok-keuangan",
  },
  {
    title: "Dana Desa, BLT & PKTD",
    body: "Temuan kepatuhan berjenjang dengan dasar pasalnya. BLT, Padat Karya Tunai, dan angsuran KDMP baru bisa dibayar dari SPP yang sudah dibayarkan.",
    modules: ["Dana Desa", "BLT Desa", "PKTD", "KDMP"],
    href: "/platform#kelompok-keuangan",
  },
  {
    title: "Laporan & kepatuhan",
    deadline: "LPPD/LKPPD ≤ 31 Mar",
    body: "LPPD dan LKPPD terisi dari data APB Desa dan penduduk. Kalender 18 butir laporan wajib mengingatkan tenggat, dan kabupaten bisa melihat rekapnya.",
    modules: ["Laporan Kepala Desa", "Kalender Kepatuhan"],
    href: "/platform#kelompok-keuangan",
  },
  {
    title: "SDGs & unduhan Kemendesa",
    body: "Skor 18 tujuan SDGs dihitung dari data nyata desa, lalu data diunduh dalam format Kemendesa lengkap dengan catatan riwayatnya.",
    modules: ["Skor SDGs", "Sinkronisasi Data"],
    href: "/platform/sdgs",
  },
];

const REGULATIONS = [
  "Permendagri 20/2018",
  "Permendagri 114/2014",
  "Permendagri 46/2016",
  "Permendagri 1/2016",
  "Permendagri 96/2017",
  "Permendesa PDT 16/2025",
  "PMK 7/2026",
  "Peraturan LKPP 12/2019",
  "Peraturan BNPB 7/2025",
];

export function SdgsValueChainSection() {
  return (
    <section
      aria-labelledby="siklus-desa-judul"
      className="py-20 md:py-28 bg-linear-to-br from-[#0f766e]/5 via-white to-[#6366f1]/5"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mb-12">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#0d9488] mb-3">
            Siklus tahunan desa
          </p>
          <h2 id="siklus-desa-judul" className="text-3xl md:text-4xl font-bold text-gray-900 text-balance mb-3">
            Dari musyawarah sampai laporan, satu alur data
          </h2>
          <p className="text-lg text-gray-600 leading-relaxed">
            Setiap tahap memakai data tahap sebelumnya, jadi RKP Desa, APB Desa, SPP, Dana Desa,
            dan laporan tidak lagi disalin dari satu spreadsheet ke spreadsheet lain.
          </p>
        </div>

        <ol className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {STEPS.map((s, i) => (
            <li
              key={s.title}
              className="flex flex-col rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-center gap-3 mb-3">
                <span
                  aria-hidden="true"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#0f766e] text-sm font-semibold text-white"
                >
                  {i + 1}
                </span>
                <h3 className="font-semibold text-gray-900 leading-snug">
                  <span className="sr-only">Langkah {i + 1}: </span>
                  {s.title}
                </h3>
              </div>

              {s.deadline && (
                <p className="mb-3 inline-flex w-fit items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-900 border border-amber-200">
                  <CalendarCheck className="h-3.5 w-3.5" aria-hidden="true" />
                  {s.deadline}
                </p>
              )}

              <p className="text-sm text-gray-600 leading-relaxed mb-4">{s.body}</p>

              <ul className="mb-4 flex flex-wrap gap-1.5" aria-label="Modul terkait">
                {s.modules.map((m) => (
                  <li
                    key={m}
                    className="rounded-md bg-teal-50 px-2 py-0.5 text-xs font-medium text-teal-900 border border-teal-100"
                  >
                    {m}
                  </li>
                ))}
              </ul>

              <Link
                href={s.href}
                className="mt-auto inline-flex items-center gap-1 text-sm font-medium text-[#0f766e] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0d9488]"
              >
                Lihat modulnya
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ol>

        <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-5 md:p-6">
          <div className="flex items-start gap-3">
            <Scale className="mt-0.5 h-5 w-5 shrink-0 text-[#0f766e]" aria-hidden="true" />
            <div>
              <h3 className="font-semibold text-gray-900">Dibangun dari teks peraturan, bukan tebakan</h3>
              <p className="mt-1 text-sm text-gray-600 leading-relaxed">
                Tenggat, batas, dan larangan ditulis dari teks resmi peraturan, dan temuan kepatuhan
                Dana Desa menyebut pasalnya. Aturan Dana Desa disimpan berversi per tahun, sehingga
                pembaruan tahunan tidak mengubah data tahun-tahun lama.
              </p>
              <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Peraturan yang dipakai">
                {REGULATIONS.map((r) => (
                  <li
                    key={r}
                    className="rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700"
                  >
                    {r}
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-gray-500">
                Modul berlabel Akses awal masih disempurnakan bersama desa pengguna.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-10 text-center">
          <Link
            href="/platform"
            className="inline-flex items-center rounded-xl bg-[#0d9488] px-6 py-3 text-sm font-medium text-white hover:bg-[#0f766e] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0d9488]"
          >
            Lihat semua fitur
          </Link>
        </div>
      </div>
    </section>
  );
}
