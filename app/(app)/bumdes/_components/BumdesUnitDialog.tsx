"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FormErrorSummary } from "@/components/app/FormErrorSummary";
import { useFormSubmit } from "@/hooks/useFormSubmit";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => Promise<void>;
};

export function BumdesUnitDialog({ open, onOpenChange, onSaved }: Props) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const { busy, errors, general, summaryRef, submit } = useFormSubmit();

  async function go(e: React.FormEvent) {
    e.preventDefault();
    const r = await submit<{ message?: string }>("/api/bumdes/units", "POST", { name, category, description });
    if (!r) return;
    toast.success(r.message ?? "Unit ditambahkan");
    setName("");
    setCategory("");
    setDescription("");
    onOpenChange(false);
    await onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => (!o && busy ? undefined : onOpenChange(o))}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Tambah unit usaha</DialogTitle>
          <DialogDescription>Unit usaha menjadi entitas pembukuan sendiri: transaksi, jurnal, neraca, dan laba rugi dapat dilihat per unit.</DialogDescription>
        </DialogHeader>
        <form onSubmit={go} className="min-w-0 space-y-4" noValidate>
          <FormErrorSummary innerRef={summaryRef} errors={errors} general={general} labels={{ name: "Nama unit", category: "Kategori", description: "Deskripsi" }} />
          <div className="space-y-1.5">
            <Label htmlFor="bu-name">Nama unit *</Label>
            <Input id="bu-name" className="h-11" maxLength={255} value={name} onChange={(e) => setName(e.target.value)} placeholder="mis. Air Bersih, Wisata Desa" aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? "bu-name-err" : undefined} />
            {errors.name ? <p id="bu-name-err" className="text-sm text-destructive">{errors.name}</p> : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bu-cat">Kategori</Label>
            <Input id="bu-cat" className="h-11" maxLength={100} value={category} onChange={(e) => setCategory(e.target.value)} placeholder="mis. pertanian, jasa, perdagangan" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bu-desc">Deskripsi</Label>
            <Textarea id="bu-desc" rows={2} maxLength={5000} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" className="min-h-11" onClick={() => onOpenChange(false)} disabled={busy}>
              Batal
            </Button>
            <Button type="submit" className="min-h-11" disabled={busy}>
              {busy ? <Loader2 aria-hidden="true" className="animate-spin" /> : null}
              Simpan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
