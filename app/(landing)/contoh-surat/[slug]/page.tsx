import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { LetterPaper } from "@/components/letters/LetterPaper";
import { PAPER_SIZES } from "@/lib/letters/paper";
import { getPublicLetter, listPublicLetters, publicSampleValues } from "@/lib/letters/public-catalog";
import { buildLandingSeo } from "@/lib/seo/landing";
import { getMainSiteOrigin, joinUrl } from "@/lib/seo/url";
import { SampleLetterFrame } from "../SampleLetterFrame";

type Props = { params: Promise<{ slug: string }> };

/** Katalog statis: semua halaman dibuat saat build; slug lain 404. */
export const dynamicParams = false;
export function generateStaticParams() {
  return listPublicLetters().map((l) => ({ slug: l.slug }));
}

function jsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { slug } = await props.params;
  const letter = getPublicLetter(slug);
  if (!letter) return { title: "Contoh surat tidak ditemukan", robots: { index: false, follow: false } };

  const title = `Contoh ${letter.name} Desa — Format & Data yang Diisi`;
  const description = letter.guide?.intro ?? letter.description;
  const seo = buildLandingSeo(`/contoh-surat/${slug}`, title, description);
  return {
    title,
    description,
    alternates: { canonical: seo.canonical },
    robots: letter.indexable ? "index, follow" : "noindex, follow",
    openGraph: { type: "article", locale: "id_ID", siteName: "Klandesa", title, description, url: seo.canonical, images: [{ url: seo.ogImage }] },
    twitter: { card: "summary_large_image", title, description, images: [seo.ogImage] },
  };
}

export default async function ContohSuratPage(props: Props) {
  const { slug } = await props.params;
  const letter = getPublicLetter(slug);
  if (!letter) notFound();

  const { doc, summary, guide } = letter;
  const size = PAPER_SIZES[doc.page.size];
  const widthMm = doc.page.orientation === "portrait" ? size.widthMm : size.heightMm;
  const related = listPublicLetters()
    .filter((l) => l.category === letter.category && l.slug !== letter.slug)
    .slice(0, 4);

  const origin = getMainSiteOrigin();
  const url = joinUrl(origin, `/contoh-surat/${letter.slug}`);
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Beranda", item: origin },
      { "@type": "ListItem", position: 2, name: "Contoh Surat", item: joinUrl(origin, "/contoh-surat") },
      { "@type": "ListItem", position: 3, name: letter.name, item: url },
    ],
  };

  return (
    <main className="min-h-screen bg-white">
      {letter.indexable ? (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(breadcrumbLd) }} />
      ) : null}

      <div className="mx-auto max-w-4xl px-4 pt-24 pb-16 sm:px-6 lg:px-8">
        <nav aria-label="Breadcrumb" className="mb-6 text-sm text-gray-600">
          <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <li><Link href="/" className="hover:text-teal-700 hover:underline">Beranda</Link></li>
            <li aria-hidden="true">/</li>
            <li><Link href="/contoh-surat" className="hover:text-teal-700 hover:underline">Contoh Surat</Link></li>
          </ol>
        </nav>

        <header className="max-w-3xl space-y-3">
          <p className="text-sm font-medium text-teal-800">{letter.category}</p>
          <h1 className="text-balance text-3xl font-semibold leading-tight text-gray-900 sm:text-4xl">
            Contoh {letter.name}
          </h1>
          <p className="text-lg leading-relaxed text-gray-600">{guide?.intro ?? letter.description}</p>
        </header>

        <section aria-labelledby="sample-title" className="mt-8">
          <h2 id="sample-title" className="mb-3 text-xl font-semibold text-gray-900">Tampilan surat</h2>
          <SampleLetterFrame widthMm={widthMm} label={`Contoh tampilan ${letter.name}, dapat digeser`}>
            <LetterPaper doc={doc} values={publicSampleValues(doc)} mode="preview" />
          </SampleLetterFrame>
          <p className="mt-2 text-sm text-gray-600">
            Data dalam contoh bersifat fiktif. Isian bertanda kurung siku akan terisi otomatis saat surat dibuat.
          </p>
        </section>

        <div className="mt-10 grid max-w-3xl gap-8">
          <section aria-labelledby="data-title">
            <h2 id="data-title" className="text-xl font-semibold text-gray-900">Data yang perlu disiapkan</h2>
            <ul className="mt-3 list-disc space-y-2 pl-6 text-gray-700 marker:text-teal-700">
              {summary.people.map((p) => (
                <li key={p.role}>
                  <strong className="font-semibold text-gray-900">{p.role}:</strong> {p.fields.join(", ")}
                </li>
              ))}
              {summary.isian.length > 0 ? (
                <li><strong className="font-semibold text-gray-900">Isian tambahan:</strong> {summary.isian.join(", ")}</li>
              ) : null}
              {summary.groups.map((g) => (
                <li key={g}><strong className="font-semibold text-gray-900">Daftar:</strong> {g}</li>
              ))}
            </ul>
            <p className="mt-3 text-sm text-gray-600">
              Kop, nomor surat, tanggal, dan nama pejabat penandatangan terisi otomatis dari pengaturan desa.
            </p>
          </section>

          {guide ? (
            <>
              <section aria-labelledby="when-title">
                <h2 id="when-title" className="text-xl font-semibold text-gray-900">Kapan surat ini dipakai</h2>
                <ul className="mt-3 list-disc space-y-2 pl-6 text-gray-700 marker:text-teal-700">
                  {guide.kapanDipakai.map((t) => <li key={t}>{t}</li>)}
                </ul>
              </section>
              <section aria-labelledby="tips-title">
                <h2 id="tips-title" className="text-xl font-semibold text-gray-900">Tips mengisi</h2>
                <ul className="mt-3 list-disc space-y-2 pl-6 text-gray-700 marker:text-teal-700">
                  {guide.tips.map((t) => <li key={t}>{t}</li>)}
                </ul>
              </section>
            </>
          ) : null}

          <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            Contoh ini untuk referensi. Format dan persyaratan dapat berbeda antar desa dan kabupaten; ikuti
            ketentuan setempat.
          </p>
        </div>

        <aside aria-labelledby="letter-cta" className="mt-12 rounded-2xl bg-teal-900 p-6 text-white sm:p-8">
          <h2 id="letter-cta" className="text-xl font-semibold sm:text-2xl">Buat {letter.name} otomatis</h2>
          <p className="mt-2 max-w-[60ch] text-teal-50">
            Pilih warga dari data desa, isi keperluan, dan surat langsung siap cetak lengkap dengan kop dan nomor. Coba gratis 14 hari.
          </p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <Link href="/demo" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-teal-900 hover:bg-teal-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
              Coba demo Klandesa
            </Link>
            <Link href="/harga" className="inline-flex min-h-11 items-center justify-center rounded-xl px-5 py-2.5 text-sm font-medium text-white underline underline-offset-4 hover:text-teal-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
              Lihat harga
            </Link>
          </div>
        </aside>

        {related.length > 0 ? (
          <section aria-labelledby="related-letters" className="mt-12">
            <h2 id="related-letters" className="text-xl font-semibold text-gray-900">Contoh surat lain: {letter.category}</h2>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {related.map((l) => (
                <li key={l.slug}>
                  <Link href={`/contoh-surat/${l.slug}`} className="block rounded-xl border border-gray-200 p-3 font-medium text-gray-900 hover:border-teal-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700">
                    {l.name}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </main>
  );
}
