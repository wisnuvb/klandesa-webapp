import Link from "next/link";
import type { Metadata } from "next";
import { getLandingPageMetadata } from "@/lib/seo/landing-pages";
import { EARLY_ACCESS_LABEL } from "@/lib/marketing/copy";

export const metadata: Metadata = getLandingPageMetadata("platformSdgs");

export default function PlatformSdgsPage() {
  return (
    <article className="max-w-3xl mx-auto px-4 py-20 md:py-28">
      <p className="text-sm font-medium text-[#0d9488] mb-2">{EARLY_ACCESS_LABEL}</p>
      <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
        SDGs &amp; perencanaan pembangunan desa
      </h1>
      <div className="prose prose-gray max-w-none text-gray-600 space-y-4">
        <p>
          Dashboard SDGs menghitung skor hingga{" "}
          <strong>18 tujuan berdasarkan data operasional</strong> desa: warga,
          PKK, BUMDes, keuangan, bansos, dan fitur lain—bukan angka statis.
        </p>
        <p>
          <strong>RPJMDes</strong> menyambung rencana, kegiatan RKPDes, dan
          usulan Musdes dengan prioritas yang mempertimbangkan capaian SDGs.
          <strong> Penanda belanja APBDes</strong> menghubungkan pengeluaran nyata
          pada tujuan pembangunan.
        </p>
        <p>
          <strong>Peta capaian per RT/RW</strong> memvisualkan kerentanan
          dan pola kependudukan sehingga perangkat desa serta pemda dapat membaca
          prioritas wilayah dengan konteks geografis bersama{" "}
          <Link href="/platform" className="text-[#0d9488] font-medium">
            fitur peta dan lingkungan
          </Link>
          .
        </p>
        <p className="text-sm bg-amber-50 border border-amber-100 rounded-xl p-4 text-amber-950">
          Skor di aplikasi membantu keputusan internal desa; pemeriksaan resmi SDGs
          tetap mengikuti prosedur portal Kemendesa.
        </p>
      </div>
      <div className="mt-10 flex flex-wrap gap-4">
        <Link
          href="/platform"
          className="inline-flex rounded-xl bg-[#0d9488] px-5 py-2.5 text-white text-sm font-medium hover:bg-[#0f766e]"
        >
          Kembali ke daftar fitur
        </Link>
        <Link
          href="/platform/integrasi"
          className="inline-flex rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-medium hover:bg-gray-50"
        >
          Unduh format Kemendesa
        </Link>
      </div>
    </article>
  );
}
