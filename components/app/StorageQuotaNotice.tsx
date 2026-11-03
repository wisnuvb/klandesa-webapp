import Link from "next/link";
import { AlertTriangle, HardDrive } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { StorageUsageSummary } from "@/lib/digitalArchive/quota-level";

function formatBytes(bytes: number): string {
  const gb = bytes / 1024 ** 3;
  if (gb >= 1) return `${gb.toFixed(gb >= 10 ? 0 : 1)} GB`;
  return `${Math.max(0, Math.round(bytes / 1024 ** 2))} MB`;
}

/** Peringatan kuota penyimpanan desa di dashboard: muncul saat pemakaian ≥80%, dan tegas saat penuh. */
export function StorageQuotaNotice({ storage }: { storage: StorageUsageSummary | null | undefined }) {
  if (!storage || storage.level === "ok") return null;
  const full = storage.level === "full";

  return (
    <div
      role={full ? "alert" : "status"}
      className={`rounded-lg border p-4 ${full ? "border-red-200 bg-red-50 text-red-900" : "border-amber-200 bg-amber-50 text-amber-900"}`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-3">
          {full ? <AlertTriangle aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0" /> : <HardDrive aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0" />}
          <div className="space-y-1 text-sm">
            <p className="font-semibold">
              {full
                ? "Penyimpanan desa penuh. Unggahan baru ditolak."
                : `Penyimpanan desa hampir penuh (${storage.percent}% terpakai).`}
            </p>
            <p>
              Terpakai {formatBytes(storage.usedBytes)} dari {formatBytes(storage.limitBytes)}.
              {full
                ? " Dokumen arsip tidak bisa diunggah, dan warga tidak bisa mengunggah foto profil, laporan, bukti iuran, maupun produk UKM."
                : " Bila penuh, dokumen arsip dan foto dari aplikasi warga tidak bisa diunggah lagi."}
            </p>
            <p className="text-xs opacity-90">
              Kuota ini dipakai bersama oleh Arsip Digital dan foto dari aplikasi warga
              {storage.chargedMediaBytes > 0 ? ` (foto aplikasi saat ini ${formatBytes(storage.chargedMediaBytes)})` : ""}.
              Hanya foto di halaman Warga yang gratis. Hapus berkas yang tidak perlu atau tambah kapasitas.
            </p>
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button size="sm" variant="outline" className="bg-background/60" asChild>
            <Link href="/arsip">Lihat Pemakaian</Link>
          </Button>
          <Button size="sm" variant={full ? "destructive" : "default"} asChild>
            <Link href="/billing">Tambah Kapasitas</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
