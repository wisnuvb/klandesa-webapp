"use client";

import Link from "next/link";
import { AlertTriangle, CheckCircle2, ChevronRight, Clock, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateTimeWib, formatNumberId, formatPercent, formatRupiah } from "@/lib/platform/metrics/format";
import { VILLAGE_STATUS_CLASSES, VILLAGE_STATUS_LABEL } from "@/lib/platform/metrics/aggregate";
import type { AttentionItem, AttentionSeverity } from "@/lib/platform/metrics/attention";
import type { OverviewPayload } from "@/lib/platform/metrics/overview";
import { BarList, EmptyState } from "./shared";
import { ChartPanel, GrowthChart } from "./chart-panel";

const SEVERITY: Record<AttentionSeverity, { label: string; Icon: typeof Info; cls: string }> = {
  urgent: { label: "Mendesak", Icon: AlertTriangle, cls: "text-destructive" },
  warning: { label: "Perhatian", Icon: Clock, cls: "text-chart-4" },
  info: { label: "Info", Icon: Info, cls: "text-muted-foreground" },
};

export function AttentionList({ items }: { items: AttentionItem[] }) {
  if (items.length === 0) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-dashed p-4 text-sm">
        <CheckCircle2 className="size-5 shrink-0 text-primary" aria-hidden="true" />
        <div>
          <p className="font-medium">Tidak ada yang perlu ditindaklanjuti sekarang.</p>
          <p className="text-xs text-muted-foreground">Langganan, tagihan, pendaftaran mitra, dan pencairan semuanya aman.</p>
        </div>
      </div>
    );
  }
  return (
    <ul className="grid gap-3 lg:grid-cols-2">
      {items.map((it) => {
        const s = SEVERITY[it.severity];
        return (
          <li key={it.key} className="rounded-lg border p-3">
            <div className="flex items-start gap-3">
              <s.Icon className={`mt-0.5 size-5 shrink-0 ${s.cls}`} aria-hidden="true" />
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link href={it.href} className="min-h-6 font-medium underline-offset-4 hover:underline focus-visible:underline">
                    {it.title}
                  </Link>
                  <Badge variant="outline" className="tabular-nums">{formatNumberId(it.count)}</Badge>
                  <span className={`text-xs font-medium ${s.cls}`}>{s.label}</span>
                </div>
                <p className="text-xs text-muted-foreground">{it.hint}</p>
                {it.entries.length > 0 ? (
                  <ul className="mt-1 divide-y rounded-md border">
                    {it.entries.map((e) => (
                      <li key={`${e.href}-${e.detail}`}>
                        <Link href={e.href} className="flex min-h-10 items-center justify-between gap-2 px-2 py-1.5 text-sm hover:bg-muted focus-visible:bg-muted">
                          <span className="min-w-0">
                            <span className="block truncate font-medium">{e.label}</span>
                            <span className="block text-xs text-muted-foreground">{e.detail}</span>
                          </span>
                          <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function GrowthSection({ data }: { data: OverviewPayload["villages"]["growth"] }) {
  const totalReg = data.reduce((t, g) => t + g.registered, 0);
  const totalConv = data.reduce((t, g) => t + g.converted, 0);
  return (
    <ChartPanel
      summary={`${formatNumberId(totalReg)} desa mendaftar dalam 12 bulan terakhir; ${formatNumberId(totalConv)} di antaranya sudah pernah membayar Paket Desa (kelompok per bulan pendaftaran, WIB).`}
      rows={data}
      rowKey={(r) => r.key}
      isEmpty={totalReg === 0}
      emptyTitle="Belum ada pendaftaran desa"
      emptyHint="Grafik terisi setelah ada desa yang mendaftar."
      tableCaption="Pendaftaran desa per bulan (WIB)"
      columns={[
        { header: "Bulan", cell: (r) => r.label },
        { header: "Desa mendaftar", align: "right", cell: (r) => formatNumberId(r.registered) },
        { header: "Sudah berbayar", align: "right", cell: (r) => formatNumberId(r.converted) },
      ]}
      chart={<GrowthChart data={data} />}
    />
  );
}

export function StatusDistribution({ villages }: { villages: OverviewPayload["villages"] }) {
  const rows = VILLAGE_STATUS_CLASSES.map((c) => ({ label: VILLAGE_STATUS_LABEL[c], value: villages.byStatus[c] }));
  const { churn, conversion, expiring } = villages;
  return (
    <div className="space-y-4">
      <BarList rows={rows} emptyText="Belum ada desa." format={(n) => `${formatNumberId(n)} desa`} />
      <dl className="grid grid-cols-1 gap-2 rounded-lg bg-muted/50 p-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs text-muted-foreground">Segera berakhir (langganan aktif)</dt>
          <dd className="font-medium tabular-nums">≤ 7 hari: {expiring.d7} · ≤ 14 hari: {expiring.d14} · ≤ 30 hari: {expiring.d30}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Konversi trial → berbayar ({conversion.windowDays} hari)</dt>
          <dd className="font-medium tabular-nums">
            {conversion.rate == null ? "Belum cukup data" : `${formatPercent(conversion.rate)} (${conversion.converted} dari ${conversion.eligible} desa)`}
          </dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-xs text-muted-foreground">Churn kasar ({churn.windowDays} hari terakhir)</dt>
          <dd className="font-medium tabular-nums">
            {churn.rate == null ? "Belum cukup data" : `${formatPercent(churn.rate)} — ${churn.churned} desa berbayar habis dan belum diperpanjang, dari ${churn.base} desa`}
          </dd>
        </div>
      </dl>
    </div>
  );
}

export function OriginTabs({ villages }: { villages: OverviewPayload["villages"] }) {
  const toRows = (xs: Array<{ label: string; count: number }>) => xs.map((x) => ({ label: x.label, value: x.count }));
  const fmt = (n: number) => `${formatNumberId(n)} desa`;
  return (
    <Tabs defaultValue="provinsi">
      <TabsList className="h-auto flex-wrap">
        <TabsTrigger value="provinsi" className="min-h-10">Provinsi</TabsTrigger>
        <TabsTrigger value="kabupaten" className="min-h-10">Kabupaten</TabsTrigger>
        <TabsTrigger value="sumber" className="min-h-10">Sumber</TabsTrigger>
        <TabsTrigger value="mitra" className="min-h-10">Mitra</TabsTrigger>
      </TabsList>
      <TabsContent value="provinsi" className="pt-3"><BarList rows={toRows(villages.topProvinces)} emptyText="Belum ada data." format={fmt} /></TabsContent>
      <TabsContent value="kabupaten" className="pt-3"><BarList rows={toRows(villages.topRegencies)} emptyText="Belum ada data." format={fmt} /></TabsContent>
      <TabsContent value="sumber" className="space-y-2 pt-3">
        <BarList rows={toRows(villages.bySource)} emptyText="Belum ada data." format={fmt} />
        <p className="text-xs text-muted-foreground">“mandiri” = mendaftar sendiri tanpa kode sumber; “referral” = lewat kode referral; “admin” = dibuat admin.</p>
      </TabsContent>
      <TabsContent value="mitra" className="pt-3">
        <BarList rows={villages.byPartner.map((p) => ({ label: p.name, value: p.count }))} emptyText="Belum ada desa yang diperoleh lewat mitra." format={fmt} />
      </TabsContent>
    </Tabs>
  );
}

export function PartnerSection({ partners }: { partners: OverviewPayload["partners"] }) {
  const c = partners.commission;
  const rows: Array<[string, { count: number; amount: number }, string]> = [
    ["Tertunda", c.accrued, "Belum disetujui"],
    ["Disetujui", c.approved, "Siap dicairkan"],
    ["Dicairkan", c.disbursed, "Sudah dibayarkan"],
  ];
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground tabular-nums">
        {formatNumberId(partners.partnersActive)} mitra aktif · {formatNumberId(partners.applicationsNew)} pendaftaran baru menunggu ·{" "}
        <Link href="/admin/mitra" className="font-medium text-foreground underline underline-offset-4">Kelola mitra</Link>
      </p>
      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">Status komisi</TableHead>
              <TableHead scope="col" className="text-right">Entri</TableHead>
              <TableHead scope="col" className="text-right">Nilai</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(([label, v, hint]) => (
              <TableRow key={label}>
                <TableCell>{label} <span className="block text-xs text-muted-foreground">{hint}</span></TableCell>
                <TableCell className="text-right tabular-nums">{formatNumberId(v.count)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatRupiah(v.amount)}</TableCell>
              </TableRow>
            ))}
            <TableRow>
              <TableCell>Pencairan menunggu <span className="block text-xs text-muted-foreground">Pengajuan belum dibayar</span></TableCell>
              <TableCell className="text-right tabular-nums">{formatNumberId(partners.disbursementsWaiting.count)}</TableCell>
              <TableCell className="text-right tabular-nums">{formatRupiah(partners.disbursementsWaiting.amount)}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
      <div>
        <h3 className="mb-2 text-sm font-medium">Mitra teratas (total komisi, tanpa yang dibatalkan)</h3>
        {partners.topPartners.length === 0 ? (
          <EmptyState title="Belum ada komisi" hint="Komisi tercatat saat desa dari mitra membayar." />
        ) : (
          <ol className="space-y-1.5 text-sm">
            {partners.topPartners.map((p, i) => (
              <li key={p.partnerId} className="flex items-baseline justify-between gap-3">
                <span className="min-w-0 break-words"><span className="tabular-nums text-muted-foreground">{i + 1}.</span> {p.name} <span className="text-xs text-muted-foreground">({p.villages} desa)</span></span>
                <span className="shrink-0 font-medium tabular-nums">{formatRupiah(p.amount)}</span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}

export function UsageSection({ usage }: { usage: OverviewPayload["usage"] }) {
  const stat = (label: string, value: string, hint?: string) => (
    <div key={label} className="rounded-lg border p-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-lg font-semibold tabular-nums">{value}</dd>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
  return (
    <div className="space-y-4">
      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stat("Staf aktif 7 hari", formatNumberId(usage.staff.active7d), `dari ${formatNumberId(usage.staff.total)} akun staf`)}
        {stat("Staf aktif 30 hari", formatNumberId(usage.staff.active30d), `${formatNumberId(usage.staff.villagesActive30d)} desa`)}
        {stat("Akun warga aktif 30 hari", formatNumberId(usage.citizens.active30d), `dari ${formatNumberId(usage.citizens.total)} akun mobile`)}
        {stat("Sisa kredit AI", formatNumberId(usage.aiCredits.totalRemaining), `${formatNumberId(usage.aiCredits.usersLow)} akun < ${usage.aiCredits.lowThreshold}`)}
      </dl>
      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <h3 className="mb-1 text-sm font-medium">Desa tanpa login 30 hari <span className="tabular-nums text-muted-foreground">({formatNumberId(usage.inactiveVillages.total)})</span></h3>
          <p className="mb-2 text-xs text-muted-foreground">Langganan aktif/trial berjalan, terdaftar &gt; 7 hari. Berpotensi berhenti berlangganan: tindak lanjuti.</p>
          {usage.inactiveVillages.sample.length === 0 ? (
            <EmptyState title="Semua desa aktif" hint="Tidak ada desa berlangganan yang diam 30 hari." />
          ) : (
            <ul className="divide-y rounded-md border">
              {usage.inactiveVillages.sample.map((v) => (
                <li key={v.id}>
                  <Link href={`/admin/desa/${v.id}`} className="flex min-h-10 items-center justify-between gap-2 px-2 py-1.5 text-sm hover:bg-muted focus-visible:bg-muted">
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{v.name}</span>
                      <span className="block text-xs text-muted-foreground">
                        {v.regency} · {v.status === "active" ? "Berlangganan" : "Trial"} · {v.lastLogin ? `login terakhir ${formatDateTimeWib(v.lastLogin)}` : "belum pernah login"}
                      </span>
                    </span>
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <h3 className="mb-1 text-sm font-medium">Add-on modul yang sedang berlaku</h3>
          <p className="mb-2 text-xs text-muted-foreground">Jumlah desa per add-on berbayar. Ini bukan pemakaian fitur (belum ada telemetri).</p>
          <BarList rows={usage.topModules.map((m) => ({ label: m.label, value: m.count }))} emptyText="Belum ada add-on aktif." format={(n) => `${formatNumberId(n)} desa`} />
        </div>
      </div>
    </div>
  );
}

export function MrrBreakdown({ mrr }: { mrr: OverviewPayload["villages"]["mrr"] }) {
  return (
    <details className="group rounded-lg border p-3 text-sm">
      <summary className="min-h-10 cursor-pointer list-none font-medium marker:hidden [&::-webkit-details-marker]:hidden">
        <span className="underline-offset-4 group-open:underline">Cara menghitung MRR/ARR perkiraan</span>
        <span className="ml-2 text-xs font-normal text-muted-foreground">(buka rumus & asumsi)</span>
      </summary>
      <div className="mt-3 space-y-3">
        {mrr.lines.length === 0 ? (
          <p className="text-muted-foreground">Belum ada desa berlangganan aktif, jadi MRR = Rp 0.</p>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead scope="col">Komponen</TableHead>
                  <TableHead scope="col" className="text-right">Jumlah</TableHead>
                  <TableHead scope="col" className="text-right">Per unit</TableHead>
                  <TableHead scope="col" className="text-right">Subtotal/bln</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mrr.lines.map((l) => (
                  <TableRow key={l.key}>
                    <TableCell className="whitespace-normal">{l.label}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatNumberId(l.count)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatRupiah(l.unit)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatRupiah(l.subtotal)}</TableCell>
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell colSpan={3} className="font-medium">MRR perkiraan (ARR = × 12: {formatRupiah(mrr.arr)})</TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">{formatRupiah(mrr.mrr)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        )}
        <p className="tabular-nums">
          Dihitung dari {formatNumberId(mrr.activeVillages)} desa berlangganan aktif yang pernah membayar paket.{" "}
          <strong>{formatNumberId(mrr.activeWithoutPaidInvoice)}</strong> desa lain berstatus aktif tetapi belum punya tagihan paket lunas (diaktifkan manual/gratis/migrasi), jadi tidak dihitung.
        </p>
        <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
          {mrr.assumptions.map((a) => <li key={a}>{a}</li>)}
        </ul>
      </div>
    </details>
  );
}
