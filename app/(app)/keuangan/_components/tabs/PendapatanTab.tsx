"use client";

import { motion } from "motion/react";
import { Plus, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PendapatanItem } from "../../_lib/types";
import { formatRupiah } from "../../_lib/formatting";

type PendapatanTabProps = {
  selectedYear: string;
  pendapatanData: PendapatanItem[];
  onOpenCreate: () => void;
};

export function PendapatanTab(props: PendapatanTabProps) {
  const { selectedYear, pendapatanData, onOpenCreate } = props;

  return (
    <div className="space-y-4 mt-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Pendapatan Desa {selectedYear}</h3>
          <p className="text-sm text-muted-foreground">
            Rincian sumber pendapatan dan realisasinya
          </p>
        </div>
        <Button className="gap-2" onClick={onOpenCreate}>
          <Plus className="h-4 w-4" />
          Catat Pendapatan
        </Button>
      </div>

      {pendapatanData.map((kategori, index) => (
        <Card key={index}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{kategori.kategori}</CardTitle>
              <Badge variant="outline" className="gap-1">
                <TrendingUp className="h-3 w-3" />
                {kategori.persentase.toFixed(1)}%
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4 p-4 bg-muted/30 rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">Anggaran</p>
                <p className="font-semibold">{formatRupiah(kategori.anggaran)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Realisasi</p>
                <p className="font-semibold text-primary">{formatRupiah(kategori.realisasi)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Sisa</p>
                <p className="font-semibold text-orange-600">
                  {formatRupiah(kategori.anggaran - kategori.realisasi)}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Realisasi Anggaran</span>
                <span className="font-medium">{kategori.persentase.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${kategori.persentase}%` }}
                  transition={{ duration: 1, delay: 0.3 }}
                  className="h-full bg-primary rounded-full"
                />
              </div>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left p-3 font-medium text-sm">Uraian</th>
                    <th className="text-right p-3 font-medium text-sm">Anggaran</th>
                    <th className="text-right p-3 font-medium text-sm">Realisasi</th>
                    <th className="text-right p-3 font-medium text-sm">%</th>
                  </tr>
                </thead>
                <tbody>
                  {kategori.subKategori.map((sub, idx) => (
                    <tr key={idx} className="border-t hover:bg-muted/50 transition-colors">
                      <td className="p-3 text-sm">{sub.nama}</td>
                      <td className="p-3 text-sm text-right">{formatRupiah(sub.anggaran)}</td>
                      <td className="p-3 text-sm text-right font-medium text-primary">
                        {formatRupiah(sub.realisasi)}
                      </td>
                      <td className="p-3 text-sm text-right">
                        {((sub.realisasi / sub.anggaran) * 100).toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

