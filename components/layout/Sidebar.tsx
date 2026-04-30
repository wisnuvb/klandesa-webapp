import { motion, AnimatePresence } from "motion/react";
import {
  Home,
  Users,
  Wallet,
  FileText,
  UserCircle,
  BarChart3,
  Clock,
  Archive,
  ShoppingBag,
  Sprout,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  X,
  Megaphone,
  MessageCircle,
  AlertCircle,
  Image,
  Settings2,
  Monitor,
  Landmark,
  HeartHandshake,
} from "lucide-react";
import { cn } from "../ui/utils";
import { Button } from "../ui/button";
import { useNextAuthSession } from "@/hooks/use-nextauth-session";
import { useCooperativeNav } from "@/components/providers/CooperativeNavProvider";
import { useMemo, useState } from "react";

interface MenuItem {
  id: string;
  label: string;
  icon: React.ElementType;
  path?: string;
  children?: MenuItem[];
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
    label: "Billing",
    icon: Wallet,
    path: "/billing",
  },
];

const BASE_SIDEBAR_MENU: MenuItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: Home,
    path: "/dashboard",
  },
  {
    id: "data",
    label: "Data",
    icon: Users,
    children: [
      {
        id: "data-warga",
        label: "Warga",
        icon: Users,
        path: "/data-warga",
      },
      {
        id: "data-kk",
        label: "Kartu Keluarga",
        icon: Users,
        path: "/data-kk",
      },
      {
        id: "data-perangkat",
        label: "Perangkat Desa",
        icon: Users,
        path: "/data-perangkat",
      },
      {
        id: "data-jabatan",
        label: "Jabatan",
        icon: Users,
        path: "/data-jabatan",
      },
      {
        id: "potensi",
        label: "Potensi",
        icon: Sprout,
        path: "/potensi",
      },
      {
        id: "anggaran",
        label: "Anggaran",
        icon: Wallet,
        path: "/anggaran",
      },
    ],
  },
  {
    id: "statistik",
    label: "Statistik",
    icon: BarChart3,
    path: "/statistik",
  },
  {
    id: "pelayanan",
    label: "Pelayanan Surat",
    icon: FileText,
    children: [
      {
        id: "permohonan-warga",
        label: "Permohonan Warga",
        icon: FileText,
        path: "/permohonan-warga",
      },
      {
        id: "layanan-mandiri",
        label: "Layanan Mandiri",
        icon: Monitor,
        path: "/layanan-mandiri",
      },
      {
        id: "layanan-surat",
        label: "Layanan Surat",
        icon: FileText,
        path: "/layanan-surat",
      },
      {
        id: "pengaturan-desa",
        label: "Pengaturan Desa",
        icon: Settings2,
        path: "/pengaturan-desa",
      },
    ],
  },
  {
    id: "keuangan",
    label: "Sistem Keuangan",
    icon: Wallet,
    path: "/keuangan",
  },
  {
    id: "billing",
    label: "Billing",
    icon: Wallet,
    path: "/billing",
  },
  {
    id: "portal",
    label: "Portal Warga",
    icon: UserCircle,
    children: [
      {
        id: "pengumuman-desa",
        label: "Pengumuman",
        icon: Megaphone,
        path: "/pengumuman-desa",
      },
      {
        id: "forum-diskusi",
        label: "Forum Diskusi",
        icon: MessageCircle,
        path: "/forum-diskusi",
      },
      {
        id: "pengaduan-masyarakat",
        label: "Aduan Warga",
        icon: AlertCircle,
        path: "/pengaduan-masyarakat",
      },
      {
        id: "bantuan-program-keluarga",
        label: "Bansos & PKH",
        icon: HeartHandshake,
        path: "/bantuan-program-keluarga",
      },
      {
        id: "galeri-desa",
        label: "Galeri Desa",
        icon: Image,
        path: "/galeri-desa",
      },
    ],
  },
  {
    id: "absensi",
    label: "Absensi Perangkat",
    icon: Clock,
    path: "/absensi",
  },
  {
    id: "arsip",
    label: "Arsip Digital",
    icon: Archive,
    path: "/arsip",
  },
  {
    id: "ukm",
    label: "Produk UKM",
    icon: ShoppingBag,
    path: "/ukm",
  },
];

