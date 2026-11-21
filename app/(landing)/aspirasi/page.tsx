import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, EyeOff, MessageSquareReply, Search, ShieldCheck } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { AreaSearch } from "@/components/aspirasi/AreaSearch";
import { AspirationCard, Pagination, btnOutline, btnPrimary, focusRing } from "@/components/aspirasi/ui";
import { ASPIRATION_CATEGORIES, PROGRESS_LABELS, PROGRESS_STATUSES, isAspirationCategory } from "@/lib/aspirasi/catalog";
import { pageFromQuery, single, withQuery } from "@/lib/aspirasi/page-utils";
import { isAspirasiIndexingEnabled } from "@/lib/aspirasi/seo";
import { listPublicAspirations } from "@/lib/aspirasi/service";
import { buildLandingSeo } from "@/lib/seo/landing";

export const dynamic = "force-dynamic";

type SP = { kategori?: string | string[]; status?: string | string[]; page?: string | string[] };

const TITLE = "Aspirasi Warga: Kondisi Desa dan Tanggapan Desa";
const DESC = "Laporan warga tentang kondisi desa (sampah, jalan, air bersih, pelayanan) yang ditinjau lebih dulu, tanpa menampilkan identitas pelapor, dan dapat ditanggapi pemerintah desa secara terbuka.";

export async function generateMetadata({ searchParams }: { searchParams: Promise<SP> }): Promise<Metadata> {
  const sp = await searchParams;
  const filtered = Boolean(single(sp.kategori) || single(sp.status) || pageFromQuery(sp.page) > 1);
  const seo = buildLandingSeo("/aspirasi", TITLE, DESC);
  return {
    title: TITLE,
    description: DESC,
    alternates: { canonical: seo.canonical },
    // Indeks hanya setelah pemilik menyalakan ASPIRASI_INDEXING=on, dan hanya tampilan tanpa saringan.
    robots: isAspirasiIndexingEnabled() && !filtered ? { index: true, follow: true } : { index: false, follow: true },
  };
}

const RULES = [
  { icon: EyeOff, title: "Identitas Anda tidak ditampilkan", text: "Nama dan kontak hanya dilihat tim peninjau untuk memberi kabar kepada Anda." },
  { icon: ShieldCheck, title: "Ditinjau sebelum tayang", text: "Laporan yang memuat data pribadi, tuduhan tanpa dasar, atau spam tidak ditayangkan." },
  { icon: MessageSquareReply, title: "Desa dapat menanggapi", text: "Pemerintah desa yang sudah terverifikasi dapat menjawab, memberi kabar progres, atau menyanggah secara terbuka." },
];

