"use client";

import { motion } from "motion/react";
import { Eye, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { BelanjaItem } from "../../_lib/types";
import { formatRupiah } from "../../_lib/formatting";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type BelanjaTabProps = {
  selectedYear: string;
  belanjaData: BelanjaItem[];
  onOpenCreate: () => void;
  onOpenDetail: (bidang: BelanjaItem) => void;
};

export function BelanjaTab(props: BelanjaTabProps) {
  const { selectedYear, belanjaData, onOpenCreate, onOpenDetail } = props;

  return (
    <div className="space-y-4 mt-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Belanja Desa {selectedYear}</h3>
          <p className="text-sm text-muted-foreground">
            Rincian belanja per bidang dan realisasinya
          </p>
        </div>
        <Button className="gap-2" onClick={onOpenCreate}>
          <Plus className="h-4 w-4" />
          Catat Belanja
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Perbandingan Anggaran vs Realisasi</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={belanjaData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="bidang"
                stroke="#6b7280"
                angle={-20}
                textAnchor="end"
                height={120}
              />
              <YAxis stroke="#6b7280" />
              <Tooltip
                formatter={(value: number) => formatRupiah(Number(value))}
                contentStyle={{
                  backgroundColor: "#fff",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                }}
              />
              <Legend />
              <Bar dataKey="anggaran" fill="#94a3b8" name="Anggaran" radius={[4, 4, 0, 0]} />
              <Bar dataKey="realisasi" fill="#0f766e" name="Realisasi" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {belanjaData.map((bidang, index) => (
        <Card key={index}>
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h4 className="font-semibold">{bidang.bidang}</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Realisasi: {bidang.persentase.toFixed(1)}%
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => onOpenDetail(bidang)}
              >
                <Eye className="h-4 w-4" />
                Detail
              </Button>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="p-3 bg-muted/30 rounded-lg">
                <p className="text-xs text-muted-foreground">Anggaran</p>
                <p className="font-semibold mt-1">{formatRupiah(bidang.anggaran)}</p>
              </div>
              <div className="p-3 bg-primary/10 rounded-lg">
                <p className="text-xs text-muted-foreground">Realisasi</p>
                <p className="font-semibold text-primary mt-1">{formatRupiah(bidang.realisasi)}</p>
              </div>
              <div className="p-3 bg-orange-500/10 rounded-lg">
                <p className="text-xs text-muted-foreground">Sisa</p>
                <p className="font-semibold text-orange-600 mt-1">
                  {formatRupiah(bidang.anggaran - bidang.realisasi)}
                </p>
              </div>
            </div>

            <div className="mt-4">
              <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${bidang.persentase}%` }}
                  transition={{ duration: 1, delay: 0.2 }}
                  className="h-full rounded-full"
                  style={{ backgroundColor: bidang.color }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

