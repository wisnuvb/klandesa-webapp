/**
 * Kosakata modul Keamanan & ketertiban (murni, aman untuk klien).
 *
 * Yang bersumber dari teks resmi diberi rujukan pasal (lihat tabel sumber [V]/[R] di docs/PHASE3_KEAMANAN.md):
 *  - Struktur, syarat, regu, dan sebab berhenti Satlinmas: Permendagri 26/2020 Pasal 13-16, 19, 25 [V].
 *  - Satkamling/ronda (dibentuk warga, dilaporkan ke Polri lewat Polsek, perlengkapan pos): Perpol 4/2020 Pasal 35-41, diubah Perpol 1/2023 (hanya seragam) [V].
 * Selain itu (katalog jenis perlengkapan, jenis kerawanan, hasil mediasi, ambang peringatan) adalah KEBIJAKAN APLIKASI, bukan aturan.
 */

export const RESOURCE = "keamanan" as const;

/** Struktur Satlinmas, Permendagri 26/2020 Pasal 13 ayat 1 [V]. */
export const MEMBER_ROLES = {
  KEPALA_SATLINMAS: "Kepala Satlinmas (Kepala Desa)",
  KEPALA_PELAKSANA: "Kepala pelaksana",
  KOMANDAN_REGU: "Komandan regu",
  ANGGOTA: "Anggota",
} as const;
export type MemberRole = keyof typeof MEMBER_ROLES;
export const isMemberRole = (v: unknown): v is MemberRole => typeof v === "string" && Object.hasOwn(MEMBER_ROLES, v);

/** Jenis regu, Permendagri 26/2020 Pasal 19 huruf a-e [V]. */
export const SQUAD_KINDS = {
  SIAGA_DINI: "Regu kesiapsiagaan dan kewaspadaan dini",
  PENGAMANAN: "Regu pengamanan",
  PERTOLONGAN_PERTAMA: "Regu pertolongan pertama korban bencana dan kebakaran",
  PENYELAMATAN: "Regu penyelamatan dan evakuasi",
  DAPUR_UMUM: "Regu dapur umum",
} as const;
export type SquadKind = keyof typeof SQUAD_KINDS;
export const isSquadKind = (v: unknown): v is SquadKind => typeof v === "string" && Object.hasOwn(SQUAD_KINDS, v);

export const MEMBER_STATUSES = { ACTIVE: "Aktif", ENDED: "Berakhir" } as const;
export type MemberStatus = keyof typeof MEMBER_STATUSES;

/** Sebab berakhirnya keanggotaan, Permendagri 26/2020 Pasal 25 ayat 1 dan 5 huruf a-g [V]. USIA = mencapai batas usia (ayat 1, 3). */
export const END_REASONS = {
  USIA: "Mencapai batas usia (60 tahun, atau 65 tahun bila diperpanjang)",
  MENINGGAL: "Meninggal dunia",
  MENGUNDURKAN_DIRI: "Mengundurkan diri atas permintaan sendiri",
  PINDAH: "Pindah tempat tinggal",
  TIDAK_SEHAT: "Tidak lagi memenuhi persyaratan kesehatan jasmani dan rohani",
  TINDAK_PIDANA: "Perbuatan tercela dan/atau tindak pidana berkekuatan hukum tetap",
  TIDAK_MELAKSANAKAN_TUGAS: "Tidak melaksanakan tugas pokok dan fungsi dan/atau janji sebagai anggota",
  PENGURUS_PARTAI: "Menjadi pengurus partai politik",
} as const;
export type EndReason = keyof typeof END_REASONS;
export const isEndReason = (v: unknown): v is EndReason => typeof v === "string" && Object.hasOwn(END_REASONS, v);

/**
 * Batas usia: syarat usia calon paling rendah 18 tahun dan/atau sudah menikah (Pasal 15 huruf e [V]); keanggotaan berakhir sampai usia 60 tahun,
 * dapat diperpanjang sampai 65 tahun bila masih memenuhi persyaratan (Pasal 25 ayat 1, 3 [V]); perpanjangan ditetapkan keputusan Kepala Desa (ayat 4).
 */
