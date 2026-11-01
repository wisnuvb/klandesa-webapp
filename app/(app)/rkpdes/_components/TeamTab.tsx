"use client";

import { useState } from "react";
import { Loader2, Trash2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchSelect } from "@/components/ui/search-select";
import { FormErrorSummary } from "@/components/app/FormErrorSummary";
import { ResidentPicker, SELECT_CLASS, WarningList, type PickedResident } from "@/components/app/perencanaan/shared";
import { useFormSubmit } from "@/hooks/useFormSubmit";
import type { DetailResponse } from "./types";

export function TeamTab({ data, editable, reload }: { data: DetailResponse; editable: boolean; reload: () => void }) {
  const d = data.document;
  const [name, setName] = useState("");
  const [role, setRole] = useState("ANGGOTA");
  const [position, setPosition] = useState("");
  const [gender, setGender] = useState("");
  const [residentId, setResidentId] = useState<number | null>(null);
  const { busy, errors, general, summaryRef, submit } = useFormSubmit();
  const [delError, setDelError] = useState<string | null>(null);
  const url = `/api/perencanaan/rkpdes/${d.id}/tim`;

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
  async function remove(id: number) {
    setDelError(null);
    const res = await fetch(`${url}/${id}`, { method: "DELETE" }).catch(() => null);
    if (res?.ok) return reload();
    const j = await res?.json().catch(() => null);
    setDelError(typeof j?.error === "string" ? j.error : "Gagal menghapus.");
  }

  return (
    <>
      <p className="text-sm text-muted-foreground">
        Tim penyusun RKP Desa terdiri dari {data.terms.teamLimits.min}–{data.terms.teamLimits.max} orang dan mengikutsertakan perempuan: Kepala Desa sebagai pembina, Sekretaris Desa sebagai ketua, ketua lembaga pemberdayaan masyarakat sebagai sekretaris (Permendagri 114/2014 Pasal 33).
      </p>
      <WarningList title="Komposisi tim belum sesuai" items={d.teamWarnings} />
      {delError ? <p role="alert" className="text-sm text-destructive">{delError}</p> : null}
      {d.team.length ? (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <caption className="sr-only">Anggota tim penyusun RKP Desa</caption>
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
              {d.team.map((t) => (
                <tr key={t.id}>
                  <td className="px-3 py-2">{t.name}</td>
                  <td className="px-3 py-2">{t.roleLabel}</td>
                  <td className="px-3 py-2 text-muted-foreground">{t.position ?? "-"}</td>
                  <td className="px-3 py-2">{t.gender ?? "-"}</td>
                  {editable ? (
                    <td className="px-3 py-1 text-right">
                      <Button type="button" variant="ghost" size="icon" className="size-11" aria-label={`Hapus ${t.name} dari tim`} onClick={() => remove(t.id)}>
                        <Trash2 aria-hidden="true" />
                      </Button>
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
              <Label htmlFor="tm-name">Nama anggota *</Label>
              <Input id="tm-name" className="h-11" maxLength={150} value={name} onChange={(e) => { setName(e.target.value); setResidentId(null); }} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tm-role">Peran dalam tim *</Label>
              <SearchSelect id="tm-role" className={SELECT_CLASS} value={role} onChange={(e) => setRole(e.target.value)}>
                {Object.entries(data.terms.teamRoles).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </SearchSelect>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tm-pos">Jabatan di desa/lembaga</Label>
              <Input id="tm-pos" className="h-11" maxLength={100} value={position} onChange={(e) => setPosition(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tm-gender">Jenis kelamin</Label>
              <SearchSelect id="tm-gender" className={SELECT_CLASS} value={gender} onChange={(e) => setGender(e.target.value)}>
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
