import { cache } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { CalendarDays, Landmark, MapPin, MessageSquareReply, Scale } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { FlagDialog } from "@/components/aspirasi/FlagDialog";
import { AreaLink, CategoryChip, ProgressBadge, btnOutline, focusRing } from "@/components/aspirasi/ui";
import { REPLY_KIND_LABELS } from "@/lib/aspirasi/catalog";
import {
  aspirationJsonLd,
  aspirationMetaDescription,
  aspirationTitleTag,
  breadcrumbJsonLd,
  formatDayWib,
  isPublicAspirationIndexable,
  jsonLd,
  resolveAspirationSegment,
} from "@/lib/aspirasi/page-utils";
import { photoUrls } from "@/lib/aspirasi/photo-urls";
import { getPublicAspiration, type PublicAspiration } from "@/lib/aspirasi/service";
import { areaPath, aspirationPath, codeFromSegment } from "@/lib/aspirasi/slug";
import { getMainSiteOrigin, joinUrl } from "@/lib/seo/url";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

/** Satu pembacaan untuk generateMetadata dan halaman (cache() hanya berlaku dalam satu permintaan). */
const load = cache(async (segment: string): Promise<PublicAspiration | null> => {
  const code = codeFromSegment(segment);
  return code ? getPublicAspiration(prisma, code) : null;
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const a = await load(slug);
  if (!a) return { title: "Laporan tidak ditemukan", robots: { index: false, follow: false } };
  const url = joinUrl(getMainSiteOrigin(), aspirationPath(a));
  const description = aspirationMetaDescription(a);
  const title = aspirationTitleTag(a.title);
  return {
    title,
    description,
    alternates: { canonical: url },
    robots: isPublicAspirationIndexable(a) ? { index: true, follow: true } : { index: false, follow: true },
    openGraph: { type: "article", locale: "id_ID", title, description, url, ...(a.publishedAt ? { publishedTime: a.publishedAt.toISOString() } : {}) },
    twitter: { card: "summary", title, description },
  };
}

export default async function AspirationPage({ params }: Props) {
  const { slug } = await params;
  const a = await load(slug);
  if (!a) notFound();
  const { redirectTo } = resolveAspirationSegment(slug, a);
  if (redirectTo) permanentRedirect(redirectTo);

  const origin = getMainSiteOrigin();
  const url = joinUrl(origin, aspirationPath(a));
  const indexable = isPublicAspirationIndexable(a);
  const photos = photoUrls(a.photoKeys);
  const hasDispute = a.replies.some((r) => r.kind === "DISPUTE");

  return (
    <main className="min-h-screen bg-white">
      {indexable ? (
        <>
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: jsonLd(
                breadcrumbJsonLd([
                  { name: "Beranda", url: origin },
                  { name: "Aspirasi Warga", url: joinUrl(origin, "/aspirasi") },
                  { name: a.area.name, url: joinUrl(origin, areaPath(a.area.slug)) },
                  { name: a.title, url },
                ]),
              ),
            }}
          />
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(aspirationJsonLd(a, url)) }} />
        </>
      ) : null}
      <article className="mx-auto max-w-3xl px-4 pb-16 pt-24 sm:px-6">
        <nav aria-label="Navigasi remah roti" className="text-sm text-gray-700">
          <ol className="flex flex-wrap items-center gap-1">
            <li>
              <Link href="/aspirasi" className={`underline underline-offset-2 ${focusRing}`}>
                Aspirasi Warga
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link href={areaPath(a.area.slug)} className={`underline underline-offset-2 ${focusRing}`}>
                {a.area.name}
              </Link>
            </li>
          </ol>
        </nav>

        <header className="mt-4">
          <div className="flex flex-wrap items-center gap-2">
            <CategoryChip category={a.category} />
            <ProgressBadge progress={a.progress} />
          </div>
          <h1 className="mt-3 text-balance text-3xl font-semibold leading-tight text-gray-900 sm:text-4xl">{a.title}</h1>
          <dl className="mt-4 flex flex-col gap-2 text-base text-gray-800 sm:flex-row sm:flex-wrap sm:gap-x-6">
            <div className="flex items-center gap-2">
              <dt className="sr-only">Desa</dt>
              <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
              <dd>
                <AreaLink slug={a.area.slug}>
                  {a.area.kind === "kelurahan" ? "Kelurahan" : "Desa"} {a.area.name}
                </AreaLink>
                , Kec. {a.area.district}, {a.area.regency}, {a.area.province}
              </dd>
            </div>
            <div className="flex items-center gap-2">
              <dt className="sr-only">Tanggal tayang</dt>
              <CalendarDays className="h-4 w-4 shrink-0" aria-hidden="true" />
              <dd>
                <time dateTime={a.publishedAt?.toISOString()}>{formatDayWib(a.publishedAt)}</time>
              </dd>
            </div>
          </dl>
          {a.locationNote ? (
            <p className="mt-2 text-base text-gray-800">
              <span className="font-medium">Patokan lokasi:</span> {a.locationNote}
            </p>
          ) : null}
        </header>

        <div className="mt-6 whitespace-pre-line text-lg leading-relaxed text-gray-900">{a.body}</div>

        {photos.length > 0 ? (
          <ul className="mt-6 grid gap-3 sm:grid-cols-2" aria-label="Foto laporan">
            {photos.map((src, i) => (
              <li key={src}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt={`Foto laporan: ${a.title}${photos.length > 1 ? ` (${i + 1} dari ${photos.length})` : ""}`} width={800} height={600} loading="lazy" decoding="async" className="aspect-[4/3] w-full rounded-xl border border-gray-200 object-cover" />
              </li>
            ))}
          </ul>
        ) : null}

        <section className="mt-10" aria-labelledby="tanggapan">
          <h2 id="tanggapan" className="flex items-center gap-2 text-2xl font-semibold text-gray-900">
            <Landmark className="h-6 w-6 text-teal-800" aria-hidden="true" />
            Tanggapan pemerintah desa
          </h2>
          {a.replies.length > 0 ? (
            <ol className="mt-4 space-y-4 border-l-2 border-teal-700 pl-4">
              {a.replies.map((r) => (
                <li key={r.id} className={`rounded-xl border p-4 ${r.kind === "DISPUTE" ? "border-purple-400 bg-purple-50" : "border-gray-200 bg-gray-50"}`}>
                  <p className="flex flex-wrap items-center gap-2 text-sm text-gray-800">
                    {r.kind === "DISPUTE" ? <Scale className="h-4 w-4" aria-hidden="true" /> : <MessageSquareReply className="h-4 w-4" aria-hidden="true" />}
                    <span className="font-semibold">{REPLY_KIND_LABELS[r.kind]}</span>
                    <span aria-hidden="true">·</span>
                    <span>{r.authorLabel}</span>
                    <span aria-hidden="true">·</span>
                    <time dateTime={r.createdAt.toISOString()}>{formatDayWib(r.createdAt)}</time>
                  </p>
                  <p className="mt-2 whitespace-pre-line text-base leading-relaxed text-gray-900">{r.body}</p>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-3 text-base leading-relaxed text-gray-800">Pemerintah desa belum menanggapi laporan ini.</p>
          )}
          {hasDispute ? <p className="mt-3 text-sm text-gray-700">Desa menyampaikan sanggahan atas laporan ini. Baca keduanya sebelum menarik kesimpulan.</p> : null}
        </section>

        {!a.area.claimed && a.replies.length === 0 ? (
          <aside className="mt-8 rounded-2xl border border-teal-300 bg-teal-50 p-5" aria-labelledby="klaim-judul">
            <h2 id="klaim-judul" className="text-lg font-semibold text-teal-950">
              Apakah Anda perangkat desa ini?
            </h2>
            <p className="mt-1 text-base leading-relaxed text-teal-950">Klaim halaman ini agar desa dapat menanggapi laporan warga secara resmi dan terbuka.</p>
            <Link href={`/aspirasi/klaim/${a.area.slug}`} className={`${btnOutline} mt-3`}>
              Klaim halaman desa ini
            </Link>
          </aside>
        ) : null}

        <footer className="mt-10 border-t border-gray-200 pt-5">
          <p className="text-sm leading-relaxed text-gray-700">
            Laporan ini dikirim warga dan <strong>belum tentu telah diverifikasi Klandesa</strong>. Identitas pelapor tidak ditampilkan. Klandesa adalah platform perantara, bukan lembaga pengaduan resmi. Baca{" "}
            <Link href="/privacy-policy#aspirasi-warga" className="underline underline-offset-2">
              kebijakan privasi
            </Link>{" "}
            dan{" "}
            <Link href="/terms-of-service#aspirasi-warga" className="underline underline-offset-2">
              syarat layanan
            </Link>
            .
          </p>
          <div className="mt-2">
            <FlagDialog code={a.code} />
          </div>
        </footer>
      </article>
    </main>
  );
}
