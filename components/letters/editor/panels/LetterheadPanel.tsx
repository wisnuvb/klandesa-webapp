"use client";

import { GARUDA_STYLES, GARUDA_STYLE_LABELS } from "@/lib/letters/garuda";
import { memo, useId, useState } from "react";
import { Check, ExternalLink, ImageOff, ImagePlus, Info, Loader2, RotateCcw, Trash2 } from "lucide-react";
import { GolonganSelect } from "@/components/app/GolonganSelect";
import { DigitalArchivePickerModal } from "@/components/digital-archive/DigitalArchivePickerModal";
import { Button } from "@/components/ui/button";
import { cn } from "@/components/ui/utils";
import type { EditorApi } from "@/lib/letters/editor";
import {
  DEFAULT_FONT_SIZES,
  FONT_SIZE_RANGE,
  LETTERHEAD_ADDRESS_LAYOUTS,
  LETTERHEAD_ADDRESS_LAYOUT_LABELS,
  LETTERHEAD_FONT_KEYS,
  LETTERHEAD_FONT_LABELS,
  LETTERHEAD_LAYOUTS,
  LETTERHEAD_LAYOUT_LABELS,
  LETTERHEAD_LOGO_SIZES,
  LETTERHEAD_LOGO_SIZE_LABELS,
  LETTERHEAD_NAME_KEYS,
  LETTERHEAD_NAME_LABELS,
  LETTERHEAD_RULES,
  LETTERHEAD_RULE_LABELS,
  NAME_MAX_LENGTH,
  kopHeadingLines,
  patchLetterheadStyle,
  type LetterheadLayout,
  type LetterheadStyle,
  type LetterheadStylePatch,
} from "@/lib/letters/letterhead";
import type { LetterheadController } from "../useVillageLetterhead";
import { LETTERHEAD_LABELS } from "./helpers";
import { FieldError, NumberField, RadioCards, Section, TextField, labelClass } from "./ui";

const GARUDA_OPTIONS = GARUDA_STYLES.map((value) => ({ value, label: GARUDA_STYLE_LABELS[value].label, hint: GARUDA_STYLE_LABELS[value].hint }));

const KOP_OPTIONS = Object.entries(LETTERHEAD_LABELS).map(([value, v]) => ({
  value: value as keyof typeof LETTERHEAD_LABELS, label: v.label, hint: v.hint,
}));

/** Gambar kecil tata letak (hiasan; teks pilihan sudah menjelaskan). */
function LayoutDiagram({ layout }: { layout: LetterheadLayout }) {
  const logo = <span className="block size-5 shrink-0 rounded-full border border-current opacity-70" />;
  const lines = (
    <span className="flex min-w-0 flex-1 flex-col items-center gap-0.5">
      <span className="block h-0.5 w-10 bg-current opacity-70" />
      <span className="block h-1 w-12 bg-current opacity-80" />
      <span className="block h-0.5 w-8 bg-current opacity-50" />
    </span>
  );
  return (
    <span aria-hidden className="flex h-14 w-full flex-col justify-center rounded-sm border border-dashed border-input bg-white px-1.5 text-slate-700">
      {layout === "atas" ? (
        <span className="flex flex-col items-center gap-0.5">{logo}{lines}</span>
      ) : (
        <span className="flex items-center gap-1">
          {layout === "kiri" ? logo : null}
          {lines}
          {layout === "kanan" ? logo : null}
        </span>
      )}
      <span className="mt-0.5 block h-px w-full bg-current opacity-60" />
    </span>
  );
}

/** Teks baris judul kop bila tidak diganti, untuk placeholder kolom nama. */
function autoHeadingTexts(desa: Record<string, string>): Record<"pemerintah" | "kecamatan" | "desa", string> {
  const lines = kopHeadingLines(desa, { pemerintah: "", kecamatan: "", desa: "" });
  const of = (prefix: string) => lines.find((l) => l.text.startsWith(prefix))?.text ?? "";
  return { pemerintah: of("PEMERINTAH"), kecamatan: of("KECAMATAN"), desa: of("DESA") };
}

function LogoPreview({ url }: { url: string }) {
  // Gagal-muat dicatat per URL, jadi reset sendiri saat URL berganti.
  const [brokenUrl, setBrokenUrl] = useState<string | null>(null);
  const broken = url !== "" && brokenUrl === url;
  return (
    <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-white">
      {url && !broken ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="Logo desa saat ini" className="size-full object-contain p-1" onError={() => setBrokenUrl(url)} />
      ) : (
        <span className="flex flex-col items-center gap-1 px-1 text-center text-[11px] leading-tight text-muted-foreground">
          <ImageOff className="size-4" aria-hidden />
          {broken ? "Tidak dapat dimuat" : "Belum ada logo"}
        </span>
      )}
    </div>
  );
}

