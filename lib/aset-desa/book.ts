import { toCsv } from "@/lib/custom-data/schema";
import { CATEGORIES, CONDITION_LABEL, isCategory, type Condition } from "./catalog";
import type { ItemView } from "./service";

export const BOOK_HEADER = [
  "No",
  "Jenis Barang",
  "Kode Barang",
  "Identitas Barang (merk/tipe/ukuran)",
  "Golongan",
  "Jumlah",
  "Asal: APBDesa",
  "Asal: Perolehan Lain yang Sah",
  "Asal: Aset/Kekayaan Asli Desa",
  "Tanggal Perolehan/Pembelian",
  "Nilai Perolehan per Satuan (Rp)",
  "Kondisi",
  "Lokasi",
  "Keterangan",
] as const;

/** "5 Mei 2021" bila tanggal diketahui, selain itu hanya tahunnya. */
export function acquiredLabel(i: Pick<ItemView, "acquiredAt" | "acquiredYear">): string {
  if (!i.acquiredAt) return String(i.acquiredYear);
  const [y, m, d] = i.acquiredAt.split("-").map(Number);
  const bulan = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  return `${d} ${bulan[m - 1]} ${y}`;
}

export const categoryLabel = (c: string): string => (isCategory(c) ? CATEGORIES[c].label : c);
export const conditionLabel = (c: string): string => CONDITION_LABEL[c as Condition] ?? c;

export function bookRow(i: ItemView, no: number): (string | number)[] {
  return [
    no,
    i.name,
    i.itemCode ?? "",
    i.identity ?? "",
    categoryLabel(i.category),
    i.quantity,
    i.origin === "APBDES" ? "v" : "",
    i.origin === "PEROLEHAN_LAIN" ? "v" : "",
    i.origin === "ASLI_DESA" ? "v" : "",
    acquiredLabel(i),
    i.acquisitionValue ?? "",
    conditionLabel(i.condition),
    i.location ?? "",
    i.notes ?? "",
  ];
}

export function bookCsv(items: ItemView[]): string {
  return toCsv(BOOK_HEADER, items.map((it, idx) => bookRow(it, idx + 1)));
}
