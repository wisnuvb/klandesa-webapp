"use client";

import { useSearchParams } from "next/navigation";
import { LetterComposer } from "./_components/LetterComposer";

function positiveInt(raw: string | null): number | null {
  return raw && /^\d{1,18}$/.test(raw) && Number(raw) > 0 ? Number(raw) : null;
}

/** Membaca `?templateId=` (surat baru) atau `?surat=` (lanjutkan draf / lihat surat terbit). */
export function BuatSuratClient() {
  const params = useSearchParams();
  const surat = positiveInt(params.get("surat"));
  const template = positiveInt(params.get("templateId"));
  return <LetterComposer templateId={template} suratId={surat} />;
}
