-- Rollback P5 Keamanan: data pada tiga belas tabel ini HILANG; tabel lama dan incident_* tidak tersentuh. Urutan: anak dulu, lalu induk.
DROP TABLE `security_report_links`;
DROP TABLE `security_followups`;
DROP TABLE `security_mediation_parties`;
DROP TABLE `security_mediations`;
DROP TABLE `security_ronda_swaps`;
DROP TABLE `security_ronda_logs`;
DROP TABLE `security_ronda_shifts`;
DROP TABLE `security_ronda_people`;
DROP TABLE `security_ronda_groups`;
DROP TABLE `security_members`;
DROP TABLE `security_equipment`;
DROP TABLE `security_risk_areas`;
DROP TABLE `security_contacts`;
