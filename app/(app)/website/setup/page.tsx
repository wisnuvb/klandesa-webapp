"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Check, ImageIcon, Rocket, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DigitalArchivePickerModal } from "@/components/digital-archive/DigitalArchivePickerModal";
import { CmsLivePreviewCard } from "../cms/_components/CmsLivePreviewCard";
import { THEME_PALETTE_SWATCHES } from "../cms/_lib/constants";
import { buildV2Overrides } from "../cms/_lib/save-helpers";
import type { EngineConfigResponse } from "../cms/_lib/types";
import {
  deriveAccent,
  dominantColorFromPixels,
  ensureReadableOnWhite,
} from "@/lib/website-engine/color";
import {
  applySetupToEngine,
  readSetupFromEngine,
  SETUP_FONT_STYLES,
  suggestStats,
  type SetupContent,
} from "@/lib/website-engine/setup-wizard";
import type { ResolvedEngineStructure } from "@/lib/website-engine/types";

type Profile = {
  name: string;
  address: string;
  district: string;
  regency: string;
  phone: string;
  email: string;
  website: string;
  logoUrl: string;
};

const STEPS = ["Tampilan", "Isi beranda", "Terbitkan"] as const;

/** Ambil warna dominan logo di browser; gagal diam-diam bila host logo memblokir pembacaan piksel (CORS). */
function extractLogoColor(url: string): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const size = 64;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) return resolve(null);
        ctx.drawImage(img, 0, 0, size, size);
        resolve(dominantColorFromPixels(ctx.getImageData(0, 0, size, size).data, 1));
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

function Field(props: { id: string; label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <label htmlFor={props.id} className="text-sm font-medium">
        {props.label}
      </label>
      {props.children}
      {props.hint ? <p className="text-muted-foreground text-xs">{props.hint}</p> : null}
    </div>
  );
}

