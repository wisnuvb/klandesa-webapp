"use client";

import { Fragment, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Download, EyeOff, Loader2, Pencil, Plus, Settings2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useApiGet } from "@/hooks/useApiGet";
import { formatCell } from "@/lib/custom-data/ui-model";
import { RecordFormDialog } from "./RecordFormDialog";
import { SchemaEditorDialog } from "./SchemaEditorDialog";
import type { RecordRowView, TableDetailView } from "./types";

interface TableResponse {
  canEditSchema: boolean;
  table: TableDetailView;
}
interface RecordsResponse {
  items: RecordRowView[];
  nextCursor: string | null;
}

const PAGE = 25;

/** Satu halaman baris; menampilkan tombol "muat lebih banyak" yang memuat halaman berikutnya sebagai komponen anak (tanpa state dengan efek). */
function RecordRows({ table, cursor, colSpan, onEdit, onDelete }: { table: TableDetailView; cursor: string | null; colSpan: number; onEdit: (r: RecordRowView) => void; onDelete: (r: RecordRowView) => void }) {
  const q = new URLSearchParams({ limit: String(PAGE) });
  if (cursor) q.set("cursor", cursor);
  const page = useApiGet<RecordsResponse>(`/api/custom-data/tables/${table.id}/records?${q}`);
  const [more, setMore] = useState(false);
  const fields = table.fields.filter((f) => !f.isArchived);

  if (page.loading)
    return (
      <tr>
        <td colSpan={colSpan} className="p-6 text-center text-muted-foreground">
          <span role="status" className="inline-flex items-center gap-2">
            <Loader2 aria-hidden="true" className="size-4 animate-spin" />
            Memuat data…
          </span>
        </td>
      </tr>
    );
  if (page.error)
    return (
      <tr>
        <td colSpan={colSpan} className="p-6 text-center">
          <p role="alert" className="text-destructive">
            {page.error}
          </p>
          <Button type="button" variant="outline" className="mt-2 min-h-11" onClick={page.reload}>
            Coba lagi
          </Button>
        </td>
      </tr>
    );
  if (!page.data) return null;

  return (
    <Fragment>
      {!cursor && page.data.items.length === 0 ? (
        <tr>
          <td colSpan={colSpan} className="p-8 text-center text-sm text-muted-foreground">
            Belum ada data. Tekan &quot;Tambah data&quot; untuk mengisi.
          </td>
        </tr>
      ) : null}
      {page.data.items.map((r) => (
        <tr key={r.id} className="align-top">
          {table.linkResident ? <td className="p-3 font-medium">{r.resident?.name ?? <span className="text-muted-foreground">(warga dihapus)</span>}</td> : null}
          {fields.map((f) => (
            <td key={f.key} className="max-w-xs p-3 [overflow-wrap:anywhere]">
              {formatCell(r.data[f.key], f)}
            </td>
          ))}
          <td className="whitespace-nowrap p-3 text-right">
            <Button type="button" variant="ghost" className="min-h-11" aria-label={`Ubah data ${r.resident?.name ?? `nomor ${r.id}`}`} onClick={() => onEdit(r)}>
              <Pencil aria-hidden="true" />
              Ubah
            </Button>
            <Button type="button" variant="ghost" className="min-h-11 text-destructive" aria-label={`Hapus data ${r.resident?.name ?? `nomor ${r.id}`}`} onClick={() => onDelete(r)}>
              <Trash2 aria-hidden="true" />
              Hapus
            </Button>
          </td>
        </tr>
      ))}
      {page.data.nextCursor ? (
        more ? (
          <RecordRows table={table} cursor={page.data.nextCursor} colSpan={colSpan} onEdit={onEdit} onDelete={onDelete} />
        ) : (
          <tr>
            <td colSpan={colSpan} className="p-3 text-center">
              <Button type="button" variant="outline" className="min-h-11" onClick={() => setMore(true)}>
                Muat lebih banyak
              </Button>
            </td>
          </tr>
        )
      ) : null}
    </Fragment>
  );
}

