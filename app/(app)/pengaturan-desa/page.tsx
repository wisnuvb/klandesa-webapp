"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Building2,
  Loader2,
  Mail,
  MapPin,
  Save,
  ScrollText,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { VillageMailSettingsFields } from "@/lib/mail/letterFormSnapshot";

type VillageProfilePayload = {
  id: number;
  code: string;
  name: string;
  district: string;
  regency: string;
  province: string;
  address: string;
  postalCode: string;
  phone: string;
  email: string;
  website: string;
  logoUrl: string;
  mail: VillageMailSettingsFields;
};

const emptyMail: VillageMailSettingsFields = {
  kepalaDesaNama: "",
  kepalaDesaNip: "",
  sekretarisNama: "",
  camatNama: "",
};

export default function PengaturanDesaPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [district, setDistrict] = useState("");
  const [regency, setRegency] = useState("");
  const [province, setProvince] = useState("");
  const [address, setAddress] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [mail, setMail] = useState<VillageMailSettingsFields>(emptyMail);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/village/profile");
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Gagal memuat data desa");
      }
      const data: VillageProfilePayload = await res.json();
      setCode(data.code);
      setName(data.name);
      setDistrict(data.district);
      setRegency(data.regency);
      setProvince(data.province);
      setAddress(data.address);
      setPostalCode(data.postalCode);
      setPhone(data.phone);
      setEmail(data.email);
      setWebsite(data.website);
      setLogoUrl(data.logoUrl);
      setMail({ ...emptyMail, ...data.mail });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal memuat data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/village/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          district,
          regency,
          province,
          address,
          postalCode,
          phone,
          email,
          website,
          logoUrl,
          mail,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json.error || "Gagal menyimpan");
      }
      toast.success("Pengaturan desa berhasil disimpan");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        Memuat pengaturan desa…
      </div>
    );
  }

  return (
    <div className="mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Pengaturan Desa</h1>
        <p className="text-sm text-muted-foreground">
          Data ini dipakai untuk kop surat, template, dan variabel otomatis di Layanan Surat.
        </p>
        {code ? (
          <p className="mt-1 text-xs text-muted-foreground">
            Kode desa: <span className="font-mono">{code}</span>
          </p>
        ) : null}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              <div>
                <CardTitle>Identitas & wilayah</CardTitle>
                <CardDescription>
                  Muncul di kop surat sebagai kabupaten, kecamatan, dan nama desa.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="name">Nama desa</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="Contoh: Desa Suka Maju"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="regency">Kabupaten / Kota</Label>
                <Input
                  id="regency"
                  value={regency}
                  onChange={(e) => setRegency(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="district">Kecamatan</Label>
                <Input
                  id="district"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="province">Provinsi</Label>
                <Input
                  id="province"
                  value={province}
                  onChange={(e) => setProvince(e.target.value)}
                  required
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              <div>
                <CardTitle>Alamat & kontak kantor desa</CardTitle>
                <CardDescription>
                  Alamat lengkap dan kontak untuk kop surat serta footer.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="address">Alamat</Label>
              <Textarea
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                required
                rows={3}
                placeholder="Jalan, RT/RW, dsb."
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="postalCode">Kode pos</Label>
                <Input
                  id="postalCode"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  inputMode="numeric"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telepon</Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Opsional"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Opsional"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  type="url"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="logoUrl">URL logo desa</Label>
                <Input
                  id="logoUrl"
                  type="url"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="https://… (untuk kop surat)"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <ScrollText className="h-5 w-5 text-primary shrink-0" />
              <div>
                <CardTitle>Pengaturan surat & penandatangan</CardTitle>
                <CardDescription>
                  Override nama/NIP untuk kop dan variabel template. Kosongkan nama/NIP Kepala Desa
                  untuk memakai data dari menu{" "}
                  <Link
                    href="/data-perangkat"
                    className="font-medium text-primary underline-offset-4 hover:underline"
                  >
                    Perangkat Desa
                  </Link>
                  .
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <Mail className="h-4 w-4 shrink-0" />
              <AlertTitle>Prioritas data</AlertTitle>
              <AlertDescription className="text-sm">
                Jika nama atau NIP diisi di bawah, nilai tersebut dipakai di surat. Jika dikosongkan,
                sistem memakai perangkat aktif (jabatan Kepala Desa / Sekretaris) sesuai data
                perangkat.
              </AlertDescription>
            </Alert>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="kepalaDesaNama">Nama Kepala Desa (override)</Label>
                <Input
                  id="kepalaDesaNama"
                  value={mail.kepalaDesaNama}
                  onChange={(e) =>
                    setMail((m) => ({ ...m, kepalaDesaNama: e.target.value }))
                  }
                  placeholder="Kosongkan = dari Data Perangkat"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="kepalaDesaNip">NIP Kepala Desa</Label>
                <Input
                  id="kepalaDesaNip"
                  value={mail.kepalaDesaNip}
                  onChange={(e) =>
                    setMail((m) => ({ ...m, kepalaDesaNip: e.target.value }))
                  }
                  placeholder="NIP ASN"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sekretarisNama">Nama Sekretaris Desa (override)</Label>
                <Input
                  id="sekretarisNama"
                  value={mail.sekretarisNama}
                  onChange={(e) =>
                    setMail((m) => ({ ...m, sekretarisNama: e.target.value }))
                  }
                  placeholder="Opsional"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="camatNama">Nama Camat (untuk variabel surat)</Label>
                <Input
                  id="camatNama"
                  value={mail.camatNama}
                  onChange={(e) =>
                    setMail((m) => ({ ...m, camatNama: e.target.value }))
                  }
                  placeholder="Opsional"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-dashed">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-muted-foreground shrink-0" />
              <CardTitle className="text-base">Perangkat & jabatan</CardTitle>
            </div>
            <CardDescription>
              Struktur jabatan dan nama perangkat aktif dikelola di halaman terpisah agar konsisten
              dengan absensi dan data kepegawaian.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" asChild>
              <Link href="/data-jabatan">Kelola jabatan</Link>
            </Button>
            <Button type="button" variant="outline" size="sm" asChild>
              <Link href="/data-perangkat">Kelola perangkat desa</Link>
            </Button>
          </CardContent>
        </Card>

        <Separator />

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <Button type="submit" disabled={saving} className="gap-2 sm:min-w-40">
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin shrink-0" />
            ) : (
              <Save className="h-4 w-4 shrink-0" />
            )}
            Simpan pengaturan
          </Button>
        </div>
      </form>
    </div>
  );
}
