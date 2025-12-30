"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { removeEmptyFields } from "@/utils";
import {
  BLOOD_TYPE_OPTIONS,
  EDUCATION_OPTIONS,
  JOB_OPTIONS,
  KK_RELATIONSHIP_STATUS,
  MARITAL_STATUS_OPTIONS,
  RELIGION_OPTIONS,
} from "@/utils/constants/user";

interface ResidentData {
  id: number;
  villageId: number;
  nik: string;
  kk: string | null;
  name: string;
  birthplace: string;
  birthDate: string;
  gender: "M" | "F";
  bloodType: string | null;
  religion: string;
  maritalStatus: string;
  familyRole: string;
  address: string;
  rt: string | null;
  rw: string | null;
  hamlet: string | null;
  occupation: string | null;
  education: string | null;
  nationality: string;
  phone: string | null;
  email: string | null;
  isAlive: boolean;
  moveDate: string | null;
  deathDate: string | null;
  fatherNik?: string | null;
  fatherName?: string | null;
  motherNik?: string | null;
  motherName?: string | null;
  isIlliterate?: boolean;
  isDisability?: boolean;
  disabilityId?: number | null;
  otherDisability?: string | null;
  isPregnant?: boolean;
  datePregnant?: string | null;
  isBreastfeeding?: boolean;
  isStunting?: boolean;
  isBpjsKis?: boolean;
  contraception?: string | null;
  height?: number | null;
  weight?: number | null;
  income?: number | null;
  cover?: string | null;
  coverThumb?: string | null;
  photo?: string | null;
  photoThumb?: string | null;
  countryCode?: string | null;
  tempIdNumber?: string | null;
  tempRt?: string | null;
  houseOwnership?: string | null;
  desil?: string | null;
}

