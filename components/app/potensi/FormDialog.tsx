/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Users, MapPin, Building2, DollarSign } from "lucide-react";

interface FormDialogProps {
  showFormDialog: boolean;
  setShowFormDialog: (show: boolean) => void;
  onSuccess: () => void;
}

interface VillagePotentialFormData {
  year: string;
  population: string;
  households: string;
  area: string;
  agricultureLand: string;
  plantationLand: string;
  forestArea: string;
  educationFacilities: string;
  healthFacilities: string;
  tourismSpots: string;
  waterResources: string;
  economicPotential: string;
}

export function FormDialog({
  showFormDialog,
  setShowFormDialog,
  onSuccess,
}: FormDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<VillagePotentialFormData>({
    defaultValues: {
      year: new Date().getFullYear().toString(),
      population: "",
      households: "",
      area: "",
      agricultureLand: "",
      plantationLand: "",
      forestArea: "",
      educationFacilities: "",
      healthFacilities: "",
      tourismSpots: "",
      waterResources: "",
      economicPotential: "",
    },
  });

  const onSubmit = async (data: VillagePotentialFormData) => {
    try {
      setIsSubmitting(true);

      const response = await fetch("/api/village-potentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create village potential");
      }

      toast.success("Data potensi desa berhasil disimpan");
      form.reset();
      setShowFormDialog(false);
      onSuccess();
    } catch (error: any) {
      console.error("Error saving village potential:", error);
      toast.error(error.message || "Gagal menyimpan data potensi desa");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={showFormDialog} onOpenChange={setShowFormDialog}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Tambah Data Potensi Desa</DialogTitle>
          <DialogDescription>
            Masukkan data potensi desa untuk tahun tertentu.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="overflow-y-auto flex-1 pr-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <FormField
                    control={form.control}
                    name="year"
                    rules={{ required: "Tahun harus diisi" }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tahun</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="2024" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="col-span-2 border-t pt-4 mt-2">
                  <h3 className="font-medium mb-4 flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Demografi
                  </h3>
                </div>

                <FormField
                  control={form.control}
                  name="population"
                  rules={{ required: "Jumlah penduduk harus diisi" }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Jumlah Penduduk</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="households"
                  rules={{ required: "Kepala keluarga harus diisi" }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Kepala Keluarga</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="col-span-2 border-t pt-4 mt-2">
                  <h3 className="font-medium mb-4 flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Luas Wilayah
                  </h3>
                </div>

                <FormField
                  control={form.control}
                  name="area"
                  rules={{ required: "Luas total harus diisi" }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Luas Total (Hektar)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="agricultureLand"
                  rules={{ required: "Lahan pertanian harus diisi" }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Lahan Pertanian (Ha)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="plantationLand"
                  rules={{ required: "Lahan perkebunan harus diisi" }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Lahan Perkebunan (Ha)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="forestArea"
                  rules={{ required: "Hutan harus diisi" }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hutan (Ha)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="col-span-2 border-t pt-4 mt-2">
                  <h3 className="font-medium mb-4 flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Fasilitas
                  </h3>
                </div>

                <FormField
                  control={form.control}
                  name="educationFacilities"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fasilitas Pendidikan</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="healthFacilities"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fasilitas Kesehatan</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="tourismSpots"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Objek Wisata</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="col-span-2 border-t pt-4 mt-2">
                  <h3 className="font-medium mb-4 flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Potensi
                  </h3>
                </div>

                <div className="col-span-2">
                  <FormField
                    control={form.control}
                    name="waterResources"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sumber Daya Air</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Contoh: Sungai Bone, 3 Mata Air, 15 Sumur Bor"
                            rows={3}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="col-span-2">
                  <FormField
                    control={form.control}
                    name="economicPotential"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Potensi Ekonomi</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Contoh: Pertanian Padi, Perkebunan Kelapa Sawit, Peternakan Sapi, Kerajinan Tangan"
                            rows={3}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t pt-4 mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowFormDialog(false)}
                disabled={isSubmitting}
              >
                Batal
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Menyimpan..." : "Simpan"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
