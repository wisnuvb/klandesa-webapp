import type { Metadata } from "next";
import Link from "next/link";
import { buildLandingSeo } from "@/lib/seo/landing";
import { isLetterHubIndexable, listPublicLetters } from "@/lib/letters/public-catalog";

const TITLE = "Contoh Surat Desa — Keterangan, Pengantar, dan Administrasi";
const DESCRIPTION =
  "Kumpulan contoh surat desa dengan format siap pakai: surat keterangan, surat pengantar, kependudukan, dan administrasi desa. Isi otomatis di Klandesa.";

export function generateMetadata(): Metadata {
  const seo = buildLandingSeo("/contoh-surat", TITLE, DESCRIPTION);
  return {
    title: TITLE,
    description: DESCRIPTION,
    alternates: { canonical: seo.canonical },
    // Diindeks hanya setelah ada surat yang sudah ditinjau (lihat REVIEWED_LETTER_KEYS).
    robots: isLetterHubIndexable() ? "index, follow" : "noindex, follow",
    openGraph: { type: "website", locale: "id_ID", siteName: "Klandesa", title: TITLE, description: DESCRIPTION, url: seo.canonical, images: [{ url: seo.ogImage }] },
  };
}

export default function ContohSuratHubPage() {
  const letters = listPublicLetters();
  const categories = [...new Set(letters.map((l) => l.category))];

  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-5xl px-4 pt-24 pb-16 sm:px-6 lg:px-8">
        <header className="max-w-3xl">
          <h1 className="text-balance text-3xl font-semibold leading-tight text-gray-900 sm:text-4xl">
            Contoh Surat Desa
          </h1>
          <p className="mt-3 text-lg leading-relaxed text-gray-600">
            {letters.length} contoh surat yang dipakai di administrasi desa. Lihat tampilan suratnya, data yang
            perlu disiapkan, lalu buat otomatis di Klandesa tanpa mengetik ulang.
          </p>
          <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            Contoh ini untuk referensi. Format dan persyaratan dapat berbeda antar desa dan kabupaten; ikuti
            ketentuan setempat.
          </p>
        </header>

        {categories.map((cat) => (
          <section key={cat} aria-labelledby={`cat-${cat}`} className="mt-12">
            <h2 id={`cat-${cat}`} className="text-xl font-semibold text-gray-900">
              {cat}
            </h2>
            <ul className="mt-4 grid gap-4 sm:grid-cols-2">
              {letters
                .filter((l) => l.category === cat)
                .map((l) => (
                  <li key={l.catalogKey}>
                    <Link
                      href={`/contoh-surat/${l.slug}`}
                      className="block h-full rounded-2xl border border-gray-200 p-4 transition-colors hover:border-teal-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
                    >
                      <span className="block font-semibold text-gray-900">{l.name}</span>
                      <span className="mt-1 block text-sm text-gray-600">{l.description}</span>
                    </Link>
                  </li>
                ))}
            </ul>
          </section>
        ))}

        <aside className="mt-14 rounded-2xl bg-teal-900 p-6 text-white sm:p-8" aria-labelledby="hub-cta">
          <h2 id="hub-cta" className="text-xl font-semibold sm:text-2xl">
            Buat surat otomatis dari data warga
          </h2>
          <p className="mt-2 max-w-[60ch] text-teal-50">
            Pilih warga, isi keperluan, surat jadi lengkap dengan kop, nomor, dan tanda tangan. Coba gratis 14 hari.
          </p>
          <Link
            href="/demo"
            className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-teal-900 hover:bg-teal-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            Coba demo Klandesa
          </Link>
        </aside>
      </div>
    </main>
  );
}
