"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Database, Inbox, LayoutGrid, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useApiGet } from "@/hooks/useApiGet";
import { TEMPLATES } from "@/lib/custom-data/ui-model";
import { BuatTabelDialog } from "./BuatTabelDialog";

interface TableRow {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  linkResident: boolean;
  fieldCount: number;
  recordCount: number;
}
interface ListResponse {
  canEditSchema: boolean;
  limits: { tables: number; fields: number; records: number };
  tables: TableRow[];
}

export function KustomListView() {
  const list = useApiGet<ListResponse>("/api/custom-data/tables");
  const proposals = useApiGet<{ pending: number }>("/api/custom-data/proposals");
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const full = list.data ? list.data.tables.length >= list.data.limits.tables : false;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <h1 className="flex items-center gap-2 text-2xl font-semibold">
            <Database aria-hidden="true" className="size-6" />
            Data Kustom
          </h1>
          <p className="max-w-prose text-muted-foreground">
            Buat tabel sendiri untuk data desa yang belum ada di aplikasi, misalnya penerima bantuan, data lansia, atau inventaris. Setiap tabel otomatis punya formulir isian, unduhan CSV,
            dan (bila Anda izinkan) akses API yang aman.
          </p>
        </div>
        {list.data?.canEditSchema ? (
          <Button type="button" size="lg" className="min-h-11" disabled={full} onClick={() => setCreating(true)}>
            <Plus aria-hidden="true" />
            Buat tabel
          </Button>
        ) : null}
      </header>

      <div className="flex flex-wrap gap-2">
      <Button asChild variant="outline" className="min-h-11">
        <Link href="/data-kustom/galeri">
          <LayoutGrid aria-hidden="true" />
          Galeri aplikasi desa
        </Link>
      </Button>
      <Button asChild variant="outline" className="min-h-11">
        <Link href="/data-kustom/usulan">
          <Inbox aria-hidden="true" />
          Usulan dari aplikasi lain{proposals.data && proposals.data.pending > 0 ? ` (${proposals.data.pending} menunggu)` : ""}
        </Link>
      </Button>
      </div>

      {list.loading ? (
        <p role="status" className="flex items-center gap-2 p-6 text-muted-foreground">
          <Loader2 aria-hidden="true" className="size-5 animate-spin" />
          Memuat tabel…
        </p>
      ) : null}
      {list.error ? (
        <div role="alert" className="flex flex-col items-start gap-3 rounded-lg border border-destructive bg-destructive/10 p-4 text-destructive">
          <p>{list.error}</p>
          <Button type="button" variant="outline" className="min-h-11" onClick={list.reload}>
            Coba lagi
          </Button>
        </div>
      ) : null}
      {full ? <p className="text-sm text-muted-foreground">Sudah ada {list.data!.limits.tables} tabel. Arsipkan yang tidak dipakai untuk membuat yang baru.</p> : null}

      {list.data && list.data.tables.length === 0 ? (
        <section aria-labelledby="kosong-title" className="space-y-3 rounded-lg border border-dashed p-8 text-center">
          <h2 id="kosong-title" className="text-lg font-semibold">
            Belum ada tabel
          </h2>
          <p className="mx-auto max-w-md text-sm text-muted-foreground">
            Contoh yang bisa dibuat: {TEMPLATES.map((t) => t.name.toLowerCase()).join(", ")}. {list.data.canEditSchema ? "Tekan \"Buat tabel\" dan pilih contoh untuk memulai cepat." : "Minta admin atau sekretaris desa untuk membuatnya."}
          </p>
        </section>
      ) : null}

      {list.data && list.data.tables.length > 0 ? (
        <ul className="grid gap-3 md:grid-cols-2">
          {list.data.tables.map((t) => (
            <li key={t.id}>
              <Link href={`/data-kustom/${t.id}`} className="flex min-h-11 flex-col gap-1 rounded-lg border bg-card p-4 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <span className="font-semibold">{t.name}</span>
                {t.description ? <span className="text-sm text-muted-foreground">{t.description}</span> : null}
                <span className="text-sm text-muted-foreground">
                  {t.recordCount.toLocaleString("id-ID")} data · {t.fieldCount} kolom{t.linkResident ? " · terkait warga" : ""}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}

      {creating && list.data ? (
        <BuatTabelDialog
          maxFields={list.data.limits.fields}
          onClose={() => setCreating(false)}
          onCreated={(id) => {
            setCreating(false);
            router.push(`/data-kustom/${id}`);
          }}
        />
      ) : null}
    </div>
  );
}
