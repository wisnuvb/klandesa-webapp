"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { LogOut, MapPinned, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/components/ui/utils";
import type { RegionalScope } from "@/lib/regional-session";
import { REGIONAL_NAV, scopeTitle } from "@/lib/regional-nav";

function scopeLabel(scope: RegionalScope): string {
  return scopeTitle(scope);
}

function RegionalNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1">
      {REGIONAL_NAV.map((item) => {
        const active =
          item.href === "/wilayah"
            ? pathname === "/wilayah"
            : pathname?.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
              active
                ? "bg-primary/10 text-primary font-medium"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function RegionalAppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const user = session?.user;
  const u = user as
    | (NonNullable<typeof user> & { regionalScope?: RegionalScope })
    | undefined;
  const scope = u?.regionalScope;

  return (
    <div className="flex h-screen overflow-hidden bg-background md:flex-row">
      <aside className="hidden md:flex h-full w-56 shrink-0 flex-col border-r bg-card">
        <div className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
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
        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          <RegionalNav />
        </div>
        <div className="shrink-0 border-t p-3 space-y-2">
          {u?.name && (
            <p className="text-xs text-muted-foreground truncate px-1">
              {u.name}
            </p>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full gap-1"
            onClick={() => void signOut({ callbackUrl: "/auth/signin" })}
          >
            <LogOut className="h-4 w-4" />
            Keluar
          </Button>
        </div>
      </aside>

      <div className="flex h-full min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-14 shrink-0 items-center justify-between border-b bg-card px-4 md:hidden">
          <div className="flex items-center gap-2 min-w-0">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Menu">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-0">
                <div className="border-b p-4">
                  <p className="font-semibold text-sm">Dashboard Wilayah</p>
                  {scope && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {scopeLabel(scope)}
                    </p>
                  )}
                </div>
                <div className="p-3">
                  <RegionalNav />
                </div>
              </SheetContent>
            </Sheet>
            <p className="text-sm font-semibold truncate">
              {REGIONAL_NAV.find((n) =>
                n.href === "/wilayah"
                  ? pathname === "/wilayah"
                  : pathname?.startsWith(n.href),
              )?.label ?? "Wilayah"}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => void signOut({ callbackUrl: "/auth/signin" })}
            aria-label="Keluar"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </header>
        <main className="min-h-0 flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
