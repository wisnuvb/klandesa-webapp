"use client";

import {
  ArrowDownRight,
  ArrowUpRight,
  Calendar,
  CheckCircle,
  Clock,
  Download,
  Edit,
  FileText,
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
import type { TransaksiKasItem } from "../../_lib/types";
import { formatRupiah, formatTanggalLong } from "../../_lib/formatting";

type TransaksiDetailDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedTransaksi: TransaksiKasItem | null;
  onEdit: (transaksi: TransaksiKasItem) => void;
};

export function TransaksiDetailDialog(props: TransaksiDetailDialogProps) {
  const { open, onOpenChange, selectedTransaksi, onEdit } = props;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Detail Transaksi Kas</DialogTitle>
          <DialogDescription>Informasi lengkap transaksi kas desa</DialogDescription>
        </DialogHeader>

        {selectedTransaksi && (
          <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
            <Card
              className={`border-l-4 ${
                selectedTransaksi.jenis === "masuk"
                  ? "border-l-green-500 bg-green-50"
                  : "border-l-red-500 bg-red-50"
              }`}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {selectedTransaksi.jenis === "masuk" ? (
                        <ArrowUpRight className="h-6 w-6 text-green-600" />
                      ) : (
                        <ArrowDownRight className="h-6 w-6 text-red-600" />
                      )}
                      <h3 className="text-xl font-semibold">
                        {selectedTransaksi.jenis === "masuk"
                          ? "Pemasukan Kas"
                          : "Pengeluaran Kas"}
                      </h3>
                    </div>
                    <p
                      className="text-3xl font-bold mt-2"
                      style={{
                        color: selectedTransaksi.jenis === "masuk" ? "#16a34a" : "#dc2626",
                      }}
                    >
                      {formatRupiah(selectedTransaksi.jumlah)}
                    </p>
                  </div>
                  <div className="text-right">
                    {selectedTransaksi.status === "verified" ? (
                      <Badge variant="default" className="gap-1 bg-green-600">
                        <CheckCircle className="h-3 w-3" />
                        Verified
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="gap-1">
                        <Clock className="h-3 w-3" />
                        Pending
                      </Badge>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">{selectedTransaksi.kode}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Tanggal Transaksi</p>
                  </div>
                  <p className="font-semibold">{formatTanggalLong(selectedTransaksi.tanggal)}</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Nomor Bukti</p>
                  </div>
                  <p className="font-semibold font-mono">{selectedTransaksi.kode}</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Uraian Transaksi
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed">{selectedTransaksi.uraian}</p>
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 gap-4">
              <Card className="border-l-4 border-l-blue-500">
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">Saldo Sebelum</p>
                  <p className="text-xl font-semibold mt-2">
                    {formatRupiah(
                      selectedTransaksi.saldo -
                        (selectedTransaksi.jenis === "masuk"
                          ? selectedTransaksi.jumlah
                          : -selectedTransaksi.jumlah),
                    )}
                  </p>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-primary">
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">Saldo Sesudah</p>
                  <p className="text-xl font-semibold mt-2 text-primary">
                    {formatRupiah(selectedTransaksi.saldo)}
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  Riwayat Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-green-600 mt-2" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-sm">Transaksi Diverifikasi</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(selectedTransaksi.tanggal).toLocaleDateString("id-ID")}
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Transaksi telah diverifikasi oleh Bendahara Desa
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-blue-600 mt-2" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-sm">Transaksi Dicatat</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(selectedTransaksi.tanggal).toLocaleDateString("id-ID")}
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Transaksi berhasil dicatat dalam Buku Kas Umum
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-2 pt-4 border-t">
              <Button
                variant="outline"
                className="flex-1 gap-2"
                onClick={() => onEdit(selectedTransaksi)}
              >
                <Edit className="h-4 w-4" />
                Edit Transaksi
              </Button>
              <Button variant="outline" className="flex-1 gap-2">
                <Download className="h-4 w-4" />
                Cetak Bukti
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

