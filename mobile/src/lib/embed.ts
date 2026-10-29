import type { Ionicons } from '@expo/vector-icons';

export type EmbedProvider = 'youtube' | 'tiktok' | 'facebook' | 'x';

export const EMBED: Record<EmbedProvider, { label: string; icon: keyof typeof Ionicons.glyphMap; action: string; placeholder: string }> = {
  youtube: { label: 'YouTube', icon: 'logo-youtube', action: 'Tonton di YouTube', placeholder: 'https://youtu.be/…' },
  tiktok: { label: 'TikTok', icon: 'logo-tiktok', action: 'Tonton di TikTok', placeholder: 'https://www.tiktok.com/@akun/video/…' },
  facebook: { label: 'Facebook', icon: 'logo-facebook', action: 'Buka di Facebook', placeholder: 'https://www.facebook.com/reel/…' },
  x: { label: 'X', icon: 'logo-x', action: 'Lihat di X', placeholder: 'https://x.com/akun/status/…' },
};

export const EMBED_ORDER: EmbedProvider[] = ['youtube', 'tiktok', 'facebook', 'x'];

const HOSTS: [EmbedProvider, RegExp][] = [
  ['youtube', /(^|\.)(youtube\.com|youtu\.be)$/],
  ['tiktok', /(^|\.)tiktok\.com$/],
  ['facebook', /(^|\.)(facebook\.com|fb\.watch)$/],
  ['x', /(^|\.)(x\.com|twitter\.com)$/],
];

/** Tebakan penyedia dari host, hanya untuk umpan balik cepat saat mengetik. Server yang menentukan sah atau tidaknya tautan. */
export function detectProvider(raw: string): EmbedProvider | null {
  try {
    const host = new URL(raw.trim()).hostname.toLowerCase();
    return HOSTS.find(([, re]) => re.test(host))?.[0] ?? null;
  } catch {
    return null;
  }
}
