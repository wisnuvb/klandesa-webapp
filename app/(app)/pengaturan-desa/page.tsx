"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Building2,
  Check,
  CircleDot,
  Loader2,
  Mail,
  MapPin,
  RotateCcw,
  Save,
  ScrollText,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DigitalArchivePickerModal } from "@/components/digital-archive/DigitalArchivePickerModal";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Combobox } from "@/components/ui/combobox";
import type { VillageMailSettingsFields } from "@/lib/mail/letterFormSnapshot";
import { PROVINSI_CODES } from "@/lib/pangan/match-region";
import { extractArray } from "@/lib/pangan/region-master";
import { Field } from "./_components/Field";
import { LogoField } from "./_components/LogoField";

type KabKotaOption = { kode_kab_kota: string; nama_kab_kota: string };

type VillageProfilePayload = {
  id: number;
  code: string;
  name: string;
  district: string;
  regency: string;
  province: string;
  wilayah: { kode_provinsi: string; kode_kab_kota: string };
  address: string;
  postalCode: string;
  phone: string;
  email: string;
  website: string;
  logoUrl: string;
  mail: VillageMailSettingsFields;
  integrations: {
    idmVillageCode: string;
  };
};

/** Semua isian form dalam satu objek, supaya perubahan (dirty) mudah dibandingkan. */
type FormValues = {
  name: string;
  district: string;
  kodeProvinsi: string;
  kodeKabKota: string;
  address: string;
  postalCode: string;
  phone: string;
  email: string;
  website: string;
  logoUrl: string;
  idmVillageCode: string;
  kepalaDesaNama: string;
  kepalaDesaNip: string;
  sekretarisNama: string;
  camatNama: string;
};

type FieldKey = keyof FormValues;
type FormErrors = Partial<Record<FieldKey, string>>;

const EMPTY: FormValues = {
  name: "",
  district: "",
  kodeProvinsi: "",
  kodeKabKota: "",
  address: "",
  postalCode: "",
  phone: "",
  email: "",
  website: "",
  logoUrl: "",
  idmVillageCode: "",
  kepalaDesaNama: "",
  kepalaDesaNip: "",
  sekretarisNama: "",
  camatNama: "",
};

/** Urutan tampil di layar: dipakai untuk memfokuskan isian pertama yang salah. */
const FIELD_ORDER: FieldKey[] = [
  "name",
  "logoUrl",
  "kodeProvinsi",
  "kodeKabKota",
  "district",
  "idmVillageCode",
  "address",
  "postalCode",
  "phone",
  "email",
  "website",
];

function toValues(data: VillageProfilePayload): FormValues {
  return {
    name: data.name ?? "",
    district: data.district ?? "",
    kodeProvinsi: data.wilayah?.kode_provinsi ?? "",
    kodeKabKota: data.wilayah?.kode_kab_kota ?? "",
    address: data.address ?? "",
    postalCode: data.postalCode ?? "",
    phone: data.phone ?? "",
    email: data.email ?? "",
    website: data.website ?? "",
    logoUrl: data.logoUrl ?? "",
    idmVillageCode: data.integrations?.idmVillageCode ?? "",
    kepalaDesaNama: data.mail?.kepalaDesaNama ?? "",
    kepalaDesaNip: data.mail?.kepalaDesaNip ?? "",
    sekretarisNama: data.mail?.sekretarisNama ?? "",
    camatNama: data.mail?.camatNama ?? "",
  };
}

function isHttpUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

/** Aturan sama dengan PUT /api/village/profile, supaya galat muncul di samping isian, bukan sebagai 400. */
function validate(v: FormValues): FormErrors {
  const e: FormErrors = {};
  if (!v.name.trim()) e.name = "Nama desa wajib diisi.";
  if (!v.kodeProvinsi) e.kodeProvinsi = "Pilih provinsi.";
  if (!v.kodeKabKota) e.kodeKabKota = "Pilih kabupaten/kota.";
  if (!v.district.trim()) e.district = "Kecamatan wajib diisi.";
  if (!v.address.trim()) e.address = "Alamat wajib diisi.";

  const idm = v.idmVillageCode.trim();
  if (idm && (!/^\d{8,13}$/.test(idm))) e.idmVillageCode = "Kode IDM berupa 8–13 angka.";
  const pos = v.postalCode.trim();
  if (pos && !/^\d{5}$/.test(pos)) e.postalCode = "Kode pos berupa 5 angka.";
  const tel = v.phone.trim();
  if (tel && !/^[0-9+()\-.\s]{6,20}$/.test(tel)) e.phone = "Nomor telepon tidak valid.";
  const mail = v.email.trim();
  if (mail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) e.email = "Format email tidak valid.";
  const web = v.website.trim();
  if (web && !isHttpUrl(web)) e.website = "Awali dengan http:// atau https://.";
  const logo = v.logoUrl.trim();
  if (logo && !isHttpUrl(logo) && !logo.startsWith("/")) {
    e.logoUrl = "URL logo harus diawali http:// atau https://.";
  }
  return e;
}

