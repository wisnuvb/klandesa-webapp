"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/app/(app)/anggaran/_lib/currency";
import type { CoopSummaryResponse } from "../_lib/types";

type Props = {
  summary: CoopSummaryResponse | null;
  loading: boolean;
};

export function CoopStatsCards({ summary, loading }: Props) {
  const stats = summary?.stats;
  const show = !!summary?.cooperative;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Saldo kas (estimasi)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold tabular-nums">
            {loading || !show
              ? "—"
              : formatCurrency(stats?.balance ?? 0)}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Pemasukan tercatat
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold tabular-nums text-emerald-600">
            {loading || !show
              ? "—"
              : formatCurrency(stats?.totalIncome ?? 0)}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Pengeluaran tercatat
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold tabular-nums text-rose-600">
            {loading || !show
              ? "—"
              : formatCurrency(stats?.totalExpense ?? 0)}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Jumlah anggota
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold tabular-nums">
            {loading || !show ? "—" : stats?.memberCount ?? 0}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
