export const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.klandesa.klan_desa';

/** Teks untuk dibagikan ke WhatsApp/lainnya: judul tebal (format WhatsApp), ringkasan, sumber desa, dan tautan unduh app. */
export function buildAnnouncementShare(a: { title: string; content: string }, villageName: string): string {
  const body = a.content.replace(/\s+/g, ' ').trim();
  const clipped = body.length > 400 ? `${body.slice(0, 400).trimEnd()}…` : body;
  return [`*${a.title.trim()}*`, clipped, '', `Kabar resmi dari Desa ${villageName}. Baca selengkapnya di aplikasi Klandesa:`, PLAY_STORE_URL].filter((x, i) => i !== 1 || x).join('\n');
}
