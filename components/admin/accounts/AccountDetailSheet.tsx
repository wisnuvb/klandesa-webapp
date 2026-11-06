"use client";

import { useCallback, useEffect, useId, useState } from "react";
import {
  AlertCircle, CheckCircle2, KeyRound, LogOut, Mail, Power, PowerOff, RefreshCw, Sparkles, Unlock, UserRound,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StepUpDialog, type StepUpSubmit } from "@/components/admin/StepUpDialog";
import { OneTimeSecretBox } from "./OneTimeSecretBox";
import {
  actionLabel, apiJson, fmtDateTime, postAction, roleLabel,
  type AccountDetail, type CitizenDetail, type StaffDetail,
} from "./shared";

type Kind = "staff" | "citizen";
type ActionKey = "reset-link" | "reset-code" | "force-logout" | "unlock" | "deactivate" | "activate" | "change-email" | "ai-credits";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: { kind: Kind; id: number } | null;
  /** Dipanggil setelah aksi berhasil agar daftar hasil disegarkan. */
  onChanged: () => void;
};

const DONE_MESSAGE: Partial<Record<ActionKey, string>> = {
  "force-logout": "Semua sesi akun dicabut.",
  deactivate: "Akun dinonaktifkan; semua sesi dicabut.",
  activate: "Akun diaktifkan kembali.",
  "change-email": "Email diubah; semua sesi dicabut.",
  "ai-credits": "Kredit AI disimpan.",
};

type Secret = { title: string; secret: string; warning: string; note?: string };

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[8.5rem_1fr] gap-2 py-1.5 text-sm sm:grid-cols-[10rem_1fr]">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words font-medium">{children}</dd>
    </div>
  );
}

