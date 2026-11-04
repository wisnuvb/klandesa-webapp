"use client";

import { useMemo, useState } from "react";
import { KeyRound, Loader2, RotateCcw, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { VILLAGE_ROLES, parsePermissionOverrides, type VillageRole } from "@/lib/permissions/client";
import { ROLE_DESCRIPTIONS, ROLE_LABELS } from "@/lib/rbac/labels";
import { baselineDraft, countCustomized, draftFromAccount, overridesFromDraft, setAction, type Draft } from "@/lib/rbac/editor-model";
import type { DeliveryView, InviteNotice } from "@/components/permissions/InviteResultDialog";
import type { AccountView } from "../_lib/types";
import { PermissionMatrix } from "./PermissionMatrix";

type Props = {
  account: AccountView | null;
  onClose: () => void;
  onSave: (id: number, body: Record<string, unknown>) => Promise<{ ok: true; account: AccountView; delivery?: DeliveryView } | { ok: false; error: string }>;
  onNotice: (n: InviteNotice) => void;
};

const asRole = (r: string): VillageRole => (VILLAGE_ROLES as readonly string[]).includes(r) ? (r as VillageRole) : "staff";

/** Dipasang ulang (key = id akun) setiap akun berganti, sehingga draf selalu mulai dari data akun itu. */
export function PermissionEditorSheet(props: Props) {
  if (!props.account) return null;
  return <EditorInner key={props.account.id} {...props} account={props.account} />;
}

function EditorInner({ account, onClose, onSave, onNotice }: Props & { account: AccountView }) {
  const [role, setRole] = useState<VillageRole>(() => asRole(account.role));
  const [draft, setDraft] = useState<Draft>(() => draftFromAccount(asRole(account.role), parsePermissionOverrides(account.overrides)));
  const [isActive, setActive] = useState(account.isActive);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);

  const original = useMemo(() => {
    const r = asRole(account.role);
    return { role: r, overrides: parsePermissionOverrides(account.overrides), active: account.isActive };
  }, [account]);

  const nextOverrides = useMemo(() => overridesFromDraft(role, draft), [role, draft]);
  const customCount = countCustomized(nextOverrides);

  const dirty = useMemo(() => {
    if (!original) return false;
    return (
      role !== original.role ||
      isActive !== original.active ||
      JSON.stringify(nextOverrides) !== JSON.stringify(original.overrides)
    );
  }, [original, role, isActive, nextOverrides]);

  const isAdminRole = role === "admin";
  const locked = account.isSelf;

  function changeRole(next: string) {
    const r = asRole(next);
    setRole(r);
    // Mengganti peran = mulai dari bawaan peran baru; penyesuaian lama tidak relevan.
    setDraft(baselineDraft(r));
  }

  async function save(extra?: Record<string, unknown>) {
    setSaving(true);
    setFormError(null);
    const body: Record<string, unknown> = { ...extra };
    if (!extra) {
      if (role !== original?.role) body.role = role;
      if (isActive !== original?.active) body.isActive = isActive;
      if (JSON.stringify(nextOverrides) !== JSON.stringify(original?.overrides ?? {}) || role !== original?.role) {
        body.permissionOverrides = nextOverrides;
      }
    }
    const r = await onSave(account.id, body);
    setSaving(false);
    if (!r.ok) {
      setFormError(r.error);
      return;
    }
    if (r.delivery) {
      onNotice({ email: account.email, name: account.name, kind: account.lastLogin ? "reset" : "invite", delivery: r.delivery });
      return;
    }
    toast.success("Perubahan akses disimpan");
    onClose();
  }

  return (
    <>
      <Sheet open onOpenChange={(o) => !o && !saving && onClose()}>
        <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-2xl">
          <SheetHeader className="border-b p-4 pr-12">
            <SheetTitle>{account.name}</SheetTitle>
            <SheetDescription>
              {account.official?.positionName ? `${account.official.positionName} · ` : ""}
              {account.email}
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 space-y-6 overflow-y-auto p-4">
            {locked && (
              <Alert>
                <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                <AlertTitle>Ini akun Anda sendiri</AlertTitle>
                <AlertDescription>Peran, status, dan izin akun sendiri tidak dapat diubah di sini agar Anda tidak terkunci dari sistem.</AlertDescription>
              </Alert>
            )}

            <section className="space-y-2">
              <Label htmlFor="rbac-role" className="text-sm font-medium">
                Peran (titik awal izin)
              </Label>
              <Select value={role} onValueChange={changeRole} disabled={locked || saving}>
                <SelectTrigger id="rbac-role" className="h-11 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VILLAGE_ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{ROLE_DESCRIPTIONS[role]}</p>
              {role !== original?.role && !locked && (
                <p role="status" className="text-xs text-amber-800 dark:text-amber-300">
                  Mengganti peran mengembalikan semua izin ke bawaan peran baru.
                </p>
              )}
            </section>

            <section className="flex items-start justify-between gap-4 rounded-lg border p-3">
              <div className="space-y-0.5">
                <Label htmlFor="rbac-active" className="text-sm font-medium">
                  Akun aktif
                </Label>
                <p className="text-xs text-muted-foreground">Akun nonaktif tidak bisa masuk (web maupun aplikasi seluler). Data riwayatnya tetap ada.</p>
              </div>
              <Switch
                id="rbac-active"
                checked={isActive}
                disabled={locked || saving}
                onCheckedChange={(v) => (v ? setActive(true) : setConfirmDeactivate(true))}
              />
            </section>

            <section className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-medium">Izin per modul</h3>
                  <p className="text-xs text-muted-foreground">
                    {isAdminRole
                      ? "Admin selalu punya akses penuh ke semua modul."
                      : customCount > 0
                        ? `${customCount} modul berbeda dari bawaan ${ROLE_LABELS[role]}.`
                        : `Sama seperti bawaan ${ROLE_LABELS[role]}. Centang untuk menyesuaikan.`}
                  </p>
                </div>
                {!isAdminRole && !locked && customCount > 0 && (
                  <Button type="button" variant="outline" size="sm" className="h-10" onClick={() => setDraft(baselineDraft(role))} disabled={saving}>
                    <RotateCcw className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                    Kembalikan ke bawaan peran
                  </Button>
                )}
              </div>
              {isAdminRole ? null : (
                <PermissionMatrix role={role} draft={draft} disabled={locked || saving} onToggle={(res, act, on) => setDraft((d) => setAction(d, res, act, on))} />
              )}
            </section>

            {!locked && (
              <section className="rounded-lg border p-3">
                <h3 className="text-sm font-medium">Kata sandi</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {account.lastLogin
                    ? "Kirim email berisi tautan agar yang bersangkutan membuat kata sandi baru. Kata sandi lama langsung dicabut."
                    : account.pendingInvite
                      ? "Undangan sudah dikirim dan belum dipakai. Kirim ulang bila email belum diterima."
                      : "Akun ini belum pernah masuk. Kirim undangan agar yang bersangkutan membuat kata sandi."}
                </p>
                <Button type="button" variant="outline" className="mt-2 h-10" onClick={() => setConfirmReset(true)} disabled={saving}>
                  <KeyRound className="mr-1.5 h-4 w-4" aria-hidden="true" />
                  {account.lastLogin ? "Kirim tautan atur ulang kata sandi" : account.pendingInvite ? "Kirim ulang undangan" : "Kirim undangan"}
                </Button>
              </section>
            )}
          </div>

          <SheetFooter className="border-t p-4">
            {formError && (
              <p role="alert" className="text-sm text-destructive">
                {formError}
              </p>
            )}
            <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" className="h-11" onClick={onClose} disabled={saving}>
                Batal
              </Button>
              <Button type="button" className="h-11" onClick={() => void save()} disabled={!dirty || saving || locked}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />}
                {saving ? "Menyimpan…" : "Simpan perubahan"}
              </Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <AlertDialog open={confirmReset} onOpenChange={setConfirmReset}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Kirim tautan ke {account.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Email berisi tautan sekali pakai dikirim ke {account.email}. {account.lastLogin ? "Kata sandi saat ini langsung dicabut dan semua sesi (web dan aplikasi seluler) dikeluarkan sampai kata sandi baru dibuat. " : ""}Tautan sebelumnya yang belum dipakai ikut hangus.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmReset(false);
                void save({ resetPassword: true });
              }}
            >
              Ya, kirim
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmDeactivate} onOpenChange={setConfirmDeactivate}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Nonaktifkan akun {account.name}?</AlertDialogTitle>
            <AlertDialogDescription>Yang bersangkutan tidak bisa masuk lagi sampai Anda mengaktifkannya kembali. Perubahan berlaku setelah Anda menekan “Simpan perubahan”.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setActive(false);
                setConfirmDeactivate(false);
              }}
            >
              Nonaktifkan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
