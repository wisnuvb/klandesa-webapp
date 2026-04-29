-- Scoped letter number: same number allowed for different template or different calendar day within a village.

DROP INDEX IF EXISTS "mail_services_letter_number_key";

ALTER TABLE "mail_services" ADD COLUMN "letter_date_key" VARCHAR(10);

-- Isi dari tanggal surat (kalender, mengikuti penyimpanan timezone server)
UPDATE "mail_services"
SET "letter_date_key" = TO_CHAR(("letter_date" AT TIME ZONE 'UTC')::DATE, 'YYYY-MM-DD')
WHERE "letter_date_key" IS NULL;

-- Fallback (seharusnya tidak perlu)
UPDATE "mail_services"
SET "letter_date_key" = TO_CHAR(CURRENT_DATE, 'YYYY-MM-DD')
WHERE "letter_date_key" IS NULL OR "letter_date_key" = '';

-- Pecah duplikat lama (nomor sama + template sama + hari sama): tambahkan suffix id supaya constraint bisa dibuat
UPDATE "mail_services" AS m
SET "letter_number" = LEFT("letter_number" || '-' || SUBSTRING("id"::TEXT FROM 1 FOR 20), 255)
WHERE m."id" IN (
  SELECT id FROM (
    SELECT
      id,
      ROW_NUMBER() OVER (
        PARTITION BY "village_id", "template_id", "letter_date_key", "letter_number"
        ORDER BY id ASC
      ) AS rn
    FROM "mail_services"
  ) t
  WHERE t.rn > 1
);

ALTER TABLE "mail_services" ALTER COLUMN "letter_date_key" SET NOT NULL;

CREATE UNIQUE INDEX "mail_services_village_id_template_id_letter_date_key_letter_number_key"
  ON "mail_services" ("village_id", "template_id", "letter_date_key", "letter_number");
