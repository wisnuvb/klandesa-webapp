/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { removeEmptyFields } from "@/utils";
import {
  FormInput,
  FormSelect,
  FormDateInput,
  FormNumberInput,
} from "@/components/ui/form-fields";
import {
  BLOOD_TYPE_OPTIONS,
  EDUCATION_OPTIONS,
  JOB_OPTIONS,
  KK_RELATIONSHIP_STATUS,
  MARITAL_STATUS_OPTIONS,
  RELIGION_OPTIONS,
} from "@/utils/constants/user";
import { Resident } from "@prisma/client";

interface EditResidentModalProps {
  resident: Resident | null;
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
  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting, dirtyFields },
  } = useForm<Resident>({
    defaultValues: resident || undefined,
  });
  const isAliveVal = useWatch({ control, name: "isAlive" });
  const isPregnantVal = useWatch({ control, name: "isPregnant" });
  const isAliveBool = String(isAliveVal) === "true";
  const isPregnantBool = !!isPregnantVal;

  // Reset form when resident changes
  useEffect(() => {
    if (resident && open) {
      reset({
        ...resident,
        birthDate: resident.birthDate
          ? new Date(resident.birthDate)
          : undefined,
        moveDate: resident.moveDate ? new Date(resident.moveDate) : undefined,
        deathDate: resident.deathDate
          ? new Date(resident.deathDate)
          : undefined,
        datePregnant: resident.datePregnant
          ? new Date(resident.datePregnant)
          : undefined,
        // Convert boolean to string for select
        isAlive: String(resident.isAlive) as any,
      });
    }
  }, [resident, open, reset]);

  const onSubmit = async (data: Resident) => {
    if (!resident) return;

    try {
      // Get only the fields that were modified
      const changedFields = Object.keys(dirtyFields).reduce((acc, key) => {
        let value = data[key as keyof Resident] as any;

        // Convert string back to boolean for isAlive
        if (key === "isAlive") {
          value = value === "true" || value === true;
        }

        acc[key as keyof Resident] = value;
        return acc;
      }, {} as Partial<Resident>);

      // Remove empty fields
      const cleanedData = removeEmptyFields(changedFields, {
        removeEmptyStrings: true,
        removeZero: false,
        removeFalse: false,
        removeNull: true,
      });

      // If no fields changed, just close modal
      if (Object.keys(cleanedData).length === 0) {
        toast.info("Tidak ada perubahan data");
        onOpenChange(false);
        return;
      }

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
    }
  };

  if (!resident) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Edit Data Warga</DialogTitle>
          <DialogDescription>
            Ubah informasi data warga. Field dengan tanda * wajib diisi.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Identitas Diri */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">
              Identitas Diri
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormInput
                name="name"
                control={control}
                label="Nama Lengkap"
                placeholder="Nama lengkap"
                maxLength={255}
                required
              />
              <FormInput
                name="nik"
                control={control}
                label="NIK"
                placeholder="16 digit NIK"
                maxLength={16}
                className="font-mono"
                required
              />
              <FormInput
                name="kk"
                control={control}
                label="No. Kartu Keluarga"
                placeholder="16 digit No. KK"
                maxLength={16}
                className="font-mono"
              />
              <FormSelect
                name="gender"
                control={control}
                label="Jenis Kelamin"
                placeholder="Pilih jenis kelamin"
                options={[
                  { value: "M", label: "Laki-laki" },
                  { value: "F", label: "Perempuan" },
                ]}
                required
              />
              <FormInput
                name="birthplace"
                control={control}
                label="Tempat Lahir"
                placeholder="Tempat lahir"
                maxLength={255}
                required
              />
              <FormDateInput
                name="birthDate"
                control={control}
                label="Tanggal Lahir"
                required
              />
              <FormSelect
                name="religion"
                control={control}
                label="Agama"
                placeholder="Pilih agama"
                options={RELIGION_OPTIONS}
              />
              <FormSelect
                name="bloodType"
                control={control}
                label="Golongan Darah"
                placeholder="Pilih golongan darah"
                options={BLOOD_TYPE_OPTIONS}
              />
              <FormInput
                name="nationality"
                control={control}
                label="Kewarganegaraan"
                placeholder="Kewarganegaraan"
                maxLength={50}
              />
            </div>
          </div>

          {/* Status & Keluarga */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">
              Status & Keluarga
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormSelect
                name="maritalStatus"
                control={control}
                label="Status Perkawinan"
                placeholder="Pilih status perkawinan"
                options={MARITAL_STATUS_OPTIONS}
              />
              <FormSelect
                name="familyRole"
                control={control}
                label="Status Hubungan Dalam KK"
                placeholder="Pilih status hubungan"
                options={KK_RELATIONSHIP_STATUS}
              />
            </div>
          </div>

          {/* Pendidikan & Pekerjaan */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">
              Pendidikan & Pekerjaan
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormSelect
                name="education"
                control={control}
                label="Pendidikan Terakhir"
                placeholder="Pilih pendidikan"
                options={EDUCATION_OPTIONS}
              />
              <FormSelect
                name="occupation"
                control={control}
                label="Pekerjaan"
                placeholder="Pilih pekerjaan"
                options={JOB_OPTIONS}
              />
            </div>
          </div>

          {/* Alamat */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">Alamat</h3>
            <div className="grid grid-cols-1 gap-4">
              <FormInput
                name="address"
                control={control}
                label="Alamat Lengkap"
                placeholder="Alamat lengkap"
                required
              />
              <div className="grid grid-cols-3 gap-4">
                <FormInput
                  name="rt"
                  control={control}
                  label="RT"
                  placeholder="001"
                  maxLength={10}
                />
                <FormInput
                  name="rw"
                  control={control}
                  label="RW"
                  placeholder="002"
                  maxLength={10}
                />
                <FormInput
                  name="hamlet"
                  control={control}
                  label="Dusun"
                  placeholder="Nama dusun"
                  maxLength={100}
                />
              </div>
            </div>
          </div>

          {/* Kontak */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">Kontak</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormInput
                name="phone"
                control={control}
                label="No. Telepon"
                type="tel"
                placeholder="08123456789"
                maxLength={20}
              />
              <FormInput
                name="email"
                control={control}
                label="Email"
                type="email"
                placeholder="email@example.com"
                maxLength={255}
              />
            </div>
          </div>

          {/* Status Kependudukan */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">
              Status Kependudukan
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormSelect
                name="isAlive"
                control={control}
                label="Status"
                options={[
                  { value: "true", label: "Hidup" },
                  { value: "false", label: "Meninggal" },
                ]}
              />
              <FormDateInput
                name="moveDate"
                control={control}
                label="Tanggal Pindah"
              />
              <FormDateInput
                name="deathDate"
                control={control}
                label="Tanggal Meninggal"
                disabled={isAliveBool}
              />
            </div>
          </div>

          {/* Keluarga */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">Keluarga</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormInput
                name="fatherNik"
                control={control}
                label="NIK Ayah"
                placeholder="16 digit"
                maxLength={16}
                className="font-mono"
              />
              <FormInput
                name="fatherName"
                control={control}
                label="Nama Ayah"
                placeholder="Nama ayah"
                maxLength={255}
              />
              <FormInput
                name="motherNik"
                control={control}
                label="NIK Ibu"
                placeholder="16 digit"
                maxLength={16}
                className="font-mono"
              />
              <FormInput
                name="motherName"
                control={control}
                label="Nama Ibu"
                placeholder="Nama ibu"
                maxLength={255}
              />
            </div>
          </div>

          {/* Kesehatan & Sosial */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">
              Kesehatan & Sosial
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormNumberInput
                name="disabilityId"
                control={control}
                label="ID Disabilitas"
                placeholder="Kode disabilitas"
              />
              <FormInput
                name="otherDisability"
                control={control}
                label="Disabilitas Lainnya"
                placeholder="Keterangan"
                maxLength={255}
              />
              <FormDateInput
                name="datePregnant"
                control={control}
                label="Tanggal Hamil"
                disabled={!isPregnantBool}
              />
              <FormInput
                name="contraception"
                control={control}
                label="Kontrasepsi"
                placeholder="IUD, Suntik, dll"
              />
              <FormNumberInput
                name="height"
                control={control}
                label="Tinggi Badan (cm)"
                placeholder="170"
              />
              <FormNumberInput
                name="weight"
                control={control}
                label="Berat Badan (kg)"
                placeholder="60"
              />
              <FormNumberInput
                name="income"
                control={control}
                label="Pendapatan"
                placeholder="0"
              />
            </div>
          </div>

          {/* Media */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">Media</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormInput
                name="cover"
                control={control}
                label="Cover URL"
                placeholder="https://..."
              />
              <FormInput
                name="coverThumb"
                control={control}
                label="Cover Thumb URL"
                placeholder="https://..."
              />
              <FormInput
                name="photo"
                control={control}
                label="Foto URL"
                placeholder="https://..."
              />
              <FormInput
                name="photoThumb"
                control={control}
                label="Foto Thumb URL"
                placeholder="https://..."
              />
            </div>
          </div>

          {/* Lainnya */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">Lainnya</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormInput
                name="countryCode"
                control={control}
                label="Kode Negara"
                placeholder="ID"
                maxLength={10}
              />
              <FormInput
                name="tempIdNumber"
                control={control}
                label="NIK Sementara"
                placeholder="NIK sementara"
                maxLength={20}
              />
              <FormInput
                name="tempRt"
                control={control}
                label="RT Sementara"
                placeholder="RT sementara"
                maxLength={10}
              />
              <FormInput
                name="houseOwnership"
                control={control}
                label="Kepemilikan Rumah"
                placeholder="Milik sendiri, sewa, dll"
                maxLength={100}
              />
              <FormInput
                name="desil"
                control={control}
                label="Desil"
                placeholder="Desil ekonomi"
                maxLength={50}
              />
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
  );
};
