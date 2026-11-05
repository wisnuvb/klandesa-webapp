-- Rollback Paket 11 (hanya membuang indeks; data tidak tersentuh). Aman dijalankan kapan saja: query tetap benar, hanya lebih lambat.
-- Catatan: MySQL menolak DROP INDEX bila indeks itu satu-satunya yang melayani foreign key; di sini semua kolom villageId
-- tetap dilayani indeks lain (mis. (villageId, status)), jadi aman.

DROP INDEX `residents_villageId_updatedAt_idx` ON `residents`;
DROP INDEX `transactions_villageId_createdAt_idx` ON `transactions`;
DROP INDEX `mail_requests_villageId_createdAt_idx` ON `mail_requests`;
DROP INDEX `mail_requests_villageId_status_requestDate_idx` ON `mail_requests`;
DROP INDEX `mail_services_villageId_templateCategory_idx` ON `mail_services`;
