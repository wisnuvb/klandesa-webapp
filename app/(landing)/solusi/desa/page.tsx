import Link from "next/link";
import type { Metadata } from "next";
import { getLandingPageMetadata } from "@/lib/seo/landing-pages";

export const metadata: Metadata = getLandingPageMetadata("solusiDesa");

const points = [
  {
    title: "Operasional harian satu login",
    body: "Warga, KK, surat daring, pengumuman, bansos PKH yang tercatat, dan sistem keuangan/APBDes terpadu dalam RBAC untuk admin, Sekdes, Kades, serta staf.",
  },
  {
    title: "Program lapangan ada jejaknya",
    body: "PKK Dasawisma, posyandu; BUMDes terpisah lane keuangan; pertanian serta kegiatan RT/RW—all menuju pembacaan dampak pembangunan, bukan lembaran terpisah.",
  },
  {
    title: "SDGs menjadi kompas pembangunan",
    body: "Ringkasan 18 sasaran serta heatmap wilayah membantu Anda memutus subsidi program yang tepat sasaran bersama stakeholder desa.",
  },
  {
    title: "Berani berpilot bersama Early Access",
    body: "Modul SDGs lanjutan serta Asisten AI memakai kredit per pengguna — buka akses secara bertahap bersama Customer Success tim Klandesa.",
  },
];

export default function SolusiDesaPage() {
  return (
    <article className="max-w-3xl mx-auto px-4 py-20 md:py-28">
      <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
        Untuk Pemerintah Desa &amp; perangkatnya
      </h1>
      <p className="text-gray-600 text-lg mb-10">
        Klandesa menghidupkan jargon &quot;SATU DESA SATU PLATFORM&quot;: administrasi yang
        rapi serta pelaporan SDGs yang bisa dipertanggungjawabkan.
      </p>
      <div className="space-y-6 mb-12">
        {points.map((p) => (
          <div key={p.title} className="rounded-2xl border border-gray-200 p-6">
            <h2 className="font-semibold text-gray-900 mb-2">{p.title}</h2>
            <p className="text-sm text-gray-600 leading-relaxed">{p.body}</p>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-4">
        <Link
          href="/demo"
          className="inline-flex rounded-xl bg-[#0d9488] px-6 py-3 text-white text-sm font-medium hover:bg-[#0f766e]"
        >
          Coba Demo
        </Link>
        <Link
          href="/platform"
          className="inline-flex rounded-xl border border-gray-200 px-6 py-3 text-sm font-medium hover:bg-gray-50"
        >
          Lihat Modul Platform
        </Link>
      </div>
    </article>
  );
}
