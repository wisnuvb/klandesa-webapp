"use client";

import Image from "next/image";
import { ChevronDown, ChevronRight, Edit, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/components/ui/utils";
import { ORG_UNIT_LABELS, isActiveStatus, type OrgNode } from "@/lib/officials/org";
import type { OfficialRow } from "../../_lib/types";
import { AccountStatusBadge } from "../AccountStatusBadge";
import { UNIT_ACCENT, UNIT_TEXT } from "./styles";

export type OrgCardProps = {
  node: OrgNode<OfficialRow>;
  /** Cocok dengan pencarian (disorot) / tidak cocok (diredupkan). */
  highlight: "match" | "dim" | null;
  showUnit: boolean;
  /** Banyaknya bawahan langsung; > 0 menampilkan tombol lipat. */
  childCount: number;
  collapsed: boolean;
  onToggle: () => void;
  /** Koordinator bila ada garis koordinasi ke kartu ini. `derived` = dari pengaturan desa (bukan isian per orang). */
  coordinator: { name: string; derived: boolean } | null;
  canEdit: boolean;
  onDetail: (o: OfficialRow) => void;
  onEdit: (o: OfficialRow) => void;
};

export function OrgCard({ node, highlight, showUnit, childCount, collapsed, onToggle, coordinator, canEdit, onDetail, onEdit }: OrgCardProps) {
  const o = node.person;
  const inactive = !isActiveStatus(o.status);
  return (
    <div
      data-org-id={o.id}
      className={cn(
        "w-64 shrink-0 rounded-xl border border-l-4 bg-card text-left shadow-sm transition-opacity",
        UNIT_ACCENT[node.unit],
        highlight === "match" && "ring-2 ring-primary",
        highlight === "dim" && "opacity-40",
        inactive && "border-dashed",
      )}
    >
      <div className="flex items-start gap-2.5 p-3 pb-1.5">
        {o.photoUrl ? (
          <Image src={o.photoUrl} alt="" width={40} height={40} draggable={false} className="h-10 w-10 shrink-0 rounded-full border object-cover" />
        ) : (
          <div aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border bg-muted text-sm font-semibold text-muted-foreground">
            {o.name.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm leading-snug font-semibold [overflow-wrap:break-word] text-foreground">{o.name}</p>
          <p className="text-[13px] leading-snug [overflow-wrap:break-word] text-slate-600">{o.position?.name ?? "Tanpa Jabatan"}</p>
          {showUnit && node.role !== "kades" && <p className={cn("mt-0.5 text-xs font-semibold", UNIT_TEXT[node.unit])}>{ORG_UNIT_LABELS[node.unit]}</p>}
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 px-3 pb-2">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          <AccountStatusBadge state={o.accountState} compact />
          {inactive && (
            <Badge variant="outline" className="px-1.5 py-0 text-xs text-slate-600">
              Nonaktif
            </Badge>
          )}
        </div>
        <div className="-mr-1.5 flex shrink-0">
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => onDetail(o)} aria-label={`Detail ${o.name}`}>
            <Eye className="h-4 w-4" aria-hidden="true" />
          </Button>
          {canEdit && (
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(o)} aria-label={`Edit ${o.name}`}>
              <Edit className="h-4 w-4" aria-hidden="true" />
            </Button>
          )}
        </div>
      </div>

      {coordinator &&
        (coordinator.derived ? (
          // Garis turunan dari pengaturan desa cukup digambar; teksnya hanya untuk pembaca layar agar kartu tidak ramai.
          <p className="sr-only">Dikoordinasikan oleh {coordinator.name}</p>
        ) : (
          <p className="border-t border-dashed px-3 py-1.5 text-xs text-orange-800">
            Dikoordinasikan: <span className="font-medium">{coordinator.name}</span>
          </p>
        ))}

      {childCount > 0 && (
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={!collapsed}
          aria-label={`${collapsed ? "Buka" : "Lipat"} ${childCount} bawahan ${o.name}`}
          className="flex min-h-8 w-full items-center justify-center gap-1 rounded-b-[10px] border-t text-xs font-medium text-slate-700 hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          {collapsed ? <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" /> : <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />}
          {childCount} bawahan
        </button>
      )}
    </div>
  );
}
