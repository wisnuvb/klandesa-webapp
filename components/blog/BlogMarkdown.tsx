import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Link from "next/link";
import { headingIdsByLine, isInternalHref, slugifyHeading, textOfNode } from "@/lib/blog/markdown";

/**
 * Render isi artikel blog (Markdown → HTML semantik). Dipakai halaman publik dan
 * pratinjau editor admin, jadi tampilan keduanya identik.
 *
 * - `#` diturunkan jadi h2: halaman artikel sudah punya satu h1 (judul).
 * - Heading diberi id (sama dengan `extractHeadings`) untuk daftar isi dan tautan jangkar.
 * - HTML mentah di Markdown tidak dirender (react-markdown mengabaikannya); URL berbahaya disaring.
 * - Warna tautan teal-700 (kontras 5,5:1 di atas putih), bukan teal-600 yang di bawah 4,5:1.
 */

const headingBase = "scroll-mt-24 font-semibold text-gray-900 text-balance";

function buildComponents(content: string): Components {
  const idByLine = headingIdsByLine(content);
  const heading = (Tag: "h2" | "h3" | "h4", className: string) => {
    function BlogHeading({
      children,
      node,
    }: {
      children?: React.ReactNode;
      node?: { position?: { start?: { line?: number } } };
    }) {
      // Murni: id berasal dari nomor baris sumber (cocok dengan daftar isi); fallback ke teks.
      const line = node?.position?.start?.line;
      const id = (line !== undefined ? idByLine.get(line) : undefined) ?? slugifyHeading(textOfNode(children));
      return (
        <Tag id={id} className={`${headingBase} ${className}`}>
          {children}
        </Tag>
      );
    }
    return BlogHeading;
  };

  return {
    h1: heading("h2", "mt-12 mb-4 text-2xl sm:text-3xl leading-tight"),
    h2: heading("h2", "mt-12 mb-4 text-2xl sm:text-3xl leading-tight"),
    h3: heading("h3", "mt-8 mb-3 text-xl sm:text-2xl leading-snug"),
    h4: heading("h4", "mt-6 mb-2 text-lg leading-snug"),
    h5: heading("h4", "mt-6 mb-2 text-lg leading-snug"),
    h6: heading("h4", "mt-6 mb-2 text-lg leading-snug"),
    p: ({ children }) => <p className="my-5">{children}</p>,
    ul: ({ children }) => (
      <ul className="my-5 list-disc space-y-2 pl-6 marker:text-teal-700">{children}</ul>
    ),
    ol: ({ children }) => (
      <ol className="my-5 list-decimal space-y-2 pl-6 marker:font-semibold marker:text-teal-700">
        {children}
      </ol>
    ),
    li: ({ children }) => <li className="pl-1">{children}</li>,
    strong: ({ children }) => <strong className="font-semibold text-gray-900">{children}</strong>,
    em: ({ children }) => <em className="italic">{children}</em>,
    a: ({ href, children }) => {
      const cls =
        "font-medium text-teal-700 underline decoration-teal-700/40 underline-offset-2 hover:decoration-teal-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700";
      if (!href) return <span>{children}</span>;
      if (href.startsWith("#")) {
        return (
          <a href={href} className={cls}>
            {children}
          </a>
        );
      }
      if (isInternalHref(href)) {
        // Tautan ke klandesa.com ditulis relatif agar tetap di domain yang sama dan di-prefetch.
        let to = href;
        if (!href.startsWith("/")) {
          const u = new URL(href);
          to = `${u.pathname}${u.search}${u.hash}`;
        }
        return (
          <Link href={to} className={cls}>
            {children}
          </Link>
        );
      }
      if (/^(mailto|tel):/i.test(href)) {
        return (
          <a href={href} className={cls}>
            {children}
          </a>
        );
      }
      return (
        <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>
          {children}
          <span className="sr-only"> (buka di tab baru)</span>
        </a>
      );
    },
    blockquote: ({ children }) => (
      <blockquote className="my-6 rounded-r-lg border-l-4 border-teal-600 bg-teal-50 px-5 py-3 text-teal-950 [&>p]:my-2">
        {children}
      </blockquote>
    ),
    hr: () => <hr className="my-10 border-gray-200" />,
    code: ({ className, children }) =>
      className?.includes("language-") ? (
        <code className="font-mono text-sm">{children}</code>
      ) : (
        <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[0.9em] text-gray-900">
          {children}
        </code>
      ),
    pre: ({ children }) => (
      <pre className="my-6 overflow-x-auto rounded-xl bg-gray-900 p-4 text-gray-100">{children}</pre>
    ),
    table: ({ children }) => (
      // Tabel lebar bisa digeser; tabIndex agar pengguna keyboard bisa menggulirnya.
      <div
        className="my-6 overflow-x-auto rounded-xl border border-gray-200"
        tabIndex={0}
        role="region"
        aria-label="Tabel (dapat digeser)"
      >
        <table className="w-full min-w-[32rem] border-collapse text-left text-base">{children}</table>
      </div>
    ),
    thead: ({ children }) => <thead className="bg-gray-50">{children}</thead>,
    th: ({ children }) => (
      <th scope="col" className="border-b border-gray-200 px-4 py-2.5 font-semibold text-gray-900">
        {children}
      </th>
    ),
    td: ({ children }) => (
      <td className="border-b border-gray-100 px-4 py-2.5 align-top">{children}</td>
    ),
    img: ({ src, alt }) =>
      typeof src === "string" ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt ?? ""}
          loading="lazy"
          decoding="async"
          className="my-6 h-auto w-full rounded-xl border border-gray-200"
        />
      ) : null,
  };
}

export function BlogMarkdown({ content }: { content: string }) {
  const components = buildComponents(content);
  return (
    <div className="text-[1.0625rem] leading-8 text-gray-700 [&>*:first-child]:mt-0">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
