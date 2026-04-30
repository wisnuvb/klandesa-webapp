"use client";

import {
  Calendar,
  CheckCircle,
  Clock,
  DollarSign,
  Download,
  FileText,
  PieChart,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { BelanjaItem, SPPItem } from "../../_lib/types";
import { formatRupiah, formatTanggalLong } from "../../_lib/formatting";

type SppDetailDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedSPP: SPPItem | null;
  belanjaData: BelanjaItem[];
  onOpenConfirm: (mode: "approve" | "reject", spp: SPPItem) => void;
};

function sisaAnggaranBidang(belanjaData: BelanjaItem[], bidang: string) {
  const item = belanjaData.find((b) => b.bidang === bidang);
  const sisa = (item?.anggaran || 0) - (item?.realisasi || 0);
  return sisa > 0 ? sisa : 0;
}

export function SppDetailDialog(props: SppDetailDialogProps) {
  const { open, onOpenChange, selectedSPP, belanjaData, onOpenConfirm } = props;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Review Surat Permintaan Pembayaran</DialogTitle>
          <DialogDescription>
            Detail lengkap pengajuan SPP untuk proses verifikasi
          </DialogDescription>
        </DialogHeader>

        {selectedSPP && (
          <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
            <Card
              className={`border-l-4 ${
                selectedSPP.status === "approved"
                  ? "border-l-green-500 bg-green-50"
                  : selectedSPP.status === "rejected"
                    ? "border-l-red-500 bg-red-50"
                    : "border-l-yellow-500 bg-yellow-50"
              }`}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold mb-2">{selectedSPP.nomor}</h3>
                    <p className="text-sm text-muted-foreground">{selectedSPP.keperluan}</p>
                    <p className="text-3xl font-bold text-primary mt-3">
                      {formatRupiah(selectedSPP.jumlah)}
                    </p>
                  </div>
                  <div className="text-right">
                    {selectedSPP.status === "approved" && (
                      <Badge variant="default" className="gap-1 bg-green-600">
                        <CheckCircle className="h-3 w-3" />
                        Disetujui
                      </Badge>
                    )}
                    {selectedSPP.status === "pending" && (
                      <Badge variant="secondary" className="gap-1 bg-yellow-600">
                        <Clock className="h-3 w-3" />
                        Menunggu Persetujuan
                      </Badge>
                    )}
                    {selectedSPP.status === "rejected" && (
                      <Badge variant="destructive" className="gap-1">
                        <XCircle className="h-3 w-3" />
                        Ditolak
                      </Badge>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">
                      {formatTanggalLong(selectedSPP.tanggal)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Pengaju</p>
                  </div>
                  <p className="font-semibold">{selectedSPP.pengaju}</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Tanggal Pengajuan</p>
                  </div>
                  <p className="font-semibold">{formatTanggalLong(selectedSPP.tanggal)}</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <PieChart className="h-5 w-5 text-primary" />
                  Bidang Kegiatan
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-semibold">{selectedSPP.bidang}</p>
                <p className="text-sm text-muted-foreground mt-1">Kode Rekening: 5.1.2.01</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Uraian Keperluan
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed">{selectedSPP.keperluan}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-primary" />
                  Rincian Anggaran
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <span className="text-sm">Jumlah yang Diajukan</span>
                    <span className="font-semibold text-primary">
                      {formatRupiah(selectedSPP.jumlah)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <span className="text-sm">Sisa Anggaran Kegiatan</span>
                    <span className="font-semibold">
                      {formatRupiah(sisaAnggaranBidang(belanjaData, selectedSPP.bidang))}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  Riwayat Proses
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {selectedSPP.status === "approved" && (
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full bg-green-600 mt-2" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-sm">SPP Disetujui</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(selectedSPP.tanggal).toLocaleDateString("id-ID")}
                          </p>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Disetujui oleh Kepala Desa
                        </p>
                      </div>
                    </div>
                  )}
                  {selectedSPP.status === "rejected" && (
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full bg-red-600 mt-2" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-sm">SPP Ditolak</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(selectedSPP.tanggal).toLocaleDateString("id-ID")}
                          </p>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Alasan: Dokumen pendukung belum lengkap
                        </p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-blue-600 mt-2" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-sm">SPP Diajukan</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(selectedSPP.tanggal).toLocaleDateString("id-ID")}
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Diajukan oleh {selectedSPP.pengaju}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-2 pt-4 border-t">
              {selectedSPP.status === "pending" && (
                <>
                  <Button
                    className="flex-1 gap-2 bg-green-600 hover:bg-green-700"
                    onClick={() => onOpenConfirm("approve", selectedSPP)}
                  >
                    <CheckCircle className="h-4 w-4" />
                    Setujui SPP
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1 gap-2"
                    onClick={() => onOpenConfirm("reject", selectedSPP)}
                  >
                    <XCircle className="h-4 w-4" />
                    Tolak SPP
                  </Button>
                </>
              )}
              <Button variant="outline" className="flex-1 gap-2">
                <Download className="h-4 w-4" />
                Cetak SPP
              </Button>
              <Button variant="outline" className="gap-2" onClick={() => onOpenChange(false)}>
                Tutup
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

