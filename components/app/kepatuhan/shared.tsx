import { AlertTriangle, CheckCircle2, CircleDashed, Clock, FilePen } from "lucide-react";

export type KStatus = "BELUM" | "DRAF" | "TERKIRIM" | "TERLAMBAT";

const TONE = {
  done: "border-emerald-600/40 bg-emerald-50 text-emerald-900",
  overdue: "border-destructive/50 bg-destructive/10 text-destructive",
  soon: "border-amber-600/50 bg-amber-50 text-amber-900",
  open: "border-border bg-muted text-foreground",
} as const;

/** Lencana status laporan: selalu berikon dan berteks (warna bukan satu-satunya penanda). */
export function statusView(status: KStatus, o: { late?: boolean; soon?: boolean; doneLabel?: string }): { label: string; tone: keyof typeof TONE; Icon: typeof Clock } {
  const done = o.doneLabel ?? "Terkirim";
  if (status === "TERKIRIM") return { label: o.late ? `${done}, lewat tenggat` : done, tone: o.late ? "soon" : "done", Icon: CheckCircle2 };
  if (status === "TERLAMBAT") return { label: "Terlambat", tone: "overdue", Icon: AlertTriangle };
  if (status === "DRAF") return { label: o.soon ? "Draf, segera jatuh tempo" : "Draf", tone: o.soon ? "soon" : "open", Icon: FilePen };
  return { label: o.soon ? "Belum, segera jatuh tempo" : "Belum", tone: o.soon ? "soon" : "open", Icon: o.soon ? Clock : CircleDashed };
}

export function StatusPill({ status, late, soon, doneLabel }: { status: KStatus; late?: boolean; soon?: boolean; doneLabel?: string }) {
  const v = statusView(status, { late, soon, doneLabel });
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${TONE[v.tone]}`}>
      <v.Icon aria-hidden="true" className="size-3.5 shrink-0" />
      {v.label}
    </span>
  );
}

export const VERIFICATION_TEXT: Record<string, string> = { V: "V · dibaca dari teks resmi", R: "R · belum diverifikasi", K: "K · ketetapan kabupaten" };

export function VerificationTag({ v }: { v: string }) {
  const tone = v === "R" ? TONE.soon : v === "K" ? "border-sky-600/40 bg-sky-50 text-sky-900" : TONE.open;
  return <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs ${tone}`}>{VERIFICATION_TEXT[v] ?? v}</span>;
}

export const daysText = (d: number | null): string => (d === null ? "" : d < 0 ? `lewat ${Math.abs(d)} hari` : d === 0 ? "hari ini" : `${d} hari lagi`);
