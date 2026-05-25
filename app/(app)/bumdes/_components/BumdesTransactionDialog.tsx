"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import type { BumdesUnitRow } from "../_lib/types";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  units: BumdesUnitRow[];
  onSaved: () => Promise<void>;
};

export function BumdesTransactionDialog({
  open,
  onOpenChange,
  units,
  onSaved,
}: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [unitId, setUnitId] = useState("");
  const [direction, setDirection] = useState<"income" | "expense">("income");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [entryDate, setEntryDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );

  async function submit() {
    const num = Number(amount.replace(/\./g, "").replace(",", "."));
    if (!Number.isFinite(num) || num <= 0) {
      toast.error("Jumlah tidak valid");
      return;
    }
    if (!unitId) {
      toast.error("Pilih unit usaha");
      return;
    }
    if (!category.trim()) {
      toast.error("Kategori wajib diisi");
      return;
    }

    const iso =
      typeof entryDate === "string" && entryDate
        ? new Date(`${entryDate}T12:00:00`).toISOString()
        : new Date().toISOString();

    setSubmitting(true);
    try {
      const res = await fetch("/api/bumdes/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          unitId: Number(unitId),
          direction,
          amount: num,
          category: category.trim(),
          description: description.trim() || undefined,
          entryDate: iso,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(j?.error ?? "Gagal menyimpan");
        return;
      }
      toast.success(j?.message ?? "Transaksi dicatat");
      setAmount("");
      setCategory("");
      setDescription("");
      onOpenChange(false);
      await onSaved();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Tambah transaksi</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label>Unit usaha</Label>
            <Select value={unitId} onValueChange={setUnitId}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih unit" />
              </SelectTrigger>
              <SelectContent>
                {units.map((u) => (
                  <SelectItem key={u.id} value={String(u.id)}>
                    {u.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Jenis</Label>
            <Select
              value={direction}
              onValueChange={(v) => setDirection(v as "income" | "expense")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="income">Pemasukan</SelectItem>
                <SelectItem value="expense">Pengeluaran</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Tanggal</Label>
            <Input
              type="date"
              value={entryDate}
              onChange={(e) => setEntryDate(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label>Jumlah (rupiah)</Label>
            <Input
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="contoh 150000"
            />
          </div>
          <div className="grid gap-2">
            <Label>Kategori</Label>
            <Input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="mis. Penjualan, Operasional, Gaji"
            />
          </div>
          <div className="grid gap-2">
            <Label>Keterangan</Label>
            <Textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button onClick={() => void submit()} disabled={submitting}>
            Simpan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
