"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type PartnerMe = {
  partner: {
    id: number;
    email: string;
    name: string;
    phone: string | null;
    region: string | null;
    status: string;
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

  useEffect(() => {
    let mounted = true;
    const load = async () => {
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
  }, []);

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
    </div>
  );
}
