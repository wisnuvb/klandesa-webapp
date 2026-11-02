"use client";

import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { MEMBER_EVENT_LABEL, type FamilyInput, type FamilyIssues } from "@/lib/kependudukan/family";
import type { ExistingHousehold } from "@/lib/kependudukan/family-service";
import { RESIDENCY_STATUS_LABEL } from "@/lib/residents/extra-fields";
import { calculateAge } from "@/utils";

export interface DerivedParents {
  fatherName: string;
  fatherNik: string;
  motherName: string;
  motherNik: string;
}

const maskNik = (nik: string) => (nik.length >= 4 ? `••••${nik.slice(-4)}` : nik);
const fmt = (iso: string) => (/^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Date(`${iso}T00:00:00Z`).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }) : "-");

export function StepPeriksa({ input, issues, existing, parents, acknowledged, onAcknowledge, onFix }: {
  input: FamilyInput;
  issues: FamilyIssues;
  existing: ExistingHousehold | null;
  parents: DerivedParents[];
  acknowledged: boolean;
  onAcknowledge: (v: boolean) => void;
  onFix: (memberIndex: number | null) => void;
}) {
  const { header, members } = input;
  const blocking: Array<{ index: number | null; message: string }> = [
    ...Object.values(issues.header).map((message) => ({ index: null, message })),
    ...issues.general.map((message) => ({ index: null, message })),
    ...issues.members.flatMap((m, index) => Object.values(m).map((message) => ({ index, message }))),
  ];
  const nameOf = (i: number | null) => (i === null ? "Keluarga" : members[i]?.name.trim() || `Anggota ${i + 1}`);

  return (
    <div className="space-y-6">
      {blocking.length ? (
        <div role="alert" className="rounded-md border border-destructive bg-destructive/10 p-4 text-sm text-destructive">
          <p className="flex items-center gap-2 font-medium">
            <AlertTriangle aria-hidden="true" className="size-4" />
            Perbaiki dulu sebelum menyimpan ({blocking.length})
          </p>
          <ul className="mt-2 space-y-1">
            {blocking.map((b, i) => (
              <li key={i} className="flex flex-wrap items-baseline gap-x-2">
                <span>
                  <strong>{nameOf(b.index)}:</strong> {b.message}
                </span>
                <button type="button" className="min-h-11 underline" onClick={() => onFix(b.index)}>
                  Perbaiki
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p role="status" className="flex items-center gap-2 text-sm font-medium text-emerald-800 dark:text-emerald-300">
          <CheckCircle2 aria-hidden="true" className="size-4" />
          Data lengkap dan siap disimpan.
        </p>
      )}

      {issues.warnings.length ? (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-50">
          <p className="font-medium">Mohon dibaca ({issues.warnings.length})</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {issues.warnings.map((w, i) => (
              <li key={i}>
                <strong>{nameOf(w.index)}:</strong> {w.message}
              </li>
            ))}
          </ul>
          {!blocking.length ? (
            <label className="mt-3 flex min-h-11 cursor-pointer items-start gap-3">
              <input type="checkbox" className="mt-1 size-4" checked={acknowledged} onChange={(e) => onAcknowledge(e.target.checked)} />
              <span>Saya sudah memeriksa catatan di atas dan datanya benar sesuai dokumen.</span>
            </label>
          ) : null}
        </div>
      ) : null}

      <section aria-labelledby="ringkas-h" className="space-y-2 rounded-lg border p-4 text-sm">
        <h3 id="ringkas-h" className="text-base font-semibold">
          Keluarga
        </h3>
        <dl className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
          <div><dt className="inline text-muted-foreground">No. KK: </dt><dd className="inline font-mono">{header.kk ? maskNik(header.kk.replace(/\D/g, "")) : "-"}</dd></div>
          <div><dt className="inline text-muted-foreground">RT/RW/Dusun: </dt><dd className="inline">{[header.rt && `RT ${header.rt}`, header.rw && `RW ${header.rw}`, header.hamlet].filter(Boolean).join(" · ") || "-"}</dd></div>
          <div className="sm:col-span-2"><dt className="inline text-muted-foreground">Alamat: </dt><dd className="inline break-words">{header.address || "-"}</dd></div>
          {header.arrival.enabled ? (
            <div className="sm:col-span-2">
              <dt className="inline text-muted-foreground">Datang: </dt>
              <dd className="inline">{fmt(header.arrival.date)}{header.arrival.origin ? ` dari ${header.arrival.origin}` : ""} · {RESIDENCY_STATUS_LABEL[header.arrival.residencyStatus]}</dd>
            </div>
          ) : null}
          {existing ? <div className="sm:col-span-2"><dt className="inline text-muted-foreground">KK sudah ada: </dt><dd className="inline">anggota baru ditambahkan ke {existing.activeMembers} anggota yang ada.</dd></div> : null}
        </dl>
      </section>

      <section aria-labelledby="anggota-h" className="space-y-2">
        <h3 id="anggota-h" className="text-base font-semibold">
          Anggota ({members.length})
        </h3>
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <caption className="sr-only">Ringkasan anggota keluarga yang akan disimpan</caption>
            <thead className="bg-muted/50">
              <tr>
                <th scope="col" className="px-3 py-2">No</th>
                <th scope="col" className="px-3 py-2">Nama</th>
                <th scope="col" className="px-3 py-2">Hubungan</th>
                <th scope="col" className="px-3 py-2">NIK</th>
                <th scope="col" className="px-3 py-2">JK</th>
                <th scope="col" className="px-3 py-2">Lahir</th>
                <th scope="col" className="px-3 py-2">Orang tua</th>
                <th scope="col" className="px-3 py-2">Dicatat</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {members.map((m, i) => {
                const p = parents[i];
                const parentText = [p?.fatherName && `Ayah: ${p.fatherName}`, p?.motherName && `Ibu: ${p.motherName}`].filter(Boolean).join(" · ");
                const born = /^\d{4}-\d{2}-\d{2}$/.test(m.birthDate) ? calculateAge(new Date(`${m.birthDate}T00:00:00Z`)) : null;
                return (
                  <tr key={i}>
                    <td className="px-3 py-2 tabular-nums">{i + 1}</td>
                    <th scope="row" className="px-3 py-2 font-medium">{m.name.trim() || "-"}</th>
                    <td className="px-3 py-2">{m.familyRole || "-"}</td>
                    <td className="px-3 py-2 font-mono">{maskNik(m.nik)}</td>
                    <td className="px-3 py-2">{m.gender === "Laki-laki" ? "L" : m.gender === "Perempuan" ? "P" : "-"}</td>
                    <td className="px-3 py-2">{fmt(m.birthDate)}{born !== null ? ` (${born} th)` : ""}</td>
                    <td className="px-3 py-2 text-muted-foreground">{parentText || "-"}</td>
                    <td className="px-3 py-2">{m.event === "NONE" ? "Data awal" : MEMBER_EVENT_LABEL[m.event]}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
