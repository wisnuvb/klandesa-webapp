interface Position {
  id: number;
  name: string;
  level: number;
}

export const MOCK_POSITIONS: Position[] = [
  // Level 1 – Pimpinan Desa
  { id: 1, name: "Kepala Desa", level: 1 },

  // Level 2 – Sekretariat Desa
  { id: 2, name: "Sekretaris Desa", level: 2 },

  // Level 3 – Kepala Urusan (KAUR)
  { id: 3, name: "Kepala Urusan Tata Usaha dan Umum", level: 3 },
  { id: 4, name: "Kepala Urusan Keuangan", level: 3 },
  { id: 5, name: "Kepala Urusan Perencanaan", level: 3 },

  // Level 3 – Kepala Seksi (KASI)
  { id: 6, name: "Kepala Seksi Pemerintahan", level: 3 },
  { id: 7, name: "Kepala Seksi Kesejahteraan", level: 3 },
  { id: 8, name: "Kepala Seksi Pelayanan", level: 3 },

  // Level 4 – Kewilayahan
  { id: 9, name: "Kepala Dusun", level: 4 },
  { id: 10, name: "Kepala RW", level: 4 },
  { id: 11, name: "Kepala RT", level: 4 },

  // Level 5 – Staf & Pelaksana
  { id: 12, name: "Staf Administrasi Desa", level: 5 },
  { id: 13, name: "Staf Keuangan Desa", level: 5 },
  { id: 14, name: "Operator Sistem Informasi Desa", level: 5 },
  { id: 15, name: "Petugas Pelayanan Umum", level: 5 },

  // Level 6 – Lembaga Desa (opsional, non-struktural)
  { id: 16, name: "Ketua BPD", level: 6 },
  { id: 17, name: "Wakil Ketua BPD", level: 6 },
  { id: 18, name: "Sekretaris BPD", level: 6 },
  { id: 19, name: "Anggota BPD", level: 6 },

  // Level 6 – Lembaga Kemasyarakatan
  { id: 20, name: "Ketua LPM", level: 6 },
  { id: 21, name: "Ketua PKK", level: 6 },
  { id: 22, name: "Ketua Karang Taruna", level: 6 },
];

export const POSITION_OPTIONS: Record<number, string> = {
  1: "Kepala Desa",
  2: "Sekretaris Desa",
  3: "Kepala Urusan Tata Usaha dan Umum",
  4: "Kepala Urusan Keuangan",
  5: "Kepala Urusan Perencanaan",
  6: "Kepala Seksi Pemerintahan",
  7: "Kepala Seksi Kesejahteraan",
  8: "Kepala Seksi Pelayanan",
  9: "Kepala Dusun",
  10: "Kepala RW",
  11: "Kepala RT",
  12: "Staf Administrasi Desa",
  13: "Staf Keuangan Desa",
  14: "Operator Sistem Informasi Desa",
  15: "Petugas Pelayanan Umum",
  16: "Ketua BPD",
  17: "Wakil Ketua BPD",
  18: "Sekretaris BPD",
  19: "Anggota BPD",
  20: "Ketua LPM",
  21: "Ketua PKK",
  22: "Ketua Karang Taruna",
};
