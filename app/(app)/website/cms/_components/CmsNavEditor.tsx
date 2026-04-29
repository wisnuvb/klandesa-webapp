"use client";

import { memo } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { WebsiteNavItem } from "@/lib/website-engine/types";

type Props = {
  nav: WebsiteNavItem[];
  saving: boolean;
  onUpdateNav: (idx: number, patch: Partial<WebsiteNavItem>) => void;
  onAddNavRow: () => void;
  onRemoveNavRow: (idx: number) => void;
};

export const CmsNavEditor = memo(function CmsNavEditor({
  nav,
  saving,
  onUpdateNav,
  onAddNavRow,
  onRemoveNavRow,
}: Props) {
  return (
    <div className="space-y-2">
      <div className="text-sm font-medium">Item menu</div>
      {nav.map((item, ni) => (
        <div
          key={`nav-${ni}`}
          className="grid items-end gap-2 rounded-lg border p-3 md:grid-cols-12"
        >
          <div className="grid gap-1 md:col-span-3">
            <span className="text-xs text-muted-foreground">Label</span>
            <Input
              value={item.label}
              onChange={(e) => onUpdateNav(ni, { label: e.target.value })}
              disabled={saving}
            />
          </div>
          <div className="grid gap-1 md:col-span-7">
            <span className="text-xs text-muted-foreground">Href</span>
            <Input
              value={item.href}
              onChange={(e) => onUpdateNav(ni, { href: e.target.value })}
              disabled={saving}
            />
          </div>
          <label className="flex items-center gap-2 text-xs md:col-span-1">
            <input
              type="checkbox"
              checked={Boolean(item.external)}
              onChange={(e) =>
                onUpdateNav(ni, { external: e.target.checked })
              }
            />
            Eksternal
          </label>
          <div className="md:col-span-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onRemoveNavRow(ni)}
              disabled={saving}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={onAddNavRow}>
        Tambah menu
      </Button>
    </div>
  );
});
