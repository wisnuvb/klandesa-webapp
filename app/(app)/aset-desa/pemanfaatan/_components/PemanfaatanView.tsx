"use client";

import { AlertTriangle, ArrowLeft, Info, Landmark, Loader2, Plus, Search, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useApiGet } from "@/hooks/useApiGet";
import { AgreementDetailDialog } from "./AgreementDetailDialog";
import { AgreementFormDialog } from "./AgreementFormDialog";
import { ParcelDialog } from "./ParcelDialog";
import { dateId, rupiah, sqm, type AgreementDetail, type AgreementRow, type AgreementsResponse, type LandOverview, type LandResponse, type LandRow } from "./types";

type Tab = "peringatan" | "tanah" | "perjanjian";
const TABS: [Tab, string][] = [
  ["peringatan", "Ringkasan dan peringatan"],
  ["tanah", "Tanah"],
  ["perjanjian", "Perjanjian"],
];
const STATUS_FILTERS: [string, string][] = [
  ["", "Semua"],
  ["AKTIF", "Berlaku"],
  ["DRAF", "Draf"],
  ["SELESAI", "Selesai"],
  ["BATAL", "Dibatalkan"],
];

const SEVERITY: Record<string, { label: string; cls: string; Icon: typeof Info }> = {
  bahaya: { label: "Perlu tindakan", cls: "border-destructive bg-destructive/10 text-destructive", Icon: ShieldAlert },
  peringatan: { label: "Perhatian", cls: "border-amber-500 bg-amber-50 text-amber-950", Icon: AlertTriangle },
  info: { label: "Catatan", cls: "border-border bg-muted/40 text-foreground", Icon: Info },
};

