"use client";

import { SectionShell } from "./SectionShell";
import { useInspectSection } from "./use-section";
import { fmtDateTime } from "./types";

type ActivityResp = {
  activity: { id: string; action: string; entity: string; entityId: string | null; actorName: string | null; fields: string[]; createdAt: string }[];
};

export function ActivityTab({ villageId }: { villageId: number }) {
  const s = useInspectSection<ActivityResp>(villageId, "activity");
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">50 aktivitas terakhir di desa ini. Isi perubahan tidak ditampilkan; hanya nama kolom yang tidak sensitif.</p>
      <SectionShell loading={s.loading} error={s.error} onRetry={s.reload} empty={s.data?.activity.length === 0} emptyText="Belum ada aktivitas tercatat.">
        <ol className="relative space-y-3 border-l pl-4">
          {s.data?.activity.map((a) => (
            <li key={a.id} className="relative">
              <span aria-hidden="true" className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full border bg-background" />
              <div className="text-sm">
                <span className="font-medium">{a.action}</span>{" "}
                <span className="text-muted-foreground">{a.entity}{a.entityId ? ` #${a.entityId}` : ""}</span>
              </div>
              <div className="text-xs text-muted-foreground tabular-nums">
                {fmtDateTime(a.createdAt)} · {a.actorName ?? "Sistem/tak diketahui"}
                {a.fields.length ? ` · kolom: ${a.fields.join(", ")}` : ""}
              </div>
            </li>
          ))}
        </ol>
      </SectionShell>
    </div>
  );
}
