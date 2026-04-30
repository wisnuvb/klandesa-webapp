"use client";

import {
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { kategoriTransaksiKeluar, kategoriTransaksiMasuk } from "../../_lib/constants";
import type { TransaksiFormState } from "../../_lib/types";
import { formatRupiah } from "../../_lib/formatting";

type TransaksiDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaksiMode: "create" | "edit";
  formTransaksi: TransaksiFormState;
  onChange: (field: keyof TransaksiFormState, value: string) => void;
  onSave: () => Promise<void>;
};

export function TransaksiDialog(props: TransaksiDialogProps) {
  const { open, onOpenChange, transaksiMode, formTransaksi, onChange, onSave } = props;

  const kategoriList =
    formTransaksi.jenis === "masuk" ? kategoriTransaksiMasuk : kategoriTransaksiKeluar;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {transaksiMode === "create" ? "Catat Transaksi Baru" : "Edit Transaksi"}
          </DialogTitle>
          <DialogDescription>
            Formulir untuk {transaksiMode === "create" ? "mencatat" : "mengedit"} transaksi kas desa
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Tanggal Transaksi</p>
              <Input
                type="date"
                value={formTransaksi.tanggal}
                onChange={(e) => onChange("tanggal", e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Jenis Transaksi</p>
              <Select value={formTransaksi.jenis} onValueChange={(v) => onChange("jenis", v)}>
                <SelectTrigger className="w-full mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="masuk">
                    <div className="flex items-center gap-2">
                      <ArrowUpRight className="h-4 w-4 text-green-600" />
                      Pemasukan (Kas Masuk)
                    </div>
                  </SelectItem>
                  <SelectItem value="keluar">
                    <div className="flex items-center gap-2">
                      <ArrowDownRight className="h-4 w-4 text-red-600" />
                      Pengeluaran (Kas Keluar)
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <p className="text-sm text-muted-foreground">
              Kategori {formTransaksi.jenis === "masuk" ? "Penerimaan" : "Pengeluaran"}
            </p>
            <Select value={formTransaksi.kategori} onValueChange={(v) => onChange("kategori", v)}>
              <SelectTrigger className="w-full mt-1">
                <SelectValue placeholder="Pilih kategori..." />
              </SelectTrigger>
              <SelectContent>
                {kategoriList.map((kategori) => (
                  <SelectItem key={kategori} value={kategori}>
                    {kategori}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <p className="text-sm text-muted-foreground">Uraian/Keterangan</p>
            <Textarea
              value={formTransaksi.uraian}
              onChange={(e) => onChange("uraian", e.target.value)}
              className="mt-1"
              rows={3}
              placeholder="Deskripsi detail transaksi..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Jumlah (Rupiah)</p>
              <div className="relative mt-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  Rp
                </span>
                <Input
                  type="number"
                  value={formTransaksi.jumlah}
                  onChange={(e) => onChange("jumlah", e.target.value)}
                  className="pl-10"
                  placeholder="0"
                />
              </div>
              {formTransaksi.jumlah && (
                <p className="text-xs text-muted-foreground mt-1">
                  {formatRupiah(Number(formTransaksi.jumlah))}
                </p>
              )}
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Nomor Bukti</p>
              <Input
                value={formTransaksi.nomorBukti}
                onChange={(e) => onChange("nomorBukti", e.target.value)}
                className="mt-1"
                placeholder="BKU-2024-xxxx"
              />
            </div>
          </div>

          <div
            className={`p-4 rounded-lg border-l-4 ${
              formTransaksi.jenis === "masuk"
                ? "bg-green-50 border-l-green-500"
                : "bg-red-50 border-l-red-500"
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">
                  {formTransaksi.jenis === "masuk" ? "Pemasukan" : "Pengeluaran"} Kas
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {formTransaksi.kategori || "Pilih kategori"}
                </p>
              </div>
              <div
                className={`text-xl font-semibold ${
                  formTransaksi.jenis === "masuk" ? "text-green-600" : "text-red-600"
                }`}
              >
                {formTransaksi.jumlah ? formatRupiah(Number(formTransaksi.jumlah)) : "Rp 0"}
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-4 border-t">
            <Button
              className="flex-1 gap-2 bg-green-600 hover:bg-green-700"
              onClick={() => void onSave()}
              disabled={!formTransaksi.kategori || !formTransaksi.uraian || !formTransaksi.jumlah}
            >
              <CheckCircle className="h-4 w-4" />
              {transaksiMode === "create" ? "Simpan Transaksi" : "Update Transaksi"}
            </Button>
            <Button
              variant="destructive"
              className="flex-1 gap-2"
              onClick={() => onOpenChange(false)}
            >
              <XCircle className="h-4 w-4" />
              Batal
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

