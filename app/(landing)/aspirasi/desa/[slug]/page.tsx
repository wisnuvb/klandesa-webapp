import { cache } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeCheck, MapPin } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { AspirationCard, Pagination, btnOutline, btnPrimary, focusRing } from "@/components/aspirasi/ui";
import { PROGRESS_LABELS, PROGRESS_STATUSES } from "@/lib/aspirasi/catalog";
import { breadcrumbJsonLd, jsonLd, pageFromQuery, single, withQuery } from "@/lib/aspirasi/page-utils";
import { areaIndexable } from "@/lib/aspirasi/public";
import { getPublicArea, listPublicAspirations } from "@/lib/aspirasi/service";
import { areaPath } from "@/lib/aspirasi/slug";
import { getMainSiteOrigin, joinUrl } from "@/lib/seo/url";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ status?: string | string[]; page?: string | string[] }> };

const loadArea = cache(async (slug: string) => getPublicArea(prisma, slug));
const areaId = cache(async (slug: string) => (await prisma.aspirationArea.findUnique({ where: { slug }, select: { id: true } }))?.id ?? null);

const label = (a: { kind: string; name: string }) => `${a.kind === "kelurahan" ? "Kelurahan" : "Desa"} ${a.name}`;

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { slug } = await params;
  const sp = await searchParams;
  const area = await loadArea(slug);
  if (!area) return { title: "Desa tidak ditemukan", robots: { index: false, follow: false } };
  const id = await areaId(slug);
  const filtered = Boolean(single(sp.status) || pageFromQuery(sp.page) > 1);
  const indexable = !filtered && id != null && (await areaIndexable(prisma, id));
  const title = `Aspirasi Warga ${label(area)}, ${area.regency}`.slice(0, 60);
  const description = `Laporan warga tentang kondisi ${label(area)}, Kec. ${area.district}, ${area.regency}, beserta tanggapan pemerintah desa. ${area.published} laporan tayang.`;
  return {
    title,
    description,
    alternates: { canonical: joinUrl(getMainSiteOrigin(), areaPath(slug)) },
    robots: indexable ? { index: true, follow: true } : { index: false, follow: true },
  };
}

