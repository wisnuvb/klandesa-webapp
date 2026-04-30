"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { OfficialRow } from "../_lib/types";

type OfficialDetailDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedOfficial: OfficialRow | null;
};

export function OfficialDetailDialog(props: OfficialDetailDialogProps) {
  const { open, onOpenChange, selectedOfficial } = props;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Detail Perangkat</DialogTitle>
          <DialogDescription>Informasi lengkap perangkat desa.</DialogDescription>
        </DialogHeader>

        {selectedOfficial && (
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-3 gap-3">
              <p className="text-muted-foreground">Nama</p>
              <p className="col-span-2 font-medium">{selectedOfficial.name}</p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <p className="text-muted-foreground">NIK</p>
              <p className="col-span-2">{selectedOfficial.nik}</p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <p className="text-muted-foreground">Jabatan</p>
              <p className="col-span-2">{selectedOfficial.position?.name ?? "-"}</p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <p className="text-muted-foreground">Status</p>
              <p className="col-span-2">
                {selectedOfficial.status?.toLowerCase() === "active" ? "Aktif" : "Tidak Aktif"}
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <p className="text-muted-foreground">Email</p>
              <p className="col-span-2">{selectedOfficial.email || "-"}</p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <p className="text-muted-foreground">Telepon</p>
              <p className="col-span-2">{selectedOfficial.phone || "-"}</p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <p className="text-muted-foreground">Alamat</p>
              <p className="col-span-2">{selectedOfficial.address || "-"}</p>
            </div>
          </div>
        )}

        <div className="flex justify-end pt-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Tutup
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