/**
 * Tab "Kop surat": tata letak kop, logo, alamat, dan nama pejabat penandatangan. Isian disimpan ke PROFIL DESA
 * (berlaku untuk semua surat), jadi operator tidak perlu membuka Pengaturan Desa. Perubahan tampil langsung di
 * kertas, tetapi baru tersimpan saat tombol Simpan ditekan.
 */
export const LetterheadPanel = memo(function LetterheadPanel({ editor, kop }: { editor: EditorApi; kop: LetterheadController }) {
  const { doc, setMeta } = editor;
  const { draft, errors } = kop;
  const [pickerOpen, setPickerOpen] = useState(false);
  const layoutId = useId();

  if (kop.status === "loading") {
    return (
      <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Memuat data desa…
      </p>
    );
  }
  if (kop.status === "error" || !draft) {
    return (
      <div role="alert" className="space-y-3">
        <p className="flex items-start gap-1.5 text-sm text-destructive">
          <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          {kop.error ?? "Data desa gagal dimuat."} Kop di kertas masih memakai data contoh.
        </p>
        <Button type="button" variant="outline" className="min-h-11" onClick={kop.retry}>Coba lagi</Button>
      </div>
    );
  }

  const desa = doc.letterhead === "desa";
  const perSurat = !!doc.letterheadStyle;
  const style: LetterheadStyle = doc.letterheadStyle ?? draft.style;
  // Gaya khusus surat langsung masuk dokumen; gaya desa masuk draf profil desa (baru tersimpan saat Simpan ditekan).
  const applyStyle = (patch: LetterheadStylePatch) => {
    if (perSurat) setMeta({ letterheadStyle: patchLetterheadStyle(style, patch) });
    else kop.change({ style: patch });
  };
  const autoHeadings = autoHeadingTexts({ nama: kop.desaNama, kecamatan: kop.kecamatan, kabupaten: kop.kabupaten });
  const wilayah = [kop.desaNama && `Desa ${kop.desaNama.replace(/^desa\s+/i, "")}`, kop.kecamatan, kop.kabupaten].filter(Boolean).join(", ");

  return (
    <div className="space-y-6">
      <p className="flex items-start gap-1.5 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
        Alamat, logo, dan nama pejabat di sini adalah data desa Anda yang asli; setelah disimpan berlaku untuk semua surat. Gaya kop (posisi logo, ukuran huruf, tata alamat) bisa diatur untuk semua surat atau hanya surat ini.
      </p>

      <Section title="Jenis kop surat ini" description="Pilihan ini khusus untuk jenis surat yang sedang diedit.">
        <RadioCards
          legend="Kop yang dipakai"
          value={doc.letterhead}
          onChange={(letterhead) => setMeta({ letterhead })}
          options={KOP_OPTIONS}
        />
        {doc.letterhead === "garuda" && (
          <RadioCards
            legend="Gambar lambang Garuda"
            value={doc.garudaStyle}
            onChange={(garudaStyle) => setMeta({ garudaStyle })}
            options={GARUDA_OPTIONS}
            columns={2}
          />
        )}
      </Section>

      {desa && (
        <>
          <Section
            title="Gaya kop"
            description="Posisi logo, ukuran huruf, tata alamat, dan nama baris kop."
          >
            <RadioCards
              legend="Gaya ini berlaku untuk"
              columns={2}
              value={perSurat ? "surat" : "desa"}
              onChange={(v) => setMeta({ letterheadStyle: v === "surat" ? { ...style } : undefined })}
              options={[
                { value: "desa", label: "Semua surat desa", hint: "Diubah di sini, kop semua surat ikut berubah setelah disimpan." },
                { value: "surat", label: "Hanya surat ini", hint: "Gaya khusus jenis surat ini; tidak mengubah surat lain." },
              ]}
            />
            <p className="text-xs text-muted-foreground" role="status">
              {perSurat
                ? "Memakai gaya khusus surat ini. Logo, alamat, dan kontak tetap dari profil desa. Pilih “Semua surat desa” untuk kembali mengikuti gaya desa."
                : "Memakai gaya kop desa. Perubahan di bawah disimpan ke profil desa dan berlaku untuk semua surat."}
            </p>

            <fieldset className="min-w-0">
              <legend className={labelClass}>Posisi logo</legend>
              <div className="grid grid-cols-3 gap-2">
                {LETTERHEAD_LAYOUTS.map((value) => {
                  const checked = style.layout === value;
                  const meta = LETTERHEAD_LAYOUT_LABELS[value];
                  return (
                    <label
                      key={value}
                      className={cn(
                        "relative flex min-h-11 cursor-pointer flex-col gap-1.5 rounded-md border bg-background p-2 text-xs has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
                        checked ? "border-primary bg-accent ring-1 ring-primary" : "border-input hover:bg-accent/60",
                      )}
                    >
                      <input
                        type="radio"
                        name={`${layoutId}-layout`}
                        value={value}
                        checked={checked}
                        onChange={() => applyStyle({ layout: value })}
                        className="sr-only"
                        aria-describedby={`${layoutId}-${value}-hint`}
                      />
                      <LayoutDiagram layout={value} />
                      <span className="font-medium leading-tight">{meta.label}</span>
                      <span id={`${layoutId}-${value}-hint`} className="sr-only">{meta.hint}</span>
                      {checked && (
                        <span aria-hidden className="absolute right-1 top-1 flex size-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
                          <Check className="size-3" />
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>
            </fieldset>
            <RadioCards
              legend="Garis di bawah kop"
              columns={3}
              value={style.rule}
              onChange={(rule) => applyStyle({ rule })}
              options={LETTERHEAD_RULES.map((value) => ({ value, label: LETTERHEAD_RULE_LABELS[value] }))}
            />
            <RadioCards
              legend="Ukuran logo"
              columns={3}
              value={style.logoSize}
              onChange={(logoSize) => applyStyle({ logoSize })}
              options={LETTERHEAD_LOGO_SIZES.map((value) => ({ value, label: LETTERHEAD_LOGO_SIZE_LABELS[value] }))}
            />
          </Section>

          <Section title="Ukuran huruf kop" description="Dalam pt. Ukuran huruf isi surat diatur di tab Halaman.">
            {LETTERHEAD_FONT_KEYS.map((key) => (
              <NumberField
                key={key}
                label={LETTERHEAD_FONT_LABELS[key].label}
                unit="pt"
                hint={LETTERHEAD_FONT_LABELS[key].hint}
                min={FONT_SIZE_RANGE.min}
                max={FONT_SIZE_RANGE.max}
                step={FONT_SIZE_RANGE.step}
                value={style.fontSizes[key]}
                onCommit={(v) => applyStyle({ fontSizes: { [key]: v } })}
              />
            ))}
            <Button
              type="button"
              variant="ghost"
              className="min-h-11 self-start"
              disabled={LETTERHEAD_FONT_KEYS.every((k) => style.fontSizes[k] === DEFAULT_FONT_SIZES[k])}
              onClick={() => applyStyle({ fontSizes: DEFAULT_FONT_SIZES })}
            >
              <RotateCcw className="size-4" aria-hidden /> Kembalikan ukuran bawaan
            </Button>
          </Section>

          <Section
            title="Tata alamat & kontak"
            description="Pilih bila alamat di kop terpotong atau terlalu panjang dalam satu paragraf."
          >
            <RadioCards
              legend="Susunan alamat di kop"
              columns={1}
              value={style.addressLayout}
              onChange={(addressLayout) => applyStyle({ addressLayout })}
              options={LETTERHEAD_ADDRESS_LAYOUTS.map((value) => ({
                value,
                label: LETTERHEAD_ADDRESS_LAYOUT_LABELS[value].label,
                hint: LETTERHEAD_ADDRESS_LAYOUT_LABELS[value].hint,
              }))}
            />
          </Section>

          <Section
            title="Teks judul kop"
            description="Kosongkan untuk otomatis dari data wilayah. Isi untuk mengganti seluruh teks barisnya, misalnya bila nama kabupaten tercetak ganda."
          >
            {LETTERHEAD_NAME_KEYS.map((key) => (
              <TextField
                key={key}
                label={LETTERHEAD_NAME_LABELS[key]}
                value={style.names[key]}
                onCommit={(v) => applyStyle({ names: { [key]: v } })}
                maxLength={NAME_MAX_LENGTH}
                placeholder={autoHeadings[key] || "(otomatis)"}
                hint={style.names[key] ? "Teks ini dipakai apa adanya (huruf otomatis kapital)." : "Otomatis dari data wilayah desa."}
              />
            ))}
          </Section>

          <Section title="Logo desa" description="Dipakai di kop semua surat. Gambar persegi atau berlatar transparan (PNG/WebP) paling rapi.">
            <div className="flex items-center gap-3">
              <LogoPreview url={draft.logoUrl.trim()} />
              <div className="flex flex-col items-start gap-2">
                <Button type="button" variant="outline" className="min-h-11" onClick={() => setPickerOpen(true)}>
                  <ImagePlus className="size-4" aria-hidden />
                  {draft.logoUrl.trim() ? "Ganti logo" : "Pilih atau unggah logo"}
                </Button>
                {draft.logoUrl.trim() ? (
                  <Button
                    type="button"
                    variant="ghost"
                    className="min-h-11 text-destructive hover:text-destructive"
                    onClick={() => kop.change({ logoUrl: "" })}
                  >
                    <Trash2 className="size-4" aria-hidden /> Hapus logo
                  </Button>
                ) : null}
              </div>
            </div>
            <FieldError>{errors.logoUrl}</FieldError>
          </Section>

          <Section title="Alamat & kontak di kop">
            <p className="text-xs text-muted-foreground">
              Nama desa, kecamatan, dan kabupaten{wilayah ? ` (${wilayah})` : ""} diambil dari Pengaturan Desa.{" "}
              <a
                href="/pengaturan-desa"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-medium text-primary underline-offset-4 hover:underline"
              >
                Ubah di sana <ExternalLink className="size-3" aria-hidden />
                <span className="sr-only">(dibuka di tab baru)</span>
              </a>
            </p>
            <TextField
              label="Alamat kantor desa"
              value={draft.alamat}
              onCommit={(alamat) => kop.change({ alamat })}
              error={errors.alamat}
              multiline
              rows={2}
              maxLength={500}
              autoComplete="street-address"
            />
            <div className="grid grid-cols-2 gap-3">
              <TextField label="Kode pos" value={draft.kodePos} onCommit={(kodePos) => kop.change({ kodePos })} error={errors.kodePos} maxLength={5} autoComplete="postal-code" />
              <TextField label="Telepon" value={draft.telepon} onCommit={(telepon) => kop.change({ telepon })} error={errors.telepon} maxLength={20} autoComplete="tel" />
            </div>
            <TextField label="Email desa" value={draft.email} onCommit={(email) => kop.change({ email })} error={errors.email} maxLength={255} autoComplete="email" />
          </Section>
        </>
      )}

      <Section title="Nama di tanda tangan" description="Nama pejabat yang tercetak di bagian tanda tangan surat.">
        <TextField label="Nama Kepala Desa" value={draft.kadesNama} onCommit={(kadesNama) => kop.change({ kadesNama })} maxLength={120} />
        <TextField label="NIP Kepala Desa (bila ada)" value={draft.kadesNip} onCommit={(kadesNip) => kop.change({ kadesNip })} maxLength={40} mono error={errors.kadesNip} hint="18 angka; spasi pemisah boleh." />
        <TextField label="Nama Sekretaris Desa" value={draft.sekdesNama} onCommit={(sekdesNama) => kop.change({ sekdesNama })} maxLength={120} />
        <TextField label="Nama Camat" value={draft.camatNama} onCommit={(camatNama) => kop.change({ camatNama })} maxLength={120} />
        <div>
          <label htmlFor={`${layoutId}-camat-gol`} className={labelClass}>Pangkat/golongan Camat</label>
          <GolonganSelect
            id={`${layoutId}-camat-gol`}
            variant="panel"
            value={draft.camatGolongan}
            onChange={(camatGolongan) => kop.change({ camatGolongan })}
          />
        </div>
        <TextField label="NIP Camat" value={draft.camatNip} onCommit={(camatNip) => kop.change({ camatNip })} maxLength={40} mono error={errors.camatNip} hint="18 angka; spasi pemisah boleh." />
      </Section>

      {(kop.dirty || kop.saveError) && (
        <div className="sticky -bottom-4 -mx-4 space-y-2 border-t bg-card px-4 py-3 shadow-[0_-4px_8px_rgba(0,0,0,.06)]">
          {kop.saveError ? (
            <p role="alert" className="flex items-start gap-1.5 text-sm text-destructive">
              <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              {kop.saveError}
            </p>
          ) : (
            <p role="status" className="text-xs text-muted-foreground">Perubahan belum disimpan.</p>
          )}
          <div className="flex gap-2">
            <Button type="button" className="min-h-11 flex-1" onClick={() => void kop.save()} disabled={kop.saving}>
              {kop.saving ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
              {kop.saving ? "Menyimpan…" : "Simpan ke profil desa"}
            </Button>
            <Button type="button" variant="outline" className="min-h-11" onClick={kop.discard} disabled={kop.saving}>
              Batalkan
            </Button>
          </div>
        </div>
      )}

      <DigitalArchivePickerModal
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onPick={(url) => kop.change({ logoUrl: url })}
        title="Pilih logo desa dari arsip digital"
        description="Pilih gambar dari arsip, atau unggah logo baru bila belum ada. Hanya berkas publik yang ditampilkan agar logo bisa dimuat di kop surat."
        imageOnly
        publicOnly
      />
    </div>
  );
});
