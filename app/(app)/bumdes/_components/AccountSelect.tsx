"use client";

import { SearchSelect } from "@/components/ui/search-select";
import { ACCOUNTS, ACCOUNT_CLASS_LABEL, CASH_ACCOUNTS, type AccountClass } from "@/lib/bumdes/catalog";
import { SELECT_CLASS } from "./shared";

const ORDER: AccountClass[] = ["ASET", "KEWAJIBAN", "EKUITAS", "PENDAPATAN", "HPP", "BEBAN", "PENDAPATAN_LAIN", "BEBAN_LAIN", "BEBAN_PAJAK"];

/** Pilihan akun dari bagan akun Kepmendes 136/2022, dikelompokkan per golongan dan dapat dicari (kode atau nama). */
export function AccountSelect({ id, value, onChange, invalid, only, placeholder }: { id: string; value: string; onChange: (v: string) => void; invalid?: boolean; only?: "cash"; placeholder?: string }) {
  return (
    <SearchSelect id={id} className={SELECT_CLASS} value={value} onChange={(e) => onChange(e.target.value)} aria-invalid={invalid} placeholder={placeholder ?? "Pilih akun"} searchPlaceholder="Cari kode atau nama akun">
      {only === "cash" ? (
        CASH_ACCOUNTS.map((a) => (
          <option key={a.code} value={a.code}>
            {a.code} {a.name}
          </option>
        ))
      ) : (
        <>
          <option value="">{placeholder ?? "Pilih akun"}</option>
          {ORDER.map((cls) => (
            <optgroup key={cls} label={ACCOUNT_CLASS_LABEL[cls]}>
              {ACCOUNTS.filter((a) => a.cls === cls).map((a) => (
                <option key={a.code} value={a.code}>
                  {a.code} {a.name}
                </option>
              ))}
            </optgroup>
          ))}
        </>
      )}
    </SearchSelect>
  );
}
