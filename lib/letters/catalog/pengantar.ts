/** Katalog surat pengantar & pernyataan (kategori "Pengantar"). Berbentuk surat biasa dengan kepala Nomor/Lampiran/Perihal. */
import {
  KEPERLUAN, PEMOHON_IDENTITAS, PEMOHON_RINGKAS, br, f, field, kadesSignature,
  judul, letter, memo, para, pemohonData, penutup, personData, t,
  type CatalogEntry,
} from "./helpers";

const PENGANTAR_TERIMA = "Sehubungan dengan hal tersebut, kami mohon kepada yang berwenang agar permohonan warga kami dapat dipergunakan dan diproses seperlunya.";

/** Pembuka pengantar: identitas pemohon didahului kalimat Kepala Desa. */
const pembukaPengantar = () =>
  para(
    "pembuka",
    t("Yang bertanda tangan di bawah ini Kepala Desa "),
    f("desa.nama"),
    t(", Kecamatan "),
    f("desa.kecamatan"),
    t(", Kabupaten "),
    f("desa.kabupaten"),
    t(", menerangkan bahwa:"),
  );

export const PENGANTAR: CatalogEntry[] = [
  {
    catalogKey: "cat_pg_kk",
    name: "Surat Pengantar Permohonan KK",
    description: "Pengantar ke dinas kependudukan untuk pembaruan/penggantian KK.",
    category: "Pengantar",
    document: letter({
      kind: "surat_biasa",
      klasifikasi: "474",
      fields: [KEPERLUAN],
      // Anggota keluarga yang ikut diurus (boleh kosong).
      groups: [
        {
          id: "anggota", label: "Anggota keluarga yang diurus", min: 0, max: 15, personRows: true,
          fields: [
            field("nama", "Nama", "text"),
            field("nik", "NIK", "text"),
            field("hubungan_keluarga", "Hubungan dalam keluarga", "text"),
          ],
        },
      ],
      body: [
        memo("Pengantar permohonan Kartu Keluarga", [t("Kepala Dinas Kependudukan dan Pencatatan Sipil"), br, t("Kabupaten "), f("desa.kabupaten")]),
        pembukaPengantar(),
        pemohonData(PEMOHON_IDENTITAS),
        para("isi", t("Adalah benar warga desa kami dan mengajukan permohonan Kartu Keluarga sehubungan dengan: "), f("isian.keperluan"), t(".")),
        {
          id: "tabel_anggota", type: "repeatTable", group: "anggota",
          columns: [
            { label: "Nama", field: "nama" },
            { label: "NIK", field: "nik" },
            { label: "Hubungan", field: "hubungan_keluarga" },
          ],
        },
        para("terima", t(PENGANTAR_TERIMA)),
        penutup("pengantar"),
        kadesSignature(),
      ],
    }),
  },
  {
    catalogKey: "cat_pg_ktp",
    name: "Surat Pengantar Permohonan KTP / KTP-el",
    description: "Pengantar ke dukcapil untuk penerbitan/penggantian KTP.",
    category: "Pengantar",
    document: letter({
      kind: "surat_biasa",
      klasifikasi: "474",
      fields: [
        field("jenis_permohonan", "Jenis permohonan", "choice", {
          options: ["Pembuatan baru", "Perpanjangan/penggantian", "KTP hilang", "KTP rusak", "Perubahan data"],
        }),
        field("keterangan", "Keterangan tambahan", "text", { required: false }),
      ],
      body: [
        memo("Pengantar permohonan KTP / KTP-el", [t("Kepala Dinas Kependudukan dan Pencatatan Sipil"), br, t("Kabupaten "), f("desa.kabupaten")]),
        pembukaPengantar(),
        pemohonData(PEMOHON_IDENTITAS),
        para("isi", t("Adalah benar warga desa kami dan mengajukan permohonan KTP/KTP-el dengan jenis permohonan: "), f("isian.jenis_permohonan", "lower"), t(".")),
        { id: "ket", type: "conditional", when: { ref: "isian.keterangan", op: "filled" }, children: [
          para("ket_kalimat", t("Keterangan: "), f("isian.keterangan"), t(".")),
        ] },
        para("terima", t(PENGANTAR_TERIMA)),
        penutup("pengantar"),
        kadesSignature(),
      ],
    }),
  },
  {
    // Calon pasangan = orang kedua; bagian izin orang tua tampil bila calon pengantin di bawah 21 tahun (N5).
    // Nomor/nama formulir N1–N7 berbeda antar sumber, jadi tidak di-hardcode di sini.
    catalogKey: "cat_pg_nikah",
    name: "Surat Pengantar Nikah (pengantar umum)",
    description: "Pengantar ke KUA/instansi nikah — sesuaikan formulir N1–N7 setempat.",
    category: "Pengantar",
    document: letter({
      kind: "surat_biasa",
      klasifikasi: "474",
      people: [
        { id: "pemohon", label: "Calon pengantin (pemohon)" },
        { id: "pasangan", label: "Calon pasangan" },
        { id: "ortu", label: "Orang tua/wali", required: false },
      ],
      fields: [
        field("di_bawah_21", "Calon pengantin di bawah 21 tahun?", "choice", { options: ["Ya", "Tidak"] }),
        field("rencana", "Rencana akad nikah", "text", { required: false, placeholder: "mis. tanggal dan tempat" }),
      ],
      body: [
        memo("Pengantar nikah", [t("Kepala KUA Kecamatan "), f("desa.kecamatan")]),
        pembukaPengantar(),
        personData("pemohon", ["nama", "nik", "ttl", "pekerjaan", "status_perkawinan", "alamat_lengkap"], "data_pemohon"),
        para("dengan", t("Bermaksud melangsungkan pernikahan dengan:")),
        personData("pasangan", ["nama", "nik", "ttl", "pekerjaan", "status_perkawinan", "alamat_lengkap"], "data_pasangan"),
        { id: "rencana", type: "conditional", when: { ref: "isian.rencana", op: "filled" }, children: [
          para("rencana_kalimat", t("Rencana akad nikah: "), f("isian.rencana"), t(".")),
        ] },
        { id: "izin", type: "conditional", when: { ref: "isian.di_bawah_21", op: "eq", value: "Ya" }, children: [
          para("izin_kalimat", t("Karena calon pengantin belum berusia 21 tahun, pernikahan ini dilakukan dengan izin orang tua/wali, yaitu "), f("ortu.nama"), t(".")),
        ] },
        para("terima", t(PENGANTAR_TERIMA)),
        penutup("pengantar"),
        kadesSignature(),
      ],
    }),
  },
  {
    catalogKey: "cat_pg_skck",
    name: "Surat Pengantar SKCK",
    description: "Pengantar ke kepolisian untuk SKCK (bukan SKCK kepolisian itu sendiri).",
    category: "Pengantar",
    document: letter({
      kind: "surat_biasa",
      klasifikasi: "300",
      fields: [KEPERLUAN],
      body: [
        memo("Pengantar SKCK", [t("Kepala Kepolisian Sektor/Resor setempat")]),
        pembukaPengantar(),
        pemohonData(PEMOHON_IDENTITAS),
        para("isi", t("Adalah benar warga desa kami dan mengajukan SKCK untuk keperluan: "), f("isian.keperluan"), t(".")),
        para("terima", t(PENGANTAR_TERIMA)),
        penutup("pengantar"),
        kadesSignature(),
      ],
    }),
  },
  {
    catalogKey: "cat_pg_izin_keramaian",
    name: "Surat Pengantar Izin Keramaian",
    description: "Pengantar ke polisi untuk hajatan/pertunjukan (sesuai aturan setempat).",
    category: "Pengantar",
    document: letter({
      kind: "surat_biasa",
      klasifikasi: "300",
      fields: [
        field("jenis_acara", "Jenis kegiatan", "text", { placeholder: "mis. hajatan pernikahan" }),
        field("tanggal_acara", "Tanggal kegiatan", "date"),
        field("waktu_acara", "Waktu", "text", { placeholder: "mis. 08.00 – selesai" }),
        field("lokasi_acara", "Lokasi kegiatan", "longtext"),
        field("perkiraan_tamu", "Perkiraan jumlah tamu", "number", { required: false }),
      ],
      body: [
        memo("Pengantar izin keramaian", [t("Kepala Kepolisian Sektor setempat")]),
        pembukaPengantar(),
        pemohonData(PEMOHON_RINGKAS),
        para(
          "isi",
          t("Akan mengadakan kegiatan "),
          f("isian.jenis_acara"),
          t(" pada tanggal "),
          f("isian.tanggal_acara"),
          t(", pukul "),
          f("isian.waktu_acara"),
          t(", bertempat di "),
          f("isian.lokasi_acara"),
          t("."),
        ),
        { id: "tamu", type: "conditional", when: { ref: "isian.perkiraan_tamu", op: "filled" }, children: [
          para("tamu_kalimat", t("Perkiraan jumlah tamu yang hadir sekitar "), f("isian.perkiraan_tamu", "angka"), t(" orang.")),
        ] },
        para("terima", t(PENGANTAR_TERIMA)),
        penutup("pengantar"),
        kadesSignature(),
      ],
    }),
  },
  {
    // Pernyataan oleh pemohon sendiri: ditandatangani pemohon di atas materai, diketahui Kepala Desa.
    catalogKey: "cat_prn_belum_menikah",
    name: "Surat Pernyataan Belum / Tidak Menikah (kerangka)",
    description: "Kerangka pernyataan — gunakan paraf & materai sesuai ketentuan setempat.",
    category: "Pengantar",
    document: letter({
      klasifikasi: "474",
      fields: [
        field("status_pernyataan", "Pernyataan", "choice", { options: ["belum pernah menikah", "tidak sedang terikat perkawinan"] }),
        KEPERLUAN,
      ],
      body: [
        judul("SURAT PERNYATAAN"),
        para("pembuka", t("Saya yang bertanda tangan di bawah ini:")),
        pemohonData(PEMOHON_RINGKAS),
        para(
          "isi",
          t("Dengan ini menyatakan dengan sebenarnya bahwa saya "),
          f("isian.status_pernyataan"),
          t(" untuk keperluan "),
          f("isian.keperluan"),
          t(". Apabila pernyataan ini tidak benar, saya bersedia mempertanggungjawabkannya secara hukum."),
        ),
        penutup("pernyataan"),
        {
          id: "ttd", type: "signature",
          dateline: [f("desa.nama"), t(", "), f("surat.tanggal", "tanggal")],
          slots: [
            { id: "pemohon", who: { kind: "peran", role: "pemohon" }, caption: [t("Yang menyatakan,")], materai: true },
            { id: "kades", who: { kind: "pejabat", official: "kades" }, caption: [t("Mengetahui,")], stamp: true },
          ],
        },
      ],
    }),
  },
];
