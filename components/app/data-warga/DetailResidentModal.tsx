/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { calculateAge } from "@/utils";
import { Resident } from "@prisma/client";

interface DetailResidentModalProps {
  resident: Resident | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const DetailResidentModal: React.FC<DetailResidentModalProps> = ({
  resident,
  open,
  onOpenChange,
}) => {
  if (!resident) return null;

  const age = calculateAge(resident.birthDate as any);

  console.log(resident);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Detail Data Warga</DialogTitle>
          <DialogDescription>
            Informasi lengkap data warga yang terdaftar
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Identitas Diri */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">
              Identitas Diri
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-muted-foreground text-xs">
                  Nama Lengkap
                </Label>
                <p className="font-medium text-base">{resident.name}</p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-muted-foreground text-xs">NIK</Label>
                <p className="font-mono text-sm">{resident.nik}</p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-muted-foreground text-xs">No. KK</Label>
                <p className="font-mono text-sm">{resident.kk || "-"}</p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-muted-foreground text-xs">
                  Jenis Kelamin
                </Label>
                <div>
                  <Badge
                    variant={
                      resident.gender === "Laki-laki" ? "default" : "secondary"
                    }
                  >
                    {resident.gender}
                  </Badge>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-muted-foreground text-xs">
                  Tempat Lahir
                </Label>
                <p className="text-sm">{resident.birthplace}</p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-muted-foreground text-xs">
                  Tanggal Lahir
                </Label>
                <p className="text-sm">
                  {new Date(resident.birthDate).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}{" "}
                  <span className="text-muted-foreground">({age} Tahun)</span>
                </p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-muted-foreground text-xs">Agama</Label>
                <p className="text-sm">{resident.religion}</p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-muted-foreground text-xs">
                  Golongan Darah
                </Label>
                <p className="text-sm">{resident.bloodType || "-"}</p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-muted-foreground text-xs">
                  Kewarganegaraan
                </Label>
                <p className="text-sm">{resident.nationality}</p>
              </div>
            </div>
          </div>

          {/* Status & Keluarga */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">
              Status & Keluarga
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-muted-foreground text-xs">
                  Status Perkawinan
                </Label>
                <p className="text-sm">{resident.maritalStatus}</p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-muted-foreground text-xs">
                  Status Hubungan Dalam KK
                </Label>
                <p className="text-sm">{resident.familyRole}</p>
              </div>
            </div>
          </div>

          {/* Pendidikan & Pekerjaan */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">
              Pendidikan & Pekerjaan
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-muted-foreground text-xs">
                  Pendidikan Terakhir
                </Label>
                <p className="text-sm">{resident.education || "-"}</p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-muted-foreground text-xs">
                  Pekerjaan
                </Label>
                <p className="text-sm">{resident.occupation || "-"}</p>
              </div>
            </div>
          </div>

          {/* Alamat */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">Alamat</h3>
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-1.5">
                <Label className="text-muted-foreground text-xs">
                  Alamat Lengkap
                </Label>
                <p className="text-sm">{resident.address}</p>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-muted-foreground text-xs">RT</Label>
                  <p className="text-sm">{resident.rt || "-"}</p>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-muted-foreground text-xs">RW</Label>
                  <p className="text-sm">{resident.rw || "-"}</p>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-muted-foreground text-xs">Dusun</Label>
                  <p className="text-sm">{resident.hamlet || "-"}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Kontak */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">Kontak</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-muted-foreground text-xs">
                  No. Telepon
                </Label>
                <p className="text-sm">{resident.phone || "-"}</p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-muted-foreground text-xs">Email</Label>
                <p className="text-sm">{resident.email || "-"}</p>
              </div>
            </div>
          </div>

          {/* Status Kependudukan */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">
              Status Kependudukan
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-muted-foreground text-xs">Status</Label>
                <div>
                  <Badge variant={resident.isAlive ? "default" : "secondary"}>
                    {resident.isAlive ? "Hidup" : "Meninggal"}
                  </Badge>
                </div>
              </div>
              {resident.moveDate && (
                <div className="space-y-1.5">
                  <Label className="text-muted-foreground text-xs">
                    Tanggal Pindah
                  </Label>
                  <p className="text-sm">
                    {new Date(resident.moveDate).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                </div>
              )}
              {resident.deathDate && (
                <div className="space-y-1.5">
                  <Label className="text-muted-foreground text-xs">
                    Tanggal Meninggal
                  </Label>
                  <p className="text-sm">
                    {new Date(resident.deathDate).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Informasi Sistem */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">
              Informasi Sistem
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-muted-foreground text-xs">
                  Dibuat Pada
                </Label>
                <p className="text-xs text-muted-foreground">
                  {new Date(resident.createdAt).toLocaleString("id-ID", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-muted-foreground text-xs">
                  Terakhir Diupdate
                </Label>
                <p className="text-xs text-muted-foreground">
                  {new Date(resident.updatedAt).toLocaleString("id-ID", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
