/** Katalog surat bawaan (global) dalam format dokumen v2. Urutan = urutan tampil di galeri. */
import { KETERANGAN } from "./keterangan";
import { PENGANTAR } from "./pengantar";
import { KEPENDUDUKAN } from "./kependudukan";
import { ADMINISTRASI } from "./administrasi";
import type { CatalogEntry } from "./helpers";

export type { CatalogEntry, CatalogCategory } from "./helpers";

export function getCatalogV2(): CatalogEntry[] {
  return [...KETERANGAN, ...PENGANTAR, ...KEPENDUDUKAN, ...ADMINISTRASI];
}
