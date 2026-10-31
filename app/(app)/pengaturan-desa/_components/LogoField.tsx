"use client";

import { useState } from "react";
import { ImageOff, ImagePlus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "./Field";

type LogoFieldProps = {
  value: string;
  onChange: (next: string) => void;
  onBrowse: () => void;
  error?: string;
};

/** Pratinjau logo + aksi pilih/hapus; URL manual disembunyikan di balik "Gunakan URL lain". */
export function LogoField({ value, onChange, onBrowse, error }: LogoFieldProps) {
  const [manualOpen, setManualOpen] = useState(false);
  // Gagal-muat dicatat per URL, jadi otomatis reset ketika URL berganti.
  const [brokenUrl, setBrokenUrl] = useState<string | null>(null);
  const url = value.trim();
  const hasLogo = url.length > 0;
  const broken = hasLogo && brokenUrl === url;
  const showManual = manualOpen || Boolean(error);

  return (
    <div className="space-y-3">
      <div className="text-sm font-medium leading-none">
        Logo desa <span className="font-normal text-muted-foreground">(opsional)</span>
      </div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div
          className="flex size-28 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-[length:16px_16px] bg-[position:0_0,8px_8px] [background-image:conic-gradient(#f1f5f9_25%,#fff_0_50%,#f1f5f9_0_75%,#fff_0)]"
        >
          {hasLogo && !broken ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={url}
              alt="Logo desa saat ini"
              className="size-full object-contain p-1"
              onError={() => setBrokenUrl(url)}
            />
          ) : (
            <div className="flex flex-col items-center gap-1 px-2 text-center text-xs text-muted-foreground">
              <ImageOff className="size-5" aria-hidden="true" />
              {broken ? "Gambar tidak dapat dimuat" : "Belum ada logo"}
            </div>
          )}
        </div>
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={onBrowse}>
              <ImagePlus className="size-4" aria-hidden="true" />
              {hasLogo ? "Ganti logo" : "Pilih atau unggah logo"}
            </Button>
            {hasLogo ? (
              <Button
                type="button"
                variant="ghost"
                className="text-destructive hover:text-destructive"
                onClick={() => onChange("")}
              >
                <Trash2 className="size-4" aria-hidden="true" />
                Hapus
              </Button>
            ) : null}
          </div>
          <p className="text-xs text-muted-foreground">
            Dipakai di kop surat. Gunakan gambar persegi atau berlatar transparan (PNG/WebP) agar
            tampil rapi.
          </p>
          {broken ? (
            <p role="alert" className="text-xs font-medium text-destructive">
              Logo tidak dapat ditampilkan. Pastikan berkas publik dan URL-nya benar, atau pilih
              ulang dari arsip.
            </p>
          ) : null}
        </div>
      </div>

      <div>
        <button
          type="button"
          className="text-xs font-medium text-primary underline-offset-4 hover:underline"
          aria-expanded={showManual}
          aria-controls="logoUrl-manual"
          onClick={() => setManualOpen((o) => !o)}
        >
          {showManual ? "Sembunyikan kolom URL" : "Gunakan URL lain"}
        </button>
        {showManual ? (
          <div id="logoUrl-manual" className="mt-2">
            <Field id="logoUrl" label="URL logo" error={error}>
              {(c) => (
                <Input
                  {...c}
                  type="url"
                  value={value}
                  onChange={(e) => onChange(e.target.value)}
                  placeholder="https://…"
                />
              )}
            </Field>
          </div>
        ) : null}
      </div>
    </div>
  );
}
