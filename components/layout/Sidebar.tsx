import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import {
  Home,
  Users,
  Wallet,
  FileText,
  UserCircle,
  ChevronDown,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  CircleHelp,
  Search,
  X,
  Landmark,
  HeartHandshake,
  Share2,
  CircleDollarSign,
  CreditCard,
} from "lucide-react";
import { cn } from "../ui/utils";
import { Button } from "../ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "../ui/command";
import type { Session } from "next-auth";
import { hasPartnerPortalAccess } from "@/lib/partner-session";
import { useNextAuthSession } from "@/hooks/use-nextauth-session";
import { useCooperativeNav } from "@/components/providers/CooperativeNavProvider";
import { buildVillageSidebarMenu } from "@/lib/modules/sidebar-menu";
import { flattenMenuForSearch } from "@/lib/modules/sidebar-search";
import { useEffect, useMemo, useRef, useState } from "react";
import type { PackageTier } from "@/lib/modules/entitlements";

interface MenuItem {
  id: string;
  label: string;
  icon: React.ElementType;
  path?: string;
  children?: MenuItem[];
  packageTier?: PackageTier;
  locked?: boolean;
}

const COOPERATIVE_ONLY_SIDEBAR_MENU: MenuItem[] = [
  {
    id: "koperasi",
    label: "Koperasi",
    icon: Landmark,
    path: "/koperasi",
  },
  {
    id: "profil",
    label: "Profil Akun",
    icon: UserCircle,
    path: "/profil",
  },
  {
    id: "billing",
    label: "Langganan & Billing",
    icon: Wallet,
    path: "/billing",
  },
];

const PARTNER_SIDEBAR_MENU: MenuItem[] = [
  {
    id: "mitra",
    label: "Dashboard",
    icon: Home,
    path: "/mitra",
  },
  {
    id: "mitra/referral",
    label: "Kode referral",
    icon: Share2,
    path: "/mitra/referral",
  },
  {
    id: "mitra/prospek",
    label: "Prospek Desa",
    icon: Users,
    path: "/mitra/prospek",
  },
  {
    id: "mitra/desa",
    label: "Desa Dikelola",
    icon: Landmark,
    path: "/mitra/desa",
  },
  {
    id: "mitra/komisi",
    label: "Revenue & Komisi",
    icon: Wallet,
    path: "/mitra/komisi",
  },
  {
    id: "mitra/disbursment",
    label: "Disbursement",
    icon: CircleDollarSign,
    path: "/mitra/disbursment",
  },
  {
    id: "mitra/profil",
    label: "Profil & Rekening",
    icon: UserCircle,
    path: "/mitra/profil",
  },
];

const PLATFORM_SIDEBAR_MENU: MenuItem[] = [
  {
    id: "admin",
    label: "Admin",
    icon: Home,
    path: "/admin",
  },
  {
    id: "admin/desa",
    label: "Kelola Desa",
    icon: Users,
    path: "/admin/desa",
  },
  {
    id: "admin/mitra",
    label: "Kelola Mitra",
    icon: HeartHandshake,
    path: "/admin/mitra",
  },
  {
    id: "admin/blog",
    label: "Kelola Blog",
    icon: FileText,
    path: "/admin/blog",
  },
  {
    id: "admin/pembayaran",
    label: "Kanal Pembayaran",
    icon: CreditCard,
    path: "/admin/pembayaran",
  },
];

interface SidebarProps {
  activePage: string;
  onPageChange: (page: string) => void;
  isOpen: boolean;
  onToggle: () => void;
  isCollapsed: boolean;
  onCollapse: () => void;
}

