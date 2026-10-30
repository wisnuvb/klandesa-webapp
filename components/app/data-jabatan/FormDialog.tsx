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
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

export type JabatanFormTarget = {
  id: number;
  name: string;
  level: number;
  description: string | null;
  salary: number | null;
  allowance: number | null;
  isActive: boolean;
};

interface FormDialogProps {
  showFormDialog: boolean;
  setShowFormDialog: (value: boolean) => void;
  /** Bila diisi, dialog berada dalam mode ubah; bila kosong, mode tambah. */
  jabatan?: JabatanFormTarget | null;
  onSuccess?: () => void;
}

type FormValues = {
  name: string;
  level: string;
  description: string;
  salary: string;
  allowance: string;
  isActive: string;
};

const EMPTY_VALUES: FormValues = {
  name: "",
  level: "3",
  description: "",
  salary: "",
  allowance: "",
  isActive: "true",
};

function toFormValues(jabatan?: JabatanFormTarget | null): FormValues {
  if (!jabatan) return EMPTY_VALUES;
  return {
    name: jabatan.name,
    level: String(jabatan.level),
    description: jabatan.description ?? "",
    salary: jabatan.salary == null ? "" : String(jabatan.salary),
    allowance: jabatan.allowance == null ? "" : String(jabatan.allowance),
    isActive: jabatan.isActive ? "true" : "false",
  };
}

export const FormDialog: React.FC<FormDialogProps> = ({
  showFormDialog,
  setShowFormDialog,
  jabatan,
  onSuccess,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const isEdit = Boolean(jabatan);

  const form = useForm<FormValues>({ defaultValues: EMPTY_VALUES });

  // Isi ulang setiap dialog dibuka agar tidak membawa sisa input/edit sebelumnya.
  useEffect(() => {
    if (showFormDialog) form.reset(toFormValues(jabatan));
  }, [showFormDialog, jabatan, form]);

  const onSubmit = async (values: FormValues) => {
    try {
      setIsLoading(true);
      const response = await fetch(
        isEdit ? `/api/positions/${jabatan!.id}` : "/api/positions",
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: values.name,
            level: values.level,
            description: values.description,
            salary: values.salary || null,
            allowance: values.allowance || null,
            isActive: values.isActive === "true",
          }),
        },
      );

      if (!response.ok) {
        const error: { error?: string } | null = await response
          .json()
          .catch(() => null);
        throw new Error(
          error?.error ||
            (isEdit ? "Gagal memperbarui jabatan" : "Gagal menambahkan jabatan"),
        );
      }

      toast.success(
        isEdit ? "Jabatan berhasil diperbarui" : "Jabatan berhasil ditambahkan",
      );
      setShowFormDialog(false);
      onSuccess?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Terjadi kesalahan";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog
      open={showFormDialog}
      onOpenChange={(open) => {
        // Cegah tertutup (Esc/klik luar) saat simpan berjalan agar hasil tidak hilang tanpa umpan balik.
        if (!isLoading) setShowFormDialog(open);
      }}
    >
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Ubah Jabatan" : "Tambah Jabatan"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Perbarui detail jabatan perangkat desa."
              : "Masukkan detail jabatan perangkat desa baru."}
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
                rules={{ required: "Nama jabatan wajib diisi" }}
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Nama Jabatan</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Contoh: Kepala Urusan Keuangan"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="level"
                rules={{ required: "Level wajib dipilih" }}
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Level Jabatan</FormLabel>
                    <FormControl>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Pilih Level" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">Level 1 - Pimpinan</SelectItem>
                          <SelectItem value="2">
                            Level 2 - Sekretariat
                          </SelectItem>
                          <SelectItem value="3">Level 3 - Kaur/Kasi</SelectItem>
                          <SelectItem value="4">
                            Level 4 - Kepala Dusun
                          </SelectItem>
                          <SelectItem value="5">Level 5 - Staf</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Deskripsi</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Uraian tugas dan tanggung jawab jabatan"
                        {...field}
                        rows={3}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="salary"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gaji Pokok (Rp)</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} inputMode="numeric" placeholder="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="allowance"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tunjangan (Rp)</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} inputMode="numeric" placeholder="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isActive"
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
                          <SelectItem value="true">Aktif</SelectItem>
                          <SelectItem value="false">Tidak Aktif</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
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
                {isLoading ? "Menyimpan..." : isEdit ? "Simpan Perubahan" : "Simpan"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
