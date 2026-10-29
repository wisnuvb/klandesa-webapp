-- Desa yang mendaftar sebelum Paket Lengkap dirilis otomatis diberi plan "profesional" selama trial.
-- Trial sekarang memakai Paket Lengkap (yang dijual), jadi desa yang MASIH trial/grace dipindahkan ke "lengkap".
-- Desa berbayar (status active/inactive) tidak disentuh. Kuota arsip (storageLimit) sengaja tidak diubah
-- agar data yang sudah diunggah selama trial tidak melebihi batas secara tiba-tiba.
UPDATE `villages`
SET `subscriptionPlan` = 'lengkap'
WHERE `subscriptionPlan` = 'profesional'
  AND `subscriptionStatus` IN ('trial', 'grace');
