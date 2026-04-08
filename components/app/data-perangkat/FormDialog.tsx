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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { EDUCATION_OPTIONS } from "@/utils/constants/user";

interface FormDialogProps {
  showFormDialog: boolean;
  setShowFormDialog: (value: boolean) => void;
  positions: Position[];
  officials: OfficialOption[];
  onSuccess?: () => void;
}

interface Position {
  id: number;
  name: string;
  level: number;
}

interface OfficialOption {
  id: number;
  name: string;
  position: Position | null;
}

type FormValues = {
  name: string;
  id_number: string;
  email: string;
  phone_number: string;
  gender: "M" | "F";
  birthplace: string;
  date_of_birth: string;
  address: string;
  village_staff_position_id: string;
  supervisor_id: string;
  education_id: string;
  sk_number: string;
  sk_date: string;
  start_date: string;
  status: "ACTIVE" | "INACTIVE";
  photo?: File | null;
};

export const FormDialog: React.FC<FormDialogProps> = ({
  showFormDialog,
  setShowFormDialog,
  positions,
  officials,
  onSuccess,
}) => {
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<FormValues>({
    defaultValues: {
      name: "",
      id_number: "",
      email: "",
      phone_number: "",
      gender: "M",
      birthplace: "",
      date_of_birth: "",
      address: "",
      village_staff_position_id: positions[0]?.id?.toString() ?? "",
      supervisor_id: "none",
      education_id: "1",
      sk_number: "",
      sk_date: "",
      start_date: "",
      status: "ACTIVE",
      photo: null,
    },
  });

  useEffect(() => {
    if (!form.getValues("village_staff_position_id") && positions[0]?.id) {
      form.setValue("village_staff_position_id", positions[0].id.toString());
    }
  }, [positions]);

  const supervisorCandidates = useMemo(() => {
    const selectedPositionId = form.watch("village_staff_position_id");
    const selectedPosition = positions.find(
      (position) => position.id.toString() === selectedPositionId
    );
    const selectedLevel = selectedPosition?.level ?? 5;

    return officials
      .filter((official) => (official.position?.level ?? 5) < selectedLevel)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [form, positions, officials]);

  const handlePhotoUpload = (file: File | null) => {
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setPhotoPreview(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setPhotoPreview(null);
    }
  };

  const onSubmit = async (values: FormValues) => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/officials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: values.name,
          id_number: values.id_number,
          email: values.email,
          phone_number: values.phone_number,
          gender: values.gender,
          birthplace: values.birthplace,
          date_of_birth: values.date_of_birth,
          address: values.address,
          village_staff_position_id: values.village_staff_position_id,
          supervisor_id:
            values.supervisor_id === "none" ? null : Number(values.supervisor_id),
          education_id: values.education_id,
          sk_number: values.sk_number,
          sk_date: values.sk_date,
          start_date: values.start_date,
          status: values.status,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Gagal menambahkan perangkat desa");
      }

      toast.success("Data perangkat berhasil ditambahkan");
      setShowFormDialog(false);
      form.reset({
        name: "",
        id_number: "",
        email: "",
        phone_number: "",
        gender: "M",
        birthplace: "",
        date_of_birth: "",
        address: "",
        village_staff_position_id: positions[0]?.id?.toString() ?? "",
        supervisor_id: "none",
        education_id: "1",
        sk_number: "",
        sk_date: "",
        start_date: "",
        status: "ACTIVE",
        photo: null,
      });
      setPhotoPreview(null);
      onSuccess?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Terjadi kesalahan";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={showFormDialog} onOpenChange={setShowFormDialog}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Tambah Perangkat Desa</DialogTitle>
          <DialogDescription>
            Masukkan detail perangkat desa baru.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="overflow-y-auto flex-1 px-2"
          >
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                rules={{ required: "Nama wajib diisi" }}
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Nama</FormLabel>
                    <FormControl>
                      <Input placeholder="Nama Lengkap" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="id_number"
                rules={{ required: "NIK wajib diisi" }}
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>NIK</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Nomor Induk Kependudukan"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="Alamat Email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone_number"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>No. Telepon</FormLabel>
                    <FormControl>
                      <Input placeholder="Nomor Telepon" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="gender"
                rules={{ required: "Jenis kelamin wajib dipilih" }}
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Jenis Kelamin</FormLabel>
                    <FormControl>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Pilih Jenis Kelamin" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="M">Laki-laki</SelectItem>
                          <SelectItem value="F">Perempuan</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="birthplace"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Tempat Lahir</FormLabel>
                    <FormControl>
                      <Input placeholder="Tempat Lahir" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="date_of_birth"
                rules={{ required: "Tanggal lahir wajib diisi" }}
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Tanggal Lahir</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Alamat</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Alamat Lengkap" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="village_staff_position_id"
                rules={{ required: "Jabatan wajib dipilih" }}
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Jabatan</FormLabel>
                    <FormControl>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Pilih Jabatan" />
                        </SelectTrigger>
                        <SelectContent>
                          {positions.length > 0 ? (
                            positions.map((position) => (
                              <SelectItem
                                key={position.id}
                                value={position.id.toString()}
                              >
                                {position.name}
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="no-positions" disabled>
                              Tidak ada jabatan tersedia
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="supervisor_id"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Atasan Langsung (Opsional)</FormLabel>
                    <FormControl>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Pilih Atasan" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Tidak Ada</SelectItem>
                          {supervisorCandidates.length > 0 ? (
                            supervisorCandidates.map((official) => (
                              <SelectItem
                                key={official.id}
                                value={official.id.toString()}
                              >
                                {`${official.name} - ${official.position?.name ?? "Tanpa Jabatan"}`}
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="no-supervisor" disabled>
                              Belum ada kandidat atasan
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="education_id"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Pendidikan</FormLabel>
                    <FormControl>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Pilih Pendidikan" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(EDUCATION_OPTIONS).map(
                            ([id, name]) => (
                              <SelectItem key={id} value={name}>
                                {name}
                              </SelectItem>
                            )
                          )}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="sk_number"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Nomor SK</FormLabel>
                    <FormControl>
                      <Input placeholder="Nomor Surat Keputusan" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="sk_date"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Tanggal SK</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="start_date"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Tanggal Mulai</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Status</FormLabel>
                    <FormControl>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Pilih Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ACTIVE">Aktif</SelectItem>
                          <SelectItem value="INACTIVE">Tidak Aktif</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="photo"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Foto</FormLabel>
                    <FormControl>
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0] ?? null;
                          field.onChange(file);
                          handlePhotoUpload(file);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                    {photoPreview && (
                      <div className="mt-2">
                        <Image
                          src={photoPreview}
                          alt="Preview"
                          className="w-full h-40 object-cover rounded-md"
                          width={160}
                          height={160}
                        />
                      </div>
                    )}
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-2 border-t pt-4 mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowFormDialog(false)}
                disabled={isLoading}
              >
                Batal
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Menyimpan..." : "Simpan"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
