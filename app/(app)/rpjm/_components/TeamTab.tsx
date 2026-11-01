"use client";

import { useState } from "react";
import { Loader2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchSelect } from "@/components/ui/search-select";
import { ConfirmDelete } from "@/components/app/ConfirmDelete";
import { FormErrorSummary } from "@/components/app/FormErrorSummary";
import { ResidentPicker, SELECT_CLASS, WarningList, type PickedResident } from "@/components/app/perencanaan/shared";
import { useFormSubmit } from "@/hooks/useFormSubmit";
import type { DetailResponse } from "./types";

export function TeamTab({ data, editable, reload }: { data: DetailResponse; editable: boolean; reload: () => void }) {
  const p = data.plan;
  const [name, setName] = useState("");
  const [role, setRole] = useState("ANGGOTA");
  const [position, setPosition] = useState("");
  const [gender, setGender] = useState("");
  const [residentId, setResidentId] = useState<number | null>(null);
  const { busy, errors, general, summaryRef, submit } = useFormSubmit();
  const url = `/api/perencanaan/rpjm/${p.id}/tim`;

  function pick(r: PickedResident) {
    setResidentId(r.id);
    setName(r.name);
    setGender(r.gender ?? "");
  }
  async function add(e: React.FormEvent) {
    e.preventDefault();
    const r = await submit(url, "POST", { name, role, position, gender: gender || null, residentId });
    if (r) {
      setName("");
      setPosition("");
      setGender("");
      setResidentId(null);
      reload();
    }
  }

  return (
    <>
      <p className="text-sm text-muted-foreground">
        Kepala Desa membentuk tim penyusun RPJM Desa dengan keputusan Kepala Desa: Kepala Desa sebagai pembina, anggota dari perangkat Desa, kader pemberdayaan, dan unsur masyarakat, paling sedikit {data.terms.rules.teamMin} orang dan mengikutsertakan perempuan (Permendagri 114/2014 Pasal 8; Permendesa PDTT 21/2020 Pasal 27). Peringatan di bawah tidak memblokir.
      </p>
      <WarningList title="Komposisi tim perlu diperiksa" items={p.teamWarnings} />
      {p.team.length ? (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <caption className="sr-only">Anggota tim penyusun RPJM Desa</caption>
            <thead className="bg-muted text-left">
              <tr>
                <th scope="col" className="px-3 py-2">Nama</th>
                <th scope="col" className="px-3 py-2">Peran dalam tim</th>
                <th scope="col" className="px-3 py-2">Jabatan</th>
                <th scope="col" className="px-3 py-2">L/P</th>
                {editable ? <th scope="col" className="px-3 py-2"><span className="sr-only">Aksi</span></th> : null}
              </tr>
            </thead>
            <tbody className="divide-y">
              {p.team.map((t) => (
                <tr key={t.id}>
                  <td className="break-words px-3 py-2">{t.name}</td>
                  <td className="px-3 py-2">{t.roleLabel}</td>
                  <td className="break-words px-3 py-2 text-muted-foreground">{t.position ?? "-"}</td>
                  <td className="px-3 py-2">{t.gender ?? "-"}</td>
                  {editable ? (
                    <td className="px-3 py-1 text-right">
                      <ConfirmDelete
                        label={`Hapus ${t.name} dari tim`}
                        title="Keluarkan anggota dari tim?"
                        description={`${t.name} (${t.roleLabel}) akan dikeluarkan dari tim penyusun RPJM Desa. Komposisi tim diperiksa ulang setelahnya.`}
                        url={`${url}/${t.id}`}
                        onDone={reload}
                      />
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">Belum ada anggota tim.</p>
      )}

      {editable ? (
        <form onSubmit={add} className="min-w-0 space-y-3 rounded-lg border p-4" noValidate>
          <FormErrorSummary innerRef={summaryRef} errors={errors} general={general} labels={{ name: "Nama", role: "Peran", gender: "Jenis kelamin", position: "Jabatan" }} />
          <ResidentPicker onPick={pick} disabled={busy} />
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="rt-name">Nama anggota *</Label>
              <Input id="rt-name" className="h-11" maxLength={150} value={name} onChange={(e) => { setName(e.target.value); setResidentId(null); }} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rt-role">Peran dalam tim *</Label>
              <SearchSelect id="rt-role" className={SELECT_CLASS} value={role} onChange={(e) => setRole(e.target.value)}>
                {Object.entries(data.terms.teamRoles).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </SearchSelect>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rt-pos">Jabatan di desa/lembaga</Label>
              <Input id="rt-pos" className="h-11" maxLength={100} value={position} onChange={(e) => setPosition(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rt-gender">Jenis kelamin</Label>
              <SearchSelect id="rt-gender" className={SELECT_CLASS} value={gender} onChange={(e) => setGender(e.target.value)}>
                <option value="">-</option>
                <option value="L">Laki-laki</option>
                <option value="P">Perempuan</option>
              </SearchSelect>
            </div>
          </div>
          <Button type="submit" className="min-h-11" disabled={busy}>
            {busy ? <Loader2 aria-hidden="true" className="animate-spin" /> : <UserPlus aria-hidden="true" />}
            Tambah ke tim
          </Button>
        </form>
      ) : null}
    </>
  );
}
