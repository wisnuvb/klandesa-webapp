"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { fmtDate, fmtDateTime, fmtNum, type VillageDetail } from "./types";

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
      {hint ? <div className="mt-0.5 text-xs text-muted-foreground">{hint}</div> : null}
    </div>
  );
}

export function OverviewTab({ d }: { d: VillageDetail }) {
  const c = d.counts;
  const high = d.storage.percent >= 90;
  return (
    <div className="space-y-4">
      <section aria-label="Angka utama" className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Warga" value={fmtNum(c.residents)} />
        <Stat label="Kartu Keluarga" value={fmtNum(c.households)} />
        <Stat label="Perangkat aktif" value={fmtNum(c.officials)} />
        <Stat label="Pengguna" value={fmtNum(c.users)} hint={`${fmtNum(c.activeUsers)} aktif`} />
        <Stat label="Akun warga (seluler)" value={fmtNum(c.citizenAccounts)} />
        <Stat label="Surat, 30 hari" value={fmtNum(c.mailRequests30d)} />
        <Stat label="Permohonan, 30 hari" value={fmtNum(c.requests30d)} />
        <Stat label="Transaksi keuangan, 30 hari" value={fmtNum(c.transactions30d)} />
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Penyimpanan</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <Progress value={Math.min(100, d.storage.percent)} aria-label="Pemakaian penyimpanan" />
            <p className={`text-sm tabular-nums ${high ? "font-medium text-destructive" : ""}`}>
              {d.storage.usedGb} dari {d.storage.limitGb} GB ({d.storage.percent}%)
              {high ? " — hampir/sudah penuh" : ""}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Profil &amp; akuisisi</CardTitle></CardHeader>
          <CardContent>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
              <dt className="text-muted-foreground">Terdaftar</dt><dd>{fmtDate(d.village.createdAt)}</dd>
              <dt className="text-muted-foreground">Masuk terakhir</dt><dd>{d.lastLogin ? fmtDateTime(d.lastLogin) : "Belum pernah"}</dd>
              <dt className="text-muted-foreground">Orientasi</dt><dd>{d.village.onboardingCompletedAt ? `Selesai ${fmtDate(d.village.onboardingCompletedAt)}` : "Belum selesai"}</dd>
              <dt className="text-muted-foreground">Email desa</dt><dd className="[overflow-wrap:anywhere]">{d.village.emailMasked ?? "-"}</dd>
              <dt className="text-muted-foreground">Mitra</dt>
              <dd>{d.acquisition.partnerName ? `${d.acquisition.partnerName}${d.acquisition.source ? ` (${d.acquisition.source})` : ""}` : "Tanpa mitra"}</dd>
              {d.acquisition.acquiredAt ? (<><dt className="text-muted-foreground">Tautan mitra</dt><dd>{fmtDate(d.acquisition.acquiredAt)}</dd></>) : null}
            </dl>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
