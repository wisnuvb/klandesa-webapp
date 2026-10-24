const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

/** "20 Oktober 2026" (zona waktu perangkat). Tidak bergantung pada Intl agar konsisten di semua HP. */
export function formatDateId(iso: string | Date): string {
  const d = new Date(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** "baru saja" · "5 menit lalu" · "2 jam lalu" · "kemarin" · "3 hari lalu" · tanggal bila > 7 hari. */
export function timeAgoId(iso: string | Date, now = Date.now()): string {
  const diff = Math.max(0, now - new Date(iso).getTime());
  const min = Math.floor(diff / 60_000);
  if (min < 1) return 'baru saja';
  if (min < 60) return `${min} menit lalu`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} jam lalu`;
  const day = Math.floor(hr / 24);
  if (day === 1) return 'kemarin';
  if (day <= 7) return `${day} hari lalu`;
  return formatDateId(iso);
}

/** Sapaan menurut jam. */
export function greetingId(hour: number): string {
  if (hour < 11) return 'Selamat pagi';
  if (hour < 15) return 'Selamat siang';
  if (hour < 18) return 'Selamat sore';
  return 'Selamat malam';
}

/** Rupiah ringkas untuk awam: "Rp 850 ribu", "Rp 1,2 juta", "Rp 3,4 miliar". Tanpa Intl agar konsisten di semua HP. */
export function formatRupiahShort(amount: number): string {
  const n = Math.max(0, Math.round(Number.isFinite(amount) ? amount : 0));
  const fmt = (v: number, unit: string) => `Rp ${(Math.round(v * 10) / 10).toString().replace('.', ',')} ${unit}`;
  if (n >= 1_000_000_000_000) return fmt(n / 1_000_000_000_000, 'triliun');
  if (n >= 1_000_000_000) return fmt(n / 1_000_000_000, 'miliar');
  if (n >= 1_000_000) return fmt(n / 1_000_000, 'juta');
  if (n >= 1_000) return fmt(n / 1_000, 'ribu');
  return `Rp ${n}`;
}

/** Nomor untuk tautan telepon: hanya digit dan "+" di depan. Kosong bila tidak layak dipanggil. */
export function dialNumber(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const t = raw.trim();
  const digits = t.replace(/\D/g, '');
  if (digits.length < 3 || digits.length > 16) return null;
  return `${t.startsWith('+') ? '+' : ''}${digits}`;
}
