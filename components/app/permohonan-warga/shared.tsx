"use client";

import { AlertTriangle, CheckCircle, Clock, UserCheck, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { QueueRow } from "@/lib/mail/request-queue";

export type { QueueRow, QueueStats } from "@/lib/mail/request-queue";

export const CHANNEL_LABEL: Record<string, string> = { portal: "Portal", kiosk: "Kiosk", mobile: "Aplikasi" };

export function StatusBadge({ status }: { status: QueueRow["status"] }) {
  if (status === "SELESAI") {
    return (
      <Badge className="gap-1 bg-green-600">
        <CheckCircle className="h-3 w-3" aria-hidden /> Selesai
      </Badge>
    );
  }
  if (status === "DITOLAK") {
    return (
      <Badge variant="destructive" className="gap-1">
        <XCircle className="h-3 w-3" aria-hidden /> Ditolak
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="gap-1">
      <Clock className="h-3 w-3" aria-hidden /> Menunggu
    </Badge>
  );
}

export function RtBadge({ row }: { row: Pick<QueueRow, "rtStatus" | "rtLabel" | "rtNote"> }) {
  if (!row.rtStatus) return null;
  const label = row.rtLabel ?? "RT";
  if (row.rtStatus === "pending") {
    return (
      <Badge variant="outline" className="gap-1 border-amber-400 text-amber-700" title={`Menunggu pengantar ${label}`}>
        <Clock className="h-3 w-3" aria-hidden /> Menunggu {label}
      </Badge>
    );
  }
  if (row.rtStatus === "approved") {
    return (
      <Badge variant="outline" className="gap-1 border-green-500 text-green-700" title={`Disetujui ${label}`}>
        <CheckCircle className="h-3 w-3" aria-hidden /> {label} setuju
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="gap-1 border-red-400 text-red-700" title={row.rtNote ?? `Ditolak ${label}`}>
      <XCircle className="h-3 w-3" aria-hidden /> {label} menolak
    </Badge>
  );
}

/** Hasil pemeriksaan server: "Siap" bila bersih, "Perlu dicek" bila ada peringatan. Hanya untuk permohonan yang menunggu. */
export function CheckBadge({ row }: { row: Pick<QueueRow, "checks"> }) {
  const c = row.checks;
  if (!c || !c.ready) return null;
  if (c.attention) {
    return (
      <Badge variant="outline" className="gap-1 border-amber-400 bg-amber-50 text-amber-800" title={c.warnings.join(" • ")}>
        <AlertTriangle className="h-3 w-3" aria-hidden /> Perlu dicek ({c.warnings.length})
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="gap-1 border-green-500 bg-green-50 text-green-800" title="Lolos semua pemeriksaan otomatis">
      <UserCheck className="h-3 w-3" aria-hidden /> Siap diproses
    </Badge>
  );
}

const dateFmt = new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" });
const dateTimeFmt = new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });

export const formatDate = (iso: string) => dateFmt.format(new Date(iso));
export const formatDateTime = (iso: string) => dateTimeFmt.format(new Date(iso));

export function ageLabel(days: number): string {
  if (days <= 0) return "Hari ini";
  if (days === 1) return "Kemarin";
  return `${days} hari lalu`;
}

export async function readApiError(res: Response, fallback: string): Promise<string> {
  const data = (await res.json().catch(() => null)) as { error?: string } | null;
  return data?.error || fallback;
}
