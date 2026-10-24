"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  EDUCATION_OPTIONS,
  JOB_OPTIONS,
  KK_RELATIONSHIP_STATUS,
  RELIGION_OPTIONS,
} from "@/utils/constants/user";
import { RotateCcw, SlidersHorizontal } from "lucide-react";

export interface WargaFilters {
  gender: string;
  status: string;
  religion: string;
  education: string;
  occupation: string;
  familyRole: string;
  hamlet: string;
  rt: string;
  rw: string;
  ageMin: string;
  ageMax: string;
  isDisability: string;
  isBpjsKis: string;
  isStunting: string;
  isPregnant: string;
}

export const DEFAULT_FILTERS: WargaFilters = {
  gender: "all",
  status: "all",
  religion: "all",
  education: "all",
  occupation: "all",
  familyRole: "all",
  hamlet: "",
  rt: "",
  rw: "",
  ageMin: "",
  ageMax: "",
  isDisability: "all",
  isBpjsKis: "all",
  isStunting: "all",
  isPregnant: "all",
};

export function countActiveFilters(filters: WargaFilters): number {
  let count = 0;
  if (filters.gender !== "all") count++;
  if (filters.status !== "all") count++;
  if (filters.religion !== "all") count++;
  if (filters.education !== "all") count++;
  if (filters.occupation !== "all") count++;
  if (filters.familyRole !== "all") count++;
  if (filters.hamlet.trim()) count++;
  if (filters.rt.trim()) count++;
  if (filters.rw.trim()) count++;
  if (filters.ageMin) count++;
  if (filters.ageMax) count++;
  if (filters.isDisability !== "all") count++;
  if (filters.isBpjsKis !== "all") count++;
  if (filters.isStunting !== "all") count++;
  if (filters.isPregnant !== "all") count++;
  return count;
}

interface FilterWargaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: WargaFilters;
  onApply: (filters: WargaFilters) => void;
}

export function FilterWargaModal({
  open,
  onOpenChange,
  filters,
  onApply,
}: FilterWargaModalProps) {
  const [local, setLocal] = useState<WargaFilters>(filters);

  function set<K extends keyof WargaFilters>(key: K, value: WargaFilters[K]) {
    setLocal((prev) => ({ ...prev, [key]: value }));
  }

  function handleOpenChange(val: boolean) {
    if (val) setLocal(filters);
    onOpenChange(val);
  }

  function handleApply() {
    onApply(local);
    onOpenChange(false);
  }

  function handleReset() {
    setLocal(DEFAULT_FILTERS);
  }

  const educationKeys = Object.keys(EDUCATION_OPTIONS);
  const jobKeys = Object.keys(JOB_OPTIONS);
  const familyRoleKeys = Object.keys(KK_RELATIONSHIP_STATUS);
  const religionKeys = Object.keys(RELIGION_OPTIONS);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <SlidersHorizontal className="h-5 w-5" />
            Filter Data Warga
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Demografi */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Demografi
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Jenis Kelamin</Label>
                <Select value={local.gender} onValueChange={(v) => set("gender", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Semua" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua</SelectItem>
                    <SelectItem value="Laki-laki">Laki-laki</SelectItem>
                    <SelectItem value="Perempuan">Perempuan</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Status Perkawinan</Label>
                <Select value={local.status} onValueChange={(v) => set("status", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Semua" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua</SelectItem>
                    <SelectItem value="Belum Menikah">Belum Menikah</SelectItem>
                    <SelectItem value="Menikah">Menikah</SelectItem>
                    <SelectItem value="Cerai Hidup">Cerai Hidup</SelectItem>
                    <SelectItem value="Cerai Mati">Cerai Mati</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Agama</Label>
                <Select value={local.religion} onValueChange={(v) => set("religion", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Semua" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua</SelectItem>
                    {religionKeys.map((k) => (
                      <SelectItem key={k} value={k}>
                        {RELIGION_OPTIONS[k]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Peran dalam KK</Label>
                <Select value={local.familyRole} onValueChange={(v) => set("familyRole", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Semua" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua</SelectItem>
                    {familyRoleKeys.map((k) => (
                      <SelectItem key={k} value={k}>
                        {KK_RELATIONSHIP_STATUS[k]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Rentang Usia (Tahun)</Label>
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  min={0}
                  max={150}
                  placeholder="Min"
                  value={local.ageMin}
                  onChange={(e) => set("ageMin", e.target.value)}
                  className="w-24"
                />
                <span className="text-muted-foreground text-sm">—</span>
                <Input
                  type="number"
                  min={0}
                  max={150}
                  placeholder="Max"
                  value={local.ageMax}
                  onChange={(e) => set("ageMax", e.target.value)}
                  className="w-24"
                />
                <span className="text-sm text-muted-foreground">tahun</span>
              </div>
            </div>
          </section>

          <Separator />

          {/* Pendidikan & Pekerjaan */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Pendidikan &amp; Pekerjaan
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Pendidikan Terakhir</Label>
                <Select value={local.education} onValueChange={(v) => set("education", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Semua" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua</SelectItem>
                    {educationKeys.map((k) => (
                      <SelectItem key={k} value={k}>
                        {EDUCATION_OPTIONS[k]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Pekerjaan</Label>
                <Select value={local.occupation} onValueChange={(v) => set("occupation", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Semua" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    <SelectItem value="all">Semua</SelectItem>
                    {jobKeys.map((k) => (
                      <SelectItem key={k} value={k}>
                        {JOB_OPTIONS[k]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </section>

          <Separator />

          {/* Lokasi */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Lokasi
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Dusun</Label>
                <Input
                  placeholder="Nama dusun..."
                  value={local.hamlet}
                  onChange={(e) => set("hamlet", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>RT</Label>
                <Input
                  placeholder="contoh: 001"
                  value={local.rt}
                  onChange={(e) => set("rt", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>RW</Label>
                <Input
                  placeholder="contoh: 002"
                  value={local.rw}
                  onChange={(e) => set("rw", e.target.value)}
                />
              </div>
            </div>
          </section>

          <Separator />

          {/* Kondisi Khusus */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Kondisi Khusus
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Penyandang Disabilitas</Label>
                <Select value={local.isDisability} onValueChange={(v) => set("isDisability", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Semua" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua</SelectItem>
                    <SelectItem value="true">Ya</SelectItem>
                    <SelectItem value="false">Tidak</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Kepesertaan BPJS KIS</Label>
                <Select value={local.isBpjsKis} onValueChange={(v) => set("isBpjsKis", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Semua" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua</SelectItem>
                    <SelectItem value="true">Memiliki BPJS KIS</SelectItem>
                    <SelectItem value="false">Tidak Memiliki</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Stunting</Label>
                <Select value={local.isStunting} onValueChange={(v) => set("isStunting", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Semua" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua</SelectItem>
                    <SelectItem value="true">Stunting</SelectItem>
                    <SelectItem value="false">Tidak Stunting</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Status Kehamilan</Label>
                <Select value={local.isPregnant} onValueChange={(v) => set("isPregnant", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Semua" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua</SelectItem>
                    <SelectItem value="true">Sedang Hamil</SelectItem>
                    <SelectItem value="false">Tidak Hamil</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </section>
        </div>

        <DialogFooter className="flex-row justify-between sm:justify-between">
          <Button variant="ghost" onClick={handleReset} className="gap-2">
            <RotateCcw className="h-4 w-4" />
            Reset Filter
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button onClick={handleApply}>Terapkan Filter</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
