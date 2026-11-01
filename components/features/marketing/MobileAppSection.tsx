import type { LucideIcon } from "lucide-react";
import {
  ClipboardCheck,
  ClipboardList,
  FileCheck2,
  FileText,
  Gauge,
  Megaphone,
  MessageSquareWarning,
  Newspaper,
  Receipt,
  ScanLine,
  ShieldCheck,
  Smartphone,
  Store,
  UserCheck,
  Users,
  UsersRound,
  Wallet,
} from "lucide-react";

type Item = { icon: LucideIcon; text: string };
type Role = {
  id: string;
  icon: LucideIcon;
  title: string;
  tagline: string;
  /** Warna aksen: kelas statis agar terdeteksi Tailwind. */
  accent: { chip: string; icon: string; frame: string };
  items: Item[];
};

/**
 * Setiap butir menunjuk layar yang ada di mobile/src/app/(app) (lihat docs/MOBILE_V2_ROADMAP.md dan
 * docs/UKM_WARGA.md). Jangan menambah butir untuk layar yang belum ada.
 */
const ROLES: Role[] = [
  {
    id: "warga",
    icon: Users,
    title: "Warga",
    tagline: "Layanan desa di saku",
    accent: { chip: "bg-teal-50 text-teal-900", icon: "text-teal-700", frame: "border-teal-200" },
    items: [
      { icon: FileText, text: "Ajukan surat dan pantau statusnya" },
      { icon: MessageSquareWarning, text: "Lapor masalah ke desa dan lacak tanggapannya" },
      { icon: Newspaper, text: "Kabar desa dengan foto dan komentar (desa bisa mematikannya)" },
      { icon: Wallet, text: "Laporkan bayar iuran RT dan lihat kas RT" },
      { icon: Store, text: "Pasang produk UKM sendiri dan kelola pesanan sederhana" },
      { icon: UsersRound, text: "Lihat data keluarga dan ajukan koreksi data" },
    ],
  },
  {
    id: "rt",
    icon: UserCheck,
    title: "Ketua RT",
    tagline: "Pengantar surat dan iuran",
    accent: { chip: "bg-indigo-50 text-indigo-900", icon: "text-indigo-700", frame: "border-indigo-200" },
    items: [
      { icon: ClipboardCheck, text: "Setujui atau tolak pengantar surat warga RT" },
      { icon: UsersRound, text: "Lihat warga RT dengan NIK tersamar" },
      { icon: Receipt, text: "Atur jadwal iuran, nominal per KK, dan cara bayar" },
      { icon: ClipboardList, text: "Terima atau tolak laporan bayar warga" },
      { icon: Wallet, text: "Catat uang masuk dan keluar (foto nota) dan pantau saldo kas RT" },
    ],
  },
  {
    id: "perangkat",
    icon: ShieldCheck,
    title: "Perangkat desa",
    tagline: "Layanan, absensi, dan moderasi",
    accent: { chip: "bg-amber-50 text-amber-900", icon: "text-amber-800", frame: "border-amber-200" },
    items: [
      { icon: ClipboardList, text: "Antrean permohonan surat dan keputusan" },
      { icon: ScanLine, text: "Absen dengan scan QR kantor atau GPS" },
      { icon: ShieldCheck, text: "Moderasi kabar warga dan verifikasi pendaftaran" },
      { icon: FileCheck2, text: "Tinjau pengajuan koreksi data warga" },
      { icon: Gauge, text: "Rapor layanan: waktu penyelesaian dan surat selesai dalam 48 jam" },
      { icon: Megaphone, text: "Kirim pengumuman ke warga" },
    ],
  },
];

export function MobileAppSection() {
  return (
    <section
      id="aplikasi-seluler"
      aria-labelledby="aplikasi-seluler-judul"
      className="py-20 md:py-28 bg-white border-y border-gray-100"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mb-12">
          <p className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-[#0d9488] mb-3">
            <Smartphone className="h-4 w-4" aria-hidden="true" />
            Aplikasi seluler
          </p>
          <h2 id="aplikasi-seluler-judul" className="text-3xl md:text-4xl font-bold text-gray-900 text-balance mb-3">
            Warga, RT, dan perangkat desa dalam satu aplikasi
          </h2>
          <p className="text-lg text-gray-600 leading-relaxed">
            Menu mengikuti peran. Yang diajukan warga langsung sampai ke antrean perangkat desa,
            lewat pengantar RT bila desa mengaktifkannya, tanpa perlu antre di kantor desa.
          </p>
        </div>

        <ul className="grid gap-5 lg:grid-cols-3">
          {ROLES.map((r) => (
            <li key={r.id} className="flex">
              <article
                className={`flex w-full flex-col overflow-hidden rounded-3xl border bg-white shadow-sm ${r.accent.frame}`}
                aria-labelledby={`peran-${r.id}`}
              >
                {/* Bingkai ponsel sederhana: bilah atas aplikasi + daftar layar */}
                <div className={`flex items-center gap-3 px-5 py-4 ${r.accent.chip}`}>
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/80">
                    <r.icon className={`h-5 w-5 ${r.accent.icon}`} aria-hidden="true" />
                  </span>
                  <div>
                    <h3 id={`peran-${r.id}`} className="font-semibold leading-tight">
                      {r.title}
                    </h3>
                    <p className="text-sm opacity-90">{r.tagline}</p>
                  </div>
                </div>
                <ul className="flex-1 divide-y divide-gray-100 px-5">
                  {r.items.map((it) => (
                    <li key={it.text} className="flex items-start gap-3 py-3 text-sm text-gray-700">
                      <it.icon className={`mt-0.5 h-4 w-4 shrink-0 ${r.accent.icon}`} aria-hidden="true" />
                      <span className="leading-relaxed">{it.text}</span>
                    </li>
                  ))}
                </ul>
              </article>
            </li>
          ))}
        </ul>

        <p className="mt-6 text-sm text-gray-500 max-w-3xl">
          Daftar di atas diambil dari layar yang sudah ada di aplikasi. Fitur yang menampilkan data
          pribadi, seperti NIK lengkap, dicatat di jejak audit dan dibatasi jumlah bukanya per jam.
        </p>
      </div>
    </section>
  );
}
