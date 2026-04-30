import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Edit, Eye } from "lucide-react";
import type { OfficialRow } from "../_lib/types";
import type { OfficialTree } from "../_lib/hierarchy";
import { getLevelName } from "../_lib/formatting";

function HierarchyOfficialCard({
  official,
  onDetail,
  onEdit,
}: {
  official: OfficialRow;
  onDetail: (o: OfficialRow) => void;
  onEdit: (o: OfficialRow) => void;
}) {
  return (
    <div className="w-[min(100%,280px)] rounded-xl border bg-card p-3 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1 flex items-center gap-3">
          {official.photoUrl ? (
            <Image
              src={official.photoUrl}
              alt={official.name}
              width={44}
              height={44}
              draggable={false}
              className="h-11 w-11 shrink-0 rounded-full border object-cover"
            />
          ) : (
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border bg-muted text-sm font-semibold text-muted-foreground">
              {official.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">
              {official.name}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {official.position?.name ?? "Tanpa Jabatan"}
            </p>
            <p className="text-[11px] text-primary">
              {`Level ${official.position?.level ?? 5} · ${getLevelName(official.position?.level ?? 5)}`}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 gap-0.5">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onDetail(official)}
            aria-label="Detail"
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onEdit(official)}
            aria-label="Edit"
          >
            <Edit className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function HierarchyTreeBranch({
  official,
  childrenByParentId,
  onDetail,
  onEdit,
}: {
  official: OfficialRow;
  childrenByParentId: OfficialTree["childrenByParentId"];
  onDetail: (o: OfficialRow) => void;
  onEdit: (o: OfficialRow) => void;
}) {
  const children = childrenByParentId.get(official.id) ?? [];
  return (
    <li className="flex flex-col items-center">
      <HierarchyOfficialCard
        official={official}
        onDetail={onDetail}
        onEdit={onEdit}
      />
      {children.length > 0 && (
        <ul className="mt-3 flex list-none flex-wrap justify-center gap-x-6 gap-y-6 border-t border-primary/25 pt-3 pl-0">
          {children.map((child) => (
            <HierarchyTreeBranch
              key={child.id}
              official={child}
              childrenByParentId={childrenByParentId}
              onDetail={onDetail}
              onEdit={onEdit}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

type PerangkatHierarchyCardProps = {
  isLoading: boolean;
  officials: OfficialRow[];
  tree: OfficialTree;
  onDetail: (official: OfficialRow) => void;
  onEdit: (official: OfficialRow) => void;
};

export function PerangkatHierarchyCard(props: PerangkatHierarchyCardProps) {
  const { isLoading, officials, tree, onDetail, onEdit } = props;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bagan Hirarki Perangkat Desa</CardTitle>
        <p className="text-sm text-muted-foreground">
          Struktur dari relasi atasan (field atasan di data perangkat). Tanpa
          atasan yang valid di data, perangkat ditampilkan sebagai baris
          teratas.
        </p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Memuat data bagan...</p>
        ) : officials.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Belum ada data perangkat untuk ditampilkan di bagan.
          </p>
        ) : (
          <div className="max-h-[min(70vh,720px)] min-h-[240px] w-full overflow-auto rounded-lg border bg-muted/20 p-4">
            <ul className="m-0 flex list-none flex-wrap justify-center gap-8 gap-y-10 p-0">
              {tree.roots.map((root) => (
                <HierarchyTreeBranch
                  key={root.id}
                  official={root}
                  childrenByParentId={tree.childrenByParentId}
                  onDetail={onDetail}
                  onEdit={onEdit}
                />
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
