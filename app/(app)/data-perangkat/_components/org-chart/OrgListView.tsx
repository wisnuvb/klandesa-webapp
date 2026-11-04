"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronDown, ChevronRight, Edit, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/components/ui/utils";
import { ORG_UNIT_LABELS, isActiveStatus, type OrgNode } from "@/lib/officials/org";
import type { OfficialRow } from "../../_lib/types";
import { AccountStatusBadge } from "../AccountStatusBadge";
import { UNIT_ACCENT, UNIT_TEXT } from "./styles";

type Props = {
  roots: OrgNode<OfficialRow>[];
  canEdit: boolean;
  coordinatorOf: (id: number) => string | null;
  onDetail: (o: OfficialRow) => void;
  onEdit: (o: OfficialRow) => void;
};

function Item({ node, depth, ...rest }: Omit<Props, "roots"> & { node: OrgNode<OfficialRow>; depth: number }) {
  const [open, setOpen] = useState(depth < 2);
  const o = node.person;
  const hasChildren = node.children.length > 0;
  const coordinator = rest.coordinatorOf(o.id);
  return (
    <li>
      <div className={cn("flex items-start gap-2 rounded-lg border border-l-4 bg-card p-2.5", UNIT_ACCENT[node.unit], !isActiveStatus(o.status) && "border-dashed")}>
        {o.photoUrl ? (
          <Image src={o.photoUrl} alt="" width={36} height={36} draggable={false} className="h-9 w-9 shrink-0 rounded-full border object-cover" />
        ) : (
          <div aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border bg-muted text-sm font-semibold text-muted-foreground">
            {o.name.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-sm leading-snug font-semibold [overflow-wrap:anywhere]">{o.name}</p>
          <p className="text-[13px] leading-snug [overflow-wrap:anywhere] text-slate-600">{o.position?.name ?? "Tanpa Jabatan"}</p>
          <p className={cn("text-xs font-semibold", UNIT_TEXT[node.unit])}>{ORG_UNIT_LABELS[node.unit]}</p>
          <div className="flex flex-wrap items-center gap-1.5">
            <AccountStatusBadge state={o.accountState} compact />
            {!isActiveStatus(o.status) && (
              <Badge variant="outline" className="px-1.5 py-0 text-xs text-slate-600">
                Nonaktif
              </Badge>
            )}
          </div>
          {coordinator && <p className="text-xs text-orange-800">Dikoordinasikan: {coordinator}</p>}
        </div>
        <div className="flex shrink-0 flex-col items-end">
          <div className="flex">
            <Button type="button" variant="ghost" size="icon" className="h-9 w-9" onClick={() => rest.onDetail(o)} aria-label={`Detail ${o.name}`}>
              <Eye className="h-4 w-4" aria-hidden="true" />
            </Button>
            {rest.canEdit && (
              <Button type="button" variant="ghost" size="icon" className="h-9 w-9" onClick={() => rest.onEdit(o)} aria-label={`Edit ${o.name}`}>
                <Edit className="h-4 w-4" aria-hidden="true" />
              </Button>
            )}
          </div>
          {hasChildren && (
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-label={`${open ? "Lipat" : "Buka"} ${node.children.length} bawahan ${o.name}`}
              className="flex min-h-9 items-center gap-1 rounded-md px-2 text-xs font-medium text-slate-700 hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              {open ? <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" /> : <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />}
              {node.children.length}
            </button>
          )}
        </div>
      </div>
      {hasChildren && open && (
        <ul className="mt-2 ml-3 space-y-2 border-l-2 border-foreground/50 pl-3">
          {node.children.map((c) => (
            <Item key={c.person.id} node={c} depth={depth + 1} {...rest} />
          ))}
        </ul>
      )}
    </li>
  );
}

/** Tampilan layar sempit: daftar bertingkat yang bisa dilipat (bagan horizontal tidak muat di ponsel). */
export function OrgListView({ roots, ...rest }: Props) {
  return (
    <ul className="space-y-2" aria-label="Struktur perangkat desa">
      {roots.map((r) => (
        <Item key={r.person.id} node={r} depth={0} {...rest} />
      ))}
    </ul>
  );
}
