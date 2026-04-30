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
                  <Input
                    id="revenue"
                    type="number"
                    placeholder="0"
                    value={formData.revenue}
                    onChange={(e) => setField("revenue", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="government_fund">Dana Pemerintah Pusat</Label>
                  <Input
                    id="government_fund"
                    type="number"
                    placeholder="0"
                    value={formData.government_fund}
                    onChange={(e) => setField("government_fund", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="province_fund">Dana Provinsi</Label>
                  <Input
                    id="province_fund"
                    type="number"
                    placeholder="0"
                    value={formData.province_fund}
                    onChange={(e) => setField("province_fund", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="district_fund">Dana Kabupaten</Label>
                  <Input
                    id="district_fund"
                    type="number"
                    placeholder="0"
                    value={formData.district_fund}
                    onChange={(e) => setField("district_fund", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="local_income">Pendapatan Asli Desa</Label>
                  <Input
                    id="local_income"
                    type="number"
                    placeholder="0"
                    value={formData.local_income}
                    onChange={(e) => setField("local_income", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="community_contribution">Kontribusi Masyarakat</Label>
                  <Input
                    id="community_contribution"
                    type="number"
                    placeholder="0"
                    value={formData.community_contribution}
                    onChange={(e) =>
                      setField("community_contribution", e.target.value)
                    }
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="private_sector_contribution">Kontribusi Swasta</Label>
                  <Input
                    id="private_sector_contribution"
                    type="number"
                    placeholder="0"
                    value={formData.private_sector_contribution}
                    onChange={(e) =>
                      setField("private_sector_contribution", e.target.value)
                    }
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
                  <Input
                    id="employee_budget"
                    type="number"
                    placeholder="0"
                    value={formData.employee_budget}
                    onChange={(e) => setField("employee_budget", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="infrastructure_budget">Infrastruktur & Pembangunan</Label>
                  <Input
                    id="infrastructure_budget"
                    type="number"
                    placeholder="0"
                    value={formData.infrastructure_budget}
                    onChange={(e) =>
                      setField("infrastructure_budget", e.target.value)
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="health_budget">Kesehatan</Label>
                  <Input
                    id="health_budget"
                    type="number"
                    placeholder="0"
                    value={formData.health_budget}
                    onChange={(e) => setField("health_budget", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="education_budget">Pendidikan</Label>
                  <Input
                    id="education_budget"
                    type="number"
                    placeholder="0"
                    value={formData.education_budget}
                    onChange={(e) =>
                      setField("education_budget", e.target.value)
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="agriculture_budget">Pertanian & Ekonomi</Label>
                  <Input
                    id="agriculture_budget"
                    type="number"
                    placeholder="0"
                    value={formData.agriculture_budget}
                    onChange={(e) =>
                      setField("agriculture_budget", e.target.value)
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="social_budget">Sosial & Kemasyarakatan</Label>
                  <Input
                    id="social_budget"
                    type="number"
                    placeholder="0"
                    value={formData.social_budget}
                    onChange={(e) => setField("social_budget", e.target.value)}
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
                  <Input
                    id="employee_realization"
                    type="number"
                    placeholder="0"
                    value={formData.employee_realization}
                    onChange={(e) =>
                      setField("employee_realization", e.target.value)
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="infrastructure_realization">Infrastruktur & Pembangunan</Label>
                  <Input
                    id="infrastructure_realization"
                    type="number"
                    placeholder="0"
                    value={formData.infrastructure_realization}
                    onChange={(e) =>
                      setField("infrastructure_realization", e.target.value)
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="health_realization">Kesehatan</Label>
                  <Input
                    id="health_realization"
                    type="number"
                    placeholder="0"
                    value={formData.health_realization}
                    onChange={(e) =>
                      setField("health_realization", e.target.value)
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="education_realization">Pendidikan</Label>
                  <Input
                    id="education_realization"
                    type="number"
                    placeholder="0"
                    value={formData.education_realization}
                    onChange={(e) =>
                      setField("education_realization", e.target.value)
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="agriculture_realization">Pertanian & Ekonomi</Label>
                  <Input
                    id="agriculture_realization"
                    type="number"
                    placeholder="0"
                    value={formData.agriculture_realization}
                    onChange={(e) =>
                      setField("agriculture_realization", e.target.value)
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="social_realization">Sosial & Kemasyarakatan</Label>
                  <Input
                    id="social_realization"
                    type="number"
                    placeholder="0"
                    value={formData.social_realization}
                    onChange={(e) =>
                      setField("social_realization", e.target.value)
                    }
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

