"use client";

import { Button } from "@/components/ui/button";

export function Pager({ page, total, pageSize, onPage }: { page: number; total: number; pageSize: number; onPage: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  return (
    <nav aria-label="Halaman daftar" className="flex items-center justify-center gap-3">
      <Button variant="outline" className="min-h-11" disabled={page <= 1} onClick={() => onPage(page - 1)}>
        Sebelumnya
      </Button>
      <span className="text-sm tabular-nums">
        Halaman {page} dari {pages}
      </span>
      <Button variant="outline" className="min-h-11" disabled={page >= pages} onClick={() => onPage(page + 1)}>
        Berikutnya
      </Button>
    </nav>
  );
}
