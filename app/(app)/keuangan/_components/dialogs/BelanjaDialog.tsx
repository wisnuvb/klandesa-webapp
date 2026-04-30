"use client";

import { CheckCircle, Loader2, XCircle } from "lucide-react";
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
import { subKegiatanOptions } from "../../_lib/constants";
import type { BelanjaFormState } from "../../_lib/types";

type BelanjaDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formBelanja: BelanjaFormState;
  onChange: (field: keyof BelanjaFormState, value: string) => void;
  onSave: () => Promise<void>;
  isSubmitting: boolean;
};

export function BelanjaDialog(props: BelanjaDialogProps) {
  const { open, onOpenChange, formBelanja, onChange, onSave, isSubmitting } = props;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Catat Belanja</DialogTitle>
          <DialogDescription>Formulir untuk mencatat belanja desa baru</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Tanggal</p>
              <Input
                type="date"
                value={formBelanja.tanggal}
                onChange={(e) => onChange("tanggal", e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Bidang Belanja</p>
              <Select
                value={formBelanja.bidang}
                onValueChange={(value) => onChange("bidang", value)}
              >
                <SelectTrigger className="w-full mt-1">
                  <SelectValue placeholder="Pilih bidang..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Penyelenggaraan Pemerintahan Desa">
                    Penyelenggaraan Pemerintahan Desa
                  </SelectItem>
                  <SelectItem value="Pelaksanaan Pembangunan Desa">
                    Pelaksanaan Pembangunan Desa
                  </SelectItem>
                  <SelectItem value="Pembinaan Kemasyarakatan">
                    Pembinaan Kemasyarakatan
                  </SelectItem>
                  <SelectItem value="Pemberdayaan Masyarakat">
                    Pemberdayaan Masyarakat
                  </SelectItem>
                  <SelectItem value="Penanggulangan Bencana & Darurat">
                    Penanggulangan Bencana & Darurat
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <p className="text-sm text-muted-foreground">Sub Kegiatan</p>
            <Select
              value={formBelanja.subKegiatan}
              onValueChange={(value) => onChange("subKegiatan", value)}
              disabled={!formBelanja.bidang}
            >
              <SelectTrigger className="w-full mt-1">
                <SelectValue placeholder="Pilih sub kegiatan..." />
              </SelectTrigger>
              <SelectContent>
                {subKegiatanOptions[formBelanja.bidang]?.map((sub) => (
                  <SelectItem key={sub} value={sub}>
                    {sub}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <p className="text-sm text-muted-foreground">Keterangan</p>
            <Textarea
              value={formBelanja.keterangan}
              onChange={(e) => onChange("keterangan", e.target.value)}
              className="mt-1"
              rows={3}
              placeholder="Keterangan detail belanja..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Jumlah (Rupiah)</p>
              <Input
                type="number"
                value={formBelanja.jumlah}
                onChange={(e) => onChange("jumlah", e.target.value)}
                className="mt-1"
                placeholder="0"
              />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Nomor Bukti/Kwitansi</p>
              <Input
                value={formBelanja.nomorBukti}
                onChange={(e) => onChange("nomorBukti", e.target.value)}
                className="mt-1"
                placeholder="No. Kwitansi"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-4 border-t">
            <Button
              className="flex-1 gap-2 bg-green-600 hover:bg-green-700"
              onClick={() => void onSave()}
              disabled={isSubmitting || !formBelanja.bidang || !formBelanja.keterangan || !formBelanja.jumlah}
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4" />
              )}
              {isSubmitting ? "Menyimpan..." : "Simpan"}
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

