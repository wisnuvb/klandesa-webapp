"use client";

import { Building2, DollarSign, Droplets, MapPin, Users } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { VillagePotential } from "../_lib/types";

type PotensiDetailDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedPotential: VillagePotential | null;
};

export function PotensiDetailDialog(props: PotensiDetailDialogProps) {
  const { open, onOpenChange, selectedPotential } = props;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto flex flex-col">
        <DialogHeader>
          <DialogTitle>Detail Potensi Desa - Tahun {selectedPotential?.year}</DialogTitle>
          <DialogDescription>
            Informasi lengkap tentang potensi desa untuk tahun {selectedPotential?.year}
          </DialogDescription>
        </DialogHeader>
        <div className="overflow-y-auto flex-1 pr-2">
          <div className="space-y-6">
            <div>
              <h3 className="font-medium mb-3 flex items-center gap-2 text-primary">
                <Users className="h-5 w-5" />
                Demografi
              </h3>
              <div className="grid grid-cols-2 gap-4 bg-muted/50 p-4 rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Jumlah Penduduk</p>
                  <p className="text-xl font-semibold">
                    {selectedPotential?.population.toLocaleString()} Jiwa
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Kepala Keluarga</p>
                  <p className="text-xl font-semibold">
                    {selectedPotential?.households.toLocaleString()} KK
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-medium mb-3 flex items-center gap-2 text-primary">
                <MapPin className="h-5 w-5" />
                Luas Wilayah
              </h3>
              <div className="grid grid-cols-2 gap-4 bg-muted/50 p-4 rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Luas Total</p>
                  <p className="text-xl font-semibold">
                    {selectedPotential?.area.toLocaleString()} Ha
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Lahan Pertanian</p>
                  <p className="text-xl font-semibold">
                    {selectedPotential?.agricultureLand.toLocaleString()} Ha
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Lahan Perkebunan</p>
                  <p className="text-xl font-semibold">
                    {selectedPotential?.plantationLand.toLocaleString()} Ha
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Hutan</p>
                  <p className="text-xl font-semibold">
                    {selectedPotential?.forestArea.toLocaleString()} Ha
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-medium mb-3 flex items-center gap-2 text-primary">
                <Building2 className="h-5 w-5" />
                Fasilitas Umum
              </h3>
              <div className="grid grid-cols-3 gap-4 bg-muted/50 p-4 rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Pendidikan</p>
                  <p className="text-xl font-semibold">
                    {selectedPotential?.educationFacilities} Unit
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Kesehatan</p>
                  <p className="text-xl font-semibold">{selectedPotential?.healthFacilities} Unit</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Objek Wisata</p>
                  <p className="text-xl font-semibold">{selectedPotential?.tourismSpots} Lokasi</p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-medium mb-3 flex items-center gap-2 text-primary">
                <Droplets className="h-5 w-5" />
                Sumber Daya Air
              </h3>
              <div className="bg-muted/50 p-4 rounded-lg">
                <p className="text-sm">{selectedPotential?.waterResources || "-"}</p>
              </div>
            </div>

            <div>
              <h3 className="font-medium mb-3 flex items-center gap-2 text-primary">
                <DollarSign className="h-5 w-5" />
                Potensi Ekonomi
              </h3>
              <div className="bg-muted/50 p-4 rounded-lg">
                <p className="text-sm">{selectedPotential?.economicPotential || "-"}</p>
              </div>
            </div>

            <div className="border-t pt-4">
              <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
                <div>
                  <p>
                    Dibuat:{" "}
                    {selectedPotential?.createdAt
                      ? new Date(selectedPotential.createdAt).toLocaleDateString("id-ID", {
                          dateStyle: "long",
                        })
                      : "-"}
                  </p>
                </div>
                <div>
                  <p>
                    Diperbarui:{" "}
                    {selectedPotential?.updatedAt
                      ? new Date(selectedPotential.updatedAt).toLocaleDateString("id-ID", {
                          dateStyle: "long",
                        })
                      : "-"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t pt-4 mt-4">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Tutup
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

