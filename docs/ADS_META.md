# Iklan Meta (Facebook/Instagram) dan halaman `/desa-digital`

Halaman tujuan iklan untuk kepala desa dan perangkat desa, plus Meta Pixel yang hanya aktif setelah pengunjung setuju.

## Komponen

| Bagian | Berkas |
|---|---|
| Halaman (noindex, tidak di sitemap) | `app/(ads)/desa-digital/page.tsx` + `_components/` |
| Layout tanpa navigasi situs | `app/(ads)/layout.tsx` |
| Isi, harga (dari katalog), tautan WhatsApp | `lib/marketing/ads-landing.ts` |
| Meta Pixel (pemuat + event) | `lib/marketing/meta-pixel.ts` |
| Persetujuan cookie | `lib/marketing/consent.ts`, `components/analytics/MarketingTracking.tsx` |
| Tautan "Pengaturan cookie" | `components/analytics/CookieSettingsButton.tsx` (footer situs + footer halaman iklan) |
| Tes | `tests/ads-landing.test.ts` |

Pixel juga dimuat di semua halaman pemasaran `(landing)` (untuk retargeting pengunjung `/harga`, dll.), **bukan** di dasbor desa (`(app)`) maupun situs desa (`(website)`).

## Variabel lingkungan

| Variabel | Isi |
|---|---|
| `NEXT_PUBLIC_META_PIXEL_ID` | ID Pixel, hanya angka. Ditanam saat build (ubah = build ulang). Kosong = tidak ada skrip Meta dan tidak ada banner cookie. |

## Event yang dikirim ke Meta

Tanpa nama, nomor, email, atau nama desa. Advanced matching dan `autoConfig` dimatikan di kode.

| Event | Kapan | Parameter |
|---|---|---|
| `PageView` | tiap halaman pemasaran dibuka (setelah Setuju) | - |
| `ViewContent` | `/desa-digital` dibuka | `content_name=desa-digital` |
| `Lead` | formulir "Hubungi saya" berhasil terkirim | `content_name=minta-dihubungi`, `eventID` |
| `Contact` | klik tombol WhatsApp | `content_name=whatsapp-hero/formulir/bilah` |
| `CompleteRegistration` | pendaftaran trial berhasil (modal pendaftaran) | `content_name=trial-desa`, `eventID` |

`Lead` dan `CompleteRegistration` membawa `eventID` supaya kelak bisa dideduplikasi dengan Conversions API (server).

## Lead tersimpan di mana

Formulir menulis ke tabel `contact` lewat `POST /api/contacts` dengan `source = "iklan-meta"` dan subjek "Iklan Meta - minta dihubungi". Kolom pesan memuat nama desa dan ringkasan `utm_*` (nilai `fbclid` tidak disimpan, hanya penanda "ada").

## Rollback

Kosongkan `NEXT_PUBLIC_META_PIXEL_ID` dan build ulang: Pixel dan banner hilang. Halaman `/desa-digital` tetap bisa dibuka; hapus folder `app/(ads)` untuk membuangnya.
