"use client";

import { useCallback, useId, useState } from "react";
import { CheckCircle2, Clock, Loader2, MapPinned, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiJson, formatWib } from "@/components/admin/security/api";
import { LIMITS } from "@/lib/aspirasi/catalog";
import { WilayahPicker } from "./WilayahPicker";
import { publicAreaPath, type ClaimState, type DashboardData } from "./types";

type Props = { data: DashboardData; prefillSlug: string | null; onSubmitted: () => void };

/** Kartu "Aktifkan halaman aspirasi desa Anda" + status permohonan klaim terakhir. */
export function ClaimPanel({ data, prefillSlug, onSubmitted }: Props) {
  const ids = { pos: useId(), phone: useId(), ev: useId() };
  const [code, setCode] = useState("");
  const [position, setPosition] = useState("");
  const [phone, setPhone] = useState("");
  const [evidence, setEvidence] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const onCode = useCallback((c: string) => setCode(c), []);

  const claim = data.claim;
  const pending = claim?.status === "PENDING";
  const canCreate = data.can.create;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setFields({});
    if (!prefillSlug && !code) {
      setError("Pilih desa atau kelurahan sampai tingkat paling bawah.");
      return;
    }
    const fe: Record<string, string> = {};
    if (position.trim().length < 2) fe.position = "Isi jabatan Anda di desa.";
    if (evidence.trim().length < LIMITS.claimEvidenceMin) fe.evidenceNote = `Jelaskan bukti Anda (minimal ${LIMITS.claimEvidenceMin} karakter).`;
    if (Object.keys(fe).length) {
      setFields(fe);
      return;
    }
    setBusy(true);
    try {
      await apiJson("/api/aspirasi-publik/claim", {
        method: "POST",
        body: { ...(prefillSlug ? { areaSlug: prefillSlug } : { areaCode: code }), position, contactPhone: phone, evidenceNote: evidence },
      });
      onSubmitted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengajukan klaim.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {claim ? <ClaimStatus claim={claim} /> : null}
      {pending ? null : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <MapPinned className="h-5 w-5" aria-hidden="true" />
              Aktifkan halaman aspirasi desa Anda
            </CardTitle>
            <CardDescription>
              Warga dapat melaporkan kondisi desa di klandesa.com. Setelah klaim Anda diverifikasi tim Klandesa, desa Anda dapat menanggapi, memberi kabar progres, atau
              menyanggah laporan secara terbuka. Satu desa hanya mengelola satu wilayah.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!canCreate ? (
              <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">Akun Anda tidak berhak mengajukan klaim. Minta admin desa memberi izin pada menu Akses Pengguna.</p>
            ) : (
              <form onSubmit={submit} className="space-y-4" noValidate>
                {prefillSlug ? (
                  <p className="rounded-md bg-muted p-3 text-sm">
                    Wilayah yang diklaim: <a className="font-medium underline underline-offset-2" href={publicAreaPath(prefillSlug)} target="_blank" rel="noopener noreferrer">halaman {prefillSlug}</a>.
                  </p>
                ) : (
                  <fieldset className="space-y-2">
                    <legend className="text-sm font-medium">Wilayah yang dikelola</legend>
                    <WilayahPicker
                      onChange={onCode}
                      hint={{ province: data.village.province, regency: data.village.regency, district: data.village.district, name: data.village.name }}
                      disabled={busy}
                    />
                  </fieldset>
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor={ids.pos}>Jabatan Anda di desa</Label>
                    <Input id={ids.pos} value={position} onChange={(e) => setPosition(e.target.value)} maxLength={120} placeholder="Contoh: Sekretaris Desa" aria-invalid={fields.position ? true : undefined} aria-describedby={fields.position ? `${ids.pos}-e` : undefined} required />
                    {fields.position ? <p id={`${ids.pos}-e`} className="text-sm text-destructive">{fields.position}</p> : null}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor={ids.phone}>Nomor WhatsApp (opsional)</Label>
                    <Input id={ids.phone} type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={30} placeholder="08xxxxxxxxxx" aria-invalid={fields.contactPhone ? true : undefined} />
                    {fields.contactPhone ? <p className="text-sm text-destructive">{fields.contactPhone}</p> : null}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor={ids.ev}>Bukti Anda mewakili desa ini</Label>
                  <Textarea
                    id={ids.ev}
                    value={evidence}
                    onChange={(e) => setEvidence(e.target.value)}
                    rows={4}
                    maxLength={LIMITS.claimEvidenceMax}
                    placeholder="Contoh: situs resmi desa https://namadesa.desa.id (nama saya tercantum di halaman perangkat), atau nomor SK pengangkatan jabatan."
                    aria-invalid={fields.evidenceNote ? true : undefined}
                    aria-describedby={`${ids.ev}-h`}
                    required
                  />
                  <p id={`${ids.ev}-h`} className={`text-sm ${fields.evidenceNote ? "text-destructive" : "text-muted-foreground"}`}>
                    {fields.evidenceNote ?? `Minimal ${LIMITS.claimEvidenceMin} karakter. Tim Klandesa memeriksa bukti ini secara manual sebelum menyetujui.`}
                  </p>
                </div>

                {error ? (
                  <p role="alert" className="rounded-md border border-destructive/40 p-3 text-sm text-destructive">
                    {error}
                  </p>
                ) : null}
                <Button type="submit" className="min-h-11" disabled={busy}>
                  {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : null}
                  Ajukan klaim
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ClaimStatus({ claim }: { claim: NonNullable<ClaimState> }) {
  const cfg = {
    PENDING: { icon: Clock, title: "Permohonan klaim menunggu verifikasi", tone: "border-amber-500/50 bg-amber-50 text-amber-950 dark:bg-amber-950/20 dark:text-amber-100" },
    APPROVED: { icon: CheckCircle2, title: "Klaim disetujui", tone: "border-emerald-600/40 bg-emerald-50 text-emerald-950 dark:bg-emerald-950/20 dark:text-emerald-100" },
    REJECTED: { icon: XCircle, title: "Klaim belum dapat disetujui", tone: "border-destructive/40 bg-destructive/5" },
    REVOKED: { icon: XCircle, title: "Klaim dicabut", tone: "border-destructive/40 bg-destructive/5" },
  }[claim.status];
  const Icon = cfg.icon;
  return (
    <div role="status" className={`flex gap-3 rounded-lg border p-4 ${cfg.tone}`}>
      <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
      <div className="min-w-0 space-y-1 text-sm">
        <p className="font-semibold">{cfg.title}</p>
        <p>
          Wilayah: {claim.area.name}, Kec. {claim.area.district}, {claim.area.regency}. Diajukan {formatWib(claim.createdAt)}.
        </p>
        {claim.status === "PENDING" ? <p>Tim Klandesa memeriksa bukti Anda secara manual, biasanya dalam beberapa hari kerja. Kami mengabari lewat email akun Anda.</p> : null}
        {claim.reviewNote ? <p>Catatan tim: {claim.reviewNote}</p> : null}
        {claim.status === "REJECTED" || claim.status === "REVOKED" ? <p>Anda dapat mengajukan klaim lagi dengan bukti yang lebih lengkap.</p> : null}
      </div>
    </div>
  );
}
