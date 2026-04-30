"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type {
  BelanjaItem,
  KeuanganTab,
  PendapatanItem,
  SPPItem,
  TransaksiKasItem,
  TrendItem,
  ApbdesData,
} from "../_lib/types";
import { OverviewTab } from "./tabs/OverviewTab";
import { PendapatanTab } from "./tabs/PendapatanTab";
import { BelanjaTab } from "./tabs/BelanjaTab";
import { KasTab } from "./tabs/KasTab";
import { SppTab } from "./tabs/SppTab";

type KeuanganTabsProps = {
  activeTab: KeuanganTab;
  setActiveTab: (value: KeuanganTab) => void;

  selectedYear: string;
  apbdesData: ApbdesData;
  pendapatanData: PendapatanItem[];
  belanjaData: BelanjaItem[];
  transaksiKas: TransaksiKasItem[];
  sppData: SPPItem[];
  trendKeuangan: TrendItem[];

  sisaAnggaran: number;

  totalPemasukan: number;
  totalPengeluaran: number;
  saldoKas: number;

  onOpenPendapatanDialog: () => void;
  onOpenBelanjaDialog: () => void;
  onOpenBelanjaDetail: (belanja: BelanjaItem) => void;
  onOpenTransaksiDialog: (
    mode: "create" | "edit",
    transaksi?: TransaksiKasItem,
  ) => void;
  onOpenTransaksiDetail: (transaksi: TransaksiKasItem) => void;
  onOpenSppDialog: () => void;
  onOpenSppDetail: (spp: SPPItem) => void;
  onOpenSppConfirm: (mode: "approve" | "reject", spp: SPPItem) => void;
};

export function KeuanganTabs(props: KeuanganTabsProps) {
  const {
    activeTab,
    setActiveTab,
    selectedYear,
    apbdesData,
    pendapatanData,
    belanjaData,
    transaksiKas,
    sppData,
    trendKeuangan,
    sisaAnggaran,
    totalPemasukan,
    totalPengeluaran,
    saldoKas,
    onOpenPendapatanDialog,
    onOpenBelanjaDialog,
    onOpenBelanjaDetail,
    onOpenTransaksiDialog,
    onOpenTransaksiDetail,
    onOpenSppDialog,
    onOpenSppDetail,
    onOpenSppConfirm,
  } = props;

  return (
    <Card>
      <CardContent className="p-6">
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as KeuanganTab)}
        >
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="pendapatan">Pendapatan</TabsTrigger>
            <TabsTrigger value="belanja">Belanja</TabsTrigger>
            <TabsTrigger value="kas">Buku Kas</TabsTrigger>
            <TabsTrigger value="spp">SPP</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <OverviewTab
              selectedYear={selectedYear}
              trendKeuangan={trendKeuangan}
              belanjaData={belanjaData}
              sisaAnggaran={sisaAnggaran}
              apbdesData={apbdesData}
            />
          </TabsContent>

          <TabsContent value="pendapatan">
            <PendapatanTab
              selectedYear={selectedYear}
              pendapatanData={pendapatanData}
              onOpenCreate={onOpenPendapatanDialog}
            />
          </TabsContent>

          <TabsContent value="belanja">
            <BelanjaTab
              selectedYear={selectedYear}
              belanjaData={belanjaData}
              onOpenCreate={onOpenBelanjaDialog}
              onOpenDetail={onOpenBelanjaDetail}
            />
          </TabsContent>

          <TabsContent value="kas">
            <KasTab
              totalPemasukan={totalPemasukan}
              totalPengeluaran={totalPengeluaran}
              saldoKas={saldoKas}
              transaksiKas={transaksiKas}
              onOpenTransaksiDialog={onOpenTransaksiDialog}
              onOpenDetail={onOpenTransaksiDetail}
            />
          </TabsContent>

          <TabsContent value="spp">
            <SppTab
              sppData={sppData}
              onCreate={onOpenSppDialog}
              onOpenDetail={onOpenSppDetail}
              onOpenConfirm={onOpenSppConfirm}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
