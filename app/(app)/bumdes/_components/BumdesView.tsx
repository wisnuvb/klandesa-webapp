"use client";

import { useState } from "react";
import { Landmark } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AsyncState } from "@/components/app/patterns";
import { useBumdes } from "../_hooks/useBumdes";
import { DanaDesaTab } from "./DanaDesaTab";
import { JurnalTab } from "./JurnalTab";
import { KasTab } from "./KasTab";
import { LaporanTab } from "./LaporanTab";
import { LegalTab } from "./LegalTab";
import { PeriodeTab } from "./PeriodeTab";

const TABS = [
  ["kas", "Kas dan unit"],
  ["jurnal", "Jurnal"],
  ["laporan", "Laporan"],
  ["periode", "Periode"],
  ["legalitas", "Legalitas"],
  ["dana-desa", "Dana Desa"],
] as const;
type Tab = (typeof TABS)[number][0];

export function BumdesView() {
  const b = useBumdes();
  const [tab, setTab] = useState<Tab>("kas");
  const name = b.summary?.bumdes && typeof b.summary.bumdes.name === "string" ? b.summary.bumdes.name : "BUMDes";
  const unitList = b.units.map((u) => ({ id: u.id, name: u.name }));

  return (
    <AsyncState loading={b.loading} error={b.error} onRetry={b.reload} loadingMessage="Memuat data BUMDes...">
      <div className="min-w-0 space-y-6 pb-24">
        {b.summary?.needsBootstrap ? (
          <Card>
            <CardHeader>
              <CardTitle>Belum ada BUMDes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">Buat satu entri BUMDes untuk desa ini. Anda dapat menambah unit usaha, transaksi, dan jurnal setelahnya.</p>
              {b.canManage ? (
                <Button onClick={() => void b.bootstrapBumdes()} className="min-h-11 gap-2">
                  <Landmark className="h-4 w-4" />
                  Aktifkan BUMDes untuk desa
                </Button>
              ) : (
                <p className="text-sm text-muted-foreground">Hubungi admin desa atau kepala desa untuk mengaktifkan modul ini.</p>
              )}
            </CardContent>
          </Card>
        ) : (
          <>
            <header className="space-y-1">
              <h1 className="break-words text-2xl font-semibold tracking-tight">{name}</h1>
              <p className="max-w-3xl text-muted-foreground">Pembukuan BUM Desa: transaksi kas yang dapat dikoreksi berjejak, jurnal berpasangan, neraca dan laba rugi per unit dan gabungan, penutupan periode semester, data legalitas, serta hubungan dengan APB Desa.</p>
            </header>
            <Alert>
              <Landmark className="h-4 w-4" />
              <AlertTitle>Pembukuan sederhana, bukan akuntansi penuh</AlertTitle>
              <AlertDescription>Mengikuti bagan akun dan tata buku berpasangan Kepmendes PDTT 136/2022, tetapi belum memuat laporan perubahan ekuitas, arus kas, dan catatan atas laporan keuangan. Pisahkan pembukuan BUM Desa dari APB Desa; hanya penyertaan modal dan bagi hasil yang bersinggungan, di tab Dana Desa.</AlertDescription>
            </Alert>
            <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
              <TabsList className="h-auto flex-wrap justify-start">
                {TABS.map(([k, label]) => (
                  <TabsTrigger key={k} value={k} className="min-h-11">
                    {label}
                  </TabsTrigger>
                ))}
              </TabsList>
              <TabsContent value="kas" className="mt-4">
                <KasTab b={b} />
              </TabsContent>
              <TabsContent value="jurnal" className="mt-4">
                <JurnalTab units={unitList} />
              </TabsContent>
              <TabsContent value="laporan" className="mt-4">
                <LaporanTab units={unitList} />
              </TabsContent>
              <TabsContent value="periode" className="mt-4">
                <PeriodeTab />
              </TabsContent>
              <TabsContent value="legalitas" className="mt-4">
                <LegalTab />
              </TabsContent>
              <TabsContent value="dana-desa" className="mt-4">
                <DanaDesaTab />
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </AsyncState>
  );
}
