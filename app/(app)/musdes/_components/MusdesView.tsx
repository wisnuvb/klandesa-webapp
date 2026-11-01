"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarDays, ChevronRight, Loader2, Plus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchSelect } from "@/components/ui/search-select";
import { Pill, SELECT_CLASS, fmtDate } from "@/components/app/perencanaan/shared";
import { useApiGet } from "@/hooks/useApiGet";
import { KIND_KEYS, KINDS, STATUS } from "@/lib/musdes/catalog";
import { MeetingFormDialog } from "./MeetingFormDialog";
import type { ListResponse } from "./types";

const PAGE_SIZE = 20;
const TONE: Record<string, string> = { PLANNED: "info", HELD: "soon", FINAL: "done", CANCELLED: "neutral" };

export function MusdesView() {
  const router = useRouter();
  const [kind, setKind] = useState("");
  const [status, setStatus] = useState("");
  const [year, setYear] = useState("");
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);

  const qs = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
  if (kind) qs.set("kind", kind);
  if (status) qs.set("status", status);
  if (year) qs.set("year", year);
  const list = useApiGet<ListResponse>(`/api/musdes?${qs}`);
  const d = list.data;
  const pages = d ? Math.max(1, Math.ceil(d.total / d.pageSize)) : 1;
  const thisYear = new Date().getFullYear();

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <h1 className="flex items-center gap-2 text-2xl font-semibold">
            <Users aria-hidden="true" className="size-6" />
            Musyawarah Desa
          </h1>
          <p className="max-w-prose text-muted-foreground">
            Jadwalkan Musyawarah Desa dan Musrenbangdes, catat daftar hadir beserta unsur pesertanya, keputusan, dan berita acara. Berita acara yang sudah final menjadi dasar RKP Desa, penetapan penerima BLT Desa, dan keputusan strategis lain.
          </p>
        </div>
        {d?.can.create ? (
          <Button type="button" size="lg" className="min-h-11" onClick={() => setCreating(true)}>
            <Plus aria-hidden="true" />
            Jadwalkan musyawarah
          </Button>
        ) : null}
      </header>

      <section aria-label="Penyaring" className="grid gap-3 sm:grid-cols-3">
        <div>
          <label htmlFor="md-f-kind" className="sr-only">
            Jenis musyawarah
          </label>
          <SearchSelect id="md-f-kind" className={SELECT_CLASS} value={kind} onChange={(e) => { setKind(e.target.value); setPage(1); }}>
            <option value="">Semua jenis</option>
            {KIND_KEYS.map((k) => (
              <option key={k} value={k}>
                {KINDS[k].label}
              </option>
            ))}
          </SearchSelect>
        </div>
        <div>
          <label htmlFor="md-f-status" className="sr-only">
            Status
          </label>
          <SearchSelect id="md-f-status" className={SELECT_CLASS} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="">Semua status</option>
            {Object.entries(STATUS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </SearchSelect>
        </div>
        <div>
          <label htmlFor="md-f-year" className="sr-only">
            Tahun
          </label>
          <SearchSelect id="md-f-year" className={SELECT_CLASS} value={year} onChange={(e) => { setYear(e.target.value); setPage(1); }}>
            <option value="">Semua tahun</option>
            {[thisYear + 1, thisYear, thisYear - 1, thisYear - 2].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </SearchSelect>
        </div>
      </section>

      {list.loading ? (
        <p role="status" className="flex items-center gap-2 text-muted-foreground">
          <Loader2 aria-hidden="true" className="size-4 animate-spin" />
          Memuat daftar musyawarah…
        </p>
      ) : list.error ? (
        <div role="alert" className="rounded-md border border-destructive p-4 text-destructive">
          {list.error}{" "}
          <Button type="button" variant="outline" className="ml-2 min-h-11" onClick={list.reload}>
            Coba lagi
          </Button>
        </div>
      ) : d && d.meetings.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <CalendarDays aria-hidden="true" className="mx-auto mb-3 size-8 text-muted-foreground" />
          <p className="font-medium">Belum ada musyawarah{kind || status || year ? " yang cocok dengan penyaring" : ""}.</p>
          <p className="mx-auto mt-1 max-w-prose text-sm text-muted-foreground">Mulai dari menjadwalkan musyawarah. Setelah terlaksana, tandai kehadiran peserta, catat keputusan, lalu finalkan berita acara.</p>
          {d.can.create ? (
            <Button type="button" className="mt-4 min-h-11" onClick={() => setCreating(true)}>
              <Plus aria-hidden="true" />
              Jadwalkan musyawarah
            </Button>
          ) : null}
        </div>
      ) : d ? (
        <ul className="divide-y rounded-lg border">
          {d.meetings.map((m) => (
            <li key={m.id}>
              <Link href={`/musdes/${m.id}`} className="flex min-h-16 items-center justify-between gap-4 px-4 py-3 hover:bg-muted focus-visible:bg-muted focus-visible:outline-none">
                <div className="min-w-0 space-y-1">
                  <p className="truncate font-medium">{m.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {m.kindLabel} · {fmtDate(m.heldOn ?? m.scheduledOn)}
                    {m.startTime && m.status === "PLANNED" ? ` pukul ${m.startTime}` : ""}
                    {m.planYear ? ` · rencana ${m.planYear}` : ""}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {m.attendeeCount} peserta · {m.decisionCount} keputusan
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Pill tone={TONE[m.status]}>{m.statusLabel}</Pill>
                  <ChevronRight aria-hidden="true" className="size-4 text-muted-foreground" />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}

      {d && pages > 1 ? (
        <nav aria-label="Halaman" className="flex items-center justify-between">
          <Button type="button" variant="outline" className="min-h-11" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Sebelumnya
          </Button>
          <span className="text-sm text-muted-foreground">
            Halaman {page} dari {pages}
          </span>
          <Button type="button" variant="outline" className="min-h-11" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
            Berikutnya
          </Button>
        </nav>
      ) : null}

      {creating ? <MeetingFormDialog meeting={null} onClose={() => setCreating(false)} onSaved={(id) => router.push(`/musdes/${id}`)} /> : null}
    </div>
  );
}
