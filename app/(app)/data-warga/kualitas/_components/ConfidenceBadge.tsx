import { AlertTriangle, CheckCircle2, HelpCircle } from "lucide-react";
import type { Confidence } from "@/lib/kependudukan/worklist";
import { CONFIDENCE_META } from "@/lib/kependudukan/labels";
import { cn } from "@/components/ui/utils";

const STYLE: Record<Confidence, { icon: typeof CheckCircle2; className: string }> = {
  TINGGI: { icon: CheckCircle2, className: "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-100" },
  SEDANG: { icon: AlertTriangle, className: "border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100" },
  RENDAH: { icon: HelpCircle, className: "border-slate-300 bg-slate-100 text-slate-800 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" },
};

/** Keyakinan saran: ikon + kata + warna (tidak bergantung pada warna saja). */
export function ConfidenceBadge({ confidence }: { confidence: Confidence }) {
  const { icon: Icon, className } = STYLE[confidence];
  const meta = CONFIDENCE_META[confidence];
  return (
    <span
      title={meta.hint}
      className={cn("inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-semibold", className)}
    >
      <Icon aria-hidden="true" className="size-3.5" />
      {meta.label}
    </span>
  );
}
