-- Regional user: provinsi scope + kode BPS
ALTER TABLE `regional_users`
  ADD COLUMN `scopeProvince` VARCHAR(255) NULL AFTER `role`,
  ADD COLUMN `scopeKodeProvinsi` VARCHAR(10) NULL AFTER `scopeDistrict`,
  ADD COLUMN `scopeKodeKabKota` VARCHAR(10) NULL AFTER `scopeKodeProvinsi`;
