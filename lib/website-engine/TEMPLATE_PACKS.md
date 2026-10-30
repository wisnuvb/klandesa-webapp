# Template pack (skin) — kontributor & marketplace

Konten situs publik (`WebsiteTemplate.structure` + kustomisasi desa) dipisahkan dari **presentasi** lewat **template pack**: kode terdaftar di repo yang dipilih berdasarkan `templateKey` pada manifest template.

## Kontrak

- **Registry**: [`template-packs/registry.ts`](template-packs/registry.ts) — `getTemplatePack(templateKey)` mengembalikan pack atau fallback **default**.
- **Antarmuka**: [`template-packs/types.ts`](template-packs/types.ts) — `defaultThemeTokens`, `heroVariants`, `Shell`, `renderSection`.
- **Token efektif**: `mergeThemeLayers(pack.defaultThemeTokens, manifest.themeDefaults, customization.theme)` di [`normalize.ts`](normalize.ts).
- **Varian section**: setiap pack mendeklarasikan subset `heroVariants` (`center`, `split`, …). CMS dan API [`config/route.ts`](../../app/api/website/engine/config/route.ts) menyaring field **select** varian dan men-sanitize PATCH agar tidak mengirim varian yang tidak didukung.

## Struktur multi-halaman (v2) & SEO

- **Model ter-resolve**: `resolveEffectiveStructure` di [`normalize.ts`](normalize.ts) mengembalikan **`ResolvedEngineStructure`**: `nav[]` + `pages[]` (tiap halaman: `slug`, `title`, `sections[]`, `seo?`, `layoutPreset?`). Template DB v1 (`pages.home`) diproyeksikan ke beranda `slug: ""`.
- **Routing**: beranda [`app/(website)/site/page.tsx`](../../app/(website)/site/page.tsx); halaman slug [`app/(website)/[slug]/page.tsx`](../../app/(website)/[slug]/page.tsx); detail berita [`app/(website)/site/berita/[id]/page.tsx`](../../app/(website)/site/berita/[id]/page.tsx). Akses path `/site` di luar beranda diarahkan ke `/`.
- **Sitemap / robots**: [`app/sitemap.ts`](../../app/sitemap.ts), [`app/robots.ts`](../../app/robots.ts).
- **Metadata & SEO situs**: layout + per halaman; `customization.siteSeo` (PATCH `site_seo`) dan `page.seo` per entri di `pages`.
- **Blok**: `rich_text`, `cta` di registry; tautan berita ke `/site/berita/:id`.
- **Rate limit**: PATCH [`config/route.ts`](../../app/api/website/engine/config/route.ts) memakai [`engine-rate-limit.ts`](engine-rate-limit.ts).

## Blok berdaftar (`items`)

Blok `features`, `stats`, `gallery`, `faq`, dan `testimonials` menyimpan isinya sebagai array `items`
(jumlah dibatasi `ITEM_LIMITS` di [`section-items.ts`](section-items.ts)), bukan slot tetap `item1_*`/`q1`/`image1_url`.

- **Pack wajib membaca lewat helper** `featureItems`, `statItems`, `galleryItems`, `faqItems`, `testimonialItems`
  dari `section-items.ts`; jangan mengakses `items` atau slot lama langsung. Helper sudah membersihkan dan memotong nilai.
- **Kompatibilitas data lama:** slot tetap masih dibaca. `resolveEffectiveStructure` menaikkan semua blok ke bentuk
  `items` di satu titik, dan data lama otomatis tersimpan dalam bentuk baru saat desa menyimpan dari CMS.
  Tidak ada migrasi database.
- **Jangan menampilkan placeholder untuk item kosong**; item yang kosong sudah dibuang oleh helper.
- **Gambar:** render URL gambar lewat `renderableImageUrl` (hanya https absolut atau path relatif). `next/image`
  melempar error untuk alamat lain dan akan menggagalkan seluruh halaman publik.
- **Teks di dalam item** mendukung variabel `{{village.name}}` dsb. (diinterpolasi sebelum sampai ke pack).

## Varian blok

Lima blok berdaftar punya beberapa tata letak yang dipilih desa dari CMS (`variant`). Daftar resmi, label,
dan sketsa pratinjau ada di satu tempat: [`block-variants.ts`](block-variants.ts).

| Blok | Varian (yang pertama = bawaan) |
|------|--------------------------------|
| `features` | `cards`, `list`, `minimal` |
| `stats` | `cards`, `band`, `inline` |
| `gallery` | `grid`, `mosaic`, `strip` |
| `faq` | `accordion`, `open` |
| `testimonials` | `cards`, `featured` |

- **Semua pack mendukung semua varian** karena markup-nya ada di `section-primitives.tsx`. Pack hanya perlu
  meneruskan `variant={s.variant}` ke blok.
