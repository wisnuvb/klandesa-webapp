"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

export type PageHeaderOverride = {
  title: string;
  subtitle?: string;
  /** Tombol kembali di sisi kiri judul. */
  back?: { label: string; onClick: () => void };
};

type PageHeaderState = {
  override: PageHeaderOverride | null;
  /** Halaman mengunci gulir area utama; isinya mengatur gulirnya sendiri (mis. dua panel). */
  scrollLocked: boolean;
};

type PageHeaderSetters = {
  setOverride: (o: PageHeaderOverride | null) => void;
  setScrollLocked: (locked: boolean) => void;
};

// Dua konteks terpisah: halaman hanya memakai setter (stabil) sehingga tidak ikut render ulang
// setiap kali judul/kunci gulir berubah; hanya AppShell yang membaca nilainya.
const PageHeaderStateContext = createContext<PageHeaderState | null>(null);
const PageHeaderSettersContext = createContext<PageHeaderSetters | null>(null);

/** Dipasang di AppShell: halaman dapat menggantikan judul header aplikasi selama halaman itu tampil. */
export function PageHeaderProvider({ children }: { children: ReactNode }) {
  const [override, setOverride] = useState<PageHeaderOverride | null>(null);
  const [scrollLocked, setScrollLocked] = useState(false);
  const state = useMemo(() => ({ override, scrollLocked }), [override, scrollLocked]);
  const setters = useMemo(() => ({ setOverride, setScrollLocked }), []);
  return (
    <PageHeaderSettersContext.Provider value={setters}>
      <PageHeaderStateContext.Provider value={state}>{children}</PageHeaderStateContext.Provider>
    </PageHeaderSettersContext.Provider>
  );
}

/** Judul pengganti yang sedang aktif (null = pakai judul bawaan rute). Dibaca oleh AppShell. */
export function usePageHeaderOverride(): PageHeaderOverride | null {
  return useContext(PageHeaderStateContext)?.override ?? null;
}

/**
 * Gantikan judul header aplikasi dari dalam halaman. Beri `null` untuk memakai judul bawaan.
 * Teks diperbarui saat berubah; `onBack` boleh berganti tiap render tanpa memicu pembaruan header.
 */
export function usePageHeader(spec: { title: string; subtitle?: string; backLabel?: string; onBack?: () => void } | null) {
  const setOverride = useContext(PageHeaderSettersContext)?.setOverride;
  const onBackRef = useRef<(() => void) | undefined>(undefined);
  useEffect(() => {
    onBackRef.current = spec?.onBack;
  });

  const title = spec?.title ?? null;
  const subtitle = spec?.subtitle;
  const backLabel = spec?.backLabel ?? "Kembali";
  const hasBack = Boolean(spec?.onBack);

  useEffect(() => {
    if (!setOverride || title === null) return;
    setOverride({
      title,
      subtitle,
      back: hasBack ? { label: backLabel, onClick: () => onBackRef.current?.() } : undefined,
    });
    return () => setOverride(null);
  }, [setOverride, title, subtitle, hasBack, backLabel]);
}

/** Dibaca oleh AppShell: true bila halaman aktif mengunci gulir area utama. */
export function usePageScrollLocked(): boolean {
  return useContext(PageHeaderStateContext)?.scrollLocked ?? false;
}

/**
 * Kunci gulir halaman selama komponen tampil: area utama tidak bergulir dan tingginya pas layar,
 * sehingga hanya panel di dalam halaman yang bergulir.
 */
export function usePageScrollLock(active: boolean) {
  const setScrollLocked = useContext(PageHeaderSettersContext)?.setScrollLocked;
  useEffect(() => {
    if (!setScrollLocked || !active) return;
    setScrollLocked(true);
    return () => setScrollLocked(false);
  }, [setScrollLocked, active]);
}
