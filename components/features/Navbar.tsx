"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as NM from "@radix-ui/react-navigation-menu";
import { ArrowRight, ChevronDown, Menu, X } from "lucide-react";

import { cn } from "@/components/ui/utils";

import { KlandesaLogo } from "./KlandesaLogo";
import { NAV_ITEMS, isPathActive } from "./navbar-data";
import type { NavFeature, NavGroup, NavLink } from "./navbar-data";

interface NavbarProps {
  onLoginClick: () => void;
  onRegisterClick: () => void;
}

/*
 * z-[60]: di atas tombol WhatsApp (z-50) agar sheet seluler tidak tertimpa, di bawah modal login/daftar (z-100).
 *
 * Mengapa NavigationMenu (bukan DropdownMenu): DropdownMenu Radix bersifat modal dan mengunci scroll saat
 * terbuka. Scrollbar halaman hilang, lebar viewport bertambah, dan header `fixed` ikut melebar sehingga
 * item bergeser (±4px di tengah, ±8px di kanan pada scrollbar 8px; lebih besar di Windows). NavigationMenu
 * tidak mengunci scroll, jadi tidak ada pergeseran. Menu seluler juga sengaja tidak mengunci scroll.
 */

const focusRing =
  "outline-none focus-visible:ring-2 focus-visible:ring-[#0d9488] focus-visible:ring-offset-2 focus-visible:ring-offset-white";

const triggerBase = cn(
  "group relative inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[15px] font-medium text-slate-700",
  "transition-colors duration-200 motion-reduce:transition-none",
  "hover:bg-teal-50/80 hover:text-teal-800 data-[state=open]:bg-teal-50 data-[state=open]:text-teal-800",
  "data-[active]:text-teal-800",
  focusRing,
);

function subscribeScroll(onChange: () => void) {
  window.addEventListener("scroll", onChange, { passive: true });
  return () => window.removeEventListener("scroll", onChange);
}
const getScrolled = () => window.scrollY > 8;
const getServerScrolled = () => false;

function ActiveBar({ active }: { active: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-x-4 -bottom-0.5 h-0.5 rounded-full bg-linear-to-r from-[#0d9488] to-[#6366f1] transition-opacity duration-200",
        active ? "opacity-100" : "opacity-0",
      )}
    />
  );
}

function PanelLink({
  link,
  active,
  onNavigate,
}: {
  link: NavLink;
  active: boolean;
  onNavigate: () => void;
}) {
  const Icon = link.icon;
  return (
    <NM.Link asChild active={active}>
      <Link
        href={link.href}
        onClick={onNavigate}
        aria-current={active ? "page" : undefined}
        className={cn(
          "group/row flex items-start gap-3.5 rounded-xl p-3 transition-colors duration-150 motion-reduce:transition-none",
          "hover:bg-slate-50 focus-visible:bg-slate-50 data-[active]:bg-teal-50/70",
          focusRing,
        )}
      >
        <span
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700 ring-1 ring-teal-100",
            "transition-colors duration-150 motion-reduce:transition-none",
            "group-hover/row:bg-[#0f766e] group-hover/row:text-white group-hover/row:ring-[#0f766e]",
            "group-focus-visible/row:bg-[#0f766e] group-focus-visible/row:text-white",
          )}
        >
          <Icon className="size-5" aria-hidden="true" />
        </span>
        <span className="min-w-0">
          <span className="block text-[15px] font-semibold leading-snug text-slate-900">{link.title}</span>
          <span className="mt-0.5 block text-sm leading-snug text-slate-600">{link.desc}</span>
        </span>
      </Link>
    </NM.Link>
  );
}

