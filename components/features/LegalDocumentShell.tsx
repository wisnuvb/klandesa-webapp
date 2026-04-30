import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

export type LegalDocSlug =
  | "privacy-policy"
  | "terms-of-service"
  | "cookie-policy";

const RELATED: Record<
  LegalDocSlug,
  { href: string; label: string }[]
> = {
  "privacy-policy": [
    { href: "/terms-of-service", label: "Syarat & Ketentuan Layanan" },
    { href: "/cookie-policy", label: "Kebijakan Cookie" },
  ],
  "terms-of-service": [
    { href: "/privacy-policy", label: "Kebijakan Privasi" },
    { href: "/cookie-policy", label: "Kebijakan Cookie" },
  ],
  "cookie-policy": [
    { href: "/privacy-policy", label: "Kebijakan Privasi" },
    { href: "/terms-of-service", label: "Syarat & Ketentuan Layanan" },
  ],
};

type LegalDocumentShellProps = {
  title: string;
  description: string;
  /** Tanggal untuk atribut `dateTime` (format ISO 8601, mis. 2026-04-30). */
  lastUpdatedIso: string;
  /** Label tanggal yang dibaca manusia (Bahasa Indonesia). */
  lastUpdatedLabel: string;
  currentSlug: LegalDocSlug;
  children: ReactNode;
};

export function LegalDocumentShell({
  title,
  description,
  lastUpdatedIso,
  lastUpdatedLabel,
  currentSlug,
  children,
}: LegalDocumentShellProps) {
  const related = RELATED[currentSlug];

  return (
    <main className="min-h-screen bg-linear-to-b from-slate-50 via-white to-white text-gray-900">
      <div className="relative overflow-hidden border-b border-gray-200/80 bg-white">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.35]"
          aria-hidden
        >
          <div className="absolute -right-24 top-0 h-72 w-72 rounded-full bg-[#0d9488]/15 blur-3xl" />
          <div className="absolute -left-16 bottom-0 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-3xl px-4 pb-12 pt-24 sm:px-6 md:pt-28 lg:px-8">
          <nav
            className="mb-8 flex flex-wrap items-center gap-1 text-sm text-gray-500"
            aria-label="Jejak navigasi"
          >
            <Link
              href="/"
              className="transition-colors hover:text-[#0d9488] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0d9488]"
            >
              Beranda
            </Link>
            <ChevronRight className="h-4 w-4 shrink-0 text-gray-400" aria-hidden />
            <span className="font-medium text-gray-700">{title}</span>
          </nav>
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-[#0d9488]">
            Dokumen hukum
          </p>
          <h1 className="text-balance text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            {title}
          </h1>
          <p className="mt-4 max-w-2xl text-pretty text-base leading-relaxed text-gray-600 sm:text-lg">
            {description}
          </p>
          <p className="mt-6 text-sm text-gray-500">
            Terakhir diperbarui:{" "}
            <time dateTime={lastUpdatedIso}>{lastUpdatedLabel}</time>
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-14 lg:px-8 lg:py-16">
        <article
          className={[
            "legal-doc text-[17px] leading-[1.75] text-gray-700 sm:text-lg",
            "[&_h2]:mt-12 [&_h2]:scroll-mt-28 [&_h2]:text-balance [&_h2]:border-b [&_h2]:border-gray-200 [&_h2]:pb-3 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-gray-900 [&_h2]:first:mt-0",
            "[&_h3]:mt-8 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-gray-900",
            "[&_p+p]:mt-4 [&_ul]:mt-4 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-6 [&_ul]:marker:text-[#0d9488]",
            "[&_ol]:mt-4 [&_ol]:list-decimal [&_ol]:space-y-2 [&_ol]:pl-6 [&_ol]:marker:font-medium [&_ol]:marker:text-[#0d9488]",
            "[&_li]:pl-1 [&_a]:font-medium [&_a]:text-[#0d9488] [&_a]:underline-offset-2 hover:[&_a]:underline",
            "[&_strong]:font-semibold [&_strong]:text-gray-900",
          ].join(" ")}
        >
          {children}
        </article>

        <aside
          className="mt-14 rounded-2xl border border-gray-200 bg-slate-50/80 p-6 sm:p-8"
          aria-labelledby="related-legal-heading"
        >
          <h2
            id="related-legal-heading"
            className="text-base font-semibold text-gray-900"
          >
            Dokumen terkait
          </h2>
          <ul className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            {related.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="inline-flex items-center rounded-lg px-3 py-2 text-sm font-medium text-[#0d9488] underline-offset-2 transition-colors hover:bg-white hover:underline hover:shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0d9488]"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </main>
  );
}