function ActionButton({
  icon: Icon, children, onClick, destructive, disabled, hint,
}: { icon: typeof Mail; children: React.ReactNode; onClick: () => void; destructive?: boolean; disabled?: boolean; hint?: string }) {
  const hintId = useId();
  return (
    <div className="min-w-0">
      <Button
        type="button"
        variant={destructive ? "destructive" : "outline"}
        className="min-h-10 w-full justify-start"
        onClick={onClick}
        disabled={disabled}
        aria-describedby={hint ? hintId : undefined}
      >
        <Icon aria-hidden="true" className="h-4 w-4 shrink-0" />
        <span className="truncate">{children}</span>
      </Button>
      {hint ? <p id={hintId} className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
      <div className="grid gap-2 sm:grid-cols-2">{children}</div>
    </section>
  );
}

export function AccountDetailSheet({ open, onOpenChange, target, onChanged }: Props) {
  const [detail, setDetail] = useState<AccountDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [secret, setSecret] = useState<Secret | null>(null);
  const [dialog, setDialog] = useState<ActionKey | null>(null);
  const [tab, setTab] = useState("ringkasan");
  // Masukan tambahan untuk dialog tertentu
  const [newEmail, setNewEmail] = useState("");
  const [creditsMode, setCreditsMode] = useState<"set" | "delta">("set");
  const [creditsValue, setCreditsValue] = useState("");
  const [ack, setAck] = useState(false);
  const emailId = useId();
  const creditsId = useId();
  const ackId = useId();

  const load = useCallback(async (t: { kind: Kind; id: number }, signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const d = await apiJson<{ account: AccountDetail }>(`/api/admin/accounts/${t.kind}/${t.id}`, { signal });
      setDetail(d.account);
    } catch (e) {
      if ((e as { name?: string })?.name === "AbortError") return;
      setError(e instanceof Error ? e.message : "Gagal memuat detail akun.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Ganti/tutup akun: buang detail lama dan SEMUA rahasia sekali-lihat.
    setDetail(null);
    setMessage(null);
    setSecret(null);
    setDialog(null);
    setTab("ringkasan");
    if (!open || !target) return;
    const ctrl = new AbortController();
    void load(target, ctrl.signal);
    return () => ctrl.abort();
  }, [open, target, load]);

  function openDialog(a: ActionKey) {
    setNewEmail("");
    setCreditsValue("");
    setCreditsMode("set");
    setAck(false);
    setDialog(a);
  }

  async function run(action: ActionKey, v: StepUpSubmit) {
    if (!target || !detail) return;
    const extra: Record<string, unknown> = {};
    if (action === "change-email") extra.newEmail = newEmail.trim();
    if (action === "ai-credits") {
      if (!/^-?\d+$/.test(creditsValue.trim())) throw new Error("Isi angka bulat untuk kredit AI.");
      extra[creditsMode] = Number(creditsValue.trim());
    }
    if (action === "deactivate" && detail.kind === "staff" && detail.isLastActiveAdmin) {
      if (!ack) throw new Error("Centang pernyataan di atas untuk menonaktifkan admin desa terakhir.");
      extra.force = true;
    }
    const res = await postAction<Record<string, unknown>>(`/api/admin/accounts/${target.kind}/${target.id}/${action}`, { ...v, ...extra });

    setSecret(null);
    if (action === "reset-link") {
      if (typeof res.manualLink === "string") {
        setSecret({
          title: "Tautan atur sandi (hanya tampil sekali)",
          secret: res.manualLink,
          warning: "Email gagal terkirim. Sampaikan tautan ini langsung kepada pemilik akun lewat saluran tepercaya. Tautan tidak disimpan di sistem dan tidak bisa ditampilkan lagi; tutup panel = hilang.",
          note: `Berlaku sampai ${fmtDateTime(String(res.expiresAt))}.`,
        });
        setMessage("Email gagal terkirim. Gunakan tautan manual di bawah.");
      } else {
        setMessage(`Tautan atur sandi dikirim ke ${String(res.emailMasked)}.`);
      }
    } else if (action === "reset-code" && typeof res.code === "string") {
      setSecret({
        title: "Kode reset sandi warga (hanya tampil sekali)",
        secret: res.code,
        warning: "Sampaikan kode ini kepada warga yang bersangkutan. Kode tidak disimpan dan tidak bisa ditampilkan lagi.",
        note: `${String(res.note ?? "")} Berlaku sampai ${fmtDateTime(String(res.expiresAt))}.`,
      });
      setMessage("Kode reset diterbitkan.");
    } else if (action === "unlock") {
      setMessage(target.kind === "staff" ? (Number(res.cleared) > 0 ? "Pembatas login dibuka." : "Tidak ada pembatas login yang aktif untuk akun ini.") : "Kunci login warga dibuka.");
    } else {
      setMessage(DONE_MESSAGE[action] ?? "Aksi berhasil.");
    }
    await load(target);
    onChanged();
  }

  const staff = detail?.kind === "staff" ? (detail as StaffDetail) : null;
  const citizen = detail?.kind === "citizen" ? (detail as CitizenDetail) : null;

  const dialogProps = (() => {
    if (!dialog || !detail) return null;
    const who = staff ? staff.emailMasked : citizen ? `@${citizen.username}` : "";
    switch (dialog) {
      case "reset-link":
        return { title: `Kirim tautan atur sandi ke ${who}`, confirmLabel: "Kirim tautan", destructive: false, body: (
          <p>Tautan sekali pakai dikirim ke email akun (berlaku 24 jam) dan tautan lama dihanguskan. Sandi tidak pernah ditampilkan. Bila email gagal, tautan ditampilkan sekali kepada Anda.</p>
        ) };
      case "reset-code":
        return { title: `Terbitkan kode reset untuk ${who}`, confirmLabel: "Terbitkan kode", destructive: false, body: (
          <p>Kode 8 karakter berlaku 24 jam dan sekali pakai; kode reset lama dihanguskan. Warga tetap harus memasukkan NIK-nya sendiri. Kode hanya tampil sekali.</p>
        ) };
      case "force-logout":
        return { title: `Paksa keluar ${who}`, confirmLabel: "Paksa keluar", destructive: true, body: (
          <p>Semua sesi web dan aplikasi mobile akun ini berakhir seketika. Pemilik bisa masuk lagi dengan sandinya.</p>
        ) };
      case "unlock":
        return { title: `Buka pembatas login ${who}`, confirmLabel: "Buka pembatas", destructive: false, body: staff ? (
          <p>Menghapus pembatas percobaan login per-email. Pembatas per-alamat IP hangus sendiri dalam 10-15 menit.</p>
        ) : (
          <p>Mengosongkan hitungan salah sandi dan kunci sementara akun warga ini.</p>
        ) };
      case "deactivate":
        return { title: `${staff ? "Nonaktifkan" : "Bekukan"} ${who}`, confirmLabel: staff ? "Nonaktifkan" : "Bekukan", destructive: true, body: (
          <div className="space-y-3">
            <p>Akun langsung tidak bisa masuk. Semua sesi web dan mobile dicabut dan notifikasi push dimatikan. Bisa diaktifkan kembali.</p>
            {staff?.isLastActiveAdmin ? (
              <div className="rounded-md border border-destructive/50 bg-destructive/10 p-2 text-destructive">
                <p className="text-sm font-medium">Ini satu-satunya admin aktif desa {staff.village.name}.</p>
                <div className="mt-2 flex items-start gap-2">
                  <input id={ackId} type="checkbox" className="mt-1 h-4 w-4" checked={ack} onChange={(e) => setAck(e.target.checked)} />
                  <Label htmlFor={ackId} className="text-sm font-normal leading-snug">Saya paham desa ini akan tanpa admin aktif dan tetap ingin menonaktifkannya.</Label>
                </div>
              </div>
            ) : null}
          </div>
        ) };
      case "activate":
        return { title: `Aktifkan kembali ${who}`, confirmLabel: "Aktifkan", destructive: false, body: <p>Akun bisa masuk lagi dengan sandi yang ada.</p> };
      case "change-email":
        return { title: `Ubah email ${who}`, confirmLabel: "Ubah email", destructive: true, body: (
          <div className="space-y-2">
            <p>Email baru harus unik di seluruh sistem. Semua sesi dicabut dan tautan atur sandi yang belum dipakai dihanguskan. Jejak audit hanya memuat email versi tersamar.</p>
            <Label htmlFor={emailId}>Email baru</Label>
            <Input id={emailId} type="email" inputMode="email" autoComplete="off" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="nama@desa.go.id" />
          </div>
        ) };
      case "ai-credits":
        return { title: `Ubah kredit AI ${who}`, confirmLabel: "Simpan kredit", destructive: false, body: (
          <div className="space-y-2">
            <p>Saldo saat ini: <span className="font-semibold tabular-nums">{staff?.aiCredits ?? 0}</span>. Hasil tidak pernah di bawah 0.</p>
            <fieldset className="flex gap-4">
              <legend className="sr-only">Cara mengubah</legend>
              {(["set", "delta"] as const).map((m) => (
                <label key={m} className="flex min-h-10 items-center gap-2 text-sm">
                  <input type="radio" name="credits-mode" checked={creditsMode === m} onChange={() => setCreditsMode(m)} />
                  {m === "set" ? "Tetapkan saldo" : "Tambah / kurangi"}
                </label>
              ))}
            </fieldset>
            <Label htmlFor={creditsId}>{creditsMode === "set" ? "Saldo baru" : "Selisih (boleh negatif)"}</Label>
            <Input id={creditsId} inputMode="numeric" className="tabular-nums" value={creditsValue} onChange={(e) => setCreditsValue(e.target.value)} placeholder={creditsMode === "set" ? "mis. 1000" : "mis. 500 atau -200"} />
          </div>
        ) };
    }
  })();

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full gap-0 overflow-y-auto sm:max-w-xl">
          <SheetHeader className="border-b">
            <SheetTitle className="flex flex-wrap items-center gap-2">
              <UserRound aria-hidden="true" className="h-5 w-5" />
              {detail ? (staff?.name ?? citizen?.name) : "Detail akun"}
            </SheetTitle>
            <SheetDescription asChild>
              <div className="flex flex-wrap items-center gap-1.5">
                {detail ? (
                  <>
                    <Badge variant="outline">{staff ? "Pengguna desa" : "Warga mobile"}</Badge>
                    {staff ? <Badge variant="secondary">{roleLabel(staff.role)}</Badge> : null}
                    <StatusBadge detail={detail} />
                  </>
                ) : (
                  <span>Memuat…</span>
                )}
              </div>
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4 p-4">
            <div aria-live="polite" className="space-y-2">
              {message ? (
                <p role="status" className="flex items-start gap-2 rounded-md border border-emerald-600/40 bg-emerald-50 p-2 text-sm text-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100">
                  <CheckCircle2 aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
                  {message}
                </p>
              ) : null}
            </div>
            {secret ? <OneTimeSecretBox {...secret} onDismiss={() => setSecret(null)} /> : null}

            {loading && !detail ? (
              <div className="space-y-2" aria-busy="true" aria-label="Memuat detail akun">
                <Skeleton className="h-6 w-2/3" />
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
            ) : null}

            {error ? (
              <div role="alert" className="flex flex-wrap items-center gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle aria-hidden="true" className="h-4 w-4" />
                <span className="min-w-0 flex-1">{error}</span>
                {target ? (
                  <Button type="button" size="sm" variant="outline" className="min-h-10" onClick={() => void load(target)}>
                    <RefreshCw aria-hidden="true" className="h-4 w-4" /> Coba lagi
                  </Button>
                ) : null}
              </div>
            ) : null}

            {detail ? (
              <Tabs value={tab} onValueChange={setTab}>
                <TabsList className="w-full">
                  <TabsTrigger value="ringkasan" className="min-h-8 flex-1">Ringkasan</TabsTrigger>
                  <TabsTrigger value="aktivitas" className="min-h-8 flex-1">Aktivitas ({detail.audit.length})</TabsTrigger>
                </TabsList>

                <TabsContent value="ringkasan" className="mt-4 space-y-5">
                  <dl className="divide-y rounded-lg border px-3">
                    {staff ? (
                      <>
                        <Field label="Email">{staff.emailMasked}</Field>
                        <Field label="Telepon">{staff.phoneMasked || "-"}</Field>
                        <Field label="Desa">{staff.village.name} <span className="tabular-nums text-muted-foreground">({staff.village.code})</span>{!staff.village.isActive ? <Badge variant="destructive" className="ml-2">Desa nonaktif</Badge> : null}</Field>
                        <Field label="Masuk terakhir">{fmtDateTime(staff.lastLogin)}</Field>
                        <Field label="Dibuat">{fmtDateTime(staff.createdAt)}</Field>
                        <Field label="Kredit AI"><span className="tabular-nums">{staff.aiCredits}</span></Field>
                        <Field label="Sesi mobile aktif"><span className="tabular-nums">{staff.activeMobileSessions}</span></Field>
                        <Field label="Tautan atur sandi">
                          {staff.pendingTokens.reset ? `Atur ulang berlaku sampai ${fmtDateTime(staff.pendingTokens.reset.expiresAt)}` : staff.pendingTokens.invite ? `Undangan berlaku sampai ${fmtDateTime(staff.pendingTokens.invite.expiresAt)}` : "Tidak ada yang berlaku"}
                        </Field>
                      </>
                    ) : citizen ? (
                      <>
                        <Field label="Username">@{citizen.username}</Field>
                        <Field label="Desa">{citizen.village.name} <span className="tabular-nums text-muted-foreground">({citizen.village.code})</span>{!citizen.village.isActive ? <Badge variant="destructive" className="ml-2">Desa nonaktif</Badge> : null}</Field>
                        <Field label="Cara daftar">{citizen.signupMethod}</Field>
                        <Field label="Masuk terakhir">{fmtDateTime(citizen.lastLogin)}</Field>
                        <Field label="Dibuat">{fmtDateTime(citizen.createdAt)}</Field>
                        <Field label="Gagal sandi beruntun"><span className="tabular-nums">{citizen.failedAttempts}</span></Field>
                        <Field label="Terkunci sampai">{citizen.lockedUntil ? fmtDateTime(citizen.lockedUntil) : "Tidak terkunci"}</Field>
                        <Field label="Sesi mobile aktif"><span className="tabular-nums">{citizen.activeMobileSessions}</span></Field>
                        <Field label="Kode reset">{citizen.pendingResetCode ? `Berlaku sampai ${fmtDateTime(citizen.pendingResetCode.expiresAt)}` : "Tidak ada yang berlaku"}</Field>
                      </>
                    ) : null}
                  </dl>

                  {staff ? (
                    <>
                      <Group title="Akses dan sandi">
                        <ActionButton icon={Mail} onClick={() => openDialog("reset-link")} disabled={!staff.isActive} hint={!staff.isActive ? "Aktifkan akun lebih dulu." : undefined}>Kirim tautan atur sandi</ActionButton>
                        <ActionButton icon={LogOut} onClick={() => openDialog("force-logout")}>Paksa keluar semua sesi</ActionButton>
                        <ActionButton icon={Unlock} onClick={() => openDialog("unlock")}>Buka pembatas login</ActionButton>
                      </Group>
                      <Group title="Data akun">
                        <ActionButton icon={Mail} onClick={() => openDialog("change-email")}>Ubah email</ActionButton>
                        <ActionButton icon={Sparkles} onClick={() => openDialog("ai-credits")}>Ubah kredit AI</ActionButton>
                      </Group>
                      <Group title="Status akun">
                        {staff.isActive ? (
                          <ActionButton icon={PowerOff} destructive onClick={() => openDialog("deactivate")}>Nonaktifkan akun</ActionButton>
                        ) : (
                          <ActionButton icon={Power} onClick={() => openDialog("activate")}>Aktifkan kembali</ActionButton>
                        )}
                      </Group>
                    </>
                  ) : citizen ? (
                    citizen.deleted ? (
                      <p className="rounded-md border p-3 text-sm text-muted-foreground">Akun warga ini sudah dihapus; tidak ada aksi yang tersedia.</p>
                    ) : (
                      <>
                        <Group title="Akses dan sandi">
                          <ActionButton icon={KeyRound} onClick={() => openDialog("reset-code")} disabled={citizen.status === "SUSPENDED"} hint={citizen.status === "SUSPENDED" ? "Aktifkan akun lebih dulu." : undefined}>Terbitkan kode reset sandi</ActionButton>
                          <ActionButton icon={LogOut} onClick={() => openDialog("force-logout")}>Paksa keluar semua sesi</ActionButton>
                          <ActionButton icon={Unlock} onClick={() => openDialog("unlock")}>Buka kunci login</ActionButton>
                        </Group>
                        <Group title="Status akun">
                          {citizen.status === "ACTIVE" ? (
                            <ActionButton icon={PowerOff} destructive onClick={() => openDialog("deactivate")}>Bekukan akun</ActionButton>
                          ) : citizen.status === "SUSPENDED" ? (
                            <ActionButton icon={Power} onClick={() => openDialog("activate")}>Aktifkan kembali</ActionButton>
                          ) : (
                            <p className="text-xs text-muted-foreground sm:col-span-2">Pendaftaran menunggu persetujuan perangkat desa; persetujuan bukan wewenang konsol ini.</p>
                          )}
                        </Group>
                      </>
                    )
                  ) : null}
                </TabsContent>

                <TabsContent value="aktivitas" className="mt-4">
                  {detail.audit.length === 0 ? (
                    <p className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">Belum ada tindakan owner pada akun ini.</p>
                  ) : (
                    <ol className="space-y-2">
                      {detail.audit.map((a) => (
                        <li key={a.id} className="rounded-lg border p-3 text-sm">
                          <div className="flex flex-wrap items-center justify-between gap-1">
                            <span className="font-medium">{actionLabel(a.action)}</span>
                            <time dateTime={a.createdAt} className="text-xs tabular-nums text-muted-foreground">{fmtDateTime(a.createdAt)}</time>
                          </div>
                          <p className="mt-1 break-words text-muted-foreground">{a.summary}</p>
                          {a.reason ? <p className="mt-1 break-words text-xs"><span className="text-muted-foreground">Alasan:</span> {a.reason}</p> : null}
                          <p className="mt-1 break-all text-xs text-muted-foreground">Oleh {a.actorEmail}</p>
                        </li>
                      ))}
                    </ol>
                  )}
                </TabsContent>
              </Tabs>
            ) : null}
          </div>
        </SheetContent>
      </Sheet>

      {dialogProps && dialog ? (
        <StepUpDialog
          key={dialog}
          open
          onOpenChange={(v) => {
            if (!v) setDialog(null);
          }}
          title={dialogProps.title}
          description={dialogProps.body}
          confirmLabel={dialogProps.confirmLabel}
          destructive={dialogProps.destructive}
          onConfirm={(v) => run(dialog, v)}
        />
      ) : null}
    </>
  );
}

function StatusBadge({ detail }: { detail: AccountDetail }) {
  if (detail.kind === "staff") {
    return detail.isActive ? <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">Aktif</Badge> : <Badge variant="destructive">Nonaktif</Badge>;
  }
  if (detail.deleted) return <Badge variant="destructive">Dihapus</Badge>;
  if (detail.status === "SUSPENDED") return <Badge variant="destructive">Dibekukan</Badge>;
  if (detail.status === "PENDING_VERIFY") return <Badge variant="secondary">Menunggu persetujuan</Badge>;
  return detail.lockedUntil ? <Badge variant="secondary">Aktif, terkunci</Badge> : <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">Aktif</Badge>;
}
