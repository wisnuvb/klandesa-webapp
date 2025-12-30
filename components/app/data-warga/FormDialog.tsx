"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  BLOOD_TYPE_OPTIONS,
  EDUCATION_OPTIONS,
  KK_RELATIONSHIP_STATUS,
  MARITAL_STATUS_OPTIONS,
  RELIGION_OPTIONS,
} from "@/utils/constants/user";
import Image from "next/image";
import { useState } from "react";
import { toast } from "sonner";

interface FormDialogProps {
  showFormDialog: boolean;
  setShowFormDialog: (value: boolean) => void;
}

export const FormDialog: React.FC<FormDialogProps> = ({
  showFormDialog,
  setShowFormDialog,
}) => {
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    villageCode: "DESA001",
    name: "",
    id_number: "",
    family_card_number: "",
    status_family_id: "1",
    rt: "0",
    rw: "0",
    hamlet: "",
    address: "",
    gender: "M",
    marital_status: "S",
    birthplace: "",
    date_of_birth: "",
    religion_id: "1",
    education_id: "1",
    job_id: "1",
    blood_type_id: "",
    income: "0",
    phone_number: "",
    email: "",
    is_bpjs_kis: "Y",
    is_live: "Y",
    height: "0",
    weight: "0",
  });

  const handleCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCoverPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    try {
      const res = await fetch("/api/residents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error ?? "Gagal menyimpan data");
        return;
      }
      toast.success("Data berhasil disimpan");
      setShowFormDialog(false);
    } catch (e) {
      console.error(e);
      toast.error("Terjadi kesalahan jaringan");
    }
  };
  return (
    <Dialog open={showFormDialog} onOpenChange={setShowFormDialog}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Tambah Data Warga</DialogTitle>
          <DialogDescription>
            Masukkan detail data warga baru.
          </DialogDescription>
        </DialogHeader>
        <div className="overflow-y-auto flex-1 px-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="name">Nama</Label>
              <Input
                id="name"
                placeholder="Nama lengkap"
                className="col-span-2"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>
            <div className="col-span-2">
              <Label htmlFor="id_number">NIK</Label>
              <Input
                id="id_number"
                placeholder="Nomor Induk Kependudukan"
                className="col-span-2"
                value={formData.id_number}
                onChange={(e) =>
                  setFormData({ ...formData, id_number: e.target.value })
                }
              />
            </div>
            <div className="col-span-2">
              <Label htmlFor="family_card_number">No. KK</Label>
              <Input
                id="family_card_number"
                placeholder="Nomor Kartu Keluarga"
                className="col-span-2"
                value={formData.family_card_number}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    family_card_number: e.target.value,
                  })
                }
              />
            </div>
            <div className="col-span-2">
              <Label htmlFor="status_family_id">Status Keluarga</Label>
              <Select
                id="status_family_id"
                value={formData.status_family_id}
                onValueChange={(value) =>
                  setFormData({ ...formData, status_family_id: value })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih status keluarga" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(KK_RELATIONSHIP_STATUS).map(([id, name]) => (
                    <SelectItem key={id} value={id}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label htmlFor="rt">RT</Label>
              <Input
                id="rt"
                placeholder="Rukun Tetangga"
                className="col-span-2"
                value={formData.rt}
                onChange={(e) =>
                  setFormData({ ...formData, rt: e.target.value })
                }
              />
            </div>
            <div className="col-span-2">
              <Label htmlFor="rw">RW</Label>
              <Input
                id="rw"
                placeholder="Rukun Warga"
                className="col-span-2"
                value={formData.rw}
                onChange={(e) =>
                  setFormData({ ...formData, rw: e.target.value })
                }
              />
            </div>
            <div className="col-span-2">
              <Label htmlFor="hamlet">Dusun</Label>
              <Input
                id="hamlet"
                placeholder="Nama dusun"
                className="col-span-2"
                value={formData.hamlet}
                onChange={(e) =>
                  setFormData({ ...formData, hamlet: e.target.value })
                }
              />
            </div>
            <div className="col-span-2">
              <Label htmlFor="address">Alamat</Label>
              <Textarea
                id="address"
                placeholder="Alamat lengkap"
                className="col-span-2"
                value={formData.address}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
              />
            </div>
            <div className="col-span-2">
              <Label htmlFor="gender">Jenis Kelamin</Label>
              <Select
                id="gender"
                value={formData.gender}
                onValueChange={(value) =>
                  setFormData({ ...formData, gender: value })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih jenis kelamin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="M">Laki-laki</SelectItem>
                  <SelectItem value="F">Perempuan</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label htmlFor="marital_status">Status Perkawinan</Label>
              <Select
                id="marital_status"
                value={formData.marital_status}
                onValueChange={(value) =>
                  setFormData({ ...formData, marital_status: value })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih status perkawinan" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(MARITAL_STATUS_OPTIONS).map(
                    ([code, label]) => (
                      <SelectItem key={code} value={code}>
                        {label}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label htmlFor="birthplace">Tempat Lahir</Label>
              <Input
                id="birthplace"
                placeholder="Tempat lahir"
                className="col-span-2"
                value={formData.birthplace}
                onChange={(e) =>
                  setFormData({ ...formData, birthplace: e.target.value })
                }
              />
            </div>
            <div className="col-span-2">
              <Label htmlFor="date_of_birth">Tanggal Lahir</Label>
              <Input
                id="date_of_birth"
                type="date"
                className="col-span-2"
                value={formData.date_of_birth}
                onChange={(e) =>
                  setFormData({ ...formData, date_of_birth: e.target.value })
                }
              />
            </div>
            <div className="col-span-2">
              <Label htmlFor="religion_id">Agama</Label>
              <Select
                id="religion_id"
                value={formData.religion_id}
                onValueChange={(value) =>
                  setFormData({ ...formData, religion_id: value })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih agama" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(RELIGION_OPTIONS).map(([id, name]) => (
                    <SelectItem key={id} value={name}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label htmlFor="education_id">Pendidikan</Label>
              <Select
                id="education_id"
                value={formData.education_id}
                onValueChange={(value) =>
                  setFormData({ ...formData, education_id: value })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih pendidikan" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(EDUCATION_OPTIONS).map(([id, name]) => (
                    <SelectItem key={id} value={name}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label htmlFor="job_id">Pekerjaan</Label>
              <Select
                id="job_id"
                value={formData.job_id}
                onValueChange={(value) =>
                  setFormData({ ...formData, job_id: value })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih pekerjaan" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(EDUCATION_OPTIONS).map(([id, name]) => (
                    <SelectItem key={id} value={name}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label htmlFor="blood_type_id">Golongan Darah</Label>
              <Select
                id="blood_type_id"
                value={formData.blood_type_id}
                onValueChange={(value) =>
                  setFormData({ ...formData, blood_type_id: value })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih golongan darah" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(BLOOD_TYPE_OPTIONS).map(([id, name]) => (
                    <SelectItem key={id} value={name}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label htmlFor="income">Penghasilan</Label>
              <Input
                id="income"
                type="number"
                placeholder="Penghasilan per bulan"
                className="col-span-2"
                value={formData.income}
                onChange={(e) =>
                  setFormData({ ...formData, income: e.target.value })
                }
              />
            </div>
            <div className="col-span-2">
              <Label htmlFor="phone_number">Nomor Telepon</Label>
              <Input
                id="phone_number"
                placeholder="Nomor telepon"
                className="col-span-2"
                value={formData.phone_number}
                onChange={(e) =>
                  setFormData({ ...formData, phone_number: e.target.value })
                }
              />
            </div>
            <div className="col-span-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Alamat email"
                className="col-span-2"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
              />
            </div>
            <div className="col-span-2">
              <Label htmlFor="is_bpjs_kis">BPJS KIS</Label>
              <Select
                id="is_bpjs_kis"
                value={formData.is_bpjs_kis}
                onValueChange={(value) =>
                  setFormData({ ...formData, is_bpjs_kis: value })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih status BPJS KIS" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Y">Ya</SelectItem>
                  <SelectItem value="N">Tidak</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label htmlFor="is_live">Status Kehidupan</Label>
              <Select
                id="is_live"
                value={formData.is_live}
                onValueChange={(value) =>
                  setFormData({ ...formData, is_live: value })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih status kehidupan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Y">Hidup</SelectItem>
                  <SelectItem value="N">Meninggal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label htmlFor="height">Tinggi Badan</Label>
              <Input
                id="height"
                type="number"
                placeholder="Tinggi badan (cm)"
                className="col-span-2"
                value={formData.height}
                onChange={(e) =>
                  setFormData({ ...formData, height: e.target.value })
                }
              />
            </div>
            <div className="col-span-2">
              <Label htmlFor="weight">Berat Badan</Label>
              <Input
                id="weight"
                type="number"
                placeholder="Berat badan (kg)"
                className="col-span-2"
                value={formData.weight}
                onChange={(e) =>
                  setFormData({ ...formData, weight: e.target.value })
                }
              />
            </div>
            <div className="col-span-2">
              <Label htmlFor="cover">Cover</Label>
              <Input
                id="cover"
                type="file"
                accept="image/*"
                className="col-span-2"
                onChange={handleCoverUpload}
              />
              {coverPreview && (
                <div className="mt-2">
                  <Image
                    src={coverPreview}
                    alt="Cover"
                    className="h-20 w-20 object-cover"
                    width={80}
                    height={80}
                  />
                </div>
              )}
            </div>
            <div className="col-span-2">
              <Label htmlFor="photo">Foto</Label>
              <Input
                id="photo"
                type="file"
                accept="image/*"
                className="col-span-2"
                onChange={handlePhotoUpload}
              />
              {photoPreview && (
                <div className="mt-2">
                  <Image
                    src={photoPreview}
                    alt="Photo"
                    className="h-20 w-20 object-cover"
                    width={80}
                    height={80}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="mt-4 flex justify-end border-t pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowFormDialog(false)}
          >
            Batal
          </Button>
          <Button type="button" className="ml-2" onClick={handleSubmit}>
            Simpan
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
