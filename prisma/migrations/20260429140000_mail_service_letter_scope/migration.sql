-- Scoped letter number: same number allowed for different template or different calendar day within a village.

DROP INDEX `mail_services_letterNumber_key` ON `mail_services`;

ALTER TABLE `mail_services` ADD COLUMN `letterDateKey` VARCHAR(10) NULL;

-- Isi dari tanggal surat (kalender, mengikuti penyimpanan timezone server)
UPDATE `mail_services`
SET `letterDateKey` = DATE_FORMAT(DATE(`letterDate`), '%Y-%m-%d')
WHERE `letterDateKey` IS NULL;

-- Fallback (seharusnya tidak perlu)
UPDATE `mail_services`
SET `letterDateKey` = DATE_FORMAT(CURRENT_DATE, '%Y-%m-%d')
WHERE `letterDateKey` IS NULL OR `letterDateKey` = '';

-- Pecah duplikat lama (nomor sama + template sama + hari sama): tambahkan suffix id supaya constraint bisa dibuat
UPDATE `mail_services` AS m
JOIN (
  SELECT id FROM (
    SELECT
      `id`,
      ROW_NUMBER() OVER (
        PARTITION BY `villageId`, `templateId`, `letterDateKey`, `letterNumber`
        ORDER BY `id` ASC
      ) AS rn
    FROM `mail_services`
  ) t
  WHERE t.rn > 1
) AS duplicate_rows ON duplicate_rows.id = m.id
SET m.`letterNumber` = LEFT(CONCAT(m.`letterNumber`, '-', SUBSTRING(CAST(m.`id` AS CHAR), 1, 20)), 255);

ALTER TABLE `mail_services` MODIFY COLUMN `letterDateKey` VARCHAR(10) NOT NULL;

CREATE UNIQUE INDEX `mail_services_letter_scope_key`
  ON `mail_services` (`villageId`, `templateId`, `letterDateKey`, `letterNumber`);

CREATE INDEX `mail_services_villageId_templateId_letterDateKey_idx`
  ON `mail_services` (`villageId`, `templateId`, `letterDateKey`);
