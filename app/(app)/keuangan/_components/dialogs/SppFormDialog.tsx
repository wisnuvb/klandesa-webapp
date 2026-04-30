"use client";

import { CheckCircle, XCircle } from "lucide-react";
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
import type { SppFormState } from "../../_lib/types";
import { formatRupiah } from "../../_lib/formatting";

type SppFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sppMode: "create" | "edit";
  formSPP: SppFormState;
  onChange: (field: keyof SppFormState, value: string) => void;
  onSave: () => Promise<void>;
};

export function SppFormDialog(props: SppFormDialogProps) {
  const { open, onOpenChange, sppMode, formSPP, onChange, onSave } = props;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{sppMode === "create" ? "Buat SPP Baru" : "Edit SPP"}</DialogTitle>
          <DialogDescription>
            Formulir Surat Permintaan Pembayaran sesuai standar SISKEUDES
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Nomor SPP</p>
              <Input
                value={formSPP.nomorSPP}
                onChange={(e) => onChange("nomorSPP", e.target.value)}
                className="mt-1"
                placeholder="SPP/MM/YYYY/XXX"
              />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Tanggal SPP</p>
              <Input
                type="date"
                value={formSPP.tanggal}
                onChange={(e) => onChange("tanggal", e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          <div>
            <p className="text-sm text-muted-foreground">Bidang Kegiatan</p>
            <Select value={formSPP.kegiatan} onValueChange={(v) => onChange("kegiatan", v)}>
              <SelectTrigger className="w-full mt-1">
                <SelectValue placeholder="Pilih bidang kegiatan..." />
              </SelectTrigger>
              <SelectContent>
                {Object.keys(subKegiatanOptions).map((kegiatan) => (
                  <SelectItem key={kegiatan} value={kegiatan}>
                    {kegiatan}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {formSPP.kegiatan && (
            <div>
              <p className="text-sm text-muted-foreground">Sub Kegiatan</p>
              <Select
                value={formSPP.subKegiatan}
                onValueChange={(v) => onChange("subKegiatan", v)}
              >
                <SelectTrigger className="w-full mt-1">
                  <SelectValue placeholder="Pilih sub kegiatan..." />
                </SelectTrigger>
                <SelectContent>
                  {subKegiatanOptions[formSPP.kegiatan]?.map((sub) => (
                    <SelectItem key={sub} value={sub}>
                      {sub}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <p className="text-sm text-muted-foreground">Uraian Kegiatan/Keperluan</p>
            <Textarea
              value={formSPP.uraian}
              onChange={(e) => onChange("uraian", e.target.value)}
              className="mt-1"
              rows={3}
              placeholder="Deskripsi detail kegiatan dan keperluan pembayaran..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Kode Rekening</p>
              <Input
                value={formSPP.kodeRekening}
                onChange={(e) => onChange("kodeRekening", e.target.value)}
                className="mt-1"
                placeholder="X.XX.XX"
              />
              <p className="text-xs text-muted-foreground mt-1">Format: Kode rekening belanja</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Jumlah yang Diminta (Rp)</p>
              <div className="relative mt-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  Rp
                </span>
                <Input
                  type="number"
                  value={formSPP.jumlah}
                  onChange={(e) => onChange("jumlah", e.target.value)}
                  className="pl-10"
                  placeholder="0"
                />
              </div>
              {formSPP.jumlah && (
                <p className="text-xs text-muted-foreground mt-1">
                  {formatRupiah(Number(formSPP.jumlah))}
                </p>
              )}
            </div>
          </div>

          <div>
            <p className="text-sm text-muted-foreground">Keterangan Tambahan (Opsional)</p>
            <Textarea
              value={formSPP.keterangan}
              onChange={(e) => onChange("keterangan", e.target.value)}
              className="mt-1"
              rows={2}
              placeholder="Catatan atau informasi tambahan..."
            />
          </div>

          <div className="p-4 bg-primary/10 rounded-lg border-l-4 border-l-primary">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground">Total Pengajuan SPP</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {formSPP.kegiatan || "Pilih bidang kegiatan"}
                  {formSPP.subKegiatan && ` - ${formSPP.subKegiatan}`}
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-primary">
                  {formSPP.jumlah ? formatRupiah(Number(formSPP.jumlah)) : "Rp 0"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {formSPP.nomorSPP || "Nomor SPP"}
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-4 border-t">
            <Button
              className="flex-1 gap-2"
              onClick={() => void onSave()}
              disabled={
                !formSPP.kegiatan ||
                !formSPP.subKegiatan ||
                !formSPP.uraian ||
                !formSPP.jumlah ||
                !formSPP.kodeRekening
              }
            >
              <CheckCircle className="h-4 w-4" />
              {sppMode === "create" ? "Simpan SPP" : "Update SPP"}
            </Button>
            <Button
              variant="outline"
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

