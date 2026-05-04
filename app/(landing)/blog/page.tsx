import Link from "next/link";
import { prisma } from "@/lib/prisma";

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(value);
}

export default async function BlogIndexPage() {
  const posts = await prisma.blogPost.findMany({
    where: { status: "published" },
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    take: 50,
    select: {
      id: true,
      slug: true,
      title: true,
      excerpt: true,
      coverImageUrl: true,
      publishedAt: true,
      createdAt: true,
    },
  });

  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-4xl px-4 pt-24 pb-12 sm:px-6 lg:px-8">
        <div className="mb-10">
          <h1 className="text-3xl sm:text-4xl font-semibold text-gray-900">Blog</h1>
          <p className="mt-2 text-gray-600">
            Artikel seputar digitalisasi desa, layanan publik, dan produk Klandesa.
          </p>
        </div>

        {posts.length === 0 ? (
          <div className="rounded-xl border border-gray-200 p-6 text-sm text-gray-600">
            Belum ada artikel yang dipublish.
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((p) => {
              const date = p.publishedAt ?? p.createdAt;
              return (
                <Link
                  key={p.id.toString()}
                  href={`/blog/${p.slug}`}
                  className="block rounded-2xl border border-gray-200 p-4 sm:p-6 hover:border-[#0d9488] hover:shadow-sm transition-all"
                >
                  <div className="flex flex-col sm:flex-row gap-4">
                    {p.coverImageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.coverImageUrl}
                        alt=""
                        className="w-full sm:w-56 h-40 sm:h-32 object-cover rounded-xl border border-gray-200"
                      />
                    ) : null}
                    <div className="min-w-0">
                      <div className="text-xs text-gray-500">
                        {formatDate(date)}
                      </div>
                      <div className="mt-1 text-lg sm:text-xl font-semibold text-gray-900">
                        {p.title}
                      </div>
                      {p.excerpt ? (
                        <div className="mt-2 text-sm text-gray-600 line-clamp-3">
                          {p.excerpt}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}

