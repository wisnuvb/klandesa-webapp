"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PieChart, TrendingUp } from "lucide-react";
import type { VillageBudget } from "../_lib/types";
import { formatCurrency } from "../_lib/currency";

type BudgetDetailDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedBudget: VillageBudget | null;
};

export function BudgetDetailDialog(props: BudgetDetailDialogProps) {
  const { open, onOpenChange, selectedBudget } = props;

  const items = [
    {
      label: "Belanja Pegawai",
      budget: selectedBudget?.employee_budget,
      realization: selectedBudget?.employee_realization,
    },
    {
      label: "Infrastruktur & Pembangunan",
      budget: selectedBudget?.infrastructure_budget,
      realization: selectedBudget?.infrastructure_realization,
    },
    {
      label: "Kesehatan",
      budget: selectedBudget?.health_budget,
      realization: selectedBudget?.health_realization,
    },
    {
      label: "Pendidikan",
      budget: selectedBudget?.education_budget,
      realization: selectedBudget?.education_realization,
    },
    {
      label: "Pertanian & Ekonomi",
      budget: selectedBudget?.agriculture_budget,
      realization: selectedBudget?.agriculture_realization,
    },
    {
      label: "Sosial & Kemasyarakatan",
      budget: selectedBudget?.social_budget,
      realization: selectedBudget?.social_realization,
    },
  ] as const;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Detail Anggaran Desa - Tahun {selectedBudget?.year}</DialogTitle>
          <DialogDescription>
            Informasi lengkap tentang anggaran dan realisasi untuk tahun {selectedBudget?.year}
          </DialogDescription>
        </DialogHeader>
        <div className="overflow-y-auto flex-1 pr-2">
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <p className="text-sm text-green-700 mb-1">Total Pendapatan</p>
                <p className="text-2xl font-semibold text-green-900">
                  {formatCurrency(selectedBudget?.revenue || 0)}
                </p>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                <p className="text-sm text-purple-700 mb-1">Sisa Anggaran</p>
                <p className="text-2xl font-semibold text-purple-900">
                  {formatCurrency(selectedBudget?.remaining_budget || 0)}
                </p>
              </div>
            </div>

            <div>
              <h3 className="font-medium mb-3 flex items-center gap-2 text-green-600">
                <TrendingUp className="h-5 w-5" />
                Rincian Pendapatan
              </h3>
              <div className="grid grid-cols-2 gap-3 bg-muted/50 p-4 rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Dana Pemerintah Pusat</p>
                  <p className="font-semibold">
                    {formatCurrency(selectedBudget?.government_fund || 0)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Dana Provinsi</p>
                  <p className="font-semibold">
                    {formatCurrency(selectedBudget?.province_fund || 0)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Dana Kabupaten</p>
                  <p className="font-semibold">
                    {formatCurrency(selectedBudget?.district_fund || 0)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Pendapatan Asli Desa</p>
                  <p className="font-semibold">
                    {formatCurrency(selectedBudget?.local_income || 0)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Kontribusi Masyarakat</p>
                  <p className="font-semibold">
                    {formatCurrency(selectedBudget?.community_contribution || 0)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Kontribusi Swasta</p>
                  <p className="font-semibold">
                    {formatCurrency(selectedBudget?.private_sector_contribution || 0)}
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-medium mb-3 flex items-center gap-2 text-blue-600">
                <PieChart className="h-5 w-5" />
                Anggaran vs Realisasi
              </h3>
              <div className="space-y-3">
                {items.map((item) => (
                  <div key={item.label} className="bg-muted/50 p-3 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium">{item.label}</span>
                      <span className="text-sm text-muted-foreground">
                        {item.budget && item.realization
                          ? ((item.realization / item.budget) * 100).toFixed(1)
                          : 0}
                        %
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-muted-foreground">Anggaran</p>
                        <p className="font-semibold">{formatCurrency(item.budget || 0)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Realisasi</p>
                        <p className="font-semibold">
                          {formatCurrency(item.realization || 0)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t pt-4">
              <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
                <div>
                  <p>Dibuat: {selectedBudget?.created_at}</p>
                </div>
                <div>
                  <p>Diperbarui: {selectedBudget?.updated_at}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t pt-4 mt-4">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Tutup
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

