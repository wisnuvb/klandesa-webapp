"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { VILLAGE_ROLES } from "@/lib/permissions/client";
import { ROLE_DESCRIPTIONS, ROLE_LABELS } from "@/lib/rbac/labels";
import type { OfficialOption } from "../_lib/types";

type Props = {
  open: boolean;
  officials: OfficialOption[];
  onOpenChange: (open: boolean) => void;
  onCreate: (body: Record<string, unknown>) => Promise<{ ok: true; email: string; tempPassword: string } | { ok: false; error: string }>;
  onCreated: (cred: { email: string; password: string; officialName: string }) => void;
};

export function CreateAccountDialog({ open, officials, onOpenChange, onCreate, onCreated }: Props) {
  const [officialId, setOfficialId] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("staff");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const official = officials.find((o) => String(o.id) === officialId);

  function reset() {
    setOfficialId("");
    setEmail("");
    setRole("staff");
    setError(null);
  }

  function pickOfficial(id: string) {
    setOfficialId(id);
    const o = officials.find((x) => String(x.id) === id);
    // Isi otomatis dari email perangkat bila ada (tetap bisa diubah).
    if (o?.email && !email) setEmail(o.email);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!official) return setError("Pilih perangkat desa terlebih dulu.");
    setBusy(true);
    setError(null);
    const r = await onCreate({ officialId: official.id, email, role });
    setBusy(false);
    if (!r.ok) return setError(r.error);
    onCreated({ email: r.email, password: r.tempPassword, officialName: official.name });
    reset();
    onOpenChange(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (busy) return;
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={submit} noValidate className="space-y-4">
          <DialogHeader>
            <DialogTitle>Buat akun login</DialogTitle>
            <DialogDescription>Untuk perangkat desa yang sudah terdaftar. Izin bisa disesuaikan per modul setelah akun dibuat.</DialogDescription>
          </DialogHeader>

          <div className="space-y-1.5">
            <Label htmlFor="new-official">Perangkat desa</Label>
            {officials.length === 0 ? (
              <p id="new-official" className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
                Semua perangkat aktif sudah punya akun. Tambahkan perangkat baru di menu Data Perangkat.
              </p>
            ) : (
              <Select value={officialId} onValueChange={pickOfficial}>
                <SelectTrigger id="new-official" className="h-11 w-full" aria-required="true">
                  <SelectValue placeholder="Pilih perangkat…" />
                </SelectTrigger>
                <SelectContent>
                  {officials.map((o) => (
                    <SelectItem key={o.id} value={String(o.id)}>
                      {o.name}
                      {o.positionName ? ` — ${o.positionName}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="new-email">Email untuk masuk</Label>
            <Input
              id="new-email"
              type="email"
              inputMode="email"
              autoComplete="off"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@contoh.id"
              className="h-11"
              aria-required="true"
              aria-describedby="new-email-help"
            />
            <p id="new-email-help" className="text-xs text-muted-foreground">
              Harus unik dan belum dipakai akun lain.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="new-role">Peran awal</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger id="new-role" className="h-11 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VILLAGE_ROLES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {ROLE_LABELS[r as keyof typeof ROLE_LABELS]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">{ROLE_DESCRIPTIONS[role as keyof typeof ROLE_DESCRIPTIONS]}</p>
            {role === "admin" && (
              <p role="status" className="text-xs text-amber-800 dark:text-amber-300">
                Admin punya akses penuh, termasuk mengelola akun lain dan langganan.
              </p>
            )}
          </div>

          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}

          <DialogFooter className="gap-2 sm:gap-2">
            <Button type="button" variant="outline" className="h-11" onClick={() => onOpenChange(false)} disabled={busy}>
              Batal
            </Button>
            <Button type="submit" className="h-11" disabled={busy || officials.length === 0}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />}
              {busy ? "Membuat…" : "Buat akun"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
