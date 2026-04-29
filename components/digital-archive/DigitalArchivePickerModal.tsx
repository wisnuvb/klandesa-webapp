"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type ArchiveRow = {
  id: number;
  fileName: string;
  filePath: string;
  fileType: string;
  title: string;
  category: string;
  subCategory: string | null;
};

async function readJsonError(res: Response): Promise<string> {
  try {
    const j = (await res.json()) as { error?: string };
    return j.error || res.statusText;
  } catch {
    return res.statusText;
  }
}

export type DigitalArchivePickerModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (publicFileUrl: string) => void;
  title?: string;
  description?: string;
  /** default: hanya tipe gambar (cocok untuk favikon) */
  imageOnly?: boolean;
};

const PAGE_SIZE = 24;

export function DigitalArchivePickerModal(props: DigitalArchivePickerModalProps) {
  const {
    open,
    onOpenChange,
    onPick,
    title = "Pilih dari arsip digital",
    description = "Cari teks, saring kategori, lalu pilih satu berkas.",
    imageOnly = true,
  } = props;

  const [searchInput, setSearchInput] = useState("");
  const [categoryInput, setCategoryInput] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<ArchiveRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<ArchiveRow | null>(null);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        take: String(PAGE_SIZE),
        skip: String((page - 1) * PAGE_SIZE),
      });
      if (imageOnly) params.set("type", "image");
      if (search.trim()) params.set("search", search.trim());
      if (category.trim()) params.set("category", category.trim());
      const res = await fetch(`/api/digital-archives?${params.toString()}`);
      if (!res.ok) throw new Error(await readJsonError(res));
      const data = (await res.json()) as {
        rows: ArchiveRow[];
        total?: number;
      };
      setRows(Array.isArray(data.rows) ? data.rows : []);
      setTotal(typeof data.total === "number" ? data.total : 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat arsip");
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, search, category, imageOnly]);

  useEffect(() => {
    if (!open) return;
    void load();
  }, [open, load]);

  useEffect(() => {
    if (open) return;
    setSearchInput("");
    setCategoryInput("");
    setSearch("");
    setCategory("");
    setPage(1);
    setSelected(null);
    setError(null);
  }, [open]);

  const applyFilters = () => {
    setSearch(searchInput);
    setCategory(categoryInput);
    setPage(1);
  };

  const handlePick = () => {
    if (!selected?.filePath) return;
    onPick(selected.filePath.trim());
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-3xl flex-col gap-0 p-0">
        <DialogHeader className="px-6 pb-2 pt-6">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 border-b px-6 pb-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <Input
              placeholder="Cari judul atau nama berkas…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") applyFilters();
              }}
              className="min-w-0 flex-1"
            />
            <Input
              placeholder="Kategori (cocok persis)"
              value={categoryInput}
              onChange={(e) => setCategoryInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") applyFilters();
              }}
              className="sm:w-44"
            />
            <Button type="button" variant="secondary" onClick={applyFilters}>
              <Search className="size-4" />
              Cari
            </Button>
          </div>
          {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}
        </div>

        <div className="max-h-[min(50vh,420px)] min-h-[200px] flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <p className="text-sm text-muted-foreground">Memuat…</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">Tidak ada berkas yang cocok.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {rows.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setSelected(r)}
                  className={`overflow-hidden rounded-lg border text-left transition-shadow hover:shadow-md ${
                    selected?.id === r.id
                      ? "border-primary ring-2 ring-primary"
                      : "border-border"
                  }`}
                >
                  <div className="relative aspect-square bg-muted">
                    {/* URL publik dari arsip — hindari next/image domain config */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={r.filePath}
                      alt=""
                      className="absolute inset-0 size-full object-cover"
                    />
                  </div>
                  <div className="p-2 text-xs">
                    <div className="line-clamp-2 font-medium">{r.title || r.fileName}</div>
                    <div className="line-clamp-1 text-muted-foreground">
                      {r.category}
                      {r.subCategory ? ` · ${r.subCategory}` : ""}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t px-6 py-3">
          <div className="text-xs text-muted-foreground">
            {total > 0 ? (
              <>
                Halaman {page} / {totalPages} · {total} berkas
              </>
            ) : null}
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              aria-label="Halaman sebelumnya"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => p + 1)}
              aria-label="Halaman berikutnya"
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>

        <DialogFooter className="border-t px-6 py-4">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button type="button" onClick={handlePick} disabled={!selected}>
            Gunakan berkas ini
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
