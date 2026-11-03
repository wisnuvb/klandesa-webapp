import Link from "next/link";
import { ArrowRight, CircleHelp } from "lucide-react";
import { GUIDE_CATALOG } from "@/lib/guides";

/** Daftar panduan per halaman untuk /bantuan. Tiap kartu menuju halamannya; panduan dibuka dari tombol "Panduan" di sana. */
export function GuideCatalog() {
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {GUIDE_CATALOG.map(({ guide, href, summary }) => (
        <li key={guide.id}>
          <Link href={href} className="flex h-full gap-3 rounded-lg border p-4 transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
            <CircleHelp className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span className="min-w-0 flex-1">
              <span className="flex items-center justify-between gap-2 font-medium">{guide.title}<ArrowRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" /></span>
              <span className="mt-1 block text-sm text-muted-foreground">{summary}</span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
