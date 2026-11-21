"use client";

import * as React from "react";
import Link from "next/link";
import { CheckCircle2, Copy, ImagePlus, Loader2, Send, X } from "lucide-react";
import { TurnstileWidget } from "@/components/security/TurnstileWidget";
import { SearchSelect } from "@/components/ui/search-select";
import { isTurnstileRequiredOnClient } from "@/lib/turnstile-config";
import { ASPIRATION_CATEGORIES, LIMITS } from "@/lib/aspirasi/catalog";
import { shrinkToWebp } from "./photo-client";
import { btnOutline, btnPrimary, focusRing } from "./ui";

type Item = { code: string; name: string };
type Photo = { key: string; preview: string };
type Errors = Partial<Record<"area" | "category" | "title" | "body" | "locationNote" | "reporterPhone" | "reporterEmail" | "photos" | "consent" | "general", string>>;

const DRAFT_KEY = "klandesa-aspirasi-draft-v1";

const inputClass =
  "block min-h-12 w-full rounded-xl border border-gray-400 bg-white px-4 py-3 text-base text-gray-900 outline-none transition focus:border-[#0f766e] focus:ring-4 focus:ring-[#0d9488]/30 aria-[invalid=true]:border-red-600 disabled:cursor-not-allowed disabled:bg-gray-100";
const labelClass = "mb-2 block text-base font-medium text-gray-900";
const hintClass = "mt-1 text-sm text-gray-700";
const selectClass = "w-full min-h-12 rounded-xl border border-gray-400 bg-white px-4 text-base text-gray-900";

/** Anchor kolom untuk tautan di ringkasan galat. */
const ANCHOR: Record<keyof Errors, string> = {
  area: "asp-province",
  category: "asp-category",
  title: "asp-title",
  body: "asp-body",
  locationNote: "asp-location",
  reporterPhone: "asp-phone",
  reporterEmail: "asp-email",
  photos: "asp-photos",
  consent: "asp-consent",
  general: "asp-form-top",
};

async function loadLevel(level: "provinces" | "regencies" | "districts" | "villages", parent = ""): Promise<Item[]> {
  try {
    const res = await fetch(`/api/aspirasi/wilayah?level=${level}${parent ? `&parent=${encodeURIComponent(parent)}` : ""}`);
    if (!res.ok) return [];
    const data = (await res.json().catch(() => null)) as { items?: Item[] } | null;
    return data?.items ?? [];
  } catch {
    return [];
  }
}

function WilayahSelect({ id, label, value, items, onChange, disabled, loading, invalid }: { id: string; label: string; value: string; items: Item[]; onChange: (v: string) => void; disabled?: boolean; loading?: boolean; invalid?: boolean }) {
  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      <SearchSelect
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        aria-invalid={invalid ? true : undefined}
        className={selectClass}
        searchPlaceholder={`Cari ${label.toLowerCase()}…`}
        emptyText="Tidak ditemukan"
      >
        <option value="">{loading ? "Memuat…" : `Pilih ${label.toLowerCase()}`}</option>
        {items.map((it) => (
          <option key={it.code} value={it.code}>
            {it.name}
          </option>
        ))}
      </SearchSelect>
    </div>
  );
}

