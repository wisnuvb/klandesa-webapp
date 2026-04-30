"use client";

import { AlertCircle, CheckCircle, Loader2, XCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { subKategoriOptions } from "../../_lib/constants";
import type { PendapatanFormState } from "../../_lib/types";

type PendapatanDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formPendapatan: PendapatanFormState;
  onChange: (field: keyof PendapatanFormState, value: string) => void;
  onSave: () => Promise<void>;
  isSubmitting: boolean;
  error: string | null;
  clearError: () => void;
};

export function PendapatanDialog(props: PendapatanDialogProps) {
  const { open, onOpenChange, formPendapatan, onChange, onSave, isSubmitting, error, clearError } =
    props;

  const handleOpenChange = (next: boolean) => {
    onOpenChange(next);
    if (!next) clearError();
  };

  const subsRequired =
    (subKategoriOptions[formPendapatan.kategori]?.length ?? 0) > 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Catat Pendapatan</DialogTitle>
          <DialogDescription>Formulir untuk mencatat pendapatan baru</DialogDescription>
        </DialogHeader>

        {error ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Tidak dapat menyimpan</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Tanggal</p>
              <Input
                type="date"
                value={formPendapatan.tanggal}
                onChange={(e) => onChange("tanggal", e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Kategori</p>
              <Select
                value={formPendapatan.kategori}
                onValueChange={(value) => onChange("kategori", value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PADes">Pendapatan Asli Desa (PADes)</SelectItem>
                  <SelectItem value="Transfer">Transfer</SelectItem>
                  <SelectItem value="Lain-lain">Pendapatan Lain-lain</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Sub Kategori</p>
              <Select
                value={formPendapatan.subKategori}
                onValueChange={(value) => onChange("subKategori", value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih sub kategori" />
                </SelectTrigger>
                <SelectContent>
                  {subKategoriOptions[formPendapatan.kategori]?.map((sub) => (
                    <SelectItem key={sub} value={sub}>
                      {sub}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Uraian</p>
              <Input
                value={formPendapatan.uraian}
                onChange={(e) => onChange("uraian", e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Jumlah</p>
              <Input
                type="number"
                value={formPendapatan.jumlah}
                onChange={(e) => onChange("jumlah", e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Nomor Bukti</p>
              <Input
                value={formPendapatan.nomorBukti}
                onChange={(e) => onChange("nomorBukti", e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
          <div className="flex gap-2 pt-4 border-t">
            <Button
              className="flex-1 gap-2 bg-green-600 hover:bg-green-700"
              onClick={() => void onSave()}
              disabled={
                isSubmitting ||
                !formPendapatan.tanggal ||
                !formPendapatan.kategori.trim() ||
                (subsRequired && !formPendapatan.subKategori.trim()) ||
                !formPendapatan.uraian.trim() ||
                !formPendapatan.jumlah.trim()
              }
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

