export type SocialProgramNationalResource = {
  title: string;
  description: string;
  /** Alamat web atau deep link aplikasi publik pemerintah. */
  href: string;
  /** "web" | "mobile" untuk gaya akses */
  hint: string;
};

/**
 * Blok hibrid: program utama dikelola data desa melalui Klandesa;
 * status kepastian program nasional tetap mengikuti sumber pusat.
 */
export const SOCIAL_PROGRAM_NATIONAL_RESOURCES: SocialProgramNationalResource[] =
  [
    {
      title: "Cek Bansos Kemensos (Website)",
      description:
        "Layanan pencarian nama penerima manfaat bantuan dari Kementerian Sosial berdasarkan wilayah dan verifikasi kode sesuai aturan Kemensos.",
      href: "https://cekbansos.kemensos.go.id/",
      hint: "web",
    },
    {
      title: "Cek Bansos (Android, Kemensos)",
      description:
        "Informasi aplikasi seluler untuk cek bansos/program terkait Kemensos. Pastikan penerbit di Play Store ialah Kementerian Sosial RI.",
      href: "https://play.google.com/store/apps/details?id=id.go.kemensos.pelaporan&hl=id",
      hint: "mobile",
    },
    {
      title: "Laman Kementerian Sosial",
      description: "Kanal komunikasi umum Kebijakan penyaluran bansos/program kemiskinan pusat.",
      href: "https://www.kemensos.go.id/",
      hint: "web",
    },
  ];

export const SOCIAL_PROGRAM_PUBLIC_DISCLAIMERS = [
  "Informasi dari desa Anda di bawah mencerminkan catatan Pemdes/perangkat desa pengguna layanan ini. Ini bukan penyalinan realtime database pusat seperti DTKS/PKH.",
  "Untuk kepastian program nasional atau status resmi Anda di pemerintah pusat/pemda, gunakan tautan layanan pemerintah yang kami sajikan secara terpisah.",
  "Dengan memasukkan NIK Anda setuju menggunakan layanan pengecekan umum sesuai kebijakan privasi aplikasi ini.",
];
