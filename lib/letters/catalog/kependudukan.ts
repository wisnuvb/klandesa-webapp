/** Katalog surat kependudukan tingkat desa (kategori "Kependudukan"). Proses resmi tetap di dukcapil. */
import {
  field, f, judul, kadesSignature, letter, para, pembuka, pemohonData, penutup,
  personData, saksiGroup, saksiKadesSignature, t,
  PEMOHON_NARASI,
  type CatalogEntry, type GroupIn,
} from "./helpers";

/** Anggota keluarga yang ikut pindah/datang (boleh kosong). */
const pengikutGroup = (): GroupIn => ({
  id: "pengikut", label: "Pengikut (anggota keluarga)", min: 0, max: 15, personRows: true,
  fields: [
    field("nama", "Nama", "text"),
    field("nik", "NIK", "text"),
    field("hubungan_keluarga", "Hubungan dalam keluarga", "text"),
  ],
});

const tabelPengikut = (id = "tabel_pengikut") => ({
  id, type: "repeatTable" as const, group: "pengikut",
  columns: [
    { label: "Nama", field: "nama" },
    { label: "NIK", field: "nik" },
    { label: "Hubungan", field: "hubungan_keluarga" },
  ],
});

export const KEPENDUDUKAN: CatalogEntry[] = [
  {
    catalogKey: "cat_kep_sk_pindah",
    name: "Surat Keterangan Pindah",
    description: "Keterangan pindah antar wilayah (sesuaikan formulir dukcapil).",
    category: "Kependudukan",
    document: letter({
      klasifikasi: "474",
      fields: [
        field("alamat_tujuan", "Alamat tujuan pindah", "longtext"),
        // Pilihan alasan pindah mengikuti kategori umum administrasi kependudukan; desa dapat menyesuaikan.
        field("alasan_pindah", "Alasan pindah", "choice", {
          options: ["Pekerjaan", "Pendidikan", "Keamanan", "Kesehatan", "Perumahan", "Keluarga", "Lainnya"],
        }),
        field("tanggal_pindah", "Rencana tanggal pindah", "date"),
      ],
      groups: [pengikutGroup()],
      body: [
        judul("SURAT KETERANGAN PINDAH"),
        pembuka(),
        pemohonData(PEMOHON_NARASI),
        para(
          "isi",
          t("Bermaksud pindah dari desa kami ke "),
          f("isian.alamat_tujuan"),
          t(" pada tanggal "),
          f("isian.tanggal_pindah"),
          t(" dengan alasan "),
          f("isian.alasan_pindah", "lower"),
          t("."),
        ),
        para("pengikut_intro", t("Anggota keluarga yang turut pindah (bila ada):")),
        tabelPengikut(),
        para("catatan", t("Keterangan ini diberikan untuk melengkapi administrasi kependudukan.")),
        penutup(),
        kadesSignature(),
      ],
    }),
  },
  {
    catalogKey: "cat_kep_sk_datang",
    name: "Surat Keterangan Datang",
    description: "Warga yang datang dari luar desa (penduduk sementara/pindah masuk).",
    category: "Kependudukan",
    document: letter({
      klasifikasi: "474",
      fields: [
        field("alamat_asal", "Alamat asal", "longtext"),
        field("tanggal_datang", "Tanggal datang", "date"),
        field("status_tinggal", "Status tinggal", "choice", { options: ["Pindah menetap", "Tinggal sementara"] }),
      ],
      groups: [pengikutGroup()],
      body: [
        judul("SURAT KETERANGAN DATANG"),
        pembuka(),
        pemohonData(PEMOHON_NARASI),
        para(
          "isi",
          t("Datang dari "),
          f("isian.alamat_asal"),
          t(" pada tanggal "),
          f("isian.tanggal_datang"),
          t(" dan bertempat tinggal di desa kami dengan status "),
          f("isian.status_tinggal", "lower"),
          t("."),
        ),
        para("pengikut_intro", t("Anggota keluarga yang turut datang (bila ada):")),
        tabelPengikut(),
        para("catatan", t("Keterangan ini diberikan untuk keperluan administrasi kependudukan.")),
        penutup(),
        kadesSignature(),
      ],
    }),
  },
  {
    // Bayi belum tentu tercatat sebagai warga: diisi manual; ayah/ibu dipilih dari data warga dan ditampilkan berdampingan.
    catalogKey: "cat_kep_sk_lahir",
    name: "Surat Keterangan Kelahiran (tingkat desa)",
    description: "Ringkasan data kelahiran — proses resmi tetap di catatan sipil/kabupaten.",
    category: "Kependudukan",
    document: letter({
      klasifikasi: "474",
      people: [
        { id: "pemohon", label: "Pelapor" },
        { id: "bayi", label: "Anak yang lahir" },
        { id: "ayah", label: "Ayah" },
        { id: "ibu", label: "Ibu" },
      ],
      fields: [
        field("jam_lahir", "Pukul lahir", "text", { required: false, placeholder: "mis. 06.30 WIB" }),
        field("anak_ke", "Anak ke-", "number", { required: false }),
        field("hubungan_pelapor", "Hubungan pelapor dengan anak", "choice", { options: ["Ayah", "Ibu", "Kakek/Nenek", "Lainnya"] }),
      ],
      groups: [saksiGroup(2, 2)],
      body: [
        judul("SURAT KETERANGAN KELAHIRAN"),
        pembuka(),
        para("lahir", t("Telah lahir seorang anak dengan data sebagai berikut:")),
        personData("bayi", ["nama", "jenis_kelamin", "ttl"], "data_bayi"),
        { id: "jam", type: "conditional", when: { ref: "isian.jam_lahir", op: "filled" }, children: [
          para("jam_kalimat", t("Lahir pada pukul "), f("isian.jam_lahir"), t(".")),
        ] },
        { id: "urut", type: "conditional", when: { ref: "isian.anak_ke", op: "filled" }, children: [
          para("urut_kalimat", t("Merupakan anak ke-"), f("isian.anak_ke"), t(".")),
        ] },
        para("ortu", t("Dari orang tua:")),
        {
          id: "orang_tua", type: "columns", ratios: [1, 1],
          children: [
            [para("label_ayah", t("Ayah", ["b"])), personData("ayah", ["nama", "nik", "pekerjaan", "alamat_lengkap"], "data_ayah", 28)],
            [para("label_ibu", t("Ibu", ["b"])), personData("ibu", ["nama", "nik", "pekerjaan", "alamat_lengkap"], "data_ibu", 28)],
          ],
        },
        para("pelapor", t("Dilaporkan oleh "), f("pemohon.nama"), t(" ("), f("isian.hubungan_pelapor", "lower"), t(") sebagai pengantar/pendukung administrasi.")),
        penutup(),
        saksiKadesSignature(),
      ],
    }),
  },
  {
    catalogKey: "cat_kep_sk_mati",
    name: "Surat Keterangan Kematian (tingkat desa)",
    description: "Rangkuman administrasi kematian — menyesuaikan format dinas setempat.",
    category: "Kependudukan",
    document: letter({
      klasifikasi: "474",
      people: [{ id: "pemohon", label: "Pelapor" }, { id: "almarhum", label: "Almarhum/ah" }],
      fields: [
        field("tempat_meninggal", "Tempat meninggal", "text"),
        field("jam_meninggal", "Pukul meninggal", "text", { required: false }),
        // Data medis: disembunyikan dari daftar dan dicatat saat dibuka.
        field("sebab", "Sebab kematian", "text", { required: false, sensitive: true }),
        field("makam", "Tempat dimakamkan", "text", { required: false }),
        field("hubungan_pelapor", "Hubungan pelapor dengan almarhum/ah", "choice", {
          options: ["Anak", "Istri/Suami", "Saudara", "Orang tua", "Lainnya"],
        }),
      ],
      groups: [saksiGroup(2, 2)],
      body: [
        judul("SURAT KETERANGAN KEMATIAN"),
        pembuka(),
        personData("almarhum", ["nama", "nik", "ttl", "jenis_kelamin", "agama", "alamat_lengkap"], "data_almarhum"),
        para(
          "isi",
          t("Telah meninggal dunia pada hari "),
          f("almarhum.tanggal_meninggal", "hari"),
          t(", tanggal "),
          f("almarhum.tanggal_meninggal", "tanggal"),
          t(", bertempat di "),
          f("isian.tempat_meninggal"),
          t("."),
        ),
        { id: "jam", type: "conditional", when: { ref: "isian.jam_meninggal", op: "filled" }, children: [
          para("jam_kalimat", t("Waktu meninggal: pukul "), f("isian.jam_meninggal"), t(".")),
        ] },
        { id: "sebab", type: "conditional", when: { ref: "isian.sebab", op: "filled" }, children: [
          para("sebab_kalimat", t("Penyebab kematian: "), f("isian.sebab"), t(".")),
        ] },
        { id: "makam", type: "conditional", when: { ref: "isian.makam", op: "filled" }, children: [
          para("makam_kalimat", t("Dimakamkan di "), f("isian.makam"), t(".")),
        ] },
        para("pelapor", t("Dilaporkan oleh "), f("pemohon.nama"), t(" ("), f("isian.hubungan_pelapor", "lower"), t("). Keterangan ini diberikan untuk keperluan administrasi keluarga/ahli waris.")),
        penutup(),
        saksiKadesSignature(),
      ],
    }),
  },
  {
    catalogKey: "cat_kep_skpwni",
    name: "Surat Keterangan Baru Pindah dari Luar (kerangka SKPWNI)",
    description: "Kerangka surat pindah datang WNI — sesuaikan nomor dan format resmi daerah.",
    category: "Kependudukan",
    document: letter({
      klasifikasi: "474",
      fields: [
        field("daerah_asal", "Daerah asal", "longtext"),
        field("no_skpwni", "Nomor surat pindah dari daerah asal", "text", { required: false }),
        field("tanggal_skpwni", "Tanggal surat pindah", "date", { required: false }),
        field("tanggal_datang", "Tanggal datang", "date"),
      ],
      groups: [pengikutGroup()],
      body: [
        judul("SURAT KETERANGAN PINDAH DATANG WNI"),
        pembuka(),
        pemohonData(PEMOHON_NARASI),
        para(
          "isi",
          t("Baru pindah datang dari "),
          f("isian.daerah_asal"),
          t(" pada tanggal "),
          f("isian.tanggal_datang"),
          t(" dan bertempat tinggal di alamat tersebut di atas."),
        ),
        { id: "skpwni", type: "conditional", when: { ref: "isian.no_skpwni", op: "filled" }, children: [
          para("skpwni_kalimat", t("Berdasarkan surat pindah nomor "), f("isian.no_skpwni"), t(" tanggal "), f("isian.tanggal_skpwni", undefined, "-"), t(".")),
        ] },
        para("pengikut_intro", t("Anggota keluarga yang turut datang (bila ada):")),
        tabelPengikut(),
        para("catatan", t("Keterangan ini diberikan untuk administrasi pencatatan sipil kependudukan.")),
        penutup(),
        kadesSignature(),
      ],
    }),
  },
];
