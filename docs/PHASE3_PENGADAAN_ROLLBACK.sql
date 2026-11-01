-- Rollback Paket 3 / Pengadaan, kerja sama desa, IDM: data pada sembilan tabel ini HILANG; tabel lain tidak tersentuh.
-- Urutan: tabel anak lebih dulu.
DROP TABLE `idm_indicators`;
DROP TABLE `idm_scores`;
DROP TABLE `village_agreements_budget_items`;
DROP TABLE `village_agreements_parties`;
DROP TABLE `village_agreements`;
DROP TABLE `procurement_offers`;
DROP TABLE `procurement_team_members`;
DROP TABLE `procurement_packages`;
DROP TABLE `procurement_settings`;
