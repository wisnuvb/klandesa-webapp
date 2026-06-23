"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import type { Session } from "next-auth";
import { Eye, EyeOff, Copy, ExternalLink, Lock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { hasPartnerPortalAccess } from "@/lib/partner-session";

type PartnerMe = {
  partner: {
    id: number;
    email: string;
    name: string;
    phone: string | null;
    region: string | null;
    status: string;
    publicSlug: string | null;
    publicHeadline: string | null;
    publicBio: string | null;
    publicWhatsapp: string | null;
    publicPageEnabled: boolean;
    referralCode: string | null;
    referralStatus: string | null;
    shareUrl: string | null;
  };
};

type BankAccount = {
  bankName: string;
  accountNumber: string;
  accountName: string;
  verifiedAt: string | null;
};

function extractErrorMessage(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  const v = value as { error?: unknown };
  return typeof v.error === "string" && v.error.trim() ? v.error : null;
}

export default function MitraProfilPage() {
  const { data: session } = useSession();
  const portalOk = useMemo(
    () => hasPartnerPortalAccess(session as Session | null),
    [session],
  );

  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingBank, setSavingBank] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const [profile, setProfile] = useState({
    name: "",
    phone: "",
    region: "",
    email: "",
  });
  const [publicPage, setPublicPage] = useState({
    publicSlug: "",
    publicHeadline: "",
    publicBio: "",
    publicWhatsapp: "",
    publicPageEnabled: true,
    referralCode: null as string | null,
    referralStatus: null as string | null,
    shareUrl: null as string | null,
  });
  const [savingPublicPage, setSavingPublicPage] = useState(false);
  const [bank, setBank] = useState({
    bankName: "",
    accountNumber: "",
    accountName: "",
    verifiedAt: null as string | null,
  });

  const canSaveProfile = useMemo(
    () => profile.name.trim().length > 0,
    [profile.name],
  );
  const canSaveBank = useMemo(
    () =>
      bank.bankName.trim().length > 0 &&
      bank.accountNumber.trim().length > 0 &&
      bank.accountName.trim().length > 0,
    [bank.accountName, bank.accountNumber, bank.bankName],
  );

  const [pwdError, setPwdError] = useState<string | null>(null);
  const [pwdOk, setPwdOk] = useState<string | null>(null);
  const [savingPassword, setSavingPassword] = useState(false);
  const [showCurPw, setShowCurPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfPw, setShowConfPw] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    current: "",
    next: "",
    confirm: "",
  });

  const canChangePassword =
    passwordForm.current.length > 0 &&
    passwordForm.next.length >= 8 &&
    passwordForm.next === passwordForm.confirm;

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!portalOk) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setError(null);
        const [meRes, bankRes] = await Promise.all([
          fetch("/api/partner/me", { cache: "no-store" }),
          fetch("/api/partner/bank-account", { cache: "no-store" }),
        ]);
        if (!mounted) return;

        const me = (await meRes.json().catch(() => null)) as
          | PartnerMe
          | { error?: string }
          | null;
        if (!meRes.ok) {
          throw new Error(extractErrorMessage(me) || "Gagal memuat profil");
        }
        const partner = (me as PartnerMe).partner;
        setProfile({
          name: partner.name ?? "",
          phone: partner.phone ?? "",
          region: partner.region ?? "",
          email: partner.email ?? "",
        });
        setPublicPage({
          publicSlug: partner.publicSlug ?? "",
          publicHeadline: partner.publicHeadline ?? "",
          publicBio: partner.publicBio ?? "",
          publicWhatsapp: partner.publicWhatsapp ?? "",
          publicPageEnabled: partner.publicPageEnabled ?? true,
          referralCode: partner.referralCode ?? null,
          referralStatus: partner.referralStatus ?? null,
          shareUrl: partner.shareUrl ?? null,
        });

        const bankData = (await bankRes.json().catch(() => null)) as {
          bankAccount?: BankAccount | null;
          error?: string;
        } | null;
        if (bankRes.ok && bankData?.bankAccount) {
          setBank({
            bankName: bankData.bankAccount.bankName,
            accountNumber: bankData.bankAccount.accountNumber,
            accountName: bankData.bankAccount.accountName,
            verifiedAt: bankData.bankAccount.verifiedAt,
          });
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Gagal memuat data");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void load();
    return () => {
      mounted = false;
    };
  }, [portalOk]);

  const savePublicPage = async () => {
    try {
      setSavingPublicPage(true);
      setError(null);
      setOk(null);
      const res = await fetch("/api/partner/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          publicSlug: publicPage.publicSlug.trim() || null,
          publicHeadline: publicPage.publicHeadline.trim() || null,
          publicBio: publicPage.publicBio.trim() || null,
          publicWhatsapp: publicPage.publicWhatsapp.trim() || null,
          publicPageEnabled: publicPage.publicPageEnabled,
        }),
      });
      const data = (await res.json().catch(() => null)) as PartnerMe | {
        error?: string;
      } | null;
      if (!res.ok) {
        throw new Error(extractErrorMessage(data) || "Gagal menyimpan halaman publik");
      }
      const partner = (data as PartnerMe).partner;
      setPublicPage({
        publicSlug: partner.publicSlug ?? "",
        publicHeadline: partner.publicHeadline ?? "",
        publicBio: partner.publicBio ?? "",
        publicWhatsapp: partner.publicWhatsapp ?? "",
        publicPageEnabled: partner.publicPageEnabled ?? true,
        referralCode: partner.referralCode ?? null,
        referralStatus: partner.referralStatus ?? null,
        shareUrl: partner.shareUrl ?? null,
      });
      setOk("Halaman publik berhasil disimpan");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menyimpan halaman publik");
    } finally {
      setSavingPublicPage(false);
    }
  };

  const copyShareLink = async () => {
    if (!publicPage.shareUrl) return;
    await navigator.clipboard.writeText(publicPage.shareUrl);
    setOk(`Link disalin: ${publicPage.shareUrl}`);
  };

  const saveProfile = async () => {
    if (!canSaveProfile) return;
    try {
      setSavingProfile(true);
      setError(null);
      setOk(null);
      const res = await fetch("/api/partner/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: profile.name,
          phone: profile.phone || null,
          region: profile.region || null,
        }),
      });
      const data = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      if (!res.ok) throw new Error(data?.error || "Gagal menyimpan profil");
      setOk("Profil berhasil disimpan");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menyimpan profil");
    } finally {
      setSavingProfile(false);
    }
  };

  const saveBank = async () => {
    if (!canSaveBank) return;
    try {
      setSavingBank(true);
      setError(null);
      setOk(null);
      const res = await fetch("/api/partner/bank-account", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bankName: bank.bankName,
          accountNumber: bank.accountNumber,
          accountName: bank.accountName,
        }),
      });
      const data = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      if (!res.ok) throw new Error(data?.error || "Gagal menyimpan rekening");
      setOk("Rekening berhasil disimpan");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menyimpan rekening");
    } finally {
      setSavingBank(false);
    }
  };

  const savePassword = async () => {
    if (!canChangePassword) return;
    try {
      setSavingPassword(true);
      setPwdError(null);
      setPwdOk(null);
      const res = await fetch("/api/partner/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: profile.name.trim(),
          phone: profile.phone.trim() || null,
          region: profile.region.trim() || null,
          currentPassword: passwordForm.current,
          newPassword: passwordForm.next,
          confirmPassword: passwordForm.confirm,
        }),
      });
      const data = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      if (!res.ok) {
        throw new Error(data?.error || "Gagal mengubah password");
      }
      setPasswordForm({ current: "", next: "", confirm: "" });
      setPwdOk("Password berhasil diubah.");
    } catch (e) {
      setPwdError(e instanceof Error ? e.message : "Gagal mengubah password");
    } finally {
      setSavingPassword(false);
    }
  };

  if (!portalOk) {
    return (
      <div className="p-4 md:p-6">
        <Card>
          <CardHeader>
            <CardTitle>Profil tidak tersedia</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Halaman ini hanya untuk akun dengan akses portal mitra.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Profil mitra</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <div className="text-sm font-medium">Nama</div>
              <Input
                value={profile.name}
                onChange={(e) =>
                  setProfile((p) => ({ ...p, name: e.target.value }))
                }
                placeholder="Nama lengkap"
                disabled={loading}
              />
            </div>
            <div className="space-y-1">
              <div className="text-sm font-medium">Email</div>
              <Input value={profile.email} disabled />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <div className="text-sm font-medium">Nomor HP</div>
                <Input
                  value={profile.phone}
                  onChange={(e) =>
                    setProfile((p) => ({ ...p, phone: e.target.value }))
                  }
                  placeholder="08xxxxxxxxxx"
                  disabled={loading}
                />
              </div>
              <div className="space-y-1">
                <div className="text-sm font-medium">Wilayah</div>
                <Input
                  value={profile.region}
                  onChange={(e) =>
                    setProfile((p) => ({ ...p, region: e.target.value }))
                  }
                  placeholder="Contoh: Kab. Sleman, DIY"
                  disabled={loading}
                />
              </div>
            </div>
            {error ? (
              <div className="text-sm text-red-600" role="alert">
                {error}
              </div>
            ) : ok ? (
              <div className="text-sm text-green-700" role="status">
                {ok}
              </div>
            ) : null}
            <Button
              className="w-full sm:w-auto"
              disabled={!canSaveProfile || savingProfile}
              onClick={saveProfile}
            >
              {savingProfile ? "Menyimpan…" : "Simpan profil"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Rekening komisi</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <div className="text-sm font-medium">Nama bank</div>
              <Input
                value={bank.bankName}
                onChange={(e) =>
                  setBank((p) => ({ ...p, bankName: e.target.value }))
                }
                placeholder="Contoh: BCA"
                disabled={loading}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <div className="text-sm font-medium">Nomor rekening</div>
                <Input
                  value={bank.accountNumber}
                  onChange={(e) =>
                    setBank((p) => ({ ...p, accountNumber: e.target.value }))
                  }
                  placeholder="1234567890"
                  disabled={loading}
                />
              </div>
              <div className="space-y-1">
                <div className="text-sm font-medium">Nama pemilik</div>
                <Input
                  value={bank.accountName}
                  onChange={(e) =>
                    setBank((p) => ({ ...p, accountName: e.target.value }))
                  }
                  placeholder="Sesuai buku tabungan"
                  disabled={loading}
                />
              </div>
            </div>
            <div className="text-xs text-muted-foreground">
              {bank.verifiedAt ? "Terverifikasi" : "Belum terverifikasi"}
            </div>
            <Button
              className="w-full sm:w-auto"
              disabled={!canSaveBank || savingBank}
              onClick={saveBank}
            >
              {savingBank ? "Menyimpan…" : "Simpan rekening"}
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Halaman publik</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Halaman ini bisa dibagikan ke calon konsumen (desa &amp; pemda). Link
            otomatis mencatat kunjungan dan lead ke akun mitra Anda.
          </p>
          {!publicPage.referralCode ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              Belum ada kode referral aktif. Hubungi admin Klandesa agar halaman
              publik bisa dipublikasikan.
            </div>
          ) : publicPage.shareUrl ? (
            <div className="space-y-2">
              <div className="text-sm font-medium">Link share</div>
              <div className="text-sm break-all font-mono bg-muted rounded-md px-3 py-2">
                {publicPage.shareUrl}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" onClick={() => void copyShareLink()}>
                  <Copy className="w-4 h-4 mr-2" />
                  Salin link
                </Button>
                <Button asChild variant="outline">
                  <a href={publicPage.shareUrl} target="_blank" rel="noreferrer">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Preview
                  </a>
                </Button>
              </div>
            </div>
          ) : (
            <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
              Halaman publik nonaktif atau kode referral belum aktif.
            </div>
          )}
          <div className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-3">
            <div>
              <div className="text-sm font-medium">Publikasikan halaman</div>
              <div className="text-xs text-muted-foreground">
                Nonaktifkan jika tidak ingin link dibuka publik.
              </div>
            </div>
            <Switch
              checked={publicPage.publicPageEnabled}
              onCheckedChange={(checked) =>
                setPublicPage((p) => ({ ...p, publicPageEnabled: checked }))
              }
              disabled={loading}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <div className="text-sm font-medium">Slug URL (opsional)</div>
              <Input
                value={publicPage.publicSlug}
                onChange={(e) =>
                  setPublicPage((p) => ({ ...p, publicSlug: e.target.value }))
                }
                placeholder={
                  publicPage.referralCode
                    ? `Kosongkan untuk pakai ${publicPage.referralCode.toLowerCase()}`
                    : "mis. wisnu-jatim"
                }
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                Hanya huruf kecil, angka, dan strip. Contoh: /m/wisnu-jatim
              </p>
            </div>
            <div className="space-y-1">
              <div className="text-sm font-medium">WhatsApp CTA</div>
              <Input
                value={publicPage.publicWhatsapp}
                onChange={(e) =>
                  setPublicPage((p) => ({ ...p, publicWhatsapp: e.target.value }))
                }
                placeholder="08xxxxxxxxxx (kosongkan = pakai nomor profil)"
                disabled={loading}
              />
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-sm font-medium">Headline hero</div>
            <Input
              value={publicPage.publicHeadline}
              onChange={(e) =>
                setPublicPage((p) => ({ ...p, publicHeadline: e.target.value }))
              }
              placeholder="Digitalisasi desa & pemda bersama Klandesa"
              disabled={loading}
            />
          </div>
          <div className="space-y-1">
            <div className="text-sm font-medium">Bio / perkenalan</div>
            <Textarea
              value={publicPage.publicBio}
              onChange={(e) =>
                setPublicPage((p) => ({ ...p, publicBio: e.target.value }))
              }
              placeholder="Ceritakan singkat pengalaman dan wilayah layanan Anda..."
              rows={4}
              disabled={loading}
            />
          </div>
          <Button
            className="w-full sm:w-auto"
            disabled={loading || savingPublicPage}
            onClick={() => void savePublicPage()}
          >
            {savingPublicPage ? "Menyimpan…" : "Simpan halaman publik"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Lock className="h-4 w-4" />
            Ubah password login portal
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 max-w-lg">
          <p className="text-sm text-muted-foreground">
            Password dipakai saat Anda login sebagai mitra dengan email mitra Anda. Minimal 8
            karakter.
          </p>
          <div className="space-y-1">
            <div className="text-sm font-medium">Password saat ini</div>
            <div className="relative">
              <Input
                className="pr-10"
                type={showCurPw ? "text" : "password"}
                autoComplete="current-password"
                value={passwordForm.current}
                onChange={(e) =>
                  setPasswordForm((p) => ({ ...p, current: e.target.value }))
                }
                disabled={loading}
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 rounded-md"
                aria-label={showCurPw ? "Sembunyikan" : "Tampilkan"}
                onClick={() => setShowCurPw((v) => !v)}
              >
                {showCurPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-sm font-medium">Password baru</div>
            <div className="relative">
              <Input
                className="pr-10"
                type={showNewPw ? "text" : "password"}
                autoComplete="new-password"
                value={passwordForm.next}
                onChange={(e) =>
                  setPasswordForm((p) => ({ ...p, next: e.target.value }))
                }
                disabled={loading}
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 rounded-md"
                aria-label={showNewPw ? "Sembunyikan" : "Tampilkan"}
                onClick={() => setShowNewPw((v) => !v)}
              >
                {showNewPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-sm font-medium">Konfirmasi password baru</div>
            <div className="relative">
              <Input
                className="pr-10"
                type={showConfPw ? "text" : "password"}
                autoComplete="new-password"
                value={passwordForm.confirm}
                onChange={(e) =>
                  setPasswordForm((p) => ({ ...p, confirm: e.target.value }))
                }
                disabled={loading}
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 rounded-md"
                aria-label={showConfPw ? "Sembunyikan" : "Tampilkan"}
                onClick={() => setShowConfPw((v) => !v)}
              >
                {showConfPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          {pwdError ? (
            <div className="text-sm text-red-600" role="alert">
              {pwdError}
            </div>
          ) : pwdOk ? (
            <div className="text-sm text-green-700" role="status">
              {pwdOk}
            </div>
          ) : null}
          <Button
            type="button"
            variant="secondary"
            disabled={
              loading || savingPassword || !canChangePassword
            }
            onClick={() => void savePassword()}
          >
            {savingPassword ? "Menyimpan…" : "Simpan password baru"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
