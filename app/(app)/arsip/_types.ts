export type FileType = "IMAGE" | "DOCUMENT" | "PDF" | "EXCEL" | "ARCHIVE" | "OTHER";

export type ViewMode = "grid" | "list";

export type StoragePlan =
  | "FREE"
  | "STARTER"
  | "PROFESSIONAL"
  | "BUSINESS"
  | "ENTERPRISE"
  | "PROMAX";

export type PaymentMethod = "QRIS" | "VA" | "EWALLET";

export type FileItemKind = "file" | "folderDb" | "folderVirtual";

export interface ArchiveFolderEntry {
  id: number;
  parentId: number | null;
  name: string;
  path: string;
  createdAt: string;
  updatedAt: string;
}

export interface FileItem {
  id: number;
  /** Kunci stabil untuk React & seleksi (unik). */
  selectionKey: string;
  selectable: boolean;
  kind: FileItemKind;
  name: string;
  type: "file" | "folder";
  file_type?: FileType;
  extension?: string;
  size: number;
  created_at: string;
  modified_at: string;
  parent_folder: string;
  thumbnail_url?: string;
  uploaded_by: string;
  archiveId?: number;
  folderDbId?: number;
  /** Path folder DB, mis. `/Surat/2024` — untuk navigasi */
  folderPath?: string;
  /** Untuk ACL UI — pengunggah di DB */
  uploadedByUserId?: number;
  isPublic?: boolean;
  /** URL CDN bila publik; untuk salin tautan */
  filePath?: string;
}

export interface ArchiveEntry {
  id: number;
  folderId: number | null;
  fileName: string;
  filePath: string;
  fileType: string;
  fileSize: number;
  category: string;
  subCategory: string | null;
  title: string;
  /** false = objek privat di storage; pratinjau lewat /api/digital-archives/[id]/file */
  isPublic: boolean;
  uploadedBy: number;
  uploadedByName: string;
  uploadedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface PlanDetail {
  id: StoragePlan;
  name: string;
  icon: React.ElementType;
  storage: number;
  storageLabel: string;
  price: number;
  priceLabel: string;
  color: string;
  bgColor: string;
  borderColor: string;
  features: string[];
  popular?: boolean;
}

export interface VillageStorageInfo {
  subscriptionPlan: string;
  storageLimitGb: number;
}