export const AGE = { min: 18, end: 60, extendedEnd: 65 } as const;

export const EQUIPMENT_CATEGORIES = {
  SERAGAM: "Seragam dan atribut",
  KOMUNIKASI: "Alat komunikasi (HT, kentongan, alarm)",
  PENERANGAN: "Penerangan (senter, lampu)",
  P3K: "Perlengkapan pertolongan pertama dan bencana",
  POS: "Pos ronda/pos Satlinmas",
  KENDARAAN: "Kendaraan",
  LAINNYA: "Lainnya",
} as const;
export type EquipmentCategory = keyof typeof EQUIPMENT_CATEGORIES;
export const isEquipmentCategory = (v: unknown): v is EquipmentCategory => typeof v === "string" && Object.hasOwn(EQUIPMENT_CATEGORIES, v);

export const CONDITIONS = { BAIK: "Baik", PERLU_PERBAIKAN: "Perlu perbaikan", RUSAK: "Rusak", BELUM_DIPERIKSA: "Belum diperiksa" } as const;
export type Condition = keyof typeof CONDITIONS;
export const isCondition = (v: unknown): v is Condition => typeof v === "string" && Object.hasOwn(CONDITIONS, v);

/** Kehadiran ronda. */
export const ATTENDANCE = { PENDING: "Belum dicatat", PRESENT: "Hadir", LATE: "Terlambat", ABSENT: "Tidak hadir", EXCUSED: "Izin" } as const;
export type Attendance = keyof typeof ATTENDANCE;
export const isAttendance = (v: unknown): v is Attendance => typeof v === "string" && Object.hasOwn(ATTENDANCE, v);
/** Yang boleh dipilih operator saat mencatat (PENDING = mengosongkan). */
export const MARKABLE: Attendance[] = ["PRESENT", "LATE", "ABSENT", "EXCUSED", "PENDING"];

export const SHIFT_SOURCES = { GENERATED: "Hasil pembuatan jadwal", MANUAL: "Dicatat manual", SWAP: "Hasil tukar/ganti" } as const;
export type ShiftSource = keyof typeof SHIFT_SOURCES;

export const SWAP_STATUSES = { PENDING: "Menunggu keputusan", APPROVED: "Disetujui", REJECTED: "Ditolak", CANCELLED: "Dibatalkan" } as const;
export type SwapStatus = keyof typeof SWAP_STATUSES;

export const RONDA_LOG_KINDS = { NIHIL: "Situasi aman", TEMUAN: "Temuan" } as const;
export type RondaLogKind = keyof typeof RONDA_LOG_KINDS;
export const isRondaLogKind = (v: unknown): v is RondaLogKind => typeof v === "string" && Object.hasOwn(RONDA_LOG_KINDS, v);

/** Hasil mediasi: kosakata aplikasi. */
export const MEDIATION_STATUSES = { SCHEDULED: "Dijadwalkan", COMPLETED: "Telah dilaksanakan", CANCELLED: "Dibatalkan" } as const;
export type MediationStatus = keyof typeof MEDIATION_STATUSES;
export const MEDIATION_OUTCOMES = {
  SEPAKAT: "Sepakat",
  SEPAKAT_SEBAGIAN: "Sepakat sebagian",
  TIDAK_SEPAKAT: "Tidak sepakat",
  DITUNDA: "Ditunda",
  DIRUJUK: "Dirujuk ke pihak lain",
} as const;
export type MediationOutcome = keyof typeof MEDIATION_OUTCOMES;
export const isMediationOutcome = (v: unknown): v is MediationOutcome => typeof v === "string" && Object.hasOwn(MEDIATION_OUTCOMES, v);