export function SubmitForm() {
  // Wilayah
  const [provinces, setProvinces] = React.useState<Item[]>([]);
  const [regencies, setRegencies] = React.useState<Item[]>([]);
  const [districts, setDistricts] = React.useState<Item[]>([]);
  const [villages, setVillages] = React.useState<Item[]>([]);
  const [pCode, setPCode] = React.useState("");
  const [rCode, setRCode] = React.useState("");
  const [dCode, setDCode] = React.useState("");
  const [vCode, setVCode] = React.useState("");
  const [loadingLevel, setLoadingLevel] = React.useState<string | null>("provinces");
  const [wilayahDown, setWilayahDown] = React.useState(false);
  const [manual, setManual] = React.useState(false);
  const [mName, setMName] = React.useState("");
  const [mDistrict, setMDistrict] = React.useState("");
  const [mRegency, setMRegency] = React.useState("");
  const [mProvince, setMProvince] = React.useState("");
  // Isi
  const [category, setCategory] = React.useState("");
  const [title, setTitle] = React.useState("");
  const [body, setBody] = React.useState("");
  const [locationNote, setLocationNote] = React.useState("");
  const [photos, setPhotos] = React.useState<Photo[]>([]);
  const [photoBusy, setPhotoBusy] = React.useState(false);
  const [name, setName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [consent, setConsent] = React.useState(false);
  const [website, setWebsite] = React.useState("");
  // Kirim
  const [errors, setErrors] = React.useState<Errors>({});
  const [submitting, setSubmitting] = React.useState(false);
  const [resultCode, setResultCode] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);
  const [token, setToken] = React.useState<string | null>(null);
  const [resetSignal, setResetSignal] = React.useState(0);
  const required = isTurnstileRequiredOnClient();
  const summaryRef = React.useRef<HTMLDivElement>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);

  // Muat provinsi + pulihkan draf.
  React.useEffect(() => {
    let alive = true;
    void loadLevel("provinces").then((items) => {
      if (!alive) return;
      setProvinces(items);
      setLoadingLevel(null);
      if (items.length === 0) {
        setWilayahDown(true);
        setManual(true);
      }
    });
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY);
      if (raw) {
        const d = JSON.parse(raw) as Record<string, string>;
        setCategory(d.category ?? "");
        setTitle(d.title ?? "");
        setBody(d.body ?? "");
        setLocationNote(d.locationNote ?? "");
        setName(d.name ?? "");
        setPhone(d.phone ?? "");
        setEmail(d.email ?? "");
        setMName(d.mName ?? "");
        setMDistrict(d.mDistrict ?? "");
        setMRegency(d.mRegency ?? "");
        setMProvince(d.mProvince ?? "");
        if (d.manual === "1") setManual(true);
      }
    } catch {
      // sessionStorage tidak tersedia: tanpa draf
    }
    return () => {
      alive = false;
    };
  }, []);

  // Simpan draf (tanpa foto, persetujuan, token, dan kontak pribadi).
  React.useEffect(() => {
    if (resultCode) return;
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ category, title, body, locationNote, mName, mDistrict, mRegency, mProvince, manual: manual ? "1" : "" }));
    } catch {
      // abaikan
    }
  }, [category, title, body, locationNote, mName, mDistrict, mRegency, mProvince, manual, resultCode]);

  const pick = async (level: "regencies" | "districts" | "villages", parent: string, set: (i: Item[]) => void) => {
    setLoadingLevel(level);
    const items = await loadLevel(level, parent);
    set(items);
    setLoadingLevel(null);
    if (items.length === 0) setWilayahDown(true);
  };

  const onProvince = (v: string) => {
    setPCode(v); setRCode(""); setDCode(""); setVCode(""); setRegencies([]); setDistricts([]); setVillages([]);
    if (v) void pick("regencies", v, setRegencies);
  };
  const onRegency = (v: string) => {
    setRCode(v); setDCode(""); setVCode(""); setDistricts([]); setVillages([]);
    if (v) void pick("districts", v, setDistricts);
  };
  const onDistrict = (v: string) => {
    setDCode(v); setVCode(""); setVillages([]);
    if (v) void pick("villages", v, setVillages);
  };

  async function addPhotos(files: FileList | null) {
    if (!files || files.length === 0) return;
    setErrors((e) => ({ ...e, photos: undefined }));
    setPhotoBusy(true);
    try {
      for (const file of Array.from(files)) {
        if (photos.length + 1 > LIMITS.photosMax) {
          setErrors((e) => ({ ...e, photos: `Maksimal ${LIMITS.photosMax} foto.` }));
          break;
        }
        try {
          const blob = await shrinkToWebp(file);
          const fd = new FormData();
          fd.append("file", new File([blob], "foto.webp", { type: "image/webp" }));
          const res = await fetch("/api/aspirasi/photos", { method: "POST", body: fd });
          const data = (await res.json().catch(() => null)) as { key?: string; error?: string } | null;
          if (!res.ok || !data?.key) throw new Error(data?.error || "Gagal mengunggah foto.");
          const preview = URL.createObjectURL(blob);
          setPhotos((cur) => [...cur, { key: data.key!, preview }]);
        } catch (err) {
          setErrors((e) => ({ ...e, photos: err instanceof Error ? err.message : "Gagal mengunggah foto." }));
          break;
        }
      }
    } finally {
      setPhotoBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const removePhoto = (key: string) =>
    setPhotos((cur) => {
      const gone = cur.find((p) => p.key === key);
      if (gone) URL.revokeObjectURL(gone.preview);
      return cur.filter((p) => p.key !== key);
    });

  function validate(): Errors {
    const e: Errors = {};
    if (manual) {
      if ([mName, mDistrict, mRegency, mProvince].some((x) => x.trim().length < 2)) e.area = "Isi nama desa, kecamatan, kabupaten/kota, dan provinsi.";
    } else if (!vCode) e.area = "Pilih desa atau kelurahan sampai tingkat paling bawah.";
    if (!category) e.category = "Pilih kategori laporan.";
    if (title.trim().length < LIMITS.titleMin) e.title = `Judul minimal ${LIMITS.titleMin} karakter.`;
    if (body.trim().length < LIMITS.bodyMin) e.body = `Isi laporan minimal ${LIMITS.bodyMin} karakter agar jelas dan bisa ditindaklanjuti.`;
    if (!phone.trim() && !email.trim()) e.reporterPhone = "Isi nomor WhatsApp atau email agar kami bisa memberi kabar. Kontak Anda tidak ditampilkan.";
    if (!consent) e.consent = "Centang persetujuan sebelum mengirim.";
    if (required && !token) e.general = "Selesaikan verifikasi keamanan terlebih dahulu.";
    return e;
  }

  const focusSummary = () => requestAnimationFrame(() => summaryRef.current?.focus());

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) return focusSummary();

    setSubmitting(true);
    try {
      const res = await fetch("/api/aspirasi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(manual ? { manualArea: { name: mName.trim(), district: mDistrict.trim(), regency: mRegency.trim(), province: mProvince.trim() } } : { areaCode: vCode }),
          category,
          title: title.trim(),
          body: body.trim(),
          locationNote: locationNote.trim(),
          photos: photos.map((p) => p.key),
          reporterName: name.trim(),
          reporterPhone: phone.trim(),
          reporterEmail: email.trim(),
          consent,
          website,
          turnstileToken: token,
        }),
      });
      const data = (await res.json().catch(() => null)) as { code?: string; error?: string; fieldErrors?: Record<string, string> } | null;
      if (!res.ok) {
        const fe = (data?.fieldErrors ?? {}) as Errors;
        setErrors(Object.keys(fe).length ? fe : { general: data?.error || "Gagal mengirim laporan. Coba lagi sebentar." });
        setResetSignal((n) => n + 1);
        return focusSummary();
      }
      try {
        sessionStorage.removeItem(DRAFT_KEY);
      } catch {
        // abaikan
      }
      photos.forEach((p) => URL.revokeObjectURL(p.preview));
      setResultCode(data?.code ?? "");
    } catch {
      setErrors({ general: "Koneksi bermasalah. Periksa jaringan lalu coba lagi." });
      setResetSignal((n) => n + 1);
      focusSummary();
    } finally {
      setSubmitting(false);
    }
  }

  async function copyCode() {
    if (!resultCode) return;
    try {
      await navigator.clipboard.writeText(resultCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // salin manual
    }
  }

  if (resultCode !== null) {
    return (
      <div role="status" className="rounded-2xl border border-[#0f766e]/30 bg-white p-6 sm:p-8">
        <CheckCircle2 className="h-12 w-12 text-[#0f766e]" aria-hidden="true" />
        <h2 className="mt-4 text-2xl font-semibold text-gray-900">Laporan Anda sudah kami terima</h2>
        <p className="mt-2 text-base leading-relaxed text-gray-800">Simpan nomor laporan ini. Anda memerlukannya, bersama kontak yang Anda isi, untuk memeriksa status.</p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <p className="rounded-xl bg-gray-100 px-4 py-3 font-mono text-2xl font-semibold tracking-widest text-gray-900" aria-label={`Nomor laporan ${resultCode.split("").join(" ")}`}>
            {resultCode}
          </p>
          <button type="button" onClick={copyCode} className={btnOutline}>
            <Copy className="h-4 w-4" aria-hidden="true" />
            {copied ? "Tersalin" : "Salin nomor"}
          </button>
        </div>
        <ul className="mt-5 list-disc space-y-1 pl-5 text-base leading-relaxed text-gray-800">
          <li>Tim kami meninjau setiap laporan dulu sebelum tayang. Ini biasanya memerlukan beberapa hari kerja.</li>
          <li>Setelah tayang, laporan tampil tanpa nama dan kontak Anda, dan pemerintah desa dapat menanggapinya secara terbuka.</li>
          <li>Laporan yang melanggar aturan (data pribadi, fitnah, spam) dapat ditolak, dan Anda bisa membaca alasannya di halaman cek status.</li>
        </ul>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link href="/aspirasi/cek" className={btnPrimary}>
            Cek status laporan
          </Link>
          <Link href="/aspirasi" className={btnOutline}>
            Lihat aspirasi lain
          </Link>
        </div>
      </div>
    );
  }

  const errorList = (Object.entries(errors) as Array<[keyof Errors, string | undefined]>).filter(([, v]) => !!v) as Array<[keyof Errors, string]>;
  const err = (k: keyof Errors) => errors[k];
  const bodyLen = body.trim().length;

  return (
    <form onSubmit={submit} noValidate className="space-y-8" aria-label="Formulir aspirasi warga">
      <span id="asp-form-top" />
      {errorList.length > 0 ? (
        <div ref={summaryRef} tabIndex={-1} role="alert" className="rounded-xl border border-red-300 bg-red-50 p-4 text-base text-red-900 outline-none focus-visible:ring-4 focus-visible:ring-red-300">
          <p className="font-semibold">Periksa isian berikut:</p>
          <ul className="mt-1 list-disc pl-5">
            {errorList.map(([k, text]) => (
              <li key={k}>
                <a href={`#${ANCHOR[k]}`} className="underline underline-offset-2">
                  {text}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <fieldset className="space-y-4">
        <legend className="mb-1 text-xl font-semibold text-gray-900">1. Desa yang dilaporkan</legend>
        {!manual ? (
          <>
            <WilayahSelect id="asp-province" label="Provinsi" value={pCode} items={provinces} onChange={onProvince} loading={loadingLevel === "provinces"} invalid={!!err("area")} />
            <WilayahSelect id="asp-regency" label="Kabupaten/Kota" value={rCode} items={regencies} onChange={onRegency} disabled={!pCode} loading={loadingLevel === "regencies"} />
            <WilayahSelect id="asp-district" label="Kecamatan" value={dCode} items={districts} onChange={onDistrict} disabled={!rCode} loading={loadingLevel === "districts"} />
            <WilayahSelect id="asp-village" label="Desa/Kelurahan" value={vCode} items={villages} onChange={setVCode} disabled={!dCode} loading={loadingLevel === "villages"} />
          </>
        ) : (
          <div className="space-y-4 rounded-xl border border-gray-300 bg-gray-50 p-4">
            {wilayahDown ? <p className="text-base text-gray-800">Daftar wilayah sedang tidak dapat dimuat, jadi isi manual dulu.</p> : null}
            {([
              ["asp-manual-name", "Nama desa/kelurahan", mName, setMName],
              ["asp-manual-district", "Kecamatan", mDistrict, setMDistrict],
              ["asp-manual-regency", "Kabupaten/Kota", mRegency, setMRegency],
              ["asp-manual-province", "Provinsi", mProvince, setMProvince],
            ] as const).map(([id, label, val, set], i) => (
              <div key={id}>
                <label htmlFor={id} className={labelClass}>
                  {label}
                </label>
                <input id={id} className={inputClass} value={val} onChange={(e) => set(e.target.value)} maxLength={120} autoComplete="off" aria-invalid={i === 0 && err("area") ? true : undefined} />
              </div>
            ))}
            <p className={hintClass}>Tim kami akan memeriksa nama wilayah ini sebelum laporan tayang.</p>
          </div>
        )}
        {err("area") ? <p className="text-sm text-red-700">{err("area")}</p> : null}
        {!wilayahDown || !manual ? (
          <button type="button" onClick={() => setManual((m) => !m)} className={`min-h-11 cursor-pointer text-base text-teal-800 underline underline-offset-2 ${focusRing}`}>
            {manual ? "Pilih dari daftar wilayah" : "Desa saya tidak ada di daftar"}
          </button>
        ) : null}
      </fieldset>

      <fieldset className="space-y-5">
        <legend className="mb-1 text-xl font-semibold text-gray-900">2. Isi laporan</legend>
        <div>
          <label htmlFor="asp-category" className={labelClass}>
            Kategori
          </label>
          <SearchSelect id="asp-category" value={category} onChange={(e) => setCategory(e.target.value)} aria-invalid={err("category") ? true : undefined} className={selectClass} searchPlaceholder="Cari kategori…">
            <option value="">Pilih kategori</option>
            {ASPIRATION_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </SearchSelect>
          {err("category") ? <p className="mt-1 text-sm text-red-700">{err("category")}</p> : null}
        </div>
        <div>
          <label htmlFor="asp-title" className={labelClass}>
            Judul
          </label>
          <input id="asp-title" className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={LIMITS.titleMax} aria-invalid={err("title") ? true : undefined} aria-describedby="asp-title-hint" placeholder="Contoh: Tumpukan sampah di tepi jalan menuju balai desa" />
          <p id="asp-title-hint" className={hintClass}>
            {title.trim().length}/{LIMITS.titleMax} karakter (minimal {LIMITS.titleMin}).
          </p>
          {err("title") ? <p className="text-sm text-red-700">{err("title")}</p> : null}
        </div>
        <div>
          <label htmlFor="asp-body" className={labelClass}>
            Ceritakan kondisinya
          </label>
          <textarea id="asp-body" rows={7} className={inputClass} value={body} onChange={(e) => setBody(e.target.value)} maxLength={LIMITS.bodyMax} aria-invalid={err("body") ? true : undefined} aria-describedby="asp-body-hint" placeholder="Apa yang terjadi, sejak kapan, dan dampaknya bagi warga. Tulis faktanya saja." />
          <p id="asp-body-hint" className={hintClass}>
            {bodyLen}/{LIMITS.bodyMax} karakter (minimal {LIMITS.bodyMin}). <strong>Jangan menulis</strong> NIK, nomor telepon, alamat rumah, atau nama orang tertentu. Nomor dan email yang terlanjur tertulis akan disamarkan.
          </p>
          {err("body") ? <p className="text-sm text-red-700">{err("body")}</p> : null}
        </div>
        <div>
          <label htmlFor="asp-location" className={labelClass}>
            Patokan lokasi <span className="font-normal text-gray-700">(opsional)</span>
          </label>
          <input id="asp-location" className={inputClass} value={locationNote} onChange={(e) => setLocationNote(e.target.value)} maxLength={LIMITS.locationMax} aria-describedby="asp-location-hint" placeholder="Contoh: Dusun Mawar, dekat jembatan RT 03" />
          <p id="asp-location-hint" className={hintClass}>Sebut dusun, RT, atau tempat umum terdekat. Bukan alamat rumah seseorang.</p>
        </div>
        <div id="asp-photos">
          <p className={labelClass}>
            Foto <span className="font-normal text-gray-700">(opsional, maksimal {LIMITS.photosMax})</span>
          </p>
          <p className={hintClass}>
            Foto dikecilkan dan dibersihkan dari data lokasi/kamera di perangkat Anda. Hindari wajah orang dan plat nomor; tim kami juga memeriksanya sebelum tayang.
          </p>
          <ul className="mt-3 flex flex-wrap gap-3">
            {photos.map((p, i) => (
              <li key={p.key} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.preview} alt={`Foto lampiran ${i + 1}`} width={96} height={96} className="h-24 w-24 rounded-xl border border-gray-300 object-cover" />
                <button type="button" onClick={() => removePhoto(p.key)} aria-label={`Hapus foto lampiran ${i + 1}`} className={`absolute -right-2 -top-2 inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-gray-900 text-white ${focusRing}`}>
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
          {photos.length < LIMITS.photosMax ? (
            <>
              <input ref={fileRef} id="asp-photo-input" type="file" accept="image/*" multiple className="sr-only" onChange={(e) => void addPhotos(e.target.files)} disabled={photoBusy} />
              <label htmlFor="asp-photo-input" className={`${btnOutline} mt-3 ${photoBusy ? "pointer-events-none opacity-60" : ""}`}>
                {photoBusy ? <Loader2 className="h-5 w-5 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <ImagePlus className="h-5 w-5" aria-hidden="true" />}
                {photoBusy ? "Memproses foto…" : "Tambah foto"}
              </label>
            </>
          ) : null}
          {err("photos") ? <p className="mt-2 text-sm text-red-700">{err("photos")}</p> : null}
        </div>
      </fieldset>

      <fieldset className="space-y-5">
        <legend className="mb-1 text-xl font-semibold text-gray-900">3. Kontak Anda (tidak ditampilkan)</legend>
        <p className="text-base leading-relaxed text-gray-800">Kami memerlukannya hanya untuk memberi kabar dan, bila perlu, menanyakan hal yang kurang jelas. Nama dan kontak Anda tidak pernah tampil di halaman publik.</p>
        <div>
          <label htmlFor="asp-name" className={labelClass}>
            Nama <span className="font-normal text-gray-700">(opsional)</span>
          </label>
          <input id="asp-name" className={inputClass} value={name} onChange={(e) => setName(e.target.value)} maxLength={LIMITS.nameMax} autoComplete="name" />
        </div>
        <div>
          <label htmlFor="asp-phone" className={labelClass}>
            Nomor WhatsApp
          </label>
          <input id="asp-phone" type="tel" inputMode="tel" autoComplete="tel" className={inputClass} value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={30} aria-invalid={err("reporterPhone") ? true : undefined} aria-describedby="asp-contact-hint" placeholder="08xxxxxxxxxx" />
          {err("reporterPhone") ? <p className="mt-1 text-sm text-red-700">{err("reporterPhone")}</p> : null}
        </div>
        <div>
          <label htmlFor="asp-email" className={labelClass}>
            Email
          </label>
          <input id="asp-email" type="email" autoComplete="email" className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} maxLength={255} aria-invalid={err("reporterEmail") ? true : undefined} aria-describedby="asp-contact-hint" placeholder="nama@email.com" />
          <p id="asp-contact-hint" className={hintClass}>Isi salah satu: WhatsApp atau email.</p>
          {err("reporterEmail") ? <p className="text-sm text-red-700">{err("reporterEmail")}</p> : null}
        </div>
      </fieldset>

      {/* Kolom jebakan bot: manusia tidak melihat dan tidak mengisinya. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Situs web
          <input type="text" name="website" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
        </label>
      </div>

      <div>
        <label className={`flex min-h-12 cursor-pointer items-start gap-3 rounded-xl border-2 p-4 text-base leading-relaxed ${consent ? "border-[#0f766e] bg-teal-50" : "border-gray-300"}`}>
          <input id="asp-consent" type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} aria-invalid={err("consent") ? true : undefined} className="mt-1 h-5 w-5 shrink-0 accent-[#0f766e]" />
          <span>
            Saya paham laporan ini akan <strong>ditinjau lebih dulu</strong> dan dapat <strong>tayang untuk umum tanpa identitas saya</strong>, dan saya tidak menulis NIK, nomor telepon, atau nama orang tertentu. Saya sudah membaca{" "}
            <Link href="/privacy-policy#aspirasi-warga" className="text-teal-800 underline underline-offset-2">
              kebijakan privasi
            </Link>
            .
          </span>
        </label>
        {err("consent") ? <p className="mt-1 text-sm text-red-700">{err("consent")}</p> : null}
      </div>

      <TurnstileWidget onToken={setToken} resetSignal={resetSignal} />

      <button type="submit" disabled={submitting || photoBusy} className={`${btnPrimary} min-h-14 w-full text-lg disabled:cursor-not-allowed disabled:opacity-60`}>
        {submitting ? (
          "Mengirim…"
        ) : (
          <>
            <Send className="h-5 w-5" aria-hidden="true" />
            Kirim aspirasi
          </>
        )}
      </button>
    </form>
  );
}
