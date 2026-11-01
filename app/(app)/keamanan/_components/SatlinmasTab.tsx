"use client";

import { useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDelete } from "@/components/app/ConfirmDelete";
import { Pill } from "@/components/app/perencanaan/shared";
import { ErrorBox, FormDialog, Loading, opt, type Field } from "@/components/app/incident/common";
import { LEGAL_NOTES } from "@/lib/keamanan/catalog";
import type { MemberView } from "@/lib/keamanan/service";
import { useApiGet } from "@/hooks/useApiGet";
import { ActionError, Empty, Field as TextField, Findings, FormShell, Pick, ResidentField, fmtDay, s, useAction, where, type ResidentHit } from "./shared";
import type { EquipmentResp, MembersResp } from "./types";

export function SatlinmasTab({ onChanged }: { onChanged: () => void }) {
  const members = useApiGet<MembersResp>("/api/keamanan/anggota");
  const equipment = useApiGet<EquipmentResp>("/api/keamanan/perlengkapan");
  const reloadAll = () => {
    members.reload();
    equipment.reload();
    onChanged();
  };
  const act = useAction(reloadAll);
  const [form, setForm] = useState<{ member: MemberView | null } | null>(null);
  const [ending, setEnding] = useState<MemberView | null>(null);
  const [eqForm, setEqForm] = useState<{ id: number | null } | null>(null);
  const m = members.data;
  const eq = equipment.data;

  return (
    <div className="min-w-0 space-y-8">
      <section aria-labelledby="sl-mem" className="min-w-0 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 id="sl-mem" className="text-lg font-semibold">
              Anggota Satlinmas
            </h2>
            <p className="max-w-3xl text-sm text-muted-foreground">Satuan Pelindungan Masyarakat dibentuk dan anggotanya diangkat dengan keputusan Kepala Desa, lalu dikukuhkan bupati/wali kota (Permendagri 26/2020 Pasal 12, 16, 17). Masa keanggotaan sampai usia 60 tahun, dapat diperpanjang sampai 65 tahun (Pasal 25).</p>
          </div>
          {m?.can.create ? (
            <Button type="button" className="min-h-11" onClick={() => setForm({ member: null })}>
              <Plus aria-hidden="true" />
              Tambah anggota
            </Button>
          ) : null}
        </div>
        {members.loading && !m ? <Loading text="Memuat anggota…" /> : null}
        {members.error ? <ErrorBox message={members.error} /> : null}
        <ActionError message={act.error} />
        {m ? (
          <>
            <p className="text-sm">
              {m.counts.active} anggota aktif · {m.counts.ended} berakhir
              {!m.detail ? " · nomor telepon disembunyikan (butuh izin baca rinci)" : ""}
            </p>
            {m.squads.some((q) => q.findings.length) ? <Findings items={m.squads.flatMap((q) => q.findings)} label="Temuan regu Satlinmas" /> : null}
            {!m.rows.length ? <Empty>Belum ada anggota Satlinmas tercatat. Tambahkan dari data warga, lengkap dengan nomor SK pengangkatan Kepala Desa.</Empty> : null}
            {m.rows.length ? (
              <ul className="grid gap-3 lg:grid-cols-2">
                {m.rows.map((r) => (
                  <li key={r.id} className={`min-w-0 space-y-2 rounded-lg border p-4 ${r.status === "ENDED" ? "bg-muted/30" : ""}`}>
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="break-words font-semibold">{r.name}</p>
                        <p className="break-words text-sm text-muted-foreground">
                          {r.roleLabel}
                          {r.squadKindLabel || r.squadName ? ` · ${[r.squadName, r.squadKindLabel].filter(Boolean).join(", ")}` : ""}
                        </p>
                      </div>
                      <Pill tone={r.status === "ACTIVE" ? "done" : "neutral"}>{r.status === "ACTIVE" ? "Aktif" : "Berakhir"}</Pill>
                    </div>
                    <dl className="grid gap-x-4 gap-y-1 text-sm sm:grid-cols-2">
                      <Row k="Alamat (RT/RW)" v={where(r) || "-"} />
                      <Row k="Usia" v={r.age === null ? "-" : `${r.age} tahun`} />
                      <Row k="SK pengangkatan" v={r.decreeNumber ? `${r.decreeNumber}${r.decreeDate ? ` (${fmtDay(r.decreeDate)})` : ""}` : "Belum diisi"} />
                      <Row k="Pengukuhan bupati" v={r.inauguratedOn ? fmtDay(r.inauguratedOn) : "Belum tercatat"} />
                      {r.cardNumber ? <Row k="Kartu anggota" v={r.cardNumber} /> : null}
                      {r.extensionDecree ? <Row k="Perpanjangan usia" v={r.extensionDecree} /> : null}
                      {m.detail && r.phone ? <Row k="Telepon" v={r.phone} /> : null}
                      {r.status === "ENDED" ? <Row k="Berakhir" v={`${fmtDay(r.endedOn)} · ${r.endReasonLabel ?? ""}${r.endDecree ? ` · ${r.endDecree}` : ""}`} /> : null}
                    </dl>
                    <Findings items={r.findings} label={`Temuan ${r.name}`} />
                    <div className="flex flex-wrap gap-2">
                      {m.can.update ? (
                        <Button type="button" variant="outline" className="min-h-11" onClick={() => setForm({ member: r })}>
                          <Pencil aria-hidden="true" />
                          Ubah
                        </Button>
                      ) : null}
                      {m.can.update && r.status === "ACTIVE" ? (
                        <Button type="button" variant="outline" className="min-h-11" onClick={() => setEnding(r)}>
                          Akhiri keanggotaan
                        </Button>
                      ) : null}
                      {m.can.update && r.status === "ENDED" ? (
                        <Button type="button" variant="outline" className="min-h-11" disabled={act.busy !== null} onClick={() => act.run(`re${r.id}`, `/api/keamanan/anggota/${r.id}/aktifkan`, "POST", {})}>
                          Aktifkan kembali
                        </Button>
                      ) : null}
                      {m.can.delete ? <ConfirmDelete label={`Hapus catatan anggota ${r.name}`} title="Hapus catatan anggota?" description="Hanya untuk salah input. Anggota yang berhenti sebaiknya diakhiri agar arsipnya tetap ada." url={`/api/keamanan/anggota/${r.id}`} onDone={reloadAll} /> : null}
                    </div>
                  </li>
                ))}
              </ul>
            ) : null}
          </>
        ) : null}
      </section>

      <section aria-labelledby="sl-eq" className="min-w-0 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 id="sl-eq" className="text-lg font-semibold">
              Perlengkapan
            </h2>
            <p className="max-w-3xl text-sm text-muted-foreground">Seragam, alat komunikasi, penerangan, dan perlengkapan pos. Barang yang sudah ada di inventaris desa dapat ditautkan agar tidak dicatat dua kali.</p>
          </div>
          {eq?.can.create ? (
            <Button type="button" variant="outline" className="min-h-11" onClick={() => setEqForm({ id: null })}>
              <Plus aria-hidden="true" />
              Tambah perlengkapan
            </Button>
          ) : null}
        </div>
        {equipment.error ? <ErrorBox message={equipment.error} /> : null}
        {eq && !eq.rows.length ? <Empty>Belum ada perlengkapan tercatat.</Empty> : null}
        {eq?.rows.length ? (
          <ul className="grid gap-3 lg:grid-cols-2">
            {eq.rows.map((r) => (
              <li key={r.id} className="flex min-w-0 items-start justify-between gap-2 rounded-lg border p-3">
                <div className="min-w-0 space-y-1 text-sm">
                  <p className="flex flex-wrap items-center gap-2 break-words">
                    <span className="font-semibold">{r.name}</span>
                    <Pill tone={r.condition === "BAIK" ? "done" : r.condition === "BELUM_DIPERIKSA" ? "neutral" : "overdue"}>{r.conditionLabel}</Pill>
                  </p>
                  <p className="break-words text-muted-foreground">
                    {r.categoryLabel} · {r.quantity} unit{r.location ? ` · ${r.location}` : ""}
                    {r.custodian ? ` · ${r.custodian}` : ""}
                  </p>
                  {r.inventory ? <p className="break-words text-muted-foreground">Inventaris desa: {r.inventory.label}</p> : null}
                  {r.lastCheckedOn ? <p className="text-muted-foreground">Diperiksa {fmtDay(r.lastCheckedOn)}</p> : null}
                  {r.note ? <p className="break-words">{r.note}</p> : null}
                </div>
                <div className="flex shrink-0 items-center">
                  {eq.can.update ? (
                    <Button type="button" variant="outline" size="icon" className="size-11" aria-label={`Ubah ${r.name}`} onClick={() => setEqForm({ id: r.id })}>
                      <Pencil aria-hidden="true" />
                    </Button>
                  ) : null}
                  {eq.can.delete ? <ConfirmDelete label={`Hapus ${r.name}`} title="Hapus perlengkapan?" description="Catatan perlengkapan ini dihapus (inventaris desa tidak berubah)." url={`/api/keamanan/perlengkapan/${r.id}`} onDone={reloadAll} /> : null}
                </div>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section aria-labelledby="sl-law" className="min-w-0 space-y-1 rounded-lg border bg-muted/30 p-4 text-sm">
        <h2 id="sl-law" className="font-medium">
          Dasar peraturan yang dipakai
        </h2>
        <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
          {LEGAL_NOTES.map((n) => (
            <li key={n} className="break-words">
              {n}
            </li>
          ))}
        </ul>
      </section>

      {form && m ? <MemberDialog member={form.member} roles={m.roles} squadKinds={m.squadKinds} onClose={() => setForm(null)} onDone={() => { setForm(null); reloadAll(); }} /> : null}
      {ending && m ? (
        <FormDialog
          title={`Akhiri keanggotaan: ${ending.name}`}
          description="Pemberhentian ditetapkan dengan keputusan Kepala Desa (Permendagri 26/2020 Pasal 25 ayat 6) dan disampaikan ke bupati/wali kota lewat camat (ayat 7). Baris tetap tersimpan sebagai arsip."
          fields={[
            { key: "endedOn", label: "Tanggal berakhir", type: "date", required: true, half: true },
            { key: "endReason", label: "Sebab berakhir", type: "select", options: opt(m.endReasons), required: true },
            { key: "endDecree", label: "Nomor keputusan pemberhentian", type: "text", max: 100 },
          ]}
          initial={{ endedOn: "", endReason: Object.keys(m.endReasons)[0] ?? "USIA", endDecree: "" }}
          url={`/api/keamanan/anggota/${ending.id}/akhiri`}
          method="POST"
          onClose={() => setEnding(null)}
          onDone={() => { setEnding(null); reloadAll(); }}
        />
      ) : null}
      {eqForm && eq ? <EquipmentDialog id={eqForm.id} data={eq} onClose={() => setEqForm(null)} onDone={() => { setEqForm(null); reloadAll(); }} /> : null}
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{k}</dt>
      <dd className="break-words">{v}</dd>
    </div>
  );
}

function MemberDialog({ member, roles, squadKinds, onClose, onDone }: { member: MemberView | null; roles: Record<string, string>; squadKinds: Record<string, string>; onClose: () => void; onDone: () => void }) {
  const edit = Boolean(member);
  const [person, setPerson] = useState<ResidentHit | null>(null);
  const [v, setV] = useState({
    role: member?.role ?? "ANGGOTA",
    squadKind: member?.squadKind ?? "",
    squadName: s(member?.squadName),
    decreeNumber: s(member?.decreeNumber),
    decreeDate: s(member?.decreeDate),
    inauguratedOn: s(member?.inauguratedOn),
    cardNumber: s(member?.cardNumber),
    joinedOn: s(member?.joinedOn),
    extensionDecree: s(member?.extensionDecree),
    note: s(member?.note),
  });
  const set = (k: keyof typeof v) => (val: string) => setV((x) => ({ ...x, [k]: val }));
  return (
    <FormShell
      title={edit ? `Ubah anggota: ${member!.name}` : "Tambah anggota Satlinmas"}
      description="Anggota dipilih dari data warga (tanpa menyalin NIK). Syarat: warga setempat, usia paling rendah 18 tahun dan/atau sudah menikah (Pasal 15)."
      labels={{ residentId: "Warga", role: "Jabatan", squadKind: "Jenis regu", squadName: "Nama regu", decreeNumber: "Nomor SK", decreeDate: "Tanggal SK", inauguratedOn: "Tanggal pengukuhan", cardNumber: "Nomor kartu", joinedOn: "Bergabung", extensionDecree: "Keputusan perpanjangan", note: "Catatan" }}
      url={edit ? `/api/keamanan/anggota/${member!.id}` : "/api/keamanan/anggota"}
      method={edit ? "PATCH" : "POST"}
      body={() => ({ ...(edit ? {} : { residentId: person?.id ?? "" }), ...v, squadKind: v.squadKind || null })}
      onClose={onClose}
      onDone={() => onDone()}
    >
      {(errors) => (
        <>
          {edit ? null : (
            <>
              <ResidentField id="mb-res" label="Cari warga *" value={person} onChange={setPerson} />
              {errors.residentId ? <p className="text-sm text-destructive">{errors.residentId}</p> : null}
            </>
          )}
          <div className="grid min-w-0 gap-3 sm:grid-cols-2">
            <Pick id="mb-role" label="Jabatan" value={v.role} onChange={set("role")} options={opt(roles)} error={errors.role} />
            <Pick id="mb-sq" label="Jenis regu" value={v.squadKind} onChange={set("squadKind")} options={[["", "Belum/tidak ada"], ...opt(squadKinds)]} error={errors.squadKind} />
          </div>
          <TextField id="mb-sqn" label="Nama regu" value={v.squadName} onChange={set("squadName")} error={errors.squadName} max={100} hint="Mis. Regu 1 Dusun Krajan." />
          <div className="grid min-w-0 gap-3 sm:grid-cols-2">
            <TextField id="mb-dn" label="Nomor SK pengangkatan" value={v.decreeNumber} onChange={set("decreeNumber")} error={errors.decreeNumber} max={100} />
            <TextField id="mb-dd" label="Tanggal SK" type="date" value={v.decreeDate} onChange={set("decreeDate")} error={errors.decreeDate} />
            <TextField id="mb-in" label="Tanggal pengukuhan bupati" type="date" value={v.inauguratedOn} onChange={set("inauguratedOn")} error={errors.inauguratedOn} />
            <TextField id="mb-cn" label="Nomor kartu anggota" value={v.cardNumber} onChange={set("cardNumber")} error={errors.cardNumber} max={60} />
            <TextField id="mb-jo" label="Bergabung sejak" type="date" value={v.joinedOn} onChange={set("joinedOn")} error={errors.joinedOn} />
            <TextField id="mb-ex" label="Keputusan perpanjangan (60 ke 65 tahun)" value={v.extensionDecree} onChange={set("extensionDecree")} error={errors.extensionDecree} max={100} />
          </div>
          <TextField id="mb-note" label="Catatan" type="textarea" rows={2} max={300} value={v.note} onChange={set("note")} error={errors.note} />
        </>
      )}
    </FormShell>
  );
}

function EquipmentDialog({ id, data, onClose, onDone }: { id: number | null; data: EquipmentResp; onClose: () => void; onDone: () => void }) {
  const cur = id ? data.rows.find((r) => r.id === id) : null;
  const fields: Field[] = [
    { key: "category", label: "Jenis perlengkapan", type: "select", options: opt(data.categories), required: true, half: true },
    { key: "condition", label: "Kondisi", type: "select", options: opt(data.conditions), half: true },
    { key: "name", label: "Nama perlengkapan", type: "text", required: true, max: 200 },
    { key: "quantity", label: "Jumlah", type: "number", half: true },
    { key: "inventoryItemId", label: "Barang inventaris desa", type: "select", options: [["", "Tidak ditautkan"], ...data.inventoryOptions.map((o): [string, string] => [String(o.id), o.label])], half: true, hint: "Opsional." },
    { key: "location", label: "Lokasi simpan", type: "text", max: 200, half: true },
    { key: "custodian", label: "Penanggung jawab", type: "text", max: 150, half: true },
    { key: "lastCheckedOn", label: "Terakhir diperiksa", type: "date", half: true },
    { key: "note", label: "Catatan", type: "textarea", max: 300 },
  ];
  return (
    <FormDialog
      title={cur ? `Ubah perlengkapan: ${cur.name}` : "Tambah perlengkapan"}
      fields={fields}
      initial={{ category: cur?.category ?? "SERAGAM", condition: cur?.condition ?? "BELUM_DIPERIKSA", name: cur?.name ?? "", quantity: String(cur?.quantity ?? 1), inventoryItemId: cur?.inventory ? String(cur.inventory.id) : "", location: s(cur?.location), custodian: s(cur?.custodian), lastCheckedOn: s(cur?.lastCheckedOn), note: s(cur?.note) }}
      transform={(b) => ({ ...b, inventoryItemId: b.inventoryItemId || null })}
      url={cur ? `/api/keamanan/perlengkapan/${cur.id}` : "/api/keamanan/perlengkapan"}
      method={cur ? "PATCH" : "POST"}
      onClose={onClose}
      onDone={() => onDone()}
    />
  );
}