interface EditResidentModalProps {
  resident: ResidentData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export const EditResidentModal: React.FC<EditResidentModalProps> = ({
  resident,
  open,
  onOpenChange,
  onSuccess,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<Partial<ResidentData>>({});

  // Initialize form data when resident changes
  useEffect(() => {
    if (resident) {
      setFormData({
        id: resident.id,
        name: resident.name,
        nik: resident.nik,
        kk: resident.kk,
        gender: resident.gender,
        birthplace: resident.birthplace,
        birthDate: resident.birthDate?.split("T")[0], // Format to YYYY-MM-DD
        bloodType: resident.bloodType,
        religion: resident.religion,
        maritalStatus: resident.maritalStatus,
        familyRole: resident.familyRole,
        address: resident.address,
        rt: resident.rt,
        rw: resident.rw,
        hamlet: resident.hamlet,
        occupation: resident.occupation,
        education: resident.education,
        nationality: resident.nationality,
        phone: resident.phone,
        email: resident.email,
        isAlive: resident.isAlive,
        moveDate: resident.moveDate?.split("T")[0],
        deathDate: resident.deathDate?.split("T")[0],
        // Family
        fatherNik: resident.fatherNik || "",
        fatherName: resident.fatherName || "",
        motherNik: resident.motherNik || "",
        motherName: resident.motherName || "",
        // Health & Social
        isIlliterate: resident.isIlliterate ?? false,
        isDisability: resident.isDisability ?? false,
        disabilityId: resident.disabilityId ?? undefined,
        otherDisability: resident.otherDisability || "",
        isPregnant: resident.isPregnant ?? false,
        datePregnant: resident.datePregnant
          ? resident.datePregnant.split("T")[0]
          : "",
        isBreastfeeding: resident.isBreastfeeding ?? false,
        isStunting: resident.isStunting ?? false,
        isBpjsKis: resident.isBpjsKis ?? false,
        contraception: resident.contraception || "",
        height: resident.height ?? undefined,
        weight: resident.weight ?? undefined,
        income: resident.income ?? undefined,
        // Media
        cover: resident.cover || "",
        coverThumb: resident.coverThumb || "",
        photo: resident.photo || "",
        photoThumb: resident.photoThumb || "",
        // Misc
        countryCode: resident.countryCode || "",
        tempIdNumber: resident.tempIdNumber || "",
        tempRt: resident.tempRt || "",
        houseOwnership: resident.houseOwnership || "",
        desil: resident.desil || "",
      });
    }
  }, [resident]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resident) return;

    // Basic validation
    if (!formData.name?.trim()) {
      toast.error("Nama wajib diisi");
      return;
    }
    if (!formData.nik?.trim() || formData.nik.length !== 16) {
      toast.error("NIK harus 16 digit");
      return;
    }
    if (!formData.birthplace?.trim()) {
      toast.error("Tempat lahir wajib diisi");
      return;
    }
    if (!formData.birthDate) {
      toast.error("Tanggal lahir wajib diisi");
      return;
    }
    if (!formData.address?.trim()) {
      toast.error("Alamat wajib diisi");
      return;
    }

    setIsSubmitting(true);

    try {
      // Remove empty fields before sending
      const cleanedData = removeEmptyFields(formData, {
        removeEmptyStrings: true,
        removeZero: false, // Keep 0 values as they may be intentional
        removeFalse: false, // Keep false as it's a valid boolean value
      });

      const response = await fetch(`/api/residents/${resident.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cleanedData),
      });

      const result = await response.json();

      if (!response.ok) {
        toast.error(result.error || "Gagal mengupdate data");
        return;
      }

      toast.success("Data berhasil diupdate");
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error("Update error:", error);
      toast.error("Gagal menghubungi server");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!resident) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">Edit Data Warga</DialogTitle>
            <DialogDescription>
              Ubah informasi data warga. Field dengan tanda * wajib diisi.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">
                Identitas Diri
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">
                    Nama Lengkap <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="name"
                    value={formData.name || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="Nama lengkap"
                    maxLength={255}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nik">
                    NIK <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="nik"
                    value={formData.nik || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, nik: e.target.value })
                    }
                    placeholder="16 digit NIK"
                    maxLength={16}
                    className="font-mono"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="kk">No. Kartu Keluarga</Label>
                  <Input
                    id="kk"
                    value={formData.kk || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, kk: e.target.value })
                    }
                    placeholder="16 digit No. KK"
                    maxLength={16}
                    className="font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gender">
                    Jenis Kelamin <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={formData.gender || ""}
                    onValueChange={(value: "M" | "F") =>
                      setFormData({ ...formData, gender: value })
                    }
                  >
                    <SelectTrigger id="gender">
                      <SelectValue placeholder="Pilih jenis kelamin" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="M">Laki-laki</SelectItem>
                      <SelectItem value="F">Perempuan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="birthplace">
                    Tempat Lahir <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="birthplace"
                    value={formData.birthplace || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, birthplace: e.target.value })
                    }
                    placeholder="Tempat lahir"
                    maxLength={255}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="birthDate">
                    Tanggal Lahir <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="birthDate"
                    type="date"
                    value={formData.birthDate || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, birthDate: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="religion">Agama</Label>
                  <Select
                    value={formData.religion || ""}
                    onValueChange={(value) =>
                      setFormData({ ...formData, religion: value })
                    }
                  >
                    <SelectTrigger id="religion">
                      <SelectValue placeholder="Pilih agama" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(RELIGION_OPTIONS).map(([id, label]) => (
                        <SelectItem key={id} value={label}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bloodType">Golongan Darah</Label>
                  <Select
                    value={formData.bloodType || ""}
                    onValueChange={(value) =>
                      setFormData({ ...formData, bloodType: value })
                    }
                  >
                    <SelectTrigger id="bloodType">
                      <SelectValue placeholder="Pilih golongan darah" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(BLOOD_TYPE_OPTIONS).map(([id, label]) => (
                        <SelectItem key={id} value={label}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nationality">Kewarganegaraan</Label>
                  <Input
                    id="nationality"
                    value={formData.nationality || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, nationality: e.target.value })
                    }
                    placeholder="Kewarganegaraan"
                    maxLength={50}
                  />
                </div>
              </div>
            </div>

            {/* Status & Keluarga */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">
                Status & Keluarga
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="maritalStatus">Status Perkawinan</Label>
                  <Select
                    value={formData.maritalStatus || ""}
                    onValueChange={(value) =>
                      setFormData({ ...formData, maritalStatus: value })
                    }
                  >
                    <SelectTrigger id="maritalStatus">
                      <SelectValue placeholder="Pilih status perkawinan" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(MARITAL_STATUS_OPTIONS).map(
                        ([code, label]) => (
                          <SelectItem key={code} value={label}>
                            {label}
                          </SelectItem>
                        )
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="familyRole">Status Hubungan Dalam KK</Label>
                  <Select
                    value={formData.familyRole || ""}
                    onValueChange={(value) =>
                      setFormData({ ...formData, familyRole: value })
                    }
                  >
                    <SelectTrigger id="familyRole">
                      <SelectValue placeholder="Pilih status hubungan" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(KK_RELATIONSHIP_STATUS).map(
                        ([id, label]) => (
                          <SelectItem key={id} value={label}>
                            {label}
                          </SelectItem>
                        )
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Pendidikan & Pekerjaan */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">
                Pendidikan & Pekerjaan
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="education">Pendidikan Terakhir</Label>
                  <Select
                    value={formData.education || ""}
                    onValueChange={(value) =>
                      setFormData({ ...formData, education: value })
                    }
                  >
                    <SelectTrigger id="education">
                      <SelectValue placeholder="Pilih pendidikan" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(EDUCATION_OPTIONS).map(([id, label]) => (
                        <SelectItem key={id} value={label}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="occupation">Pekerjaan</Label>
                  <Select
                    value={formData.occupation || ""}
                    onValueChange={(value) =>
                      setFormData({ ...formData, occupation: value })
                    }
                  >
                    <SelectTrigger id="occupation">
                      <SelectValue placeholder="Pilih pekerjaan" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {Object.entries(JOB_OPTIONS).map(([id, label]) => (
                        <SelectItem key={id} value={label}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Alamat */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">Alamat</h3>
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="address">
                    Alamat Lengkap <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="address"
                    value={formData.address || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, address: e.target.value })
                    }
                    placeholder="Alamat lengkap"
                    required
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="rt">RT</Label>
                    <Input
                      id="rt"
                      value={formData.rt || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, rt: e.target.value })
                      }
                      placeholder="001"
                      maxLength={10}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="rw">RW</Label>
                    <Input
                      id="rw"
                      value={formData.rw || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, rw: e.target.value })
                      }
                      placeholder="002"
                      maxLength={10}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hamlet">Dusun</Label>
                    <Input
                      id="hamlet"
                      value={formData.hamlet || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, hamlet: e.target.value })
                      }
                      placeholder="Nama dusun"
                      maxLength={100}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Kontak */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">Kontak</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">No. Telepon</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    placeholder="08123456789"
                    maxLength={20}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    placeholder="email@example.com"
                    maxLength={255}
                  />
                </div>
              </div>
            </div>

            {/* Status Kependudukan */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">
                Status Kependudukan
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="isAlive">Status</Label>
                  <Select
                    value={formData.isAlive ? "true" : "false"}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        isAlive: value === "true",
                      })
                    }
                  >
                    <SelectTrigger id="isAlive">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Hidup</SelectItem>
                      <SelectItem value="false">Meninggal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="moveDate">Tanggal Pindah</Label>
                  <Input
                    id="moveDate"
                    type="date"
                    value={formData.moveDate || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, moveDate: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="deathDate">Tanggal Meninggal</Label>
                  <Input
                    id="deathDate"
                    type="date"
                    value={formData.deathDate || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        deathDate: e.target.value,
                      })
                    }
                    disabled={formData.isAlive}
                  />
                </div>
              </div>
            </div>

            {/* Keluarga */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">Keluarga</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fatherNik">NIK Ayah</Label>
                  <Input
                    id="fatherNik"
                    value={formData.fatherNik || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        fatherNik: e.target.value,
                      })
                    }
                    placeholder="16 digit"
                    maxLength={16}
                    className="font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fatherName">Nama Ayah</Label>
                  <Input
                    id="fatherName"
                    value={formData.fatherName || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        fatherName: e.target.value,
                      })
                    }
                    placeholder="Nama ayah"
                    maxLength={255}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="motherNik">NIK Ibu</Label>
                  <Input
                    id="motherNik"
                    value={formData.motherNik || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        motherNik: e.target.value,
                      })
                    }
                    placeholder="16 digit"
                    maxLength={16}
                    className="font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="motherName">Nama Ibu</Label>
                  <Input
                    id="motherName"
                    value={formData.motherName || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        motherName: e.target.value,
                      })
                    }
                    placeholder="Nama ibu"
                    maxLength={255}
                  />
                </div>
              </div>
            </div>

            {/* Kesehatan & Sosial */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">
                Kesehatan & Sosial
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Buta Huruf</Label>
                  {/* <Select
                  value((formData.isIlliterate ? "true" : "false") as string)
                  onValueChange={(value) => setFormData({ ...formData, isIlliterate: value === "true" })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="false">Tidak</SelectItem>
                    <SelectItem value="true">Ya</SelectItem>
                  </SelectContent>
                </Select> */}
                </div>
                <div className="space-y-2">
                  <Label>Disabilitas</Label>
                  {/* <Select
                  value(((formData as any).isDisability ? "true" : "false") as string)
                  onValueChange={(value) => setFormData({ ...formData, isDisability: value === "true" })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="false">Tidak</SelectItem>
                    <SelectItem value="true">Ya</SelectItem>
                  </SelectContent>
                </Select> */}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="disabilityId">ID Disabilitas</Label>
                  <Input
                    id="disabilityId"
                    value={formData.disabilityId ?? ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        disabilityId: Number(e.target.value) || undefined,
                      })
                    }
                    placeholder="Kode disabilitas"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="otherDisability">Disabilitas Lainnya</Label>
                  <Input
                    id="otherDisability"
                    value={formData.otherDisability || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        otherDisability: e.target.value,
                      })
                    }
                    placeholder="Keterangan"
                    maxLength={255}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Hamil</Label>
                  {/* <Select
                  value(((formData as any).isPregnant ? "true" : "false") as string)
                  onValueChange={(value) => setFormData({ ...formData, isPregnant: value === "true" })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="false">Tidak</SelectItem>
                    <SelectItem value="true">Ya</SelectItem>
                  </SelectContent>
                </Select> */}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="datePregnant">Tanggal Hamil</Label>
                  <Input
                    id="datePregnant"
                    type="date"
                    value={formData.datePregnant || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        datePregnant: e.target.value,
                      })
                    }
                    disabled={!formData.isPregnant}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Menyusui</Label>
                  {/* <Select
                  value(((formData as any).isBreastfeeding ? "true" : "false") as string)
                  onValueChange={(value) => setFormData({ ...formData, isBreastfeeding: value === "true" })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="false">Tidak</SelectItem>
                    <SelectItem value="true">Ya</SelectItem>
                  </SelectContent>
                </Select> */}
                </div>
                <div className="space-y-2">
                  <Label>Stunting</Label>
                  {/* <Select
                  value(((formData as any).isStunting ? "true" : "false") as string)
                  onValueChange={(value) => setFormData({ ...formData, isStunting: value === "true" })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="false">Tidak</SelectItem>
                    <SelectItem value="true">Ya</SelectItem>
                  </SelectContent>
                </Select> */}
                </div>
                <div className="space-y-2">
                  <Label>BPJS KIS</Label>
                  {/* <Select
                  value(((formData as any).isBpjsKis ? "true" : "false") as string)
                  onValueChange={(value) => setFormData({ ...formData, isBpjsKis: value === "true" })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="false">Tidak</SelectItem>
                    <SelectItem value="true">Ya</SelectItem>
                  </SelectContent>
                </Select> */}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contraception">Kontrasepsi</Label>
                  <Input
                    id="contraception"
                    value={formData.contraception || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        contraception: e.target.value,
                      })
                    }
                    placeholder="IUD, Suntik, dll"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="height">Tinggi Badan (cm)</Label>
                  <Input
                    id="height"
                    value={formData.height ?? ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        height: Number(e.target.value) || undefined,
                      })
                    }
                    placeholder="170"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="weight">Berat Badan (kg)</Label>
                  <Input
                    id="weight"
                    value={formData.weight ?? ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        weight: Number(e.target.value) || undefined,
                      })
                    }
                    placeholder="60"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="income">Pendapatan</Label>
                  <Input
                    id="income"
                    value={formData.income ?? ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        income: Number(e.target.value) || undefined,
                      })
                    }
                    placeholder="0"
                  />
                </div>
              </div>
            </div>

            {/* Media */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">Media</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cover">Cover URL</Label>
                  <Input
                    id="cover"
                    value={formData.cover || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, cover: e.target.value })
                    }
                    placeholder="https://..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="coverThumb">Cover Thumb URL</Label>
                  <Input
                    id="coverThumb"
                    value={formData.coverThumb || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        coverThumb: e.target.value,
                      })
                    }
                    placeholder="https://..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="photo">Foto URL</Label>
                  <Input
                    id="photo"
                    value={formData.photo || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, photo: e.target.value })
                    }
                    placeholder="https://..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="photoThumb">Foto Thumb URL</Label>
                  <Input
                    id="photoThumb"
                    value={formData.photoThumb || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        photoThumb: e.target.value,
                      })
                    }
                    placeholder="https://..."
                  />
                </div>
              </div>
            </div>

            {/* Lainnya */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">Lainnya</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="countryCode">Kode Negara</Label>
                  <Input
                    id="countryCode"
                    value={formData.countryCode || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        countryCode: e.target.value,
                      })
                    }
                    placeholder="ID"
                    maxLength={10}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tempIdNumber">NIK Sementara</Label>
                  <Input
                    id="tempIdNumber"
                    value={formData.tempIdNumber || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        tempIdNumber: e.target.value,
                      })
                    }
                    placeholder="NIK sementara"
                    maxLength={20}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tempRt">RT Sementara</Label>
                  <Input
                    id="tempRt"
                    value={formData.tempRt || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, tempRt: e.target.value })
                    }
                    placeholder="RT sementara"
                    maxLength={10}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="houseOwnership">Kepemilikan Rumah</Label>
                  <Input
                    id="houseOwnership"
                    value={formData.houseOwnership || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        houseOwnership: e.target.value,
                      })
                    }
                    placeholder="Milik sendiri, sewa, dll"
                    maxLength={100}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="desil">Desil</Label>
                  <Input
                    id="desil"
                    value={formData.desil || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, desil: e.target.value })
                    }
                    placeholder="Desil ekonomi"
                    maxLength={50}
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Batal
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  "Simpan Perubahan"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};
