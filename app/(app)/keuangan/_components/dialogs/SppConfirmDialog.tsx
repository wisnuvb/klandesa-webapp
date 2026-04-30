"use client";

import { CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import type { SPPItem } from "../../_lib/types";
import { formatRupiah } from "../../_lib/formatting";

type SppConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  confirmMode: "approve" | "reject";
  selectedSPP: SPPItem | null;
  alasanReject: string;
  setAlasanReject: (value: string) => void;
  onConfirm: () => Promise<void>;
};

export function SppConfirmDialog(props: SppConfirmDialogProps) {
  const { open, onOpenChange, confirmMode, selectedSPP, alasanReject, setAlasanReject, onConfirm } =
    props;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {confirmMode === "approve" ? (
              <>
                <CheckCircle className="h-5 w-5 text-green-600" />
                Konfirmasi Persetujuan SPP
              </>
            ) : (
              <>
                <XCircle className="h-5 w-5 text-red-600" />
                Konfirmasi Penolakan SPP
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {confirmMode === "approve"
              ? "Anda akan menyetujui SPP ini. Pastikan semua informasi telah diverifikasi."
              : "Anda akan menolak SPP ini. Berikan alasan penolakan untuk pengaju."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {selectedSPP && (
            <Card className="border-l-4 border-l-primary">
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Nomor SPP</p>
                <p className="font-semibold">{selectedSPP.nomor}</p>
                <p className="text-sm text-muted-foreground mt-2">Jumlah</p>
                <p className="text-lg font-bold text-primary">
                  {formatRupiah(selectedSPP.jumlah)}
                </p>
              </CardContent>
            </Card>
          )}

          {confirmMode === "reject" && (
            <div>
              <p className="text-sm text-muted-foreground mb-2">Alasan Penolakan *</p>
              <Textarea
                value={alasanReject}
                onChange={(e) => setAlasanReject(e.target.value)}
                rows={4}
                placeholder="Jelaskan alasan penolakan SPP ini..."
                className="resize-none"
              />
            </div>
          )}

          <div className="flex gap-2 pt-4 border-t">
            {confirmMode === "approve" ? (
              <Button
                className="flex-1 gap-2 bg-green-600 hover:bg-green-700"
                onClick={() => void onConfirm()}
              >
                <CheckCircle className="h-4 w-4" />
                Ya, Setujui
              </Button>
            ) : (
              <Button
                variant="destructive"
                className="flex-1 gap-2"
                onClick={() => void onConfirm()}
                disabled={!alasanReject.trim()}
              >
                <XCircle className="h-4 w-4" />
                Ya, Tolak
              </Button>
            )}
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