export function TabelView({ id }: { id: string }) {
  const router = useRouter();
  const meta = useApiGet<TableResponse>(`/api/custom-data/tables/${encodeURIComponent(id)}`);
  const limits = useApiGet<{ limits: { fields: number } }>("/api/custom-data/tables");
  const [version, setVersion] = useState(0);
  const [form, setForm] = useState<{ record: RecordRowView | null } | null>(null);
  const [editingSchema, setEditingSchema] = useState(false);
  const [deleting, setDeleting] = useState<RecordRowView | null>(null);
  const [archiving, setArchiving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const table = meta.data?.table;
  const canEditSchema = meta.data?.canEditSchema ?? false;
  const fields = table?.fields.filter((f) => !f.isArchived) ?? [];
  const colSpan = fields.length + (table?.linkResident ? 1 : 0) + 1;
  const refresh = () => {
    setVersion((v) => v + 1);
    meta.reload();
  };

  async function call(url: string, method: string, ok: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(url, { method });
      const j = await res.json().catch(() => null);
      if (!res.ok) throw new Error(typeof j?.error === "string" ? j.error : "Permintaan gagal. Coba lagi.");
      toast.success(ok);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Permintaan gagal. Coba lagi.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <Link href="/data-kustom" className="inline-flex min-h-11 items-center gap-1 text-sm text-muted-foreground underline-offset-2 hover:underline">
          <ArrowLeft aria-hidden="true" className="size-4" />
          Kembali ke Data Kustom
        </Link>
        {meta.loading ? (
          <p role="status" className="flex items-center gap-2 text-muted-foreground">
            <Loader2 aria-hidden="true" className="size-5 animate-spin" />
            Memuat tabel…
          </p>
        ) : null}
        {meta.error ? (
          <div role="alert" className="flex flex-col items-start gap-3 rounded-lg border border-destructive bg-destructive/10 p-4 text-destructive">
            <p>{meta.error}</p>
            <Button type="button" variant="outline" className="min-h-11" onClick={meta.reload}>
              Coba lagi
            </Button>
          </div>
        ) : null}
        {table ? (
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold">{table.name}</h1>
              {table.description ? <p className="max-w-prose text-muted-foreground">{table.description}</p> : null}
              <p className="text-sm text-muted-foreground">
                {table.recordCount.toLocaleString("id-ID")} data · {fields.length} kolom{table.linkResident ? " · terkait warga" : ""}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="lg" className="min-h-11" onClick={() => setForm({ record: null })}>
                <Plus aria-hidden="true" />
                Tambah data
              </Button>
              <Button asChild variant="outline" className="min-h-11">
                <a href={`/api/custom-data/tables/${table.id}/export`}>
                  <Download aria-hidden="true" />
                  Unduh CSV
                </a>
              </Button>
              {canEditSchema ? (
                <>
                  <Button type="button" variant="outline" className="min-h-11" onClick={() => setEditingSchema(true)}>
                    <Settings2 aria-hidden="true" />
                    Ubah susunan
                  </Button>
                  <Button type="button" variant="outline" className="min-h-11" onClick={() => { setError(null); setArchiving(true); }}>
                    Arsipkan tabel
                  </Button>
                </>
              ) : null}
            </div>
          </div>
        ) : null}
      </header>

      {table ? (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Data tabel {table.name}</caption>
            <thead className="bg-muted/50">
              <tr>
                {table.linkResident ? (
                  <th scope="col" className="p-3 font-medium">
                    Warga
                  </th>
                ) : null}
                {fields.map((f) => (
                  <th key={f.key} scope="col" className="p-3 font-medium">
                    {f.label}
                    {f.piiClass !== "NONE" ? (
                      <span className="ml-1 inline-flex items-center gap-1 text-xs font-normal text-muted-foreground">
                        <EyeOff aria-hidden="true" className="size-3" />
                        pribadi
                      </span>
                    ) : null}
                  </th>
                ))}
                <th scope="col" className="p-3">
                  <span className="sr-only">Tindakan</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              <RecordRows key={version} table={table} cursor={null} colSpan={colSpan} onEdit={(r) => setForm({ record: r })} onDelete={(r) => { setError(null); setDeleting(r); }} />
            </tbody>
          </table>
        </div>
      ) : null}

      {form && table ? <RecordFormDialog key={form.record?.id ?? "baru"} table={table} record={form.record} onClose={() => setForm(null)} onSaved={refresh} /> : null}
      {editingSchema && table ? <SchemaEditorDialog table={table} maxFields={limits.data?.limits.fields ?? 30} onClose={() => setEditingSchema(false)} onApplied={refresh} /> : null}

      <AlertDialog open={deleting != null} onOpenChange={(o) => (!o && !busy ? setDeleting(null) : undefined)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus data ini?</AlertDialogTitle>
            <AlertDialogDescription>Data tidak akan tampil lagi di aplikasi maupun API. Jejak penghapusan tercatat.</AlertDialogDescription>
          </AlertDialogHeader>
          {error ? (
            <p role="alert" className="rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel className="min-h-11" disabled={busy}>
              Batal
            </AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              className="min-h-11"
              disabled={busy}
              onClick={async () => {
                if (deleting && (await call(`/api/custom-data/records/${deleting.id}`, "DELETE", "Data dihapus."))) {
                  setDeleting(null);
                  refresh();
                }
              }}
            >
              {busy ? <Loader2 aria-hidden="true" className="animate-spin" /> : null}
              Ya, hapus
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={archiving} onOpenChange={(o) => (!o && !busy ? setArchiving(false) : undefined)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Arsipkan tabel &quot;{table?.name}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>Tabel hilang dari daftar dan tidak bisa dibaca lewat API. Datanya tetap tersimpan.</AlertDialogDescription>
          </AlertDialogHeader>
          {error ? (
            <p role="alert" className="rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel className="min-h-11" disabled={busy}>
              Batal
            </AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              className="min-h-11"
              disabled={busy}
              onClick={async () => {
                if (table && (await call(`/api/custom-data/tables/${table.id}`, "DELETE", "Tabel diarsipkan."))) router.push("/data-kustom");
              }}
            >
              {busy ? <Loader2 aria-hidden="true" className="animate-spin" /> : null}
              Ya, arsipkan
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
