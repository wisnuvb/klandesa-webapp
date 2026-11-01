"use client";

import { useState } from "react";
import { Loader2, Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchSelect } from "@/components/ui/search-select";
import { ConfirmDelete } from "@/components/app/ConfirmDelete";
import { FormErrorSummary } from "@/components/app/FormErrorSummary";
import { SELECT_CLASS } from "@/components/app/perencanaan/shared";
import { useFormSubmit } from "@/hooks/useFormSubmit";
import type { DetailResp } from "./types";

type Member = DetailResp["team"][number];

export function TeamSection({ d, locked, reload }: { d: DetailResp; locked: boolean; reload: () => void }) {
  const [editing, setEditing] = useState<Member | "new" | null>(null);
  const canEdit = d.can.update && !locked;
  const n = d.team.length;
  return (
    <section aria-labelledby="pg-tpk-h" className="space-y-3 rounded-lg border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 id="pg-tpk-h" className="text-lg font-semibold">
            Tim Pelaksana Kegiatan (TPK)
          </h2>
          <p className="text-sm text-muted-foreground">Minimal 3 orang dan berjumlah gasal: ketua, sekretaris, anggota; unsur perangkat Desa, lembaga kemasyarakatan, dan masyarakat (Peraturan LKPP 12/2019 Pasal 11). Saat ini {n} orang.</p>
        </div>
        {canEdit ? (
          <Button type="button" className="min-h-11" onClick={() => setEditing("new")}>
            <Plus aria-hidden="true" />
            Tambah anggota
          </Button>
        ) : null}
      </div>
      {d.team.length ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[28rem] text-sm">
            <caption className="sr-only">Anggota TPK</caption>
            <thead className="text-left text-muted-foreground">
              <tr>
                <th scope="col" className="py-1 pr-3">Nama</th>
                <th scope="col" className="py-1 pr-3">Peran</th>
                <th scope="col" className="py-1 pr-3">Unsur</th>
                <th scope="col" className="py-1"><span className="sr-only">Aksi</span></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {d.team.map((m) => (
                <tr key={m.id}>
                  <td className="break-words py-2 pr-3">
                    {m.name}
                    {m.position ? <span className="block text-xs text-muted-foreground">{m.position}</span> : null}
                  </td>
                  <td className="py-2 pr-3">{m.roleLabel}</td>
                  <td className="py-2 pr-3">{m.elementLabel}</td>
                  <td className="py-2 text-right">
                    {canEdit ? (
                      <span className="inline-flex">
                        <Button type="button" variant="ghost" size="icon" className="size-11" aria-label={`Ubah ${m.name}`} onClick={() => setEditing(m)}>
                          <Pencil aria-hidden="true" />
                        </Button>
                        {d.can.delete ? <ConfirmDelete label={`Hapus ${m.name} dari TPK`} title={`Hapus ${m.name}?`} description="Anggota dikeluarkan dari TPK. Bila paket sudah di tahap yang mensyaratkan TPK, perubahan yang membuat TPK tidak sah ditolak." url={`/api/pengadaan/anggota/${m.id}`} onDone={reload} /> : null}
                      </span>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">TPK belum dibentuk. Tambahkan anggota, lalu isi nomor Keputusan Kepala Desa penetapan TPK pada rincian paket.</p>
      )}
      {editing ? <MemberDialog packageId={d.id} catalog={d.catalog} member={editing === "new" ? null : editing} onClose={() => setEditing(null)} onDone={() => { setEditing(null); reload(); }} /> : null}
    </section>
  );
}

function MemberDialog({ packageId, catalog, member, onClose, onDone }: { packageId: number; catalog: DetailResp["catalog"]; member: Member | null; onClose: () => void; onDone: () => void }) {
  const [name, setName] = useState(member?.name ?? "");
  const [role, setRole] = useState(member?.role ?? "ANGGOTA");
  const [element, setElement] = useState(member?.element ?? "PERANGKAT");
  const [position, setPosition] = useState(member?.position ?? "");
  const { busy, errors, general, summaryRef, submit } = useFormSubmit();
  async function go(e: React.FormEvent) {
    e.preventDefault();
    const body = { name, role, element, position };
    const r = member ? await submit(`/api/pengadaan/anggota/${member.id}`, "PATCH", body) : await submit(`/api/pengadaan/${packageId}/anggota`, "POST", body);
    if (r) onDone();
  }
  return (
    <Dialog open onOpenChange={(o) => (!o && !busy ? onClose() : undefined)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{member ? "Ubah anggota TPK" : "Tambah anggota TPK"}</DialogTitle>
          <DialogDescription>Hanya boleh ada satu ketua dan satu sekretaris.</DialogDescription>
        </DialogHeader>
        <form onSubmit={go} className="grid min-w-0 gap-4" noValidate>
          <FormErrorSummary innerRef={summaryRef} errors={errors} general={general} labels={{ name: "Nama", role: "Peran", element: "Unsur", position: "Jabatan" }} />
          <div className="space-y-1.5">
            <Label htmlFor="tm-name">Nama *</Label>
            <Input id="tm-name" className="h-11" maxLength={150} value={name} onChange={(e) => setName(e.target.value)} aria-invalid={Boolean(errors.name)} />
          </div>
          <div className="grid min-w-0 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="tm-role">Peran *</Label>
              <SearchSelect id="tm-role" className={SELECT_CLASS} value={role} onChange={(e) => setRole(e.target.value)}>
                {Object.entries(catalog.roles).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </SearchSelect>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tm-el">Unsur *</Label>
              <SearchSelect id="tm-el" className={SELECT_CLASS} value={element} onChange={(e) => setElement(e.target.value)}>
                {Object.entries(catalog.elements).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </SearchSelect>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tm-pos">Jabatan/keterangan</Label>
            <Input id="tm-pos" className="h-11" maxLength={100} value={position} onChange={(e) => setPosition(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" className="min-h-11" onClick={onClose} disabled={busy}>
              Batal
            </Button>
            <Button type="submit" className="min-h-11" disabled={busy}>
              {busy ? <Loader2 aria-hidden="true" className="animate-spin" /> : null}
              Simpan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
