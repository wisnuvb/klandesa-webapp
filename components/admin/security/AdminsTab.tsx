"use client";

import { useCallback, useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import { Ban, CircleCheck, KeyRound, LockOpen, LogOut, Mail, MailQuestion, MoreHorizontal, RefreshCw, ShieldCheck, ShieldOff, UserCheck, UserPlus, UserX } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StepUpDialog } from "@/components/admin/StepUpDialog";
import { apiJson, formatWib } from "./api";
import { InviteAdminDialog, type InviteResult } from "./InviteAdminDialog";
import { ManualLinkDialog } from "./ManualLinkDialog";

type Admin = {
  id: number;
  email: string;
  name: string;
  isActive: boolean;
  totpEnabled: boolean;
  lastLogin: string | null;
  pendingInvite: boolean;
};
type Action = "deactivate" | "activate" | "force_logout" | "reset_link" | "resend_invite" | "reset_2fa" | "unlock";
type Delivery = { sent: boolean; manualLink?: string; expiresAt: string };

const ACTION_COPY: Record<Action, { title: (a: Admin) => string; confirm: string; destructive: boolean; body: (a: Admin, me: boolean) => string; done: string }> = {
  deactivate: {
    title: (a) => `Nonaktifkan ${a.email}`,
    confirm: "Nonaktifkan",
    destructive: true,
    body: () => "Admin ini tidak bisa masuk lagi dan semua sesinya langsung berakhir. Bisa diaktifkan kembali.",
    done: "Admin dinonaktifkan.",
  },
  activate: { title: (a) => `Aktifkan ${a.email}`, confirm: "Aktifkan", destructive: false, body: () => "Admin ini bisa masuk lagi dengan kata sandi (dan 2FA) yang dimilikinya.", done: "Admin diaktifkan." },
  force_logout: {
    title: (a) => `Paksa keluar ${a.email}`,
    confirm: "Paksa keluar",
    destructive: true,
    body: (_a, me) => (me ? "Semua sesi Anda sendiri, termasuk yang ini, akan berakhir." : "Semua sesi admin ini di semua perangkat berakhir. Ia perlu masuk lagi."),
    done: "Semua sesi dicabut.",
  },
  reset_link: {
    title: (a) => `Kirim tautan atur ulang sandi ke ${a.email}`,
    confirm: "Kirim tautan",
    destructive: false,
    body: () => "Tautan sekali pakai dikirim ke email admin (berlaku 24 jam). Sandi tidak pernah ditampilkan. 2FA admin tidak berubah.",
    done: "Tautan atur ulang sandi dikirim.",
  },
  resend_invite: {
    title: (a) => `Kirim ulang undangan ke ${a.email}`,
    confirm: "Kirim ulang",
    destructive: false,
    body: () => "Undangan sebelumnya hangus dan tautan baru (72 jam) dikirim ke email admin.",
    done: "Undangan dikirim ulang.",
  },
  unlock: {
    title: (a) => `Buka kunci login ${a.email}`,
    confirm: "Buka kunci",
    destructive: false,
    body: () => "Menghapus pembatas percobaan kode 2FA, login, dan konfirmasi sandi untuk admin ini. Pakai bila admin sah tertolak karena terkunci (mis. ada yang menebak kodenya). Sandi dan 2FA tidak berubah.",
    done: "Kunci login dibuka.",
  },
  reset_2fa: {
    title: (a) => `Reset 2FA ${a.email}`,
    confirm: "Reset 2FA",
    destructive: true,
    body: () => "2FA dan kode pemulihan admin ini dihapus dan semua sesinya berakhir. Gunakan hanya bila ia kehilangan perangkat autentikator dan identitasnya sudah dipastikan. Ia disarankan mendaftar ulang 2FA setelah masuk.",
    done: "2FA direset dan sesi dicabut.",
  },
};

