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

/** "Rp25.000" (titik ribuan, tanpa Intl agar sama di semua HP). */
export function formatRupiahFull(amount: number): string {
  const n = Math.max(0, Math.round(Number.isFinite(amount) ? amount : 0));
  return `Rp${n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
}

/** "2026-10" → "Oktober 2026"; masukan rusak dikembalikan apa adanya. */
export function periodLabelId(period: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(period);
  if (!m || Number(m[2]) < 1 || Number(m[2]) > 12) return period;
  return `${MONTHS[Number(m[2]) - 1]} ${m[1]}`;
}

/** Geser periode YYYY-MM sebanyak n bulan. */
export function shiftPeriod(period: string, n: number): string {
  const m = /^(\d{4})-(\d{2})$/.exec(period);
  if (!m) return period;
  const idx = Number(m[1]) * 12 + Number(m[2]) - 1 + n;
  return `${Math.floor(idx / 12)}-${String((idx % 12) + 1).padStart(2, '0')}`;
}

/** Ambil angka dari ketikan ("25.000", "Rp 25000") → bilangan bulat, atau null bila kosong. */
export function parseRupiahInput(text: string): number | null {
  const digits = text.replace(/\D/g, '');
  if (!digits || digits.length > 10) return null;
  return Number(digits);
}
