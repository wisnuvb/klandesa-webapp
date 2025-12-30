"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
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
import {
  FormInput,
  FormSelect,
  FormDateInput,
} from "@/components/ui/form-fields";
import {
  BLOOD_TYPE_OPTIONS,
  EDUCATION_OPTIONS,
  JOB_OPTIONS,
  KK_RELATIONSHIP_STATUS,
  MARITAL_STATUS_OPTIONS,
  RELIGION_OPTIONS,
} from "@/utils/constants/user";

interface AddResidentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

// Helper to convert option records to array of {value,label}
function toOptionsArray(record: Record<string, string>) {
  return Object.entries(record).map(([value, label]) => ({ value, label }));
}

type AddResidentFormValues = {
  name: string;
  id_number: string;
  family_card_number: string;
  gender: "M" | "F";
  birthplace: string;
  date_of_birth: string;
  blood_type_id: string;
  religion_id: string;
  marital_status: string;
  status_family_id: string;
  address: string;
  rt: string;
  rw: string;
  hamlet: string;
  education_id: string;
  job_id: string;
  phone_number: string;
  email: string;
  is_live: "Y" | "N";
};

export const AddResidentModal: React.FC<AddResidentModalProps> = ({
  open,
  onOpenChange,
  onSuccess,
}) => {
  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<AddResidentFormValues>({
    defaultValues: {
      name: "",
      id_number: "",
      family_card_number: "",
      gender: "M",
      birthplace: "",
      date_of_birth: "",
      blood_type_id: "",
      religion_id: "",
      marital_status: "",
      status_family_id: "",
      address: "",
      rt: "",
      rw: "",
      hamlet: "",
      education_id: "",
      job_id: "",
      phone_number: "",
      email: "",
      is_live: "Y",
    },
  });

  useEffect(() => {
    if (!open) {
      reset();
    }
  }, [open, reset]);

  const onSubmit = async (data: AddResidentFormValues) => {
    // Basic client-side validation
    if (!String(data.name).trim()) {
      toast.error("Nama wajib diisi");
      return;
    }
    if (
      !String(data.id_number).trim() ||
      String(data.id_number).length !== 16
    ) {
      toast.error("NIK harus 16 digit");
      return;
    }
    if (!String(data.birthplace).trim()) {
      toast.error("Tempat lahir wajib diisi");
      return;
    }
    if (!String(data.date_of_birth).trim()) {
      toast.error("Tanggal lahir wajib diisi");
      return;
    }
    if (!String(data.address).trim()) {
      toast.error("Alamat wajib diisi");
      return;
    }

    try {
      const response = await fetch(`/api/residents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await response.json();
      if (!response.ok) {
        toast.error(result.error || "Gagal menambah data");
        return;
      }
      toast.success("Data warga berhasil ditambahkan");
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error("Create resident error:", error);
      toast.error("Gagal menghubungi server");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Tambah Data Warga</DialogTitle>
          <DialogDescription>
            Isi informasi data warga. Field dengan tanda * wajib diisi.
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
                name="id_number"
                control={control}
                label="NIK"
                placeholder="16 digit NIK"
                maxLength={16}
                className="font-mono"
                required
              />
              <FormInput
                name="family_card_number"
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
                name="date_of_birth"
                control={control}
                label="Tanggal Lahir"
                required
              />
              <FormSelect
                name="religion_id"
                control={control}
                label="Agama"
                placeholder="Pilih agama"
                options={toOptionsArray(RELIGION_OPTIONS)}
              />
              <FormSelect
                name="blood_type_id"
                control={control}
                label="Golongan Darah"
                placeholder="Pilih golongan darah"
                options={toOptionsArray(BLOOD_TYPE_OPTIONS)}
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
                name="marital_status"
                control={control}
                label="Status Perkawinan"
                placeholder="Pilih status perkawinan"
                options={toOptionsArray(MARITAL_STATUS_OPTIONS)}
              />
              <FormSelect
                name="status_family_id"
                control={control}
                label="Status Hubungan Dalam KK"
                placeholder="Pilih status hubungan"
                options={toOptionsArray(KK_RELATIONSHIP_STATUS)}
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

          {/* Pendidikan & Pekerjaan */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">
              Pendidikan & Pekerjaan
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormSelect
                name="education_id"
                control={control}
                label="Pendidikan Terakhir"
                placeholder="Pilih pendidikan"
                options={toOptionsArray(EDUCATION_OPTIONS)}
              />
              <FormSelect
                name="job_id"
                control={control}
                label="Pekerjaan"
                placeholder="Pilih pekerjaan"
                options={toOptionsArray(JOB_OPTIONS)}
              />
            </div>
          </div>

          {/* Kontak */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">Kontak</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormInput
                name="phone_number"
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
                name="is_live"
                control={control}
                label="Status"
                options={[
                  { value: "Y", label: "Hidup" },
                  { value: "N", label: "Meninggal" },
                ]}
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
                "Simpan"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