export const PARTY_SIDES = { PIHAK_A: "Pihak pertama", PIHAK_B: "Pihak kedua", SAKSI: "Saksi", PENDAMPING: "Pendamping/wali" } as const;
export type PartySide = keyof typeof PARTY_SIDES;
export const isPartySide = (v: unknown): v is PartySide => typeof v === "string" && Object.hasOwn(PARTY_SIDES, v);

export const FOLLOWUP_STATUSES = { OPEN: "Belum selesai", DONE: "Selesai" } as const;
export type FollowupStatus = keyof typeof FOLLOWUP_STATUSES;

/** Jenis kerawanan: kosakata aplikasi (penilaian setempat). */
export const RISK_KINDS = {
  PENCURIAN: "Rawan pencurian",
  LAKA_LANTAS: "Rawan kecelakaan lalu lintas",
  PERKELAHIAN: "Rawan perkelahian/keributan",
  MIRAS_NARKOBA: "Rawan minuman keras/penyalahgunaan zat",
  GELAP_SEPI: "Minim penerangan/sepi",
  KEBAKARAN: "Rawan kebakaran",
  LAINNYA: "Lainnya",
} as const;
export type RiskKind = keyof typeof RISK_KINDS;
export const isRiskKind = (v: unknown): v is RiskKind => typeof v === "string" && Object.hasOwn(RISK_KINDS, v);
export const RISK_LEVELS = { LOW: "Rendah", MEDIUM: "Sedang", HIGH: "Tinggi" } as const;
export type RiskLevel = keyof typeof RISK_LEVELS;
export const isRiskLevel = (v: unknown): v is RiskLevel => typeof v === "string" && Object.hasOwn(RISK_LEVELS, v);

/** Kontak layanan setempat (direktori yang disunting desa). */
export const CONTACT_KINDS = {
  POLSEK: "Polsek",
  BABINKAMTIBMAS: "Bhabinkamtibmas",
  KORAMIL: "Koramil/Babinsa",
  UPTD_PPA: "UPTD PPA / P2TP2A (perempuan dan anak)",
  PUSKESMAS: "Puskesmas / layanan kesehatan",
  DAMKAR: "Pemadam kebakaran",
  SATPOL_PP: "Satpol PP / Satlinmas kabupaten",
  LAINNYA: "Lainnya",
} as const;
export type ContactKind = keyof typeof CONTACT_KINDS;
export const isContactKind = (v: unknown): v is ContactKind => typeof v === "string" && Object.hasOwn(CONTACT_KINDS, v);

/**
 * Rujukan nasional untuk kekerasan terhadap perempuan/anak. STATUS [R] (belum diverifikasi): nomor dibaca dari ringkasan hasil pencarian
 * situs resmi KemenPPPA (halaman aslinya menolak diakses otomatis, HTTP 403); Polri 110 dari pengetahuan umum. Ditampilkan berlabel "cek ulang";
 * yang berlaku bagi warga desa ini adalah direktori kontak setempat yang disunting desa (CONTACT_KINDS.UPTD_PPA).
 */
export const NATIONAL_REFERRALS = [
  { name: "SAPA 129 (KemenPPPA): telepon", value: "129", note: "Layanan pengaduan kekerasan terhadap perempuan dan anak. Dirujuk ke layanan di daerah." },
  { name: "SAPA 129 (KemenPPPA): WhatsApp", value: "08111-129-129", note: "Pesan teks; kerahasiaan pelapor dijaga oleh layanan." },
  { name: "Kepolisian (darurat)", value: "110", note: "Untuk kejadian yang sedang berlangsung atau korban dalam bahaya." },
] as const;

/**
 * Daftar penjaga teks kekerasan terhadap perempuan/anak (lihat calc.sensitiveViolenceTerm). STATUS [R]: istilah diturunkan dari bentuk tindak pidana
 * yang disebut ringkasan sekunder UU 12/2022 (TPKS) Pasal 4 dan UU 23/2004 (PKDRT); teks kedua UU TIDAK dibaca penuh. Ini daftar kata kunci
 * pagar, bukan definisi hukum, dan sengaja luas (lebih baik menolak kalimat sah daripada menyimpan data korban).
 */
