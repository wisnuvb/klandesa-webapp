/** Lambang Garuda Pancasila untuk kop keputusan. Berkas ada di public/images (bukan unggahan desa). */
export const GARUDA_STYLES = ["hitam_putih", "warna"] as const;
export type GarudaStyle = (typeof GARUDA_STYLES)[number];

export const GARUDA_IMAGE: Record<GarudaStyle, string> = {
  hitam_putih: "/images/garuda-bw.webp",
  warna: "/images/garuda-c.webp",
};

export const GARUDA_STYLE_LABELS: Record<GarudaStyle, { label: string; hint: string }> = {
  hitam_putih: { label: "Hitam-putih", hint: "Hemat tinta dan jelas saat difotokopi." },
  warna: { label: "Berwarna", hint: "Lambang dengan warna asli, untuk cetak berwarna." },
};
