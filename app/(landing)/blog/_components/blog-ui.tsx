import Link from "next/link";
import { pageHref, pageItems } from "@/lib/blog/pagination";
import type { PublicBlogPostListItem } from "@/lib/blog/public-posts";

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeZone: "Asia/Jakarta" }).format(value);
}

const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700";

/** Daftar kartu artikel (dipakai indeks blog dan halaman topik). */
export function BlogPostCards({ posts }: { posts: PublicBlogPostListItem[] }) {
  return (
    <ul className="space-y-4">
      {posts.map((p) => {
        const date = p.publishedAt ?? p.createdAt;
        return (
          <li key={p.id.toString()}>
            <Link
              href={`/blog/${p.slug}`}
              className={`block rounded-2xl border border-gray-200 p-4 transition-all hover:border-teal-600 hover:shadow-sm sm:p-6 ${focusRing}`}
            >
              <div className="flex flex-col gap-4 sm:flex-row">
                {p.coverImageUrl ? (
                  // Dekoratif: judul artikel ada tepat di sebelahnya.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.coverImageUrl}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="h-40 w-full rounded-xl border border-gray-200 object-cover sm:h-32 sm:w-56"
                  />
                ) : null}
                <div className="min-w-0">
                  <div className="text-xs text-gray-600">{formatDate(date)}</div>
                  <div className="mt-1 text-lg font-semibold text-gray-900 sm:text-xl">{p.title}</div>
                  {p.excerpt ? (
                    <div className="mt-2 line-clamp-3 text-sm text-gray-600">{p.excerpt}</div>
                  ) : null}
                </div>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

const pillBase = `inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl px-3 text-sm font-medium ${focusRing}`;

/** Navigasi halaman: Sebelumnya/Berikutnya + nomor dengan elipsis. Tidak tampil bila hanya satu halaman. */
export function BlogPagination({
  basePath,
  page,
  totalPages,
  label = "Paginasi blog",
}: {
  basePath: string;
  page: number;
  totalPages: number;
  label?: string;
}) {
  if (totalPages <= 1) return null;
  const items = pageItems(page, totalPages);
  const disabled = `${pillBase} cursor-not-allowed text-gray-500`;
  const link = `${pillBase} border border-gray-300 text-gray-900 hover:border-teal-600 hover:text-teal-800`;

  return (
    <nav aria-label={label} className="mt-10">
      <ul className="flex flex-wrap items-center justify-center gap-2">
        <li>
          {page > 1 ? (
            <Link href={pageHref(basePath, page - 1)} rel="prev" className={link}>
              <span aria-hidden="true">←&nbsp;</span>Sebelumnya
            </Link>
          ) : (
            <span aria-disabled="true" className={disabled}>
              <span aria-hidden="true">←&nbsp;</span>Sebelumnya
            </span>
          )}
        </li>
        {items.map((it, i) =>
          it === "ellipsis" ? (
            <li key={`e${i}`} aria-hidden="true" className="px-1 text-gray-500">
              …
            </li>
          ) : (
            <li key={it}>
              {it === page ? (
                <span aria-current="page" className={`${pillBase} bg-teal-700 text-white`}>
                  <span className="sr-only">Halaman </span>
                  {it}
                </span>
              ) : (
                <Link href={pageHref(basePath, it)} className={link}>
                  <span className="sr-only">Halaman </span>
                  {it}
                </Link>
              )}
            </li>
          ),
        )}
        <li>
          {page < totalPages ? (
            <Link href={pageHref(basePath, page + 1)} rel="next" className={link}>
              Berikutnya<span aria-hidden="true">&nbsp;→</span>
            </Link>
          ) : (
            <span aria-disabled="true" className={disabled}>
              Berikutnya<span aria-hidden="true">&nbsp;→</span>
            </span>
          )}
        </li>
      </ul>
    </nav>
  );
}
