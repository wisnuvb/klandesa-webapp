"use client";

import { Input } from "@/components/ui/input";

/** Rupiah dengan sen ("1234567.5" → pratinjau Rp1.234.567,5). Menerima koma atau titik sebagai pemisah desimal, maksimal 2 angka pecahan. */
export function MoneyInput({ id, value, onChange, invalid, describedBy }: { id: string; value: string; onChange: (v: string) => void; invalid?: boolean; describedBy?: string }) {
  const num = value && /^\d+(\.\d{1,2})?$/.test(value) ? Number(value) : null;
  return (
    <div className="space-y-1">
      <Input
        id={id}
        className="h-11"
        inputMode="decimal"
        autoComplete="off"
        value={value}
        aria-invalid={invalid ? true : undefined}
        aria-describedby={describedBy ? `${describedBy} ${id}-preview` : `${id}-preview`}
        onChange={(e) => {
          // Hanya angka dan satu pemisah desimal; maksimal 2 angka pecahan; koma dibaca sebagai titik.
          const raw = e.target.value.replace(",", ".").replace(/[^\d.]/g, "");
          const [int = "", ...rest] = raw.split(".");
          const next = rest.length ? `${int}.${rest.join("").slice(0, 2)}` : int;
          onChange(next.replace(/^0+(?=\d)/, ""));
        }}
        placeholder="0"
      />
      <p id={`${id}-preview`} className="text-sm text-muted-foreground" aria-live="polite">
        {num === null ? "Isi jumlah dalam rupiah. Gunakan koma untuk sen." : `Rp${new Intl.NumberFormat("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(num)}`}
      </p>
    </div>
  );
}