function StatusBadge({ a }: { a: Admin }) {
  if (!a.isActive)
    return (
      <Badge variant="outline" className="gap-1">
        <Ban className="size-3" aria-hidden="true" />
        Nonaktif
      </Badge>
    );
  if (a.pendingInvite)
    return (
      <Badge variant="secondary" className="gap-1">
        <MailQuestion className="size-3" aria-hidden="true" />
        Undangan tertunda
      </Badge>
    );
  return (
    <Badge className="gap-1 bg-emerald-100 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300">
      <CircleCheck className="size-3" aria-hidden="true" />
      Aktif
    </Badge>
  );
}

function TotpBadge({ on }: { on: boolean }) {
  return on ? (
    <span className="inline-flex items-center gap-1 text-sm text-emerald-700 dark:text-emerald-400">
      <ShieldCheck className="size-4" aria-hidden="true" />
      Aktif
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
      <ShieldOff className="size-4" aria-hidden="true" />
      Belum
    </span>
  );
}

function RowMenu({ a, me, onAction }: { a: Admin; me: boolean; onAction: (a: Admin, act: Action) => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-10" aria-label={`Aksi untuk ${a.email}`}>
          <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {a.isActive ? (
          <>
            {a.pendingInvite ? (
              <DropdownMenuItem onSelect={() => onAction(a, "resend_invite")}>
                <Mail className="mr-2 h-4 w-4" aria-hidden="true" />
                Kirim ulang undangan
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onSelect={() => onAction(a, "reset_link")}>
                <KeyRound className="mr-2 h-4 w-4" aria-hidden="true" />
                Kirim tautan atur ulang sandi
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onSelect={() => onAction(a, "force_logout")}>
              <LogOut className="mr-2 h-4 w-4" aria-hidden="true" />
              Paksa keluar
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onAction(a, "unlock")}>
              <LockOpen className="mr-2 h-4 w-4" aria-hidden="true" />
              Buka kunci login
            </DropdownMenuItem>
            {a.totpEnabled && !me ? (
              <DropdownMenuItem onSelect={() => onAction(a, "reset_2fa")}>
                <ShieldOff className="mr-2 h-4 w-4" aria-hidden="true" />
                Reset 2FA
              </DropdownMenuItem>
            ) : null}
            {!me ? (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => onAction(a, "deactivate")}>
                  <UserX className="mr-2 h-4 w-4" aria-hidden="true" />
                  Nonaktifkan
                </DropdownMenuItem>
              </>
            ) : null}
          </>
        ) : (
          <DropdownMenuItem onSelect={() => onAction(a, "activate")}>
            <UserCheck className="mr-2 h-4 w-4" aria-hidden="true" />
            Aktifkan
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AdminsTab() {
  const [admins, setAdmins] = useState<Admin[] | null>(null);
  const [me, setMe] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [pending, setPending] = useState<{ admin: Admin; action: Action } | null>(null);
  const [manual, setManual] = useState<{ link: string; expiresAt: string } | null>(null);

  const [reloadKey, setReloadKey] = useState(0);
  const load = useCallback(() => setReloadKey((k) => k + 1), []);
  useEffect(() => {
    let alive = true;
    apiJson<{ admins: Admin[]; me: number }>("/api/admin/platform-users")
      .then((r) => {
        if (!alive) return;
        setAdmins(r.admins);
        setMe(r.me);
        setError(null);
      })
      .catch((e) => alive && setError(e instanceof Error ? e.message : "Gagal memuat daftar admin."));
    return () => {
      alive = false;
    };
  }, [reloadKey]);

  function announce(d: Delivery | undefined, okMessage: string) {
    if (d && !d.sent && d.manualLink) setManual({ link: d.manualLink, expiresAt: d.expiresAt });
    else toast.success(okMessage);
  }

  const copy = pending ? ACTION_COPY[pending.action] : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Admin platform punya akses lintas desa. Aktifkan 2FA untuk semua admin; setiap aksi di bawah memerlukan sandi Anda dan tercatat di jejak audit.
        </p>
        <div className="flex gap-2">
          <Button variant="outline" className="min-h-10" onClick={() => void load()} aria-label="Muat ulang daftar admin">
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Button className="min-h-10" onClick={() => setInviteOpen(true)}>
            <UserPlus className="mr-2 h-4 w-4" aria-hidden="true" />
            Undang admin
          </Button>
        </div>
      </div>

      {error ? (
        <Card>
          <CardContent className="space-y-3 pt-6">
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
            <Button variant="outline" onClick={() => {
                setError(null);
                setAdmins(null);
                load();
              }}>
              Coba lagi
            </Button>
          </CardContent>
        </Card>
      ) : !admins ? (
        <div className="space-y-2" aria-busy="true" aria-label="Memuat daftar admin">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : admins.length === 0 ? (
        <p className="text-sm text-muted-foreground">Belum ada admin platform.</p>
      ) : (
        <>
          {/* Tabel di layar lebar */}
          <div className="hidden rounded-md border md:block">
            <Table>
              <caption className="sr-only">Daftar admin platform</caption>
              <TableHeader>
                <TableRow>
                  <TableHead scope="col">Admin</TableHead>
                  <TableHead scope="col">Status</TableHead>
                  <TableHead scope="col">2FA</TableHead>
                  <TableHead scope="col">Login terakhir</TableHead>
                  <TableHead scope="col" className="w-14 text-right">
                    <span className="sr-only">Aksi</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {admins.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>
                      <div className="font-medium">
                        {a.name}
                        {a.id === me ? <span className="ml-2 text-xs font-normal text-muted-foreground">(Anda)</span> : null}
                      </div>
                      <div className="text-xs text-muted-foreground">{a.email}</div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge a={a} />
                    </TableCell>
                    <TableCell>
                      <TotpBadge on={a.totpEnabled} />
                    </TableCell>
                    <TableCell className="text-sm tabular-nums">{formatWib(a.lastLogin)}</TableCell>
                    <TableCell className="text-right">
                      <RowMenu a={a} me={a.id === me} onAction={(ad, act) => setPending({ admin: ad, action: act })} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {/* Kartu di layar sempit (375px) */}
          <ul className="space-y-2 md:hidden" aria-label="Daftar admin platform">
            {admins.map((a) => (
              <li key={a.id} className="rounded-md border p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium">
                      {a.name}
                      {a.id === me ? <span className="ml-2 text-xs font-normal text-muted-foreground">(Anda)</span> : null}
                    </p>
                    <p className="break-all text-xs text-muted-foreground">{a.email}</p>
                  </div>
                  <RowMenu a={a} me={a.id === me} onAction={(ad, act) => setPending({ admin: ad, action: act })} />
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
                  <StatusBadge a={a} />
                  <span className="text-xs text-muted-foreground">2FA:</span>
                  <TotpBadge on={a.totpEnabled} />
                </div>
                <p className="mt-1 text-xs tabular-nums text-muted-foreground">Login terakhir: {formatWib(a.lastLogin)}</p>
              </li>
            ))}
          </ul>
        </>
      )}

      <InviteAdminDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        onInvited={(r: InviteResult) => {
          announce(r.delivery, `Undangan dikirim ke ${r.admin.email}.`);
          load();
        }}
      />

      {pending && copy ? (
        <StepUpDialog
          open
          onOpenChange={(o) => !o && setPending(null)}
          title={copy.title(pending.admin)}
          description={copy.body(pending.admin, pending.admin.id === me)}
          confirmLabel={copy.confirm}
          destructive={copy.destructive}
          onConfirm={async ({ confirmPassword, reason, totpCode }) => {
            const target = pending.admin;
            const action = pending.action;
            const r = await apiJson<{ delivery?: Delivery }>(`/api/admin/platform-users/${target.id}`, { method: "POST", body: { action, confirmPassword, reason, totpCode } });
            announce(r.delivery, ACTION_COPY[action].done);
            if (action === "force_logout" && target.id === me) {
              await signOut({ callbackUrl: "/auth/signin?sesi=berakhir" });
              return;
            }
            load();
          }}
        />
      ) : null}

      <ManualLinkDialog link={manual?.link ?? null} expiresAt={manual?.expiresAt} onClose={() => setManual(null)} />
    </div>
  );
}