export default function WebsiteSetupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(0);

  const [engine, setEngine] = useState<ResolvedEngineStructure | null>(null);
  const [templateKey, setTemplateKey] = useState("");
  const [heroVariants, setHeroVariants] = useState<Array<"center" | "split">>(["center"]);
  const [baseTheme, setBaseTheme] = useState<Record<string, string | undefined>>({});
  const [hideSiteHeader, setHideSiteHeader] = useState(false);
  const [faviconUrl, setFaviconUrl] = useState("");
  const [profile, setProfile] = useState<Profile | null>(null);

  const [primary, setPrimary] = useState("#0f766e");
  const [fontKey, setFontKey] = useState("");
  const [logoColor, setLogoColor] = useState<string | null>(null);
  const [content, setContent] = useState<SetupContent | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [cfgRes, profRes, sugRes] = await Promise.all([
          fetch("/api/website/engine/config", { cache: "no-store" }),
          fetch("/api/village/profile", { cache: "no-store" }),
          fetch("/api/website/setup/suggestions", { cache: "no-store" }),
        ]);
        const cfg = (await cfgRes.json().catch(() => null)) as (EngineConfigResponse & { error?: string }) | null;
        if (!cfgRes.ok || !cfg?.effective_structure) {
          throw new Error(cfg?.error || "Gagal memuat website");
        }
        const prof = profRes.ok ? await profRes.json().catch(() => null) : null;
        const sug = sugRes.ok ? await sugRes.json().catch(() => null) : null;
        if (cancelled) return;

        const p: Profile = {
          name: String(prof?.name ?? ""),
          address: String(prof?.address ?? ""),
          district: String(prof?.district ?? ""),
          regency: String(prof?.regency ?? ""),
          phone: String(prof?.phone ?? ""),
          email: String(prof?.email ?? ""),
          website: String(prof?.website ?? ""),
          logoUrl: String(prof?.logoUrl ?? ""),
        };
        setProfile(p);
        setEngine(cfg.effective_structure);
        setTemplateKey(cfg.template_key);
        setBaseTheme(cfg.effective_theme ?? {});
        setHideSiteHeader(Boolean(cfg.effective_layout?.hideSiteHeader));
        setFaviconUrl(cfg.customization?.faviconUrl ?? "");
        setHeroVariants(
          (cfg.template_pack?.hero_variants as Array<"center" | "split"> | undefined) ?? ["center"],
        );
        setPrimary(cfg.effective_theme?.primary || "#0f766e");
        setFontKey(
          SETUP_FONT_STYLES.find(
            (f) => f.fontHeading === cfg.effective_theme?.fontHeading && f.fontBody === cfg.effective_theme?.fontBody,
          )?.key ?? "",
        );

        // Isian yang sudah ada dipertahankan; kolom kosong diberi saran dari data desa.
        const existing = readSetupFromEngine(cfg.effective_structure);
        const counts = sug?.residents as { total: number; households: number; hamlets: number } | undefined;
        const suggested = counts ? suggestStats(counts) : null;
        const hasExistingStats = existing.stats.some((s) => s.value.trim());
        const place = [p.district && `Kecamatan ${p.district}`, p.regency].filter(Boolean).join(", ");
        setContent({
          heroTitle: existing.heroTitle || `Selamat datang di ${p.name}`,
          heroSubtitle:
            existing.heroSubtitle ||
            `Pusat informasi dan layanan ${p.name}${place ? `, ${place}` : ""}.`,
          heroImageUrl: existing.heroImageUrl,
          showStats: existing.showStats || Boolean(suggested?.some((s) => s.value)),
          stats: hasExistingStats || !suggested ? existing.stats : suggested,
        });

        if (p.logoUrl) {
          const c = await extractLogoColor(p.logoUrl);
          if (!cancelled) setLogoColor(c);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Terjadi kesalahan");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const readablePrimary = useMemo(() => ensureReadableOnWhite(primary), [primary]);
  const font = SETUP_FONT_STYLES.find((f) => f.key === fontKey);

  const previewTheme = useMemo(
    () => ({
      ...baseTheme,
      primary: readablePrimary,
      accent: deriveAccent(readablePrimary),
      ...(font ? { fontBody: font.fontBody, fontHeading: font.fontHeading } : {}),
    }),
    [baseTheme, readablePrimary, font],
  );

  const nextEngine = useMemo(
    () => (engine && content ? applySetupToEngine(engine, content) : null),
    [engine, content],
  );
  const previewPage = nextEngine?.pages.find((p) => p.slug === "");

  const patchContent = useCallback(
    (patch: Partial<SetupContent>) => setContent((c) => (c ? { ...c, ...patch } : c)),
    [],
  );

  const save = useCallback(
    async (publish: boolean) => {
      if (!nextEngine) return;
      setBusy(true);
      setError(null);
      try {
        const theme: Record<string, string> = {
          primary: readablePrimary,
          accent: deriveAccent(readablePrimary),
        };
        if (font) {
          theme.fontBody = font.fontBody;
          theme.fontHeading = font.fontHeading;
        }
        const res = await fetch("/api/website/engine/config", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            overrides: buildV2Overrides(nextEngine, heroVariants),
            theme,
            // Logo desa dipakai juga sebagai ikon tab bila belum ada favicon.
            ...(!faviconUrl && profile?.logoUrl ? { favicon_url: profile.logoUrl } : {}),
          }),
        });
        const json = (await res.json().catch(() => null)) as { error?: string } | null;
        if (!res.ok) throw new Error(json?.error || "Gagal menyimpan");

        if (publish) {
          const pub = await fetch("/api/website/engine/publish", { method: "POST" });
          const pj = (await pub.json().catch(() => null)) as { error?: string } | null;
          if (!pub.ok) throw new Error(pj?.error || "Gagal menerbitkan");
          toast.success("Website sudah diterbitkan");
        } else {
          toast.success("Draf tersimpan. Terbitkan kapan saja dari CMS.");
        }
        router.push("/website");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Terjadi kesalahan");
      } finally {
        setBusy(false);
      }
    },
    [nextEngine, readablePrimary, font, heroVariants, faviconUrl, profile, router],
  );

  if (loading) {
    return <div className="py-12 text-center text-muted-foreground">Menyiapkan penyiapan website…</div>;
  }
  if (!engine || !content || !profile) {
    return (
      <div className="mx-auto max-w-xl space-y-4 py-12 text-center">
        <p className="text-red-700">{error || "Website belum aktif."}</p>
        <Button asChild variant="outline">
          <Link href="/website">Kembali</Link>
        </Button>
      </div>
    );
  }

  const swatches = [...(logoColor ? [logoColor] : []), ...THEME_PALETTE_SWATCHES];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Penyiapan Website</h1>
        <p className="text-muted-foreground text-sm">
          Tiga langkah singkat. Pratinjau di sebelah menunjukkan hasilnya secara langsung.
        </p>
      </div>

      <ol className="flex flex-wrap gap-2" aria-label="Langkah penyiapan">
        {STEPS.map((label, i) => (
          <li key={label}>
            <button
              type="button"
              onClick={() => setStep(i)}
              aria-current={i === step ? "step" : undefined}
              className={`inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors ${
                i === step
                  ? "border-teal-600 bg-teal-50 text-teal-800"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <span className="flex size-6 items-center justify-center rounded-full bg-current/10 text-xs">
                {i < step ? <Check className="size-3.5" /> : i + 1}
              </span>
              {label}
            </button>
          </li>
        ))}
      </ol>

      {error ? (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
        <div className="space-y-4">
          {step === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Warna & huruf</CardTitle>
                <CardDescription>Pilih yang paling cocok dengan identitas desa.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <fieldset className="space-y-2">
                  <legend className="text-sm font-medium">Warna utama</legend>
                  <div className="flex flex-wrap gap-2">
                    {swatches.map((c, i) => (
                      <button
                        key={`${c}-${i}`}
                        type="button"
                        aria-label={i === 0 && logoColor ? `Warna dari logo ${c}` : `Warna ${c}`}
                        aria-pressed={primary.toLowerCase() === c.toLowerCase()}
                        onClick={() => setPrimary(c)}
                        className={`relative size-11 rounded-full border-2 transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 ${
                          primary.toLowerCase() === c.toLowerCase() ? "border-foreground" : "border-white shadow"
                        }`}
                        style={{ backgroundColor: c }}
                      >
                        {i === 0 && logoColor ? (
                          <Wand2 className="absolute inset-0 m-auto size-4 text-white drop-shadow" aria-hidden />
                        ) : null}
                      </button>
                    ))}
                    <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-full border px-3 text-sm">
                      Lainnya
                      <input
                        type="color"
                        value={/^#[0-9a-f]{6}$/i.test(primary) ? primary : "#0f766e"}
                        onChange={(e) => setPrimary(e.target.value)}
                        className="size-6 cursor-pointer border-0 bg-transparent p-0"
                        aria-label="Pilih warna sendiri"
                      />
                    </label>
                  </div>
                  {logoColor ? (
                    <p className="text-muted-foreground text-xs">
                      Warna dengan ikon tongkat sihir diambil otomatis dari logo desa.
                    </p>
                  ) : null}
                  {readablePrimary.toLowerCase() !== primary.toLowerCase() ? (
                    <p className="text-xs text-amber-700">
                      Warna digelapkan sedikit agar tulisan putih pada tombol tetap mudah dibaca.
                    </p>
                  ) : null}
                </fieldset>

                <fieldset className="space-y-2">
                  <legend className="text-sm font-medium">Gaya huruf</legend>
                  <div className="grid gap-2">
                    {[{ key: "", label: "Bawaan template", description: "Tidak mengubah huruf template" }, ...SETUP_FONT_STYLES].map(
                      (f) => (
                        <button
                          key={f.key || "default"}
                          type="button"
                          aria-pressed={fontKey === f.key}
                          onClick={() => setFontKey(f.key)}
                          className={`min-h-11 rounded-lg border p-3 text-left transition-colors ${
                            fontKey === f.key ? "border-teal-600 bg-teal-50" : "hover:bg-muted"
                          }`}
                        >
                          <div className="text-sm font-medium">{f.label}</div>
                          <div className="text-muted-foreground text-xs">{f.description}</div>
                        </button>
                      ),
                    )}
                  </div>
                </fieldset>
              </CardContent>
            </Card>
          ) : null}

          {step === 1 ? (
            <Card>
              <CardHeader>
                <CardTitle>Isi beranda</CardTitle>
                <CardDescription>Sudah kami isi dari data desa. Ubah seperlunya.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="flex items-center gap-3 rounded-lg border p-3">
                  {profile.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={profile.logoUrl} alt="" className="h-12 w-auto max-w-20 object-contain" />
                  ) : (
                    <div className="flex size-12 items-center justify-center rounded bg-muted">
                      <ImageIcon className="size-5 text-muted-foreground" aria-hidden />
                    </div>
                  )}
                  <div className="min-w-0 text-sm">
                    <div className="font-medium">Logo desa</div>
                    <div className="text-muted-foreground text-xs">
                      {profile.logoUrl ? "Tampil di header website." : "Belum ada logo. "}
                      <Link href="/pengaturan-desa" className="underline">
                        {profile.logoUrl ? "Ganti di Pengaturan Desa" : "Unggah di Pengaturan Desa"}
                      </Link>
                    </div>
                  </div>
                </div>

                <Field id="hero-title" label="Judul sambutan">
                  <Input
                    id="hero-title"
                    value={content.heroTitle}
                    maxLength={200}
                    onChange={(e) => patchContent({ heroTitle: e.target.value })}
                  />
                </Field>
                <Field id="hero-sub" label="Kalimat pengantar">
                  <Textarea
                    id="hero-sub"
                    rows={3}
                    maxLength={500}
                    value={content.heroSubtitle}
                    onChange={(e) => patchContent({ heroSubtitle: e.target.value })}
                  />
                </Field>
                <Field
                  id="hero-img"
                  label="Foto utama (opsional)"
                  hint="Foto lanskap desa atau kantor desa terlihat paling baik."
                >
                  <div className="flex gap-2">
                    <Input
                      id="hero-img"
                      value={content.heroImageUrl}
                      placeholder="Pilih dari arsip atau tempel alamat gambar"
                      onChange={(e) => patchContent({ heroImageUrl: e.target.value })}
                    />
                    <Button type="button" variant="outline" className="min-h-11 shrink-0" onClick={() => setPickerOpen(true)}>
                      Pilih foto
                    </Button>
                  </div>
                </Field>

                <div className="space-y-3 rounded-lg border p-3">
                  <label className="flex min-h-11 items-center gap-2 text-sm font-medium">
                    <Checkbox
                      checked={content.showStats}
                      onCheckedChange={(v) => patchContent({ showStats: v === true })}
                    />
                    Tampilkan angka ringkas desa
                  </label>
                  {content.showStats ? (
                    <div className="grid gap-3">
                      {content.stats.map((st, i) => (
                        <div key={i} className="grid grid-cols-2 gap-2">
                          <Input
                            aria-label={`Label angka ${i + 1}`}
                            value={st.label}
                            maxLength={60}
                            onChange={(e) => {
                              const stats = [...content.stats] as SetupContent["stats"];
                              stats[i] = { ...st, label: e.target.value };
                              patchContent({ stats });
                            }}
                          />
                          <Input
                            aria-label={`Nilai angka ${i + 1}`}
                            value={st.value}
                            maxLength={30}
                            placeholder="—"
                            onChange={(e) => {
                              const stats = [...content.stats] as SetupContent["stats"];
                              stats[i] = { ...st, value: e.target.value };
                              patchContent({ stats });
                            }}
                          />
                        </div>
                      ))}
                      <p className="text-muted-foreground text-xs">
                        Angka diambil dari data kependudukan. Periksa sebelum diterbitkan karena akan terlihat publik.
                      </p>
                    </div>
                  ) : null}
                </div>

                <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
                  Alamat, telepon, dan email di bagian Kontak otomatis mengikuti{" "}
                  <Link href="/pengaturan-desa" className="underline">
                    Pengaturan Desa
                  </Link>
                  .
                </div>
              </CardContent>
            </Card>
          ) : null}

          {step === 2 ? (
            <Card>
              <CardHeader>
                <CardTitle>Siap diterbitkan</CardTitle>
                <CardDescription>
                  Periksa pratinjau. Setelah terbit, website langsung bisa dibuka pengunjung.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-1 text-sm">
                  <li>
                    Alamat website:{" "}
                    <span className="font-medium">{profile.website || "belum diatur"}</span>
                  </li>
                  <li>
                    Judul: <span className="font-medium">{content.heroTitle || "—"}</span>
                  </li>
                </ul>
                <div className="flex flex-col gap-2">
                  <Button type="button" className="min-h-11" disabled={busy} onClick={() => void save(true)}>
                    <Rocket className="size-4" />
                    {busy ? "Memproses…" : "Terbitkan website"}
                  </Button>
                  <Button type="button" variant="outline" className="min-h-11" disabled={busy} onClick={() => void save(false)}>
                    Simpan sebagai draf dulu
                  </Button>
                  <p className="text-muted-foreground text-xs">
                    Ingin mengatur lebih detail? Lanjutkan di{" "}
                    <Link href="/website/cms" className="underline">
                      CMS Website
                    </Link>
                    .
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : null}

          <div className="flex justify-between gap-2">
            <Button type="button" variant="outline" className="min-h-11" disabled={step === 0} onClick={() => setStep((s) => Math.max(0, s - 1))}>
              <ArrowLeft className="size-4" />
              Kembali
            </Button>
            {step < STEPS.length - 1 ? (
              <Button type="button" className="min-h-11" onClick={() => setStep((s) => s + 1)}>
                Lanjut
                <ArrowRight className="size-4" />
              </Button>
            ) : null}
          </div>
        </div>

        <div className="lg:sticky lg:top-4 lg:self-start">
          <CmsLivePreviewCard
            templateKey={templateKey}
            theme={previewTheme}
            hideSiteHeader={hideSiteHeader}
            navItems={nextEngine?.nav ?? []}
            page={previewPage}
            village={{
              name: profile.name,
              address: profile.address,
              phone: profile.phone || null,
              email: profile.email || null,
              website: profile.website || null,
              logoUrl: profile.logoUrl || null,
            }}
          />
        </div>
      </div>

      <DigitalArchivePickerModal
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onPick={(url) => patchContent({ heroImageUrl: url })}
        title="Pilih foto utama dari arsip digital"
        description="Cari berkas gambar lalu pilih satu."
      />
    </div>
  );
}
