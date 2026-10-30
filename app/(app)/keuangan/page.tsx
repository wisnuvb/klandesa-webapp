"use client";

import { BelanjaDetailDialog } from "./_components/dialogs/BelanjaDetailDialog";
import { BelanjaDialog } from "./_components/dialogs/BelanjaDialog";
import { PendapatanDialog } from "./_components/dialogs/PendapatanDialog";
import { SppConfirmDialog } from "./_components/dialogs/SppConfirmDialog";
import { SppDetailDialog } from "./_components/dialogs/SppDetailDialog";
import { SppFormDialog } from "./_components/dialogs/SppFormDialog";
import { TransaksiDetailDialog } from "./_components/dialogs/TransaksiDetailDialog";
import { TransaksiDialog } from "./_components/dialogs/TransaksiDialog";
import { HeaderSection } from "./_components/HeaderSection";
import { KeuanganTabs } from "./_components/KeuanganTabs";
import { SummaryCards } from "./_components/SummaryCards";
import { useKeuangan } from "./_hooks/useKeuangan";
import { downloadBukuKasCsv } from "./_lib/export";
import { AsyncState } from "@/components/app/patterns";
import { SdgTagsManager } from "@/components/app/finance/SdgTagsManager";

export default function KeuanganPage() {
  const k = useKeuangan();

  return (
    <AsyncState
      loading={k.loading}
      error={k.error}
      onRetry={() => void k.fetchFinance()}
      loadingMessage="Memuat data keuangan..."
    >
    <div className="space-y-6">
      <HeaderSection
        selectedYear={k.selectedYear}
        yearOptions={k.yearOptions}
        setSelectedYear={k.setSelectedYear}
        onExport={() => downloadBukuKasCsv(k.transaksiKas, k.selectedYear)}
        canExport={k.transaksiKas.length > 0}
      />

      <div
        className={`space-y-6 transition-opacity ${
          k.refreshing ? "pointer-events-none opacity-60" : ""
        }`}
        aria-busy={k.refreshing}
      >
      <SummaryCards
        apbdesData={k.apbdesData}
        persentaseRealisasiPendapatan={k.persentaseRealisasiPendapatan}
        persentaseRealisasiBelanja={k.persentaseRealisasiBelanja}
        saldoKas={k.saldoKas}
      />

      <SdgTagsManager
        key={k.selectedYear}
        defaultYear={Number(k.selectedYear)}
        compact
      />

      <KeuanganTabs
        activeTab={k.activeTab}
        setActiveTab={k.setActiveTab}
        selectedYear={k.selectedYear}
        apbdesData={k.apbdesData}
        pendapatanData={k.pendapatanData}
        belanjaData={k.belanjaData}
        transaksiKas={k.transaksiKas}
        sppData={k.sppData}
        trendKeuangan={k.trendKeuangan}
        sisaAnggaran={k.sisaAnggaran}
        totalPemasukan={k.totalPemasukan}
        totalPengeluaran={k.totalPengeluaran}
        saldoKas={k.saldoKas}
        kas={k.kas}
        sppStatus={k.sppStatus}
        onOpenPendapatanDialog={() => k.setShowPendapatanDialog(true)}
        onOpenBelanjaDialog={() => k.setShowBelanjaDialog(true)}
        onOpenBelanjaDetail={(belanja) => {
          k.setSelectedBelanja(belanja);
          k.setShowDetailBelanjaDialog(true);
        }}
        onOpenTransaksiDialog={k.handleOpenTransaksiDialog}
        onOpenTransaksiDetail={(transaksi) => {
          k.setSelectedTransaksi(transaksi);
          k.setShowDetailTransaksiDialog(true);
        }}
        onOpenSppDialog={() => k.handleOpenSPPDialog("create")}
        onOpenSppDetail={(spp) => {
          k.setSelectedSPP(spp);
          k.setShowDetailSPPDialog(true);
        }}
        onOpenSppConfirm={k.handleOpenConfirmDialog}
      />
      </div>

      <SppFormDialog
        open={k.showSPPDialog}
        onOpenChange={k.setShowSPPDialog}
        sppMode={k.sppMode}
        formSPP={k.formSPP}
        onChange={k.handleSPPChange}
        onSave={k.handleSaveSPP}
        isSubmitting={k.isSubmitting}
      />

      <SppDetailDialog
        open={k.showDetailSPPDialog}
        onOpenChange={k.setShowDetailSPPDialog}
        selectedSPP={k.selectedSPP}
        belanjaData={k.belanjaData}
        onOpenConfirm={k.handleOpenConfirmDialog}
      />

      <SppConfirmDialog
        open={k.showConfirmDialog}
        onOpenChange={k.setShowConfirmDialog}
        confirmMode={k.confirmMode}
        selectedSPP={k.selectedSPP}
        alasanReject={k.alasanReject}
        setAlasanReject={k.setAlasanReject}
        onConfirm={k.handleConfirmAction}
        isSubmitting={k.isSubmitting}
      />

      <PendapatanDialog
        open={k.showPendapatanDialog}
        onOpenChange={k.setShowPendapatanDialog}
        formPendapatan={k.formPendapatan}
        onChange={k.handlePendapatanChange}
        onSave={k.handleSavePendapatan}
        isSubmitting={k.isSubmitting}
        error={k.pendapatanFormError}
        clearError={() => k.setPendapatanFormError(null)}
      />

      <BelanjaDialog
        open={k.showBelanjaDialog}
        onOpenChange={k.setShowBelanjaDialog}
        formBelanja={k.formBelanja}
        onChange={k.handleBelanjaChange}
        onSave={k.handleSaveBelanja}
        isSubmitting={k.isSubmitting}
      />

      <BelanjaDetailDialog
        open={k.showDetailBelanjaDialog}
        onOpenChange={k.setShowDetailBelanjaDialog}
        selectedBelanja={k.selectedBelanja}
      />

      <TransaksiDialog
        open={k.showTransaksiDialog}
        onOpenChange={k.setShowTransaksiDialog}
        transaksiMode={k.transaksiMode}
        formTransaksi={k.formTransaksi}
        onChange={k.handleTransaksiChange}
        onSave={k.handleSaveTransaksi}
        isSubmitting={k.isSubmitting}
      />

      <TransaksiDetailDialog
        open={k.showDetailTransaksiDialog}
        onOpenChange={k.setShowDetailTransaksiDialog}
        selectedTransaksi={k.selectedTransaksi}
        onEdit={(transaksi) => {
          k.setShowDetailTransaksiDialog(false);
          k.handleOpenTransaksiDialog("edit", transaksi);
        }}
      />
    </div>
    </AsyncState>
  );
}
