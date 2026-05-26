# Katalog modul platform Klandesa (sales enablement)

Dokumen ini membantu tim mitra dan pemda menjelaskan apa yang konsisten antara **marketing publik**, **landing `/platform`**, dan **implementasi aplikasi**.

## Sumber kebenaran

| Layer | Path |
| ------- | ------- |
| Registri navigasi/produk | `lib/modules/registry.ts` |
| Salinan nilai utama marketing | `lib/marketing/modules.ts` (`MARKETING_MODULE_COPY`, `inferPackagingHint`) |
| Matriks tier tanpa harga | Komponen `TierComparison`, halaman `/harga` |
| Dokumentasi integrasi | `docs/INTEGRATIONS.md` |

> **Kontrak internal:** tidak menjanjikan fitur atau angka sku yang tidak tercermin ketiga lokasi tersebut.

### Status produk (`ModuleStatus`)

- **live**: modul utama umum digunakan di onboarding desa baru.
- **beta**: perilaku masih bisa berubah; di landing digambarkan sebagai badge **Early Access**.
- **planned**: boleh disebut secara roadmap tetapi belum boleh diiklankan sebagai tersedia penuh.

## Ringkasan modul (ikut urutan registri bisnis utama)

Berikut rekapitulasi ID, nama tampilan, status, serta petunjuk `billingAddon` bila ada. Untuk sasaran SDG per detail teknis, lihat registri langsung (`sdgGoals`).

| Modul (`id`) | Label UI | Status | Addon / Catatan cepat |
| --- | --- | --- | --- |
| data-warga | Warga | live | Basis administrasi penduduk |
| data-kk | Kartu Keluarga | live | |
| data-perangkat | Perangkat Desa | live | |
| data-jabatan | Jabatan | live | |
| potensi | Potensi | live | |
| anggaran | Anggaran | live | Basis tagging APBDes/SDGs |
| koperasi | Koperasi | live | |
| bumdes | BUMDes | beta (`bumdes`) | Early access ekonomi |

| Modul (`id`) | Label UI | Status | Addon |
| --- | --- | --- | --- |
| statistik | Statistik | live | |
| permohonan-warga … website | blok surat / portal | live | Layanan daring & komunikasi |

| Modul (`id`) | Label UI | Status | Addon |
| --- | --- | --- | --- |
| keuangan | Sistem Keuangan | live | Tagging sasaran profesional-up |
| billing | Billing | live | Tidak ditampilkan di marketing utama |
| absensi | Absensi Perangkat | live | Bisa add-on wilayah |
| pkk | PKK & Dasawisma | beta (`pkk`) | Early access sosial |

| Stack SDGs & perencanaan | Label | Status | Addon |
| --- | --- | --- | --- |
| sdgs | Dashboard SDGs | beta (`sdgs`) | Bundel SDGs profesional/up |
| rpjmdes | RPJMDes | beta (`sdgs`) | Same bundle |
| pertanian | Pertanian | beta | |
| partisipasi-rtrw | Partisipasi RT/RW | beta | |
| lingkungan | Lingkungan | beta | Bank sampah, insiden, titik bahaya |

| Spatial & interoperability | Label | Status | Addon |
| --- | --- | --- | --- |
| peta-infrastruktur | Peta Infrastruktur | beta (`gis`) | Spatial add-on |
| sinkronisasi-data | Sinkronisasi Data | beta (`integrations`) | Dokumentasi export + audit |

| Produktivitas pintar | Label | Status | Addon |
| --- | --- | --- | --- |
| asisten-ai | Asisten AI | beta (`ai_assistant`) | Kuota / kredit AI per pengguna (early access) |

Arsip Digital (`arsip`), Produk UKM (`ukm`), Website Desa (`website`) tetap **live** tetapi posisi utama marketing biasanya kedua blok terakhir.

## Narasi bagi mitra/pemda

1. **Starter** — aktivasi cepat blok administratif + portal surat daring—tanpa menjanjikan integrasi dokumentasi pusat atau stack SDGs penuh.
2. **Profesional** — membuka bundel tagging keuangan, dashboard RPJMDes/ SDGs serta modul sensitif wilayah dalam jalur Early Access; add-on memisahkan GIS, AI, dll.
3. **Enterprise** — multi-desa, governance lintas wilayah, dan adapter export dokumentasi Kemendesa (posisi jujur: siap eksport + audit jejak aplikasi—bukan penjanjian sinkron real-time tanpa akses sistem resmi). SLA & dedicated success dinegosiasikan formal.

Bahasa komunikasi utama web adalah **sales konsultatif**: arahkan calon pembeli membaca juga:

- `/platform/sdgs` — penyederhanaan alur pemahaman sasaran dan heatmap wilayah.
- `/platform/integrasi` — apa yang memang bisa diekspor vs apa yang bergantung MOU resmi pusat/daerah.

## Update ketika registri bergeser

Saat ada modul baru:

1. Tambahkan entri ke `VILLAGE_MODULE_REGISTRY` dengan metadata lengkap.
2. Sisipkan satu–dua kalimat di `MARKETING_MODULE_COPY` (atau akan fallback generik dari `describeModule`).
3. Revisit `inferPackagingHint` bila pola billing berubah.
4. Cocokkan isi dokumen ini (atau arahkan pembaca utama ke registri sebagai sumber utama).
