import { AlertTriangle, Info, XCircle } from "lucide-react";

export interface FindingItem {
  level: "ERROR" | "WARN" | "INFO";
  code: string;
  message: string;
  ref?: string;
}

const LEVELS = {
  ERROR: { title: "Perlu diperbaiki", box: "border-destructive/50 bg-destructive/10 text-destructive", Icon: XCircle, role: "alert" },
  WARN: { title: "Perlu diperiksa", box: "border-amber-600/50 bg-amber-50 text-amber-950", Icon: AlertTriangle, role: "status" },
  INFO: { title: "Catatan", box: "border-sky-600/40 bg-sky-50 text-sky-950", Icon: Info, role: "status" },
} as const;

/** Temuan pemeriksaan per tingkat. Tingkat selalu berteks dan berikon (warna bukan satu-satunya penanda). */
export function FindingList({ findings }: { findings: FindingItem[] }) {
  return (
    <>
      {(["ERROR", "WARN", "INFO"] as const).map((lv) => {
        const items = findings.filter((f) => f.level === lv);
        if (!items.length) return null;
        const { title, box, Icon, role } = LEVELS[lv];
        return (
          <div key={lv} role={role} className={`min-w-0 break-words rounded-md border p-3 text-sm ${box}`}>
            <p className="flex items-center gap-2 font-medium">
              <Icon aria-hidden="true" className="size-4 shrink-0" />
              {title} ({items.length})
            </p>
            <ul className="mt-1 list-disc space-y-1 pl-6">
              {items.map((f) => (
                <li key={f.code + f.message}>
                  {f.message}
                  {f.ref ? <span className="block text-xs opacity-80">Dasar: {f.ref}</span> : null}
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </>
  );
}
