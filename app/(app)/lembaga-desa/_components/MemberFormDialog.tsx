"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError, FormErrorSummary, fieldA11y } from "@/components/app/FormErrorSummary";
import { ResidentPicker } from "@/components/app/ResidentPicker";
import { useFormSubmit } from "@/hooks/useFormSubmit";
import { MEMBER_ROLES, ROLE_LABEL } from "@/lib/tata-kelola/catalog";
import type { MemberView } from "@/lib/tata-kelola/institutions";
import type { ResidentPick } from "@/lib/kependudukan/mutasi-labels";
import { SELECT_CLASS } from "./InstitutionFormDialog";
import { SearchSelect } from "@/components/ui/search-select";

const LABELS: Record<string, string> = { name: "Nama", role: "Jabatan", division: "Bidang", residentId: "Warga", startsAt: "Mulai", endsAt: "Berakhir" };

export function MemberFormDialog({ institutionId, institutionName, member, onClose, onSaved }: { institutionId: number; institutionName: string; member: MemberView | null; onClose: () => void; onSaved: () => void }) {
  const [resident, setResident] = useState<ResidentPick | null>(null);
  const [f, setF] = useState({ name: member?.name ?? "", role: member?.role ?? "ANGGOTA", division: member?.division ?? "", startsAt: member?.startsAt ?? "", endsAt: member?.endsAt ?? "" });
  const { busy, errors, general, summaryRef, submit } = useFormSubmit();
  const set = (p: Partial<typeof f>) => setF((x) => ({ ...x, ...p }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const residentId = resident?.id ?? member?.residentId ?? null;
    const ok = await submit(
      member ? `/api/tata-kelola/lembaga/${institutionId}/anggota/${member.id}` : `/api/tata-kelola/lembaga/${institutionId}/anggota`,
      member ? "PATCH" : "POST",
      { ...f, name: f.name || (resident ? resident.name : ""), residentId },
    );
    if (ok) onSaved();
  }

  return (
    <Dialog open onOpenChange={(o) => (!o && !busy ? onClose() : undefined)}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{member ? "Ubah anggota" : "Tambah anggota"}</DialogTitle>
          <DialogDescription>{institutionName}. Pilih dari data warga, atau ketik nama bila anggota bukan warga terdaftar.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <ResidentPicker value={resident} onChange={(r) => { setResident(r); if (r && !f.name) set({ name: r.name }); }} label="Cari dari data warga (opsional)" />
          <FieldError id="mb-resident" message={errors.residentId} />
          <div className="space-y-1.5">
            <Label htmlFor="mb-name">Nama *</Label>
            <Input {...fieldA11y("mb-name", errors.name)} className="h-11" value={f.name} maxLength={150} onChange={(e) => set({ name: e.target.value })} />
            <FieldError id="mb-name" message={errors.name} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="mb-role">Jabatan *</Label>
              <SearchSelect {...fieldA11y("mb-role", errors.role)} className={SELECT_CLASS} value={f.role} onChange={(e) => set({ role: e.target.value as typeof f.role })}>
                {MEMBER_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABEL[r]}
                  </option>
                ))}
              </SearchSelect>
              <FieldError id="mb-role" message={errors.role} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mb-division">Bidang/seksi</Label>
              <Input {...fieldA11y("mb-division", errors.division)} className="h-11" value={f.division} maxLength={100} onChange={(e) => set({ division: e.target.value })} placeholder="Contoh: Bidang Pemerintahan" />
              <FieldError id="mb-division" message={errors.division} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mb-startsAt">Mulai menjabat</Label>
              <Input {...fieldA11y("mb-startsAt", errors.startsAt)} className="h-11" type="date" value={f.startsAt} onChange={(e) => set({ startsAt: e.target.value })} />
              <FieldError id="mb-startsAt" message={errors.startsAt} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mb-endsAt">Berakhir menjabat</Label>
              <Input {...fieldA11y("mb-endsAt", errors.endsAt)} className="h-11" type="date" value={f.endsAt} onChange={(e) => set({ endsAt: e.target.value })} />
              <p className="text-sm text-muted-foreground">Isi bila sudah tidak menjabat; tetap tampil sebagai riwayat.</p>
              <FieldError id="mb-endsAt" message={errors.endsAt} />
            </div>
          </div>
          <FormErrorSummary innerRef={summaryRef} errors={errors} general={general} labels={LABELS} />
          <DialogFooter className="gap-2 sm:gap-2">
            <Button type="button" variant="outline" className="min-h-11" disabled={busy} onClick={onClose}>Batal</Button>
            <Button type="submit" className="min-h-11" disabled={busy}>
              {busy ? <Loader2 aria-hidden="true" className="animate-spin" /> : null}
              {busy ? "Menyimpan…" : "Simpan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
