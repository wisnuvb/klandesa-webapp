-- Membatalkan PHASE3_ASET_MIGRATION.sql. Keenam tabel dibuang (perjanjian sewa, jadwal tagihan, lampiran, pesanan UKM beserta riwayat).
-- Catatan penerimaan di apbdes_entries yang sudah dibuat dari tagihan sewa TIDAK dihapus (itu buku kas milik modul APB Desa).
-- Urutan: anak lebih dulu, lalu induk.
DROP TABLE IF EXISTS `ukm_order_events`;
DROP TABLE IF EXISTS `ukm_order_requests`;
DROP TABLE IF EXISTS `land_agreement_docs`;
DROP TABLE IF EXISTS `land_charges`;
DROP TABLE IF EXISTS `land_agreements`;
DROP TABLE IF EXISTS `land_parcels`;
