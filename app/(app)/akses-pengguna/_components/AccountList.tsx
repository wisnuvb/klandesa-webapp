"use client";

import { CircleCheck, CircleSlash, SlidersHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { countCustomized } from "@/lib/rbac/editor-model";
import type { AccountView } from "../_lib/types";

const fmt = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" });

export function AccountList({ users, onEdit }: { users: AccountView[]; onEdit: (u: AccountView) => void }) {
  if (users.length === 0) {
    return <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">Belum ada akun.</p>;
  }
  return (
    <ul className="divide-y rounded-lg border" aria-label="Daftar akun desa">
      {users.map((u) => {
        const custom = countCustomized(u.overrides);
        return (
          <li key={u.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate text-sm font-medium">{u.name}</p>
                {u.isSelf && <Badge variant="outline">Anda</Badge>}
              </div>
              <p className="truncate text-xs text-muted-foreground">
                {u.official?.positionName ? `${u.official.positionName} · ` : ""}
                {u.email}
              </p>
              <p className="text-xs text-muted-foreground">{u.lastLogin ? `Terakhir masuk ${fmt.format(new Date(u.lastLogin))}` : "Belum pernah masuk"}</p>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
              <Badge variant="secondary">{u.roleLabel}</Badge>
              {custom > 0 && (
                <Badge variant="outline">
                  <SlidersHorizontal aria-hidden="true" />
                  {custom} modul disesuaikan
                </Badge>
              )}
              {u.isActive ? (
                <Badge variant="outline" className="text-emerald-800 dark:text-emerald-300">
                  <CircleCheck aria-hidden="true" />
                  Aktif
                </Badge>
              ) : (
                <Badge variant="outline" className="text-red-800 dark:text-red-300">
                  <CircleSlash aria-hidden="true" />
                  Nonaktif
                </Badge>
              )}
            </div>

            <Button type="button" variant="outline" className="h-11 sm:ml-2" onClick={() => onEdit(u)} aria-label={`Atur akses ${u.name}`}>
              Atur akses
            </Button>
          </li>
        );
      })}
    </ul>
  );
}
