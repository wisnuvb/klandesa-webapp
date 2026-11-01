# Paket 3, P4: Bencana & lingkungan (Destana)

Dikerjakan 2026-11-01 sesuai `docs/PLAN_CELAH_FUNGSI.md` P4. Belum di-commit dan belum di-deploy. Halaman: `/bencana` ("Kebencanaan", grup Program Desa).

Dua hal sekaligus dibangun: (1) **primitif "kejadian & respons" generik** (`lib/incident/*`, tabel `incident_*`) yang akan dipakai ulang P5 Keamanan dengan `domain = KEAMANAN`; (2) modul **kesiapsiagaan bencana dan Destana** (`lib/bencana/*`, tabel `drm_*`).

## Langkah 0: hukum (hasil membaca teks resmi)

| Sumber | Status | Isi yang dipakai |
|---|---|---|
| **Peraturan BNPB 7/2025** tentang Desa dan Kelurahan Tangguh Bencana (batang tubuh 10 hlm., diunduh dari peraturan.bpk.go.id, `Download/412828`) | **[V] penuh** | Pasal 22: **mencabut Perka BNPB 1/2012** ("dicabut dan dinyatakan tidak berlaku"). Pasal 8 ayat 1 huruf a-q: 17 aktivitas Program Destana (katalog `ACTIVITIES`). Pasal 13: indikator Destana **mengacu SNI**. Pasal 14: penilaian ketangguhan **mandiri oleh desa**, paling sedikit **tiap 3 tahun** (ayat 5); tingkat **utama, madya, pratama** (ayat 6); rekomendasi ditindaklanjuti dan dipakai untuk perencanaan pembangunan (ayat 7, Pasal 15). Pasal 16: pedoman penilaian ditetapkan Kepala BNPB. Pasal 19 ayat 2: evaluasi **minimal 1 kali dalam 1 tahun**. Pasal 21: pendanaan dari APBN, APBD, **APB Desa**, dan sumber sah lain. Pasal 23: berlaku sejak diundangkan |
| Metadata Peraturan BNPB 7/2025 (halaman peraturan.bpk.go.id) | **[V]** | Ditetapkan 24-10-2025; diundangkan dan berlaku 31-10-2025; Berita Negara 2025 No. 892; status Berlaku; mencabut Perka 1/2012 (BN 2014 No. 1095). Tanggal pengundangan dibaca dari halaman basis data resmi karena blok tanda tangan pada PDF tidak terbaca |
| **Perka BNPB 1/2012** (Pedoman Umum Desa/Kelurahan Tangguh Bencana) | **[V] sudah dicabut** | Tidak dipakai. Isinya (kerangka indikator lama) sengaja tidak ditanam |
| Perka/Peraturan BNPB 6/2025 | **[V] koreksi atas plan** | Itu Peraturan BNPB tentang **Organisasi dan Tata Kerja BNPB** (BN 2025 No. 769), hanya dirujuk di "Mengingat" Peraturan 7/2025. Kalimat "tidak sesuai dengan perkembangan kebutuhan hukum" ada di **Menimbang huruf b Peraturan BNPB 7/2025**, bukan di 6/2025 |
| SNI 8357:2017 (indikator dasar dan capaian Destana) | **[R]**, tidak terakses | Hanya diketahui lewat pencarian sekunder (salinan BSN berlabel hak cipta). **Tidak ada indikator SNI yang ditanam** |
| Pedoman Penilaian Ketangguhan Desa/Kelurahan (Pasal 16, ditetapkan Kepala BNPB) | **[?]** tidak ditemukan | Rumus/ambang tingkat resmi tidak diketahui; aplikasi tidak menghitung tingkat |
| PMK 7/2026 Pasal 20 ayat 7 | **[V]** (teks lokal di scratchpad) | Desa yang mengalami bencana alam **yang terjadi pada tahun anggaran 2025**: penggunaan Dana Desa dapat dikecualikan untuk penanggulangan bencana, berpedoman pada ketentuan menteri. **Berlaku untuk bencana TA 2025, bukan 2026.** Plan menuliskannya seolah umum: dikoreksi di sini |
| PMK 7/2026 Pasal 48, 59 ayat 1-5, 60 | **[V]** | Pasal 48: pengecualian perhitungan sisa DD tahap II bagi desa terkena bencana alam yang terjadi TA 2025 sampai sebelum pengajuan tahap I 2026; bupati/wali kota memverifikasi kejadian dan mengajukan surat ke DJPK dengan surat pernyataan tanggung jawab mutlak kepala desa. Pasal 59: pengecualian syarat penyaluran tahap I (dan APB Desa/perekaman pagu bila bencana). Pasal 60: kejadian kahar (bencana alam, nonalam, sosial, kebakaran) dapat memperpanjang batas waktu, didukung pernyataan bupati/wali kota |
| Permendesa PDT 16/2025 Lampiran II.B | **[V]** | Fokus "Penguatan Desa Berketahanan Iklim dan Tangguh Bencana" (mitigasi dan adaptasi, termasuk penanggulangan bencana yang diputuskan di Musdes) |
| Permendesa PDT 16/2025 Lampiran II.I butir 2.c | **[V]** | Dana operasional pemerintah desa dapat dipakai untuk **bantuan logistik bagi warga korban bencana**, **biaya transportasi pemerintah desa merespons bencana yang belum mendapat intervensi supra-desa**, dan rapat pencegahan/penanggulangan kerawanan sosial. Ini jalur praktis TA 2026 dan dasar pilihan sumber dana `DD_OPERASIONAL` |
| UU 24/2007 (kategori bencana alam/nonalam/sosial) | **[R]** | Istilah tiga kategori muncul di PMK 7/2026 Pasal 60 ayat 4 [V]; **pemetaan jenis kejadian ke kategori** di `lib/incident/catalog.ts` mengikuti pemahaman umum, teks UU belum dibaca. Jenis yang kategorinya meragukan (kebakaran) sengaja dikosongkan |
| Format/formulir BPBD Karanganyar | **[?] belum dicek** | Ada berkas "desa-kelurahan-tangguh-bencana.pdf" di opendata.karanganyarkab.go.id yang **tidak dibaca**. Menunggu masukan BPBD (keputusan #4 plan) |

Konsekuensi desain: **indikator skor kesiapan yang berstatus [V] hanya 17 aktivitas Pasal 8(1)**. Skor yang ditampilkan adalah "aktivitas Destana selesai / 17", **bukan tingkat ketangguhan**. Tingkat resmi (utama/madya/pratama) hanya **dicatat** dari hasil penilaian desa. Butir tambahan buatan desa disimpan terpisah, berlabel **"Belum diverifikasi"**, tidak ikut skor.

## Yang dibangun

### 1. Kejadian & respons (primitif generik, `lib/incident/*`)
- **Kejadian** (`incident_events`): domain, jenis (katalog per domain), judul, uraian, waktu (instan dengan zona), tingkat keparahan, lokasi (teks, RT/RW/dusun, koordinat berpasangan), dampak berupa **angka kasar** (meninggal, hilang, luka, mengungsi, KK terdampak, rumah rusak, perkiraan kerugian), **pelaporan ke supra-desa** (waktu, instansi, nomor), status, catatan penyelesaian. Tidak ada daftar nama korban.
- **Siklus status bergerbang** (`calc.ts`): `OPEN → RESPONDING → RESOLVED → CLOSED`, `OPEN → CANCELLED`, `RESOLVED/CLOSED → RESPONDING` (buka kembali). Gerbang (kebijakan aplikasi, bukan angka hukum): *selesai ditangani* butuh ≥ 1 tindakan tercatat + ringkasan penyelesaian; *batal* dan *buka kembali* wajib alasan; *menutup* kejadian berat/sangat berat yang belum dicatat dilaporkan ke supra-desa wajib alasan. **Menutup dan membuka kembali kejadian ditutup = izin `approve`** (dicek di dalam kunci); lainnya `update`. Kejadian ditutup/dibatalkan tidak dapat diubah dan tidak menerima tindakan/distribusi. Riwayat status (`incident_status_logs`).
- **Log tindakan** (`incident_responses`): waktu, jenis (katalog per domain), uraian, pelaksana. Hapus hanya selama kejadian belum ditutup, dan tidak boleh menghapus tindakan terakhir dari kejadian yang sudah "selesai ditangani".
- **Distribusi bantuan** (`incident_logistics`, hanya domain yang `logistics = true`): penerima = **KK aktif desa** (`households`, dipilih lewat pencarian) atau penerima non-KK (posko). Barang, jumlah, satuan, nilai opsional, **sumber bantuan** (katalog: DD operasional, DD bencana, APBDes BTT, BPBD, donasi, lainnya), tanggal, nomor bukti. Nama kepala KK disalin sebagai bukti LPJ; **NIK tidak pernah disimpan atau keluar**. Kunci unik anti-ganda (kejadian + KK + barang + tanggal); bantuan sama di hari lain sah tetapi diberi peringatan. **Ini catatan penyerahan, bukan pembukuan**: pengeluaran uang tetap lewat SPP/Buku Kas (tidak ada penulisan ke `apbdes_entries`).
- **Temuan** (peringatan, bukan penghalang): belum ada tindakan > 6 jam; berat belum dilaporkan > 24 jam (kebijakan aplikasi); catatan lingkup pengecualian Dana Desa PMK 7/2026 (hanya bencana alam TA 2025).

### 2. Kesiapsiagaan (`/bencana`, tab "Kesiapsiagaan")
Ancaman per wilayah (`drm_hazards`, termasuk **impor titik rawan lama** `disaster_points` sekali saja per titik), sumber daya (`drm_resources`: shelter, titik kumpul, jalur evakuasi, peralatan, stok, sirine, faskes; kapasitas, kondisi, koordinat, penanggung jawab), relawan/tim siaga (`drm_volunteers`, rujukan ke `residents` tanpa NIK; telepon hanya untuk izin baca rinci), dokumen rencana (`drm_plans`, lampiran dirujuk ke **Produk Hukum** `legal_documents` dan **Arsip Digital** `digital_archives` milik desa yang sama; tidak ada sistem berkas baru).

### 3. Peringatan dini (tab "Peringatan dini")
Siaran per seluruh desa atau per RW/RT (`drm_alerts` = log). Memakai infrastruktur yang sudah ada: baris `user_notifications` (tipe `system`, kotak masuk aplikasi warga) + push Expo lewat fungsi baru kecil `pushToCitizenAccounts` di `lib/mobile/push.ts` (menggandakan pola `broadcastPushToVillageCitizens`, hanya untuk akun terpilih). RT/RW dinormalisasi ("1", "01", "001" sama). Alur: tulis (templat dapat disunting) → **Hitung penerima** (pratinjau tanpa menulis apa pun) → konfirmasi → kirim. **Pratinjau wajib di server**: pengiriman nyata harus membawa `expectAccounts` (jumlah dari pratinjau); bila jumlah akun sasaran sekarang berbeda, 409. **Isi disaring** (lihat Tinjauan keamanan): tautan/alamat situs/akun dan deretan angka panjang ditolak; **server menambahkan label tingkat** (`[SIAGA]`, dst.) di depan judul notifikasi. Siaran identik (judul + pesan + sasaran) dalam 2 menit ditolak. Batas **10 siaran/24 jam/desa**. Dua pemeriksaan terakhir dijaga dalam kunci desa. Izin `approve`. Push berjalan di latar belakang; status SENT/FAILED dan jumlah perangkat ditulis ke log.

### 4. Kesiapan Destana (tab "Kesiapan Destana") dan kartu Dana Desa
17 aktivitas Pasal 8(1) dengan status Belum/Sedang/Selesai + catatan/bukti; petunjuk "terdeteksi dari data aplikasi" (mis. sudah ada ancaman tercatat) yang **tidak** mengubah status; butir tambahan desa (belum diverifikasi); catatan penilaian/evaluasi dengan tingkat hasil resmi; temuan berpasal (penilaian > 3 tahun: Pasal 14(5); evaluasi > 1 tahun: Pasal 19(2)). **Kartu "Desa Tangguh Bencana"** (`components/app/bencana/DestanaCard.tsx`) dipasang di tab Ringkasan halaman Dana Desa (2 baris di `DanaDesaView.tsx`); kartu menyembunyikan diri bila pengguna tidak berhak.

## Primitif untuk P5 (baca ini sebelum membangun Keamanan)

P5 membangun di atas `lib/incident/*` tanpa mengubahnya, kecuali bagian `KEAMANAN` di katalog.

**Berkas**
- `lib/incident/catalog.ts`: `DOMAINS`, `DOMAIN_DEFS` (per domain: `kinds`, `responses`, `logistics`), `DOMAIN_RESOURCE`, `SEVERITIES`, `STATUSES`, `FUNDING_SOURCES`, `LIMITS`. Entri `KEAMANAN` berisi daftar awal (pencurian, perkelahian, perselisihan warga, gangguan ketertiban, kecelakaan, orang mencurigakan, lainnya) dan jenis tindakan (patroli, mediasi, koordinasi, laporan, tindak lanjut). **Boleh disunting oleh P5**; kekerasan terhadap perempuan/anak sengaja tidak ada (hanya rujukan layanan, bukan basis data kasus; plan P5).
- `lib/incident/calc.ts` (murni): `transitionGate`, `transitionAction`, `canTransition`, `maskKk`, `maskName`, `incidentFindings`, `impactSummary`. Temuan "pengecualian Dana Desa" hanya muncul untuk domain BENCANA.
- `lib/incident/schema.ts` (murni): `parseEventCreate(domain, body, now?)`, `parseEventPatch`, `parseTransition`, `parseResponse(domain, …)`, `parseLogistic`, `parseEventListQuery(domain, searchParams)`, serta pembantu validasi yang dapat dipakai ulang (`parseInstant`, `coords`, `area`, `money`, `digits`, `posInt`, `optText`, `reqText`).
- `lib/incident/service.ts`: semua fungsi menerima **`domain`** dan memakainya di klausa `where`.

**Fungsi servis** (semua `async`, mengembalikan `Result<T>` dari `lib/form-input`; `villageId` dari sesi, tidak pernah dari masukan)

| Fungsi | Parameter | Catatan |
|---|---|---|
| `createEvent(db, { domain, villageId, userId, input, now? })` | | status awal `OPEN`, menulis baris riwayat |
| `listEvents(db, { domain, villageId, query, now? })` | `query` dari `eventListQuery(domain, sp)` | paginasi ≤ 50, `status=ACTIVE` = OPEN/RESPONDING/RESOLVED |
| `getEvent(db, { domain, villageId, id, detail, logPage?, now? })` | `detail` = izin baca rinci | nama penerima tersamar bila `detail=false`; `logistics: null` bila domain tanpa logistik |
| `patchEvent(db, { domain, villageId, id, input })` | | hanya status OPEN/RESPONDING/RESOLVED |
| `removeEvent(db, { domain, villageId, id })` | | hanya OPEN/CANCELLED dan tanpa distribusi |
| `transition(db, { domain, villageId, id, userId, input: {to, note}, can: {update, approve} })` | `can` = izin pemanggil pada resource domain | izin yang dibutuhkan dicek **di dalam kunci** berdasar status saat ini |
| `addResponse` / `removeResponse(db, { domain, villageId, id, responseId })` | | |
| `addLogistic` / `removeLogistic` | | ditolak 400 bila `DOMAIN_DEFS[domain].logistics === false` |
| `searchHouseholds(db, { villageId, q })` | | min. 3 karakter, hanya 4 digit akhir KK |
| `domainSummary(db, { domain, villageId, now? })` | | hitungan per status, dampak tahun berjalan, 5 kejadian terbaru (tanpa data pribadi) |

**Izin per domain.** `DOMAIN_RESOURCE = { BENCANA: "bencana", KEAMANAN: "keamanan" }`. Servis **tidak** memeriksa izin (kecuali argumen `can` di `transition`); rute yang memeriksa lewat `requireVillageApiContext` + matriks. Resource `bencana` sudah terdaftar. P5 **wajib mendaftarkan `keamanan`** sebelum rutenya hidup:
1. `lib/permissions/resources.ts` dan `matrix.ts`: tambah `keamanan` (usulan: sama dengan `bencana` kecuali peran Satlinmas/Kaur; baca rinci tetap = aksi `export`, menutup/membuka kembali = `approve`).
2. `lib/permissions/api-route-map.ts`: prefix `/api/keamanan` dan pola `^/api/keamanan/kejadian/\d+/status$` → `update` (salin dua entri `bencana` yang ada).
3. Registry modul (`lib/modules/registry.ts`).
4. Rute: salin `app/api/bencana/kejadian/**` ke `app/api/keamanan/kejadian/**`, ganti `"BENCANA"` → `"KEAMANAN"`, `bencanaCan(ctx)` → `permissions(ctx, "keamanan")` (`lib/apbdes/http`), `hasDetail` → `roleCan("keamanan","export",…)`. Setiap handler tetap `await requireVillageApiContext(req)` + `attempt()`; tulis → `auditWeb`.
5. **Isolasi domain sudah dijaga servis dan diuji**: rute BENCANA tidak dapat membaca/mengubah kejadian KEAMANAN walau menebak id (tes "isolasi lintas desa DAN lintas domain").
6. Mediasi (pihak, hasil, tindak lanjut), ronda, Satlinmas: bangun sebagai **tabel `keamanan_*` milik P5** yang merujuk `incident_events.id` (cek `domain = 'KEAMANAN'` dan `villageId` di servis P5); jangan menambah kolom pada `incident_*`. Konkurensi: ambil kunci baris kejadian dengan pola yang sama (`SELECT … FOR UPDATE` pada `incident_events` sebagai pernyataan pertama) bila P5 punya invarian terhadap status kejadian.
7. Domain ketiga atau kolom enum baru memerlukan perubahan `incident_events_enum_chk` (CHECK di SQL migrasi).
8. Data korban/pihak berperkara adalah **sensitif**: jangan masukkan ke `app/api/mobile`, `app/api/public`, `app/api/v1`, MCP, Laras, webhook. Tes penjaga `tests/bencana.test.ts` ("data korban/KK tidak bocor…") memindai folder-folder itu untuk `lib/incident|lib/bencana` dan nama tabelnya; perluas daftar bila P5 menambah modul baru.

## Data dan izin

SQL aditif `PHASE3_BENCANA_MIGRATION.sql` (11 tabel: `incident_events`, `incident_responses`, `incident_logistics`, `incident_status_logs`, `drm_hazards`, `drm_resources`, `drm_volunteers`, `drm_plans`, `drm_alerts`, `drm_readiness_items`, `drm_assessments`; 11 foreign key; 7 CHECK) + `PHASE3_BENCANA_ROLLBACK.sql` (11 `DROP TABLE`, anak dulu). Tidak menyentuh tabel lama (impor titik rawan hanya **membaca** `disaster_points`). CHECK: dampak ≥ 0, koordinat berpasangan dan dalam rentang, kamus domain/status/keparahan tertutup, jumlah distribusi > 0, kapasitas ≥ 0.

Resource izin baru **`bencana`** (matriks di `lib/permissions/matrix.ts`):

| Peran | Aksi |
|---|---|
| admin | read, create, update, delete, export, approve |
| Kepala Desa | read, export, approve |
| sekretaris | read, create, update, delete, export, approve |
| operator (staff) | read, create, update |

`read` = ringkasan, daftar kejadian (tanpa nama penerima), kesiapsiagaan, log peringatan. **`export` = baca rinci** (nama penerima bantuan per KK dan 4 digit KK, telepon relawan); tanpa itu nama tersamar ("S****** H***"). Membuka tampilan rinci distribusi menulis audit `read_detail`. `approve` = menutup/membuka kembali kejadian dan **mengirim peringatan dini**. Operator mencatat tetapi tidak menghapus. Rute `POST …/kejadian/:id/status` memakai gerbang kasar `read` (semua peran); aksi sebenarnya ditegakkan **di dalam servis** (`transition`, di dalam kunci) berdasar status saat ini: operator = `update`, menutup/membuka kembali = `approve`. Hasilnya: staf tidak dapat menutup; Kepala Desa (approve tanpa update) dapat menutup dan membuka kembali tetapi tidak mengubah status penanganan. Audit tulis memuat id, jenis, nilai ringan; **tanpa nama/KK/NIK**. Pencarian KK/warga juga butuh izin baca `residents` di dalam rute. Tidak ada rute di `app/api/mobile`, `public`, atau `v1` untuk data ini (dijaga tes).

## Kunci dan konkurensi
- Kejadian: `SELECT … FOR UPDATE` pada baris `incident_events` sebagai pernyataan pertama transaksi untuk perubahan status, tindakan, distribusi, hapus. Menjamin satu perpindahan sah pada permintaan serentak dan "kejadian tidak pernah selesai tanpa tindakan".
- Batas jumlah baris (ancaman, sumber daya, relawan, rencana, butir, penilaian) dan batas siaran/24 jam: kunci baris `villages` per desa.
- Upsert isian kesiapan: `updateMany` lalu `create` dengan penanganan tabrakan unik (upsert bawaan Prisma menabrak kunci unik saat klik ganda: **bug ditemukan tes dan diperbaiki**).
- Anti-ganda distribusi: kunci unik `incident_logi_dup_uq` (independen dari kunci baris).

## Pengujian
- `tests/bencana.test.ts`: **44** tes unit (gerbang status, penyamaran, validasi jahat: notasi ilmiah, heksa, array, tanggal 31 Feb, zona waktu, koordinat, enum; normalisasi RT/RW; skor dari butir [V]; temuan berpasal; templat siaran; izin rute per peran; penjaga kebocoran data ke API mobile/publik; penjaga guard per handler).
- `tests/bencana-render.test.tsx`: **5** tes render (batang skor, kotak pencarian berlabel, role status/alert, konversi waktu, tanpa `<select>` mentah, `pb-24`).
- `tests/bencana.integration.test.ts`: **25** tes MySQL nyata (DB scratch): siklus status penuh; hapus; isolasi desa **dan** domain untuk 7 operasi; distribusi (KK desa lain/tidak aktif ditolak, penyamaran, tidak ada NIK/telepon/KK utuh pada keluaran ringkas, anti-ganda, ringkasan nilai); pencarian KK (wildcard LIKE dilucuti); 3 uji konkurensi; pagar CHECK; impor titik rawan (termasuk dua impor serentak); CRUD terisolasi, relawan; lampiran rencana lintas desa; kesiapan idempoten serentak; peringatan (normalisasi RT/RW, pratinjau tanpa efek, kotak masuk tepat sasaran, push FAILED, kejadian lintas desa/domain ditolak, **batas 10 siaran serentak**).
- **Uji mutasi**: menghapus `FOR UPDATE` dari `lockEvent` → 2 tes konkurensi gagal (selesai serentak; selesai vs hapus tindakan terakhir); menghapus `FOR UPDATE` dari kunci desa → tes batas 10 siaran gagal. Keduanya dipulihkan dan hijau.
- Tertangkap tes dan diperbaiki: `parseInstant` menerima 31 Februari (digulung JS); upsert tabrakan unik; wildcard LIKE (`%`) pada pencarian; CHECK koordinat tak berpasangan lolos karena logika NULL (diganti `(lat IS NULL) = (lng IS NULL)`).
- Latihan SQL (apply → rollback → apply) di `klandesa_bencana_scratch2` yang dibuat dari snapshot skema sebelum Paket 3; `prisma migrate diff` DB hasil migrasi vs skema: **tidak ada selisih pada tabel `incident_*`/`drm_*`**.

## Batas yang jujur
- **Tidak ada peta.** Koordinat ancaman, sumber daya, dan kejadian disimpan dan ditampilkan sebagai teks; belum digambar di peta (peta infrastruktur memakai MapLibre; integrasi belum dibuat). Jalur evakuasi hanya titik awal + catatan teks, bukan garis.
- **Skor bukan tingkat ketangguhan resmi.** Indikator SNI 8357:2017 dan pedoman penilaian BNPB belum terbaca; tingkat dicatat manual.
- **Pengecualian Dana Desa bencana tidak diotomatisasi.** Teks [V] mengikat bencana alam TA 2025; tidak ada alur surat permohonan ke bupati/DJPK. Hanya catatan dan pencatatan pelaporan supra-desa.
- **Penyaring isi siaran hanya heuristik.** Angka yang dieja dengan kata ("nol delapan satu…"), nomor yang dipecah huruf, TLD baru di luar daftar, atau cara penyamaran baru dapat lolos; kalimat sah yang memuat deretan ≥ 8 angka (mis. "Rp15.000.000") ditolak. Pertahanan utamanya tetap izin `approve`, pratinjau wajib, label tingkat dari server, siaran kembar ditolak, batas 10/24 jam, dan audit. Tidak ada daftar hitam kata-kata penipuan.
- Distribusi bantuan tidak membuat entri Buku Kas/SPP dan tidak memeriksa batas operasional 3%; nilai di tiap baris adalah nilai baris itu (bukan harga satuan).
- Peringatan dini hanya menjangkau warga **yang punya akun aktif di aplikasi**; tidak ada SMS/WhatsApp, tidak ada integrasi BMKG/BPBD. Push tidak diuji ke Expo sungguhan (di tes diganti fungsi palsu); `pushToCitizenAccounts` belum diuji terhadap jaringan. Tautan dalam (deep link) kosong: ketuk notifikasi membuka aplikasi/kotak masuk.
- Laras (asisten) belum punya alat baca untuk modul ini (sengaja, data korban sensitif); statistik bencana belum masuk dasbor kabupaten.
- Uji browser sungguhan **belum** dijalankan oleh saya: hanya tes render, tipe, lint. Belum ada tes asap Playwright, naskah uji operator, dan data demo (Bedahan).
- Aksesibilitas dicek lewat kode (label, `role`, target 44px, `min-w-0`, `break-words`), belum diperiksa di 390px sungguhan.
- Katalog jenis kejadian, tingkat keparahan, sumber bantuan, ambang 6/24 jam, dan batas jumlah baris adalah kebijakan aplikasi, bukan aturan.
- Bank sampah/penanaman vegetasi (poin "Iklim & lingkungan" plan) tidak dikerjakan di paket ini (bank sampah sudah ada; aksi tanam bisa lewat Data Kustom).
- Menu "Lingkungan Hidup" lama (titik rawan, insiden lingkungan) tidak diubah; kedua daftar bisa saling tumpang sampai pemilik memutuskan menggabungkan.

## Keputusan yang menunggu pemilik
1. Format Destana BPBD Karanganyar (keputusan #4 plan): bila BPBD memakai formulir/indikator tertentu, jadikan katalog butir tambahan resmi.
2. Apakah peringatan dini boleh dikirim oleh operator (kini hanya Kepala Desa, sekretaris, admin) dan apakah batas 10 siaran/24 jam cukup.
3. Apakah Laras boleh diberi alat baca ringkasan kejadian (tanpa penerima per KK).
4. Penggabungan menu Lingkungan Hidup > titik rawan dengan daftar ancaman baru.
5. Add-on langganan untuk modul ini (default: termasuk paket dasar, `billingAddon` tidak diisi).

## Titik pemasangan bersama yang diubah
`prisma/schema.prisma` (11 model di atas `// >>> models:bencana`, 8 relasi balik di atas `// >>> back-relations:bencana`); `lib/permissions/resources.ts` (+`bencana`); `lib/permissions/matrix.ts` (+entri `bencana`); `lib/permissions/api-route-map.ts` (+2 pola, +1 prefix); `lib/modules/registry.ts` (+modul `bencana`, sortOrder 605); `lib/mobile/push.ts` (+`pushToCitizenAccounts`, aditif); `app/(app)/dana-desa/_components/DanaDesaView.tsx` (+kartu, 2 baris).

## Tinjauan keamanan independen dan perbaikan (2026-11-01)
Temuan dan perbaikan, masing-masing dengan tes:
1. **Isi siaran bebas (SEDANG):** akun `approve` yang dibobol dapat menyiarkan tautan/rekening palsu. Sekarang `title` dan `message` ditolak bila memuat URL/domain (termasuk "dot"/"titik", spasi, huruf besar, huruf mirip Cyrillic/Yunani, karakter lebar penuh/tak terlihat, surel, @akun, wa.me/t.me), atau deretan ≥ 8 angka (nomor rekening/telepon; Arab/lebar penuh ikut; tanggal dan jam wajar dikecualikan). Judul tidak boleh diawali tanda kurung (label palsu); server **menambahkan** `[TINGKAT]` di depan judul notifikasi. Keterbatasan dicatat di Batas yang jujur.
2. **Pratinjau hanya di UI (SEDANG):** server kini mewajibkan `expectAccounts` (409 bila jumlah akun berbeda; 400 bila tidak dikirim) dan menolak siaran identik dalam 2 menit (dicek dalam kunci desa; tes balapan 6 permintaan serentak). Uji mutasi: tanpa pemeriksaan kembar dan tanpa pemeriksaan `expectAccounts`, tes masing-masing gagal.
3. **Kepala Desa tak bisa menutup kejadian (RENDAH):** gerbang rute status diubah ke `read`; penegakan di servis (lihat Data dan izin). Tes izin diperbarui dan ada tes integrasi untuk Kepala Desa/staf. Entri `keamanan` tidak disentuh.
5. **Daftar putih enum lewat `in` (RENDAH):** kunci prototipe ("constructor", "__proto__", "toString") lolos. Semua penjaga `is*` di `lib/incident/catalog.ts` dan `lib/bencana/catalog.ts` kini memakai `own()` (`hasOwnProperty`), termasuk `parseEventListQuery`, `kindLabel`, dan pemetaan impor titik rawan. Tes memeriksa semua enum dan semua parser. **Pola `in` serupa di luar modul ini (tidak diubah):** `lib/kdmp/catalog.ts` (isKind), `lib/bumdes/catalog.ts`, `lib/idm/catalog.ts`, `lib/pengadaan/catalog.ts`, `lib/musdes/catalog.ts` (isKind, isUnsur), `lib/rkpdes/catalog.ts`, `lib/kia/catalog.ts`, dan kemungkinan katalog lain; cari dengan `grep -rn 'typeof [a-z]* === "string" && [a-z]* in ' lib`.
6. **Anti-ganda distribusi lemah (RENDAH):** penerima non-KK kini dihitung berdasarkan nama (spasi dirapikan, tak peka huruf besar) + barang pada kejadian yang sama dan memunculkan peringatan yang sama dengan jalur KK (peringatan, bukan blokir). Kunci unik tetap hanya untuk jalur KK.
