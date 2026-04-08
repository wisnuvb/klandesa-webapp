export type GalleryCategory =
  | "KEGIATAN"
  | "PEMBANGUNAN"
  | "ACARA"
  | "FASILITAS"
  | "LAINNYA";

export type GalleryImage = {
  id: number;
  title: string;
  description: string;
  category: GalleryCategory;
  imageUrl: string;
  uploadedBy: string;
  uploadDate: string;
  viewsCount: number;
  fileSizeBytes: number;
};

