"use client";

import { useState } from "react";
import Link from "next/link";
import { Printer, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchSelect } from "@/components/ui/search-select";
import { FormErrorSummary } from "@/components/app/FormErrorSummary";
import { SELECT_CLASS, fmtDate } from "@/components/app/perencanaan/shared";
import { useFormSubmit } from "@/hooks/useFormSubmit";
import { localToday } from "@/lib/form-input";
import type { TabProps } from "./types";

export function PublicationTab({ data, year, reload, apbdesId }: TabProps & { apbdesId: string }) {
  const [channel, setChannel] = useState("BALIHO");
  const [date, setDate] = useState(() => localToday());
  const [location, setLocation] = useState("");
  const [note, setNote] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const form = useFormSubmit();
  const printHref = `/dana-desa/publikasi?year=${year}${apbdesId ? `&apbdes=${apbdesId}` : ""}`;

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const r = await form.submit("/api/dana-desa/publikasi", "POST", { year, channel, publishedOn: date, location, note });
    if (r) {
      setLocation("");
      setNote("");
      reload();
    }
  }
  async function del(id: number) {
    setErr(null);
    const res = await fetch(`/api/dana-desa/publikasi?id=${id}`, { method: "DELETE" }).catch(() => null);
    if (res?.ok) return reload();
    setErr("Gagal menghapus. Coba lagi.");
  }

  return (
    <>
      <section aria-labelledby="dd-pb-h" className="space-y-3">
        <h2 id="dd-pb-h" className="text-lg font-semibold">
          Publikasi fokus penggunaan Dana Desa
        </h2>
        <p className="text-sm text-muted-foreground">
          Pemerintah Desa wajib mempublikasikan fokus penggunaan Dana Desa sejak APB Desa ditetapkan, memuat paling sedikit nama kegiatan, lokasi, dan besaran anggaran, lewat sistem informasi Desa atau media di ruang publik (Permendesa 16/2025 Pasal 10). Yang tidak mempublikasikan kehilangan wewenang mengalokasikan dana operasional pada tahun berikutnya (Pasal 11).
        </p>
        <Button asChild variant="outline" className="min-h-11">
          <Link href={printHref} target="_blank">
            <Printer aria-hidden="true" />
            Buka daftar untuk papan atau baliho
          </Link>
        </Button>
      </section>

      <section aria-labelledby="dd-pb2-h" className="space-y-3">
        <h2 id="dd-pb2-h" className="text-lg font-semibold">
          Bukti publikasi
        </h2>
        {err ? (
          <p role="alert" className="text-sm text-destructive">
            {err}
          </p>
        ) : null}
        {data.publications.length ? (
          <ul className="divide-y rounded-lg border">
            {data.publications.map((p) => (
              <li key={p.id} className="flex items-start justify-between gap-2 p-3 text-sm">
                <div>
                  <p className="font-medium">
                    {p.channelLabel} · {fmtDate(p.publishedOn)}
                  </p>
                  {p.location ? <p className="break-words text-muted-foreground [overflow-wrap:anywhere]">{p.location}</p> : null}
                  {p.note ? <p className="text-muted-foreground">{p.note}</p> : null}
                </div>
                {data.can.delete ? (
                  <Button type="button" variant="ghost" size="icon" className="size-11 shrink-0" aria-label={`Hapus bukti publikasi ${p.channelLabel} ${fmtDate(p.publishedOn)}`} onClick={() => del(p.id)}>
                    <Trash2 aria-hidden="true" />
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">Belum ada bukti publikasi tercatat untuk tahun {year}.</p>
        )}

        {data.can.create ? (
          <form onSubmit={add} className="space-y-3 rounded-lg border p-4" noValidate>
            <FormErrorSummary innerRef={form.summaryRef} errors={form.errors} general={form.general} labels={{ channel: "Kanal", publishedOn: "Tanggal", location: "Lokasi atau tautan", note: "Catatan" }} />
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="pb-ch">Kanal publikasi *</Label>
                <SearchSelect id="pb-ch" className={SELECT_CLASS} value={channel} onChange={(e) => setChannel(e.target.value)}>
                  {Object.entries(data.terms.channels).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </SearchSelect>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pb-date">Tanggal publikasi *</Label>
                <Input id="pb-date" type="date" className="h-11" value={date} onChange={(e) => setDate(e.target.value)} aria-invalid={Boolean(form.errors.publishedOn)} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="pb-loc">Lokasi papan atau tautan</Label>
                <Input id="pb-loc" className="h-11" maxLength={300} value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Mis. depan balai desa, atau alamat website" />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="pb-note">Catatan</Label>
                <Input id="pb-note" className="h-11" maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} />
              </div>
            </div>
            <Button type="submit" className="min-h-11" disabled={form.busy}>
              {form.busy ? "Menyimpan…" : "Catat bukti publikasi"}
            </Button>
          </form>
        ) : null}
      </section>
    </>
  );
}
