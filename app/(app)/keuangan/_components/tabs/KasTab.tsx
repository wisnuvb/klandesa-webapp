"use client";

import { useMemo, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle,
  Clock,
  Edit,
  Eye,
  Plus,
  Search,
  Wallet,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { TransaksiKasItem } from "../../_lib/types";
import {
  formatRupiah,
  formatRupiahShort,
  formatTanggalShort,
} from "../../_lib/formatting";

type KasTabProps = {
  totalPemasukan: number;
  totalPengeluaran: number;
  saldoKas: number;
  jumlahTransaksi: number;
  terpotong: boolean;
  transaksiKas: TransaksiKasItem[];
  onOpenTransaksiDialog: (
    mode: "create" | "edit",
    transaksi?: TransaksiKasItem,
  ) => void;
  onOpenDetail: (transaksi: TransaksiKasItem) => void;
};

const STATUS_LABEL: Record<string, { label: string; className: string; Icon: typeof Clock }> = {
  verified: { label: "Terverifikasi", className: "bg-primary text-primary-foreground", Icon: CheckCircle },
  approved: { label: "Disetujui", className: "bg-green-600 text-white", Icon: CheckCircle },
  pending: { label: "Menunggu", className: "bg-secondary text-secondary-foreground", Icon: Clock },
  rejected: { label: "Ditolak", className: "bg-destructive text-white", Icon: XCircle },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_LABEL[status] ?? STATUS_LABEL.pending!;
  return (
    <Badge className={`gap-1 ${cfg.className}`}>
      <cfg.Icon className="h-3 w-3" aria-hidden />
      {cfg.label}
    </Badge>
  );
}

export function KasTab(props: KasTabProps) {
  const [query, setQuery] = useState("");
  const {
    totalPemasukan,
    totalPengeluaran,
    saldoKas,
    jumlahTransaksi,
    terpotong,
    transaksiKas,
    onOpenTransaksiDialog,
    onOpenDetail,
  } = props;

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return transaksiKas;
    return transaksiKas.filter((t) =>
      [t.uraian, t.kode, t.referensi].some((v) => v.toLowerCase().includes(q)),
    );
  }, [query, transaksiKas]);

  return (
    <div className="space-y-4 mt-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Buku Kas Umum</h3>
          <p className="text-sm text-muted-foreground">
            Catatan transaksi kas desa
          </p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari uraian atau nomor bukti..."
              aria-label="Cari transaksi"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
          <Button
            className="gap-2"
            onClick={() => onOpenTransaksiDialog("create")}
          >
            <Plus className="h-4 w-4" />
            Catat Transaksi
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <ArrowUpRight className="h-4 w-4 text-green-600" />
              <p className="text-sm text-muted-foreground">Total Pemasukan</p>
            </div>
            <p className="text-2xl font-semibold mt-2">
              {formatRupiahShort(totalPemasukan)}
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <ArrowDownRight className="h-4 w-4 text-red-600" />
              <p className="text-sm text-muted-foreground">Total Pengeluaran</p>
            </div>
            <p className="text-2xl font-semibold mt-2">
              {formatRupiahShort(totalPengeluaran)}
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-primary">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-primary" />
              <p className="text-sm text-muted-foreground">Saldo Akhir</p>
            </div>
            <p className="text-2xl font-semibold mt-2">
              {formatRupiahShort(saldoKas)}
            </p>
          </CardContent>
        </Card>
      </div>

      {terpotong && (
        <p className="text-sm text-muted-foreground">
          Menampilkan {transaksiKas.length} transaksi terbaru dari {jumlahTransaksi} transaksi.
          Total pemasukan, pengeluaran, dan saldo mencakup semua transaksi.
        </p>
      )}

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-4 font-medium">Tanggal</th>
                  <th className="text-left p-4 font-medium">Kode</th>
                  <th className="text-left p-4 font-medium">Uraian</th>
                  <th className="text-right p-4 font-medium">Pemasukan</th>
                  <th className="text-right p-4 font-medium">Pengeluaran</th>
                  <th className="text-right p-4 font-medium">Saldo</th>
                  <th className="text-center p-4 font-medium">Status</th>
                  <th className="text-center p-4 font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-sm text-muted-foreground">
                      {transaksiKas.length === 0
                        ? "Belum ada transaksi pada tahun ini."
                        : "Tidak ada transaksi yang cocok dengan pencarian."}
                    </td>
                  </tr>
                )}
                {rows.map((transaksi) => (
                  <tr
                    key={transaksi.id}
                    className="border-t hover:bg-muted/50 transition-colors"
                  >
                    <td className="p-4 text-sm">
                      {formatTanggalShort(transaksi.tanggal)}
                    </td>
                    <td className="p-4 text-sm font-mono">{transaksi.kode}</td>
                    <td className="p-4 text-sm">{transaksi.uraian}</td>
                    <td className="p-4 text-sm text-right">
                      {transaksi.jenis === "masuk" ? (
                        <span className="text-green-600 font-medium">
                          {formatRupiah(transaksi.jumlah)}
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="p-4 text-sm text-right">
                      {transaksi.jenis === "keluar" ? (
                        <span className="text-red-600 font-medium">
                          {formatRupiah(transaksi.jumlah)}
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="p-4 text-sm text-right font-medium">
                      {formatRupiah(transaksi.saldo)}
                    </td>
                    <td className="p-4 text-center">
                      <StatusBadge status={transaksi.status} />
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label={`Lihat detail ${transaksi.kode}`}
                          onClick={() => onOpenDetail(transaksi)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label={`Edit ${transaksi.kode}`}
                          onClick={() =>
                            onOpenTransaksiDialog("edit", transaksi)
                          }
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
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
