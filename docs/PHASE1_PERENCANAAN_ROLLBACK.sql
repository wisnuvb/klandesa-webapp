-- Rollback Paket 0 + 1: kembalikan skema persis seperti sebelum PHASE1_PERENCANAAN_MIGRATION.sql.
-- Data pada tabel baru HILANG; kolom lama pada rkpdes_activities tidak tersentuh.
ALTER TABLE `rkpdes_activities` DROP FOREIGN KEY `rkpdes_activities_documentId_fkey`;
DROP INDEX `rkpdes_activities_documentId_idx` ON `rkpdes_activities`;
ALTER TABLE `rkpdes_activities`
    DROP COLUMN `proposeToRegency`,
    DROP COLUMN `rabVerifiedAt`,
    DROP COLUMN `executorHasWoman`,
    DROP COLUMN `executorMembers`,
    DROP COLUMN `executorTreasurer`,
    DROP COLUMN `executorSecretary`,
    DROP COLUMN `executorChair`,
    DROP COLUMN `outputUnit`,
    DROP COLUMN `outputVolume`,
    DROP COLUMN `outputName`,
    DROP COLUMN `method`,
    DROP COLUMN `fundSource`,
    DROP COLUMN `activityCode`,
    DROP COLUMN `documentId`;
DROP TABLE `rkpdes_incoming_programs`;
DROP TABLE `rkpdes_pagu_indicative`;
DROP TABLE `rkpdes_team_members`;
DROP TABLE `rkpdes_documents`;
DROP TABLE `village_meeting_decisions`;
DROP TABLE `village_meeting_attendees`;
DROP TABLE `village_meetings`;
