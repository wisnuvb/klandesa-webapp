"use client";

import { groupChildren, ORG_ROLE_LABELS, ORG_UNIT_LABELS, type OrgNode } from "@/lib/officials/org";
import type { OfficialRow } from "../../_lib/types";
import { OrgCard } from "./OrgCard";
import { CHILD_ITEM, CHILD_LIST, HANGING_ITEM, UNIT_TEXT } from "./styles";

export type TreeContext = {
  isCollapsed: (id: number) => boolean;
  toggle: (id: number) => void;
  highlight: (node: OrgNode<OfficialRow>) => "match" | "dim" | null;
  coordinatorOf: (id: number) => { name: string; derived: boolean } | null;
  canEdit: boolean;
  onDetail: (o: OfficialRow) => void;
  onEdit: (o: OfficialRow) => void;
};

function cardFor(node: OrgNode<OfficialRow>, ctx: TreeContext, showUnit: boolean) {
  return (
    <OrgCard
      node={node}
      highlight={ctx.highlight(node)}
      showUnit={showUnit}
      childCount={node.children.length}
      collapsed={ctx.isCollapsed(node.person.id)}
      onToggle={() => ctx.toggle(node.person.id)}
      coordinator={ctx.coordinatorOf(node.person.id)}
      canEdit={ctx.canEdit}
      onDetail={ctx.onDetail}
      onEdit={ctx.onEdit}
    />
  );
}

function Children({ node, ctx }: { node: OrgNode<OfficialRow>; ctx: TreeContext }) {
  if (node.children.length === 0 || ctx.isCollapsed(node.person.id)) return null;
  const groups = groupChildren(node.children);
  return (
    <ul className={CHILD_LIST}>
      {groups.map((g) =>
        g.kind === "node" ? (
          <li key={g.node.person.id} className={CHILD_ITEM}>
            {cardFor(g.node, ctx, true)}
            <Children node={g.node} ctx={ctx} />
          </li>
        ) : (
          <li key={`band:${g.role}`} className={CHILD_ITEM}>
            <section
              data-org-band={g.role}
              aria-label={`${ORG_ROLE_LABELS[g.role]}, ${g.nodes.length} orang`}
              className="rounded-xl border border-dashed bg-muted/40 p-2"
            >
              <h4 className={`px-1 pb-1.5 text-xs font-bold tracking-wide uppercase ${UNIT_TEXT[g.unit]}`}>
                {g.role === "staf" || g.role === "lain" ? ORG_ROLE_LABELS[g.role] : `${ORG_ROLE_LABELS[g.role]} · ${ORG_UNIT_LABELS[g.unit]}`}
                <span className="ml-1 font-semibold normal-case text-slate-600">({g.nodes.length})</span>
              </h4>
              <ul>
                {g.nodes.map((n) => (
                  <li key={n.person.id} className={HANGING_ITEM}>
                    {cardFor(n, ctx, false)}
                  </li>
                ))}
              </ul>
            </section>
          </li>
        ),
      )}
    </ul>
  );
}

/** Pohon bagan untuk layar lebar. Saudara tidak pernah dibungkus ke baris berikutnya. */
export function OrgTreeView({ roots, ctx }: { roots: OrgNode<OfficialRow>[]; ctx: TreeContext }) {
  return (
    <ul className="flex items-start justify-center gap-10">
      {roots.map((root) => (
        <li key={root.person.id} className="flex shrink-0 flex-col items-center">
          {cardFor(root, ctx, true)}
          <Children node={root} ctx={ctx} />
        </li>
      ))}
    </ul>
  );
}
