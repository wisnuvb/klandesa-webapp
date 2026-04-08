"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, Search, Menu } from "lucide-react";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Badge } from "../ui/badge";
import { signOut } from "next-auth/react";
import { useNextAuthSession } from "@/hooks/use-nextauth-session";
import { getInitials } from "@/utils";
import { cn } from "@/components/ui/utils";

type NotificationRow = {
  id: number;
  title: string;
  body: string | null;
  href: string;
  timeAgo: string;
  read: boolean;
};

interface HeaderProps {
  title: string;
  subtitle?: string;
  onMenuClick?: () => void;
}

export function Header({ title, subtitle, onMenuClick }: HeaderProps) {
  const router = useRouter();
  const { user, isLoading, isAuthenticated } = useNextAuthSession();
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifLoading, setNotifLoading] = useState(false);

  const loadNotifications = useCallback(async () => {
    if (!isAuthenticated) return;
    setNotifLoading(true);
    try {
      const res = await fetch("/api/notifications");
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(data.notifications ?? []);
      setUnreadCount(typeof data.unreadCount === "number" ? data.unreadCount : 0);
    } catch {
      /* abaikan */
    } finally {
      setNotifLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      void loadNotifications();
    }
  }, [isAuthenticated, loadNotifications]);

  const markNotificationRead = async (id: number) => {
    try {
      await fetch("/api/notifications/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId: id }),
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      /* abaikan */
    }
  };

  const markAllRead = async () => {
    try {
      await fetch("/api/notifications/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch {
      /* abaikan */
    }
  };

  const openNotification = async (n: NotificationRow) => {
    if (!n.read) {
      await markNotificationRead(n.id);
    }
    router.push(n.href);
  };

  const getDisplayName = () => {
    if (isLoading) return "Memuat...";
    return user?.name || "User";
  };

  const getRole = () => {
    return user?.role || "Administrator";
  };

  return (
    <header className="bg-card border-b border-border px-6 py-2">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuClick}
            className="md:hidden"
          >
            <Menu className="h-5 w-5" />
          </Button>

          <div className="flex-1">
            <div className="mb-2">
              <h1 className="text-2xl text-foreground">{title}</h1>
              {subtitle && (
                <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
              )}
            </div>
            <div className="relative max-w-md hidden">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari data..."
                className="pl-10 bg-input-background border-border"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <DropdownMenu
            onOpenChange={(open) => {
              if (open && isAuthenticated) void loadNotifications();
            }}
          >
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                {unreadCount > 0 ? (
                  <Badge
                    variant="destructive"
                    className="absolute -top-1 -right-1 h-5 min-w-5 px-1 flex items-center justify-center text-[10px]"
                  >
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </Badge>
                ) : null}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <div className="flex items-center justify-between gap-2 px-2 py-1.5">
                <DropdownMenuLabel className="p-0">Notifikasi</DropdownMenuLabel>
                {notifications.length > 0 && unreadCount > 0 ? (
                  <button
                    type="button"
                    className="text-xs text-primary hover:underline"
                    onClick={() => void markAllRead()}
                  >
                    Tandai semua dibaca
                  </button>
                ) : null}
              </div>
              <DropdownMenuSeparator />
              {notifLoading && notifications.length === 0 ? (
                <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                  Memuat notifikasi…
                </div>
              ) : notifications.length === 0 ? (
                <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                  Belum ada notifikasi. Aktivitas permohonan surat, keuangan, dan
                  pembaruan warga akan muncul di sini.
                </div>
              ) : (
                notifications.map((n, index) => (
                  <div key={n.id}>
                    {index > 0 ? <DropdownMenuSeparator /> : null}
                    <DropdownMenuItem
                      className={cn(
                        "cursor-pointer flex-col items-start gap-1 p-3",
                        !n.read && "bg-muted/60",
                      )}
                      onSelect={() => void openNotification(n)}
                    >
                      <p
                        className={cn(
                          "font-medium leading-snug",
                          !n.read && "font-semibold",
                        )}
                      >
                        {n.title}
                      </p>
                      {n.body ? (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {n.body}
                        </p>
                      ) : null}
                      <p className="text-xs text-muted-foreground">{n.timeAgo}</p>
                    </DropdownMenuItem>
                  </div>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-3 px-3">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {getInitials(user?.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="text-left hidden md:block">
                  <p className="text-sm">{getDisplayName()}</p>
                  <p className="text-xs text-muted-foreground">{getRole()}</p>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Akun Saya</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild className="cursor-pointer">
                <Link href="/profil">Profil</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="cursor-pointer">
                <Link href="/pengaturan-desa">Pengaturan desa</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => signOut()}
              >
                Keluar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
