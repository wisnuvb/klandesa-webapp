"use client";

import { useCallback, useEffect, useState } from "react";
import type { TemplateBody } from "../types";
import { isV2Row, mapApiMailTemplateToBody } from "../_utils/mapMailTemplate";

async function errorOf(res: Response, fallback: string): Promise<string> {
  const data = (await res.json().catch(() => null)) as { error?: string } | null;
  return data?.error || fallback;
}

/**
 * Jenis surat dimuat sekali saat halaman dibuka dan dipakai bersama tab Buat Surat & Atur Jenis Surat.
 * Daftarnya ringan (tanpa dokumen); riwayat surat dimuat terpisah oleh tab Riwayat (`useLetterHistory`).
 */
export function useLayananSuratData() {
  const [templates, setTemplates] = useState<TemplateBody[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [templatesError, setTemplatesError] = useState("");

  const loadTemplates = useCallback(async () => {
    setTemplatesLoading(true);
    try {
      const res = await fetch("/api/mail-templates");
      if (!res.ok) throw new Error(await errorOf(res, "Gagal memuat daftar jenis surat."));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rows: any[] = await res.json();
      setTemplates(rows.filter(isV2Row).map((t) => mapApiMailTemplateToBody(t)));
      setTemplatesError("");
    } catch (e) {
      setTemplatesError(e instanceof Error ? e.message : "Gagal memuat daftar jenis surat.");
    } finally {
      setTemplatesLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTemplates();
  }, [loadTemplates]);

  return { templates, templatesLoading, templatesError, refetch: loadTemplates };
}
