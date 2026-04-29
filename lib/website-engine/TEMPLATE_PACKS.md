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
