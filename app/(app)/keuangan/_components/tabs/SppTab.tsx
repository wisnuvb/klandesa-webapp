"use client";

import { CheckCircle, Clock, Eye, Plus, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { SPPItem } from "../../_lib/types";
import { formatRupiah, formatTanggalShort } from "../../_lib/formatting";

type SppTabProps = {
  sppData: SPPItem[];
  onCreate: () => void;
  onOpenDetail: (spp: SPPItem) => void;
  onOpenConfirm: (mode: "approve" | "reject", spp: SPPItem) => void;
};

export function SppTab(props: SppTabProps) {
  const { sppData, onCreate, onOpenDetail, onOpenConfirm } = props;

  const approvedCount = sppData.filter((s) => s.status === "approved").length;
  const pendingCount = sppData.filter((s) => s.status === "pending").length;
  const rejectedCount = sppData.filter((s) => s.status === "rejected").length;

  return (
    <div className="space-y-4 mt-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Surat Permintaan Pembayaran (SPP)</h3>
          <p className="text-sm text-muted-foreground">
            Kelola pengajuan dan persetujuan SPP
          </p>
        </div>
        <Button className="gap-2" onClick={onCreate}>
          <Plus className="h-4 w-4" />
          Buat SPP Baru
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <p className="text-sm text-muted-foreground">Disetujui</p>
            </div>
            <p className="text-2xl font-semibold mt-2">{approvedCount}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-orange-600" />
              <p className="text-sm text-muted-foreground">Menunggu</p>
            </div>
            <p className="text-2xl font-semibold mt-2">{pendingCount}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-600" />
              <p className="text-sm text-muted-foreground">Ditolak</p>
            </div>
            <p className="text-2xl font-semibold mt-2">{rejectedCount}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-4 font-medium">Nomor SPP</th>
                  <th className="text-left p-4 font-medium">Tanggal</th>
                  <th className="text-left p-4 font-medium">Keperluan</th>
                  <th className="text-left p-4 font-medium">Bidang</th>
                  <th className="text-right p-4 font-medium">Jumlah</th>
                  <th className="text-left p-4 font-medium">Pengaju</th>
                  <th className="text-center p-4 font-medium">Status</th>
                  <th className="text-center p-4 font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {sppData.map((spp) => (
                  <tr key={spp.id} className="border-t hover:bg-muted/50 transition-colors">
                    <td className="p-4 text-sm font-mono">{spp.nomor}</td>
                    <td className="p-4 text-sm">{formatTanggalShort(spp.tanggal)}</td>
                    <td className="p-4 text-sm max-w-xs">{spp.keperluan}</td>
                    <td className="p-4 text-sm text-muted-foreground">{spp.bidang}</td>
                    <td className="p-4 text-sm text-right font-medium">{formatRupiah(spp.jumlah)}</td>
                    <td className="p-4 text-sm">{spp.pengaju}</td>
                    <td className="p-4 text-center">
                      {spp.status === "approved" && (
                        <Badge variant="default" className="gap-1 bg-green-600">
                          <CheckCircle className="h-3 w-3" />
                          Disetujui
                        </Badge>
                      )}
                      {spp.status === "pending" && (
                        <Badge variant="secondary" className="gap-1">
                          <Clock className="h-3 w-3" />
                          Menunggu
                        </Badge>
                      )}
                      {spp.status === "rejected" && (
                        <Badge variant="destructive" className="gap-1">
                          <XCircle className="h-3 w-3" />
                          Ditolak
                        </Badge>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button variant="ghost" size="sm" onClick={() => onOpenDetail(spp)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        {spp.status === "pending" && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-green-600"
                              onClick={() => onOpenConfirm("approve", spp)}
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600"
                              onClick={() => onOpenConfirm("reject", spp)}
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

