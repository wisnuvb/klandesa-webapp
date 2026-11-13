import Link from "next/link";
import type { Metadata } from "next";
import { TOPIC_PAGES } from "@/lib/marketing/topic-pages";
import { buildLandingSeo } from "@/lib/seo/landing";

const TITLE = "Fitur Aplikasi Desa — Surat, APBDes, Dana Desa & Laporan";
const DESCRIPTION =
  "Panduan fitur aplikasi desa Klandesa per kebutuhan: surat desa, APBDes, Dana Desa, BLT Desa, RKP Desa, dan laporan kepala desa.";

const seo = buildLandingSeo("/fitur", TITLE, DESCRIPTION);

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: seo.canonical },
  robots: "index, follow",
  openGraph: {
    type: "website",
    locale: "id_ID",
    siteName: "Klandesa",
    title: `${TITLE} | Klandesa`,
    description: DESCRIPTION,
    url: seo.canonical,
    images: [{ url: seo.ogImage }],
  },
  twitter: {
    card: "summary_large_image",
    title: `${TITLE} | Klandesa`,
    description: DESCRIPTION,
    images: [seo.ogImage],
  },
};

export default function FiturHubPage() {
  return (
    <article className="max-w-3xl mx-auto px-4 pt-28 pb-20 md:pt-32 md:pb-28">
      <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
        Fitur aplikasi desa, per kebutuhan
      </h1>
      <p className="text-gray-600 text-lg leading-relaxed mb-10">
        Pilih pekerjaan yang ingin Anda rapikan. Setiap halaman menjelaskan apa yang dikerjakan
        Klandesa, alurnya, dan pertanyaan yang sering diajukan perangkat desa.
      </p>
      <ul className="space-y-4 mb-12">
        {TOPIC_PAGES.map((t) => (
          <li key={t.slug}>
            <Link
              href={`/fitur/${t.slug}`}
              className="block rounded-2xl border border-gray-200 p-5 hover:border-[#0d9488]/40 hover:bg-gray-50"
            >
              <h2 className="font-semibold text-gray-900 mb-1">{t.shortName}</h2>
              <p className="text-sm text-gray-600 leading-relaxed">{t.description}</p>
            </Link>
          </li>
        ))}
      </ul>
      <p className="text-sm text-gray-600">
        Ingin melihat daftar lengkapnya? Buka{" "}
        <Link href="/platform" className="text-[#0f766e] underline underline-offset-4">
          katalog semua modul
        </Link>
        .
      </p>
    </article>
  );
}
