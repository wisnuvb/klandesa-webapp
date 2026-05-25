"use client";

import { useState } from "react";
import {
  Building2,
  Landmark,
  Receipt,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AsyncState, ListPageToolbar, MetricGrid } from "@/components/app/patterns";
import { formatCurrency } from "@/app/(app)/anggaran/_lib/currency";
import { useBumdes } from "./_hooks/useBumdes";
import { BumdesUnitDialog } from "./_components/BumdesUnitDialog";
import { BumdesTransactionDialog } from "./_components/BumdesTransactionDialog";

export default function BumdesPage() {
  const b = useBumdes();
  const [unitDlg, setUnitDlg] = useState(false);
  const [txDlg, setTxDlg] = useState(false);

  const stats = b.detail?.overall ?? b.summary?.stats;
  const name =
    b.summary?.bumdes && typeof b.summary.bumdes.name === "string"
      ? b.summary.bumdes.name
      : "BUMDes";

  const metricItems = [
    {
      title: "Total Pemasukan",
      value: formatCurrency(stats?.totalIncome ?? 0),
      icon: TrendingUp,
      accent: "green" as const,
    },
    {
      title: "Total Pengeluaran",
      value: formatCurrency(stats?.totalExpense ?? 0),
      icon: TrendingDown,
      accent: "orange" as const,
    },
    {
      title: "Laba Bersih",
      value: formatCurrency(stats?.netProfit ?? 0),
      icon: Wallet,
      accent: "primary" as const,
    },
    {
      title: "Unit Usaha",
      value: stats?.unitCount ?? 0,
      icon: Building2,
      accent: "blue" as const,
    },
  ];

  async function afterMutation() {
    await Promise.all([b.refreshUnits(), b.refreshTransactions(), b.refreshDetail(), b.reload()]);
  }

  return (
    <AsyncState
      loading={b.loading}
      error={b.error}
      onRetry={b.reload}
      loadingMessage="Memuat data BUMDes..."
    >
      <div className="space-y-6">
        <Alert>
          <Landmark className="h-4 w-4" />
          <AlertTitle>Pencatatan internal BUMDes</AlertTitle>
          <AlertDescription>
            Modul ini untuk operasional unit usaha desa; bukan pengganti pelaporan resmi
            BUMDes ke instansi terkait. Pisahkan pembukuan BUMDes dari APBDes.
          </AlertDescription>
        </Alert>

        {b.summary?.needsBootstrap ? (
          <Card>
            <CardHeader>
              <CardTitle>Belum ada BUMDes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Buat satu entri BUMDes untuk desa ini. Anda dapat menambah unit usaha
                dan transaksi setelahnya.
              </p>
              {b.canManage ? (
                <Button onClick={() => void b.bootstrapBumdes()} className="gap-2">
                  <Landmark className="h-4 w-4" />
                  Aktifkan BUMDes untuk desa
                </Button>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Hubungi admin desa atau kepala desa untuk mengaktifkan modul ini.
                </p>
              )}
            </CardContent>
          </Card>
        ) : (
          <>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">{name}</h1>
              <p className="text-sm text-muted-foreground">
                Ringkasan unit usaha dan buku kas BUMDes
              </p>
            </div>

            <MetricGrid items={metricItems} columns={4} />

            <ListPageToolbar
              searchPlaceholder="Cari unit usaha..."
              searchQuery={b.searchQuery}
              onSearchChange={b.setSearchQuery}
              addLabel="Unit Baru"
              onAdd={() => setUnitDlg(true)}
              showAdd={b.canManage}
              trailing={
                b.canManage ? (
                  <Button variant="outline" className="gap-2" onClick={() => setTxDlg(true)}>
                    <Receipt className="h-4 w-4" />
                    Transaksi
                  </Button>
                ) : null
              }
            />

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Unit usaha</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nama</TableHead>
                      <TableHead>Kategori</TableHead>
                      <TableHead className="text-right">Pemasukan</TableHead>
                      <TableHead className="text-right">Pengeluaran</TableHead>
                      <TableHead className="text-right">Laba</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {b.filteredUnits.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium">{u.name}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {u.category ?? "—"}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-emerald-600">
                          {formatCurrency(Number(u.totalIncome ?? 0))}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-rose-600">
                          {formatCurrency(Number(u.totalExpense ?? 0))}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatCurrency(Number(u.netProfit ?? 0))}
                        </TableCell>
                      </TableRow>
                    ))}
                    {b.filteredUnits.length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="text-center text-muted-foreground py-8"
                        >
                          Belum ada unit usaha.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Transaksi terakhir</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tanggal</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead>Jenis</TableHead>
                      <TableHead>Kategori</TableHead>
                      <TableHead className="text-right">Jumlah</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {b.transactions.slice(0, 20).map((t) => (
                      <TableRow key={t.id}>
                        <TableCell>
                          {new Date(t.entryDate).toLocaleDateString("id-ID")}
                        </TableCell>
                        <TableCell>{t.unit?.name ?? "—"}</TableCell>
                        <TableCell>
                          {t.direction === "income" ? "Masuk" : "Keluar"}
                        </TableCell>
                        <TableCell>{t.category}</TableCell>
                        <TableCell
                          className={`text-right tabular-nums ${
                            t.direction === "income"
                              ? "text-emerald-600"
                              : "text-rose-600"
                          }`}
                        >
                          {t.direction === "income" ? "+" : "−"}
                          {formatCurrency(Number(t.amount))}
                        </TableCell>
                      </TableRow>
                    ))}
                    {b.transactions.length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="text-center text-muted-foreground py-8"
                        >
                          Belum ada transaksi.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </>
        )}

        <BumdesUnitDialog
          open={unitDlg}
          onOpenChange={setUnitDlg}
          onSaved={afterMutation}
        />
        <BumdesTransactionDialog
          open={txDlg}
          onOpenChange={setTxDlg}
          units={b.units}
          onSaved={afterMutation}
        />
      </div>
    </AsyncState>
  );
}
