/**
 * Katalog entitas yang boleh diberi lampiran. Murni (aman dipakai di klien dan server).
 * Menambah modul = satu entri di sini + satu pencarian di service.ts + memasang komponen Lampiran di formnya.
 */
import type { PermissionAction } from "../permissions/actions";
import type { PermissionResource } from "../permissions/resources";

export interface AttachmentEntity {
  label: string;
  /** Izin matriks untuk membaca/membuka lampiran dan mengubahnya (melampirkan/melepas = mengubah rekaman). */
  resource: PermissionResource;
  /** Subfolder di Arsip Digital (kategori "Lampiran"), supaya berkas mudah dicari dari menu Arsip. */
  archiveSub: string;
}

export const ATTACHMENT_ENTITIES = {
  MAIL_REGISTER: { label: "Surat masuk/keluar", resource: "register_surat", archiveSub: "Register Surat" },
  LEGAL_DOCUMENT: { label: "Produk hukum", resource: "produk_hukum", archiveSub: "Produk Hukum" },
  OFFICIAL: { label: "Perangkat desa", resource: "officials", archiveSub: "Perangkat Desa" },
  INSTITUTION: { label: "Lembaga desa", resource: "lembaga_desa", archiveSub: "Lembaga Desa" },
  MEETING: { label: "Musyawarah/rapat", resource: "perencanaan", archiveSub: "Musyawarah" },
  MUTATION: { label: "Mutasi penduduk", resource: "residents", archiveSub: "Mutasi Penduduk" },
} as const satisfies Record<string, AttachmentEntity>;

export type AttachmentEntityType = keyof typeof ATTACHMENT_ENTITIES;
export const ATTACHMENT_ENTITY_TYPES = Object.keys(ATTACHMENT_ENTITIES) as AttachmentEntityType[];

export const isAttachmentEntityType = (v: unknown): v is AttachmentEntityType =>
  typeof v === "string" && Object.prototype.hasOwnProperty.call(ATTACHMENT_ENTITIES, v);

/** Kategori Arsip Digital untuk semua lampiran. */
export const ATTACHMENT_ARCHIVE_CATEGORY = "Lampiran";

export const ATTACHMENT_LIMITS = {
  /** Berkas per rekaman. */
  perRecord: 20,
  label: 150,
} as const;

/** Aksi izin: membaca daftar/berkas = read; melampirkan dan melepas = update pada sumber daya entitas. */
export const ATTACHMENT_READ_ACTION: PermissionAction = "read";
export const ATTACHMENT_WRITE_ACTION: PermissionAction = "update";

/** Jenis berkas yang ditawarkan pemilih berkas (pindai/foto surat, dokumen kantor). Validasi sebenarnya di Arsip Digital. */
export const ATTACHMENT_ACCEPT = ".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx,.odt,.ods";
