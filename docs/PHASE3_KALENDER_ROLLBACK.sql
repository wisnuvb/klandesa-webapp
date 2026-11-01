-- Membatalkan PHASE3_KALENDER_MIGRATION.sql. Catatan pengiriman dan penimpaan katalog dibuang; semua data modul lain utuh.
-- (Berkas Arsip Digital yang pernah ditautkan sebagai bukti tidak disentuh: tabel ini tidak punya FK ke arsip.)
DROP TABLE IF EXISTS `compliance_report_records`;
DROP TABLE IF EXISTS `compliance_catalog_entries`;