function FormSkeleton() {
  return (
    <div className="mx-auto max-w-4xl space-y-6" role="status" aria-busy="true">
      <span className="sr-only">Memuat pengaturan desa…</span>
      <div className="space-y-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-full max-w-lg" />
      </div>
      {[5, 4, 3].map((rows, i) => (
        <div key={i} className="space-y-4 rounded-xl border p-6">
          <Skeleton className="h-6 w-48" />
          {Array.from({ length: rows }).map((_, j) => (
            <Skeleton key={j} className="h-9 w-full" />
          ))}
        </div>
      ))}
    </div>
  );
}

export default function PengaturanDesaPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [code, setCode] = useState("");
  const [form, setForm] = useState<FormValues>(EMPTY);
  /** Nilai terakhir yang tersimpan di server (acuan "ada perubahan" dan tombol batalkan). */
  const [saved, setSaved] = useState<FormValues | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [kabkota, setKabkota] = useState<KabKotaOption[]>([]);
  const [loadingKab, setLoadingKab] = useState(false);
  const [kabError, setKabError] = useState(false);
  const pendingKabRef = useRef<string | null>(null);
  const kabRequestRef = useRef(0);
  const [logoPickerOpen, setLogoPickerOpen] = useState(false);

  const dirty = useMemo(
    () => saved !== null && (Object.keys(EMPTY) as FieldKey[]).some((k) => form[k] !== saved[k]),
    [form, saved],
  );

  const update = useCallback(<K extends FieldKey>(key: K, value: FormValues[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => (e[key] ? { ...e, [key]: undefined } : e));
  }, []);

  /** `silent`: muat ulang tanpa mengganti form dengan layar pemuatan (dipakai setelah simpan). */
  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch("/api/village/profile");
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Gagal memuat data desa");
      }
      const data: VillageProfilePayload = await res.json();
      const values = toValues(data);
      setCode(data.code);
      if (!silent) pendingKabRef.current = values.kodeKabKota || null;
      setForm(values);
      setSaved(values);
      setErrors({});
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal memuat data");
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const loadKabkota = useCallback(async (kodeProv: string) => {
    const requestId = ++kabRequestRef.current;
    if (!kodeProv) {
      setKabkota([]);
      setKabError(false);
      return;
    }
    setLoadingKab(true);
    setKabError(false);
    try {
      const res = await fetch(`/api/pangan/kab-kota/${encodeURIComponent(kodeProv)}`, {
        cache: "no-store",
      });
      const json = (await res.json().catch(() => null)) as { data?: unknown } | null;
      const rows = extractArray<KabKotaOption>(json?.data);
      // Abaikan respons usang bila provinsi sudah diganti lagi.
      if (requestId !== kabRequestRef.current) return;
      if (!res.ok || rows.length === 0) throw new Error("kab-kota kosong");
      setKabkota(rows);
      const pending = pendingKabRef.current;
      if (pending && rows.some((k) => k.kode_kab_kota === pending)) {
        setForm((f) => ({ ...f, kodeKabKota: pending }));
        pendingKabRef.current = null;
      }
    } catch {
      if (requestId !== kabRequestRef.current) return;
      setKabkota([]);
      setKabError(true);
    } finally {
      if (requestId === kabRequestRef.current) setLoadingKab(false);
    }
  }, []);

  useEffect(() => {
    void loadKabkota(form.kodeProvinsi);
  }, [form.kodeProvinsi, loadKabkota]);

  // Peringatan bawaan browser bila tab ditutup/dimuat ulang saat masih ada perubahan.
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  const provinsiOptions = useMemo(
    () =>
      PROVINSI_CODES.map((p) => ({
        value: p.kode_provinsi,
        label: p.nama_provinsi,
        keywords: p.nama_provinsi,
      })),
    [],
  );

  const kabOptions = useMemo(
    () =>
      kabkota.map((k) => ({
        value: k.kode_kab_kota,
        label: k.nama_kab_kota,
        keywords: k.nama_kab_kota,
      })),
    [kabkota],
  );

  const selectedProvLabel =
    PROVINSI_CODES.find((p) => p.kode_provinsi === form.kodeProvinsi)?.nama_provinsi ?? "";
  const selectedKabLabel =
    kabkota.find((k) => k.kode_kab_kota === form.kodeKabKota)?.nama_kab_kota ?? "";
  // Nilai tersimpan baru ditampilkan setelah daftarnya termuat; sebelum itu tampil placeholder "Memuat…".
  const kabDisplayValue = kabOptions.some((o) => o.value === form.kodeKabKota) ? form.kodeKabKota : "";

  const handleReset = () => {
    if (!saved) return;
    pendingKabRef.current = null;
    setForm(saved);
    setErrors({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;

    const found = validate(form);
    setErrors(found);
    const firstInvalid = FIELD_ORDER.find((k) => found[k]);
    if (firstInvalid) {
      const count = Object.values(found).filter(Boolean).length;
      toast.error(`Periksa ${count} isian yang belum sesuai.`);
      // Tunggu render galat (mis. kolom URL logo yang terbuka otomatis) sebelum memfokuskan.
      requestAnimationFrame(() => {
        const el = document.getElementById(firstInvalid);
        el?.scrollIntoView({ block: "center" });
        el?.focus({ preventScroll: true });
      });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/village/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          district: form.district,
          wilayah: {
            kode_provinsi: form.kodeProvinsi,
            kode_kab_kota: form.kodeKabKota,
          },
          address: form.address,
          postalCode: form.postalCode,
          phone: form.phone,
          email: form.email,
          website: form.website,
          logoUrl: form.logoUrl,
          mail: {
            kepalaDesaNama: form.kepalaDesaNama,
            kepalaDesaNip: form.kepalaDesaNip,
            sekretarisNama: form.sekretarisNama,
            camatNama: form.camatNama,
          },
          integrations: { idmVillageCode: form.idmVillageCode },
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json.error || "Gagal menyimpan");
      }
      toast.success("Pengaturan desa berhasil disimpan");
      // Selaraskan dengan nilai yang dinormalisasi server, tanpa membongkar form.
      await load(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <FormSkeleton />;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Pengaturan Desa</h1>
        <p className="text-sm text-muted-foreground">
          Data ini dipakai untuk kop surat, template, dan variabel otomatis di Layanan Surat.
          Tanda <span className="text-destructive">*</span> wajib diisi.
        </p>
        {code ? (
          <p className="mt-1 text-xs text-muted-foreground">
            Kode desa: <span className="font-mono">{code}</span>
          </p>
        ) : null}
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
              <div>
                <CardTitle>Identitas & wilayah</CardTitle>
                <CardDescription>
                  Provinsi dan kabupaten/kota dipilih dari daftar wilayah resmi agar konsisten dengan
                  data harga komoditas. Kecamatan diisi manual untuk kop surat.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="name" label="Nama desa" required error={errors.name} className="sm:col-span-2">
                {(c) => (
                  <Input
                    {...c}
                    value={form.name}
                    onChange={(e) => update("name", e.target.value)}
                    placeholder="Contoh: Desa Suka Maju"
                    autoComplete="organization"
                  />
                )}
              </Field>

              <div className="sm:col-span-2">
                <LogoField
                  value={form.logoUrl}
                  onChange={(v) => update("logoUrl", v)}
                  onBrowse={() => setLogoPickerOpen(true)}
                  error={errors.logoUrl}
                />
              </div>

              <Field id="kodeProvinsi" label="Provinsi" required error={errors.kodeProvinsi}>
                {(c) => (
                  <Combobox
                    {...c}
                    value={form.kodeProvinsi}
                    onValueChange={(v) => {
                      pendingKabRef.current = null;
                      setForm((f) => ({ ...f, kodeProvinsi: v, kodeKabKota: "" }));
                      setErrors((er) => ({ ...er, kodeProvinsi: undefined, kodeKabKota: undefined }));
                    }}
                    options={provinsiOptions}
                    placeholder="Pilih provinsi"
                    searchPlaceholder="Cari provinsi..."
                  />
                )}
              </Field>

              <Field
                id="kodeKabKota"
                label="Kabupaten / Kota"
                required
                error={errors.kodeKabKota}
                hint={
                  kabError ? (
                    <span className="text-destructive">
                      Daftar kabupaten/kota gagal dimuat.{" "}
                      <button
                        type="button"
                        className="font-medium underline underline-offset-4"
                        onClick={() => void loadKabkota(form.kodeProvinsi)}
                      >
                        Coba lagi
                      </button>
                    </span>
                  ) : form.kodeProvinsi && kabDisplayValue && selectedKabLabel ? (
                    <>
                      Tercetak di kop surat sebagai:{" "}
                      <span className="font-medium">{selectedKabLabel}</span>
                      {selectedProvLabel ? `, ${selectedProvLabel}` : ""}
                    </>
                  ) : undefined
                }
              >
                {(c) => (
                  <Combobox
                    {...c}
                    value={kabDisplayValue}
                    onValueChange={(v) => update("kodeKabKota", v)}
                    options={kabOptions}
                    placeholder={
                      !form.kodeProvinsi
                        ? "Pilih provinsi dulu"
                        : loadingKab
                          ? "Memuat daftar kab/kota..."
                          : "Pilih kabupaten/kota"
                    }
                    searchPlaceholder="Cari kabupaten/kota..."
                    disabled={!form.kodeProvinsi || loadingKab}
                  />
                )}
              </Field>

              <Field id="district" label="Kecamatan" required error={errors.district}>
                {(c) => (
                  <Input
                    {...c}
                    value={form.district}
                    onChange={(e) => update("district", e.target.value)}
                    placeholder="Contoh: Kecamatan Selogiri"
                  />
                )}
              </Field>

              <Field
                id="idmVillageCode"
                label="Kode desa IDM/SDGs (Kemendesa)"
                optional
                error={errors.idmVillageCode}
                hint="Dipakai untuk menampilkan status IDM dan (opsional) evaluasi SDGs dari portal resmi."
              >
                {(c) => (
                  <Input
                    {...c}
                    value={form.idmVillageCode}
                    onChange={(e) => update("idmVillageCode", e.target.value)}
                    inputMode="numeric"
                    maxLength={13}
                    placeholder="Contoh: 6201022016"
                  />
                )}
              </Field>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
              <div>
                <CardTitle>Alamat & kontak kantor desa</CardTitle>
                <CardDescription>
                  Alamat lengkap dan kontak untuk kop surat serta footer.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field id="address" label="Alamat" required error={errors.address}>
              {(c) => (
                <Textarea
                  {...c}
                  value={form.address}
                  onChange={(e) => update("address", e.target.value)}
                  rows={3}
                  placeholder="Jalan, RT/RW, dsb."
                  autoComplete="street-address"
                />
              )}
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="postalCode" label="Kode pos" optional error={errors.postalCode}>
                {(c) => (
                  <Input
                    {...c}
                    value={form.postalCode}
                    onChange={(e) => update("postalCode", e.target.value)}
                    inputMode="numeric"
                    maxLength={5}
                    autoComplete="postal-code"
                    placeholder="5 angka"
                  />
                )}
              </Field>
              <Field id="phone" label="Telepon" optional error={errors.phone}>
                {(c) => (
                  <Input
                    {...c}
                    type="tel"
                    value={form.phone}
                    onChange={(e) => update("phone", e.target.value)}
                    autoComplete="tel"
                    placeholder="Contoh: 0271 123456"
                  />
                )}
              </Field>
              <Field id="email" label="Email" optional error={errors.email}>
                {(c) => (
                  <Input
                    {...c}
                    type="email"
                    value={form.email}
                    onChange={(e) => update("email", e.target.value)}
                    autoComplete="email"
                    placeholder="desa@contoh.id"
                  />
                )}
              </Field>
              <Field id="website" label="Website" optional error={errors.website}>
                {(c) => (
                  <Input
                    {...c}
                    type="url"
                    value={form.website}
                    onChange={(e) => update("website", e.target.value)}
                    autoComplete="url"
                    placeholder="https://"
                  />
                )}
              </Field>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <ScrollText className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
              <div>
                <CardTitle>Pengaturan surat & penandatangan</CardTitle>
                <CardDescription>
                  Nama dan NIP yang tercetak di kop dan variabel template surat.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <Mail className="h-4 w-4 shrink-0" aria-hidden="true" />
              <AlertTitle>Mana yang dipakai di surat?</AlertTitle>
              <AlertDescription className="text-sm">
                Nama atau NIP yang diisi di bawah selalu dipakai. Jika dikosongkan, sistem mengambil
                dari menu{" "}
                <Link
                  href="/data-perangkat"
                  className="font-medium text-primary underline-offset-4 hover:underline"
                >
                  Perangkat Desa
                </Link>{" "}
                (jabatan Kepala Desa / Sekretaris yang aktif).
              </AlertDescription>
            </Alert>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="kepalaDesaNama" label="Nama Kepala Desa (isi manual)" optional>
                {(c) => (
                  <Input
                    {...c}
                    value={form.kepalaDesaNama}
                    onChange={(e) => update("kepalaDesaNama", e.target.value)}
                    placeholder="Kosongkan = dari Data Perangkat"
                  />
                )}
              </Field>
              <Field id="kepalaDesaNip" label="NIP Kepala Desa" optional>
                {(c) => (
                  <Input
                    {...c}
                    value={form.kepalaDesaNip}
                    onChange={(e) => update("kepalaDesaNip", e.target.value)}
                    inputMode="numeric"
                    placeholder="18 angka, bagi yang berstatus ASN"
                  />
                )}
              </Field>
              <Field id="sekretarisNama" label="Nama Sekretaris Desa (isi manual)" optional>
                {(c) => (
                  <Input
                    {...c}
                    value={form.sekretarisNama}
                    onChange={(e) => update("sekretarisNama", e.target.value)}
                    placeholder="Kosongkan = dari Data Perangkat"
                  />
                )}
              </Field>
              <Field id="camatNama" label="Nama Camat" optional hint="Dipakai sebagai variabel di template surat.">
                {(c) => (
                  <Input
                    {...c}
                    value={form.camatNama}
                    onChange={(e) => update("camatNama", e.target.value)}
                  />
                )}
              </Field>
            </div>
          </CardContent>
        </Card>

        <Card className="border-dashed">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
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

        <div className="sticky bottom-0 z-20 -mx-2 flex flex-col gap-3 border-t bg-background/95 px-2 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:flex-row sm:items-center sm:justify-between">
          <p
            role="status"
            aria-live="polite"
            className="flex items-center gap-2 text-sm text-muted-foreground"
          >
            {dirty ? (
              <>
                <CircleDot className="size-4 shrink-0 text-amber-600" aria-hidden="true" />
                Ada perubahan yang belum disimpan
              </>
            ) : (
              <>
                <Check className="size-4 shrink-0 text-emerald-600" aria-hidden="true" />
                Semua perubahan sudah tersimpan
              </>
            )}
          </p>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              onClick={handleReset}
              disabled={!dirty || saving}
              className="gap-2"
            >
              <RotateCcw className="size-4 shrink-0" aria-hidden="true" />
              Batalkan perubahan
            </Button>
            <Button type="submit" disabled={!dirty || saving} className="gap-2 sm:min-w-44">
              {saving ? (
                <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden="true" />
              ) : (
                <Save className="size-4 shrink-0" aria-hidden="true" />
              )}
              {saving ? "Menyimpan…" : "Simpan pengaturan"}
            </Button>
          </div>
        </div>
      </form>

      <DigitalArchivePickerModal
        open={logoPickerOpen}
        onOpenChange={setLogoPickerOpen}
        onPick={(url) => update("logoUrl", url)}
        title="Pilih logo desa dari arsip digital"
        description="Pilih gambar dari arsip, atau unggah logo baru bila belum ada. Hanya berkas publik yang ditampilkan agar logo bisa dimuat di kop surat."
        imageOnly
        publicOnly
      />
    </div>
  );
}
