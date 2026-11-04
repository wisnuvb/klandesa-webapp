import Link from "next/link";
import { ArrowRight, KeyRound } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

/** Panduan singkat: cara memberi perangkat desa akses login ke dashboard. */
export function AccountAccessGuide({ canManage }: { canManage: boolean }) {
  return (
    <Alert>
      <KeyRound className="h-4 w-4" aria-hidden="true" />
      <AlertTitle>Memberi akses login ke dashboard</AlertTitle>
      <AlertDescription>
        {canManage ? (
          <p>
            Perangkat yang berlabel <strong>Belum punya akun</strong> bisa langsung dibuatkan akun lewat tombol <strong>Buat akun</strong> di barisnya; undangan dikirim ke email mereka. Untuk mengatur peran, izin per modul, mengirim ulang undangan, atau menonaktifkan akun, buka{" "}
            <Link href="/akses-pengguna" className="inline-flex items-center gap-1 font-medium text-primary underline underline-offset-2">
              Akses Pengguna
              <ArrowRight className="h-3 w-3" aria-hidden="true" />
            </Link>
            .
          </p>
        ) : (
          <p>Label di kolom <strong>Akun</strong> menunjukkan apakah perangkat sudah bisa masuk ke dashboard. Pembuatan dan pengaturan akun hanya bisa dilakukan Admin Desa.</p>
        )}
      </AlertDescription>
    </Alert>
  );
}
