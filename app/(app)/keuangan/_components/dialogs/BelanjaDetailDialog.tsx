"use client";

import { motion } from "motion/react";
import { CheckCircle, Clock, Download, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { BelanjaItem } from "../../_lib/types";
import { formatRupiah, formatTanggalShort } from "../../_lib/formatting";

type BelanjaDetailDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedBelanja: BelanjaItem | null;
};

export function BelanjaDetailDialog(props: BelanjaDetailDialogProps) {
  const { open, onOpenChange, selectedBelanja } = props;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detail Belanja - {selectedBelanja?.bidang}</DialogTitle>
          <DialogDescription>
            Informasi lengkap anggaran dan realisasi belanja
          </DialogDescription>
        </DialogHeader>

        {selectedBelanja && (
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-4">
              <Card className="border-l-4 border-l-blue-500">
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">
                    Total Anggaran
                  </p>
                  <p className="text-2xl font-semibold mt-2">
                    {formatRupiah(selectedBelanja.anggaran)}
                  </p>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-primary">
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">Realisasi</p>
                  <p className="text-2xl font-semibold mt-2 text-primary">
                    {formatRupiah(selectedBelanja.realisasi)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {selectedBelanja.persentase.toFixed(1)}% dari anggaran
                  </p>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-orange-500">
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">Sisa Anggaran</p>
                  <p className="text-2xl font-semibold mt-2 text-orange-600">
                    {formatRupiah(
                      selectedBelanja.anggaran - selectedBelanja.realisasi,
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {(100 - selectedBelanja.persentase).toFixed(1)}% belum
                    terpakai
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Progress Realisasi</span>
                <span className="text-sm font-semibold text-primary">
                  {selectedBelanja.persentase.toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${selectedBelanja.persentase}%` }}
                  transition={{ duration: 1 }}
                  className="h-full rounded-full"
                  style={{ backgroundColor: selectedBelanja.color }}
                />
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Rincian Kegiatan & Program
              </h4>
              <Card>
                <CardContent className="p-0">
                  <table className="w-full">
                    <thead className="bg-muted">
                      <tr>
                        <th className="text-left p-3 font-medium text-sm">
                          No
                        </th>
                        <th className="text-left p-3 font-medium text-sm">
                          Kegiatan
                        </th>
                        <th className="text-right p-3 font-medium text-sm">
                          Anggaran
                        </th>
                        <th className="text-right p-3 font-medium text-sm">
                          Realisasi
                        </th>
                        <th className="text-right p-3 font-medium text-sm">
                          %
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {(selectedBelanja?.subItems ?? []).length === 0 ? (
                        <tr>
                          <td
                            colSpan={5}
                            className="p-4 text-center text-sm text-muted-foreground"
                          >
                            Belum ada data rincian kegiatan.
                          </td>
                        </tr>
                      ) : (
                        (selectedBelanja?.subItems ?? []).map(
                          (kegiatan, idx) => (
                            <tr
                              key={idx}
                              className="border-t hover:bg-muted/50 transition-colors"
                            >
                              <td className="p-3 text-sm">{idx + 1}</td>
                              <td className="p-3 text-sm">{kegiatan.nama}</td>
                              <td className="p-3 text-sm text-right">
                                {formatRupiah(kegiatan.anggaran)}
                              </td>
                              <td className="p-3 text-sm text-right font-medium text-primary">
                                {formatRupiah(kegiatan.realisasi)}
                              </td>
                              <td className="p-3 text-sm text-right">
                                <Badge variant="outline">
                                  {kegiatan.persentase.toFixed(1)}%
                                </Badge>
                              </td>
                            </tr>
                          ),
                        )
                      )}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </div>

            <div>
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                Riwayat Transaksi Belanja
              </h4>
              <Card>
                <CardContent className="p-0">
                  <table className="w-full">
                    <thead className="bg-muted">
                      <tr>
                        <th className="text-left p-3 font-medium text-sm">
                          Tanggal
                        </th>
                        <th className="text-left p-3 font-medium text-sm">
                          Keterangan
                        </th>
                        <th className="text-right p-3 font-medium text-sm">
                          Jumlah
                        </th>
                        <th className="text-center p-3 font-medium text-sm">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        {
                          tanggal: "2024-12-15",
                          keterangan: "Pembayaran Honorarium Bulanan",
                          jumlah: 25000000,
                          status: "verified",
                        },
                        {
                          tanggal: "2024-12-10",
                          keterangan: "Pengadaan ATK",
                          jumlah: 5000000,
                          status: "verified",
                        },
                        {
                          tanggal: "2024-12-05",
                          keterangan: "Biaya Operasional Kantor",
                          jumlah: 8000000,
                          status: "verified",
                        },
                        {
                          tanggal: "2024-11-28",
                          keterangan: "Pemeliharaan Gedung",
                          jumlah: 15000000,
                          status: "verified",
                        },
                        {
                          tanggal: "2024-11-20",
                          keterangan: "Belanja Modal",
                          jumlah: 45000000,
                          status: "verified",
                        },
                      ].map((transaksi, idx) => (
                        <tr
                          key={idx}
                          className="border-t hover:bg-muted/50 transition-colors"
                        >
                          <td className="p-3 text-sm">
                            {formatTanggalShort(transaksi.tanggal)}
                          </td>
                          <td className="p-3 text-sm">
                            {transaksi.keterangan}
                          </td>
                          <td className="p-3 text-sm text-right font-medium">
                            {formatRupiah(transaksi.jumlah)}
                          </td>
                          <td className="p-3 text-center">
                            <Badge variant="default" className="gap-1">
                              <CheckCircle className="h-3 w-3" />
                              Verified
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </div>

            <div className="flex gap-2 pt-4 border-t">
              <Button variant="outline" className="flex-1 gap-2">
                <Download className="h-4 w-4" />
                Export Detail
              </Button>
              <Button
                variant="outline"
                className="flex-1 gap-2"
                onClick={() => onOpenChange(false)}
              >
                Tutup
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
