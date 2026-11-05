-- Paket 11 / indeks untuk query yang jalan di setiap muat halaman dashboard (audit 2026-11-05). ADITIF (hanya indeks; tanpa perubahan kolom/data).
-- Dilayani:
--   residents(villageId, updatedAt DESC)            -> "aktivitas terbaru" (GET /api/activities/recent) + sinkron notifikasi warga: dulu membaca semua warga desa lalu filesort.
--   transactions(villageId, createdAt DESC)         -> aktivitas terbaru + sinkron notifikasi transaksi (indeks lama hanya transactionDate).
--   mail_requests(villageId, createdAt DESC)        -> aktivitas terbaru permohonan surat.
--   mail_requests(villageId, status, requestDate DESC) -> sinkron notifikasi permohonan "pending" (where status + orderBy requestDate + take).
--   mail_services(villageId, templateCategory)      -> groupBy kategori di daftar surat (setiap halaman daftar).
-- InnoDB membuat indeks secara ONLINE (DML tidak terkunci), tetapi jalankan di jam sepi untuk tabel `residents` yang besar.
-- Biaya: tiap indeks menambah sedikit kerja tulis; `residents(updatedAt)` ikut diperbarui pada setiap ubah warga.
-- Identik dengan `prisma db push` (nama default Prisma). Rollback: PHASE11_SHELL_QUERY_INDEXES_ROLLBACK.sql.

CREATE INDEX `residents_villageId_updatedAt_idx` ON `residents`(`villageId`, `updatedAt` DESC);
CREATE INDEX `transactions_villageId_createdAt_idx` ON `transactions`(`villageId`, `createdAt` DESC);
CREATE INDEX `mail_requests_villageId_createdAt_idx` ON `mail_requests`(`villageId`, `createdAt` DESC);
CREATE INDEX `mail_requests_villageId_status_requestDate_idx` ON `mail_requests`(`villageId`, `status`, `requestDate` DESC);
CREATE INDEX `mail_services_villageId_templateCategory_idx` ON `mail_services`(`villageId`, `templateCategory`);
