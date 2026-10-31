# Fase 3: server MCP baca-saja

Status: kode + tes selesai 2026-11-01, belum di-commit/di-deploy. Tidak ada tabel baru.

**Endpoint:** `POST /api/mcp` (MCP, transport Streamable HTTP tanpa sesi: satu POST = satu jawaban JSON; GET/DELETE → 405). Versi protokol dinegosiasikan (2025-11-25, 2025-06-18, 2025-03-26).

**Autentikasi:** `Authorization: Bearer kld_…` (kunci API desa yang sama). **OAuth per-desa belum dibuat**; klien yang mendukung header kustom (Claude Code, Cursor, dsb.) bisa dipakai sekarang. Permintaan dengan header `Origin` (peramban) ditolak.

**Desain "tanpa logika data kedua".** Alat diturunkan dari daftar endpoint `/api/v1` (`lib/api-v1/spec.ts`), dan tiap panggilan dijalankan oleh penangan `/api/v1` yang sama (dalam proses, dengan kunci yang sama). Jadi scope, penyamaran PII, batas laju (120/menit, tiap panggilan alat dihitung), dan jejak akses (jalur `/api/v1/...` asli terlihat oleh kepala desa) identik dengan REST. Tes memastikan setiap endpoint punya tepat satu alat dan penangannya terdaftar.

**Alat (15):** `info_kunci`, `cari_penduduk`, `lihat_penduduk`, `daftar_keluarga`, `lihat_keluarga`, `daftar_wilayah`, `daftar_perangkat`, `daftar_pengumuman`, `daftar_potensi`, `daftar_tabel_kustom`, `baca_tabel_kustom`, `ringkasan_statistik`, `ringkasan_anggaran`, dan dua alat usulan: `status_usulan`, `usulkan_data_kustom`.
`tools/list` hanya menampilkan alat yang boleh dipakai kunci itu.

**Pengaman agen**
- Semua alat baca berlabel `readOnlyHint`; satu-satunya alat tulis (`usulkan_data_kustom`) hanya membuat usulan `PENDING`; deskripsinya melarang agen menyatakan data sudah berubah sebelum `APPLIED`.
- **Hasil tak tepercaya:** semua alat kecuali `info_kunci` (nama warga, judul, label kolom, alasan tolak, dll. bisa ditulis pihak lain) dibungkus catatan keamanan dan pembatas `<data-tak-tepercaya id=…>` ber-nonce acak per jawaban; catatan juga ada di `structuredContent._catatanKeamanan`. Ini mitigasi, bukan jaminan: model tetap bisa tertipu teks bebas. Pertahanan utamanya struktural: **Aturan Dua** per kunci (data penduduk tak boleh bersama akses mengusulkan) + data pribadi sudah disamarkan di sumbernya + penulisan butuh persetujuan manusia. Batasnya: agen yang memegang dua kunci, atau punya alat lain (web, email), tidak tercakup Aturan Dua per kunci.
- Usulan lewat MCP berlabel `source=mcp` agar admin bisa membedakannya.
- Tanpa kunci berbentuk benar, batch apa pun (termasuk yang berisi `tools/call`) ditolak 401 sebelum diproses.
- Kegagalan 401/429 diteruskan sebagai status HTTP; galat lain menjadi hasil alat `isError` tanpa data.
- Badan maks 64 KB, batch maks 20 pesan.

**Cara pakai (Claude Code):** `claude mcp add --transport http klandesa https://<domain>/api/mcp --header "Authorization: Bearer KUNCI_ANDA"`. Petunjuk juga ada di layar Akses API.

**Belum dibuat (jujur):**
- OAuth per-desa sesuai spesifikasi MCP (butuh layar persetujuan, pendaftaran klien dinamis, token berumur pendek).
- **Sandbox sintetis.** Menambah baris "desa uji" ke tabel `villages` akan muncul di statistik platform, pencarian desa mobile, dasbor kabupaten, dan pengingat langganan, jadi ditunda sampai ada penanda desa-uji yang disaring di semua tempat itu. Sementara: buat kunci sempit (mis. hanya `statistik:read`) untuk bereksperimen.
- Pembersihan PII sebelum panggilan model untuk Laras; uji tembus injeksi prompt pada teks bebas sebelum dibuka ke publik.
