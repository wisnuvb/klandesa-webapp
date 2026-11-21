import { randomInt } from "node:crypto";
import { ASPIRASI_BASE_PATH } from "./catalog";

/** Huruf kecil + angka tanpa karakter yang mudah tertukar (i, l, o, 0, 1). */
const CODE_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";
export const ASPIRATION_CODE_LENGTH = 10;
const CODE_AT_END = new RegExp(`(?:^|-)([a-hj-km-np-z2-9]{${ASPIRATION_CODE_LENGTH}})$`);

export function slugify(input: string, max = 80): string {
  const s = String(input ?? "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " dan ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return s.slice(0, max).replace(/-+$/g, "");
}

/** Alamat halaman desa: nama + kecamatan + kabupaten ("Kabupaten " dibuang, "Kota " dipertahankan). */
export function areaSlug(p: { name: string; district: string; regency: string }): string {
  const regency = p.regency.replace(/^kabupaten\s+/i, "");
  return slugify(`${p.name} ${p.district} ${regency}`, 180) || "desa";
}

export function aspirationSlug(title: string): string {
  return slugify(title, 80) || "aspirasi";
}

export function newAspirationCode(): string {
  let out = "";
  for (let i = 0; i < ASPIRATION_CODE_LENGTH; i++) out += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  return out;
}

export const aspirationPath = (a: { slug: string; code: string }) => `${ASPIRASI_BASE_PATH}/laporan/${a.slug}-${a.code}`;
export const areaPath = (slug: string) => `${ASPIRASI_BASE_PATH}/desa/${slug}`;

/** Kode laporan dari segmen alamat ("sampah-menumpuk-abcd234567" atau hanya kodenya); null bila bentuknya salah. */
export function codeFromSegment(segment: string): string | null {
  const m = CODE_AT_END.exec(String(segment ?? "").toLowerCase());
  return m ? m[1]! : null;
}

export const isAspirationCode = (v: unknown): v is string => typeof v === "string" && new RegExp(`^[a-hj-km-np-z2-9]{${ASPIRATION_CODE_LENGTH}}$`).test(v);
