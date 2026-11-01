"use client";

import { SearchSelect } from "@/components/ui/search-select";
import { ACCOUNTS, ACCOUNT_CLASS_LABEL, CASH_ACCOUNTS, EQUITY_VILLAGE_CAPITAL, FLOW_ONLY_ACCOUNTS, type AccountClass } from "@/lib/bumdes/catalog";
import { SELECT_CLASS } from "./shared";

const ORDER: AccountClass[] = ["ASET", "KEWAJIBAN", "EKUITAS", "PENDAPATAN", "HPP", "BEBAN", "PENDAPATAN_LAIN", "BEBAN_LAIN", "BEBAN_PAJAK"];

/** Akun yang ditawarkan pada jalur kas/jurnal manual: tanpa akun yang hanya boleh digerakkan arus APB Desa (kecuali modal pada jurnal pembukaan). */
export const offeredAccounts = (includeCapital?: boolean) => ACCOUNTS.filter((a) => !FLOW_ONLY_ACCOUNTS.includes(a.code) || (includeCapital === true && a.code === EQUITY_VILLAGE_CAPITAL));

/** Pilihan akun dari bagan akun Kepmendes 136/2022, dikelompokkan per golongan dan dapat dicari (kode atau nama). */
export function AccountSelect({ id, value, onChange, invalid, only, placeholder, includeCapital }: { id: string; value: string; onChange: (v: string) => void; invalid?: boolean; only?: "cash"; placeholder?: string; /** hanya jurnal pembukaan: tawarkan juga Penyertaan Modal Desa (3.1.01.01) */ includeCapital?: boolean }) {
  // Akun Penyertaan Modal/Bagi Hasil hanya digerakkan arus APB Desa; jalur kas/jurnal manual pasti menolaknya, jadi tidak ditawarkan.
  const offered = offeredAccounts(includeCapital);
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
              {offered.filter((a) => a.cls === cls).map((a) => (
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
