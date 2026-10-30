"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  PieChart,
  TrendingUp,
  Wallet,
} from "lucide-react";
import type { BudgetFormData } from "../_lib/types";

type BudgetFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formData: BudgetFormData;
  setFormData: (next: BudgetFormData) => void;
  onSubmit: () => void;
};

export function BudgetFormDialog(props: BudgetFormDialogProps) {
  const { open, onOpenChange, formData, setFormData, onSubmit } = props;

  const setField = (key: keyof BudgetFormData, value: string) => {
    setFormData({ ...formData, [key]: value });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Tambah Data Anggaran Desa</DialogTitle>
          <DialogDescription>
            Masukkan data anggaran dan realisasi untuk tahun tertentu.
          </DialogDescription>
        </DialogHeader>
        <div className="overflow-y-auto flex-1 pr-2">
          <div className="space-y-6">
            <div>
              <Label htmlFor="year">Tahun Anggaran</Label>
              <Input
                id="year"
                type="number"
                placeholder="2024"
                value={formData.year}
                onChange={(e) => setField("year", e.target.value)}
              />
            </div>

            <div className="border-t pt-4">
              <h3 className="font-medium mb-4 flex items-center gap-2 text-green-600">
                <TrendingUp className="h-5 w-5" />
                Pendapatan
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="revenue">Total Pendapatan</Label>
                  <CurrencyInput
                    id="revenue"
                    placeholder="0"
                    value={formData.revenue}
                    onValueChange={(v) => setField("revenue", v)}
                  />
                </div>
                <div>
                  <Label htmlFor="government_fund">Dana Pemerintah Pusat</Label>
                  <CurrencyInput
                    id="government_fund"
                    placeholder="0"
                    value={formData.government_fund}
                    onValueChange={(v) => setField("government_fund", v)}
                  />
                </div>
                <div>
                  <Label htmlFor="province_fund">Dana Provinsi</Label>
                  <CurrencyInput
                    id="province_fund"
                    placeholder="0"
                    value={formData.province_fund}
                    onValueChange={(v) => setField("province_fund", v)}
                  />
                </div>
                <div>
                  <Label htmlFor="district_fund">Dana Kabupaten</Label>
                  <CurrencyInput
                    id="district_fund"
                    placeholder="0"
                    value={formData.district_fund}
                    onValueChange={(v) => setField("district_fund", v)}
                  />
                </div>
                <div>
                  <Label htmlFor="local_income">Pendapatan Asli Desa</Label>
                  <CurrencyInput
                    id="local_income"
                    placeholder="0"
                    value={formData.local_income}
                    onValueChange={(v) => setField("local_income", v)}
                  />
                </div>
                <div>
                  <Label htmlFor="community_contribution">Kontribusi Masyarakat</Label>
                  <CurrencyInput
                    id="community_contribution"
                    placeholder="0"
                    value={formData.community_contribution}
                    onValueChange={(v) => setField("community_contribution", v)}
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="private_sector_contribution">Kontribusi Swasta</Label>
                  <CurrencyInput
                    id="private_sector_contribution"
                    placeholder="0"
                    value={formData.private_sector_contribution}
                    onValueChange={(v) => setField("private_sector_contribution", v)}
                  />
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="font-medium mb-4 flex items-center gap-2 text-blue-600">
                <Wallet className="h-5 w-5" />
                Anggaran Per Sektor
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="employee_budget">Belanja Pegawai</Label>
                  <CurrencyInput
                    id="employee_budget"
                    placeholder="0"
                    value={formData.employee_budget}
                    onValueChange={(v) => setField("employee_budget", v)}
                  />
                </div>
                <div>
                  <Label htmlFor="infrastructure_budget">Infrastruktur & Pembangunan</Label>
                  <CurrencyInput
                    id="infrastructure_budget"
                    placeholder="0"
                    value={formData.infrastructure_budget}
                    onValueChange={(v) => setField("infrastructure_budget", v)}
                  />
                </div>
                <div>
                  <Label htmlFor="health_budget">Kesehatan</Label>
                  <CurrencyInput
                    id="health_budget"
                    placeholder="0"
                    value={formData.health_budget}
                    onValueChange={(v) => setField("health_budget", v)}
                  />
                </div>
                <div>
                  <Label htmlFor="education_budget">Pendidikan</Label>
                  <CurrencyInput
                    id="education_budget"
                    placeholder="0"
                    value={formData.education_budget}
                    onValueChange={(v) => setField("education_budget", v)}
                  />
                </div>
                <div>
                  <Label htmlFor="agriculture_budget">Pertanian & Ekonomi</Label>
                  <CurrencyInput
                    id="agriculture_budget"
                    placeholder="0"
                    value={formData.agriculture_budget}
                    onValueChange={(v) => setField("agriculture_budget", v)}
                  />
                </div>
                <div>
                  <Label htmlFor="social_budget">Sosial & Kemasyarakatan</Label>
                  <CurrencyInput
                    id="social_budget"
                    placeholder="0"
                    value={formData.social_budget}
                    onValueChange={(v) => setField("social_budget", v)}
                  />
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="font-medium mb-4 flex items-center gap-2 text-orange-600">
                <PieChart className="h-5 w-5" />
                Realisasi Per Sektor
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="employee_realization">Belanja Pegawai</Label>
                  <CurrencyInput
                    id="employee_realization"
                    placeholder="0"
                    value={formData.employee_realization}
                    onValueChange={(v) => setField("employee_realization", v)}
                  />
                </div>
                <div>
                  <Label htmlFor="infrastructure_realization">Infrastruktur & Pembangunan</Label>
                  <CurrencyInput
                    id="infrastructure_realization"
                    placeholder="0"
                    value={formData.infrastructure_realization}
                    onValueChange={(v) => setField("infrastructure_realization", v)}
                  />
                </div>
                <div>
                  <Label htmlFor="health_realization">Kesehatan</Label>
                  <CurrencyInput
                    id="health_realization"
                    placeholder="0"
                    value={formData.health_realization}
                    onValueChange={(v) => setField("health_realization", v)}
                  />
                </div>
                <div>
                  <Label htmlFor="education_realization">Pendidikan</Label>
                  <CurrencyInput
                    id="education_realization"
                    placeholder="0"
                    value={formData.education_realization}
                    onValueChange={(v) => setField("education_realization", v)}
                  />
                </div>
                <div>
                  <Label htmlFor="agriculture_realization">Pertanian & Ekonomi</Label>
                  <CurrencyInput
                    id="agriculture_realization"
                    placeholder="0"
                    value={formData.agriculture_realization}
                    onValueChange={(v) => setField("agriculture_realization", v)}
                  />
                </div>
                <div>
                  <Label htmlFor="social_realization">Sosial & Kemasyarakatan</Label>
                  <CurrencyInput
                    id="social_realization"
                    placeholder="0"
                    value={formData.social_realization}
                    onValueChange={(v) => setField("social_realization", v)}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t pt-4 mt-4">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button type="button" onClick={onSubmit}>
            Simpan
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

