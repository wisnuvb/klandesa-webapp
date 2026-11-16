/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import type { Control, UseFormSetValue } from "react-hook-form";
import { useWatch } from "react-hook-form";
import { Checkbox } from "@/components/ui/checkbox";
import { FormCheckbox, FormInput, FormNumberInput, FormSelect } from "@/components/ui/form-fields";
import { HOUSE_OWNERSHIP_OPTIONS } from "@/utils/constants/user";
import { BPJS_TYPE_LABEL, ELECTRICITY_TYPE_LABEL, AID_OTHER_MAX_LENGTH, ELECTRICITY_POWER_MAX_VA } from "@/lib/residents/welfare-fields";

/**
 * Bagian "Kesejahteraan & Hunian" untuk formulir Tambah dan Ubah warga (BPJS, rumah, listrik, bantuan).
 * Nama isian = nama kolom. Kolom yang saling bergantung dibersihkan otomatis dan ditandai berubah, jadi tersimpan
 * saat formulir dikirim: jenis BPJS bila bukan peserta, daya listrik bila bukan meteran, teks bantuan lain bila dicabut.
 */
export function ResidentWelfareFields({ control, setValue }: { control: Control<any>; setValue: UseFormSetValue<any> }) {
  const isBpjs = useWatch({ control, name: "isBpjsKis" }) === true;
  const bpjsType = useWatch({ control, name: "bpjsType" });
  const electricityType = useWatch({ control, name: "electricityType" });
  const power = useWatch({ control, name: "electricityPowerVa" });
  const aidOther = useWatch({ control, name: "aidOther" });

  // "Lain-lain" mengikuti isi teks bantuan sampai pengguna mengubahnya sendiri.
  const [otherToggle, setOtherToggle] = useState<boolean | null>(null);
  const otherOn = otherToggle ?? Boolean(aidOther);

  useEffect(() => {
    if (!isBpjs && bpjsType) setValue("bpjsType", null, { shouldDirty: true });
  }, [isBpjs, bpjsType, setValue]);

  useEffect(() => {
    // null, bukan undefined: React Hook Form menampilkan kembali nilai awal bila nilainya undefined.
    if (electricityType !== "METERAN" && power) setValue("electricityPowerVa", null, { shouldDirty: true });
  }, [electricityType, power, setValue]);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold border-b pb-2">Kesejahteraan & Hunian</h3>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <fieldset className="space-y-3">
          <legend className="mb-2 text-sm font-medium text-muted-foreground">Jaminan kesehatan</legend>
          <FormCheckbox name="isBpjsKis" control={control} label="Peserta BPJS Kesehatan / KIS" />
          <FormSelect
            name="bpjsType"
            control={control}
            label="Jenis kepesertaan BPJS"
            placeholder="Pilih jenis kepesertaan"
            options={BPJS_TYPE_LABEL}
            disabled={!isBpjs}
            hint={isBpjs ? undefined : "Centang peserta BPJS lebih dulu."}
          />
        </fieldset>

        <fieldset className="space-y-3">
          <legend className="mb-2 text-sm font-medium text-muted-foreground">Hunian</legend>
          <FormSelect
            name="houseOwnership"
            control={control}
            label="Kepemilikan rumah"
            placeholder="Pilih kepemilikan rumah"
            options={HOUSE_OWNERSHIP_OPTIONS}
          />
        </fieldset>

        <fieldset className="space-y-3">
          <legend className="mb-2 text-sm font-medium text-muted-foreground">Listrik</legend>
          <FormSelect
            name="electricityType"
            control={control}
            label="Sumber listrik"
            placeholder="Pilih jenis listrik"
            options={ELECTRICITY_TYPE_LABEL}
          />
          <FormNumberInput
            name="electricityPowerVa"
            control={control}
            label="Daya listrik (VA)"
            placeholder="mis. 900"
            min={1}
            max={ELECTRICITY_POWER_MAX_VA}
            disabled={electricityType !== "METERAN"}
            hint={electricityType === "METERAN" ? "Daya terpasang, mis. 450, 900, 1300, 2200." : "Diisi bila listrik Meteran PLN."}
          />
        </fieldset>

        <fieldset className="space-y-3">
          <legend className="mb-2 text-sm font-medium text-muted-foreground">Bantuan yang diterima</legend>
          <FormCheckbox name="aidPkh" control={control} label="PKH (Program Keluarga Harapan)" />
          <FormCheckbox name="aidBpnt" control={control} label="BPNT / Sembako" />
          <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md border px-3 py-2 text-sm">
            <Checkbox
              checked={otherOn}
              onCheckedChange={(c) => {
                const on = c === true;
                setOtherToggle(on);
                // Dicabut = teksnya dikosongkan dan ditandai berubah, supaya benar-benar terhapus saat disimpan.
                if (!on) setValue("aidOther", "", { shouldDirty: true });
              }}
            />
            <span>Lain-lain</span>
          </label>
          {otherOn ? (
            <FormInput name="aidOther" control={control} label="Sebutkan bantuan lain" placeholder="mis. BLT Dana Desa" maxLength={AID_OTHER_MAX_LENGTH} />
          ) : null}
        </fieldset>
      </div>
    </div>
  );
}
