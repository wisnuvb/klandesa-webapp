"use client";

import { useState } from "react";
import { HeartHandshake, Pencil, Phone, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDelete } from "@/components/app/ConfirmDelete";
import { ErrorBox, FormDialog, Loading, opt, type Field } from "@/components/app/incident/common";
import { useApiGet } from "@/hooks/useApiGet";
import type { ContactView } from "@/lib/keamanan/service";
import { Empty, fmtDay, s } from "./shared";
import type { ContactsResp } from "./types";

export function ReferralTab({ onChanged }: { onChanged: () => void }) {
  const { data, loading, error, reload } = useApiGet<ContactsResp>("/api/keamanan/kontak");
  const [form, setForm] = useState<{ contact: ContactView | null } | null>(null);
  const done = () => {
    setForm(null);
    reload();
    onChanged();
  };
  return (
    <div className="min-w-0 space-y-6">
      <section aria-labelledby="rj-h" className="min-w-0 space-y-3 rounded-lg border border-sky-600/40 bg-sky-50 p-4 text-sky-950">
        <h2 id="rj-h" className="flex items-center gap-2 text-lg font-semibold">
          <HeartHandshake aria-hidden="true" className="size-5 shrink-0" />
          Kekerasan terhadap perempuan dan anak
        </h2>
        <p className="max-w-3xl text-sm">
          Aplikasi ini <strong>tidak menyimpan kasus</strong> kekerasan terhadap perempuan atau anak, kekerasan dalam rumah tangga, dan kekerasan seksual. Demi keselamatan dan kerahasiaan korban, tugas desa adalah <strong>merujuk</strong>: dengarkan, pastikan korban aman, lalu hubungkan dengan layanan di bawah. Jangan mediasi kasus kekerasan seksual atau kekerasan terhadap anak di tingkat desa.
        </p>
        <ul className="space-y-2" aria-label="Kontak rujukan nasional">
          {(data?.national ?? []).map((n) => (
            <li key={n.name} className="min-w-0 rounded-md border border-sky-600/30 bg-white/70 p-3 text-sm">
              <p className="break-words font-medium">{n.name}</p>
              <a className="inline-flex min-h-11 items-center gap-2 text-lg font-semibold underline underline-offset-4" href={`tel:${n.value.replace(/[^0-9+]/g, "")}`}>
                <Phone aria-hidden="true" className="size-4" />
                {n.value}
              </a>
              <p className="break-words text-sky-900">{n.note}</p>
            </li>
          ))}
        </ul>
        <p className="text-xs">Nomor nasional di atas belum diverifikasi langsung ke layanan: cek ulang sebelum diberikan kepada warga, dan lengkapi kontak UPTD PPA/P2TP2A kabupaten Anda pada direktori di bawah.</p>
      </section>

      <section aria-labelledby="kt-h" className="min-w-0 space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 id="kt-h" className="text-lg font-semibold">
              Direktori kontak desa ini
            </h2>
            <p className="max-w-3xl text-sm text-muted-foreground">Polsek, Bhabinkamtibmas, Koramil, UPTD PPA kabupaten, puskesmas, dan pemadam kebakaran. Disunting oleh desa; isi hanya kontak lembaga, bukan data orang.</p>
          </div>
          {data?.can.create ? (
            <Button type="button" className="min-h-11" onClick={() => setForm({ contact: null })}>
              <Plus aria-hidden="true" />
              Tambah kontak
            </Button>
          ) : null}
        </div>
        {loading && !data ? <Loading text="Memuat kontak…" /> : null}
        {error ? <ErrorBox message={error} /> : null}
        {data && !data.rows.length ? <Empty>Belum ada kontak. Isi UPTD PPA/P2TP2A kabupaten lebih dulu agar perangkat desa tahu ke mana merujuk.</Empty> : null}
        {data?.rows.length ? (
          <ul className="grid gap-3 lg:grid-cols-2">
            {data.rows.map((c) => (
              <li key={c.id} className="flex min-w-0 items-start justify-between gap-2 rounded-lg border p-3">
                <div className="min-w-0 space-y-1 text-sm">
                  <p className="break-words font-semibold">{c.name}</p>
                  <p className="text-muted-foreground">{c.kindLabel}</p>
                  <a className="inline-flex min-h-11 items-center gap-2 font-medium underline underline-offset-4" href={`tel:${c.phone.replace(/[^0-9+]/g, "")}`}>
                    <Phone aria-hidden="true" className="size-4" />
                    {c.phone}
                  </a>
                  {c.address ? <p className="break-words">{c.address}</p> : null}
                  {c.hours ? <p className="text-muted-foreground">Jam layanan: {c.hours}</p> : null}
                  {c.note ? <p className="break-words">{c.note}</p> : null}
                  {c.checkedOn ? <p className="text-xs text-muted-foreground">Terakhir dicek {fmtDay(c.checkedOn)}</p> : null}
                </div>
                <div className="flex shrink-0 items-center">
                  {data.can.update ? (
                    <Button type="button" variant="outline" size="icon" className="size-11" aria-label={`Ubah ${c.name}`} onClick={() => setForm({ contact: c })}>
                      <Pencil aria-hidden="true" />
                    </Button>
                  ) : null}
                  {data.can.delete ? <ConfirmDelete label={`Hapus ${c.name}`} title="Hapus kontak?" description="Kontak ini dihapus dari direktori." url={`/api/keamanan/kontak/${c.id}`} onDone={done} /> : null}
                </div>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      {form && data ? (
        <FormDialog
          title={form.contact ? `Ubah kontak: ${form.contact.name}` : "Tambah kontak"}
          fields={
            [
              { key: "kind", label: "Jenis layanan", type: "select", options: opt(data.kinds), required: true },
              { key: "name", label: "Nama layanan", type: "text", required: true, max: 150 },
              { key: "phone", label: "Nomor telepon", type: "text", required: true, max: 40, inputMode: "numeric", half: true },
              { key: "hours", label: "Jam layanan", type: "text", max: 100, half: true },
              { key: "address", label: "Alamat", type: "text", max: 255 },
              { key: "checkedOn", label: "Terakhir dicek", type: "date", half: true },
              { key: "note", label: "Catatan", type: "textarea", max: 300 },
            ] as Field[]
          }
          initial={{ kind: form.contact?.kind ?? "UPTD_PPA", name: s(form.contact?.name), phone: s(form.contact?.phone), hours: s(form.contact?.hours), address: s(form.contact?.address), checkedOn: s(form.contact?.checkedOn), note: s(form.contact?.note) }}
          url={form.contact ? `/api/keamanan/kontak/${form.contact.id}` : "/api/keamanan/kontak"}
          method={form.contact ? "PATCH" : "POST"}
          onClose={() => setForm(null)}
          onDone={done}
        />
      ) : null}
    </div>
  );
}
