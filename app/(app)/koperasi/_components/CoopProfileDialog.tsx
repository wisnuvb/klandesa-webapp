"use client";

import { useEffect, useState } from "react";
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
import { toast } from "sonner";
import type { CoopSummaryResponse } from "../_lib/types";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cooperative: CoopSummaryResponse["cooperative"];
  onSaved: () => Promise<void>;
};

export function CoopProfileDialog({
  open,
  onOpenChange,
  cooperative,
  onSaved,
}: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [legalNotes, setLegalNotes] = useState("");

  useEffect(() => {
    if (!open || !cooperative) return;
    setName(String(cooperative.name ?? ""));
    setAddress(String(cooperative.address ?? ""));
    setPhone(cooperative.phone != null ? String(cooperative.phone) : "");
    setEmail(cooperative.email != null ? String(cooperative.email) : "");
    setLegalNotes(
      cooperative.legalNotes != null ? String(cooperative.legalNotes) : "",
    );
  }, [open, cooperative]);

  async function submit() {
    if (!name.trim()) {
      toast.error("Nama koperasi wajib diisi");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/coop", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          address: address.trim() || "",
          phone: phone.trim() || null,
          email: email.trim() || null,
          legalNotes: legalNotes.trim() || "",
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(j?.error ?? "Gagal menyimpan");
        return;
      }
      toast.success(j?.message ?? "Profil diperbarui");
      onOpenChange(false);
      await onSaved();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit profil koperasi</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label>Nama</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Alamat</Label>
            <Textarea
              rows={3}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>Telepon</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Email</Label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Catatan legal (NIB/NPWP, dll.)</Label>
            <Textarea
              rows={2}
              value={legalNotes}
              onChange={(e) => setLegalNotes(e.target.value)}
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