export function Sidebar({
  activePage,
  onPageChange,
  isOpen,
  onToggle,
  isCollapsed,
  onCollapse,
}: SidebarProps) {
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchWrapperRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const { access, loading: coopNavLoading } = useCooperativeNav();
  const { user, isLoading } = useNextAuthSession();
  const userId = typeof user?.id === "string" ? user.id : "";
  const isPartner = user?.accountType === "partner" || userId.startsWith("pt:");
  const isPlatform =
    user?.accountType === "platform" || userId.startsWith("pl:");

  const hasDualPartnerPortal = useMemo(() => {
    if (isPartner || isPlatform || access?.cooperativeOnlyNav) return false;
    return hasPartnerPortalAccess(user as Session | null);
  }, [access?.cooperativeOnlyNav, isPartner, isPlatform, user]);

  const visibleMenuItems = useMemo(() => {
    if (isPlatform) {
      return PLATFORM_SIDEBAR_MENU;
    }
    if (isPartner) {
      return PARTNER_SIDEBAR_MENU;
    }
    if (hasDualPartnerPortal) {
      const base = buildVillageSidebarMenu({
        role: user?.role,
        includeKoperasi: Boolean(!coopNavLoading && access?.showCoopMenu),
      }) as MenuItem[];
      const partnerChildren = PARTNER_SIDEBAR_MENU.map((item) => ({ ...item }));
      return [
        ...base,
        {
          id: "portal-mitra",
          label: "Portal Mitra",
          icon: HeartHandshake,
          children: partnerChildren,
        },
      ];
    }
    if (access?.cooperativeOnlyNav) {
      return COOPERATIVE_ONLY_SIDEBAR_MENU;
    }
    return buildVillageSidebarMenu({
      role: user?.role,
      includeKoperasi: Boolean(!coopNavLoading && access?.showCoopMenu),
    }) as MenuItem[];
  }, [
    access?.cooperativeOnlyNav,
    access?.showCoopMenu,
    coopNavLoading,
    hasDualPartnerPortal,
    isPartner,
    isPlatform,
    user?.role,
  ]);

  const searchableMenuItems = useMemo(
    () => flattenMenuForSearch(visibleMenuItems),
    [visibleMenuItems],
  );

  const toggleExpand = (id: string) => {
    // Accordion behavior - only one can be open at a time
    setExpandedItems((prev) => (prev.includes(id) ? [] : [id]));
  };

  const handlePageChange = (page: string) => {
    onPageChange(page);
    // Close sidebar on mobile when page is selected
    if (window.innerWidth < 768) {
      onToggle();
    }
  };

  const handleSearchSelect = (page: string) => {
    handlePageChange(page);
    setSearchQuery("");
    setIsSearchOpen(false);
    searchInputRef.current?.blur();
  };

  const handleSearchIconClick = () => {
    if (isCollapsed) {
      onCollapse(); // Perluas sidebar dulu
      setTimeout(() => searchInputRef.current?.focus(), 100);
    } else {
      searchInputRef.current?.focus();
    }
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        searchWrapperRef.current &&
        !searchWrapperRef.current.contains(event.target as Node)
      ) {
        setIsSearchOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleCollapseToggle = () => {
    setSearchQuery("");
    setIsSearchOpen(false);
    onCollapse();
  };

  const renderMenuItem = (item: MenuItem, level = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.includes(item.id);
    const isActive =
      activePage === item.id ||
      item.children?.some((child) => child.id === activePage);
    const Icon = item.icon;

    return (
      <div key={item.id}>
        <button
          onClick={() => {
            if (hasChildren) {
              if (isCollapsed) {
                onCollapse(); // Expand sidebar first
                setTimeout(() => toggleExpand(item.id), 100);
              } else {
                toggleExpand(item.id);
              }
            } else {
              handlePageChange(item.id);
            }
          }}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200",
            level > 0 && !isCollapsed && "pl-10",
            isActive &&
              !hasChildren &&
              "bg-primary text-primary-foreground shadow-sm",
            !isActive &&
              "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            isCollapsed && "justify-center px-2",
          )}
          title={isCollapsed ? item.label : undefined}
        >
          <Icon
            className={cn("shrink-0", isCollapsed ? "h-5 w-5" : "h-4 w-4")}
          />
          {!isCollapsed && (
            <>
              <span className="flex-1 text-left text-sm">{item.label}</span>
              {/* {item.packageTier &&
                !["dashboard", "pengaturan-desa", "billing"].includes(
                  item.id,
                ) && (
                  <ModuleTierBadge
                    tier={item.packageTier}
                    size="sm"
                    locked={item.locked}
                  />
                )} */}
              {hasChildren && (
                <motion.div
                  animate={{ rotate: isExpanded ? 0 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 shrink-0" />
                  ) : (
                    <ChevronRight className="h-4 w-4 shrink-0" />
                  )}
                </motion.div>
              )}
            </>
          )}
        </button>

        {!isCollapsed && hasChildren && (
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="mt-1 space-y-1">
                  {item.children?.map((child) =>
                    renderMenuItem(child, level + 1),
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
    );
  };

  const getDisplayVillageName = () => {
    if (isLoading) return "Memuat...";
    if (isPlatform) return "Klandesa";
    if (isPartner) return user?.name || "Mitra";
    return user?.village?.name || "Desa";
  };

  const getDisplayVillageDistrict = () => {
    if (isLoading) return "Memuat...";
    if (isPlatform) return user?.email || "Admin platform";
    if (isPartner) return user?.email || "Akun mitra";
    return user?.village?.district || "Kecamatan";
  };

  return (
    <>
      {/* Mobile Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onToggle}
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        data-tour="nav-sidebar"
        initial={false}
        animate={{
          width: isCollapsed ? "80px" : "256px",
        }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className={cn(
          "bg-sidebar border-r border-sidebar-border flex flex-col h-screen z-50",
          "transition-all duration-300",
          "fixed md:relative",
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        )}
      >
        {/* Logo & Title */}
        <div
          className={cn(
            "transition-all duration-300",
            isCollapsed ? "px-2 py-5" : "px-6 py-5",
          )}
        >
          <div
            className={cn(
              "flex items-center gap-3",
              isCollapsed && "justify-center",
            )}
          >
            <Image
              src="/brand/klandesa-icon.svg"
              alt="Klandesa"
              width={40}
              height={40}
              priority
              className="h-10 w-10 shrink-0"
            />
            {!isCollapsed && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.2 }}
              >
                <h2 className="font-semibold text-sidebar-foreground whitespace-nowrap">
                  {getDisplayVillageName()}
                </h2>
                <p className="text-xs text-muted-foreground whitespace-nowrap">
                  {getDisplayVillageDistrict()}
                </p>
                {!isPartner && !isPlatform && access?.cooperativeOnlyNav && (
                  <p className="text-xs text-primary font-medium mt-1 whitespace-nowrap">
                    Mode pengelola koperasi
                  </p>
                )}
              </motion.div>
            )}
          </div>

          {/* Close button for mobile */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            className="md:hidden absolute top-4 right-4 h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Search menu */}
        {isCollapsed ? (
          <div className="flex justify-center px-2 pb-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSearchIconClick}
              className="h-9 w-9 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              title="Cari menu"
              aria-label="Cari menu"
            >
              <Search className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div ref={searchWrapperRef} className="relative px-3 pb-2">
            <Command
              shouldFilter
              className="overflow-visible rounded-lg border border-sidebar-border bg-sidebar-accent/40"
            >
              <CommandInput
                ref={searchInputRef}
                value={searchQuery}
                onValueChange={(value) => {
                  setSearchQuery(value);
                  setIsSearchOpen(true);
                }}
                onFocus={() => setIsSearchOpen(true)}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    setIsSearchOpen(false);
                    searchInputRef.current?.blur();
                  }
                }}
                placeholder="Cari menu..."
                aria-label="Cari menu"
                className="h-9 text-sm text-sidebar-foreground placeholder:text-muted-foreground"
              />
              {isSearchOpen && searchQuery.trim().length > 0 && (
                <CommandList className="absolute left-0 right-0 top-[calc(100%+4px)] z-50 max-h-72 rounded-lg border border-sidebar-border bg-popover text-popover-foreground shadow-lg">
                  <CommandEmpty className="px-3 py-4 text-sm text-muted-foreground">
                    {`Menu "${searchQuery}" tidak ditemukan.`}
                  </CommandEmpty>
                  <CommandGroup className="p-1">
                    {searchableMenuItems.map((entry) => {
                      const EntryIcon = entry.icon;
                      return (
                        <CommandItem
                          key={entry.id}
                          value={entry.label}
                          keywords={entry.keywords}
                          onSelect={() => handleSearchSelect(entry.id)}
                          className="flex items-center gap-2 rounded-md px-2 py-2 text-sm"
                        >
                          <EntryIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <span className="flex-1 truncate">{entry.label}</span>
                          {entry.groupLabel && (
                            <span className="shrink-0 text-xs text-muted-foreground">
                              {entry.groupLabel}
                            </span>
                          )}
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                </CommandList>
              )}
            </Command>
          </div>
        )}

        {/* Navigation */}
        <nav
          className={cn(
            "flex-1 overflow-y-auto overflow-x-hidden space-y-1 transition-all duration-300",
            isCollapsed ? "p-2" : "px-3 py-3",
          )}
        >
          {visibleMenuItems.map((item) => renderMenuItem(item))}
        </nav>

        {/* Footer: Bantuan + Collapse dalam satu baris */}
        <div
          className={cn(
            "border-t border-sidebar-border flex items-center transition-all duration-300",
            isCollapsed ? "flex-col gap-1 p-2" : "justify-between gap-1 px-3 py-2",
          )}
        >
          <Link
            href="/bantuan"
            title={`Bantuan · © ${new Date().getFullYear()} Klandesa`}
            aria-label="Bantuan"
            className={cn(
              "flex items-center gap-2 rounded-lg text-sm text-muted-foreground transition-colors",
              "hover:bg-sidebar-accent hover:text-sidebar-foreground",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              isCollapsed ? "h-9 w-9 justify-center" : "h-9 flex-1 px-3",
            )}
          >
            <CircleHelp className="h-4 w-4 shrink-0" aria-hidden="true" />
            {!isCollapsed && <span>Bantuan</span>}
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleCollapseToggle}
            className="hidden md:inline-flex h-9 w-9 shrink-0 text-muted-foreground hover:text-sidebar-foreground"
            title={isCollapsed ? "Perluas sidebar" : "Ciutkan sidebar"}
            aria-label={isCollapsed ? "Perluas sidebar" : "Ciutkan sidebar"}
          >
            {isCollapsed ? (
              <ChevronsRight className="h-4 w-4" />
            ) : (
              <ChevronsLeft className="h-4 w-4" />
            )}
          </Button>
        </div>
      </motion.aside>
    </>
  );
}
