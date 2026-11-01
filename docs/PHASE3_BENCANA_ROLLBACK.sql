-- Rollback P4 Bencana: data pada sebelas tabel ini HILANG; tabel lama tidak tersentuh. Urutan: anak dulu, lalu induk.
DROP TABLE `incident_logistics`;
DROP TABLE `incident_responses`;
DROP TABLE `incident_status_logs`;
DROP TABLE `incident_events`;
DROP TABLE `drm_alerts`;
DROP TABLE `drm_assessments`;
DROP TABLE `drm_hazards`;
DROP TABLE `drm_plans`;
DROP TABLE `drm_readiness_items`;
DROP TABLE `drm_resources`;
DROP TABLE `drm_volunteers`;
