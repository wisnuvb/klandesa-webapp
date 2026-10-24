import type { Metadata } from "next";
import { BadgeCheck, ShieldAlert } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { maskPersonName, parseLetterToken } from "@/lib/mobile/letter-verify";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Verifikasi Surat — Klandesa",
  description: "Periksa keaslian surat digital yang diterbitkan desa melalui Klandesa.",
  robots: { index: false, follow: false },
};

function dateId(d: Date): string {
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jakarta" }).format(d);
}

export default async function VerifikasiSuratPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const id = parseLetterToken(decodeURIComponent(token));
  // Satu pesan untuk semua kegagalan (token palsu, surat tidak ada, surat dibatalkan): tidak membocorkan keberadaan surat.
  const letter = id
    ? await prisma.mailService.findFirst({
        where: { id, status: "completed" },
        select: {
          templateName: true, letterNumber: true, letterDate: true, applicantName: true, signerName: true, signerRole: true,
          village: { select: { name: true, district: true, regency: true } },
        },
      })
    : null;

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-xl flex-col gap-6 px-4 py-16">
      {letter ? (
        <>
          <div className="flex items-center gap-3 text-emerald-700">
            <BadgeCheck className="h-10 w-10" aria-hidden />
            <h1 className="text-2xl font-bold">Surat ini tercatat sah</h1>
          </div>
          <dl className="grid grid-cols-[9rem_1fr] gap-x-4 gap-y-3 rounded-xl border p-5 text-sm">
            <dt className="text-muted-foreground">Jenis surat</dt><dd className="font-medium">{letter.templateName}</dd>
            <dt className="text-muted-foreground">Nomor surat</dt><dd className="font-medium">{letter.letterNumber}</dd>
            <dt className="text-muted-foreground">Tanggal surat</dt><dd>{dateId(letter.letterDate)}</dd>
            <dt className="text-muted-foreground">Desa</dt><dd>{letter.village.name}, Kec. {letter.village.district}, {letter.village.regency}</dd>
            <dt className="text-muted-foreground">Pemohon</dt><dd>{maskPersonName(letter.applicantName)}</dd>
            {letter.signerName ? (<><dt className="text-muted-foreground">Penandatangan</dt><dd>{letter.signerName}</dd></>) : null}
          </dl>
          <p className="text-sm text-muted-foreground">
            Surat ini tercatat diterbitkan oleh pemerintah desa melalui Klandesa. Ini pengecekan catatan digital, bukan tanda tangan elektronik
            tersertifikasi. Nama pemohon sengaja disamarkan; cocokkan inisial dan nomor surat dengan dokumen yang Anda terima.
          </p>
        </>
      ) : (
        <>
          <div className="flex items-center gap-3 text-red-700">
            <ShieldAlert className="h-10 w-10" aria-hidden />
            <h1 className="text-2xl font-bold">Surat tidak dapat diverifikasi</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Tautan atau QR ini tidak cocok dengan surat yang tercatat. Surat mungkin tidak asli, sudah dibatalkan, atau tautan rusak. Hubungi kantor desa penerbit untuk memastikan.
          </p>
        </>
      )}
    </main>
  );
}
