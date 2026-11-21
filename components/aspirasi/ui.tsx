import Link from "next/link";
import { CheckCircle2, Clock, Hammer, MapPin, MessageCircle, Scale } from "lucide-react";
import { PROGRESS_LABELS, categoryLabel, type AspirationProgress } from "@/lib/aspirasi/catalog";
import type { PublicAspiration } from "@/lib/aspirasi/service";
import { aspirationPath, areaPath } from "@/lib/aspirasi/slug";
import { excerpt, formatDayWib, withQuery } from "@/lib/aspirasi/page-utils";
import { pageItems } from "@/lib/blog/pagination";

export const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700";
export const btnPrimary = `inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#0f766e] px-5 text-base font-semibold text-white transition hover:bg-[#115e59] ${focusRing}`;
export const btnOutline = `inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-gray-400 bg-white px-5 text-base font-medium text-gray-900 transition hover:bg-gray-50 ${focusRing}`;

const PROGRESS_STYLE: Record<AspirationProgress, { cls: string; Icon: typeof Clock }> = {
  NEW: { cls: "bg-gray-100 text-gray-900 border-gray-300", Icon: Clock },
  RESPONDED: { cls: "bg-blue-50 text-blue-950 border-blue-300", Icon: MessageCircle },
  IN_PROGRESS: { cls: "bg-amber-50 text-amber-950 border-amber-400", Icon: Hammer },
  RESOLVED: { cls: "bg-emerald-50 text-emerald-950 border-emerald-400", Icon: CheckCircle2 },
  DISPUTED: { cls: "bg-purple-50 text-purple-950 border-purple-300", Icon: Scale },
};

/** Lencana status: ikon + teks (warna bukan satu-satunya penanda). */
export function ProgressBadge({ progress }: { progress: AspirationProgress }) {
  const { cls, Icon } = PROGRESS_STYLE[progress] ?? PROGRESS_STYLE.NEW;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium ${cls}`}>
      <Icon className="h-4 w-4" aria-hidden="true" />
      {PROGRESS_LABELS[progress] ?? progress}
    </span>
  );
}

export function CategoryChip({ category }: { category: string }) {
  return <span className="inline-flex rounded-full bg-teal-50 px-3 py-1 text-sm font-medium text-teal-900">{categoryLabel(category)}</span>;
}

/** Kartu ringkas satu aspirasi untuk daftar (hub dan halaman desa). */
export function AspirationCard({ a, showArea = true }: { a: PublicAspiration; showArea?: boolean }) {
  return (
    <li>
      <Link href={aspirationPath(a)} className={`block rounded-2xl border border-gray-200 bg-white p-4 transition hover:border-teal-600 hover:shadow-sm sm:p-5 ${focusRing}`}>
        <div className="flex flex-wrap items-center gap-2">
          <CategoryChip category={a.category} />
          <ProgressBadge progress={a.progress} />
        </div>
        <h3 className="mt-3 text-lg font-semibold leading-snug text-gray-900">{a.title}</h3>
        <p className="mt-1 text-base leading-relaxed text-gray-700">{excerpt(a.body, 160)}</p>
        <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-700">
          {showArea ? (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-4 w-4" aria-hidden="true" />
              {a.area.name}, {a.area.regency}
            </span>
          ) : null}
          <time dateTime={a.publishedAt?.toISOString()}>{formatDayWib(a.publishedAt)}</time>
          {a.replies.length > 0 ? <span>{a.replies.length} tanggapan desa</span> : null}
        </p>
      </Link>
    </li>
  );
}

export function AreaLink({ slug, children }: { slug: string; children: React.ReactNode }) {
  return (
    <Link href={areaPath(slug)} className={`font-medium text-teal-800 underline underline-offset-2 hover:text-teal-950 ${focusRing}`}>
      {children}
    </Link>
  );
}

/** Paginasi yang mempertahankan filter (query string). */
export function Pagination({ basePath, params, page, totalPages, label }: { basePath: string; params: Record<string, string | undefined>; page: number; totalPages: number; label: string }) {
  if (totalPages <= 1) return null;
  const pill = `inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl px-3 text-base ${focusRing}`;
  const link = `${pill} border border-gray-300 text-gray-900 hover:border-teal-600 hover:text-teal-800`;
  const href = (p: number) => withQuery(basePath, { ...params, page: p });
  return (
    <nav aria-label={label} className="mt-8">
      <ul className="flex flex-wrap items-center justify-center gap-2">
        <li>
          {page > 1 ? (
            <Link href={href(page - 1)} rel="prev" className={link}>
              <span aria-hidden="true">←&nbsp;</span>Sebelumnya
            </Link>
          ) : (
            <span aria-disabled="true" className={`${pill} cursor-not-allowed text-gray-500`}>
              <span aria-hidden="true">←&nbsp;</span>Sebelumnya
            </span>
          )}
        </li>
        {pageItems(page, totalPages).map((it, i) =>
          it === "ellipsis" ? (
            <li key={`e${i}`} aria-hidden="true" className="px-1 text-gray-600">
              …
            </li>
          ) : (
            <li key={it}>
              {it === page ? (
                <span aria-current="page" className={`${pill} bg-[#0f766e] font-semibold text-white`}>
                  {it}
                </span>
              ) : (
                <Link href={href(it)} className={link} aria-label={`Halaman ${it}`}>
                  {it}
                </Link>
              )}
            </li>
          ),
        )}
        <li>
          {page < totalPages ? (
            <Link href={href(page + 1)} rel="next" className={link}>
              Berikutnya<span aria-hidden="true">&nbsp;→</span>
            </Link>
          ) : (
            <span aria-disabled="true" className={`${pill} cursor-not-allowed text-gray-500`}>
              Berikutnya<span aria-hidden="true">&nbsp;→</span>
            </span>
          )}
        </li>
      </ul>
    </nav>
  );
}
