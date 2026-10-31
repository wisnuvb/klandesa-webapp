"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft, Bell, CircleHelp, Search, Menu } from "lucide-react";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { DASHBOARD_TOUR_REPLAY_EVENT, DASHBOARD_TOUR_REPLAY_STORAGE_KEY } from "@/lib/dashboard-tour";
import { DATA_WARGA_TOUR_REPLAY_EVENT } from "@/lib/data-warga-tour";
import { LETTER_COMPOSER_TOUR_REPLAY_EVENT } from "@/lib/letter-composer-tour";
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
  /** Tombol kembali di kiri judul (mis. halaman pembuatan surat). */
  back?: { label: string; onClick: () => void };
  /** Gambar bulat dekoratif di kiri judul (judul sudah menyebut namanya, jadi alt kosong). */
  avatarSrc?: string;
  onMenuClick?: () => void;
}

function isExternalHref(href: string) {
  return /^https?:\/\//i.test(href);
}

export function Header({ title, subtitle, back, avatarSrc, onMenuClick }: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading, isAuthenticated } = useNextAuthSession();
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifLoading, setNotifLoading] = useState(false);

  // Primitif, bukan objek `user`: objek sesi baru dibuat tiap tab difokuskan ulang, dan itu dulu
  // memicu fetch notifikasi serta kedipan lonceng setiap kali.
  const accountType = (user as { accountType?: string } | null)?.accountType;

  const loadNotifications = useCallback(async () => {
    if (!isAuthenticated) return;
    const at = accountType;
    if (at && at !== "village") {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }
    setNotifLoading(true);
    try {
      const res = await fetch("/api/notifications");
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(data.notifications ?? []);
      setUnreadCount(typeof data.unreadCount === "number" ? data.unreadCount : 0);
    } catch {
      /* ignore */
    } finally {
      setNotifLoading(false);
    }
  }, [isAuthenticated, accountType]);

  useEffect(() => {
    if (isAuthenticated) {
      void loadNotifications();
    }
  }, [isAuthenticated, loadNotifications]);

  const postRead = async (payload: { notificationId: number } | { all: true }) => {
    const res = await fetch("/api/notifications/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    });
    return res.ok;
  };

  const markNotificationRead = async (id: number) => {
    // Optimistis; bila server menolak, muat ulang agar tampilan sama dengan data sebenarnya.
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    setUnreadCount((c) => Math.max(0, c - 1));
    let ok = false;
    try {
      ok = await postRead({ notificationId: id });
    } catch {
      /* jaringan gagal: dianggap tidak berhasil */
    }
    if (!ok) void loadNotifications();
  };

  const onNotificationActivate = (n: NotificationRow) => {
    if (!n.read) {
      void markNotificationRead(n.id);
    }
  };

  const markAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
    let ok = false;
    try {
      ok = await postRead({ all: true });
    } catch {
      /* jaringan gagal: dianggap tidak berhasil */
    }
    if (!ok) void loadNotifications();
  };

  const getDisplayName = () => {
    if (isLoading) return "Memuat...";
    return user?.name || "User";
  };

  const getRole = () => {
    return user?.role || "Administrator";
  };

  const showNotifications = isAuthenticated && (!accountType || accountType === "village");
  const showVillageSettings = !accountType || accountType === "village";
  const showTourReplay = showVillageSettings;

  const handleReplayTour = () => {
    if (pathname === "/data-warga") {
      window.dispatchEvent(new Event(DATA_WARGA_TOUR_REPLAY_EVENT));
      return;
    }
    if (pathname?.startsWith("/layanan-surat/buat")) {
      window.dispatchEvent(new Event(LETTER_COMPOSER_TOUR_REPLAY_EVENT));
      return;
    }
    if (pathname === "/dashboard") {
      window.dispatchEvent(new Event(DASHBOARD_TOUR_REPLAY_EVENT));
      return;
    }
    sessionStorage.setItem(DASHBOARD_TOUR_REPLAY_STORAGE_KEY, "1");
    router.push("/dashboard");
  };

  return (
    <header className="bg-card border-b border-border px-6 py-2">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1">
          <Button
            data-tour="nav-menu-btn"
            variant="ghost"
            size="icon"
            onClick={onMenuClick}
            className="md:hidden"
          >
            <Menu className="h-5 w-5" />
          </Button>

          <div className="flex min-w-0 flex-1 items-center gap-3">
            {back && (
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="mb-2 shrink-0 pointer-coarse:size-11"
                aria-label={back.label}
                title={back.label}
                onClick={back.onClick}
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              </Button>
            )}
            {avatarSrc ? (
              <Image
                src={avatarSrc}
                alt=""
                width={44}
                height={44}
                priority
                className="mb-2 size-11 shrink-0 rounded-full"
              />
            ) : null}
            <div className="mb-2 min-w-0">
              <h1 className={cn("text-2xl text-foreground", back && "truncate")} title={back ? title : undefined}>{title}</h1>
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
          {showNotifications ? (
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
                  notifications.map((n, index) => {
                    const lines = (
                      <>
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
                      </>
                    );
                    const linkClass = cn(
                      "flex cursor-pointer flex-col items-start gap-1 p-3 outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent",
                      !n.read && "bg-muted/60",
                    );

                    return (
                      <div key={n.id}>
                        {index > 0 ? <DropdownMenuSeparator /> : null}
                        <DropdownMenuItem
                          asChild
                          className="p-0 focus:bg-transparent"
                        >
                          {isExternalHref(n.href) ? (
                            <a
                              href={n.href}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={linkClass}
                              onClick={() => onNotificationActivate(n)}
                            >
                              {lines}
                            </a>
                          ) : (
                            <Link
                              href={n.href}
                              prefetch={false}
                              className={linkClass}
                              onClick={() => onNotificationActivate(n)}
                            >
                              {lines}
                            </Link>
                          )}
                        </DropdownMenuItem>
                      </div>
                    );
                  })
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}

          {showTourReplay ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleReplayTour}
              aria-label="Ulangi tur halaman ini"
              title="Ulangi tur halaman ini"
            >
              <CircleHelp className="h-5 w-5" />
            </Button>
          ) : null}

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
              {showVillageSettings ? (
                <DropdownMenuItem asChild className="cursor-pointer">
                  <Link href="/pengaturan-desa">Pengaturan desa</Link>
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onClick={() =>
                  signOut({
                    callbackUrl: "/auth/signin",
                  })
                }
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