function FeatureCard({
  feature,
  onRegister,
  onNavigate,
}: {
  feature: NavFeature;
  onRegister: () => void;
  onNavigate: () => void;
}) {
  const action =
    "mt-5 inline-flex w-fit items-center gap-1.5 rounded-lg bg-white px-3.5 py-2 text-sm font-semibold text-[#0f766e] shadow-sm transition hover:bg-teal-50 motion-reduce:transition-none " +
    "outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#115e59]";
  return (
    <div className="relative flex flex-col justify-between overflow-hidden rounded-xl bg-linear-to-br from-[#0f766e] via-[#115e59] to-[#3730a3] p-5 text-white">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-12 -top-12 size-40 rounded-full bg-white/10 blur-2xl"
      />
      <div className="relative">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-200">{feature.eyebrow}</p>
        <p className="mt-2 text-lg font-semibold leading-snug">{feature.title}</p>
        <p className="mt-2 text-sm leading-relaxed text-white/90">{feature.desc}</p>
      </div>
      {feature.kind === "link" ? (
        <NM.Link asChild>
          <Link href={feature.href} onClick={onNavigate} className={cn(action, "relative")}>
            {feature.cta}
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </NM.Link>
      ) : (
        <button type="button" onClick={onRegister} className={cn(action, "relative cursor-pointer")}>
          {feature.cta}
          <ArrowRight className="size-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

function GroupContent({
  group,
  pathname,
  onRegister,
  onNavigate,
}: {
  group: NavGroup;
  pathname: string;
  onRegister: () => void;
  onNavigate: () => void;
}) {
  return (
    <NM.Content
      className={cn(
        "p-3",
        group.feature ? "grid w-[41rem] grid-cols-[1fr_15rem] gap-3" : "w-[26rem]",
        "data-[motion^=from-]:animate-in data-[motion^=from-]:fade-in data-[motion=from-end]:slide-in-from-right-6 data-[motion=from-start]:slide-in-from-left-6",
        "data-[motion^=to-]:animate-out data-[motion^=to-]:fade-out data-[motion=to-end]:slide-out-to-right-6 data-[motion=to-start]:slide-out-to-left-6",
        "motion-reduce:animate-none",
      )}
    >
      <ul className="flex flex-col gap-0.5">
        {group.links.map((l) => (
          <li key={l.href}>
            <PanelLink link={l} active={!l.href.includes("#") && pathname === l.href} onNavigate={onNavigate} />
          </li>
        ))}
      </ul>
      {group.feature && <FeatureCard feature={group.feature} onRegister={onRegister} onNavigate={onNavigate} />}
    </NM.Content>
  );
}

export function Navbar({ onLoginClick, onRegisterClick }: NavbarProps) {
  const pathname = usePathname() ?? "/";
  const scrolled = React.useSyncExternalStore(subscribeScroll, getScrolled, getServerScrolled);

  // "Terbuka" disimpan bersama rute saat dibuka, sehingga berpindah halaman otomatis menutupnya.
  const [desktop, setDesktop] = React.useState({ value: "", at: "" });
  const desktopValue = desktop.at === pathname ? desktop.value : "";
  const closeDesktop = () => setDesktop({ value: "", at: pathname });

  const [mobileAt, setMobileAt] = React.useState<string | null>(null);
  const mobileOpen = mobileAt === pathname;
  const closeMobile = () => setMobileAt(null);
  const [expanded, setExpanded] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileAt(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  const register = () => {
    closeDesktop();
    closeMobile();
    onRegisterClick();
  };
  const login = () => {
    closeMobile();
    onLoginClick();
  };

  const anyOpen = desktopValue !== "";

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-[60] bg-white/90 backdrop-blur-xl backdrop-saturate-150 supports-[backdrop-filter]:bg-white/75",
        "transition-shadow duration-300 motion-reduce:transition-none",
        scrolled ? "shadow-[0_12px_40px_-20px_rgba(15,118,110,0.5)]" : "shadow-none",
      )}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-linear-to-r from-transparent via-teal-700/30 to-transparent"
      />

      <div
        className={cn(
          "mx-auto flex max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8",
          "transition-[height] duration-300 motion-reduce:transition-none",
          scrolled ? "h-16" : "h-[72px]",
        )}
      >
        <Link
          href="/"
          aria-label="Klandesa, ke beranda"
          className={cn("shrink-0 rounded-lg", focusRing)}
          onClick={() => {
            closeMobile();
            closeDesktop();
          }}
        >
          <KlandesaLogo />
        </Link>

        {/* Desktop */}
        <NM.Root
          aria-label="Navigasi utama"
          value={desktopValue}
          onValueChange={(value) => setDesktop({ value, at: pathname })}
          delayDuration={120}
          skipDelayDuration={300}
          className="relative hidden flex-1 justify-center lg:flex"
        >
          <NM.List className="flex items-center gap-0.5">
            {NAV_ITEMS.map((item) => {
              if (item.type === "link") {
                const active = isPathActive(pathname, item.href);
                return (
                  <NM.Item key={item.label}>
                    <NM.Link asChild active={active}>
                      <Link
                        href={item.href}
                        onClick={closeDesktop}
                        aria-current={active ? "page" : undefined}
                        className={triggerBase}
                      >
                        {item.label}
                        <ActiveBar active={active} />
                      </Link>
                    </NM.Link>
                  </NM.Item>
                );
              }
              const { group } = item;
              const active = group.links.some((l) => isPathActive(pathname, l.href));
              return (
                <NM.Item key={group.id} value={group.id}>
                  <NM.Trigger className={triggerBase} data-active={active ? "" : undefined}>
                    {group.label}
                    <ChevronDown
                      className="size-3.5 transition-transform duration-300 group-data-[state=open]:rotate-180 motion-reduce:transition-none"
                      aria-hidden="true"
                    />
                    <ActiveBar active={active} />
                  </NM.Trigger>
                  <GroupContent group={group} pathname={pathname} onRegister={register} onNavigate={closeDesktop} />
                </NM.Item>
              );
            })}
          </NM.List>

          {/* Panel bersama (morph antar menu). Wadah tidak menangkap pointer kecuali saat ada menu terbuka. */}
          <div className="pointer-events-none absolute left-0 top-full flex w-full justify-center">
            <div
              className={cn(
                "relative mt-2 before:absolute before:-top-2 before:left-0 before:h-2 before:w-full",
                anyOpen ? "pointer-events-auto" : "pointer-events-none",
              )}
            >
              <NM.Viewport
                className={cn(
                  "relative h-[var(--radix-navigation-menu-viewport-height)] w-[var(--radix-navigation-menu-viewport-width)] origin-top overflow-hidden",
                  "rounded-2xl border border-slate-200/80 bg-white shadow-2xl shadow-teal-950/10 ring-1 ring-black/5",
                  "transition-[width,height] duration-300 ease-out motion-reduce:transition-none",
                  "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
                  "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 motion-reduce:animate-none",
                )}
              />
            </div>
          </div>
        </NM.Root>

        <div className="ml-auto hidden items-center gap-1.5 lg:flex">
          <button
            type="button"
            onClick={login}
            className={cn(
              "cursor-pointer rounded-full px-4 py-2 text-[15px] font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900 motion-reduce:transition-none",
              focusRing,
            )}
          >
            Masuk
          </button>
          <button
            type="button"
            onClick={register}
            className={cn(
              "group/cta inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-linear-to-r from-[#115e59] to-[#0f766e] px-5 py-2.5 text-sm font-semibold text-white",
              "shadow-[0_8px_22px_-8px_rgba(15,118,110,0.8)] ring-1 ring-white/20 transition duration-200",
              "hover:-translate-y-px hover:shadow-[0_12px_28px_-8px_rgba(15,118,110,0.9)] active:translate-y-0 motion-reduce:transform-none motion-reduce:transition-none",
              focusRing,
            )}
          >
            <span>
              Coba gratis<span className="hidden xl:inline"> 14 hari</span>
            </span>
            <ArrowRight
              className="size-4 transition-transform duration-200 group-hover/cta:translate-x-0.5 motion-reduce:transition-none"
              aria-hidden="true"
            />
          </button>
        </div>

        {/* Seluler & tablet */}
        <button
          type="button"
          aria-expanded={mobileOpen}
          aria-controls="menu-seluler"
          aria-label={mobileOpen ? "Tutup menu" : "Buka menu"}
          onClick={() => setMobileAt(mobileOpen ? null : pathname)}
          className={cn(
            "ml-auto inline-flex size-11 cursor-pointer items-center justify-center rounded-xl text-slate-800 transition-colors hover:bg-slate-100 lg:hidden motion-reduce:transition-none",
            focusRing,
          )}
        >
          {mobileOpen ? <X className="size-6" aria-hidden="true" /> : <Menu className="size-6" aria-hidden="true" />}
        </button>
      </div>

      {mobileOpen && (
        <div
          id="menu-seluler"
          className="absolute inset-x-0 top-full flex max-h-[calc(100dvh-4rem)] flex-col overflow-y-auto overscroll-contain border-t border-slate-200/70 bg-white shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200 motion-reduce:animate-none lg:hidden"
        >
          <nav aria-label="Navigasi seluler" className="flex-1 px-4 py-3">
            <ul className="space-y-1">
              <li>
                <MobileRow href="/" label="Beranda" active={pathname === "/"} onNavigate={closeMobile} />
              </li>
              {NAV_ITEMS.map((item) => {
                if (item.type === "link") {
                  return (
                    <li key={item.label}>
                      <MobileRow
                        href={item.href}
                        label={item.label}
                        active={isPathActive(pathname, item.href)}
                        onNavigate={closeMobile}
                      />
                    </li>
                  );
                }
                const { group } = item;
                const open = expanded === group.id;
                const active = group.links.some((l) => isPathActive(pathname, l.href));
                return (
                  <li key={group.id}>
                    <button
                      type="button"
                      aria-expanded={open}
                      aria-controls={`mobile-${group.id}`}
                      onClick={() => setExpanded(open ? null : group.id)}
                      className={cn(
                        "flex min-h-12 w-full cursor-pointer items-center justify-between rounded-xl px-3 text-left text-base font-semibold",
                        active ? "text-teal-800" : "text-slate-900",
                        "hover:bg-slate-50",
                        focusRing,
                      )}
                    >
                      {group.label}
                      <ChevronDown
                        className={cn("size-5 text-slate-500 transition-transform duration-200 motion-reduce:transition-none", open && "rotate-180")}
                        aria-hidden="true"
                      />
                    </button>
                    {open && (
                      <ul id={`mobile-${group.id}`} className="mb-2 ml-1 space-y-0.5 border-l-2 border-teal-100 pl-2">
                        {group.links.map((l) => {
                          const Icon = l.icon;
                          const here = !l.href.includes("#") && pathname === l.href;
                          return (
                            <li key={l.href}>
                              <Link
                                href={l.href}
                                onClick={closeMobile}
                                aria-current={here ? "page" : undefined}
                                className={cn(
                                  "flex min-h-12 items-start gap-3 rounded-xl px-3 py-2.5 hover:bg-slate-50",
                                  here && "bg-teal-50/70",
                                  focusRing,
                                )}
                              >
                                <Icon className="mt-0.5 size-5 shrink-0 text-teal-700" aria-hidden="true" />
                                <span>
                                  <span className="block text-[15px] font-medium text-slate-900">{l.title}</span>
                                  <span className="block text-sm leading-snug text-slate-600">{l.desc}</span>
                                </span>
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="sticky bottom-0 grid gap-2 border-t border-slate-200/70 bg-white/95 p-4 backdrop-blur">
            <button
              type="button"
              onClick={register}
              className={cn(
                "inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl bg-linear-to-r from-[#115e59] to-[#0f766e] px-5 text-base font-semibold text-white shadow-md",
                focusRing,
              )}
            >
              Coba gratis 14 hari
              <ArrowRight className="size-5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={login}
              className={cn(
                "min-h-12 cursor-pointer rounded-xl border border-slate-300 bg-white px-5 text-base font-medium text-slate-800 hover:bg-slate-50",
                focusRing,
              )}
            >
              Masuk
            </button>
          </div>
        </div>
      )}
    </header>
  );
}

function MobileRow({
  href,
  label,
  active,
  onNavigate,
}: {
  href: string;
  label: string;
  active: boolean;
  onNavigate: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex min-h-12 items-center rounded-xl px-3 text-base font-semibold hover:bg-slate-50",
        active ? "text-teal-800" : "text-slate-900",
        focusRing,
      )}
    >
      {label}
    </Link>
  );
}