/** Akar kata: cocok bila MUNCUL di dalam kata (mencakup imbuhan: diperkosa, memperkosa, pencabulan, dirudapaksa, ...). */
export const SENSITIVE_STEMS = ["perkosa", "merkosa", "rudapaksa", "cabul", "asusila", "persetubuhan", "sodomi", "pedofil", "incest", "trafficking", "seksual"] as const;
/** Akar kata yang aman dicocokkan pada teks tanpa spasi/tanda baca ("per-kosa"); yang pendek dikecualikan agar tidak salah tangkap lintas kata ("tata susila"). */
export const SENSITIVE_SQUASH_STEMS = ["perkosa", "merkosa", "rudapaksa", "persetubuhan", "pedofil"] as const;
/** Kata utuh (bukan bagian kata lain). */
export const SENSITIVE_EXACT = ["kdrt", "inses", "tppo"] as const;
/** Frasa (dicocokkan pada teks berspasi dan tanpa spasi). */
export const SENSITIVE_PHRASES = [
  "kekerasan dalam rumah tangga",
  "kekerasan dalam pacaran",
  "kekerasan seksual",
  "kekerasan berbasis gender",
  "kekerasan terhadap perempuan",
  "kekerasan terhadap anak",
  "kekerasan pada perempuan",
  "kekerasan pada anak",
  "pelecehan seksual",
  "penyiksaan seksual",
  "eksploitasi seksual",
  "perbudakan seksual",
  "pemaksaan perkawinan",
  "pemaksaan aborsi",
  "pemaksaan kontrasepsi",
  "pemaksaan sterilisasi",
  "kawin paksa",
  "perdagangan orang",
  "perdagangan anak",
  "perdagangan perempuan",
  "penelantaran anak",
  "penelantaran rumah tangga",
  "korban kekerasan",
] as const;
/** Gabungan untuk tampilan/uji. */
export const SENSITIVE_TERMS = [...SENSITIVE_STEMS, ...SENSITIVE_EXACT, ...SENSITIVE_PHRASES] as const;

export const LIMITS = {
  members: 1000,
  equipment: 500,
  groups: 100,
  peoplePerGroup: 200,
  maxPerShift: 20,
  scheduleDays: 62,
  shiftsPerGroup: 20000,
  logsPerGroup: 20000,
  mediationsPerEvent: 20,
  partiesPerMediation: 30,
  followupsPerEvent: 100,
  linksPerEvent: 20,
  riskAreas: 500,
  contacts: 100,
  pageSize: 50,
} as const;

/** Rujukan hukum ringkas untuk catatan kaki layar (rincian ada di docs/PHASE3_KEAMANAN.md). */
export const LEGAL_NOTES = [
  "Permendagri 26/2020 (Berita Negara 2020 No. 548) mengatur Satlinmas: dibentuk dan diangkat Kepala Desa (Pasal 12, 16), struktur (Pasal 13), syarat (Pasal 15), regu (Pasal 19), masa keanggotaan (Pasal 25). Peraturan ini mencabut Permendagri 84/2014 (Pasal 42).",
  "Perpol 4/2020 (Berita Negara 2020 No. 868) mengatur Satkamling/ronda: dibentuk warga dan dilaporkan ke Polri lewat Polsek (Pasal 35); pos memuat daftar dan jadwal penugasan serta buku catatan ronda (Pasal 41). Perpol 1/2023 hanya mengubah ketentuan seragam.",
  "Dana Desa operasional boleh dipakai untuk biaya mediasi konflik sosial dan biaya operasional menjaga keamanan/ketertiban (Permendesa PDT 16/2025 Lampiran II.I butir 2.b). Aplikasi ini hanya mencatat; pengeluaran uang tetap lewat SPP/Buku Kas.",
] as const;
