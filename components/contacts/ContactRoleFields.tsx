"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, Building2, MessageSquareText, Users } from "lucide-react";
import {
  ASPIRASI_FORM_PATH,
  CONTACT_ROLE_LABELS,
  VILLAGE_POSITION_SUGGESTIONS,
  type ContactRole,
} from "@/lib/contacts/lead";

/** Pilihan peran yang ditampilkan di formulir (urutan = prioritas penjualan). */
const ROLE_CHOICES: Array<{ value: ContactRole; hint: string; icon: typeof Users }> = [
  { value: "perangkat_desa", hint: "Kepala desa, sekretaris, kaur, kasi, operator, BPD", icon: Building2 },
  { value: "warga", hint: "Ingin menyampaikan aspirasi atau melaporkan kondisi desa", icon: Users },
  { value: "lainnya", hint: "Pemda, mitra, media, atau pihak lain", icon: MessageSquareText },
];

export type ContactRoleValue = ContactRole | "";

/** Pesan galat peran/jabatan untuk formulir; null bila sudah benar. */
export function validateRoleFields(role: ContactRoleValue, position: string): { role?: string; position?: string } {
  const errors: { role?: string; position?: string } = {};
  if (!role) errors.role = "Pilih peran Anda terlebih dahulu.";
  else if (role === "perangkat_desa" && position.trim().length < 2) {
    errors.position = "Isi jabatan Anda di desa, contoh: Kepala Desa atau Operator Desa.";
  }
  return errors;
}

type Props = {
  /** Awalan id agar beberapa formulir di satu halaman tidak bentrok. */
  idPrefix: string;
  role: ContactRoleValue;
  position: string;
  onRoleChange: (role: ContactRole) => void;
  onPositionChange: (position: string) => void;
  roleError?: string;
  positionError?: string;
  /** Kelas input; formulir pemanggil memberi gaya yang sama dengan kolom lain. */
  inputClassName: string;
  labelClassName?: string;
};

export function ContactRoleFields({
  idPrefix,
  role,
  position,
  onRoleChange,
  onPositionChange,
  roleError,
  positionError,
  inputClassName,
  labelClassName = "mb-2 block text-base font-medium text-gray-900",
}: Props) {
  const legendId = `${idPrefix}-role-legend`;
  const roleErrId = `${idPrefix}-role-err`;
  const positionId = `${idPrefix}-position`;
  const listId = `${idPrefix}-position-list`;

  return (
    <div className="@container space-y-4">
      <fieldset aria-describedby={roleError ? roleErrId : undefined}>
        <legend id={legendId} className={labelClassName}>
          Anda mengisi sebagai
        </legend>
        <div className="grid grid-cols-1 gap-2 @xl:grid-cols-3" role="radiogroup" aria-labelledby={legendId}>
          {ROLE_CHOICES.map(({ value, hint, icon: Icon }) => {
            const selected = role === value;
            const id = `${idPrefix}-role-${value}`;
            return (
              <label
                key={value}
                htmlFor={id}
                className={`flex min-h-14 cursor-pointer flex-col gap-1 rounded-xl border-2 p-3 text-left transition focus-within:ring-4 focus-within:ring-[#0d9488]/30 ${
                  selected ? "border-[#0f766e] bg-teal-50" : "border-gray-300 bg-white hover:border-gray-400"
                }`}
              >
                <span className="flex items-center gap-2 text-base font-semibold text-gray-900">
                  <input
                    id={id}
                    type="radio"
                    name={`${idPrefix}-role`}
                    value={value}
                    checked={selected}
                    onChange={() => onRoleChange(value)}
                    className="h-4 w-4 accent-[#0f766e] shrink-0"
                  />
                  <Icon className="h-4 w-4 text-[#0f766e] shrink-0" aria-hidden="true" />
                  {CONTACT_ROLE_LABELS[value]}
                </span>
                <span className="text-sm leading-snug text-gray-700">{hint}</span>
              </label>
            );
          })}
        </div>
        {roleError ? (
          <p id={roleErrId} className="mt-1 text-sm text-red-700">
            {roleError}
          </p>
        ) : null}
      </fieldset>

      {role === "perangkat_desa" ? (
        <div>
          <label htmlFor={positionId} className={labelClassName}>
            Jabatan di desa
          </label>
          <input
            id={positionId}
            type="text"
            list={listId}
            autoComplete="organization-title"
            maxLength={120}
            required
            aria-invalid={positionError ? true : undefined}
            aria-describedby={positionError ? `${positionId}-err` : undefined}
            placeholder="Contoh: Sekretaris Desa"
            className={inputClassName}
            value={position}
            onChange={(e) => onPositionChange(e.target.value)}
          />
          <datalist id={listId}>
            {VILLAGE_POSITION_SUGGESTIONS.map((p) => (
              <option key={p} value={p} />
            ))}
          </datalist>
          {positionError ? (
            <p id={`${positionId}-err`} className="mt-1 text-sm text-red-700">
              {positionError}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/**
 * Pengganti isi formulir bila pengirim memilih "Warga": Klandesa dijual ke pemerintah desa, jadi warga langsung
 * diarahkan ke formulir aspirasi dan tidak ikut mengisi form penjualan.
 */
export function WargaRedirectNotice({ onBack }: { onBack: () => void }) {
  return (
    <div role="status" className="space-y-4 rounded-2xl border border-[#0f766e]/30 bg-teal-50 p-5 text-gray-900">
      <h3 className="text-lg font-semibold">Untuk warga, ada jalur yang lebih tepat</h3>
      <p className="text-base leading-relaxed text-gray-800">
        Klandesa adalah aplikasi untuk pemerintah desa, jadi formulir ini khusus perangkat desa. Jika Anda ingin
        menyampaikan aspirasi atau melaporkan kondisi desa (misalnya sampah, jalan rusak, air bersih), gunakan formulir
        aspirasi warga. Laporan Anda ditinjau lebih dulu, identitas Anda tidak ditampilkan, dan pemerintah desa dapat
        menanggapinya secara terbuka.
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Link
          href={ASPIRASI_FORM_PATH}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#0f766e] px-5 text-base font-semibold text-white transition hover:bg-[#115e59] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#0d9488]/40"
        >
          Sampaikan aspirasi warga
          <ArrowRight className="h-5 w-5" aria-hidden="true" />
        </Link>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex min-h-12 cursor-pointer items-center justify-center rounded-xl border-2 border-gray-400 bg-white px-5 text-base font-medium text-gray-900 transition hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#0d9488]/30"
        >
          Saya perangkat desa
        </button>
      </div>
    </div>
  );
}
