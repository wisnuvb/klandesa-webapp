-- Password hash mitra dari formulir pendaftaran publik (opsional untuk baris lama).
ALTER TABLE "partner_applications" ADD COLUMN "passwordHash" VARCHAR(255);