export function PemanfaatanView() {
  const [tab, setTab] = useState<Tab>("peringatan");
  const [statusFilter, setStatusFilter] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [parcel, setParcel] = useState<LandRow | null>(null);
  const [form, setForm] = useState<{ draft: AgreementRow | AgreementDetail["agreement"] | null; itemId: number | null } | null>(null);
  const [openId, setOpenId] = useState<number | null>(null);

  const ov = useApiGet<LandOverview>("/api/aset-desa/pemanfaatan/ringkasan");
  const landUrl = tab === "tanah" ? `/api/aset-desa/tanah?page=${page}&pageSize=20${search ? `&search=${encodeURIComponent(search)}` : ""}` : null;
  const agrUrl = tab === "perjanjian" || form ? `/api/aset-desa/pemanfaatan?page=${tab === "perjanjian" ? page : 1}&pageSize=20${statusFilter ? `&status=${statusFilter}` : ""}` : null;
  const land = useApiGet<LandResponse>(landUrl);
  const agr = useApiGet<AgreementsResponse>(agrUrl ?? (openId ? "/api/aset-desa/pemanfaatan?pageSize=1" : null));
  const terms = agr.data?.terms;
  const can = agr.data?.can ?? { create: false, update: false, delete: false, receive: false, revert: false };

  const refresh = () => {
    ov.reload();
    land.reload();
    agr.reload();
  };
  const switchTab = (t: Tab) => {
    setTab(t);
    setPage(1);
  };

  return (
    <div className="min-w-0 space-y-6 pb-24">
      <header className="space-y-2">
        <Button asChild variant="ghost" className="-ml-3 min-h-11">
          <Link href="/aset-desa">
            <ArrowLeft aria-hidden="true" /> Kembali ke Aset Desa
          </Link>
        </Button>
        <h1 className="flex items-center gap-2 text-2xl font-semibold">
          <Landmark aria-hidden="true" className="size-6" />
          Tanah kas desa dan pemanfaatan aset
        </h1>
        <p className="max-w-prose text-muted-foreground">
          Lengkapi data tanah (luas, batas, bukti hak), buat perjanjian sewa atau kerja sama pemanfaatan, tagih dan catat penerimaannya ke Buku Kas Umum sebagai Pendapatan Asli Desa (Permendagri 1/2016).
        </p>
      </header>

      <div role="tablist" aria-label="Bagian halaman" className="flex flex-wrap gap-2">
        {TABS.map(([k, label]) => (
          <Button key={k} role="tab" type="button" aria-selected={tab === k} variant={tab === k ? "default" : "outline"} className="min-h-11" onClick={() => switchTab(k)}>
            {label}
          </Button>
        ))}
      </div>

      {tab === "peringatan" ? <Overview ov={ov} onOpenAgreement={setOpenId} onOpenTab={switchTab} /> : null}

      {tab === "tanah" ? (
        <section aria-label="Daftar tanah" className="min-w-0 space-y-4">
          <form role="search" className="flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); setSearch(searchInput.trim()); setPage(1); }}>
            <div className="min-w-60 flex-1">
              <label htmlFor="tanah-cari" className="sr-only">Cari tanah</label>
              <Input id="tanah-cari" className="h-11" value={searchInput} maxLength={100} onChange={(e) => setSearchInput(e.target.value)} placeholder="Cari nama, kode, atau lokasi" />
            </div>
            <Button type="submit" variant="outline" className="min-h-11">
              <Search aria-hidden="true" /> Cari
            </Button>
          </form>
          <Async state={land} what="data tanah" />
          {land.data && land.data.items.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <p className="font-medium">{search ? "Tidak ada tanah yang cocok." : "Belum ada tanah di buku inventaris."}</p>
              {!search ? (
                <>
                  <p className="mt-1 text-sm text-muted-foreground">Catat tanah kas desa lebih dulu di Buku Inventaris (golongan Tanah kas desa), lalu lengkapi datanya di sini.</p>
                  <Button asChild className="mt-4 min-h-11">
                    <Link href="/aset-desa">Buka buku inventaris</Link>
                  </Button>
                </>
              ) : null}
            </div>
          ) : null}
          <ul className="space-y-3">
            {land.data?.items.map((r) => (
              <li key={r.itemId} className="min-w-0 rounded-lg border p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <h2 className="break-words text-base font-semibold">{r.name}</h2>
                    <p className="text-sm text-muted-foreground">
                      {r.categoryLabel}
                      {r.strategic ? " (aset strategis)" : ""}
                      {r.location ? `. ${r.location}` : ""}
                    </p>
                    {r.parcel ? (
                      <dl className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
                        <Row k="Luas" v={sqm(r.parcel.areaSqm)} />
                        <Row k="Bukti hak" v={`${land.data?.terms.rightKinds[r.parcel.rightKind] ?? r.parcel.rightKind}${r.parcel.rightNumber ? ` no. ${r.parcel.rightNumber}` : ""}`} />
                        <Row k="Pemanfaatan" v={land.data?.terms.usages[r.parcel.usage] ?? r.parcel.usage} />
                        <Row k="Perjanjian berlaku" v={String(r.activeAgreements)} />
                      </dl>
                    ) : (
                      <p className="flex items-center gap-2 text-sm font-medium text-amber-800">
                        <AlertTriangle aria-hidden="true" className="size-4" /> Data tanah belum dilengkapi.
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {land.data?.can.update ? (
                      <Button type="button" variant="outline" className="min-h-11" aria-label={`${r.parcel ? "Ubah" : "Lengkapi"} data tanah ${r.name}`} onClick={() => setParcel(r)}>
                        {r.parcel ? "Ubah data tanah" : "Lengkapi data tanah"}
                      </Button>
                    ) : null}
                    {can.create && r.category !== "TANAH_ULAYAT" ? (
                      <Button type="button" className="min-h-11" aria-label={`Perjanjian baru untuk ${r.name}`} onClick={() => setForm({ draft: null, itemId: r.itemId })}>
                        <Plus aria-hidden="true" /> Perjanjian baru
                      </Button>
                    ) : null}
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <Pager total={land.data?.total ?? 0} pageSize={20} page={page} onPage={setPage} />
        </section>
      ) : null}

      {tab === "perjanjian" ? (
        <section aria-label="Daftar perjanjian" className="min-w-0 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div role="group" aria-label="Penyaring status" className="flex flex-wrap gap-2">
              {STATUS_FILTERS.map(([v, label]) => (
                <Button key={v} type="button" aria-pressed={statusFilter === v} variant={statusFilter === v ? "default" : "outline"} className="min-h-11" onClick={() => { setStatusFilter(v); setPage(1); }}>
                  {label}
                </Button>
              ))}
            </div>
            {can.create ? (
              <Button type="button" className="min-h-11" onClick={() => setForm({ draft: null, itemId: null })}>
                <Plus aria-hidden="true" /> Perjanjian baru
              </Button>
            ) : null}
          </div>
          <Async state={agr} what="perjanjian" />
          {agr.data && agr.data.items.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <p className="font-medium">{statusFilter ? "Tidak ada perjanjian dengan status ini." : "Belum ada perjanjian pemanfaatan."}</p>
              {!statusFilter && can.create ? (
                <>
                  <p className="mt-1 text-sm text-muted-foreground">Mulai dari tanah kas desa yang disewakan: catat pihak penyewa, jangka waktu, dan besaran sewa.</p>
                  <Button type="button" className="mt-4 min-h-11" onClick={() => setForm({ draft: null, itemId: null })}>
                    <Plus aria-hidden="true" /> Buat perjanjian pertama
                  </Button>
                </>
              ) : null}
            </div>
          ) : null}
          <ul className="space-y-3">
            {agr.data?.items.map((a) => (
              <li key={a.id} className="min-w-0 rounded-lg border p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <h2 className="break-words text-base font-semibold">
                      {a.kindLabel}: {a.itemName}
                    </h2>
                    <p className="break-words text-sm">
                      {a.lesseeName}. {dateId(a.startOn)} sampai {dateId(a.endOn)}.
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {rupiah(a.amount)} ({agr.data?.terms.periodUnits[a.periodUnit] ?? a.periodUnit}). Diterima {a.receivedCharges} tagihan ({rupiah(a.receivedTotal)}), menunggu {a.openCharges} ({rupiah(a.openTotal)}).
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className="rounded-full border px-3 py-1 text-sm font-medium">{a.status === "AKTIF" ? "Berlaku" : (agr.data?.terms.status[a.status] ?? a.status)}</span>
                    <Button type="button" variant="outline" className="min-h-11" aria-label={`Buka perjanjian ${a.kindLabel} ${a.itemName} dengan ${a.lesseeName}, ${dateId(a.startOn)} sampai ${dateId(a.endOn)}`} onClick={() => setOpenId(a.id)}>
                      Buka
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <Pager total={agr.data?.total ?? 0} pageSize={20} page={page} onPage={setPage} />
        </section>
      ) : null}

      {parcel && land.data ? <ParcelDialog row={parcel} terms={land.data.terms} onClose={() => setParcel(null)} onSaved={() => { setParcel(null); refresh(); }} /> : null}
      {form && terms ? (
        <AgreementFormDialog
          draft={form.draft as AgreementDetail["agreement"] | null}
          itemId={form.itemId}
          terms={terms}
          onClose={() => setForm(null)}
          onSaved={(id) => {
            setForm(null);
            refresh();
            setOpenId(id);
          }}
        />
      ) : null}
      {openId && terms ? (
        <AgreementDetailDialog
          key={openId}
          id={openId}
          can={can}
          terms={terms}
          onClose={() => setOpenId(null)}
          onChanged={refresh}
          onEdit={(d) => {
            setOpenId(null);
            setForm({ draft: d.agreement, itemId: null });
          }}
        />
      ) : null}
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="min-w-0">
      <dt className="inline text-muted-foreground">{k}: </dt>
      <dd className="inline break-words font-medium">{v}</dd>
    </div>
  );
}

function Async({ state, what }: { state: { loading: boolean; error: string | null; reload: () => void }; what: string }) {
  if (state.loading)
    return (
      <p role="status" className="flex items-center gap-2 p-6 text-muted-foreground">
        <Loader2 aria-hidden="true" className="size-5 animate-spin" /> Memuat {what}…
      </p>
    );
  if (state.error)
    return (
      <div role="alert" className="flex flex-col items-start gap-3 rounded-lg border border-destructive bg-destructive/10 p-4 text-destructive">
        <p>{state.error}</p>
        <Button type="button" variant="outline" className="min-h-11" onClick={state.reload}>
          Coba lagi
        </Button>
      </div>
    );
  return null;
}

function Pager({ total, pageSize, page, onPage }: { total: number; pageSize: number; page: number; onPage: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  return (
    <nav aria-label="Halaman" className="flex items-center justify-between gap-3">
      <Button type="button" variant="outline" className="min-h-11" disabled={page <= 1} onClick={() => onPage(page - 1)}>
        Sebelumnya
      </Button>
      <span className="text-sm text-muted-foreground">
        Halaman {page} dari {pages}
      </span>
      <Button type="button" variant="outline" className="min-h-11" disabled={page >= pages} onClick={() => onPage(page + 1)}>
        Berikutnya
      </Button>
    </nav>
  );
}

function Overview({ ov, onOpenAgreement, onOpenTab }: { ov: ReturnType<typeof useApiGet<LandOverview>>; onOpenAgreement: (id: number) => void; onOpenTab: (t: Tab) => void }) {
  const d = ov.data;
  return (
    <section aria-label="Ringkasan" className="min-w-0 space-y-4">
      <Async state={ov} what="ringkasan" />
      {d ? (
        <>
          <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Perjanjian berlaku" value={String(d.counts.activeAgreements)} />
            <Stat label="Tagihan terlambat" value={String(d.counts.overdue)} warn={d.counts.overdue > 0} />
            <Stat label="Jatuh tempo 30 hari" value={String(d.counts.dueSoon)} warn={d.counts.dueSoon > 0} />
            <Stat label={`Diterima tahun ${d.today.slice(0, 4)}`} value={rupiah(d.receivedThisYear.total)} hint={`${d.receivedThisYear.count} penerimaan`} />
          </dl>
          {d.counts.draftAgreements > 0 ? (
            <p className="text-sm">
              Ada {d.counts.draftAgreements} draf perjanjian yang belum diberlakukan.{" "}
              <button type="button" className="min-h-11 font-medium underline underline-offset-4" onClick={() => onOpenTab("perjanjian")}>
                Lihat perjanjian
              </button>
            </p>
          ) : null}
          {d.findings.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <p className="font-medium">Tidak ada peringatan.</p>
              <p className="mt-1 text-sm text-muted-foreground">Tagihan, perjanjian, dan data tanah tidak memerlukan tindakan saat ini.</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {d.findings.map((f, i) => {
                const sv = SEVERITY[f.severity] ?? SEVERITY.info;
                return (
                  <li key={`${f.code}-${f.chargeId ?? f.agreementId ?? f.itemId ?? i}`} className={`min-w-0 rounded-md border p-3 text-sm ${sv.cls}`}>
                    <p className="flex items-center gap-2 font-semibold">
                      <sv.Icon aria-hidden="true" className="size-4 shrink-0" /> {sv.label}
                    </p>
                    <p className="mt-1 break-words">{f.message}</p>
                    {f.agreementId ? (
                      <Button type="button" variant="outline" size="sm" className="mt-2 min-h-11 bg-background text-foreground" aria-label={`Buka perjanjian terkait: ${f.message.slice(0, 80)}`} onClick={() => onOpenAgreement(f.agreementId!)}>
                        Buka perjanjian
                      </Button>
                    ) : f.itemId ? (
                      <Button type="button" variant="outline" size="sm" className="mt-2 min-h-11 bg-background text-foreground" onClick={() => onOpenTab("tanah")}>
                        Buka daftar tanah
                      </Button>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </>
      ) : null}
    </section>
  );
}

function Stat({ label, value, hint, warn }: { label: string; value: string; hint?: string; warn?: boolean }) {
  return (
    <div className={`min-w-0 rounded-lg border p-3 ${warn ? "border-amber-500 bg-amber-50" : ""}`}>
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="break-words text-xl font-semibold tabular-nums">{value}</dd>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
