"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Tags } from "lucide-react";
import { SdgGoalBadges, SdgGoalPicker } from "@/components/app/sdgs/SdgGoalPicker";
import { Can } from "@/components/permissions/Can";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAppDialogs } from "@/components/providers/AppDialogProvider";
import { parseSdgGoalIds } from "@/lib/sdgs/parse-goals";

type BudgetRow = {
  id: string;
  year: number;
  category: string;
  subCategory: string | null;
  description: string;
  budgetAmount: number;
  realizedAmount: number;
  sdgGoalIds: number[];
};

type TransactionRow = {
  id: string;
  transactionNumber: string;
  category: string;
  description: string;
  amount: number;
  type: string;
  transactionDate: string;
  sdgGoalIds: number[];
};

type SdgTagsManagerProps = {
  defaultYear?: number;
  compact?: boolean;
};

function formatRp(n: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);
}

export function SdgTagsManager({ defaultYear, compact }: SdgTagsManagerProps) {
  const { appAlert } = useAppDialogs();
  const [year, setYear] = useState(String(defaultYear ?? new Date().getFullYear()));
  const [loading, setLoading] = useState(true);
  const [budgets, setBudgets] = useState<BudgetRow[]>([]);
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [editOpen, setEditOpen] = useState(false);
  const [editKind, setEditKind] = useState<"budget" | "transaction">("budget");
  const [editId, setEditId] = useState("");
  const [editLabel, setEditLabel] = useState("");
  const [editTags, setEditTags] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const y = Number(year);
      const [bRes, tRes] = await Promise.all([
        fetch(`/api/finance/budgets?year=${y}`),
        fetch(`/api/finance/transactions?year=${y}&type=expense`),
      ]);
      const bJson = await bRes.json();
      const tJson = await tRes.json();
      if (!bRes.ok) throw new Error(bJson.error || "Gagal memuat anggaran");
      if (!tRes.ok) throw new Error(tJson.error || "Gagal memuat transaksi");

      setBudgets(
        (bJson.data ?? []).map((b: Record<string, unknown>) => ({
          id: String(b.id),
          year: Number(b.year),
          category: String(b.category ?? ""),
          subCategory: b.subCategory != null ? String(b.subCategory) : null,
          description: String(b.description ?? ""),
          budgetAmount: Number(b.budgetAmount ?? 0),
          realizedAmount: Number(b.realizedAmount ?? 0),
          sdgGoalIds: parseSdgGoalIds(b.sdgGoalIds),
        })),
      );
      setTransactions(
        (tJson.data ?? []).map((t: Record<string, unknown>) => ({
          id: String(t.id),
          transactionNumber: String(t.transactionNumber ?? ""),
          category: String(t.category ?? ""),
          description: String(t.description ?? ""),
          amount: Number(t.amount ?? 0),
          type: String(t.type ?? ""),
          transactionDate: String(t.transactionDate ?? "").slice(0, 10),
          sdgGoalIds: parseSdgGoalIds(t.sdgGoalIds),
        })),
      );
    } catch (e) {
      void appAlert({
        title: "Gagal",
        description: e instanceof Error ? e.message : "Gagal memuat data",
      });
    } finally {
      setLoading(false);
    }
  }, [year, appAlert]);

  useEffect(() => {
    void load();
  }, [load]);

  function openEdit(
    kind: "budget" | "transaction",
    id: string,
    label: string,
    tags: number[],
  ) {
    setEditKind(kind);
    setEditId(id);
    setEditLabel(label);
    setEditTags(tags);
    setEditOpen(true);
  }

  async function saveTags() {
    setSaving(true);
    try {
      const url =
        editKind === "budget"
          ? `/api/finance/budgets/${editId}/sdg-tags`
          : `/api/finance/transactions/${editId}/sdg-tags`;
      const res = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sdgGoalIds: editTags }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal menyimpan");
      setEditOpen(false);
      await load();
      await appAlert({ title: "Berhasil", description: "Tag SDGs disimpan." });
    } catch (e) {
      await appAlert({
        title: "Gagal",
        description: e instanceof Error ? e.message : "Gagal menyimpan",
      });
    } finally {
      setSaving(false);
    }
  }

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  return (
    <>
      <Card className={compact ? "border-dashed" : undefined}>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Tags className="h-4 w-4" />
              Tag SDGs — APBDes
            </CardTitle>
            <div className="flex items-center gap-2">
              <Label className="text-sm text-muted-foreground">Tahun</Label>
              <Select value={year} onValueChange={setYear}>
                <SelectTrigger className="w-28 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {!compact ? (
            <p className="text-sm text-muted-foreground">
              Tandai pos anggaran dan transaksi belanja ke goal SDGs Desa. Data muncul di dashboard
              SDGs.
            </p>
          ) : null}
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : (
            <Tabs defaultValue="budgets">
              <TabsList>
                <TabsTrigger value="budgets">Anggaran ({budgets.length})</TabsTrigger>
                <TabsTrigger value="transactions">
                  Belanja ({transactions.length})
                </TabsTrigger>
              </TabsList>
              <TabsContent value="budgets" className="mt-4">
                {budgets.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    Belum ada baris anggaran di tahun ini. Tambah via modul Keuangan.
                  </p>
                ) : (
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Kategori</TableHead>
                          <TableHead>Anggaran</TableHead>
                          <TableHead>SDGs</TableHead>
                          <TableHead className="text-right">Aksi</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {budgets.map((b) => (
                          <TableRow key={b.id}>
                            <TableCell>
                              <div className="font-medium">{b.category}</div>
                              <div className="text-xs text-muted-foreground truncate max-w-xs">
                                {b.subCategory || b.description}
                              </div>
                            </TableCell>
                            <TableCell className="text-sm">{formatRp(b.budgetAmount)}</TableCell>
                            <TableCell>
                              <SdgGoalBadges ids={b.sdgGoalIds} />
                            </TableCell>
                            <TableCell className="text-right">
                              <Can resource="finance" action="update">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    openEdit(
                                      "budget",
                                      b.id,
                                      `${b.category} — ${b.subCategory ?? ""}`,
                                      b.sdgGoalIds,
                                    )
                                  }
                                >
                                  Tag
                                </Button>
                              </Can>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>
              <TabsContent value="transactions" className="mt-4">
                {transactions.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    Belum ada transaksi belanja di tahun ini.
                  </p>
                ) : (
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Tanggal</TableHead>
                          <TableHead>Uraian</TableHead>
                          <TableHead>Jumlah</TableHead>
                          <TableHead>SDGs</TableHead>
                          <TableHead className="text-right">Aksi</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {transactions.map((t) => (
                          <TableRow key={t.id}>
                            <TableCell className="text-sm">{t.transactionDate}</TableCell>
                            <TableCell>
                              <div className="font-medium text-sm">{t.category}</div>
                              <div className="text-xs text-muted-foreground truncate max-w-xs">
                                {t.description}
                              </div>
                            </TableCell>
                            <TableCell className="text-sm">{formatRp(t.amount)}</TableCell>
                            <TableCell>
                              <SdgGoalBadges ids={t.sdgGoalIds} />
                            </TableCell>
                            <TableCell className="text-right">
                              <Can resource="finance" action="update">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    openEdit(
                                      "transaction",
                                      t.id,
                                      t.description,
                                      t.sdgGoalIds,
                                    )
                                  }
                                >
                                  Tag
                                </Button>
                              </Can>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Tag SDGs</DialogTitle>
            <p className="text-sm text-muted-foreground">{editLabel}</p>
          </DialogHeader>
          <SdgGoalPicker value={editTags} onChange={setEditTags} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Batal
            </Button>
            <Button onClick={() => void saveTags()} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