export default async function AspirasiHubPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const kategori = single(sp.kategori);
  const status = single(sp.status);
  const page = pageFromQuery(sp.page);
  const category = kategori && isAspirationCategory(kategori) ? kategori : undefined;
  const progress = status && (PROGRESS_STATUSES as readonly string[]).includes(status) ? status : undefined;

  const [list, totalPublished, totalResolved] = await Promise.all([
    listPublicAspirations(prisma, { category, progress, page, pageSize: 12 }),
    prisma.aspiration.count({ where: { status: "PUBLISHED" } }),
    prisma.aspiration.count({ where: { status: "PUBLISHED", progress: "RESOLVED" } }),
  ]);
  const totalPages = Math.max(1, Math.ceil(list.total / list.pageSize));
  const params = { kategori: category, status: progress };
  const chip = (active: boolean) =>
    `inline-flex min-h-11 items-center rounded-full border px-4 text-base transition ${focusRing} ${active ? "border-[#0f766e] bg-[#0f766e] font-semibold text-white" : "border-gray-300 bg-white text-gray-900 hover:border-teal-600"}`;

  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-4xl px-4 pb-16 pt-24 sm:px-6 lg:px-8">
        <header>
          <p className="text-sm font-medium text-teal-800">Aspirasi Warga</p>
          <h1 className="mt-1 text-balance text-3xl font-semibold text-gray-900 sm:text-4xl">Suara warga tentang kondisi desanya</h1>
          <p className="mt-3 max-w-2xl text-lg leading-relaxed text-gray-700">
            Warga melaporkan keadaan desa, pemerintah desa menanggapi secara terbuka. Semua orang bisa melihat apa yang dilaporkan dan bagaimana tindak lanjutnya.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link href="/aspirasi/kirim" className={btnPrimary}>
              Sampaikan aspirasi
            </Link>
            <Link href="/aspirasi/cek" className={btnOutline}>
              <Search className="h-5 w-5" aria-hidden="true" />
              Cek status laporan saya
            </Link>
          </div>
        </header>

        <ul className="mt-10 grid gap-4 sm:grid-cols-3" aria-label="Cara kerja">
          {RULES.map(({ icon: Icon, title, text }) => (
            <li key={title} className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <Icon className="h-6 w-6 text-teal-800" aria-hidden="true" />
              <h2 className="mt-2 text-base font-semibold text-gray-900">{title}</h2>
              <p className="mt-1 text-base leading-relaxed text-gray-700">{text}</p>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm leading-relaxed text-gray-700">
          Untuk keadaan darurat hubungi 112 atau pihak berwenang. Untuk pengaduan resmi kepada pemerintah, gunakan juga{" "}
          <a href="https://lapor.go.id" target="_blank" rel="noopener noreferrer" className="text-teal-800 underline underline-offset-2">
            LAPOR! (lapor.go.id)
          </a>
          . Klandesa adalah platform perantara, bukan lembaga pengaduan resmi.
        </p>

        <section className="mt-10" aria-labelledby="cari-desa">
          <h2 id="cari-desa" className="sr-only">
            Cari desa
          </h2>
          <AreaSearch />
        </section>

        <section className="mt-12" aria-labelledby="terbaru">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="terbaru" className="text-2xl font-semibold text-gray-900">
              Aspirasi terbaru
            </h2>
            {totalPublished > 0 ? (
              <p className="text-sm text-gray-700">
                {totalPublished} laporan tayang{totalResolved > 0 ? ` · ${totalResolved} selesai` : ""}
              </p>
            ) : null}
          </div>

          <nav aria-label="Saring kategori" className="mt-4">
            <ul className="flex flex-wrap gap-2">
              <li>
                <Link href={withQuery("/aspirasi", { status: progress })} className={chip(!category)} aria-current={!category ? "true" : undefined}>
                  Semua kategori
                </Link>
              </li>
              {ASPIRATION_CATEGORIES.map((c) => (
                <li key={c.value}>
                  <Link href={withQuery("/aspirasi", { kategori: c.value, status: progress })} className={chip(category === c.value)} aria-current={category === c.value ? "true" : undefined}>
                    {c.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <nav aria-label="Saring status tanggapan" className="mt-3">
            <ul className="flex flex-wrap gap-2">
              <li>
                <Link href={withQuery("/aspirasi", { kategori: category })} className={chip(!progress)} aria-current={!progress ? "true" : undefined}>
                  Semua status
                </Link>
              </li>
              {PROGRESS_STATUSES.map((s) => (
                <li key={s}>
                  <Link href={withQuery("/aspirasi", { kategori: category, status: s })} className={chip(progress === s)} aria-current={progress === s ? "true" : undefined}>
                    {PROGRESS_LABELS[s]}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {list.items.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-gray-300 p-8 text-center">
              <BadgeCheck className="mx-auto h-10 w-10 text-teal-800" aria-hidden="true" />
              <p className="mt-3 text-lg font-semibold text-gray-900">{category || progress ? "Belum ada laporan yang cocok dengan saringan ini." : "Belum ada laporan yang tayang."}</p>
              <p className="mt-1 text-base text-gray-700">{category || progress ? "Coba ubah saringan, atau sampaikan aspirasi baru." : "Jadilah yang pertama menyampaikan kondisi desa Anda."}</p>
              <div className="mt-4 flex flex-col justify-center gap-3 sm:flex-row">
                {category || progress ? (
                  <Link href="/aspirasi" className={btnOutline}>
                    Hapus saringan
                  </Link>
                ) : null}
                <Link href="/aspirasi/kirim" className={btnPrimary}>
                  Sampaikan aspirasi
                </Link>
              </div>
            </div>
          ) : (
            <ul className="mt-6 space-y-4">
              {list.items.map((a) => (
                <AspirationCard key={a.code} a={a} />
              ))}
            </ul>
          )}
          <Pagination basePath="/aspirasi" params={params} page={Math.min(page, totalPages)} totalPages={totalPages} label="Paginasi aspirasi" />
        </section>

        <p className="mt-12 rounded-2xl bg-teal-50 p-4 text-base leading-relaxed text-teal-950">
          Anda perangkat desa? Desa yang terdaftar di Klandesa dapat mengelola halaman aspirasi wilayahnya dan menanggapi laporan warga.{" "}
          <Link href="/solusi/desa" className="font-medium underline underline-offset-2">
            Pelajari untuk desa
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