export default async function AreaPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const area = await loadArea(slug);
  // Halaman desa hanya ada bila punya laporan tayang atau sudah dikelola desa (nama area bisa dikarang pengirim sebelum moderasi).
  if (!area || (area.published === 0 && !area.claimed)) notFound();

  const status = single(sp.status);
  const progress = status && (PROGRESS_STATUSES as readonly string[]).includes(status) ? status : undefined;
  const page = pageFromQuery(sp.page);
  const [list, id] = await Promise.all([listPublicAspirations(prisma, { areaSlug: slug, progress, page, pageSize: 12 }), areaId(slug)]);
  const totalPages = Math.max(1, Math.ceil(list.total / list.pageSize));
  const filtered = Boolean(progress || page > 1);
  const indexable = !filtered && id != null && (await areaIndexable(prisma, id));
  const origin = getMainSiteOrigin();
  const chip = (active: boolean) =>
    `inline-flex min-h-11 items-center rounded-full border px-4 text-base transition ${focusRing} ${active ? "border-[#0f766e] bg-[#0f766e] font-semibold text-white" : "border-gray-300 bg-white text-gray-900 hover:border-teal-600"}`;

  return (
    <main className="min-h-screen bg-white">
      {indexable ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: jsonLd(
              breadcrumbJsonLd([
                { name: "Beranda", url: origin },
                { name: "Aspirasi Warga", url: joinUrl(origin, "/aspirasi") },
                { name: label(area), url: joinUrl(origin, areaPath(slug)) },
              ]),
            ),
          }}
        />
      ) : null}
      <div className="mx-auto max-w-4xl px-4 pb-16 pt-24 sm:px-6 lg:px-8">
        <nav aria-label="Navigasi remah roti" className="text-sm text-gray-700">
          <Link href="/aspirasi" className={`underline underline-offset-2 ${focusRing}`}>
            Aspirasi Warga
          </Link>
        </nav>
        <header className="mt-3">
          <h1 className="text-balance text-3xl font-semibold text-gray-900 sm:text-4xl">Aspirasi Warga {label(area)}</h1>
          <p className="mt-2 flex items-center gap-2 text-lg text-gray-700">
            <MapPin className="h-5 w-5 shrink-0" aria-hidden="true" />
            Kec. {area.district}, {area.regency}, {area.province}
          </p>
          {area.claimed ? (
            <p className="mt-3 inline-flex items-center gap-2 rounded-full border border-emerald-400 bg-emerald-50 px-4 py-1.5 text-base font-medium text-emerald-950">
              <BadgeCheck className="h-5 w-5" aria-hidden="true" />
              Dikelola pemerintah desa
            </p>
          ) : null}
        </header>

        {area.published > 0 ? (
          <dl className="mt-6 grid grid-cols-3 gap-3">
            {[
              ["Laporan tayang", area.published],
              ["Sudah ditanggapi", area.responded],
              ["Selesai", area.resolved],
            ].map(([k, v]) => (
              <div key={String(k)} className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <dt className="text-sm text-gray-700">{k}</dt>
                <dd className="mt-1 text-3xl font-semibold tabular-nums text-gray-900">{v}</dd>
              </div>
            ))}
          </dl>
        ) : null}

        {!area.claimed ? (
          <aside className="mt-6 rounded-2xl border border-teal-300 bg-teal-50 p-5" aria-labelledby="klaim-judul">
            <h2 id="klaim-judul" className="text-lg font-semibold text-teal-950">
              Apakah Anda perangkat {label(area)}?
            </h2>
            <p className="mt-1 text-base leading-relaxed text-teal-950">Halaman ini belum dikelola pemerintah desa. Klaim agar desa dapat menanggapi laporan warga secara resmi dan terbuka.</p>
            <Link href={`/aspirasi/klaim/${slug}`} className={`${btnOutline} mt-3`}>
              Klaim halaman desa ini
            </Link>
          </aside>
        ) : null}

        <section className="mt-10" aria-labelledby="daftar">
          <h2 id="daftar" className="text-2xl font-semibold text-gray-900">
            Laporan warga
          </h2>
          <nav aria-label="Saring status tanggapan" className="mt-3">
            <ul className="flex flex-wrap gap-2">
              <li>
                <Link href={areaPath(slug)} className={chip(!progress)} aria-current={!progress ? "true" : undefined}>
                  Semua status
                </Link>
              </li>
              {PROGRESS_STATUSES.map((s) => (
                <li key={s}>
                  <Link href={withQuery(areaPath(slug), { status: s })} className={chip(progress === s)} aria-current={progress === s ? "true" : undefined}>
                    {PROGRESS_LABELS[s]}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          {list.items.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-gray-300 p-8 text-center">
              <p className="text-lg font-semibold text-gray-900">{progress ? "Tidak ada laporan dengan status ini." : "Belum ada laporan yang tayang untuk desa ini."}</p>
              <Link href="/aspirasi/kirim" className={`${btnPrimary} mt-4`}>
                Sampaikan aspirasi
              </Link>
            </div>
          ) : (
            <ul className="mt-6 space-y-4">
              {list.items.map((a) => (
                <AspirationCard key={a.code} a={a} showArea={false} />
              ))}
            </ul>
          )}
          <Pagination basePath={areaPath(slug)} params={{ status: progress }} page={Math.min(page, totalPages)} totalPages={totalPages} label="Paginasi laporan desa" />
        </section>

        <div className="mt-10">
          <Link href="/aspirasi/kirim" className={btnPrimary}>
            Sampaikan aspirasi untuk desa ini
          </Link>
        </div>
      </div>
    </main>
  );
}
