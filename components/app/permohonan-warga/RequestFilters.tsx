"use client";

import { Download, RotateCcw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { QueueView } from "@/lib/mail/request-queue";
import { CHANNEL_LABEL } from "./shared";

export type FilterState = {
  search: string;
  status: "all" | "PENDING" | "SELESAI" | "DITOLAK";
  queue: "" | QueueView;
  mailType: string;
  channel: string;
  rt: string;
  from: string;
  to: string;
  sort: "newest" | "oldest";
};

export const EMPTY_FILTERS: FilterState = { search: "", status: "all", queue: "", mailType: "all", channel: "all", rt: "all", from: "", to: "", sort: "newest" };

export function filtersToParams(f: FilterState): URLSearchParams {
  const p = new URLSearchParams();
  if (f.search.trim()) p.set("search", f.search.trim());
  if (f.status !== "all") p.set("status", f.status);
  if (f.queue) p.set("queue", f.queue);
  if (f.mailType !== "all") p.set("mailType", f.mailType);
  if (f.channel !== "all") p.set("channel", f.channel);
  if (f.rt !== "all") p.set("rt", f.rt);
  if (f.from) p.set("from", f.from);
  if (f.to) p.set("to", f.to);
  if (f.sort !== "newest") p.set("sort", f.sort);
  return p;
}

export function isFiltered(f: FilterState): boolean {
  return JSON.stringify(f) !== JSON.stringify(EMPTY_FILTERS);
}

export function RequestFilters({
  value,
  onChange,
  jenis,
  onExport,
  extra,
}: {
  value: FilterState;
  onChange: (patch: Partial<FilterState>) => void;
  jenis: string[];
  onExport: () => void;
  /** Tombol tambahan di kanan (mis. Proses Cerdas). */
  extra?: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              aria-label="Cari permohonan"
              placeholder="Cari nama, NIK, nomor permohonan, atau jenis surat…"
              className="bg-input-background pl-10"
              value={value.search}
              onChange={(e) => onChange({ search: e.target.value })}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {extra}
            <Button variant="outline" className="gap-2" onClick={onExport}>
              <Download className="h-4 w-4" aria-hidden /> Export
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-7">
          <Select value={value.status} onValueChange={(v) => onChange({ status: v as FilterState["status"], queue: "" })}>
            <SelectTrigger aria-label="Status"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua status</SelectItem>
              <SelectItem value="PENDING">Menunggu</SelectItem>
              <SelectItem value="SELESAI">Selesai</SelectItem>
              <SelectItem value="DITOLAK">Ditolak</SelectItem>
            </SelectContent>
          </Select>

          <Select value={value.mailType} onValueChange={(v) => onChange({ mailType: v })}>
            <SelectTrigger aria-label="Jenis surat"><SelectValue placeholder="Jenis surat" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua jenis surat</SelectItem>
              {jenis.map((j) => <SelectItem key={j} value={j}>{j}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={value.channel} onValueChange={(v) => onChange({ channel: v })}>
            <SelectTrigger aria-label="Saluran"><SelectValue placeholder="Saluran" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua saluran</SelectItem>
              {Object.entries(CHANNEL_LABEL).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={value.rt} onValueChange={(v) => onChange({ rt: v })}>
            <SelectTrigger aria-label="Tahap RT"><SelectValue placeholder="Tahap RT" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua tahap RT</SelectItem>
              <SelectItem value="none">Tanpa tahap RT</SelectItem>
              <SelectItem value="pending">Menunggu RT</SelectItem>
              <SelectItem value="approved">Disetujui RT</SelectItem>
              <SelectItem value="rejected">Ditolak RT</SelectItem>
            </SelectContent>
          </Select>

          <Input type="date" aria-label="Diajukan dari tanggal" value={value.from} max={value.to || undefined} onChange={(e) => onChange({ from: e.target.value })} />
          <Input type="date" aria-label="Diajukan sampai tanggal" value={value.to} min={value.from || undefined} onChange={(e) => onChange({ to: e.target.value })} />

          <div className="flex gap-2">
            <Select value={value.sort} onValueChange={(v) => onChange({ sort: v as FilterState["sort"] })}>
              <SelectTrigger aria-label="Urutan"><SelectValue placeholder="Urutan" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Terbaru dulu</SelectItem>
                <SelectItem value="oldest">Terlama dulu</SelectItem>
              </SelectContent>
            </Select>
            {isFiltered(value) ? (
              <Button variant="ghost" size="icon" aria-label="Atur ulang semua filter" title="Atur ulang filter" onClick={() => onChange({ ...EMPTY_FILTERS })}>
                <RotateCcw className="h-4 w-4" aria-hidden />
              </Button>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
