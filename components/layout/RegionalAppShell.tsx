"use client";

import { signOut, useSession } from "next-auth/react";
import { LogOut, MapPinned } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { RegionalScope } from "@/lib/regional-session";

function scopeLabel(scope: RegionalScope): string {
  if (scope.level === "REGENCY") return scope.regency;
  return `${scope.district ?? ""} — ${scope.regency}`;
}

export function RegionalAppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session } = useSession();
  const user = session?.user;
  const u = user as
    | (NonNullable<typeof user> & { regionalScope?: RegionalScope })
    | undefined;
  const scope = u?.regionalScope;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex h-14 shrink-0 items-center justify-between border-b bg-card px-4">
        <div className="flex items-center gap-2 min-w-0">
          <MapPinned className="h-5 w-5 shrink-0 text-primary" aria-hidden />
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">Dashboard Wilayah</p>
            {scope && (
              <p className="text-xs text-muted-foreground truncate">
                {scopeLabel(scope)}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {u?.name && (
            <span className="text-xs text-muted-foreground max-w-[140px] truncate hidden sm:inline">
              {u.name}
            </span>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1"
            onClick={() => void signOut({ callbackUrl: "/auth/signin" })}
          >
            <LogOut className="h-4 w-4" />
            Keluar
          </Button>
        </div>
      </header>
      <main className="flex-1 overflow-auto p-4 md:p-6">{children}</main>
    </div>
  );
}
