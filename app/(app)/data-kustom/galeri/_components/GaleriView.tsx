"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, BadgeCheck, LayoutGrid, Loader2, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useApiGet } from "@/hooks/useApiGet";
import { BagikanDialog } from "./BagikanDialog";
import { TemplateDetailDialog } from "./TemplateDetailDialog";
import { STATUS_LABEL, type GalleryResponse, type TemplateCard } from "./types";

function Summary({ c }: { c: TemplateCard }) {
  const personal = c.summary.tables.reduce((n, t) => n + t.personal + t.sensitive, 0);
  return (
    <p className="text-sm text-muted-foreground">
      {c.summary.tables.length} tabel · {c.summary.tables.reduce((n, t) => n + t.fields, 0)} kolom
      {personal ? ` · ${personal} kolom data pribadi` : ""} · {c.installCount} desa memakai
    </p>
  );
}

export function GaleriView() {
  const router = useRouter();
  const res = useApiGet<GalleryResponse>("/api/custom-data/gallery");
  const [detail, setDetail] = useState<number | null>(null);
  const [sharing, setSharing] = useState(false);
  const [busy, setBusy] = useState<number | null>(null);
  const d = res.data;

  async function withdraw(c: TemplateCard) {
    setBusy(c.id);
    try {
      const r = await fetch(`/api/custom-data/gallery/${c.id}/withdraw`, { method: "POST" });
      const j = await r.json().catch(() => null);
      if (!r.ok) throw new Error(typeof j?.error === "string" ? j.error : "Gagal menarik.");
      toast.success("Templat ditarik dari galeri. Desa yang sudah memasangnya tidak terpengaruh.");
      res.reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menarik.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <Link href="/data-kustom" className="inline-flex min-h-11 items-center gap-1 text-sm text-muted-foreground underline-offset-2 hover:underline">
          <ArrowLeft aria-hidden="true" className="size-4" />
          Kembali ke Data Kustom
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <h1 className="flex items-center gap-2 text-2xl font-semibold">
              <LayoutGrid aria-hidden="true" className="size-6" />
              Galeri Aplikasi Desa
            </h1>
            <p className="max-w-prose text-muted-foreground">
              Aplikasi siap pakai buatan desa lain atau Klandesa: sekumpulan tabel beserta dasbor ringkasnya. Semua sudah ditinjau. Memasang hanya membuat tabel kosong di desa Anda.
            </p>
          </div>
          {d?.canManage ? (
            <Button type="button" size="lg" className="min-h-11" onClick={() => setSharing(true)}>
              <Share2 aria-hidden="true" />
              Bagikan tabel saya
            </Button>
          ) : null}
        </div>
      </header>

      {res.loading ? (
        <p role="status" className="flex items-center gap-2 p-6 text-muted-foreground">
          <Loader2 aria-hidden="true" className="size-5 animate-spin" />
          Memuat galeri…
        </p>
      ) : null}
      {res.error ? (
        <div role="alert" className="flex flex-col items-start gap-3 rounded-lg border border-destructive bg-destructive/10 p-4 text-destructive">
          <p>{res.error}</p>
          <Button type="button" variant="outline" className="min-h-11" onClick={res.reload}>
            Coba lagi
          </Button>
        </div>
      ) : null}

      {d && d.installs.length > 0 ? (
        <section aria-labelledby="terpasang-title" className="space-y-3">
          <h2 id="terpasang-title" className="text-lg font-semibold">
            Aplikasi terpasang
          </h2>
          <ul className="grid gap-3 md:grid-cols-2">
            {d.installs.map((i) => (
              <li key={i.id}>
                <Link href={`/data-kustom/aplikasi/${i.id}`} className="flex min-h-11 flex-col gap-1 rounded-lg border bg-card p-4 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <span className="font-semibold">{i.name}</span>
                  <span className="text-sm text-muted-foreground">Buka dasbor · {i.tables.map((t) => t.name).join(", ")}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {d ? (
        <section aria-labelledby="galeri-title" className="space-y-3">
          <h2 id="galeri-title" className="text-lg font-semibold">
            Tersedia di galeri
          </h2>
          {d.published.length === 0 ? <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">Belum ada aplikasi di galeri. Jadilah yang pertama membagikan.</p> : null}
          <ul className="grid gap-3 md:grid-cols-2">
            {d.published.map((c) => (
              <li key={c.id} className="flex flex-col gap-2 rounded-lg border bg-card p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold">{c.name}</h3>
                  {c.official ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-950 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-50">
                      <BadgeCheck aria-hidden="true" className="size-3.5" />
                      Resmi
                    </span>
                  ) : null}
                </div>
                <p className="text-sm">{c.description}</p>
                <Summary c={c} />
                <p className="text-sm text-muted-foreground">Oleh {c.publisherName}</p>
                <div className="mt-auto">
                  <Button type="button" variant={c.installed ? "outline" : "default"} className="min-h-11" onClick={() => setDetail(c.id)}>
                    {c.installed ? "Lihat (sudah terpasang)" : "Lihat dan pasang"}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {d && d.mine.length > 0 ? (
        <section aria-labelledby="saya-title" className="space-y-3">
          <h2 id="saya-title" className="text-lg font-semibold">
            Yang desa kami bagikan
          </h2>
          <ul className="space-y-3">
            {d.mine.map((c) => {
              const st = STATUS_LABEL[c.status];
              return (
                <li key={c.id} className="space-y-2 rounded-lg border bg-card p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h3 className="font-semibold">
                      {c.name} <span className="text-sm font-normal text-muted-foreground">versi {c.version}</span>
                    </h3>
                    <span className={`rounded-full border px-3 py-1 text-sm font-medium ${st.cls}`}>{st.label}</span>
                  </div>
                  <Summary c={c} />
                  {c.status === "REJECTED" && c.reviewNote ? <p className="text-sm">Alasan ditolak: {c.reviewNote}</p> : null}
                  {(c.status === "PENDING" || c.status === "PUBLISHED") && d.canManage ? (
                    <Button type="button" variant="outline" className="min-h-11" disabled={busy === c.id} onClick={() => void withdraw(c)}>
                      {busy === c.id ? <Loader2 aria-hidden="true" className="animate-spin" /> : null}
                      Tarik dari galeri
                    </Button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {detail != null ? (
        <TemplateDetailDialog
          id={detail}
          canInstall={Boolean(d?.canManage)}
          onClose={() => setDetail(null)}
          onInstalled={(installId) => {
            setDetail(null);
            router.push(`/data-kustom/aplikasi/${installId}`);
          }}
        />
      ) : null}
      {sharing ? (
        <BagikanDialog
          onClose={() => setSharing(false)}
          onDone={() => {
            setSharing(false);
            res.reload();
          }}
        />
      ) : null}
    </div>
  );
}
