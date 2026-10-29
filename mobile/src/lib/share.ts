export const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.klandesa.klan_desa';

/** Teks untuk dibagikan ke WhatsApp/lainnya: judul tebal (format WhatsApp), ringkasan, sumber desa, dan tautan unduh app. */
export function buildAnnouncementShare(a: { title: string; content: string }, villageName: string): string {
  const body = a.content.replace(/\s+/g, ' ').trim();
  const clipped = body.length > 400 ? `${body.slice(0, 400).trimEnd()}…` : body;
  return [`*${a.title.trim()}*`, clipped, '', `Kabar resmi dari Desa ${villageName}. Baca selengkapnya di aplikasi Klandesa:`, PLAY_STORE_URL].filter((x, i) => i !== 1 || x).join('\n');
}

export const SITE_URL = 'https://klandesa.com';

/** Teks ajakan untuk membagikan rapor layanan desa (halaman publik, hanya bila desa membukanya). */
export function buildScorecardShare(villageName: string, villageCode: string): string {
  return `Rapor layanan Desa ${villageName}: seberapa cepat desa melayani surat dan pengaduan warga.\n${SITE_URL}/rapor-desa/${encodeURIComponent(villageCode)}`;
}
