import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ClaimAuthButtons } from "@/components/aspirasi/ClaimAuthButtons";
import { btnOutline } from "@/components/aspirasi/ui";
import { areaPath } from "@/lib/aspirasi/slug";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export const metadata: Metadata = {
  title: "Klaim Halaman Aspirasi Desa",
  description: "Cara perangkat desa mengelola halaman aspirasi wilayahnya dan menanggapi laporan warga.",
  robots: { index: false, follow: false },
};

const STEPS = [
  { title: "Daftar atau masuk ke akun Klandesa desa Anda", text: "Gunakan akun desa. Desa yang belum terdaftar dapat mendaftar dan mencoba gratis." },
  { title: "Buka menu Aspirasi Publik di dasbor", text: "Di sana Anda mengajukan klaim untuk wilayah ini dan mengisi jabatan serta bukti." },
  { title: "Ajukan klaim dengan bukti", text: "Misalnya tautan situs resmi desa, nomor SK pengangkatan, atau email resmi desa. Semakin jelas, semakin cepat." },
  { title: "Tim Klandesa memverifikasi", text: "Setelah disetujui, desa Anda dapat menanggapi laporan. Kami mengabari lewat email akun Anda." },
];

export default async function ClaimInfoPage({ params }: Props) {
  const { slug } = await params;
  const area = await prisma.aspirationArea.findUnique({ where: { slug }, select: { name: true, kind: true, district: true, regency: true, province: true, villageId: true, _count: { select: { aspirations: { where: { status: "PUBLISHED" } } } } } });
  if (!area || (area._count.aspirations === 0 && area.villageId == null)) notFound();
  const name = `${area.kind === "kelurahan" ? "Kelurahan" : "Desa"} ${area.name}`;

  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-2xl px-4 pb-16 pt-24 sm:px-6">
        <p className="text-sm font-medium text-teal-800">Untuk perangkat desa</p>
        <h1 className="mt-1 text-balance text-3xl font-semibold text-gray-900">Kelola halaman aspirasi {name}</h1>
        <p className="mt-2 text-lg text-gray-700">
          Kec. {area.district}, {area.regency}, {area.province}
        </p>

        {area.villageId != null ? (
          <p role="status" className="mt-6 rounded-xl border border-emerald-400 bg-emerald-50 p-4 text-base text-emerald-950">
            Halaman ini sudah dikelola sebuah desa terdaftar. Bila ini keliru, hubungi tim Klandesa lewat formulir kontak.
          </p>
        ) : null}

        <section className="mt-8" aria-labelledby="manfaat">
          <h2 id="manfaat" className="text-xl font-semibold text-gray-900">
            Yang didapat desa
          </h2>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-base leading-relaxed text-gray-800">
            <li>Menjawab laporan warga secara resmi dan terbuka: tanggapan, kabar progres, atau tanda selesai.</li>
            <li>Menyampaikan sanggahan bila isi laporan tidak benar, tanpa menunggu pihak lain.</li>
            <li>Mengajukan keberatan bila laporan memuat data pribadi; laporan itu langsung disembunyikan untuk ditinjau.</li>
            <li>Pemberitahuan di dasbor saat ada laporan baru yang tayang di wilayah Anda.</li>
          </ul>
        </section>

        <section className="mt-8" aria-labelledby="langkah">
          <h2 id="langkah" className="text-xl font-semibold text-gray-900">
            Langkahnya
          </h2>
          <ol className="mt-3 space-y-3">
            {STEPS.map((s, i) => (
              <li key={s.title} className="flex gap-3 rounded-2xl border border-gray-200 p-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0f766e] text-base font-semibold text-white" aria-hidden="true">
                  {i + 1}
                </span>
                <div>
                  <p className="text-base font-semibold text-gray-900">
                    <span className="sr-only">Langkah {i + 1}: </span>
                    {s.title}
                  </p>
                  <p className="mt-1 text-base leading-relaxed text-gray-700">{s.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {area.villageId == null ? (
          <div className="mt-8">
            <ClaimAuthButtons slug={slug} />
          </div>
        ) : null}
        <p className="mt-8">
          <Link href={areaPath(slug)} className={btnOutline}>
            Kembali ke halaman {name}
          </Link>
        </p>
      </div>
    </main>
  );
}
