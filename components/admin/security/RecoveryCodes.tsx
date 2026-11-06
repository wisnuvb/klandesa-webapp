"use client";

import { useId, useState } from "react";
import { Check, Copy, Download, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { copyText } from "./api";

/** Tampilan SEKALI-LIHAT kode pemulihan: salin/unduh, dan konfirmasi "sudah disimpan" sebelum ditutup. */
export function RecoveryCodes({ codes, onDone }: { codes: string[]; onDone: () => void }) {
  const ackId = useId();
  const [saved, setSaved] = useState(false);

  function download() {
    const body = `Kode pemulihan 2FA Klandesa (admin platform)\nSimpan di tempat aman. Setiap kode hanya berlaku sekali.\n\n${codes.join("\n")}\n`;
    const url = URL.createObjectURL(new Blob([body], { type: "text/plain" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "klandesa-kode-pemulihan-2fa.txt";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <div role="alert" className="flex gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200">
        <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <p>
          Simpan kode ini SEKARANG. Kode hanya ditampilkan sekali dan tidak bisa dilihat lagi. Tiap kode bisa dipakai satu kali bila Anda kehilangan
          perangkat autentikator.
        </p>
      </div>
      <ul aria-label="Kode pemulihan" className="grid grid-cols-1 gap-2 rounded-md border bg-muted/40 p-3 sm:grid-cols-2">
        {codes.map((c) => (
          <li key={c} className="select-all font-mono text-sm tabular-nums tracking-wider">
            {c}
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" className="min-h-10" onClick={async () => (await copyText(codes.join("\n"))) ? toast.success("Kode pemulihan disalin.") : toast.error("Gagal menyalin. Salin manual dari daftar.")}>
          <Copy className="mr-2 h-4 w-4" aria-hidden="true" />
          Salin semua
        </Button>
        <Button type="button" variant="outline" className="min-h-10" onClick={download}>
          <Download className="mr-2 h-4 w-4" aria-hidden="true" />
          Unduh .txt
        </Button>
      </div>
      <div className="flex items-start gap-2">
        <input id={ackId} type="checkbox" checked={saved} onChange={(e) => setSaved(e.target.checked)} className="mt-1 h-4 w-4" />
        <label htmlFor={ackId} className="text-sm">
          Saya sudah menyimpan kode pemulihan di tempat yang aman.
        </label>
      </div>
      <Button type="button" onClick={onDone} disabled={!saved} className="min-h-10">
        <Check className="mr-2 h-4 w-4" aria-hidden="true" />
        Selesai
      </Button>
    </div>
  );
}
