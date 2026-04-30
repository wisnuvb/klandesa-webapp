"use client";

import { motion } from "motion/react";
import { DollarSign, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { ApbdesData } from "../_lib/types";
import { formatRupiahShort } from "../_lib/formatting";

type SummaryCardsProps = {
  apbdesData: ApbdesData;
  persentaseRealisasiPendapatan: number;
  persentaseRealisasiBelanja: number;
  saldoKas: number;
};

export function SummaryCards(props: SummaryCardsProps) {
  const { apbdesData, persentaseRealisasiPendapatan, persentaseRealisasiBelanja, saldoKas } =
    props;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0 }}>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Total APBDes</p>
                <p className="text-2xl font-semibold mt-1">
                  {formatRupiahShort(apbdesData.totalPendapatan)}
                </p>
                <div className="flex items-center gap-1 mt-2">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-green-600 font-medium">
                    {persentaseRealisasiPendapatan.toFixed(1)}% Realisasi
                  </span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Wallet className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.1 }}>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Realisasi Pendapatan</p>
                <p className="text-2xl font-semibold mt-1">
                  {formatRupiahShort(apbdesData.realisasiPendapatan)}
                </p>
                <div className="flex items-center gap-1 mt-2">
                  <TrendingUp className="h-4 w-4 text-blue-600" />
                  <span className="text-sm text-blue-600 font-medium">Masuk</span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.2 }}>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Realisasi Belanja</p>
                <p className="text-2xl font-semibold mt-1">
                  {formatRupiahShort(apbdesData.realisasiBelanja)}
                </p>
                <div className="flex items-center gap-1 mt-2">
                  <TrendingDown className="h-4 w-4 text-orange-600" />
                  <span className="text-sm text-orange-600 font-medium">
                    {persentaseRealisasiBelanja.toFixed(1)}% dari Anggaran
                  </span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-lg bg-orange-500/10 flex items-center justify-center">
                <TrendingDown className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.3 }}>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Saldo Kas</p>
                <p className="text-2xl font-semibold mt-1">{formatRupiahShort(saldoKas)}</p>
                <p className="text-sm text-muted-foreground mt-2">Kas Umum Desa</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