- **Membatasi varian:** isi `blockVariants` pada pack, mis. `{ stats: ["cards", "inline"] }`. Varian di luar daftar
  disaring dari pilihan CMS, dibuang saat disimpan, dan diabaikan saat render (juga untuk section template DB v1).
- **Nilai asing selalu jatuh ke varian bawaan**; tidak pernah menjadi error.
- **Hook gaya:** tiap blok membawa `data-variant="..."` pada elemen dalamnya. CSS scoped `tp-{templateKey}` boleh
  menargetkannya, tetapi markup/class bawaan sebaiknya tidak dibongkar.
- **Menambah varian baru** = tambah nilai di union `types.ts`, entri di `BLOCK_VARIANTS` (termasuk sketsa `wire`),
  dan cabang di blok terkait. Tes di `tests/website-block-variants.test.tsx` otomatis memeriksa semua varian di semua pack.

## Theme Pack Manifest v1 (paket tema tanpa kode)

Jalur untuk developer luar: **JSON deklaratif, tanpa kode**. Paket memakai markup salah satu pack inti
(`basePack`: `modern-village`, `classic-heritage`, atau `default`) dan mengatur token tema, varian blok yang
diizinkan, susunan beranda, dan preset. Contoh lengkap yang selalu divalidasi tes:
[`examples/desa-hijau.theme-pack.json`](examples/desa-hijau.theme-pack.json). Validator dan aturannya:
[`theme-pack-manifest.ts`](theme-pack-manifest.ts).

Aturan utama (semua kesalahan dilaporkan sekaligus, lengkap dengan `path`):

- **Kunci asing ditolak** di setiap level; tidak ada CSS bebas, skrip, atau field tersembunyi.
- **Warna hanya heksadesimal.** Font hanya dari daftar `google-fonts.ts`. Radius maksimal 3rem.
- **Kontras dijaga:** `primary` terhadap putih (teks tombol) ≥ 4,5:1; `accent` dan `mutedForeground` terhadap `surface` ≥ 4,5:1.
- **Blok** melewati sanitizer yang sama dengan CMS (mis. `button_href` berbahaya dinetralkan). Hanya blok bawaan, 1–30 per halaman.
- **`blockVariants`** membatasi varian yang boleh dipilih desa. Bila varian bawaan sebuah blok tidak diizinkan,
  blok jatuh ke varian pertama yang diizinkan.
- **`key`** unik, tidak boleh sama dengan pack terdaftar (termasuk `default`). Satu kunci hanya untuk satu penulis;
  versi baru harus lebih tinggi (`x.y.z`).
- **Harga ditetapkan platform** saat persetujuan (`suggestedPriceIdr` hanya saran).

Alur: `POST /api/admin/theme-packs` (validasi + simpan sebagai `submitted`) → tinjau lewat
`GET /api/admin/theme-packs/:id` (membawa hasil validasi ulang) → `POST .../review` dengan `approve` / `reject` /
`withdraw`. Persetujuan membuat atau memperbarui baris `WebsiteTemplate`, jadi checkout dan render tidak berubah.
Menarik paket hanya menutup katalog; desa yang sudah memakainya tidak terganggu.

## Menambah pack baru

1. Buat file komponen pack (mis. `template-packs/my-pack.tsx`) yang memenuhi `TemplatePack`.
2. Export `myPack` dan daftarkan di `TEMPLATE_PACK_BY_KEY` di `registry.ts` dengan `templateKey` yang sama dengan seed/admin `WebsiteTemplate` / manifest.
3. (Opsional) Tambahkan CSS scoped lewat kelas root `tp-{templateKey}` di [`app/(website)/layout.tsx`](../../app/(website)/layout.tsx).

Tanpa entri registry, desa dengan `templateKey` tak dikenal memakai **default pack** (tampilan netral).

## Kontributor pihak ketiga (fase singkat)

- **Pull request ke monorepo** atau **paket privat npm** yang Anda build ke bundle rilis — tidak ada eksekusi kode acak dari database.
- Wajib menyertakan manifest: daftar **section kind** yang didukung, **varian** yang valid, dan **capabilities** yang diasumsikan.

## Marketplace / extensibility jangka panjang

| Pendekatan | Kelebihan | Catatan |
|------------|-----------|---------|
| **npm scoped + allowlist** (disarankan dulu) | Versi semver, audit CI, satu proses deploy | Mitra mengirim PR atau paket; hash commit / semver diverifikasi sebelum aktivasi. |
| **iframe / subdomain** | Isolasi kuat untuk konten tidak terpercaya | Berat operasional; untuk kasus edge. |
| **HTML aman di CMS** | Fleksibel | Tidak selaras model blok bertipe; risiko sanitizer; hindari sebagai inti produk. |

Aktivasi template berbayar di DB (metadata harga, `templateKey`, versi pack minimum) tetap **tanpa** memuat kode pihak ketiga di runtime selain yang sudah ada di build Anda.