function withKoperasiMenuItem(items: MenuItem[], include: boolean): MenuItem[] {
  return items.map((item) => {
    if (item.id !== "data" || !item.children) return item;
    const filtered = item.children.filter((c) => c.id !== "koperasi");
    if (!include) {
      return { ...item, children: filtered };
    }
    return {
      ...item,
      children: [
        ...filtered,
        {
          id: "koperasi",
          label: "Koperasi",
          icon: Landmark,
          path: "/koperasi",
        },
      ],
    };
  });
}

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

  const { access, loading: coopNavLoading } = useCooperativeNav();

  const visibleMenuItems = useMemo(() => {
    if (access?.cooperativeOnlyNav) {
      return COOPERATIVE_ONLY_SIDEBAR_MENU;
    }
    return withKoperasiMenuItem(
      BASE_SIDEBAR_MENU,
      Boolean(!coopNavLoading && access?.showCoopMenu),
    );
  }, [access, coopNavLoading]);

  const { user, isLoading } = useNextAuthSession();

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
            "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
            level > 0 && !isCollapsed && "pl-10",
            isActive &&
              !hasChildren &&
              "bg-primary text-primary-foreground shadow-sm",
            !isActive &&
              "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            isCollapsed && "justify-center px-2"
          )}
          title={isCollapsed ? item.label : undefined}
        >
          <Icon
            className={cn("shrink-0", isCollapsed ? "h-5 w-5" : "h-4 w-4")}
          />
          {!isCollapsed && (
            <>
              <span className="flex-1 text-left text-sm">{item.label}</span>
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
                    renderMenuItem(child, level + 1)
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
    return user?.village?.name || "Desa";
  };

  const getDisplayVillageDistrict = () => {
    if (isLoading) return "Memuat...";
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
        initial={false}
        animate={{
          width: isCollapsed ? "80px" : "256px",
        }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className={cn(
          "bg-sidebar border-r border-sidebar-border flex flex-col h-screen z-50",
          "transition-all duration-300",
          "fixed md:relative",
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        {/* Logo & Title */}
        <div
          className={cn(
            "transition-all duration-300",
            isCollapsed ? "px-2 py-5" : "px-6 py-5"
          )}
        >
          <div
            className={cn(
              "flex items-center gap-3",
              isCollapsed && "justify-center"
            )}
          >
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center shrink-0">
              <Home className="h-6 w-6 text-primary-foreground" />
            </div>
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
                {access?.cooperativeOnlyNav && (
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

        {/* Navigation */}
        <nav
          className={cn(
            "flex-1 overflow-y-auto overflow-x-hidden space-y-1 transition-all duration-300",
            isCollapsed ? "p-2" : "p-4"
          )}
        >
          {visibleMenuItems.map((item) => renderMenuItem(item))}
        </nav>

        {/* Collapse Toggle Button */}
        <div
          className={cn(
            "border-t border-sidebar-border transition-all duration-300",
            isCollapsed ? "p-2" : "p-4"
          )}
        >
          <Button
            variant="ghost"
            onClick={onCollapse}
            className={cn(
              "w-full justify-start gap-2 hidden md:flex",
              isCollapsed && "justify-center px-2"
            )}
            title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <>
                <ChevronLeft className="h-4 w-4" />
                <span className="text-sm">Collapse</span>
              </>
            )}
          </Button>
        </div>

        {/* Footer */}
        {!isCollapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="p-4 border-t border-sidebar-border"
          >
            <div className="text-xs text-muted-foreground text-center">
              © {new Date().getFullYear()} Klandesa
            </div>
          </motion.div>
        )}
      </motion.aside>
    </>
  );
}
