"use client";

import { useState } from "react";
import { AlertTriangle, Landmark, Loader2, Pencil, Plus, Trash2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FormErrorSummary } from "@/components/app/FormErrorSummary";
import { useApiGet } from "@/hooks/useApiGet";
import { useFormSubmit } from "@/hooks/useFormSubmit";
import { INSTITUTION_TYPE_LABEL, ROLE_LABEL, type InstitutionType, type MemberRole } from "@/lib/tata-kelola/catalog";
import type { InstitutionView, MemberView } from "@/lib/tata-kelola/institutions";
import { InstitutionFormDialog } from "./InstitutionFormDialog";
import { MemberFormDialog } from "./MemberFormDialog";

interface ListResponse {
  institutions: InstitutionView[];
  can: { create: boolean; update: boolean; delete: boolean };
}

const fmt = (d: string | null) => (d ? new Date(`${d}T00:00:00Z`).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }) : null);

type Target = { kind: "inst"; item: InstitutionView | null } | { kind: "member"; inst: InstitutionView; item: MemberView | null } | { kind: "del-inst"; item: InstitutionView } | { kind: "del-member"; inst: InstitutionView; item: MemberView };

export function LembagaView() {
  const list = useApiGet<ListResponse>("/api/tata-kelola/lembaga");
  const [target, setTarget] = useState<Target | null>(null);
  const d = list.data;
  const done = () => { setTarget(null); list.reload(); };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <h1 className="flex items-center gap-2 text-2xl font-semibold">
            <Landmark aria-hidden="true" className="size-6" />
            Lembaga Desa
          </h1>
          <p className="max-w-prose text-muted-foreground">Catat BPD, LPM/LKD, Karang Taruna, dan lembaga desa lain beserta SK pengukuhan, masa jabatan, dan susunan pengurusnya.</p>
        </div>
        {d?.can.create ? (
          <Button type="button" size="lg" className="min-h-11" onClick={() => setTarget({ kind: "inst", item: null })}>
            <Plus aria-hidden="true" />
            Tambah lembaga
          </Button>
        ) : null}
      </header>

      {list.loading ? (
        <p role="status" className="flex items-center gap-2 p-6 text-muted-foreground">
          <Loader2 aria-hidden="true" className="size-5 animate-spin" />
          Memuat lembaga…
        </p>
      ) : null}
      {list.error ? (
        <div role="alert" className="flex flex-col items-start gap-3 rounded-lg border border-destructive bg-destructive/10 p-4 text-destructive">
          <p>{list.error}</p>
          <Button type="button" variant="outline" className="min-h-11" onClick={list.reload}>Coba lagi</Button>
        </div>
      ) : null}

      {d && d.institutions.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="font-medium">Belum ada lembaga yang dicatat.</p>
          <p className="mt-1 text-sm text-muted-foreground">Mulailah dari BPD, lalu LPM/LKD dan Karang Taruna.</p>
        </div>
      ) : null}

      {d?.institutions.map((inst) => (
        <section key={inst.id} aria-labelledby={`lm-${inst.id}`} className="space-y-3 rounded-lg border bg-card p-4 text-card-foreground">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <p className="text-sm text-muted-foreground">{INSTITUTION_TYPE_LABEL[inst.type as InstitutionType] ?? inst.type}</p>
              <h2 id={`lm-${inst.id}`} className="break-words text-lg font-semibold">{inst.name}</h2>
              <p className="text-sm">
                {inst.decreeNumber ? `SK ${inst.decreeNumber}${inst.decreeDate ? `, ${fmt(inst.decreeDate)}` : ""}. ` : ""}
                {inst.periodStart || inst.periodEnd ? `Masa jabatan ${fmt(inst.periodStart) ?? "…"} s.d. ${fmt(inst.periodEnd) ?? "…"}.` : ""}
              </p>
              {inst.periodEnded ? (
                <p className="flex items-center gap-1.5 text-sm font-medium text-destructive">
                  <AlertTriangle aria-hidden="true" className="size-4" />
                  Masa jabatan sudah berakhir. Perbarui bila pengurus baru sudah dikukuhkan.
                </p>
              ) : null}
              {inst.description ? <p className="text-sm text-muted-foreground">{inst.description}</p> : null}
            </div>
            <div className="flex flex-wrap gap-2">
              {d.can.create ? (
                <Button type="button" variant="outline" className="min-h-11" onClick={() => setTarget({ kind: "member", inst, item: null })} aria-label={`Tambah anggota ${inst.name}`}>
                  <UserPlus aria-hidden="true" />
                  Tambah anggota
                </Button>
              ) : null}
              {d.can.update ? (
                <Button type="button" variant="outline" className="min-h-11" onClick={() => setTarget({ kind: "inst", item: inst })} aria-label={`Ubah ${inst.name}`}>
                  <Pencil aria-hidden="true" />
                  Ubah
                </Button>
              ) : null}
              {d.can.delete ? (
                <Button type="button" variant="outline" className="min-h-11" onClick={() => setTarget({ kind: "del-inst", item: inst })} aria-label={`Hapus ${inst.name}`}>
                  <Trash2 aria-hidden="true" />
                  Hapus
                </Button>
              ) : null}
            </div>
          </div>

          {inst.members.length === 0 ? (
            <p className="text-sm text-muted-foreground">Belum ada anggota.</p>
          ) : (
            <ul className="divide-y rounded-md border">
              {inst.members.map((m) => (
                <li key={m.id} className={`flex flex-wrap items-center justify-between gap-2 p-3 ${m.active ? "" : "text-muted-foreground"}`}>
                  <div className="min-w-0">
                    <p className="break-words font-medium">{m.name}</p>
                    <p className="text-sm">
                      {ROLE_LABEL[m.role as MemberRole] ?? m.role}
                      {m.division ? `, ${m.division}` : ""}
                      {!m.active ? ` · berakhir ${fmt(m.endsAt)}` : m.startsAt ? ` · sejak ${fmt(m.startsAt)}` : ""}
                    </p>
                  </div>
                  {d.can.update ? (
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" className="min-h-11" onClick={() => setTarget({ kind: "member", inst, item: m })} aria-label={`Ubah ${m.name}`}>
                        <Pencil aria-hidden="true" />
                        Ubah
                      </Button>
                      {d.can.delete ? (
                        <Button type="button" variant="outline" className="min-h-11" onClick={() => setTarget({ kind: "del-member", inst, item: m })} aria-label={`Hapus ${m.name} dari ${inst.name}`}>
                          <Trash2 aria-hidden="true" />
                          <span className="sr-only">Hapus</span>
                        </Button>
                      ) : null}
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}

      {target?.kind === "inst" ? <InstitutionFormDialog item={target.item} onClose={() => setTarget(null)} onSaved={done} /> : null}
      {target?.kind === "member" ? <MemberFormDialog institutionId={target.inst.id} institutionName={target.inst.name} member={target.item} onClose={() => setTarget(null)} onSaved={done} /> : null}
      {target?.kind === "del-inst" ? (
        <ConfirmDelete
          title="Hapus lembaga?"
          text={`${target.item.name} beserta ${target.item.members.length} anggotanya akan dihapus dari catatan.`}
          url={`/api/tata-kelola/lembaga/${target.item.id}`}
          onClose={() => setTarget(null)}
          onDone={done}
        />
      ) : null}
      {target?.kind === "del-member" ? (
        <ConfirmDelete
          title="Hapus anggota?"
          text={`${target.item.name} dihapus dari ${target.inst.name}. Bila hanya sudah tidak menjabat, gunakan "Ubah" dan isi tanggal berakhir agar tetap tercatat sebagai riwayat.`}
          url={`/api/tata-kelola/lembaga/${target.inst.id}/anggota/${target.item.id}`}
          onClose={() => setTarget(null)}
          onDone={done}
        />
      ) : null}
    </div>
  );
}

function ConfirmDelete({ title, text, url, onClose, onDone }: { title: string; text: string; url: string; onClose: () => void; onDone: () => void }) {
  const { busy, general, summaryRef, submit } = useFormSubmit();
  return (
    <Dialog open onOpenChange={(o) => (!o && !busy ? onClose() : undefined)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{text}</DialogDescription>
        </DialogHeader>
        <FormErrorSummary innerRef={summaryRef} errors={{}} general={general} labels={{}} />
        <DialogFooter className="gap-2 sm:gap-2">
          <Button type="button" variant="outline" className="min-h-11" disabled={busy} onClick={onClose}>Batal</Button>
          <Button type="button" variant="destructive" className="min-h-11" disabled={busy} onClick={async () => { if (await submit(url, "DELETE", undefined, "Gagal menghapus. Coba lagi.")) onDone(); }}>
            {busy ? <Loader2 aria-hidden="true" className="animate-spin" /> : null}
            Hapus
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
