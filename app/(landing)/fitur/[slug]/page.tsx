import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { TOPIC_PAGES, getTopicPage } from "@/lib/marketing/topic-pages";
import { buildLandingSeo } from "@/lib/seo/landing";
import { getMainSiteOrigin, joinUrl } from "@/lib/seo/url";

type Props = { params: Promise<{ slug: string }> };

/** Daftar statis: semua halaman dibuat saat build; slug lain 404. */
export const dynamicParams = false;
export function generateStaticParams() {
  return TOPIC_PAGES.map((t) => ({ slug: t.slug }));
}

function jsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { slug } = await props.params;
  const topic = getTopicPage(slug);
  if (!topic) return { title: "Halaman tidak ditemukan", robots: { index: false, follow: false } };

  const seo = buildLandingSeo(`/fitur/${topic.slug}`, topic.title, topic.description);
  const shareTitle = `${topic.title} | Klandesa`;
  return {
    title: topic.title,
    description: topic.description,
    keywords: topic.keywords,
    alternates: { canonical: seo.canonical },
    robots: "index, follow",
    openGraph: {
      type: "website",
      locale: "id_ID",
      siteName: "Klandesa",
      title: shareTitle,
      description: topic.description,
      url: seo.canonical,
      images: [{ url: seo.ogImage }],
    },
    twitter: {
      card: "summary_large_image",
      title: shareTitle,
      description: topic.description,
      images: [seo.ogImage],
    },
  };
}

export default async function TopicPageRoute(props: Props) {
  const { slug } = await props.params;
  const topic = getTopicPage(slug);
  if (!topic) notFound();

  const origin = getMainSiteOrigin();
  const url = joinUrl(origin, `/fitur/${topic.slug}`);
  const related = topic.related
    .map((s) => getTopicPage(s))
    .filter((t): t is NonNullable<typeof t> => Boolean(t));

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Beranda", item: origin },
      { "@type": "ListItem", position: 2, name: "Fitur", item: joinUrl(origin, "/fitur") },
      { "@type": "ListItem", position: 3, name: topic.shortName, item: url },
    ],
  };
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: topic.faqs.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };
  const appLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Klandesa",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web, Android",
    url,
    inLanguage: "id-ID",
    description: topic.description,
  };

  return (
    <article className="max-w-3xl mx-auto px-4 pt-28 pb-20 md:pt-32 md:pb-28">
      {[breadcrumbLd, faqLd, appLd].map((ld) => (
        <script
          key={ld["@type"]}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLd(ld) }}
        />
      ))}

      <nav aria-label="Breadcrumb" className="text-sm text-gray-500 mb-6">
        <ol className="flex flex-wrap items-center gap-2">
          <li>
            <Link href="/" className="hover:text-gray-900 underline-offset-4 hover:underline">
              Beranda
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link href="/fitur" className="hover:text-gray-900 underline-offset-4 hover:underline">
              Fitur
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="text-gray-700">
            {topic.shortName}
          </li>
        </ol>
      </nav>

      <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 leading-tight">
        {topic.h1}
      </h1>
      <p className="text-gray-600 text-lg leading-relaxed mb-8">{topic.intro}</p>
      <div className="flex flex-wrap gap-4 mb-16">
        <Link
          href="/demo"
          className="inline-flex rounded-xl bg-[#0d9488] px-6 py-3 text-white text-sm font-medium hover:bg-[#0f766e]"
        >
          Coba Demo
        </Link>
        <Link
          href="/harga"
          className="inline-flex rounded-xl border border-gray-200 px-6 py-3 text-sm font-medium hover:bg-gray-50"
        >
          Lihat harga
        </Link>
      </div>

      <section className="mb-16" aria-labelledby="masalah">
        <h2 id="masalah" className="text-2xl font-bold text-gray-900 mb-6">
          Masalah yang dibantu selesaikan
        </h2>
        <div className="space-y-4">
          {topic.problems.map((p) => (
            <div key={p.title} className="rounded-2xl border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-900 mb-1">{p.title}</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{p.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-16" aria-labelledby="fitur">
        <h2 id="fitur" className="text-2xl font-bold text-gray-900 mb-6">
          Yang bisa Anda kerjakan
        </h2>
        <ul className="grid gap-4 sm:grid-cols-2">
          {topic.features.map((f) => (
            <li key={f.title} className="rounded-2xl bg-gray-50 p-5">
              <h3 className="font-semibold text-gray-900 mb-1">{f.title}</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{f.body}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mb-16" aria-labelledby="alur">
        <h2 id="alur" className="text-2xl font-bold text-gray-900 mb-6">
          Alur kerjanya
        </h2>
        <ol className="space-y-6">
          {topic.steps.map((s, i) => (
            <li key={s.title} className="flex gap-4">
              <span
                aria-hidden="true"
                className="shrink-0 w-8 h-8 rounded-full bg-[#0d9488]/10 text-[#0f766e] text-sm font-semibold flex items-center justify-center"
              >
                {i + 1}
              </span>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">{s.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="mb-16" aria-labelledby="faq">
        <h2 id="faq" className="text-2xl font-bold text-gray-900 mb-6">
          Pertanyaan umum
        </h2>
        <div className="space-y-5">
          {topic.faqs.map((f) => (
            <div key={f.question}>
              <h3 className="font-semibold text-gray-900 mb-1">{f.question}</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{f.answer}</p>
            </div>
          ))}
        </div>
      </section>

      {related.length > 0 && (
        <section className="mb-12" aria-labelledby="terkait">
          <h2 id="terkait" className="text-2xl font-bold text-gray-900 mb-4">
            Topik terkait
          </h2>
          <ul className="flex flex-wrap gap-3">
            {related.map((r) => (
              <li key={r.slug}>
                <Link
                  href={`/fitur/${r.slug}`}
                  className="inline-flex rounded-full border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  {r.shortName}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="text-sm text-gray-600">
        Lihat{" "}
        <Link href="/platform" className="text-[#0f766e] underline underline-offset-4">
          semua fitur Klandesa
        </Link>{" "}
        atau baca{" "}
        <Link href="/solusi/desa" className="text-[#0f766e] underline underline-offset-4">
          solusi untuk pemerintah desa
        </Link>
        .
      </p>
    </article>
  );
}
